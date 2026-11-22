/**
 * Effective Skill Specialty registry.
 * Compendium/World source Items are read only. GM may override *any* source
 * entry (including ambiguous composite examples) using a World-only overlay.
 * Incomplete source headings are visible in the manager but never offered
 * as concrete player specialties until a GM explicitly curates them.
 */
import {analyzeSkillFamily,availableSpecialtyFamilies,readSpecialtyPresets,specialtyFamilyKey} from './skill-specialties.mjs';

const str=v=>String(v??'').trim();
const keyOf=v=>specialtyFamilyKey(str(v));
export const specialtyNeedsReview=value=>!str(value)||/[/／]|(?:^|\W)(?:various|any|multiple|other)(?:\W|$)/iu.test(str(value));
const entryId=(family,name)=>keyOf(family)+'|'+keyOf(name);

export function readSpecialtyRegistry(raw) {
  let value=raw;
  if(typeof value==='string')try{value=JSON.parse(value);}catch{value={};}
  const out={schemaVersion:2,families:{}};
  if(!value||typeof value!=='object'||Array.isArray(value))return out;
  for(const [name,data] of Object.entries(value.families||{})){
    const family=keyOf(name);
    if(!family||!data||typeof data!=='object')continue;
    const seen=new Set(),additions=[];
    for(const e of Array.isArray(data.additions)?data.additions:[]){
      const key=keyOf(e?.key||e?.en),en=str(e?.en);
      if(!key||!en||seen.has(key))continue;
      seen.add(key);
      additions.push({key,en,th:str(e?.th),templateUuid:str(e?.templateUuid),
        state:e?.state==='hidden'?'hidden':e?.state==='review'?'review':'enabled'});
    }
    const sourceOverrides={};
    for(const [uuid,o] of Object.entries(data.sourceOverrides||{})){
      if(!uuid||!o||typeof o!=='object')continue;
      sourceOverrides[uuid]={en:str(o.en),th:str(o.th),
        state:['enabled','hidden','review'].includes(o.state)?o.state:'enabled'};
    }
    out.families[family]={additions,sourceOverrides,
      hidden:[...new Set((Array.isArray(data.hidden)?data.hidden:[]).map(keyOf).filter(Boolean))],
      legacyMigrated:data.legacyMigrated===true};
  }
  return out;
}

