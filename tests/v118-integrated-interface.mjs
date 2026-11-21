import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=(p)=>readFileSync(new URL(p,root),'utf8');
const m=JSON.parse(read('system.json'));
assert.equal(m.version,'1.21.6');
assert.ok(m.styles.includes('styles/brp-integrated-ui.css'));
const css=read('styles/brp-integrated-ui.css');
for(const key of ['.sheet-body','.item-row','.wound-row','.brp-status-row','.brp-item-sheet','.item-fields','.brp-wizard','.wiz-stepper','.wiz-prof-card','.brp-compendium','.comp-row','.brp-chat-card','.comp-filter-panel','.brp-combat-tracker-tools','.brp-macro-form'])assert.ok(css.includes(key),`Missing shared style ${key}`);
for (const path of ['templates/actor/character-sheet.hbs','templates/actor/npc-sheet.hbs','templates/item/item-sheet.hbs','templates/apps/character-wizard.hbs','templates/apps/compendium-browser.hbs','templates/chat/roll-card.hbs','templates/chat/damage-card.hbs','templates/chat/combat-card.hbs']) assert.ok(read(path).length>100,path);
for(const path of ['templates/actor/character-sheet.hbs','templates/actor/npc-sheet.hbs']){
 const s=read(path); assert.match(s,/data-action="toggleEdit"/);assert.match(s,/data-action="rollChar"/);assert.match(s,/data-action="shareEntry"/);
}
assert.ok(css.includes('minmax(0,1fr)')); assert.ok(css.includes(':focus-visible'));
console.log('PASS v1.18.0 integrated editorial layouts and preserved interaction templates');