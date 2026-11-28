/** Occupation Skill choices, using typed requirements rather than translated labels. */
import { analyzeSkillFamily, specialtyFamilyKey } from './skill-specialties.mjs';
import { canonicalSkillKey } from './skill-foundation.mjs';
import { linkedOccupationSkill } from './occupation-skill-linking.mjs';
import {isSkillFamilyTemplate} from './skill-family-templates.mjs';

const str=v=>String(v??'').trim();
export function normalizeOccupationChoiceGroups(value) {
  return (Array.isArray(value)?value:[]).map((g,index)=>({
    id:str(g?.id)||'group-'+(index+1),
    labelTh:str(g?.labelTh),labelEn:str(g?.labelEn),
    count:Number.isSafeInteger(Number(g?.count))?Math.max(1,Number(g.count)):1,
    distinct:g?.distinct!==false,
    options:(Array.isArray(g?.options)?g.options:[]).map(opt=>({
      kind:opt?.kind==='specialty'?'specialty':opt?.kind==='family'?'family':'skill',
      familyKey:specialtyFamilyKey(opt?.familyKey),
      specialtyKey:specialtyFamilyKey(opt?.specialtyKey),
      ref:str(opt?.ref)
    })).filter(opt=>opt.kind==='family'?!!opt.familyKey:
       opt.kind==='specialty'?!!opt.familyKey&&!!opt.specialtyKey:!!opt.ref)
  })).filter(g=>g.options.length>0);
}
/**
 * A fixed Occupation ref to Language (...) means the player MUST resolve the
 * Specialty before allocating points. Derive a count-1 Family choice group
 * rather than adding the generic template as a character Skill.
 *
 * Explicit book Choose-N clauses remain content-author responsibilities.
 */
export function resolveOccupationTemplateGroups(occupation={},librarySkills=[]) {
  const groups=normalizeOccupationChoiceGroups(occupation?.skillChoiceGroups);
  const known=new Set(groups.map(g=>g.id));
  for(const ref of occupation?.skillRefs||[]){
    const doc=librarySkills.find(skill=>isSkillFamilyTemplate(skill)&&
      linkedOccupationSkill(skill,ref));
    if(!doc)continue;
    const info=analyzeSkillFamily(doc);
    if(!info?.key)continue;
    const id='required-family-'+info.key;
    if(known.has(id))continue;
    known.add(id);
    groups.push({
      id,labelTh:info.thFamily+' — เลือกความเชี่ยวชาญ',
      labelEn:info.enFamily+' — choose a Specialty',
      count:1,distinct:true,
      options:[{kind:'family',familyKey:info.key,ref:''}]
    });
  }
  return groups;
}

export function occupationGroupAllowsSkill(group,skill) {
  if(skill?.type!=='skill')return false;
  return (group.options||[]).some(option=>{
    if(option.kind==='skill')return linkedOccupationSkill(skill,option.ref);
    const info=analyzeSkillFamily(skill);
    if(!info?.supportsSpecialty||!info.enSpecialty ||
      specialtyFamilyKey(info.enFamily)!==option.familyKey)return false;
    return option.kind!=='specialty'||
      specialtyFamilyKey(info.enSpecialty)===option.specialtyKey;
  });
}
export function validateOccupationChoices(groups,selections,catalog) {
  const rules=normalizeOccupationChoiceGroups(groups),errors=[];
  const skills=new Map((catalog||[]).filter(x=>x?.type==='skill').map(x=>[canonicalSkillKey(x),x]));
  const global=new Set();
  for(const group of rules) {
    const chosen=Array.isArray(selections?.[group.id])?selections[group.id]:[];
    if(chosen.length!==group.count)errors.push(group.id+': choose exactly '+group.count+' Skill(s)');
    if(group.distinct&&new Set(chosen).size!==chosen.length)errors.push(group.id+': duplicate Skill');
    for(const key of chosen) {
      const skill=skills.get(key);
      if(!skill || !occupationGroupAllowsSkill(group,skill))errors.push(group.id+': unavailable/invalid choice '+key);
      if(global.has(key))errors.push(group.id+': Skill already chosen in another group');
      global.add(key);
    }
  }
  return {valid:errors.length===0,errors};
}
export function occupationSkillEligible(skill,occupation,selections=[],catalog=[]) {
  if(skill?.type!=='skill'||isSkillFamilyTemplate(skill))return false;
  // A plain Skill can satisfy an exact fixed reference. A template Family
  // reference requires a recorded concrete specialty selection instead.
  if((occupation?.skillRefs||[]).some(ref=>linkedOccupationSkill(skill,ref)))return true;
  const key=canonicalSkillKey(skill);
  const selected=selections&&typeof selections==='object'?selections:{};
  return normalizeOccupationChoiceGroups(occupation?.skillChoiceGroups).some(group=>
    Array.isArray(selected[group.id])&&selected[group.id].includes(key)&&occupationGroupAllowsSkill(group,skill));
}


/** Conservative diagnostic. Never creates choices from prose: it only warns
 * when a likely occupational choose-N Skill clause has no typed metadata.
 * False positives never change stored Actors or official content.
 */
export function occupationChoiceMetadataMissing(occupation={},description='') {
  if(!occupation || normalizeOccupationChoiceGroups(occupation.skillChoiceGroups).length) return false;
  const plain=String(description||'').replace(/<[^>]+>/gu,' ').replace(/\s+/gu,' ').trim();
  if(!plain)return false;
  return /(?:choose|pick|select)\s+(?:(?:any|up to|at least)\s+)?(?:\d+|one|two|three|four|five|six|seven|eight)\s+(?:(?:additional|other|different|of the following|from the following)\s+){0,3}(?:skills?|specialt(?:y|ies))/iu.test(plain)
    || /เลือก(?:[^.!?。]{0,45})(?:ทักษะ|ความเชี่ยวชาญ)/u.test(plain);
}
