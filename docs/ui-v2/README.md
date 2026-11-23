# BRP UGE — UI/UX 2.0 Phase 0

**Project status:** Design System & Architecture RFC, **not a Foundry Game System update**.

**Baseline:** \`main\` at \`ffa1a63a468cd96308f3c55e9d91e807ea8e013a\`, Game System v1.21.11. UI workstream begins at proposed **v1.22.x**; phase numbering is not a promise of release dates.

## What is ready in Phase 0?

| Artifact | What it answers |
| --- | --- |
| [Baseline Audit](BASELINE-AUDIT.md) | What is loaded now? Where do CSS overrides and UI risks accumulate? |
| [Design System](DESIGN-SYSTEM.md) | Which colors, typography, components, interactions and layout rules should all sheets share? |
| [Screen Architecture](SCREEN-ARCHITECTURE.md) | How do Character, NPC, Item, Wizard, GM tools, Combat and chat relate? |
| [Implementation Plan](IMPLEMENTATION-PLAN.md) | How to migrate safely from v1.21.11 to UI 2.0 without changing BRP rules? |
| [QA Matrix](QA-MATRIX.md) | What must be verified in real Foundry v14 before any UI update ships? |
| [Clickable Prototype](prototype/character-sheet.html) | What will compact identity, resources, Skills, tabs and Play/Edit feel like? |
| [Read-only Audit Script](../../scripts/audit-ui.mjs) | Reproduce CSS/template source metrics from a checkout |

## Open the HTML design prototype

The prototype is deliberately not hosted as an executable GitHub site and it does not load Foundry, use real Actor data, write settings or roll dice.

1. Clone or download this **branch**, preserving the folder structure.
2. Open \`docs/ui-v2/prototype/character-sheet.html\` directly in Firefox or Chromium. Its adjacent \`character-sheet.css\` and \`character-sheet.js\` must remain in the same folder.
3. Toggle **Light/Dark** and **Thai/English**, click **Play/Edit**, switch tabs using clicks or keyboard arrows, and use the Skill search and filters.
4. Resize the browser and inspect at 100% and 125% zoom; report hierarchy, typography, legibility and controls. The mock sample characteristics and % are fictional display fixtures, not official BRP rules.
5. Compare the layout against the current Character Sheet in Foundry. Record proposed changes in the PR discussion rather than treating prototype buttons as functioning game controls.

## Reproduce the audit

From the repository root with Node.js 22 or a compatible modern Node:

~~~sh
node scripts/audit-ui.mjs
node scripts/audit-ui.mjs --json
node tests/v1220-ui-phase0.mjs
~~~

The audit reads local files only. Counts are static approximations; they do not measure computed CSS rules, frame rates, accessible contrast or Foundry UI correctness.

## Decisions to review before Phase 1

- Keep the agreed identity order (game mark → portrait/name/occupation → personal facts), but make noncritical personal facts collapsible.
- Place resources in a compact scan-friendly strip and keep one clear Actor DataModel source of truth.
- Retain all eight existing Character tab keys; group visual tasks rather than deleting content.
- Use shared row/button/form components and semantic Light/Dark tokens instead of stacking more versioned \`!important\` rules.
- Preserve existing v1.21.11 UI as rollback until one component passes visual parity.
- Keep optional art/palette in the separate Themes Module and rules/Skills in the external Compendium.
- Use user-approved Foundry visual QA before merging any runtime UI changes.

## Phase 1A — opt-in foundation (separate stacked PR)

Phase 0 remains a documentation/prototype RFC. Phase 1A adds opt-in runtime groundwork on a separate feature branch: client-only preview setting, scoped CSS tokens and safe Character Sheet class gate. See [Phase 1A Foundations](PHASE1A-FOUNDATIONS.md). The stable UI remains default until a Foundry v14 live-world test passes.

## Phase 1B — opt-in Character Header and personal dossier (separate stacked PR)

The new Character Identity/Header is implemented as two preloaded Handlebars partials, with an accessible portrait button, responsive scoped CSS, and the full personal details behind an expandable section. **Default stable Header is unchanged.** Since UI2 now changes form markup, change the client Preview setting, **save any pending edits, then close/reopen the Character Sheet**; no unsafe forced rerender occurs. See [Phase 1B Character Header, testing & rollback](PHASE1B-CHARACTER-HEADER.md). Live Foundry v14 visual QA is still required before merging to Stable.

## Safety & provenance

This personal project uses ChatGPT (OpenAI) assistance and is unofficial, as disclosed in the root README. The Phase 0 deliverables only add **docs**, an **isolated prototype**, a **read-only source audit tool**, and **offline tests**. Phase 1A and Phase 1B introduce only opt-in Character UI components and a per-client setting; neither changes Actor/Item DataModels, rules, existing Worlds, or stable releases.

This work draws structural ideas from Foundry D&D5e, PF2e, Tidy 5e Sheets and CoC7 sheet projects; it copies no third-party art, rulebook text, bundled fonts or proprietary icons.
