/** Data-only specialty adaptation for externally supplied Skill Items.
 * No skill names, rules, or preset lists are bundled into the game engine.
 */
import { normalizedText } from './reference-utils.mjs';
import { documentToEmbeddedItem } from './library-provider.mjs';
import { isSkillFamilyTemplate, verifiedTemplateDefaults, skillTemplateName, resolveFamilyTemplates } from './skill-family-templates.mjs';

const endSpecialty=/^(.+?)\s*\(([^()]*)\)\s*$/u;
const text=value=>String(value??'').trim();
export const specialtyFamilyKey=value=>normalizedText(value);

export function analyzeSkillFamily(item) {
  if(item?.type!=='skill')return null;
  const system=item.system??{};
  const en=text(system.nameEn||item.name);
  const th=text(system.nameTh||item.name||en);
  const enMatch=en.match(endSpecialty);
  const thMatch=th.match(endSpecialty);
  const isTemplate=isSkillFamilyTemplate(item);
  const enFamily=text(system.specialtyFamily||enMatch?.[1]||en);
  const thFamily=text(system.specialtyFamilyTh||thMatch?.[1]||th);
  // A literal (...) is a source TEMPLATE, never a selectable character skill.
  const enSpecialty=isTemplate?'':text(system.specialty||enMatch?.[2]);
  const thSpecialty=isTemplate?'':text(system.specialtyTh||thMatch?.[2]||enSpecialty);
  const key=specialtyFamilyKey(enFamily);
  return key?{
    key, enFamily, thFamily, enSpecialty, thSpecialty,
    isTemplate,
    supportsSpecialty: Boolean(isTemplate||enMatch||system.specialtyFamily||system.specialty)
  }:null;
}

/** A family exists if an installed source provides a specialized example.
 * Thus Science (Astronomy) can be created from Science (Chemistry / Physics)
 * without fabricating a 'Science' record in the Compendium.
 */
export function availableSpecialtyFamilies(documents) {
  const grouped=new Map();
  for(const item of documents??[]){
    const info=analyzeSkillFamily(item);
    if(!info?.supportsSpecialty||!item.uuid)continue;
    let family=grouped.get(info.key);
    if(!family){
      family={key:info.key,enFamily:info.enFamily,thFamily:info.thFamily,
        templateUuid:item.uuid,exampleSpecialties:[],templates:[]};
      grouped.set(info.key,family);
    }
    family.templates.push(item);
    if(info.enSpecialty && !family.exampleSpecialties.some(x=>specialtyFamilyKey(x.en)===specialtyFamilyKey(info.enSpecialty))){
      family.exampleSpecialties.push({en:info.enSpecialty,th:info.thSpecialty});
    }
  }
  // Prefer precisely one explicitly designated Family Template. Legacy
  // (specialty-specific) Compendium Items are migration inputs only; do not
  // treat them as official default choices for new characters.
  for(const family of grouped.values()){
    const templates=family.templates.filter(isSkillFamilyTemplate);
    family.legacyExamples=family.templates.filter(item=>!isSkillFamilyTemplate(item));
    const resolution=resolveFamilyTemplates(templates);
    family.canonicalTemplate=resolution.canonical;
    family.sourceResolution=resolution;
    family.requiresContentMigration=templates.length===0&&family.legacyExamples.length>0;
    family.ambiguousTemplate=resolution.conflict;
    family.templateUuid=family.canonicalTemplate?.uuid||'';
    family.bookDefaults=family.canonicalTemplate?verifiedTemplateDefaults(family.canonicalTemplate):[];
  }
  return [...grouped.values()].sort((a,b)=>a.enFamily.localeCompare(b.enFamily));
}

export function readSpecialtyPresets(value) {
  let raw;
  try {raw=typeof value==='string'?JSON.parse(value):value;}catch{return {};}
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
  const result={};
  for(const [family,entries] of Object.entries(raw)){
    const key=specialtyFamilyKey(family);
    if(!key||!Array.isArray(entries))continue;
    const seen=new Set();
    result[key]=entries.map(entry=>({en:text(typeof entry==='string'?entry:entry?.en),th:text(entry?.th)}))
      .filter(entry=>{
        const id=specialtyFamilyKey(entry.en);
        if(!id||seen.has(id))return false;
        seen.add(id);return true;
      });
  }
  return result;
}

export function composeSpecialtyItem(template, family, {en,th,base=null,baseFormula='',ruleNote=''}={}) {
  const enSpecialty=text(en),thSpecialty=text(th||enSpecialty);
  if(!enSpecialty)throw new Error('The English specialty reference is required');
  if(/[()<>\r\n]/u.test(enSpecialty)||/[()<>\r\n]/u.test(thSpecialty))throw new Error('Invalid specialty name');
  const data=documentToEmbeddedItem(template);
  if(!data||data.type!=='skill')throw new Error('A real Skill Item source is required');
  // Every embedded Specialty is an independent Foundry Document with its own _id.
  delete data._id; delete data.id;
  const enName=`${family.enFamily} (${enSpecialty})`;
  const thName=`${family.thFamily} (${thSpecialty})`;
  data.name=enName;
  data.system={...data.system,
    nameEn:enName,nameTh:thName,referenceKey:enName,
    specialty:enSpecialty,specialtyTh:thSpecialty,
    specialtyFamily:family.enFamily,specialtyFamilyTh:family.thFamily,
    isSpecialtyTemplate:false,specialtyDefaults:[],
    // A book-verified specialty may have a different rule base from its
    // family (e.g., a native language). No guessed adjustments.
    ...(base!==null&&base!==undefined&&Number.isSafeInteger(Number(base))&&Number(base)>=0
      ?{base:Number(base),baseFormula:text(baseFormula)}:
        text(baseFormula)?{baseFormula:text(baseFormula)}:{}),
    occupationBonus:0,personalBonus:0,rank:0,personalityBonus:0,
    fixedRating:null,checked:false
  };
  data.flags??={};data.flags['brp-uge']??={};
  // Do NOT point weapon/occupation UUID references at the template specialty.
  // This newly authored skill is independent of that exact source Item.
  if(data.flags.core)delete data.flags.core.sourceId;
  for(const key of ['sourceUuid','liveDocumentUuid','originalSourceUuid'])delete data.flags['brp-uge'][key];
  data.flags['brp-uge'].specialtyGenerated=true;
  data.flags['brp-uge'].specialtyTemplateUuid=template.uuid;
  // Avoid publishing a copied source's specialized title as the new specialty's title.
  for(const [field,title] of [['descriptionEn',enName],['descriptionTh',thName]]){
    const html=String(data.system[field]??'');
    if(/^\s*<h[1-6][^>]*>[^<]*<\/h[1-6]>/i.test(html)){
      const page=Array.isArray(template.flags?.['brp-uge']?.rulebookReference?.pages)
        ? template.flags['brp-uge'].rulebookReference.pages.join(', '):'';
      const updatedTitle=title+(page?` — BRP UGE ${field==='descriptionTh'?'น.':'p.'} ${page}`:'');
      data.system[field]=html.replace(/^\s*<h([1-6])([^>]*)>[^<]*<\/h\1>/i,
        (_match,h,attrs)=>`<h${h}${attrs}>${updatedTitle.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</h${h}>`);
    }
  }
  return data;
}