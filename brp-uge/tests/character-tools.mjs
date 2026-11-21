import assert from 'node:assert/strict';
import { sumAdvancement, skillBreakdown, getItemDescription, getItemTooltip, powerMode, powerChance, escapeForChat, getLocalizedName, recoveredPoints, firstAidFormula } from '../module/character-tools.mjs';
const log = [
  {id:'1',itemId:'sword',points:5},
  {id:'2',itemId:'staff',points:10},
  {id:'3',itemId:'sword',points:-2},
  {id:'4',itemId:'sword',points:0}
];
assert.equal(sumAdvancement(log,'sword'),3);
assert.equal(sumAdvancement(log,'missing'),0);
assert.equal(skillBreakdown({base:15,category:0,occupation:10,personal:6,legacy:5,log:3}).total,39);
assert.deepEqual(skillBreakdown({base:15,occupation:10,personal:6,legacy:5,log:3}).training,8);
assert.equal(powerMode({system:'Magic'}),'skill');
assert.equal(powerChance({name:'เวทมนตร์',system:{system:'Magic',trainingTotal:4}}, {system:{characteristics:{int:{value:10},pow:{value:11}}},items:[]}),14);
assert.equal(powerChance({name:'เวทมนตร์',system:{system:'Magic',chanceOverride:62,trainingTotal:-2}}, {}),60);
assert.equal(powerMode({system:'Psychic'}),'skill');
assert.equal(powerChance({name:'Telepathy',system:{system:'Psychic',occupationBonus:5,personalBonus:8,trainingTotal:2}}, {system:{characteristics:{pow:{value:11}}}}), 26);
assert.equal(powerChance({name:'Blast',system:{system:'Magic',occupationBonus:20,personalBonus:10,trainingTotal:4}}, {system:{characteristics:{int:{value:12},pow:{value:10}}}}), 46);
assert.equal(getLocalizedName({name:'การต่อรอง',system:{nameEn:'Bargain'}},'en'),'Bargain');
assert.equal(getLocalizedName({name:'เดิม',system:{nameTh:'ใหม่',nameEn:'New'}},'th'),'ใหม่');
assert.equal(firstAidFormula('success'), '1d3');
assert.equal(firstAidFormula('failure'), null);
assert.equal(recoveredPoints(8,10,5),2);
assert.equal(powerMode({system:'Sorcery'}),'automatic');
assert.equal(powerMode({system:'Mutation'}),'automatic');
assert.equal(powerMode({system:'Superpower'}),'resistance');
assert.equal(powerMode({system:'Sorcery',activationType:'skill'}),'skill');
const sample={descriptionTh:'ใช้ทักษะที่ผู้ใช้สร้างเอง',descriptionEn:'Custom player-created skill'};
assert.equal(getItemDescription(sample,'th'),'ใช้ทักษะที่ผู้ใช้สร้างเอง');
assert.equal(getItemDescription(sample,'en'),'Custom player-created skill');
assert.equal(getItemTooltip({descriptionTh:'<p>ทดสอบ<br/>ข้อมูล</p>',descriptionEn:'<p>English</p>'},'th'), 'ทดสอบ ข้อมูล');
assert.equal(escapeForChat('<img src=x onerror=alert("x")>'), '&lt;img src=x onerror=alert(&quot;x&quot;)&gt;');
console.log('PASS: generic skill math, power modes, bilingual custom Item fields and chat sanitization');
