import {readFileSync} from 'node:fs';
/**
 * Historical UI regression tests assert that the original source CSS is kept
 * in the exact same cascade order, even though production now loads a single
 * compiled stylesheet. See tests/css-runtime-optimization.mjs for manifest
 * and byte-for-byte compiler-output validation.
 */
export const originalCssSources=Object.freeze(
  JSON.parse(readFileSync(new URL('../scripts/css-sources.json',import.meta.url),'utf8')).sourceStyles
);
