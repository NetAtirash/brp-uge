# BRP UGE v1.21.10 — Flavor Names & Chat Contrast

- Add `flavorNameTh` and `flavorNameEn` on the **base Item data model**, making bilingual optional flavor aliases available to Skills, Weapons, Armor, Shields, Powers, Passion, Gear, Occupation, Status and Wealth Items.
- The actor-facing display name uses the chosen language's flavor alias when set. Otherwise it uses the existing localized rules name. `Item.name`, UUID, Item ID, rules and Compendium data remain unchanged.
- Add per-Item Flavor Name fields to the Item Sheet, with a visible canonical rules-name reference. The selected UI language is shown first; the existing **Show both languages** button reveals the other field.
- Show flavor names in character/NPC item lists, skill and power use messages, and experience improvement chat.
- Remove a hard-coded white heading in experience improvement chat, and add light/dark palette-aware chat styling scoped to BRP messages.
- Add a focused regression test for fallback, bilingual aliases, schema coverage, preserved item identity, and theme style selectors.
- Add a source-grounded study of dnd5e and pf2e UI patterns with a proposed BRP UGE visual roadmap (`docs/UI-REFERENCE-DND5E-PF2E.md`).

Automated/offline checks do not replace Foundry V14 visual testing. No Compendium datasets are embedded.