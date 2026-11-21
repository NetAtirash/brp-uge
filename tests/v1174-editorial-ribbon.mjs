import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=(s)=>fs.readFileSync(new URL(s,root),'utf8');
const cfg=JSON.parse(read('system.json'));
assert.ok(['1.17.5','1.18.0','1.18.1','1.18.2','1.18.3','1.19.0','1.20.0','1.21.9'].includes(cfg.version));
assert.ok(cfg.styles.includes('styles/brp-editorial.css'));assert.ok(cfg.styles.includes('styles/brp-compact-ribbon.css'));
const css=read('styles/brp-editorial.css');
for(const selector of ['brp-sheet-v1174','char-mini-grid','sidebar-pools','sidebar-combat-strip','sheet-main','brp-derived-roll','brp-roll-value'])assert.ok(css.includes(selector),selector);
for(const actor of ['character','npc']){
 const html=read(`templates/actor/${actor}-sheet.hbs`);
 for(const item of ['brp-persistent-top','brp-derived-roll','rollPct','rollLabel','data-action="rollChar"','data-action="shareEntry"','system.derived.damageModifier','equippedAp','system.mov']) assert.ok(html.includes(item),`${actor} missing ${item}`);
 assert.ok(html.indexOf('brp-banner')<html.indexOf('char-mini-grid'));
 assert.equal((html.match(/data-action="rollChar"/g)||[]).length,1);
}
const model=read('module/data-models.mjs');
assert.ok(model.includes('effort: str * 5'));
assert.ok(model.includes('idea: int * 5'));
const config=read('module/config.mjs');
assert.ok(config.includes('str: { label: "Effort", mult: 5 }'));
assert.ok(config.includes('int: { label: "Idea", mult: 5 }'));
console.log('PASS 1.17.4 editorial ribbon; Effort & Idea preserved');