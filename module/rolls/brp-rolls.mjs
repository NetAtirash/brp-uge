import { BRP_CONFIG } from "../config.mjs";
import { escapeForChat, getDisplayItemName } from "../character-tools.mjs";
import { majorWoundOutcome, majorWoundPatch } from "../rules/major-wounds.mjs";
import { maxSpellLevel, spellPPCost, magicCostOnResult, spellCastingRank } from "../rules/spell-casting.mjs";

const DEGREE_THAI = {
  critical: "สำเร็จวิกฤต (Critical)",
  special: "สำเร็จพิเศษ (Special)",
  success: "สำเร็จ (Success)",
  failure: "ล้มเหลว (Failure)",
  fumble: "พลาดมหันต์ (Fumble)"
};

const DEGREE_EN = {
  critical: "Critical",
  special: "Special",
  success: "Success",
  failure: "Failure",
  fumble: "Fumble"
};

export class BRPRolls {
  static getThresholds(target) {
    const valid = Number(target);
    const t = Math.max(1, Number.isFinite(valid) ? valid : 1);
    return {
      critical: Math.max(1, Math.ceil(t / 20)),
      special: Math.max(1, Math.ceil(t / 5)),
      success: Math.min(95, t),
      fumble: t >= 81 ? 100 : 96 + Math.floor((t - 1) / 20)
    };
  }

  static evaluateD100(rollTotal, target, difficulty = "average") {
    if (difficulty === "automatic") {
      return {
        degree: "success",
        isSuccess: true,
        thresholds: { critical: 5, special: 20, success: 100, fumble: 100 }
      };
    }
    const thresholds = this.getThresholds(target);
    if (rollTotal <= thresholds.critical) return { degree: "critical", isSuccess: true, thresholds };
    if (rollTotal <= thresholds.special) return { degree: "special", isSuccess: true, thresholds };
    if (rollTotal <= thresholds.success && rollTotal <= 95) return { degree: "success", isSuccess: true, thresholds };
    if (rollTotal >= thresholds.fumble) return { degree: "fumble", isSuccess: false, thresholds };
    return { degree: "failure", isSuccess: false, thresholds };
  }

  static applyDifficulty(baseTarget, difficulty = "average", modifier = 0) {
    if (difficulty === "automatic") return 100;
    if (difficulty === "impossible") return 1;
    const base = Number(baseTarget);
    if (!Number.isFinite(base)) throw new Error("BRP UGE: invalid D100 target; check skill data preparation");
    let t = base;
    if (difficulty === "easy") t = t * 2;
    else if (difficulty === "difficult") t = Math.ceil(t / 2);
    const mod = Number(modifier);
    if (!Number.isFinite(mod)) throw new Error("BRP UGE: invalid roll modifier");
    t += mod;
    return base >= 5 ? Math.max(5, t) : Math.max(1, t);
  }

  static async confirmRoll({ title = "D100", baseTarget = 50, difficulty = "average", modifier = 0, messageMode = "public", percentile = true } = {}) {
    const lang = game.settings.get("brp-uge", "uiLanguage") || "th";
    const th = lang !== "en";
    const modes = [
      ["public", th ? "สาธารณะ (Public)" : "Public"],
      ["gm", th ? "เฉพาะ GM (Private)" : "GM only"],
      ["blind", th ? "ทอยลับถึง GM (Blind)" : "Blind to GM"],
      ["self", th ? "เฉพาะตนเอง (Self)" : "Self only"]
    ];
    const titleText = escapeForChat(title);
    const select = (name, choices, chosen) => `<select name="${name}">${choices.map(([v,l])=>`<option value="${v}" ${v===chosen?"selected":""}>${l}</option>`).join("")}</select>`;
    const result = await foundry.applications.api.DialogV2.input({
      window: { title: `${th ? "ยืนยันการทอย" : "Confirm roll"} — ${title}` },
      modal: true, rejectClose: false,
      content: `<div class="brp-roll-confirm brp-macro-form">
        <p><strong>${titleText}</strong>${percentile ? ` · ${th?"พื้นฐาน":"Base"} ${Number(baseTarget)}%` : ""}</p>
        ${percentile ? `<label>${th?"ความยาก":"Difficulty"}</label>
        ${select("difficulty", [["automatic", th?"อัตโนมัติ":"Automatic"],["easy", th?"ง่าย ×2":"Easy ×2"],["average", th?"ปกติ":"Average"],["difficult", th?"ยาก ÷2":"Difficult ÷2"],["impossible", th?"เป็นไปไม่ได้ (GM อนุญาต 1%)":"Impossible (GM 1%)"]], difficulty)}
        <label>${th?"ตัวปรับโอกาส (%)":"Modifier (%)"}</label>
        <input type="number" name="modifier" value="${Number(modifier)||0}" />` : ""}
        <label>${th?"การแสดงผลลูกเต๋า":"Roll visibility"}</label>${select("messageMode",modes,messageMode)}
      </div>`,
      ok: { label: th ? "ยืนยันทอย" : "Roll dice" }
    });
    if (!result) return null;
    return { difficulty: String(result.difficulty ?? difficulty), modifier: Number(result.modifier ?? modifier), messageMode: String(result.messageMode ?? messageMode) };
  }

