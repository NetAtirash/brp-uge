/** Presentation-only rule reference extraction. Nothing here changes rule mechanics.
 * The source of truth is the record's bilingual text and provenance metadata.
 * Any catalog/book discrepancy is a warning, never a silent statistic override.
 */
export function plainRuleReference(value) {
  return String(value??'').replace(/<\/?(?:p|div|li|h[1-6]|br|ul|ol)\b[^>]*>/gi,'\n')
    .replace(/<[^>]+>/g,'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&')
    .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/\n\s*\n\s*\n/g,'\n\n').trim();
}
export function buildBRPRulebookView(item, lang = 'th') {
  const ref = item?.flags?.['brp-uge']?.rulebookReference;
  if (!ref || !Array.isArray(ref.pages) || !ref.pages.length) return null;
  const th = String(item.system?.descriptionTh || '');
  const en = String(item.system?.descriptionEn || '');
  const isTh = lang !== 'en';
  const direct = ref.sourceType === 'direct';
  const marker = '\nSOURCE RULE EXCERPT — ';
  const sourceAt = en.indexOf(marker);
  const introEn = sourceAt < 0 ? en : en.slice(0, sourceAt);
  const sourceEn = sourceAt < 0 ? '' : en.slice(sourceAt + marker.length);
  const sourceLineBreak = sourceEn.indexOf('\n');
  const sourceHeader = sourceLineBreak < 0 ? '' : sourceEn.slice(0, sourceLineBreak);
  const sourceBody = sourceLineBreak < 0 ? sourceEn : sourceEn.slice(sourceLineBreak + 1).trim();
  const pages = ref.pages.filter(n => Number.isInteger(n)).join(', ');
  const baseText = sourceBody.match(/Base Chance:\s*(\d{1,3})\s*%(?:\s+(or equal to [^\n]*?)(?=\s+Category:|\s+The ability|$))?/i);
  const catalogBase = Number(item.system?.base);
  const isSkill = item.type === 'skill' && Number.isFinite(catalogBase);
  let baseWarning = '';
  if (direct && isSkill && baseText && catalogBase !== Number(baseText[1])) {
    const conditional = baseText[2] || '';
    const conditionalTh = conditional.replace(/^or equal to /i, '');
    // Some skills (notably Literacy) have a setting- or language-dependent base;
    // never present the captured numeral as the sole authoritative value.
    baseWarning = isTh
      ? `ค่าเริ่มต้นใน Catalog: ${catalogBase}% · ในหนังสือ: ${baseText[1]}%${conditional ? ` หรือเท่ากับ ${conditionalTh}` : ''} — ให้ GM ตรวจสอบก่อนใช้`
      : `Catalog base: ${catalogBase}% · Rulebook: ${baseText[1]}%${conditional ? ` ${conditional}` : ''} — confirm with GM`;
  }
  return {
    direct,
    isTh,
    heading: String(ref.heading || ''),
    pages,
    sourceLabel: direct
      ? (isTh ? 'ข้อมูลอ้างอิงตรงจากหนังสือ' : 'Direct rulebook reference')
      : (isTh ? 'ข้อมูลตัวอย่าง/การดัดแปลงของโมดูล' : 'Module example or adaptation'),
    book: String(ref.book || 'Basic Roleplaying: Universal Game Engine'),
    overview: plainRuleReference((isTh ? th : introEn).trim()),
    englishRule: direct ? plainRuleReference(sourceBody) : '',
    englishRuleHeader: sourceHeader,
    baseWarning,
    hasEnglishRule: direct && Boolean(sourceBody)
  };
}
