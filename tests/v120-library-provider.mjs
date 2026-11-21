import assert from 'node:assert/strict';
import {getLibraryDocuments,documentToEmbeddedItem,LIBRARY_CATEGORIES} from '../module/library-provider.mjs';
import {getReferenceChoices,resolveItemReference} from '../module/reference-utils.mjs';
import {resolveWealthItem} from '../module/wealth-utils.mjs';
import {applyStatusTemplate} from '../module/status-template.mjs';
const objects = new Map();
const doc=(uuid,type,name,attrs={})=>{
 const item={uuid,type,name,documentName:'Item',system:{nameEn:name,nameTh:name,...attrs},flags:{},toObject(){return {_id:uuid.split('.').pop(),name,type,system:{...this.system},flags:{...this.flags}}}};
 objects.set(uuid,item);return item;
};
const sword=doc('Item.sword','weapon','Custom Sword',{damage:'1d6'});
const job=doc('Compendium.test-content.jobs.Item.worker','occupation','Custom Occupation');
const skill=doc('Compendium.test-content.skills.Item.athletics','skill','Athletics',{base:35,category:'physical'});
const wealth=doc('Item.wealth','wealth','Custom Wealth',{tier:5});
const status=doc('Item.status','status','Custom Status',{skillModifier:-5,skillScope:'all'});
let createCount=0;
const packs=new Map([
 ['test-content.jobs',{collection:'test-content.jobs',documentName:'Item',metadata:{system:'brp-uge'},async getDocuments(){return [job]},async getIndex(){return [{_id:'worker',name:job.name,type:job.type,system:job.system}]}}],
 ['test-content.skills',{collection:'test-content.skills',documentName:'Item',metadata:{system:'brp-uge'},async getDocuments(){return [skill]},async getIndex(){return [{_id:'athletics',name:skill.name,type:skill.type,system:skill.system}]}}],
 ['wrong-system.data',{collection:'wrong-system.data',documentName:'Item',metadata:{system:'dnd5e'},async getDocuments(){throw Error('Wrong system pack opened') }}]
]);
globalThis.foundry={utils:{deepClone:structuredClone,randomID:()=> 'status-id'}};
globalThis.game={items:{contents:[sword,wealth,status]},actors:{contents:[]},packs};
globalThis.fromUuid=async uuid=>objects.get(uuid)??null;
let list=await getLibraryDocuments();
assert.deepEqual(list.map(i=>i.uuid).sort(),[sword,wealth,status,skill,job].map(i=>i.uuid).sort());
assert.deepEqual((await getLibraryDocuments({types:['skill']})).map(i=>i.name),['Athletics']);
const copied=documentToEmbeddedItem(skill);
assert.equal(copied._id,undefined);assert.equal(copied.flags.core.sourceId,skill.uuid);
assert.equal(copied.flags['brp-uge'].sourceUuid,skill.uuid);
assert.equal(copied.system.base,35);
const refs=await getReferenceChoices('skill');
assert.equal(refs[0].ref,skill.uuid);
assert.equal(await resolveItemReference(skill.uuid,'skill'),skill);
assert.equal(await resolveWealthItem(wealth.uuid),wealth);
let state=[];
await applyStatusTemplate({isOwner:true,system:{statusEffects:state},async update(p){state=p['system.statusEffects'];}},status);
assert.equal(state.length,1);assert.equal(state[0].skillModifier,-5);
assert.equal(createCount,0);
// Empty install produces no fabricated or seeded records.
game.items.contents=[];game.packs=new Map();
assert.deepEqual(await getLibraryDocuments(),[]);
assert.deepEqual(await getReferenceChoices('skill'),[]);
assert.equal(await resolveWealthItem('source:wealth-tier:Average'),null);
assert.equal(Object.keys(LIBRARY_CATEGORIES).length,10);
console.log('PASS v1.20: live World/Module sources, UUID linking, Status conversion, zero bundled data');
