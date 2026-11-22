# BRP UGE UI study: dnd5e and pf2e (2026-11)

Sources reviewed (official system repositories):

- [D&D 5e — character header](https://github.com/foundryvtt/dnd5e/blob/6.1.x/templates/actors/character-header.hbs)
- [D&D 5e — character sidebar](https://github.com/foundryvtt/dnd5e/blob/6.1.x/templates/actors/character-sidebar.hbs)
- [Pathfinder 2e — navigation styling](https://github.com/foundryvtt/pf2e/blob/v14-dev/src/styles/actor/_nav.scss)
- [Pathfinder 2e — character header styling](https://github.com/foundryvtt/pf2e/blob/v14-dev/src/styles/actor/_header.scss)
- [Pathfinder 2e — actions tab](https://github.com/foundryvtt/pf2e/blob/v14-dev/static/templates/actors/character/tabs/actions.hbs)

## Observed design patterns

### D&D 5e

- Separates **character name/class** from the compact right-side **level, inspiration, XP, rest controls**. Important status is visible in the header without crowding the main item lists.
- A **collapsible sidebar** contains the portrait and prominent defense/resource statistics. The portrait remains directly actionable.
- Uses specific control types (buttons, role/meter, pressed states, tooltips) for clear interaction semantics.

### Pathfinder 2e

- Strong visual hierarchy: serif identity headline, restrained labels, consistent scale for statistics, and separate navigation bands.
- **Primary tab + contextual sub-tabs** for Encounter, Exploration, Downtime instead of showing every action at once.
- Reusable ordered item/action lists with explicit compact controls, filters, and section headers.
- Decorative navigation ornaments are separated from the data and click targets.

## Recommended BRP UGE direction (future version; not implemented in 1.21.10)

1. **Notebook + index card hierarchy:** identity header for character portrait/name/occupation, right-side quick resource strip, fixed contextual tabs below. Keep black/cream paper with restrained ink-red accents.
2. **At-a-glance sidebar:** optional collapsible summary for HP, PP, MOV, Armor, Current Status and Combat Phase; avoid duplicate values inside tabs.
3. **Contextual skill/power controls:** consistent compact list rows, accessible hover descriptions, expandable details; additional views for combat-use vs preparation. No forced use of external system mechanics.
4. **Actor vs rulebook item identity:** show player Flavor Name first, canonical BRP item/rules name in a subtle tooltip or reference line. All rules and links continue to use the canonical item identity.
5. **Visual discipline:** paper texture should be quieter than content; keep red for selected state, meaningful warnings, and rule titles; neutral text and strong contrast in Light and Dark. Texture decorations should not cross interaction targets.
6. **Component reuse:** standardize field groups, resource bars, tab buttons, item rows, tooltips and chat cards to prevent theme regressions.

## Implementation constraints

- Do **not** copy third-party art, ornament images, fonts, branded symbols, or rulebook content.
- Keep the Game System free of Compendium data; themes remain optional modules and Light/Dark are available in core.
- Maintain Foundry VTT V14 accessibility, responsive layouts, keyboard control and safe fallback when other modules change the UI.
- Perform actual Foundry V14 visual QA before claiming a layout is finished.