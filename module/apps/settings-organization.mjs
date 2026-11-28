/** Organize Foundry v14's native SettingsConfig without replacing its form. */
const CATEGORY = {
  uiLanguage:'appearance',paperTheme:'appearance',itemTooltipLanguage:'appearance',
  specialtyCustomPolicy:'creation',manageStartingSkills:'creation',manageSpecialties:'creation',
  woundSuggestions:'reference',bodySuggestions:'reference',mentalSuggestions:'reference',currencyUnits:'reference',
  campaignPowerLevel:'creation',occupationBudgetMethod:'creation',startingSkillsSource:'creation',startingSkillsMode:'creation',
  characteristicMethod:'creation',increasedPersonalSkillPoints:'creation',useEdu:'creation',creationSkillCap:'creation',
  useSanity:'optional',useFatigue:'optional',useHitLocations:'optional',heroicHitPoints:'optional',categoryBonusMode:'optional',
  useCombatPhases:'combat',combatStatementOrder:'combat',combatPowerTiming:'combat',combatShowSceneHUD:'combat',
  combatRevealNpcIntent:'combat',useD10Initiative:'combat',allowPlayerCharacterWizard:'creation',
  powerEnableMagic:'powers',powerEnableSorcery:'powers',powerEnablePsychic:'powers',
  powerEnableMutation:'powers',powerEnableSuperpower:'powers'
};
const GROUPS = {
  appearance:['การแสดงผลและภาษา','Appearance & Language'],
  creation:['การสร้างตัวละครและทักษะเริ่มต้น','Character Creation & Starting Skills'],
  optional:['กฎเสริมและการคำนวณ','Optional Rules & Calculations'],
  powers:['ระบบพลังที่อนุญาต','Available Power Systems'],
  combat:['ระบบการต่อสู้','Combat Rules'],
  reference:['ข้อมูลอ้างอิงที่ GM กำหนด','GM Reference Lists']
};
const TEXT = {
  specialtyCustomPolicy:['นโยบายการเพิ่มความเชี่ยวชาญ','New specialty policy','เลือกว่าจะใช้เฉพาะรายการที่ GM จัดการ หรืออนุญาตให้ขอเพิ่มรายการ','Use GM-managed choices only or allow requests for new specialties'],
  manageStartingSkills:['จัดการทักษะตั้งต้น','Manage starting skills','กำหนดทักษะสำหรับตัวละครใหม่','Configure skills for new characters'],
  manageSpecialties:['จัดการความเชี่ยวชาญ','Manage specialties','กำหนดตัวเลือกความเชี่ยวชาญสำหรับผู้เล่น','Configure specialty choices for players'],
  uiLanguage:['ภาษาของหน้าจอ','Interface language','ภาษาที่ใช้ในชีทและหน้าต่างของระบบ','Language used in system sheets and dialogs'],
  paperTheme:['ธีมสมุดบันทึก','Notebook appearance','เลือกโหมดสว่างหรือมืดสำหรับผู้ใช้คนนี้','Choose Light or Dark for this user'],
  itemTooltipLanguage:['ภาษาคำอธิบายไอเทม','Item tooltip language','ภาษาเริ่มต้นสำหรับคำอธิบายเมื่อชี้ไอเทม','Default language for item hover descriptions'],
  campaignPowerLevel:['ระดับพลังแคมเปญ','Campaign power level','กำหนดแต้มอาชีพและงบสร้างตัวละครตามระดับแคมเปญ','Controls occupation budget and character generation points by campaign level'],
  occupationBudgetMethod:['วิธีคำนวณแต้มอาชีพ','Occupation point calculation','เลือกงบแต้มคงที่หรือวิธีคำนวณโดยใช้ EDU','Choose a fixed point budget or optional EDU-based calculation'],
  startingSkillsSource:['แหล่งข้อมูลทักษะเริ่มต้น','Starting skill sources','อ่านทักษะจากไอเทมใน World และ Compendium ที่ติดตั้ง หรือเฉพาะ World','Read skills from World Items and installed Compendiums, or only World Items'],
  startingSkillsMode:['การเลือกทักษะเริ่มต้น','Starting skill selection','เพิ่มทุกทักษะ, เฉพาะทักษะที่มีแหล่งอ้างอิงจากหนังสือ หรือรายการที่ GM เลือกเอง','Copy all skills, provenance-marked rulebook skills, or an explicit GM selection'],
  characteristicMethod:['วิธีสร้างค่าคุณลักษณะ','Characteristic generation','วิธีทอยหรือจัดสรรค่าคุณลักษณะตอนสร้างตัวละคร','How starting characteristics are generated'],
  increasedPersonalSkillPoints:['แต้มทักษะส่วนตัวเพิ่มเติม','Increased personal skill points','เปิดกฎเสริมเพิ่มแต้มทักษะส่วนตัวตามระดับแคมเปญ','Use the optional higher personal skill budgets by campaign level'],
  useEdu:['ใช้ค่าการศึกษา EDU','Enable education (EDU)','แสดง EDU ในชีท โดยไม่เปลี่ยนงบแต้มอาชีพโดยอัตโนมัติ','Enable the EDU characteristic without automatically changing the occupation budget'],
  useSanity:['ใช้ค่าสติ SAN','Track sanity (SAN)','ติดตามค่าสติบนชีท','Track sanity on character sheets'],
  useFatigue:['ใช้ค่าความเหนื่อยล้า FP','Track fatigue (FP)','ติดตามค่าความเหนื่อยล้า','Track fatigue points'],
  useHitLocations:['ใช้กฎตำแหน่งที่ถูกโจมตี','Hit locations','เปิดกฎตำแหน่งที่ถูกโจมตี','Enable hit location rules'],
  heroicHitPoints:['พลังชีวิตแบบวีรบุรุษ','Heroic hit points','เพิ่มค่าพลังชีวิตสูงสุดตามกฎเสริม','Use the optional increased hit-point calculation'],
  categoryBonusMode:['โบนัสหมวดทักษะ','Skill category bonuses','เลือกวิธีคิดโบนัสหมวดทักษะ','Choose the rule for skill category bonuses'],
  creationSkillCap:['เพดานทักษะเมื่อสร้างตัวละคร','Creation skill cap','ค่าสูงสุดของทักษะระหว่างสร้างตัวละคร','Maximum skill rating at character creation'],
  useCombatPhases:['ระบบต่อสู้แบ่งเฟส','Combat phases','เปิดการต่อสู้แบบแบ่งเฟส','Enable phased combat'],
  combatStatementOrder:['ลำดับการประกาศการกระทำ','Statement order','กำหนดลำดับการประกาศการกระทำในรอบต่อสู้','Order in which combatants declare intentions'],
  combatPowerTiming:['ช่วงเวลาการใช้พลัง','Power timing','กำหนดเฟสที่ใช้พลังระหว่างต่อสู้','Choose when powers are resolved in combat'],
  combatShowSceneHUD:['แสดงสถานะเฟสบนฉาก','Scene phase display','แสดงเฟสปัจจุบันบนฉาก','Show the current combat phase on the scene'],
  combatRevealNpcIntent:['เปิดเผยแผนของ NPC','Reveal NPC intentions','อนุญาตให้ผู้เล่นเห็นแผนของ NPC','Permit players to see NPC intentions'],
  useD10Initiative:['ทอย D10 สำหรับลำดับเริ่ม','D10 initiative','ใช้กฎทอยเต๋ากำหนดลำดับเริ่ม','Use D10 for initiative'],
  allowPlayerCharacterWizard:['อนุญาตให้ผู้เล่นใช้ตัวช่วยสร้าง','Allow player character wizard','ให้ผู้เล่นเปิดตัวช่วยสร้างตัวละครเองได้','Permit players to open character creation wizard'],
  woundSuggestions:['รายการชนิดบาดแผล','Wound suggestions','ตัวเลือกบาดแผลที่ GM ระบุเอง','Optional wound entries maintained by the GM'],
  bodySuggestions:['รายการตำแหน่งร่างกาย','Body locations','ตัวเลือกตำแหน่งร่างกายที่ GM ระบุเอง','Optional body locations maintained by the GM'],
  mentalSuggestions:['รายการอาการทางจิต','Mental conditions','รายการอาการที่ GM ระบุเอง','Optional mental conditions maintained by the GM'],
  currencyUnits:['หน่วยเงินในแคมเปญ','Currency units','หน่วยเงินที่ GM ระบุเอง','Campaign currency names maintained by the GM']
};
for(const [key,th,en] of [['powerEnableMagic','เวทมนตร์','Magic'],['powerEnableSorcery','ไสยเวท','Sorcery'],['powerEnablePsychic','พลังจิต','Psychic'],['powerEnableMutation','การกลายพันธุ์','Mutations'],['powerEnableSuperpower','พลังยอดมนุษย์','Superpowers']]){
  TEXT[key]=[`อนุญาต${th}`,`Allow ${en}`,`ให้ใช้${th}ในแคมเปญนี้`,`Allow ${en} in this campaign`];
}

