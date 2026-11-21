# BRP UGE v1.21.0 — Character Notebook

- Replaced the old eight system-owned palettes/genres with per-client **Light** and **Dark** paper-note appearance.
- Added a one-click Light/Dark switch to Character and NPC sheet utilities.
- Set consistent note-paper tokens across Actor, NPC, Item, Wizard, Compendium Browser, and Chat.
- Removed `sheetGenre`, `sheetVariation`, `sheetTheme`, `iconTheme` setting declarations and retired migration hooks from the core engine.
- Moved fifteen genre banner images, modern/scifi icon variants, and alternate palette styles to optional `brp-uge-themes`.
- Added `game.brp.appearance` extension API for optional artwork/icons.
- Retained gameplay data models, creation wizard, roll mechanics, compendium browser and combat implementations unchanged.
- Offline regression verification only; live Foundry V14 UI testing remains user-side.
