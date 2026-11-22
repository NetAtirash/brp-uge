import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSpecialtyRegistry,readSpecialtyRegistry,eligibleSpecialtyOptions,
  findSpecialtyCandidate,specialtyTemplateFor} from '../module/specialty-registry.mjs';
import {composeSpecialtyItem} from '../module/skill-specialties.mjs';
import {canonicalSkillKey,sameSkill} from '../module/skill-foundation.mjs';
import {normalizeOccupationChoiceGroups,occupationGroupAllowsSkill,
  occupationSkillEligible,validateOccupationChoices,occupationChoiceMetadataMissing} from '../module/occupation-choice-rules.mjs';
import {filterStartingSkills} from '../module/skill-selection.mjs';
import {validateSkillPointDraft} from '../module/skill-points-utils.mjs';

globalThis.foundry={utils:{deepClone:structuredClone}};
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=(name,id,base=1)=>({
  type:'skill',documentName:'Item',uuid:'Compendium.example.skills.Item.'+id,name,
  system:{nameEn:name,nameTh:'วิทยาศาสตร์ ('+name.split('(')[1],
    referenceKey:name,category:'mental',base,baseFormula:'',occupationBonus:0,personalBonus:0},
  flags:{'brp-uge':{rulebookReference:{heading:'Science (various)'}}},
  toObject(){return {type:this.type,name:this.name,_id:'SHOULD-NOT-REUSE',
    system:structuredClone(this.system),flags:structuredClone(this.flags)};}
});
const combined=source('Science (Chemistry / Physics)','combined');
const biology=source('Science (Biology)','bio');
const noSpecialty={
  type:'skill',documentName:'Item',uuid:'Item.ordinary',
  name:'Persuade',system:{nameEn:'Persuade',base:15}
};
const overlay=readSpecialtyRegistry({families:{Science:{
  additions:[{key:'astronomy',en:'Astronomy',th:'ดาราศาสตร์',templateUuid:combined.uuid}],
  hidden:['biology']
}}});
const registry=buildSpecialtyRegistry([combined,biology,noSpecialty],overlay,'{}');
const science=registry.find(f=>f.key==='science');
assert.ok(science);
assert.equal(science.ambiguous.length,2,'legacy subtype Items require template migration');
assert.ok(science.options.some(o=>o.en==='Chemistry / Physics'&&o.hidden&&o.review),
  'ambiguous source appears for GM review but remains excluded from player choices');
assert.ok(science.options.find(o=>o.key==='biology').hidden);
assert.equal(science.requiresContentMigration,true);
assert.deepEqual(eligibleSpecialtyOptions(registry,'science').map(o=>o.key),['astronomy'],'legacy subtypes are not automatic book defaults');
const curated=buildSpecialtyRegistry([combined,biology,noSpecialty],{
  families:{science:{sourceOverrides:{[combined.uuid]:{
    en:'Astronomy',th:'ดาราศาสตร์',state:'enabled'
  }}}}
},'{}');
const cur=curated.find(f=>f.key==='science').options.find(o=>o.sourceUuid===combined.uuid);
assert.equal(cur.en,'Astronomy','GM source override becomes a selectable concrete Specialty');
assert.equal(cur.th,'ดาราศาสตร์');
assert.equal(cur.hidden,false);
assert.equal(cur.templateUuid,combined.uuid,'source provenance remains stable');
assert.equal(findSpecialtyCandidate(curated,'science|astronomy').option.sourceUuid,combined.uuid);
assert.equal(combined.system.nameEn,'Science (Chemistry / Physics)','source document must remain untouched');

const art={
  ...source('Art (Drawing / Painting)','artcompound',5),
  system:{...source('Art (Drawing / Painting)','artcompound',5).system,
    nameTh:'ศิลปะ (วาดภาพ/ระบายสี)',category:'manipulation'}
};
const artRegistry=buildSpecialtyRegistry([art],{
  families:{art:{
    sourceOverrides:{[art.uuid]:{en:'Drawing',th:'วาดภาพ',state:'enabled'}},
    additions:[{en:'Painting',th:'จิตรกรรม',templateUuid:art.uuid,state:'enabled'}]
  }}
},'{}');
const artGroup=artRegistry.find(group=>group.key==='art');
assert.deepEqual(eligibleSpecialtyOptions(artRegistry,'art').map(o=>o.en),['Drawing','Painting'],
  'GM can replace a slash-composite source and create separate Art specialties');
assert.equal(findSpecialtyCandidate(artRegistry,'art|drawing').option.sourceUuid,art.uuid);
assert.equal(findSpecialtyCandidate(artRegistry,'art|painting').option.templateUuid,art.uuid);
assert.equal(art.system.nameEn,'Art (Drawing / Painting)',
  'curating Art must never rename the original Compendium Item');

const chosen=findSpecialtyCandidate(registry,'science|astronomy');
assert.equal(chosen.option.th,'ดาราศาสตร์');
assert.equal(specialtyTemplateFor(chosen.family,chosen.option,[combined,biology]),combined);
const astronomy=composeSpecialtyItem(combined,science,{en:'Astronomy',th:'ดาราศาสตร์'});
assert.equal(canonicalSkillKey(astronomy),'science|astronomy');
assert.ok(!sameSkill(astronomy,biology),'different specialties have independent identities');
assert.equal(astronomy._id,undefined);
const noTemplate=buildSpecialtyRegistry([combined],{},{}).find(g=>g.key==='science');
assert.equal(specialtyTemplateFor(noTemplate,{sourceUuid:'',templateUuid:''},[combined]),null,
  'ambiguous composite source cannot serve as implicit template');


