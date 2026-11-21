/** Convert an explicitly selected/created Status Item into an Actor status row.
 * No status templates are bundled with the game system.
 */
export function statusTemplateToActorEffect(item, id=null) {
  const s=item?.system??{};
  return {id:id||foundry.utils.randomID(),
    name:String(s.nameTh||item.name||'Status'),source:String(s.source||'condition'),active:true,
    characteristic:String(s.characteristic||''),statModifier:Number(s.statModifier)||0,
    skillScope:String(s.skillScope||'none'),skillCategory:String(s.skillCategory||''),
    skillId:'',skillIds:[],skillRefs:[...(s.skillRefs??[])],
    skillModifier:Number(s.skillModifier)||0,makeDifficult:Boolean(s.makeDifficult),
    notes:String(s.notes||s.descriptionTh||''),nameTh:String(s.nameTh||item.name||''),
    nameEn:String(s.nameEn||item.name||'')};
}
export async function applyStatusTemplate(actor,item) {
  if(!actor?.isOwner)throw new Error('No permission to modify Actor status effects');
  const effect=statusTemplateToActorEffect(item);
  await actor.update({'system.statusEffects':[...(actor.system.statusEffects??[]),effect]});
  return effect;
}
