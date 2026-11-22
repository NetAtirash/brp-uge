/**
 * Source-aware GM Specialty Manager for Foundry v14.
 * Source Skill Items remain immutable. Every row (including composite source
 * headings) is editable via World-only overlays; incomplete examples stay
 * hidden from players until the GM curates a concrete Specialty.
 */
import {getLibraryDocuments} from '../library-provider.mjs';
import {buildSpecialtyRegistry,readSpecialtyRegistry,specialtyNeedsReview} from '../specialty-registry.mjs';
import {specialtyFamilyKey} from '../skill-specialties.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const App=globalThis.foundry?.applications?.api?.ApplicationV2;
const safe=v=>String(v??'').trim();
export class SpecialtyPresetsMenu extends App {
  static DEFAULT_OPTIONS={
    id:'brp-uge-specialty-presets',
    classes:['brp-uge','brp-specialty-presets-app'],
    window:{title:'BRP UGE · Specialty Management',resizable:true},
    position:{width:1020,height:750}
  };
  #documents=[];
  #registry=[];
  #overlay=null;
  #snapshot='';
  #family='';
  #query='';
  #saving=false;

  #isTh(){return game.settings.get('brp-uge','uiLanguage')!=='en';}
  #tr(th,en){return this.#isTh()?th:en;}
  async #load(){
    if(this.#overlay!==null)return;
    this.#documents=await getLibraryDocuments({types:['skill']});
    this.#snapshot=game.settings.get('brp-uge','specialtyRegistry');
    this.#overlay=readSpecialtyRegistry(this.#snapshot);
  }
  #refresh(){
    this.#registry=buildSpecialtyRegistry(this.#documents,this.#overlay,
      game.settings.get('brp-uge','specialtyPresets'));
    if(!this.#registry.some(f=>f.key===this.#family))this.#family=this.#registry[0]?.key||'';
  }
  #familyConfig(){
    this.#overlay.families[this.#family]??={
      additions:[],sourceOverrides:{},hidden:[],legacyMigrated:false
    };
    return this.#overlay.families[this.#family];
  }
  #templateOptions(group,selected){
    return '<option value="">'+this.#tr('เลือกแม่แบบจาก Compendium','Choose a source template')+'</option>'+
      group.templates.map(t=>
        '<option value="'+esc(t.uuid)+'" '+(t.uuid===selected?'selected':'')+'>'+
        esc(t.system?.nameEn||t.name)+' · '+esc(t.system?.baseFormula||String(t.system?.base??0)+'%')+
        '</option>').join('');
  }
  #row(group,entry,newRow=false){
    const source=Boolean(entry.sourceUuid);
    const state=entry.hidden?'hidden':entry.state||'enabled';
    const origin=source?this.#tr('รายการจาก Compendium / World','Installed source item'):
      entry.source==='legacy'?this.#tr('Preset เดิม','Previous World preset'):this.#tr('ตัวเลือก World','World option');
    const statusText=this.#tr('ยังไม่ให้ผู้เล่นเลือกจนกว่าจะจัดการชื่อและยืนยัน','Review this source heading before enabling it');
    return '<article class="brp-specialty-row" data-row data-source="'+esc(entry.source||'world')+
      '" data-source-uuid="'+esc(entry.sourceUuid||'')+'" data-original-en="'+esc(entry.originalEn||entry.en||'')+
      '" data-original-th="'+esc(entry.originalTh||entry.th||'')+'" data-is-new="'+(newRow?'true':'false')+'">'+
      '<div class="brp-specialty-row-head"><span class="brp-specialty-source-kind">'+esc(origin)+'</span>'+
      (entry.sourceAmbiguous||entry.review?'<span class="brp-specialty-review-note">'+this.#tr('ต้องตรวจสอบ','Needs review')+'</span>':'')+
      (source?'<button type="button" data-open-source="'+esc(entry.sourceUuid)+'">'+this.#tr('เปิด Item ต้นฉบับ','Open source Item')+'</button>':'')+
      (!source?'<button type="button" data-archive>'+this.#tr('ซ่อน','Archive')+'</button>':'')+'</div>'+
      '<div class="brp-specialty-row-fields">'+
      '<label>Specialty (English)<input type="text" data-en value="'+esc(entry.en||'')+'" maxlength="100" autocomplete="off"></label>'+
      '<label>Specialty (ไทย)<input type="text" data-th value="'+esc(entry.th||'')+'" maxlength="100" autocomplete="off"></label>'+
      '<label>'+this.#tr('สถานะ','Status')+
        '<select data-state>'+
          '<option value="enabled" '+(state==='enabled'?'selected':'')+'>'+this.#tr('ใช้งาน / ให้ผู้เล่นเลือก','Enabled / selectable')+'</option>'+
          '<option value="hidden" '+(state==='hidden'?'selected':'')+'>'+this.#tr('ซ่อนจากตัวเลือกผู้เล่น','Hidden from players')+'</option>'+
          '<option value="review" '+(state==='review'?'selected':'')+'>'+this.#tr('รอ GM ตรวจสอบ','Needs GM review')+'</option>'+
        '</select></label>'+
      '<label>'+this.#tr('แม่แบบค่ากฎ','Rule base template')+
        '<select data-template '+(source?'disabled':'')+'>'+
          this.#templateOptions(group,entry.templateUuid||'')+
        '</select></label>'+
      '</div>'+
      (entry.sourceAmbiguous?'<small class="brp-manager-note">'+statusText+'</small>':'')+
      (source?'<small class="brp-manager-uuid">'+esc(entry.sourceUuid)+'</small>':'')+
      '</article>';
  }
  async _renderHTML(){
    await this.#load();this.#refresh();
    const group=this.#registry.find(f=>f.key===this.#family);
    const sidebar=this.#registry.map(f=>
      '<button type="button" data-family="'+esc(f.key)+'" class="brp-family-item '+(f.key===this.#family?'selected':'')+'">'+
        '<span class="brp-family-title">'+esc(this.#isTh()?f.thFamily:f.enFamily)+'</span>'+
        '<span class="brp-family-count">'+f.activeCount+' / '+f.options.length+'</span></button>'
    ).join('');
    const current=group?(this.#isTh()?group.thFamily:group.enFamily):'';
    return '<main class="brp-specialty-manager-v3">'+
      '<header class="brp-manager-heading"><h2>'+this.#tr('จัดการทักษะและ Specialty','Manage Skill Specialties')+'</h2>'+
        '<p>'+this.#tr('เลือก Skill Family ทางซ้าย แล้วจัดการชื่อ Specialty ของแต่ละรายการได้ รวมถึงรายการต้นฉบับจาก Compendium โดยไม่แก้ข้อมูลกฎหลัก',
          'Select a family, then curate all Specialty names, including source items. Compendium rules are not modified.')+'</p></header>'+
      '<div class="brp-specialty-columns">'+
        '<aside class="brp-specialty-sidebar"><label class="brp-search-label">'+this.#tr('ค้นหา Skill Family','Search Skill Families')+
        '<input type="search" data-family-search value="'+esc(this.#query)+'" placeholder="'+this.#tr('ค้นหาทักษะ…','Search…')+'"></label>'+
        '<nav class="brp-specialty-family-list">'+sidebar+'</nav></aside>'+
        '<section class="brp-specialty-detail">'+
        (group?'<div class="brp-family-detail-heading"><h3>'+esc(current)+'</h3>'+
          '<span>'+group.activeCount+' '+this.#tr('ตัวเลือกที่เปิดให้ผู้เล่น','available choices')+'</span></div>'+
          (group.fingerprintConflict?'<p class="brp-manager-note">'+this.#tr(
            'แหล่งข้อมูล Family นี้มีสูตรหรือค่าเริ่มต้นต่างกัน กรุณาเลือกแม่แบบกฎให้ตรงกับ Specialty',
            'This family has differing base chances or formulas. Choose an appropriate template.')+'</p>':'')+
          '<div data-specialty-rows>'+group.options.map(e=>this.#row(group,e)).join('')+'</div>'+
          '<button type="button" data-add-specialty '+(group.templates.length?'':'disabled')+'>'+
            this.#tr('+ เพิ่ม Specialty ภายใต้ทักษะนี้','+ Add Specialty to this Skill')+'</button>'+
          '<p class="brp-manager-note">'+this.#tr(
            'รายการที่ซ่อนหรือรอตรวจสอบจะไม่ปรากฏในตัวเลือกผู้เล่น การแก้ไข World ไม่เปลี่ยนทักษะที่ตัวละครมีอยู่แล้ว',
            'Hidden or unreviewed entries are excluded from player choices. Existing Actor skills stay unchanged.')+'</p>'
          :'<p>'+this.#tr('ไม่พบ Skill Family ที่ใช้งานได้','No Skill Families found')+'</p>')+
        '</section></div>'+
      '<footer class="brp-manager-actions"><button type="button" data-cancel>'+this.#tr('ยกเลิก','Cancel')+'</button>'+
        '<button type="button" data-save '+(this.#saving?'disabled':'')+'>'+this.#tr('บันทึกการเปลี่ยนแปลง','Save changes')+'</button></footer>'+
    '</main>';
  }
  _replaceHTML(html,root){root.innerHTML=html;}

  #collect(){
    if(!this.#family)return;
    const group=this.#registry.find(f=>f.key===this.#family);
    if(!group)return;
    const cfg=this.#familyConfig();
    const additions=[],sourceOverrides={},seen=new Set();
    for(const node of this.element.querySelectorAll('[data-row]')){
      const en=safe(node.querySelector('[data-en]')?.value);
      const th=safe(node.querySelector('[data-th]')?.value);
      const state=node.querySelector('[data-state]')?.value||'enabled';
      const uuid=node.dataset.sourceUuid;
      const k=specialtyFamilyKey(en);
      if(!en||!k||/[()<>\r\n]/u.test(en)||/[()<>\r\n]/u.test(th))
        throw new Error(this.#tr('กรอกชื่อ Specialty ภาษาอังกฤษที่ถูกต้อง','A valid English Specialty name is required')+': '+en);
      if(state==='enabled'&&specialtyNeedsReview(en))
        throw new Error(this.#tr('ต้องระบุชื่อ Specialty เดี่ยวก่อนเปิดให้ผู้เล่นเลือก: ','Resolve composite Specialty before enabling: ')+en);
      if(state==='enabled'&&seen.has(k))
        throw new Error(this.#tr('Specialty เปิดใช้งานซ้ำ: ','Duplicate enabled Specialty: ')+en);
      if(state==='enabled')seen.add(k);
      if(uuid){
        const originalEn=node.dataset.originalEn;
        const originalTh=node.dataset.originalTh;
        const originalState=specialtyNeedsReview(originalEn)?'review':'enabled';
        if(en!==originalEn||th!==originalTh||state!==originalState)
          sourceOverrides[uuid]={en,th,state};
      }else{
        const templateUuid=node.querySelector('[data-template]')?.value||'';
        if(!templateUuid&&state==='enabled')
          throw new Error(this.#tr('เลือกแม่แบบค่ากฎสำหรับ ','Select rule template for ')+en);
        additions.push({key:k,en,th,templateUuid,state});
      }
    }
    cfg.additions=additions;
    cfg.sourceOverrides=sourceOverrides;
    cfg.hidden=[];
    cfg.legacyMigrated=true;
  }
  _onRender(context,options){
    super._onRender(context,options);
    const root=this.element;
    const filter=root.querySelector('[data-family-search]');
    const applyFilter=()=>{
      const q=this.#query.trim().toLocaleLowerCase();
      for(const el of root.querySelectorAll('[data-family]'))
        el.hidden=Boolean(q&&!el.textContent.toLocaleLowerCase().includes(q));
    };
    filter?.addEventListener('input',e=>{this.#query=e.target.value;if(!e.isComposing)applyFilter();});
    filter?.addEventListener('compositionend',e=>{this.#query=e.target.value;applyFilter();});
    applyFilter();
    root.querySelectorAll('[data-family]').forEach(button=>button.addEventListener('click',async()=>{
      try{this.#collect();this.#family=button.dataset.family;await this.render();}
      catch(error){ui.notifications.warn(error.message);}
    }));
    root.querySelector('[data-add-specialty]')?.addEventListener('click',()=>{
      const group=this.#registry.find(f=>f.key===this.#family);
      if(!group?.templates.length)return;
      const holder=root.ownerDocument.createElement('div');
      holder.innerHTML=this.#row(group,{en:'',th:'',state:'review',source:'world',
        templateUuid:group.templates.length===1?group.templateUuid:'',sourceUuid:''},true);
      root.querySelector('[data-specialty-rows]').append(holder.firstElementChild);
      holder.firstElementChild?.querySelector('[data-en]')?.focus();
    });
    root.querySelector('[data-specialty-rows]')?.addEventListener('click',async e=>{
      const archive=e.target.closest('[data-archive]');
      if(archive){
        const row=archive.closest('[data-row]');
        row.querySelector('[data-state]').value='hidden';
        return;
      }
      const open=e.target.closest('[data-open-source]');
      if(open){
        const item=await fromUuid(open.dataset.openSource).catch(()=>null);
        if(item?.sheet)item.sheet.render({force:true});
      }
    });
    // A source example like "Drawing / Painting" moves to enabled only after
    // it becomes a single specialty. GM retains explicit control of status.
    root.querySelector('[data-specialty-rows]')?.addEventListener('change',e=>{
      if(e.target.matches('[data-en]')){
        const row=e.target.closest('[data-row]'),state=row?.querySelector('[data-state]');
        if(state?.value==='review'&&!specialtyNeedsReview(e.target.value))state.value='enabled';
      }
    });
    root.querySelector('[data-cancel]')?.addEventListener('click',()=>this.close());
    root.querySelector('[data-save]')?.addEventListener('click',async()=>{
      if(!game.user?.isGM||this.#saving)return;
      try{
        this.#collect();
        if(game.settings.get('brp-uge','specialtyRegistry')!==this.#snapshot)
          throw new Error(this.#tr('มี GM อีกคนเปลี่ยน Registry แล้ว กรุณาเปิดใหม่','Registry changed elsewhere. Reopen to avoid overwriting.'));
        this.#saving=true;
        const data=readSpecialtyRegistry(this.#overlay);
        await game.settings.set('brp-uge','specialtyRegistry',JSON.stringify(data));
        ui.notifications.info(this.#tr('บันทึก Specialty Management แล้ว','Specialty Management saved'));
        await this.close();
      }catch(error){ui.notifications.error(error.message);}
      finally{this.#saving=false;}
    });
  }
}
