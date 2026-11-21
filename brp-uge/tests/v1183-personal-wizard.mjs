import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
const manifest=JSON.parse(read('system.json'));
assert.equal(manifest.version,'1.21.5');
assert.ok(manifest.styles.includes('styles/brp-personal-and-wizard.css'));
assert.ok(manifest.styles.includes('styles/brp-fa7-v14.css'));
assert.equal(manifest.styles.at(-1),'styles/brp-paper.css');
const wizard=read('module/apps/character-wizard.mjs');
const wizardHbs=read('templates/apps/character-wizard.hbs');
const model=read('module/data-models.mjs');
const stylesheet=read('styles/brp-personal-and-wizard.css');
const thai=read('styles/brp-thai-readability.css');
assert.doesNotMatch(wizard,/#initialRollRequested/);
const renderSection=wizard.slice(wizard.indexOf('_onRender(context, options) {'),wizard.indexOf('    this.element.querySelectorAll("[data-wiz-field]")'));
assert.doesNotMatch(renderSection,/confirmAndRollCharacteristics\(/);
const methodListener=wizard.slice(wizard.indexOf('methodSel?.addEventListener'),wizard.indexOf('    this.element.querySelectorAll("[data-wiz-char]")'));
assert.doesNotMatch(methodListener,/confirmAndRollCharacteristics\(/);
assert.match(wizard,/static async #onRollAllChars\(event\)/);
assert.match(wizard,/#onRollSingleChar/);
assert.match(wizard,/hasGeneratedCharacteristics/);
assert.match(wizard,/generatedKeys/);
assert.match(wizard,/this.step = Math.min\(6, this.step \+ 1\)/);
for(const key of ['playerName','culture','gender','handedness','height','weight','religion','distinctiveFeatures','personalDescription']) {
 assert.ok(model.includes(`${key}: new StringField`),`Missing data model field ${key}`);
 assert.ok(wizard.includes(`"system.${key}": this.wizardData.${key}`),`Wizard does not save ${key}`);
}
for(const template of ['templates/actor/character-sheet.hbs','templates/actor/npc-sheet.hbs']) {
 const t=read(template);
 for(const field of ['system.playerName','system.culture','system.gender','system.handedness','system.height','system.weight','system.religion','system.distinctiveFeatures','system.personalDescription']) {
  assert.ok(t.includes(`name="${field}"`),`${template} does not edit ${field}`);
 }
 assert.ok(t.indexOf('brp-banner-copy') < t.indexOf('brp-personal-identity'));
 assert.ok(t.indexOf('brp-personal-identity') < t.indexOf('brp-personal-details'));
 assert.ok(t.indexOf('brp-personal-details') < t.indexOf('brp-header-utilities'));
 assert.ok(t.includes('data-action="toggleEdit"'));
 assert.ok(t.includes('{{#unless isStatusTab}}'), 'Prevent duplicated age inputs in status tab');
 // Syntax-safe Handlebars block nesting for all new fields and existing rules.
 const tokens=t.match(/{{\s*(?:#if|#unless|#each|#with|\/if|\/unless|\/each|\/with|else)\b[^}]*}}/g)??[];
 const stack=[];
 for(const token of tokens){const x=token.match(/{{\s*([#/](?:if|unless|each|with)|else)/)?.[1];if(x?.startsWith('#'))stack.push(x.slice(1));if(x?.startsWith('/'))assert.equal(stack.pop(),x.slice(1),`Bad block in ${template}`)}
 assert.equal(stack.length,0);
}
for(let i=1;i<=6;i++) assert.ok(wizardHbs.includes(`{{#if isStep${i}}}`),`wizard step ${i}`);
assert.ok(wizardHbs.includes('data-action="rollAllChars"'));
assert.ok(wizardHbs.includes('data-action="rollAge"'));
assert.ok(wizardHbs.includes('data-wiz-field="distinctiveFeatures"'));
assert.ok(wizardHbs.includes('{{#unless isStep6}}'));
assert.match(stylesheet,/Font Awesome 6 Pro/);
assert.match(stylesheet,/brp-personal-details/);
assert.doesNotMatch(thai, /html\[data-brp-theme\]\s*\]\s*\{/);
console.log('PASS v1.18.3 Personal, header order, wizard no auto-roll, 6 phases, icon/font safeguards');
