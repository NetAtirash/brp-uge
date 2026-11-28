/** External creation content. No book-specific template records in this engine. */
import {canonicalSkillKey} from './skill-foundation.mjs';
import {categoryLabel} from './reference-utils.mjs';
import {linkedOccupationSkill} from './occupation-skill-linking.mjs';
import {analyzeSkillFamily,specialtyFamilyKey} from './skill-specialties.mjs';
import {isSkillFamilyTemplate} from './skill-family-templates.mjs';
import {specialtyNeedsReview,specialtyTemplateFor} from './specialty-registry.mjs';
import {resolveOccupationTemplateGroups} from './occupation-choice-rules.mjs';
import {getLibraryDocuments} from './library-provider.mjs';
import {buildSpecialtyRegistry} from './specialty-registry.mjs';

const text=v=>typeof v==='string'?v.trim():'';
const list=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
const requireValue=(ok,label)=>{if(!ok)throw new Error(label);};
const unique=items=>new Set(items).size===items.length;
const idOk=v=>/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(text(v));
const refOk=v=>/^(?:Compendium\.[^.]+\.[^.]+\.Item\.[A-Za-z0-9]{16}|Item\.[A-Za-z0-9]{16})$/.test(text(v));
const keyOk=v=>typeof v==='string'&&/^[^|]+\|[^|]*$/.test(v)&&v===v.trim();
const positive=v=>Number.isSafeInteger(v)&&v>0;
const plainSkill=s=>s?.type==='skill'&&!isSkillFamilyTemplate(s)&&!analyzeSkillFamily(s)?.supportsSpecialty;
const concreteSkill=s=>s?.type==='skill'&&!isSkillFamilyTemplate(s)&&(!analyzeSkillFamily(s)?.supportsSpecialty||!specialtyNeedsReview(analyzeSkillFamily(s)?.enSpecialty));
const guardKeys=new Set(['nonNative','excludeAlreadySelected','suggestions','suggested','languageRole','allowedCanonicalKeys','notBookDefault','mustBeNonNative']);
function validateGuard(g){
  requireValue(obj(g),'Invalid semantic guard');
  for(const k of Object.keys(g))requireValue(guardKeys.has(k),'Unsupported semantic guard: '+k);
  for(const k of ['nonNative','excludeAlreadySelected','mustBeNonNative'])if(k in g)requireValue(typeof g[k]==='boolean','Invalid guard: '+k);
  if('languageRole' in g)requireValue(g.languageRole==='programming_language','Unsupported language role');
  if('allowedCanonicalKeys' in g)requireValue(Array.isArray(g.allowedCanonicalKeys)&&g.allowedCanonicalKeys.every(keyOk),'Invalid approved keys');
  if('notBookDefault' in g)requireValue(!!text(g.notBookDefault),'Invalid book default exclusion');
}
function validateGroups(groups){
  requireValue(Array.isArray(groups),'Choice Groups must be an array');
  requireValue(unique(groups.map(g=>g.id)),'Duplicate choice group IDs');
  for(const g of groups){
    requireValue(idOk(g?.id)&&positive(g.count)&&g.count<=100&&Array.isArray(g.options)&&g.options.length,'Invalid choice group: '+g?.id);
    for(const o of g.options){
      requireValue(o&&['skill','family','specialty'].includes(o.kind),'Unsupported choice option');
      requireValue(o.kind==='skill'?(refOk(o.ref)||keyOk(o.canonicalSkillKey)):!!text(o.familyKey)&&(o.kind!=='specialty'||!!text(o.specialtyKey)),'Invalid choice option in '+g.id);
    }
    if(g.semanticGuards!==undefined)validateGuard(g.semanticGuards);
  }
}
function validatePersonality(t,custom=false){
  requireValue(obj(t)&&idOk(t.id)&&!!text(t.nameEn)&&!!text(t.nameTh),'Invalid Personality identity');
  requireValue(custom||idOk(t.systemPersonalityType),'Missing systemPersonalityType');
  requireValue(!['none','custom'].includes(t.systemPersonalityType),'Reserved Personality type');
  requireValue(t.bonus?.value===20&&t.bonus?.unit==='skill-points'&&t.bonus?.applyOncePerSelectedSkill===true,'Unsupported Personality bonus');
  requireValue(t.requiredTotalSkills===13&&Array.isArray(t.fixedSkills),'Invalid Personality skill total');
  validateGroups(t.choiceGroups);
  for(const s of t.fixedSkills){
    requireValue(['exact-skill','family-specialty','exact-specialty'].includes(s?.requirement),'Unsupported fixed skill requirement');
    requireValue(s.requirement==='exact-skill'?(refOk(s.sourceUuid)||keyOk(s.canonicalSkillKey))&&(!s.canonicalSkillKey||keyOk(s.canonicalSkillKey)):
      !!text(s.familyKey)&&(s.requirement!=='exact-specialty'||!!text(s.specialtyKey)),'Invalid fixed skill requirement');
    if(s.constraint!==undefined)validateGuard(s.constraint);
  }
  requireValue(t.fixedSkills.length+t.choiceGroups.reduce((n,g)=>n+g.count,0)===t.requiredTotalSkills,'Personality slot count mismatch');
}
export function validatePersonalityManifest(data){
  requireValue(data?.schemaVersion==='brp-personality-template-v1-proposed'&&data.documentType==='external-data-manifest-not-foundry-item'&&Array.isArray(data.templates),'Unsupported Personality manifest');
  for(const t of data.templates)validatePersonality(t);
  requireValue(unique(data.templates.map(t=>t.id))&&unique(data.templates.map(t=>t.systemPersonalityType)),'Duplicate Personality IDs/types');
  return data;
}
export function validateOccupationOverlay(data){
  requireValue(data?.schemaVersion==='occupation-overlay-1.0'&&Array.isArray(data.items),'Unsupported occupation overlay');
  requireValue(unique(data.items.map(i=>i._id)),'Duplicate occupation IDs');
  for(const i of data.items){
    requireValue(/^[A-Za-z0-9]{16}$/.test(i?._id)&&Array.isArray(i.patch?.skillRefs)&&i.patch.skillRefs.every(refOk),'Invalid occupation source refs: '+i?._id);
    validateGroups(i.patch.skillChoiceGroups);
    const review=i.extendedReview;
    requireValue(obj(review)&&Array.isArray(review.requirements),'Missing extended review: '+i._id);
    requireValue(unique(review.requirements.map(r=>r.groupId)),'Duplicate review group');
    for(const r of review.requirements){
      requireValue(i.patch.skillChoiceGroups.some(g=>g.id===r.groupId)&&Array.isArray(r.unresolvedTokens),'Invalid occupation review group: '+r.groupId);
      validateGuard(r.semanticGuards||{});
    }
    const slots=i.patch.skillRefs.length+i.patch.skillChoiceGroups.reduce((n,g)=>n+g.count,0);
    requireValue(review.computedSkillSlots===slots&&review.expectedSkillSlots===slots,'Occupation slot count mismatch: '+i._id);
  }
  return data;
}
export function readCreationTemplateData(raw){
  try{
    const data=typeof raw==='string'?JSON.parse(raw):raw;
    if(!obj(data))return {};
    if(data.personality)validatePersonalityManifest(data.personality);
    if(data.occupations)validateOccupationOverlay(data.occupations);
    if(data.customPersonalities!==undefined){
      requireValue(Array.isArray(data.customPersonalities),'Invalid custom Personality list');
      for(const t of data.customPersonalities)validatePersonality(t,true);
      requireValue(unique(data.customPersonalities.map(t=>t.id)),'Duplicate custom Personality IDs');
    }
    return data;
  }catch(error){return {error:error.message};}
}
export function creationPersonalityTemplates(data){
  return [...list(data?.personality?.templates).map(t=>({...t,typeKey:t.systemPersonalityType})),
    ...list(data?.customPersonalities).map(t=>({...t,typeKey:'custom:'+t.id}))];
}
export const CREATION_CONTENT_MODULE='brp-uge-compendium';
export const CREATION_CONTENT_FILES=Object.freeze({
  personality:'data/creation/personality-4-book-templates.json',
  occupations:'data/creation/occupations-44-staged-choice-groups.json'
});
/** One complete installed module is authoritative. Never merge old imported
 * standard data with a new module, and never write settings/Actors on load. */
