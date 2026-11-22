import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../',import.meta.url);
const read=file=>readFileSync(new URL(file,base),'utf8');
const manifest=JSON.parse(read('system.json'));
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.ok(manifest.styles.includes('styles/brp-thai-readability.css'));
const type=read('styles/brp-thai-readability.css');
const google=read('styles/brp.css');
for(const family of ['Noto Sans Thai Looped','Sarabun','Tahoma','Noto Looped Thai']){
 assert.ok(type.includes(family), family);
}
assert.match(google,/fonts\.googleapis\.com\/css2\?family=Noto\+Sans\+Thai\+Looped/);
for(const target of ['.brp-sheet','.brp-item-sheet','.brp-wizard','.brp-compendium','.brp-chat-card','.brp-tooltip']){
 assert.ok(type.includes(target),target);
}
assert.match(type,/brp-heading-font/);
assert.match(type,/tabular-nums/);
assert.equal((type.match(/\{/g)||[]).length,(type.match(/\}/g)||[]).length);
assert.ok(!manifest.styles.some(file=>/\.(woff2?|ttf|otf)$/.test(file)));
console.log('PASS v1.18.2 looped Thai typography and theme safeguards');