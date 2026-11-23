# UI 2.0 Phase 1A — Opt-in Component Foundation

**Status:** real Game System code on a feature branch; **not a shipped Game System release**. Designed to remain invisible on v1.21.11-style sheets until a client explicitly enables the preview.

**Branch:** `feat/v1.22.0-ui-phase1a-foundations`, stacked on **Phase 0 PR #9** (`design/v1.22.0-phase0-ui-foundations`). Merge Phase 0 before rebasing/merging Phase 1A into `main`. Do **not** merge this development slice directly into Stable before visual QA.

## Implemented

1. `module/ui-v2/preview.mjs` — plain-JS, side-effect-free gate (`isUI2PreviewEnabled`, `syncUI2PreviewRoot`, `syncUI2PreviewOpenSheets`).
2. `brp-uge.mjs` — visible **per-client**, non-GM-only setting `brp-uge.ui2Preview`, `type:Boolean`, **default false**; onChange toggles only a CSS class on open Character Sheets. Never prepares Actor data or rerenders a form.
3. `module/sheets/actor-sheet.mjs` + `templates/actor/character-sheet.hbs` — append a `brp-ui2` class to the Character Sheet root **only** for enabled clients and actor type `character`. Existing NPC sheets remain unchanged.
4. `styles/brp-ui2-foundation.css` — a strict scoped token-alias layer and reusable class primitives for future Header, Button, Field, Toolbar, and Panel components, with keyboard-focus enhancement when preview is enabled.
5. `system.json` — appends the new stylesheet **after** the current 19 entries without reordering any existing CSS, preserving the legacy cascade while new selectors stay dormant by default.
6. `tests/v1220-ui-phase1a.mjs` — validates per-client OFF default, pure DOM-class sync, NPC and Item isolation, unchanged previous CSS list, and forbidden global/forced-priority declarations.
7. Existing v1.21.11 CSS-order regression test updated to accept the new **isolated** stylesheet while still checking the old manager CSS relative order.

## How to enable UI2 foundations in a TEST installation

**This is not the full Character Notebook 2.0 redesign.** The setting enables token aliases, future component primitives, and preview keyboard focus indicators. Full Header, Resource Strip, and Navigation implementations belong to Phase 1B–1D.

When the feature branch is available as a development build:
- Back up and use a copied World or separate Foundry User Data directory.
- Open **Game Settings → BRP UGE → UI 2.0 Foundation Preview** on a Character Sheet user's client, and enable it.
- Observe the Character Sheet, especially keyboard Tab focus on header controls and tabs. The visible layout should otherwise be materially identical to the stable UI.
- Disable to remove `.brp-ui2` **immediately**, without rerendering or saving any Actor data. NPC and other users are unaffected.

The branch has no new Release tag or installable Release manifest. A Git checkout in a **separate** Foundry test installation is required for live UI testing at this stage; a stable Foundry Update cannot install draft branch changes.

For debugging the CSS gate without changing data (in the browser console of a test World):

~~~js
game.settings.get('brp-uge', 'ui2Preview');
[...document.querySelectorAll('.application.brp-uge .brp-sheet.brp-ui2')].length;
~~~

The number reflects *currently mounted, opted-in Character Sheet roots*, not total Actors.

## Non-regression guarantee and explicit limits

- No Actor/Item DataModel fields, no formula/roll operations, no Compendium sources, no UUID/name changes.
- No forced form submissions, rerenders, or Actor.prepareData() when toggling the preview setting.
- The client setting itself is stored in Foundry client settings; that does **not** mutate Actor data.
- No UI change for non-preview clients, no CSS scope on NPC/Item/Wizard.
- Existing Light/Dark and TH/EN settings own themes and localization; the new CSS aliases simply reference current Notebook tokens.
- No claim of Foundry v14 visual verification yet: GitHub Actions run offline tests and packaging checks only.
- The main Character Sheet has pre-existing, unlayered `!important` CSS rules; this Phase **does not** retire/merge them or rewrite the Header.

## Exit criteria / Phase 1B readiness

- [x] Opt-in rendering gate and immediate rollback path
- [x] Basic scoped token aliases, layout primitives, focus-visible affordances
- [x] Offline tests for classes, isolation and CSS load-order safety
- [ ] Live Foundry v14 test: toggling while a Character Sheet is open, including edit form with pending values
- [ ] Screenshot parity for Light/Dark × TH/EN at 900, 680 and 480px window widths
- [ ] Confirm NPC and Wizard appearance unchanged
- [ ] Review Phase 0 design direction and user feedback

After approval, Phase 1B will migrate only **Character Header + Personal Disclosure** to reusable components under the same preview gate, with `data-action` compatibility and screenshot parity tests.