export async function loadCreationTemplateData(gameApi=globalThis.game,{fetcher=globalThis.fetch,route=globalThis.foundry?.utils?.getRoute??(p=>p)}={}){
  const source={moduleId:CREATION_CONTENT_MODULE,version:null,status:'inactive'};
  const customRaw=gameApi?.settings?.get('brp-uge','creationTemplateData')??'{}';
  let customPersonalities=[];
  try {
    const raw=typeof customRaw==='string'?JSON.parse(customRaw):customRaw;
    const checked=readCreationTemplateData({customPersonalities:raw?.customPersonalities??[]});
    if(checked.error)throw Error(checked.error);
    customPersonalities=checked.customPersonalities;
  }catch(error){return {source,error:'Invalid custom Personality settings: '+error.message};}
  const installed=gameApi?.modules?.get(CREATION_CONTENT_MODULE);
  if(!installed?.active)return {source,customPersonalities};
  source.version=installed.version??null;
  try {
    const entries=await Promise.all(Object.entries(CREATION_CONTENT_FILES).map(async ([key,path])=>{
      const response=await fetcher(route('modules/'+CREATION_CONTENT_MODULE+'/'+path),{cache:'no-store'});
      if(!response.ok)throw Error(path+' (HTTP '+response.status+')');
      return [key,await response.json()];
    }));
    const data=readCreationTemplateData({...Object.fromEntries(entries),customPersonalities});
    if(data.error)throw Error(data.error);
    if(!data.personality?.templates?.length||!data.occupations?.items?.length)throw Error('Incomplete creation template bundle');
    return {...data,source:{...source,status:'loaded'}};
  }catch(error){
    return {customPersonalities,source:{...source,status:'error'},error:'Compendium creation data unavailable: '+error.message};
  }
}
/** Explicit GM action for campaign-specific custom personalities only. Legacy
 * standard imports are ignored; the installed module is authoritative. */
