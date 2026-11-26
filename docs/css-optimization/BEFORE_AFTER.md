# CSS Optimization — Measured Before / After

> Static build result only. **No Visual UI redesign and no Foundry v14 browser validation is claimed.**

| Metric | Before (Stable 1.21.11) | After (CSS-only build) | Difference |
|---|---:|---:|---:|
| CSS files requested via system.json | 19 | 1 | −18 requests |
| CSS content bytes | 300,304 | 259,927 | −13.45% |
| Combined GZIP CSS bytes | 50,557 | 38,518 | −23.81% |
| Combined Brotli CSS bytes | 41,126 | 31,340 | −23.8% |
| !important occurrences in loaded CSS | 2564 | 2502 | Minification result; rule semantics need live QA |

The before figure treats all original CSS as one combined input for compression, a **conservative byte comparison**. Actual separate HTTP resource responses may compress differently. Raw content is built by concatenating original files in the **same order**. Minification retains source files in Git for maintainability, does not delete or hand-edit existing selectors, and does not guarantee a runtime speedup.

Original source files: see `scripts/css-sources.json`. Rebuild with `npm ci && node scripts/build-css.mjs --report`, verify `node scripts/build-css.mjs --check`. Detailed metrics: [BEFORE_AFTER.json](BEFORE_AFTER.json).

No UI2 prototype, Character Header, Resource Strip, or Navigation changes are included. Stable main remains unchanged pending explicit user approval. **Manual Foundry v14 Light/Dark, TH/EN, PC/NPC, Wizard and Chat smoke tests required before merge.**
