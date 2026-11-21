/** BRP UGE condition and aging arithmetic. Pure helpers; never mutate base scores. */
import { youthCharacteristicLoss, eduAgeBonus } from "./rules/character-creation.mjs";
import { itemMatchesReference } from "./reference-utils.mjs";
import { getCampaignRules } from "./config.mjs";
export const CHARACTERISTIC_KEYS = ["str", "con", "siz", "int", "pow", "dex", "cha", "edu"];
export const AGING_STAT_KEYS = ["str", "con", "dex", "cha"];

/** Rulebook age 50/60/70: -1 chosen attribute at each decade;
 * 80 onward: -1 to three chosen attributes at each decade.
 * Player-selected order makes the choices transparent and reversible.
 */
export function agePenalties(currentAge, enabled, priority = "con,dex,cha") {
  const result = Object.fromEntries(CHARACTERISTIC_KEYS.map(k => [k, 0]));
  if (!enabled || Number(currentAge) < 50) return result;
  const requested = String(priority).split(",").map(k => k.trim().toLowerCase()).filter(k => AGING_STAT_KEYS.includes(k));
  const earlyChoices = requested.length ? requested : ["con", "dex", "cha"];
  // Three different characteristics at age 80+, while earlier decade choices
  // may legitimately repeat the same characteristic (e.g. CON at 50 and 60).
  const laterChoices = [...new Set(requested)];
  for (const k of AGING_STAT_KEYS) if (!laterChoices.includes(k)) laterChoices.push(k);
  let earlier = 0;
  for (let decade = 50; decade <= Math.min(200, Math.floor(Number(currentAge) / 10) * 10); decade += 10) {
    if (decade < 80) result[earlyChoices[(earlier++) % earlyChoices.length]]--;
    else for (const k of laterChoices.slice(0, 3)) result[k]--;
  }
  return result;
}


/** Split the Step Three decade-based adjustments into creation and subsequent
 * birthdays. This is a transparent breakdown of the DETERMINISTIC character-
 * creation thresholds, not the optional random Aging & Inaction system (p.120).
 * The cumulative total is always based on the CURRENT age; moving startingAge
 * alone cannot reset an actor's earned age penalties or mutate raw scores.
 */
export function agePenaltyBreakdown(startingAge, currentAge, enabled, priority = "con,dex,cha") {
  const current = Number.isFinite(Number(currentAge)) ? Math.max(0, Math.floor(Number(currentAge))) : 0;
  const starting = startingAge === null || startingAge === undefined || startingAge === ""
    ? current : Math.max(0, Math.floor(Number(startingAge) || 0));
  const original = agePenalties(Math.min(starting, current), enabled, priority);
  const total = agePenalties(current, enabled, priority);
  const afterStart = Object.fromEntries(CHARACTERISTIC_KEYS.map(k => [k, total[k] - original[k]]));
  return { starting, current, yearsElapsed: Math.max(0, current - starting),
    invalidAgeOrder: current < starting, atCreation: original, afterStart, total };
}

export function characteristicAdjustments(system) {
  const aging = agePenalties(system?.age, system?.applyAgingRules, system?.agingPriority);
  if (system?.applyAgingRules && system?.ageReference != null) {
    const youth = youthCharacteristicLoss(system.age,system.ageReference);
    const selected = String(system.ageYouthCharacteristic || "siz").toLowerCase();
    if (youth && selected !== "edu" && CHARACTERISTIC_KEYS.includes(selected)) aging[selected] -= youth;
    // EDU is an optional characteristic: older characters gain +1 per full 10 years
    // added to the original rolled starting age (BRP UGE p.10).
    const enabledEdu = getCampaignRules().useEdu;
    if (enabledEdu) aging.edu += eduAgeBonus(system.age,system.ageReference);
  }
  for (const effect of system?.statusEffects ?? []) {
    if (!effect.active || !CHARACTERISTIC_KEYS.includes(effect.characteristic)) continue;
    aging[effect.characteristic] += Number(effect.statModifier || 0);
  }
  return aging;
}

export function effectiveCharacteristics(system) {
  const deltas = characteristicAdjustments(system);
  return Object.fromEntries(CHARACTERISTIC_KEYS.map(key => [key,
    Math.max(1, Number(system?.characteristics?.[key]?.value ?? 10) + (deltas[key] ?? 0))
  ]));
}

/** Skill penalties can target one skill, all skills, or sight-based skills.
 * Sight tags are preferred to English/Thai name heuristics for custom skills.
 */
export function statusSkillAdjustment(system, skill) {
  let bonus = 0, difficult = false;
  const name = `${skill?.name ?? ""} ${skill?.system?.nameTh ?? ""} ${skill?.system?.nameEn ?? ""}`;
  const tags = String(skill?.system?.tags ?? "").toLowerCase().split(/[,| ]+/);
  const visual = tags.includes("visual") || tags.includes("vision") || /\b(spot|appraise|read|sight|see)\b|มอง|สังเกต|มองเห็น|ประเมินราคา/.test(name.toLowerCase());
  for (const effect of system?.statusEffects ?? []) {
    if (!effect.active) continue;
    const category = String(skill?.system?.category ?? "").toLowerCase();
    const selected = Array.isArray(effect.skillIds) ? effect.skillIds : [];
    const selectedRefs=Array.isArray(effect.skillRefs)?effect.skillRefs:[];
    const matches = effect.skillScope === "all" ||
      (effect.skillScope === "visual" && visual) ||
      (effect.skillScope === "category" && category && category === String(effect.skillCategory ?? "").toLowerCase()) ||
      (effect.skillScope === "specific" && (selected.includes(skill?.id) || effect.skillId === skill?.id || selectedRefs.some(ref=>itemMatchesReference(skill,ref))));
    if (!matches) continue;
    const numeric = Number(effect.skillModifier ?? 0);
    if (Number.isFinite(numeric)) bonus += numeric;
    difficult ||= Boolean(effect.makeDifficult);
  }
  return { bonus, difficult };
}
