import {readFileSync} from 'node:fs';
/**
 * Tests operate on the seven ACTIVE source owners and, when asserting
 * historical exact formatting, on sections drawn from those same files.
 * No archived or inactive CSS is used as a test input.
 */
const spec=JSON.parse(readFileSync(new URL('../scripts/css-sources.json',import.meta.url),'utf8'));
export const activeCssSources=Object.freeze(spec.sourceStyles);

export function readLegacyStyle(path) {
  const owner=spec.ownershipGroups.find(g=>g.from.includes(path));
  if(!owner)throw new Error('No active CSS source owns '+path);
  const css=readFileSync(new URL('../'+owner.file,import.meta.url),'utf8');
  const marker='/* SOURCE: '+path+' | owner: '+owner.owner+' */';
  const start=css.indexOf(marker);
  if(start<0)throw new Error('Missing source provenance marker '+path);
  let end=css.length;
  const index=owner.from.indexOf(path);
  if(index<owner.from.length-1) {
    const next='/* SOURCE: '+owner.from[index+1]+' | owner: '+owner.owner+' */';
    end=css.indexOf(next,start+marker.length);
    if(end<0)throw new Error('Missing next source section marker '+next);
  }
  return css.slice(start+marker.length,end);
}
