#!/usr/bin/env node
/**
 * CSS dead-rule cleanup guarded by exact compiled runtime parity.
 *
 * Deletes a redundant source rule ONLY when the full output from
 * Lightning CSS is byte-for-byte identical to the already verified bundle.
 * Candidate: an earlier rule sharing a selector/at-rule context with a later
 * rule. All other rule trees, visual values, and selector specificity stay.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {transform} from 'lightningcss';
import postcss from 'postcss';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');
const spec=JSON.parse(read('scripts/css-sources.json'));
if(spec.sourceStyles.length!==7)throw new Error('Required seven canonical source groups');
const runtime=readFileSync(join(root,'styles/brp-runtime.min.css'));
const sha=b=>createHash('sha256').update(b).digest('hex');
if(sha(runtime)!==spec.baselineOptimizedSha256)throw new Error('CSS SHA baseline invalid');
const roots=spec.sourceStyles.map(path=>postcss.parse(read(path),{from:path}));
const compile=()=>Buffer.from(transform({
  filename:join(root,'styles/brp-runtime.min.css'),
  code:Buffer.from(roots.map(r=>r.toString()).join('\n\n')),
  minify:true,sourceMap:false
}).code);
if(!compile().equals(runtime))throw new Error('Current authored CSS does not exactly match runtime');
const candidates=[];
const seen=new Map();
for(const rootNode of roots)rootNode.walkRules(rule=>{
  if((rule.nodes||[]).some(n=>n.type==='rule'||n.type==='atrule'))return;
  let parent=rule.parent;
  const parents=[];
  while(parent && parent.type!=='root'){
    parents.unshift(parent.type==='atrule'?'@'+parent.name+' '+parent.params:parent.type);
    parent=parent.parent;
  }
  if(parents.some(x=>/@(?:-webkit-)?keyframes/.test(x)))return;
  const key=parents.join('>')+'::'+rule.selector;
  const prev=seen.get(key);
  if(prev)candidates.push(prev);
  seen.set(key,rule);
});
let accepted=0,rejected=0;
for(const rule of [...new Set(candidates)]){
  if(!rule.parent)continue;
  const parent=rule.parent,after=rule.next();
  rule.remove();
  if(compile().equals(runtime)){accepted++;}
  else{
    rejected++;
    if(after)parent.insertBefore(after,rule);
    else parent.append(rule);
  }
}
if(!compile().equals(runtime))throw new Error('Pruning unexpectedly changed runtime CSS');
// Persist rewritten source CSS only if identical after full transform.
for(let i=0;i<roots.length;i++)
  writeFileSync(join(root,spec.sourceStyles[i]),roots[i].toString());
const reportPath='docs/css-optimization/STRUCTURAL_BEFORE_AFTER.json';
const report=JSON.parse(read(reportPath));
const totals={rules:0,declarations:0,important:0,characters:0,lines:0};
const sel=new Map();
for(const [i,node] of roots.entries()){
  const content=node.toString();
  totals.characters+=content.length;
  totals.lines+=content.split('\n').length;
  node.walkRules(rule=>{
    totals.rules++;
    const files=sel.get(rule.selector)||new Set();
    files.add(i);sel.set(rule.selector,files);
  });
  node.walkDecls(d=>{totals.declarations++;if(d.important)totals.important++;});
}
report.after={...report.after,...totals,selectorsCrossingFiles:[...sel.values()].filter(x=>x.size>1).length};
report.attemptedRuleRemovals=accepted+rejected;
report.removedRuleBlocks=accepted;
report.rejectedRuleRemovals=rejected;
report.exactRuntimeCssByteParity=compile().equals(runtime);
writeFileSync(join(root,reportPath),JSON.stringify(report,null,2)+'\n');
const mdPath='docs/css-optimization/STRUCTURAL_BEFORE_AFTER.md';
const old=read(mdPath);
const summary=[
 '',
 '## Exact-parity duplicate selector / override audit',
 '',
 'Repeated-selector rule-block candidates tested: '+(accepted+rejected)+'.',
 'Blocks safely removable without altering ANY runtime CSS byte: '+accepted+'.',
 'Candidates rejected because they would change runtime CSS: '+rejected+'.',
 'Remaining important declarations in canonical source: '+totals.important+'.',
 '',
 'All rejected candidates are intentionally preserved. Their cascade priority',
 'cannot be lowered without changing compiled CSS and real Foundry v14 visual QA.',
 ''
].join('\n');
writeFileSync(join(root,mdPath),old.replace(/\n## Exact-parity duplicate selector \/ override audit[\s\S]*$/,'')+summary);
console.log(JSON.stringify({accepted,rejected,remaining:totals,
  cssSha256:sha(compile())},null,2));
