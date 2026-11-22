/** GM-only Occupation choice builder; keeps existing exact skillRefs untouched. */
import { getLibraryDocuments } from '../library-provider.mjs';
import { availableSpecialtyFamilies } from '../skill-specialties.mjs';
import { normalizeOccupationChoiceGroups } from '../occupation-choice-rules.mjs';
import { getLocalizedName } from '../character-tools.mjs';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const App=globalThis.foundry?.applications?.api?.ApplicationV2;
export class BRPOccupationChoiceEditor extends App {
  static DEFAULT_OPTIONS={
    id:'brp-occupation-choices',classes:['brp-uge','brp-occupation-choices-editor'],
    window:{title:'BRP UGE · Occupation Skill Choices',resizable:true},
    position:{width:850,height:690}
  };
  #draft=[];
  #baseline='';
  #skills=[];
  #families=[];
  #loaded=false;
  constructor({item,...options}={}){
    super(options);
    if(!item||item.type!=='occupation')throw new Error('An Occupation Item is required');
    this.item=item;
    this.#baseline=JSON.stringify(item.system.skillChoiceGroups??[]);
    this.#draft=structuredClone(normalizeOccupationChoiceGroups(item.system.skillChoiceGroups));
  }
  #tr(th,en){return game.settings.get('brp-uge','uiLanguage')==='en'?en:th;}
  async #ensure(){
    if(this.#loaded)return;
    this.#skills=await getLibraryDocuments({types:['skill']});
    this.#families=availableSpecialtyFamilies(this.#skills);
    this.#loaded=true;
  }
  #optionList(selected){
    const lang=game.settings.get('brp-uge','uiLanguage')==='en'?'en':'th';
    const current=selected?.kind==='family'?'family:'+selected.familyKey:'skill:'+(selected?.ref||'');
    const options=[
      ...this.#families.map(f=>({value:'family:'+f.key,label:this.#tr('ทุก Specialty จาก ','Any Specialty from ')+(lang==='th'?f.thFamily:f.enFamily)})),
      ...this.#skills.map(s=>({value:'skill:'+s.uuid,label:getLocalizedName(s,lang)}))
    ];
    if(current && !options.some(x=>x.value===current))
      options.unshift({value:current,label:this.#tr('ไม่พบต้นฉบับ: ','Missing source: ')+current});
    return '<select data-option>'+options.map(o=>'<option value="'+esc(o.value)+'" '+
      (o.value===current?'selected':'')+'>'+esc(o.label)+'</option>').join('')+'</select>';
  }
  #renderGroup(group,i){
    return '<section class="brp-choice-group" data-group-index="'+i+'">'+
      '<header><strong>'+this.#tr('กลุ่มทางเลือกที่ ','Choice group ')+(i+1)+'</strong>'+
      '<button type="button" data-remove-group="'+i+'">'+this.#tr('ลบกลุ่ม','Remove')+'</button></header>'+
      '<div class="brp-choice-fields">'+
      '<label>English label <input data-label-en value="'+esc(group.labelEn)+'"></label>'+
      '<label>ชื่อกลุ่มภาษาไทย <input data-label-th value="'+esc(group.labelTh)+'"></label>'+
      '<label>'+this.#tr('จำนวนที่ต้องเลือก','Choose count')+' <input type="number" data-count min="1" step="1" value="'+group.count+'"></label>'+
      '<label><input type="checkbox" data-distinct '+(group.distinct?'checked':'')+'> '+this.#tr('ห้ามเลือกซ้ำ','Distinct skills')+'</label>'+
      '</div><div class="brp-choice-options">'+
      group.options.map((opt,j)=>'<div class="brp-choice-option" data-option-index="'+j+'">'+
        this.#optionList(opt)+'<button type="button" data-remove-option="'+j+'">×</button></div>').join('')+
      '</div><button type="button" data-add-option="'+i+'">'+this.#tr('+ เพิ่มตัวเลือก','+ Add option')+'</button>'+
      '</section>';
  }
  async _renderHTML(){
    await this.#ensure();
    return '<main class="brp-choice-editor"><header><h2>'+this.#tr('เงื่อนไขเลือกทักษะอาชีพ','Occupation Skill Choices')+'</h2>'+
      '<p>'+this.#tr('Skill UUID ในส่วนทักษะอาชีพปกติยังเป็นรายการบังคับ ข้อมูลด้านล่างเป็นกลุ่มทางเลือกเพิ่มเติมจากกฎอาชีพ',
      'Existing occupation skillRefs remain fixed/required. These are additional choice clauses.')+'</p></header>'+
      '<div class="brp-choice-group-list">'+this.#draft.map((g,i)=>this.#renderGroup(g,i)).join('')+'</div>'+
      '<button type="button" data-add-group>'+this.#tr('+ เพิ่มกลุ่มทางเลือก','+ Add choice group')+'</button>'+
      '<footer class="brp-manager-actions"><button type="button" data-cancel>'+this.#tr('ยกเลิก','Cancel')+'</button>'+
      '<button type="button" data-save>'+this.#tr('บันทึกเงื่อนไข','Save choice clauses')+'</button></footer></main>';
  }
  _replaceHTML(html,root){root.innerHTML=html;}
  #store(){
    const root=this.element;
    this.#draft=[...root.querySelectorAll('.brp-choice-group')].map((el,i)=>{
      const g=this.#draft[i];
      const count=Number(el.querySelector('[data-count]').value);
      if(!Number.isSafeInteger(count)||count<1||count>50)throw new Error('Choose count must be between 1 and 50');
      const options=[...el.querySelectorAll('[data-option]')].map(select=>{
        const value=select.value;
        return value.startsWith('family:')?{kind:'family',familyKey:value.slice(7),ref:''}:
          {kind:'skill',familyKey:'',ref:value.slice(6)};
      });
      if(!options.length)throw new Error('Each group needs at least one Skill or Family option');
      return {id:g.id,labelEn:el.querySelector('[data-label-en]').value.trim(),
        labelTh:el.querySelector('[data-label-th]').value.trim(),count,
        distinct:el.querySelector('[data-distinct]').checked,options};
    });
  }
  _onRender(context,options){
    super._onRender(context,options);
    const root=this.element;
    const rebuild=async fn=>{try{this.#store();fn();await this.render();}catch(error){ui.notifications.warn(error.message);}};
    root.querySelector('[data-add-group]')?.addEventListener('click',()=>rebuild(()=>{
      const defaultSkill=this.#families[0];
      const first=this.#skills[0];
      this.#draft.push({id:foundry.utils.randomID(),labelTh:'',labelEn:'',count:1,distinct:true,
        options:defaultSkill?[{kind:'family',familyKey:defaultSkill.key,ref:''}]:
          first?[{kind:'skill',familyKey:'',ref:first.uuid}]:[]});
    }));
    root.querySelectorAll('[data-remove-group]').forEach(button=>button.addEventListener('click',()=>rebuild(()=>{
      this.#draft.splice(Number(button.dataset.removeGroup),1);
    })));
    root.querySelectorAll('[data-add-option]').forEach(button=>button.addEventListener('click',()=>rebuild(()=>{
      const group=this.#draft[Number(button.dataset.addOption)];
      if(this.#families[0])group.options.push({kind:'family',familyKey:this.#families[0].key,ref:''});
      else if(this.#skills[0])group.options.push({kind:'skill',familyKey:'',ref:this.#skills[0].uuid});
    })));
    root.querySelectorAll('[data-remove-option]').forEach(button=>button.addEventListener('click',()=>rebuild(()=>{
      const parent=button.closest('[data-group-index]');const index=Number(parent.dataset.groupIndex);
      this.#draft[index].options.splice(Number(button.dataset.removeOption),1);
    })));
    root.querySelector('[data-cancel]')?.addEventListener('click',()=>this.close());
    root.querySelector('[data-save]')?.addEventListener('click',async()=>{
      if(!game.user?.isGM || !this.item.isOwner)return;
      try{
        this.#store();
        const ids=this.#draft.map(g=>g.id);
        if(new Set(ids).size!==ids.length)throw new Error('Duplicate choice group identifiers');
        if(JSON.stringify(this.item.system.skillChoiceGroups??[])!==this.#baseline)
          throw new Error('Occupation changed in another window; reopen to avoid overwriting');
        await this.item.update({'system.skillChoiceGroups':normalizeOccupationChoiceGroups(this.#draft)});
        ui.notifications.info(this.#tr('บันทึกเงื่อนไขเลือกทักษะแล้ว','Occupation choice rules saved'));
        await this.close();
      }catch(error){ui.notifications.error(error.message);}
    });
  }
}
