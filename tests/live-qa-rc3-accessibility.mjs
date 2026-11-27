import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {syncTooltipOwner,installTooltipThemeSync} from '../module/paper-appearance.mjs';
const root={dataset:{}};
const manager={element:{closest:()=>true},tooltip:{}};
let cb;class Observer{constructor(fn){cb=fn;}observe(){}}
installTooltipThemeSync(manager,root,Observer);
assert.equal(root.dataset.brpTooltip,'true');
manager.element=null;cb();assert.equal(root.dataset.brpTooltip,'true','fade retains prior theme');
manager.element={closest:()=>null};cb();assert.equal(root.dataset.brpTooltip,'false','next non-BRP tooltip uses native theme');
manager.element={closest:()=>true};cb();assert.equal(root.dataset.brpTooltip,'true');
const css=readFileSync(new URL('../styles/brp-live-qa-accessibility.css',import.meta.url),'utf8');
assert.match(css,/data-brp-theme="light".*brp-sheet-combat-status/);
assert.match(css,/data-brp-theme="dark".*brp-sheet-combat-status/);
assert.match(css,/aria-current="step"/);
console.log('PASS: tooltip retains owner during fade; targeted accessibility overlay');
