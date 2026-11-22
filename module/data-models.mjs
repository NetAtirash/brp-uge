import { getCampaignRules } from "./config.mjs";
import { characteristicAdjustments, effectiveCharacteristics, statusSkillAdjustment } from "./status-effects.mjs";

const { ArrayField, BooleanField, HTMLField, NumberField, SchemaField, StringField } = foundry.data.fields;

function makeResourceSchema(initialValue = 10, initialMax = 10, minFloor = 0) {
  return new SchemaField({
    min: new NumberField({ required: true, integer: true, initial: minFloor }),
    value: new NumberField({ required: true, integer: true, initial: initialValue }),
    max: new NumberField({ required: true, integer: true, min: 0, initial: initialMax })
  });
}

function makeCharacteristicSchema(initial = 10) {
  return new SchemaField({
    value: new NumberField({ required: true, integer: true, min: 1, max: 99, initial })
  });
}

class BRPActorDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      biography: new HTMLField({ required: true, blank: true }),
      notes: new HTMLField({ required: true, blank: true }),
      advancementLog: new ArrayField(new SchemaField({
        id: new StringField({ required: true, blank: false }),
        itemId: new StringField({ required: true, blank: false }),
        itemName: new StringField({ required: true, blank: true, initial: "" }),
        itemType: new StringField({ required: true, blank: false, initial: "skill" }),
        points: new NumberField({ required: true, integer: true, initial: 0 }),
        date: new StringField({ required: true, blank: true, initial: "" }),
        reason: new StringField({ required: true, blank: true, initial: "" }),
        method: new StringField({ required: true, blank: true, initial: "manual" })
      }), { initial: [] }),
      journalEntries: new ArrayField(new SchemaField({
        id: new StringField({ required: true, blank: false }),
        title: new StringField({ required: true, blank: false }),
        category: new StringField({ required: true, blank: true, initial: "ทั่วไป" }),
        description: new StringField({ required: true, blank: true, initial: "" }),
        createdAt: new StringField({ required: true, blank: true, initial: "" })
      }), { initial: [] }),
      activeOccupationId: new StringField({required:true, blank:true, initial:""}),
      currency: new ArrayField(new SchemaField({
        unit: new StringField({ required:true, blank:false }),
        amount: new NumberField({ required:true, integer:true, initial:0 })
      }), {initial: []}),
      startingAge: new NumberField({ required:false, nullable:true, integer:true, min:0, initial:null }),
      ageReference: new NumberField({ required:false, nullable:true, integer:true, min:0, initial:null }),
      ageYouthCharacteristic: new StringField({required:true,blank:false,initial:"siz"}),
      personalityType: new StringField({required:true,blank:false,initial:"none"}),
      applyAgingRules: new BooleanField({ initial:true }),
      agingPriority: new StringField({required:true, blank:false, initial:"con,dex,cha"}),
      statusEffects: new ArrayField(new SchemaField({
        id: new StringField({required:true, blank:false}),
        name: new StringField({required:true, blank:false}),
        nameTh: new StringField({required:true, blank:true, initial:""}),
        nameEn: new StringField({required:true, blank:true, initial:""}),
        source: new StringField({required:true, blank:true, initial:"condition"}),
        active: new BooleanField({initial:true}),
        characteristic: new StringField({required:true, blank:true, initial:""}),
        statModifier: new NumberField({required:true, integer:true, initial:0}),
        skillScope: new StringField({required:true, blank:false, options:["none","all","visual","specific","category"], initial:"none"}),
        skillId: new StringField({required:true, blank:true, initial:""}), // v1.13 legacy
        skillIds: new ArrayField(new StringField({required:true, blank:false}), {initial: []}),
        skillRefs: new ArrayField(new StringField({required:true, blank:false}), {initial: []}),
        skillCategory: new StringField({required:true, blank:true, initial:""}),
        skillModifier: new NumberField({required:true, integer:true, initial:0}),
        makeDifficult: new BooleanField({initial:false}),
        notes: new StringField({required:true, blank:true, initial:""})
      }), {initial: []}),
      // BRP UGE character sheet, Personal section (pp. 11, 15–16).
      // Occupation and wealth remain linked Items, not duplicate free-text values.
      playerName: new StringField({ required: true, blank: true, initial: "" }),
      handedness: new StringField({ required: true, blank: true, initial: "" }),
      height: new StringField({ required: true, blank: true, initial: "" }),
      weight: new StringField({ required: true, blank: true, initial: "" }),
      religion: new StringField({ required: true, blank: true, initial: "" }),
      distinctiveFeatures: new StringField({ required: true, blank: true, initial: "" }),
      personalDescription: new StringField({ required: true, blank: true, initial: "" }),
      culture: new StringField({ required: true, blank: true, initial: "" }),
      age: new NumberField({ required: true, integer: true, min: 0, initial: 25 }),
      gender: new StringField({ required: true, blank: true, initial: "" }),
      characteristics: new SchemaField({
        str: makeCharacteristicSchema(10),
        con: makeCharacteristicSchema(10),
        siz: makeCharacteristicSchema(10),
        int: makeCharacteristicSchema(10),
        pow: makeCharacteristicSchema(10),
        dex: makeCharacteristicSchema(10),
        cha: makeCharacteristicSchema(10),
        edu: makeCharacteristicSchema(10)
      }),
      hp: makeResourceSchema(10, 10, -10),
      pp: makeResourceSchema(10, 10, 0),
      fp: makeResourceSchema(20, 20, -40),
      san: makeResourceSchema(50, 99, 0),
      mov: new NumberField({ required: true, integer: true, min: 0, initial: 10 }),
      wounds: new ArrayField(
        new SchemaField({
          id: new StringField({ required: true, blank: false }),
          title: new StringField({ required: true, blank: false }),
          severity: new StringField({
            required: true,
            blank: false,
            options: ["minor", "major", "bleeding"],
            initial: "minor"
          }),
          hpLost: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
          location: new StringField({ required: true, blank: true, initial: "" }),
          notes: new StringField({ required: true, blank: true, initial: "" }),
          healed: new BooleanField({ initial: false }),
          firstAidAttempted: new BooleanField({ initial: false }),
          treated: new BooleanField({ initial: false }),
          treatmentMethod: new StringField({ required: true, blank: true, initial: "" }),
          treatmentResult: new StringField({ required: true, blank: true, initial: "" }),
          treatmentCount: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
          majorDetermined: new BooleanField({ initial: false }),
          majorRoll: new NumberField({ required:false, nullable:true, integer:true, min:1, max:100, initial:null }),
          majorEffectTh: new StringField({ required:true, blank:true, initial:"" }),
          majorEffectEn: new StringField({ required:true, blank:true, initial:"" }),
          majorLuckPassed: new BooleanField({ initial: false }),
          majorApplied: new BooleanField({ initial: false }),
          majorLosses: new SchemaField({
            str:new NumberField({required:true, integer:true, min:0, initial:0}),
            con:new NumberField({required:true, integer:true, min:0, initial:0}),
            dex:new NumberField({required:true, integer:true, min:0, initial:0}),
            int:new NumberField({required:true, integer:true, min:0, initial:0}),
            cha:new NumberField({required:true, integer:true, min:0, initial:0}),
            siz:new NumberField({required:true, integer:true, min:0, initial:0}),
            pow:new NumberField({required:true, integer:true, min:0, initial:0}),
            edu:new NumberField({required:true, integer:true, min:0, initial:0}),
            mov:new NumberField({required:true, integer:true, min:0, initial:0})
          }),
          recoveryHp: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
          createdAt: new StringField({ required: true, blank: true, initial: "" })
        }),
        { initial: [] }
      ),
      insanities: new ArrayField(
        new SchemaField({
          id: new StringField({ required: true, blank: false }),
          title: new StringField({ required: true, blank: false }),
          kind: new StringField({
            required: true,
            blank: false,
            options: ["temporary", "indefinite", "phobia", "mania"],
            initial: "temporary"
          }),
          sanLost: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
          duration: new StringField({ required: true, blank: true, initial: "" }),
          notes: new StringField({ required: true, blank: true, initial: "" }),
          cured: new BooleanField({ initial: false }),
          treated: new BooleanField({ initial: false }),
          treatmentMethod: new StringField({ required: true, blank: true, initial: "" }),
          treatmentResult: new StringField({ required: true, blank: true, initial: "" }),
          treatmentCount: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
          recoverySan: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
          createdAt: new StringField({ required: true, blank: true, initial: "" })
        }),
        { initial: [] }
      ),
      settings: new SchemaField({
        useEdu: new BooleanField({ initial: false }),
        useFatigue: new BooleanField({ initial: false }),
        useSanity: new BooleanField({ initial: false }),
        useHitLocations: new BooleanField({ initial: false }),
        categoryBonusMode: new StringField({
          required: true,
          blank: false,
          options: ["standard", "simple", "none"],
          initial: "standard"
        })
      })
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    const rules = getCampaignRules();
    const e = effectiveCharacteristics(this);
    const deltas = characteristicAdjustments(this);
    const {str, con, siz, int, pow, dex, cha, edu} = e;

    const maxHp = rules.heroicHitPoints ? con + siz : Math.ceil((con + siz) / 2);
    const majorWound = Math.ceil(maxHp / 2);
    const maxPp = pow;
    const maxFp = str + con;
    const startingSan = Math.min(99, pow * 5);
    const curSan = Number(this.san?.value ?? startingSan);
    const indefiniteThreshold = Math.max(1, Math.ceil(curSan / 5));
    const expBonus = Math.ceil(int / 2);
    const damageModifier = BRPActorDataModel.computeDamageModifier(str, siz);

    this.hp.max = maxHp;
    this.pp.max = maxPp;
    this.fp.max = maxFp;
    if (!this.san.max || this.san.max > 99) this.san.max = 99;

    const legHp = Math.ceil(maxHp * 0.33);
    const abdHp = Math.ceil(maxHp * 0.33);
    const chestHp = Math.ceil(maxHp * 0.40);
    const armHp = Math.ceil(maxHp * 0.25);
    const headHp = Math.ceil(maxHp * 0.33);

    this.derived = {
      effectiveCharacteristics: e,
      characteristicAdjustments: deltas,
      majorWound,
      expBonus,
      startingSan,
      indefiniteThreshold,
      damageModifier,
      halfDamageMod: BRPActorDataModel.halfDamageModifier(damageModifier),
      characteristicRolls: {
        effort: str * 5,
        stamina: con * 5,
        idea: int * 5,
        luck: pow * 5,
        agility: dex * 5,
        charm: cha * 5,
        knowledge: edu * 5
      },
      categoryBonuses: BRPActorDataModel.computeCategoryBonuses(
        { str, con, siz, int, pow, dex, cha, edu },
        rules.categoryBonusMode,
        rules.useEdu
      ),
      hitLocations: [
        { id: "rleg", range: "01–04", labelTh: "ขาขวา", labelEn: "Right Leg", maxHp: legHp },
        { id: "lleg", range: "05–08", labelTh: "ขาซ้าย", labelEn: "Left Leg", maxHp: legHp },
        { id: "abdomen", range: "09–11", labelTh: "ช่องท้อง", labelEn: "Abdomen", maxHp: abdHp },
        { id: "chest", range: "12", labelTh: "หน้าอก", labelEn: "Chest", maxHp: chestHp },
        { id: "rarm", range: "13–15", labelTh: "แขนขวา", labelEn: "Right Arm", maxHp: armHp },
        { id: "larm", range: "16–18", labelTh: "แขนซ้าย", labelEn: "Left Arm", maxHp: armHp },
        { id: "head", range: "19–20", labelTh: "ศีรษะ", labelEn: "Head", maxHp: headHp }
      ]
    };
  }

  static computeDamageModifier(str, siz) {
    const total = str + siz;
    if (total <= 12) return "-1D6";
    if (total <= 16) return "-1D4";
    if (total <= 24) return "0";
    if (total <= 32) return "+1D4";
    if (total <= 40) return "+1D6";
    return `+${2 + Math.floor((total - 41) / 16)}D6`;
  }

  static halfDamageModifier(dm) {
    if (dm === "0" || dm.startsWith("-")) return dm;
    if (dm === "+1D4") return "+1D2";
    if (dm === "+1D6") return "+1D3";
    const match = dm.match(/^\+(\d+)D(\d+)$/i);
    if (!match) return dm;
    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    if (count % 2 === 0) return `+${count / 2}D${sides}`;
    const halfDice = Math.floor(count / 2);
    return halfDice > 0 ? `+${halfDice}D${sides}+1D3` : "+1D3";
  }

  static computeCategoryBonuses(c, mode, useEdu) {
    if (mode === "none") {
      return { communication: 0, manipulation: 0, mental: 0, perception: 0, physical: 0, combat: 0 };
    }
    if (mode === "simple") {
      return {
        combat: Math.ceil(c.dex / 2),
        communication: Math.ceil(c.cha / 2),
        manipulation: Math.ceil(c.dex / 2),
        mental: Math.ceil(c.int / 2),
        perception: Math.ceil(c.pow / 2),
        physical: Math.ceil(c.str / 2)
      };
    }
    const pri = (v) => v - 10;
    const sec = (v) => {
      const d = v - 10;
      return d >= 0 ? Math.floor(d / 2) : -Math.floor(Math.abs(d) / 2);
    };
    return {
      combat: pri(c.dex) + sec(c.int) + sec(c.str),
      communication: pri(c.int) + sec(c.pow) + sec(c.cha),
      manipulation: pri(c.dex) + sec(c.int) + sec(c.str),
      mental: pri(c.int) + sec(c.pow) + (useEdu ? sec(c.edu) : 0),
      perception: pri(c.int) + sec(c.pow) + sec(c.con),
      physical: pri(c.dex) + sec(c.str) + sec(c.con) - pri(c.siz)
    };
  }

  static migrateData(source) {
    if (
      source.mov &&
      typeof source.mov === "object" &&
      source.mov.value !== "" &&
      source.mov.value !== null &&
      source.mov.value !== undefined &&
      !Number.isNaN(Number(source.mov.value))
    ) {
      source.mov = Number(source.mov.value);
    }
    return super.migrateData(source);
  }
}

