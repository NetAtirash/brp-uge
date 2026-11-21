/** Pure rules for the BRP UGE combat tracker. No Foundry globals. */
export const BRP_PHASES = Object.freeze(["statements", "powers", "action"]);

export const BRP_INTENTS = Object.freeze([
  { id: "melee", th: "โจมตีประชิด", en: "Melee attack", phase: "action" },
  { id: "ranged", th: "ยิง / ขว้าง", en: "Ranged attack", phase: "action" },
  { id: "power", th: "ใช้พลัง / เวทมนตร์", en: "Power / spell", phase: "powers" },
  { id: "defend", th: "ตั้งรับ", en: "Defend", phase: "action" },
  { id: "move", th: "เคลื่อนที่", en: "Move", phase: "action" },
  { id: "other", th: "การกระทำอื่น", en: "Other action", phase: "action" }
]);

const number = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
export function brpMovementMultiplier(meters) {
  const m = Math.max(0, number(meters));
  if (m >= 30) return 0; // Movement-only; no ordinary action
  if (m >= 16) return 0.25;
  if (m >= 6) return 0.5;
  return 1;
}
export function brpActionRank(base, meters = 0, delayTo = 0) {
  const multiplier = brpMovementMultiplier(meters);
  const rank = Math.floor(Math.max(0, number(base)) * multiplier);
  const delay = Math.floor(number(delayTo));
  return multiplier === 0 ? 0 : delay > 0 ? Math.min(rank, delay) : rank;
}
export function brpPlanForRound(map, combatId, combatantId, round) {
  const record = map?.[combatantId];
  return record?.combatId === combatId && record?.round === round
    ? record
    : { combatId, round, intent: "", note: "", moveMeters: 0, delayTo: 0, done: false };
}
export function brpIntentPhase(intent, powerTiming = "separate") {
  return intent === "power" && powerTiming !== "action" ? "powers" : "action";
}
/** Stable rank order for a phase. Numbers are rank values, not d100 success chances. */
export function compareBRPTurns(a, b, opts = {}) {
  const phase = opts.phase || "action";
  const reverseStatements = Boolean(opts.reverseStatements);
  if (phase === "powers") {
    const eligibleA = a.intent === "power" ? 1 : 0;
    const eligibleB = b.intent === "power" ? 1 : 0;
    if (eligibleA !== eligibleB) return eligibleB - eligibleA;
    const diff = b.intRank - a.intRank;
    if (diff) return diff;
    const powDiff = (b.pow ?? 0) - (a.pow ?? 0);
    if (powDiff) return powDiff;
  } else if (phase === "statements") {
    const dexDiff = reverseStatements ? a.dexRank - b.dexRank : b.dexRank - a.dexRank;
    if (dexDiff) return dexDiff;
  } else {
    // A power cast in the Powers phase is the character's action for the round.
    const eligibleA = a.intent === "power" && opts.powerTiming !== "action" ? 0 : 1;
    const eligibleB = b.intent === "power" && opts.powerTiming !== "action" ? 0 : 1;
    if (eligibleA !== eligibleB) return eligibleB - eligibleA;
    const ar = a.actionRank ?? a.dexRank;
    const br = b.actionRank ?? b.dexRank;
    if (ar !== br) return br - ar;
    // Missile attacks before hand-to-hand; longer melee reaches first.
    if ((a.reachRank ?? 0) !== (b.reachRank ?? 0)) return (b.reachRank ?? 0) - (a.reachRank ?? 0);
    if ((a.skillRank ?? 0) !== (b.skillRank ?? 0)) return (b.skillRank ?? 0) - (a.skillRank ?? 0);
  }
  return (a.originalIndex ?? 0) - (b.originalIndex ?? 0) || String(a.id ?? "").localeCompare(String(b.id ?? ""));
}
