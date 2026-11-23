# BRP UGE UI 2.0 — Phase 1B: Character Identity Header + Personal Disclosure

**Status:** implemented on an isolated, stacked feature branch; not merged into `main`, not a Foundry release, and not yet tested visually inside Foundry v14.

- Phase 0: [PR #9](https://github.com/NetAtirash/brp-uge/pull/9) — audit, Design System and standalone HTML prototype.
- Phase 1A: [PR #10](https://github.com/NetAtirash/brp-uge/pull/10) — preview setting, base tokens and scoped CSS.
- Phase 1B: this stacked branch `feat/v1.22.0-ui-phase1b-character-header`, based on Phase 1A.
- Current stable remains **v1.21.11**. No data migration or release version/tag has been made.

## Implemented

1. **Alternative Character Header.** The existing `templates/actor/character-sheet.hbs` retains its original `<header class="brp-banner">…</header>` *verbatim* in the `{{else}}` path. A `{{#if ui2Preview}}` path includes the new component:
   `templates/actor/partials/ui2-character-header.hbs`.
2. **Full personal dossier partial.** `templates/actor/partials/ui2-personal-details.hbs` has the same ten original `system.*` inputs, age logic, wealth button and bilingual labels, but is shown under a native `<details><summary>` disclosure. **No data is deleted or moved** from the Actor; no duplicate active edit inputs are created.
3. **Identity and utilities.** Keeps the specified left-to-right order: BRP game mark → portrait, name and occupation → relevant controls. Character age and player name are summarized. Original actions are preserved: `editImage`, `toggleEdit`, `togglePaperTheme`, `openWizard`, `configureStartingSkills`, `openCompendium`, `toggleResistance`, `runExp`, `switchTab` and `stepActorValue`. MOV, DM and AP still use the same underlying values.
4. **Accessible portrait.** New view uses a named button (keyboard focus + click) for `editImage` instead of an image-only click target; image is decorative within the labeled button. Name input has a bilingual accessible name and placeholder.
5. **Foundry v14 partial preload.** Registered paths in `BRPActorSheet.PARTS.sheet.templates`. This follows the documented `HandlebarsApplicationMixin` partial contract; new partials remain unused when the Preview client setting is off. NPC template remains unchanged.
6. **Responsive, component-owned CSS.** `styles/brp-ui2-character-header.css` is appended after the Phase 1A token layer. It is scoped under `.brp-sheet.brp-ui2`, uses semantic Light/Dark tokens and container breakpoints around 900, 620 and 420 CSS px. No forced-priority declarations or third-party assets.
7. **Disclosure state persistence.** UI-only `#ui2ProfileExpanded` field preserves whether the dossier is expanded across legitimate sheet rerenders. It is never stored in an Actor or a World setting.
8. **Safer structural preview switching.** Phase 1A could toggle only a CSS class live; Phase 1B renders **different form markup**. Switching while a form is dirty must **not forcibly rerender**. When the client changes the setting, a bilingual notice asks them to save edits and **close/reopen the sheet**. The old layout stays intact until reopening, avoiding input loss or a half-styled new Header.

## Manual QA in copied Foundry v14 World (required BEFORE merging to stable)

1. Use a separate Foundry User Data directory or a copied World. Check out this branch as the `brp-uge` Game System. Stable's normal Update URL does not install an unmerged branch.
2. On the testing client, open **Game Settings → BRP UGE → UI 2.0 Foundation Preview**, turn it ON, then close and reopen the Character Sheet.
3. Inspect a populated character with Thai/EN fields, Flavor Names and occupations. Verify the **logo → portrait/name/occupation → utilities** hierarchy, a visible age/player summary, and native "Additional personal details" disclosure.
4. In Edit mode expand the disclosure; change age (where allowed), gender, player name, height, weight, handedness, religion, description. Save and reopen: every value persists. Verify wealth button navigates to Status and Occupation button navigates to Status.
5. Test avatar button with **Tab and Enter/Space**; verify File Picker opens and the displayed portrait updates using the unchanged `editImage` action.
6. Test Light and Dark; Thai and English; sheet widths 1200, 900, 680, 480 CSS px; browser zoom 100%, 125%, and 150%. No overlap or clipped header controls; all info reachable when disclosure expands.
7. Toggle Preview OFF while the new header is still open: **expect a notification** telling you to save/close/reopen. The current form must stay intact and usable until reopened; after reopening, the original `brp-banner` layout returns.
8. Repeat with a test NPC and an Item Sheet to confirm the UI2 Header never appears. Test player vs GM permissions and Wizard button visibility.
9. Verify Character characteristics, HP/PP, rolls, wound tracking, Specialty and Wizard points are **identical** before/after, using a backup. UI-only changes must not update Actor documents when switching the Preview setting.

## Offline automated safeguards

- `tests/v1220-ui-phase1b.mjs` compares **all form input names** and **all data-action values** against the legacy Header to ensure refactoring did not lose a mechanical field or action.
- Checks required partial registration, conditional render, disclosure state, keyboard focus, responsive CSS and absence of global rules or forced-priority overrides.
- Phase 1A and v1.21.11 regressions were updated to allow the single new stylesheet while asserting historical cascade order and default-off preview.
- GitHub Actions verifies syntax, tests and system ZIP/manifest packaging. **It does not prove browser/Foundry rendering.**

## Known and deliberate limitations

- Phase 1B addresses the **Header only**, not Resource Strip and Characteristics (Phase 1C) or Navigation (Phase 1D). The old `sheet-sidebar` and all underlying BRP calculations remain.
- The old Header is intentionally retained inside the original template for rollback. After visual parity and user approval, Phase 1D/Phase 5 can retire the legacy DOM/CSS safely; do not remove it now.
- Container queries may interact with existing Foundry window widths and high-specificity legacy CSS, so the review screenshots are essential.
- The game remains an unofficial **personal-use project developed with ChatGPT assistance**, as disclosed in the repository README.
