import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generationFormula,pointBuyCost,pointBuySpent,creationBudgets,
  ageProfessionDelta,eduAgeBonus,youthCharacteristicLoss,rolledRedistribution,
  categoryBonusPreview,validateCreation,CREATION_SKILL_CAP,PERSONALITY_TYPES} from '../module/rules/character-creation.mjs';
import {itemReference,itemMatchesReference,categoryLabel,findActorSkill,getReferenceChoices} from '../module/reference-utils.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
for(const key of ['str','con','pow','dex','cha'])assert.equal(generationFormula(key),'3d6');
for(const key of ['siz','int','edu'])assert.equal(generationFormula(key),'2d6+6');
for(const key of ['str','con','siz','int','pow','dex','cha'])assert.equal(generationFormula(key,'heroic_roll'),'2d6+6');
assert.equal(pointBuyCost('int'),3);assert.equal(pointBuyCost('dex'),3);assert.equal(pointBuyCost('pow'),3);assert.equal(pointBuyCost('edu'),3);assert.equal(pointBuyCost('cha'),1);
const b={str:12,con:10,siz:10,int:11,pow:8,dex:10,cha:10,edu:10};
assert.equal(pointBuySpent(b),2+3-6); // lower POW refunds 6
assert.equal(ageProfessionDelta(45,20,'heroic'),40);assert.equal(ageProfessionDelta(17,20,'heroic'),-20);
assert.equal(ageProfessionDelta(15,21,'epic'),-90);assert.equal(ageProfessionDelta(45,20,'normal'),0);
assert.equal(youthCharacteristicLoss(15,21),6);assert.equal(eduAgeBonus(45,20),2);
assert.deepEqual([250,325,400,500],['normal','heroic','epic','superhuman'].map(level=>creationBudgets({level,int:12}).profession));
assert.deepEqual([250,325,400,500],['normal','heroic','epic','superhuman'].map(level=>creationBudgets({level,useEdu:true,edu:10}).profession));
assert.deepEqual([20,25,30,40],['normal','heroic','epic','superhuman'].map(level=>creationBudgets({level,useEdu:true,occupationBudgetMethod:'edu',edu:10}).profession/10));
assert.deepEqual([75,90,101,Infinity],Object.values(CREATION_SKILL_CAP));
const rr=rolledRedistribution({str:10,con:10,siz:10,int:10,pow:10,dex:10,cha:10},{str:12,con:8,siz:10,int:10,pow:10,dex:10,cha:10});
assert.equal(rr.moved,2);assert.equal(rr.valid,true);
assert.equal(rolledRedistribution({str:10,con:10},{str:14,con:6}).valid,false);
assert.equal(rolledRedistribution({str:10,con:10},{str:12,con:10}).valid,false);
assert.ok(validateCreation({characteristics:{str:10,con:10,siz:10,int:10,pow:10,dex:10,cha:10},level:'heroic',method:'point_buy',professionSpent:400}).errors.length);
assert.ok(Object.values(PERSONALITY_TYPES).every(x=>x.keys.length===0)); // no preset skill item lists
assert.equal(categoryBonusPreview({dex:12,int:8,str:14,pow:10,con:13,siz:12},'combat','standard'),3);
assert.equal(categoryBonusPreview({dex:12,int:8,str:14,pow:10,con:13,siz:12},'combat','simple'),6);
assert.equal(categoryLabel('combat','th'),'การต่อสู้');assert.equal(categoryLabel('combat','en'),'Combat');
const skill={type:'skill',name:'Custom Skill',uuid:'Item.customSkill',system:{referenceKey:'My Skill',nameTh:'ทักษะของฉัน',nameEn:'My Skill'}};
assert.equal(itemReference(skill),'Item.customSkill');
assert.ok(itemMatchesReference(skill,'Item.customSkill'));
assert.equal(findActorSkill({items:[skill]},'Item.customSkill'),skill);
globalThis.game={items:{contents:[]},packs:new Map()};
assert.deepEqual(await getReferenceChoices('skill',{lang:'th'}),[]);
const wizard=read('../module/apps/character-wizard.mjs');
assert.ok(wizard.includes('selectedWeaponRefs'));assert.ok(wizard.includes('rolledRedistribution'));
assert.ok(wizard.includes('pointBuySpent'));
const itemSheet=read('../templates/item/item-sheet.hbs');
assert.ok(itemSheet.includes('data-ref-drop="skillRefs"')===false); // dynamic field binding
assert.ok(itemSheet.includes('data-ref-drop="{{g.field}}"'));
const manifest=JSON.parse(read('../system.json'));assert.equal(manifest.version,'1.21.7');
console.log('PASS v1.14.0: book character creation budgets, age, EDU, weighted point-buy, rolled redistribution, category bonuses, bilingual references without embedded item data');