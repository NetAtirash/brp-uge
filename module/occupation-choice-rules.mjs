/** Occupation Skill choices, using typed requirements rather than translated labels. */
import { analyzeSkillFamily, specialtyFamilyKey } from './skill-specialties.mjs';
import { canonicalSkillKey } from './skill-foundation.mjs';
import { linkedOccupationSkill } from './occupation-skill-linking.mjs';

const str=v=>String(v??'').trim();
export function normalizeOccupationChoiceGroups(value) {
  return (Array.isArray(value)?value:[]).map((g,index)=>({
    id:str(g?.id)||'group-'+(index+1),
    labelTh:str(g?.labelTh),labelEn:str(g?.labelEn),
    count:Number.isSafeInteger(Number(g?.count))?Math.max(1,Number(g.count)):1,
    distinct:g?.distinct!==false,
    options:(Array.isArray(g?.options)?g.options:[]).map(opt=>({
      kind:opt?.kind==='family'?'family':'skill',
      familyKey:specialtyFamilyKey(opt?.familyKey),
      ref:str(opt?.ref)
    })).filter(opt=>opt.kind==='family'?!!opt.familyKey:!!opt.ref)
  })).filter(g=>g.options.length>0);
}
export function occupationGroupAllowsSkill(group,skill) {
  if(skill?.type!=='skill')return false;
  return (group.options||[]).some(option=>{
    if(option.kind==='skill')return linkedOccupationSkill(skill,option.ref);
    const info=analyzeSkillFamily(skill);
    return info?.supportsSpecialty && Boolean(info.enSpecialty)
      && specialtyFamilyKey(info.enFamily)===option.familyKey;
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
  if(skill?.type!=='skill')return false;
  if((occupation?.skillRefs||[]).some(ref=>linkedOccupationSkill(skill,ref)))return true;
  const key=canonicalSkillKey(skill);
  const selected=selections&&typeof selections==='object'?selections:{};
  return normalizeOccupationChoiceGroups(occupation?.skillChoiceGroups).some(group=>
    Array.isArray(selected[group.id])&&selected[group.id].includes(key)&&occupationGroupAllowsSkill(group,skill));
}