export async function importCreationTemplates(input, gameApi=globalThis.game){
  requireValue(gameApi?.user?.isGM,'GM approval required');
  requireValue(obj(input),'Expected external template documents');
  requireValue(Object.keys(input).length===1&&Object.hasOwn(input,'customPersonalities'),'Standard templates must be installed as a complete Compendium module');
  const next={customPersonalities:input.customPersonalities};
  const checked=readCreationTemplateData(next);
  requireValue(!checked.error,checked.error);
  requireValue(Object.keys(input).every(k=>['personality','occupations','customPersonalities'].includes(k)),'Unknown import field');
  await gameApi.settings.set('brp-uge','creationTemplateData',JSON.stringify(next));
  return {personalities:list(next.personality?.templates).length,custom:list(next.customPersonalities).length,
    occupations:list(next.occupations?.items).length,groups:list(next.occupations?.items).reduce((n,i)=>n+i.patch.skillChoiceGroups.length,0),
    reviewIssues:list(next.occupations?.items).reduce((n,i)=>n+i.extendedReview.requirements.length,0)};
}
export function externalOccupationSourceId(item){
  if(item?.parent?.documentName==='Actor'||item?.uuid?.startsWith('Actor.'))return null;
  const prefix='Compendium.'+CREATION_CONTENT_MODULE+'.occupations.Item.';
  const refs=[item?.uuid,item?.flags?.core?.sourceId,item?.flags?.['brp-uge']?.sourceUuid,item?.flags?.['brp-uge']?.originalSourceUuid];
  return refs.find(ref=>typeof ref==='string'&&ref.startsWith(prefix))?.slice(prefix.length)||null;
}
export function externalOccupationPatch(item,data){
  const id=externalOccupationSourceId(item);
  return id?list(data?.occupations?.items).find(i=>i._id===id)||null:null;
}
export function externalOccupationDataError(item,data){
  if(!externalOccupationSourceId(item)||externalOccupationPatch(item,data))return null;
  return data?.error||'Occupation template unavailable in the active Compendium module';
}
export function occupationWithExternalPatch(base,patch){
  return patch?{...base,skillRefs:[...patch.patch.skillRefs],skillChoiceGroups:patch.patch.skillChoiceGroups,
    externalReview:patch.extendedReview}:base;
}
function exactSkill(catalog,ref,key){
  return catalog.find(s=>concreteSkill(s)&&(!ref||linkedOccupationSkill(s,ref))&&(!key||canonicalSkillKey(s)===key));
}
function optionCandidates(option,catalog,registry,library,lang,guard={}){
  const label=s=>lang==='th'?(s.system?.nameTh||s.system?.nameEn||s.name):(s.system?.nameEn||s.name);
  if(option.kind==='skill'){
    const s=exactSkill(catalog,option.ref,option.canonicalSkillKey);
    if(!s)return [];
    const key=canonicalSkillKey(s);
    const info=analyzeSkillFamily(s);
    if(info?.supportsSpecialty){
      const family=registry.find(f=>f.key===info.key);
      const approved=family?.options?.find(o=>!o.hidden&&o.key===specialtyFamilyKey(info.enSpecialty));
      if(!approved||family.fingerprintConflict||!specialtyTemplateFor(family,approved,library))return [];
    }
    if(guard.nonNative||guard.mustBeNonNative||guard.notBookDefault)return [];
    if((guard.languageRole||Array.isArray(guard.allowedCanonicalKeys))&&!list(guard.allowedCanonicalKeys).includes(key))return [];
    return [{key,label:label(s)}];
  }
  const family=registry.find(f=>f.key===specialtyFamilyKey(option.familyKey));
  if(!family||family.fingerprintConflict)return [];
  return list(family.options).filter(o=>{
    if(o.hidden||specialtyNeedsReview(o.en)||!specialtyTemplateFor(family,o,library))return false;
    if(option.kind==='specialty'&&o.key!==specialtyFamilyKey(option.specialtyKey)&&o.bookKey!==specialtyFamilyKey(option.specialtyKey))return false;
    if((guard.nonNative||guard.mustBeNonNative)&&(family.key!=='language'||o.key==='own'||o.bookKey==='own'))return false;
    if(guard.notBookDefault&&(o.bookKey===guard.notBookDefault||o.key===guard.notBookDefault))return false;
    const identityKeys=[family.key+'|'+o.key,...(o.bookKey?[family.key+'|'+o.bookKey]:[])];
    if(guard.languageRole==='programming_language'&&!list(guard.allowedCanonicalKeys).some(k=>identityKeys.includes(k)))return false;
    if(Array.isArray(guard.allowedCanonicalKeys)&&!guard.allowedCanonicalKeys.some(k=>identityKeys.includes(k)))return false;
    return true;
  }).map(o=>({key:family.key+'|'+o.key,label:(lang==='th'?family.thFamily:family.enFamily)+' ('+(lang==='th'?(o.th||o.en):o.en)+')'}));
}
/** Localized fallback from installed skill metadata, never translated rule prose. */
export function creationGroupLabel(group,index,registry,library,lang='en'){
  const provided=lang==='th'?text(group.labelTh):text(group.labelEn);
  if(provided)return provided;
  const options=list(group.options);
  if(options.length&&options.every(o=>o.familyKey&&specialtyFamilyKey(o.familyKey)===specialtyFamilyKey(options[0].familyKey))){
    const family=registry.find(f=>f.key===specialtyFamilyKey(options[0].familyKey));
    const name=lang==='th'?family?.thFamily:family?.enFamily;
    if(name)return name;
  }
  const sources=options.map(o=>o.kind==='skill'?library.find(s=>o.ref&&linkedOccupationSkill(s,o.ref)||o.canonicalSkillKey&&canonicalSkillKey(s)===o.canonicalSkillKey):registry.find(f=>f.key===specialtyFamilyKey(o.familyKey))?.canonicalTemplate);
  const categories=[...new Set(sources.map(s=>s?.system?.category))];
  if(sources.length&&categories.length===1&&categories[0])return categoryLabel(categories[0],lang);
  return lang==='th'?'กลุ่มตัวเลือก '+(index+1):'Choice group '+(index+1);
}
/** A shortage in a counted group is not permission to substitute a different skill.
 * Report unavailable exact keys separately from campaign families lacking choices. */
