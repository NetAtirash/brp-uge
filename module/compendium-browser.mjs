/** Optional-content browser. No built-in catalog, pack creation, or fallback items. */
import { applyBRPControlLanguage } from './ui-controls.mjs';
import { getLibraryDocuments, LIBRARY_CATEGORIES, documentToEmbeddedItem } from './library-provider.mjs';
import { BRP_ERAS, BRP_GROUPS, getThemedBRPIcon, getBRPGroup } from './library-taxonomy.mjs';
import { isPowerSystemEnabled } from './config.mjs';
import { getDisplayItemName, getItemTooltip, getTooltipLanguage } from './character-tools.mjs';
import { applyStatusTemplate } from './status-template.mjs';
import { buildBRPRulebookView } from './rulebook-reference-view.mjs';
import { sameSkill } from './skill-foundation.mjs';
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
const LABELS={skills:['ทักษะ','Skills'],weapons:['อาวุธและโล่','Weapons & Shields'],armor:['ชุดเกราะ','Armor'],powers:['พลัง','Powers'],gear:['อุปกรณ์','Equipment'],passions:['แรงผลักดัน','Passions'],actors:['ตัวละคร/NPC','Actors / NPCs'],occupations:['อาชีพ','Occupations'],wealth:['ฐานะ','Wealth'],statuses:['สถานะ','Conditions']};
export class BRPCompendiumBrowser extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options={}) {super(options);this.targetActor=options.actor??null;this.activeCategory=options.category??'skills';this.searchQuery='';this.eraFilter='all';this.groupFilter='all';this.library=[];this.loaded=false;}
  static DEFAULT_OPTIONS={id:'brp-compendium-browser',classes:['brp-uge','brp-compendium-window'],position:{width:780,height:660},window:{title:'BRP UGE — Optional Content Browser',resizable:true},actions:{selectCategory:BRPCompendiumBrowser.#selectCategory,addToSheet:BRPCompendiumBrowser.#addToSheet,importToWorld:BRPCompendiumBrowser.#importToWorld,refreshSources:BRPCompendiumBrowser.#refreshSources}};
  static PARTS={browser:{template:'systems/brp-uge/templates/apps/compendium-browser.hbs'}};
  async _prepareContext(options) {
    const context=await super._prepareContext(options);
    if(!this.loaded){this.library=await getLibraryDocuments({includeActors:true});this.loaded=true;}
    const uiLang=game.settings.get('brp-uge','uiLanguage')||'th',isTh=uiLang==='th';
    const categories=Object.keys(LIBRARY_CATEGORIES).map(key=>({key,label:`${LABELS[key][isTh?0:1]} (${this.library.filter(d=>LIBRARY_CATEGORIES[key].includes(d.type)).length})`,active:key===this.activeCategory}));
    const documents=this.library.filter(doc=>LIBRARY_CATEGORIES[this.activeCategory]?.includes(doc.type) && (doc.type!=='power'||isPowerSystemEnabled(doc.system?.system)));
    const groups=[...new Set(documents.map(d=>d.flags?.['brp-uge']?.group||getBRPGroup(this.activeCategory,d)))];
    if(this.groupFilter!=='all'&&!groups.includes(this.groupFilter))this.groupFilter='all';
    const prepared=documents.map((doc,index)=>{
      const group=doc.flags?.['brp-uge']?.group||getBRPGroup(this.activeCategory,doc);
      const eras=doc.flags?.['brp-uge']?.eras??['universal'];
      const ref=doc.flags?.['brp-uge']?.rulebookReference;
      const view=buildBRPRulebookView(doc,uiLang);
      const s=doc.system??{};
      return {index,name:getDisplayItemName(doc,uiLang),img:getThemedBRPIcon(doc)||doc.img||'icons/svg/item-bag.svg',type:doc.type,
        meta:this.activeCategory==='skills'?`${s.category||'skill'} · ${s.baseFormula||`${s.base??0}%`}`:doc.type==='power'?`${s.system||'Power'} · ${s.costPP??0} PP`:doc.type,
        group,groupLabel:BRP_GROUPS[group]?.[isTh?0:1]||group,eras,eraLabels:eras.map(k=>BRP_ERAS.find(e=>e.key===k)?.[isTh?'th':'en']||k).join(' · '),
        description:String(getItemTooltip(s,getTooltipLanguage())||'').slice(0,230),
        fullDescription:String(isTh?s.descriptionTh||s.description||'':s.descriptionEn||s.description||''),
        sourceEnglish:isTh?String(s.descriptionEn||''):'',bookPages:(ref?.pages??[]).join(', '),rulebookWarning:view?.baseWarning||'',
        hasRuleReference:!!ref?.book,isDirectRulebook:ref?.sourceType==='direct',isModuleExample:ref?.sourceType==='module',source:String(doc.pack||'World'),
        searchText:`${doc.name} ${s.nameTh||''} ${s.nameEn||''} ${s.descriptionTh||''} ${s.descriptionEn||''} ${s.description||''}`.toLocaleLowerCase()};
    }).filter(e=>(this.eraFilter==='all'||e.eras.includes(this.eraFilter)||e.eras.includes('universal'))&&(this.groupFilter==='all'||e.group===this.groupFilter));
    Object.assign(context,{categories,entries:prepared,eras:BRP_ERAS.map(e=>({key:e.key,label:e[isTh?'th':'en'],selected:e.key===this.eraFilter})),groups:[{key:'all',label:isTh?'ทุกหมวดหมู่':'All groups',selected:this.groupFilter==='all'},...groups.map(k=>({key:k,label:BRP_GROUPS[k]?.[isTh?0:1]||k,selected:k===this.groupFilter}))],isTh,isGM:!!game.user?.isGM,isActorCategory:this.activeCategory==='actors',targetActorName:this.targetActor?.name||null,resultCount:prepared.length,totalCount:documents.length,searchQuery:this.searchQuery,hasSources:!!this.library.length});
    this.visibleDocuments=documents;
    return context;
  }
  _onRender(context,options) {
    super._onRender(context,options);applyBRPControlLanguage(this.element);
    for(const [name,key] of [['compendiumEra','eraFilter'],['compendiumGroup','groupFilter']]){
      this.element.querySelector(`[name="${name}"]`)?.addEventListener('change',e=>{this[key]=e.currentTarget.value;this.render();});
    }
    const input=this.element.querySelector('[name="compendiumSearch"]');
    const filter=()=>{const q=this.searchQuery.trim().toLocaleLowerCase();let n=0;for(const el of this.element.querySelectorAll('.comp-row')){const visible=!q||String(el.dataset.search||'').includes(q);el.hidden=!visible;if(visible)n++;}const count=this.element.querySelector('.comp-result-summary strong');if(count)count.textContent=String(n);const empty=this.element.querySelector('.comp-live-empty');if(empty)empty.hidden=n>0;};
    input?.addEventListener('input',e=>{this.searchQuery=e.currentTarget.value;if(!e.isComposing)filter();});
    input?.addEventListener('compositionend',e=>{this.searchQuery=e.currentTarget.value;filter();});filter();
  }
  static #selectCategory(event,target){event.preventDefault();this.activeCategory=target.dataset.category;this.groupFilter='all';this.render();}
  static async #refreshSources(event){event.preventDefault();this.loaded=false;await this.render();}
  static async #addToSheet(event,target){event.preventDefault();const doc=this.visibleDocuments?.[Number(target.dataset.index)];const actor=this.targetActor??canvas?.tokens?.controlled?.[0]?.actor??game.user?.character;
    if(!doc||doc.documentName!=='Item')return;
    if(!actor||!actor.isOwner)return ui.notifications.warn('Select an editable Actor first');
    if(doc.type==='status'){await applyStatusTemplate(actor,doc);}else{
      const data=documentToEmbeddedItem(doc);
      if(doc.type==='skill'&&(actor.items?.some?.(existing=>sameSkill(existing,data))??false))
        return ui.notifications.warn('This Skill is already on the character sheet.');
      if(data)await actor.createEmbeddedDocuments('Item',[data]);
    }
    ui.notifications.info(`Added ${doc.name} to ${actor.name}`);
  }
  static async #importToWorld(event,target){event.preventDefault();if(!game.user?.isGM)return;const doc=this.visibleDocuments?.[Number(target.dataset.index)];if(!doc)return;
    if(!doc.pack){doc.sheet?.render({force:true});return;}
    const data=foundry.utils.deepClone(doc.toObject());delete data._id;delete data.folder;
    data.flags??={};data.flags.core??={};data.flags.core.sourceId||=doc.uuid;
    const C=doc.documentName==='Actor'?Actor.implementation:Item.implementation;
    const created=await C.create(data);ui.notifications.info(`Imported ${created.name}`);created.sheet?.render({force:true});
  }
}
