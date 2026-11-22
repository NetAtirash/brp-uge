import { occupationSkillEligible, validateOccupationChoices } from './occupation-choice-rules.mjs';
/** Pure display/edit helpers. Never change the underlying BRP category calculations. */
export function shouldShowCategoryBonus(mode, bonus) {
  return mode !== 'none' && Number(bonus) !== 0 && Number.isFinite(Number(bonus));
}
export function shouldShowCategoryColumn(mode, categories = []) {
  return mode !== 'none' && categories.some(group => shouldShowCategoryBonus(mode, group.bonus));
}
export function validateSkillPointValue(raw) {
  // Never coerce empty or fractional user input into an unintended allocation.
  const value = typeof raw === 'string' ? raw.trim() : raw;
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}
export function previewSkillTotal(system = {}, occupation = 0, personal = 0) {
  const rating = system.fixedRating;
  const current = Number(system.total ?? 0);
  if (rating !== null && rating !== undefined && rating !== '') return Math.max(0, current);
  return Math.max(0, current - Number(system.occupationBonus || 0) - Number(system.personalBonus || 0)
    + Number(occupation) + Number(personal));
}
export function buildSkillPointUpdates(skills, edits) {
  const updates=[];
  for(const item of skills){
    const edit = edits.get(item.id);
    if(!edit)continue;
    const occupation=validateSkillPointValue(edit.occupation);
    const personal=validateSkillPointValue(edit.personal);
    if(occupation===null || personal===null) throw new Error(`Invalid Skill points for ${item.name}`);
    if(occupation!==Number(item.system.occupationBonus || 0) || personal!==Number(item.system.personalBonus || 0)){
      updates.push({_id:item.id,'system.occupationBonus':occupation,'system.personalBonus':personal});
    }
  }
  return updates;
}

/** Validate a draft without writing into Actor data. Completed characters use
 * their normal advancement workflow; creation guard applies to unfinished ones. */
export function validateSkillPointDraft(actor,draft,{budget={},cap=Infinity,powerOccupation=0,powerPersonal=0}={}) {
  const errors=[],completed=Boolean(actor?.getFlag?.('brp-uge','creationCompleted'));
  const items=[...(actor?.items??[])],skills=items.filter(item=>item.type==='skill');
  const occupation=items.find(item=>item.type==='occupation')?.system||{};
  const choices=actor?.getFlag?.('brp-uge','creationOccupationChoices')||{};
  const choiceValidation=validateOccupationChoices(occupation.skillChoiceGroups,choices,skills);
  let occ=Number(powerOccupation||0),pers=Number(powerPersonal||0);
  for(const skill of skills){
    const edit=draft.get(skill.id)||{};
    const o=validateSkillPointValue(edit.occupation);
    const p=validateSkillPointValue(edit.personal);
    if(o===null||p===null){errors.push('Invalid points for '+skill.name);continue;}
    occ+=o;pers+=p;
    if(completed)continue;
    if(o>Number(skill.system.occupationBonus||0) && (
      !choiceValidation.valid || !occupationSkillEligible(skill,occupation,choices,skills)))
      errors.push('Occupation points are not allowed on '+skill.name);
    if(o!==Number(skill.system.occupationBonus||0)||p!==Number(skill.system.personalBonus||0)){
      if(Number.isFinite(cap) && previewSkillTotal(skill.system,o,p)>cap)
        errors.push('Creation skill cap exceeded for '+skill.name);
    }
  }
  if(!completed && occ>Number(budget.profession??0))errors.push('Occupation skill points exceed creation budget');
  if(!completed && pers>Number(budget.personal??0))errors.push('Personal skill points exceed creation budget');
  return {valid:errors.length===0,errors,occupationUsed:occ,personalUsed:pers};
}
