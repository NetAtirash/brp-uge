# BRP UGE UI 2.0 — Implementation roadmap & migration strategy

**Phase 0 branch:** \`design/v1.22.0-phase0-ui-foundations\` (branched from v1.21.11 stable main). **This is an RFC, not an implementation release.** No game behavior is changed. See the [audit](BASELINE-AUDIT.md), [design system](DESIGN-SYSTEM.md), [screen architecture](SCREEN-ARCHITECTURE.md), and [prototype](prototype/character-sheet.html).

## 0 — Foundation, baseline and design review (current PR)

**Deliverables:**
- Source-based UI inventory with reproducible command \`node scripts/audit-ui.mjs --json\`;
- quantified CSS override hotspots and component ownership map;
- semantic tokens, spacing, controls, responsive/keyboard/permissions contracts;
- content hierarchy and workflow designs for Character, NPC, Item, Wizard, GM Manager and Combat;
- **isolated HTML/CSS/JS clickable prototype** for Character Header, status, tab and Skill rows;
- Phase 1 work breakdown, no-op runtime guard tests, Foundry visual QA checklist.

**Pass:** Node regression tests green; user can view sample without installing a system; document limitations and data integrity. **Await design sign-off + real Foundry QA plan** before runtime integration.

## 1 — Character Sheet shell + component foundation (proposed v1.22.0-rc.1)

**Small, independently reviewable PRs:**

1. **1A: UI2 root and token aliases.** Add scoped tokens and isolated component stylesheet; no structural change and no direct manipulation of \`system.json\` style order without test. Introduce an opt-in render class on Character Sheet only, leave old design the safe default until parity.
2. **1B: Identity header and personal disclosure.** Extract \`CharacterIdentityHeader\` and \`ProfileDetails\` from \`character-sheet.hbs\` into reusable partials/view models. Preserve \`name\`, \`img\`, \`system.*\` paths, edit mode, GM Wizard button, portrait editing and existing data actions.
3. **1C: Resource/Characteristics strip.** Reuse Actor model for HP/PP/SAN/FP/MOV and characteristics; prevent duplicate writable controls and preserve conditional display. Test wounds/status links, rolls and derived modifiers.
4. **1D: Navigation/sheet frame.** Keep original eight \`data-tab\` identifiers and existing \`switchTab\` action. Responsive tabs and one vertical content scroll; tests at varied window dimensions.

**Exit:** Before/after screenshots for Play/Edit × TH/EN × Light/Dark at 1200, 900, 680px *sheet window widths*; keyboard audit; no loss of stats or active tab; no accidental actor writes during theme/language/resize.

## 2 — Common collection/row components (proposed v1.22.1)

Migrate Skill/Power rows, shared action buttons, search/filters, edit/read modes and source breakdowns. Keep item \`data-action\` names, roll formulas, class/Skill ID, Specialty identity, advancement mark, bonus source and point allocations unchanged.

**Performance/maintenance targets:** Reuse common row markup; avoid full Actor rerender per search keystroke; preserve Thai IME composition and user scroll position; have a clear owner for CSS selectors; log new \`!important\` exceptions. Validate large Skill and Power lists.

## 3 — Creation and GM workflows (proposed v1.22.2)

Apply common form components to Wizard, Occupation Editor, Specialty Management, Item Sheet and Compendium Browser. Ensure:
- choose-N constraints and source approval visible **before** point distribution;
- source Skill Family \`(...)\` and Actor Skill Specialty instances remain distinct;
- book seed vs GM overlay visible;
- no repeated selection bug (RC4/RC5), no overlapping sticky progress bars (RC6);
- cancel/save permission handling and draft persistence;
- prevent expensive Compendium reloads on each redraw.

## 4 — NPC, Combat, Chat and dialogs (proposed v1.22.3)

Shared Actor shell (without unnecessary PC fields); non-blocking BRP Combat Phase; Wounds/Healing/Status workflows; Chat Cards with scoped contrast/typography; GM and Observer views. Preserve DEX/INT ranks and existing phase behavior.

## 5 — CSS consolidation and release hardening (proposed v1.22.4 / v1.22.0 stable naming decided at release time)

- Trace every production component's CSS owner; remove versioned overrides *after* replacement is visually equivalent.
- Consolidate by responsibility: base+frame, tokens, character, collections, forms, chat, compat. The final file count is a consequence of clean ownership, **not an arbitrary target**.
- Audit stylesheet order; fix \`brp-paper.css\` "must be last" comment/contract after confirming cascade.
- Remove unused legacy selectors only with explicit proof they are no longer matched by NPC, Item, Wizard or themes.
- Compare CSS audit totals before/after; no blanket \`!important\`, no major increase in selectors or deep descendant nesting.
- Run Foundry v14 Play/Edit / GM/Player / theme/localization regression, screen reader/tab order checks and preview RC smoke tests.
- Promote stable only after user has validated live World operation on a backed-up copy.

## Branch and release rules

- Continue shipping v1.21.11 stable until a vertical slice passes.
- Each milestone starts from current \`main\` or designated integrated staging branch; do not bundle unrelated refactors into a feature.
- Do **not** automatically migrate Actors, Compendium Packs, ownership or UUIDs in UI tasks.
- Keep Theme Module optional and Game System data-free.
- GitHub Actions + mocked tests are necessary but **not sufficient**. User-observed Foundry screenshots and interactions must pass before any UI milestone merge to stable.
- If a regression occurs, disabling UI2 should restore prior Character Sheet presentation while preserving live Actor data; do not rely on browser zoom as a workaround.

## Performance baseline plan

Current code does not supply reliable Foundry end-to-end latency numbers. **Do not invent a speedup percentage.** Establish repeatable local measurements in Phase 1:
- Time open Character and NPC sheets using Foundry performance tools with representative Actors; compare after warmup and after a full reload.
- Observe user typing in Thai skill search including IME composition: no reversed keystrokes, focus loss or unnecessary full rerender.
- Measure scroll smoothness at standard and dense Skill lists; verify no forced synchronous layout loops during filter changes.
- Monitor actor update count for theme toggle, tab switch and resource adjustment; theme/scroll/filter must not write Actor data.
- Record CSS bytes loaded, selectors, \`!important\` and theme-specific regressions before/after each vertical slice.

## Dependency and decision log

| Decision | Phase 0 position | Rationale |
| --- | --- | --- |
| Base visual direction | Editorial Notebook 2.0 | Keeps BRP UGE identity while improving action hierarchy |
| Core themes | Existing Light/Dark only | No genre/artwork bundled in Game System |
| Content module | Always independent | Avoid copyright/content and UUID side effects |
| Main sheet layout | Compact identity, resources, characteristics, tabs, content | Matches frequent-play priorities |
| Wizard choice UI | Real explicit choices, not hidden native dropdown dependencies | Prior Foundry v14 bugs |
| CSS strategy | Component owners + scoped migration | Avoid unmaintainable specificity wars |
| Runtime toggle | Proposed opt-in UI2 until parity | Safe rollout and rollback |
| Prototype | Standalone HTML/CSS/JS, fictional stats, no data writes | Allows visual review without touching Worlds |
| Stable release | Deferred | User has asked to start Phase 0, not to replace current stable |
