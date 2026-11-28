/**
 * Source-aware GM Specialty Manager for Foundry v14.
 * Source Skill Items remain immutable. Every row (including composite source
 * headings) is editable via World-only overlays; incomplete examples stay
 * hidden from players until the GM curates a concrete Specialty.
 */
import {getLibraryDocuments} from '../library-provider.mjs';
import {buildSpecialtyRegistry,readSpecialtyRegistry,specialtyLabelIssue,specialtyEditorState,specialtyDraftState} from '../specialty-registry.mjs';
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
  #packErrors=[];
  #registry=[];
  #overlay=null;
  #snapshot='';
  #family='';
  #query='';
  #saving=false;

  get title(){return game.settings.get('brp-uge','uiLanguage')==='en'?'BRP UGE · Specialty Management':'BRP UGE · จัดการความเชี่ยวชาญ';}
  _onClose(options){
    const result=super._onClose(options);
    this.#overlay=null;this.#snapshot='';this.#family='';this.#query='';this.#registry=[];
    return result;
  }
  #isTh(){return game.settings.get('brp-uge','uiLanguage')!=='en';}
  #tr(th,en){return this.#isTh()?th:en;}
  async #load(){
    if(this.#overlay!==null)return;
    this.#packErrors=[];
    this.#documents=await getLibraryDocuments({types:['skill'],onPackError:(pack,error)=>this.#packErrors.push({pack:pack.collection,message:String(error?.message||error)})});
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
      additions:[],bookOverrides:{},sourceOverrides:{},hidden:[],legacyMigrated:false
    };
    return this.#overlay.families[this.#family];
  }
  #templateOptions(group,selected){
    return '<option value="">'+this.#tr('เลือกแม่แบบจากคลังข้อมูล','Choose a source template')+'</option>'+
      group.templates.map(t=>
        '<option value="'+esc(t.uuid)+'" '+(t.uuid===selected?'selected':'')+'>'+
        esc(this.#isTh()?(t.system?.nameTh||t.system?.nameEn||t.name):(t.system?.nameEn||t.name))+' · '+esc(t.system?.baseFormula||String(t.system?.base??0)+'%')+
        '</option>').join('');
  }
  #row(group,entry,newRow=false){
    const source=Boolean(entry.sourceUuid);
    const book=entry.source==='book';
    const state=specialtyEditorState(entry);
    const origin=book?this.#tr('ความเชี่ยวชาญตั้งต้นจากหนังสือ','Verified book default'):
      entry.source==='legacy-source'?this.#tr('รายการคลังข้อมูลเดิม — รอย้ายเป็นแม่แบบ','Legacy source (migration needed)'):
      entry.source==='legacy-preset'?this.#tr('ตัวเลือกเดิมรอ GM อนุมัติ','Legacy preset pending review'):
      this.#tr('ความเชี่ยวชาญที่ GM เพิ่ม','GM-added Specialty');
    const statusText=this.#tr('ยังไม่ให้ผู้เล่นเลือกจนกว่าจะจัดการชื่อและยืนยัน','Review this source heading before enabling it');
    return '<article class="brp-specialty-row" data-row data-source="'+esc(entry.source||'world')+
      '" data-source-uuid="'+esc(entry.sourceUuid||'')+'" data-book-key="'+esc(entry.bookKey||'')+
      '" data-original-en="'+esc(entry.originalEn||entry.en||'')+
      '" data-original-th="'+esc(entry.originalTh||entry.th||'')+'" data-is-new="'+(newRow?'true':'false')+'">'+
      '<div class="brp-specialty-row-head"><span class="brp-specialty-source-kind">'+esc(origin)+'</span>'+
      (entry.review?'<span class="brp-specialty-review-note">'+this.#tr('ต้องตรวจสอบ','Needs review')+'</span>':
        entry.sourceAmbiguous?'<span class="brp-specialty-review-note">'+this.#tr('GM กำหนดแล้ว','GM curated')+'</span>':'')+
      (source?'<button type="button" data-open-source="'+esc(entry.sourceUuid)+'">'+this.#tr('เปิดไอเทมต้นฉบับ','Open source Item')+'</button>':'')+
      (!source?'<button type="button" data-archive>'+this.#tr('ซ่อน','Archive')+'</button>':'')+
      (newRow?'<button type="button" data-remove-draft>'+this.#tr('ยกเลิกรายการใหม่','Remove draft')+'</button>':'')+'</div>'+
      '<div class="brp-specialty-row-fields">'+
      '<label>'+this.#tr('ความเชี่ยวชาญ (อังกฤษ)','Specialty (English)')+'<input type="text" data-en value="'+esc(entry.en||'')+'" maxlength="100" autocomplete="off"></label>'+
      '<label>'+this.#tr('ความเชี่ยวชาญ (ไทย)','Specialty (Thai)')+'<input type="text" data-th value="'+esc(entry.th||'')+'" maxlength="100" autocomplete="off"></label>'+
      '<label>'+this.#tr('สถานะ','Status')+
        '<select data-state data-rendered-state="'+esc(state)+'">'+
          '<option value="enabled" '+(state==='enabled'?'selected':'')+'>'+this.#tr('ใช้งาน / ให้ผู้เล่นเลือก','Enabled / selectable')+'</option>'+
          '<option value="hidden" '+(state==='hidden'?'selected':'')+'>'+this.#tr('ซ่อนจากตัวเลือกผู้เล่น','Hidden from players')+'</option>'+
          '<option value="review" '+(state==='review'?'selected':'')+'>'+this.#tr('รอ GM ตรวจสอบ','Needs GM review')+'</option>'+
        '</select></label>'+
      '<label>'+this.#tr('แม่แบบค่ากฎ','Rule base template')+
        '<select data-template '+(source?'disabled':'')+'>'+
          this.#templateOptions(group,entry.templateUuid||'')+
        '</select></label>'+
      (!source?'<div class="brp-specialty-rule-overrides">'+
        '<label>'+this.#tr('ฐาน % (เว้นว่างเพื่อใช้ค่าแม่แบบ)','Base % (blank = template)')+
        '<input data-base type="number" min="0" step="1" value="'+esc(entry.base??'')+'"></label>'+
        '<label>'+this.#tr('สูตรฐาน (ถ้ามี)','Base formula (optional)')+
        '<input data-base-formula type="text" value="'+esc(entry.baseFormula||'')+'" maxlength="100"></label>'+
        '</div>':'')+
      '</div>'+
      (entry.review?'<small class="brp-manager-note">'+statusText+'</small>':'')+
      (book?'<small class="brp-manager-note">'+this.#tr('ค่ากฎตั้งต้น: ','Book rule base: ')+
       esc(entry.baseFormula||String(entry.base??group.canonicalTemplate?.system?.base??0)+'%')+'</small>':'')+
      (source?'<small class="brp-manager-uuid">'+esc(entry.sourceUuid)+'</small>':'')+
      '</article>';
  }
  #sourceDiagnostics(group){
    const d=group.diagnostics;if(!d)return '';
    const labels={
      'conflicting-templates':this.#tr('พบแม่แบบต้นทางหลายรายการ','Conflicting canonical templates'),
      'missing-template':this.#tr('ไม่พบแม่แบบต้นทาง','Missing canonical template'),
      'missing-default-field':this.#tr('ไม่พบฟิลด์ข้อมูลตั้งต้น','Missing defaults field'),
      'empty-defaults':this.#tr('ไม่มีตัวเลือกตั้งต้นจากคลังข้อมูล','No default choices supplied by content'),
      'rejected-defaults':this.#tr('ตัวเลือกตั้งต้นบางรายการไม่ผ่านการตรวจสอบ','Some source defaults rejected')};
    if(d.status==='loaded'&&!d.ignoredCopies.length&&!d.reviewCount)return '';
    return '<details class="brp-manager-note" '+(d.status!=='loaded'?'open':'')+'><summary>'+esc(labels[d.status]||this.#tr('แหล่งข้อมูล','Source information'))+'</summary><p>'+esc(this.#tr('ข้อมูลตั้งต้นที่อ่านได้','Accepted source defaults'))+': ' +d.acceptedCount+'/'+d.rawCount+'</p><p>'+esc(this.#tr('ซ่อน / รอตรวจสอบ','Hidden / pending review'))+': '+d.hiddenCount+' / '+d.reviewCount+'</p>'+d.sourceUuids.map(u=>'<p>'+esc(u)+'</p>').join('')+d.rejected.map(r=>'<p>'+esc(r.en||r.key)+': '+esc(({"missing-key-or-name":this.#tr('ไม่มีชื่อหรือรหัส','Missing name or key'),"invalid-name":this.#tr('ชื่อไม่ถูกต้อง','Invalid name'),"duplicate-key":this.#tr('รหัสซ้ำ','Duplicate key')})[r.reason]||r.reason)+'</p>').join('')+(d.ignoredCopies.length?'<p>'+esc(this.#tr('ไม่นับสำเนา World ที่มีต้นทางเดียวกัน','Ignored World copies with matching source'))+': '+d.ignoredCopies.length+'</p>':'')+'</details>';
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
      '<header class="brp-manager-heading"><h2>'+this.#tr('จัดการทักษะและความเชี่ยวชาญ','Manage Skill Specialties')+'</h2>'+
        '<p>'+this.#tr('เลือกกลุ่มทักษะทางซ้ายเพื่อจัดการความเชี่ยวชาญ โดยไม่แก้ข้อมูลต้นฉบับ',
          'Select a family, then curate all Specialty names, including source items. Compendium rules are not modified.')+'</p></header>'+
      (this.#packErrors.length?'<div role="alert" class="brp-manager-note brp-manager-warning">'+this.#tr('อ่านคลังข้อมูลบางชุดไม่สำเร็จ','Some content packs could not be read')+this.#packErrors.map(e=>'<p>'+esc(e.pack)+': '+esc(e.message)+'</p>').join('')+'</div>':'')+
      '<div class="brp-specialty-columns">'+
        '<aside class="brp-specialty-sidebar"><label class="brp-search-label">'+this.#tr('ค้นหากลุ่มทักษะ','Search Skill Families')+
        '<input type="search" data-family-search value="'+esc(this.#query)+'" placeholder="'+this.#tr('ค้นหาทักษะ…','Search…')+'"></label>'+
        '<nav class="brp-specialty-family-list">'+sidebar+'</nav></aside>'+
        '<section class="brp-specialty-detail">'+
        (group?'<div class="brp-family-detail-heading"><h3>'+esc(current)+'</h3>'+
          '<span>'+group.activeCount+' '+this.#tr('ตัวเลือกที่เปิดให้ผู้เล่น','available choices')+'</span></div>'+
          (group.requiresContentMigration?'<p class="brp-manager-note brp-manager-warning">'+this.#tr(
            'คลังข้อมูลยังใช้ไอเทมแยกตามความเชี่ยวชาญ ต้องมีแม่แบบหนึ่งรายการต่อกลุ่มทักษะ',
            'Legacy Compendium stores several subtype Items. Migrate to one Skill Family Template to supply verified defaults.')+'</p>':'')+
          (group.fingerprintConflict?'<p class="brp-manager-note">'+this.#tr(
            'พบแม่แบบต้นทางหลายรายการ ไม่สามารถเลือกแม่แบบที่ถูกต้องโดยอัตโนมัติ',
            'This family has differing base chances or formulas. Choose an appropriate template.')+'</p>':'')+
          this.#sourceDiagnostics(group)+
          '<div data-specialty-rows>'+group.options.map(e=>this.#row(group,e)).join('')+'</div>'+
          '<button type="button" data-add-specialty '+(group.canonicalTemplate?'':'disabled')+'>'+
            this.#tr('+ เพิ่มความเชี่ยวชาญ','+ Add Specialty to this Skill')+'</button>'+
          '<p class="brp-manager-note">'+this.#tr(
            'รายการที่ซ่อนหรือรอตรวจสอบจะไม่แสดงแก่ผู้เล่น ทักษะของตัวละครเดิมจะไม่เปลี่ยนแปลง',
            'Hidden or unreviewed entries are excluded from player choices. Existing Actor skills stay unchanged.')+'</p>'
          :'<p>'+this.#tr('ไม่พบกลุ่มทักษะที่ใช้งานได้','No Skill Families found')+'</p>')+
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
    const additions=[],sourceOverrides={...cfg.sourceOverrides},bookOverrides={},seen=new Set();
    for(const node of this.element.querySelectorAll('[data-row]')){
      const en=safe(node.querySelector('[data-en]')?.value);
      const th=safe(node.querySelector('[data-th]')?.value);
      const control=node.querySelector('[data-state]');
      const state=specialtyDraftState(control?.dataset.renderedState||'review',control?.value,control?.dataset.changed==='true');
      const uuid=node.dataset.sourceUuid;
      const bookKey=node.dataset.bookKey;
      const k=specialtyFamilyKey(en);
      // Untouched published rows may contain a disabled descriptive heading.
      // Do not validate them as newly authored/selectable specialties.
      const existing=bookKey?group.options.find(o=>o.source==='book'&&o.bookKey===bookKey):null;
      if(existing&&en===existing.en&&th===existing.th&&state===specialtyEditorState(existing)){
        if((cfg.hidden||[]).includes(k)&&state==='hidden')bookOverrides[bookKey]={en,th,state};
        else if(cfg.bookOverrides?.[bookKey])bookOverrides[bookKey]=cfg.bookOverrides[bookKey];
        if(state==='enabled'){
          if(seen.has(k))throw new Error(this.#tr('ความเชี่ยวชาญเปิดใช้งานซ้ำ: ','Duplicate enabled Specialty: ')+en);
          seen.add(k);
        }
        continue;
      }
      if(!en||!k)throw new Error(this.#tr('กรอกชื่อความเชี่ยวชาญภาษาอังกฤษ','Enter an English specialty name'));
      const issue=state==='enabled'?specialtyLabelIssue(en,th):null;
      if(issue)throw new Error(this.#labelError(issue,en,th));
      if(state==='enabled'&&seen.has(k))
        throw new Error(this.#tr('ความเชี่ยวชาญเปิดใช้งานซ้ำ: ','Duplicate enabled Specialty: ')+en);
      if(state==='enabled')seen.add(k);
      if(bookKey){
        const originalEn=node.dataset.originalEn,originalTh=node.dataset.originalTh;
        
        const seed=group.canonicalTemplate?.system?.specialtyDefaults?.find(o=>specialtyFamilyKey(o.key||o.en)===bookKey);
        const initial=seed?.enabled===false?'hidden':'enabled';
        if(en!==originalEn||th!==originalTh||state!==initial)
          bookOverrides[bookKey]={en,th,state};
      }else if(uuid){
        const originalEn=node.dataset.originalEn,originalTh=node.dataset.originalTh;
        const initial='review';
        if(en!==originalEn||th!==originalTh||state!==initial)
          sourceOverrides[uuid]={en,th,state};
        else delete sourceOverrides[uuid];
      }else{
        const templateUuid=node.querySelector('[data-template]')?.value||'';
        if(!templateUuid&&state==='enabled')
          throw new Error(this.#tr('เลือกแม่แบบค่ากฎสำหรับ ','Select rule template for ')+en);
        const baseInput=safe(node.querySelector('[data-base]')?.value);
        const base=baseInput===''?null:Number(baseInput);
        if(base!==null&&(!Number.isSafeInteger(base)||base<0))
          throw new Error(this.#tr('ค่าฐานต้องเป็นจำนวนเต็มไม่ติดลบ','Base chance must be a nonnegative integer'));
        const baseFormula=safe(node.querySelector('[data-base-formula]')?.value);
        additions.push({key:k,en,th,templateUuid,state,base,baseFormula});
      }
    }
    cfg.additions=additions;
    cfg.bookOverrides=bookOverrides;
    cfg.sourceOverrides=sourceOverrides;
    cfg.hidden=[];
    cfg.legacyMigrated=true;
  }
  #labelError(issue,en,th){
    return issue==='thai'?this.#tr('ระบุชื่อความเชี่ยวชาญภาษาไทยแบบเฉพาะเจาะจงก่อนเปิดใช้','Enter a concrete Thai specialty name before enabling')+': '+th:
      issue==='composite'?this.#tr('ระบุชื่อความเชี่ยวชาญเดี่ยวก่อนเปิดให้เลือก','Resolve composite specialty before enabling')+': '+en:
      this.#tr('กรอกชื่อความเชี่ยวชาญภาษาอังกฤษที่ถูกต้อง','A valid English specialty name is required')+': '+en;
  }
  _onRender(context,options){
    super._onRender(context,options);
    const root=this.element;
    for(const el of root.querySelectorAll('[data-state]'))el.value=el.dataset.renderedState;
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
      if(!group?.canonicalTemplate)return;
      const holder=root.ownerDocument.createElement('div');
      holder.innerHTML=this.#row(group,{en:'',th:'',state:'review',source:'world',
        templateUuid:group.canonicalTemplate.uuid,sourceUuid:''},true);
      root.querySelector('[data-specialty-rows]').append(holder.firstElementChild);
      const state=holder.firstElementChild?.querySelector('[data-state]');if(state)state.value=state.dataset.renderedState;
      holder.firstElementChild?.querySelector('[data-en]')?.focus();
    });
    root.querySelector('[data-specialty-rows]')?.addEventListener('click',async e=>{
      if(e.target.closest('[data-remove-draft]')){
        e.target.closest('[data-row]')?.remove();return;
      }
      const archive=e.target.closest('[data-archive]');
      if(archive){
        const row=archive.closest('[data-row]');
        const state=row.querySelector('[data-state]');state.value='hidden';state.dataset.changed='true';
        return;
      }
      const open=e.target.closest('[data-open-source]');
      if(open){
        const item=await fromUuid(open.dataset.openSource).catch(()=>null);
        if(item?.sheet)item.sheet.render({force:true});
      }
    });
    // Changing a name never auto-enables a pending/disabled source heading.
    root.querySelector('[data-specialty-rows]')?.addEventListener('change',e=>{
      const row=e.target.closest('[data-row]'),state=row?.querySelector('[data-state]');
      if(!state)return;
      const en=safe(row.querySelector('[data-en]')?.value),th=safe(row.querySelector('[data-th]')?.value);
      const issue=specialtyLabelIssue(en,th);
      if(e.target===state){
        state.dataset.changed='true';
        if(state.value==='enabled'&&issue){
          state.value='review';
          ui.notifications.warn(this.#labelError(issue,en,th));
        }
      }else if(e.target.matches('[data-en],[data-th]')&&state.value==='enabled'&&issue){
        state.value='review';state.dataset.changed='true';
      }
    });
    root.querySelector('[data-cancel]')?.addEventListener('click',()=>this.close());
    root.querySelector('[data-save]')?.addEventListener('click',async()=>{
      if(!game.user?.isGM||this.#saving)return;
      try{
        this.#collect();
        if(game.settings.get('brp-uge','specialtyRegistry')!==this.#snapshot)
          throw new Error(this.#tr('มี GM อีกคนเปลี่ยนรายการความเชี่ยวชาญแล้ว กรุณาเปิดใหม่','Registry changed elsewhere. Reopen to avoid overwriting.'));
        this.#saving=true;
        const data=readSpecialtyRegistry(this.#overlay);
        await game.settings.set('brp-uge','specialtyRegistry',JSON.stringify(data));
        ui.notifications.info(this.#tr('บันทึกการจัดการความเชี่ยวชาญแล้ว','Specialty Management saved'));
        await this.close();
      }catch(error){ui.notifications.error(error.message);}
      finally{this.#saving=false;}
    });
  }
}
