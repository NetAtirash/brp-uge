# BRP UGE v1.21.11-rc.4: Wizard Specialty Live Sync

## Fixed

Previously, Wizard cached installed Specialty Registry exactly once and kept that snapshot while GM changed World Settings. A GM could add e.g. Art (Writing) and Art (Songwriting), see both enabled (9/9) in Specialty Management, but an already-open Character Wizard's Specialty dropdown remained empty.

RC4 fixes the live-setting propagation:
- `specialtyRegistry` and legacy `specialtyPresets` settings now notify open Actor/Wizard UIs on change.
- Character Wizard re-evaluates the current World overlay each render instead of relying on the original cached setting. Installed Compendium Skill documents remain cached (no repeated expensive full-pack read).
- The current personal and occupation Family/Specialty selectors survive UI updates when the choices still exist. Existing allocated occupation/personal points are not reset.
- If no enabled Specialty exists, the dropdown gives a clear GM action message instead of the uninformative blank chooser.

## Reproduce / Smoke Test (Foundry v14)

1. Back up and use a COPY of the World; install BRP UGE RC4 and the separately developed updated Specialty-Families Compendium.
2. Open the Character Creation Wizard, go to Step 4, and **leave it open**.
3. As GM, open Game Settings -> Specialty Management -> Art. Add English Writing (Thai การเขียน) and Songwriting (Thai ประพันธ์เพลง), set both Enabled, then Save.
4. Return to the **same** Wizard window. Select Art under Personal Specialties; the second dropdown should now list both Writing and Songwriting without closing/reopening Wizard.
5. Select Writing -> Add Skill; verify only Art (Writing) is created as an Actor-owned Skill on final save, and that your Compendium still contains one Art (...) Family template.
6. If an Occupation has an Art Family choice group, select the required Art Specialty and allocate professional points; personal points remain separately valid.
7. Check that any existing point edits in the Wizard are not reset when GM updates Settings. Verify reopening on another player account syncs World choices.
8. Hide Writing in the GM settings and Save, check Wizard no longer offers it for new selection; previously owned Art (Writing) remains untouched.

## Installation

After the GitHub Actions prerelease workflow publishes RC4:

~~~text
https://github.com/NetAtirash/brp-uge/releases/download/v1.21.11-rc.4/system.json
~~~

The RC3 manifest is pinned to RC3; use the versioned RC4 URL for a preview upgrade. This is a Game System, not a Module. Do not install two `brp-uge` systems side by side in the same Foundry User Data root. Stable Latest remains v1.21.10. PR #8 stays Draft pending in-world verification.

## Published preview checkpoint

This RC4 publication commit includes verified live World Specialty registry refresh, selector draft preservation and regression coverage. The publication workflow creates a versioned prerelease, not a stable Latest replacement. Install only in a copied Foundry v14 World.
