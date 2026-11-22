/**
 * v1.21.11 RC3: one source Skill Item per specialty-capable Skill Family.
 *
 * The Compendium owns a family template (e.g. Language (...)), not one Item
 * per possible language. This module contains NO published BRP rules or
 * hard-coded default specializations. Only the content publisher can mark
 * verified book defaults in system.specialtyDefaults.
 */
import {normalizedText} from './reference-utils.mjs';

const str=value=>String(value??'').trim();
const templateName=/^(.+?)\s*\((?:\.{3}|…)\)\s*$/u;

export const skillFamilyId=value=>normalizedText(str(value));

export function isSkillFamilyTemplate(item) {
  if(item?.type!=='skill')return false;
  if(item.system?.isSpecialtyTemplate===true)return true;
  // A deliberate literal "..." is a template marker, unlike a printed
  // compound or (various) rule heading.
  return templateName.test(str(item.system?.nameEn||item.name));
}

export function skillTemplateName(item,lang='en') {
  const system=item?.system??{};
  const raw=str(lang==='th'?(system.nameTh||item.name):(system.nameEn||item.name));
  const parsed=raw.match(templateName);
  if(parsed)return parsed[1].trim();
  if(system.specialtyFamily && lang==='en')return str(system.specialtyFamily);
  if(system.specialtyFamilyTh && lang==='th')return str(system.specialtyFamilyTh);
  return raw.replace(/\s*\([^()]*\)\s*$/u,'').trim();
}

export function verifiedTemplateDefaults(item){
  if(!isSkillFamilyTemplate(item))return [];
  const system=item.system??{};
  const raw=Array.isArray(system.specialtyDefaults)?system.specialtyDefaults:[];
  const seen=new Set();
  return raw.map(entry=>{
    const en=str(entry?.en||entry?.nameEn),th=str(entry?.th||entry?.nameTh);
    const key=skillFamilyId(entry?.key||en);
    const b=entry?.base;
    const base=b===null||b===undefined||b===''?null:Number(b);
    return {key,en,th:th||en,base:base!==null&&Number.isSafeInteger(base)&&base>=0?base:null,
      baseFormula:str(entry?.baseFormula),ruleNote:str(entry?.ruleNote),
      state:entry?.enabled===false?'hidden':'enabled'};
  }).filter(opt=>{
    if(!opt.key||!opt.en||/[()<>\r\n]|[/／]/u.test(opt.en)||seen.has(opt.key))return false;
    seen.add(opt.key);return true;
  });
}

export function selectFamilyTemplate(documents=[]){
  const explicit=(documents||[]).filter(isSkillFamilyTemplate);
  if(!explicit.length)return null;
  // A single canonical source per Family is mandatory. Multiple canonical
  // templates are a publisher error, not a reason to guess a base chance.
  if(explicit.length!==1)return null;
  return explicit[0];
}

export function skillFamilyTemplateCoverage(documents=[]){
  const result=new Map();
  for(const item of documents){
    if(item?.type!=='skill')continue;
    const family=skillFamilyId(item.system?.specialtyFamily||
      skillTemplateName(item,'en'));
    if(!family)continue;
    const group=result.get(family)||{family,templates:[],legacyExamples:[]};
    if(isSkillFamilyTemplate(item))group.templates.push(item);
    else if(/\([^()]*\)\s*$/u.test(str(item.system?.nameEn||item.name)))
      group.legacyExamples.push(item);
    result.set(family,group);
  }
  return [...result.values()].map(g=>({
    ...g,canonical:g.templates.length===1?g.templates[0]:null,
    ambiguousTemplate:g.templates.length>1,
    requiresContentMigration:g.templates.length!==1&&g.legacyExamples.length>0
  }));
}
