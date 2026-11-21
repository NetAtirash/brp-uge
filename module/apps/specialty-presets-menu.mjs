/** GM-owned Specialty preset list, keyed by families discovered from installed Skills. */
import { getLibraryDocuments } from '../library-provider.mjs';
import { availableSpecialtyFamilies, readSpecialtyPresets } from '../skill-specialties.mjs';

const escape=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const BaseApp=globalThis.foundry?.applications?.api?.ApplicationV2;
export class SpecialtyPresetsMenu extends BaseApp {
  static DEFAULT_OPTIONS={
    id:'brp-uge-specialty-presets',
    window:{title:'BRP UGE · Specialty Presets',resizable:true},
    position:{width:740,height:580},
    classes:['brp-uge','brp-specialty-presets-app']
  };
  #families=[];
  #presets={};
  #family='';

  async _renderHTML(){
    const isTh=game.settings.get('brp-uge','uiLanguage')!=='en';
    this.#families=availableSpecialtyFamilies(await getLibraryDocuments({types:['skill']}));
    this.#presets=readSpecialtyPresets(game.settings.get('brp-uge','specialtyPresets'));
    if(!this.#families.some(x=>x.key===this.#family))this.#family=this.#families[0]?.key||'';
    const words=(th,en)=>isTh?th:en;
    const choices=this.#families.map(f=>`<option value="${escape(f.key)}" ${f.key===this.#family?'selected':''}>${escape(isTh?f.thFamily:f.enFamily)} (${escape(f.enFamily)})</option>`).join('');
    return `<div class="brp-manager-content brp-specialty-manager">
      <p>${words('ตั้งค่าตัวเลือกความเชี่ยวชาญเสริมสำหรับผู้เล่น โดยใช้เฉพาะตระกูลทักษะที่พบใน World/Compendium','Set player-facing specialty choices for families derived from installed World/Compendium Skills.')}</p>
      <p class="brp-manager-note">${words('ยังอนุญาตให้ผู้เล่นกรอกความเชี่ยวชาญของตนเองได้เสมอ','Players may always enter a custom specialty.')}</p>
      <label>${words('กลุ่มทักษะ','Skill family')} <select data-family>${choices}</select></label>
      <div class="brp-specialty-preset-list" data-preset-list></div>
      <div class="brp-manager-controls"><button type="button" data-add>${words('+ เพิ่มตัวเลือก','+ Add preset')}</button></div>
      <footer class="brp-manager-actions">
        <button type="button" data-save ${this.#families.length?'':'disabled'}>${words('บันทึก','Save')}</button>
        <button type="button" data-cancel>${words('ยกเลิก','Cancel')}</button>
      </footer>
      ${!this.#families.length?`<p>${words('ยังไม่มี Skill ที่มีวงเล็บระบุ Specialty ในคลัง','No specialized Skill examples were found in installed sources.')}</p>`:''}
    </div>`;
  }
  _replaceHTML(html,element){element.innerHTML=html;}
  _onRender(context,options){
    super._onRender(context,options);
    const root=this.element;
    const isTh=game.settings.get('brp-uge','uiLanguage')!=='en';
    const list=root.querySelector('[data-preset-list]');
    const enPlaceholder=isTh?'ชื่ออังกฤษ เช่น Astronomy':'English name e.g. Astronomy';
    const thPlaceholder=isTh?'ชื่อไทย เช่น ดาราศาสตร์':'Thai name e.g. ดาราศาสตร์';
    const draw=()=>{
      if(!list)return;
      list.replaceChildren();
      for(const entry of this.#presets[this.#family]??[]){
        const row=root.ownerDocument.createElement('div');row.className='brp-specialty-preset-row';
        const en=root.ownerDocument.createElement('input');en.type='text';en.dataset.en='';en.value=entry.en;en.placeholder=enPlaceholder;
        const th=root.ownerDocument.createElement('input');th.type='text';th.dataset.th='';th.value=entry.th;th.placeholder=thPlaceholder;
        const remove=root.ownerDocument.createElement('button');remove.type='button';remove.textContent='×';remove.title=isTh?'ลบรายการ':'Remove';
        remove.addEventListener('click',()=>{row.remove();store();});
        row.append(en,th,remove);list.append(row);
      }
    };
    const store=()=>{
      if(!this.#family||!list)return;
      this.#presets[this.#family]=[...list.querySelectorAll('.brp-specialty-preset-row')].map(row=>({
        en:row.querySelector('[data-en]')?.value.trim()||'',th:row.querySelector('[data-th]')?.value.trim()||''
      }));
    };
    draw();
    root.querySelector('[data-family]')?.addEventListener('change',event=>{
      store();this.#family=event.target.value;draw();
    });
    root.querySelector('[data-add]')?.addEventListener('click',()=>{
      store();(this.#presets[this.#family]??=[]).push({en:'',th:''});draw();list.querySelector('.brp-specialty-preset-row:last-child [data-en]')?.focus();
    });
    root.querySelector('[data-save]')?.addEventListener('click',async()=>{
      if(!game.user?.isGM)return;
      store();
      const normalized=readSpecialtyPresets(this.#presets);
      const entries=Object.values(normalized).flat();
      if(entries.some(x=>!x.en)){
        ui.notifications.warn(isTh?'กรอกชื่อภาษาอังกฤษให้ครบ':'Enter an English name for every specialty');return;
      }
      await game.settings.set('brp-uge','specialtyPresets',JSON.stringify(normalized));
      ui.notifications.info(isTh?'บันทึกตัวเลือกความเชี่ยวชาญแล้ว':'Specialty presets saved');
      await this.close();
    });
    root.querySelector('[data-cancel]')?.addEventListener('click',()=>this.close());
  }
}