export class CharacterDataModel extends BRPActorDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      notes: new HTMLField({ required: true, blank: true }),
      wealth: new StringField({ required: true, blank: true, initial: "" })
    };
  }
}

export class NPCDataModel extends BRPActorDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      threatRating: new StringField({ required: true, blank: false, initial: "Standard" })
    };
  }
}

class BRPItemDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ required: true, blank: true }),
      descriptionTh: new HTMLField({ required: true, blank: true }),
      descriptionEn: new HTMLField({ required: true, blank: true }),
      nameTh: new StringField({ required: true, blank: true, initial: "" }),
      nameEn: new StringField({ required: true, blank: true, initial: "" }),
      // Presentation only; no change to rules identity or linked sources.
      flavorNameTh: new StringField({ required: true, blank: true, initial: "" }),
      flavorNameEn: new StringField({ required: true, blank: true, initial: "" })
    };
  }
}

export class SkillDataModel extends BRPItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: new StringField({
        required: true,
        blank: false,
        options: ["communication", "manipulation", "mental", "perception", "physical", "combat"],
        initial: "communication"
      }),
      specialty: new StringField({ required: true, blank: true, initial: "" }),
      specialtyTh: new StringField({ required: true, blank: true, initial: "" }),
      specialtyFamily: new StringField({ required: true, blank: true, initial: "" }),
      specialtyFamilyTh: new StringField({ required: true, blank: true, initial: "" }),
      // One Compendium source per Skill Family. Characters receive separate
      // Actor-owned instantiated specialties with independent allocations.
      isSpecialtyTemplate: new BooleanField({initial:false}),
      specialtyDefaults: new ArrayField(new SchemaField({
        key: new StringField({required:true,blank:true,initial:""}),
        en: new StringField({required:true,blank:false}),
        th: new StringField({required:true,blank:true,initial:""}),
        base: new NumberField({required:false,nullable:true,integer:true,min:0,initial:null}),
        baseFormula: new StringField({required:true,blank:true,initial:""}),
        ruleNote: new StringField({required:true,blank:true,initial:""}),
        enabled: new BooleanField({initial:true})
      }),{initial:[]}),
      base: new NumberField({ required: true, integer: true, min: 0, initial: 5 }),
      baseFormula: new StringField({ required: true, blank: true, initial: "" }),
      occupationBonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      personalBonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      rank: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      personalityBonus: new NumberField({ required: true, integer: true, min:0, initial:0 }),
      referenceKey: new StringField({ required:true, blank:true, initial:"" }),
      fixedRating: new NumberField({ required: false, nullable: true, integer: true, min: 0, initial: null }),
      checked: new BooleanField({ initial: false }),
      tags: new StringField({required:true, blank:true, initial:""})
    };
  }
}

