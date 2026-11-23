import { BRP_CONFIG, getCampaignRules } from "./module/config.mjs";
import { PAPER_THEMES, applyPaperTheme, currentPaperTheme } from "./module/paper-appearance.mjs";
import {
  CharacterDataModel,
  NPCDataModel,
  SkillDataModel,
  WeaponDataModel,
  ArmorDataModel,
  ShieldDataModel,
  PowerDataModel,
  PassionDataModel,
  GearDataModel,
  OccupationDataModel,
  WealthDataModel,
  StatusItemDataModel
} from "./module/data-models.mjs";
import { BRPActor, BRPItem, BRPCombat } from "./module/documents.mjs";
import { BRPActorSheet } from "./module/sheets/actor-sheet.mjs";
import { BRPItemSheet } from "./module/sheets/item-sheet.mjs";
import { BRPRolls } from "./module/rolls/brp-rolls.mjs";
import { BRP_MACROS } from "./module/macros/brp-macros.mjs";
import { BRPCompendiumBrowser } from "./module/compendium-browser.mjs";
import { BRPCharacterWizard } from "./module/apps/character-wizard.mjs";
import { BRPCombatPhases } from "./module/combat/combat-phases.mjs";
import { applyStatusTemplate } from "./module/status-template.mjs";
import { ensureActorFoundationSkills } from "./module/skill-foundation.mjs";
import { configureStartingSkills } from "./module/skill-selection.mjs";
import { StartingSkillsMenu } from "./module/apps/starting-skills-menu.mjs";
import { SpecialtyPresetsMenu } from "./module/apps/specialty-presets-menu.mjs";
import { installBRPSettingsUI } from "./module/apps/settings-organization.mjs";


function refreshBRPWorldUI() {
  try {
    for (const actor of game.actors?.values?.() ?? []) {
      actor.prepareData();
    }
    const instances = foundry?.applications?.instances?.values?.() ?? [];
    for (const app of instances) {
      if (["BRPActorSheet", "BRPCharacterWizard", "BRPCompendiumBrowser", "BRPItemSheet"].includes(app?.constructor?.name)) {
        app.render();
      }
    }
    ui.combat?.render();
  } catch (err) {
    console.warn("BRP-UGE | Failed to refresh open sheets after setting change:", err);
  }
}

/**
 * Phase 1B switches the actual Header Handlebars template, not only tokens.
 * Do not mutate the class of an already-rendered opposite-layout Header:
 * doing so leaves unmatched HTML and would risk discarding unsaved form data
 * if we forcibly rerender the document. Users safely reopen the sheet.
 */
function refreshUI2Preview(enabled) {
  const instances = foundry?.applications?.instances?.values?.() ?? [];
  const openCharacters = [...instances].some(app =>
    app?.constructor?.name === "BRPActorSheet"
    && app.document?.type === "character"
    && app.element?.querySelector?.(".brp-sheet"));
  if (!openCharacters) return;
  const isTh = game.settings.get("brp-uge", "uiLanguage") !== "en";
  ui.notifications?.info(isTh
    ? "เปลี่ยน UI2 Preview แล้ว กรุณาปิดและเปิดชีทตัวละครอีกครั้งหลังบันทึกข้อมูลที่แก้ค้างไว้"
    : "UI2 Preview changed. Save any in-progress edits, then close and reopen the Character Sheet.");
}

