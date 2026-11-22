import { applyBRPControlLanguage } from "../ui-controls.mjs";
import { getItemDescription, getLocalizedName, getDisplayItemName } from "../character-tools.mjs";
import { getThemedBRPIcon } from "../library-taxonomy.mjs";
import { getReferenceChoices, itemReference, categoryLabel, resolveItemReference } from "../reference-utils.mjs";
import { buildBRPRulebookView } from "../rulebook-reference-view.mjs";
import { BRPOccupationChoiceEditor } from "../apps/occupation-choice-editor.mjs";
import { normalizeOccupationChoiceGroups } from "../occupation-choice-rules.mjs";
const { ItemSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class BRPItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["brp-uge", "sheet", "item"],
    tag: "form",
    position: {
      width: 560,
      height: 540
    },
    window: {
      resizable: true
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    },
    actions: {
      editImage: BRPItemSheet.#onEditImage,
      toggleLanguageFields: BRPItemSheet.#onToggleLanguageFields,
      addReference: BRPItemSheet.#onAddReference,
      removeReference: BRPItemSheet.#onRemoveReference,
      editOccupationChoices: BRPItemSheet.#onEditOccupationChoices
    }
  };

  static PARTS = {
    sheet: {
      template: "systems/brp-uge/templates/item/item-sheet.hbs"
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const t = this.document.type;
    context.item = this.document;
    context.displayIcon = getThemedBRPIcon(this.document);
    context.system = this.document.system;
    context.typeLabel = game.i18n.localize(`TYPES.Item.${t}`);
    context.isTh = game.settings.get("brp-uge", "uiLanguage") !== "en";
    // Show compatible localized text immediately for existing 1.7 items.
    // The separate fields are saved only when the user edits/submits this Item Sheet.
    context.descriptionTh = getItemDescription(this.document.system, "th");
    context.descriptionEn = getItemDescription(this.document.system, "en");
    context.rulebookView = buildBRPRulebookView(this.document, context.isTh ? "th" : "en");
    context.nameTh = getLocalizedName(this.document, "th");
    context.nameEn = getLocalizedName(this.document, "en");
    context.flavorNameTh = String(this.document.system?.flavorNameTh ?? "");
    context.flavorNameEn = String(this.document.system?.flavorNameEn ?? "");
    context.flavorDisplay = getDisplayItemName(this.document, context.isTh ? "th" : "en");
    context.rulesDisplay = getLocalizedName(this.document, context.isTh ? "th" : "en");
    context.isSkill = t === "skill";
    context.isWeapon = t === "weapon";
    context.isArmor = t === "armor";
    context.isShield = t === "shield";
    context.isPower = t === "power";
    context.isPassion = t === "passion";
    context.isGear = t === "gear";
    context.isOccupation = t === "occupation";
    context.occupationChoiceGroups = context.isOccupation
      ? normalizeOccupationChoiceGroups(this.document.system.skillChoiceGroups).map(g=>({
          ...g,label:context.isTh?(g.labelTh||g.labelEn):(g.labelEn||g.labelTh),countOptions:g.options.length
        })) : [];
    context.isWealth = t === "wealth";
    context.isStatus = t === "status";
    context.statusCharacteristics = ["str","con","siz","int","pow","dex","cha","edu"];
    context.wealthChoices = context.isOccupation ? (await getReferenceChoices("wealth",{lang:context.isTh?"th":"en"})).map(o=>({...o,selected:o.ref===this.document.system.wealthRef})) : [];
    context.statusCategories = ["combat","communication","manipulation","mental","perception","physical"].map(key=>({key,label:categoryLabel(key,context.isTh?"th":"en")}));
    const lang=context.isTh?'th':'en';
    const types = context.isOccupation ? [['skillRefs','skill','Occupational Skills','ทักษะอาชีพ'],['starterWeaponRefs','weapon','Starter Weapons','อาวุธเริ่มต้น'],['starterArmorRefs','armor','Starter Armor','เกราะเริ่มต้น']]
      : context.isStatus ? [['skillRefs','skill','Affected Skills','ทักษะที่ได้รับผล']]:[];
    context.referenceGroups=[];
    for(const [field,type,en,th] of types) {
      const choices=await getReferenceChoices(type,{actor:this.document.parent?.type==='character'?this.document.parent:null,lang});
      const selected=[...(this.document.system[field]??[])];
      context.referenceGroups.push({field,type,label:context.isTh?th:en,
        options:choices, selected:selected.map(ref=>({ref,label:choices.find(c=>c.ref===ref)?.label||ref}))});
    }
    context.skillReferenceOptions = (context.isWeapon||context.isShield) ? await getReferenceChoices('skill',{actor:this.document.parent?.items?this.document.parent:null,lang}):[];
    context.selectedSkillRef = this.document.system.skillRef || '';
    return context;
  }

  static #onEditOccupationChoices(event) {
    event.preventDefault();
    if(!game.user?.isGM)return ui.notifications.warn("GM only");
    new BRPOccupationChoiceEditor({item:this.document}).render({force:true});
  }

  /** Reference chips are changed via explicit actions, not editable translated text. */
  static async #onAddReference(event,target) {
    event.preventDefault();
    const field=String(target.dataset.refField||'');
    if(!['skillRefs','starterWeaponRefs','starterArmorRefs'].includes(field))return;
    const select=this.element.querySelector(`[data-ref-select="${field}"]`);
    const ref=String(select?.value||'');if(!ref)return;
    const refs=[...(this.document.system[field]??[])];if(!refs.includes(ref))refs.push(ref);
    await this.document.update({[`system.${field}`]:refs});
  }
  static async #onRemoveReference(event,target) {
    event.preventDefault();
    const field=String(target.dataset.refField||'');
    if(!['skillRefs','starterWeaponRefs','starterArmorRefs'].includes(field))return;
    await this.document.update({[`system.${field}`]:(this.document.system[field]??[]).filter(r=>r!==target.dataset.ref)});
  }
  async _onDrop(event) {
    const wealthZone=event.target?.closest?.('[data-wealth-drop]');
    if(wealthZone){
      event.preventDefault();event.stopPropagation();
      let data;try{data=JSON.parse(event.dataTransfer?.getData('text/plain')||'{}');}catch{return;}
      if(data.type!=='Item'||!data.uuid)return;
      const wealth=await resolveItemReference(data.uuid,'wealth');
      if(wealth)await this.document.update({'system.wealthRef':wealth.uuid});
      return;
    }
    const zone=event.target?.closest?.('[data-ref-drop]');
    if(!zone)return super._onDrop(event);
    event.preventDefault();event.stopPropagation();
    const field=zone.dataset.refDrop;
    const required={skillRefs:'skill',starterWeaponRefs:'weapon',starterArmorRefs:'armor',skillRef:'skill'}[field];
    if(!required)return;
    let data;
    try{data=JSON.parse(event.dataTransfer?.getData('text/plain')||'{}');}catch{return;}
    if(data.type!=='Item'||!data.uuid)return;
    const item=await resolveItemReference(data.uuid,required);
    if(!item)return ui.notifications.warn('BRP: Item type does not match the reference slot');
    if(field==='skillRef')return this.document.update({'system.skillRef':itemReference(item)});
    const refs=[...(this.document.system[field]??[])];
    if(!refs.includes(itemReference(item)))refs.push(itemReference(item));
    await this.document.update({[`system.${field}`]:refs});
  }
  _onRender(context,options) {
    super._onRender(context,options);
    applyBRPControlLanguage(this.element);
    this.element?.querySelectorAll?.('[data-ref-drop], [data-wealth-drop]')?.forEach(zone=>zone.addEventListener('dragover',event=>event.preventDefault()));
  }

  static #onToggleLanguageFields(event, target) {
    event.preventDefault();
    const root = this.element;
    root.classList.toggle("brp-show-all-languages");
    target.setAttribute("aria-expanded", String(root.classList.contains("brp-show-all-languages")));
  }

  static #onEditImage(event, target) {
    const attr = target.dataset.edit || "img";
    const current = foundry.utils.getProperty(this.document, attr);
    const FilePickerCls = foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
    const fp = new FilePickerCls({
      type: "image",
      current,
      callback: (path) => this.document.update({ [attr]: path })
    });
    fp.browse();
  }
}
