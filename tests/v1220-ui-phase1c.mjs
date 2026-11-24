import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sheet=read('templates/actor/character-sheet.hbs');
const resources=read('templates/actor/partials/ui2-resource-cards.hbs');
const characteristics=read('templates/actor/partials/ui2-characteristics.hbs');
const js=read('module/sheets/actor-sheet.mjs');
const css=read('styles/brp-ui2-resources.css');
const manifest=JSON.parse(read('system.json'));

const a=sheet.indexOf('    <aside class="brp-ui2-vitals"');
const b=sheet.indexOf('  {{else}}\n  <aside class="sheet-sidebar">',a);
const c=sheet.indexOf('  </aside>\n  {{/if}}',b);
assert.ok(a>=0 && b>a && c>b, 'UI2 branch must preserve complete legacy sidebar in ELSE');
const legacy=sheet.slice(b,c);
const extract=(str,re)=>[...str.matchAll(re)].map(m=>m[1]).sort();
const fields=s=>extract(s,/\bname="([^"]+)"/g);
const actions=s=>extract(s,/\bdata-action="([^"]+)"/g);
assert.deepEqual(fields(resources+characteristics),fields(legacy),
  'all original Resource and Characteristic Actor input paths survive');
assert.deepEqual(actions(resources+characteristics),actions(legacy),
  'all original Resource and Characteristic data-action handlers survive');
assert.match(sheet.slice(a,b),/ui2-resource-cards\.hbs/);
assert.match(sheet.slice(a,b),/ui2-characteristics\.hbs/);
assert.match(js,/systems\/brp-uge\/templates\/actor\/partials\/ui2-resource-cards\.hbs/);
assert.match(js,/systems\/brp-uge\/templates\/actor\/partials\/ui2-characteristics\.hbs/);
for(const field of ['system.hp.value','system.pp.value','system.san.value','system.fp.value',
  'system.characteristics.{{c.key}}.value']) {
  assert.ok(fields(resources+characteristics).includes(field),field+' remains writable');
}
for(const action of ['recoverPool','rollSanity','rollChar','shareEntry','stepActorValue','switchTab'])
  assert.ok(actions(resources+characteristics).includes(action),action+' preserved');
for(const tag of ['campaignRules.useSanity','campaignRules.useFatigue','characteristicsList',
  'system.derived.majorWound','system.derived.expBonus','c.effectiveValue','c.rawValue','c.delta'])
  assert.ok((resources+characteristics).includes(tag),tag+' source expression retained');
for(const token of ['.sidebar-pools','.char-mini-grid','.char-mini-card','.pool-card','.pool-top-row',
  '.pool-val','.pool-recovery-row','.step-group','.brp-roll-value']) {
  // UI2 must not rematch historical V1173/V1174/V1175 styling selectors.
  assert.ok(!(resources+characteristics).includes('class="'+token.slice(1))
    && !(resources+characteristics).includes(' '+token.slice(1)+'"'),token+' is isolated');
}
assert.match(resources,/aria-label="HP current"/);
assert.match(characteristics,/aria-label="{{c.short}} value"/);
assert.match(characteristics,/data-action="rollChar"/);
assert.match(css,/\.brp-sheet\.brp-ui2 \.brp-ui2-vitals/);
assert.match(css,/\.brp-ui2-resource-cards/);
assert.match(css,/\.brp-ui2-characteristic-grid/);
assert.match(css,/@container brp-vitals \(max-width: 475px\)/);
assert.match(css,/focus-visible/);
assert.doesNotMatch(css,/!important/);
assert.doesNotMatch(css,/(?:^|\n)\s*(?:body|:root|html)\s*\{/m);
assert.deepEqual(manifest.styles.slice(-2),[
  'styles/brp-ui2-resources.css',
  'styles/brp-ui2-navigation.css'
]);
assert.equal(manifest.version,'1.21.11','UI-only Phase must not bump stable release');
assert.ok(read('templates/actor/npc-sheet.hbs').includes('sheet-sidebar'));
assert.doesNotMatch(read('templates/actor/npc-sheet.hbs'),/ui2-resource-cards/);
console.log('PASS Phase 1C: exact resources/characteristics field + action parity, optional pools, CSS and legacy rollback');
