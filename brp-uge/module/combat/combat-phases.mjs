import { BRP_CONFIG, getCampaignRules } from "../config.mjs";
import { BRP_INTENTS, BRP_PHASES, brpMovementMultiplier, brpActionRank, brpIntentPhase } from "./combat-flow-utils.mjs";

/** Foundry V14 sidebar enhancement. Never append editable controls inside native
 * Combatant <li> rows: V14 lays those rows out in narrow grid columns.
 * Keep the native tracker intact and place a single vertical planning panel above it.
 */
export class BRPCombatPhases {
  static selectedCombatantId = null;
  static expandedOptions = false;
  static lastTurnIdentity = null;

  static getPlan(combat, combatant) {
    const map = combatant?.actor?.getFlag?.("brp-uge", "combatPlans") ?? {};
    const found = map[combatant?.id];
    return found?.combatId === combat?.id && Number(found.round) === Number(combat?.round)
      ? found : { intent: "", note: "", moveMeters: 0, delayTo: 0, done: false };
  }

  static getEngagement(combat, combatant) {
    const map = combatant?.actor?.getFlag?.("brp-uge", "combatEngagements") ?? {};
    const record = map[combatant?.id];
    return record?.combatId === combat?.id
      ? { engaged: Boolean(record.engaged), with: String(record.with ?? "") }
      : { engaged: false, with: "" };
  }

  static async updateEngagement(combat, combatant, patch) {
    const actor = combatant?.actor;
    if (!actor?.isOwner || !combat?.id || !combatant?.id) throw new Error("You must own the Actor to set engagement.");
    const map = foundry.utils.deepClone(actor.getFlag("brp-uge", "combatEngagements") ?? {});
    map[combatant.id] = {
      ...this.getEngagement(combat, combatant),
      ...patch, combatId: combat.id,
      with: String(patch.with ?? this.getEngagement(combat, combatant).with).slice(0, 100)
    };
    await actor.setFlag("brp-uge", "combatEngagements", map);
    ui.combat?.render();
    this.refreshSceneHUD();
    return map[combatant.id];
  }

  static async updatePlan(combat, combatant, patch) {
    const actor = combatant?.actor;
    if (!actor?.isOwner || !combat?.id || !combatant?.id) throw new Error("You must own the Actor to declare an action.");
    const map = foundry.utils.deepClone(actor.getFlag("brp-uge", "combatPlans") || {});
    const prior = this.getPlan(combat, combatant);
    map[combatant.id] = {
      ...prior, ...patch, combatId: combat.id, round: Number(combat.round),
      note: String(patch.note ?? prior.note ?? "").slice(0, 240)
    };
    await actor.setFlag("brp-uge", "combatPlans", map);
    ui.combat?.render();
    this.refreshSceneHUD();
    return map[combatant.id];
  }

  static _text(root, tag, value, className = "") {
    const el = document.createElement(tag);
    el.textContent = String(value ?? "");
    if (className) el.className = className;
    root.appendChild(el);
    return el;
  }

