# BRP Universal Game Engine — Engine Only (Foundry VTT v14)

The Game System remains data-free in **v1.21.5** (architecture introduced in v1.20.0). It ships Actor and Item Data Models, bilingual sheets, rolls, combat tools, character creation, settings and a read-only browser for external content sources. It contains **no bundled Skill, Occupation, Power, Gear, Wealth, Status or Actor records**, creates **no Compendium packs**, and generates no rules content itself. It can copy the baseline Skills from World Items or an installed Compendium into a newly created Actor, without editing those source records.

## Installation
Extract the archive into `FoundryVTT/Data/systems/`. The resulting folder must be `brp-uge` containing `system.json`. Restart Foundry and create a World using `brp-uge`.

World-setting text suggestions (wounds, body locations, mental conditions) and currency denominations are blank by default in new Worlds; the GM can configure them. Existing World setting values are preserved.

The system is usable without a content module. Create Items in the Items Directory or via Actor/Item Sheets. The Wizard can create a character without an Occupation, but completing the Wizard requires an available Skill source to satisfy the requested baseline Skills rule. Add or import Skill Items first. Newly created Actors receive all available baseline Skills (deduplicated). If no source is installed, the engine warns rather than fabricating rulebook Skill records. The browser offers World Items and compatible, accessible Actor/Item packs from optional modules, if installed.

## Future Compendium Module Contract
- The separate module will target system ID `brp-uge` and declare Foundry v14 compatibility and a system relationship. It will contain `packs` with `Item` or `Actor` Documents created against this system's document types (do not bundle another game engine).
- Supported Item types: `occupation`, `skill`, `weapon`, `armor`, `shield`, `power`, `passion`, `gear`, `wealth`, and `status`. Actor types: `character`, `npc`.
- The bilingual fields are `system.nameTh`, `system.nameEn`, `system.descriptionTh`, and `system.descriptionEn` with the typed game fields from `module/data-models.mjs`.
- Occupation `system.skillRefs`, `system.starterWeaponRefs`, `system.starterArmorRefs`, and `system.wealthRef`, and weapon `system.skillRef` should use **real Foundry UUIDs** such as `Compendium.brp-uge-rulebook.skills.Item.XYZ`, not built-in catalog keys. The exact package/pack/UUID values will depend on the future module.
- The engine discovers active accessible Item/Actor packs through `game.packs`; no Compendium IDs, packs, migration scripts or source data are hardcoded. Existing owned Items retain their values.
- Optional Item source provenance may be supplied in `flags.brp-uge.rulebookReference`; engine UI displays that metadata but never supplies rulebook text.

## Updating from v1.19.x
**Back up the World first.** The system intentionally does not modify or remove any historical World Compendium packs, World Items, Actor Items, or GM customization. Previously seeded `world.brp-*` packs remain present until the GM manually reviews and removes them. The engine will not recreate these packs. Existing legacy catalog references are recognized for display/compatibility only; newly created links use document UUIDs. Content packs may be installed separately at any time.

## Validation
Run `node tests/v120-engine-only.mjs` and `node tests/v120-library-provider.mjs` plus the maintained regression suite. Static and mocked tests **do not replace live Foundry V14 validation**, including drag/drop, manual Item editing, Wizard completion and optional module activation.

## v1.21.2 — The Character Notebook

The engine now ships with exactly **Light** (cream ledger paper) and **Dark**
(graphite ledger paper), selectable per player from **Configure Settings → System
Settings → Notebook Appearance** or the half-circle icon on any Actor/NPC sheet.

The default appearance does not display game-genre artwork or genre palettes.
Optional **`brp-uge-themes`** (a separately installed Foundry module) supplies 5 genres,
15 header artworks, 8 historic palettes, and icon variants. No Compendium data
or game rule algorithms are changed by this separation.

When upgrading from v1.20.0, **replace** the system folder rather than merging.
Preserve your world data. The old genre/theme values remain in saved World data
but are not shown in the base engine; they can be re-selected in the optional module.


## v1.21.2

- Refined Light and Dark notebook themes with paper textures and red ledger accents.


## v1.21.3
New natural generated-paper textures and accessibility-oriented text contrast refinement.


## v1.21.4 — Charcoal and Wizard occupations

Dark Mode has neutral charcoal surfaces rather than red/brown. The Wizard now reconciles operational and original UUIDs for Skills in imported external Compendium Packs. Selecting an Occupation highlights its linked skills; finishing the Wizard embeds those Skills at their base chance even with zero allocation points. Additional optional occupational specialties must still be selected according to the Occupation description.

**Quick Reference data-module users:** enabling the module alone does not import its JSON dataset. A GM must invoke the installer described in that module's README; verify that `world.brp-uge-quick-skills` and `world.brp-uge-quick-occupations` appear in the Compendium sidebar, and open the Wizard afterwards. Back up your World before importing.

## v1.21.5 — Character Creation and Readability

- New World settings: **Occupation Budget Method** (`fixed`/`edu`) and **Starting Skills Source** (`all`/`world`). Setting Normal level + EDU does not automatically switch fixed 250 occupational points to EDU×20.
- Character/NPC baseline Skills copy from real installed World Items or compatible accessible Compendium Item packs; no built-in rulebook content. Re-running the Wizard does not reset untouched embedded Skills.
- Wizard: select family-specific powers enabled by GM, inspect rule details before/after adding, read English names alongside Thai, set a rolled reference age (players roll; GM may control current age) and see age-effect previews.
- Lower contrast text tokens overridden in both Light/Dark across major panels.
- Native hover title fallback on controls, plus readable rules text instead of showing raw HTML tags.

**World backup is strongly recommended when upgrading.** Offline tests are not a replacement for real Foundry V14 smoke testing.

## GitHub Releases and Foundry installation

GitHub Actions builds a versioned `brp-uge.zip` and matching `system.json` for tagged releases. See [the release and installation guide](docs/GITHUB-RELEASES.md) for version tagging, verification, and the important Private Repository limitation. **Release URLs do not provide anonymous Foundry installation while the GitHub Repository is Private.**
## v1.21.6 — Usability and starting Skills configuration

- A GM may choose the exact baseline Skills copied to newly created Actors. Configure the source and selection mode under Game Settings, then choose Skill Items through the **Select starting skills** button in Settings or the Character Sheet header. Selection uses external World/Compendium data; no skills are embedded in this system. Existing Actors and their allocations are preserved.
- Localized Skill names remain compact. Hover over a Skill to see its English reference name; the detailed tooltip remains on the surrounding row.
- Game Settings gains localized section headings and clearer field descriptions.
- The character identity header uses more space for portrait, name and Occupation; notebook lines no longer pass over data; utility icons use readable foreground colors.

For this version, create and merge the GitHub Pull Request, then release using tag `v1.21.6` to trigger the Foundry system packaging workflow.

## v1.21.7 — Header and starting skill configuration

The Actor/NPC header now displays DM, Armor and MOV beside the header controls, while making portrait, name and occupation easier to read. English Skill references are shown on hover. The GM may choose starting Skills using **All available**, **Rulebook-sourced** (records with external book provenance), or **GM-selected**, and can open **Manage Starting Skills** from Game Settings. This selection reads active external content only and never bundles book data.