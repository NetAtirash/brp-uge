/** Full-viewport Skill point workbench. Edit a draft; save all Items in a single batch. */
import { BRP_CONFIG, getCampaignRules } from '../config.mjs';
import { getLocalizedName } from '../character-tools.mjs';
import { creationBudgets } from '../rules/character-creation.mjs';
import { buildSkillPointUpdates, previewSkillTotal, shouldShowCategoryColumn, validateSkillPointValue } from '../skill-points-utils.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const APP = globalThis.foundry?.applications?.api?.ApplicationV2 ?? class {};

export class BRPSkillPointsEditor extends APP {
  static DEFAULT_OPTIONS = {
    id:'brp-uge-skill-points-editor',
    classes:['brp-uge','brp-points-window'],
    window:{title:'BRP UGE · Skill Points',resizable:true},
    position:{width:1240,height:760}
  };
  #draft = new Map();
  #baseline = new Map();
  #filter='';
  #category='all';
  #saving=false;

  constructor({actor,...options}={}) {
    super(options);
    if(!actor)throw new Error('Skill points editor requires an Actor');
    this.actor=actor;
    for(const skill of actor.items.filter(i=>i.type==='skill')){
      const occupation=Number(skill.system.occupationBonus||0);
      const personal=Number(skill.system.personalBonus||0);
      this.#draft.set(skill.id,{occupation,personal});
      this.#baseline.set(skill.id,{occupation,personal});
    }
    // Fit the current browser viewport instead of requiring a narrow fixed popup.
    if(typeof window!=='undefined')this.setPosition({
      top:16,left:16,width:Math.max(560,window.innerWidth-32),height:Math.max(400,window.innerHeight-32)
    });
  }
  #isThai() {return game.settings.get('brp-uge','uiLanguage')!=='en';}
  #tr(th,en) {return this.#isThai()?th:en;}
  #skills() {return this.actor.items.filter(i=>i.type==='skill');}
  #budget() {
    const rules=getCampaignRules(),sys=this.actor.system;
    return creationBudgets({level:rules.powerLevel,useEdu:rules.useEdu,
      occupationBudgetMethod:rules.occupationBudgetMethod,
      edu:Number(sys.characteristics?.edu?.value??10),int:Number(sys.characteristics?.int?.value??10),
      age:sys.age,ageReference:sys.ageReference,increasedPersonal:rules.increasedPersonalSkillPoints});
  }
  async _renderHTML() {
    const isTh=this.#isThai(), words=(th,en)=>isTh?th:en;
    const skills=this.#skills().sort((a,b)=>getLocalizedName(a,isTh?'th':'en').localeCompare(getLocalizedName(b,isTh?'th':'en'),isTh?'th':'en'));
    const rules=getCampaignRules();
    const categories=BRP_CONFIG.skillCategories;
    const bonusRows=categories.map(key=>({key,bonus:Number(this.actor.system.derived?.categoryBonuses?.[key]??0)}));
    const showCategory=shouldShowCategoryColumn(rules.categoryBonusMode,bonusRows);
    const catLabels=BRP_CONFIG.ui[isTh?'th':'en'].catLabels||{};
    const dropdown=categories.map(key=>`<option value="${esc(key)}" ${key===this.#category?'selected':''}>${esc(catLabels[key]||key)}</option>`).join('');
    const rows=skills.map(skill=>{
      const name=getLocalizedName(skill,isTh?'th':'en');
      const en=skill.system?.nameEn||skill.name;
      const cat=skill.system.category||'communication';
      const draft=this.#draft.get(skill.id)||{occupation:Number(skill.system.occupationBonus||0),personal:Number(skill.system.personalBonus||0)};
      const total=previewSkillTotal(skill.system,draft.occupation,draft.personal);
      const fixed=skill.system.fixedRating!==null&&skill.system.fixedRating!==undefined&&skill.system.fixedRating!=='';
      return `<div class="brp-points-row" data-skill-id="${esc(skill.id)}" data-category="${esc(cat)}" data-search="${esc(`${name} ${en}`.toLocaleLowerCase())}">
        <div class="brp-points-skill" title="${esc(en)}"><strong>${esc(name)}</strong></div>
        <output>${esc(skill.system.effectiveBase??skill.system.base??0)}%</output>
        ${showCategory?`<output>${esc(skill.system.categoryBonus??0)}%</output>`:''}
        <input type="number" step="1" min="0" data-point-field="occupation" aria-label="${esc(name)} · ${words('แต้มอาชีพ','Occupation points')}" value="${esc(draft.occupation)}">
        <input type="number" step="1" min="0" data-point-field="personal" aria-label="${esc(name)} · ${words('แต้มส่วนตัว','Personal points')}" value="${esc(draft.personal)}">
        <output>${esc(skill.system.trainingTotal??0)}</output>
        <output class="brp-points-total" data-preview-total>${esc(total)}%${fixed?'*':''}</output>
      </div>`;
    }).join('');
    return `<main class="brp-points-workbench ${showCategory?'':'without-category'}">
      <header class="brp-points-top"><div><h2>${esc(this.actor.name)}</h2><p>${words('แก้แต้มทักษะ · บันทึกทั้งหมดพร้อมกัน','Edit Skill points · Save all changes together')}</p></div>
        <div class="brp-points-budget" aria-live="polite"><span>${words('อาชีพ','Occupation')} <strong data-budget-occ>—</strong></span><span>${words('ส่วนตัว','Personal')} <strong data-budget-pers>—</strong></span><span data-changes>0</span></div></header>
      <div class="brp-points-filters"><label>${words('ค้นหาทักษะ','Search Skills')} <input type="search" data-filter value="${esc(this.#filter)}" placeholder="${words('ชื่อไทย / English','Thai / English')}"></label>
      <label>${words('หมวด','Category')} <select data-category-filter><option value="all">${words('ทุกหมวด','All categories')}</option>${dropdown}</select></label>
      <span class="brp-points-count" data-count></span></div>
      <div class="brp-points-table"><div class="brp-points-heading"><span>${words('ทักษะ','Skill')}</span><span>${words('พื้นฐาน','Base')}</span>${showCategory?`<span>${words('หมวด','Category')}</span>`:''}<span>${words('อาชีพ','Occupation')}</span><span>${words('ส่วนตัว','Personal')}</span><span>${words('ฝึกฝน','Training')}</span><span>${words('รวม','Total')}</span></div>
      <div class="brp-points-rows">${rows||`<p class="meta-text">${words('ยังไม่มีทักษะในชีท','No Skills on this Actor')}</p>`}</div></div>
      <footer class="brp-points-footer"><span>${words('การเปลี่ยนแปลงยังไม่ถูกบันทึกจนกว่าจะกดบันทึก · * ทักษะที่ล็อกค่ารวมจะไม่เปลี่ยนจากการแจกแต้ม','Changes are not applied until Save · * Fixed-rating Skills ignore point allocations')}</span><button type="button" data-cancel>${words('ยกเลิก','Cancel')}</button><button type="button" data-save class="primary">${words('บันทึกแต้มทักษะ','Save Skill Points')}</button></footer>
    </main>`;
  }
  _replaceHTML(html,element) {element.innerHTML=html;}
  _onRender(context,options) {
    super._onRender(context,options);
    const root=this.element;
    const rules=getCampaignRules();
    const budget=this.#budget();
    const rows=[...root.querySelectorAll('.brp-points-row')];
    const refresh=()=>{
      let occ=0,pers=0,changed=0,invalid=false;
      for(const item of this.#skills()){
        const data=this.#draft.get(item.id);if(!data)continue;
        const baseline=this.#baseline.get(item.id);
        occ+=Number(data.occupation||0);pers+=Number(data.personal||0);
        if(data.occupation!==baseline?.occupation||data.personal!==baseline?.personal)changed++;
        if(data.occupation===null||data.personal===null)invalid=true;
      }
      const occEl=root.querySelector('[data-budget-occ]');
      const persEl=root.querySelector('[data-budget-pers]');
      occEl.textContent=`${budget.profession-occ} / ${budget.profession}`;
      persEl.textContent=`${budget.personal-pers} / ${budget.personal}`;
      occEl.classList.toggle('over-budget',occ>budget.profession);persEl.classList.toggle('over-budget',pers>budget.personal);
      root.querySelector('[data-changes]').textContent=`${changed} ${this.#tr('รายการที่แก้','edited')}`;
      root.querySelector('[data-save]').disabled=invalid||!changed||this.#saving;
    };
    const updateCount=()=>{
      const q=this.#filter.trim().toLocaleLowerCase();let visible=0;
      for(const row of rows){const matches=(this.#category==='all'||row.dataset.category===this.#category)
        &&(!q||row.dataset.search.includes(q));row.hidden=!matches;if(matches)visible++;}
      root.querySelector('[data-count]').textContent=`${visible} / ${rows.length}`;
    };
    for(const row of rows){
      row.querySelectorAll('input[data-point-field]').forEach(input=>input.addEventListener('input',()=>{
        const entry=this.#draft.get(row.dataset.skillId);
        const n=validateSkillPointValue(input.value);
        entry[input.dataset.pointField]=n;
        input.classList.toggle('invalid',n===null);
        const item=this.actor.items.get(row.dataset.skillId);
        const total=row.querySelector('[data-preview-total]');
        if(total&&item)total.textContent=n===null||entry.occupation===null||entry.personal===null?'—':
          `${previewSkillTotal(item.system,entry.occupation,entry.personal)}%`;
        refresh();
      }));
    }
    root.querySelector('[data-filter]')?.addEventListener('input',e=>{this.#filter=e.target.value; if(!e.isComposing)updateCount();});
    root.querySelector('[data-filter]')?.addEventListener('compositionend',e=>{this.#filter=e.target.value;updateCount();});
    root.querySelector('[data-category-filter]')?.addEventListener('change',e=>{this.#category=e.target.value;updateCount();});
    root.querySelector('[data-cancel]')?.addEventListener('click',()=>this.close());
    root.querySelector('[data-save]')?.addEventListener('click',async()=>{
      if(this.#saving||!this.actor.isOwner)return;
      try{
        const skills=this.#skills();
        // Prevent lost updates if another open sheet modified the same fields.
        for(const item of skills){const before=this.#baseline.get(item.id);if(!before)continue;
          if(before.occupation!==Number(item.system.occupationBonus||0)||before.personal!==Number(item.system.personalBonus||0))
            throw new Error(this.#tr('แต้มทักษะเปลี่ยนจากหน้าต่างอื่นแล้ว กรุณาปิดและเปิดใหม่','Skill points changed elsewhere. Reopen the editor to avoid overwriting them.'));
        }
        const changes=buildSkillPointUpdates(skills,this.#draft);
        if(!changes.length)return this.close();
        this.#saving=true;refresh();
        await this.actor.updateEmbeddedDocuments('Item',changes);
        ui.notifications.info(this.#tr(`บันทึกทักษะ ${changes.length} รายการแล้ว`,`Saved ${changes.length} Skills`));
        await this.close();
      }catch(error){ui.notifications.error(error.message);console.error('BRP UGE | Skill point editor',error);}
      finally{this.#saving=false;}
    });
    updateCount();refresh();
  }
}