import { applyBRPControlLanguage } from "../ui-controls.mjs";
import { buildShareEntryCard } from "../chat/share-entry.mjs";
import { resolveWealthItem, wealthDisplayFromItem } from "../wealth-utils.mjs";
import { findActorSkill, categoryLabel, itemReference, itemMatchesReference } from "../reference-utils.mjs";
import { BRP_CONFIG, getCampaignRules, isPowerSystemEnabled } from "../config.mjs";
import { BRPRolls } from "../rolls/brp-rolls.mjs";
import { getLibraryDocuments, documentToEmbeddedItem } from "../library-provider.mjs";
import { getBRPIcon, getThemedBRPIcon } from "../library-taxonomy.mjs";
import { statusSkillAdjustment, characteristicAdjustments, agePenalties, agePenaltyBreakdown } from "../status-effects.mjs";
import { escapeForChat, getItemTooltip, getTooltipLanguage, getLocalizedName, getDisplayItemName, getNameLanguage, getSkillNameMatches, powerMode, powerChance } from "../character-tools.mjs";
import { creationBudgets } from "../rules/character-creation.mjs";
import { BRPSkillPointsEditor } from "../apps/skill-points-editor.mjs";
import { shouldShowCategoryColumn } from "../skill-points-utils.mjs";
import { sameSkill } from "../skill-foundation.mjs";
import { availableSpecialtyFamilies, readSpecialtyPresets, composeSpecialtyItem } from "../skill-specialties.mjs";
import { buildSpecialtyRegistry, specialtyTemplateFor } from "../specialty-registry.mjs";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class BRPActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  #editMode = false;
  #resistanceOpen = false;
  #skillFilter = "";
  #noteFilter = "";
  #resistActiveStat = "pow";
  #resistTargetStat = "pow";
  #resistActive = 15;
  #resistPassive = 12;
  #resistPassiveOverride = false;
  #resistLabel = "POW vs POW ต้านทานพลัง";

  static DEFAULT_OPTIONS = {
    classes: ["brp-uge", "sheet", "actor"],
    tag: "form",
    position: {
      width: 1280,
      height: 900
    },
    window: {
      resizable: true
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    },
    actions: {
      switchTab: BRPActorSheet.#onSwitchTab,
      toggleEdit: BRPActorSheet.#onToggleEdit,
      openSkillPointsEditor: BRPActorSheet.#onOpenSkillPointsEditor,
      togglePaperTheme: BRPActorSheet.#onTogglePaperTheme,
      openWizard: BRPActorSheet.#onOpenWizard,
      toggleResistance: BRPActorSheet.#onToggleResistance,
      pullTargetResistStat: BRPActorSheet.#onPullTargetResistStat,
      rollResistance: BRPActorSheet.#onRollResistance,
      rollSanity: BRPActorSheet.#onRollSanity,
      recoverPool: BRPActorSheet.#onRecoverPool,
      treatCondition: BRPActorSheet.#onTreatCondition,
      addWound: BRPActorSheet.#onAddWound,
      toggleHealWound: BRPActorSheet.#onToggleHealWound,
      deleteWound: BRPActorSheet.#onDeleteWound,
      rollMajorWound: BRPActorSheet.#onRollMajorWound,
      addInsanity: BRPActorSheet.#onAddInsanity,
      toggleCureInsanity: BRPActorSheet.#onToggleCureInsanity,
      deleteInsanity: BRPActorSheet.#onDeleteInsanity,
      openCompendium: BRPActorSheet.#onOpenCompendium,
      configureStartingSkills: BRPActorSheet.#onConfigureStartingSkills,
      addCatalogSkill: BRPActorSheet.#onAddCatalogSkill,
      runExp: BRPActorSheet.#onRunExp,
      shareEntry: BRPActorSheet.#onShareEntry,
      rollChar: BRPActorSheet.#onRollChar,
      rollSkill: BRPActorSheet.#onRollSkill,
      rollPower: BRPActorSheet.#onRollPower,
      rollPassion: BRPActorSheet.#onRollPassion,
      rollWeapon: BRPActorSheet.#onRollWeapon,
      stepActorValue: BRPActorSheet.#onStepActorValue,
      stepItemValue: BRPActorSheet.#onStepItemValue,
      toggleExp: BRPActorSheet.#onToggleExp,
      toggleEquipped: BRPActorSheet.#onToggleEquipped,
      createItem: BRPActorSheet.#onCreateItem,
      editItem: BRPActorSheet.#onEditItem,
      deleteItem: BRPActorSheet.#onDeleteItem,
      createAdvancement: BRPActorSheet.#onCreateAdvancement,
      createStatus: BRPActorSheet.#onCreateStatus,
      editStatus: BRPActorSheet.#onEditStatus,
      toggleStatus: BRPActorSheet.#onToggleStatus,
      deleteStatus: BRPActorSheet.#onDeleteStatus,
      updateCurrency: BRPActorSheet.#onUpdateCurrency,
      chooseOccupation: BRPActorSheet.#onChooseOccupation,
      activateOccupation: BRPActorSheet.#onActivateOccupation,
      editAdvancement: BRPActorSheet.#onEditAdvancement,
      deleteAdvancement: BRPActorSheet.#onDeleteAdvancement,
      createNote: BRPActorSheet.#onCreateNote,
      editNote: BRPActorSheet.#onEditNote,
      deleteNote: BRPActorSheet.#onDeleteNote,
      shareNote: BRPActorSheet.#onShareNote,
      editImage: BRPActorSheet.#onEditImage
    }
  };

  static PARTS = {
    sheet: {
      template: "systems/brp-uge/templates/actor/character-sheet.hbs"
    }
  };

  /** @override */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    if (this.document.type === "npc") {
      parts.sheet = { ...parts.sheet, template: "systems/brp-uge/templates/actor/npc-sheet.hbs" };
    }
    return parts;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    this.tabGroups ??= {};
    const validTabs = ["skills", "combat", "powers", "wounds", "inventory", "status", "advancement", "notes", "gear"];
    const activeTab = validTabs.includes(this.tabGroups.primary) ? this.tabGroups.primary : "skills";
    this.tabGroups.primary = activeTab === "gear" ? "inventory" : activeTab;

    const uiLang = game.settings.get("brp-uge", "uiLanguage") || "th";
    const isTh = uiLang === "th";
    const ui = BRP_CONFIG.ui[uiLang] ?? BRP_CONFIG.ui.th;
    const charTips = BRP_CONFIG.charTooltips[uiLang] ?? BRP_CONFIG.charTooltips.th;
    const derivedTips = BRP_CONFIG.derivedTooltips[uiLang] ?? BRP_CONFIG.derivedTooltips.th;
    const rules = getCampaignRules();

    const sys = this.document.system ?? {};
    const characteristicsList = Object.entries(sys?.characteristics ?? {})
      .filter(([key]) => key !== "edu" || rules.useEdu)
      .map(([key, data]) => ({
        key,
        short: key.toUpperCase(),
        rollLabel: ui.charRolls[key] ?? key.toUpperCase(),
        value: data?.value ?? 10,
        rawValue: data?.value ?? 10,
        effectiveValue: sys.derived?.effectiveCharacteristics?.[key] ?? data?.value ?? 10,
        delta: Number(sys.derived?.characteristicAdjustments?.[key] ?? 0),
        rollPct: Number(sys.derived?.effectiveCharacteristics?.[key] ?? data?.value ?? 10) * 5,
        tooltip: charTips[key] ?? ""
      }));

    const targetToken = Array.from(game.user?.targets ?? [])[0] ?? null;
    const targetActor = targetToken?.actor ?? null;
    const resistStatKeys = rules.useEdu
      ? ["str", "con", "siz", "int", "pow", "dex", "cha", "edu"]
      : ["str", "con", "siz", "int", "pow", "dex", "cha"];

    if (targetActor && !this.#resistPassiveOverride) {
      this.#resistPassive = Number(targetActor.system?.characteristics?.[this.#resistTargetStat]?.value ?? 10);
    }

    context.actor = this.document;
    context.system = sys;
    context.ui = ui;
    context.uiLang = uiLang;
    context.isTh = isTh;
    context.isGM = Boolean(game.user?.isGM);
    context.derivedTips = derivedTips;
    context.canUseWizard = Boolean(game.user?.isGM || rules.allowPlayerCharacterWizard);
    context.campaignRules = rules;
    context.editMode = this.#editMode;
    context.canEditSkillPoints = Boolean(this.document.isOwner);
    context.resistanceOpen = this.#resistanceOpen;
    context.skillFilter = this.#skillFilter;
    context.resistActiveStat = this.#resistActiveStat;
    context.resistTargetStat = this.#resistTargetStat;
    context.resistActive = this.#resistActive;
    context.resistPassive = this.#resistPassive;
    context.resistLabel = this.#resistLabel;
    context.resistChance = Math.clamp(50 + (this.#resistActive - this.#resistPassive) * 5, 1, 99);
    context.resistStatChoices = resistStatKeys.map((k) => ({
      key: k,
      label: `${k.toUpperCase()} (${sys?.characteristics?.[k]?.value ?? 10})`,
      targetLabel: targetActor
        ? `${k.toUpperCase()} (${targetActor.system?.characteristics?.[k]?.value ?? 10})`
        : k.toUpperCase()
    }));
    context.targetActor = targetActor
      ? {
          name: targetActor.name,
          uuid: targetToken?.document?.uuid ?? "",
          ap: targetActor.getEquippedArmorPoints?.() ?? 0,
          hp: targetActor.system?.hp?.value ?? 0,
          hpMax: targetActor.system?.hp?.max ?? 0,
          statVal: Number(targetActor.system?.characteristics?.[this.#resistTargetStat]?.value ?? 10)
        }
      : null;
    context.characteristicsList = characteristicsList;
    context.equippedAp = this.document.getEquippedArmorPoints?.() ?? 0;
    context.hitLocations = (sys?.derived?.hitLocations ?? []).map((loc) => ({
      ...loc,
      label: isTh ? loc.labelTh : loc.labelEn
    }));
    context.activeTab = this.tabGroups.primary;
    context.isSkillsTab = activeTab === "skills";
    context.isCombatTab = activeTab === "combat";
    const encounter = game.combats?.viewed ?? game.combat;
    const participant = encounter?.round > 0
      ? [...encounter.combatants].find(c => c.actor?.id === this.document.id)
      : null;
    if (participant && rules.useCombatPhases) {
      const phase = encounter.getPhase?.() ?? "statements";
      const phaseMeta = BRP_CONFIG.combatPhases.find(p=>p.id===phase);
      const plans = participant.actor?.getFlag?.("brp-uge", "combatPlans") ?? {};
      const saved = plans[participant.id];
      const plan = saved?.combatId === encounter.id && Number(saved.round) === Number(encounter.round) ? saved : {};
      const dex = Number(participant.actor?.system?.characteristics?.dex?.value ?? 10);
      const int = Number(participant.actor?.system?.characteristics?.int?.value ?? 10);
      const engagements = participant.actor?.getFlag?.("brp-uge", "combatEngagements") ?? {};
      const engageState = engagements[participant.id]?.combatId === encounter.id ? engagements[participant.id] : {};
      context.combatFocus = {
        engaged: Boolean(engageState.engaged),
        engagedWith: String(engageState.with ?? ""),
        round: encounter.round,
        phase: isTh ? phaseMeta?.labelTh : phaseMeta?.labelEn,
        rank: phase === "powers" ? `INT ${int}` : `DEX ${Number(participant.initiative ?? dex)}`,
        intent: plan.intent || (isTh ? "ยังไม่ได้ประกาศ" : "Not declared"),
        note: plan.note ?? "",
        done: Boolean(plan.done)
      };
    }

    context.isPowersTab = activeTab === "powers";
    context.isWoundsTab = activeTab === "wounds";
    context.isInventoryTab = this.tabGroups.primary === "inventory";
    context.isAdvancementTab = this.tabGroups.primary === "advancement";
    context.isStatusTab = this.tabGroups.primary === "status";
    context.statusRows = [...(sys.statusEffects ?? [])].map(e=>{
      const affectedIds = Array.isArray(e.skillIds) && e.skillIds.length
        ? e.skillIds : e.skillId ? [e.skillId] : [];
      const affectedSkillItems=this.document.items.filter(i=>i.type==='skill' &&
        (affectedIds.includes(i.id)||(e.skillRefs??[]).some(ref=>itemMatchesReference(i,ref))));
      const scopeLabel = e.skillScope === "category"
        ? (ui.catLabels?.[e.skillCategory] ?? e.skillCategory ?? "—")
        : e.skillScope === "specific"
          ? affectedSkillItems.map(i=>getDisplayItemName(i,uiLang)).join(", ") || "—"
          : ({none:"—",all:isTh?"ทุกทักษะ":"All skills",visual:isTh?"ทักษะการมองเห็น":"Visual skills"})[e.skillScope] ?? "—";
      return {...e, name:uiLang==='en'?(e.nameEn||e.name):(e.nameTh||e.name), scopeLabel,
        characteristicLabel:e.characteristic?.toUpperCase() || "—",
        signedStat:Number(e.statModifier)>0?`+${e.statModifier}`:String(e.statModifier),
        signedSkill:Number(e.skillModifier)>0?`+${e.skillModifier}`:String(e.skillModifier)
      };
    });
    context.ageDeltas = characteristicAdjustments(sys);
    context.ageBreakdown = agePenaltyBreakdown(sys.startingAge, sys.age, sys.applyAgingRules, sys.agingPriority);
    context.startingAgeForEdit = sys.startingAge ?? sys.age;
    context.ageRulePreview = context.ageBreakdown.total;
    context.agePenaltySummary = Object.entries(context.ageRulePreview).filter(([,n])=>n<0).map(([k,n])=>`${k.toUpperCase()} ${n}`).join(" · ");
    context.ageAfterStartSummary = Object.entries(context.ageBreakdown.afterStart).filter(([,n])=>n<0).map(([k,n])=>`${k.toUpperCase()} ${n}`).join(" · ");
    const configuredUnits=String(game.settings.get("brp-uge","currencyUnits") || "").split("|").map(x=>x.trim()).filter(Boolean);
    const savedUnits=(sys.currency ?? []).map(c=>c.unit);
    context.currencyRows=[...new Set([...configuredUnits,...savedUnits])].map(unit=>({unit,amount:Number((sys.currency??[]).find(c=>c.unit===unit)?.amount??0)}));
    const jobs=this.document.items.filter(i=>i.type==="occupation");
    context.occupationItems=await Promise.all(jobs.map(async i=>({
      id:i.id,name:getDisplayItemName(i,uiLang),
      wealth:i.system.wealthEnabled ? wealthDisplayFromItem(await resolveWealthItem(i.system.wealthRef),uiLang) : "",
      active:i.id===(sys.activeOccupationId||jobs[0]?.id)
    })));
    context.displayOccupation=context.occupationItems.find(j=>j.active)?.name || "";
    context.activeWealth=context.occupationItems.find(j=>j.active)?.wealth || "";
    context.isNotesTab = this.tabGroups.primary === "notes";
    context.isGearTab = this.tabGroups.primary === "inventory";
    context.noteFilter = this.#noteFilter;
    context.advancementLog = [...(sys?.advancementLog ?? [])].map(entry => ({
      ...entry,
      itemDisplay: (this.document.items.get(entry.itemId) ? getDisplayItemName(this.document.items.get(entry.itemId), uiLang) : entry.itemName) ?? "(Deleted)",
      isPower: entry.itemType === "power",
      positive: Number(entry.points) > 0,
      negative: Number(entry.points) < 0
    }));
    context.journalEntries = [...(sys?.journalEntries ?? [])];
    context.legacyNotes = String(sys?.notes || "");

    const severityLabels = {
      minor: isTh ? "บาดแผลทั่วไป" : "Minor",
      major: isTh ? "บาดแผลฉกรรจ์" : "Major",
      bleeding: isTh ? "เลือดไหลต่อเนื่อง" : "Bleeding"
    };
    const kindLabels = {
      temporary: isTh ? "เสียสติชั่วคราว" : "Temporary",
      indefinite: isTh ? "เสียสติระยะยาว" : "Indefinite",
      phobia: isTh ? "โรคกลัว / ย้ำคิด" : "Phobia / Mania"
    };
    context.woundsList = (sys?.wounds ?? []).map((w) => ({
      ...w,
      recoveryRemaining: Math.max(0, Number(w.hpLost ?? 0) - Number(w.recoveryHp ?? 0)),
      severityLabel: severityLabels[w.severity] ?? w.severity,
      majorLossSummary: Object.entries(w.majorLosses ?? {}).filter(([,v])=>Number(v)>0).map(([k,v])=>`${k.toUpperCase()} −${v}`).join(" · ")
    }));
    context.insanitiesList = (sys?.insanities ?? []).map((c) => ({
      ...c,
      kindLabel: kindLabels[c.kind] ?? c.kind
    }));
    context.activeWoundsCount = context.woundsList.filter((w) => !w.healed).length;
    context.activeInsanitiesCount = context.insanitiesList.filter((c) => !c.cured).length;
    context.totalIssueCount = context.activeWoundsCount + context.activeInsanitiesCount;

    const catBonuses = sys?.derived?.categoryBonuses ?? {};
    const skillsMap = {
      combat: { key: "combat", label: ui.catLabels.combat, bonus: catBonuses.combat ?? 0, items: [] },
      communication: { key: "communication", label: ui.catLabels.communication, bonus: catBonuses.communication ?? 0, items: [] },
      manipulation: { key: "manipulation", label: ui.catLabels.manipulation, bonus: catBonuses.manipulation ?? 0, items: [] },
      mental: { key: "mental", label: ui.catLabels.mental, bonus: catBonuses.mental ?? 0, items: [] },
      perception: { key: "perception", label: ui.catLabels.perception, bonus: catBonuses.perception ?? 0, items: [] },
      physical: { key: "physical", label: ui.catLabels.physical, bonus: catBonuses.physical ?? 0, items: [] }
    };

    context.weapons = [];
    context.armor = [];
    context.powers = [];
    context.passions = [];
    context.gear = [];
    let checkedCount = 0;
    const presentItem = (item) => ({
      id: item.id, name: item.name, img: getThemedBRPIcon(item), type: item.type, system: item.system,
      localizedTooltip: `${getDisplayItemName(item, uiLang) !== getLocalizedName(item, uiLang)
        ? `${isTh ? "ชื่อกฎ" : "Rules"}: ${getLocalizedName(item, uiLang)} — ` : ""}${getItemTooltip(item.system, getTooltipLanguage())}`.slice(0,750),
      displayName: getDisplayItemName(item, uiLang),
      canonicalName: getLocalizedName(item, uiLang),
      isFlavored: getDisplayItemName(item, uiLang) !== getLocalizedName(item, uiLang),
      englishName: item.system?.nameEn || item.name,
      showEnglishName: uiLang==='th' && !String(item.system?.flavorNameTh ?? '').trim() && !!(item.system?.nameEn || item.name) && getLocalizedName(item,'th') !== (item.system?.nameEn||item.name),
      resolvedMode: item.type === "power" ? powerMode(item.system) : "",
      canCheckImprovement: item.type === "power" ? powerMode(item.system) === "skill" : false,
      previewChance: item.type === "power" ? powerChance(item, this.document) : 0
    });

    for (const item of this.document.items) {
      if (item.type === "skill") {
        const cat = item.system.category ?? "communication";
        if (skillsMap[cat]) skillsMap[cat].items.push(presentItem(item));
        if (item.system.checked) checkedCount++;
      } else if (item.type === "weapon" || item.type === "shield") {
        context.weapons.push(presentItem(item));
      } else if (item.type === "armor") {
        context.armor.push(presentItem(item));
      } else if (item.type === "power") {
        if (!isPowerSystemEnabled(item.system.system)) continue;
        context.powers.push(presentItem(item));
        if (item.system.checked) checkedCount++;
      } else if (item.type === "passion") {
        context.passions.push(presentItem(item));
      } else if (item.type === "gear") {
        context.gear.push(presentItem(item));
      }
    }

    for (const group of Object.values(skillsMap)) {
      group.items.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }

    context.showSkillCategoryBonuses = rules.categoryBonusMode !== 'none';
    context.showSkillCategoryBonusColumn = shouldShowCategoryColumn(rules.categoryBonusMode,Object.values(skillsMap).filter(group=>group.items.length));
    context.skillGroups = Object.values(skillsMap);
    context.hiddenPowerCount = this.document.items.filter(i=>i.type==="power" && !isPowerSystemEnabled(i.system.system)).length;
    // Keep display budgets identical to the character creation Wizard.
    const budgets=creationBudgets({level:rules.powerLevel,useEdu:rules.useEdu,
      occupationBudgetMethod:rules.occupationBudgetMethod,
      edu:Number(sys.characteristics?.edu?.value??10),int:Number(sys.characteristics?.int?.value??10),
      age:sys.age,ageReference:sys.ageReference,increasedPersonal:rules.increasedPersonalSkillPoints});
    const occBudget=budgets.profession;
    const persBudget=budgets.personal;
    const allocatable = this.document.items.filter(item => item.type === "skill" || (item.type === "power" && powerMode(item.system) === "skill"));
    const occUsed = allocatable.reduce((sum, item) => sum + Number(item.system.occupationBonus || 0), 0);
    const persUsed = allocatable.reduce((sum, item) => sum + Number(item.system.personalBonus || 0), 0);
    context.occBudget = occBudget;
    context.persBudget = persBudget;
    context.occRemaining = occBudget - occUsed;
    context.persRemaining = persBudget - persUsed;
    context.occUsed = occUsed;
    context.persUsed = persUsed;
    context.inventoryCount = context.weapons.length + context.armor.length + context.gear.length;
    context.equippedWeapons = context.weapons.filter(w => w.system.equipped);
    context.equippedArmor = context.armor.filter(a => a.system.equipped);
    context.occOverBudget = context.occRemaining < 0;
    context.persOverBudget = context.persRemaining < 0;
    const sourceSkills=context.editMode && (context.isSkillsTab || this.document.type==='npc')
      ? await getLibraryDocuments({types:['skill']}) : [];
    const families=availableSpecialtyFamilies(sourceSkills);
    this._specialtyRegistry=buildSpecialtyRegistry(sourceSkills,
      game.settings.get("brp-uge","specialtyRegistry"),game.settings.get("brp-uge","specialtyPresets"));
    const familyChoices=families.map(f=>({
      uuid:`family:${encodeURIComponent(f.key)}`,
      familyKey:f.key,
      label:`${isTh?f.thFamily:f.enFamily} — ${isTh?'เพิ่ม Specialty':'New Specialty'} (${f.enFamily})`
    }));
    const hiddenSources=new Set(this._specialtyRegistry.flatMap(f=>f.options.filter(o=>o.hidden).map(o=>o.sourceUuid)).filter(Boolean));
    const exactChoices=sourceSkills.filter(skill=>!hiddenSources.has(skill.uuid)).map(skill=>({
      uuid:skill.uuid,
      label:`${getDisplayItemName(skill,uiLang)} — ${skill.system.baseFormula || `${skill.system.base??0}%`}`
    }));
    context.skillCatalog=[...familyChoices,...exactChoices];
    context.hasSpecialtyFamilies=families.length>0;
    context.checkedCount = checkedCount;
    context.hasSkills = this.document.items.some((i) => i.type === "skill");
    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    applyBRPControlLanguage(this.element);
    // Specialty-specific controls are shown only after a family is chosen.
    for(const bar of this.element.querySelectorAll('.skill-add-bar')){
      const source=bar.querySelector('select[data-skill-catalog]');
      const specialtyUI=bar.querySelector('[data-specialty-controls]');
      const choice=bar.querySelector('select[data-specialty-choice]');
      const customInputs=bar.querySelector('[data-specialty-custom]');
      if(!source||!specialtyUI||!choice)continue;
      const presets=readSpecialtyPresets(game.settings.get('brp-uge','specialtyPresets'));
      const registry=this._specialtyRegistry??[];
      const isTh=game.settings.get('brp-uge','uiLanguage')!=='en';
      const toggleCustom=()=>{if(customInputs)customInputs.hidden=choice.value!=='custom';};
      source.addEventListener('change',()=>{
        const raw=source.value;
        const familyKey=raw.startsWith('family:')?decodeURIComponent(raw.slice(7)):'';
        specialtyUI.hidden=!familyKey;
        choice.replaceChildren();
        if(!familyKey)return;
        choice.add(new Option(isTh?'เลือก Specialty…':'Choose Specialty…',''));
        const group=registry.find(f=>f.key===familyKey);
        // The effective menu includes real source Skills and editable World overlays.
        for(const p of group?.options.filter(o=>!o.hidden)??[]){
          const option=new Option(isTh?(p.th||p.en):p.en,p.en);
          option.dataset.th=p.th||p.en;
          choice.add(option);
        }
        if(game.user?.isGM || game.settings.get('brp-uge','specialtyCustomPolicy')==='approval')
          choice.add(new Option(isTh?'+ ระบุเอง (GM อนุมัติ)':'+ Custom (GM approval)','custom'));
        choice.value='';toggleCustom();
      });
      choice.addEventListener('change',toggleCustom);
      source.dispatchEvent(new Event('change'));
    }
    // Inline editing for embedded items (skill rank, armor AP, passion %, gear qty)
    this.element.querySelectorAll("[data-item-field]").forEach((input) => {
      input.addEventListener("change", async (ev) => {
        const el = ev.currentTarget;
        const itemId = el.closest("[data-item-id]")?.dataset.itemId;
        const field = el.dataset.itemField;
        const item = this.document.items.get(itemId);
        if (!item || !field) return;
        const val = el.type === "number" ? Number(el.value || 0) : el.value;
        await item.update({ [field]: val });
      });
    });

    this.element.querySelectorAll("input[data-currency-unit]").forEach(input=>{
      input.addEventListener("change",ev=>BRPActorSheet.#onUpdateCurrency.call(this,ev,ev.currentTarget)
        .catch(err=>ui.notifications?.error(err.message)));
    });
    const noteInput = this.element.querySelector("input[data-note-filter]");
    const applyNoteFilter = () => {
      const q = this.#noteFilter.trim().toLocaleLowerCase();
      for (const card of this.element.querySelectorAll("[data-note-search]")) {
        card.hidden = Boolean(q && !String(card.dataset.noteSearch || "").toLocaleLowerCase().includes(q));
      }
    };
    noteInput?.addEventListener("input", (event) => {
      this.#noteFilter = event.currentTarget.value;
      if (!event.isComposing) applyNoteFilter();
    });
    noteInput?.addEventListener("compositionend", (event) => {
      this.#noteFilter = event.currentTarget.value;
      applyNoteFilter();
    });
    applyNoteFilter();

    // Live skill filter (without stealing focus or causing scroll reset)
    const skillSearch = this.element.querySelector("input[data-skill-filter]");
    const applySkillFilter = (query) => {
      const q = String(query || "").trim().toLowerCase();
      this.element.querySelectorAll(".skill-category-block").forEach((block) => {
        let visibleCount = 0;
        block.querySelectorAll(".item-row[data-skill-name]").forEach((row) => {
          const haystack = `${row.dataset.skillName || ""} ${row.dataset.skillDesc || ""}`.toLowerCase();
          const match = !q || haystack.includes(q);
          row.style.display = match ? "" : "none";
          if (match) visibleCount++;
        });
        block.style.display = visibleCount > 0 || !q ? "" : "none";
      });
    };
    if (skillSearch) {
      if (this.#skillFilter) applySkillFilter(this.#skillFilter);
      skillSearch.addEventListener("input", (ev) => {
        this.#skillFilter = ev.target.value;
        applySkillFilter(this.#skillFilter);
      });
    }

    // Resistance Roll live inputs without full sheet reload glitches
    const activeInput = this.element.querySelector("input[data-resist='active']");
    const passiveInput = this.element.querySelector("input[data-resist='passive']");
    const activeStatSel = this.element.querySelector("select[data-resist='activeStat']");
    const targetStatSel = this.element.querySelector("select[data-resist='targetStat']");
    const labelInput = this.element.querySelector("input[data-resist='label']");
    const chanceBadge = this.element.querySelector(".resist-chance-val");

    const updateResistPreview = () => {
      const chance = Math.clamp(50 + (this.#resistActive - this.#resistPassive) * 5, 1, 99);
      if (chanceBadge) chanceBadge.textContent = `${chance}%`;
    };

    activeStatSel?.addEventListener("change", (ev) => {
      this.#resistActiveStat = ev.target.value;
      this.#resistActive = Number(this.document.system.characteristics?.[this.#resistActiveStat]?.value ?? 10);
      if (activeInput) activeInput.value = String(this.#resistActive);
      this.#resistLabel = `${this.#resistActiveStat.toUpperCase()} vs ${this.#resistTargetStat.toUpperCase()} ต้านทานพลัง`;
      if (labelInput) labelInput.value = this.#resistLabel;
      updateResistPreview();
    });

    targetStatSel?.addEventListener("change", (ev) => {
      this.#resistTargetStat = ev.target.value;
      this.#resistPassiveOverride = false;
      const targetActor = Array.from(game.user?.targets ?? [])[0]?.actor;
      if (targetActor) {
        this.#resistPassive = Number(targetActor.system?.characteristics?.[this.#resistTargetStat]?.value ?? 10);
        if (passiveInput) passiveInput.value = String(this.#resistPassive);
      }
      this.#resistLabel = `${this.#resistActiveStat.toUpperCase()} vs ${this.#resistTargetStat.toUpperCase()} ต้านทานพลัง`;
      if (labelInput) labelInput.value = this.#resistLabel;
      updateResistPreview();
    });

    activeInput?.addEventListener("input", (ev) => {
      this.#resistActive = Number(ev.target.value || 0);
      updateResistPreview();
    });
    passiveInput?.addEventListener("input", (ev) => {
      this.#resistPassiveOverride = true;
      this.#resistPassive = Number(ev.target.value || 0);
      updateResistPreview();
    });
    labelInput?.addEventListener("input", (ev) => {
      this.#resistLabel = ev.target.value;
    });
  }

  static #onSwitchTab(event, target) {
    event.preventDefault();
    this.tabGroups.primary = target.dataset.tab;
    this.render();
  }

  static #onOpenSkillPointsEditor(event) {
    event.preventDefault();
    if(!this.document.isOwner){ui.notifications.warn('You do not have permission to edit this Actor');return;}
    new BRPSkillPointsEditor({actor:this.document}).render(true);
  }

  static #onToggleEdit(event) {
    event.preventDefault();
    this.#editMode = !this.#editMode;
    this.render();
  }

  static async #onTogglePaperTheme(event) {
    event.preventDefault();
    const current = game.brp?.appearance?.getTheme?.() ?? 'light';
    await game.brp?.appearance?.setTheme?.(current === 'light' ? 'dark' : 'light');
  }

  static async #onConfigureStartingSkills(event) {
    event.preventDefault();
    if(game.user?.isGM)await game.brp?.configureStartingSkills?.();
  }

  static #onOpenWizard(event) {
    event.preventDefault();
    game.brp.openWizard(this.document);
  }

  static #onToggleResistance(event) {
    event.preventDefault();
    this.#resistanceOpen = !this.#resistanceOpen;
    if (this.#resistanceOpen) {
      this.#resistPassiveOverride = false;
      this.#resistActive = Number(this.document.system.characteristics?.[this.#resistActiveStat]?.value ?? 10);
      const targetActor = Array.from(game.user?.targets ?? [])[0]?.actor;
      if (targetActor) {
        this.#resistPassive = Number(targetActor.system?.characteristics?.[this.#resistTargetStat]?.value ?? 10);
      }
    }
    this.render();
  }

  static #onPullTargetResistStat(event) {
    event.preventDefault();
    const targetActor = Array.from(game.user?.targets ?? [])[0]?.actor;
    if (!targetActor) {
      ui.notifications.warn("กรุณา Target โทเคนเป้าหมาย (กด T บนโทเคน) ก่อนดึงค่าสถานะ");
      return;
    }
    this.#resistPassiveOverride = false;
    this.#resistPassive = Number(targetActor.system?.characteristics?.[this.#resistTargetStat]?.value ?? 10);
    this.render();
  }

  static async #onRollResistance(event) {
    event.preventDefault();
    const targetActor = Array.from(game.user?.targets ?? [])[0]?.actor;
    const contestTitle = targetActor
      ? `${this.#resistLabel || "Resistance Roll"} → ${targetActor.name}`
      : this.#resistLabel || "Resistance Roll";
    await BRPRolls.rollResistance(this.#resistActive, this.#resistPassive, contestTitle, this.document);
  }

  static async #onRollSanity(event) {
    event.preventDefault();
    await BRPRolls.rollSanity(this.document);
  }

  static async #onRecoverPool(event, target) {
    event.preventDefault();
    const action = target.dataset.recover;
    if (action && typeof this.document.recoverPool === "function") {
      await this.document.recoverPool(action);
    }
  }

  static async #onAddWound(event) {
    event.preventDefault();
    const { DialogV2 } = foundry.applications.api;
    await DialogV2.wait({
      window: { title: `บันทึกบาดแผลใหม่ — ${this.document.name}` },
      content: `
        <form class="brp-macro-form">
          <div class="form-group"><label>อาการบาดเจ็บ</label><input type="text" name="title" list="brp-wound-presets" value="" placeholder="เลือกหรือพิมพ์ใหม่" /><datalist id="brp-wound-presets">${game.settings.get("brp-uge", "woundSuggestions").split("|").map(s=>s.trim()).filter(Boolean).map(s=>`<option value="${escapeForChat(s)}"></option>`).join("")}</datalist></div>
          <div class="form-group">
            <label>ความรุนแรง</label>
            <select name="severity">
              <option value="minor">บาดแผลทั่วไป (Minor)</option>
              <option value="major">บาดแผลฉกรรจ์ (Major Wound)</option>
              <option value="bleeding">เลือดไหลต่อเนื่อง (Bleeding)</option>
            </select>
          </div>
          <div class="form-group"><label>HP ที่เสีย (ระบบจะหักจาก HP อัตโนมัติ)</label><input type="number" name="hpLost" value="3" min="0" /></div>
          <div class="form-group"><label>ตำแหน่งร่างกาย</label><input type="text" name="location" list="brp-body-presets" value="" placeholder="เลือกหรือพิมพ์ใหม่" /><datalist id="brp-body-presets">${game.settings.get("brp-uge", "bodySuggestions").split("|").map(s=>s.trim()).filter(Boolean).map(s=>`<option value="${escapeForChat(s)}"></option>`).join("")}</datalist></div>
          <div class="form-group"><label>หมายเหตุ</label><input type="text" name="notes" value="" /></div>
        </form>
      `,
      buttons: [
        {
          action: "save",
          label: "บันทึกบาดแผล",
          default: true,
          callback: async (_ev, button) => {
            const f = button.form;
            await this.document.addWound({
              title: f.elements.title.value,
              severity: f.elements.severity.value,
              hpLost: Number(f.elements.hpLost.value || 0),
              location: f.elements.location.value,
              notes: f.elements.notes.value
            });
          }
        }
      ]
    });
  }

  static async #onTreatCondition(event, target) {
    event.preventDefault();
    const method = target.dataset.method || "firstAid";
    const th = game.settings.get("brp-uge", "uiLanguage") !== "en";
    const actor = this.document;
    const woundMethod = method !== "psychotherapy";
    const conditions = woundMethod ? (actor.system.wounds ?? []).filter(w => !w.healed) :
      (actor.system.insanities ?? []).filter(c => !c.cured);
    const healers = game.actors.filter(a => game.user.isGM || a.isOwner);
    const esc = escapeForChat;
    const options = conditions.map(c => `<option value="${esc(c.id)}">${esc(c.title)}${woundMethod ? ` (−${c.hpLost} HP)` : ""}</option>`).join("");
    const healerChoices = healers.map(a => `<option value="${esc(a.id)}" ${a.id===actor.id ? "selected" : ""}>${esc(a.name)}</option>`).join("");
    const noConditions = !conditions.length;
    if (method !== "natural" && noConditions) return ui.notifications.warn(th ? "ไม่มีอาการที่ยังค้างอยู่" : "No unresolved conditions");
    const details = method === "firstAid"
      ? "First Aid: 1 ครั้ง/บาดแผล · Success 1D3 · Special 2D3 · Critical 3+1D3 · Fumble −1 HP"
      : method === "medicine" ? "Medicine: ทดสอบทักษะ; Success ฟื้น 1D3 HP หรือเร่งฟื้นตามธรรมชาติเป็น 2D3/สัปดาห์"
      : method === "psychotherapy" ? "Psychotherapy: 4–5 ชม./เดือน/อาการ · Success ฟื้น 1D3−1 SAN (ต้องรักษาต่อเนื่อง)"
      : "Natural Recovery: ฟื้น 1D3 HP ต่อสัปดาห์ตามสภาพแวดล้อม; GM เป็นผู้กำหนดช่วงเวลา";
    const form = await foundry.applications.api.DialogV2.input({
      window: { title: `${th ? "การรักษาและฟื้นฟู" : "Treatment & Recovery"} — ${actor.name}` },
      modal: true, rejectClose: false,
      content: `<div class="brp-macro-form brp-care-dialog">
        <p>${esc(details)}</p>
        ${conditions.length ? `<label>${th ? "อาการ / บาดแผล" : "Condition"}</label><select name="targetId">${options}</select>` : '<input type="hidden" name="targetId" value="" />'}
        ${method !== "natural" ? `<label>${th ? "ผู้รักษา (ทอยทักษะของบุคคลนี้)" : "Healer (roll their skill)"}</label><select name="healerId">${healerChoices}</select>` : ""}
        ${method === "medicine" ? `<label>${th ? "ผลที่ต้องการ" : "Treatment goal"}</label><select name="choice"><option value="heal">รักษา HP</option><option value="accelerate">เร่งการฟื้นตามธรรมชาติ (2D3/สัปดาห์)</option><option value="endAccelerate">ยุติการดูแลเร่งฟื้น (ไม่ต้องทอย)</option></select>` : ""}
        ${method === "natural" ? `<label>${th ? "การแสดงผลการฟื้นฟู" : "Recovery visibility"}</label><select name="messageMode"><option value="public">สาธารณะ</option><option value="gm">เฉพาะ GM</option><option value="blind">ลับถึง GM</option><option value="self">เฉพาะตนเอง</option></select>` : ""}
      </div>`, ok: {label: th ? "ดำเนินการ" : "Continue"}
    });
    if (!form) return;
    const targetId = String(form.targetId ?? "");
    const selectedWound = (actor.system.wounds ?? []).find(w => w.id === targetId);
    if (method === "firstAid" && selectedWound?.firstAidAttempted) return ui.notifications.warn("บาดแผลนี้ผ่าน First Aid ไปแล้ว");
    const healer = method !== "natural" ? (game.actors.get(String(form.healerId)) ?? actor) : null;
    const matchNames = {
      firstAid: ["First Aid","ปฐมพยาบาล"], medicine: ["Medicine","แพทยศาสตร์","การแพทย์"],
      psychotherapy: ["Psychotherapy","จิตบำบัด","จิตเวช","บำบัดจิต"]
    };
    if (method === "medicine" && form.choice === "endAccelerate") {
      await actor.unsetFlag("brp-uge", "medicineFastHealing");
      return ui.notifications.info(th ? "สิ้นสุดการดูแลเร่งฟื้นแล้ว" : "Accelerated recovery ended");
    }
    let result = method === "natural" ? {messageMode: String(form.messageMode || "public")} : null;
    if (method !== "natural") {
      const skill = healer.items.find(s => s.type === "skill" && matchNames[method].some(k => getSkillNameMatches(s,k) || String(s.system.description??"").includes(k)));
      const baseTarget = skill ? Number(skill.system.total ?? skill.system.base ?? 0) : ({firstAid:30,medicine:5,psychotherapy:1})[method];
      result = await BRPRolls.rollSkill({ actor: healer, skillId: skill?.id,
        title: `${esc(getDisplayItemName(skill, getNameLanguage()) || method)} → ${esc(actor.name)}`,
        subtitle: details, baseTarget });
      if (!result) return;
    }
    try { await actor.applyCare({method, healer, targetId, rollResult: result, choice: String(form.choice ?? "heal")}); }
    catch(err) { ui.notifications.error(err.message ?? String(err)); }
  }

  static async #onToggleHealWound(event, target) {
    event.preventDefault();
    const id = target.dataset.woundId;
    if (id) await this.document.toggleHealWound(id);
  }

  static async #onDeleteWound(event, target) {
    event.preventDefault();
    const id = target.dataset.woundId;
    if (id) await this.document.deleteWound(id);
  }

  static async #onRollMajorWound(event, target) {
    event.preventDefault();
    await BRPRolls.rollMajorWound(this.document, target?.dataset?.woundId || null);
  }

  static async #onAddInsanity(event) {
    event.preventDefault();
    const { DialogV2 } = foundry.applications.api;
    await DialogV2.wait({
      window: { title: `บันทึกอาการทางจิต / เสียสติ — ${this.document.name}` },
      content: `
        <form class="brp-macro-form">
          <div class="form-group"><label>ชื่ออาการ / โรคกลัว</label><input type="text" name="title" list="brp-mental-presets" value="" placeholder="เลือกหรือพิมพ์ใหม่" /><datalist id="brp-mental-presets">${game.settings.get("brp-uge", "mentalSuggestions").split("|").map(s=>s.trim()).filter(Boolean).map(s=>`<option value="${escapeForChat(s)}"></option>`).join("")}</datalist></div>
          <div class="form-group">
            <label>ประเภท</label>
            <select name="kind">
              <option value="temporary">เสียสติชั่วคราว (Temporary)</option>
              <option value="indefinite">เสียสติระยะยาว (Indefinite)</option>
              <option value="phobia">โรคกลัว / ย้ำคิด (Phobia / Mania)</option>
            </select>
          </div>
          <div class="form-group"><label>SAN ที่เสีย (ระบบจะหักจาก SAN อัตโนมัติ)</label><input type="number" name="sanLost" value="5" min="0" /></div>
          <div class="form-group"><label>ระยะเวลา</label><input type="text" name="duration" value="1D10 ชั่วโมง" /></div>
          <div class="form-group"><label>หมายเหตุ</label><input type="text" name="notes" value="" /></div>
        </form>
      `,
      buttons: [
        {
          action: "save",
          label: "บันทึกอาการ",
          default: true,
          callback: async (_ev, button) => {
            const f = button.form;
            await this.document.addInsanity({
              title: f.elements.title.value,
              kind: f.elements.kind.value,
              sanLost: Number(f.elements.sanLost.value || 0),
              duration: f.elements.duration.value,
              notes: f.elements.notes.value
            });
          }
        }
      ]
    });
  }

  static async #onToggleCureInsanity(event, target) {
    event.preventDefault();
    const id = target.dataset.condId;
    if (id) await this.document.toggleCureInsanity(id);
  }

  static async #onDeleteInsanity(event, target) {
    event.preventDefault();
    const id = target.dataset.condId;
    if (id) await this.document.deleteInsanity(id);
  }

  static async #onStepActorValue(event, target) {
    event.preventDefault();
    const path = target.dataset.path;
    if (!path) return;
    const baseDelta = Number(target.dataset.delta || 0);
    const step = event.shiftKey ? baseDelta * 5 : baseDelta;
    const min = target.dataset.min !== undefined ? Number(target.dataset.min) : -999;
    const max = target.dataset.max !== undefined ? Number(target.dataset.max) : 999;
    const current = Number(foundry.utils.getProperty(this.document, path) ?? 0);
    const next = Math.clamp(current + step, min, max);
    await this.document.update({ [path]: next });
  }

  static async #onStepItemValue(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const field = target.dataset.itemPath;
    const item = this.document.items.get(itemId);
    if (!item || !field) return;
    const baseDelta = Number(target.dataset.delta || 0);
    const step = event.shiftKey ? baseDelta * 5 : baseDelta;
    const min = target.dataset.min !== undefined ? Number(target.dataset.min) : 0;
    const max = target.dataset.max !== undefined ? Number(target.dataset.max) : 999;
    const current = Number(foundry.utils.getProperty(item, field) ?? 0);
    const next = Math.clamp(current + step, min, max);
    await item.update({ [field]: next });
  }

  static #onOpenCompendium(event, target) {
    event.preventDefault();
    const category = target.dataset.category || "skills";
    game.brp.openCompendium({ actor: this.document, category });
  }

  static async #onAddCatalogSkill(event,target) {
    event.preventDefault();
    const bar=target.closest('.skill-add-bar')??this.element;
    const ref=bar.querySelector('select[data-skill-catalog]')?.value;
    const th=game.settings.get('brp-uge','uiLanguage')!=='en';
    if(!ref)return ui.notifications.warn(th?'เลือกทักษะจากคลังข้อมูลก่อน':'Select an installed Skill first');
    let data;
    if(ref.startsWith('family:')){
      const familyKey=decodeURIComponent(ref.slice(7));
      const families=availableSpecialtyFamilies(await getLibraryDocuments({types:['skill']}));
      const family=families.find(f=>f.key===familyKey);
      if(!family)return ui.notifications.warn(th?'ไม่พบกลุ่มทักษะจากคลัง':'Skill family is unavailable');
      const select=bar.querySelector('select[data-specialty-choice]');
      const value=select?.value||'';
      if(!value)return ui.notifications.warn(th?'กรุณาเลือกหรือกรอก Specialty':'Choose or enter a specialty');
      const english=value==='custom'
        ? bar.querySelector('[data-custom-specialty-en]')?.value?.trim() : value;
      const thai=value==='custom'
        ? bar.querySelector('[data-custom-specialty-th]')?.value?.trim() : select.selectedOptions?.[0]?.dataset.th;
      if(!english)return ui.notifications.warn(th?'กรอกชื่ออังกฤษอ้างอิงของ Specialty':'An English reference is required');
      const registry=buildSpecialtyRegistry(await getLibraryDocuments({types:['skill']}),
        game.settings.get('brp-uge','specialtyRegistry'),game.settings.get('brp-uge','specialtyPresets'));
      const group=registry.find(f=>f.key===familyKey);
      const existing=group?.options.find(o=>o.en===english&&!o.hidden);
      if(value==='custom'&&!game.user?.isGM)
        return ui.notifications.warn(th?'โปรดให้ GM อนุมัติ Specialty ก่อน':'Ask the GM to approve this Specialty first');
      if(value!=='custom'&&!existing)
        return ui.notifications.warn(th?'ตัวเลือกนี้ไม่มีอยู่หรือถูกซ่อนแล้ว':'This Specialty is no longer available');
      const sourceItems=await getLibraryDocuments({types:['skill']});
      const template=(existing?specialtyTemplateFor(group,existing,sourceItems):sourceItems.find(d=>d.uuid===family.templateUuid));
      if(!template || template.type!=='skill')return ui.notifications.warn('A matching source Skill template is required');
      try {
        if(existing?.sourceUuid) data=documentToEmbeddedItem(template);
        else {const source=template;data=composeSpecialtyItem(source,family,{en:english,th:thai});}
      } catch(error){return ui.notifications.warn(error.message);}
    } else {
      const item=await fromUuid(ref).catch(()=>null);
      if(item?.type!=='skill')return ui.notifications.warn('Selected Skill is unavailable');
      data=documentToEmbeddedItem(item);
    }
    if(this.document.items.some(existing=>sameSkill(existing,data)))
      return ui.notifications.warn(th?'มีทักษะและ Specialty นี้แล้ว':'This Skill and Specialty already exists');
    // Never keep a template's ID: each specialty is its own embedded document.
    delete data._id;
    const [created]=await this.document.createEmbeddedDocuments('Item',[data]);
    if(created)ui.notifications.info(`${th?'เพิ่มทักษะแล้ว':'Added'}: ${getDisplayItemName(created,th?'th':'en')}`);
  }

  static async #onRunExp(event) {
    event.preventDefault();
    await game.brp.macros.experienceImprovement(this.document);
  }

  /** The name publishes a reference card; the numeric chance stays a roll action. */
  static async #onShareEntry(event, target) {
    event.preventDefault();
    const actor = this.document;
    const lang = game.settings.get("brp-uge", "uiLanguage") || "th";
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = itemId ? actor.items.get(itemId) : null;
    let card;
    if (item) {
      const name = getDisplayItemName(item, lang);
      const description = getItemTooltip(item.system, lang);
      let value = "";
      if (item.type === "skill") value = `${item.system.total ?? item.system.base ?? "—"}%`;
      if (item.type === "passion") value = `${item.system.value ?? 0}%`;
      if (item.type === "power" && powerMode(item.system) === "skill") value = `${powerChance(item, actor)}%`;
      card = buildShareEntryCard({ title: name, kind: item.type, description,
        value, actorName: actor.name, language: lang });
    } else if (target.dataset.char) {
      const key = String(target.dataset.char || "").toLowerCase();
      const rules = getCampaignRules();
      if (!Object.hasOwn(actor.system?.characteristics ?? {}, key) || (key === "edu" && !rules.useEdu)) return;
      const tips = BRP_CONFIG.charTooltips[lang] ?? BRP_CONFIG.charTooltips.th;
      const val = actor.system?.derived?.effectiveCharacteristics?.[key] ?? actor.system.characteristics[key]?.value ?? 0;
      card = buildShareEntryCard({ title: key.toUpperCase(), kind: lang === "th" ? "ค่าสถานะ" : "Characteristic",
        description: tips[key] ?? "", value: val, actorName: actor.name, language: lang });
    } else return;
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({actor}), content: card });
  }

  static #onRollChar(event, target) {
    event.preventDefault();
    const key = target.dataset.char;
    const uiLang = game.settings.get("brp-uge", "uiLanguage") || "th";
    const ui = BRP_CONFIG.ui[uiLang] ?? BRP_CONFIG.ui.th;
    const val = Number(this.document.system.derived?.effectiveCharacteristics?.[key] ?? this.document.system.characteristics[key]?.value ?? 10) * 5;
    BRPRolls.rollSkill({
      actor: this.document,
      title: `${ui.charRolls[key] ?? key.toUpperCase()} (${key.toUpperCase()}×5)`,
      baseTarget: val
    });
  }

  static #onRollSkill(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.document.items.get(itemId);
    if (!item) return;
    BRPRolls.rollSkill({
      actor: this.document,
      skillId: item.id,
      title: getDisplayItemName(item, getNameLanguage()),
      baseTarget: item.system.total ?? item.system.base,
      difficulty: item.system.statusDifficult ? "difficult" : "average"
    });
  }

  static async #onRollPower(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const power = this.document.items.get(itemId);
    if (!power) return;
    if (!isPowerSystemEnabled(power.system.system)) {
      return ui.notifications.warn("GM ปิดใช้พลังประเภทนี้ใน World Settings แล้ว / This power family is disabled by the GM");
    }
    const mode = powerMode(power.system);
    const systemName = String(power.system?.system || "Magic");
    const uiLang = game.settings.get("brp-uge", "uiLanguage") || "th";
    const caption = uiLang === "th" ? "ใช้พลัง" : "Power";
    const powerLabel = getDisplayItemName(power, uiLang);
    const actor = this.document;
    const targetActor = Array.from(game.user?.targets ?? [])[0]?.actor;
    if (systemName === "Magic" && mode === "skill") {
      try { await BRPRolls.castMagic(actor, power); }
      catch (err) { console.error("BRP UGE | spell casting failed",err); ui.notifications?.error(err.message); }
      return;
    }
    if (mode === "automatic") {
      await ChatMessage.implementation.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="brp-chat-card"><div class="card-header"><strong>${escapeForChat(caption)}: ${escapeForChat(powerLabel)}</strong></div><div class="card-actor">${escapeForChat(systemName)} · ${escapeForChat(power.system.costPP || "")} · ${uiLang === "th" ? "เกิดผลโดยอัตโนมัติ (GM พิจารณาต้นทุนและการต้านทาน)" : "Automatic activation (GM resolves costs and opposition)"}</div></div>`
      });
      return;
    }
    if (mode === "resistance") {
      if (!targetActor) return ui.notifications.warn(uiLang === "th" ? "กรุณา Target เป้าหมายเพื่อทอย Resistance" : "Target a token to roll Resistance");
      const powA = Number(actor.system?.characteristics?.pow?.value ?? 10);
      const powB = Number(targetActor.system?.characteristics?.pow?.value ?? 10);
      await BRPRolls.rollResistance(powA, powB, `${caption}: ${powerLabel} → ${targetActor.name}`, actor);
      return;
    }
    // Percentile-based powers can own a rating independent of the actor's skills.
    const total = powerChance(power, actor);
    await BRPRolls.rollSkill({
      actor, skillId: power.id,
      title: `${caption}: ${powerLabel}`,
      subtitle: `${systemName} · ${power.system.costPP || ""} · ${uiLang === "th" ? "โอกาส" : "Chance"} ${total}%`,
      baseTarget: total
    });
  }

  static #onRollPassion(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.document.items.get(itemId);
    if (!item) return;
    BRPRolls.rollSkill({
      actor: this.document,
      skillId: item.id,
      title: `แรงผลักดัน: ${getDisplayItemName(item, getNameLanguage())}`,
      baseTarget: item.system.value ?? 50
    });
  }

  static async #onRollWeapon(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const weapon = this.document.items.get(itemId);
    if (!weapon) return;

    const targetToken = Array.from(game.user?.targets ?? [])[0] ?? null;
    const targetActor = targetToken?.actor ?? null;
    const targetAp = targetActor?.getEquippedArmorPoints?.() ?? 0;
    const targetHp = targetActor?.system?.hp?.value ?? 0;
    const targetMaxHp = targetActor?.system?.hp?.max ?? 0;
    const targetDodge = targetActor
      ? targetActor.items.find(
          (i) => i.type === "skill" && (getSkillNameMatches(i,"dodge") || getSkillNameMatches(i,"หลบ"))
        )?.system?.total ?? Number(targetActor.system?.characteristics?.dex?.value ?? 10) * 2
      : null;
    const targetInfo = targetActor
      ? {
          name: targetActor.name,
          uuid: targetToken?.document?.uuid ?? "",
          ap: targetAp,
          hp: targetHp,
          hpMax: targetMaxHp,
          dodge: Number.isFinite(Number(targetDodge)) ? Number(targetDodge) : Number(targetActor.system?.characteristics?.dex?.value ?? 10) * 2
        }
      : null;

    const skillItem = findActorSkill(this.document, weapon.system.skillRef, weapon.system.skillName);
    const rawSkillTotal = skillItem?.system?.total;
    const skillTotal = Number(rawSkillTotal);
    // If a skill failed data preparation, never use an invalid percentile.
    const chance = skillItem
      ? (rawSkillTotal !== null && rawSkillTotal !== undefined && rawSkillTotal !== "" && Number.isFinite(skillTotal)
          ? skillTotal : Number(skillItem.system.base ?? 0))
      : 50;
    const res = await BRPRolls.rollSkill({
      actor: this.document,
      skillId: skillItem?.id,
      title: `โจมตีด้วยอาวุธ: ${getDisplayItemName(weapon, getNameLanguage())}`,
      subtitle: targetInfo
        ? `เป้าหมาย: ${targetInfo.name} (${targetInfo.ap} AP · HP ${targetInfo.hp}/${targetInfo.hpMax} · หลบหลีก ${targetInfo.dodge}%)`
        : "",
      baseTarget: chance
    });

    if (!res) return; // Roll confirmation was cancelled: no weapon damage.
    if (res.isSuccess) {
      const dm =
        weapon.system.dmMode === "full"
          ? this.document.system.derived?.damageModifier ?? "0"
          : weapon.system.dmMode === "half"
          ? this.document.system.derived?.halfDamageMod ?? "0"
          : "0";
      const baseDmg = String(weapon.system.damage || "1D6").trim();
      const dmgSpec = BRPRolls.computeWeaponDamageFormula(baseDmg, dm, res.degree);

      if (dmgSpec.isFixed) {
        await BRPRolls.renderDamageCard({
          attackerActor: this.document,
          weaponName: getDisplayItemName(weapon, getNameLanguage()),
          degree: res.degree,
          damageTotal: dmgSpec.fixedTotal,
          breakdown: `Max (${baseDmg}${dm !== "0" ? dm : ""}) ทะลุเกราะ`,
          specialType: weapon.system.specialType || "none",
          bypassArmor: true,
          targetInfo,
          messageMode: res.messageMode
        });
      } else if (Roll.validate(dmgSpec.formula)) {
        const dmgRoll = await new Roll(dmgSpec.formula).evaluate();
        await BRPRolls.renderDamageCard({
          attackerActor: this.document,
          weaponName: getDisplayItemName(weapon, getNameLanguage()),
          degree: res.degree,
          damageTotal: dmgRoll.total,
          breakdown: `${dmgSpec.formula} → ${dmgRoll.result}`,
          specialType: weapon.system.specialType || "none",
          bypassArmor: false,
          targetInfo,
          messageMode: res.messageMode
        });
      } else {
        await ChatMessage.implementation.create({
          speaker: ChatMessage.getSpeaker({ actor: this.document }),
          content: `<div class="brp-chat-card"><div class="brp-chat-kicker">WEAPON</div><strong>ความเสียหาย/ผลของ ${escapeForChat(getDisplayItemName(weapon,getNameLanguage()))}:</strong> ${escapeForChat(baseDmg)}</div>`,
          ...BRPRolls.chatVisibility(res.messageMode)
        });
      }
    }
  }

  static async #onToggleExp(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.document.items.get(itemId);
    if (item && ["skill", "power"].includes(item.type)) await item.update({ "system.checked": !item.system.checked });
  }

  static async #onToggleEquipped(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.document.items.get(itemId);
    if (item) await item.update({ "system.equipped": !item.system.equipped });
  }

  async #openStatusDialog(id=null) {
    const existing=(this.document.system.statusEffects??[]).find(e=>e.id===id) || {};
    const isTh=game.settings.get("brp-uge","uiLanguage")!=="en";
    const esc=escapeForChat;
    const options=(current, choices)=>choices.map(([value,label])=>`<option value="${esc(value)}" ${value===current?"selected":""}>${esc(label)}</option>`).join("");
    const charOptions=options(existing.characteristic||"",[["","—"],...Object.keys(this.document.system.characteristics).map(k=>[k,k.toUpperCase()])]);
    const allSkills = this.document.items.filter(i=>i.type==="skill");
    const selectedIds = new Set(Array.isArray(existing.skillIds) && existing.skillIds.length
      ? existing.skillIds : existing.skillId ? [existing.skillId] : []);
    for(const item of allSkills)if((existing.skillRefs??[]).some(ref=>itemMatchesReference(item,ref)))selectedIds.add(item.id);
    const categories = ["combat","communication","manipulation","mental","perception","physical"];
    const labels = BRP_CONFIG.ui[isTh?"th":"en"]?.catLabels ?? {};
    const categoryOptions = options(existing.skillCategory || "combat", categories.map(k=>[k,categoryLabel(k,getNameLanguage())]));
    const skillChecks = categories.map(cat => {
      const matches = allSkills.filter(item => (item.system.category || "communication") === cat)
        .sort((a,b)=>getDisplayItemName(a,getNameLanguage()).localeCompare(getDisplayItemName(b,getNameLanguage())));
      if (!matches.length) return "";
      return `<fieldset class="brp-status-check-group"><legend>${esc(labels[cat] || cat)}</legend>${matches.map(item=>
        `<label class="brp-status-skill-option"><input type="checkbox" name="skillChoice_${item.id}" ${selectedIds.has(item.id)?"checked":""}> <span>${esc(getDisplayItemName(item,getNameLanguage()))}</span></label>`
      ).join("")}</fieldset>`;
    }).join("");
    const f=await foundry.applications.api.DialogV2.input({
      window:{title:isTh?(id?"แก้ไขสถานะ":"เพิ่มสถานะ"):"Status effect"}, modal:true, rejectClose:false,
      content:`<div class="brp-macro-form brp-status-dialog">
      <label>${isTh?"ชื่อสถานะ":"Effect"}</label><input required name="name" value="${esc(isTh?(existing.nameTh||existing.name||''):(existing.nameEn||existing.name||''))}" placeholder="เช่น ตาบอดชั่วคราว / Aging" />
      <label>${isTh?"ที่มา":"Source"}</label><select name="source">${options(existing.source||"condition",[["condition","Condition"],["aging","Age"],["injury","Injury"],["equipment","Equipment"],["other","GM / Other"]])}</select>
      <label>${isTh?"ปรับค่าสถานะ":"Characteristic"}</label><select name="characteristic">${charOptions}</select>
      <label>${isTh?"แต้ม +/-":"Characteristic modifier"}</label><input type="number" name="statModifier" value="${Number(existing.statModifier||0)}" />
      <label>${isTh?"ทักษะที่มีผล":"Affected skills"}</label><select name="skillScope">${options(existing.skillScope||"none",[["none",isTh?"ไม่ส่งผลต่อทักษะ":"None"],["category",isTh?"ทั้งหมวดทักษะ":"Entire skill category"],["specific",isTh?"เลือกหลายทักษะ":"Selected skills (multiple)"],["visual",isTh?"ทักษะการมองเห็น":"Visual / sight-based"],["all",isTh?"ทุกทักษะ":"All skills"]])}</select>
      <label class="brp-status-category-field">${isTh?"หมวดทักษะ":"Skill category"}</label><div class="brp-status-category-field"><select name="skillCategory">${categoryOptions}</select></div>
      <div class="brp-status-skills-field"><div class="brp-status-skill-help">${isTh?"เลือกได้หลายรายการ และเลือกข้ามหมวดได้ (ใช้เมื่อเลือก 'เลือกหลายทักษะ')":"Check any number of skills across categories (when using selected skills)."}</div><div class="brp-status-skill-checklist">${skillChecks}</div></div>
      <label>${isTh?"แก้โอกาสสำเร็จ +/- (%)":"Skill modifier +/- (%)"}</label><input type="number" name="skillModifier" value="${Number(existing.skillModifier||0)}" />
      <label>${isTh?"ทำให้เช็คยาก (Difficult ÷2)":"Difficult checks (÷2)"}</label><input type="checkbox" name="makeDifficult" ${existing.makeDifficult?"checked":""} />
      <label>${isTh?"รายละเอียด":"Notes"}</label><textarea name="notes">${esc(existing.notes||"")}</textarea></div>`,
      ok:{label:isTh?"บันทึกสถานะ":"Save status"}
    });
    if (!f || !String(f.name||"").trim()) return;
    const checked = v => v === true || v === "on" || v === "true" || v === 1;
    const skillIds = allSkills.filter(item => checked(f[`skillChoice_${item.id}`])).map(i=>i.id);
    const all=foundry.utils.deepClone(this.document.system.statusEffects??[]);
    const obj={id:existing.id||foundry.utils.randomID(), name:String(f.name).trim().slice(0,120),
      source:String(f.source), active:existing.active??true, characteristic:String(f.characteristic||""),
      statModifier:Number(f.statModifier||0), skillScope:String(f.skillScope||"none"),
      skillId:skillIds[0]||"", skillIds,
      skillRefs:allSkills.filter(item=>skillIds.includes(item.id)).map(i=>itemReference(i)).filter(Boolean),
      nameTh:isTh?String(f.name).trim():(existing.nameTh||existing.name||''),
      nameEn:!isTh?String(f.name).trim():(existing.nameEn||existing.name||''),
      skillCategory:String(f.skillCategory||""),
      skillModifier:Number(f.skillModifier||0),
      makeDifficult:checked(f.makeDifficult), notes:String(f.notes||"").slice(0,600)};
    const idx=all.findIndex(e=>e.id===obj.id);if(idx>=0) all[idx]=obj;else all.push(obj);
    await this.document.update({"system.statusEffects":all});
  }
  static async #onCreateStatus(event) {event.preventDefault();await this.#openStatusDialog();}
  static async #onEditStatus(event,target) {event.preventDefault();await this.#openStatusDialog(target.closest("[data-status-id]")?.dataset.statusId);}
  static async #onToggleStatus(event,target) {
    event.preventDefault();const id=target.closest("[data-status-id]")?.dataset.statusId;
    const list=foundry.utils.deepClone(this.document.system.statusEffects??[]);
    const row=list.find(e=>e.id===id);if(!row)return;row.active=!row.active;
    await this.document.update({"system.statusEffects":list});
  }
  static async #onDeleteStatus(event,target) {
    event.preventDefault();const id=target.closest("[data-status-id]")?.dataset.statusId;
    await this.document.update({"system.statusEffects":(this.document.system.statusEffects??[]).filter(e=>e.id!==id)});
  }
  static async #onUpdateCurrency(event,target) {
    const unit=target.dataset.currencyUnit;if(!unit)return;
    const list=foundry.utils.deepClone(this.document.system.currency??[]);
    const idx=list.findIndex(row=>row.unit===unit);
    const value=Math.max(0,Math.floor(Number(target.value)||0));
    if(idx<0) list.push({unit,amount:value}); else list[idx].amount=value;
    await this.document.update({"system.currency":list});
  }
  static async #onActivateOccupation(event,target) {
    event.preventDefault();const id=target.closest("[data-item-id]")?.dataset.itemId;
    const job=this.document.items.get(id);
    if(!job || job.type!=="occupation") return;
    await this.document.update({"system.activeOccupationId":id});
  }
  static async #onChooseOccupation(event,target) {
    event.preventDefault();this.tabGroups.primary="status";await this.render();
  }

  static async #onCreateItem(event, target) {
    event.preventDefault();
    const type = target.dataset.type || "skill";
    const category = target.dataset.category || "communication";
    const defaults = {
      skill: { name: "ทักษะใหม่", type: "skill", system: { category, base: 5, rank: 0 } },
      weapon: { name: "อาวุธใหม่", type: "weapon", system: { damage: "1D6+1", length: "medium" } },
      armor: { name: "ชุดเกราะใหม่", type: "armor", system: { ap: 3, equipped: true } },
      shield: { name: "โล่ใหม่", type: "shield", system: { damage: "1D4", hp: { min: 0, value: 15, max: 15 } } },
      power: { name: "พลัง/เวทมนตร์ใหม่", type: "power", system: { system: "Magic", costPP: "1 PP" } },
      passion: { name: "แรงผลักดันใหม่", type: "passion", system: { value: 60 } },
      gear: { name: "อุปกรณ์ใหม่", type: "gear", system: { quantity: 1, weight: 1 } },
      occupation: { name: "อาชีพใหม่", type:"occupation", system:{nameTh:"อาชีพใหม่", nameEn:"Custom Occupation", wealthEnabled:false, wealthRef:"",skillRefs:[]} },
      wealth: {name:"ฐานะใหม่",type:"wealth",system:{nameTh:"ฐานะใหม่",nameEn:"New Wealth",tier:2}}
    };
    const itemData = defaults[type] ?? defaults.gear;
    itemData.img = getBRPIcon(itemData.type, itemData);
    const [created] = await this.document.createEmbeddedDocuments("Item", [itemData]);
    created?.sheet.render({ force: true });
  }

  static #onEditItem(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    this.document.items.get(itemId)?.sheet.render({ force: true });
  }

  static async #onDeleteItem(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    if (itemId) await this.document.deleteEmbeddedDocuments("Item", [itemId]);
  }

  /** Add or revise entries without writing into the skill's manual training value. */
  async #openAdvancementDialog(id = null, defaultItemId = null) {
    const existing = (this.document.system.advancementLog ?? []).find(row => row.id === id);
    const choices = this.document.items.filter(item => item.type === "skill" || item.type === "power");
    if (!choices.length) return ui.notifications.warn("กรุณาเพิ่มทักษะหรือพลังก่อนบันทึกการพัฒนา");
    const opts = choices.map(item => `<option value="${escapeForChat(item.id)}" ${item.id === (existing?.itemId || defaultItemId) ? "selected" : ""}>${escapeForChat(getDisplayItemName(item, getNameLanguage()))} (${item.type})</option>`).join("");
    await foundry.applications.api.DialogV2.wait({
      window: { title: existing ? "แก้ไขบันทึกการพัฒนา" : "บันทึกการพัฒนาใหม่" },
      content: `<div class="brp-macro-form brp-dialog-grid">
        <div class="form-group"><label>ทักษะหรือพลัง</label><select name="itemId">${opts}</select></div>
        <div class="form-group"><label>แต้มที่เปลี่ยน (+ เพิ่ม / − ลด)</label><input type="number" name="points" step="1" value="${existing?.points ?? 1}" /></div>
        <div class="form-group"><label>วันที่</label><input type="date" name="date" value="${escapeForChat(existing?.date || new Date().toISOString().slice(0,10))}" /></div>
        <div class="form-group"><label>เหตุผล / แหล่งที่มา</label><textarea name="reason" rows="3">${escapeForChat(existing?.reason ?? "")}</textarea></div>
      </div>`,
      buttons: [{ action: "save", label: "บันทึก", default: true,
        callback: async (_event, button) => {
          const f = button.form;
          await this.document.saveAdvancement({ id, itemId: f.elements.itemId.value,
            points: Number(f.elements.points.value), date: f.elements.date.value,
            reason: f.elements.reason.value, method: existing?.method || "manual" });
        }
      }]
    });
  }

  static async #onCreateAdvancement(event, target) { event.preventDefault(); await this.#openAdvancementDialog(null, target?.dataset?.itemId || null); }
  static async #onEditAdvancement(event, target) { event.preventDefault(); await this.#openAdvancementDialog(target.dataset.logId); }
  static async #onDeleteAdvancement(event, target) {
    event.preventDefault();
    const id = target.dataset.logId;
    const sure = await foundry.applications.api.DialogV2.confirm({ window: { title: "ลบบันทึกการพัฒนา" }, content: "ลบรายการนี้และปรับแต้มทักษะ/พลังตามทันที?" });
    if (sure) await this.document.deleteAdvancement(id);
  }

  async #openNoteDialog(id = null) {
    const notes = this.document.system.journalEntries ?? [];
    const note = notes.find(n => n.id === id);
    await foundry.applications.api.DialogV2.wait({
      window: { title: note ? "แก้ไขบันทึก" : "สร้างบันทึกใหม่" },
      content: `<div class="brp-macro-form brp-dialog-grid">
        <div class="form-group"><label>ชื่อหัวข้อ</label><input type="text" name="title" required value="${escapeForChat(note?.title ?? "")}" /></div>
        <div class="form-group"><label>หมวดหมู่</label><input type="text" name="category" value="${escapeForChat(note?.category ?? "ทั่วไป")}" /></div>
        <div class="form-group"><label>รายละเอียด</label><textarea name="description" rows="9">${escapeForChat(note?.description ?? "")}</textarea></div>
      </div>`,
      buttons: [{ action: "save", label: "บันทึก", default: true,
        callback: async (_event, button) => {
          const f = button.form;
          const title = f.elements.title.value.trim();
          if (!title) return ui.notifications.warn("กรุณาระบุชื่อหัวข้อ");
          const updated = foundry.utils.deepClone(this.document.system.journalEntries ?? []);
          const original = id ? updated.find(n => n.id === id) : null;
          const next = { id: id || foundry.utils.randomID(), title,
            category: f.elements.category.value.trim() || "ทั่วไป", description: f.elements.description.value,
            createdAt: original?.createdAt || new Date().toISOString().slice(0, 10) };
          if (original) Object.assign(original, next);
          else updated.unshift(next);
          await this.document.update({ "system.journalEntries": updated });
        }
      }]
    });
  }

  static async #onCreateNote(event) { event.preventDefault(); await this.#openNoteDialog(); }
  static async #onEditNote(event, target) { event.preventDefault(); await this.#openNoteDialog(target.dataset.noteId); }
  static async #onDeleteNote(event, target) {
    event.preventDefault();
    const id = target.dataset.noteId;
    const sure = await foundry.applications.api.DialogV2.confirm({ window: { title: "ลบบันทึก" }, content: "ยืนยันลบบันทึกนี้?" });
    if (!sure) return;
    const updated = foundry.utils.deepClone(this.document.system.journalEntries ?? []).filter(note => note.id !== id);
    await this.document.update({ "system.journalEntries": updated });
  }
  static async #onShareNote(event, target) {
    event.preventDefault();
    const note = (this.document.system.journalEntries ?? []).find(entry => entry.id === target.dataset.noteId);
    if (!note) return;
    const html = `<div class="brp-chat-card"><div class="card-header"><strong>${escapeForChat(note.title)}</strong> · ${escapeForChat(note.category)}</div><div class="card-actor" style="white-space:pre-wrap">${escapeForChat(note.description)}</div></div>`;
    await ChatMessage.implementation.create({ speaker: ChatMessage.getSpeaker({ actor: this.document }), content: html });
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