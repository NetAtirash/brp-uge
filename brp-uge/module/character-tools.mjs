/** Actor journal, advancement and bilingual descriptions (pure functions for testability). */
export function sumAdvancement(log, itemId) {
  return (Array.isArray(log) ? log : [])
    .filter(entry => entry.itemId === itemId)
    .reduce((total, entry) => total + Number(entry.points || 0), 0);
}
export function skillBreakdown({ base = 0, category = 0, occupation = 0, personal = 0, legacy = 0, log = 0 } = {}) {
  const training = Number(legacy) + Number(log);
  return { training, total: Number(base) + Number(category) + Number(occupation) + Number(personal) + training };
}
export function powerMode(system = {}) {
  const mode = system.activationType || "auto";
  if (mode !== "auto") return mode;
  if (["Sorcery", "Mutation"].includes(system.system)) return "automatic";
  if (system.system === "Superpower") return "resistance";
  return "skill"; // Magic, Psychic: percentile ability; GM can choose resistance per power.
}
/** Magic spells and Psychic powers are separate skills: INT×1 / POW×1 initially. */
export function powerChance(power, actor) {
  const ps = power?.system ?? {};
  const type = String(ps.system || "Magic");
  const intVal = Number(actor?.system?.derived?.effectiveCharacteristics?.int ?? actor?.system?.characteristics?.int?.value ?? 10);
  const powVal = Number(actor?.system?.derived?.effectiveCharacteristics?.pow ?? actor?.system?.characteristics?.pow?.value ?? 10);
  const base = ps.chanceOverride != null ? Number(ps.chanceOverride) :
    ps.baseChance != null ? Number(ps.baseChance) :
    type === "Magic" ? intVal : type === "Psychic" ? powVal : 0;
  return Math.max(0, base + Number(ps.occupationBonus ?? 0) + Number(ps.personalBonus ?? 0) + Number(ps.trainingTotal ?? 0));
}
export function getTooltipLanguage() {
  try { return game.settings.get("brp-uge", "itemTooltipLanguage") || game.settings.get("brp-uge", "uiLanguage") || "th"; }
  catch (_) { return "th"; }
}
export function getItemDescription(system = {}, lang = "th") {
  const localized = String(lang === "en" ? system.descriptionEn ?? "" : system.descriptionTh ?? "").trim();
  if (localized) return localized;
  const legacy = String(system.description ?? "").trim();
  // Backwards compatibility with 1.7 data while honoring the selected language.
  const match = legacy.match(/^ชื่อภาษาอังกฤษ:\s*(.*?)\s*[—–-]\s*([\s\S]*?)\s*\n\s*\(([\s\S]*)\)\s*$/);
  if (!match) return legacy;
  return lang === "en" ? `${match[1]} — ${match[3]}` : match[2];
}
export function getItemTooltip(system = {}, lang = "th") {
  return getItemDescription(system, lang).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
export function escapeForChat(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[ch]));
}

/** Keep historical Item.name intact; localized names are non-destructive optional overrides. */
export function getLocalizedName(item, lang = "th") {
  if (!item) return "";
  const sys = item.system ?? {};
  const preferred = String(lang === "en" ? (sys.nameEn ?? "") : (sys.nameTh ?? "")).trim();
  if (preferred) return preferred;
  const old = String(item.name ?? "");
  const match = String(sys.description ?? "").match(/ชื่อภาษาอังกฤษ:\s*([^\n—–]+?)(?:\s*[—–]|\n|$)/);
  if (lang === "en" && match?.[1]) return match[1].trim();
  return old;
}
export function getNameLanguage() {
  try { return game.settings.get("brp-uge", "uiLanguage") || "th"; } catch { return "th"; }
}
export function getSkillNameMatches(item, query) {
  const v = String(query ?? "").trim().toLocaleLowerCase();
  return [item?.name, item?.system?.nameTh, item?.system?.nameEn]
    .some(name => String(name ?? "").toLocaleLowerCase().includes(v));
}
/** Recovery from a wound does not imply that the condition is cured. */
export function recoveredPoints(current, maximum, amount) {
  return Math.max(0, Math.min(Math.max(0, Number(maximum) - Number(current)), Math.max(0, Math.floor(Number(amount) || 0))));
}
/** BRP first aid: one attempt per wound; a successful roll may restore HP without closing it. */
export function firstAidFormula(degree) {
  return ({critical:"3+1d3", special:"2d3", success:"1d3"})[degree] || null;
}
export function medicineFormula(degree) {
  return ({critical:"1d3+3", special:"2d3", success:"1d3"})[degree] || null;
}
