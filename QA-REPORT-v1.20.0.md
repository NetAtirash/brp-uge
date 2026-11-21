# BRP UGE v1.20.0 — Game System Cleanup & Separation Report

**Target:** Foundry VTT v14  
**Base:** BRP UGE v1.19.3 installation ZIP supplied in conversation  
**Deliverable:** Game System only — **no Compendium data included**  
**Testing scope:** Static source validation + mocked/offline regressions. **Not tested inside a running Foundry VTT v14 session.**

## 1. Architectural changes

- Preserved the system ID `brp-uge` and the Actor/Item Data Models (2 Actor types; 10 Item types).
- Kept character/NPC/item sheets, Dice/Roll calculations, Combat UI, Healing/Recovery, World Settings, theme and localization.
- Removed bundled Compendium datasets, NPC data, occupation presets, wealth/starter item seed modules, status preset data, embedded rulebook excerpts and auto-generated guide journals.
- Removed the code path that created and synchronized BRP system/world Compendium packs. The `system.json` manifest contains **no packs**.
- Removed automatic creation of default Skill Items in new Actors.
- Rebuilt content selection against **installed accessible Item/Actor Compendium packs and World documents** via `module/library-provider.mjs`.
- Rebuilt the Item Browser to show optional source items and the World Items, with an empty state when none exist. A selected Item imports with a stable `flags.core.sourceId` and `flags.brp-uge.sourceUuid` referencing the original UUID.
- Character Creation Wizard no longer requires built-in occupation/skill/power lists; it can create a character with no Occupation, and can later use World/Compendium Occupation/Skill Items. Rules UI and dice mechanics remain in system.
- Removed default text suggestions for wound types/body locations/mental conditions and default currency denominations **for new Worlds**, while leaving configurable settings and existing saved World settings intact.
- Improved Compendium browser provenance labels: user-created items are not assumed to be direct rulebook content.
- Kept only narrow legacy reference matching for prior `catalog:` references in existing Actor/Item data; no old catalog contents ship.

## 2. Packaged contents

| Included | Excluded |
|---|---|
| `system.json`, `brp-uge.mjs` | Internal Compendium records and seed scripts |
| Actor/Item Data Models | Occupation, Skill, Weapon or Power catalogs |
| Actor, NPC, Item Sheets and Wizard | Auto-created sample Actor/Item records |
| Dice, Combat, Recovery and Settings | Rulebook excerpts bundled as content |
| Dynamic optional-content browser and reference resolver | Automated Pack synchronization or World item overwrites |
| TH/EN locale strings, CSS and UI icon assets | Future Compendium Module (not yet created) |

## 3. Tests and limitations

- Node ESM syntax checks on all system JavaScript modules: **PASS**.
- Automated offline regression tests: **27/27 PASS**.
- Mock test: no-pack world returns empty browser and performs no auto-seeding: **PASS**.
- Mock test: external Item pack can be read and its Item imported while retaining source UUID: **PASS**.
- Template block-balance static check: **PASS**.
- System manifest imports and local assets check: **PASS**.
- **Not yet verified in live Foundry VTT v14:** actual UI rendering, Item drag-and-drop behavior, full Wizard character completion, optional module installation/activation, combat interaction on a live World, and World migration behavior.
- The underlying game mechanics have been preserved rather than comprehensively re-audited against the rulebook in this engine-only change.

## 4. Upgrade from v1.19.3

1. **Back up the World** and previous system package first.
2. Stop Foundry. Replace only `FoundryVTT/Data/systems/brp-uge/` with the **clean** `brp-uge` folder from the install ZIP. Do not merge the new release onto an old folder, or deleted legacy modules may remain on disk.
3. Restart Foundry VTT v14. Character/NPC and Item Sheet functionality remains available without any Compendium module.
4. **Old World Compendium packs still exist** if a previous version seeded them; v1.20.0 intentionally neither deletes them nor modifies GM content. Review and manually delete outdated packs only after backup and after verifying that existing UUID links do not still depend on them.
5. Later, install the **separate** BRP UGE Compendium Module when it is created.

**Note:** This release is an engine-only architecture cleanup and testable installation archive, not a guarantee of successful runtime testing in a live Foundry VTT v14 environment.
