# Core CSS — Canonical Ownership and Maintenance Rules

**Applies to:** BRP UGE v1.21.11 CSS-only cleanup. This is an engineering document, **not an approved UI redesign**. Visual UI2 PRs #9–#13 remain closed without merge.

## Seven active authored stylesheet owners

Every entry is a real, human-editable CSS file under `styles/`. The build tool consumes them in **exactly the order below**, then emits one `styles/brp-runtime.min.css` runtime file.

| Order | Active source owner | Responsibility | Previous CSS sections consolidated |
| --- | --- | --- | --- |
| 1 | `styles/brp-core-components.css` | Global BRP application foundation, base controls, shared fields and traditional component primitives | `brp.css`, `brp-refinement.css`, `brp-bold.css` |
| 2 | `styles/brp-character-shell.css` | Character identity, sheet header, editorial/ribbon/overview shell | `brp-overview.css`, `brp-editorial.css`, `brp-compact-ribbon.css` |
| 3 | `styles/brp-ui-components.css` | Integrated sheet interaction, consistent controls and shared UI affordances | `brp-integrated-ui.css`, `brp-ui-consistency.css` |
| 4 | `styles/brp-forms-references.css` | Thai text readability, personal forms, Wizard/Rulebook references and icon compatibility | `brp-thai-readability.css`, `brp-personal-and-wizard.css`, `brp-rulebook-reference.css`, `brp-fa7-v14.css` |
| 5 | `styles/brp-paper-theme.css` | Notebook Light/Dark paper palette and surface tokens | `brp-paper.css` |
| 6 | `styles/brp-sheet-workbench.css` | Sheet ergonomics, late layout fixes, Specialty skill presentation, GM workbench | `brp-v1216-usability.css`, `brp-v1217-layout.css`, `brp-v1218-specialties.css`, `brp-v1219-workbench.css` |
| 7 | `styles/brp-chat-specialties.css` | Flavor name/chat display and the Specialty manager | `brp-v12110-flavor-chat.css`, `brp-v12111-specialty-management.css` |

The legacy files were **removed as independent editable CSS sources**. Their order/provenance is preserved in [`scripts/css-sources.json`](../../scripts/css-sources.json) and in `/* SOURCE: ... */` comments that mark original sections in each owner. Runtime package includes only the compiled file.

### Layout ownership boundary

The source order is not an invitation to edit a later file just to win specificity. When modifying a component, identify its primary owner in the table above and revise the existing rule in that owner instead of stacking more versioned CSS files. When a rule must remain in an earlier owner for compatibility, document that necessity in a comment and add a regression test.

Use `brp-paper-theme.css` only for themed tokens/surfaces and their documented consumers. Do not move it to the end simply because a previous comment said it must be last: the actual v1.21.11 cascade includes later usability and Specialty rules and is now locked through the build SHA test.

## Source-side structural results and compatibility rules

The static baseline has **85 selectors** that occur in multiple of the previous 19 source files. Consolidation reduces that to **57 cross-owner selectors**. Eight redundant rule blocks have been removed, along with **21 declarations**, including **12 !important** declarations; the exact distributed CSS is unchanged.

A further **137 duplicate-selector rule-block candidates were tested** and rejected because removal would change the runtime stylesheet. They are **not automatically dead code**: source history includes conditional media queries, order-dependent overrides, and important/specificity rules. Removing these would require actual visual/functional checks and a separately approved behavior change.

This project intentionally does not declare those 57 shared selectors or remaining 2,552 `!important` declarations to be unconditionally removable. The cleanup goal is to eliminate source-file fragmentation and proven redundancy **without changing the visible game system**.

### Known cross-owner hotspots to monitor

- `.brp-banner` / `.brp-header-utilities`: Character identity and later usability rules historically overlap
- `.brp-personal-details`: personal form/late header layout interaction
- `.application.brp-uge .window-content`: cross-window base theme and later corrective rules
- `.brp-sheet-v1175`: compatibility selectors still used by current sheet templates

Do not delete or weaken these until a real Foundry v14 World checks Character, NPC, Item, Wizard, Chat and localized themes, and a change owner has formally approved the visual implications.

## Maintaining the cleaned stylesheet

1. Modify only the **seven owner sources**, never the generated `brp-runtime.min.css` directly.
2. Run `npm ci && node scripts/build-css.mjs`, then `node scripts/build-css.mjs --check`, followed by `for test in tests/*.mjs; do node "$test"; done`.
3. Keep the current `scripts/css-sources.json` order. Do not use unlayered-to-layered `@layer` migration or reorder `@import` statements.
4. New functionality may cause a different runtime SHA **only after explicit owner approval**, screenshot parity, and updated baseline tests. For this maintenance PR, exact SHA must stay `474b7866b6f5710ce627e49a57015cd1e437708ed0a0d2a430f03d1d4ac2b891`.
5. Do not duplicate an existing selector in another owner to force a quick visual fix. If unavoidable, record why and add a Focus/Theme/TH–EN regression case.
6. Store rulebook and Compendium content only in their independent modules. CSS does not own game mechanics or data model fields.
7. Do not resume Visual UI2 or new Design Direction work without user confirmation.

## Verification

- [Exact CSS Structural Before/After](STRUCTURAL_BEFORE_AFTER.md)
- [Machine-readable structural audit](STRUCTURAL_BEFORE_AFTER.json)
- [Earlier 19→1 runtime load optimization](BEFORE_AFTER.md)
- [Engineering scope and prohibited Visual UI2 work](SCOPE.md)

**Automated suite:** parser checks, legacy source-section assertions, exact compiled CSS SHA, Foundry v14 package ZIP verification, and the full game-system regression suite.

**Not yet independently verified:** rendered UI parity inside a live Foundry v14 World, browser memory usage, actual frame-rate or sheet render timing. Code-only equivalence is strong evidence for unchanged stylesheet delivery, but it does not test every runtime workflow.
