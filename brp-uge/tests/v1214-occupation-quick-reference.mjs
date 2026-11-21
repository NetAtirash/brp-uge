import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {linkedOccupationSkill, occupationSkillCoverage} from '../module/occupation-skill-linking.mjs';
import {documentToEmbeddedItem} from '../module/library-provider.mjs';

// Synthetic 16-character IDs: this test never bundles book/catalog data in the
// Game System. A second cross-package check uses the optional uploaded module.
globalThis.foundry={utils:{deepClone:structuredClone}};
const buildSkill=(id,name)=>{
  const original=`Compendium.example-reference.skills.Item.${id}`;
  const live=`Compendium.world.brp-uge-quick-skills.Item.${id}`;
  const originalData={_id:id,name,type:'skill',flags:{core:{sourceId:original},'brp-uge':{sourceUuid:original}},system:{nameEn:name,base:20,category:'mental'}};
  const doc={uuid:live,type:'skill',documentName:'Item',toObject(){return structuredClone(originalData);}};
  return {item:documentToEmbeddedItem(doc),live,original};
};
const a=buildSkill('AAAABBBBCCCCDDDD','Craft');
const b=buildSkill('1234567890abcdef','Research');
const unrelated=buildSkill('ffffffffffffffff','Unrelated');
assert.equal(a.item.flags.core.sourceId,a.live);
assert.equal(a.item.flags['brp-uge'].originalSourceUuid,a.original);
assert.equal(a.item.flags['brp-uge'].liveDocumentUuid,a.live);
const coverage=occupationSkillCoverage([a.item,b.item,unrelated.item],[a.live,b.live]);
assert.deepEqual(coverage,{linked:[0,1],missing:[]});
assert.equal(linkedOccupationSkill(a.item,a.original),true);
assert.equal(linkedOccupationSkill(a.item,a.live),true);
assert.equal(linkedOccupationSkill(unrelated.item,a.live),false);
const missing=occupationSkillCoverage([a.item],[a.live,b.live]);
assert.deepEqual(missing,{linked:[0],missing:[b.live]});
const wizard=readFileSync(new URL('../module/apps/character-wizard.mjs',import.meta.url),'utf8');
assert.match(wizard,/Baseline skills are copied from the external library/);
assert.match(wizard,/occupationSkillCoverage\(this\.skillCatalog,prof\.skillRefs\)/);
assert.match(wizard,/professionMissingSkillCount/);
const hbs=readFileSync(new URL('../templates/apps/character-wizard.hbs',import.meta.url),'utf8');
assert.match(hbs,/professionLinkedSkillCount/);
assert.match(hbs,/professionMissingSkillCount/);
const css=readFileSync(new URL('../styles/brp-paper.css',import.meta.url),'utf8');
assert.match(css,/--brp-paper:#101316/);
assert.match(css,/--brp-paper-wash:rgba\(8,11,14,\.88\)/);
console.log('PASS v1.21.5: cross-pack provenance, baseline occupation Skills and dark charcoal palette');
