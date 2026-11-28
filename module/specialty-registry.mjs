/**
 * Effective registry for ONE template Skill Item per specialty-capable family.
 *
 * Source content authors publish a single Skill Family template and its
 * explicitly verified book-default specialties as metadata on that Item.
 * World/GM additions and edits are overlays, never new Compendium Items.
 * Legacy multi-Item packs remain inspectable for migration; their examples
 * are NOT automatically offered as book defaults to new characters.
 */
import {analyzeSkillFamily,availableSpecialtyFamilies,readSpecialtyPresets,specialtyFamilyKey} from './skill-specialties.mjs';
import {isSkillFamilyTemplate,verifiedTemplateDefaults,inspectTemplateDefaults} from './skill-family-templates.mjs';
import {getLibraryDocuments} from './library-provider.mjs';

const str=v=>String(v??'').trim(),keyOf=v=>specialtyFamilyKey(str(v));
export const specialtyNeedsReview=value=>!str(value)||/[/／]|(?:^|\W)(?:various|any|multiple|other)(?:\W|$)/iu.test(str(value));
const entryId=(family,name)=>keyOf(family)+'|'+keyOf(name);
const states=new Set(['enabled','hidden','review']);

const readEntry=(raw={})=>{
  const en=str(raw?.en),key=keyOf(raw?.key||en);
  const value=raw?.base;
  const base=value===null||value===undefined||value===''?null:Number(value);
  return {key,en,th:str(raw?.th),templateUuid:str(raw?.templateUuid),
    base:Number.isSafeInteger(base)&&base>=0?base:null,
    baseFormula:str(raw?.baseFormula),
    state:states.has(raw?.state)?raw.state:'enabled'};
};
const readOverrides=raw=>{
  const out={};
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
  for(const [k,v] of Object.entries(raw)){
    if(!v||typeof v!=='object')continue;
    out[k]={en:str(v.en),th:str(v.th),
      state:states.has(v.state)?v.state:'enabled'};
  }
  return out;
};
export function readSpecialtyRegistry(raw) {
  let value=raw;
  if(typeof value==='string')try{value=JSON.parse(value);}catch{value={};}
  const out={schemaVersion:3,families:{}};
  if(!value||typeof value!=='object'||Array.isArray(value))return out;
  for(const [name,rawData] of Object.entries(value.families||{})){
    const key=keyOf(name),data=rawData||{};
    if(!key)continue;
    const seen=new Set();
    const additions=(Array.isArray(data.additions)?data.additions:[])
      .map(readEntry).filter(o=>{
        if(!o.key||!o.en||seen.has(o.key))return false;
        seen.add(o.key);return true;
      });
    out.families[key]={
      additions,
      // Stable keys belong to template metadata, not to the mutable label.
      bookOverrides:readOverrides(data.bookOverrides),
      sourceOverrides:readOverrides(data.sourceOverrides),
      hidden:[...new Set((Array.isArray(data.hidden)?data.hidden:[]).map(keyOf).filter(Boolean))],
      legacyMigrated:data.legacyMigrated===true
    };
  }
  return out;
}
const option=(raw,source,details={})=>{
  const state=raw.state||'enabled';
  const en=str(raw.en);
  return {...raw,...details,key:keyOf(en),en,th:str(raw.th)||en,
    state,hidden:state!=='enabled',review:state==='review',source,editable:true};
};

/** There is intentionally NO hardcoded list of Language/Knowledge/Science
 * subskills in the Game System; book defaults must come from the content pack.
 */