export function buildSpecialtyRegistry(documents=[],raw='{}',oldPresets='{}'){
  const overlays=readSpecialtyRegistry(raw),legacy=readSpecialtyPresets(oldPresets);
  const result=[];
  for(const group of availableSpecialtyFamilies(documents)){
    const cfg=overlays.families[group.key]||{};
    const hidden=new Set(cfg.hidden||[]);
    const entries=[],ambiguous=[],nameKeys=new Set(),fingerprints=new Set();
    for(const doc of group.templates){
      const info=analyzeSkillFamily(doc);
      if(!info)continue;
      const originalEn=info.enSpecialty,originalTh=info.thSpecialty||originalEn;
      const override=cfg.sourceOverrides?.[doc.uuid];
      const en=override?.en||originalEn,th=override?.th||originalTh;
      const sourceReview=specialtyNeedsReview(originalEn);
      const needsReview=specialtyNeedsReview(en);
      const state=override?.state|| (sourceReview?'review':'enabled');
      const effectiveState=(needsReview && state==='enabled')?'review':state;
      const key=keyOf(en);
      if(sourceReview)ambiguous.push({name:originalEn||doc.name,sourceUuid:doc.uuid,
        reason:'Example or compound heading: curate a concrete Specialty before use'});
      fingerprints.add([doc.system?.category??'',doc.system?.base??'',doc.system?.baseFormula??''].join('|'));
      if(!nameKeys.has(key)&&key)nameKeys.add(key);
      entries.push({key,en,th,originalEn,originalTh,source:'compendium',
        sourceUuid:doc.uuid,templateUuid:doc.uuid,
        category:doc.system?.category||'',base:doc.system?.base??0,baseFormula:doc.system?.baseFormula||'',
        state:effectiveState,hidden:hidden.has(key)||effectiveState!=='enabled',review:effectiveState==='review',
        editable:true,sourceAmbiguous:sourceReview});
    }
    if(!cfg.legacyMigrated)for(const item of legacy[group.key]||[]){
      const key=keyOf(item.en);
      if(!key||nameKeys.has(key))continue;
      nameKeys.add(key);
      entries.push({key,en:item.en,th:item.th||item.en,originalEn:item.en,originalTh:item.th||item.en,
        source:'legacy',sourceUuid:'',templateUuid:'',state:hidden.has(key)?'hidden':'enabled',
        hidden:hidden.has(key),review:false,editable:true});
    }
    for(const item of cfg.additions||[]){
      const key=keyOf(item.en);
      if(!key)continue;
      // A legacy entry gets upgraded to a World row when explicitly edited.
      const idx=entries.findIndex(o=>o.key===key&&o.source!=='compendium');
      const entry={...item,key,en:item.en,th:item.th||item.en,originalEn:item.en,originalTh:item.th||item.en,
        source:'world',sourceUuid:'',state:item.state,
        hidden:hidden.has(key)||item.state!=='enabled',review:item.state==='review',editable:true};
      if(idx>=0)entries[idx]=entry;
      else entries.push(entry);
    }
    result.push({...group,templates:group.templates,options:entries,
      ambiguous,fingerprintConflict:fingerprints.size>1,sourceCount:group.templates.length,
      activeCount:entries.filter(o=>!o.hidden).length});
  }
  const known=new Set(result.map(g=>g.key));
  for(const key of new Set([...Object.keys(legacy),...Object.keys(overlays.families)])){
    if(known.has(key))continue;
    const cfg=overlays.families[key]||{},opts=(cfg.additions||[]).map(o=>({
      ...o,source:'world',sourceUuid:'',hidden:o.state!=='enabled',review:o.state==='review',
      editable:true
    }));
    result.push({key,enFamily:key,thFamily:key,templates:[],templateUuid:'',
      options:opts,ambiguous:[],fingerprintConflict:false,sourceCount:0,
      activeCount:opts.filter(o=>!o.hidden).length,missingSource:true});
  }
  return result.sort((a,b)=>a.enFamily.localeCompare(b.enFamily));
}
export function eligibleSpecialtyOptions(registry,familyKey){
  return (registry.find(group=>group.key===keyOf(familyKey))?.options||[]).filter(o=>!o.hidden);
}
export function findSpecialtyCandidate(registry,identity){
  const [family,...segments]=str(identity).split('|');
  const group=registry.find(g=>g.key===keyOf(family));
  const option=group?.options.find(o=>o.key===keyOf(segments.join('|'))&&!o.hidden);
  return group&&option?{family:group,option}:null;
}
export function specialtyTemplateFor(group,option,docs=[]){
  const byUuid=new Map(docs.map(doc=>[doc.uuid,doc]));
  if(option?.sourceUuid&&byUuid.has(option.sourceUuid))return byUuid.get(option.sourceUuid);
  if(option?.templateUuid&&byUuid.has(option.templateUuid))return byUuid.get(option.templateUuid);
  // Do not guess a template across incompatible source formulas; a curated
  // source is safe only when the GM explicitly promoted its concrete identity.
  if(group?.fingerprintConflict)return null;
  const curated=group?.options?.find(o=>o.sourceUuid&&!o.hidden&&o.state==='enabled');
  if(curated)return byUuid.get(curated.sourceUuid)||null;
  const source=group?.templates?.find(doc=>!group.ambiguous.some(x=>x.sourceUuid===doc.uuid));
  return source?byUuid.get(source.uuid)||null:null;
}
export function specialtyIdentity(item) {
  const info=analyzeSkillFamily(item);
  return info?.supportsSpecialty && info.enSpecialty?entryId(info.enFamily,info.enSpecialty):'';
}
