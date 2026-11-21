/** Build a safe, bilingual, rules-neutral reference card; never rolls or alters state. */
const escape = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
export function buildShareEntryCard({title, kind="reference", description="", value="", actorName="", language="th"}) {
  const label=language === "th" ? "ข้อมูลอ้างอิง" : "Reference / Details";
  const details=String(description || "").replace(/<[^>]*>/g, " ").trim().slice(0,6000);
  const extra=value === "" || value === undefined || value === null ? "" : `<span class="brp-share-stat">${escape(value)}</span>`;
  return `<article class="brp-chat-card brp-share-card" data-brp-card-kind="${escape(kind)}">
    <header class="card-header"><span class="brp-card-eyebrow">${escape(label)} · ${escape(kind)}</span><strong>${escape(title)}</strong></header>
    <div class="brp-share-content">${extra}${details ? `<p class="brp-rule-reference-chat-text">${escape(details)}</p>` : `<p>${language==="th"?"ไม่มีคำอธิบายเพิ่มเติม":"No additional description"}</p>`}</div>
    <footer class="brp-share-source">${escape(actorName)}</footer>
  </article>`;
}
