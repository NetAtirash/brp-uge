/** Basic skills supplied only by active World Items / installed content packs.
 * Never generates BRP rule data from fallback strings. Idempotent and keeps
 * each existing character's allocations, advancement and edits intact.
 */
import { getLibraryDocuments, documentToEmbeddedItem } from './library-provider.mjs';
import { linkedOccupationSkill } from './occupation-skill-linking.mjs';
import { normalizedText } from './reference-utils.mjs';
import { analyzeSkillFamily } from './skill-specialties.mjs';

export function canonicalSkillKey(item) {
  if(item?.type!=='skill')return '';
  const sys=item.system??{};
  const parsed=analyzeSkillFamily(item);
  // Family Template is a source blueprint, never a concrete Specialty.
  if(parsed?.isTemplate)return parsed.key+'|';
  // Normalize old Compendium names (Science (Astronomy)) and newer structured
  // specialty records to the same family+specialty key.
  if(parsed?.supportsSpecialty && parsed.enSpecialty){
    return `${parsed.key}|${normalizedText(parsed.enSpecialty)}`;
  }
  const key=normalizedText(sys.referenceKey||sys.nameEn||sys.nameTh||item.name);
  return key ? `${key}|` : '';
}
export function uniqueSkills(documents) {
  const seen=new Map();
  for(const item of documents??[]) {
    if(item?.type!=='skill')continue;
    const key=canonicalSkillKey(item);
    if(key&&!seen.has(key))seen.set(key,item);
  }
  return [...seen.values()];
}
export function sameSkill(left,right) {
  if(!left||!right||left.type!=='skill'||right.type!=='skill')return false;
  const key=canonicalSkillKey(left);
  const otherKey=canonicalSkillKey(right);
  if(key&&otherKey)return key===otherKey;
  const refs=[right.uuid,right.flags?.core?.sourceId,right.flags?.['brp-uge']?.sourceUuid,
    right.flags?.['brp-uge']?.originalSourceUuid].filter(Boolean);
  return refs.some(ref=>linkedOccupationSkill(left,ref));
}
export function planMissingBaseSkills(actorSkills,librarySkills) {
  const known=[...(actorSkills??[])].filter(i=>i.type==='skill');
  return uniqueSkills(librarySkills).filter(item=>!known.some(existing=>sameSkill(existing,item)));
}
export async function ensureActorFoundationSkills(actor,{sources='all',documents=null}={}) {
  if(!actor||!['character','npc'].includes(actor.type)||actor.pack)return {created:0,available:0,missingSource:false};
  const library=documents??await getLibraryDocuments({types:['skill'],includeWorld:true,includePacks:sources!=='world'});
  const {configuredStartingSkills}=await import('./skill-selection.mjs');
  // Compendium Family Templates and old subtype examples are selection
  // sources, not automatic Actor skills. Existing Actor-owned Skills are never removed.
  const choices=configuredStartingSkills(library).filter(item=>!analyzeSkillFamily(item)?.supportsSpecialty);
  if(!choices.length)return {created:0,available:0,missingSource:true};
  const missing=planMissingBaseSkills(actor.items,choices);
  const additions=missing.map(documentToEmbeddedItem).filter(Boolean);
  if(additions.length)await actor.createEmbeddedDocuments('Item',additions);
  return {created:additions.length,available:choices.length,missingSource:false};
}