export function choiceShortageDetails(group,candidateCount,registry,lang='en'){
  if(candidateCount>=group.count)return '';
  const options=list(group.options),th=lang==='th';
  const missing=[],empty=[];
  for(const o of options){
    if(!['family','specialty'].includes(o.kind))continue;
    const f=registry.find(r=>r.key===specialtyFamilyKey(o.familyKey));
    const name=(th?f?.thFamily:f?.enFamily)||o.familyKey;
    if(o.kind==='specialty'){
      const k=specialtyFamilyKey(o.specialtyKey);
      if(!f?.options?.some(v=>!v.hidden&&(v.key===k||v.bookKey===k)))missing.push(name+' ('+o.specialtyKey+')');
    }else if(!f?.options?.some(v=>!v.hidden))empty.push(name);
  }
  const parts=[];
  if(missing.length)parts.push((th?'ไม่พบความเชี่ยวชาญที่ระบุในรายการที่เปิดใช้: ':'Specified specialties not enabled or available: ')+[...new Set(missing)].join(', '));
  if(empty.length)parts.push((th?'ยังไม่มีความเชี่ยวชาญที่เปิดใช้ในกลุ่ม: ':'No enabled specialties in: ')+[...new Set(empty)].join(', '));
  return parts.join(' · ');
}
function buildPlan({fixed=[],groups=[],reviews=[],catalog=[],registry=[],library=[],lang='en'}){
  const fixedChoices=new Map(),errors=[],rawGroups=[...groups];
  for(const [i,r] of fixed.entries()){
    const option=r.requirement==='exact-skill'?{kind:'skill',ref:r.sourceUuid,canonicalSkillKey:r.canonicalSkillKey}:
      {kind:r.requirement==='exact-specialty'?'specialty':'family',familyKey:r.familyKey,specialtyKey:r.specialtyKey};
    if(r.requirement==='family-specialty'){
      rawGroups.push({id:'fixed-family-'+i,labelEn:r.familyKey,labelTh:registry.find(f=>f.key===r.familyKey)?.thFamily||'',count:1,options:[option],semanticGuards:r.constraint||{},fixedRequirement:true});
      continue;
    }
    const matches=optionCandidates(option,catalog,registry,library,lang,r.constraint||{});
    if(matches.length!==1){errors.push((lang==='th'?'ไม่พบหรือพบข้อมูลทักษะบังคับซ้ำ: ':'Unavailable or ambiguous fixed skill: ')+(r.canonicalSkillKey||r.sourceUuid||r.familyKey+'|'+r.specialtyKey));continue;}
    const c=matches[0];
    if(fixedChoices.has(c.key))errors.push((lang==='th'?'ทักษะบังคับซ้ำ: ':'Duplicate fixed skill: ')+c.key);
    fixedChoices.set(c.key,c);
  }
  const planned=rawGroups.map((g,index)=>{
    const label=creationGroupLabel(g,index,registry,library,lang);
    const review=reviews.find(r=>r.groupId===g.id);
    const guards={...(review?.semanticGuards||{}),...(g.semanticGuards||{})};
    try{validateGuard(guards);}catch(e){errors.push(g.id+': '+e.message);}
    if(review?.unresolvedTokens?.length)errors.push(label+(lang==='th'?' — ยังไม่พบข้อมูลอ้างอิง: ':' — unresolved source: ')+review.unresolvedTokens.map(t=>t.token).join(', '));
    if(guards.languageRole==='programming_language'&&!guards.allowedCanonicalKeys?.length)errors.push(label+(lang==='th'?' — ยังไม่ได้กำหนดภาษาคอมพิวเตอร์ที่อนุมัติ':' — GM-approved programming language keys required'));
    const candidates=new Map(),unavailableExactOptions=[];
    for(const o of list(g.options)){
      const available=optionCandidates(o,catalog,registry,library,lang,guards);
      if(o.kind==='specialty'&&!available.length){
        const family=registry.find(f=>f.key===specialtyFamilyKey(o.familyKey));
        const familyLabel=(lang==='th'?family?.thFamily:family?.enFamily)||o.familyKey;
        unavailableExactOptions.push({familyKey:o.familyKey,specialtyKey:o.specialtyKey,label:familyLabel+' ('+o.specialtyKey+')'});
      }
      for(const c of available)if(!fixedChoices.has(c.key))candidates.set(c.key,c);
    }
    if(candidates.size<g.count)errors.push(lang==='th'?label+' — มีตัวเลือกที่ใช้ได้ '+candidates.size+'/'+g.count:label+' — insufficient eligible skills ('+candidates.size+'/'+g.count+')');
    return {...g,label,unavailableExactOptions,shortageDetails:choiceShortageDetails(g,candidates.size,registry,lang),candidates:[...candidates.values()].sort((a,b)=>a.label.localeCompare(b.label,lang))};
  });
  if(!unique(planned.map(g=>g.id)))errors.push(lang==='th'?'รหัสกลุ่มตัวเลือกซ้ำ':'Duplicate choice group IDs');
  const plan={fixed:[...fixedChoices.values()],groups:planned,errors,lang};
  const capacity=choicePlanCapacity(plan);
  if(!capacity.possible&&planned.every(g=>g.candidates.length>=g.count))errors.push(lang==='th'?'กลุ่มตัวเลือกไม่สามารถเลือกให้ครบโดยไม่ซ้ำกัน ('+capacity.matched+'/'+capacity.required+')':'Choice groups cannot be satisfied without duplicate skills ('+capacity.matched+'/'+capacity.required+')');
  return plan;
}
export function personalityPlan(template,catalog,registry,library,lang='en'){
  if(!template)return {fixed:[],groups:[],lang,errors:[lang==='th'?'ไม่พบข้อมูลรูปแบบบุคลิก':'External Personality template unavailable']};
  return {...buildPlan({fixed:template.fixedSkills,groups:template.choiceGroups,catalog,registry,library,lang}),requiredTotal:template.requiredTotalSkills,bonus:template.bonus.value};
}
export function occupationPlan(prof,catalog,registry,library,lang='en'){
  const refs=list(prof?.skillRefs);
  const fixed=refs.filter(ref=>!library.some(s=>isSkillFamilyTemplate(s)&&linkedOccupationSkill(s,ref))).map(ref=>({requirement:'exact-skill',sourceUuid:ref}));
  const groups=resolveOccupationTemplateGroups(prof,library);
  const raw=list(prof?.skillChoiceGroups);
  const merged=groups.map(g=>({...g,semanticGuards:raw.find(r=>r.id===g.id)?.semanticGuards,options:raw.find(r=>r.id===g.id)?.options||g.options}));
  // A malformed or empty raw group must not disappear as though complete.
  for(const g of raw)if(!merged.some(x=>x.id===g.id))merged.push(g);
  const plan=buildPlan({fixed,groups:merged,reviews:list(prof?.externalReview?.requirements),catalog,registry,library,lang});
  if(prof?.externalDataError)plan.errors.push(prof.externalDataError);
  return plan;
}
export function choiceGroupView(plan,selections){
  return plan.groups.map(g=>{
    const selected=list(selections?.[g.id]);
    const excluded=new Set([...plan.fixed.map(c=>c.key),...Object.entries(selections||{}).filter(([id])=>id!==g.id).flatMap(([,ks])=>list(ks))]);
    const candidates=new Map(g.candidates.map(c=>[c.key,c]));
    for(const key of selected)if(!candidates.has(key))candidates.set(key,{key,label:key+' (unavailable)'});
    return {...g,selectedCount:selected.length,complete:selected.length===g.count,
      candidates:[...candidates.values()].map(c=>({...c,selected:selected.includes(c.key),disabled:!selected.includes(c.key)&&(selected.length>=g.count||excluded.has(c.key))}))};
  });
}
export function validateChoicePlan(plan,selections,catalog){
  const th=plan.lang==='th';
  const errors=[...plan.errors],keys=new Set(plan.fixed.map(c=>c.key)),known=new Set(catalog.filter(concreteSkill).map(canonicalSkillKey));
  for(const c of plan.fixed)if(!known.has(c.key))errors.push((th?'ไม่พบทักษะบังคับ: ':'Fixed skill unavailable: ')+c.label);
  for(const [id,chosen] of Object.entries(selections||{}))if(list(chosen).length&&!plan.groups.some(g=>g.id===id))errors.push((th?'ไม่พบกลุ่มตัวเลือก: ':'Unknown choice group: ')+id);
  for(const g of plan.groups){
    const chosen=list(selections?.[g.id]);
    if(chosen.length!==g.count)errors.push(g.label+(th?' — เลือกให้ครบ ':' — select ')+g.count+(th?' รายการ':' skills'));
    for(const key of chosen){
      if(keys.has(key))errors.push((th?'ทักษะซ้ำ: ':'Duplicate skill: ')+(g.candidates.find(c=>c.key===key)?.label||key));
      if(!g.candidates.some(c=>c.key===key)||!known.has(key))errors.push(g.label+(th?' — ไม่พบทักษะ: ':' — unavailable skill: ')+key);
      else keys.add(key);
    }
  }
  if(plan.requiredTotal!==undefined&&keys.size!==plan.requiredTotal)errors.push((th?'จำนวนทักษะบุคลิก: ':'Personality skill total: ')+keys.size+'/'+plan.requiredTotal);
  return {valid:errors.length===0,errors,keys:[...keys].filter(k=>known.has(k))};
}

