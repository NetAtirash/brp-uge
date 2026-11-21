/** BRP UGE (2023), Major Wound Table p.135; original abbreviated effects. */
export const MAJOR_WOUNDS = Object.freeze([
  {max:10,stat:"dex",dice:"1d3",move:true,en:"Leg or spinal injury; impaired movement, can fight",th:"เอ็นขาหรือกระดูกสันหลังบาดเจ็บ เคลื่อนที่ลดลง ยังสู้ได้"},
  {max:20,stat:"cha",dice:"1d3",en:"Visible facial or hand disfigurement; can fight",th:"บาดแผลเสียโฉมที่มองเห็นชัด ยังสู้ได้"},
  {max:30,stat:"str",dice:"1d3",en:"Hand, arm or muscle damage; cannot use a shield",th:"มือ แขน หรือกล้ามเนื้อเสียหาย ใช้โล่ไม่ได้"},
  {max:40,stat:"con",dice:"1d3",move:true,en:"Internal injury; weakened health and movement",th:"อวัยวะภายในเสียหาย สุขภาพและการเคลื่อนที่ลดลง"},
  {max:50,stat:"int",dice:"1d3",en:"Head injury; GM applies relevant skill restrictions",th:"ศีรษะบาดเจ็บ GM พิจารณาข้อจำกัดด้านทักษะ"},
  {max:60,stat:"dex",dice:"1d6",move:true,en:"Severe limb injury; unable to fight",th:"แขนหรือขาเสียหายรุนแรง ไม่สามารถต่อสู้ได้"},
  {max:70,stat:"cha",dice:"1d6",en:"Serious disfigurement; can fight",th:"เสียโฉมรุนแรง ยังต่อสู้ได้"},
  {max:80,stat:"str",dice:"1d6",en:"Severely damaged muscles; can fight",th:"กล้ามเนื้อเสียหายหนัก ยังต่อสู้ได้"},
  {max:90,stat:"con",dice:"1d6",move:true,en:"Critical internal injury; unable to fight",th:"อวัยวะภายในเสียหายหนัก ไม่สามารถต่อสู้ได้"},
  {max:92,stat:"cha",dice:"1d6",en:"Facial and vocal injuries; can fight",th:"ใบหน้าหรือเส้นเสียงเสียหาย ยังต่อสู้ได้"},
  {max:94,stat:"dex",dice:"1d6",en:"Broken bones / nerve damage; one-handed weapons only",th:"กระดูกหรือเส้นประสาทเสียหาย ใช้อาวุธมือเดียวเท่านั้น"},
  {max:96,stat:"dex",dice:"1d6",en:"One arm damaged; can only use the other arm",th:"แขนข้างหนึ่งเสียหาย ใช้แขนอีกข้างได้เท่านั้น"},
  {max:98,stat:"dex",dice:"1d6",en:"Both arms damaged; unable to use hands",th:"แขนทั้งสองข้างเสียหาย ไม่สามารถใช้มือได้"},
  {max:99,stats:["cha","dex","con"],dice:"1d3",en:"Multiple mutilating wounds; unable to fight",th:"บาดเจ็บหลายส่วน ไม่สามารถสู้ได้"},
  {max:100,gmChoice:true,dice:"1d4",en:"Extreme mutilation: GM chooses four characteristics",th:"เสียหายรุนแรงมาก GM เลือกค่าสถานะสี่ชนิด"}
]);
export function majorWoundOutcome(result) {
  const n = Math.trunc(Number(result));
  if (!Number.isFinite(n) || n < 1 || n > 100) throw new RangeError("Major wound roll must be 1–100");
  return MAJOR_WOUNDS.find(w => n <= w.max);
}
export function majorWoundPatch(wound, result, losses, luckPassed) {
  if (wound.majorDetermined) throw new Error("This wound already has a major-wound result");
  return { ...wound, severity:"major", majorDetermined:true, majorRoll:result,
    majorEffectTh: majorWoundOutcome(result).th, majorEffectEn: majorWoundOutcome(result).en,
    majorLuckPassed: Boolean(luckPassed), majorLosses: luckPassed ? {} : {...losses},
    majorApplied: !luckPassed && Object.keys(losses).length>0 };
}
