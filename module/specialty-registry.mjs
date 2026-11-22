/**
 * World-level Specialty inventory. Compendium items stay read-only; GM changes
 * are overlays. Pure functions: no Foundry services or registry migrations here.
 */
import { analyzeSkillFamily, availableSpecialtyFamilies, readSpecialtyPresets, specialtyFamilyKey } from './skill-specialties.mjs';

const str = value => String(value ?? '').trim();
const normalized = value => specialtyFamilyKey(str(value));
const unclear = label => /[/／]|(?:^|\W)(?:various|any|multiple|other)(?:\W|$)/iu.test(str(label));
const idFor = (family, specialty) => normalized(family)+'|'+normalized(specialty);

export function readSpecialtyRegistry(raw) {
  let value=raw;
  if(typeof raw==='string')try { value=JSON.parse(raw); }catch {value=null;}
  const result={schemaVersion:1,families:{}};
  if(!value || typeof value!=='object' || Array.isArray(value))return result;
  const families=value.families && typeof value.families==='object' ? value.families : {};
  for(const [rawFamily, rawData] of Object.entries(families)) {
    const family=normalized(rawFamily),data=rawData||{};
    if(!family)continue;
    const seen=new Set();
    const additions=(Array.isArray(data.additions)?data.additions:[])
      .map(entry=>({key:normalized(entry?.key||entry?.en),en:str(entry?.en),th:str(entry?.th),
        templateUuid:str(entry?.templateUuid),state:entry?.state==='hidden'?'hidden':'enabled'}))
      .filter(entry=>{if(!entry.key||!entry.en||unclear(entry.en)||seen.has(entry.key))return false;seen.add(entry.key);return true;});
    const hidden=[...new Set((Array.isArray(data.hidden)?data.hidden:[]).map(normalized).filter(Boolean))];
    result.families[family]={additions,hidden};
  }
  return result;
}

export function buildSpecialtyRegistry(documents=[],registryRaw='{}',legacyRaw='{}') {
  const overlay=readSpecialtyRegistry(registryRaw);
  const legacy=readSpecialtyPresets(legacyRaw);
  const families=availableSpecialtyFamilies(documents);
  const result=[];
  for(const group of families) {
    const data=overlay.families[group.key]||{additions:[],hidden:[]};
    const hidden=new Set(data.hidden);
    const options=new Map(), ambiguous=[];
    const fingerprints=new Set();
    for(const doc of group.templates) {
      const info=analyzeSkillFamily(doc);
      if(!info)continue;
      const fp=[doc.system?.category??'', doc.system?.base??'', doc.system?.baseFormula??''].join('|');
      fingerprints.add(fp);
      const key=normalized(info.enSpecialty);
      if(!key || unclear(info.enSpecialty)) {
        ambiguous.push({name:info.enSpecialty||doc.name,sourceUuid:doc.uuid,reason:'Composite, placeholder or missing specialty'});
        continue;
      }
      if(!options.has(key)) options.set(key,{
        key,en:info.enSpecialty,th:info.thSpecialty||info.enSpecialty,
        source:'compendium',sourceUuid:doc.uuid,templateUuid:doc.uuid,
        category:doc.system?.category||'',base:doc.system?.base??0,baseFormula:doc.system?.baseFormula||'',
        hidden:hidden.has(key),editable:false
      });
    }
    for(const item of legacy[group.key]||[]) {
      const key=normalized(item.en);
      if(!key||options.has(key))continue;
      options.set(key,{key,en:item.en,th:item.th||item.en,source:'legacy',sourceUuid:'',
        templateUuid:'',hidden:hidden.has(key),editable:true});
    }
    for(const item of data.additions) {
      const existing=options.get(item.key);
      options.set(item.key,{...existing,...item,
        source:existing?.source==='compendium'?'compendium':'world',
        sourceUuid:existing?.sourceUuid||'',templateUuid:item.templateUuid||existing?.templateUuid||'',
        hidden:item.state==='hidden'||hidden.has(item.key),editable:existing?.source!=='compendium'});
    }
    result.push({...group,templates:group.templates,options:[...options.values()].sort((a,b)=>a.en.localeCompare(b.en)),
      ambiguous,fingerprintConflict:fingerprints.size>1,sourceCount:group.templates.length,
      activeCount:[...options.values()].filter(x=>!x.hidden).length});
  }
  // Include configured families missing from installed content as diagnostics,
  // never enable creating a new Skill from a nonexistent template.
  const known=new Set(result.map(f=>f.key));
  for(const key of Object.keys({...legacy,...overlay.families})){
    if(known.has(key))continue;
    result.push({key,enFamily:key,thFamily:key,templates:[],templateUuid:'',
      options:[...(overlay.families[key]?.additions||[]).map(o=>({...o,source:'world',hidden:o.state==='hidden',editable:true}))],
      ambiguous:[],fingerprintConflict:false,sourceCount:0,activeCount:0,missingSource:true});
  }
  return result.sort((a,b)=>a.enFamily.localeCompare(b.enFamily));
}

export function eligibleSpecialtyOptions(registry,familyKey) {
  return (registry.find(f=>f.key===normalized(familyKey))?.options??[]).filter(o=>!o.hidden);
}

export function findSpecialtyCandidate(registry,key) {
  const [family,specialty]=str(key).split('|');
  const group=registry.find(f=>f.key===normalized(family));
  const option=group?.options.find(o=>o.key===normalized(specialty) && !o.hidden);
  return group&&option ? {family:group,option} : null;
}

/** Resolve a true source document, never the UUID of a generated Actor Skill. */
export function specialtyTemplateFor(group,option,documents=[]) {
  const byUuid=new Map(documents.map(doc=>[doc.uuid,doc]));
  if(option.sourceUuid && byUuid.has(option.sourceUuid))return byUuid.get(option.sourceUuid);
  if(option.templateUuid && byUuid.has(option.templateUuid))return byUuid.get(option.templateUuid);
  if(group.fingerprintConflict)return null;
  return byUuid.get(group.templateUuid)||null;
}

export function specialtyIdentity(item) {
  const info=analyzeSkillFamily(item);
  return info?.supportsSpecialty && info.enSpecialty ? idFor(info.enFamily,info.enSpecialty) : '';
}
