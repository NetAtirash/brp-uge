import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {uniqueSkills,canonicalSkillKey,sameSkill,planMissingBaseSkills,ensureActorFoundationSkills} from '../module/skill-foundation.mjs';
import {creationBudgets} from '../module/rules/character-creation.mjs';
import {agePenalties} from '../module/status-effects.mjs';

const skill=(name,id='AAAABBBBCCCCDDDD')=>({documentName:'Item',type:'skill',uuid:`Compendium.test.skills.Item.${id}`,
  name,system:{nameEn:name,nameTh:`Thai ${name}`,referenceKey:name,base:20,category:'mental',specialty:''},
  toObject(){return {_id:id,type:'skill',name,system:structuredClone(this.system),flags:{}};}});
const a=skill('Appraise','1111111111111111');
const aClone=skill('Appraise','2222222222222222');
const b=skill('Spot','3333333333333333');
assert.equal(canonicalSkillKey(a),'appraise|');
assert.equal(sameSkill(a,aClone),true);
assert.equal(sameSkill(a,b),false);
assert.equal(uniqueSkills([a,aClone,b]).length,2);
assert.deepEqual(planMissingBaseSkills([a],[a,aClone,b]),[b]);
globalThis.foundry={utils:{deepClone:structuredClone}};
const items=[];
const actor={type:'character',items,async createEmbeddedDocuments(type,data){
  assert.equal(type,'Item');for(const d of data)items.push({...d,system:d.system});return data;
}};
assert.deepEqual(await ensureActorFoundationSkills(actor,{documents:[a,aClone,b]}),{created:2,available:2,missingSource:false});
assert.deepEqual(await ensureActorFoundationSkills(actor,{documents:[a,aClone,b]}),{created:0,available:2,missingSource:false});
assert.equal(items.length,2);
assert.equal(creationBudgets({level:'normal',useEdu:true,edu:16}).profession,250);
assert.equal(creationBudgets({level:'normal',useEdu:true,occupationBudgetMethod:'edu',edu:16}).profession,320);
const penalties=agePenalties(80,true,'con,dex,cha');
assert.equal(penalties.con,-2);assert.equal(penalties.dex,-2);assert.equal(penalties.cha,-2);
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const wiz=read('module/apps/character-wizard.mjs'),tpl=read('templates/apps/character-wizard.hbs');
assert.match(wiz,/this\.wizardData\.age=.*Math\.floor/);
assert.match(wiz,/this\.skillCatalog=uniqueSkills/);
assert.match(wiz,/if\(!this\.skillCatalog\.length\)/);
assert.match(tpl,/data-wiz-power-filter/);
assert.match(tpl,/wiz-rule-copy/);
assert.match(tpl,/data-action="viewWizardPower"/);
assert.match(tpl,/power\.description/);
assert.match(tpl,/wizardData\.age/);
assert.match(read('brp-uge.mjs'),/startingSkillsSource/);
assert.match(read('module/sheets/actor-sheet.mjs'),/occupationBudgetMethod:rules.occupationBudgetMethod/);
console.log('PASS v1.21.5 baseline skill dedupe, power preview, age adjustments, and fixed/EDU policy');
