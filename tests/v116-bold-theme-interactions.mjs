/* Regression suite for 1.16 interaction semantics, carried into 1.17. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildShareEntryCard} from '../module/chat/share-entry.mjs';
const read=(p)=>readFileSync(new URL(p,import.meta.url),'utf8');
const cfg=JSON.parse(read('../system.json'));
assert.match(cfg.version, /^\d+\.\d+\.\d+$/);
assert.ok(cfg.styles.includes('styles/brp-bold.css') && cfg.styles.includes('styles/brp-overview.css'));
for(const path of ['../templates/actor/character-sheet.hbs','../templates/actor/npc-sheet.hbs']) {
  const s=read(path);
  assert.equal((s.match(/class="brp-banner"/g)||[]).length,1);
  assert.equal((s.match(/class="sidebar-identity(?:\s|")/g)||[]).length,1);
  assert.ok(s.indexOf('class="brp-banner"') < s.indexOf('class="sheet-sidebar"'));
  assert.ok(s.includes('data-action="shareEntry" data-char="{{c.key}}"'));
  assert.ok(s.includes('data-action="rollChar" data-char="{{c.key}}"'));
  assert.match(s,/data-action="shareEntry"[^>]*>.*?\{\{skill\.displayName\}\}/);
  assert.ok(s.includes('data-action="rollSkill"'));
  assert.match(s,/data-action="shareEntry"[^>]*>.*?\{\{pwr\.displayName\}\}/);
  assert.ok(s.includes('data-action="rollPower"'));
  assert.ok(s.includes('data-action="rollWeapon"'));
  assert.ok(!s.includes('class="link-btn" data-action="rollSkill"'));
  assert.equal((s.match(/name="name"/g)||[]).length,1);
}
const evil=buildShareEntryCard({title:'<img src=x onerror=alert(1)>',kind:'skill',description:'<b>Rule</b> & text',value:'50%',actorName:'Alice & Bob',language:'en'});
assert.ok(evil.includes('&lt;img src=x onerror=alert(1)&gt;'));
assert.ok(!evil.includes('<img src=x'));
assert.ok(!evil.includes('<b>'));
assert.ok(evil.includes('50%'));
assert.ok(!evil.includes('data-action="rollSkill"'));
console.log('PASS v1.16 interaction regression: name share / percentage rolls, safe chat, actor fields');