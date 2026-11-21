/** BRP UGE library taxonomy, designed for browsing rather than as an official era classification. */
export const BRP_ERAS = [
  { key: "all", th: "ทุกยุคสมัย", en: "All eras" },
  { key: "universal", th: "ใช้ได้ทุกยุค", en: "Era-neutral" },
  { key: "ancient", th: "ยุคโบราณ", en: "Ancient" },
  { key: "medieval", th: "ยุคกลาง / แฟนตาซี", en: "Medieval / Fantasy" },
  { key: "early-modern", th: "ยุคดินปืนตอนต้น", en: "Early modern" },
  { key: "modern", th: "ยุคปัจจุบัน", en: "Modern" },
  { key: "futuristic", th: "อนาคต / ไซไฟ", en: "Futuristic / Sci-fi" }
];

export const BRP_GROUPS = {
  combat: ["การต่อสู้", "Combat"], communication: ["การสื่อสาร", "Communication"],
  manipulation: ["การประดิษฐ์/ใช้มือ", "Manipulation"], mental: ["ความรู้และจิตใจ", "Mental"],
  perception: ["การรับรู้", "Perception"], physical: ["ร่างกาย", "Physical"],
  melee: ["อาวุธประชิด", "Melee weapons"], missile: ["อาวุธยิงโบราณ", "Missile weapons"],
  firearm: ["อาวุธปืน", "Firearms"], heavy: ["อาวุธหนัก", "Heavy weapons"],
  natural: ["อาวุธธรรมชาติ", "Natural weapons"], shield: ["โล่", "Shields"],
  armor: ["ชุดเกราะ", "Armor"], Magic: ["เวทมนตร์", "Magic"], Sorcery: ["ไสยเวท", "Sorcery"],
  Psychic: ["พลังจิต", "Psychic"], Mutation: ["การกลายพันธุ์", "Mutations"],
  Superpower: ["พลังยอดมนุษย์", "Superpowers"],
  vehicle: ["พาหนะ", "Vehicles"], equipment: ["อุปกรณ์", "Equipment"],
  passions: ["แรงผลักดัน", "Passions"], pregen: ["ตัวละครสำเร็จรูป", "Pregens"],
  npc: ["NPC และสิ่งมีชีวิต", "NPCs and creatures"],
  occupations: ["อาชีพ", "Occupations"], wealth: ["ฐานะ", "Wealth"], conditions: ["สถานะและเงื่อนไข", "Conditions"]
};

const icon = (name) => `systems/brp-uge/assets/icons/${name}.webp`;
const contains = (s, pattern) => pattern.test(s);

export function getBRPGroup(category, entry) {
  const type = entry.type;
  const s = entry.system ?? {};
  if (category === "occupations" || type === "occupation") return "occupations";
  if (category === "wealth" || type === "wealth") return "wealth";
  if (category === "statuses" || type === "status") return "conditions";
  if (category === "skills" || type === "skill") return s.category || "mental";
  if (category === "weapons" || type === "weapon" || type === "shield") return type === "shield" ? "shield" : s.weaponClass || "melee";
  if (category === "armor" || type === "armor") return "armor";
  if (category === "powers" || type === "power") return s.system || "Magic";
  if (category === "passions" || type === "passion") return "passions";
  if (category === "actors" || type === "npc" || type === "character") return type === "npc" ? "npc" : "pregen";
  if (category === "gear" || type === "gear") {
    const text = `${entry.name} ${s.description || ""}`.toLowerCase();
    return contains(text, /vehicle|car|aircraft|boat|ship|horse|motorcycle|truck|spaceship|รถ|เรือ|ยาน|พาหนะ/) ? "vehicle" : "equipment";
  }
  return "equipment";
}

export function getBRPIcon(category, entry) {
  const s = entry.system ?? {};
  const t = `${entry.name} ${s.description || ""}`.toLowerCase();
  if (category === "actors") return entry.img || "icons/svg/mystery-man.svg";
  if (entry.type === "status") return icon("psychic");
  if (entry.type === "occupation") return icon("pack");
  if (entry.type === "shield") return icon("shield");
  if (entry.type === "armor") return icon("armor");
  if (entry.type === "weapon") {
    if (/firearm|heavy/.test(s.weaponClass || "") || /gun|pistol|rifle|ปืน/.test(t)) return icon("pistol");
    if (/bow|arrow|sling|crossbow|ธนู|หน้าไม้/.test(t)) return icon("bow");
    if (/axe|hammer|mace|ขวาน|ค้อน/.test(t)) return icon("axe");
    return icon("sword");
  }
  if (entry.type === "power") {
    if (/fire|flame|burn|ไฟ|เพลิง/.test(t)) return icon("fire");
    if (/lightning|electric|storm|สายฟ้า|ไฟฟ้า/.test(t)) return icon("lightning");
    if (/plant|nature|heal|wood|พืช|ธรรมชาติ|รักษา/.test(t)) return icon("nature");
    if (s.system === "Psychic") return icon("psychic");
    if (s.system === "Mutation") return icon("nature");
    if (s.system === "Superpower") return icon("radiant");
    if (s.system === "Sorcery") return icon("cosmic");
    return icon("spirit");
  }
  if (entry.type === "skill") {
    if (s.category === "combat") return icon("sword");
    if (s.category === "mental") return icon("psychic");
    if (s.category === "perception") return icon("cosmic");
    if (s.category === "physical") return icon("lightning");
    if (s.category === "manipulation") return icon("tech");
    return icon("radiant");
  }
  if (entry.type === "passion") return icon("radiant");
  if (entry.type === "gear") return /medicine|first aid|serum|healing|ยา|รักษา|แพทย์/.test(t) ? icon("potion") : getBRPGroup(category, entry) === "vehicle" ? icon("tech") : icon("pack");
  return icon("pack");
}

/** The base engine displays its neutral icons unchanged. An optional appearance
 * module may register an icon resolver for system-owned icons only. */
export function getThemedBRPIcon(entry) {
  const img=String(entry?.img||'');
  // Generic book placeholders in imported data should use the neutral icon
  // appropriate to their Item type. Never override a custom artwork path.
  const original=(!img || img==='icons/svg/book.svg')?getBRPIcon(entry?.type||'',entry):img;
  if (!/^systems\/brp-uge\/assets\/icons\/[a-z]+\.webp$/.test(original)) return original;
  const resolver = globalThis.game?.brp?.appearance?.iconResolver;
  if (typeof resolver !== 'function') return original;
  try { return resolver(entry, original) || original; }
  catch (error) { console.warn('BRP UGE | Optional icon resolver failed', error); return original; }
}