Hooks.once("init", async () => {
  console.log("BRP-UGE | Initializing Basic Roleplaying: Universal Game Engine v1.21.10 (Foundry V14)");

  if (globalThis.Handlebars && !Handlebars.helpers.eq) {
    Handlebars.registerHelper("eq", (a, b) => a === b);
  }

  game.brp = {
    config: BRP_CONFIG,
    rolls: BRPRolls,
    macros: BRP_MACROS,
    combat: BRPCombatPhases,
    getCampaignRules,
    configureStartingSkills,
    openWizard: (actor) => {
      try {
        const target = actor ?? canvas.tokens?.controlled?.[0]?.actor ?? game.user?.character;
        if (!target) {
          ui.notifications.warn("กรุณาเลือกหรือเปิดชีทตัวละครก่อนเรียกใช้ตัวช่วยสร้างตัวละคร");
          return null;
        }
        const wiz = new BRPCharacterWizard({ actor: target });
        wiz.render({ force: true });
        return wiz;
      } catch (err) {
        console.error("BRP-UGE | Failed to open Character Creation Wizard:", err);
        ui.notifications.error(`ไม่สามารถเปิดหน้าต่างตัวช่วยสร้างตัวละครได้: ${err?.message ?? err}`);
        return null;
      }
    },
    openCompendium: (options = {}) => new BRPCompendiumBrowser(options).render({ force: true }),
    appearance: {
      getTheme: () => currentPaperTheme(),
      async setTheme(value) { return game.settings.set('brp-uge', 'paperTheme', value === 'dark' ? 'dark' : 'light'); },
      iconResolver: null,
      registerIconResolver(resolver) { this.iconResolver = typeof resolver === 'function' ? resolver : null; }
    }
  };

  CONFIG.Actor.documentClass = BRPActor;
  CONFIG.Item.documentClass = BRPItem;
  CONFIG.Combat.documentClass = BRPCombat;
  CONFIG.Combat.initiative = {
    formula: "@characteristics.dex.value",
    decimals: 0
  };

  CONFIG.Actor.dataModels = {
    character: CharacterDataModel,
    npc: NPCDataModel
  };
  CONFIG.Item.dataModels = {
    skill: SkillDataModel,
    weapon: WeaponDataModel,
    armor: ArmorDataModel,
    shield: ShieldDataModel,
    power: PowerDataModel,
    passion: PassionDataModel,
    gear: GearDataModel,
    occupation: OccupationDataModel,
    wealth: WealthDataModel,
    status: StatusItemDataModel
  };

  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: ["hp", "pp", "fp", "san"],
      value: ["mov"]
    },
    npc: {
      bar: ["hp", "pp"],
      value: ["mov"]
    }
  };

  // Client Language
  game.settings.register("brp-uge", "uiLanguage", {
    name: "ภาษาของระบบ / System UI Language",
    hint: "เลือกภาษาหลักสำหรับชีทตัวละคร การ์ดทอยลูกเต๋า ตัวช่วยสร้างตัวละคร และคลังข้อมูล (ค่าเริ่มต้น: ไทย)",
    scope: "client",
    config: true,
    type: String,
    choices: {
      th: "ภาษาไทย (Thai)",
      en: "English"
    },
    default: "th",
    onChange: refreshBRPWorldUI
  });

  // Paper notebook presentation is per client. Optional Genre/Palette modules
  // own their own settings and may override the public CSS custom properties.
  game.settings.register('brp-uge', 'paperTheme', {
    name: 'รูปแบบกระดาษ / Notebook Appearance',
    hint: 'Light: กระดาษครีมและหมึกเข้ม · Dark: กระดาษสีถ่านและหมึกอ่อน (เฉพาะผู้ใช้นี้)',
    scope: 'client', config: true, type: String,
    choices: PAPER_THEMES, default: 'light',
    onChange: () => applyPaperTheme()
  });
  applyPaperTheme();

  // UI 2.0 Phase 1A foundation: opt-in, per CLIENT, default OFF.
  // The flag only scopes CSS on Character Sheet; no rules or data migration.
  game.settings.register('brp-uge', 'ui2Preview', {
    name: 'UI 2.0 Foundation Preview / ทดลองโครงสร้าง UI ใหม่',
    hint: 'ทดลอง Character Header 2.0 เฉพาะผู้ใช้นี้ (ค่าเริ่มต้นปิด) บันทึกข้อมูลที่แก้ค้างอยู่ แล้วปิด/เปิดชีทใหม่เมื่อเปลี่ยนค่านี้ ไม่เปลี่ยนข้อมูล Actor',
    scope: 'client', config: true, type: Boolean, default: false,
    onChange: refreshUI2Preview
  });

  // GM-Only World Rules (Prevent players from modifying core campaign rules)
  game.settings.register("brp-uge", "itemTooltipLanguage", {
    name: "ภาษาคำอธิบายไอเท็ม / Item Tooltip Language (GM)",
    hint: "กำหนดภาษาของคำอธิบายไอเท็มและพลังใน Tooltip สำหรับทุกคน (ภาษาไทยหรืออังกฤษ)",
    scope: "world", config: true, type: String,
    choices: { th: "ภาษาไทย (Thai)", en: "English" },
    default: "th",
    onChange: refreshBRPWorldUI
  });

  // World-editable dropdown suggestions. Existing free text stays valid.
  for (const [key, title, value] of [
    ["woundSuggestions", "รายการบาดแผล / Wound suggestions", ""],
    ["bodySuggestions", "ตำแหน่งร่างกาย / Body locations", ""],
    ["mentalSuggestions", "รายการอาการทางจิต / Mental conditions", ""]
  ]) game.settings.register("brp-uge", key, {
    name: title, hint: "แยกรายการด้วย | สามารถพิมพ์รายการใหม่ในฟอร์มได้เสมอ",
    scope: "world", config: true, restricted: true, type: String, default: value
  });

  game.settings.register("brp-uge", "campaignPowerLevel", {
    name: "ระดับพลังแคมเปญ / Campaign Power Level (GM)",
    hint: "กำหนดงบแต้มทักษะอาชีพ (Normal 250 / Heroic 325 / Epic 400 / Superhuman 500) และ Point-Buy",
    scope: "world",
    config: true,
    restricted: true,
    type: String,
    choices: {
      normal: "Normal — 250 แต้มอาชีพ / Point-Buy 24 (ถ่วงน้ำหนัก)",
      heroic: "Heroic — 325 / Point-Buy 36",
      epic: "Epic — 400 / Point-Buy 48",
      superhuman: "Superhuman — 500 / Point-Buy 60"
    },
    default: "normal",
    onChange: refreshBRPWorldUI
  });

  game.settings.register("brp-uge", "occupationBudgetMethod", {
    name: "วิธีคิดแต้มอาชีพ / Occupation Skill Budget (GM)",
    hint: "Fixed: Normal 250 / Heroic 325 / Epic 400 / Superhuman 500. EDU option uses EDU × level multiplier only when explicitly selected.",
    scope: "world", config: true, restricted: true, type: String,
    choices: { fixed: "Fixed power-level budget (Normal 250)", edu: "Optional EDU × multiplier (requires EDU)" },
    default: "fixed", onChange: refreshBRPWorldUI
  });
  game.settings.register("brp-uge", "startingSkillsSource", {
    name: "แหล่งทักษะพื้นฐานของตัวละครใหม่ / Starting Skills (GM)",
    hint: "All newly created characters and NPCs receive one copy of each available Skill Item with its base chance. Requires installed World Skills or a Compendium. No fallback data is bundled.",
    scope: "world", config: true, restricted: true, type: String,
    choices: {all: "World Items + installed Compendium Skills",world: "World Items only"},
    default: "all"
  });

  game.settings.register('brp-uge','startingSkillsMode',{
    name:'รายการทักษะตั้งต้น / Starting Skill Selection',
    hint:'เลือกใช้ทักษะทุกชนิดที่พบ หรือเฉพาะรายการที่ GM เลือกผ่านตัวจัดการทักษะตั้งต้น',
    scope:'world',config:true,restricted:true,type:String,
    choices:{all:'All available Skills (legacy behavior)',baseline:'Generic baseline Skills only',book:'Skills identified as rulebook entries',selected:'GM selected Skills'},default:'all'
  });
  game.settings.register('brp-uge','startingSkillsKeys',{
    name:'Selected starting skill keys',scope:'world',config:false,restricted:true,type:String,default:'[]'
  });

  // Native V14 settings submenu: visible even when SettingsConfig DOM changes.
  game.settings.registerMenu('brp-uge','manageStartingSkills',{
    name:'จัดการทักษะตั้งต้น / Manage Starting Skills',
    label:'เปิดตัวเลือกทักษะ / Choose Skills',
    hint:'กำหนดรายการสำหรับโหมด GM เลือกเองจาก Skill Items ที่ติดตั้งจริง',
    icon:'fa-solid fa-list-check',type:StartingSkillsMenu,restricted:true
  });

  // Specialty definitions are World configuration, not embedded rulebook content.
  // Versioned overlay: source Compendium Skill Items are never mutated by GM choices.
  game.settings.register('brp-uge','specialtyRegistry',{
    name:'Specialty registry / World overrides',
    scope:'world',config:false,restricted:true,type:String,default:'{"schemaVersion":3,"families":{}}',
    onChange: refreshBRPWorldUI
  });
  game.settings.register('brp-uge','specialtyCustomPolicy',{
    name:'New Specialty policy / นโยบายสร้างความเชี่ยวชาญใหม่',
    hint:'Restrict player-created specialties to approved World and Compendium choices, or allow requests for GM review.',
    scope:'world',config:true,restricted:true,type:String,
    choices:{restricted:'GM-managed choices only',approval:'Show custom entry; players must ask GM for approval'},
    default:'restricted'
  });
  game.settings.register('brp-uge','specialtyPresets',{
    name:'Specialty preset options',scope:'world',config:false,restricted:true,type:String,default:'{}',
    onChange: refreshBRPWorldUI
  });
  game.settings.registerMenu('brp-uge','manageSpecialties',{
    name:'ตัวเลือก Specialty / Manage Specialties',
    label:'จัดการความเชี่ยวชาญ / Specialty Presets',
    hint:'เลือกความเชี่ยวชาญเสริมให้ผู้เล่นจากกลุ่มทักษะที่ติดตั้งจริง',
    icon:'fa-solid fa-flask',type:SpecialtyPresetsMenu,restricted:true
  });

  installBRPSettingsUI();

  game.settings.register("brp-uge", "characteristicMethod", {
    name: "วิธีสร้างค่าสถานะเริ่มต้น / Characteristic Generation (GM)",
    hint: "กำหนดวิธีทอยหรือจัดสรรค่าพลังในตัวช่วยสร้างตัวละคร (Character Creation Wizard)",
    scope: "world",
    config: true,
    restricted: true,
    type: String,
    choices: {
      rolled: "Standard Roll (3D6 / 2D6+6)",
      heroic_roll: "Higher Starting Characteristics (2D6+6 ทุกค่าสถานะ)",
      point_buy: "Point-Buy (จัดสรรแต้มเอง)"
    },
    default: "rolled",
    onChange: refreshBRPWorldUI
  });

  game.settings.register("brp-uge", "increasedPersonalSkillPoints", {
    name: "กฎเสริม Increased Personal Skill Points (หน้าที่ 16)",
    hint: "เปิดใช้ INT×15 (Heroic), ×20 (Epic), ×25 (Superhuman) แทนค่าเริ่มต้น INT×10",
    scope: "world", config: true, restricted: true, type: Boolean, default: false,
    onChange: refreshBRPWorldUI
  });

  game.settings.register("brp-uge", "useEdu", {
    name: "เปิดใช้ค่าการศึกษา EDU / Enable Education (GM)",
    hint: "ควบคุมค่า EDU บนชีท การใช้ EDU คิดแต้มอาชีพต้องเลือกแยกที่ Occupation Skill Budget (GM)",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: false,
    onChange: refreshBRPWorldUI
  });

  game.settings.register("brp-uge", "useSanity", {
    name: "เปิดใช้ระบบสติสัมปชัญญะ SAN / Track Sanity (GM)",
    hint: "แสดงกล่องติดตามค่า SAN (POW×5) และปุ่มทอย SAN บนชีทตัวละครทั้งหมด",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: false,
    onChange: refreshBRPWorldUI
  });

  game.settings.register("brp-uge", "useFatigue", {
    name: "เปิดใช้ค่าความเหนื่อยล้า FP / Track Fatigue Points (GM)",
    hint: "แสดงกล่องติดตามค่า FP (STR + CON) บนชีทตัวละครทั้งหมด",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: false,
    onChange: refreshBRPWorldUI
  });

  game.settings.register("brp-uge", "useHitLocations", {
    name: "เปิดใช้ตารางจุดปะทะ / Hit Locations Rule (GM)",
    hint: "แสดงตารางจุดปะทะร่างกาย 7 ส่วน (1D20) ในแท็บอาวุธและเกราะ",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: false,
    onChange: refreshBRPWorldUI
  });

  game.settings.register("brp-uge", "heroicHitPoints", {
    name: "พลังชีวิตแบบ Heroic (HP × 2) / Heroic Hit Points (GM)",
    hint: "กำหนด Max HP = CON + SIZ แทน (CON + SIZ)/2 สำหรับแคมเปญแนววีรบุรุษหรือแอ็กชัน",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: false,
    onChange: refreshBRPWorldUI
  });

  game.settings.register("brp-uge", "categoryBonusMode", {
    name: "กฎโบนัสหมวดหมู่ทักษะ / Skill Category Bonus Rule (GM)",
    hint: "เลือกวิธีคำนวณโบนัสหมวดหมู่ทักษะสำหรับทั้งโลก",
    scope: "world",
    config: true,
    restricted: true,
    type: String,
    choices: {
      standard: "มาตรฐาน BRP (Primary / Secondary)",
      simple: "แบบย่อ (Primary ÷ 2)",
      none: "ไม่ใช้โบนัส (0%)"
    },
    default: "standard",
    onChange: refreshBRPWorldUI
  });

  game.settings.register("brp-uge", "creationSkillCap", {
    name: "เพดานทักษะตอนสร้างตัวละคร / Creation Skill Cap % (GM)",
    hint: "จำกัดค่ารวมสูงสุด (%) ของทักษะระหว่างใช้ตัวช่วยสร้างตัวละคร (มาตรฐาน BRP คือ 75%)",
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    range: {
      min: 50,
      max: 100,
      step: 5
    },
    default: 75,
    onChange: refreshBRPWorldUI
  });

  for (const [type, th] of [["Magic","เวทมนตร์"],["Sorcery","ไสยเวท"],["Psychic","พลังจิต"],["Mutation","กลายพันธุ์"],["Superpower","พลังยอดมนุษย์"]]) {
    game.settings.register("brp-uge", `powerEnable${type}`, {
      name: `อนุญาตพลัง ${th} / Enable ${type} (GM)`,
      hint: "ปิดเพื่อซ่อนจาก Sheet, Wizard และ Browser และป้องกันการใช้พลัง; ไม่ลบ Item ที่มีอยู่",
      scope: "world", config: true, restricted: true, type: Boolean, default: true,
      onChange: refreshBRPWorldUI
    });
  }

  game.settings.register("brp-uge", "useCombatPhases", {
    name: "ระบบต่อสู้แบบแบ่ง 3 เฟส / 3-Phase Combat Tracker (GM)",
    hint: "BRP UGE หน้า 123–125: Statements (DEX) → Powers (INT) → Action & Resolution (DEX). ใช้ Combat Tracker เดิมของ Foundry",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: true,
    onChange: refreshBRPWorldUI
  });

  game.settings.register("brp-uge", "combatStatementOrder", {
    name: "ลำดับการประกาศเจตนา / Statements order (GM)",
    hint: "มาตรฐาน BRP UGE หน้า 123: DEX สูงประกาศก่อน; กฎเสริม: DEX ต่ำประกาศก่อน",
    scope: "world", config: true, restricted: true, type: String,
    choices: { highFirst: "Standard: DEX สูง → ต่ำ", reverse: "Optional: DEX ต่ำ → สูง" },
    default: "highFirst", onChange: refreshBRPWorldUI
  });
  game.settings.register("brp-uge", "combatPowerTiming", {
    name: "เวลาการใช้พลัง / Power timing (GM)",
    hint: "มาตรฐาน: Powers แยกเฟสตาม INT Rank; กฎเสริมหน้า 124: ใช้พลังใน Action phase ตาม INT Rank",
    scope: "world", config: true, restricted: true, type: String,
    choices: { separate: "Standard: Powers เฟสแยก", action: "Optional: Powers ใน Action" },
    default: "separate", onChange: refreshBRPWorldUI
  });
  game.settings.register("brp-uge", "combatShowSceneHUD", {
    name: "แสดงแถบเฟสบน Scene / Scene phase indicator (GM)",
    hint: "แสดง Graphic เฟสปัจจุบันบนหน้าจอ Scene ของทุกคน โดยไม่บังการคลิกโทเคน",
    scope: "world", config: true, restricted: true, type: Boolean, default: true,
    onChange: () => { refreshBRPWorldUI(); BRPCombatPhases.refreshSceneHUD(); }
  });
  game.settings.register("brp-uge", "combatRevealNpcIntent", {
    name: "เปิดเผยแผนของ NPC / Reveal others' intentions (GM)",
    hint: "ค่าเริ่มต้นซ่อนแผนตัวละครที่ผู้เล่นไม่มีสิทธิ์ควบคุม เพื่อไม่เปิดเผยข้อมูล GM",
    scope: "world", config: true, restricted: true, type: Boolean, default: false,
    onChange: refreshBRPWorldUI
  });

  game.settings.register("brp-uge", "useD10Initiative", {
    name: "ใช้ลำดับการเล่น DEX + 1D10 / Use DEX + 1D10 Initiative (GM)",
    hint: "กฎเสริม BRP ที่บวก 1D10 เข้ากับค่า DEX ในทุกรอบต่อสู้",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: false
  });

  game.settings.register("brp-uge", "allowPlayerCharacterWizard", {
    name: "อนุญาตให้ผู้เล่นใช้ปุ่มตัวช่วยสร้างตัวละคร / Player Character Wizard (GM)",
    hint: "แสดงปุ่ม 'ตัวช่วยสร้าง' บนหัวชีทตัวละครให้ผู้เล่นกดเรียกใช้งานได้เองเมื่อต้องการ",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: true,
    onChange: refreshBRPWorldUI
  });

  game.settings.register("brp-uge", "currencyUnits", {
    name: "หน่วยเงินในแคมเปญ / Currency denominations (GM)",
    hint: "คั่นแต่ละหน่วยด้วย | เช่น เหรียญทอง|เหรียญเงิน|เหรียญทองแดง ผู้เล่นจะมีช่องนับแต่ละหน่วย",
    scope:"world", config:true, restricted:true, type:String,
    default:"", onChange:refreshBRPWorldUI
  });
  const ActorsCollection = foundry.documents?.collections?.Actors ?? globalThis.Actors;
  const ItemsCollection = foundry.documents?.collections?.Items ?? globalThis.Items;
  const DocumentSheetConfigCls = foundry.applications?.apps?.DocumentSheetConfig ?? globalThis.DocumentSheetConfig;

  if (ActorsCollection?.registerSheet) {
    ActorsCollection.registerSheet("brp-uge", BRPActorSheet, {
      types: ["character", "npc"],
      makeDefault: true,
      label: "BRP Universal Actor Sheet (Paper Light/Dark · TH/EN)"
    });
  } else if (DocumentSheetConfigCls?.registerSheet) {
    DocumentSheetConfigCls.registerSheet(foundry.documents.Actor, "brp-uge", BRPActorSheet, {
      types: ["character", "npc"],
      makeDefault: true,
      label: "BRP Universal Actor Sheet (Paper Light/Dark · TH/EN)"
    });
  }

  if (ItemsCollection?.registerSheet) {
    ItemsCollection.registerSheet("brp-uge", BRPItemSheet, {
      types: ["skill", "weapon", "armor", "shield", "power", "passion", "gear", "occupation", "wealth", "status"],
      makeDefault: true,
      label: "BRP Universal Item Sheet"
    });
  } else if (DocumentSheetConfigCls?.registerSheet) {
    DocumentSheetConfigCls.registerSheet(foundry.documents.Item, "brp-uge", BRPItemSheet, {
      types: ["skill", "weapon", "armor", "shield", "power", "passion", "gear", "occupation", "wealth", "status"],
      makeDefault: true,
      label: "BRP Universal Item Sheet"
    });
  }

  const loadTpl = foundry.applications?.handlebars?.loadTemplates ?? globalThis.loadTemplates;
  if (loadTpl) {
    await loadTpl([
      "systems/brp-uge/templates/actor/character-sheet.hbs",
      "systems/brp-uge/templates/actor/npc-sheet.hbs",
      "systems/brp-uge/templates/item/item-sheet.hbs",
      "systems/brp-uge/templates/apps/compendium-browser.hbs",
      "systems/brp-uge/templates/apps/character-wizard.hbs",
      "systems/brp-uge/templates/chat/roll-card.hbs",
      "systems/brp-uge/templates/chat/combat-card.hbs",
      "systems/brp-uge/templates/chat/damage-card.hbs"
    ]);
  }
});

