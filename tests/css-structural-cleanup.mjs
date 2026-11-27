import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';

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
assert.equal(metrics.removedRuleBlocks,8,
  'Reproducible rule-level structural cleanup must not silently regress');
assert.equal(metrics.removedRuleBlocks+metrics.rejectedRuleRemovals,metrics.attemptedRuleRemovals);
assert.ok(metrics.after.declarations<metrics.before.declarations);
assert.ok(metrics.after.important<metrics.before.important);
assert.ok(metrics.after.selectorsCrossingFiles<metrics.before.selectorsCrossingFiles);
assert.equal(metrics.after.selectorsCrossingFiles,57);
assert.equal(metrics.after.rules,1732);

assert.ok(metrics.after.declarations<=metrics.before.declarations);
assert.ok(metrics.after.important<=metrics.before.important);
assert.ok(metrics.after.rules<=metrics.before.rules);
assert.equal(metrics.removedDeclarations+metrics.rejectedCandidates,metrics.redundantCandidates);
const full=read('styles/brp-runtime.min.css');
const bundle=full.subarray(0,history.optimized.bytes);
assert.deepEqual(full.subarray(history.optimized.bytes),Buffer.concat([Buffer.from('\n'),read(structure.liveQaOverlay)]));
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
  assert.ok(body.includes('/* SOURCE: '),'owner must retain source provenance comments');
}
for(const old of structure.baselineOriginalStyles){
  assert.equal(existsSync(new URL(old,root)),false,
    'historical CSS must no longer remain as a second editable source: '+old);
}
// The dependency-free default CI verifies the committed runtime SHA.
// The dedicated CSS CI additionally recompiles all sources and compares
// exact bytes with Lightning CSS before permitting a structural commit.
assert.ok(!read('templates/actor/character-sheet.hbs').toString('utf8').includes('ui2Preview'));
console.log('PASS CSS structure: 19->7 canonical sources, original order preserved, exact byte-identical runtime and no Visual UI2');
