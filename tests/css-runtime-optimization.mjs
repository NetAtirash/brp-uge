import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const read=path=>readFileSync(new URL('../'+path,import.meta.url));
const manifest=JSON.parse(read('system.json'));
const ownership=JSON.parse(read('scripts/css-sources.json'));
const cssSources=ownership.sourceStyles;
const runtime='styles/brp-runtime.min.css';

assert.equal(manifest.id,'brp-uge');
assert.equal(manifest.version,'1.21.11');
assert.equal(manifest.compatibility.minimum,'14');
assert.equal(cssSources.length,7,'Seven canonical CSS owner files are maintained');
assert.equal(new Set(cssSources).size,7);
assert.equal(ownership.baselineOriginalStyles.length,19,'Historic sources remain in provenance');
for(const path of cssSources){
  assert.ok(existsSync(new URL('../'+path,import.meta.url)),path+' source retained');
  assert.ok(!path.includes('ui2'),'visual UI2 work must not be included');
}
assert.deepEqual(manifest.styles,[runtime],'only the single optimized runtime stylesheet is loaded');
const css=read(runtime).toString('utf8');
assert.ok(css.length>0);
assert.match(css,/fonts\.googleapis\.com/);
assert.match(css,/paper-light\.webp/);
assert.match(css,/paper-dark\.webp/);
assert.match(css,/brp-wiz-specialty/);
assert.doesNotMatch(css,/\.brp-ui2-/,'unapproved Visual UI2 must not be in CSS build');
const sheet=read('templates/actor/character-sheet.hbs').toString('utf8');
assert.doesNotMatch(sheet,/ui2Preview|ui2-character-header/,'baseline visual template stays untouched');
const data=JSON.parse(read('docs/css-optimization/BEFORE_AFTER.json'));
assert.equal(data.productionStylesheetsBefore,19);
assert.equal(data.productionStylesheetsAfter,1);
assert.ok(data.savings.rawBytes>0);
assert.ok(data.savings.gzipBytes>=0);
assert.equal(data.optimized.bytes,read(runtime).length);
assert.equal(data.sourceFiles,19);
assert.ok(data.previous.forcedPriorityOccurrences>0,'legacy CSS content remains');
assert.match(data.note,/No live Foundry/);
assert.equal(data.cssSourceOrder.join('|'),ownership.baselineOriginalStyles.join('|'));
assert.equal(data.optimized.sha256,createHash('sha256').update(read(runtime)).digest('hex'),
  'Structural cleanup must preserve byte-identical compiled CSS');
console.log('PASS CSS-only optimization: unchanged data/UI, 19-to-1 CSS delivery, audited reductions');