const CHOICES={
  uiLanguage:{th:['ภาษาไทย','Thai'],en:['ภาษาอังกฤษ','English']},
  itemTooltipLanguage:{th:['ภาษาไทย','Thai'],en:['ภาษาอังกฤษ','English']},
  paperTheme:{light:['โหมดสว่าง','Light'],dark:['โหมดมืด','Dark']},
  campaignPowerLevel:{normal:['ปกติ — 250 / จัดสรรคุณลักษณะ 24','Normal — 250 / Point-buy 24'],heroic:['วีรบุรุษ — 325 / จัดสรรคุณลักษณะ 36','Heroic — 325 / Point-buy 36'],epic:['มหากาพย์ — 400 / จัดสรรคุณลักษณะ 48','Epic — 400 / Point-buy 48'],superhuman:['เหนือมนุษย์ — 500 / จัดสรรคุณลักษณะ 60','Superhuman — 500 / Point-buy 60']},
  occupationBudgetMethod:{fixed:['แต้มคงที่ตามระดับแคมเปญ','Fixed power-level budget'],edu:['ค่าการศึกษา EDU × ตัวคูณ','EDU × level multiplier']},
  startingSkillsSource:{all:['ไอเทมในโลกเกมและคลังข้อมูล','World Items + Compendiums'],world:['เฉพาะไอเทมในโลกเกม','World Items only']},
  startingSkillsMode:{all:['ทักษะทั้งหมดที่ติดตั้ง','All installed skills'],baseline:['เฉพาะทักษะพื้นฐานทั่วไป','Generic baseline skills'],book:['เฉพาะทักษะจากหนังสือกฎ','Rulebook-sourced skills'],selected:['GM เลือกเอง','GM-selected skills']},
  specialtyCustomPolicy:{restricted:['เฉพาะความเชี่ยวชาญที่ GM กำหนด','GM-managed choices only'],approval:['อนุญาตให้ขอเพิ่มเพื่อให้ GM พิจารณา','Allow requests for GM review']},
  characteristicMethod:{rolled:['ทอยมาตรฐาน (3D6 / 2D6+6)','Standard roll (3D6 / 2D6+6)'],heroic_roll:['คุณลักษณะสูง (2D6+6 ทุกค่า)','Higher characteristics (2D6+6 all)'],point_buy:['จัดสรรแต้มเอง','Point-buy']},
  categoryBonusMode:{standard:['มาตรฐาน (หลัก / รอง)','Standard (primary / secondary)'],simple:['แบบย่อ (ค่าหลัก ÷ 2)','Simplified (primary ÷ 2)'],none:['ไม่ใช้โบนัส (0%)','No bonus (0%)']},
  combatStatementOrder:{highFirst:['มาตรฐาน: DEX สูง → ต่ำ','Standard: highest to lowest DEX'],reverse:['กฎเสริม: DEX ต่ำ → สูง','Optional: lowest to highest DEX']},
  combatPowerTiming:{separate:['มาตรฐาน: เฟสพลังแยก','Standard: separate power phase'],action:['กฎเสริม: ใช้พลังในเฟสการกระทำ','Optional: powers in action phase']}
};
const MENU_LABELS={manageStartingSkills:['เปิดตัวเลือกทักษะ','Choose skills'],manageSpecialties:['จัดการความเชี่ยวชาญ','Manage specialties']};
export function settingChoices(key,language='th'){
  return Object.fromEntries(Object.entries(CHOICES[key]||{}).map(([value,words])=>[value,words[language==='en'?1:0]]));
}
export function applySettingsTranslations(settingsApi=globalThis.game?.settings,language='th'){
  // Update only presentation metadata; setting keys, values, scopes and permissions stay intact.
  for(const collection of [settingsApi?.settings,settingsApi?.menus]){
    for(const [id,data] of collection?.entries?.()??[]){
      if(!id.startsWith('brp-uge.'))continue;
      const key=id.slice('brp-uge.'.length),words=settingPresentation(key,language);
      if(!words)continue;
      data.name=words.name;data.hint=words.hint;
      if(MENU_LABELS[key])data.label=MENU_LABELS[key][language==='en'?1:0];
      if(data.choices&&typeof data.choices==='object'){
        const captions=settingChoices(key,language);
        data.choices={...data.choices,...Object.fromEntries(Object.entries(captions).filter(([k])=>Object.hasOwn(data.choices,k)))};
      }
    }
  }
}
export function settingsGroupFor(key){return CATEGORY[key]||'optional';}
export function settingPresentation(key,language='th'){
  const words=TEXT[key];if(!words)return null;
  return {name:words[language==='en'?1:0],hint:words[language==='en'?3:2],group:settingsGroupFor(key)};
}
/** Called on native SettingsConfig render. Respects other modules' settings. */
export function organizeBRPSettings(root,{language='th',onConfigureSkills=null}={}){
  const element=root?.[0]??root;
  if(!element?.querySelectorAll)return 0;
  // SettingsConfig V14 renders native fields in its own category-browser DOM.
  const settings=Array.from(element.querySelectorAll('input, select, textarea')).filter(field=>
    String(field.name||field.getAttribute('data-setting-id')||field.id||'').includes('brp-uge.')
  );
  let lastGroup=''; let count=0;
  for(const field of settings){
    const identifier=[field.name,field.dataset?.settingId,field.id].find(x=>String(x||'').includes('brp-uge.'))||'';
    const key=identifier.split('brp-uge.').at(-1);const words=settingPresentation(key,language);
    if(!words)continue;
    const row=field.closest('.form-group, .form-field, .standard-form-field, .setting')||field.parentElement;
    if(!row)continue;
    row.classList.add('brp-settings-row');
    const label=row.querySelector('label');const hint=row.querySelector('.hint, .form-hint, p.hint');
    if(label)label.textContent=words.name;
    if(hint)hint.textContent=words.hint;
    if(field.tagName==='SELECT'){
      const captions=settingChoices(key,language);
      for(const option of field.options)if(captions[option.value])option.textContent=captions[option.value];
    }
    if(words.group!==lastGroup){
      lastGroup=words.group;
      if(!row.previousElementSibling?.classList?.contains('brp-settings-group')){
        const heading=element.ownerDocument.createElement('h3');
        heading.className='brp-settings-group';heading.textContent=GROUPS[words.group][language==='en'?1:0];
        row.before(heading);
      }
    }
    if(key==='startingSkillsMode'&&typeof onConfigureSkills==='function'&&!row.querySelector('.brp-configure-starting-skills')){
      const button=element.ownerDocument.createElement('button');
      button.type='button';button.className='brp-configure-starting-skills';
      button.textContent=language==='en'?'Choose starting skills…':'เลือกทักษะเริ่มต้น…';
      button.addEventListener('click',event=>{event.preventDefault();onConfigureSkills();});
      row.append(button);
    }
    count++;
  }
  for(const button of element.querySelectorAll('button[data-key],button[data-setting-id],button[data-menu]')){
    const id=[button.dataset.key,button.dataset.settingId,button.dataset.menu].find(v=>String(v||'').startsWith('brp-uge.'));
    if(!id)continue;
    const key=id.slice('brp-uge.'.length),words=settingPresentation(key,language);
    if(!words||!MENU_LABELS[key])continue;
    const row=button.closest('.form-group,.form-field,.standard-form-field,.setting')||button.parentElement;
    const label=row?.querySelector('label'),hint=row?.querySelector('.hint,.form-hint,p.hint');
    if(label)label.textContent=words.name;if(hint)hint.textContent=words.hint;
    const span=button.querySelector('span');if(span)span.textContent=MENU_LABELS[key][language==='en'?1:0];else button.textContent=MENU_LABELS[key][language==='en'?1:0];
  }
  return count;
}
export function installBRPSettingsUI(){
  if(!globalThis.Hooks)return;
  const callback=(_app,html)=>{
    const language=globalThis.game?.settings?.get?.('brp-uge','uiLanguage')||'th';
    organizeBRPSettings(html,{language,onConfigureSkills:()=>globalThis.game?.brp?.configureStartingSkills?.()});
  };
  Hooks.on('renderSettingsConfig',callback);
  Hooks.on('renderSettingsConfigV2',callback);
  // V14 guarantees this parent hook for ApplicationV2-based SettingsConfig;
  // the older specific hook names are not always emitted by category browsers.
  Hooks.on('renderApplicationV2',(app,element)=>{
    if(app?.constructor?.name==='SettingsConfig' || app instanceof (globalThis.foundry?.applications?.settings?.SettingsConfig||class {})){
      callback(app,element);
    }
  });
}