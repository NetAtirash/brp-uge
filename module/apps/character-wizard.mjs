import { applyBRPControlLanguage } from "../ui-controls.mjs";
import { BRP_CONFIG, getCampaignRules, isPowerSystemEnabled } from "../config.mjs";
import { getLibraryDocuments, documentToEmbeddedItem } from "../library-provider.mjs";
import { getDisplayItemName, escapeForChat } from "../character-tools.mjs";
import { itemMatchesReference, normalizedText } from "../reference-utils.mjs";
import { linkedOccupationSkill, occupationSkillCoverage } from "../occupation-skill-linking.mjs";
import { generationFormula, creationBudgets, POINT_BUY_BUDGET, pointBuySpent,
  PERSONALITY_TYPES, categoryBonusPreview, CREATION_SKILL_CAP,
  youthCharacteristicLoss, eduAgeBonus, validateCreation, rolledRedistribution } from "../rules/character-creation.mjs";
import { BRPRolls } from "../rolls/brp-rolls.mjs";
import { resolveWealthItem, wealthDisplayFromItem } from "../wealth-utils.mjs";
import { agePenalties } from "../status-effects.mjs";
import { uniqueSkills, sameSkill, planMissingBaseSkills } from "../skill-foundation.mjs";
import { configuredStartingSkills } from "../skill-selection.mjs";
import { availableSpecialtyFamilies, composeSpecialtyItem, analyzeSkillFamily, specialtyFamilyKey } from "../skill-specialties.mjs";
import { buildSpecialtyRegistry, findSpecialtyCandidate, specialtyTemplateFor, specialtyNeedsReview } from "../specialty-registry.mjs";
import { normalizeOccupationChoiceGroups, resolveOccupationTemplateGroups, validateOccupationChoices, occupationSkillEligible, occupationGroupAllowsSkill, occupationChoiceMetadataMissing } from "../occupation-choice-rules.mjs";
import { canonicalSkillKey } from "../skill-foundation.mjs";
import {isSkillFamilyTemplate} from "../skill-family-templates.mjs";
import {wizardSpecialtyFamilies,wizardOccupationFamilyChoices} from "../wizard-specialty-choices.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class BRPCharacterWizard extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.targetActor = options.actor;
    this.step = 1;
    this.skillCatalog = [];
    this.librarySkillDocs = [];
    this.specialtyRegistry = [];
    this.specialtyRegistrySnapshot = null;
    this.powerCatalog = [];
    this.libraryProfessions = [];
    this.catalogLoaded = false;

    const rules = getCampaignRules();
    const existing = this.targetActor?.system ?? {};
    const c = existing.characteristics ?? {};
    this.wizardData = {
      name: this.targetActor?.name || "นักผจญภัยหน้าใหม่",
      culture: existing.culture || "",
      age: Number(existing.age ?? 20),
      ageReference: existing.ageReference ?? null,
      ageYouthCharacteristic: existing.ageYouthCharacteristic || 'siz',
      agingPriority: existing.agingPriority || 'con,dex,cha',
      personalityType: existing.personalityType || 'none',
      personalitySkillKeys: [...(PERSONALITY_TYPES[existing.personalityType||'none']?.keys??[])],
      gender: existing.gender || "",
      playerName: existing.playerName || "",
      handedness: existing.handedness || "",
      height: existing.height || "",
      weight: existing.weight || "",
      religion: existing.religion || "",
      distinctiveFeatures: existing.distinctiveFeatures || "",
      personalDescription: existing.personalDescription || "",
      method: rules.characteristicMethod || "rolled",
      characteristics: {
        str: Number(c.str?.value ?? 10) || 10,
        con: Number(c.con?.value ?? 10) || 10,
        siz: Number(c.siz?.value ?? 12) || 12,
        int: Number(c.int?.value ?? 12) || 12,
        pow: Number(c.pow?.value ?? 11) || 11,
        dex: Number(c.dex?.value ?? 11) || 11,
        cha: Number(c.cha?.value ?? 10) || 10,
        edu: Number(c.edu?.value ?? 12) || 12
      },
      professionId: this.targetActor?.items?.find?.(i=>i.type==="occupation")?.uuid || "",
      choiceSelections: structuredClone(this.targetActor?.getFlag?.('brp-uge','creationOccupationChoices')||{}),
      personalSpecialtyKeys: [],
      personalFamilyDraft: '',
      personalSpecialtyDraft: '',
      occupationFamilyDrafts: {},
      occupationSpecialtyDrafts: {},
      professionDrafts: {},
      allowRebuild: false,
      rolledBasis: null,
      hasGeneratedCharacteristics: false,
      generatedKeys: [],
      occRanks: {},
      persRanks: {},
      touchedSkillIndices: [],
      touchedPersonality: false,
      professionChanged: false,
      selectedPowers: [],
      occPowerRanks: {},
      persPowerRanks: {},
      selectedWeaponRefs: [],
      selectedArmorRefs: [],
      skillFilter: "",
      professionFilter: "",
      powerSystemFilter: "all",
      powerPreviewIndex: null
    };

    // Wait for user approval before generating any initial characteristic dice rolls.
    this.#syncStarterGear();
  }

  static DEFAULT_OPTIONS = {
    id: "brp-character-wizard",
    classes: ["brp-uge", "brp-wizard-window"],
    position: {
      width: 820,
      height: 740
    },
    window: {
      title: "ตัวช่วยสร้างตัวละคร BRP UGE (Character Creation Wizard)",
      resizable: true
    },
    actions: {
      goStep: BRPCharacterWizard.#onGoStep,
      prevStep: BRPCharacterWizard.#onPrevStep,
      nextStep: BRPCharacterWizard.#onNextStep,
      rollAllChars: BRPCharacterWizard.#onRollAllChars,
      rollSingleChar: BRPCharacterWizard.#onRollSingleChar,
      stepChar: BRPCharacterWizard.#onStepChar,
      selectProfession: BRPCharacterWizard.#onSelectProfession,
      openOccupationChoiceSetup: BRPCharacterWizard.#onOpenOccupationChoiceSetup,
      selectOccupationChoice: BRPCharacterWizard.#onSelectOccupationChoice,
      removeOccupationChoice: BRPCharacterWizard.#onRemoveOccupationChoice,
      addPersonalSpecialty: BRPCharacterWizard.#onAddPersonalSpecialty,
      unlockRebuild: BRPCharacterWizard.#onUnlockRebuild,
      allocateSkill: BRPCharacterWizard.#onAllocateSkill,
      addWizardPower: BRPCharacterWizard.#onAddWizardPower,
      viewWizardPower: BRPCharacterWizard.#onViewWizardPower,
      removeWizardPower: BRPCharacterWizard.#onRemoveWizardPower,
      allocatePower: BRPCharacterWizard.#onAllocatePower,
      toggleStarterReference: BRPCharacterWizard.#onToggleStarterReference,
      finishWizard: BRPCharacterWizard.#onFinishWizard,
      rollAge: BRPCharacterWizard.#onRollAge,
      setPersonality: BRPCharacterWizard.#onSetPersonality,
      addPersonalitySkill: BRPCharacterWizard.#onAddPersonalitySkill,
      removePersonalitySkill: BRPCharacterWizard.#onRemovePersonalitySkill
    }
  };

  static PARTS = {
    wizard: {
      template: "systems/brp-uge/templates/apps/character-wizard.hbs"
    }
  };

  /** All characteristic dice use Foundry Roll and a single visibility-aware confirmation. */
  async #rollCharacteristics(heroic = false, oneKey = null) {
    const ch = this.wizardData.characteristics;
    const keys = oneKey ? [oneKey] : ["str", "con", "siz", "int", "pow", "dex", "cha", ...(getCampaignRules().useEdu ? ["edu"] : [])];
    const results = [];
    for (const key of keys) {
      const formula = generationFormula(key, heroic?'heroic_roll':'rolled');
      const roll = await new Roll(formula).evaluate();
      ch[key] = Math.max(1, Number(roll.total));
      results.push({key, formula, value: ch[key]});
    }
    // Rerolls reset the original comparison for redistributed points.
    const required = ["str", "con", "siz", "int", "pow", "dex", "cha", ...(getCampaignRules().useEdu ? ["edu"] : [])];
    const generated = new Set(this.wizardData.generatedKeys ?? []);
    for (const key of keys) generated.add(key);
    this.wizardData.generatedKeys = [...generated];
    if (required.every(key=>generated.has(key))) {
      this.wizardData.rolledBasis = {...ch};
      this.wizardData.hasGeneratedCharacteristics = true;
    }
    return results;
  }

  async #confirmAndRollCharacteristics(oneKey = null) {
    const heroic = this.wizardData.method === "heroic_roll";
    const choice = await BRPRolls.confirmRoll({
      title: oneKey ? `Characteristic ${oneKey.toUpperCase()}` : "Character Creation — Characteristics",
      percentile: false
    });
    if (!choice) return false;
    const results = await this.#rollCharacteristics(heroic, oneKey);
    await ChatMessage.implementation.create({
      speaker: ChatMessage.getSpeaker({ actor: this.targetActor }),
      content: `<div class="brp-chat-card"><strong>BRP Character Creation</strong><ul>${results.map(r => `<li>${escapeForChat(r.key.toUpperCase())}: ${r.value} (${escapeForChat(r.formula)})</li>`).join("")}</ul></div>`,
      ...BRPRolls.chatVisibility(choice.messageMode)
    });
    this.render();
    return true;
  }

  #refreshSpecialtyRegistry() {
    // Game Settings can change while the Wizard stays open. Keep the expensive
    // Compendium catalog cached, but ALWAYS refresh the World-side overlay
    // when its registered value changes. Do not alter any draft allocations.
    if(!this.catalogLoaded && !this.librarySkillDocs.length)return false;
    const raw=game.settings.get('brp-uge','specialtyRegistry');
    const legacy=game.settings.get('brp-uge','specialtyPresets');
    const snapshot=JSON.stringify([raw,legacy]);
    if(snapshot===this.specialtyRegistrySnapshot)return false;
    this.specialtyRegistry=buildSpecialtyRegistry(this.librarySkillDocs,raw,legacy);
    this.specialtyRegistrySnapshot=snapshot;
    return true;
  }

  async #loadCatalog() {
    if(this.catalogLoaded){
      this.#refreshSpecialtyRegistry();
      return;
    }
    const docs=await getLibraryDocuments();
    const byType=(type)=>docs.filter(d=>d.type===type).map(d=>{
      const data=documentToEmbeddedItem(d);
      data.flags??={};data.flags.core??={};data.flags.core.sourceId ||= d.uuid;
      return data;
    });
    this.librarySkillDocs=docs.filter(d=>d.type==='skill');
    this.#refreshSpecialtyRegistry();
    this.skillCatalog=uniqueSkills(byType('skill'));
    this.powerCatalog=byType('power');
    this.libraryProfessions=docs.filter(d=>d.type==='occupation');
    // Preserve actor-owned items even when all content modules are disabled.
    for(const own of this.targetActor?.items??[]){
      if(own.type==='occupation'&&!this.libraryProfessions.some(d=>d.uuid===own.uuid))this.libraryProfessions.push(own);
      if(['skill','power'].includes(own.type)) {
        const list=own.type==='skill'?this.skillCatalog:this.powerCatalog;
        const copy=documentToEmbeddedItem(own);
        if(!copy)continue;
        copy.flags.core.sourceId ||= own.uuid;
        if(own.type==='skill') {
          if(!list.some(d=>sameSkill(d,copy)))list.push(copy);
        } else if(!list.some(d=>d.flags?.core?.sourceId===own.uuid))list.push(copy);
      }
    }
    this.skillCatalog=uniqueSkills(this.skillCatalog);
    // Reopened Actors must show existing allocations, not misleading empty
    // budgets that would allow a second allocation of the same points.
    if(this.targetActor?.getFlag?.('brp-uge','creationCompleted')){
      this.skillCatalog.forEach((tpl,index)=>{
        const own=this.targetActor.items?.find?.(item=>item.type==='skill'&&sameSkill(item,tpl));
        if(!own)return;
        this.wizardData.occRanks[index]=Number(own.system.occupationBonus||0);
        this.wizardData.persRanks[index]=Number(own.system.personalBonus||0);
      });
    }
    this.catalogLoaded=true;
    if(!this.wizardData.selectedWeaponRefs.length&&!this.wizardData.selectedArmorRefs.length) this.#syncStarterGear();
  }

  #getAvailableProfessions() {
    // All Occupation Items come from installed Packs or World/Actor documents.
    const items=[...this.libraryProfessions,...(game.items?.contents??[])].filter(i=>i.type==='occupation');
    const byKey=new Map();
    for(const item of items){
      const key=item.getFlag?.('brp-uge','sourceId')||item.uuid;
      byKey.set(key,{
        id:item.uuid,sourceUuid:item.uuid,
        name:item.system.nameEn||item.name,nameTh:item.system.nameTh||item.name,
        wealthEnabled:Boolean(item.system.wealthEnabled),wealthRef:String(item.system.wealthRef||''),
        description:item.system.descriptionEn||'',descriptionTh:item.system.descriptionTh||'',
        skillRefs:[...(item.system.skillRefs??[])],
        skillChoiceGroups:normalizeOccupationChoiceGroups(item.system.skillChoiceGroups),
        starterWeaponRefs:[...(item.system.starterWeaponRefs??[])],
        starterArmorRefs:[...(item.system.starterArmorRefs??[])]
      });
    }
    return [...byKey.values()];
  }

  #getProfession() {
    return this.#getAvailableProfessions().find(p=>p.id===this.wizardData.professionId) || null;
  }

  #syncStarterGear() {
    const prof=this.#getProfession();
    this.wizardData.selectedWeaponRefs=[...(prof?.starterWeaponRefs??[])];
    this.wizardData.selectedArmorRefs=[...(prof?.starterArmorRefs??[])];
  }

  /** Age-adjusted values used by all Wizard previews and allocation limits.
   * These are derived only; NEVER written over the underlying rolled scores.
   */
  #getCreationCharacteristics(rules=getCampaignRules()) {
    const values={...this.wizardData.characteristics};
    const penalty=agePenalties(this.wizardData.age,true,this.wizardData.agingPriority);
    for(const [key,n] of Object.entries(penalty))if(key in values)values[key]=Math.max(1,Number(values[key])+n);
    const youngLoss=youthCharacteristicLoss(this.wizardData.age,this.wizardData.ageReference);
    const youth=this.wizardData.ageYouthCharacteristic;
    if(youngLoss&&youth in values&&youth!=='edu')values[youth]=Math.max(1,values[youth]-youngLoss);
    if(rules.useEdu)values.edu=Math.max(1,Number(values.edu)+eduAgeBonus(this.wizardData.age,this.wizardData.ageReference));
    return values;
  }

  #getSkillBudgets(rules) {
    const ch=this.wizardData.characteristics;
    const b=creationBudgets({level:rules.powerLevel,useEdu:rules.useEdu,occupationBudgetMethod:rules.occupationBudgetMethod,
      edu: Number(ch.edu||10)+(rules.useEdu?eduAgeBonus(this.wizardData.age,this.wizardData.ageReference):0),
      int:ch.int,age:this.wizardData.age,ageReference:this.wizardData.ageReference,
      increasedPersonal:rules.increasedPersonalSkillPoints});
    return {occupational:b.profession,personal:b.personal,ageAdjustment:b.ageAdjustment};
  }

  #getPointBuyBudget(rules) { return POINT_BUY_BUDGET[rules.powerLevel]??24; }

  #plainRuleText(html) {
    return String(html??'').replace(/<\/?(?:p|div|li|h[1-6]|br|ul|ol)\b[^>]*>/gi,'\n')
      .replace(/<[^>]+>/g,'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&')
      .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/\n[ \t]*\n[ \t]*\n/g,'\n\n').trim();
  }

  #isOccupationalSkill(skillEntry,prof) {
    if(occupationSkillEligible(skillEntry,prof,this.wizardData.choiceSelections,this.skillCatalog))return true;
    const key=canonicalSkillKey(skillEntry);
    return resolveOccupationTemplateGroups(prof,this.librarySkillDocs).some(group=>
      (this.wizardData.choiceSelections[group.id]||[]).includes(key)
      &&occupationGroupAllowsSkill(group,skillEntry));
  }

  #occupationChoiceStatus(prof=this.#getProfession()){
    return validateOccupationChoices(
      resolveOccupationTemplateGroups(prof,this.librarySkillDocs),
      this.wizardData.choiceSelections,this.skillCatalog);
  }

  async #ensureSkillCandidate(key){
    this.#refreshSpecialtyRegistry();
    const index=this.skillCatalog.findIndex(s=>canonicalSkillKey(s)===key);
    const existing=index>=0?this.skillCatalog[index]:null;
    // Non-specialty exact choices are valid independent Skills.
    if(key.endsWith('|')) {
      if(existing)return existing;
      throw new Error('This Skill source is unavailable');
    }
    const candidate=findSpecialtyCandidate(this.specialtyRegistry,key);
    if(!candidate)throw new Error('This Specialty is hidden or not approved by the GM');
    const template=specialtyTemplateFor(candidate.family,candidate.option,this.librarySkillDocs);
    if(!template)throw new Error('A matching source Skill template must be configured by the GM');
    const sourceRef=candidate.option.sourceUuid||candidate.option.templateUuid;
    const sameSource=existing && (
      existing.flags?.core?.sourceId===sourceRef ||
      existing.flags?.['brp-uge']?.sourceUuid===sourceRef ||
      existing.flags?.['brp-uge']?.specialtyTemplateUuid===sourceRef
    );
    if(existing && sameSource && canonicalSkillKey(template)===key)return existing;
    // A prior source example may have the same displayed name as a curated
    // World option. Prefer the explicit GM rules template for this new draft.
    const created=composeSpecialtyItem(template,candidate.family,candidate.option);
    if(!existing){this.skillCatalog.push(created);return created;}
    const owned=this.targetActor?.items?.some?.(item=>item.type==='skill'&&sameSkill(item,existing));
    if(owned)return existing; // never replace a historical Actor Skill
    if(Number(this.wizardData.occRanks[index]||0)||Number(this.wizardData.persRanks[index]||0))
      throw new Error('Existing draft has allocated points for this Skill; ask the GM to reconcile its source');
    this.skillCatalog[index]=created;
    return created;
  }

  #changeProfession(profId){
    if(profId===this.wizardData.professionId)return;
    const prev=this.wizardData.professionId||'none';
    this.wizardData.professionDrafts[prev]={
      occRanks:structuredClone(this.wizardData.occRanks),
      occPowerRanks:structuredClone(this.wizardData.occPowerRanks),
      touchedSkillIndices:[...this.wizardData.touchedSkillIndices],
      choiceSelections:structuredClone(this.wizardData.choiceSelections)
    };
    const restore=this.wizardData.professionDrafts[profId||'none'];
    this.wizardData.professionId=profId;
    this.wizardData.professionChanged=true;
    this.wizardData.occRanks=structuredClone(restore?.occRanks||{});
    this.wizardData.occPowerRanks=structuredClone(restore?.occPowerRanks||{});
    this.wizardData.touchedSkillIndices=[...(restore?.touchedSkillIndices||[])];
    this.wizardData.choiceSelections=structuredClone(restore?.choiceSelections||{});
    this.#syncStarterGear();
  }

  #computeDynamicBase(skillEntry) {
    const rules = getCampaignRules();
    const c = this.#getCreationCharacteristics(rules);
    const f = skillEntry.system?.baseFormula || "";
    if (f === "INT*5") return (rules.useEdu ? c.edu : c.int) * 5;
    if (f === "DEX*2") return c.dex * 2;
    if (f === "INT+POW") return c.int + c.pow;
    if (f === "DEX*4") return c.dex * 4;
    return Number(skillEntry.system?.base ?? 5);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    await this.#loadCatalog();
    const uiLang = game.settings.get("brp-uge", "uiLanguage") || "th";
    const isTh = uiLang === "th";
    const rules = getCampaignRules();
    const ch = this.wizardData.characteristics;
    const effectiveCh = this.#getCreationCharacteristics(rules);
    const prof = this.#getProfession() || {name:'',nameTh:'',description:'',descriptionTh:'',skillRefs:[],wealthRef:'',wealthEnabled:false};
    const budgets = this.#getSkillBudgets(rules);

    const charKeys = rules.useEdu
      ? ["str", "con", "siz", "int", "pow", "dex", "cha", "edu"]
      : ["str", "con", "siz", "int", "pow", "dex", "cha"];

    const pointBuyTotal = this.#getPointBuyBudget(rules);
    const pointBuyUsed = pointBuySpent(ch,rules.useEdu);
    const pointBuyRemaining = pointBuyTotal - pointBuyUsed;

    const maxHp = rules.heroicHitPoints ? effectiveCh.con + effectiveCh.siz : Math.ceil((effectiveCh.con + effectiveCh.siz) / 2);
    const totalSum = effectiveCh.str + effectiveCh.siz;
    let dm = "0";
    if (totalSum <= 12) dm = "-1D6";
    else if (totalSum <= 16) dm = "-1D4";
    else if (totalSum <= 24) dm = "0";
    else if (totalSum <= 32) dm = "+1D4";
    else if (totalSum <= 40) dm = "+1D6";
    else dm = `+${2 + Math.floor((totalSum - 41) / 16)}D6`;

    const occUsed = [...Object.values(this.wizardData.occRanks), ...Object.values(this.wizardData.occPowerRanks)].reduce((s,v)=>s+Number(v||0),0);
    const persUsed = [...Object.values(this.wizardData.persRanks), ...Object.values(this.wizardData.persPowerRanks)].reduce((s,v)=>s+Number(v||0),0);

    const q = this.wizardData.skillFilter.trim().toLowerCase();
    const personality=new Set(this.wizardData.personalitySkillKeys??[]);
    const skillRows = this.skillCatalog
      .map((s, idx) => {
        const isOcc = this.#isOccupationalSkill(s, prof);
        const base = this.#computeDynamicBase(s);
        const occPts = Number(this.wizardData.occRanks[idx] ?? 0);
        const persPts = Number(this.wizardData.persRanks[idx] ?? 0);
        const bonusCategory=categoryBonusPreview(effectiveCh,s.system.category,rules.categoryBonusMode,rules.useEdu);
        const personalityPts=personality.has(s.system?.referenceKey||s.system?.nameEn||s.name)?20:0;
        const total = base + bonusCategory + personalityPts + occPts + persPts;
        const info=analyzeSkillFamily(s);
        const key=canonicalSkillKey(s);
        const selectedKeys=Object.values(this.wizardData.choiceSelections).flat();
        const isPersonalSpecialty=this.wizardData.personalSpecialtyKeys.includes(key);
        const owned=Boolean(this.targetActor?.items?.some?.(own=>own.type==='skill'&&sameSkill(own,s)));
        return {
          index: idx,
          skillKey:key,isPersonalSpecialty,owned,
          isSpecialtyExample:Boolean(info?.supportsSpecialty),
          needsReview:Boolean(info?.supportsSpecialty&&specialtyNeedsReview(info.enSpecialty)),
          isPlayerSelected:selectedKeys.includes(key)||isPersonalSpecialty,
          name: getDisplayItemName(s, uiLang),
          nameEn: s.system?.nameEn||s.name,
          category: s.system.category,
          base, bonusCategory, personalityPts,
          occPts,
          persPts,
          total,
          isOcc,
          atCap: total >= rules.creationSkillCap,
          description: this.#plainRuleText(isTh ? s.system?.descriptionTh||s.system?.description : s.system?.descriptionEn||s.system?.description).slice(0,850),
          referenceKey:s.system.referenceKey||s.system.nameEn||s.name,
          searchText: `${s.name} ${getDisplayItemName(s,"en")} ${s.system.description} ${s.system.descriptionTh ?? ""} ${s.system.descriptionEn ?? ""}`.toLowerCase()
        };
      })
      .sort((a, b) => Number(b.isOcc) - Number(a.isOcc) || a.name.localeCompare(b.name));

    // Starting equipment is represented only by linked Item references.
    // No historical free-text name matching or translated-name fallback.


    context.isGM=Boolean(game.user?.isGM);
    context.ageRequiresRoll=this.wizardData.ageReference==null;
    context.ageHasAging=Number(this.wizardData.age)>=50;
    context.ageHasYouth=this.wizardData.ageReference!=null && Number(this.wizardData.age)<Number(this.wizardData.ageReference);
    context.ageRule={reference:this.wizardData.ageReference, youthLoss:youthCharacteristicLoss(this.wizardData.age,this.wizardData.ageReference),
      eduBonus:rules.useEdu?eduAgeBonus(this.wizardData.age,this.wizardData.ageReference):0,
      occupationDelta:budgets.ageAdjustment};
    context.youthCharacteristicChoices=['str','con','siz','int','pow','dex','cha'].map(key=>({key,label:key.toUpperCase(),selected:key===this.wizardData.ageYouthCharacteristic}));
    context.agingPriorityChoices=[['con,dex,cha','CON → DEX → CHA'],['str,con,dex','STR → CON → DEX'],
      ['dex,cha,str','DEX → CHA → STR'],['cha,str,con','CHA → STR → CON']].map(([key,label])=>({key,label,selected:key===this.wizardData.agingPriority}));
    context.ageCharacteristicDeltas=Object.entries(effectiveCh).filter(([key,value])=>value!==ch[key])
      .map(([key,value])=>`${key.toUpperCase()} ${value>ch[key]?'+':''}${value-ch[key]}`).join(' · ');
    context.personalityChoices=Object.entries(PERSONALITY_TYPES).map(([key,value])=>({key,label:isTh?value.th:value.en,selected:this.wizardData.personalityType===key}));
    context.personalityCount=personality.size;
    context.personalityAvailable=this.skillCatalog.map((s,index)=>({index,label:getDisplayItemName(s,uiLang),selected:personality.has(s.system?.referenceKey||s.system?.nameEn||s.name)}));
    context.personalitySelected=context.personalityAvailable.filter(s=>s.selected);
    context.isTh = isTh;
    context.step = this.step;
    for (let i=1;i<=6;i++) context[`isStep${i}`] = this.step===i;
    context.steps = [
      { num:1, label:isTh?"1. ชื่อและ Characteristics":"1. Name & Characteristics", active:this.step===1 },
      { num:2, label:isTh?"2. พลัง (เสริม)":"2. Powers (Optional)", active:this.step===2 },
      { num:3, label:isTh?"3. อายุและบุคลิก":"3. Age & Derived", active:this.step===3 },
      { num:4, label:isTh?"4. อาชีพและทักษะ":"4. Profession & Skills", active:this.step===4 },
      { num:5, label:isTh?"5. สิ่งของและรูปลักษณ์":"5. Gear & Appearance", active:this.step===5 },
      { num:6, label:isTh?"6. ตรวจสอบและบันทึก":"6. Review & Save", active:this.step===6 }
    ];
    context.wizardData = this.wizardData;
    context.rules = rules;
    context.isPointBuy = this.wizardData.method === "point_buy";
    context.pointBuyTotal = pointBuyTotal;
    context.pointBuyUsed = pointBuyUsed;
    context.pointBuyRemaining = pointBuyRemaining;
    context.rolledRedistribution=rolledRedistribution(this.wizardData.rolledBasis,ch,rules.useEdu);
    context.characteristics = charKeys.map((k) => ({
      key: k,
      short: k.toUpperCase(),
      value: ch[k],
      rollPct: effectiveCh[k] * 5,
      effective: effectiveCh[k],
      formula: generationFormula(k,this.wizardData.method).toUpperCase()
    }));
    context.derivedPreview = {
      maxHp,
      majorWound: Math.ceil(maxHp / 2),
      maxPp: effectiveCh.pow,
      maxFp: effectiveCh.str + effectiveCh.con,
      san: Math.min(99, effectiveCh.pow * 5),
      dm
    };
    // Occupations use the same compact catalog/list vocabulary as Skills,
    // Powers and Inventory. Long rules are previewed ONLY for the chosen item.
    context.professions = (await Promise.all(this.#getAvailableProfessions().map(async (p) => ({
      ...p,
      title: isTh ? p.nameTh : p.name,
      titleEn:p.name,
      plainDescription:this.#plainRuleText(isTh ? p.descriptionTh || p.description : p.description || p.descriptionTh),
      wealthLabel: p.wealthEnabled ? wealthDisplayFromItem(await resolveWealthItem(p.wealthRef),isTh?'th':'en') : '',
      selected: p.id === this.wizardData.professionId,
      searchText: `${p.nameTh} ${p.name}`.toLocaleLowerCase(),
      linkedCount:(p.skillRefs??[]).length
    })))).sort((a,b)=>a.title.localeCompare(b.title,isTh?'th':'en'));
    context.professionFilter=this.wizardData.professionFilter;
    context.selectedProfession = {
      ...prof,
      title: isTh ? prof?.nameTh : prof?.name,
      titleEn: prof?.name,
      sub: this.#plainRuleText(isTh ? prof?.descriptionTh || prof?.description : prof?.description || prof?.descriptionTh)
    };
    context.occupationBudgetLabel=rules.useEdu && rules.occupationBudgetMethod==='edu'
      ? `EDU × ${({normal:20,heroic:25,epic:30,superhuman:40})[rules.powerLevel]??20}`
      : `${rules.powerLevel} · fixed`;
    context.occBudget = budgets.occupational;
    context.occUsed = occUsed;
    context.occRemaining = budgets.occupational - occUsed;
    context.persBudget = budgets.personal;
    context.persUsed = persUsed;
    context.persRemaining = budgets.personal - persUsed;
    // Installed content controls both availability and grouping. Disabled
    // systems are never advertised, even if their items remain on an Actor.
    const allPowerTemplates=this.powerCatalog;
    const groups=['Magic','Sorcery','Psychic','Mutation','Superpower'];
    const typeLabels={Magic:'Magic',Sorcery:'Sorcery',Psychic:'Psychic',Mutation:'Mutations',Superpower:'Superpowers'};
    context.powerSystemGroups=groups.filter(type=>isPowerSystemEnabled(type))
      .map(type=>({id:type,label:typeLabels[type],count:allPowerTemplates.filter(p=>p.system?.system===type).length,
        selected:this.wizardData.powerSystemFilter===type}));
    const availablePowerTemplates=allPowerTemplates.map((power,index)=>({power,index}))
      .filter(({power})=>isPowerSystemEnabled(power.system?.system));
    const powerOptions=availablePowerTemplates.map(({power,index})=>({index,
      name:getDisplayItemName(power,uiLang),english:power.system?.nameEn||power.name,
      type:power.system?.system,selected:this.wizardData.selectedPowers.includes(index),previewSelected:this.wizardData.powerPreviewIndex===index}));
    context.powerCatalog=powerOptions.filter(p=>this.wizardData.powerSystemFilter==='all'||p.type===this.wizardData.powerSystemFilter);
    context.powerSystemsAvailable=context.powerSystemGroups.length>0;
    context.powerFilterAll=this.wizardData.powerSystemFilter==='all';
    context.powerPickerCount=context.powerCatalog.length;
    const previewIndex=this.wizardData.powerPreviewIndex;
    const previewPower=allPowerTemplates[previewIndex];
    const powerText=(item)=>this.#plainRuleText(isTh?item?.system?.descriptionTh||item?.system?.description:
      item?.system?.descriptionEn||item?.system?.description);
    context.powerPreview=previewPower&&isPowerSystemEnabled(previewPower.system?.system)?{
      name:getDisplayItemName(previewPower,uiLang),nameEn:previewPower.system?.nameEn||previewPower.name,
      system:previewPower.system?.system,description:powerText(previewPower)
    }:null;
    context.powerRows=this.wizardData.selectedPowers.map(idx=>{
      const src=allPowerTemplates[idx];if(!src||!isPowerSystemEnabled(src.system?.system))return null;
      const type=src.system.system,allocated=['Magic','Psychic'].includes(type);
      const base=type==='Magic'?effectiveCh.int:type==='Psychic'?effectiveCh.pow:0;
      const occPts=Number(this.wizardData.occPowerRanks[idx]??0);
      const persPts=Number(this.wizardData.persPowerRanks[idx]??0);
      return {index:idx,name:getDisplayItemName(src,uiLang),nameEn:src.system.nameEn||src.name,
        description:powerText(src),type,base,occPts,persPts,total:base+occPts+persPts,allocated};
    }).filter(Boolean);
    const professionSkillCoverage=occupationSkillCoverage(this.skillCatalog,prof?.skillRefs??[]);
    // Resolve optional or required choice clauses before profession allocations.
    const choiceGroups=resolveOccupationTemplateGroups(prof,this.librarySkillDocs);
    const uiChoices=this.wizardData.choiceSelections;
    context.professionChoiceGroups=choiceGroups.map(group=>{
      const candidates=new Map(),pickerChoices=new Map();
      for(const option of group.options){
        if(option.kind==='family'){
          const family=this.specialtyRegistry.find(f=>f.key===option.familyKey);
          if(family?.options.some(o=>!o.hidden))pickerChoices.set('family:'+option.familyKey,{
            value:'family:'+option.familyKey,label:isTh?family.thFamily:family.enFamily
          });
        } else if(option.kind==='specialty'){
          const family=this.specialtyRegistry.find(f=>f.key===option.familyKey);
          const actual=family?.options.find(o=>o.key===option.specialtyKey&&!o.hidden);
          if(actual)pickerChoices.set('specialty:'+option.familyKey+'|'+actual.key,{
            value:'specialty:'+option.familyKey+'|'+actual.key,
            label:(isTh?family.thFamily:family.enFamily)+' ('+
              (isTh?(actual.th||actual.en):actual.en)+')'
          });
        } else {
          const skill=this.skillCatalog.find(s=>linkedOccupationSkill(s,option.ref));
          if(skill)pickerChoices.set('skill:'+canonicalSkillKey(skill),{
            value:'skill:'+canonicalSkillKey(skill),label:getDisplayItemName(skill,uiLang)
          });
        }
        if(option.kind==='skill'){
          const skill=this.skillCatalog.find(s=>linkedOccupationSkill(s,option.ref));
          if(skill)candidates.set(canonicalSkillKey(skill),{
            key:canonicalSkillKey(skill),label:getDisplayItemName(skill,uiLang)});
        } else {
          const family=this.specialtyRegistry.find(f=>f.key===option.familyKey);
          for(const candidate of family?.options||[]){
            if(candidate.hidden || (option.kind==='specialty'&&candidate.key!==option.specialtyKey))continue;
            const key=option.familyKey+'|'+candidate.key;
            candidates.set(key,{key,label:(isTh?family.thFamily:family.enFamily)+
              ' ('+(isTh?(candidate.th||candidate.en):candidate.en)+')'});
          }
        }
      }
      const selected=uiChoices[group.id]||[];
      // Render concrete Specialty options server-side with the Handlebars
      // template. Do not rely on DOM-generated Option() nodes in _onRender:
      // this previously produced an empty picker on some Foundry screens.
      const familySpecialtyOptions=wizardOccupationFamilyChoices(
        this.specialtyRegistry,group,uiLang);
      return {...group,label:isTh?(group.labelTh||group.labelEn):(group.labelEn||group.labelTh),
        familySpecialtyOptions,
        selected:selected.map(key=>({key,label:candidates.get(key)?.label||key})),
        candidates:[...candidates.values()].sort((a,b)=>a.label.localeCompare(b.label)),
        pickerChoices:[...pickerChoices.values()].sort((a,b)=>a.label.localeCompare(b.label)),
        complete:selected.length===group.count,selectedCount:selected.length};
    });
    const choiceStatus=this.#occupationChoiceStatus(prof);
    context.occupationChoicesValid=choiceStatus.valid;
    const occupationText=this.#plainRuleText((prof.description||'')+' '+(prof.descriptionTh||''));
    context.occupationMetadataMissing=Boolean(prof.sourceUuid&&
      occupationChoiceMetadataMissing(prof,occupationText));
    context.occupationHasChoiceGroups=choiceGroups.length>0;
    context.isCompletedActor=Boolean(this.targetActor?.getFlag?.('brp-uge','creationCompleted'));
    context.allowRebuild=this.wizardData.allowRebuild;
    context.personalFamilyOptions=wizardSpecialtyFamilies(this.specialtyRegistry,uiLang);
    context.availableSpecialtyCount=context.personalFamilyOptions.reduce((sum,f)=>sum+f.count,0);
    context.personalSpecialtyOptions=this.specialtyRegistry.flatMap(group=>
      (group.options||[]).filter(option=>!option.hidden).map(option=>({
        key:group.key+'|'+option.key,
        label:(isTh?group.thFamily:group.enFamily)+' ('+(isTh?(option.th||option.en):option.en)+')'
      }))).sort((a,b)=>a.label.localeCompare(b.label));
    context.professionFixedSkillNames=professionSkillCoverage.linked.map(index=>{
      const skill=this.skillCatalog[index];
      const info=analyzeSkillFamily(skill);
      return isSkillFamilyTemplate(skill)?
        (isTh?info.thFamily:info.enFamily)+' — '+(isTh?'เลือก Specialty':'Choose Specialty'):
        getDisplayItemName(skill,uiLang);
    });
    context.professionLinkedSkillCount=professionSkillCoverage.linked.length;
    context.professionMissingSkillCount=professionSkillCoverage.missing.length;
    context.professionHasLinkedSkills=Boolean(prof?.sourceUuid && professionSkillCoverage.linked.length);
    // Do not flood creation with every Compendium Skill (Art (...),
    // Science (...), etc.). A Specialty is visible for point allocation only
    // after occupation selection, personal selection, or existing Actor use.
    context.skillRows = skillRows.filter(row=>!row.isSpecialtyExample ||
      row.isPlayerSelected || row.owned || (row.isOcc&&!row.needsReview) ||
      row.occPts>0 || row.persPts>0 || row.personalityPts>0);
    context.skillRowsAllCount=skillRows.length;
    // The profession's linked starter skills have their base percentages even
    // before the player allocates occupation/personal points.
    context.topSkills = context.skillRows.filter((s) => s.occPts > 0 || s.persPts > 0 || s.isOcc);
    context.powerCount = context.powerRows.length;
    const allStarterRefs=[...(prof?.starterWeaponRefs??[]).map(ref=>({ref,type:'weapon'})),...(prof?.starterArmorRefs??[]).map(ref=>({ref,type:'armor'}))];
    context.profStarterReferences=await Promise.all(allStarterRefs.map(async r=>{
      const doc=await fromUuid(r.ref).catch(()=>null);
      return {...r,label:doc?getDisplayItemName(doc,uiLang):(isTh?'ไม่พบไอเทมที่อ้างอิง':'Missing referenced item'),
        checked:(r.type==='weapon'?this.wizardData.selectedWeaponRefs:this.wizardData.selectedArmorRefs).includes(r.ref)};
    }));
    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    applyBRPControlLanguage(this.element);
    // The wizard NEVER rolls on opening or rerender. Dice are exclusively
    // triggered by Roll All / single-stat buttons after the user chooses a method.
    this.element.querySelectorAll("[data-wiz-field]").forEach((el) => {
      el.addEventListener(el.dataset.wizField==='age'?'change':'input', (ev) => {
        const key = ev.currentTarget.dataset.wizField;
        if (key === "age") {
          if(!game.user?.isGM)return;
          this.wizardData.age=Math.max(0,Math.floor(Number(ev.currentTarget.value||0)));
          this.render(); // age-based characteristics, bonuses and budgets recompute immediately
        } else this.wizardData[key] = ev.currentTarget.value;
      });
    });

    this.element.querySelector('[data-wiz-youth-stat]')?.addEventListener('change',ev=>{this.wizardData.ageYouthCharacteristic=ev.target.value;this.render();});
    this.element.querySelector('[data-wiz-power-filter]')?.addEventListener('change',ev=>{
      this.wizardData.powerSystemFilter=String(ev.target.value||'all');
      this.wizardData.powerPreviewIndex=null;this.render();
    });
    this.element.querySelector('[data-wiz-power-select]')?.addEventListener('change',ev=>{
      this.wizardData.powerPreviewIndex=Number(ev.target.value);this.render();
    });
    this.element.querySelector('[data-wiz-aging-priority]')?.addEventListener('change',ev=>{this.wizardData.agingPriority=ev.target.value;this.render();});
    this.element.querySelector('[data-wiz-personality]')?.addEventListener('change',event=>BRPCharacterWizard.#onSetPersonality.call(this,event));
    const methodSel = this.element.querySelector("select[data-wiz-method]");
    methodSel?.addEventListener("change", async (ev) => {
      this.wizardData.method = ev.currentTarget.value;
      if (this.wizardData.method !== "point_buy") {
        // Selecting a method must not automatically roll dice or post chat messages.
        this.wizardData.rolledBasis=null;
        this.wizardData.hasGeneratedCharacteristics=false;
        this.wizardData.generatedKeys=[];
        this.render();
      } else {
        // The optional weighted Point-Buy method always begins at 10 (p.17).
        for(const key of Object.keys(this.wizardData.characteristics))this.wizardData.characteristics[key]=10;
        this.wizardData.rolledBasis=null;
        this.wizardData.hasGeneratedCharacteristics=false;
        this.wizardData.generatedKeys=[];
        this.render();
      }
    });

    this.element.querySelectorAll("[data-wiz-char]").forEach((el) => {
      el.addEventListener("change", (ev) => {
        const key = ev.currentTarget.dataset.wizChar;
        const max=['epic','superhuman'].includes(getCampaignRules().powerLevel)?99:21;
        const val = Math.clamp(Number(ev.currentTarget.value || 10), 3, max);
        this.wizardData.characteristics[key] = val;
        this.render();
      });
    });

    // Accept native Foundry Item drag payloads in Wizard. Referenced Items remain
    // source-owned: only a new, editable copy is saved on the target Actor.
    for(const zone of this.element.querySelectorAll('[data-wiz-drop-item]')) {
      zone.addEventListener('dragover',event=>event.preventDefault());
      zone.addEventListener('drop',async event=>{
        event.preventDefault();event.stopPropagation();
        let data;try{data=JSON.parse(event.dataTransfer?.getData('text/plain')||'{}');}catch{return;}
        if(data?.type!=='Item'||!data.uuid)return;
        const doc=await fromUuid(data.uuid).catch(()=>null);if(!doc)return;
        const entry=documentToEmbeddedItem(doc);
        if(doc.type==='occupation'){
          if(!this.libraryProfessions.some(i=>i.uuid===doc.uuid))this.libraryProfessions.push(doc);
          this.#changeProfession(doc.uuid);
        } else if(doc.type==='power'){
          if(!isPowerSystemEnabled(doc.system?.system))return ui.notifications.warn('This power family is disabled by the GM.');
          const index=this.powerCatalog.findIndex(i=>i.flags?.['brp-uge']?.sourceUuid===doc.uuid);
          const next=index>=0?index:this.powerCatalog.push(entry)-1;
          if(!this.wizardData.selectedPowers.includes(next))this.wizardData.selectedPowers.push(next);
        } else if(doc.type==='skill'){
          if(this.skillCatalog.some(i=>sameSkill(i,entry)))return ui.notifications.info('Skill already available; duplicate ignored');
          this.skillCatalog.push(entry);
        } else return;
        this.render();
      });
    }
    // Server-rendered Specialty options. The Handlebars DOM already contains
    // the current GM-approved choices, so a failed JS injection can never
    // leave an otherwise populated Registry with an empty <select>.
    for(const choices of this.element.querySelectorAll('[data-occupation-skill-options]')){
      const id=choices.dataset.occupationSkillOptions;
      const radios=[...choices.querySelectorAll('[data-occupation-kind-radio]')];
      const fields=[...choices.querySelectorAll('[data-occupation-specialty-field]')];
      const update=(persist=false)=>{
        const selected=radios.find(r=>r.checked)?.value||'';
        if(persist){
          this.wizardData.occupationFamilyDrafts[id]=selected;
          this.wizardData.occupationSpecialtyDrafts[id]='';
        }
        const family=selected.startsWith('family:')?selected.slice(7):'';
        for(const field of fields){
          const active=!!family&&field.dataset.familyKey===family;
          field.hidden=!active;
          const picker=field.querySelector('[data-occupation-specialty-picker]');
          if(!picker)continue;
          picker.disabled=!active;
          if(active){
            const draft=this.wizardData.occupationSpecialtyDrafts[id]||'';
            if([...picker.options].some(o=>o.value===draft))picker.value=draft;
            else picker.value='';
          }
        }
      };
      const previous=this.wizardData.occupationFamilyDrafts[id]||'';
      const saved=radios.find(r=>r.value===previous);
      if(saved)saved.checked=true;
      for(const radio of radios)radio.addEventListener('change',()=>update(true));
      for(const field of fields){
        field.querySelector('[data-occupation-specialty-picker]')?.addEventListener('change',e=>{
          this.wizardData.occupationSpecialtyDrafts[id]=e.target.value;
        });
      }
      update();
    }
    const personalFamily=this.element.querySelector('[data-personal-family-picker]');
    if(personalFamily){
      const fields=[...this.element.querySelectorAll('[data-personal-family-specialties]')];
      const previous=this.wizardData.personalFamilyDraft;
      if([...personalFamily.options].some(o=>o.value===previous))personalFamily.value=previous;
      const update=(persist=false)=>{
        if(persist){
          this.wizardData.personalFamilyDraft=personalFamily.value;
          this.wizardData.personalSpecialtyDraft='';
        }
        for(const field of fields){
          const active=!!personalFamily.value&&field.dataset.personalFamilySpecialties===personalFamily.value;
          field.hidden=!active;
          const picker=field.querySelector('[data-personal-specialty-picker]');
          if(!picker)continue;
          picker.disabled=!active;
          if(active){
            const chosen=this.wizardData.personalSpecialtyDraft;
            picker.value=[...picker.options].some(o=>o.value===chosen)?chosen:'';
          }
        }
      };
      personalFamily.addEventListener('change',()=>update(true));
      for(const field of fields){
        field.querySelector('[data-personal-specialty-picker]')?.addEventListener('change',e=>{
          this.wizardData.personalSpecialtyDraft=e.target.value;
        });
      }
      update();
    }
    // Catalog search filters rows in place. Do not rerender on every keystroke:
    // that would erase Thai IME compositions and cause unnecessary scrolling.
    const occupationSearch=this.element.querySelector('input[data-wiz-prof-search]');
    const filterOccupations=()=>{
      const needle=String(this.wizardData.professionFilter||'').trim().toLocaleLowerCase();
      for(const row of this.element.querySelectorAll('.wiz-occupation-row')){
        row.hidden=!!needle && !String(row.dataset.search||'').includes(needle);
      }
    };
    occupationSearch?.addEventListener('input',event=>{
      this.wizardData.professionFilter=event.currentTarget.value;
      if(!event.isComposing)filterOccupations();
    });
    occupationSearch?.addEventListener('compositionend',event=>{
      this.wizardData.professionFilter=event.currentTarget.value;filterOccupations();
    });
    filterOccupations();
    const skillSearch = this.element.querySelector("input[data-wiz-skill-search]");
    const filterSkillRows = () => {
      const q = String(this.wizardData.skillFilter || "").trim().toLocaleLowerCase();
      for (const row of this.element.querySelectorAll(".wiz-skill-row")) {
        row.hidden = Boolean(q && !String(row.dataset.search || "").includes(q));
      }
    };
    if (skillSearch) {
      skillSearch.addEventListener("input", (ev) => {
        this.wizardData.skillFilter = ev.currentTarget.value;
        if (!ev.isComposing) filterSkillRows();
      });
      skillSearch.addEventListener("compositionend", (ev) => {
        this.wizardData.skillFilter = ev.currentTarget.value;
        filterSkillRows();
      });
      filterSkillRows();
    }
  }

  static async #onRollAge(event) {
    event.preventDefault();
    if(this.wizardData.ageReference!=null&&!game.user?.isGM)
      return ui.notifications.warn('Starting age was already rolled; ask the GM to authorize a reroll.');
    const choice=await BRPRolls.confirmRoll({title:'BRP starting age · 17+1D6',percentile:false});
    if(!choice)return;
    const roll=await new Roll('1d6+17').evaluate();
    this.wizardData.ageReference=Number(roll.total);
    this.wizardData.age=Number(roll.total);
    await ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor:this.targetActor}),
      content:`<div class="brp-chat-card"><strong>BRP Starting Age: ${roll.total}</strong> (17+1D6)</div>`,
      ...BRPRolls.chatVisibility(choice.messageMode)});
    this.render();
  }
  static #onSetPersonality(event) {
    const key=String(event.target.value);
    this.wizardData.personalityType=PERSONALITY_TYPES[key]?key:'none';
    this.wizardData.touchedPersonality=true;
    this.wizardData.personalitySkillKeys=[...(PERSONALITY_TYPES[this.wizardData.personalityType].keys)];
    this.render();
  }
  static #onAddPersonalitySkill(event) {
    event.preventDefault();
    if(this.wizardData.personalitySkillKeys.length>=13)return ui.notifications.warn('BRP Personality: 13 skills maximum');
    const chosen=String(this.element.querySelector('[data-wiz-personality-select]')?.value||'');
    if(!chosen)return;
    const idx=Number(chosen);
    const src=this.skillCatalog[idx];if(!src)return;
    const key=src.system.referenceKey||src.system.nameEn||src.name;
    if(!this.wizardData.personalitySkillKeys.includes(key)){
      this.wizardData.personalitySkillKeys.push(key);
      this.wizardData.touchedPersonality=true;
    }
    this.render();
  }
  static #onRemovePersonalitySkill(event,target) {
    event.preventDefault();
    const idx=Number(target.dataset.index),src=this.skillCatalog[idx];if(!src)return;
    const key=src.system.referenceKey||src.system.nameEn||src.name;
    this.wizardData.personalitySkillKeys=this.wizardData.personalitySkillKeys.filter(v=>v!==key);
    this.wizardData.touchedPersonality=true;
    this.render();
  }

  static #onGoStep(event, target) {
    event.preventDefault();
    this.step = Math.clamp(Number(target.dataset.step || 1), 1, 6);
    this.render();
  }

  static #onPrevStep(event) {
    event.preventDefault();
    this.step = Math.max(1, this.step - 1);
    this.render();
  }

  static #onNextStep(event) {
    event.preventDefault();
    this.step = Math.min(6, this.step + 1);
    this.render();
  }

  static async #onRollAllChars(event) {
    event.preventDefault();
    await this.#confirmAndRollCharacteristics();
  }

  static async #onRollSingleChar(event, target) {
    event.preventDefault();
    const key = target.dataset.char;
    if (!["str", "con", "siz", "int", "pow", "dex", "cha", "edu"].includes(key)) return;
    await this.#confirmAndRollCharacteristics(key);
  }

  static #onStepChar(event, target) {
    event.preventDefault();
    const key = target.dataset.char;
    const delta = Number(target.dataset.delta || 0);
    const rules = getCampaignRules();
    const charKeys = rules.useEdu
      ? ["str", "con", "siz", "int", "pow", "dex", "cha", "edu"]
      : ["str", "con", "siz", "int", "pow", "dex", "cha"];

    if (this.wizardData.method === "point_buy" && delta > 0) {
      const budget = this.#getPointBuyBudget(rules);
        const used = pointBuySpent(this.wizardData.characteristics,rules.useEdu);
      if (used + delta*(["dex","int","pow","edu"].includes(key)?3:1) > budget) {
        ui.notifications.warn("แต้ม Point-Buy ไม่เพียงพอแล้ว");
        return;
      }
    }
    const max=['epic','superhuman'].includes(rules.powerLevel)?99:21;
    const next = Math.clamp(Number(this.wizardData.characteristics[key] ?? 10) + delta,3,max);
    this.wizardData.characteristics[key] = next;
    this.render();
  }

  static #onSelectProfession(event, target) {
    event.preventDefault();
    this.#changeProfession(target.dataset.profId||'');
    this.render();
  }

  static async #onOpenOccupationChoiceSetup(event){
    event.preventDefault();
    if(!game.user?.isGM)return ui.notifications.warn('GM only');
    const prof=this.#getProfession();
    if(!prof?.sourceUuid)return;
    try{
      const original=await fromUuid(prof.sourceUuid);
      if(!original||original.type!=='occupation')throw new Error('Occupation source is unavailable');
      let editable=original;
      if(original.pack){
        // A locked Compendium is immutable: create a campaign-local Occupation
        // rather than modifying the official content pack or Actor copies.
        const data=documentToEmbeddedItem(original);
        delete data._id;delete data.id;
        data.name=(original.system?.nameEn||original.name)+' (World)';
        data.system.nameEn=(original.system?.nameEn||original.name)+' (World)';
        data.system.nameTh=(original.system?.nameTh||original.name)+' (แคมเปญ)';
        data.flags??={};
        data.flags['brp-uge']??={};
        data.flags['brp-uge'].originalOccupationUuid=original.uuid;
        editable=await Item.implementation.create(data,{renderSheet:false});
        if(!editable)throw new Error('Could not create World copy of this Occupation');
        this.libraryProfessions.push(editable);
        this.#changeProfession(editable.uuid);
        ui.notifications.info('Created a World copy. Configure its Skill Choice Groups, then return to the Wizard.');
      }
      editable.sheet?.render({force:true});
      this.render();
    }catch(error){ui.notifications.error(error.message);}
  }

  static async #onSelectOccupationChoice(event,target) {
    event.preventDefault();
    this.#refreshSpecialtyRegistry();
    const id=String(target.dataset.groupId||'');
    const prof=this.#getProfession();
    const group=resolveOccupationTemplateGroups(prof,this.librarySkillDocs).find(g=>g.id===id);
    if(!group)return;
    const picker=this.element.querySelector('[data-occupation-kind-radio="'+CSS.escape(id)+'"]:checked');
    const choice=String(picker?.value||'');
    const family=choice.startsWith('family:')?choice.slice(7):'';
    const subtype=[...this.element.querySelectorAll('[data-occupation-specialty-picker]')]
      .find(select=>select.dataset.occupationSpecialtyPicker===id&&select.dataset.familyKey===family);
    const key=family?family+'|'+String(subtype?.value||''):
      choice.startsWith('specialty:')?choice.slice(10):
      choice.startsWith('skill:')?choice.slice(6):'';
    if(!key||key.endsWith('|'))return ui.notifications.warn(
      'Select a Skill Family and concrete Specialty before confirming your occupation choice');
    const previous=this.wizardData.choiceSelections[id]||[];
    if(previous.includes(key))return ui.notifications.warn('This Skill was already selected');
    if(previous.length>=group.count)return ui.notifications.warn('This occupation choice group is already full');
    if(Object.entries(this.wizardData.choiceSelections).some(([groupId,keys])=>groupId!==id&&keys.includes(key)))
      return ui.notifications.warn('This Skill is selected in another group');
    let skill;
    try{skill=await this.#ensureSkillCandidate(key);}
    catch(error){return ui.notifications.warn(error.message);}
    if(!occupationGroupAllowsSkill(group,skill))return ui.notifications.warn('Skill is not eligible for this occupation choice');
    this.wizardData.choiceSelections[id]=[...previous,key];
    this.render();
  }

  static async #onAddPersonalSpecialty(event){
    event.preventDefault();
    this.#refreshSpecialtyRegistry();
    const family=this.element.querySelector('[data-personal-family-picker]')?.value||'';
    const picker=[...this.element.querySelectorAll('[data-personal-specialty-picker]')]
      .find(select=>select.dataset.familyKey===family);
    const choice=picker?.value||'';
    const key=family&&choice?family+'|'+choice:'';
    if(!key)return ui.notifications.warn('Choose a Skill Family and Specialty');
    try{await this.#ensureSkillCandidate(key);}
    catch(error){return ui.notifications.warn(error.message);}
    if(!this.wizardData.personalSpecialtyKeys.includes(key))
      this.wizardData.personalSpecialtyKeys.push(key);
    this.render();
  }

  static #onRemoveOccupationChoice(event,target) {
    event.preventDefault();
    const id=String(target.dataset.groupId||''),key=String(target.dataset.key||'');
    const chosen=this.wizardData.choiceSelections[id]||[];
    if(!chosen.includes(key))return;
    this.wizardData.choiceSelections[id]=chosen.filter(x=>x!==key);
    const index=this.skillCatalog.findIndex(s=>canonicalSkillKey(s)===key);
    if(index>=0 && Number(this.wizardData.occRanks[index]||0)>0){
      const reclaimed=Number(this.wizardData.occRanks[index]);
      this.wizardData.occRanks[index]=0;
      if(!this.wizardData.touchedSkillIndices.includes(index))this.wizardData.touchedSkillIndices.push(index);
      ui.notifications.info('Returned '+reclaimed+' occupation points to the unallocated pool');
    }
    this.render();
  }

  static async #onUnlockRebuild(event) {
    event.preventDefault();
    if(!game.user?.isGM)return;
    const Dialog=globalThis.foundry?.applications?.api?.DialogV2;
    const confirmed=await Dialog?.confirm?.({
      window:{title:'Rebuild a completed character?'},
      content:'<p>Changes to a completed character can affect characteristics, resources and creation allocations. Make a World backup first. Historical advancements and Flavor Names will not be intentionally deleted.</p>',
      yes:{label:'Unlock rebuild'},no:{label:'Keep protected'},rejectClose:false
    });
    if(confirmed){this.wizardData.allowRebuild=true;this.render();}
  }

  static #onAllocateSkill(event, target) {
    event.preventDefault();
    const idx = Number(target.dataset.index);
    const pool = target.dataset.pool; // "occ" | "pers"
    const delta = Number(target.dataset.delta || 0);
    const tpl = this.skillCatalog[idx];
    if (!tpl) return;
    if(!this.#occupationChoiceStatus().valid){
      return ui.notifications.warn('Complete occupation Skill choices before allocating points');
    }
    const info=analyzeSkillFamily(tpl);
    if(info?.supportsSpecialty && specialtyNeedsReview(info.enSpecialty) && delta>0)
      return ui.notifications.warn('GM must curate a concrete Specialty before assigning points');
    if(pool==='occ'&&!this.#isOccupationalSkill(tpl,this.#getProfession())) {
      return ui.notifications.warn('Occupation points must be spent on skills allowed by the selected occupation');
    }

    if(!this.wizardData.touchedSkillIndices.includes(idx))this.wizardData.touchedSkillIndices.push(idx);
    const rules = getCampaignRules();
    const budgets = this.#getSkillBudgets(rules);
    const base = this.#computeDynamicBase(tpl) + categoryBonusPreview(this.#getCreationCharacteristics(rules),tpl.system.category,rules.categoryBonusMode,rules.useEdu)
      + (this.wizardData.personalitySkillKeys.includes(tpl.system.referenceKey||tpl.system.nameEn||tpl.name)?20:0);
    const curOcc = Number(this.wizardData.occRanks[idx] ?? 0);
    const curPers = Number(this.wizardData.persRanks[idx] ?? 0);

    if (pool === "occ") {
      const occUsed = [...Object.values(this.wizardData.occRanks), ...Object.values(this.wizardData.occPowerRanks)].reduce((s, v) => s + Number(v || 0), 0);
      const maxByBudget = budgets.occupational - (occUsed - curOcc);
      const maxByCap = Math.max(0, rules.creationSkillCap - (base + curPers));
      const next = Math.clamp(curOcc + delta, 0, Math.min(maxByBudget, maxByCap));
      this.wizardData.occRanks[idx] = next;
    } else {
      const persUsed = [...Object.values(this.wizardData.persRanks), ...Object.values(this.wizardData.persPowerRanks)].reduce((s, v) => s + Number(v || 0), 0);
      const maxByBudget = budgets.personal - (persUsed - curPers);
      const maxByCap = Math.max(0, rules.creationSkillCap - (base + curOcc));
      const next = Math.clamp(curPers + delta, 0, Math.min(maxByBudget, maxByCap));
      this.wizardData.persRanks[idx] = next;
    }
    this.render();
  }

  static #onViewWizardPower(event,target) {
    event.preventDefault();
    const idx=Number(target.dataset.index);
    if(!this.powerCatalog[idx]||!isPowerSystemEnabled(this.powerCatalog[idx].system?.system))return;
    this.wizardData.powerPreviewIndex=idx;
    this.render();
  }

  static #onAddWizardPower(event) {
    event.preventDefault();
    const sel = this.element.querySelector("[data-wiz-power-select]");
    if (!sel) return;
    if(sel.value==='')return ui.notifications.warn('Choose a power and inspect its rules first.');
    const idx = Number(sel.value);
    if(Number.isInteger(idx))this.wizardData.powerPreviewIndex=idx;
    if (Number.isInteger(idx) && this.powerCatalog[idx] && isPowerSystemEnabled(this.powerCatalog[idx].system?.system) && !this.wizardData.selectedPowers.includes(idx)) {
      this.wizardData.selectedPowers.push(idx);
      this.render();
    }
  }

  static #onRemoveWizardPower(event, target) {
    event.preventDefault();
    const idx = Number(target.dataset.index);
    this.wizardData.selectedPowers = this.wizardData.selectedPowers.filter(i=>i!==idx);
    if(this.wizardData.powerPreviewIndex===idx)this.wizardData.powerPreviewIndex=null;
    delete this.wizardData.occPowerRanks[idx];
    delete this.wizardData.persPowerRanks[idx];
    this.render();
  }

  static #onAllocatePower(event, target) {
    event.preventDefault();
    const idx = Number(target.dataset.index);
    const tmpl = this.powerCatalog[idx];
    if (!tmpl || !["Magic","Psychic"].includes(tmpl.system.system)) return;
    const pool = target.dataset.pool;
    const delta = Number(target.dataset.delta || 0);
    const rules = getCampaignRules();
    const ch = this.#getCreationCharacteristics(rules);
    const base = tmpl.system.system === "Magic" ? ch.int : ch.pow;
    const currentOcc = Number(this.wizardData.occPowerRanks[idx] ?? 0);
    const currentPers = Number(this.wizardData.persPowerRanks[idx] ?? 0);
    const budgets = this.#getSkillBudgets(rules);
    const occUsed = [...Object.values(this.wizardData.occRanks),...Object.values(this.wizardData.occPowerRanks)].reduce((s,v)=>s+Number(v||0),0);
    const persUsed = [...Object.values(this.wizardData.persRanks),...Object.values(this.wizardData.persPowerRanks)].reduce((s,v)=>s+Number(v||0),0);
    if (pool === "occ") {
      const allowed = tmpl.system.system === "Magic" && /occult|priest|shaman|wizard|นักเวท|พ่อมด|แม่มด|นักบวช|หมอผี|ไสย/i.test(`${this.#getProfession()?.id} ${this.#getProfession()?.name}`);
      if (!allowed) return ui.notifications.warn("ใช้แต้มอาชีพกับ Magic เฉพาะอาชีพสายเวทที่ GM อนุญาต; Psychic ใช้แต้มส่วนตัวตามกฎเริ่มต้น");
      this.wizardData.occPowerRanks[idx] = Math.max(0, Math.min(currentOcc + delta, budgets.occupational - (occUsed - currentOcc), rules.creationSkillCap - base - currentPers));
    } else {
      this.wizardData.persPowerRanks[idx] = Math.max(0, Math.min(currentPers + delta, budgets.personal - (persUsed - currentPers), rules.creationSkillCap - base - currentOcc));
    }
    this.render();
  }

  static #onToggleStarterReference(event,target) {
    const type=String(target.dataset.gearType||'');
    const ref=String(target.dataset.ref||'');
    const field=type==='armor'?'selectedArmorRefs':type==='weapon'?'selectedWeaponRefs':null;
    if(!field||!ref)return;
    const current=[...this.wizardData[field]];
    this.wizardData[field]=current.includes(ref)?current.filter(r=>r!==ref):[...current,ref];
  }

  static async #onFinishWizard(event) {
    event.preventDefault();
    const actorDoc = (this.targetActor?.id ? game.actors?.get(this.targetActor.id) : null) ?? this.targetActor;
    if (!actorDoc) {
      ui.notifications.error("ไม่พบตัวละครเป้าหมายสำหรับบันทึกข้อมูล");
      return;
    }
    // Completed Actors must never be rebuilt from a reopened Wizard by accident.
    if(actorDoc.getFlag?.('brp-uge','creationCompleted') && this.wizardData.professionChanged){
      const saved=actorDoc.items?.find?.(item=>item.type==='occupation');
      if(saved?.uuid!==this.wizardData.professionId && 
        actorDoc.items?.some?.(item=>item.type==='skill'&&Number(item.system.occupationBonus||0)>0)){
        ui.notifications.warn('Changing the Occupation of a completed Actor requires explicit point migration. Existing occupation points remain protected; use the GM skill editor or create a new Actor.');
        this.step=4;this.render();return;
      }
    }
    if(actorDoc.getFlag?.('brp-uge','creationCompleted') &&
      (!this.wizardData.allowRebuild || !game.user?.isGM)) {
      ui.notifications.warn('Completed character protected. Use the GM Unlock Rebuild control in step 6.');
      this.step=6;this.render();return;
    }

    try {
      const rules = getCampaignRules();
      const occUsed=[...Object.values(this.wizardData.occRanks),...Object.values(this.wizardData.occPowerRanks)].reduce((s,v)=>s+Number(v||0),0);
      const persUsed=[...Object.values(this.wizardData.persRanks),...Object.values(this.wizardData.persPowerRanks)].reduce((s,v)=>s+Number(v||0),0);
      // Never silently treat on-open existing preview values as freshly rolled.
      if (this.wizardData.method !== "point_buy" && !this.wizardData.hasGeneratedCharacteristics) {
        ui.notifications.warn(game.settings.get("brp-uge", "uiLanguage") === "th"
          ? "กรุณาเลือกวิธีสร้างค่าสถานะและกดทอยด้วยตนเองในขั้นตอนที่ 1 หรือเลือก Point-Buy ก่อนบันทึก"
          : "Choose your characteristic method and explicitly roll in step 1, or choose Point-Buy before saving.");
        this.step=1;this.render();return;
      }
      const result=validateCreation({characteristics:this.wizardData.characteristics,useEdu:rules.useEdu,
        age:this.wizardData.age,ageReference:this.wizardData.ageReference,level:rules.powerLevel,
        method:this.wizardData.method,rolledBasis:this.wizardData.rolledBasis,professionSpent:occUsed,personalSpent:persUsed,
        increasedPersonal:rules.increasedPersonalSkillPoints,occupationBudgetMethod:rules.occupationBudgetMethod});
      const invalidOccupation = Object.entries(this.wizardData.occRanks).some(([idx,n])=>Number(n)>0 && !this.#isOccupationalSkill(this.skillCatalog[Number(idx)],this.#getProfession()));
      if(invalidOccupation)result.errors.push('Occupation points are assigned to non-occupational skills');
      // Revalidate the skill cap at final commit: Personality or category settings
      // might have changed AFTER allocating professional/personal points.
      if(Number.isFinite(rules.creationSkillCap)) for(const [idx,tpl] of this.skillCatalog.entries()) {
        const raw=this.#computeDynamicBase(tpl)
          + categoryBonusPreview(this.#getCreationCharacteristics(rules),tpl.system.category,rules.categoryBonusMode,rules.useEdu)
          + (this.wizardData.personalitySkillKeys.includes(tpl.system.referenceKey||tpl.system.nameEn||tpl.name)?20:0);
        const allocated=Number(this.wizardData.occRanks[idx]??0)+Number(this.wizardData.persRanks[idx]??0);
        if(allocated>0 && raw+allocated>rules.creationSkillCap) {
          result.errors.push(`Skill exceeds creation cap: ${tpl.system.nameEn||tpl.name}`);
          break;
        }
      }
      if(result.errors.length) {ui.notifications.error(result.errors.join(' · '));return;}
      if(result.warnings.length) ui.notifications.warn(result.warnings.join(' · '));
      if(this.wizardData.ageReference==null) {
        ui.notifications.warn('Starting age has not been rolled: 17+1D6. Age-based bonuses cannot be calculated without a reference age.');
      }
      if(!this.skillCatalog.length) {
        ui.notifications.error(game.settings.get('brp-uge','uiLanguage')==='th'
          ? 'ยังไม่มีข้อมูลทักษะสำหรับสร้างตัวละคร โปรดติดตั้ง/นำเข้า Skills Compendium ก่อน'
          : 'No Skills source is available. Install/import a Skills Compendium before finishing this character.');
        this.step=4;this.render();return;
      }
      if(this.wizardData.ageReference==null && !game.user?.isGM) {
        ui.notifications.error('Roll the starting age (17+1D6) in step 3 before saving.');
        this.step=3;this.render();return;
      }
      if(this.wizardData.personalityType!=='none'&&this.wizardData.personalitySkillKeys.length!==13) {
        ui.notifications.error('BRP Personality optional step requires exactly 13 skills (20 points each)');return;
      }
      const uiLang = game.settings.get("brp-uge", "uiLanguage") || "th";
      const prof = this.#getProfession() || {name:'',nameTh:'',description:'',descriptionTh:'',skillRefs:[],wealthRef:'',wealthEnabled:false};
      // Rulebook choice clauses cannot be safely invented from free-text
      // Occupation prose. Do not finish with missing professional choices.
      const occupationText=this.#plainRuleText((prof.description||'')+' '+(prof.descriptionTh||''));
      if(prof.sourceUuid && occupationChoiceMetadataMissing(prof,occupationText)){
        ui.notifications.error(uiLang==='th'
          ?'อาชีพนี้ยังไม่มี Choice Groups สำหรับตัวเลือกทักษะตามกฎ กรุณาให้ GM กำหนดก่อนบันทึก'
          :'This Occupation is missing structured Skill Choice Groups. Ask the GM to configure them before saving.');
        this.step=4;this.render();return;
      }
      const choiceStatus=this.#occupationChoiceStatus(prof);
      if(!choiceStatus.valid){
        ui.notifications.error(choiceStatus.errors.join(' · '));
        this.step=4;this.render();return;
      }
      const professionCoverage=occupationSkillCoverage(this.skillCatalog,prof.skillRefs);
      if (prof.sourceUuid && professionCoverage.missing.length) {
        const label=game.settings.get('brp-uge','uiLanguage')==='th'
          ? `ไม่พบทักษะที่อาชีพอ้างอิง ${professionCoverage.missing.length} รายการ กรุณาตรวจว่าได้นำเข้า Skills Pack แล้ว จากนั้นเปิด Wizard ใหม่`
          : `${professionCoverage.missing.length} occupation Skill links could not be resolved. Import the Skills pack, then reopen the Wizard.`;
        ui.notifications.error(label);
        console.warn('BRP-UGE | Missing occupation Skill references',professionCoverage.missing);
        this.step=4;this.render();return;
      }
      // Resolve source before ANY Actor mutation. Missing Compendium data must
      // not produce a half-saved character or overwrite existing resources.
      const resolvedOccupation=prof.sourceUuid?await fromUuid(prof.sourceUuid).catch(()=>null):null;
      if(prof.sourceUuid && resolvedOccupation?.type!=='occupation'){
        ui.notifications.error('Selected Occupation Item is unavailable. No changes were saved.');
        this.step=4;this.render();return;
      }
      // Starter equipment is part of the Occupation benefit. A missing pack
      // should be visible before writing to Actor documents, not silently skipped.
      const requiredGear=[
        ...this.wizardData.selectedWeaponRefs.map(ref=>({ref,type:'weapon'})),
        ...this.wizardData.selectedArmorRefs.map(ref=>({ref,type:'armor'}))
      ];
      const unresolvedGear=[];
      for(const entry of requiredGear){
        const source=await fromUuid(entry.ref).catch(()=>null);
        if(!source || source.type!==entry.type)unresolvedGear.push(entry.ref);
      }
      if(unresolvedGear.length){
        ui.notifications.error('Missing Occupation equipment sources: '+unresolvedGear.join(', ')+'. No changes were saved.');
        this.step=5;this.render();return;
      }
      const ch = this.wizardData.characteristics;
      const effective=this.#getCreationCharacteristics(rules);
      const maxHp = rules.heroicHitPoints ? effective.con + effective.siz : Math.ceil((effective.con + effective.siz) / 2);
      const maxPp = effective.pow;
      const maxFp = effective.str + effective.con;
      const startSan = Math.min(99, effective.pow * 5);

      // An empty library must not prevent creation of a blank character.
      // Occupation data is optional until the GM creates or imports an Item.
      await actorDoc.update({
        name: this.wizardData.name || actorDoc.name,
        "system.culture": this.wizardData.culture,
        "system.age": Number(this.wizardData.age || 20),
        "system.startingAge": Number(this.wizardData.ageReference ?? this.wizardData.age ?? 20),
        "system.applyAgingRules": true,
        "system.ageReference":this.wizardData.ageReference==null?null:Number(this.wizardData.ageReference),
        "system.ageYouthCharacteristic":this.wizardData.ageYouthCharacteristic,
        "system.agingPriority":this.wizardData.agingPriority,
        "system.personalityType":this.wizardData.personalityType,
        "system.gender": this.wizardData.gender,
        "system.playerName": this.wizardData.playerName,
        "system.handedness": this.wizardData.handedness,
        "system.height": this.wizardData.height,
        "system.weight": this.wizardData.weight,
        "system.religion": this.wizardData.religion,
        "system.distinctiveFeatures": this.wizardData.distinctiveFeatures,
        "system.personalDescription": this.wizardData.personalDescription,
        "system.characteristics.str.value": ch.str,
        "system.characteristics.con.value": ch.con,
        "system.characteristics.siz.value": ch.siz,
        "system.characteristics.int.value": ch.int,
        "system.characteristics.pow.value": ch.pow,
        "system.characteristics.dex.value": ch.dex,
        "system.characteristics.cha.value": ch.cha,
        "system.characteristics.edu.value": ch.edu,
        "system.hp.value": maxHp,
        "system.hp.max": maxHp,
        "system.pp.value": maxPp,
        "system.pp.max": maxPp,
        "system.fp.value": maxFp,
        "system.fp.max": maxFp,
        "system.san.value": startSan,
        "system.san.max": 99,
        "system.mov": 10
      });

      // Occupations are actual Foundry Items, allowing GM-built world Items to be
      // dragged to Actor sheets and reused in future Wizards. No World Item is edited.
      if(prof.sourceUuid) {
        const occupationData=documentToEmbeddedItem(resolvedOccupation);
        occupationData.flags??={};
        occupationData.flags['brp-uge']={...(occupationData.flags['brp-uge']??{}),wizardId:prof.id};
        const oldJob=actorDoc.items.find(i=>i.type==='occupation');
        if(oldJob)await oldJob.update({name:occupationData.name,img:occupationData.img,
          system:occupationData.system,'flags.brp-uge.wizardId':prof.id});
        else await actorDoc.createEmbeddedDocuments('Item',[occupationData]);
      }

      // The initial character sheet must contain ALL available baseline skills,
      // not only the ones on which a player spent points. Dedupe on source key.
      // Reopening the Wizard must never duplicate or reset existing skills.
      const skillUpdates = [];
      const skillsToCreate = [];
      // A Skill Family is a selectable group, not an order to copy all
      // published examples into every new Actor. Explicit selections remain.
      const selectedFoundation=new Set(configuredStartingSkills(this.skillCatalog).filter(
        item=>!analyzeSkillFamily(item)?.supportsSpecialty&&!isSkillFamilyTemplate(item)));
      this.skillCatalog.forEach((tpl, idx) => {
        const occupationBonus = Number(this.wizardData.occRanks[idx] ?? 0);
        const personalBonus = Number(this.wizardData.persRanks[idx] ?? 0);
        const personalityKey=tpl.system.referenceKey||tpl.system.nameEn||tpl.name;
        const personalityBonus=this.wizardData.personalitySkillKeys.includes(personalityKey)?20:0;
        const rank = occupationBonus + personalBonus + personalityBonus;
        // Keep occupation-linked or allocated Skills even if the GM excluded
        // them from the automatic baseline selection.
        const explicitlyChosen=Object.values(this.wizardData.choiceSelections).flat().includes(canonicalSkillKey(tpl))
          ||this.wizardData.personalSpecialtyKeys.includes(canonicalSkillKey(tpl));
        const info=analyzeSkillFamily(tpl);
        // An unreviewed "(various)" or slash-compound source is not a
        // concrete character skill unless the Actor already owned it.
        const actorAlreadyHas=actorDoc.items.some(item=>item.type==='skill'&&sameSkill(item,tpl));
        if(info?.supportsSpecialty&&specialtyNeedsReview(info.enSpecialty)&&!actorAlreadyHas)return;
        if(!selectedFoundation.has(tpl) && rank===0 && !this.#isOccupationalSkill(tpl,prof)&&!explicitlyChosen)return;
        const existing = actorDoc.items.find(i=>i.type==='skill'&&sameSkill(i,tpl));
        if (existing) {
          // Reopening an already completed character must not wipe skills just
          // because the player visited the Wizard without re-allocating them.
          const creationCompleted=Boolean(actorDoc.getFlag?.('brp-uge','creationCompleted')
            ??actorDoc.flags?.['brp-uge']?.creationCompleted);
          const skillTouched=this.wizardData.touchedSkillIndices.includes(idx);
          if(creationCompleted&&!skillTouched&&!this.wizardData.touchedPersonality)return;
          if(creationCompleted){
            // Never infer zero from a blank Wizard draft for an existing skill.
            // Only explicit row edits change its existing profession/personal pools.
            const changes={_id:existing.id};
            if(skillTouched){
              changes['system.occupationBonus']=occupationBonus;
              changes['system.personalBonus']=personalBonus;
            }
            if(this.wizardData.touchedPersonality)changes['system.personalityBonus']=personalityBonus;
            skillUpdates.push(changes);
            return;
          }
          // New creation: retain training from a prior legacy migration.
          const oldOcc=Number(existing.system.occupationBonus??0);
          const oldPers=Number(existing.system.personalBonus??0);
          const legacyRank=Number(existing.system.rank??0);
          skillUpdates.push({
            _id:existing.id,
            'system.occupationBonus':occupationBonus,
            'system.personalBonus':personalBonus,
            'system.personalityBonus':personalityBonus,
            'system.referenceKey':personalityKey,
            'system.rank':oldOcc||oldPers?legacyRank:0
          });
        } else {
          // Baseline skills are copied from the external library at printed base
          // even if neither pool has been spent on the skill.
          const clone = foundry.utils.deepClone(tpl);
          delete clone._id; // Never import a Compendium document _id into an Actor
          clone.system.occupationBonus = occupationBonus;
          clone.system.personalBonus = personalBonus;
          clone.system.personalityBonus = personalityBonus;
          clone.system.referenceKey = personalityKey;
          clone.system.rank = 0;
          skillsToCreate.push(clone);
        }
      });

      if (skillUpdates.length) await actorDoc.updateEmbeddedDocuments("Item", skillUpdates);
      if (skillsToCreate.length) await actorDoc.createEmbeddedDocuments("Item", skillsToCreate);

      // Create/update chosen powers with persistent, distinct allocations.
      const powerUpdates = [], powerCreates = [];
      for (const idx of this.wizardData.selectedPowers) {
        const source = this.powerCatalog[idx]; if (!source || !isPowerSystemEnabled(source.system.system)) continue;
        const existing = actorDoc.items.find(i => i.type === "power" &&
          (i.name === source.name || (i.system.nameEn && source.system.nameEn && i.system.nameEn===source.system.nameEn)));
        const occ = Number(this.wizardData.occPowerRanks[idx] ?? 0);
        const pers = Number(this.wizardData.persPowerRanks[idx] ?? 0);
        if (existing) powerUpdates.push({_id: existing.id, "system.occupationBonus": occ, "system.personalBonus": pers});
        else { const copy=foundry.utils.deepClone(source); delete copy._id; copy.system.occupationBonus=occ; copy.system.personalBonus=pers; powerCreates.push(copy); }
      }
      if (powerUpdates.length) await actorDoc.updateEmbeddedDocuments("Item", powerUpdates);
      if (powerCreates.length) await actorDoc.createEmbeddedDocuments("Item",powerCreates);

      // Add selected starter weapons & armor
      const gearToAdd = [];
      // Occupation gear references must resolve to existing World/Module Items.
      const selectedGearRefs=[...this.wizardData.selectedWeaponRefs.map(ref=>({ref,type:'weapon'})),
        ...this.wizardData.selectedArmorRefs.map(ref=>({ref,type:'armor'}))];
      for(const selected of selectedGearRefs) {
        let document=null;
        if(selected.ref.startsWith('Compendium.')||selected.ref.startsWith('Item.')||selected.ref.startsWith('Actor.')) {
          document=await fromUuid(selected.ref).catch(()=>null);
        }
        if(!document||document.type!==selected.type)continue;
        const data=documentToEmbeddedItem(document);
        // Do not rely on translated item names for duplicate detection.
        const sourceId=selected.ref;
        if(actorDoc.items.some(i=>i.getFlag?.('core','sourceId')===sourceId || i.getFlag?.('brp-uge','sourceUuid')===sourceId))continue;
        if(gearToAdd.some(i=>i.flags?.core?.sourceId===sourceId))continue;
        delete data._id;
        data.flags??={};data.flags.core??={};data.flags.core.sourceId=sourceId;
        if(selected.type==='armor')data.system.equipped=true;
        gearToAdd.push(data);
      }
      if (gearToAdd.length) await actorDoc.createEmbeddedDocuments("Item", gearToAdd);

      await actorDoc.setFlag("brp-uge", "creationOccupationChoices",
        structuredClone(this.wizardData.choiceSelections));
      await actorDoc.setFlag("brp-uge", "creationCompleted", true);
      ui.notifications.info(`สร้างตัวละคร "${this.wizardData.name}" (${prof.nameTh}) เสร็จสมบูรณ์แล้ว!`);
      await this.close();
      if (actorDoc.sheet) {
        await actorDoc.sheet.render({ force: true });
        actorDoc.sheet.bringToFront?.();
      }
    } catch (err) {
      console.error("BRP-UGE | Failed to save character from Wizard:", err);
      ui.notifications.error(`บันทึกตัวละครไม่สำเร็จ: ${err?.message ?? err}`);
    }
  }
}