import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const manifest=JSON.parse(read('system.json'));
assert.equal(manifest.version,'1.21.8');
assert.equal(manifest.styles.at(-1),'styles/brp-v1218-specialties.css');
const {availableSpecialtyFamilies,analyzeSkillFamily,composeSpecialtyItem,readSpecialtyPresets}=await import('../module/skill-specialties.mjs');
const {canonicalSkillKey,uniqueSkills,sameSkill,planMissingBaseSkills}=await import('../module/skill-foundation.mjs');

globalThis.foundry={utils:{deepClone:structuredClone}};
const raw=(name,th,base=1,id=name)=>({
  name,type:'skill',documentName:'Item',uuid:`Compendium.test.skills.Item.${id}`,system:{
    nameEn:name,nameTh:th,referenceKey:name,category:'mental',base,baseFormula:'',
    occupationBonus:0,personalBonus:0,rank:0,checked:false
  },flags:{'brp-uge':{rulebookReference:{heading:'Science (various)'}}},
  toObject(){return {name:this.name,type:this.type,_id:'SAMPLE-SOURCE-ID',img:'icons/svg/book.svg',system:structuredClone(this.system),flags:structuredClone(this.flags)};}
});
const chemistry=raw('Science (Chemistry / Physics)','วิทยาศาสตร์ (เคมี/ฟิสิกส์)',1,'chem');
const biology=raw('Science (Natural / Biology)','วิทยาศาสตร์ (ธรรมชาติ/ชีววิทยา)',1,'bio');
const persuasion=raw('Persuade','โน้มน้าวใจ',15,'persuade');
const families=availableSpecialtyFamilies([chemistry,biology,persuasion]);
assert.deepEqual(families.map(x=>x.enFamily),['Science'],'derive Science family without generic record');
assert.ok(families[0].templateUuid,'real source template is required');
const astronomy=composeSpecialtyItem(chemistry,families[0],{en:'Astronomy',th:'ดาราศาสตร์'});
assert.equal(astronomy.name,'Science (Astronomy)');
assert.equal(astronomy.system.nameTh,'วิทยาศาสตร์ (ดาราศาสตร์)');
assert.equal(astronomy.system.base,1);
assert.equal(astronomy.system.category,'mental');
assert.equal(astronomy.system.specialty,'Astronomy');
assert.equal(astronomy.system.specialtyTh,'ดาราศาสตร์');
assert.equal(astronomy.system.referenceKey,'Science (Astronomy)');
assert.equal(astronomy._id,undefined,'Foundry must assign fresh embedded item ID');
assert.equal(astronomy.flags['brp-uge'].specialtyTemplateUuid,chemistry.uuid);
assert.equal(astronomy.flags.core?.sourceId,undefined,'a generated specialty must not impersonate its source UUID');
assert.equal(astronomy.system.occupationBonus,0);
assert.equal(astronomy.system.personalBonus,0);
assert.equal(canonicalSkillKey(astronomy),'science|astronomy');
const oldAstronomy={type:'skill',name:'Science (Astronomy)',system:{nameEn:'Science (Astronomy)',referenceKey:'Science (Astronomy)'}};
assert.equal(canonicalSkillKey(oldAstronomy),canonicalSkillKey(astronomy),'legacy naming equals structured specialty');
assert.ok(sameSkill(oldAstronomy,astronomy),'identical family+specialty is duplicate');
const geology=composeSpecialtyItem(chemistry,families[0],{en:'Geology',th:'ธรณีวิทยา'});
assert.equal(sameSkill(astronomy,geology),false,'same source UUID cannot collapse distinct specialties');
assert.equal(uniqueSkills([astronomy,geology,oldAstronomy]).length,2,'separate specialty identities');
assert.deepEqual(planMissingBaseSkills([astronomy],[astronomy,geology]).map(x=>x.name),['Science (Geology)']);
assert.ok(!sameSkill(chemistry,astronomy),'source template must not collide with custom specialty');
const presets=readSpecialtyPresets({Science:[{en:'Astronomy',th:'ดาราศาสตร์'},{en:'Geology',th:'ธรณีวิทยา'},{en:'astronomy',th:'ซ้ำ'}]});
assert.equal(presets.science.length,2,'deduplicates GM names');
assert.throws(()=>composeSpecialtyItem(chemistry,families[0],{en:'',th:'ดาราศาสตร์'}));
assert.throws(()=>composeSpecialtyItem(chemistry,families[0],{en:'Bad (name)',th:''}));
assert.ok(!/['"]Science \(Astronomy\)['"]/.test(read('module/skill-specialties.mjs')),'no embedded Science/Astronomy catalog');
const source=read('module/sheets/actor-sheet.mjs');
assert.ok(source.includes('availableSpecialtyFamilies(await getLibraryDocuments'), 'add action resolves external Skills');
assert.ok(source.includes('delete data._id;'), 'new independent IDs');
assert.ok(source.includes('composeSpecialtyItem(source,family'), 'creates structured specialty');
for(const type of ['character','npc']){
 const html=read(`templates/actor/${type}-sheet.hbs`);
 for(const required of ['data-specialty-controls','data-specialty-choice','data-custom-specialty-en','data-custom-specialty-th'])
   assert.ok(html.includes(required),`${type}: ${required}`);
}
const entry=read('brp-uge.mjs');
assert.ok(entry.includes("registerMenu('brp-uge','manageSpecialties'"));
assert.ok(entry.includes("register('brp-uge','specialtyPresets'"));
const manager=read('module/apps/specialty-presets-menu.mjs');
assert.ok(manager.includes("settings.set('brp-uge','specialtyPresets'"));
console.log('PASS v1.21.8 dynamic Skill Specialty manager, identity, duplicates, and Science (Astronomy)');