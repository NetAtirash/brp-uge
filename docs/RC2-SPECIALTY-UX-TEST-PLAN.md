# BRP UGE v1.21.11-rc.2 — Specialty UX / Character Creation Test

## Why RC2
Tester reported: (1) Wizard skill names unreadable in Light mode, (2) GM manager overlapping family list and read-only Compendium specialties, (3) no obvious profession Skill choices and no Family-then-Specialty workflow. RC2 fixes these behaviors without changing any Compendium Item UUIDs.

## Publish preview from the active PR branch (NOT main)

After GitHub Actions Validate succeeds:

~~~sh
git switch feat/v1.21.11-specialty-management
git pull origin feat/v1.21.11-specialty-management
git tag v1.21.11-rc.2
git push origin v1.21.11-rc.2
~~~

Release BRP UGE for Foundry VTT creates a prerelease (not latest stable). Preview manifest, available only after the Release workflow succeeds:

~~~text
https://github.com/NetAtirash/brp-uge/releases/download/v1.21.11-rc.2/system.json
~~~

Install on a separate Foundry User Data and COPY of a World. Stable and RC share the same system ID and cannot run side-by-side in the same User Data path.

## Test 1: GM Specialty Management / Art

1. Open Game Settings -> Manage Specialties; choose Art.
2. Confirm every installed source example is editable, including the example Art (Drawing / Painting) initially marked Needs Review.
3. Set the source example to English Drawing / Thai วาดภาพ / Enabled. Use Add Specialty to create English Painting / Thai จิตรกรรม; choose the correct Art rules template. Save.
4. Reopen the manager: Art shows two distinct enabled choices Drawing and Painting. Neither the Compendium source Item name nor existing Actor-owned Skill Items changed.
5. Set Painting Hidden and verify it is no longer a player option; re-enable to restore. Test both UI languages and Light/Dark, including long Thai family names and scrolling.

## Test 2: Character Wizard choices

1. Open a NEW test Character in a copied World and reach Step 4.
2. Select an Occupation with explicit skillChoiceGroups. If it describes flexible choices but has no structured groups, the Wizard warns. As GM use Configure this Occupation to create a safe World copy of a locked Compendium Occupation and edit its Choice Groups. Verify the rulebook's actual numbers before saving.
3. With a Family Art choice in the Occupation, tick Art then choose Drawing or Painting from the secondary selector. Confirm and observe the required N/N count update.
4. Verify that occupation points can only go to fixed skills and confirmed eligible choices. Personal points can go to a separately selected Art Specialty, without granting occupational eligibility.
5. Confirm only selected Specialties appear in the allocation table, not dozens of raw Art (...), Science (...) source examples.
6. Switch occupation then back and confirm its prior draft selections/points reappear without writing to Actor until final Save.
7. On a completed Actor, open Wizard and verify accidental rebuild remains blocked; existing skills, IDs, advancement and Flavor Names are preserved.

## Test 3: Appearance, permissions and fallback

1. In both Notebook Light and Dark themes, verify Skill names, base percentages, +/− allocation buttons and totals are readable; list rows must not be black on black.
2. Confirm Skill Families sidebar buttons do not overlap and the pane scrolls independently.
3. Test a player account with no GM privileges: Specialty Manager and Occupation editor must not allow editing.
4. Temporarily disable the content source in a copied World: existing Actor Skill data must remain intact and new unavailable choices must report a missing source.
5. Report exact Foundry v14 build, browser console errors and screenshots on PR #8.

## Compatibility note

No generic parser can safely reconstruct the printed choose-N Occupation rules from prose alone. For full automatic choices, the external Compendium publisher must add verified skillChoiceGroups to occupation data. This branch supplies the GM authoring workflow and safe diagnostics; it does NOT invent rulebook content or automatically rewrite existing packs.
