#!/usr/bin/env node
/**
 * One-time CSS source cleanup. EXACT output parity is required: the
 * compiled Foundry CSS must stay byte-for-byte identical to PR #14.
 * No visual designs, CSS colors, specificity rewrites or data migrations.
 */
import {readFileSync,writeFileSync,existsSync,unlinkSync,readdirSync,mkdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {transform} from 'lightningcss';
import postcss from 'postcss';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const text=path=>readFileSync(join(ROOT,path),'utf8');
const output='styles/brp-runtime.min.css';
const baseline=readFileSync(join(ROOT,output));
const groups=[
  {file:'styles/brp-core-components.css',owner:'Foundations, controls and forms',
   from:['styles/brp.css','styles/brp-refinement.css','styles/brp-bold.css']},
  {file:'styles/brp-character-shell.css',owner:'Character header and editorial shell',
   from:['styles/brp-overview.css','styles/brp-editorial.css','styles/brp-compact-ribbon.css']},
  {file:'styles/brp-ui-components.css',owner:'Shared controls and UI consistency',
   from:['styles/brp-integrated-ui.css','styles/brp-ui-consistency.css']},
  {file:'styles/brp-forms-references.css',owner:'Thai forms and rule references',
   from:['styles/brp-thai-readability.css','styles/brp-personal-and-wizard.css',
     'styles/brp-rulebook-reference.css','styles/brp-fa7-v14.css']},
  {file:'styles/brp-paper-theme.css',owner:'Light and Dark paper tokens/themes',
   from:['styles/brp-paper.css']},
  {file:'styles/brp-sheet-workbench.css',owner:'Usability, sheet layout and GM tools',
   from:['styles/brp-v1216-usability.css','styles/brp-v1217-layout.css',
     'styles/brp-v1218-specialties.css','styles/brp-v1219-workbench.css']},
  {file:'styles/brp-chat-specialties.css',owner:'Chat, Flavor and Specialty management',
   from:['styles/brp-v12110-flavor-chat.css','styles/brp-v12111-specialty-management.css']}
];
const original=groups.flatMap(g=>g.from);
const spec=JSON.parse(text('scripts/css-sources.json'));
if(JSON.stringify(original)!==JSON.stringify(spec.sourceStyles)||original.length!==19)
  throw new Error('Source order differs from original stable CSS list');
if(groups.some(g=>existsSync(join(ROOT,g.file))))
  throw new Error('Refuse to overwrite already created grouped CSS');
for(const path of original)if(!existsSync(join(ROOT,path)))throw new Error('Missing CSS: '+path);
const compiled=parts=>Buffer.from(transform({
  filename:join(ROOT,output),
  code:Buffer.from(parts.join('\n\n')),minify:true,sourceMap:false
}).code);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const baselineSha=sha(baseline);
const originalTexts=original.map(text);
const bare=groups.map(g=>g.from.map(text).join('\n\n'));
if(!compiled(bare).equals(baseline))
  throw new Error('Source grouping does not match compiled baseline before modifications');
let grouped=groups.map(g=>g.from.map(path=>
  '/* SOURCE: '+path+' | owner: '+g.owner+' */\n'+text(path)
).join('\n\n'));
if(!compiled(grouped).equals(baseline))grouped=bare.slice();
if(!compiled(grouped).equals(baseline))throw new Error('Provenance comments changed CSS');

// Source-level duplicate declaration cleanup is conservative. A duplicate
// may be removed only if the full minified runtime remains IDENTICAL.
let redundantCandidates=0,removedDeclarations=0,rejectedCandidates=0;
for(let i=0;i<grouped.length;i++){
  const root=postcss.parse(grouped[i],{from:groups[i].file});
  const candidates=[];
  root.walkRules(rule=>{
    const seen=new Set();
    const decls=(rule.nodes||[]).filter(n=>n.type==='decl');
    for(let j=decls.length-1;j>=0;j--){
      const d=decls[j];
      const key=d.prop+'\0'+d.value+'\0'+String(d.important);
      if(seen.has(key))candidates.push(d);
      seen.add(key);
    }
  });
  redundantCandidates+=candidates.length;
  for(const d of candidates){
    if(!d.parent)continue;
    const parent=d.parent,next=d.next();
    d.remove();
    const proposal=grouped.slice();
    proposal[i]=root.toString();
    if(compiled(proposal).equals(baseline)){
      grouped[i]=proposal[i];
      removedDeclarations++;
    }else{
      rejectedCandidates++;
      if(next)parent.insertBefore(next,d);
      else parent.append(d);
    }
  }
  if(!compiled(grouped).equals(baseline))throw new Error('CSS parity broken at '+groups[i].file);
}
if(!compiled(grouped).equals(baseline))throw new Error('CSS final output differs');
const stats=list=>{
  let rules=0,declarations=0,important=0;
  const selectors=new Map();
  for(const [i,body] of list.entries()){
    const root=postcss.parse(body);
    root.walkRules(rule=>{
      rules++;
      const s=selectors.get(rule.selector)||new Set();
      s.add(i);selectors.set(rule.selector,s);
    });
    root.walkDecls(d=>{declarations++;if(d.important)important++;});
  }
  return {files:list.length,characters:list.reduce((n,s)=>n+s.length,0),
    lines:list.reduce((n,s)=>n+s.split('\n').length,0),
    rules,declarations,important,
    selectorsCrossingFiles:[...selectors.values()].filter(s=>s.size>1).length};
};
const before=stats(originalTexts),after=stats(grouped);
const replacements=Object.fromEntries(groups.flatMap(g=>g.from.map(f=>[f,g.file])));
let updatedHistoricalTests=0;
for(const name of readdirSync(join(ROOT,'tests')).filter(f=>f.endsWith('.mjs'))){
  if(['css-runtime-optimization.mjs','css-source-manifest.mjs','css-structural-cleanup.mjs'].includes(name))continue;
  const path=join(ROOT,'tests',name);
  const existing=readFileSync(path,'utf8');
  let changed=existing.replaceAll('originalCssSources','activeCssSources');
  // Assert old source sections from their new, active CSS owner instead of
  // testing an unrelated adjacent section in a concatenated owner group.
  for(const [oldPath] of Object.entries(replacements)){
    changed=changed.split("read('../"+oldPath+"')").join("readLegacyStyle('"+oldPath+"')");
    changed=changed.split("read('"+oldPath+"')").join("readLegacyStyle('"+oldPath+"')");
    changed=changed.split("fs.readFileSync(path.join(root,'"+oldPath+"'),'utf8')")
      .join("readLegacyStyle('"+oldPath+"')");
  }
  if(changed.includes('readLegacyStyle(')){
    const from="import {activeCssSources} from './css-source-manifest.mjs';";
    if(changed.includes(from))
      changed=changed.replace(from,"import {activeCssSources,readLegacyStyle} from './css-source-manifest.mjs';");
    else
      changed="import {readLegacyStyle} from './css-source-manifest.mjs';\n"+changed;
  }
  for(const [oldPath,newPath] of Object.entries(replacements))
    changed=changed.split(oldPath).join(newPath);
  // Replace CSS reference strings used as section identifiers back to the
  // original path, because readLegacyStyle maps provenance by old path.
  for(const [oldPath,newPath] of Object.entries(replacements))
    changed=changed.split("readLegacyStyle('"+newPath+"')").join("readLegacyStyle('"+oldPath+"')");
  if(name==='v1151-design-refinement.mjs')
    changed=changed.replace(
      "activeCssSources.slice(0,2),['styles/brp-core-components.css','styles/brp-core-components.css']",
      "activeCssSources.slice(0,2),['styles/brp-core-components.css','styles/brp-character-shell.css']"
    );
  if(changed!==existing){writeFileSync(path,changed);updatedHistoricalTests++;}
}
for(let i=0;i<groups.length;i++)writeFileSync(join(ROOT,groups[i].file),grouped[i]);
for(const path of original)unlinkSync(join(ROOT,path));
writeFileSync(join(ROOT,'scripts/css-sources.json'),JSON.stringify({
  description:'Seven canonical CSS source owners; original cascade order and runtime bytes preserved exactly.',
  sourceStyles:groups.map(g=>g.file),
  baselineOriginalStyles:original,
  baselineOptimizedSha256:baselineSha,
  ownershipGroups:groups
},null,2)+'\n');
const report={
  baselineVersion:'v1.21.11',baselineRuntimeSha256:baselineSha,
  exactRuntimeCssByteParity:true,
  originalSourceFiles:original,activeSourceFiles:groups.map(g=>g.file),
  before,after,redundantCandidates,removedDeclarations,rejectedCandidates,
  updatedHistoricalTests,originalRuntimeBytes:baseline.length,
  newRuntimeBytes:compiled(grouped).length,
  note:'Source organization only. Runtime CSS is byte-identical to prior optimization. No visual UI2 and no live Foundry testing.'
};
mkdirSync(join(ROOT,'docs/css-optimization'),{recursive:true});
writeFileSync(join(ROOT,'docs/css-optimization/STRUCTURAL_BEFORE_AFTER.json'),JSON.stringify(report,null,2)+'\n');
const pct=(a,b)=>((a-b)/a*100).toFixed(2);
const md=[
 '# Core CSS Structural Cleanup: Before and After',
 '',
 'Runtime CSS SHA-256 (before and after): '+baselineSha+' — EXACT BYTE PARITY.',
 '',
 '| Source metric | Before | After | Difference |',
 '| --- | ---: | ---: | ---: |',
 '| Active authored CSS files | '+before.files+' | '+after.files+' | -'+(before.files-after.files)+' ('+pct(before.files,after.files)+'%) |',
 '| Source CSS lines | '+before.lines+' | '+after.lines+' | '+(after.lines-before.lines)+' |',
 '| CSS declarations | '+before.declarations+' | '+after.declarations+' | -'+(before.declarations-after.declarations)+' |',
 '| Source !important declarations | '+before.important+' | '+after.important+' | -'+(before.important-after.important)+' |',
 '| Cross-file shared selectors | '+before.selectorsCrossingFiles+' | '+after.selectorsCrossingFiles+' | -'+(before.selectorsCrossingFiles-after.selectorsCrossingFiles)+' |',
 '| Exact duplicate declarations removed | 0 | '+removedDeclarations+' | '+rejectedCandidates+' unsafe candidates rejected |',
 '| Runtime CSS bytes | '+baseline.length+' | '+compiled(grouped).length+' | Identical |',
 '',
 'All seven active files are editable, responsibility-owned styles in the original cascade order. Source provenance is documented in the ownership manifest and CSS section comments when compiler parity permits.',
 '',
 'The 19 original active source files were consolidated into the seven new canonical files. The runtime bundle remains exactly the same as the previously validated optimization, so no visual behavior, layout, CSS specificity, browser download size or runtime performance improvement is claimed from source reorganization.',
 '',
 'The previous delivery optimization measurements are separately recorded in BEFORE_AFTER.json. Live Foundry v14 visual and interactive parity testing remains necessary before merging to stable.',
 ''
].join('\n');
writeFileSync(join(ROOT,'docs/css-optimization/STRUCTURAL_BEFORE_AFTER.md'),md);
console.log('PASS CSS structural cleanup — exact runtime SHA-256 '+baselineSha);
console.log(JSON.stringify({before,after,removedDeclarations,rejectedCandidates,updatedHistoricalTests},null,2));
