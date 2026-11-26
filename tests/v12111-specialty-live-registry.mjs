import {readLegacyStyle} from './css-source-manifest.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSpecialtyRegistry,eligibleSpecialtyOptions,findSpecialtyCandidate} from '../module/specialty-registry.mjs';
import {composeSpecialtyItem} from '../module/skill-specialties.mjs';
import {canonicalSkillKey} from '../module/skill-foundation.mjs';
import {wizardSpecialtyFamilies,wizardOccupationFamilyChoices} from '../module/wizard-specialty-choices.mjs';

globalThis.foundry={utils:{deepClone:structuredClone}};
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const art={
  type:'skill',documentName:'Item',uuid:'Compendium.test.skills.Item.ArtFamily',name:'Art (...)',
  system:{nameEn:'Art (...)',nameTh:'ศิลปะ (...)',isSpecialtyTemplate:true,
    specialtyFamily:'Art',specialtyFamilyTh:'ศิลปะ',specialtyDefaults:[],
    category:'communication',base:5,baseFormula:'',occupationBonus:0,personalBonus:0},
  toObject(){return {type:this.type,name:this.name,_id:'SourceShouldNotCopy',
    system:structuredClone(this.system),flags:{}};}
};
const saved=(additions)=>JSON.stringify({schemaVersion:3,families:{art:{
  additions:additions.map((name,i)=>({
    key:name.toLowerCase(),en:name,th:['การเขียน','ประพันธ์เพลง'][i]||name,
    templateUuid:art.uuid,state:'enabled',base:null,baseFormula:''
  })),bookOverrides:{},sourceOverrides:{},hidden:[],legacyMigrated:true
}}});
const before=buildSpecialtyRegistry([art],saved([]),'{}');
assert.equal(eligibleSpecialtyOptions(before,'art').length,0,
  'no GM options should be fabricated before settings save');
const updated=buildSpecialtyRegistry([art],saved(['Writing','Songwriting']),'{}');
assert.deepEqual(eligibleSpecialtyOptions(updated,'art').map(x=>x.en),['Writing','Songwriting']);
assert.deepEqual(wizardSpecialtyFamilies(updated,'th').find(f=>f.key==='art'),{
  key:'art',label:'ศิลปะ',count:2,
  specialties:[{key:'writing',label:'การเขียน'},{key:'songwriting',label:'ประพันธ์เพลง'}]
},'the same saved GM World options must render as native dropdown choices');
assert.deepEqual(wizardOccupationFamilyChoices(updated,{
  options:[{kind:'family',familyKey:'art'}]
},'en').map(f=>f.specialties.map(o=>o.label)),[['Writing','Songwriting']],
  'occupation and personal pickers share one effective Registry');
assert.deepEqual(wizardOccupationFamilyChoices(updated,{
  options:[{kind:'family',familyKey:'science'}]
},'en'),[],'unrelated families cannot leak into occupational choice lists');
assert.deepEqual(eligibleSpecialtyOptions(updated,'ศิลปะ').map(x=>x.en),[],
  'registry keys are canonical English Family keys used by the Wizard selector');
const first=findSpecialtyCandidate(updated,'art|writing');
assert.ok(first);
const actorSkill=composeSpecialtyItem(art,first.family,first.option);
assert.equal(canonicalSkillKey(actorSkill),'art|writing');
assert.equal(actorSkill.system.isSpecialtyTemplate,false);
assert.equal(actorSkill._id,undefined);
assert.equal(art.system.isSpecialtyTemplate,true,'Compendium source must remain unchanged');

const wiz=read('module/apps/character-wizard.mjs');
assert.match(wiz,/#refreshSpecialtyRegistry\(\)/);
assert.match(wiz,/if\(this.catalogLoaded\)\{\s*this\.#refreshSpecialtyRegistry\(\)/);
assert.match(wiz,/this\.specialtyRegistrySnapshot=snapshot/);
assert.match(wiz,/this\.wizardData\.personalFamilyDraft/);
assert.match(wiz,/this\.wizardData\.personalSpecialtyDraft/);
assert.match(wiz,/this\.wizardData\.occupationFamilyDrafts/);
assert.match(wiz,/this\.wizardData\.occupationSpecialtyDrafts/);
assert.match(wiz,/wizardSpecialtyFamilies\(this\.specialtyRegistry,uiLang\)/);
assert.match(wiz,/wizardOccupationFamilyChoices\(/);
assert.match(wiz,/\[data-personal-specialty-option\]:checked/);
assert.match(wiz,/\[data-occupation-specialty-option\]:checked/);
assert.doesNotMatch(wiz,/data-personal-specialty-picker/);
assert.doesNotMatch(wiz,/data-occupation-specialty-picker/);
assert.match(wiz,/refreshWizardSpecialties: BRPCharacterWizard/);
assert.match(wiz,/this\.librarySkillDocs=await getLibraryDocuments\(\{types:\['skill'\]\}\)/);
assert.match(wiz,/this\.specialtyRegistrySnapshot=null/);
assert.doesNotMatch(wiz,/select\.add\(new Option\(/,
  'Wizard must not dynamically inject choices into otherwise-empty selects');
assert.match(wiz,/querySelectorAll\('\[data-personal-family-specialties\]'\)/);
assert.match(wiz,/field\.dataset\.familyKey===family/);
const init=read('brp-uge.mjs');
assert.match(init,/specialtyRegistry',[\s\S]*?onChange:\s*refreshBRPWorldUI/);
assert.match(init,/specialtyPresets',[\s\S]*?onChange:\s*refreshBRPWorldUI/);
const manager=read('module/apps/specialty-presets-menu.mjs');
assert.match(manager,/await game\.settings\.set\('brp-uge','specialtyRegistry',JSON\.stringify\(data\)\)/);
const hbs=read('templates/apps/character-wizard.hbs');
assert.match(hbs,/data-personal-family-picker/);
assert.match(hbs,/data-personal-specialty-option/);
assert.match(hbs,/data-personal-family-specialties/);
assert.match(hbs,/data-occupation-specialty-field/);
assert.match(hbs,/\{\{#each f\.specialties as \|specialty\|\}\}/);
assert.match(hbs,/type="radio" name="wiz-personal-specialty-/);
assert.match(hbs,/type="radio" name="wiz-occupation-specialty-/);
assert.match(hbs,/data-occupation-specialty-option/);
assert.match(hbs,/value="{{specialty.key}}"/);
assert.doesNotMatch(hbs,/data-personal-specialty-picker/,
  'Specialty must not rely on a native select that cannot open in Foundry');
assert.match(hbs,/data-action="refreshWizardSpecialties"/);
assert.match(hbs,/availableSpecialtyCount/);
assert.match(hbs,/data-personal-family-specialties/);
const css=readLegacyStyle('styles/brp-v12111-specialty-management.css');
assert.match(css,/\.brp-wiz-specialty-group\[hidden\]/);
assert.match(css,/\.brp-wiz-specialty-option input\[type="radio"\]/);
assert.match(css,/\.brp-wiz-step4-progress,[\s\S]*?\.wiz-budget-bar\s*\{/);
assert.match(css,/position:static!important/);
const readme=read('README.md');
assert.match(readme,/Personal project \/ โครงการเพื่อใช้งานส่วนตัว/);
assert.match(readme,/ChatGPT \(OpenAI\)/);
console.log('PASS: live World Specialty changes appear in Wizard without resetting drafts');
