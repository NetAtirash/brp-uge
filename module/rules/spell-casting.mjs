/** BRP UGE Magic p.55 & 59: magic spell cost/level, rather than generic Power PP. */
export function maxSpellLevel(intelligence) {
  return Math.max(1, Math.ceil(Math.max(1, Number(intelligence)||1) / 2));
}
export function spellPPCost(powerData, level = 1) {
  const lv = Math.max(1, Math.trunc(Number(level) || 1));
  const override = powerData?.ppPerLevel;
  const match = String(powerData?.costPP ?? "").match(/^(\d+)/);
  const perLevel = override !== null && override !== undefined && override !== "" ? Number(override) : (match ? Number(match[1]) : 1);
  if (!Number.isFinite(perLevel) || perLevel < 0) throw new Error("Invalid PP cost per level");
  return Math.ceil(perLevel) * lv;
}
export function magicCostOnResult(degree, intended) {
  return degree === "failure" ? 1 : Math.max(0, Math.ceil(Number(intended)||0));
}
export function spellCastingRank(dexterity, level) {
  const dex = Math.max(1, Math.trunc(Number(dexterity) || 1));
  let rank = dex - Math.max(1, Math.trunc(Number(level)||1));
  let roundsLater = 0;
  while(rank < 0){ rank += dex; roundsLater++; }
  return {rank, carriesToNextRound:roundsLater>0, roundsLater};
}
