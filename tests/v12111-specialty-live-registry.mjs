import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSpecialtyRegistry,eligibleSpecialtyOptions,findSpecialtyCandidate} from '../module/specialty-registry.mjs';
import {composeSpecialtyItem} from '../module/skill-specialties.mjs';
import {canonicalSkillKey} from '../module/skill-foundation.mjs';

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
assert.match(wiz,/No approved Specialties — ask your GM/);
assert.match(wiz,/ยังไม่มี Specialty ที่ GM เปิดใช้/);
const init=read('brp-uge.mjs');
assert.match(init,/specialtyRegistry',[\s\S]*?onChange:\s*refreshBRPWorldUI/);
assert.match(init,/specialtyPresets',[\s\S]*?onChange:\s*refreshBRPWorldUI/);
const manager=read('module/apps/specialty-presets-menu.mjs');
assert.match(manager,/await game\.settings\.set\('brp-uge','specialtyRegistry',JSON\.stringify\(data\)\)/);
const hbs=read('templates/apps/character-wizard.hbs');
assert.match(hbs,/data-personal-family-picker/);
assert.match(hbs,/data-personal-specialty-picker/);
console.log('PASS: live World Specialty changes appear in Wizard without resetting drafts');