/** Bipartite matching of slots to unique concrete keys: detect groups which
 * individually have enough options but cannot all be satisfied together. */
export function choicePlanCapacity(plan){
  const fixed=new Set(plan.fixed.map(c=>c.key)),slots=[];
  for(const g of plan.groups){
    const candidates=g.candidates.map(c=>c.key).filter(k=>!fixed.has(k));
    for(let i=0;i<g.count;i++)slots.push(candidates);
  }
  const owners=new Map();
  function assign(slot,seen){
    for(const key of slots[slot]){
      if(seen.has(key))continue;
      seen.add(key);
      if(!owners.has(key)||assign(owners.get(key),seen)){
        owners.set(key,slot);return true;
      }
    }
    return false;
  }
  let matched=0;
  for(let i=0;i<slots.length;i++)if(assign(i,new Set()))matched++;
  return {possible:matched===slots.length,matched,required:slots.length};
}
export async function auditCreationTemplates(gameApi=globalThis.game){
  const data=await loadCreationTemplateData(gameApi);
  const library=await getLibraryDocuments({types:['skill','occupation']});
  const catalog=library.filter(i=>i.type==='skill');
  const registry=buildSpecialtyRegistry(catalog,gameApi.settings.get('brp-uge','specialtyRegistry'),gameApi.settings.get('brp-uge','specialtyPresets'));
  const lang=gameApi.settings.get('brp-uge','uiLanguage')||'en';
  const inspect=(id,plan)=>{const capacity=choicePlanCapacity(plan);return {id,ready:plan.errors.length===0&&capacity.possible,errors:plan.errors,
    fixed:plan.fixed.length,groups:plan.groups.length,matched:capacity.matched,required:capacity.required,
    unavailableExactOptions:plan.groups.flatMap(g=>list(g.unavailableExactOptions).map(o=>({...o,groupId:g.id,groupCount:g.count,available:g.candidates.length,shortage:g.candidates.length<g.count}))) };};
  const personalities=creationPersonalityTemplates(data).map(t=>inspect(t.typeKey,personalityPlan(t,catalog,registry,catalog,lang)));
  const occupations=list(data.occupations?.items).map(p=>{
    const source=library.find(i=>i.type==='occupation'&&externalOccupationPatch(i,data)?._id===p._id);
    const plan=occupationPlan(occupationWithExternalPatch({},p),catalog,registry,catalog,lang);
    if(!source)plan.errors.push('Occupation source unavailable: '+p._id);
    return inspect(p.stableKey||p._id,plan);
  });
  return {source:data.source,error:data.error??null,personalityCount:personalities.length,occupationCount:occupations.length,personalities,occupations};
}
