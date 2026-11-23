# BRP UGE UI 2.0 — Phase 0 baseline audit

**Source inspected:** BRP UGE \`main\` at commit \`ffa1a63a468cd96308f3c55e9d91e807ea8e013a\` (Game System v1.21.11), 2026-11-23. **Scope:** static source and earlier Foundry v14 tester screenshots; this is **not** a live Foundry audit. Do not interpret a passing Node test as proof of correct browser rendering.

Reproduce the inventory using \`node scripts/audit-ui.mjs --json\`. This Phase 0 audit is read-only; there are no Actor/Item/DataModel changes, CSS load-order modifications, release tags, or packaged UI changes.

## 1. Structural baseline — measured

| Source | Measured baseline | Why it matters |
| --- | ---: | --- |
| Loaded runtime CSS stylesheets | **19** | Component ownership and cascade order are opaque |
| Total stylesheet source | **6,157 lines** / about **300 KB of source characters** | Numerous historical additions; not an estimate of transferred CSS bytes |
| \`!important\` occurrences | **2,564** | Overrides are often won by specificity/order instead of explicit design contracts |
| \`@media\` rules | **49** | Breakpoint policies are scattered across files |
| \`position: sticky\` declarations | **4** | Needs an explicit layout/scroll-owner rule |
| \`overflow: auto/scroll\` declarations | **42** | Source occurrences only; not 42 distinct scrollable regions |
| Main Character Sheet | **760 lines**, **136 buttons**, **137 \`data-action\` attributes** | Very high interaction density in one template |
| NPC Sheet | **325 lines**, **46 buttons** | Repeated character patterns but separate markup |
| Item Sheet | **330 lines**, **48 inputs**, **16 selects** | Form density and reference management |
| Character Wizard | **457 lines**, **35 buttons**, six top-level steps | Long process requiring step feedback and stable draft state |
| Compendium Browser | **80 lines** | Easier early migration candidate |
| Handlebars partial invocations in the five inspected templates | **0** | UI reuse happens through repeated inline markup or CSS, not partialized sheet templates |

**Counting notes:** Counts use simple source-text patterns; a single template may generate many actual controls at runtime, and counts can include controls hidden behind conditions. CSS declarations can repeat intentionally for Light/Dark or responsive states.

## 2. Confirmed CSS ownership issues

1. **Theme load-order contract disagreement.** \`styles/brp-paper.css\` says it "MUST be last", but \`system.json\` loads it **13th of 19**. There are six later style files. Do not simply move it: overrides after the theme may depend on today's cascade. Inventory competing rules and migrate token consumers first.
2. **Multiple version-specific layout layers.** \`brp-overview.css\` (\`.brp-sheet-v1173\`), \`brp-editorial.css\` (\`v1174\`), \`brp-compact-ribbon.css\` (\`v1175\`), \`brp-v1216-usability.css\`, and \`brp-v1217-layout.css\` modify related header areas. The live character root still contains **all three historical classes** \`v1175 v1174 v1173\`; older design layers therefore continue to match.
3. **Same selectors across multiple files.** The header utility bar, portrait/identity block, personal details and \`.brp-banner\` receive declarations from three or more stylesheet files. Later adjustments have elevated specificity and \`!important\` instead of removing obsolete ownership.
4. **Global-to-component reach.** Broad \`.application.brp-uge\`, \`.brp-uge *\` and \`html[data-brp-theme]\` selectors can affect unrelated dialogs or third-party content. Scope future v2 styles to a stable component root and Foundry application, never generic body controls.
5. **Theme ownership is partially implemented.** Light and Dark have meaningful \`--brp-* \` tokens in \`brp-paper.css\`, including \`--brp-panel\`, \`--brp-surface\`, \`--brp-text\`, \`--brp-muted\`, \`--brp-accent\`, and \`--brp-focus\`. Reuse/migrate these instead of inventing a third core palette.

### Candidate stylesheet grouping (plan, NOT applied)

| Target responsibility | Current owner candidates | Action |
| --- | --- | --- |
| Base/layout reset | \`brp.css\`, \`brp-integrated-ui.css\` | Constrain scope; distinguish window/scroll frame |
| Token foundation & themes | \`brp-paper.css\`, \`brp-thai-readability.css\` | Preserve tokens and semantic mappings; audit ordering |
| Character header/sidebar/navigation | \`brp-bold.css\`, \`brp-overview.css\`, \`brp-editorial.css\`, \`brp-compact-ribbon.css\`, \`brp-personal-and-wizard.css\`, \`brp-v1216-usability.css\`, \`brp-v1217-layout.css\` | Consolidate under one component owner in Phase 1, retiring old selectors only after parity |
| Skill/power/item rows & controls | \`brp-refinement.css\`, \`brp-ui-consistency.css\`, \`brp-v1218-specialties.css\` | Unify row/button/field contracts in Phase 2 |
| Wizard, specialty, GM forms | \`brp-v1219-workbench.css\`, \`brp-v12111-specialty-management.css\` | One scroll owner per panel; migrate in Phase 3 |
| Chat, flavor, rule reference | \`brp-v12110-flavor-chat.css\`, \`brp-rulebook-reference.css\`, \`brp-fa7-v14.css\` | Separate chat and game windows; preserve native icons |

**Do not** delete, concatenate, reorder or globally \`@layer\` all old styles in one pass. Unlayered legacy rules and layered new rules have different normal/important cascade precedence. Introduce an opt-in \`.brp-ui2\` root and migrate one component with screenshot parity at a time.

## 3. Information architecture and interaction issues

| Area | Evidence / risk | Proposed resolution |
| --- | --- | --- |
| Character header | Fixed four-column header with \`168px\`, \`320–350px\`, \`min 325px\`, \`260px\` segments; header also includes long personal data, tools and combat strip | Compact, responsive Identity + resources; optional expanded personal profile; keep requested left-to-right order |
| Navigation | Eight primary tabs in Character Sheet (\`skills\`, \`combat\`, \`powers\`, \`wounds\`, \`inventory\`, \`status\`, \`advancement\`, \`notes\`) | Preserve route IDs and semantics; visually group pages, use contextual filters/subviews rather than removing screens |
| Skill Play vs Edit | Both modes rendered within main template, many row-level controls | Shared row identity, separate visible controls and reliable input/roll affordances |
| NPC | Own markup duplicates character identity/pools patterns | Shared Header, Resource Strip, Item Row components with NPC-specific configuration |
| Item | Editable descriptions, rulebook detail, names, references share a dense form | Separate Presentation, Mechanics, Source/Rules, Reference sections; keep canonical/Flavor separation |
| Wizard | Previous multi-scroll/sticky-bar overlap and native select failures documented in RC6 | Stable step progress, deterministic controls, one primary scroll owner, non-destructive draft state |
| Specialty GM | Family list + source/world options + approval state | Standard list/detail workspace with explicit Save/Cancel and origin tags |
| Combat + chat | Multi-window banners and contrast regressions reported previously | Constrain overlays to game viewport; consistent semantic status colors and readable chat cards |

No claim is made that all of these failures are currently reproducible after v1.21.11; they are **structural risks and previously observed regressions** to verify during QA.

## 4. Reference systems reviewed (patterns, not copied visuals)

- [Foundry D&D5e character header](https://github.com/foundryvtt/dnd5e/blob/6.1.x/templates/actors/character-header.hbs) and [sidebar](https://github.com/foundryvtt/dnd5e/blob/6.1.x/templates/actors/character-sidebar.hbs): character identity separated from resource/action affordances; visible meter semantics.
- [PF2e primary/sub-navigation](https://github.com/foundryvtt/pf2e/blob/v14-dev/src/styles/actor/_nav.scss) and [actions](https://github.com/foundryvtt/pf2e/blob/v14-dev/static/templates/actors/character/tabs/actions.hbs): contextual action grouping and explicit second-level navigation.
- [Tidy 5e Sheets](https://github.com/kgar/foundry-vtt-tidy-5e-sheets): task-focused list organization, filtering, customizable navigation and sheet editing affordances.
- [Ginzzzu CoC7 Sheets](https://github.com/Ginzzzu/ginzzzu-coc7-sheets): percent-skill-oriented character sheet workflows and explicit permission/edit-state handling.

These are **source/README design comparisons**, not claims of measured usability test results or endorsement. Do not copy proprietary art, icons, branded motifs or rulebook wording.

## 5. Phase 0 acceptance and scope boundaries

- [x] Establish **reproducible source baseline** with read-only Node audit tool.
- [x] Define component, token, screen and interaction contracts in the linked docs.
- [x] Provide an **isolated design prototype** that does not run inside Foundry and does not modify actor data.
- [ ] Review prototype in real Firefox/Chrome and gather GM/player feedback.
- [ ] Confirm audit against live Foundry v14 at desktop and narrow window widths; capture Light/Dark + Thai/English snapshots.
- [ ] Authorize the first \`.brp-ui2\` runtime component migration in Phase 1 after visual/interaction QA.

**Non-negotiable:** no DataModel, UUID, item identity, character points, roll behavior, chat messages, rulebook content, runtime styling or Stable Release changes in Phase 0.