Hooks.on("createActor", (actor, options, userId) => {
  if (userId !== game.user?.id) return;
  if (options.fromCompendium || options.pack || actor.pack) return;

  // Starting skills come from active documents, never from built-in preset rules.
  // Complete the asynchronous import before showing a new sheet. Existing
  // skill allocations are never reset; this action is idempotent.
  setTimeout(async () => {
    try {
      if (['character','npc'].includes(actor.type)) {
        const settings=getCampaignRules();
        const result=await ensureActorFoundationSkills(actor,{sources:settings.startingSkillsSource});
        if(result.missingSource) {
          ui.notifications.warn('BRP UGE: No Skills source found. Install/enable a Skill Compendium or create World Skill Items to populate new character sheets.');
        }
      }
      if (actor.sheet) {
        if (!actor.sheet.rendered) {
          await actor.sheet.render({ force: true });
        }
        actor.sheet.bringToFront?.();
      }
    } catch (err) {
      console.warn("BRP-UGE | Could not auto-render new Actor sheet:", err);
    }
  }, 100);
});

// Modular Occupation Items: keep only the stable active Item ID on the Actor.
// Wealth follows the Occupation Item reference and never overwrites free-text fields.
Hooks.on("createItem", (item, _options, userId) => {
  const actor=item.parent;
  if(item.type!=="occupation"||actor?.documentName!=="Actor"||userId!==game.user?.id)return;
  if(!actor.system.activeOccupationId)actor.update({"system.activeOccupationId":item.id})
    .catch(err=>console.warn("BRP UGE | Occupation activation:",err));
});
Hooks.on("deleteItem", (item, _options, userId) => {
  const actor=item.parent;
  if(item.type!=="occupation"||actor?.documentName!=="Actor"||userId!==game.user?.id)return;
  if(actor.system.activeOccupationId!==item.id)return;
  const replacement=actor.items.find(i=>i.type==="occupation"&&i.id!==item.id);
  actor.update({"system.activeOccupationId":replacement?.id||""})
    .catch(err=>console.warn("BRP UGE | Occupation deletion:",err));
});