  static _button(label, tooltip, className, action) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.textContent = label;
    btn.title = tooltip;
    btn.addEventListener("click", async e => {
      e.preventDefault(); e.stopPropagation();
      btn.disabled = true;
      try { await action(e); }
      catch (error) { console.error("BRP UGE | Combat action failed", error); ui.notifications?.error(error.message); }
      finally { btn.disabled = false; }
    });
    return btn;
  }

  static _select(choices, value, className) {
    const sel = document.createElement("select");
    sel.className = className;
    for (const [id, text] of choices) {
      const opt = document.createElement("option");
      opt.value = String(id);
      opt.textContent = String(text);
      sel.appendChild(opt);
    }
    sel.value = String(value ?? "");
    return sel;
  }

  static _field(parent, title, element, hint) {
    const label = document.createElement("label");
    label.className = "brp-plan-field";
    this._text(label, "span", title, "brp-plan-field-label");
    element.title = hint ?? title;
    label.appendChild(element);
    parent.appendChild(label);
    return label;
  }

  static getCombatData(combat, combatant, phase = combat.getPhase()) {
    const rules = getCampaignRules();
    const p = this.getPlan(combat, combatant);
    const dex = Number(combatant.actor?.system?.derived?.effectiveCharacteristics?.dex ?? combatant.actor?.system?.characteristics?.dex?.value ?? 10);
    const int = Number(combatant.actor?.system?.derived?.effectiveCharacteristics?.int ?? combatant.actor?.system?.characteristics?.int?.value ?? 10);
    const bonus = rules.useD10Initiative ? Number(combatant.getFlag?.("brp-uge", "intInitiativeBonus") ?? 0) : 0;
    const dexRank = Number(combatant.initiative ?? dex);
    const powerRank = int + bonus;
    const actionRank = brpActionRank(p.intent === "power" && rules.combatPowerTiming === "action" ? powerRank : dexRank,
      p.moveMeters, p.delayTo);
    const activePhase = brpIntentPhase(p.intent, rules.combatPowerTiming);
    const relevant = Boolean(p.intent && (phase === activePhase || phase === "statements"));
    const phaseRank = phase === "powers" ? Math.min(powerRank, Number(p.delayTo) > 0 ? Number(p.delayTo) : powerRank)
      : phase === "statements" ? dexRank : actionRank;
    return { plan: p, dexRank, powerRank, actionRank, phaseRank, relevant };
  }

  static _trackerHeader(combat, isGM, isTh, rules) {
    const phase = combat.getPhase();
    const current = BRP_CONFIG.combatPhases.find(x => x.id === phase) ?? BRP_CONFIG.combatPhases[0];
    const root = document.createElement("section");
    root.className = "brp-combat-phase-bar brp-compact-phase-bar";
    const actions = document.createElement("div");
    actions.className = "brp-compact-phase-actions";
    const previous = this._button("‹", isTh ? "เฟสก่อนหน้า" : "Previous phase", "brp-phase-nav brp-phase-back", () => combat.prevPhase());
    previous.disabled = !isGM;
    actions.appendChild(previous);
    const center = document.createElement("div"); center.className = "brp-compact-phase-current";
    this._text(center,"small",`${isTh ? "รอบ" : "Round"} ${combat.round ?? 0} · ${isTh ? "เฟส" : "Phase"} ${current.numberLabel}`,"brp-compact-phase-number");
    this._text(center,"strong",isTh ? current.nameTh : current.nameEn,"brp-compact-phase-name");
    actions.appendChild(center);
    const next = this._button("›", isTh ? "เฟสถัดไป" : "Next phase", "brp-phase-nav brp-phase-next", () => combat.nextPhase());
    next.disabled = !isGM;
    actions.appendChild(next);
    root.appendChild(actions);
    const trail = document.createElement("nav"); trail.className = "brp-compact-breadcrumbs";
    trail.setAttribute("aria-label", isTh ? "ลำดับเฟส" : "Combat phase progress");
    BRP_CONFIG.combatPhases.forEach((p, i) => {
      if (i) this._text(trail, "span", "›", "brp-crumb-divider");
      const crumb = this._text(trail, "span", p.numberLabel, `brp-phase-crumb ${p.id === phase ? "active" : ""}`);
      crumb.title = isTh ? p.nameTh : p.nameEn;
      if (p.id === phase) crumb.setAttribute("aria-current", "step");
    });
    root.appendChild(trail);
    return root;
  }

  static _planner(combat, isGM, isTh, rules) {
    const panel = document.createElement("section");
    panel.className = "brp-combat-planner";
    const candidates = [...combat.combatants].filter(c => c.actor && (isGM || c.actor?.isOwner));
    if (!candidates.length) {
      this._text(panel,"p", isTh ? "เลือกตัวละครที่คุณควบคุมเพื่อประกาศเจตนา" : "Select a controllable character to declare actions.", "brp-planner-muted");
      return panel;
    }
    // An explicit manual selection persists only during the current Foundry turn.
    // When a different Combatant becomes active (including another phase or round),
    // focus their plan again. GM may still inspect anyone else's plan mid-turn.
    const activeId = combat.combatant?.id ?? "";
    const identity = `${combat.id}:${combat.round}:${combat.getPhase()}:${combat.turn}:${activeId}`;
    if (identity !== this.lastTurnIdentity) {
      this.lastTurnIdentity = identity;
      this.selectedCombatantId = candidates.some(c => c.id === activeId) ? activeId : candidates[0].id;
    }
    const pick = candidates.find(c=>c.id===this.selectedCombatantId) ??
      candidates.find(c=>c.id===activeId) ?? candidates[0];
    this.selectedCombatantId = pick.id;
    const heading = document.createElement("div"); heading.className = "brp-planner-heading";
    this._text(heading, "strong", isTh ? "แผนของตัวละคร" : "Character plan");
    const picker = this._select(candidates.map(c => [c.id, c.name ?? c.actor?.name ?? "?"]), pick.id, "brp-planner-picker");
    picker.setAttribute("aria-label", isTh ? "เลือก Combatant" : "Choose combatant");
    picker.addEventListener("change", () => { this.selectedCombatantId = picker.value; ui.combat?.render(); });
    heading.appendChild(picker); panel.appendChild(heading);

    const plan = this.getPlan(combat,pick);
    const engagement = this.getEngagement(combat,pick);
    const data = this.getCombatData(combat,pick);
    const summary = document.createElement("div"); summary.className = "brp-planner-summary";
    this._text(summary,"span",`DEX ${data.dexRank} · INT ${data.powerRank}`,"brp-c-badge");
    this._text(summary,"span",plan.done ? (isTh ? "✓ ดำเนินการแล้ว" : "✓ Resolved") :
      (isTh ? "ยังไม่ดำเนินการ" : "Pending"),`brp-planner-state ${plan.done ? "done" : ""}`);
    panel.appendChild(summary);

    const choices = [["",isTh ? "— เลือกการกระทำ —" : "— Choose an action —"], ...BRP_INTENTS.map(i => [i.id, isTh ? i.th : i.en])];
    const intent = this._select(choices,plan.intent,"brp-plan-select");
    intent.addEventListener("change",()=>this.updatePlan(combat,pick,{intent:intent.value,done:false}).catch(e=>ui.notifications?.error(e.message)));
    this._field(panel,isTh?"การกระทำที่ประกาศ":"Declared action",intent);

    const engaged = document.createElement("div"); engaged.className = "brp-engage-row";
    const engagedButton = this._button(engagement.engaged ? (isTh ? "⚔ ประชิดอยู่ (Engaged)" : "⚔ Engaged") :
      (isTh ? "○ ไม่ได้ประชิด (Disengaged)" : "○ Disengaged"),
      isTh ? "ติดตามสถานะการเข้าประชิด แยกจากการประกาศในแต่ละรอบ" : "Track melee engagement across rounds",
      `brp-engagement-toggle ${engagement.engaged ? "engaged" : ""}`,
      () => this.updateEngagement(combat,pick,{engaged:!engagement.engaged}));
    engagedButton.setAttribute("aria-pressed",String(engagement.engaged));
    engaged.appendChild(engagedButton); panel.appendChild(engaged);

    const note = document.createElement("input"); note.type = "text"; note.value = plan.note ?? ""; note.maxLength=240;
    note.placeholder = isTh ? "เป้าหมาย / อาวุธ / รายละเอียด" : "Target / weapon / details";
    note.addEventListener("keydown",e=>e.stopPropagation());
    note.addEventListener("change",()=>this.updatePlan(combat,pick,{note:note.value}).catch(e=>ui.notifications?.error(e.message)));
    this._field(panel,isTh?"รายละเอียด":"Details",note);

    const options = document.createElement("details"); options.className="brp-plan-options"; options.open=this.expandedOptions;
    options.addEventListener("toggle",()=>{ this.expandedOptions = options.open; });
    this._text(options,"summary",isTh?"ตัวเลือกเพิ่มเติม: เคลื่อนที่ / หน่วงเวลา / คู่ต่อสู้":"More: movement / delay / opponent");
    const optBody = document.createElement("div"); optBody.className="brp-plan-options-body";
    const move=this._select([[0,isTh?"ไม่เกิน 5 ม.":"≤5 m"],[10,"6–15 m (½ DEX)"],[20,"16–29 m (¼ DEX)"],[30,"≥30 m (Move only)"]], plan.moveMeters??0,"brp-plan-select");
    move.addEventListener("change",()=>this.updatePlan(combat,pick,{moveMeters:Number(move.value),done:false}).catch(e=>ui.notifications?.error(e.message)));
    this._field(optBody,isTh?"การเคลื่อนที่":"Movement",move);
    const delay=document.createElement("input"); delay.type="number"; delay.min="0";delay.max="99";delay.value=Number(plan.delayTo||0);
    delay.addEventListener("change",()=>this.updatePlan(combat,pick,{delayTo:Math.max(0,Math.floor(Number(delay.value)||0)),done:false}).catch(e=>ui.notifications?.error(e.message)));
    this._field(optBody,isTh?"หน่วงถึง Rank (0 = ไม่หน่วง)":"Delay to rank (0 = none)",delay);
    const opponent=document.createElement("input");opponent.type="text";opponent.maxLength=100;opponent.value=engagement.with??"";
    opponent.placeholder=isTh?"ศัตรูที่กำลังประชิด":"Engaged with…";
    opponent.addEventListener("keydown",e=>e.stopPropagation());
    opponent.addEventListener("change",()=>this.updateEngagement(combat,pick,{with:opponent.value}).catch(e=>ui.notifications?.error(e.message)));
    this._field(optBody,isTh?"คู่ต่อสู้ประชิด":"Engaged opponent",opponent);
    options.appendChild(optBody);panel.appendChild(options);

    const footer = document.createElement("div");footer.className="brp-planner-footer";
    const phase = combat.getPhase();
    const canComplete = plan.intent && phase !== "statements" && phase === brpIntentPhase(plan.intent,rules.combatPowerTiming);
    const done=this._button(plan.done ? (isTh?"↶ ย้อนสถานะ":"↶ Mark pending") : (isTh?"✓ บันทึกว่ากระทำแล้ว":"✓ Mark resolved"),
      isTh?"ผลของการกระทำและการตัดสินผลเกิดขึ้นต่อเนื่องกัน":"Action and outcome are resolved together",
      `brp-plan-complete ${plan.done?"done":""}`,
      ()=>this.updatePlan(combat,pick,{done:!plan.done}));
    done.disabled = !canComplete && !plan.done;
    footer.appendChild(done);
    const parries=Number(pick.getFlag?.("brp-uge","parriesUsed")??0);
    const dodges=Number(pick.getFlag?.("brp-uge","dodgesUsed")??0);
    this._text(footer,"span",`P ${parries} · D ${dodges}`,"brp-c-def");
    if (isGM) {
      footer.appendChild(this._button("+P","Record parry","brp-c-mini",()=>combat.recordDefense(pick.id,"parry")));
      footer.appendChild(this._button("+D","Record dodge","brp-c-mini",()=>combat.recordDefense(pick.id,"dodge")));
    }
    panel.appendChild(footer);
    return panel;
  }

  static onRenderCombatTracker(_app, html, _data) {
    const root = (typeof HTMLElement !== "undefined" && html instanceof HTMLElement) ? html : html?.[0];
    if (!root) return;
    root.querySelectorAll(".brp-combat-tracker-tools, .brp-combat-phase-bar, .brp-combat-planner, .brp-combatant-extra").forEach(el=>el.remove());
    const rules = getCampaignRules();
    if (!rules.useCombatPhases) { this.refreshSceneHUD(); return; }
    const combat = game.combats?.viewed ?? game.combat;
    if (!combat) { this.refreshSceneHUD(); return; }
    const isGM=Boolean(game.user?.isGM);
    const isTh=game.settings.get("brp-uge","uiLanguage")!=="en";
    const host=document.createElement("div");host.className="brp-combat-tracker-tools";
    host.appendChild(this._trackerHeader(combat,isGM,isTh,rules));
    host.appendChild(this._planner(combat,isGM,isTh,rules));
    // No changes to native .combatant rows, preserving V14 tracker controls.
    const anchor=root.querySelector(".combat-tracker-header") ?? root.querySelector(".directory-header") ?? root.firstElementChild;
    if (anchor?.parentElement) anchor.insertAdjacentElement("afterend",host);
    else root.prepend(host);
    this.refreshSceneHUD();
  }

  static refreshSceneHUD() {
    if (typeof document==="undefined" || !globalThis.game) return;
    let hud=document.getElementById("brp-scene-phase-hud");
    const rules=getCampaignRules();
    // The active Encounter is authoritative for the scene banner, including clients
    // whose Combat sidebar is closed or whose viewed Encounter differs.
    const combat=[game.combat,game.combats?.viewed,...(game.combats?.contents ?? [])]
      .find(c=>c && Number(c.round)>=1 && (!c.scene || c.scene.id===canvas?.scene?.id))
      ?? null;
    if (!rules.useCombatPhases || !rules.combatShowSceneHUD || !combat || Number(combat.round)<1) {
      hud?.remove(); return;
    }
    if (!hud) {
      hud=document.createElement("aside");hud.id="brp-scene-phase-hud";
      hud.setAttribute("role","status");hud.setAttribute("aria-live","polite");
      // Place the passive banner in the Canvas container. This keeps it in the
      // Scene's stacking context rather than floating above Actor sheets/dialogs.
      (document.querySelector("#canvas") ?? document.querySelector("#interface") ?? document.body).appendChild(hud);
    }
    const canvasHost=document.querySelector("#canvas");
    if (canvasHost && hud.parentElement !== canvasHost) canvasHost.appendChild(hud);
    hud.setAttribute("aria-label", "BRP current combat phase");
    hud.replaceChildren();
    const isTh=game.settings.get("brp-uge","uiLanguage")!=="en";
    const phase=combat.getPhase();
    const p=BRP_CONFIG.combatPhases.find(x=>x.id===phase)??BRP_CONFIG.combatPhases[0];
    hud.dataset.phase=phase;
    this._text(hud,"div",`${isTh?"รอบ":"Round"} ${combat.round}  ·  ${isTh?"เฟส":"Phase"} ${p.numberLabel}`,"brp-hud-round");
    this._text(hud,"div",isTh?p.nameTh:p.nameEn,"brp-hud-current");
    const current=combat.combatant;
    if (current && (game.user?.isGM || !current.hidden)) {
      const dex=this.getCombatData(combat,current,phase);
      this._text(hud,"div",`${isTh?"คิวปัจจุบัน":"Current"}: ${current.name ?? "?"} · ${phase==="powers"?"INT":"DEX"} ${dex.phaseRank}`,"brp-hud-turn");
    }
  }
}
