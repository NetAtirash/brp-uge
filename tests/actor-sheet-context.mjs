/** Mock sheet/model context and log write semantics; no real Foundry runtime. */
import assert from 'node:assert/strict';
Math.clamp ??= (n, a, b) => Math.max(a, Math.min(b, n));
const getWorld = k=>({uiLanguage:'th',itemTooltipLanguage:'th',campaignPowerLevel:'normal',useEdu:false,allowPlayerCharacterWizard:true}[k]);
globalThis.game={settings:{get:(sys,k)=>getWorld(k)},user:{isGM:true,targets:new Set()},packs:{get(){return undefined}}};
globalThis.foundry={applications:{sheets:{ActorSheetV2:class{constructor(){this.tabGroups={primary:'skills'};} async _prepareContext(){return {}}}},api:{HandlebarsApplicationMixin:(cls)=>cls}},utils:{deepClone:structuredClone,randomID:()=>'new-id'}};
globalThis.Actor=class{};globalThis.Item=class{};globalThis.Combat=class{};
const {BRPActor}=await import('../module/documents.mjs');
const {BRPActorSheet}=await import('../module/sheets/actor-sheet.mjs');
const items = [{id:'s',type:'skill',name:'มีด',img:'x',system:{category:'combat',base:15,effectiveBase:15,categoryBonus:0,occupationBonus:10,personalBonus:6,rank:4,trainingTotal:7,total:38,checked:false}},
{id:'p',type:'power',name:'เปลวไฟ',img:'x',system:{system:'Magic',costPP:'1 PP',chanceOverride:40,trainingTotal:5,checked:false}},
{id:'w',type:'weapon',name:'ดาบ',img:'x',system:{equipped:true,damage:'1d6'}},
{id:'a',type:'armor',name:'ชุดเกราะ',img:'x',system:{equipped:false,ap:3}},
{id:'g',type:'gear',name:'อาหาร',img:'x',system:{quantity:2}}];
items.get=id=>items.find(i=>i.id===id);
const actor={id:'a',name:'Mock',type:'character',items,system:{characteristics:Object.fromEntries(['str','con','siz','int','pow','dex','cha','edu'].map(k=>[k,{value:10}])),advancementLog:[{id:'adv',itemId:'s',itemName:'มีด',itemType:'skill',points:3,date:'2026-11-15',reason:'Training'}],journalEntries:[{id:'note',title:'Journal',category:'Story',description:'Content'}],derived:{categoryBonuses:{combat:0,communication:0,manipulation:0,mental:0,perception:0,physical:0},hitLocations:[]}},getEquippedArmorPoints:()=>0};
const sheet=new BRPActorSheet(); sheet.document=actor;
let ctx=await sheet._prepareContext({});
assert.equal(ctx.weapons.length,1);assert.equal(ctx.gear.length,1);assert.equal(ctx.armor.length,1);
assert.equal(ctx.equippedWeapons.length,1);assert.equal(ctx.equippedArmor.length,0);
assert.equal(ctx.occUsed,10);assert.equal(ctx.persUsed,6);assert.equal(ctx.occRemaining,240);assert.equal(ctx.persRemaining,94);
assert.equal(ctx.powers[0].previewChance,45);assert.equal(ctx.skillGroups.find(g=>g.key==='combat').items.length,1);
assert.equal(ctx.journalEntries.length,1);assert.equal(ctx.advancementLog[0].itemDisplay,'มีด');
sheet.tabGroups.primary='inventory'; ctx=await sheet._prepareContext({});assert.equal(ctx.isInventoryTab,true);
sheet.tabGroups.primary='notes'; ctx=await sheet._prepareContext({});assert.equal(ctx.isNotesTab,true);
const actorDoc={items,system:{advancementLog:[]},async update(p){this.system.advancementLog=p['system.advancementLog'];}};
const entry=await BRPActor.prototype.saveAdvancement.call(actorDoc,{itemId:'s',points:7,date:'2026-11-15',reason:'Practice'});
assert.equal(entry.points,7);assert.equal(actorDoc.system.advancementLog.length,1);
await BRPActor.prototype.saveAdvancement.call(actorDoc,{id:'new-id',itemId:'s',points:-2,reason:'Correction'});
assert.equal(actorDoc.system.advancementLog[0].points,-2);
await BRPActor.prototype.deleteAdvancement.call(actorDoc,'new-id');assert.equal(actorDoc.system.advancementLog.length,0);
console.log('PASS: sheet budget, inventory, tabs, power chance, log add/edit/remove');
