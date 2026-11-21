import assert from 'node:assert/strict';
import { agePenalties, characteristicAdjustments, effectiveCharacteristics, statusSkillAdjustment } from '../module/status-effects.mjs';
import { getThemedBRPIcon } from '../module/library-taxonomy.mjs';

assert.equal(agePenalties(49,true).con,0);
assert.equal(agePenalties(50,true).con,-1);
assert.deepEqual([agePenalties(70,true).con,agePenalties(70,true).dex,agePenalties(70,true).cha],[-1,-1,-1]);
assert.deepEqual([agePenalties(80,true).con,agePenalties(80,true).dex,agePenalties(80,true).cha],[-2,-2,-2]);
assert.deepEqual([agePenalties(90,true).con,agePenalties(90,true).dex,agePenalties(90,true).cha],[-3,-3,-3]);
assert.equal(agePenalties(100,false).con,0,'Aging off for legacy actors');
assert.equal(agePenalties(60,true,'con,con,dex').con,-2,'Repeat chosen stat for decades 50 and 60');

const system={age:60,applyAgingRules:true,agingPriority:'con,dex,cha', characteristics:Object.fromEntries(['str','con','siz','int','pow','dex','cha','edu'].map(k=>[k,{value:12}])),
  statusEffects:[{id:'blind',active:true,characteristic:'dex',statModifier:-2,skillScope:'visual',skillModifier:-10,makeDifficult:true},
    {id:'fear',active:false,characteristic:'cha',statModifier:-3,skillScope:'all',skillModifier:-50,makeDifficult:true}]};
assert.equal(characteristicAdjustments(system).dex,-3);
assert.equal(effectiveCharacteristics(system).dex,9);
assert.equal(effectiveCharacteristics(system).cha,12,'inactive effects ignored');
assert.deepEqual(statusSkillAdjustment(system,{id:'spot',name:'Spot',system:{tags:'visual'}}),{bonus:-10,difficult:true});
assert.deepEqual(statusSkillAdjustment(system,{id:'jump',name:'Jump',system:{tags:''}}),{bonus:0,difficult:false});
system.statusEffects[0].active=false;
assert.equal(effectiveCharacteristics(system).dex,11,'disabling a condition restores base score');
assert.deepEqual(statusSkillAdjustment(system,{id:'spot',name:'Spot',system:{tags:'visual'}}),{bonus:0,difficult:false});

globalThis.game={brp:{appearance:{iconResolver:null}}};
const item={type:'weapon',img:'systems/brp-uge/assets/icons/sword.webp'};
assert.equal(getThemedBRPIcon(item),item.img,'engine icons are neutral by default');
globalThis.game.brp.appearance.iconResolver=(_entry, original)=>original.replace('systems/brp-uge/', 'modules/brp-uge-themes/');
assert.equal(getThemedBRPIcon(item),'modules/brp-uge-themes/assets/icons/sword.webp');
assert.equal(getThemedBRPIcon({img:'worlds/my-world/custom.png'}),'worlds/my-world/custom.png');
console.log('PASS v1.13 legacy effects plus v1.21 optional icon extension');
