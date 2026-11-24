# UI 2.0 — Phase 1D: Navigation and Layout Contracts

**Status:** Draft opt-in implementation, built on Phase 1C. This is **not** a new Stable release.

## Implemented

1. **Eight existing routes, unchanged:** `skills`, `combat`, `powers`, `wounds`, `inventory`, `status`, `advancement`, `notes`. The new Primary Navigation is one Foundry v14 Handlebars partial: `templates/actor/partials/ui2-primary-navigation.hbs`. It retains exactly eight `data-action="switchTab"` buttons and all existing tab-state flags / badge data.
2. **Legacy fallback preserved:** `character-sheet.hbs` renders the old `sheet-navigation` verbatim whenever the per-client UI2 Preview setting is OFF. No tab ID or Actor/Item document logic changed.
3. **Accessible current page:** active buttons use `aria-current="page"`, rather than claiming a complete ARIA Tab widget without associated tabpanel/keyboard behaviors. Tab + Enter/Space keep the native button behavior.
4. **Responsive navigation:** `styles/brp-ui2-navigation.css` uses component-scoped semantic Light/Dark tokens, container queries, visible focus and horizontal scrolling when eight page labels do not fit. A tab label is not replaced by an unlabeled icon at compact sizes.
5. **Scroll ownership is deliberately constrained:** this phase does not introduce additional vertical scroll containers, fixed overlays or sticky budget/progress bars. The existing stable `sheet-body` vertical scroll mechanism and Foundry title-bar behavior remain unchanged. Replacing the *primary* scroll owner is deferred until live Foundry v14 measurements demonstrate a safer alternative.
6. **Component preloading and CSS order:** the new partial is registered under the Character Sheet `PARTS.sheet.templates`. New CSS appends after Phase 1A–1C without changing any legacy style order.
7. **Source checks:** `tests/v1220-ui-phase1d.mjs` asserts ordered route/action parity, native current-page semantics, scope, and no new vertical scroll. The full system suite also runs.

## Foundry v14 QA required before stable merge

Use a backed-up World and a development installation. The Game System version in this branch is intentionally still `1.21.11` and its stable manifest does **not** point to these unmerged changes.

1. Enable **UI 2.0 Foundation Preview** (client setting); save unfinished form edits, close and reopen the Character Sheet. Turning Preview OFF requires the same safe reopen.
2. Click all eight pages; verify correct content and active indication, including Wounds counter and Inventory counter. No missing tabs, incorrectly reused content or lost resource/skill edits.
3. Use Tab, Shift+Tab, Enter, Space and horizontal arrow keys while focus is on the native button strip. Arrow-key navigation is **not claimed**; native Tab/Enter/Space must work. Check the focused label remains reachable when strip is scrolled horizontally.
4. Test TH/EN names, long localizations, many Inventory items and Wounds badges, Light/Dark, owner/observer/GM modes.
5. Resize the **sheet window** through 1200, 900, 680, 480 CSS px (when Foundry permits) and browser zoom 100%, 125%, 150%. Inspect horizontal tab scrollbar, text cutoff and header height.
6. Open the sheet alongside Combat Tracker, Wizard and Item Sheet. Check any tabs and status overlays never intercept clicks intended for other Foundry windows.
7. Use the existing `sheet-body` content scroll on Skills and Inventory with long lists. The page header/nav should remain in predictable positions; there should be no new nested vertical scroll or loop.
8. Compare existing NPC sheets, which intentionally keep their old navigation; verify Preview is per client and cannot modify another user's World configuration.

**Known limitations:** This is an integration foundation only. No Skills/Powers/Inventory row redesign, no new Action Economy, and no CSS consolidation of the historic `v1173/v1174/v1175` layers. Those are separate reviewable UI implementation phases.

## Next: end-of-Phase-1 readiness gate

Phase 1 is complete **as an offline structural implementation** after this slice. Before full-feature UI development starts, conduct the combined [Phase 1 Readiness Gate](PHASE1-READINESS-GATE.md) covering live Foundry v14 Play/Edit, data parity, scroll, light/dark/TH/EN, and the stacked Draft PR sequence.
