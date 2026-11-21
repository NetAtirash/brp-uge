/** GM-defined initial skills, referencing external World/Compendium records only. */
import { getLibraryDocuments } from './library-provider.mjs';
import { uniqueSkills, canonicalSkillKey } from './skill-foundation.mjs';

export function decodeStartingSkillKeys(value) {
  if(Array.isArray(value))return new Set(value.filter(x=>typeof x==='string' && x));
  try {const parsed=JSON.parse(String(value||'[]'));return new Set(Array.isArray(parsed)?parsed.filter(x=>typeof x==='string'&&x):[]);}
  catch {return new Set();}
}
export function filterStartingSkills(skills,{mode='all',keys='[]'}={}) {
  const unique=uniqueSkills(skills);
  if(mode!=='selected')return unique;
  const allowed=decodeStartingSkillKeys(keys);
  return unique.filter(skill=>allowed.has(canonicalSkillKey(skill)));
}
export function configuredStartingSkills(skills,settings=globalThis.game?.settings) {
  const get=(key,fallback)=>{try{return settings?.get?.('brp-uge',key)??fallback;}catch{return fallback;}};
  const result=filterStartingSkills(skills,{mode:get('startingSkillsMode','all'),keys:get('startingSkillsKeys','[]')});
  // An empty/stale GM selection must never create an Actor with no baseline Skills.
  return result.length ? result : uniqueSkills(skills);
}
function escapeHTML(value) {
  return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
/** Open the V14 native DialogV2 to choose baseline Skill Items. */
export async function configureStartingSkills() {
  if(!globalThis.game?.user?.isGM){globalThis.ui?.notifications?.warn?.('GM only');return false;}
  const isTh=game.settings.get('brp-uge','uiLanguage')!=='en';
  const sources=game.settings.get('brp-uge','startingSkillsSource');
  const skills=uniqueSkills(await getLibraryDocuments({types:['skill'],includeWorld:true,includePacks:sources!=='world'}));
  if(!skills.length){ui.notifications.warn(isTh?'ไม่พบ Skill Items ใน World หรือ Compendium':'No Skill Items in World or enabled Compendiums');return false;}
  const saved=decodeStartingSkillKeys(game.settings.get('brp-uge','startingSkillsKeys'));
  const mode=game.settings.get('brp-uge','startingSkillsMode');
  const ordered=[...skills].sort((a,b)=>String(a.system?.nameEn||a.name).localeCompare(String(b.system?.nameEn||b.name)));
  const items=ordered.map(item=>{
    const key=canonicalSkillKey(item);
    const label=isTh ? (item.system?.nameTh||item.name) : (item.system?.nameEn||item.name);
    const reference=isTh ? (item.system?.nameEn||item.name) : (item.system?.nameTh||'');
    return `<label class="brp-starting-skill"><input type="checkbox" name="startingSkill" value="${escapeHTML(key)}" ${(mode==='selected'?saved.has(key):true)?'checked':''}> <span><strong>${escapeHTML(label)}</strong>${reference && reference!==label?` <small>${escapeHTML(reference)}</small>`:''}</span></label>`;
  }).join('');
  const html=`<div class="brp-starting-skill-editor"><p>${isTh?'เลือกทักษะที่ต้องเพิ่มอัตโนมัติให้ตัวละครใหม่ โดยใช้ข้อมูลจาก World/Compendium ที่ติดตั้งเท่านั้น':'Choose which available external Skills are automatically copied into newly created Actors.'}</p><div class="brp-starting-skill-list">${items}</div><small>${isTh?'การตั้งค่านี้ไม่ลบหรือเปลี่ยนทักษะของตัวละครที่มีอยู่':'This does not delete or change existing Actors.'}</small></div>`;
  const dialog=globalThis.foundry?.applications?.api?.DialogV2;
  if(!dialog?.wait){ui.notifications.error('Foundry DialogV2 unavailable');return false;}
  const selection=await dialog.wait({window:{title:isTh?'กำหนดทักษะตั้งต้นของชีท':'Configure Starting Skills'},content:html,rejectClose:false,
    buttons:[{action:'save',label:isTh?'บันทึก':'Save',icon:'fa-solid fa-floppy-disk',default:true,
      callback:(_event,button)=>[...button.form.querySelectorAll('input[name="startingSkill"]:checked')].map(el=>el.value)},
      {action:'cancel',label:isTh?'ยกเลิก':'Cancel'}]});
  if(!Array.isArray(selection))return false;
  if(!selection.length){ui.notifications.warn(isTh?'กรุณาเลือกอย่างน้อย 1 ทักษะ':'Choose at least one starting skill');return false;}
  await game.settings.set('brp-uge','startingSkillsKeys',JSON.stringify(selection));
  await game.settings.set('brp-uge','startingSkillsMode','selected');
  ui.notifications.info(isTh?`กำหนดทักษะตั้งต้น ${selection.length} รายการแล้ว`:`Configured ${selection.length} starting skills`);
  return true;
}