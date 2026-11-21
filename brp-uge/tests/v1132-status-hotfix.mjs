import assert from 'node:assert/strict';
import { statusSkillAdjustment } from '../module/status-effects.mjs';

const skills = [
  {id:'spot',name:'สังเกต',system:{category:'perception',base:25}},
  {id:'listen',name:'ฟัง',system:{category:'perception',base:25}},
  {id:'knife',name:'ใช้มีด',system:{category:'combat',base:15}},
  {id:'dodge',name:'หลบหลีก',system:{category:'combat',base:25}}
];
let effects = [{id:'cat',active:true,skillScope:'category',skillCategory:'perception',skillModifier:-15,makeDifficult:true}];
assert.deepEqual(statusSkillAdjustment({statusEffects:effects},skills[0]),{bonus:-15,difficult:true});
assert.deepEqual(statusSkillAdjustment({statusEffects:effects},skills[1]),{bonus:-15,difficult:true});
assert.deepEqual(statusSkillAdjustment({statusEffects:effects},skills[2]),{bonus:0,difficult:false});
effects.push({id:'multi',active:true,skillScope:'specific',skillIds:['knife','spot'],skillId:'knife',skillModifier:10,makeDifficult:false});
assert.deepEqual(statusSkillAdjustment({statusEffects:effects},skills[0]),{bonus:-5,difficult:true});
assert.deepEqual(statusSkillAdjustment({statusEffects:effects},skills[2]),{bonus:10,difficult:false});
assert.deepEqual(statusSkillAdjustment({statusEffects:effects},skills[3]),{bonus:0,difficult:false});
effects.push({id:'legacy',active:true,skillScope:'specific',skillId:'dodge',skillModifier:-20});
assert.equal(statusSkillAdjustment({statusEffects:effects},skills[3]).bonus,-20,'legacy single skill still applies');
effects[1].active=false;
assert.equal(statusSkillAdjustment({statusEffects:effects},skills[2]).bonus,0,'disabled condition reversible');
effects.push({id:'bad',active:true,skillScope:'all',skillModifier:'incorrect'});
assert.ok(Number.isFinite(statusSkillAdjustment({statusEffects:effects},skills[0]).bonus));

Math.clamp ??= (n,a,b) => Math.max(a,Math.min(b,n));
globalThis.game={settings:{get(_ns,key){return ({categoryBonusMode:'none',uiLanguage:'th',useEdu:false})[key] ?? false;}}};
globalThis.Actor=class {prepareDerivedData(){}};
globalThis.Item=class {prepareDerivedData(){}};
globalThis.Combat=class {};
const {BRPItem}=await import('../module/documents.mjs');
const makeSkill=(status, raw={})=>{
 const item=Object.create(BRPItem.prototype);
 item.type='skill';item.id='spot';item.name='สังเกต';item.system={...skills[0].system,occupationBonus:10,personalBonus:3,rank:2,...raw};
 item.actor={system:{derived:{categoryBonuses:{perception:4},effectiveCharacteristics:{int:10}},advancementLog:[{itemId:'spot',points:5}],statusEffects:status}};
 return item;
};
const skill=makeSkill([{active:true,skillScope:'category',skillCategory:'perception',skillModifier:-8}]);
assert.doesNotThrow(()=>skill.prepareDerivedData());
assert.equal(skill.system.total,41,'base 25 + category 4 + occupation 10 + personal 3 + rank 2 + log 5 - status 8');
const broken=makeSkill([{active:true,skillScope:'all',skillModifier:'no'}],{base:25,rank:0});
assert.doesNotThrow(()=>broken.prepareDerivedData());
assert.equal(Number.isFinite(broken.system.total),true);
const {BRPRolls}=await import('../module/rolls/brp-rolls.mjs');
assert.equal(BRPRolls.applyDifficulty(43,'average'),43);
assert.equal(BRPRolls.applyDifficulty(43,'difficult'),22);
assert.throws(()=>BRPRolls.applyDifficulty(NaN,'average'),/invalid D100 target/);
assert.deepEqual(Object.values(BRPRolls.getThresholds(NaN)).every(Number.isFinite),true);
console.log('PASS v1.13.2: missing import repaired, finite skill totals, category/multiple scopes, legacy status and valid D100 targets');
