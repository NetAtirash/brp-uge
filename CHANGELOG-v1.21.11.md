# BRP UGE v1.21.11 — Specialty Management and Occupation Choices

- Source-aware GM Specialty Management combines read-only installed World/Compendium examples with separate World overlays, including add, hide and bilingual labels.
- Ambiguous composite source examples (Science Chemistry / Physics or various) appear for review rather than as concrete selectable Skills.
- Occupation Items can now define typed optional choice groups: choose N distinct Skills from exact UUIDs and/or a Specialty Family. Existing fixed skillRefs remain unchanged.
- Character Wizard resolves choice groups before professional point allocation, retains draft pools when switching occupation, and preserves the selected choices in Actor flags.
- Completed Actors cannot be rebuilt accidentally. A GM must explicitly unlock rebuilding; switching an existing completed character's profession with existing occupation points requires separate migration.
- Skill Points Workbench checks occupation eligibility, point budgets and skill caps for unfinished Actors.
- Optional Basic-only starting Skills mode avoids automatically copying every external specialized Skill. Existing World defaults are preserved.
- Character IDs, UUID refs, advancements, training, Flavor Names and pre-existing Actor values are not changed on installation.
- Game System contains no bundled Compendium records. Optional choice groups need verified content authoring in the separate Compendium project.

See docs/COMPENDIUM-SPECIALTY-CHOICE-GUIDE.md and docs/RFC-SPECIALTY-MANAGEMENT-CHARACTER-CREATION.md (the latter exists in Draft PR #7).

## QA
GitHub Actions check syntax, regression tests, and release-package structure. Live Foundry V14 testing of GM/Player permissions, old World upgrade, Wizard and Light/Dark/Thai layouts remains required before release.