const exact={
  ...biology,flags:{core:{sourceId:biology.uuid},'brp-uge':{sourceUuid:biology.uuid}}
};
const groups=normalizeOccupationChoiceGroups([{
 id:'fields',labelEn:'Fields',count:2,distinct:true,
 options:[{kind:'family',familyKey:'science',ref:''}]
}]);
assert.equal(occupationGroupAllowsSkill(groups[0],astronomy),true);
assert.equal(occupationGroupAllowsSkill(groups[0],noSpecialty),false);
const selections={fields:['science|astronomy','science|biology']};
assert.ok(validateOccupationChoices(groups,selections,[astronomy,biology]).valid);
assert.ok(!validateOccupationChoices(groups,{fields:['science|astronomy']},[astronomy,biology]).valid);
assert.ok(!validateOccupationChoices(groups,{fields:['science|astronomy','science|astronomy']},[astronomy,biology]).valid);
assert.ok(!validateOccupationChoices(groups,{fields:['science|astronomy','bad']},[astronomy,biology]).valid);
assert.equal(occupationChoiceMetadataMissing({skillChoiceGroups:[]},
  'Choose three skills from the following list.'),true);
assert.equal(occupationChoiceMetadataMissing({skillChoiceGroups:groups},
  'Choose three skills from the following list.'),false);
assert.equal(occupationChoiceMetadataMissing({skillChoiceGroups:[]},
  'This occupation has no extra selections.'),false);
const occupation={skillRefs:[],skillChoiceGroups:groups};
assert.ok(occupationSkillEligible(astronomy,occupation,selections,[astronomy,biology]));
assert.ok(!occupationSkillEligible(noSpecialty,occupation,selections,[astronomy,biology]));
assert.equal(filterStartingSkills([combined,biology,noSpecialty],{mode:'baseline'}).length,1);
const actorSkills=[
  {...astronomy,id:'astro',system:{...astronomy.system,total:1,occupationBonus:0,personalBonus:0}},
  {...biology,id:'bio',system:{...biology.system,total:1,occupationBonus:0,personalBonus:0}},
  {...noSpecialty,id:'persuade',system:{...noSpecialty.system,total:15,occupationBonus:0,personalBonus:0}}
];
const actor={
  items:[...actorSkills,{type:'occupation',system:{skillRefs:[],skillChoiceGroups:groups}}],
  getFlag(_scope,key){if(key==='creationCompleted')return false;
    if(key==='creationOccupationChoices')return selections;return null;}
};
const invalidDraft=new Map([
  ['astro',{occupation:10,personal:0}],
  ['bio',{occupation:0,personal:0}],
  ['persuade',{occupation:8,personal:0}]
]);
assert.equal(validateSkillPointDraft(actor,invalidDraft,{budget:{profession:250,personal:120},cap:75}).valid,false,
  'point workbench must reject non-occupational creation points');
invalidDraft.set('persuade',{occupation:0,personal:5});
assert.ok(validateSkillPointDraft(actor,invalidDraft,{budget:{profession:250,personal:120},cap:75}).valid,
  'personal points remain available for non-occupation Skills');


const schema=read('module/data-models.mjs');
assert.match(schema,/skillChoiceGroups: new ArrayField/);
const wizard=read('module/apps/character-wizard.mjs');
assert.match(wizard,/selectOccupationChoice: BRPCharacterWizard/);
assert.match(wizard,/validateOccupationChoices/);
assert.match(wizard,/professionDrafts/);
assert.match(wizard,/creationOccupationChoices/);
assert.match(wizard,/allowRebuild/);
assert.ok(wizard.indexOf('const resolvedOccupation=')<wizard.indexOf('await actorDoc.update({'),
  'Occupation source must resolve before mutating Actor');
assert.ok(wizard.indexOf('const unresolvedGear=[]')<wizard.indexOf('await actorDoc.update({'),
  'Starter equipment must preflight before mutating Actor');
assert.match(wizard,/if\(creationCompleted\)\{/);
assert.match(wizard,/occupationChoiceMetadataMissing\(prof,occupationText\)/);
assert.match(wizard,/data-occupation-kind-radio/);
assert.match(wizard,/personalSpecialtyKeys/);
const template=read('templates/apps/character-wizard.hbs');
assert.match(template,/data-occupation-kind-radio/);
assert.match(template,/data-occupation-skill-options/);
assert.match(template,/data-occupation-specialty-option/);
assert.match(template,/data-personal-specialty-option/);
assert.match(template,/brp-wiz-specialty-options/);
assert.match(template,/data-personal-family-picker/);
assert.match(template,/occupationMetadataMissing/);
assert.match(template,/data-action="removeOccupationChoice"/);
const manager=read('module/apps/specialty-presets-menu.mjs');
assert.match(manager,/buildSpecialtyRegistry/);
assert.match(manager,/sourceOverrides/);
assert.ok(!manager.includes("readonly'),"), 'all source names should be editable as World overlays');
assert.match(manager,/settings.set\('brp-uge','specialtyRegistry'/);
const app=read('module/apps/occupation-choice-editor.mjs');
assert.match(app,/system.skillChoiceGroups/);
const css=read('styles/brp-v12111-specialty-management.css');
assert.match(css,/\.brp-specialty-manager-v3/);
assert.match(css,/\.wiz-skill-row/);
assert.match(css,/\.brp-wiz-choice-radio-list/);
const manifest=JSON.parse(read('system.json'));
assert.equal(manifest.version,'1.21.11');
assert.equal(manifest.styles.at(-1),'styles/brp-v12111-specialty-management.css');
console.log('PASS v1.21.11 Specialty registry, source safety, choice groups and Wizard integration');
