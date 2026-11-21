/** v1.13.4 offline guard: age is unique & numeric in every sheet view. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { agePenaltyBreakdown, effectiveCharacteristics } from "../module/status-effects.mjs";

const template = readFileSync(new URL("../templates/actor/character-sheet.hbs", import.meta.url), "utf8");
// Updated Personal header: age is edited in the header ONLY when Status is not
// active. The Status tab already contains the unique age editor.
const header=template.slice(0,template.indexOf('</header>'));
const status=template.slice(template.indexOf('{{#if isStatusTab}}\n        <div class="brp-status-layout">'));
assert.match(header,/{{#if editMode}}{{#unless isStatusTab}}<input[^>]*name="system\.age"/);
assert.match(header,/name="system\.age"[^>]*type="number"|name="system\.age"[^>]*min="0"/);
assert.equal((header.match(/name="system\.age"/g)||[]).length,1);
assert.equal((status.match(/name="system\.age"/g)||[]).length,1);
assert.ok(header.includes('{{else}}<span class="brp-personal-value">{{system.age}}</span>{{/unless}}'));
const rawCharacteristics = Object.fromEntries(['str','con','siz','int','pow','dex','cha','edu'].map(k => [k,{value:12}]));
const young = {startingAge:25,age:18,applyAgingRules:true,agingPriority:'con,dex,cha',characteristics:rawCharacteristics,statusEffects:[]};
const breakdown = agePenaltyBreakdown(young.startingAge, young.age, true);
assert.equal(breakdown.current,18);
assert.equal(breakdown.starting,25);
assert.equal(breakdown.yearsElapsed,0);
assert.equal(breakdown.invalidAgeOrder,true); // informative warning; not a validation rule
assert.ok(Object.values(breakdown.total).every(v => v===0),'younger characters cannot receive future aging penalties');
assert.equal(effectiveCharacteristics(young).con,12);
young.age=50;
assert.equal(effectiveCharacteristics(young).con,11);
young.age=18;
assert.equal(effectiveCharacteristics(young).con,12);
assert.equal(rawCharacteristics.con.value,12,'no mutation to base characteristics');
console.log('PASS v1.13.4: unique numeric age form inputs; younger current age accepted; age thresholds remain reversible');
