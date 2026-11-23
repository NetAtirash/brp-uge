# BRP UGE UI 2.0 — Screen architecture & interaction blueprints

**Status:** proposed information architecture, not runtime code. v1.21.11 routes, Foundry Actor/Item data fields, permissions and mechanical actions remain authoritative. Inspect [audit](BASELINE-AUDIT.md) and [design system](DESIGN-SYSTEM.md) first.

## A. Character Sheet: identity before utility

**Original agreed left-to-right identity order remains:** game mark → portrait and character/occupation identity → personal details. The issue is *persistent display density*, not that player biography is unimportant.

### Region model

1. **Application title/frame** — keep Foundry drag/resize/close, no fullscreen takeover.
2. **Compact Identity Header** — small game mark; portrait + character name + occupation; essential age/player label; "More personal details" disclosure. Other personal facts (culture, religion, description, handedness, height, weight, wealth details) remain fully available rather than deleted.
3. **Utilities** — theme (Light/Dark), explicit Play/Edit mode, authorized GM actions (starting Skills, Wizard), Compendium, roll tools. Icon-only controls require names and hints. Destructive actions do not share styles with roll actions.
4. **At-a-glance resource strip** — HP/PP and other *enabled* resources, optional status badges and MOV. For resources already shown elsewhere, this is one view of the same data, not a duplicate editable copy.
5. **Characteristics** — eight compact, scan-friendly values and characteristic roll affordances; modification shown separately from base value.
6. **Primary page navigation** — retain the existing eight tab keys: \`skills\`, \`combat\`, \`powers\`, \`wounds\`, \`inventory\`, \`status\`, \`advancement\`, \`notes\`. Group visually, not by silently renaming or dropping route IDs.
7. **Task workspace** — search/filters, contextual toolbar, lists; only one main scrolling surface by default.
8. **Contextual inspector** (later phase) — optional expandable item detail with canonical rules reference; never blocks roll/list interactions.

### Compact vs expanded

| Surface | Always visible | On demand |
| --- | --- | --- |
| Character header | portrait, name, occupation, edit, resources | full personal dossier |
| Characteristics | name/value/roll, significant modifier cue | source breakdown and age effects |
| Skills Play | filter/search, name, chance, advancement flag, roll | full source fields and GM adjustment |
| Skills Edit | base, category, occupation, personal, other modifiers, total | detailed history or rulebook reference |
| Combat | equipped/current actions, defense resources, active phase | large inventory, full descriptions |
| Item details | flavor/displayed name, mechanical label, use state | canonical rulebook source, UUID, description, GM edit |

**Rule:** quick information may be repeated in presentation (e.g. HP in header and Wounds tab) but there is only **one write model and one clear editing affordance**. Synchronization must be guaranteed by the Actor document, not duplicate local state.

## B. Skill/Powers workspace

- Shared component anatomy: **advancement state / display name / localized secondary label / chance or cost / quick roll or use / contextual actions**.
- **Play:** dense but readable row (40–44px typical), actual hit target, no unexpected input fields.
- **Edit:** points columns, formula/source breakdown and explicit editable controls. Do not show the same row as both clickable roll target and text input without separation.
- Filters: All / Occupation / Personal / Marked / Category (only when backed by the existing data); search via Thai IME-safe change handling, preserve query on rerender.
- Family/Specialty rule: grouped by canonical Skill Family when useful; player Flavor Name first, canonical rules name in secondary metadata or details. Do not auto-create new Compendium records when choosing an Actor Specialty.
- Player-level custom sorting and favorites are **future candidates**, not Phase 1 commitments; prefer shipping reliable filters first.

## C. Character Creation Wizard

Separate **decisions** from **point spending**. Preserve six existing steps and completed character protections.

1. Identity & Characteristics — one primary action per characteristic process; rules/derived previews stay read-only.
2. Powers — only enabled power families; select and inspect before allocating.
3. Age & Personality — rule consequences shown adjacent to input and transparent to GM.
4. Occupation & Skills — use a progress sequence within step: occupation → allowed Skill Family/Specialty resolution → occupation/personal point allocation.
5. Equipment & Appearance — select sources, avoid auto-generating them.
6. Review & Save — completeness, unresolved choice counts, change preview and final action.

**Wizard layout standard:**

- Top: six-step progress, one row if spacious or 2×3 when compact; never floats over content.
- Body: **one scroll owner**. Optional long list may have a bounded internal scroll only if the rest of the modal remains accessible by keyboard and the full workflow is visible.
- Bottom: Back / Next / Save fixed in logical footer, with non-overlapping layout and unobstructed focus.
- Every choice: \`N required / M chosen\`, source type (book default, GM World), invalid/unavailable detail. No invisible dropdown.
- The current draft allocation and selected Specialty survive re-render, language/theme changes, external GM setting refresh, and non-destructive validation errors.

## D. NPC Sheet & Combat

- NPC inherits compatible Identity/Resource/Characteristics/Navigation components, but only relevant stat blocks, tabs and permissions. Do **not** force the full player personal dossier into an NPC.
- Combat entry point is action-focused; BRP UGE Phase and DEX/INT rank remain game logic, not borrowed from PF2e action economy.
- Combat banner/overlay must never intercept input or cover Foundry sheets. Prefer a non-blocking in-sheet status strip plus Foundry combat tracker view.
- For attack actions, show relevant skill %, weapon/ammo/damage, cost and roll as **separate semantic items**; future responsive column behavior must be tested with Thai names.
- Injuries/healing and Major Wounds remain accessible in one consistent place; status treatment and recovery belong to a defined task workspace.

## E. Item Sheet and GM Workspaces

Item editor has a *shared frame* and context-specific fields:
- **Header:** Flavor Name TH/EN (local display), rules/canonical name and item type; show World vs Compendium provenance, but never allow Flavor edits to mutate canonical UUID or matching.
- **Summary:** what it is and used for, key mechanical values, optional image.
- **Mechanics:** the specific fields of Skill, Power, Occupation, Weapon, Status, etc.
- **References:** rulebook text/source, linked Skill/Occupation/Powers, GM-only resolve/edit actions.
- **Advanced:** optional schemas and debugging provenance, disclosed on demand.

GM Specialty Manager: family list (filter), detail pane (book seeds, World edits, review/hidden), comparison with source, footer (Cancel/Save). Show 0 results distinctly from 0 approved options.

## F. Chat & transient dialogs

- Shared roll card: actor, action, target/chance, die result, outcome hierarchy. All Light/Dark colors from semantic tokens.
- Dialogs use common header, body, action footer and validation status.
- Permission flags remain checked server/document-side; visual hiding is convenience only.
- No auto-open modal on entering a tab, except an explicitly requested editor/workflow.

## G. Information & risk matrix

| Feature | Source of truth | UI contract | Risk if changed wrongly |
| --- | --- | --- | --- |
| Skill % | Actor embedded Item + rules calculation | Display total, action rolls using unchanged \`data-action\` | Wrong target or points |
| Specialty | Family Template + GM World overlay + Actor owned Skill | Choose concrete option first | Wrong source record / silent point loss |
| Flavor Names | Item display fields | Display only; secondary canonical name | Broken rule matching or UUID |
| HP/PP/age | Actor DataModel | One semantic value, consistent quick control | Double update / rollback |
| Occupation Skill choices | Typed Skill Choice Groups + Actor Wizard draft | Show N/M, source choices, blocker | Unfair missed professional skills |
| Status/recovery | Actor wound/status records | Clearly separate treated vs current | Inadvertent healing |
| Combat phase | Foundry combat + BRP phase logic | Visible turn/phase, no blocking overlay | Wrong turn or blocked UI |
| GM-only controls | Foundry document permissions | Hide + validate permissions | Player unauthorized mutation |

## H. Phase 1 scope, not yet authorized

- Move Character Header, Resource Strip and Primary Navigation to shared v2 components/partials while **preserving existing tab and action wiring**.
- Introduce isolated \`.brp-ui2\` class under the existing application root only when toggled and tested.
- Add explicit collapsed/expanded personal profile behavior; keep existing data without migration.
- Make width-driven layout instead of fixed four-column minimum widths.
- Measure before/after CSS rule ownership and render screenshots; deprecate old header selectors only after parity.
- Out of scope: new rule features, new Compendium items, NPC sheet redesign, Weapon/Combat calculation changes, generalized CSS rewrite.
