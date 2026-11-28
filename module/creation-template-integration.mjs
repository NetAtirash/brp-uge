/** External creation content. No book-specific template records in this engine. */
import {canonicalSkillKey} from './skill-foundation.mjs';
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
/** Explicit GM action only. Does not write Actor, Item, Pack, or other settings. */
export async function importCreationTemplates(input, gameApi=globalThis.game){
  requireValue(gameApi?.user?.isGM,'GM approval required');
  requireValue(obj(input),'Expected external template documents');
  const previous=readCreationTemplateData(gameApi.settings.get('brp-uge','creationTemplateData'));
  const next={...previous,...input};delete next.error;
  const checked=readCreationTemplateData(next);
  requireValue(!checked.error,checked.error);
  requireValue(Object.keys(input).every(k=>['personality','occupations','customPersonalities'].includes(k)),'Unknown import field');
  await gameApi.settings.set('brp-uge','creationTemplateData',JSON.stringify(next));
  return {personalities:list(next.personality?.templates).length,custom:list(next.customPersonalities).length,
    occupations:list(next.occupations?.items).length,groups:list(next.occupations?.items).reduce((n,i)=>n+i.patch.skillChoiceGroups.length,0),
    reviewIssues:list(next.occupations?.items).reduce((n,i)=>n+i.extendedReview.requirements.length,0)};
}
export function externalOccupationPatch(item,data){
  // Source identity must be proven, including copied World records; never match display names.
  // Existing Actor Items are not replaced by an external import.
  if(item?.parent?.documentName==='Actor'||item?.uuid?.startsWith('Actor.'))return null;
  const refs=[item?.uuid,item?.flags?.core?.sourceId,item?.flags?.['brp-uge']?.sourceUuid,item?.flags?.['brp-uge']?.originalSourceUuid];
  return list(data?.occupations?.items).find(i=>refs.includes('Compendium.brp-uge-compendium.occupations.Item.'+i._id))||null;
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
      if(!approved||!specialtyTemplateFor(family,approved,library))return [];
    }
    if(guard.nonNative||guard.mustBeNonNative||guard.notBookDefault)return [];
    if((guard.languageRole||Array.isArray(guard.allowedCanonicalKeys))&&!list(guard.allowedCanonicalKeys).includes(key))return [];
    return [{key,label:label(s)}];
  }
  const family=registry.find(f=>f.key===specialtyFamilyKey(option.familyKey));
  if(!family)return [];
  return list(family.options).filter(o=>{
    if(o.hidden||specialtyNeedsReview(o.en)||!specialtyTemplateFor(family,o,library))return false;
    if(option.kind==='specialty'&&o.key!==specialtyFamilyKey(option.specialtyKey)&&o.bookKey!==specialtyFamilyKey(option.specialtyKey))return false;
    if((guard.nonNative||guard.mustBeNonNative)&&(family.key!=='language'||o.key==='own'||o.bookKey==='own'))return false;
    if(guard.notBookDefault&&(o.bookKey===guard.notBookDefault||o.key===guard.notBookDefault))return false;
    if(guard.languageRole==='programming_language'&&!list(guard.allowedCanonicalKeys).includes(family.key+'|'+o.key))return false;
    if(Array.isArray(guard.allowedCanonicalKeys)&&!guard.allowedCanonicalKeys.includes(family.key+'|'+o.key))return false;
    return true;
  }).map(o=>({key:family.key+'|'+o.key,label:(lang==='th'?family.thFamily:family.enFamily)+' ('+(lang==='th'?(o.th||o.en):o.en)+')'}));
}
function buildPlan({fixed=[],groups=[],reviews=[],catalog=[],registry=[],library=[],lang='en'}){
  const fixedChoices=new Map(),errors=[],rawGroups=[...groups];
  for(const [i,r] of fixed.entries()){
    const option=r.requirement==='exact-skill'?{kind:'skill',ref:r.sourceUuid,canonicalSkillKey:r.canonicalSkillKey}:
      {kind:r.requirement==='exact-specialty'?'specialty':'family',familyKey:r.familyKey,specialtyKey:r.specialtyKey};
    if(r.requirement==='family-specialty'){
      rawGroups.push({id:'fixed-family-'+i,labelEn:r.familyKey,labelTh:registry.find(f=>f.key===r.familyKey)?.thFamily||r.familyKey,count:1,options:[option],semanticGuards:r.constraint||{},fixedRequirement:true});
      continue;
    }
    const matches=optionCandidates(option,catalog,registry,library,lang,r.constraint||{});
    if(matches.length!==1){errors.push('Unavailable or ambiguous fixed skill: '+(r.canonicalSkillKey||r.sourceUuid||r.familyKey+'|'+r.specialtyKey));continue;}
    const c=matches[0];
    if(fixedChoices.has(c.key))errors.push('Duplicate fixed skill: '+c.key);
    fixedChoices.set(c.key,c);
  }
  const planned=rawGroups.map(g=>{
    const review=reviews.find(r=>r.groupId===g.id);
    const guards={...(review?.semanticGuards||{}),...(g.semanticGuards||{})};
    try{validateGuard(guards);}catch(e){errors.push(g.id+': '+e.message);}
    if(review?.unresolvedTokens?.length)errors.push(g.id+': unresolved source: '+review.unresolvedTokens.map(t=>t.token).join(', '));
    if(guards.languageRole==='programming_language'&&!guards.allowedCanonicalKeys?.length)errors.push(g.id+': GM-approved programming language keys required');
    const candidates=new Map();
    for(const o of list(g.options))for(const c of optionCandidates(o,catalog,registry,library,lang,guards)){
      if(!fixedChoices.has(c.key))candidates.set(c.key,c);
    }
    if(candidates.size<g.count)errors.push(g.id+': insufficient eligible skills ('+candidates.size+'/'+g.count+')');
    return {...g,label:lang==='th'?(g.labelTh||g.labelEn||g.id):(g.labelEn||g.labelTh||g.id),candidates:[...candidates.values()].sort((a,b)=>a.label.localeCompare(b.label,lang))};
  });
  if(!unique(planned.map(g=>g.id)))errors.push('Duplicate choice group IDs');
  const plan={fixed:[...fixedChoices.values()],groups:planned,errors};
  const capacity=choicePlanCapacity(plan);
  if(!capacity.possible)errors.push('Choice groups cannot be satisfied without duplicate skills ('+capacity.matched+'/'+capacity.required+')');
  return plan;
}
export function personalityPlan(template,catalog,registry,library,lang='en'){
  if(!template)return {fixed:[],groups:[],errors:['External Personality template unavailable']};
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
  return buildPlan({fixed,groups:merged,reviews:list(prof?.externalReview?.requirements),catalog,registry,library,lang});
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
  const errors=[...plan.errors],keys=new Set(plan.fixed.map(c=>c.key)),known=new Set(catalog.filter(concreteSkill).map(canonicalSkillKey));
  for(const c of plan.fixed)if(!known.has(c.key))errors.push('Fixed skill unavailable: '+c.key);
  for(const [id,chosen] of Object.entries(selections||{}))if(list(chosen).length&&!plan.groups.some(g=>g.id===id))errors.push('Unknown choice group: '+id);
  for(const g of plan.groups){
    const chosen=list(selections?.[g.id]);
    if(chosen.length!==g.count)errors.push(g.id+': select '+g.count+' skills');
    for(const key of chosen){
      if(keys.has(key))errors.push('Duplicate skill: '+key);
      if(!g.candidates.some(c=>c.key===key)||!known.has(key))errors.push(g.id+': unavailable skill: '+key);
      else keys.add(key);
    }
  }
  if(plan.requiredTotal!==undefined&&keys.size!==plan.requiredTotal)errors.push('Personality skill total: '+keys.size+'/'+plan.requiredTotal);
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
  const data=readCreationTemplateData(gameApi.settings.get('brp-uge','creationTemplateData'));
  if(data.error)throw new Error(data.error);
  const library=await getLibraryDocuments({types:['skill','occupation']});
  const catalog=library.filter(i=>i.type==='skill');
  const registry=buildSpecialtyRegistry(catalog,gameApi.settings.get('brp-uge','specialtyRegistry'),gameApi.settings.get('brp-uge','specialtyPresets'));
  const lang=gameApi.settings.get('brp-uge','uiLanguage')||'en';
  const inspect=(id,plan)=>{const capacity=choicePlanCapacity(plan);return {id,ready:plan.errors.length===0&&capacity.possible,errors:plan.errors,
    fixed:plan.fixed.length,groups:plan.groups.length,matched:capacity.matched,required:capacity.required};};
  const personalities=creationPersonalityTemplates(data).map(t=>inspect(t.typeKey,personalityPlan(t,catalog,registry,catalog,lang)));
  const occupations=list(data.occupations?.items).map(p=>{
    const source=library.find(i=>i.type==='occupation'&&externalOccupationPatch(i,data)?._id===p._id);
    const plan=occupationPlan(occupationWithExternalPatch({},p),catalog,registry,catalog,lang);
    if(!source)plan.errors.push('Occupation source unavailable: '+p._id);
    return inspect(p.stableKey||p._id,plan);
  });
  return {personalityCount:personalities.length,occupationCount:occupations.length,personalities,occupations};
}