export class WeaponDataModel extends BRPItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      weaponClass: new StringField({
        required: true,
        blank: false,
        options: ["melee", "missile", "firearm", "heavy", "natural", "shield"],
        initial: "melee"
      }),
      skillName: new StringField({ required: true, blank: true, initial: "Melee Weapon (Sword)" }),
      skillRef: new StringField({required:true, blank:true, initial:""}),
      damage: new StringField({ required: true, blank: false, initial: "1D8+1" }),
      dmMode: new StringField({
        required: true,
        blank: false,
        options: ["full", "half", "none"],
        initial: "full"
      }),
      specialType: new StringField({
        required: true,
        blank: false,
        options: ["none", "bleeding", "crushing", "entangling", "impaling", "knockback"],
        initial: "impaling"
      }),
      length: new StringField({
        required: true,
        blank: false,
        options: ["missile", "long", "medium", "short"],
        initial: "medium"
      }),
      range: new StringField({ required: true, blank: true, initial: "Touch" }),
      attacksPerRound: new NumberField({ required: true, integer: true, min: 1, initial: 1 }),
      hp: makeResourceSchema(20, 20, 0),
      ammo: makeResourceSchema(0, 0, 0),
      hands: new StringField({ required: true, blank: false, initial: "1H" }),
      parryable: new BooleanField({ initial: true }),
      equipped: new BooleanField({ initial: true })
    };
  }
}

