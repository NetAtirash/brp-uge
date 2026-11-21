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