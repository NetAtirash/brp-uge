# Core CSS Structural Cleanup: Before and After

Runtime CSS SHA-256 (before and after): 474b7866b6f5710ce627e49a57015cd1e437708ed0a0d2a430f03d1d4ac2b891 — EXACT BYTE PARITY.

| Source metric | Before | After | Difference |
| --- | ---: | ---: | ---: |
| Active authored CSS files | 19 | 7 | -12 (63.16%) |
| Source CSS lines | 6,157 | 6,165 | +8 |
| CSS declarations | 6,447 | 6,426 | **−21** |
| Source !important declarations | 2,564 | 2,552 | **−12** |
| Cross-file shared selectors | 85 | 57 | **−28** |
| Redundant rule blocks | — | 8 removed | 137 unsafe candidates rejected |
| Runtime CSS bytes | 259,927 | 259,927 | **Byte-identical** |

All seven active files are editable, responsibility-owned styles in the original cascade order. Source provenance is documented in the ownership manifest and CSS section comments when compiler parity permits.

The 19 original active source files were consolidated into the seven new canonical files. The runtime bundle remains exactly the same as the previously validated optimization, so no visual behavior, layout, CSS specificity, browser download size or runtime performance improvement is claimed from source reorganization.

The previous delivery optimization measurements are separately recorded in BEFORE_AFTER.json. Live Foundry v14 visual and interactive parity testing remains necessary before merging to stable.

## Exact-parity duplicate selector / override audit

Repeated-selector rule-block candidates tested: 145.
Blocks safely removable without altering ANY runtime CSS byte: 8.
Candidates rejected because they would change runtime CSS: 137.
Remaining important declarations in canonical source: 2552.

All rejected candidates are intentionally preserved. Their cascade priority
cannot be lowered without changing compiled CSS and real Foundry v14 visual QA.
