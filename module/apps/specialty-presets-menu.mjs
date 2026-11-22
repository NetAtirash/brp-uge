/**
 * GM Specialty Management. Source Skills are read only; hidden/renamed options
 * live in World settings. All changes remain a draft until Save.
 */
import { getLibraryDocuments } from '../library-provider.mjs';
import { buildSpecialtyRegistry, readSpecialtyRegistry } from '../specialty-registry.mjs';
import { readSpecialtyPresets, specialtyFamilyKey } from '../skill-specialties.mjs';

const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const BaseApp=globalThis.foundry?.applications?.api?.ApplicationV2;

export class SpecialtyPresetsMenu extends BaseApp {
  static DEFAULT_OPTIONS={
    id:'brp-uge-specialty-presets',
    window:{title:'BRP UGE · Specialty Management',resizable:true},
    position:{width:930,height:680},
    classes:['brp-uge','brp-specialty-presets-app']
  };
  #documents=[];
  #registry=[];
  #overlay=null;
  #family='';
  #query='';
  #loading=false;
  #busy=false;
  #snapshot='';

  #isTh(){return game.settings.get('brp-uge','uiLanguage')!=='en';}
  #tr(th,en){return this.#isTh()?th:en;}
  async #ensureLoaded(){
    if(this.#overlay!==null)return;
    this.#documents=await getLibraryDocuments({types:['skill']});
    this.#snapshot=game.settings.get('brp-uge','specialtyRegistry');
    this.#overlay=readSpecialtyRegistry(this.#snapshot);
  }
  #refreshRegistry(){
    const legacy=game.settings.get('brp-uge','specialtyPresets');
    this.#registry=buildSpecialtyRegistry(this.#documents,this.#overlay,legacy);
    if(!this.#registry.some(f=>f.key===this.#family))this.#family=this.#registry[0]?.key||'';
  }
  #familyOverlay(){
    this.#overlay.families[this.#family]??={additions:[],hidden:[]};
    return this.#overlay.families[this.#family];
  }
  #row(entry,templates,add=false){
    const th=this.#isTh();
    const isSource=entry.source==='compendium';
    const isNew=add===true;
    const template=entry.templateUuid||'';
    const candidates=templates.map(item=>
      '<option value="'+esc(item.uuid)+'" '+(item.uuid===template?'selected':'')+'>'+
      esc(item.system?.nameEn||item.name)+' ('+esc(item.system?.baseFormula||String(item.system?.base??0)+'%')+')</option>'
    ).join('');
    const name=entry.en||'';
    const label=entry.source==='compendium'?'Compendium / World Item':
      entry.source==='legacy'?'Legacy preset':'GM World option';
    return '<div class="brp-specialty-row" data-source="'+esc(entry.source||'world')+'" data-key="'+esc(entry.key||'')+'" data-new="'+String(isNew)+'">'+
      '<div class="brp-specialty-row-head"><strong>'+esc(label)+'</strong>'+
      (entry.sourceUuid?'<button type="button" class="brp-specialty-open" data-open-source="'+esc(entry.sourceUuid)+'">'+this.#tr('เปิดต้นฉบับ','Open source')+'</button>':'')+
      '<label><input type="checkbox" data-hidden '+(entry.hidden?'checked':'')+'> '+this.#tr('ซ่อน','Hidden')+'</label>'+
      (!isSource?'<button type="button" data-remove title="'+this.#tr('นำออกจากรายการ World','Remove World option')+'">×</button>':'')+
      '</div>'+
      '<div class="brp-specialty-row-fields">'+
      '<label>English <input data-en type="text" value="'+esc(name)+'" '+(isNew?'':'readonly')+' maxlength="100"></label>'+
      '<label>ไทย <input data-th type="text" value="'+esc(entry.th||'')+'" maxlength="100"></label>'+
      '<label>'+this.#tr('แม่แบบกฎ','Rule template')+
      '<select data-template '+(isSource?'disabled':'')+'><option value="">'+this.#tr('เลือกแม่แบบ','Select source')+'</option>'+candidates+'</select></label>'+
      '</div>'+
      '<small>'+esc(entry.sourceUuid||entry.templateUuid||'')+'</small></div>';
  }
  async _renderHTML(){
    await this.#ensureLoaded();
    this.#refreshRegistry();
    const th=this.#isTh();
    const family=this.#registry.find(f=>f.key===this.#family);
    const familyList=this.#registry.map(f=>
      '<button type="button" data-family="'+esc(f.key)+'" class="'+(f.key===this.#family?'selected':'')+'">'+
      '<span>'+esc(th?f.thFamily:f.enFamily)+'</span><small>'+
      f.options.length+' / '+f.ambiguous.length+' '+this.#tr('ต้องตรวจสอบ','review')+'</small></button>'
    ).join('');
    const rows=family?.options.map(o=>this.#row(o,family.templates)).join('')||'';
    const ambiguous=family?.ambiguous.map(a=>'<li>'+esc(a.name)+' — <small>'+esc(a.sourceUuid)+'</small></li>').join('')||'';
    const note=family?.fingerprintConflict?'<p class="brp-manager-note">'+this.#tr(
      'แม่แบบใน Family นี้มีกฎ Base/Category ต่างกัน ต้องเลือกแม่แบบเฉพาะสำหรับตัวเลือกใหม่',
      'Templates in this family differ in base/category; select a matching source for every new choice.'
    )+'</p>':'';
    return '<main class="brp-specialty-manager-v2">'+
      '<header><h2>'+this.#tr('จัดการ Specialty','Specialty Management')+'</h2><p>'+
      this.#tr('อ่านข้อมูลจาก World/Compendium และบันทึกการเปลี่ยนแปลงเฉพาะ World ไม่แก้ต้นฉบับ',
       'Read installed World/Compendium Skills; save World-only overrides without editing sources.')+'</p></header>'+
      '<div class="brp-specialty-columns"><aside><label>'+this.#tr('Skill Families','Skill Families')+
      '<input type="search" data-family-filter value="'+esc(this.#query)+'" placeholder="'+this.#tr('ค้นหา Skill Family','Find a Skill Family')+'"></label>'+
      '<nav class="brp-specialty-family-list">'+familyList+'</nav></aside>'+
      '<section class="brp-specialty-detail">'+
      (family?'<h3>'+esc(th?family.thFamily:family.enFamily)+'</h3><p class="brp-manager-note">'+
        family.sourceCount+' '+this.#tr('แม่แบบจากแหล่งข้อมูล','installed source templates')+' · '+
        family.activeCount+' '+this.#tr('ตัวเลือกที่แสดง','active choices')+'</p>'+note+
        '<div data-specialty-rows>'+rows+'</div>'+
        '<button type="button" data-add '+(family.templates.length?'':'disabled')+'>'+
          this.#tr('+ เพิ่ม Specialty ใหม่','+ Add Specialty')+'</button>'+
        (ambiguous?'<details><summary>'+this.#tr('รายการกำกวมที่ต้องตรวจสอบ','Ambiguous source examples')+
          ' ('+family.ambiguous.length+')</summary><ul>'+ambiguous+'</ul></details>':'')
       :'<p>'+this.#tr('ไม่พบ Skill Family จาก World/Compendium ที่เปิดใช้','No families found in accessible sources')+'</p>')+
      '</section></div><footer class="brp-manager-actions">'+
      '<button type="button" data-cancel>'+this.#tr('ยกเลิก','Cancel')+'</button>'+
      '<button type="button" data-save '+(this.#busy?'disabled':'')+'>'+this.#tr('บันทึกการเปลี่ยนแปลง','Save World Changes')+'</button>'+
      '</footer></main>';
  }
  _replaceHTML(html,element){element.innerHTML=html;}
  #store(){
    if(!this.#family)return;
    const root=this.element;
    const group=this.#registry.find(f=>f.key===this.#family);
    if(!group)return;
    const additions=[],hidden=[],seen=new Set();
    for(const row of root.querySelectorAll('.brp-specialty-row')){
      const en=row.querySelector('[data-en]').value.trim();
      const th=row.querySelector('[data-th]').value.trim();
      const key=row.dataset.new==='true'?specialtyFamilyKey(en):row.dataset.key;
      if(!key||!en || /[()<>/]/u.test(en))throw new Error('Invalid Specialty English name: '+en);
      if(seen.has(key))throw new Error('Duplicate Specialty: '+en);
      seen.add(key);
      const hide=row.querySelector('[data-hidden]').checked;
      if(hide)hidden.push(key);
      const original=group.options.find(o=>o.key===key);
      const templateUuid=row.querySelector('[data-template]').value;
      const isSource=row.dataset.source==='compendium';
      if(!isSource && !templateUuid && group.fingerprintConflict)
        throw new Error('Select a specific source template for '+en);
      if(!isSource && !templateUuid && !group.templateUuid)
        throw new Error('A real source template is required for '+en);
      // Keep existing Compendium names immutable. A changed translated label
      // is an overlay, not an update to the installed source document.
      if(!isSource || th!==original?.th)
        additions.push({key,en,th,templateUuid:templateUuid||group.templateUuid,state:hide?'hidden':'enabled'});
    }
    this.#familyOverlay().additions=additions;
    this.#familyOverlay().hidden=hidden;
  }
  _onRender(context,options){
    super._onRender(context,options);
    const root=this.element;
    root.querySelectorAll('[data-family]').forEach(button=>button.addEventListener('click',async()=>{
      try {this.#store();this.#family=button.dataset.family;await this.render();}
      catch(error){ui.notifications.warn(error.message);}
    }));
    const filter=root.querySelector('[data-family-filter]');
    const apply=()=>{
      const q=this.#query.trim().toLocaleLowerCase();
      root.querySelectorAll('[data-family]').forEach(el=>{el.hidden=q&&!el.textContent.toLocaleLowerCase().includes(q);});
    };
    filter?.addEventListener('input',e=>{this.#query=e.target.value;if(!e.isComposing)apply();});
    filter?.addEventListener('compositionend',e=>{this.#query=e.target.value;apply();});apply();
    const rows=root.querySelector('[data-specialty-rows]');
    root.querySelector('[data-add]')?.addEventListener('click',()=>{
      const group=this.#registry.find(f=>f.key===this.#family);
      if(!group?.templates.length)return;
      const holder=root.ownerDocument.createElement('div');
      holder.innerHTML=this.#row({key:'',en:'',th:'',source:'world',templateUuid:group.templateUuid,
        hidden:false},group.templates,true);
      rows.append(holder.firstElementChild);
      rows.lastElementChild?.querySelector('[data-en]')?.focus();
    });
    rows?.addEventListener('click',async e=>{
      const remove=e.target.closest('[data-remove]');
      if(remove){remove.closest('.brp-specialty-row')?.remove();return;}
      const open=e.target.closest('[data-open-source]');
      if(open) {
        const doc=await fromUuid(open.dataset.openSource).catch(()=>null);
        if(doc?.sheet)doc.sheet.render({force:true});
      }
    });
    root.querySelector('[data-cancel]')?.addEventListener('click',()=>this.close());
    root.querySelector('[data-save]')?.addEventListener('click',async()=>{
      if(!game.user?.isGM||this.#busy)return;
      try{
        this.#store();
        if(game.settings.get('brp-uge','specialtyRegistry')!==this.#snapshot)
          throw new Error(this.#tr('GM คนอื่นแก้ไข Registry แล้ว กรุณาเปิดหน้าต่างใหม่',
          'Specialty Registry changed in another window; reopen to avoid overwriting.'));
        this.#busy=true;
        const data=readSpecialtyRegistry(this.#overlay);
        await game.settings.set('brp-uge','specialtyRegistry',JSON.stringify(data));
        // Preserve the existing reader's legacy preference list until the
        // Character Sheet is also migrated to the versioned registry.
        const legacy=readSpecialtyPresets(game.settings.get('brp-uge','specialtyPresets'));
        for(const [key,val] of Object.entries(data.families)){
          legacy[key]=(val.additions||[]).filter(o=>o.state!=='hidden').map(o=>({en:o.en,th:o.th}));
        }
        await game.settings.set('brp-uge','specialtyPresets',JSON.stringify(legacy));
        ui.notifications.info(this.#tr('บันทึก Specialty Registry แล้ว','Specialty Registry saved'));
        await this.close();
      }catch(error){ui.notifications.error(error.message);}
      finally{this.#busy=false;}
    });
  }
}
