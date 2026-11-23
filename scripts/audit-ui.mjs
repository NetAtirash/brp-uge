/**
 * Phase 0 read-only UI source audit for BRP UGE.
 * Usage: node scripts/audit-ui.mjs [--json]
 * Heuristic diagnostics, not a computed-style / accessibility test.
 */
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

export const rootFromModule=()=>resolve(dirname(fileURLToPath(import.meta.url)),'..');
const occurrences=(source,regex)=>(source.match(regex)||[]).length;
const componentSelectors=[
  '.brp-banner','.brp-header-utilities','.brp-personal-details',
  '.sheet-navigation','.skill-category-block','.skill-play-row',
  '.brp-btn','.wiz-budget-bar','.brp-wiz-step4-progress',
  '.brp-specialty-manager-v3'
];
const screenPaths=[
  'templates/actor/character-sheet.hbs',
  'templates/actor/npc-sheet.hbs',
  'templates/item/item-sheet.hbs',
  'templates/apps/character-wizard.hbs',
  'templates/apps/compendium-browser.hbs'
];

export function inspectStylesheet(filename,source){
  return {
    file:filename,
    lines:source.split(/\r?\n/).length,
    bytes:Buffer.byteLength(source,'utf8'),
    important:occurrences(source,/!important/g),
    media:occurrences(source,/@media\b/g),
    sticky:occurrences(source,/position\s*:\s*sticky\b/g),
    fixed:occurrences(source,/position\s*:\s*fixed\b/g),
    overflowAuto:occurrences(source,/overflow(?:-[xy])?\s*:\s*(?:scroll|auto)\b/g),
    tokens:[...new Set([...source.matchAll(/--(brp-[a-z0-9-]+)\s*:/g)].map(m=>m[1]))].sort()
  };
}
export function inspectTemplate(filename,source){
  return {
    file:filename,
    lines:source.split(/\r?\n/).length,
    bytes:Buffer.byteLength(source,'utf8'),
    buttons:occurrences(source,/<button\b/g),
    namedActions:occurrences(source,/data-action="/g),
    inputs:occurrences(source,/<input\b/g),
    selects:occurrences(source,/<select\b/g),
    navs:occurrences(source,/<nav\b/g),
    sections:occurrences(source,/<section\b/g),
    hbsPartials:occurrences(source,/\{\{>/g),
    inlineStyles:occurrences(source,/\bstyle="/g)
  };
}
export function auditProject(root=rootFromModule()){
  const system=JSON.parse(readFileSync(join(root,'system.json'),'utf8'));
  const styles=system.styles.map(filename=>{
    const file=join(root,filename);
    if(!existsSync(file))throw new Error('Missing CSS: '+filename);
    const source=readFileSync(file,'utf8');
    return {...inspectStylesheet(filename,source),source};
  });
  const templates=screenPaths.map(filename=>{
    const file=join(root,filename);
    if(!existsSync(file))throw new Error('Missing template: '+filename);
    return inspectTemplate(filename,readFileSync(file,'utf8'));
  });
  const sums=keys=>Object.fromEntries(keys.map(key=>[key,styles.reduce((n,f)=>n+f[key],0)]));
  const hotspots=componentSelectors.map(selector=>{
    // Count plain class references (including CSS declaration and selector
    // usage). This is a file ownership signal, not a parsed selector AST.
    const counts=styles.map(s=>({
      file:s.file,count:s.source.split(selector).length-1
    })).filter(x=>x.count>0);
    return {selector,files:counts.length,references:counts.reduce((a,b)=>a+b.count,0),
      locations:counts.map(x=>x.file)};
  }).sort((a,b)=>b.files-a.files||b.references-a.references);
  const paperIndex=system.styles.indexOf('styles/brp-paper.css');
  const warnings=[];
  if(paperIndex>=0 && paperIndex<system.styles.length-1)
    warnings.push('brp-paper.css header says it must be last, but '+(system.styles.length-paperIndex-1)+' stylesheet(s) follow it. Audit CSS ownership before changing load order.');
  if(system.styles.some(s=>/v121[0-9]|v122/.test(s)))
    warnings.push('Version-named runtime CSS overrides exist. Consolidate by component with visual regression coverage.');
  return {
    metadata:{systemId:system.id,version:system.version,foundry:system.compatibility,
      stylesheetOrder:[...system.styles]},
    totals:{styleFiles:styles.length,cssLines:styles.reduce((n,f)=>n+f.lines,0),
      cssBytes:styles.reduce((n,f)=>n+f.bytes,0),...sums(['important','media','sticky','fixed','overflowAuto']),
      templateFiles:templates.length,templateLines:templates.reduce((n,f)=>n+f.lines,0),
      templateButtons:templates.reduce((n,f)=>n+f.buttons,0),
      templateActions:templates.reduce((n,f)=>n+f.namedActions,0),
      templatePartials:templates.reduce((n,f)=>n+f.hbsPartials,0)},
    styles:styles.map(({source,...rest})=>rest),templates,hotspots,warnings,
    methodology:'Static regex-based source inventory; cascade, contrast, scroll, focus and keyboard must be tested in Foundry v14.'
  };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=auditProject();
  if(process.argv.includes('--json'))process.stdout.write(JSON.stringify(report,null,2)+'\n');
  else{
    process.stdout.write('BRP UGE UI audit — '+report.metadata.version+'\n');
    process.stdout.write(JSON.stringify(report.totals,null,2)+'\n');
    process.stdout.write('Cross-file component hotspots:\n');
    for(const item of report.hotspots)process.stdout.write('  '+item.selector+': '+item.files+' files / '+item.references+' references\n');
    for(const warning of report.warnings)process.stdout.write('WARNING: '+warning+'\n');
    process.stdout.write('Run with --json for full per-file data.\n');
  }
}
