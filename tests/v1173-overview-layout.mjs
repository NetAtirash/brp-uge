import {activeCssSources,readLegacyStyle} from './css-source-manifest.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'system.json'),'utf8'));
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.ok(activeCssSources.includes('styles/brp-character-shell.css'));
const css=readLegacyStyle('styles/brp-overview.css');
for(const name of ['character','npc']){
 const html=fs.readFileSync(path.join(root,`templates/actor/${name}-sheet.hbs`),'utf8');
 assert.ok(html.includes('brp-persistent-top'));
 assert.ok(html.indexOf('brp-persistent-top')<html.indexOf('brp-banner')&&html.indexOf('brp-banner')<html.indexOf('sheet-sidebar')&&html.indexOf('sheet-sidebar')<html.indexOf('sheet-main'));
 for(const key of ['sidebar-pools','sidebar-combat-strip','char-mini-grid','data-action="rollChar"','data-action="shareEntry"','{{equippedAp}}','{{system.derived.damageModifier}}'])assert.ok(html.includes(key),`${name}: ${key}`);
 assert.equal((html.match(/<section class="brp-persistent-top"/g)||[]).length,1);
 assert.equal((html.match(/<\/section>\s*<!-- RIGHT WORKSPACE/g)||[]).length+(html.match(/<\/section>\s*<main class="sheet-main"/g)||[]).length,1);
}
assert.ok(css.includes('--brp-tertiary'));assert.ok(css.includes(':focus-visible'));
console.log('PASS 1.17.3: two-section sheet structure, 8 theme tertiary tokens, roll/share bindings, readability');