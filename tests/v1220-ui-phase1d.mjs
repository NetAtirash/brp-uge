import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sheet=read('templates/actor/character-sheet.hbs');
const nav=read('templates/actor/partials/ui2-primary-navigation.hbs');
const actorJS=read('module/sheets/actor-sheet.mjs');
const css=read('styles/brp-ui2-navigation.css');
const manifest=JSON.parse(read('system.json'));
const routes=['skills','combat','powers','wounds','inventory','status','advancement','notes'];

const a=sheet.indexOf('    {{#if ui2Preview}}\n      {{> "systems/brp-uge/templates/actor/partials/ui2-primary-navigation.hbs" }}');
const b=sheet.indexOf('    {{else}}\n    <nav class="sheet-navigation"',a);
const c=sheet.indexOf('    </nav>\n    {{/if}}',b);
assert.ok(a>=0&&b>a&&c>b,'New navigation must coexist with untouched stable navigation');
const legacy=sheet.slice(b,c);
const routeList=s=>[...s.matchAll(/\bdata-tab="([^"]+)"/g)].map(m=>m[1]);
const actionList=s=>[...s.matchAll(/\bdata-action="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(routeList(nav),routes,'UI2 preserves exact eight tab destinations and order');
assert.deepEqual(routeList(legacy),routes,'Stable tab routes unmodified');
assert.deepEqual(actionList(nav),actionList(legacy),'Every switchTab action preserved');
assert.deepEqual(actionList(nav),Array(8).fill('switchTab'));
for(const name of ['Skills','Combat','Powers','Wounds','Inventory','Status','Advancement','Notes']){
  assert.ok(nav.includes('is'+name+'Tab'),name+' active state retained');
}
assert.match(nav,/aria-current="page"/);
assert.match(nav,/aria-label="{{#if isTh}}/);
assert.match(nav,/totalIssueCount/);
assert.match(nav,/inventoryCount/);
assert.match(actorJS,/systems\/brp-uge\/templates\/actor\/partials\/ui2-primary-navigation\.hbs/);
assert.match(css,/\.brp-sheet\.brp-ui2 \.brp-ui2-primary-navigation/);
assert.match(css,/\.brp-ui2-tab-strip/);
assert.match(css,/overflow-x: auto/);
assert.match(css,/overflow-y: hidden/);
assert.match(css,/@container brp-ui2-navigation \(max-width: 480px\)/);
assert.match(css,/:focus-visible/);
assert.doesNotMatch(css,/!important/);
assert.doesNotMatch(css,/overflow-y:\s*(auto|scroll)/,
  'Navigation must not create a nested vertical scrollbar');
assert.doesNotMatch(css,/(?:^|\n)\s*(?:body|:root|html)\s*\{/m);
assert.deepEqual(manifest.styles.slice(-4),[
  'styles/brp-ui2-foundation.css',
  'styles/brp-ui2-character-header.css',
  'styles/brp-ui2-resources.css',
  'styles/brp-ui2-navigation.css'
]);
assert.equal(manifest.version,'1.21.11','No premature stable tag or version bump');
console.log('PASS Phase 1D: eight-route navigation and action parity, accessible current state, horizontal-only scroll, safe fallback');
