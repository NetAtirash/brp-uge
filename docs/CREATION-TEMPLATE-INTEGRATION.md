# External creation templates — integration contract (testing)

No book content or new Item type is bundled. The World GM imports the two original Compendium handoff JSON manifests by explicit call:

```js
await game.brp.importCreationTemplates({personality: personalityManifest, occupations: occupationOverlay});
```

Supported versions: `brp-personality-template-v1-proposed` and `occupation-overlay-1.0`. A partial import leaves the other manifest intact. The data is stored in a restricted World setting, never written into Actor-owned Items or content packs. Custom personalities can be separately approved by a GM via `customPersonalities` (array of the same template records, IDs namespaced by the engine; 13 slots and +20 each). No arbitrary 13-skill fallback exists for standard templates.

Occupation overlay matches exact Compendium provenance (brp-uge-compendium.occupations Item UUID), not translations. Existing Actor-owned occupations are not patched. Fixed references, counted groups, Registry-approved concrete specialties and uniqueness across fixed and choices are checked before save. Exact specialty book default keys survive registry display-name overrides. "Other language" excludes the Own option and stable bookKey; if a campaign represents the actual native language as an additional named specialty, it must explicitly avoid duplicate native-language registry entries. Programming-language role requires GM-supplied allowedCanonicalKeys in the external review guard; unknown source tokens must be resolved in the external manifest, never guessed. Suggestions are advisory, not filters. No in-place migration or silent point reset.

The source manifest version 1.21.11 is intentional; pre-release version is stamped during packaging. Testing channel currently points to RC.3. Do not publish or merge without approval. Actual Foundry/pack integration QA remains required.

## Live audit (read-only)
After import and with Compendium enabled, a GM can run:

```js
const report = await game.brp.auditCreationTemplates();
console.table(report.personalities);
console.table(report.occupations);
```

This checks installed source documents, approved specialties and whether all counted slots can be satisfied with unique canonical keys. It does not allocate any points or save a character. For an occupation with unresolved source tokens, amend the authoritative external data and re-import, rather than suppressing validation. The file-level import accepts all 4 Personality and 44 Occupation records / 138 groups / 24 review clauses from the provided handoff. That does not certify the installed skill catalog.

The Wizard keeps an explicit occupation's validated external choice snapshot on new Actor-owned occupation items, and does not rewrite an unchanged existing item. Existing completed Personality selections are protected.