export class ArmorDataModel extends BRPItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ap: new NumberField({ required: true, integer: true, min: 0, initial: 4 }),
      locations: new StringField({ required: true, blank: true, initial: "Chest, Abdomen, Arms" }),
      encumbrancePenalty: new NumberField({ required: true, integer: true, initial: 0 }),
      equipped: new BooleanField({ initial: true })
    };
  }
}

export class ShieldDataModel extends BRPItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ap: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      hp: makeResourceSchema(20, 20, 0),
      damage: new StringField({ required: true, blank: false, initial: "1D4" }),
      skillName: new StringField({ required: true, blank: true, initial: "Shield" }),
      skillRef: new StringField({required:true, blank:true, initial:""}),
      equipped: new BooleanField({ initial: true })
    };
  }
}

export class PowerDataModel extends BRPItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      system: new StringField({ required: true, blank: false, initial: "Magic" }),
      costPP: new StringField({ required: true, blank: true, initial: "1 PP" }),
      spellLevel: new NumberField({ required: true, integer: true, min: 1, max: 99, initial: 1 }),
      ppPerLevel: new NumberField({ required: false, nullable: true, integer: true, min: 0, max: 99, initial: null }),
      requiresResistance: new BooleanField({ initial: false }),
      resistanceStat: new StringField({ required:true, blank:false, options:["pow","pp"], initial:"pow" }),
      range: new StringField({ required: true, blank: true, initial: "30m" }),
      duration: new StringField({ required: true, blank: true, initial: "Instant" }),
      activationType: new StringField({ required: true, blank: false, options: ["auto", "skill", "resistance", "automatic"], initial: "auto" }),
      chanceOverride: new NumberField({ required: false, nullable: true, integer: true, min: 0, initial: null }),
      baseChance: new NumberField({ required: false, nullable: true, integer: true, min: 0, initial: null }),
      occupationBonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      personalBonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      checked: new BooleanField({ initial: false })
    };
  }
}

