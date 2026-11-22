import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isSkillFamilyTemplate,verifiedTemplateDefaults,skillFamilyTemplateCoverage} from '../module/skill-family-templates.mjs';
import {analyzeSkillFamily,availableSpecialtyFamilies,composeSpecialtyItem} from '../module/skill-specialties.mjs';
import {buildSpecialtyRegistry,eligibleSpecialtyOptions,findSpecialtyCandidate,
  specialtyTemplateFor,readSpecialtyRegistry} from '../module/specialty-registry.mjs';
import {sameSkill,canonicalSkillKey} from '../module/skill-foundation.mjs';
import {resolveOccupationTemplateGroups,normalizeOccupationChoiceGroups,
  occupationGroupAllowsSkill,validateOccupationChoices} from '../module/occupation-choice-rules.mjs';

globalThis.foundry={utils:{deepClone:structuredClone}};
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const makeFamily=(en,th,id,defaults=[],base=5)=>({
  type:'skill',documentName:'Item',name:en+' (…) ',
  uuid:'Compendium.bru.skills.Item.'+id,
  system:{nameEn:en+' (…) ',nameTh:th+' (…) ',isSpecialtyTemplate:true,
    specialtyFamily:en,specialtyFamilyTh:th,base,baseFormula:'',
    category:'communication',specialtyDefaults:defaults,
    occupationBonus:0,personalBonus:0,rank:0},
  flags:{'brp-uge':{rulebookReference:{heading:en+' (various)'}}},
  toObject(){return {type:this.type,_id:'OLD_TEMPLATE_ID',name:this.name,
    system:structuredClone(this.system),flags:structuredClone(this.flags)};}
});
const language=makeFamily('Language','ภาษา','LanguageFamily',[
  {key:'own',en:'Own',th:'ภาษาแม่',base:null,baseFormula:'INT*5',ruleNote:'Verified publisher rule entry'}
],0);
const knowledge=makeFamily('Knowledge','องค์ความรู้','KnowledgeFamily',[]);
const science=makeFamily('Science','วิทยาศาสตร์','ScienceFamily',[]);
const docs=[language,knowledge,science];
assert.equal(docs.length,3,'exactly one source Skill Item for each Family');
assert.ok(docs.every(isSkillFamilyTemplate));
assert.equal(analyzeSkillFamily(language).enSpecialty,'');
assert.equal(analyzeSkillFamily(language).isTemplate,true);
assert.equal(verifiedTemplateDefaults(language).length,1);
assert.equal(verifiedTemplateDefaults(knowledge).length,0);
assert.equal(verifiedTemplateDefaults(science).length,0);

const all=buildSpecialtyRegistry(docs,{},{});
assert.deepEqual(eligibleSpecialtyOptions(all,'language').map(x=>x.en),['Own']);
assert.equal(eligibleSpecialtyOptions(all,'science').length,0,'no fabricated science subskills');
assert.equal(eligibleSpecialtyOptions(all,'knowledge').length,0,'no fabricated knowledge subskills');
assert.equal(all.find(f=>f.key==='language').sourceCount,1);
assert.equal(all.find(f=>f.key==='language').templates.length,1);
assert.equal(all.find(f=>f.key==='language').bookDefaultCount,1);
assert.equal(availableSpecialtyFamilies(docs).find(f=>f.key==='language').canonicalTemplate.uuid,language.uuid);
assert.equal(skillFamilyTemplateCoverage(docs).find(g=>g.family==='language').legacyExamples.length,0);

const selected=findSpecialtyCandidate(all,'language|own');
assert.equal(specialtyTemplateFor(selected.family,selected.option,docs).uuid,language.uuid);
const own=composeSpecialtyItem(language,selected.family,selected.option);
assert.equal(own.name,'Language (Own)');
assert.equal(own.system.nameTh,'ภาษา (ภาษาแม่)');
assert.equal(own.system.baseFormula,'INT*5');
assert.equal(own.system.isSpecialtyTemplate,false);
assert.deepEqual(own.system.specialtyDefaults,[]);
assert.equal(own._id,undefined,'source template identity must not be copied to Actor');
assert.equal(canonicalSkillKey(own),'language|own');
assert.equal(canonicalSkillKey(language),'language|');

