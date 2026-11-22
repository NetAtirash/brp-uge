# Compendium integration guide — BRP UGE v1.21.11

The Game System stays data-free. Existing Skills retain their Item IDs, UUIDs, point calculations and existing references.

## Skills
Each concrete Specialty is still an independent Skill Item. Recommended fields are system.specialtyFamily, system.specialtyFamilyTh, system.specialty and system.specialtyTh, plus stable system.referenceKey and correct base/category/formula. World-only additions may be managed without publishing new Skills. Compound source examples such as Science (Chemistry / Physics) or rule headings (various) MUST be reviewed and not auto-split or published as single selectable specialties.

## Occupations
Existing system.skillRefs are fixed/required skills. New system.skillChoiceGroups is a typed optional array. The following is an illustrative schema example only, NOT a book-authored occupation:

~~~json
{
  "id": "research-fields",
  "labelEn": "Research fields",
  "labelTh": "สาขาการค้นคว้า",
  "count": 2,
  "distinct": true,
  "options": [
    {"kind": "family", "familyKey": "science", "ref": ""},
    {"kind": "skill", "familyKey": "", "ref": "Compendium.example.skills.Item.REAL_ID"}
  ]
}
~~~

This selects two distinct Skills from the union of a Family and an exact Skill alternative. It does NOT make that UUID an obligatory fixed Skill. Separate rule clauses should use separate groups. Actual quantities, alternative families, era exceptions and other restrictions must be verified against the original rulebook Occupation; do not infer or invent them from prose.

## Safe workflow
1. Back up the external Compendium sources and a test World.
2. Audit occupation source text into fixed Skill UUIDs, choose-N options, and any permitted families.
3. Retain source UUIDs and old Item IDs. Do not silently delete existing skillRefs even if migrating ambiguous legacy data; review it manually.
4. Add verified skillChoiceGroups via the GM Occupation Item editor or the separate content pack source. Validate missing UUIDs, distinct counts, formulas and available families.
5. In Game Settings -> Manage Specialties, review Compendium examples and add World-only options with a compatible real Skill template. World overlay saves never mutate Compendium Items.
6. Test a new character: choose Occupation -> resolve choices -> pick exact Specialty -> spend occupation points -> spend personal points -> review -> save.
7. Reopen a completed Actor and confirm its existing Skill IDs, allocated points, advancement, Flavor Names and equipment are preserved.

## Important boundaries
- Old packs still load. The Wizard only knows new choose-N clauses once they are authored in Occupation choiceGroups.
- World registry options are not independent published Compendium Items.
- Generated Actor-owned Specialty Items keep separate IDs; template UUID is provenance only.
- Removed/disabled source packs can prevent NEW selections but cannot erase existing Actor Items.
- GM approval is a manual process; there is not yet an automatic in-app approval queue.
- Manual Foundry v14 smoke testing is mandatory before tagging a release.
