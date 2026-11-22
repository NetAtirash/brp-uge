## RC3 architecture correction — one source Item per Skill Family

The earlier RC1/RC2 model inferred each Compendium Skill (Art (Drawing), Science
(Biology), Language (Other), etc.) as a distinct Skill source, which is NOT the
desired publishing structure. RC3 corrects this:

- The external Compendium publishes only ONE Skill Item per specialty-capable
  Family, e.g. Language (...). Its system.isSpecialtyTemplate=true and
  system.specialtyDefaults contain only verified book-starter options.
- "Language (Own)" is a selectable **default metadata entry**, NOT a second
  Compendium Item. Other languages are absent until the GM adds them.
  The engine does not invent numerical book rules or seed names.
- GM World Specialty Management edits the verified defaults, adds
  specializations, and optionally supplies different bases/formulas without
  changing a source Item. The Actor gets a distinct Skill instance only AFTER
  a real Specialty has been chosen; multiple learned specialties retain
  independent rolls, occupation/personal points, advancement and Flavor Names.
- Wizard supports fixed Occupation family references, requiring a subtype before
  allocation. Occupation choiceGroups support kind=family (any approved choice)
  and kind=specialty (a particular authorized subtype), as well as ordinary
  exact Skill refs.
- Generic Family templates and legacy specialty-specific source records are
  not auto-copied into freshly created Actors.
- Old multiple-Item Skill packs are read as migration inputs, NOT automatic
  official defaults. Already-owned Actor Skills are never deleted or merged.

**Content blocker:** The Game System cannot replace actual Items from an
independent Compendium pack. That publisher must rebuild Skills into one
family template per Skill and update affected Occupation UUID references.
See docs/COMPENDIUM-SPECIALTY-CHOICE-GUIDE.md.

**QA:** Unit tests run on GitHub Actions. Foundry v14 live-world verification
and an actual migrated Compendium pack are still required before release.

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
