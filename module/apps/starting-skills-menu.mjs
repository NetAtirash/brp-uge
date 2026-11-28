/** Native Foundry V14 settings submenu; no hard-coded Compendium data. */
import { getLibraryDocuments } from '../library-provider.mjs';
import { canonicalSkillKey, uniqueSkills } from '../skill-foundation.mjs';
import { decodeStartingSkillKeys } from '../skill-selection.mjs';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const APP=globalThis.foundry?.applications?.api?.ApplicationV2;

export class StartingSkillsMenu extends APP {
  static DEFAULT_OPTIONS={
    id:'brp-uge-starting-skills-manager',
    window:{title:'BRP UGE · Starting Skills',resizable:true},
    position:{width:760,height:630},
    classes:['brp-uge','brp-starting-skills-app']
  };

  get title(){return game.settings.get('brp-uge','uiLanguage')==='en'?'BRP UGE · Starting Skills':'BRP UGE · จัดการทักษะตั้งต้น';}
  async _renderHTML() {
    const isTh=game.settings.get('brp-uge','uiLanguage')!=='en';
    const source=game.settings.get('brp-uge','startingSkillsSource');
    const skills=uniqueSkills(await getLibraryDocuments({types:['skill'],includeWorld:true,includePacks:source!=='world'}));
    const mode=game.settings.get('brp-uge','startingSkillsMode');
    const saved=decodeStartingSkillKeys(game.settings.get('brp-uge','startingSkillsKeys'));
    const items=skills.map(item=>{
      const key=canonicalSkillKey(item);
      const en=item.system?.nameEn||item.name;
      const th=item.system?.nameTh||en;
      const label=isTh?th:en;
      const alt=isTh?en:th;
      return `<label class="brp-starting-skill brp-manager-skill" data-search="${esc(en+" "+th)}"><input name="startingSkill" type="checkbox" value="${esc(key)}" ${mode==='selected'?(saved.has(key)?'checked':''):'checked'}><span><strong title="${esc(alt)}">${esc(label)}</strong></span></label>`;
    }).join('');
    const lang=(th,en)=>isTh?th:en;
    return `<div class="brp-manager-content">
      <p>${lang('กำหนดทักษะตั้งต้นสำหรับตัวละครใหม่ (ไม่แก้ไขทักษะของตัวละครเดิม)','Configure starting skills for new actors (existing actors are unchanged).')}</p>
      <p class="brp-manager-note">${lang('รายการมาจากโลกเกมหรือคลังข้อมูลที่ติดตั้งเท่านั้น','Skills come only from installed World or Compendium items.')}</p>
      <div class="brp-manager-controls"><label>${lang('ค้นหาทักษะ','Search skills')} <input type="search" data-filter placeholder="${lang('ชื่อไทยหรืออังกฤษ','Thai or English name')}"></label>
        <button type="button" data-choose="all">${lang('เลือกทั้งหมด','Select all')}</button>
        <button type="button" data-choose="none">${lang('ยกเลิกทั้งหมด','Clear all')}</button></div>
      <div class="brp-starting-skill-list" role="group" aria-label="${lang('รายการทักษะ','Available skills')}">${items||`<p>${lang('ยังไม่มีไอเทมทักษะที่เปิดใช้งาน','No accessible Skill Items found')}</p>`}</div>
      <p class="brp-manager-count" aria-live="polite"></p>
      <footer class="brp-manager-actions"><button type="button" data-save ${skills.length?'':'disabled'}>${lang('บันทึกสำหรับโหมด GM เลือกเอง','Save GM selection')}</button>
      <button type="button" data-cancel>${lang('ยกเลิก','Cancel')}</button></footer>
    </div>`;
  }

  _replaceHTML(result,content){content.innerHTML=result;}

  _onRender(context,options){
    super._onRender(context,options);
    const root=this.element;
    const count=root.querySelector('.brp-manager-count');
    const checkboxes=[...root.querySelectorAll('input[name="startingSkill"]')];
    const update=()=>{
      const n=checkboxes.filter(x=>x.checked).length;
      count.textContent=`${n} / ${checkboxes.length}`;
    };
    checkboxes.forEach(el=>el.addEventListener('change',update));update();
    root.querySelector('[data-filter]')?.addEventListener('input',event=>{
      const query=event.target.value.trim().toLocaleLowerCase();
      for(const row of root.querySelectorAll('.brp-manager-skill')){
        row.hidden=!!query && !String(row.dataset.search||row.textContent).toLocaleLowerCase().includes(query);
      }
    });
    root.querySelectorAll('[data-choose]').forEach(button=>button.addEventListener('click',()=>{
      const choice=button.dataset.choose==='all';
      for(const el of checkboxes)el.checked=choice;
      update();
    }));
    root.querySelector('[data-cancel]')?.addEventListener('click',()=>this.close());
    root.querySelector('[data-save]')?.addEventListener('click',async()=>{
      const chosen=checkboxes.filter(el=>el.checked).map(el=>el.value);
      const isTh=game.settings.get('brp-uge','uiLanguage')!=='en';
      if(!chosen.length){ui.notifications.warn(isTh?'กรุณาเลือกทักษะอย่างน้อยหนึ่งรายการ':'Select at least one Skill');return;}
      await game.settings.set('brp-uge','startingSkillsKeys',JSON.stringify(chosen));
      await game.settings.set('brp-uge','startingSkillsMode','selected');
      ui.notifications.info(isTh?`เลือกทักษะตั้งต้น ${chosen.length} รายการแล้ว`:`Saved ${chosen.length} starting skills`);
      await this.close();
    });
  }
}