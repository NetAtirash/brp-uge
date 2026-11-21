/** Typed bilingual item references. UUIDs are stable and do not depend on translated names.
 * Older text-only references continue to work until migrated by the user.
 */
import { getLocalizedName } from './character-tools.mjs';
export const SKILL_CATEGORIES = Object.freeze(['combat','communication','manipulation','mental','perception','physical']);
export const CATEGORY_NAMES = Object.freeze({
  th:{combat:'การต่อสู้',communication:'การสื่อสาร',manipulation:'การใช้มือและประดิษฐ์',mental:'ความรู้และจิตใจ',perception:'การรับรู้',physical:'กายภาพ'},
  en:{combat:'Combat',communication:'Communication',manipulation:'Manipulation',mental:'Mental',perception:'Perception',physical:'Physical'}
});
export function categoryLabel(value,lang='th') { return CATEGORY_NAMES[lang]?.[value] || CATEGORY_NAMES.en[value] || String(value??''); }
export function itemReference(item) {
  // Use the exact document the user selected; retain provenance only when a UUID is unavailable.
  return String(item?.uuid || item?.flags?.core?.sourceId || item?.flags?.['brp-uge']?.sourceUuid || '');
}
export function normalizedText(value) {return String(value??'').trim().normalize('NFKC').toLocaleLowerCase();}
export function itemMatchesReference(item,ref) {
  if(!item||!ref) return false;
  const k=String(ref);
  if(item.uuid===k||item.id===k||item._id===k) return true;
  if(k.startsWith('catalog:skill:')) {
    const canonical=k.slice(14);
    return [item.system?.referenceKey,item.system?.nameEn,item.name].some(v=>normalizedText(v)===normalizedText(canonical));
  }
  if(k.startsWith('source:')) return item.flags?.['brp-uge']?.sourceId===k.slice(7);
  return item.flags?.core?.sourceId===k || item.flags?.['brp-uge']?.sourceUuid===k;
}
export function findActorSkill(actor,reference,fallbackName='') {
  const skills=[...(actor?.items??[])].filter(item=>item.type==='skill');
  if(reference) {const exact=skills.find(item=>itemMatchesReference(item,reference));if(exact)return exact;}
  const name=normalizedText(fallbackName);
  if(!name) return null;
  return skills.find(item=>[item.name,item.system?.nameEn,item.system?.nameTh,item.system?.referenceKey].some(v=>normalizedText(v)===name)) ||
    skills.find(item=>[item.name,item.system?.nameEn,item.system?.nameTh].some(v=>normalizedText(v).includes(name))) || null;
}
export function displayItemReference(ref,available,lang='th',fallback='') {
  const item=available.find(i=>itemReference(i)===ref||itemMatchesReference(i,ref));
  return item?getLocalizedName(item,lang):fallback||String(ref??'');
}
export async function getReferenceChoices(type, {actor=null,lang='th',includePacks=true}={}) {
  const found=new Map();
  const add=(item,uuid)=> {if(item?.type!==type)return;const ref=String(uuid||itemReference(item));if(!ref||found.has(ref))return;
    found.set(ref,{ref,label:getLocalizedName(item,lang),category:item.system?.category||'',type:item.type});};
  for(const item of actor?.items??[]) add(item,item.uuid);
  for(const item of game?.items?.contents??[]) add(item,item.uuid);
  if(includePacks) for(const pack of game?.packs?.values?.()??[]) {
    if(pack.documentName!=='Item'||(pack.metadata?.system&&pack.metadata.system!=='brp-uge'))continue;
    try {
      const index=await pack.getIndex({fields:['system.nameTh','system.nameEn','system.category','type']});
      for(const entry of index) {
        if(entry.type!==type)continue;
        const key=entry._id||entry.id;
        add({...entry,id:key,system:entry.system??{},type:entry.type,name:entry.name},`Compendium.${pack.collection}.Item.${key}`);
      }
    } catch(err) {console.warn('BRP UGE | Reference index unavailable',pack.collection,err);}
  }
  return [...found.values()].sort((a,b)=>a.label.localeCompare(b.label,lang));
}
export async function resolveItemReference(ref, type=null) {
  if(!ref||String(ref).startsWith('catalog:')||String(ref).startsWith('source:'))return null;
  try {const item=await fromUuid(ref);return (!type||item?.type===type)?item:null;}catch{return null;}
}