const cfg=readSpecialtyRegistry({families:{language:{
  additions:[{en:'Elvish',th:'ภาษาเอลฟ์',templateUuid:language.uuid,state:'enabled'}],
  bookOverrides:{own:{en:'Native',th:'ภาษาพื้นเมือง',state:'enabled'}}
}}});
const customized=buildSpecialtyRegistry(docs,cfg,'{}');
assert.deepEqual(eligibleSpecialtyOptions(customized,'language').map(x=>x.en),['Native','Elvish']);
const native=findSpecialtyCandidate(customized,'language|native');
const elvish=findSpecialtyCandidate(customized,'language|elvish');
assert.ok(native&&elvish);
const own2=composeSpecialtyItem(language,native.family,native.option);
const other=composeSpecialtyItem(language,elvish.family,elvish.option);
assert.equal(other.name,'Language (Elvish)');
assert.ok(!sameSkill(own2,other),'different languages must keep independent advancement');
assert.equal(language.system.nameEn,'Language (…) ','Compendium source must stay unchanged');
assert.equal(own.system.nameEn,'Language (Own)','old Actor owned copy must be unchanged by GM edits');
assert.equal(own2.system.baseFormula,'INT*5','book variant base survives a name override');

const occupation={skillRefs:[language.uuid],skillChoiceGroups:[]};
const required=resolveOccupationTemplateGroups(occupation,docs);
assert.equal(required.length,1);
assert.equal(required[0].count,1);
assert.equal(required[0].options[0].kind,'family');
assert.equal(required[0].options[0].familyKey,'language');
assert.ok(occupationGroupAllowsSkill(required[0],own));
assert.ok(!occupationGroupAllowsSkill(required[0],language));
assert.ok(validateOccupationChoices(required,{
  'required-family-language':['language|own']
},[own]).valid);
const exact=normalizeOccupationChoiceGroups([{
  id:'native-only',count:1,options:[{kind:'specialty',familyKey:'language',specialtyKey:'own'}]
}]);
assert.ok(occupationGroupAllowsSkill(exact[0],own));
assert.ok(!occupationGroupAllowsSkill(exact[0],other));

const oldOwn={...language,name:'Language (Own)',
  system:{...language.system,nameEn:'Language (Own)',isSpecialtyTemplate:false,
    specialty:'Own',specialtyDefaults:[]}};
const oldOther={...oldOwn,uuid:'Compendium.bru.skills.Item.LegacyOther',
  name:'Language (Other)',system:{...oldOwn.system,nameEn:'Language (Other)',specialty:'Other'}};
const combined=buildSpecialtyRegistry([oldOwn,oldOther],{},{});
const legacy=combined.find(f=>f.key==='language');
assert.equal(legacy.requiresContentMigration,true);
assert.equal(legacy.canonicalTemplate,null);
assert.equal(legacy.activeCount,0,'old per-specialty pack entries cannot masquerade as book defaults');
assert.equal(legacy.options.length,2,'legacy entries remain visible to GM for migration');
assert.ok(legacy.options.every(x=>x.review));
assert.ok(!findSpecialtyCandidate(combined,'language|other'));

const model=read('module/data-models.mjs');
assert.match(model,/isSpecialtyTemplate: new BooleanField/);
assert.match(model,/specialtyDefaults: new ArrayField/);
assert.match(model,/specialtyKey: new StringField/);
const wizard=read('module/apps/character-wizard.mjs');
assert.match(wizard,/resolveOccupationTemplateGroups/);
assert.match(wizard,/composeSpecialtyItem\(template,candidate\.family,candidate\.option\)/);
const manager=read('module/apps/specialty-presets-menu.mjs');
assert.match(manager,/bookOverrides/);
assert.match(manager,/canonicalTemplate/);
const foundation=read('module/skill-foundation.mjs');
assert.match(foundation,/filter\(item=>!analyzeSkillFamily\(item\)\?\.supportsSpecialty\)/);
console.log('PASS one-family/one-Compendium-Item, only book-verified defaults, GM overlays and actor-safe instantiation');
