/** v1.13.1 offline regression checks. Real Foundry UI still needs in-app QA. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { agePenaltyBreakdown, agePenalties, effectiveCharacteristics } from '../module/status-effects.mjs';
import { BRP_CONFIG } from '../module/config.mjs';

const phases=BRP_CONFIG.combatPhases;
assert.deepEqual(phases.map(p=>p.numberLabel),['1','2','3–4']);
assert.deepEqual(phases.map(p=>p.nameTh),['ประกาศเจตนา','พลัง/เวทมนตร์','การกระทำ–ผลลัพธ์']);
assert.equal(phases.at(-1).id,'action','merged phase retains the current serialized id');
assert.match(phases.at(-1).labelTh,/^3–4\./);

// The Step Three thresholds are cumulative from raw, pre-aging characteristic values.
const before=agePenaltyBreakdown(25,49,true);
assert.equal(before.yearsElapsed,24);
assert.equal(before.total.con,0);
const turning50=agePenaltyBreakdown(25,50,true);
assert.deepEqual([turning50.total.con, turning50.total.dex, turning50.total.cha],[-1,0,0]);
const turning60=agePenaltyBreakdown(25,60,true);
assert.deepEqual([turning60.total.con, turning60.total.dex, turning60.total.cha],[-1,-1,0]);
const turning70=agePenaltyBreakdown(25,70,true);
assert.deepEqual([turning70.total.con, turning70.total.dex, turning70.total.cha],[-1,-1,-1]);
const turning80=agePenaltyBreakdown(25,80,true);
assert.deepEqual([turning80.total.con, turning80.total.dex, turning80.total.cha],[-2,-2,-2]);
const startedOlder=agePenaltyBreakdown(55,65,true);
assert.equal(startedOlder.atCreation.con,-1,'pre-existing at-creation penalty');
assert.equal(startedOlder.afterStart.con,0,'no second penalty for the same birthday');
assert.equal(startedOlder.afterStart.dex,-1,'60th birthday after starting age gives new loss');
assert.equal(startedOlder.yearsElapsed,10);
assert.equal(startedOlder.total.dex,-1);
const noStart=agePenaltyBreakdown(null,60,true);
assert.equal(noStart.yearsElapsed,0,'existing sheets with no starting age cannot invent elapsed years');
assert.equal(noStart.total.dex,-1,'current-age thresholds still computed');
assert.equal(agePenaltyBreakdown(25,80,false).total.con,0,'campaign can disable optional aging thresholds');
assert.equal(agePenaltyBreakdown(75,60,true).invalidAgeOrder,true,'invalid start/current order should be marked');

const raw={con:{value:15},dex:{value:14},cha:{value:12},str:{value:11},siz:{value:12},int:{value:13},pow:{value:10},edu:{value:12}};
const sys={startingAge:23,age:49,applyAgingRules:true,agingPriority:'con,dex,cha',characteristics:raw,statusEffects:[]};
assert.equal(effectiveCharacteristics(sys).con,15);
sys.age=50;assert.equal(effectiveCharacteristics(sys).con,14,'characteristics adjust as current age crosses 50');
sys.age=60;assert.equal(effectiveCharacteristics(sys).dex,13,'characteristics adjust as current age crosses 60');
sys.age=80;assert.equal(effectiveCharacteristics(sys).cha,10,'80+ three stats per decade');
sys.age=49;assert.equal(effectiveCharacteristics(sys).con,15,'modifiers are reversible; never mutate base score');

const hbs=readFileSync(new URL('../templates/actor/character-sheet.hbs',import.meta.url),'utf8');
const startInput=hbs.indexOf('name="system.startingAge"');
const startBlock=hbs.lastIndexOf('{{#if editMode}}',startInput);
const statusAgeStart=hbs.indexOf('<div class="brp-status-layout">');
const statusAgeRegion=hbs.slice(statusAgeStart,hbs.indexOf('{{#if isAdvancementTab}}',statusAgeStart));
assert.ok(startInput>startBlock && statusAgeRegion.includes('{{#if editMode}}') && statusAgeRegion.includes('{{else}}\n              <p class="brp-age-current"'),'starting age input resides in Edit Mode; current age displayed in Play Mode');
assert.ok(hbs.includes('class="brp-age-current"'),'play mode exposes current age instead');
const hud=readFileSync(new URL('../module/combat/combat-phases.mjs',import.meta.url),'utf8');
assert.ok(hud.includes('p.numberLabel'), 'HUD and tracker show separate ordinal labels');
assert.ok(hud.includes('p.nameTh') && hud.includes('p.nameEn'), 'phase titles use language-specific names');
console.log('PASS v1.13.1: 3–4 phase label, edit-only starting age, aging thresholds and reversible age-derived characteristics');
