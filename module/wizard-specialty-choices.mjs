/**
 * Render-model adapter for the Foundry Character Wizard.
 * Reads the effective GM/Book Specialty Registry. A family and its option list
 * are built together so a Family cannot appear as selectable with an empty,
 * separately injected secondary <select>.
 */
export function wizardSpecialtyFamilies(registry=[],language='th') {
  const isTh=language==='th';
  return (registry||[]).map(group=>{
    const specialties=(group.options||[]).filter(item=>!item.hidden).map(item=>({
      key:item.key,label:isTh?(item.th||item.en):item.en
    }));
    return {
      key:group.key,label:isTh?(group.thFamily||group.enFamily):(group.enFamily||group.thFamily),
      count:specialties.length,specialties
    };
  }).filter(family=>family.count>0);
}

export function wizardOccupationFamilyChoices(registry=[],choiceGroup={},language='th') {
  const allowed=new Set((choiceGroup.options||[])
    .filter(option=>option.kind==='family').map(option=>option.familyKey));
  return wizardSpecialtyFamilies(registry,language)
    .filter(group=>allowed.has(group.key));
}
