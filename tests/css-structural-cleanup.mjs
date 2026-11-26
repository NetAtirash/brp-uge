import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transform} from 'lightningcss';
import postcss from 'postcss';

const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root));
const manifest=JSON.parse(read('system.json'));
const structure=JSON.parse(read('scripts/css-sources.json'));
const metrics=JSON.parse(read('docs/css-optimization/STRUCTURAL_BEFORE_AFTER.json'));
const history=JSON.parse(read('docs/css-optimization/BEFORE_AFTER.json'));
const active=structure.sourceStyles;
assert.equal(manifest.version,'1.21.11');
assert.equal(active.length,7);
assert.equal(structure.baselineOriginalStyles.length,19);
assert.equal(structure.ownershipGroups.length,7);
assert.deepEqual(active,structure.ownershipGroups.map(g=>g.file));
assert.deepEqual(structure.ownershipGroups.flatMap(g=>g.from),
  structure.baselineOriginalStyles,'no original layer reordered');
assert.equal(new Set(active).size,7);
assert.deepEqual(manifest.styles,['styles/brp-runtime.min.css']);
assert.equal(metrics.before.files,19);
assert.equal(metrics.after.files,7);
assert.equal(metrics.exactRuntimeCssByteParity,true);
assert.ok(metrics.after.declarations<=metrics.before.declarations);
assert.ok(metrics.after.important<=metrics.before.important);
assert.ok(metrics.after.rules<=metrics.before.rules);
assert.equal(metrics.removedDeclarations+metrics.rejectedCandidates,metrics.redundantCandidates);
const bundle=read('styles/brp-runtime.min.css');
const sha=buf=>createHash('sha256').update(buf).digest('hex');
assert.equal(sha(bundle),structure.baselineOptimizedSha256);
assert.equal(sha(bundle),metrics.baselineRuntimeSha256);
assert.equal(sha(bundle),history.optimized.sha256);
for(const g of structure.ownershipGroups){
  const body=read(g.file).toString('utf8');
  assert.ok(body.length>100);
  assert.ok(!g.file.includes('ui2'),'unapproved visuals excluded');
  assert.ok(!body.includes('brp-ui2-'),'unapproved UI2 controls excluded');
  assert.ok(body.includes(g.from.at(-1).split('/').at(-1).replace('.css','')) || body.length>1000);
  assert.doesNotThrow(()=>postcss.parse(body,{from:g.file}));
}
for(const old of structure.baselineOriginalStyles){
  assert.equal(existsSync(new URL(old,root)),false,
    'historical CSS must no longer remain as a second editable source: '+old);
}
const assembled=Buffer.from(active.map(p=>read(p).toString('utf8')).join('\n\n'),'utf8');
const rebuilt=Buffer.from(transform({filename:new URL('styles/brp-runtime.min.css',root).pathname,
  code:assembled,minify:true,sourceMap:false}).code);
assert.ok(bundle.equals(rebuilt),'new source owners compile to exact old runtime bytes');
assert.ok(!read('templates/actor/character-sheet.hbs').toString('utf8').includes('ui2Preview'));
console.log('PASS CSS structure: 19->7 canonical sources, original order preserved, exact byte-identical runtime and no Visual UI2');
