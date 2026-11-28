import assert from 'node:assert/strict';
import {settingPresentation,settingChoices,applySettingsTranslations} from '../module/apps/settings-organization.mjs';
const expected={uiLanguage:['th','en'],itemTooltipLanguage:['th','en'],paperTheme:['light','dark'],campaignPowerLevel:['normal','heroic','epic','superhuman'],occupationBudgetMethod:['fixed','edu'],startingSkillsSource:['all','world'],startingSkillsMode:['all','baseline','book','selected'],specialtyCustomPolicy:['restricted','approval'],characteristicMethod:['rolled','heroic_roll','point_buy'],categoryBonusMode:['standard','simple','none'],combatStatementOrder:['highFirst','reverse'],combatPowerTiming:['separate','action']};
for(const [key,values] of Object.entries(expected)){
  for(const lang of ['th','en']){
    const p=settingPresentation(key,lang);
    assert.ok(p.name&&p.hint);
    assert.deepEqual(Object.keys(settingChoices(key,lang)),values);
    assert.ok(Object.values(settingChoices(key,lang)).every(Boolean));
    if(lang==='en')assert.ok(!/[\u0e00-\u0e7f]/.test(JSON.stringify(settingChoices(key,lang))));
  }
}
const metadata={name:'old',hint:'old',choices:{restricted:'old',approval:'old'},default:'restricted',scope:'world',restricted:true};
const menu={name:'old',hint:'old',label:'old',restricted:true};
const foreign={name:'other'};
const api={settings:new Map([['brp-uge.specialtyCustomPolicy',metadata],['other.x',foreign]]),menus:new Map([['brp-uge.manageSpecialties',menu]])};
applySettingsTranslations(api,'en');assert.equal(menu.label,'Manage specialties');assert.equal(metadata.choices.restricted,'GM-managed choices only');
applySettingsTranslations(api,'th');assert.equal(menu.label,'จัดการความเชี่ยวชาญ');assert.equal(metadata.default,'restricted');assert.equal(metadata.scope,'world');assert.equal(metadata.restricted,true);assert.equal(foreign.name,'other');
console.log('PASS: bilingual settings choices and menus, unchanged setting values and permissions');
