# BRP UGE UI 2.0 — Foundry v14 Visual & Interaction QA Matrix

**Status:** Phase 0 test specification only, not a claim that live tests have been run.

## Fixture & safety

- Use a **copied World**, never an unbacked live campaign.
- Keep at least one established PC, a newly created blank PC, a populated NPC, and a GM-owned test Item. Preserve Actor IDs, embedded Item IDs/UUIDs, HP/PP, skill breakdowns, checked advancement, Flavor Names and Specialty selection history for before/after comparison.
- Use the independently maintained Compendium module that supports Skill Family Templates; do not modify packs during UI tests.
- Test GM and Player accounts and Observer/Limited visibility where relevant.
- Before each visual check, record Foundry v14 build, browser, zoom, theme, language, Window width/height and enabled theme modules.

## Visual captures

For Character Header, Skills and Wizard Step 4, capture:
- Themes: **Light and Dark**
- Languages: **TH and EN**
- Window widths: **1200, 900, 680 and 480 CSS px** where Foundry allows resizing; at least two heights (750 and 600px).
- Browser zoom: **100%, 125%, 150%**. Optionally 80% as a regression comparison, **not** as a UI workaround.
- Browsers: **Firefox and Chromium-based** for major milestone smoke tests.

Use **pairwise coverage** for noncritical combinations to manage testing cost, plus exhaustive Light/Dark × TH/EN on core workflows. Capture screenshots with names such as:
\`PC-Skills-TH-Light-900x750-100-GM.png\`.

## Functional acceptance tests

| ID | Scenario | Pass condition |
| --- | --- | --- |
| F01 | Open existing PC Actor | Names, embedded Items, stats and points unchanged; no automatic writes |
| F02 | Header/profile expand/collapse | No overlap or jumping controls; personal data still accessible |
| F03 | Play/Edit mode | Roll controls and editable inputs visually distinct; state announced |
| F04 | Switch 8 character tabs | Same legacy \`data-tab\` targets, keyboard focus and active state |
| F05 | Skills search with Thai IME | Input order correct; composition not interrupted; list updates without full focus reset |
| F06 | Flavor Name vs canonical source | Player name displayed; official Item source identity preserved |
| F07 | Add new Skill Family + Specialty | Only a chosen Actor-owned skill created; no extra Compendium Item |
| F08 | Wizard choose-N Occupation Skills | N/M clearly visible; correct selectable Specialties before points |
| F09 | Wizard rerender on GM settings update | Existing draft values/points/choice retained; refreshed options visible |
| F10 | Wizard Step 4 scroll | One deliberate content scroller; no overlapping step/budget/header bars |
| F11 | HP/PP/Wounds/Status controls | Resource writes happen once; no duplicate editor state |
| F12 | Combat phase in busy scene | Banner never prevents opening sheets/clicking controls |
| F13 | Power/Weapon use and chat | Existing formulas/roll targets unchanged; readable Light/Dark |
| F14 | NPC owner/observer | Correct tools and read-only views; no PC-only controls forced |
| F15 | Item Sheet source/GM editor | Correct canonical, Flavor, source and reference data preserved |
| F16 | Specialty Manager list/detail | No overlapping sidebar; enabled/hidden/review semantics work |
| F17 | Theme/lang toggle while dialog open | No disabled/blank controls, lost focus, overwritten data or scroll loops |
| F18 | No installed Compendium source | Helpful empty state, no fabricated rulebook data |

## Accessibility and clarity checks

- **Keyboard**: Tab/Shift+Tab order matches reading order; visible focus ring; no keyboard trap on dialogs, tabs, choice grids or search.
- **Target states**: hover, selected, focused, disabled, readonly and validation-error are not distinguished by color alone.
- **Contrast**: text >= 4.5:1, large text >= 3:1, meaningful component boundaries/focus >= 3:1 on actual computed CSS values, not merely token samples.
- **Thai**: input IME composition, legibility at 100% zoom, wrapping in wide and compact layouts, label alignment with percentage fields.
- **Screen reader**: useful names on icon-only roll/edit/delete controls; correct tab semantics and announcements for validation/empty state.
- **Reduced motion**: no essential information relies on animation; respect OS reduced-motion setting.
- **Foundry coexistence**: host window header/resize/close, popout and token interaction unaffected. Optional Themes Module cannot make core controls invisible.
- **Open multiple windows**: Wizard and Character Sheet can coexist; any status banner is non-blocking; no uncontrolled focus rerenders.
- **Errors**: an invalid source, missing pack or permission denial yields readable feedback without writing corrupted Actor data.

## Performance instrumentation (start in Phase 1)

Collect **measured** baseline and improved numbers on the same machine/browser/World:
- time to render populated Actor on first open and subsequent open,
- number of Actor Document updates while toggling tabs/theme/search (goal: zero),
- time to filter 100+ skill examples (or the most realistic available World fixture; record actual N),
- DOM node and style recalculation counts before/after migrating rows,
- CSS stylesheet line/size/\`!important\` totals from \`node scripts/audit-ui.mjs --json\`,
- screenshot comparison for overflow/text clipping.

Do not claim a performance improvement until these metrics are measured.

## Severity & release gates

- **Blocker:** data loss, wrong roll, unauthorized editing, missing required Specialty, unclickable primary action, inaccessible Save, game window intercepting Foundry input.
- **High:** theme contrast failure, untranslated functional label, repeated scroll overlap, disappearing search input.
- **Moderate:** minor visual alignment, nonessential decorative inconsistency.

**Milestone merge condition:** no Blockers/Highs; all relevant F-tests pass on Foundry v14; GitHub Actions pass; rollback toggle or direct version reinstallation available. Phase 0 itself contains no Foundry runtime UI and cannot meet these live test gates; it defines them for Phase 1+.
