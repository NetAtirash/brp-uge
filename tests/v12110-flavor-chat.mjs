import {activeCssSources,readLegacyStyle} from './css-source-manifest.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getDisplayItemName, getLocalizedName, getItemFlavorPresentation } from '../module/character-tools.mjs';

const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const item={_id:'abcdEFGH',name:'Flame',uuid:'Compendium.brp-quick.Item.abc',system:{nameTh:'เปลวไฟ',nameEn:'Flame',flavorNameTh:'เพลิงแห่งวิญญาณ',flavorNameEn:'Soulfire',damage:'1d6'}};
assert.equal(getDisplayItemName(item,'th'),'เพลิงแห่งวิญญาณ');
assert.equal(getDisplayItemName(item,'en'),'Soulfire');
assert.equal(getItemFlavorPresentation(item,'th').canonicalName,'เปลวไฟ');
assert.equal(item.name,'Flame');assert.equal(item.system.damage,'1d6');assert.equal(item._id,'abcdEFGH');
assert.equal(item.uuid,'Compendium.brp-quick.Item.abc');
item.system.flavorNameEn='';
assert.equal(getDisplayItemName(item,'en'),'Flame');
item.system.flavorNameTh='';
assert.equal(getDisplayItemName(item,'th'),'เปลวไฟ');
assert.equal(getItemFlavorPresentation(item,'th').isFlavored,false);

const schema=read('module/data-models.mjs');
assert.match(schema,/class BRPItemDataModel/);
assert.match(schema,/flavorNameTh: new StringField/);
assert.match(schema,/flavorNameEn: new StringField/);
for(const type of ['Skill','Weapon','Armor','Shield','Power','Passion','Gear','Occupation','StatusItem','Wealth'])
 assert.match(schema,new RegExp(`class ${type}DataModel extends BRPItemDataModel`));
const sheet=read('templates/item/item-sheet.hbs');
assert.match(sheet,/name="system\.flavorNameTh"/);
assert.match(sheet,/name="system\.flavorNameEn"/);
assert.match(sheet,/\{\{rulesDisplay\}\}/);
assert.ok(sheet.includes('class="{{#if isTh}}brp-language-primary{{else}}brp-language-secondary{{/if}}"'));
assert.ok(sheet.includes('class="{{#if isTh}}brp-language-secondary{{else}}brp-language-primary{{/if}}"'));
for(const f of ['module/sheets/actor-sheet.mjs','module/macros/brp-macros.mjs','module/rolls/brp-rolls.mjs'])
 assert.match(read(f),/getDisplayItemName/);
const macro=read('module/macros/brp-macros.mjs');
assert.doesNotMatch(macro,/brp-chat-heading" style="color:#f4f8ff/);
const css=readLegacyStyle('styles/brp-v12110-flavor-chat.css');
assert.match(css,/data-brp-theme="light"/);assert.match(css,/data-brp-theme="dark"/);
assert.match(css,/--brp-chat-ink: #2c211d/);assert.match(css,/--brp-chat-ink: #f4eadb/);
assert.match(css,/#chat-log/);
const manifest=JSON.parse(read('system.json'));
assert.match(manifest.version,/^1\.21\.(?:10|11)$/);
assert.ok(activeCssSources.includes('styles/brp-chat-specialties.css'));
assert.match(manifest.download,/v1\.21\.(?:10|11)\/brp-uge\.zip/);
console.log('PASS v1.21.10 flavor names, non-destructive identity and light/dark advancement chat');