  /** Protect custom chat cards associated with secret dice rolls. */
  static chatVisibility(messageMode = "public") {
    const gmIds = (game.users ?? []).filter(u => u.isGM).map(u => u.id);
    if (messageMode === "gm") return { whisper: gmIds };
    if (messageMode === "blind") return { whisper: gmIds, blind: true };
    if (messageMode === "self") return { whisper: [game.user.id] };
    return {};
  }

  static async rollSkill({ actor, skillId, title, subtitle = "", baseTarget, difficulty = "average", modifier = 0, messageMode = "public", skipDialog = false }) {
    const uiLang = game.settings.get("brp-uge", "uiLanguage") || "th";
    const ui = BRP_CONFIG.ui[uiLang] ?? BRP_CONFIG.ui.th;

    // A status can make a sight-based check Difficult. Suggested difficulty
    // appears in the confirmation dialog; the GM may adjudicate exceptions.
    if (actor && skillId && difficulty === "average" && actor.items?.get?.(skillId)?.system?.statusDifficult) {
      difficulty="difficult";
    }
    if (baseTarget === null || baseTarget === undefined || baseTarget === "" || !Number.isFinite(Number(baseTarget))) {
      ui.notifications?.error("BRP UGE: ค่าทักษะไม่ถูกต้อง กรุณาตรวจสอบข้อมูล Item / Invalid skill chance");
      return null;
    }
    if (!skipDialog) {
      const confirmed = await this.confirmRoll({ title, baseTarget, difficulty, modifier, messageMode });
      if (!confirmed) return null;
      ({ difficulty, modifier, messageMode } = confirmed);
    }
    const finalTarget = this.applyDifficulty(baseTarget, difficulty, modifier);
    const roll = await new Roll("1d100").evaluate();
    const res = this.evaluateD100(roll.total, finalTarget, difficulty);
    const degreeLabel = uiLang === "th" ? DEGREE_THAI[res.degree] : DEGREE_EN[res.degree];
    const verdictLabel = res.isSuccess ? ui.succeed : ui.fail;

    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/brp-uge/templates/chat/roll-card.hbs",
      {
        actorName: actor?.name ?? "BRP Roller",
        title,
        subtitle,
        rollTotal: String(roll.total).padStart(2, "0"),
        finalTarget,
        chanceLabel: uiLang === "th" ? "โอกาสสำเร็จ" : "Success chance",
        difficulty,
        modifier,
        degree: res.degree,
        degreeLabel,
        verdictLabel,
        thresholds: res.thresholds,
        isSuccess: res.isSuccess,
        ui,
        actorId: actor?.id ?? "",
        skillId: skillId ?? ""
      }
    );

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      content
    }, { messageMode });

    if (res.isSuccess && actor && skillId) {
      const item = actor.items.get(skillId);
      if (item && (item.type === "skill" || item.type === "power" || item.type === "passion") && !item.system.checked) {
        await item.update({ "system.checked": true });
      }
    }
    return { roll, finalTarget, messageMode, ...res };
  }

  static async rollResistance(activeVal, passiveVal, label = "Resistance Check", actor = null) {
    const raw = 50 + (Number(activeVal) - Number(passiveVal)) * 5;
    const chance = Math.clamp(raw, 1, 99);
    const subtitle =
      raw >= 100
        ? `Active ${activeVal} vs Passive ${passiveVal} (สำเร็จอัตโนมัติ / Auto-Success 99%)`
        : raw <= 0
        ? `Active ${activeVal} vs Passive ${passiveVal} (ล้มเหลวอัตโนมัติ / Auto-Fail 01%)`
        : `Active ${activeVal} vs Passive ${passiveVal} · สูตร: 50 + (${activeVal}−${passiveVal})×5`;

    return this.rollSkill({
      actor,
      title: label,
      subtitle,
      baseTarget: chance
    });
  }

  /** BRP Magic pp.55, 59: level cost on success or fumble; failure costs 1 PP.
   * One confirm dialog, one skill roll, followed by a visibility-matched PP receipt.
   * Other power families are intentionally NOT billed using Magic costs.
   */
  static async castMagic(actor, power) {
    if (!actor?.isOwner) throw new Error("You need permission to cast spells for this character");
    const magic = power?.system;
    const lang = game.settings.get("brp-uge", "uiLanguage") || "th";
    const th = lang !== "en";
    const intelligence = Number(actor.system.derived?.effectiveCharacteristics?.int ?? actor.system.characteristics?.int?.value ?? 10);
    const dexterity = Number(actor.system.derived?.effectiveCharacteristics?.dex ?? actor.system.characteristics?.dex?.value ?? 10);
    const maximum = maxSpellLevel(intelligence);
    const initial = Math.min(maximum, Math.max(1,Number(magic.spellLevel || 1)));
    const powerName = escapeForChat(getDisplayItemName(power,lang));
    const ppBefore = Number(actor.system.pp.value ?? 0);
    const perLevel = spellPPCost(magic,1);
    const form = await foundry.applications.api.DialogV2.input({
      window:{title:(th?"ร่ายเวท":"Cast spell") + ` — ${powerName}`}, modal:true, rejectClose:false,
      content:`<div class="brp-macro-form brp-spell-dialog">
        <p><strong>${powerName}</strong> · INT ${intelligence} · DEX ${dexterity} · PP <strong>${ppBefore}</strong></p>
        <label>${th?"ระดับที่ต้องการร่าย":"Spell level"} (1–${maximum})</label>
        <input type="number" name="level" min="1" max="${maximum}" value="${initial}" required />
        <p class="hint">${th?"ต้นทุนสำเร็จ/Fumble":"Success/Fumble PP cost"}: ${perLevel} PP × Level · ${th?"ล้มเหลว":"Failure"}: 1 PP · ${th?"ร่ายที่ DEX rank":"Cast at DEX rank"} = DEX − Level</p>
        <label>${th?"ความยาก":"Difficulty"}</label><select name="difficulty"><option value="average">${th?"ปกติ":"Average"}</option><option value="easy">${th?"ง่าย ×2":"Easy ×2"}</option><option value="difficult">${th?"ยาก ÷2":"Difficult ÷2"}</option><option value="automatic">Automatic</option><option value="impossible">Impossible</option></select>
        <label>${th?"ตัวปรับ %":"Modifier %"}</label><input name="modifier" type="number" value="0" />
        <label>${th?"การเปิดเผยผล":"Visibility"}</label><select name="messageMode"><option value="public">Public</option><option value="gm">GM only</option><option value="blind">Blind to GM</option><option value="self">Self only</option></select>
      </div>`, ok:{label:th?"ยืนยันการร่าย":"Confirm cast"}
    });
    if (!form) return null;
    const level = Math.trunc(Number(form.level));
    if (!Number.isFinite(level) || level < 1 || level > maximum) {
      ui.notifications?.warn(th ? `Spell Level ต้องอยู่ระหว่าง 1–${maximum}` : `Spell level must be 1–${maximum}`);
      return null;
    }
    const intended = spellPPCost(magic, level);
    if (intended > ppBefore) {
      ui.notifications?.warn(th ? `PP ไม่เพียงพอ (${ppBefore}/${intended})` : `Not enough PP (${ppBefore}/${intended})`);
      return null;
    }
    // Import at point of execution to avoid coupling spell mechanics to the sheet.
    const { powerChance } = await import("../character-tools.mjs");
    const baseTarget = powerChance(power, actor);
    const casting = spellCastingRank(dexterity, level);
    const visibility = String(form.messageMode || "public");
    const result = await this.rollSkill({
      actor, skillId:power.id,
      title:(th?"ร่าย":"Cast")+` ${powerName} (Lv.${level})`,
      subtitle:`${intended} PP · DEX rank ${casting.rank}${casting.carriesToNextRound ? (th?" (รอบถัดไป)":" (next round)") : ""}`,
      baseTarget, difficulty:String(form.difficulty || "average"), modifier:Number(form.modifier || 0),
      messageMode:visibility, skipDialog:true
    });
    if (!result) return null;
    const spent = Math.min(ppBefore, magicCostOnResult(result.degree,intended));
    const after = Math.max(0,Number(actor.system.pp.value??0)-spent);
    await actor.update({"system.pp.value":after});
    const label = getDisplayItemName(power,lang);
    const note = result.degree === "fumble" ? (th ? "Fumble: เสีย PP ที่ตั้งใจใช้ทั้งหมด และห้ามใช้บทเดิมในรอบถัดไป" : "Fumble: all committed PP lost; cannot retry this spell next round") :
      result.degree === "failure" ? (th?"ล้มเหลว: เสีย 1 PP":"Failure: 1 PP spent") : (th?"ร่ายสำเร็จ: ใช้ PP ตามระดับ":"Success: full level cost");
    await ChatMessage.implementation.create({
      speaker:ChatMessage.getSpeaker({actor}),
      content:`<div class="brp-chat-card ${result.isSuccess?"is-succeed":"is-fail"}"><div class="brp-chat-kicker">MAGIC · LEVEL ${level}</div><div class="card-header"><strong>${escapeForChat(label)}</strong></div><div class="brp-chat-metric">−${spent} PP</div><div class="card-actor">${ppBefore} → ${after}/${actor.system.pp.max} · DEX rank ${casting.rank}</div><div class="brp-chat-foot">${escapeForChat(note)}${magic.requiresResistance ? (th?" · ตรวจการต้านทานของเป้าหมายแยกต่างหาก":" · Resolve target resistance separately") : ""}</div></div>`,
      ...this.chatVisibility(visibility)
    });
    return {...result,level,intended,spent,ppAfter:after};
  }

  /** Major Wound Table, BRP UGE p.135. Results are attached to the wound record.
   * Stat loss only applies on a failed Luck roll and is not reversed by healing HP.
   */
  static async rollMajorWound(actor, woundId = null) {
    if (!actor?.isOwner) throw new Error("No permission to update this Actor");
    const wounds = (actor.system.wounds ?? []).filter(w=>w.severity==="major" && !w.majorDetermined);
    const wound = woundId ? wounds.find(w=>w.id===woundId) : wounds[0];
    if (!wound) {
      ui.notifications?.warn("ไม่มี Major Wound ที่ยังไม่ได้ทอยผล / No unresolved major wound");
      return null;
    }
    const choice = await this.confirmRoll({title:"Major Wound (1D100) + Luck",percentile:false});
    if (!choice) return null;
    const messageMode = choice.messageMode;
    const injuryRoll = await new Roll("1d100").evaluate();
    const total = Number(injuryRoll.total);
    const outcome = majorWoundOutcome(total);
    const luck = await this.rollSkill({actor,title:`Major Wound Luck — ${wound.title}`,
      baseTarget:Number(actor.system.characteristics?.pow?.value ?? 10)*5,
      messageMode,skipDialog:true});
    if (!luck) return null;
    const losses = {};
    if (!luck.isSuccess && !outcome.gmChoice) {
      for (const characteristic of outcome.stats ?? [outcome.stat]) {
        const r = await new Roll(outcome.dice).evaluate();
        losses[characteristic]=Math.max(0,Math.round(Number(r.total)||0));
      }
      if (outcome.move) losses.mov=losses[outcome.stat]||0;
    }
    const th = game.settings.get("brp-uge","uiLanguage") !== "en";
    const lossLabel = Object.entries(losses).map(([k,v])=>`${k.toUpperCase()} −${v}`).join(" · ") || (outcome.gmChoice&&!luck.isSuccess?"GM assignment pending":"none");
    await actor.applyMajorWoundResult(wound.id,{rollTotal:total,losses,luckPassed:luck.isSuccess});
    await injuryRoll.toMessage({
      speaker:ChatMessage.getSpeaker({actor}),
      content:`<div class="brp-chat-card is-fail"><div class="brp-chat-kicker">MAJOR WOUND · RULEBOOK p.135</div><div class="card-header"><strong>${escapeForChat(wound.title)}</strong></div><div class="brp-chat-metric">${String(total).padStart(2,"0")}</div><p>${escapeForChat(th ? outcome.th : outcome.en)}</p><div class="brp-chat-foot">Luck: ${luck.isSuccess?"Success ✓":"Failure ✕"} · ${escapeForChat(lossLabel)}${outcome.gmChoice?" · GM chooses four characteristics (1D4 each)":""}</div></div>`
    },{messageMode});
    return {total,outcome,luckPassed:luck.isSuccess,losses,woundId:wound.id};
  }

  static async rollSanity(actor) {
    if (!actor) return null;
    const curSan = Number(actor.system.san?.value ?? 50);
    const { DialogV2 } = foundry.applications.api;

    let formValues = null;
    await DialogV2.wait({
      window: { title: `ทอยตรวจสอบสติสัมปชัญญะ (Sanity Check) — ${actor.name}` },
      content: `
        <form class="brp-macro-form">
          <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">ค่า SAN ปัจจุบัน: <strong style="color:#f87171;">${curSan}%</strong></p>
          <div class="form-group">
            <label>หัวข้อ / เหตุการณ์สยองขวัญ</label>
            <input type="text" name="reason" value="เผชิญหน้าความสยองขวัญ (Sanity Check)" />
          </div>
          <div class="form-group">
            <label>เสีย SAN เมื่อสำเร็จ (Success Loss)</label>
            <input type="text" name="successLoss" value="0" placeholder="เช่น 0, 1, 1D3" />
          </div>
          <div class="form-group">
            <label>เสีย SAN เมื่อล้มเหลว (Failure Loss)</label>
            <input type="text" name="failLoss" value="1D6" placeholder="เช่น 1D3, 1D6, 1D10" />
          </div>
          <div class="form-group">
            <label>ความยาก (Difficulty)</label>
            <select name="difficulty"><option value="average" selected>ปกติ (Average)</option><option value="easy">ง่าย ×2</option><option value="difficult">ยาก ÷2</option><option value="automatic">อัตโนมัติ</option><option value="impossible">เป็นไปไม่ได้</option></select>
          </div>
          <div class="form-group"><label>ตัวปรับแก้ (%)</label><input type="number" name="modifier" value="0" /></div>
          <div class="form-group"><label>การแสดงผลลูกเต๋า</label><select name="messageMode"><option value="public">สาธารณะ</option><option value="gm">เฉพาะ GM</option><option value="blind">ทอยลับถึง GM</option><option value="self">เฉพาะตนเอง</option></select></div>
        </form>
      `,
      buttons: [
        {
          action: "roll",
          label: "ทอย SAN (1D100)",
          default: true,
          callback: (_event, button) => {
            const f = button.form;
            formValues = {
              reason: f.elements.reason.value || "Sanity Check",
              successLoss: (f.elements.successLoss.value || "0").trim(),
              failLoss: (f.elements.failLoss.value || "1D6").trim(),
              modifier: Number(f.elements.modifier.value || 0),
              difficulty: f.elements.difficulty.value,
              messageMode: f.elements.messageMode.value
            };
          }
        }
      ]
    });

    if (!formValues) return null;

    const res = await this.rollSkill({
      actor,
      title: formValues.reason,
      subtitle: `SAN ${curSan}% (สำเร็จ -${formValues.successLoss} / ล้มเหลว -${formValues.failLoss})`,
      baseTarget: curSan,
      modifier: formValues.modifier,
      difficulty: formValues.difficulty,
      messageMode: formValues.messageMode,
      skipDialog: true
    });
    if (!res) return null;

    const lossExpr = res.isSuccess ? formValues.successLoss : formValues.failLoss;
    let loss = 0;
    if (lossExpr && lossExpr !== "0") {
      if (Roll.validate(lossExpr)) {
        const lossRoll = await new Roll(lossExpr).evaluate();
        loss = Math.max(0, Number(lossRoll.total ?? 0));
      } else {
        loss = Math.max(0, parseInt(lossExpr, 10) || 0);
      }
    }

    if (loss > 0) {
      const nextSan = Math.max(0, curSan - loss);
      await actor.update({ "system.san.value": nextSan });
      const indefiniteCut = Math.max(1, Math.ceil(curSan / 5));
      let warning = "";
      if (loss >= indefiniteCut) {
        warning = `<br/><strong style="color:#f87171;">⚠ สูญเสีย SAN ≥ 20% (${indefiniteCut}) — เกิดวิกลจริตระยะยาว (Indefinite Insanity)!</strong>`;
        if (typeof actor.addInsanity === "function") {
          await actor.addInsanity({
            title: `${formValues.reason} (Indefinite)`,
            kind: "indefinite",
            sanLost: loss,
            duration: "1D6 เดือน / จนกว่าจะบำบัด",
            notes: `เสีย SAN -${loss} (≥ 20% ของ ${curSan})`,
            deductSan: false
          });
        }
      } else if (loss >= 5) {
        warning = `<br/><strong style="color:#fbbf24;">⚠ สูญเสีย SAN ≥ 5 — ทอย Idea (INT×5) หากสำเร็จจะเกิด Temporary Insanity!</strong>`;
        if (typeof actor.addInsanity === "function") {
          await actor.addInsanity({
            title: `${formValues.reason} (Temporary)`,
            kind: "temporary",
            sanLost: loss,
            duration: "1D10 ชม.",
            notes: `เสีย SAN -${loss} (≥ 5)`,
            deductSan: false
          });
        }
      }
      await ChatMessage.implementation.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="brp-chat-card is-fail"><div class="brp-chat-kicker">SANITY</div><div class="card-header"><strong>${escapeForChat(actor.name)}</strong> สูญเสียสติสัมปชัญญะ <strong>−${loss} SAN</strong></div><div class="card-actor">เหลือ ${nextSan}/${actor.system.san?.max ?? 99} ${warning}</div></div>`,
        ...this.chatVisibility(formValues.messageMode)
      });
    }
    return { ...res, loss };
  }

  static computeWeaponDamageFormula(baseDmg, dm, degree = "success") {
    const cleanBase = String(baseDmg || "1D6").trim();
    const cleanDm = dm && dm !== "0" ? String(dm).trim() : "";
    if (degree === "critical") {
      // Max base dice + max DM dice
      const evalMax = (expr) => {
        const m = String(expr).replace(/\s+/g, "").match(/^([+-]?\d+)?d(\d+)([+-]\d+)?$/i);
        if (!m) {
          const n = parseInt(expr, 10);
          return Number.isNaN(n) ? 6 : n;
        }
        const sign = String(expr).trim().startsWith("-") ? -1 : 1;
        const count = Math.abs(parseInt(m[1] || "1", 10)) || 1;
        const sides = parseInt(m[2], 10) || 6;
        const flat = parseInt(m[3] || "0", 10) || 0;
        return sign * count * sides + flat;
      };
      const maxVal = Math.max(1, evalMax(cleanBase) + (cleanDm ? evalMax(cleanDm) : 0));
      return { formula: String(maxVal), isFixed: true, fixedTotal: maxVal };
    }
    if (degree === "special") {
      const m = cleanBase.replace(/\s+/g, "").match(/^(\d+)d(\d+)([+-]\d+)?$/i);
      const doubledBase = m
        ? `${Number(m[1]) * 2}d${m[2]}${m[3] ? `${Number(m[3]) >= 0 ? "+" : ""}${Number(m[3]) * 2}` : ""}`
        : `(${cleanBase})*2`;
      return {
        formula: cleanDm ? `${doubledBase}${cleanDm.startsWith("+") || cleanDm.startsWith("-") ? cleanDm : `+${cleanDm}`}` : doubledBase,
        isFixed: false
      };
    }
    return {
      formula: cleanDm ? `${cleanBase}${cleanDm.startsWith("+") || cleanDm.startsWith("-") ? cleanDm : `+${cleanDm}`}` : cleanBase,
      isFixed: false
    };
  }

  static async renderDamageCard({
    attackerActor,
    weaponName,
    degree = "success",
    damageTotal = 0,
    breakdown = "",
    specialType = "none",
    bypassArmor = false,
    targetInfo = null,
    messageMode = "public"
  }) {
    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/brp-uge/templates/chat/damage-card.hbs",
      {
        attackerName: attackerActor?.name ?? "BRP Attacker",
        weaponName,
        degreeLabel: DEGREE_THAI[degree] ?? degree,
        damageTotal,
        halfDamage: Math.max(1, Math.floor(Number(damageTotal || 0) / 2)),
        breakdown,
        specialType: specialType !== "none" ? specialType : "",
        bypassArmor,
        targetInfo
      }
    );
    return ChatMessage.implementation.create({
      speaker: ChatMessage.getSpeaker({ actor: attackerActor }),
      content,
      ...this.chatVisibility(messageMode)
    });
  }

  static bindChatListeners(html) {
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root) return;

    root.querySelectorAll("[data-brp-damage-card]").forEach((card) => {
      if (card.dataset.brpBound === "1") return;
      card.dataset.brpBound = "1";

      card.querySelectorAll("[data-brp-damage-action]").forEach((btn) => {
        btn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          const action = ev.currentTarget.dataset.brpDamageAction;
          const rawDmg = Number(card.dataset.brpDamage || 0);
          const baseBypass = card.dataset.brpBypass === "1";
          const weaponName = card.dataset.brpWeapon || "โจมตี";
          const storedTargetUuid = card.dataset.brpTargetUuid || "";

          let actors = canvas.tokens?.controlled?.map((t) => t.actor).filter(Boolean) ?? [];
          if (!actors.length && game.user?.targets?.size) {
            actors = Array.from(game.user.targets).map((t) => t.actor).filter(Boolean);
          }
          if (!actors.length && storedTargetUuid) {
            const doc = typeof fromUuidSync === "function" ? fromUuidSync(storedTargetUuid) : await fromUuid(storedTargetUuid);
            const tActor = doc?.actor ?? (doc?.documentName === "Actor" ? doc : null);
            if (tActor) actors = [tActor];
          }

          // Deduplicate actors by id/uuid
          const uniqueActors = [];
          const seen = new Set();
          for (const a of actors) {
            const key = a.uuid || a.id;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueActors.push(a);
            }
          }

          if (!uniqueActors.length) {
            ui.notifications.warn("กรุณาคลิกเลือก Token เป้าหมายบนแผนที่ (หรือ Target ไว้) ก่อนกดปุ่มทำดาเมจ");
            return;
          }

          const appliedAmount = action === "half" ? Math.max(1, Math.floor(rawDmg / 2)) : rawDmg;
          const bypass = action === "bypass" ? true : baseBypass;

          for (const targetActor of uniqueActors) {
            if (typeof targetActor.applyDamage === "function") {
              await targetActor.applyDamage(appliedAmount, { bypassArmor: bypass, weaponName });
            }
          }
        });
      });
    });
  }
}
