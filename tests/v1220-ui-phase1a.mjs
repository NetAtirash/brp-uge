import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  UI2_PREVIEW_SETTING,UI2_ROOT_CLASS,
  isUI2PreviewEnabled,syncUI2PreviewRoot,syncUI2PreviewOpenSheets
} from '../module/ui-v2/preview.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const manifest=JSON.parse(read('system.json'));
const oldStyles=[
  'styles/brp.css','styles/brp-refinement.css','styles/brp-bold.css',
  'styles/brp-overview.css','styles/brp-editorial.css',
  'styles/brp-compact-ribbon.css','styles/brp-integrated-ui.css',
  'styles/brp-ui-consistency.css','styles/brp-thai-readability.css',
  'styles/brp-personal-and-wizard.css','styles/brp-rulebook-reference.css',
  'styles/brp-fa7-v14.css','styles/brp-paper.css',
  'styles/brp-v1216-usability.css','styles/brp-v1217-layout.css',
  'styles/brp-v1218-specialties.css','styles/brp-v1219-workbench.css',
  'styles/brp-v12110-flavor-chat.css',
  'styles/brp-v12111-specialty-management.css'
];
assert.deepEqual(manifest.styles.slice(0,-1),oldStyles,
  'Legacy CSS cascade and load order must remain identical');
assert.equal(manifest.styles.at(-1),'styles/brp-ui2-foundation.css');
assert.equal(manifest.version,'1.21.11','No unreviewed stable version bump');
assert.equal(manifest.compatibility.minimum,'14');

const source=read('brp-uge.mjs');
assert.equal(UI2_PREVIEW_SETTING,'ui2Preview');
assert.match(source,/game\.settings\.register\('brp-uge', 'ui2Preview', \{/);
assert.match(source,/scope: 'client', config: true, type: Boolean, default: false/);
assert.match(source,/onChange: refreshUI2Preview/);
const callback=source.slice(source.indexOf('function refreshUI2Preview(enabled)'),
  source.indexOf('Hooks.once("init"'));
assert.match(callback,/syncUI2PreviewOpenSheets\(/);
assert.doesNotMatch(callback,/\.render\(|prepareData\(|\.update\(/,
  'Preview setting must not rerender dirty forms or write Actor data');

const fakeSettings=value=>({get(domain,key) {
  assert.equal(domain,'brp-uge');assert.equal(key,UI2_PREVIEW_SETTING);
  return value;
}});
assert.equal(isUI2PreviewEnabled(fakeSettings(false),'character'),false);
assert.equal(isUI2PreviewEnabled(fakeSettings(true),'character'),true);
assert.equal(isUI2PreviewEnabled(fakeSettings(true),'npc'),false);
assert.equal(isUI2PreviewEnabled({get(){throw Error('unregistered');}},'character'),false);

const fakeRoot=()=>{
  const tokens=new Set();
  const classList={
    toggle(key,enabled){if(enabled)tokens.add(key);else tokens.delete(key);return enabled;},
    contains(key){return tokens.has(key);}
  };
  return {root:{classList,matches:s=>s==='.brp-sheet'},tokens};
};
const {root}=fakeRoot();
const container={querySelector:selector=>selector==='.brp-sheet'?root:null};
assert.equal(syncUI2PreviewRoot(container,'character',false),false);
assert.equal(root.classList.contains(UI2_ROOT_CLASS),false);
assert.equal(syncUI2PreviewRoot(container,'character',true),true);
assert.equal(root.classList.contains(UI2_ROOT_CLASS),true);
assert.equal(syncUI2PreviewRoot(container,'npc',true),false);
assert.equal(root.classList.contains(UI2_ROOT_CLASS),false);
syncUI2PreviewRoot(root,'character',true);
assert.ok(root.classList.contains(UI2_ROOT_CLASS));
assert.equal(syncUI2PreviewRoot(null,'character',true),false);

class BRPActorSheet{constructor(type,element){this.document={type};this.element=element;this.render=()=>{throw Error('must not render');};}}
class BRPItemSheet{constructor(element){this.document={type:'character'};this.element=element;}}
const character=fakeRoot().root,other=fakeRoot().root,npc=fakeRoot().root;
const apps=[
  new BRPActorSheet('character',character),
  new BRPActorSheet('character',other),
  new BRPActorSheet('npc',npc),
  new BRPItemSheet(fakeRoot().root)
];
assert.equal(syncUI2PreviewOpenSheets(apps,true),2);
assert.equal(character.classList.contains(UI2_ROOT_CLASS),true);
assert.equal(other.classList.contains(UI2_ROOT_CLASS),true);
assert.equal(npc.classList.contains(UI2_ROOT_CLASS),false);
assert.equal(syncUI2PreviewOpenSheets(apps,false),2);
assert.equal(character.classList.contains(UI2_ROOT_CLASS),false);
assert.equal(other.classList.contains(UI2_ROOT_CLASS),false);

const actorSheet=read('module/sheets/actor-sheet.mjs');
assert.match(actorSheet,/context\.ui2Preview = isUI2PreviewEnabled\(game\.settings, this\.document\.type\)/);
assert.match(actorSheet,/syncUI2PreviewRoot\(this\.element, this\.document\.type,/);
const characterSheet=read('templates/actor/character-sheet.hbs');
assert.match(characterSheet,/brp-sheet-v1173\{\{#if ui2Preview\}\} brp-ui2\{\{\/if\}\}/);
const npcSheet=read('templates/actor/npc-sheet.hbs');
assert.doesNotMatch(npcSheet,/brp-ui2/,'NPC remains on the old UI');
const css=read('styles/brp-ui2-foundation.css');
assert.match(css,/\.brp-sheet\.brp-ui2\s*\{/);
for(const token of ['canvas','panel','inset','text','text-muted','rule','rule-strong',
  'accent','selected','focus','positive','danger','heading-font','body-font','number-font']){
  assert.match(css,new RegExp('--ui-'+token+':\\s*var\\(--brp-'));
}
assert.match(css,/\.brp-ui2-panel/);
assert.match(css,/\.brp-ui2-control/);
assert.match(css,/\.brp-ui2-action/);
assert.match(css,/:focus-visible/);
assert.doesNotMatch(css,/!important/,'New CSS must not escalate specificity with !important');
assert.doesNotMatch(css,/\b@layer\b/,'Legacy unlayered cascade must remain untouched');
assert.doesNotMatch(css,/(?:^|\n)\s*(?:body|:root|html\s*\{)/m,
  'No unscoped global reset or tokens');
assert.doesNotMatch(read('system.json'),/docs\/ui-v2\/prototype/,
  'Standalone prototype must never load as a Foundry runtime asset');
console.log('PASS Phase 1A: default-off client opt-in, scoped CSS, safe live toggle, unchanged Actor/legacy UI');
