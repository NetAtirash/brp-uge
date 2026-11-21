import assert from 'node:assert/strict';
import {buildBRPRulebookView} from '../module/rulebook-reference-view.mjs';
const blank={type:'skill',system:{descriptionTh:'',descriptionEn:''},flags:{}};
assert.equal(buildBRPRulebookView(blank,'th'),null);
const externallyCreated={type:'skill',name:'Custom',system:{base:12,descriptionTh:'GM note',descriptionEn:'English note'},flags:{'brp-uge':{rulebookReference:{sourceType:'direct',pages:[42],book:'GM custom rules',heading:'Test'}}}};
const view=buildBRPRulebookView(externallyCreated,'th');
assert.equal(view.pages,'42');assert.equal(view.overview,'GM note');
assert.equal(view.sourceLabel,'ข้อมูลอ้างอิงตรงจากหนังสือ');
console.log('PASS: optional module-provided provenance renders; no built-in rulebook text');
