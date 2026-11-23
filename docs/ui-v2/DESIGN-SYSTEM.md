# BRP UGE UI 2.0 — Design System v0.1 (Phase 0 proposal)

**Status:** design contract / prototype only. Nothing in this document has been wired into the v1.21.11 Game System. Refer to [baseline audit](BASELINE-AUDIT.md), [screen architecture](SCREEN-ARCHITECTURE.md), and the [standalone prototype](prototype/character-sheet.html).

## 1. Intent: Editorial Notebook 2.0

Keep the **BRP UGE Character Notebook** identity: scholarly paper ledger, fine rules/dividers, subtle ink-red accents, readable bilingual typography, and optional genre artwork supplied ONLY by the separate Themes module.

Blend three functional metaphors while retaining one visual system:
- **Editorial Ribbon:** document identity, navigation, clear reading hierarchy.
- **Instrument Desk:** status/resources/actions visible during play, no decorative obstruction.
- **Field Manual:** rulebook/GM/wizard forms, progressive disclosure and precise source links.

Do NOT replicate any other system's visual assets, branded illustrations, typography files, rule text or layout pixel-for-pixel.

## 2. Semantics before ornament

Design every window around the player's immediate action:
1. **Identity** — which Actor/Item/step is open?
2. **Situation** — values, current status, resources, validity.
3. **Action** — roll, select, spend, equip, edit, save.
4. **Reference** — explanations and canonical BRP source information.
5. **Administration** — GM-only operations, deletion, advanced configuration.

On the **Play** surface, reference and administration are progressive. On the **Edit/GM** surface, sources and validation are first-class.

### Component hierarchy

