# BRP UGE — ONE Skill Family Template per Compendium (RC3)

**New, authoritative architecture:** a Compendium contains **one Skill Item per specialty-capable Skill Family**. Its system.specialtyDefaults metadata contains only verified, editable book-starting choices. Other specialties are GM World options, not additional Compendium Items. When a character learns different specializations, each is a separate Actor-owned Skill Item with independent points, advancement and rolls.

This replaces previous "one Skill Item per named specialty" authoring advice.

## 1. Canonical Skill Family Template

Use a stable real source Item UUID (or explicitly create a new one) with a neutral bilingual template title and isSpecialtyTemplate:true.

~~~json
{
  "name": "Language (...)",
  "type": "skill",
  "system": {
    "nameEn": "Language (...)",
    "nameTh": "ภาษา (...)",
    "referenceKey": "Language",
    "specialtyFamily": "Language",
    "specialtyFamilyTh": "ภาษา",
    "isSpecialtyTemplate": true,
    "specialty": "",
    "specialtyTh": "",
    "base": 0,
    "baseFormula": "",
    "category": "communication",
    "specialtyDefaults": [
      {
        "key": "own",
        "en": "Own",
        "th": "ภาษาแม่",
        "base": null,
        "baseFormula": "",
        "ruleNote": "Fill only with rules verified by content publisher",
        "enabled": true
      }
    ]
  }
}
~~~

**This example demonstrates structure, NOT verified numerical rules.** The publisher must fill the correct base, formula, category, printed names and any native-language-specific rule. Do not infer them from the example.

The same approach applies to Knowledge (...), Science (...), Art (...) and other specialty-capable Skills. To achieve the requested Language workflow, publish **only Own / ภาษาแม่** as a verified initial choice. Do NOT publish Other or every possible language automatically. For Knowledge and Science do not seed specialized examples unless the book/content author explicitly marks them as starting defaults.

## 2. Book defaults vs GM World additions

The source Skill Item's specialtyDefaults is a list of *options*, not documents, with stable key, bilingual en/th, optional base % override, optional baseFormula and ruleNote. GM may rename/hide/enable book defaults in the v3 World setting brp-uge.specialtyRegistry.bookOverrides. GM-created options are World additions under each family; optionally they may carry reviewed different Base % or Formula.

Player chooses Family (Language), then an approved Specialty (Own or GM-approved additions), then gets a **new Actor Skill Item** like Language (Own). Different actor languages have independent ratings and histories. The Compendium's only source remains Language (...).

## 3. Occupations

Existing fixed Skill UUID references remain valid for ordinary unspecialized Skills. When a fixed occupation skillRef points to the new Family Template, Wizard requires the player to choose a concrete Specialty before granting occupation points. Additional choose-N clauses remain explicit publisher-authored skillChoiceGroups:

~~~json
{
  "id": "allowed-languages",
  "labelEn": "Languages",
  "labelTh": "ภาษา",
  "count": 1,
  "distinct": true,
  "options": [
    {"kind":"family","familyKey":"language","specialtyKey":"","ref":""}
  ]
}
~~~

A particular verified seed may instead be constrained with kind:"specialty", familyKey:"language", specialtyKey:"own". Ordinary standalone Skills use kind:"skill" and their actual source UUID. This is **structural syntax, not a quoted rulebook Occupation**. Counts and allowed alternatives must be verified from the book.

## 4. Migrating old Compendium sources without harming Actors

1. Back up the content pack sources and a test World.
2. Audit the old source subtype Items, choose one canonical family template, and preserve its ID where possible.
3. Verify family-wide general rules and each real book-default variant's base/formula; never infer defaults from a slash heading or a rule example.
4. Publish exactly one canonical Skill per Family (isSpecialtyTemplate:true) with only verified specialtyDefaults.
5. Prepare explicit old UUID → family UUID mapping and review every Occupation, Weapon and other source reference. Replace old fixed specialty references with a Family reference and appropriately constrained choice group. Do NOT silently broaden an exact specialty requirement.
6. Audit and only then archive/remove old per-subtype source Items; do not erase Actor-owned copies.
7. Review v1/v2 World presets and overrides. Map approved specializations to bookOverrides or World additions; never treat all old Compendium variants as official seeds.
8. Validate existing Actor Item IDs, independent point allocations, advancement, training, source provenance and Flavor Names remain unchanged.
9. Test new Character Wizard and Occupation choices with migrated content pack in a copied World, in both themes.

## 5. Boundaries and readiness

- Without the new canonical Skill Family template, old multi-Item Compendiums are shown as migration candidates, **not automatically selectable book specialties**.
- Game System updates alone cannot physically reduce Items inside a separate Compendium repository. The external pack must be rebuilt using this schema.
- No hidden BRP UGE skill list or numeric defaults are bundled with the engine.
- No automatic Actor/point migration. Existing owned Skills remain intact.
- Do not publish a stable Game System or content-pack release without Foundry v14 manual testing.
