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

export function inspectTemplateDefaults(item){
  if(!isSkillFamilyTemplate(item))return {options:[],rejected:[],rawCount:0,missing:true};
  const system=item.system??{};
  const raw=Array.isArray(system.specialtyDefaults)?system.specialtyDefaults:[];
  const seen=new Set(),rejected=[];
  const options=raw.map(entry=>{
    const en=str(entry?.en||entry?.nameEn),th=str(entry?.th||entry?.nameTh);
    const key=skillFamilyId(entry?.key||en);
    const b=entry?.base;
    const base=b===null||b===undefined||b===''?null:Number(b);
    return {key,en,th:th||en,base:base!==null&&Number.isSafeInteger(base)&&base>=0?base:null,
      baseFormula:str(entry?.baseFormula),ruleNote:str(entry?.ruleNote),
      state:entry?.enabled===false?'hidden':'enabled'};
  }).filter(opt=>{
    const reason=!opt.key||!opt.en?'missing-key-or-name':/[()<>\r\n]|[/／]/u.test(opt.en)?'invalid-name':seen.has(opt.key)?'duplicate-key':null;
    if(reason){rejected.push({key:opt.key,en:opt.en,reason});return false;}
    seen.add(opt.key);return true;
  });
  return {options,rejected,rawCount:raw.length,missing:!Array.isArray(system.specialtyDefaults)};
}
export function verifiedTemplateDefaults(item){return inspectTemplateDefaults(item).options;}

export function resolveFamilyTemplates(documents=[]){
  const explicit=(documents||[]).filter(isSkillFamilyTemplate);
  const unique=[...new Map(explicit.map(d=>[d.uuid,d])).values()];
  const isWorld=d=>String(d.uuid).startsWith('Item.')||String(d.uuid).startsWith('Compendium.world.');
  const sources=unique.filter(d=>String(d.uuid).startsWith('Compendium.')&&!isWorld(d));
  const copies=[];
  const independent=unique.filter(d=>{
    if(!isWorld(d))return true;
    const refs=[d.flags?.core?.sourceId,d.flags?.['brp-uge']?.originalSourceUuid,d.flags?.['brp-uge']?.sourceUuid];
    const source=sources.find(s=>refs.includes(s.uuid));
    if(!source)return true;
    copies.push({uuid:d.uuid,sourceUuid:source.uuid});return false;
  });
  return {canonical:independent.length===1?independent[0]:null,conflict:independent.length>1,copies,sourceUuids:independent.map(d=>d.uuid)};
}
export function selectFamilyTemplate(documents=[]){return resolveFamilyTemplates(documents).canonical;}

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
    ...g,canonical:selectFamilyTemplate(g.templates),
    ambiguousTemplate:resolveFamilyTemplates(g.templates).conflict,
    requiresContentMigration:!selectFamilyTemplate(g.templates)&&g.legacyExamples.length>0
  }));
}
