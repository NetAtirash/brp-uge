/** Resolve occupation Skill UUIDs against live World/Module compendia.
 *
 * A copied World pack may preserve the original module's core.sourceId but
 * change its operational UUID. Both are legitimate aliases of the SAME record.
 * Never guess missing occupations from labels or change skill point budgets.
 */
import {itemMatchesReference} from './reference-utils.mjs';

const normal = value => String(value ?? '').trim();
const uuidItemId = value => {
  const match=normal(value).match(/^Compendium\.[^.]+\.[^.]+\.Item\.([A-Za-z0-9]{16})$/);
  return match?.[1] ?? null;
};

export function linkedOccupationSkill(skill, reference) {
  if (!skill || !reference || skill.type !== 'skill') return false;
  if (itemMatchesReference(skill,reference)) return true;
  const aliases=[skill.flags?.core?.sourceId,
    skill.flags?.['brp-uge']?.sourceUuid,
    skill.flags?.['brp-uge']?.originalSourceUuid,
    skill.flags?.['brp-uge']?.liveDocumentUuid];
  if (aliases.some(alias => normal(alias) === normal(reference))) return true;
  // Quick Reference and other migration packs preserve a record's 16-char
  // _id even when their pack name changes. Only compare *known* provenance
  // UUIDs, never names or undocumented fuzzy identifiers.
  const targetId=uuidItemId(reference);
  return Boolean(targetId && aliases.some(alias=>uuidItemId(alias)===targetId));
}

export function occupationSkillCoverage(skills, refs=[]) {
  const linked=[];
  const missing=[];
  for (const ref of [...new Set((refs??[]).map(normal).filter(Boolean))]) {
    const index=skills.findIndex(skill=>linkedOccupationSkill(skill,ref));
    if (index < 0) missing.push(ref);
    else if (!linked.includes(index)) linked.push(index);
  }
  return {linked,missing};
}