export function buildSpecialtyRegistry(documents=[],raw='{}',oldPresets='{}'){
  const cfg=readSpecialtyRegistry(raw),legacy=readSpecialtyPresets(oldPresets);
  const families=availableSpecialtyFamilies(documents),result=[];
  for(const family of families){
    const meta=cfg.families[family.key]||{};
    const canonical=family.canonicalTemplate;
    const examples=family.legacyExamples||[];
    const options=[],ambiguous=[],claimed=new Set();

    if(canonical){
      // One source Item can publish several verified starting choices, with
      // different book base chance/formulas for Own vs Other Language.
      for(const seed of verifiedTemplateDefaults(canonical)){
        const change=meta.bookOverrides?.[seed.key]||{};
        const en=change.en||seed.en;
        const th=change.th||seed.th;
        const state=change.state||seed.state||'enabled';
        const resultOption=option({...seed,en,th,state},'book',{
          bookKey:seed.key,originalEn:seed.en,originalTh:seed.th,
          templateUuid:canonical.uuid,sourceUuid:canonical.uuid,
          ruleNote:seed.ruleNote||'',base:seed.base,baseFormula:seed.baseFormula
        });
        // Invalid composites never become selectable even if a pack marks
        // them enabled; GM may rename an option into a concrete specialty.
        if(specialtyNeedsReview(resultOption.en)){
          resultOption.state='review';resultOption.hidden=true;resultOption.review=true;
        }
        options.push(resultOption); claimed.add(resultOption.key);
      }
    }else{
      // OLD packs (one Skill Item per subtype) are migration candidates, NOT
      // implicit default selections. A World override can explicitly approve
      // a legacy entry while its Compendium is being migrated.
      for(const doc of examples){
        const info=analyzeSkillFamily(doc);
        const change=meta.sourceOverrides?.[doc.uuid];
        const originalEn=info?.enSpecialty||'',en=change?.en||originalEn;
        const state=change?.state||'review';
        const parsed=option({en,th:change?.th||info?.thSpecialty||'',state},'legacy-source',{
          sourceUuid:doc.uuid,templateUuid:doc.uuid,
          originalEn,originalTh:info?.thSpecialty||'',sourceAmbiguous:true
        });
        if(specialtyNeedsReview(en))parsed.state='review';
        parsed.hidden=parsed.state!=='enabled';parsed.review=parsed.state==='review';
        options.push(parsed); claimed.add(parsed.key);
        ambiguous.push({name:doc.system?.nameEn||doc.name,sourceUuid:doc.uuid,
          reason:'Legacy per-specialty source Item; migrate to one Family template'});
      }
    }
    // Old world presets remain visible for editing, but are not assumed to
    // be rulebook defaults. Explicit GM approval is required for use.
    if(!meta.legacyMigrated)for(const preset of legacy[family.key]||[]){
      const key=keyOf(preset.en);
      if(!key||claimed.has(key))continue;
      options.push(option({en:preset.en,th:preset.th,state:'review'},'legacy-preset',
        {templateUuid:canonical?.uuid||''}));
      claimed.add(key);
    }
    for(const entry of meta.additions||[]){
      const key=keyOf(entry.en);
      if(!key)continue;
      // World entries may duplicate a book seed from historical versions.
      // The source book seed always takes precedence, so no double choice.
      if(options.some(o=>o.source==='book'&&o.key===key))continue;
      const worldOption=option(entry,'world',{
        templateUuid:entry.templateUuid||canonical?.uuid||''
      });
      if(specialtyNeedsReview(worldOption.en)){
        worldOption.state='review';worldOption.review=true;worldOption.hidden=true;
      }
      const old=options.findIndex(o=>o.source==='legacy-preset'&&o.key===key);
      if(old>=0)options[old]=worldOption;
      else options.push(worldOption);
    }
    for(const opt of options){
      if((meta.hidden||[]).includes(opt.key))opt.hidden=true;
    }
    const usable=options.filter(o=>!o.hidden);
    const inspected=inspectTemplateDefaults(canonical);
    const diagnostics={rawCount:inspected.rawCount,acceptedCount:inspected.options.length,rejected:inspected.rejected,ignoredCopies:family.sourceResolution?.copies||[],sourceUuids:family.sourceResolution?.sourceUuids||[],status:family.ambiguousTemplate?'conflicting-templates':!canonical?'missing-template':inspected.missing?'missing-default-field':!inspected.rawCount?'empty-defaults':inspected.rejected.length?'rejected-defaults':'loaded'};
    result.push({...family,templates:canonical?[canonical]:examples,
      sourceCount:canonical?1:0,legacySourceCount:examples.length,
      options,activeCount:usable.length,ambiguous,
      missingSource:!canonical,requiresContentMigration:!canonical,
      fingerprintConflict:family.ambiguousTemplate,
      diagnostics,bookDefaultCount:options.filter(o=>o.source==='book').length});
  }
  const known=new Set(result.map(g=>g.key));
  for(const key of Object.keys(cfg.families)){
    if(known.has(key))continue;
    const entries=(cfg.families[key].additions||[]).map(e=>option(e,'world'));
    result.push({key,enFamily:key,thFamily:key,templates:[],canonicalTemplate:null,
      options:entries,activeCount:entries.filter(o=>!o.hidden).length,
      ambiguous:[],sourceCount:0,legacySourceCount:0,missingSource:true,
      requiresContentMigration:true,fingerprintConflict:false,bookDefaultCount:0});
  }
  return result.sort((a,b)=>a.enFamily.localeCompare(b.enFamily));
}
export function eligibleSpecialtyOptions(registry,familyKey){
  const group=registry.find(g=>g.key===keyOf(familyKey));
  return group?.fingerprintConflict?[]:(group?.options||[]).filter(o=>!o.hidden);
}
export function findSpecialtyCandidate(registry,identity){
  const [family,...parts]=str(identity).split('|');
  const group=registry.find(g=>g.key===keyOf(family));
  const option=group?.fingerprintConflict?null:group?.options.find(o=>o.key===keyOf(parts.join('|'))&&!o.hidden);
  return group&&option?{family:group,option}:null;
}
export function specialtyTemplateFor(group,option,docs=[]){
  const sources=new Map(docs.map(doc=>[doc.uuid,doc]));
  if(group?.fingerprintConflict)return null;
  const canonical=group?.canonicalTemplate;
  if(canonical && sources.has(canonical.uuid))return sources.get(canonical.uuid);
  // Transitional legacy options require an explicit, approved GM choice.
  if(option?.state!=='enabled')return null;
  if(option?.templateUuid&&sources.has(option.templateUuid))return sources.get(option.templateUuid);
  return null;
}
export function specialtyIdentity(item) {
  const info=analyzeSkillFamily(item);
  return info?.supportsSpecialty&&!info.isTemplate&&info.enSpecialty
    ?entryId(info.enFamily,info.enSpecialty):'';
}

/** Read-only diagnostics; not a setup or import step. */
export async function auditSpecialtySources(){
  const docs=await getLibraryDocuments({types:['skill']});
  const registry=buildSpecialtyRegistry(docs,game.settings.get('brp-uge','specialtyRegistry'),game.settings.get('brp-uge','specialtyPresets'));
  return {moduleVersion:game.modules?.get('brp-uge-compendium')?.version??null,
    families:registry.map(g=>({family:g.key,source:g.canonicalTemplate?.uuid??null,defaults:g.bookDefaultCount,active:g.activeCount,diagnostics:g.diagnostics??null})),
    standalone:docs.filter(d=>!analyzeSkillFamily(d)?.supportsSpecialty).map(d=>({uuid:d.uuid,name:d.system?.nameEn||d.name}))};
}
