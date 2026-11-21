import assert from 'node:assert/strict';
import { BRP_PHASES, brpMovementMultiplier, brpActionRank, brpPlanForRound, compareBRPTurns } from '../module/combat/combat-flow-utils.mjs';
assert.deepEqual(BRP_PHASES,['statements','powers','action']);
assert.equal(brpMovementMultiplier(5),1);
assert.equal(brpMovementMultiplier(6),.5);
assert.equal(brpMovementMultiplier(15),.5);
assert.equal(brpMovementMultiplier(16),.25);
assert.equal(brpMovementMultiplier(30),0);
assert.equal(brpActionRank(14,0),14);
assert.equal(brpActionRank(14,10),7);
assert.equal(brpActionRank(14,20),3);
assert.equal(brpActionRank(14,30),0);
assert.equal(brpActionRank(14,0,5),5);
assert.equal(brpActionRank(14,10,12),7); // delaying never makes an actor earlier
const a={id:'a',intent:'power',dexRank:18,intRank:8,actionRank:18,reachRank:2,skillRank:30,originalIndex:0};
const b={id:'b',intent:'melee',dexRank:12,intRank:17,actionRank:12,reachRank:3,skillRank:60,originalIndex:1};
assert.ok(compareBRPTurns(a,b,{phase:'statements'})<0,'higher DEX declares first');
assert.ok(compareBRPTurns(a,b,{phase:'statements',reverseStatements:true})>0,'optional reverse DEX');
assert.ok(compareBRPTurns(a,b,{phase:'powers'})<0,'powers come before nonpowers');
assert.ok(compareBRPTurns(a,b,{phase:'action',powerTiming:'separate'})>0,'a power action does not act again on DEX');
assert.ok(compareBRPTurns(a,b,{phase:'action',powerTiming:'action'})<0,'power in action phase acts on rank');
assert.ok(compareBRPTurns({...a,actionRank:12,intent:'ranged',reachRank:5},b,{phase:'action'})<0,'missile first on tied rank');
const plans={'c':{combatId:'enc',round:2,intent:'ranged',done:true}};
assert.equal(brpPlanForRound(plans,'enc','c',2).intent,'ranged');
assert.equal(brpPlanForRound(plans,'enc','c',3).intent,'');
assert.equal(brpPlanForRound(plans,'other','c',2).done,false);

// Exercise concrete Actor ownership writes and the native Combat sorting adapter.
globalThis.game={ settings:{ settings:{has:()=>true},get(_sys,k){return {
useCombatPhases:true,useD10Initiative:false,combatStatementOrder:'highFirst',combatPowerTiming:'separate',
uiLanguage:'th'}[k];}},user:{isGM:true}, combats:{} };
globalThis.ui={combat:{render(){}}};
globalThis.foundry={utils:{deepClone:structuredClone}};
globalThis.Actor=class{};globalThis.Item=class{};globalThis.Combat=class{};
const { BRPCombat } = await import('../module/documents.mjs');
const { BRPCombatPhases } = await import('../module/combat/combat-phases.mjs');
const oldEncounter=Object.create(BRPCombat.prototype);
oldEncounter.getFlag=()=>"resolution";
assert.equal(oldEncounter.getPhase(),"action","v1.11 saved resolution phase migrates to action");
function actor(dex,int){const storage={};return {
 id:`actor-${dex}`,isOwner:true,items:[],system:{characteristics:{dex:{value:dex},int:{value:int},pow:{value:12}}},
 getFlag(_scope,k){return storage[k]},async setFlag(_scope,k,val){storage[k]=val},storage
};}
const c1={id:'c1',actor:actor(17,8),initiative:17,sort:0,getFlag:()=>0};
const c2={id:'c2',actor:actor(11,18),initiative:11,sort:1,getFlag:()=>0};
const combat={id:'enc',round:1,combatants:[c1,c2],getPhase:()=> 'statements',getFlag:()=>'',setupTurns(){}};
assert.ok(BRPCombat.prototype._sortCombatants.call({...combat,getPhase:()=> 'statements'},c1,c2)<0,
 'Combat override: high DEX declares before low DEX');
combat.getPhase=()=> 'powers';
assert.ok(BRPCombat.prototype._sortCombatants.call({...combat,getPhase:()=> 'powers'},c1,c2)>0,
 'Combat override: higher INT casts first for powers when undecided');
await BRPCombatPhases.updatePlan(combat,c1,{intent:'melee',note:'มุ่งโจมตีดาบ',moveMeters:10});
assert.equal(BRPCombatPhases.getPlan(combat,c1).intent,'melee');
assert.equal(BRPCombatPhases.getPlan(combat,c1).moveMeters,10);
await BRPCombatPhases.updateEngagement(combat,c1,{engaged:true,with:'Enemy'});
assert.equal(BRPCombatPhases.getEngagement(combat,c1).engaged,true);
combat.round=2;
assert.equal(BRPCombatPhases.getEngagement(combat,c1).with,'Enemy','engagement persists between rounds');
assert.equal(BRPCombatPhases.getPlan(combat,c1).intent,'','a new round never inherits old declarations');
console.log('PASS: BRP three phases, DEX/INT ranks, movement, delay, weapon priority, plan permissions and round isolation');
