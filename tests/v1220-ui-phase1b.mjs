import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const manifest=JSON.parse(read('system.json'));
const sheet=read('templates/actor/character-sheet.hbs');
const header=read('templates/actor/partials/ui2-character-header.hbs');
const profile=read('templates/actor/partials/ui2-personal-details.hbs');
const actorJS=read('module/sheets/actor-sheet.mjs');
const appJS=read('brp-uge.mjs');
const css=read('styles/brp-ui2-character-header.css');

// All historical CSS rules are still loaded in exactly their original order.
assert.equal(manifest.version,'1.21.11');
assert.equal(manifest.compatibility.verified,'14');
assert.deepEqual(manifest.styles.slice(-4),[
  'styles/brp-v12111-specialty-management.css',
  'styles/brp-ui2-foundation.css',
  'styles/brp-ui2-character-header.css',
  'styles/brp-ui2-resources.css'
]);
assert.equal(manifest.styles.length,22);

// Structural switch: a single Header per render, with the untouched stable
// Header in the ELSE branch. Never duplicate active form fields.
const start=sheet.indexOf('  {{#if ui2Preview}}\n    {{>');
const oldStart=sheet.indexOf('  <header class="brp-banner"',start);
const oldEnd=sheet.indexOf('  </header>\n  {{/if}}',oldStart);
const sidebar=sheet.indexOf('  <aside class="sheet-sidebar">');
assert.ok(start>=0&&oldStart>start&&oldEnd>oldStart&&sidebar>oldEnd,
  'Legacy Header remains in its original position after an opt-in alternative');
const oldHeader=sheet.slice(oldStart,oldEnd+'  </header>'.length);
assert.match(sheet.slice(start,oldStart),/ui2-character-header\.hbs/);
assert.match(oldHeader,/class="brp-banner"/);
assert.match(oldHeader,/class="brp-personal-details"/);
assert.match(oldHeader,/class="brp-header-utilities"/);
assert.doesNotMatch(oldHeader,/brp-ui2-/);
assert.match(header,/class="brp-ui2-character-header"/);
assert.match(header,/ui2-personal-details\.hbs/);
assert.match(header,/<details[^>]+data-ui2-profile/);
assert.match(header,/<summary>/);
assert.match(header,/ui2ProfileExpanded/);
assert.match(header,/{{#if isTh}}/);
assert.match(profile,/{{#if isTh}}/);

// Preserve every owned Actor field and its data-action handler. No data
// migration or mechanical action renaming is allowed in this UI-only change.
const matches=(text,regex)=>[...text.matchAll(regex)].map(m=>m[1]).sort();
const fields=text=>matches(text,/\bname="([^"]+)"/g);
const actions=text=>matches(text,/\bdata-action="([^"]+)"/g);
assert.deepEqual(fields(header+profile),fields(oldHeader),
  'Every original Header input name must be preserved across partials');
assert.deepEqual(actions(header+profile),actions(oldHeader),
  'Every original Header data-action must be preserved across partials');
assert.equal(fields(profile).filter(f=>f==='system.age').length,1,
  'Edit form must not have duplicate Age controls in UI2');
assert.ok(fields(profile).includes('system.playerName'));
assert.ok(fields(header).includes('system.mov'));
for(const act of ['editImage','toggleEdit','togglePaperTheme','openWizard',
  'openCompendium','toggleResistance','runExp','stepActorValue']){
  assert.ok(actions(header+profile).includes(act),`action ${act} preserved`);
}

// Foundry v14 uses PARTS.templates to preload any included HBS partials.
assert.match(actorJS,/templates:\s*\[\s*"systems\/brp-uge\/templates\/actor\/partials\/ui2-character-header\.hbs"/);
assert.match(actorJS,/"systems\/brp-uge\/templates\/actor\/partials\/ui2-personal-details\.hbs"/);
assert.match(actorJS,/context\.ui2ProfileExpanded = this\.#ui2ProfileExpanded/);
assert.match(actorJS,/data-ui2-profile/);
assert.match(actorJS,/this\.#ui2ProfileExpanded = event\.currentTarget\.open/);
const npc=read('templates/actor/npc-sheet.hbs');
assert.doesNotMatch(npc,/ui2-character-header|ui2ProfileExpanded/,
  'NPCs do not use the new Header');

// The toggled setting MUST NOT trigger rerender of a dirty form or strip the
// styling class from its currently mounted Header; a deliberate reopen applies.
const callback=appJS.slice(appJS.indexOf('function refreshUI2Preview(enabled)'),
  appJS.indexOf('Hooks.once("init"'));
assert.match(callback,/close and reopen the Character Sheet/);
assert.doesNotMatch(callback,/\.render\(|\.update\(|prepareData\(|syncUI2PreviewOpenSheets/);
assert.match(appJS,/scope: 'client', config: true, type: Boolean, default: false/);

// New Header CSS is strictly opt-in scoped; no global/legacy component
// override or priority escalation, with size-based responsive layout.
assert.match(css,/\.brp-sheet\.brp-ui2 \.brp-ui2-character-header/);
assert.match(css,/--ui-panel/);
assert.match(css,/@container \(max-width: 900px\)/);
assert.match(css,/@container \(max-width: 620px\)/);
assert.match(css,/@container \(max-width: 420px\)/);
assert.match(css,/\.brp-ui2-profile-grid/);
assert.match(css,/:focus-visible/);
assert.doesNotMatch(css,/!important/);
assert.doesNotMatch(css,/(?:^|\n)\s*(?:body|:root|html)\s*\{/m);
assert.doesNotMatch(css,/\.brp-sheet-v117[345]/,
  'New component must not depend on historical versioned sheet selectors');
console.log('PASS Phase 1B: opt-in modular Header, exact legacy action/field parity, responsive CSS and safe reopen');
