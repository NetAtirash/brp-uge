import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

const dir=mkdtempSync(join(tmpdir(),'brp-rc-build-'));
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
try{
  execFileSync('python3',['scripts/build_release.py','--tag','v1.21.11-rc.1','--output',dir],{stdio:'pipe'});
  const manifest=JSON.parse(readFileSync(join(dir,'system.json'),'utf8'));
  assert.equal(manifest.version,'1.21.11-rc.1');
  assert.equal(manifest.download,'https://github.com/NetAtirash/brp-uge/releases/download/v1.21.11-rc.1/brp-uge.zip');
  assert.equal(manifest.manifest,'https://github.com/NetAtirash/brp-uge/releases/download/v1.21.11-rc.1/system.json');
  const source=JSON.parse(read('system.json'));
  assert.equal(source.version,'1.21.11','preview build must not rewrite source');
  assert.match(read('.github/workflows/release.yml'),/--prerelease --latest=false/);
  assert.throws(()=>execFileSync('python3',['scripts/build_release.py','--tag','v9.99.99','--output',dir],{stdio:'pipe'}));
  console.log('PASS isolated v1.21.11-rc.1 preview release manifest and stable/latest protection');
} finally {
  rmSync(dir,{recursive:true,force:true});
}
