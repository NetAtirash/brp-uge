# BRP UGE — External Compendium Module Contract (Draft 1.0)

This document describes the intended **interface** for a future optional BRP UGE content module. No content module is bundled or created in this release.

## Dependency direction

- `systems/brp-uge` has no dependency on a content module.
- A future module should declare compatibility with system `brp-uge` and Foundry VTT v14 in its own `module.json` relationships.
- Optional Item and Actor Compendium packs are discovered at runtime through `game.packs`; the engine does not register or seed packs.

## Document types

- Actors: `character`, `npc`
- Items: `occupation`, `skill`, `weapon`, `armor`, `shield`, `power`, `passion`, `gear`, `wealth`, `status`
- All content must satisfy the corresponding Data Model in `module/data-models.mjs`.
- For localized content, populate `system.nameTh`, `system.nameEn`, `system.descriptionTh`, `system.descriptionEn`. The engine implements display-language selection.

## Stable cross-references

Store a real Foundry Document UUID in typed reference fields, not a translated name or a catalog index:

- Occupation: `system.skillRefs[]`, `system.starterWeaponRefs[]`, `system.starterArmorRefs[]`, `system.wealthRef`
- Weapon: `system.skillRef`
- Other reference fields must be handled using the actual Data Model definitions.

`documentToEmbeddedItem()` stores the original UUID in `flags.core.sourceId` and `flags.brp-uge.sourceUuid` when importing from a source document.

## Reference provenance

Optional source metadata can be placed at `flags.brp-uge.rulebookReference`:

- `book`: book title or identifier
- `pages`: array of source pages
- `heading`: source heading
- `sourceType`: `direct` only for text actually checked against the referenced rulebook; `module` for adaptations.

Items missing this metadata are treated as **unverified source content**, not implicitly as official rules.

## World safety

- The Game System does not create, overwrite, delete or migrate Compendium documents as an installation side effect.
- Historical World Items, embedded Actor Items and old World packs remain untouched. GM should back up and review before deleting obsolete packs.
- Future content-version migrations must live in the content module, use safe stable identifiers, and must not overwrite customized World Items without explicit permission.

## Required future acceptance checks

1. World without content module: Actor/Item creation, sheets, rolls, combat and Wizard can be opened.
2. World with content module: all Item types are listed and can be added to an Actor, with correct UUID provenance.
3. Locale switching: Thai and English fields shown correctly, without changing mechanical values.
4. Occupation links: select the intended Skill/Weapon/Armor/Wealth by UUID regardless of language.
5. World upgrade: player-created and GM-customized content is not overwritten.
6. Every included official rulebook record separately audited for mechanical correctness and book provenance.
