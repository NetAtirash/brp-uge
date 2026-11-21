import assert from 'node:assert/strict';
import { BRPRolls } from '../module/rolls/brp-rolls.mjs';

Math.clamp ??= (v, lo, hi) => Math.max(lo, Math.min(hi, v));
let contentHtml = '';
let response = {difficulty:'difficult', modifier:10, messageMode:'blind'};
let lastMode = null;
globalThis.game = {
  user:{id:'p1'},
  users:[{id:'gm1',isGM:true},{id:'p1',isGM:false}],
  settings:{get:()=> 'th'}
};
globalThis.foundry = {applications:{api:{
  DialogV2:{input: async ({content}) => {contentHtml=content; return response;}},
},handlebars:{renderTemplate:async()=>'<div>TEST</div>'}}};
globalThis.ChatMessage = {getSpeaker:()=>({alias:'Test'})};
globalThis.Roll = class {
  constructor(formula){this.formula=formula;this.total=26;}
  async evaluate(){return this;}
  async toMessage(_msg,opt){lastMode=opt.messageMode;}
};
assert.deepEqual(BRPRolls.chatVisibility('gm'), {whisper:['gm1']});
assert.deepEqual(BRPRolls.chatVisibility('blind'), {whisper:['gm1'],blind:true});
assert.deepEqual(BRPRolls.chatVisibility('self'), {whisper:['p1']});
assert.deepEqual(BRPRolls.chatVisibility('public'), {});
const roll = await BRPRolls.rollSkill({actor:null,title:'Magic spell',baseTarget:60});
assert.equal(roll.finalTarget,40,'difficulty should half target before +10');
assert.equal(roll.messageMode,'blind');
assert.equal(lastMode,'blind');
assert.match(contentHtml,/name="difficulty"/);
response={messageMode:'self'};
await BRPRolls.confirmRoll({title:'roll 1d3', percentile:false});
assert.doesNotMatch(contentHtml,/name="difficulty"/,'damage-only rolls should not show percentile difficulty');
response=null;
const cancelled=await BRPRolls.rollSkill({actor:null,title:'Cancelled',baseTarget:60});
assert.equal(cancelled,null);
console.log('PASS: confirmation options, secret visibility, percentile math, cancellation');
