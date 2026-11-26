import {originalCssSources} from './css-source-manifest.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const manifest=JSON.parse(read('../system.json'));
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.deepEqual(originalCssSources.slice(0,2),['styles/brp.css','styles/brp-refinement.css']);
assert.ok(originalCssSources.includes('styles/brp-bold.css'));
const css=read('../styles/brp-refinement.css');
for (const s of ['--brp-bg:', '--brp-panel:', '--brp-accent:', 'data-brp-control="roll"', 'text-decoration-line: underline', ':focus-visible', 'brp-care-methods', '.brp-recovery-quick-tools', '.tab-btn.active']) assert.ok(css.includes(s), `missing neutral UI token/style: ${s}`);
assert.ok(css.includes('button[data-brp-control="roll"]::before { content: none'));
assert.ok(css.includes('border-style: dashed !important; /* drop zones ONLY */'));
assert.equal(css.includes('box-shadow: 0 0 0 2px rgba(220, 38, 38'),false);
const actor=read('../templates/actor/character-sheet.hbs');
for (const action of ['firstAid','medicine','natural','psychotherapy']){
  const regex = new RegExp('class="brp-btn brp-care-method" data-action="treatCondition" data-method="'+action+'"');
  assert.match(actor,regex);
}
assert.ok(!actor.includes('class="brp-btn primary" data-action="treatCondition"'));
console.log('PASS v1.15.1: neutral design tokens, hover underlines, accessible focus, recover button consistency, manifest loads last');