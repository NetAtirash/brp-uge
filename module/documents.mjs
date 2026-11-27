import {findActorSkill} from "./reference-utils.mjs";
import { BRP_CONFIG, getCampaignRules } from "./config.mjs";
import { compareBRPTurns, brpActionRank } from "./combat/combat-flow-utils.mjs";
import { majorWoundPatch } from "./rules/major-wounds.mjs";
import { sumAdvancement, escapeForChat, recoveredPoints, firstAidFormula, medicineFormula, careMethodLabel, careResultLabel, getSkillNameMatches, getLocalizedName, getNameLanguage } from "./character-tools.mjs";
import { statusSkillAdjustment } from "./status-effects.mjs";

export class BRPActor extends Actor {
  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    const { hp, pp, fp, san } = this.system;

    if (hp) hp.value = Math.clamp(hp.value, hp.min, hp.max);
    if (pp) pp.value = Math.clamp(pp.value, pp.min, pp.max);
    if (fp) fp.value = Math.clamp(fp.value, fp.min, fp.max);
    if (san) san.value = Math.clamp(san.value, san.min, san.max);
  }

  /** Improvement log is authoritative for NEW training points; old 1.7 rank is retained. */
  async saveAdvancement({ id = null, itemId, points = 0, date = "", reason = "", method = "manual" } = {}) {
    const item = this.items.get(itemId);
    if (!item || !["skill", "power"].includes(item.type)) throw new Error("ไม่พบทักษะหรือพลังที่ต้องการพัฒนา");
    const log = foundry.utils.deepClone(this.system.advancementLog ?? []);
    const entry = id ? log.find(x => x.id === id) : null;
    if (id && !entry) throw new Error("ไม่พบรายการบันทึกการพัฒนา");
    const patch = {
      id: id || foundry.utils.randomID(), itemId, itemName: item.name, itemType: item.type,
      points: Math.trunc(Number(points) || 0),
      date: String(date || new Date().toISOString().slice(0, 10)),
      reason: String(reason ?? ""), method: String(method || "manual")
    };
    if (entry) Object.assign(entry, patch);
    else log.unshift(patch);
    await this.update({ "system.advancementLog": log });
    return patch;
  }

  async deleteAdvancement(id) {
    const log = foundry.utils.deepClone(this.system.advancementLog ?? []);
    if (!log.some(entry => entry.id === id)) return;
    await this.update({ "system.advancementLog": log.filter(entry => entry.id !== id) });
  }

  getEquippedArmorPoints() {
    return this.items
      .filter((i) => i.type === "armor" && i.system.equipped)
      .reduce((sum, i) => sum + Number(i.system.ap ?? 0), 0);
  }

  async applyDamage(rawDamage, { bypassArmor = false, weaponName = "โจมตี", location = "ทั่วไป" } = {}) {
    const ap = bypassArmor ? 0 : this.getEquippedArmorPoints();
    const netDamage = Math.max(0, Math.round(Number(rawDamage || 0)) - ap);
    const nextHp = Math.clamp(this.system.hp.value - netDamage, this.system.hp.min, this.system.hp.max);
    const majorWoundThreshold = this.system.derived?.majorWound ?? Math.ceil(this.system.hp.max / 2);
    const isMajor = netDamage >= majorWoundThreshold;

    const currentWounds = foundry.utils.deepClone(this.system.wounds ?? []);
    const newWoundId = foundry.utils.randomID();
    if (netDamage > 0) {
      currentWounds.unshift({
        id: newWoundId,
        title: `${weaponName}${bypassArmor ? " (ทะลุเกราะ)" : ""}`,
        severity: isMajor ? "major" : "minor",
        hpLost: netDamage,
        location,
        notes: `หักเกราะ ${ap} AP`,
        healed: false,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
    }

    await this.update({
      "system.hp.value": nextHp,
      "system.wounds": currentWounds
    });

    await ChatMessage.implementation.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="brp-chat-card is-fail">
        <div class="card-header"><strong>${escapeForChat(this.name)}</strong> ได้รับความเสียหาย <strong>−${netDamage} HP</strong></div>
        <div class="card-actor">${escapeForChat(weaponName)}: ดาเมจดิบ ${rawDamage}${bypassArmor ? " (ทะลุเกราะ 0 AP)" : ` − เกราะ ${ap} AP`} · เหลือ HP: <strong>${nextHp}/${this.system.hp.max}</strong></div>
        ${isMajor ? `<div class="card-thresholds" style="color:#f87171;">⚠ บาดแผลฉกรรจ์! (${netDamage} ≥ ${majorWoundThreshold}) บันทึกลงแท็บบาดแผลแล้ว</div>` : ""}
      </div>`
    });

    if (isMajor) {
      await game.brp.rolls.rollMajorWound(this,newWoundId);
    }
    return netDamage;
  }

  async addWound({ title, severity = "minor", hpLost = 1, location = "", notes = "", deductHp = true }) {
    const loss = Math.max(0, Number(hpLost || 0));
    const current = foundry.utils.deepClone(this.system.wounds ?? []);
    current.unshift({
      id: foundry.utils.randomID(),
      title: String(title || (getNameLanguage() === "en" ? "Wound" : "บาดแผล")),
      severity,
      hpLost: loss,
      location: String(location || (getNameLanguage() === "en" ? "General" : "ทั่วไป")),
      notes: String(notes || ""),
      healed: false,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    });
    const patch = { "system.wounds": current };
    let nextHp = Number(this.system.hp?.value ?? 0);
    if (deductHp && loss > 0 && this.system.hp) {
      const minHp = Number(this.system.hp.min ?? -10);
      const maxHp = Number(this.system.hp.max ?? 10);
      nextHp = Math.max(minHp, Math.min(maxHp, nextHp - loss));
      patch["system.hp.value"] = nextHp;
    }
    const res = await this.update(patch);
    if (deductHp && loss > 0) {
      await ChatMessage.implementation.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="brp-chat-card is-fail"><div class="card-header"><strong>${escapeForChat(this.name)}</strong> บันทึกบาดแผล: <strong>${escapeForChat(String(title || (getNameLanguage() === "en" ? "Wound" : "บาดแผล")))}</strong></div><div class="card-actor">ลด HP อัตโนมัติ <strong>−${loss}</strong> · เหลือ <strong>${nextHp}/${this.system.hp?.max ?? 10}</strong></div></div>`
      });
    }
    return res;
  }

  /** Persist a resolved Major Wound and characteristic reductions once only.
   * Passing Luck prevents permanent stat losses; healing the wound never auto-refunds stats.
   */
  async applyMajorWoundResult(woundId,{rollTotal,losses={},luckPassed=false}={}) {
    const wounds=foundry.utils.deepClone(this.system.wounds ?? []);
    const index=wounds.findIndex(w=>w.id===woundId && w.severity==="major");
    if(index<0) throw new Error("Major wound record not found");
    if(wounds[index].majorDetermined) throw new Error("Major wound already resolved: duplicate reductions are blocked");
    const next=majorWoundPatch(wounds[index],rollTotal,losses,luckPassed);
    wounds[index]=next;
    const patch={"system.wounds":wounds};
    if(!luckPassed){
      for(const [key,raw] of Object.entries(losses)){
        const n=Math.max(0,Math.trunc(Number(raw)||0));
        if(!n) continue;
        if(key==="mov") patch["system.mov"]=Math.max(0,Number(this.system.mov||0)-n);
        else if(this.system.characteristics?.[key]) patch[`system.characteristics.${key}.value`]=Math.max(1,Number(this.system.characteristics[key].value||1)-n);
      }
    }
    await this.update(patch);
    return next;
  }

  /** Mark clinically healed separately from any HP restored through treatment. */
  async toggleHealWound(woundId) {
    const wounds = foundry.utils.deepClone(this.system.wounds ?? []);
    const wound = wounds.find(w => w.id === woundId);
    if (!wound) return;
    wound.healed = !wound.healed;
    await this.update({ "system.wounds": wounds });
  }

  async deleteWound(woundId) {
    const next = (this.system.wounds ?? []).filter((w) => w.id !== woundId);
    return this.update({ "system.wounds": next });
  }

  async addInsanity({ title, kind = "temporary", sanLost = 5, duration = "1D10 ชม.", notes = "", deductSan = true }) {
    const loss = Math.max(0, Number(sanLost || 0));
    const current = foundry.utils.deepClone(this.system.insanities ?? []);
    current.unshift({
      id: foundry.utils.randomID(),
      title: String(title || (getNameLanguage() === "en" ? "Mental condition" : "อาการทางจิต")),
      kind,
      sanLost: loss,
      duration: String(duration || ""),
      notes: String(notes || ""),
      cured: false,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    });
    const patch = { "system.insanities": current };
    let nextSan = Number(this.system.san?.value ?? 50);
    if (deductSan && loss > 0 && this.system.san) {
      const minSan = Number(this.system.san.min ?? 0);
      const maxSan = Number(this.system.san.max ?? 99);
      nextSan = Math.max(minSan, Math.min(maxSan, nextSan - loss));
      patch["system.san.value"] = nextSan;
    }
    const res = await this.update(patch);
    if (deductSan && loss > 0) {
      await ChatMessage.implementation.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="brp-chat-card is-fail"><div class="card-header"><strong>${escapeForChat(this.name)}</strong> บันทึกอาการทางจิต: <strong>${escapeForChat(String(title || "อาการเสียสติ"))}</strong></div><div class="card-actor">ลด SAN อัตโนมัติ <strong>−${loss}</strong> · เหลือ <strong>${nextSan}/${this.system.san?.max ?? 99}</strong></div></div>`
      });
    }
    return res;
  }

  async toggleCureInsanity(condId) {
    const current = foundry.utils.deepClone(this.system.insanities ?? []);
    const target = current.find((c) => c.id === condId);
    if (!target) return;
    target.cured = !target.cured;
    await this.update({ "system.insanities": current });
    if (target.cured) {
      await ChatMessage.implementation.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="brp-chat-card is-succeed"><div class="brp-chat-kicker">CARE</div><strong>${escapeForChat(this.name)}</strong> ปรับสถานะการบำบัด: <strong>${escapeForChat(target.title)}</strong></div>`
      });
    }
  }

  async deleteInsanity(condId) {
    const next = (this.system.insanities ?? []).filter((c) => c.id !== condId);
    return this.update({ "system.insanities": next });
  }

  /** Perform book-aligned recovery. Rolls are requested by the caller, never silently fabricated. */
  async applyCare({ method, healer = null, targetId = "", rollResult = null, choice = "heal" } = {}) {
    const wounds = foundry.utils.deepClone(this.system.wounds ?? []);
    const insanities = foundry.utils.deepClone(this.system.insanities ?? []);
    const wound = wounds.find(w => w.id === targetId);
    const mental = insanities.find(c => c.id === targetId);
    if (method !== "psychotherapy" && !wound && method !== "natural") throw new Error("กรุณาเลือกบาดแผลก่อนรักษา");
    if (method === "psychotherapy" && !mental) throw new Error("กรุณาเลือกอาการทางจิตก่อนบำบัด");
    if (method === "firstAid" && wound.firstAidAttempted) throw new Error("First Aid สามารถพยายามได้เพียงครั้งเดียวต่อบาดแผล");
    const degree = rollResult?.degree ?? (method === "natural" ? "success" : "failure");
    const successful = ["success", "special", "critical"].includes(degree);
    const th = getNameLanguage() !== "en";
    const patch = {};
    // Keep attempt history separate from a successful treatment and closure.
    if (wound && (method === "firstAid" || method === "medicine")) {
      wound.treated = successful;
      wound.treatmentMethod = method;
      wound.treatmentResult = degree;
      wound.treatmentCount = Number(wound.treatmentCount ?? 0) + 1;
    }
    if (mental && method === "psychotherapy") {
      mental.treated = successful;
      mental.treatmentMethod = method;
      mental.treatmentResult = degree;
      mental.treatmentCount = Number(mental.treatmentCount ?? 0) + 1;
    }
    let formula = null;
    let outcome = "";
    if (method === "firstAid") {
      wound.firstAidAttempted = true;
      formula = firstAidFormula(degree);
      if (degree === "fumble") {
        patch["system.hp.value"] = Math.max(this.system.hp.min, this.system.hp.value - 1);
        outcome = "Fumble: −1 HP";
      }
    } else if (method === "medicine") {
      if (choice === "accelerate" && rollResult?.isSuccess) {
        await this.setFlag("brp-uge", "medicineFastHealing", true);
        outcome = th ? "เร่งการฟื้นฟู 2D3 HP/สัปดาห์" : "Accelerated recovery: 2D3 HP/week";
      } else formula = medicineFormula(degree);
    } else if (method === "natural") {
      formula = this.getFlag("brp-uge", "medicineFastHealing") ? "2d3" : "1d3";
    } else if (method === "psychotherapy") {
      formula = ({success:"1d3-1", special:"1d3", critical:"1d3+1"})[degree] ?? null;
    }
    let gained = 0;
    if (formula) {
      const result = await new Roll(formula).evaluate();
      const pool = method === "psychotherapy" ? this.system.san : this.system.hp;
      const allowable = recoveredPoints(pool.value, pool.max, result.total);
      // First Aid cannot heal more HP than the original wound's remaining injury.
      const capped = method === "firstAid" ? Math.min(allowable, Math.max(0, wound.hpLost - Number(wound.recoveryHp ?? 0))) : allowable;
      gained = capped;
      patch[method === "psychotherapy" ? "system.san.value" : "system.hp.value"] = pool.value + capped;
      if (method === "psychotherapy") mental.recoverySan = Number(mental.recoverySan ?? 0) + capped;
      else if (wound) wound.recoveryHp = Number(wound.recoveryHp ?? 0) + capped;
      outcome = `${formula} → +${capped} ${method === "psychotherapy" ? "SAN" : "HP"}`;
    }
    if (method === "firstAid" || wound) patch["system.wounds"] = wounds;
    if (method === "psychotherapy") patch["system.insanities"] = insanities;
    if (Object.keys(patch).length) await this.update(patch);
    // A successful healing roll never automatically removes the diagnosed condition.
    await ChatMessage.implementation.create({
      speaker: ChatMessage.getSpeaker({ actor: healer ?? this }),
      content: `<div class="brp-chat-card"><strong>${escapeForChat(healer?.name ?? this.name)}</strong> → ${escapeForChat(this.name)} · ${escapeForChat(careMethodLabel(method, th))}: ${escapeForChat(careResultLabel(degree, th))}${outcome ? ` · ${escapeForChat(outcome)}` : ""}. ${escapeForChat(wound?.title ?? mental?.title ?? "")}</div>`,
      ...(rollResult?.messageMode === "gm" ? {whisper: game.users.filter(u=>u.isGM).map(u=>u.id)} :
         rollResult?.messageMode === "blind" ? {whisper: game.users.filter(u=>u.isGM).map(u=>u.id), blind: true} :
         rollResult?.messageMode === "self" ? {whisper: [game.user.id]} : {})
    });
    return { gained, degree, outcome };
  }

  async recoverPool(action) {
    const hp = this.system.hp;
    const pp = this.system.pp;
    const fp = this.system.fp;
    const san = this.system.san;
    const patch = {};
    let msg = "";

    if (action === "hp1") {
      const next = Math.min(hp.max, hp.value + 1);
      patch["system.hp.value"] = next;
      msg = `ฟื้นฟูพลังชีวิต <strong>+1 HP</strong> (${hp.value} → ${next}/${hp.max})`;
    } else if (action === "hp1d3") {
      const r = await new Roll("1d3").evaluate();
      const next = Math.min(hp.max, hp.value + r.total);
      patch["system.hp.value"] = next;
      msg = `ปฐมพยาบาลฟื้นพลังชีวิต <strong>+${r.total} HP</strong> (1D3: ${hp.value} → ${next}/${hp.max})`;
    } else if (action === "pp25") {
      const gain = Math.max(1, Math.ceil(pp.max * 0.25));
      const next = Math.min(pp.max, pp.value + gain);
      patch["system.pp.value"] = next;
      msg = `ฟื้นฟูพลังจิต <strong>+${gain} PP</strong> (25%: ${pp.value} → ${next}/${pp.max})`;
    } else if (action === "ppFull") {
      patch["system.pp.value"] = pp.max;
      msg = `ฟื้นฟูพลังจิตเต็ม <strong>${pp.max} PP</strong>`;
    } else if (action === "san1") {
      const next = Math.min(san.max, san.value + 1);
      patch["system.san.value"] = next;
      msg = `ฟื้นฟูสติสัมปชัญญะ <strong>+1 SAN</strong> (${san.value} → ${next}/${san.max})`;
    } else if (action === "san1d6") {
      const r = await new Roll("1d6").evaluate();
      const next = Math.min(san.max, san.value + r.total);
      patch["system.san.value"] = next;
      msg = `บำบัดฟื้นฟูสติ <strong>+${r.total} SAN</strong> (1D6: ${san.value} → ${next}/${san.max})`;
    } else if (action === "longRest") {
      const r = await new Roll("1d3").evaluate();
      const nextHp = Math.min(hp.max, hp.value + r.total);
      patch["system.hp.value"] = nextHp;
      patch["system.pp.value"] = pp.max;
      patch["system.fp.value"] = fp.max;
      msg = `พักผ่อนเต็มที่ (Long Rest): HP +${r.total} (${nextHp}/${hp.max}) · PP เต็ม (${pp.max}) · FP เต็ม (${fp.max})`;
    }

    if (Object.keys(patch).length === 0) return;
    await this.update(patch);
    await ChatMessage.implementation.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="brp-chat-card is-succeed"><div class="card-header"><strong>${escapeForChat(this.name)}</strong> · ${msg}</div></div>`
    });
  }
}

export class BRPItem extends Item {
  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    if (this.type === "skill" && this.actor) {
      const cat = this.system.category ?? "communication";
      // Embedded data preparation must NEVER throw because an optional modifier
      // is absent or malformed; that prevents Foundry from preparing ALL skills.
      const finite = (value, fallback = 0) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
      };
      const catBonus = finite(this.actor.system.derived?.categoryBonuses?.[cat]);
      const base = finite(this.computeDynamicBase(), finite(this.system.base));
      this.system.effectiveBase = base;
      this.system.categoryBonus = catBonus;
      const occupational = finite(this.system.occupationBonus);
      const personal = finite(this.system.personalBonus);
      const personality = finite(this.system.personalityBonus);
      const legacyTraining = finite(this.system.rank);
      const logTraining = finite(sumAdvancement(this.actor.system.advancementLog, this.id));
      const training = legacyTraining + logTraining;
      this.system.trainingTotal = this.system.fixedRating != null ? logTraining : training;
      this.system.allocatedPoints = occupational + personal + personality + training;
      const rating = this.system.fixedRating;
      const status = statusSkillAdjustment(this.actor.system, this);
      this.system.statusBonus = status.bonus;
      this.system.statusDifficult = status.difficult;
      this.system.total = rating != null && rating !== "" && Number.isFinite(Number(rating))
        ? Math.max(0, Number(rating) + logTraining + finite(status.bonus))
        : Math.max(0, base + catBonus + this.system.allocatedPoints + finite(status.bonus));
    }
    if (this.type === "power" && this.actor) {
      const trained = sumAdvancement(this.actor.system.advancementLog, this.id);
      this.system.trainingTotal = trained;
      // Computed by powerChance() at presentation/roll time using INT or POW.
      this.system.total = null;
    }
  }

  computeDynamicBase() {
    const formula = this.system.baseFormula;
    const c = this.actor?.system?.derived?.effectiveCharacteristics;
    if (!formula || !c) return Number(this.system.base ?? 0);
    const rules = getCampaignRules();
    if (formula === "INT*5") return Math.max(Number(c.int), Number(rules.useEdu ? c.edu : 0)) * 5;
    if (formula === "DEX*2") return Number(c.dex) * 2;
    if (formula === "INT+POW") return Number(c.int) + Number(c.pow);
    if (formula === "DEX*4") return Number(c.dex) * 4;
    return Number(this.system.base ?? 0);
  }
}

export class BRPCombat extends Combat {
  getPhase() {
    const usePhases = getCampaignRules().useCombatPhases;
    if (!usePhases) return "action";
    const saved = this.getFlag("brp-uge", "phase") ?? "statements";
    return saved === "resolution" ? "action" : saved; // v1.11 encounter migration
  }

  static getBestWeaponReach(combatant) {
    const actor = combatant?.actor;
    if (!actor) return 1;
    let best = 0;
    for (const item of actor.items) {
      if (item.type === "weapon" && item.system.equipped) {
        const rank = BRP_CONFIG.weaponLengthRank[item.system.length ?? "medium"] ?? 2;
        if (rank > best) best = rank;
      }
    }
    return best || (BRP_CONFIG.weaponLengthRank[combatant?.getFlag?.("brp-uge", "weaponLength") ?? "medium"] ?? 2);
  }

  /** BRP UGE pp.123–125: Statements DEX high→low, Powers INT high→low,
   * Actions DEX with movement and weapon priority. Optional rules remain GM-controlled.
   */
  _sortCombatants(a, b) {
    const rules = getCampaignRules();
    // Foundry may pass this comparator to Array.sort without binding `this`.
    // Each Combatant is an embedded document of its Encounter.
    const encounter = a?.parent ?? b?.parent ?? (this?.getPhase ? this : null) ?? game.combats?.viewed ?? game.combat;
    const phase = encounter?.getPhase?.() ?? "statements";
    const makeEntry = (c) => {
      const ch = c?.actor?.system?.characteristics;
      const effective = c?.actor?.system?.derived?.effectiveCharacteristics;
      const planMap = c?.actor?.getFlag?.("brp-uge", "combatPlans") ?? {};
      const rawPlan = planMap[c.id];
      const plan = rawPlan?.combatId === encounter?.id && Number(rawPlan?.round) === Number(encounter?.round)
        ? rawPlan : {};
      const dex = Number(effective?.dex ?? ch?.dex?.value ?? 10);
      const int = Number(effective?.int ?? ch?.int?.value ?? 10);
      const intBonus = rules.useD10Initiative ? Number(c.getFlag?.("brp-uge", "intInitiativeBonus") ?? 0) : 0;
      const dexRank = Number(c?.initiative ?? dex);
      const intRank = int + intBonus;
      const intent = String(plan.intent || "");
      const actionRank = brpActionRank(intent === "power" && rules.combatPowerTiming === "action" ? intRank : dexRank,
        plan.moveMeters, plan.delayTo);
      const relevantWeapon = [...(c.actor?.items ?? [])].find(item => item.type === "weapon" && item.system?.equipped);
      let skillRank = 0;
      if (relevantWeapon?.system?.skillName || relevantWeapon?.system?.skillRef) {
        const skill = findActorSkill(c.actor, relevantWeapon.system.skillRef, relevantWeapon.system.skillName);
        skillRank = Number(skill?.system?.total ?? 0);
      }
      const reachRank = intent === "ranged" ? 5 : BRPCombat.getBestWeaponReach(c);
      return { id:c?.id, intent, dexRank, intRank, pow:Number(ch?.pow?.value ?? 10),
        actionRank, reachRank, skillRank,
        originalIndex: Number(c?.sort ?? 0) };
    };
    return compareBRPTurns(makeEntry(a),makeEntry(b), {
      phase,
      reverseStatements: rules.combatStatementOrder === "reverse",
      powerTiming: rules.combatPowerTiming
    });
  }

  async setPhase(phase) {
    if (!game.user?.isGM) return this;
    const order = ["statements", "powers", "action"];
    if (!order.includes(phase)) return this;
    await this.setFlag("brp-uge", "phase", phase);
    this.setupTurns();
    if (this.turns?.length) {
      await this.update({ turn: 0 });
    }
    ui.combat?.render();
    return this;
  }

  async nextPhase() {
    const order = ["statements", "powers", "action"];
    const cur = this.getPhase();
    const idx = order.indexOf(cur);
    if (idx < 0 || idx === order.length - 1) {
      return this.nextRound();
    }
    return this.setPhase(order[idx + 1]);
  }

  async prevPhase() {
    const order = ["statements", "powers", "action"];
    const cur = this.getPhase();
    const idx = order.indexOf(cur);
    if (idx > 0) {
      return this.setPhase(order[idx - 1]);
    }
    return this;
  }

  async recordDefense(combatantId, type = "parry") {
    const c = this.combatants.get(combatantId);
    if (!c) return 0;
    const key = type === "dodge" ? "dodgesUsed" : "parriesUsed";
    const cur = Number(c.getFlag("brp-uge", key) ?? 0);
    const penalty = cur * 30;
    await c.setFlag("brp-uge", key, cur + 1);
    ui.combat?.render();
    return penalty;
  }

  /** Optional initiative: independent 1D10 + INT rank for powers; GM requests roll. */
  async rollPowerRanks() {
    if (!game.user?.isGM || !getCampaignRules().useD10Initiative) return [];
    const results = [];
    for (const c of this.combatants) {
      const r = await new Roll("1d10").evaluate();
      await c.setFlag("brp-uge", "intInitiativeBonus", Number(r.total));
      results.push({ id: c.id, bonus:Number(r.total) });
    }
    this.setupTurns();
    ui.combat?.render();
    return results;
  }

  /** @override */
  async rollInitiative(ids, options = {}) {
    const useD10 = getCampaignRules().useD10Initiative;
    const formula = useD10 ? "@characteristics.dex.value + 1d10" : "@characteristics.dex.value";
    return super.rollInitiative(ids, { ...options, formula });
  }

  /** @override */
  async startCombat() {
    const usePhases = getCampaignRules().useCombatPhases;
    await this.setFlag("brp-uge", "phase", usePhases ? "statements" : "action");
    for (const c of this.combatants) {
      await c.setFlag("brp-uge", "parriesUsed", 0);
      await c.setFlag("brp-uge", "dodgesUsed", 0);
    }
    return super.startCombat();
  }

  /** @override */
  /** Foundry's native Next Turn button also advances BRP phases at the end of a list. */
  async nextTurn() {
    if (!getCampaignRules().useCombatPhases || !this.turns?.length || this.round < 1) {
      return super.nextTurn();
    }
    if (Number(this.turn ?? 0) >= this.turns.length - 1) {
      return this.nextPhase();
    }
    return super.nextTurn();
  }

  async nextRound() {
    const usePhases = getCampaignRules().useCombatPhases;
    for (const c of this.combatants) {
      await c.setFlag("brp-uge", "parriesUsed", 0);
      await c.setFlag("brp-uge", "dodgesUsed", 0);
    }
    await this.setFlag("brp-uge", "phase", usePhases ? "statements" : "action");
    const res = await super.nextRound();
    this.setupTurns();
    ui.combat?.render();
    return res;
  }
}
