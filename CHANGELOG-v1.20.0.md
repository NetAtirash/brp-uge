# v1.20.0 — Game Engine / Content Separation

- Removed bundled catalogs, rulebook reference dataset, Occupation/Wealth/Status presets, sample NPC data and legacy generation code.
- Removed automatic World Compendium and Journal seeding, the version-based sync/migration path for bundled data and the auto-create starter skills hook.
- Rebuilt the Compendium Browser as a data-source browser over World Items and accessible optional Item/Actor Compendium packs.
- The Character Wizard discovers Item Documents from installed sources, accepts empty libraries and optional Occupation selection, and retains game mechanics.
- The Actor Sheet and Item Sheet use UUID-linked source documents rather than catalog indexes/embedded lists.
- Compendium records already in old Worlds are left untouched; this release performs **no content deletion or migration**.
- Preserved all Item data models and mechanical rules. Offline unit/static tests added; real Foundry V14 interactive QA required.

- Removed unused, legacy catalog-era icon and era-inference utilities; empty default World suggestion lists and currency denominations in new Worlds.
