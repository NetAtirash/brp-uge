import {readFileSync} from 'node:fs';
/**
 * Historical UI regression tests inspect the actively maintained seven CSS
 * source groups in canonical cascade order; Foundry loads one compiled CSS. See tests/css-runtime-optimization.mjs for manifest
 * and byte-for-byte compiler-output validation.
 */
export const activeCssSources=Object.freeze(
  JSON.parse(readFileSync(new URL('../scripts/css-sources.json',import.meta.url),'utf8')).sourceStyles
);