| Component | Role / content | Allowed primary action | State and feedback |
| --- | --- | --- | --- |
| \`IdentityHeader\` | Portrait, displayed character name, occupation, context | Open identity/profile | Edit mode independently disclosed |
| \`ResourceStrip\` | HP, PP, MOV, optional game-enabled pools | Roll/recover or open linked panel | Accessible value+max, meaningful danger only |
| \`CharacteristicsBar\` | Characteristic values and derived rolls | Roll corresponding characteristic | State labels and descriptions, no ambiguous editable controls |
| \`PrimaryTabs\` | 6–8 content destinations (legacy tab keys preserved) | Switch tab | Active/hover/focus differentiate |
| \`SectionTabs\` | Contextual subgroups e.g. Combat, Skills | Filter within active tab | Back to parent always clear |
| \`CollectionToolbar\` | Search, filter, sort, add from catalog | Relevant collection operation | Count, empty/no-results feedback |
| \`SkillRow\`/\`PowerRow\` | Name (flavor+canonical), total, advancement, points | Roll in Play; edit in Edit | Distinct hover and keyboard control targets |
| \`ItemRow\` | Name, count, state (equipped/stowed) | Use/equip/inspect | No hidden destructive action on primary click |
| \`RuleReference\` | Verified book source, UUID/canonical label | Inspect source | Clearly separate GM overlay vs source |
| \`BudgetSummary\` | Starting points, spent, remaining | Explain or jump to allocation | Always legible, never overlap with list |
| \`ChoiceGroup\` | Skill Family, Specialty, choose-N rules | Select permitted item | Unresolved N/M and invalid state explicit |
| \`DialogFooter\` | Back, Cancel, Save/Next | Commit or cancel | Sticky only in a **single documented scroll owner** |
| \`StatusMessage\` | Loading, empty, validation, conflict | Retry or inspect | Announced text, not color-only |

## 3. Colors: semantic aliases to existing BRP Notebook themes

**Current verified source** is \`styles/brp-paper.css\`. Phase 1 may introduce aliases *scoped to \`.brp-ui2\`*, not a new third theme. Preserve Light/Dark. Never use a status hue as the default text color on unrelated surfaces.

| Proposed alias | Existing source token | Use |
| --- | --- | --- |
| \`--ui-canvas\` | \`--brp-paper\` | Window background |
| \`--ui-panel\` | \`--brp-panel\` | Primary cards/panels |
| \`--ui-inset\` | \`--brp-surface\` | Inputs, nested contents |
| \`--ui-text\` | \`--brp-text\` | Text and numbers |
| \`--ui-text-muted\` | \`--brp-muted\` | Secondary labels, not essential instructions alone |
| \`--ui-rule\` | \`--brp-border\` | Separators |
| \`--ui-rule-strong\` | \`--brp-border-strong\` | Selected or elevated edge |
| \`--ui-accent\` | \`--brp-accent\` | Active page, linked rule mark, key action |
| \`--ui-selected\` | \`--brp-highlight\` | Active item backgrounds |
| \`--ui-focus\` | \`--brp-focus\` | Visible keyboard focus |
| \`--ui-positive\` | \`--brp-success\` | Valid action or success |
| \`--ui-danger\` | \`--brp-danger\` | Threat, error, confirmed destructive action |
| \`--ui-heading-font\` | \`--brp-heading-font\` | Names and section headings |
| \`--ui-body-font\` | \`--brp-body-font\` | Thai/English long-form |
| \`--ui-number-font\` | \`--brp-numeric-font\` | Numeric statistics/points |

**Example original source colors (do not overwrite):** Light paper \`#f5ead9\`, ink \`#28201c\`, accent \`#902127\`, focus \`#365f8b\`; Dark paper \`#181311\`, text \`#f8efe4\`, accent \`#ef8982\`, focus \`#a9c9df\`.

**Color review:** Test actual interactive backgrounds and disabled/hover/selected states with a contrast calculator. AA targets: normal text >= **4.5:1**, large text >= **3:1**, visible non-text UI boundaries/indicators >= **3:1**. Accents and 1px borders need their own checks; two readable text colors do not guarantee accessible components.

## 4. Typography and scale (design targets)

Do not ship or expose font files. Use the fonts already configured as optional local/system fallbacks:
- **Identity and headings:** existing \`Noto Serif Thai\` / \`Sarabun\` / \`Georgia\` cascade. No forced uppercasing of Thai strings.
- **Body and interaction:** \`Noto Sans Thai Looped\`, \`Sarabun\`, \`Tahoma\`, system sans.
- **Percentages and point budgets:** \`JetBrains Mono\` if installed, otherwise system monospace with \`font-variant-numeric:tabular-nums\`.
- **Proposed type scale:** hero 24px/1.3, title 20px/1.35, section 16px/1.4, body 14px/1.5, secondary 13px/1.45, micro 12px/1.4. Do not put critical instruction text in micro labels.
- **Four-pixel spacing rhythm:** 4, 8, 12, 16, 24, 32 CSS px. Card padding 12–16; table cell padding 8–10.
- **Target sizing:** comfortable normal controls 36–40px tall, critical mobile/zoom controls ideally >= 44px. Visible keyboard focus always present.
- **Content truncation:** tooltip can *supplement* a truncated name but is never its sole accessible name. Multi-line Thai labels can wrap without clipping or reversing IME input.

## 5. Layout and scroll contract

- The Foundry window owns outer resize; the sheet contains **one intentional vertical content scroll** by default. Fixed header/title and one footer are allowed only when their heights are included in scroll layout.
- A modal with a scrolling list must keep **its scroll container inside the modal** while preserving keyboard reachability; never create three nested scrolling surfaces for one task.
- Page cards use \`min-width:0\`, \`min-height:0\`, \`box-sizing:border-box\` in the correct grid areas; no fixed header sums that exceed the actual window width.
- **Responsive width targets (per available sheet width, not full browser viewport):**
  - spacious >= 1100px: compact three-region summary if needed;
  - regular 760–1099px: identity + status strip + content;
  - compact 520–759px: two-line header, horizontal or scrollable tab list with labels;
  - narrow < 520px: one-column sections; compact labels remain visible and buttons never overlap.
- \`@container\` may be adopted only after verifying Foundry v14 supported browsers and parent container declarations. A safe media-query fallback must exist.
- Zoom 80%, 100%, 125%, 150% must be checked on actual Foundry windows; changing browser zoom is **not** an acceptable fix for overlapping UI.

## 6. Interaction patterns and state taxonomy

- **Roll:** numeric/skill target is a clearly marked button, not a number field; never infer an editable field from dashed hover styling.
- **Read:** title opens detail/reference, not roll unless labeled as roll.
- **Edit:** explicit mode with \`aria-pressed\` or \`role="switch"\` and \`aria-checked\` reflecting state; fields are not silently editable in Play.
- **Navigation:** normal tab buttons use \`aria-selected\`/proper tab semantics when migrated (preserve legacy \`data-tab\` keys).
- **Add:** always shows source and selection context; Family → Specialty before generating an Actor-owned Skill.
- **Delete:** secondary menu/action, confirmation appropriate to loss, permission checked by actual Foundry document rights.
- **Save:** validate and show unresolved requirements; preserve draft data when errors or theme/language changes occur.
- **Empty:** distinguish "no source installed", "not approved by GM", "no search results", and "loading".
- **Identity:** displayed player Flavor Name can differ from canonical mechanical Item name. The canonical UUID/key is immutable from a display interaction.

### Permission states

Owner: full permitted actions. Observer: read and navigate, no edits. Limited: minimal allowed Actor preview. GM: administrative controls separately marked; this is a design contract that must be verified against Foundry's actual permission model.

## 7. Build-time design rules

1. Use class prefix \`brp-ui2-\` on new components, under application root \`.application.brp-uge .brp-ui2\`. Do not style \`button\`, \`input\` or \`body\` globally.
2. Use semantic tokens and components, NOT version-numbered override layers. Avoid \`!important\` in new v2 components unless required to isolate a documented Foundry host style.
3. Do not add a new production CSS file merely to override 2–3 old rules; migrate component ownership and remove obsolete declarations **with** screenshot parity tests.
4. Introduce Handlebars partials / view models for header, resources, controls and rows. Do not reorder Actor document operations or rename \`data-action\`, tabs or input paths without explicit regression tests.
5. Avoid CSS \`@layer\` wholesale migration while legacy CSS remains unlayered and has \`!important\`. Plan ordered migration of one component at a time.
6. Author all labels in TH/EN and verify document/value display honors the existing Language/Flavor policy.
7. The separate Themes module may override semantic accents/artwork but never controls layout, source identity, or critical text contrast.
8. Prototype CSS may use new alias tokens; it is **deliberately not loaded** by \`system.json\` in Phase 0.

## 8. Definition of done for a migrated component

- Works in Foundry v14 with real Actor/Item ownership rules.
- Play, Edit, GM, Observer/Limited behavior verified where applicable.
- Light/Dark × TH/EN × wide/compact windows; no clipping, overlaid buttons or text.
- Keyboard reaches every action, visible focus, meaningful form labels and errors.
- DOM tests or template regressions for required controls; Foundry manual screenshot parity.
- No change to mechanical formula, canonical Item/UUID, embedded items or allocated points.
- No increase in version-numbered override CSS and no unrelated \`!important\` growth without a written reason.
