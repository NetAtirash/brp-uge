# Core CSS Structural Cleanup: Before and After

Runtime CSS SHA-256 (before and after): 474b7866b6f5710ce627e49a57015cd1e437708ed0a0d2a430f03d1d4ac2b891 — EXACT BYTE PARITY.

| Source metric | Before | After | Difference |
| --- | ---: | ---: | ---: |
| Active authored CSS files | 19 | 7 | -12 (63.16%) |
| Source CSS lines | 6157 | 6188 | 31 |
| CSS declarations | 6447 | 6447 | -0 |
| Source !important declarations | 2564 | 2564 | -0 |
| Cross-file shared selectors | 85 | 58 | -27 |
| Exact duplicate declarations removed | 0 | 0 | 0 unsafe candidates rejected |
| Runtime CSS bytes | 259927 | 259927 | Identical |

All seven active files are editable, responsibility-owned styles in the original cascade order. Source provenance is documented in the ownership manifest and CSS section comments when compiler parity permits.

The 19 original active source files were consolidated into the seven new canonical files. The runtime bundle remains exactly the same as the previously validated optimization, so no visual behavior, layout, CSS specificity, browser download size or runtime performance improvement is claimed from source reorganization.

The previous delivery optimization measurements are separately recorded in BEFORE_AFTER.json. Live Foundry v14 visual and interactive parity testing remains necessary before merging to stable.
