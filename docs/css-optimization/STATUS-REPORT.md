# BRP UGE — CSS Core Optimization Status (2026-11-26)

**Final structural cleanup status:** The source-level ownership migration has now also been implemented, verified, and documented. **Seven** canonical maintained CSS owners replace the earlier 19 files; eight provably redundant rule blocks were removed with exact byte parity. See [Structural Before/After](STRUCTURAL_BEFORE_AFTER.md) and [Ownership Map](OWNERSHIP.md).

**Owner directive:** All unapproved Visual UI2 work is canceled. Do not perform UI redesign, reopen Visual PRs, merge to main, publish, or begin a later phase without explicit approval. Draft PRs #9, #10, #11, #12 and #13 were **closed without merge**. Old feature branches remain in GitHub history for traceability only.

**Baseline source:** `main` at `ffa1a63a468cd96308f3c55e9d91e807ea8e013a`, Stable Release `v1.21.11`. CSS optimization was developed on independent `perf/v1.21.11-core-css-optimization`, starting directly from stable main. No UI2 visuals were carried over.

## Before / After: independently measured

| Measure | Before (current stable) | After (optimized test branch) | Difference |
| --- | ---: | ---: | ---: |
| CSS files loaded by Foundry `system.json` | 19 | 1 | **18 fewer requests (94.74%)** |
| CSS raw bytes (concatenated original source vs compiled output) | 300,304 | 259,927 | **−40,377 bytes / 13.45%** |
| CSS GZIP bytes | 50,557 | 38,518 | **−12,039 bytes / 23.81%** |
| CSS Brotli bytes | 41,126 | 31,340 | **−9,786 bytes / 23.80%** |
| `!important` strings in delivered CSS | 2,564 | 2,502 | 62 fewer via minification |
| Installed game system ZIP bytes | 437,934 | 412,539 | **−25,395 bytes / 5.80%** |
| Authored original CSS sources preserved in Git | 19 | 19 | Unchanged |
| Foundry Actor/Item schemas and BRP rules changed | No | No | No changes |
| Unapproved Visual UI2 code in runtime | Not present | Not present | No changes |

**Measurement origins:** CSS source and compiled CSS were counted by the committed [deterministic audit JSON](BEFORE_AFTER.json). Stable ZIP size is from GitHub release `v1.21.11`, asset `brp-uge.zip` (437,934 bytes). Optimized ZIP size is from the successful [CSS build workflow](https://github.com/NetAtirash/brp-uge/actions/runs/45862357852), which built `dist/brp-uge.zip` (412,539 bytes) and checked it contains exactly **one CSS file**.

CSS GZIP/Brotli before figures compress the concatenated original sources as one stream, to enable a comparable content measurement. Actual separate HTTP responses may differ. ZIP values reflect build artifacts, not Foundry browser load times. Re-run with `npm ci && node scripts/build-css.mjs --check`.

## What was optimized

1. **Load request reduction**: `system.json` loads `styles/brp-runtime.min.css` as its only stylesheet, instead of 19 independent requests.
2. **Preserve cascade**: `scripts/css-sources.json` freezes the exact original source order. The compiler reads all source CSS in that order and does not add layers or reorder source files.
3. **Deterministic compression**: pinned Lightning CSS v1.33.0, with a committed lockfile; reproducible bundle hash and `--check` integrity verification.
4. **Asset references**: check that both Google Fonts `@import` directives and light/dark paper assets still exist. Output remains in `styles/`, preserving `../assets/` reference base.
5. **ZIP stripping**: unchanged original source files stay in Git for maintenance, but the package builder omits CSS files that are not listed in the runtime manifest. No duplicate source styles are shipped.
6. **Regression protection**: historical tests check the original source list; separate optimization tests enforce the single bundled manifest, absence of UI2, source consistency, and byte reductions. Existing full offline regression suite, JavaScript syntax and package checks pass.

## What is NOT claimed fixed

- The former **19 authored stylesheets have since been consolidated into seven owner files**. There are still 57 selectors spanning multiple source owners and 2,552 important declarations. Those remaining overrides are retained because removal changes the exact compiled CSS and may alter the live game layout.
- Existing `!important` source declarations remain. The reduction from 2,564 to 2,502 counts delivered minified text only, not a manual elimination of priority hacks.
- There is no measured Foundry v14 CPU, FPS, layout recalculation or sheet-render time improvement. The size/request results are factual, not proof of faster runtime interaction.
- **No live Foundry v14 screenshot/interaction comparison was performed.** CSS minification can change behavior in edge cases; Light/Dark, TH/EN, Character/NPC/Item/Wizard, paper textures, fonts, icons, dialog and chat cards still require live QA **before merge**.

## New project status / approval gate

- **Visual UI Design:** STOPPED. No Design Direction selected; PRs #9–#13 closed.
- **CSS build/delivery optimization:** IMPLEMENTED on this branch, with measured differences above and passing offline GitHub Actions.
- **Source-level CSS ownership consolidation:** DONE on the stacked Structural Cleanup branch (19 → 7 maintained source files; 85 → 57 cross-owner selectors; 8 dead rule blocks removed). Remaining 137 candidate removals were rejected by exact-output verification and are intentionally retained.
- **Live Foundry QA:** PENDING. Use a copied World and separate test install; compare stable main to optimized branch under the same v14, browser and Compendium.
- **Stable main and latest release:** unchanged `v1.21.11`.
- **Next work:** WAIT for explicit project-owner confirmation after this report. Do not start Visual Design, Phase 2, or CSS selector rewrites automatically.

**Project notice:** BRP UGE is an unofficial personal-use hobby project developed with ChatGPT assistance; see the repository README.
