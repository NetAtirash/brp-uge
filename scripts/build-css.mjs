#!/usr/bin/env node
/**
 * BRP UGE CSS-only optimization.
 * Compile the ordered, active structural source owners into one distributable file.
 * Do NOT sort or assign @layer to existing rules. Never import
 * Visual UI2 prototypes; stable v1.21.11 is the sole source of truth.
 *
 * Requires pinned Lightning CSS dev dependency (Node 22; npm ci).
 *
 * node scripts/build-css.mjs                # build
 * node scripts/build-css.mjs --check        # validate committed output
 * node scripts/build-css.mjs --report       # write JSON and Markdown metrics
 */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync,brotliCompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {transform} from 'lightningcss';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path));
const manifest=JSON.parse(read('system.json').toString('utf8'));
const sourceSpec=JSON.parse(read('scripts/css-sources.json').toString('utf8'));
const sources=sourceSpec.sourceStyles;
const outputPath='styles/brp-runtime.min.css';
const outputFile=join(root,outputPath);
const structurallyCleaned=Array.isArray(sourceSpec.baselineOriginalStyles);
const expectedSourceCount=structurallyCleaned?7:19;
if(manifest.id!=='brp-uge'||manifest.version!=='1.21.11')
  throw new Error('CSS optimizer must run against stable BRP UGE v1.21.11 only');
if(sources.length!==expectedSourceCount||new Set(sources).size!==sources.length)
  throw new Error('Unexpected number of active stylesheet source files');
if(structurallyCleaned && (sourceSpec.baselineOriginalStyles.length!==19 ||
  sourceSpec.baselineOptimizedSha256!==JSON.parse(read('docs/css-optimization/BEFORE_AFTER.json')).optimized.sha256))
  throw new Error('CSS source structure no longer matches the recorded PR #14 baseline');
if(sources.some(p=>!p.startsWith('styles/')||p.includes('ui2')||p===outputPath||!existsSync(join(root,p))))
  throw new Error('CSS source list must be existing mainline styles, not UI2');
if(!(manifest.styles.join('|')===sources.join('|')
  ||manifest.styles.join('|')===outputPath))
  throw new Error('Manifest must contain either the unchanged source list or the single output');

const raw=sources.map(path=>read(path));
const combined=Buffer.from(raw.map(buf=>buf.toString('utf8')).join('\n\n'),'utf8');
// Compile from a file in styles/ so ../assets/... relative URLs retain
// their meaning. Do not add header comments before Google Fonts @imports.
const result=transform({
  filename:outputFile,
  code:combined,
  minify:true,
  sourceMap:false
});
const bundled=Buffer.from(result.code);
// Keep the historical optimized baseline byte-identical; append a small, explicitly approved Live QA overlay.
const overlay=sourceSpec.liveQaOverlay?read(sourceSpec.liveQaOverlay):Buffer.alloc(0);
const runtimeBundle=overlay.length?Buffer.concat([bundled,Buffer.from('\n'),overlay]):bundled;
const decoded=bundled.toString('utf8');
const original=combined.toString('utf8');
const remoteFontImports=original.match(/@import\b/g)||[];
const resultFontImports=decoded.match(/@import\b/g)||[];
if(remoteFontImports.length!==resultFontImports.length)
  throw new Error('Google Font @import count changed during compilation');
if(!decoded.includes('fonts.googleapis.com'))
  throw new Error('Imported font URLs disappeared');
if(!decoded.includes('paper-light.webp')||!decoded.includes('paper-dark.webp'))
  throw new Error('Notebook texture URLs disappeared');
if(!decoded.includes('brp-v12111') && !decoded.includes('brp-wiz-specialty'))
  throw new Error('Modern Specialty UI selectors disappeared');
if(bundled.length>=combined.length)
  throw new Error('CSS compiler did not reduce stylesheet byte size');
const hash=b=>createHash('sha256').update(b).digest('hex');
const totals=b=>({
  bytes:b.byteLength,
  gzipBytes:gzipSync(b,{level:9}).byteLength,
  brotliBytes:brotliCompressSync(b).byteLength,
  sha256:hash(b)
});
const before=totals(combined),after=totals(bundled);
if(structurallyCleaned && after.sha256!==sourceSpec.baselineOptimizedSha256)
  throw new Error('Structural CSS cleanup changed runtime CSS bytes; refusing build');