Hooks.on("renderCombatTracker", (app, html, data) => {
  BRPCombatPhases.onRenderCombatTracker(app, html, data);
});
// The HUD is derived from Encounter state, not a separate timer. No extra turn counter.
for (const hook of ["updateCombat", "updateCombatant", "createCombat", "deleteCombat", "canvasReady", "updateScene", "combatStart"]) {
  Hooks.on(hook, () => BRPCombatPhases.refreshSceneHUD());
}
Hooks.on("updateActor", (_actor, changes) => {
  if (changes?.flags?.["brp-uge"]?.combatPlans !== undefined || changes?.flags?.["brp-uge"]?.combatEngagements !== undefined) {
    (game.combats?.viewed ?? game.combat)?.setupTurns?.();
    ui.combat?.render();
    BRPCombatPhases.refreshSceneHUD();
  }
});


Hooks.on("createItem", async (item, _options, userId) => {
  const actor = item?.parent;
  if (item?.type !== "status" || actor?.documentName !== "Actor" || userId !== game.user?.id) return;
  try {
    await applyStatusTemplate(actor, item);
    // A dropped status template is converted to an actor Status row. It is not
    // retained as a duplicated Item, avoiding double application and clutter.
    await actor.deleteEmbeddedDocuments("Item", [item.id]);
  } catch (error) {
    console.error("BRP UGE | Could not apply dropped Status Item", error);
    ui.notifications?.error(`Status could not be applied: ${error.message}`);
  }
});

Hooks.on("renderChatMessageHTML", (message, html) => {
  if (message?.content?.includes?.("brp-chat-card")) {
    const el = html instanceof HTMLElement ? html : html?.[0];
    el?.classList?.add("brp-styled-chat");
  }
  BRPRolls.bindChatListeners(html);
});


// Core startup is deliberately content-free: no World Compendiums or Journal guides created.
Hooks.once('ready', () => BRPCombatPhases.refreshSceneHUD());

// Establish the user's paper palette once on login; other modules can extend it.
Hooks.once('ready', () => {
  applyPaperTheme();
  const html = globalThis.document?.documentElement;
  globalThis.document?.addEventListener?.('pointerover', (event) => {
    if (html) html.dataset.brpTooltip = event.target?.closest?.('.brp-uge [data-tooltip]') ? 'true' : 'false';
  }, true);
  globalThis.document?.addEventListener?.('focusin', (event) => {
    if (html) html.dataset.brpTooltip = event.target?.closest?.('.brp-uge [data-tooltip]') ? 'true' : 'false';
  }, true);
});