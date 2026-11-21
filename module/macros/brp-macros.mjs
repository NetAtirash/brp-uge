import { powerChance, getLocalizedName, getNameLanguage, escapeForChat } from "../character-tools.mjs";
import { BRPRolls } from "../rolls/brp-rolls.mjs";

export const BRP_MACROS = {
  skillCheckDialog: async (actor) => {
    const targetActor = actor ?? canvas.tokens.controlled[0]?.actor ?? game.user.character;
    if (!targetActor) return ui.notifications.warn("กรุณาเลือกโทเคนหรือกำหนดตัวละครหลักก่อน");

    const skills = targetActor.items.filter((i) => i.type === "skill");
    const options = skills
      .map((s) => `<option value="${s.id}">${escapeForChat(getLocalizedName(s,getNameLanguage()))} (${s.system.total ?? s.system.base}%)</option>`)
      .join("");

    const { DialogV2 } = foundry.applications.api;
    await DialogV2.wait({
      window: { title: `ตรวจสอบทักษะ BRP — ${targetActor.name}` },
      content: `
        <form class="brp-macro-form">
          <div class="form-group">
            <label>ทักษะ (Skill)</label>
            <select name="skillId">${options}</select>
          </div>
          <div class="form-group">
            <label>ระดับความยาก (Difficulty)</label>
            <select name="difficulty">
              <option value="automatic">อัตโนมัติ (Automatic)</option>
              <option value="easy">ง่าย ×2 (Easy)</option>
              <option value="average" selected>ปกติ ×1 (Average)</option>
              <option value="difficult">ยาก ÷2 (Difficult)</option>
              <option value="impossible">แทบเป็นไปไม่ได้ (01%)</option>
            </select>
          </div>
          <div class="form-group"><label>ตัวปรับแก้สถานการณ์ (%)</label><input type="number" name="modifier" value="0" /></div>
          <div class="form-group"><label>การแสดงผล</label><select name="messageMode"><option value="public">สาธารณะ</option><option value="gm">GM</option><option value="blind">ลับถึง GM</option><option value="self">ส่วนตัว</option></select></div>
        </form>
      `,
      buttons: [
        {
          action: "roll",
          label: "ทอย D100",
          default: true,
          callback: (_event, button) => {
            const form = button.form;
            const skillId = form.elements.skillId.value;
            const difficulty = form.elements.difficulty.value;
            const modifier = Number(form.elements.modifier.value || 0);
            const item = targetActor.items.get(skillId);
            if (!item) return;
            BRPRolls.rollSkill({
              actor: targetActor,
              skillId: item.id,
              title: getLocalizedName(item, getNameLanguage()),
              baseTarget: item.system.total ?? item.system.base,
              difficulty,
              modifier,
              messageMode: form.elements.messageMode.value,
              skipDialog: true
            });
          }
        }
      ]
    });
  },

  resistanceDialog: async () => {
    const caster = canvas.tokens?.controlled?.[0]?.actor ?? game.user?.character;
    const targetToken = Array.from(game.user?.targets ?? [])[0] ?? null;
    const targetActor = targetToken?.actor ?? null;
    const defaultActive = Number(caster?.system?.characteristics?.pow?.value ?? 14);
    const defaultPassive = Number(targetActor?.system?.characteristics?.pow?.value ?? 11);
    const { DialogV2 } = foundry.applications.api;
    await DialogV2.wait({
      window: { title: "ตารางต้านทาน BRP (Resistance Table)" },
      content: `
        <form class="brp-macro-form">
          <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">
            ฝ่ายรุก: <strong style="color:#f1f5f9;">${caster ? caster.name : "กำหนดเอง"}</strong> ·
            เป้าหมาย (Target): <strong style="color:#fca5a5;">${targetActor ? targetActor.name : "ไม่ได้เลือก Target"}</strong>
          </p>
          <div class="form-group"><label>ค่าพลังฝ่ายรุก (Active เช่น Caster POW)</label><input type="number" name="active" value="${defaultActive}" /></div>
          <div class="form-group"><label>ค่าพลังฝ่ายรับ (Passive เช่น Target POW)</label><input type="number" name="passive" value="${defaultPassive}" /></div>
          <div class="form-group"><label>หัวข้อการต้านทาน</label><input type="text" name="label" value="ทอยต้านทานเวทมนตร์${targetActor ? ` (vs ${targetActor.name})` : " (POW vs POW)"}" /></div>
        </form>
      `,
      buttons: [
        {
          action: "roll",
          label: "ทอยต้านทาน",
          default: true,
          callback: (_event, button) => {
            const form = button.form;
            const active = Number(form.elements.active.value);
            const passive = Number(form.elements.passive.value);
            const label = form.elements.label.value;
            BRPRolls.rollResistance(active, passive, label, caster ?? null);
          }
        }
      ]
    });
  },

  experienceImprovement: async (actor) => {
    const targetActor = actor ?? canvas.tokens.controlled[0]?.actor ?? game.user.character;
    if (!targetActor) return ui.notifications.warn("กรุณาเลือกโทเคนก่อน");
    const checked = targetActor.items.filter((i) => ["skill", "power"].includes(i.type) && i.system.checked);
    if (!checked.length) return ui.notifications.info("ยังไม่มีทักษะหรือพลังที่ทำเครื่องหมายพัฒนา");
    const confirm = await BRPRolls.confirmRoll({
      title: `EXP / Improvement (${checked.length} checks)`,
      percentile: false
    });
    if (!confirm) return;
    const expBonus = targetActor.system.derived?.expBonus ?? 0;
    const lines = [];
    for (const item of checked) {
      const current = item.type === "power"
        ? powerChance(item, targetActor)
        : Number(item.system.total ?? item.system.base ?? 0);
      const r = await new Roll("1d100").evaluate();
      const threshold = current - expBonus;
      const succeeds = r.total > threshold || r.total >= 96;
      const gain = succeeds ? Number((await new Roll("1d6").evaluate()).total) : 0;
      await targetActor.saveAdvancement({
        itemId: item.id, points: gain, method: "experience",
        reason: `EXP check ${r.total} (target >${threshold}) · ${succeeds ? "สำเร็จ" : "ไม่สำเร็จ"}`
      });
      await item.update({ "system.checked": false });
      const safeName = escapeForChat(getLocalizedName(item, getNameLanguage()));
      lines.push(`<li><strong>${safeName}</strong>: ${r.total} (>${threshold}) — ${succeeds ? `+${gain}%` : "ไม่เพิ่ม"}</li>`);
    }
    await ChatMessage.implementation.create({
      speaker: ChatMessage.getSpeaker({ actor: targetActor }),
      content: `<div class="brp-chat-card is-succeed"><div class="brp-chat-kicker">ADVANCEMENT</div><div class="brp-chat-heading" style="color:#f4f8ff!important;font-size:13px!important;font-weight:700!important;line-height:1.45!important">ผลทอยพัฒนาทักษะ/พลัง</div><ul>${lines.join("")}</ul></div>`,
      ...BRPRolls.chatVisibility(confirm.messageMode)
    });
  }
};