export class PassionDataModel extends BRPItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      value: new NumberField({ required: true, integer: true, min: 0, max: 100, initial: 60 }),
      checked: new BooleanField({ initial: false })
    };
  }
}

export class GearDataModel extends BRPItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      quantity: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      weight: new NumberField({ required: true, min: 0, initial: 0.5 })
    };
  }
}

/** Profession is a draggable and freely editable Foundry Item. */
export class OccupationDataModel extends BRPItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      wealthEnabled: new BooleanField({initial: true}),
      wealthRef: new StringField({required:true, blank:true, initial:""}),
      skillRefs: new ArrayField(new StringField({required:true, blank:false}), {initial:[]}),
      // Optional choice clauses; old Occupations still resolve skillRefs without migration.
      skillChoiceGroups: new ArrayField(new SchemaField({
        id: new StringField({required:true,blank:false}),
        labelTh: new StringField({required:true,blank:true,initial:""}),
        labelEn: new StringField({required:true,blank:true,initial:""}),
        count: new NumberField({required:true,integer:true,min:1,initial:1}),
        distinct: new BooleanField({initial:true}),
        options: new ArrayField(new SchemaField({
          kind: new StringField({required:true,blank:false,options:["family","skill","specialty"],initial:"family"}),
          familyKey: new StringField({required:true,blank:true,initial:""}),
          specialtyKey: new StringField({required:true,blank:true,initial:""}),
          ref: new StringField({required:true,blank:true,initial:""})
        }),{initial:[]})
      }),{initial:[]}),
      starterWeaponRefs: new ArrayField(new StringField({required:true, blank:false}), {initial:[]}),
      starterArmorRefs: new ArrayField(new StringField({required:true, blank:false}), {initial:[]}),
    };
  }
}

/** Library Item for reusable status presets. Applied actor effects remain in
 * actor.system.statusEffects and are independently editable on the Status tab. */
export class StatusItemDataModel extends BRPItemDataModel {
  static defineSchema() {
    return {...super.defineSchema(),
      source: new StringField({required:true,blank:true,initial:"condition"}),
      characteristic: new StringField({required:true,blank:true,initial:""}),
      statModifier: new NumberField({required:true,integer:true,initial:0}),
      skillScope: new StringField({required:true,blank:false,options:["none","all","visual","category","specific"],initial:"none"}),
      skillCategory: new StringField({required:true,blank:true,initial:""}),
      skillRefs: new ArrayField(new StringField({required:true, blank:false}), {initial:[]}),
      skillModifier: new NumberField({required:true,integer:true,initial:0}),
      makeDifficult: new BooleanField({initial:false}),
      notes: new StringField({required:true,blank:true,initial:""})
    };
  }
}

/** Wealth is a reusable bilingual Item (not a free-text Occupation attribute). */
export class WealthDataModel extends BRPItemDataModel {
  static defineSchema() {
    return {...super.defineSchema(),
      tier: new NumberField({required:true, integer:true, initial:2, min:0, max:20})
    };
  }
}