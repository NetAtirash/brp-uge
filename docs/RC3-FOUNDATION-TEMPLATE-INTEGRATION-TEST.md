# BRP UGE v1.21.11-rc.3: Foundry v14 preview installation

Status: preview only, no stable tag, no changes to main. The system must be paired with the updated external `brp-uge-compendium` RC5 Family-Template package; the engine does not bundle any rules Compendiums.

## Install system preview

After the `Publish BRP UGE v1.21.11 RC3 Preview` GitHub Action succeeds:

System manifest (Foundry Setup → Game Systems → Install System → Manifest URL):

~~~text
https://github.com/NetAtirash/brp-uge/releases/download/v1.21.11-rc.3/system.json
~~~

System ZIP:

~~~text
https://github.com/NetAtirash/brp-uge/releases/download/v1.21.11-rc.3/brp-uge.zip
~~~

RC2 manifests are version-pinned; simply clicking Update on an RC2 installation may not discover RC3. Use a separate Foundry User Data installation for previews. If the preview package with ID `brp-uge` is already installed and Foundry rejects a second Install, remove that preview Game System from the TEST installation before installing RC3 by its manifest. Backup/copy the World first. RC3 and stable cannot coexist in the same Foundry User Data root.

## Compendium pairing

Use the separately produced `BRP-UGE-Compendium-v1.0.0-RC5-v1.21.11-Specialty-Families-VALIDATION.zip` package (not hosted in this system repository). As reported in the separate Compendium workflow, it contains 516 published items, 56 Skills, and 18 Family Templates. The Game System release process cannot verify or publish that external ZIP. Install its module independently according to the RC5 package instructions; do not mistake it for the Game System ZIP.

## Functional smoke test

1. Confirm system version is `1.21.11-rc.3` in Foundry v14.
2. Inspect Skills Compendium: precisely one Skill Template per specialty-capable Family (e.g. Language (...)), with system.isSpecialtyTemplate=true and only author-verified specialtyDefaults.
3. In GM Specialty Management, verify Language offers only the listed book default (e.g. Own/ภาษาแม่), with no automatically invented Other; add an approved GM language and reopen the registry. Existing Compendium Item count must not increase.
4. Build a new Actor: first choose Language, then Own or an approved GM language. A chosen Specialty becomes a *new Actor-owned Skill*, not a new Compendium record. Two languages have separate point allocations and advancement.
5. Choose a verified Occupation with skillChoiceGroups. Confirm each fixed Family template reference requires resolving a concrete Specialty and its point eligibility is checked before final save.
6. Reopen an old completed Actor in a COPY of a World. Confirm Item IDs, Flavor Names, training, advancement, occupation points and personal points are not automatically overwritten.
7. Test Light/Dark, Thai/EN and Player vs GM permissions. Report Foundry console errors, screen captures, installed system+module versions.

### Known limitations

- Separate RC5 Compendium was generated outside this repository and was not checked against this exact commit in Foundry v14. Integration and rulebook verification are part of manual test; no production guarantee.
- Compendium RC5 reportedly has 44 Occupation choice groups pending verification and 37 weapon Specialty mappings pending live inspection. A successful engine CI does not certify those content records.
- Existing older Worlds can contain legacy specialty Items; use a copied new World. The system deliberately does not merge or delete existing Actor Items.
- The 1.21.11 RC3 package does not update stable /releases/latest/ and does not merge PR #8.
