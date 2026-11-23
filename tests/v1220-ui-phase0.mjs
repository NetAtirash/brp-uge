import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditProject,inspectStylesheet,inspectTemplate} from '../scripts/audit-ui.mjs';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const report=auditProject(root);

assert.equal(report.metadata.systemId,'brp-uge');
assert.equal(report.metadata.foundry.minimum,'14');
assert.ok(report.totals.styleFiles>0);
assert.equal(report.totals.styleFiles,report.metadata.stylesheetOrder.length);
assert.ok(report.totals.cssLines>report.totals.styleFiles,'read-only CSS audit counts source lines');
assert.ok(report.hotspots.some(h=>h.selector==='.brp-banner'));
assert.ok(report.templates.some(t=>t.file==='templates/actor/character-sheet.hbs'));
assert.ok(report.templates.some(t=>t.file==='templates/apps/character-wizard.hbs'));
assert.equal(report.metadata.stylesheetOrder.some(s=>s.includes('docs/ui-v2')),false,
  'a prototype must never become a production runtime stylesheet automatically');
assert.deepEqual(inspectStylesheet('sample.css','x{color:red!important}\n@media(max-width:600px){.x{overflow:auto}}').important,1);
assert.equal(inspectTemplate('sample.hbs','<button data-action="roll">Go</button>').namedActions,1);

const files=[
  'docs/ui-v2/BASELINE-AUDIT.md',
  'docs/ui-v2/DESIGN-SYSTEM.md',
  'docs/ui-v2/SCREEN-ARCHITECTURE.md',
  'docs/ui-v2/IMPLEMENTATION-PLAN.md',
  'docs/ui-v2/QA-MATRIX.md',
  'docs/ui-v2/prototype/character-sheet.html',
  'docs/ui-v2/prototype/character-sheet.css',
  'docs/ui-v2/prototype/character-sheet.js'
];
for(const path of files)assert.ok(existsSync(resolve(root,path)),path+' exists');
const prototype=read('docs/ui-v2/prototype/character-sheet.html');
const css=read('docs/ui-v2/prototype/character-sheet.css');
const js=read('docs/ui-v2/prototype/character-sheet.js');
const ds=read('docs/ui-v2/DESIGN-SYSTEM.md');
assert.match(prototype,/data-theme="light"/);
assert.match(prototype,/data-i18n-th/);
assert.match(prototype,/data-i18n-en/);
assert.match(prototype,/id="editToggle"/);
assert.match(prototype,/id="themeToggle"/);
assert.match(prototype,/id="skillSearch"/);
assert.match(prototype,/role="tablist"/);
assert.match(prototype,/role="meter"/);
assert.match(prototype,/aria-pressed/);
assert.match(prototype,/character-sheet.css/);
assert.match(prototype,/character-sheet.js/);
assert.match(prototype,/Art \(Writing\)/,'flavor name example retains secondary canonical identity');
assert.match(css,/--ui-accent/);
assert.match(css,/focus-visible/);
assert.match(css,/@media\(max-width:700px\)/);
assert.match(css,/prefers-reduced-motion/);
assert.match(js,/ArrowRight/);
assert.match(js,/toLocaleLowerCase/);
assert.doesNotMatch(js,/\bgame\.|\bActor\.|\bHooks\.|\bfetch\s*\(/,
  'standalone prototype must not call Foundry or network APIs');
assert.match(ds,/canonical/);
assert.match(ds,/Light\/Dark/);
assert.match(ds,/4\.5:1/);
assert.match(read('docs/ui-v2/IMPLEMENTATION-PLAN.md'),/no.*Actor|Actor.*no/i);
const ids=[...prototype.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'prototype IDs are unique');
execFileSync(process.execPath,['--check',resolve(root,'docs/ui-v2/prototype/character-sheet.js')],{stdio:'pipe'});
console.log('PASS Phase 0: source audit, isolated accessible bilingual prototype, docs, and no runtime wiring');