const pct=(a,b)=>Math.round((1-b/a)*10000)/100;
const report={
  baselineVersion:manifest.version,
  sourceFiles:sources.length,
  productionStylesheetsBefore:sources.length,
  productionStylesheetsAfter:1,
  cssSourceOrder:sources,
  previous:{...before,forcedPriorityOccurrences:(original.match(/!important/g)||[]).length},
  optimized:{...after,forcedPriorityOccurrences:(decoded.match(/!important/g)||[]).length},
  savings:{
    files:expectedSourceCount-1,
    rawBytes:before.bytes-after.bytes,
    rawPercent:pct(before.bytes,after.bytes),
    gzipBytes:before.gzipBytes-after.gzipBytes,
    gzipPercent:pct(before.gzipBytes,after.gzipBytes),
    brotliBytes:before.brotliBytes-after.brotliBytes,
    brotliPercent:pct(before.brotliBytes,after.brotliBytes)
  },
  note:'Static CSS delivery size and request-count metrics only. No live Foundry VTT rendering/performance measurements. Original authored CSS files remain unchanged and in cascade order.',
  source:'main v1.21.11; visual prototype PRs #9–#13 are closed and excluded'
};

const flags=new Set(process.argv.slice(2));
if(flags.has('--check')){
  if(!existsSync(outputFile)||!read(outputPath).equals(runtimeBundle))
    throw new Error('Generated CSS bundle is missing/stale; run node scripts/build-css.mjs');
  const reportFile=join(root,'docs/css-optimization/BEFORE_AFTER.json');
  if(existsSync(reportFile)){
    const existing=JSON.parse(readFileSync(reportFile,'utf8'));
    if(structurallyCleaned) {
      if(existing.optimized.sha256!==after.sha256 || existing.productionStylesheetsBefore!==19)
        throw new Error('Historical CSS delivery baseline changed');
    }else if(JSON.stringify(existing)!==JSON.stringify(report))
      throw new Error('CSS metrics stale; run node scripts/build-css.mjs --report');
  }
} else {
  writeFileSync(outputFile,runtimeBundle);
}
if(flags.has('--report') && !structurallyCleaned){
  mkdirSync(join(root,'docs/css-optimization'),{recursive:true});
  writeFileSync(join(root,'docs/css-optimization/BEFORE_AFTER.json'),
    JSON.stringify(report,null,2)+'\n');
  const md=[
    '# CSS Optimization — Measured Before / After',
    '',
    '> Static build result only. **No Visual UI redesign and no Foundry v14 browser validation is claimed.**',
    '',
    '| Metric | Before (Stable 1.21.11) | After (CSS-only build) | Difference |',
    '|---|---:|---:|---:|',
    '| CSS files requested via system.json | 19 | 1 | −18 requests |',
    `| CSS content bytes | ${before.bytes.toLocaleString()} | ${after.bytes.toLocaleString()} | −${report.savings.rawPercent}% |`,
    `| Combined GZIP CSS bytes | ${before.gzipBytes.toLocaleString()} | ${after.gzipBytes.toLocaleString()} | −${report.savings.gzipPercent}% |`,
    `| Combined Brotli CSS bytes | ${before.brotliBytes.toLocaleString()} | ${after.brotliBytes.toLocaleString()} | −${report.savings.brotliPercent}% |`,
    '| !important occurrences in loaded CSS | '+report.previous.forcedPriorityOccurrences+' | '+report.optimized.forcedPriorityOccurrences+' | Minification result; rule semantics need live QA |',
    '',
    'The before figure treats all original CSS as one combined input for compression, a **conservative byte comparison**. Actual separate HTTP resource responses may compress differently. Raw content is built by concatenating original files in the **same order**. Minification retains source files in Git for maintainability, does not delete or hand-edit existing selectors, and does not guarantee a runtime speedup.',
    '',
    'Original source files: see `scripts/css-sources.json`. Rebuild with `npm ci && node scripts/build-css.mjs --report`, verify `node scripts/build-css.mjs --check`. Detailed metrics: [BEFORE_AFTER.json](BEFORE_AFTER.json).',
    '',
    'No UI2 prototype, Character Header, Resource Strip, or Navigation changes are included. Stable main remains unchanged pending explicit user approval. **Manual Foundry v14 Light/Dark, TH/EN, PC/NPC, Wizard and Chat smoke tests required before merge.**',
    ''
  ].join('\n');
  writeFileSync(join(root,'docs/css-optimization/BEFORE_AFTER.md'),md);
}
if(!flags.has('--check'))console.log('CSS bundle built: '+runtimeBundle.length+' bytes (historical baseline '+after.bytes+')');
console.log(JSON.stringify({before:{bytes:before.bytes,gzip:before.gzipBytes},after:{bytes:after.bytes,gzip:after.gzipBytes},savedPercent:report.savings.rawPercent},null,2));
