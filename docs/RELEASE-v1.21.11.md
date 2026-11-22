# BRP UGE v1.21.11 — Stable Release

**Foundry VTT v14 · BRP Universal Game Engine · Thai / English**

This release promotes the tested v1.21.11 RC6 code to the **stable** Game System channel after PR #8 was merged into `main`.

## What's included

- **Skill Family Templates:** A specialty-capable Skill is represented by a single family source Item in the separately maintained Compendium (for example, Language (...), Art (...), Science (...)); published starter Specialty choices are metadata, not separate source Items.
- **GM Specialty Management:** Manage World-only bilingual Specialty options, review and hide unapproved choices, and optionally configure their base chance/formula without rewriting source Compendium Items.
- **Character Creation Wizard:** Select Occupation Skills and their allowed Specialties before distributing Occupation and Personal points, with protection for existing character data and draft allocations.
- **Wizard UI fixes:** Visible, clickable Specialty radio-choice grids replace unreliable dropdowns. Occupation summary/progress/point bars no longer overlap.
- **Skill Points & Occupation rules:** Creation-stage budget and eligibility validation; optional structured occupation choice groups with exact and family-wide Specialty choices.
- **Bilingual / Light-Dark UI:** More consistent wording and contrast across Specialty management and the Character Wizard.

## Installation and updates

**This is a Foundry Game System, not an Add-on Module.**

- Stable manifest: https://github.com/NetAtirash/brp-uge/releases/latest/download/system.json
- Stable ZIP: https://github.com/NetAtirash/brp-uge/releases/download/v1.21.11/brp-uge.zip

Foundry Setup → Game Systems → Update (when using the stable manifest), or Install System → Manifest URL to install a new copy.

**Content dependency:** The game system is intentionally data-free. Install and enable the **separately maintained, up-to-date BRP UGE Compendium content module** to receive the Family Template and Occupation data. This system release does not include or publish that separate pack. Rules and book-authored Specialty defaults must come from the publisher's verified content.

**Upgrade precautions:** Back up Worlds and Actor data before updating, especially when migrating from older per-Specialty Compendium layouts. This release does not automatically merge, delete, or rewrite existing Actor Skill records and accumulated points. Stable and preview systems share the same package ID `brp-uge` and cannot be installed side by side in one Foundry User Data directory.

## Project notice

BRP UGE is a **personal-use hobby project** developed with assistance from **ChatGPT (OpenAI)**. It is unofficial, experimental, and not endorsed by Chaosium, Foundry Gaming, or OpenAI. See README for the Thai/English disclaimer.

## Release provenance

- Source: `main`, integrating PR #8 — Specialty Management and Character Wizard v1.21.11
- Release gate: JavaScript syntax, complete offline regression tests, ZIP integrity, manifest URL/version checks
- Runtime: Foundry VTT v14 (compatibility field `minimum: 14`, `verified: 14`)
