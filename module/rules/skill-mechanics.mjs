/** Rule mechanics only; no source skill records or preset content. */
import {analyzeSkillFamily,specialtyFamilyKey} from '../skill-specialties.mjs';
export function reputationOnly(item){
  return item?.type==='skill'&&analyzeSkillFamily(item)?.key==='status';
}
export function canGainExperience(item){
  return !!item&&!reputationOnly(item);
}
export function canRecordAdvancement(item,method,isGM){
  return !reputationOnly(item)||(isGM===true&&['manual','reputation'].includes(method||'manual'));
}
export function calculateSkillBase(item,characteristics,rules={},catalog=[]){
  const system=item?.system||{},c=characteristics||{},fallback=Number(system.base??0);
  const f=system.baseFormula;
  if(f==='LANGUAGE_BASE'){
    const info=analyzeSkillFamily(item);
    if(info?.key!=='literacy'||!info.enSpecialty)return fallback;
    const identity=(doc,parsed)=>new Set([specialtyFamilyKey(parsed.enSpecialty),specialtyFamilyKey(doc.flags?.['brp-uge']?.specialtyBookKey)].filter(Boolean));
    const keys=identity(item,info);
    const matches=[...(catalog?.values?.()??catalog??[])].filter(s=>{
      const other=analyzeSkillFamily(s);
      return other?.key==='language'&&!other.isTemplate&&[...identity(s,other)].some(k=>keys.has(k));
    });
    if(matches.length!==1||matches[0].system?.baseFormula==='LANGUAGE_BASE')return fallback;
    return calculateSkillBase(matches[0],c,rules,[]);
  }
  if(!characteristics)return fallback;
  if(f==='INT*5')return Math.max(Number(c.int)||0,rules.useEdu?Number(c.edu)||0:0)*5;
  if(f==='DEX*2')return (Number(c.dex)||0)*2;
  if(f==='INT+POW')return (Number(c.int)||0)+(Number(c.pow)||0);
  if(f==='DEX*4')return (Number(c.dex)||0)*4;
  return fallback;
}
