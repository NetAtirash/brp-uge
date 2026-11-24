# UI 2.0 — Phase 1C: Resource & Characteristics Strip

**Development only · opt-in Character Sheet · no Foundry release**

This branch extends [Phase 1B](PHASE1B-CHARACTER-HEADER.md). It does not change the stable `v1.21.11` Game System in `main`.

## Implemented

- New independent Foundry v14 Handlebars partials:
  - `templates/actor/partials/ui2-resource-cards.hbs` — HP, PP, optional SAN and FP
  - `templates/actor/partials/ui2-characteristics.hbs` — eight Characteristics, effective/base values, adjustments and roll/share commands
- `character-sheet.hbs` conditionally renders the new strip in **UI2 Preview**. The entire original sidebar is still preserved in the `{{else}}` branch without changing the old Actor inputs.
- Resource and characteristic markup use **new component-owned CSS classes** to avoid matching legacy `v1173/v1174/v1175` layout declarations.
- `styles/brp-ui2-resources.css` introduces semantic Token styling, responsive Characteristic tiles and Resource Cards using CSS container queries (at 1080/700/475 CSS px), keyboard focus and native progress meters.
- Foundry v14 sheet `PARTS.sheet.templates` preloads both partials; the new CSS is appended without reordering any historic stylesheet.
- Zero new Actor or Item data fields; the **same** `system.hp.value`, `system.pp.value`, optional `system.san.value`, `system.fp.value` and `system.characteristics.{{c.key}}.value` are used. Displaying multiple parts of an existing resource does not create a second write model.
- Every legacy `data-action` and input name in the original sidebar survives in the Preview version. Automation verifies this exact multiset parity.

## Foundry VTT v14 tests still required

1. Enable Client setting **UI 2.0 Foundation Preview**, close/reopen a test PC Character Sheet after saving pending edits.
2. Check HP, PP, optional SAN and FP cards. Enable/disable optional World rules and reopen; cards should follow rules exactly.
3. Test Edit mode resource steppers and Characteristics adjustments (1–99, current/maximum and negative constraints) with temporary Actor backup. No duplicate update.
4. Test Characteristic roll % and Share to Chat. Compare results to Stable v1.21.11 using the **same** underlying Actor and campaign rule settings.
5. Test HP major wound threshold, PP advancement bonus, Sanity roll, PP +25% / Full, and treatment navigation to Wounds; all actions remain the original ones.
6. Check a Character with age/status adjustments (raw vs effective characteristic) to confirm no misleading percentages.
7. Light/Dark × Thai/EN at 1200, 900, 680 and 480 CSS px; zoom 100%, 125%, 150%; no clipped resource field or roll.
8. Turn Preview off, save and reopen; confirm pixel-meaningful legacy sidebar is unchanged. NPC, Item, Wizard must remain untouched.

**Current automated checks:** `tests/v1220-ui-phase1c.mjs`, `tests/v1220-ui-phase1b.mjs`, `tests/v1220-ui-phase1a.mjs`, old full regression suite, syntax and package validation. **Only offline automated tests have run; no live Foundry v14 UI check is claimed.**

## Next

Phase 1D: extract Primary Navigation as an opt-in component, preserve all eight `data-tab` keys and `switchTab` handlers, then audit scroll ownership without overriding the established stable UI. Phase 2 (Skills/Powers rows) is a **new UI feature development phase** and should not start until this foundation has a user-accepted QA/review gate.
