# RFC: BRP UGE Specialty Management + Occupation Choice Resolution (v1.21.11 proposal)

**Status:** Design / audit only — no runtime behavior, actor data or Compendium records are changed by this RFC.
**Baseline:** main, BRP UGE v1.21.10 (Foundry VTT v14).
**Goals:** GM sees and manages existing Specialty choices; players resolve mandatory and selectable occupation skills BEFORE allocating professional points; existing actors, Skill IDs, rule data, and points are protected.
**Primary rules reference:** Chaosium, *Basic Roleplaying — Universal Game Engine*, ORC Content Document, Step Six / Step Seven and occupations, https://www.chaosium.com/content/orclicense/BasicRoleplaying-ORC-Content-Document.pdf

## 1. Code audit (v1.21.10)

| Area | Current implementation | Gap / risk |
|---|---|---|
| Specialty families | module/skill-specialties.mjs infers a family by a parenthesized name or specialtyFamily fields | A mixed example such as "Science (Chemistry / Physics)" is treated as one literal value. A family is not a definitive rules schema. |
| GM menu | module/apps/specialty-presets-menu.mjs edits only a JSON list in world setting specialtyPresets | No unified inventory of source Skill Items, derived examples, overrides, inactive options, provenance, or per-family base formula validation |
| Actor adding Skill | module/sheets/actor-sheet.mjs merges inferred families and exact Item choices; family submenu offers only GM presets and Custom | Exact Compendium Specialty examples are not the same curated picklist as presets |
| Composing Skill | composeSpecialtyItem() copies a real template, clears point allocations and creates an independent embedded Item | Inferring a random member's base, formula or source rule can be inappropriate for another subtype; choosing the right source needs explicit metadata and validation |
| Occupation | OccupationDataModel has only skillRefs (plus equipment references) | No mandatory-any family, choose N of M, OR alternatives, multiple slots of one family, or choice requirements |
| Professional point eligibility | BRPCharacterWizard.#isOccupationalSkill() checks only explicitly matched skillRefs UUIDs | A player-chosen Science (Astronomy) does not qualify for a "Science (any)" occupation slot unless directly linked; book choices are lost |
| Wizard catalog | Skill catalog is built once from installed Skill Items and actor copies | No first-class Specialty selection/creation in Wizard before spending points |
| Wizard drafts | occRanks/persRanks/touchedSkillIndices keyed by mutable catalog indices | Adding/removing/reordering selections can mismatch point assignments unless indices are remapped; switching profession immediately resets occRanks |
| Wizard final save | Existing Skill references identified by sameSkill(); creationCompleted short-circuits only when global touched flags are false | Reopening with professionChanged can attempt to reset unrelated prior occupation/personal allocations; needs per-row diff and explicit consent |
| Skills foundation | startingSkillsMode=all copies every available specialized source Skill to a new Actor | Creates clutter, and wrongly equates available specialties with universal baseline Skills |
| Point workbench | module/apps/skill-points-editor.mjs supports draft editing and concurrency checks for raw point fields | Does not enforce profession-eligibility/caps the same way as Wizard; should share validation and show source/permission |
| Cross references | Weapon/Shield, Status, Occupation, experience and advancement use source refs or item IDs | Never change IDs automatically during renames/migrations |

## 2. Domain model and source-of-truth

Do NOT turn Flavor Name, translated title, or inferred parentheses into primary identity.

* Skill Family: a stable semantic familyKey (e.g. "science"; more specific sub-family when core rules differ). Has TH/EN labels, eligibility policy, explicit template selection/variant, category/base/formula and rule provenance.
* Specialty Definition: stable familyKey + specialtyKey; TH/EN labels; active/hidden/custom-approval state; source provenance (Compendium UUID or World Item UUID, if any); optional specific templateId/reference; not a Foundry Actor Item itself.
* Embedded Character Skill: remains an independent Skill Item with its own ID; preserve its starting chance, allocation fields, advancement, source provenance, flavor names and links. Store both structured identity and source reference when available.
* World Registry: resolved read-only view of installed compatible Skill Items PLUS GM-defined World overlays. Maintain provenance and editable/readonly status per row. Never mutate a Compendium record just because the GM changes an option in World Settings.
* Backward compatibility: read old specialtyPresets; migrate to overlay schema on explicit save or transparently via adapter. Preserve existing nameTh/nameEn, specialtyFamily/specialtyFamilyTh, specialty/specialtyTh, referenceKey and canonicalSkillKey behavior for existing records.
* Do not turn an "any"/"various" heading into a concrete selectable specialty; mark compound, unknown or placeholder source labels as "Needs review", rather than silently splitting or publishing them.
* Where source siblings differ in formula, base percentage, or applicable rules, require a template compatible with that exact Specialty/subfamily. No inference from arbitrary first item; ambiguity blocks auto-create until GM selects a correct source.
* Enforce normalized duplicate detection without collapsing distinct valid specialties. Do not overwrite a customized Actor Skill.

**Suggested overlay settings** (not necessarily exact implementation syntax):
~~~json
{
  "schemaVersion": 1,
  "families": {
    "science": {
      "displayTh": "วิทยาศาสตร์",
      "displayEn": "Science",
      "additions": [
        {"key":"astronomy", "en":"Astronomy", "th":"ดาราศาสตร์", "templateUuid":"Compendium.module.skills.Item.ID", "state":"enabled"}
      ],
      "overrides": [],
      "hidden": []
    }
  }
}
~~~
The runtime must validate and normalize this data, retain legacy input, and report unresolved source references. Only a GM may edit overlays. Players' ability to enter a new Specialty must be a GM policy (allow, approval required, restricted) rather than an unqualified bypass of restricted era/occupation choices.

## 3. GM UI: Manage Specialties

Retain the Foundry v14 Game Settings menu but replace the bare preset editor with a management workspace:

- Left: searchable/filterable list of Skill Families, including counts for Compendium source examples, World Items, GM additions, ambiguous/invalid examples, and Active/Hidden.
- Right: source-aware table of each concrete Specialty with TH name, EN name, source/pack, formula/base/category, state, direct source link and any reference usage warnings.
- Controls: Add Custom, Edit World Override, Hide/Enable, Duplicate As New, Review Ambiguous, Revert Override, Open Source Item (only if permissions allow). Never use "Delete" to mutate source Compendium content. Removal should be hide/archive by default.
- Distinguish "Existing Skill Item in source", "GM World option from source template", "Generated Actor copy" and "Legacy inferred candidate" visually. Indicate missing/disabled pack without corrupting saved choices.
- Save drafts intentionally with validation, dedupe, conflict checks and clear errors; cancel does not write.
- Quick action "Where Used?" reports linked Occupations and Actor Skill copies before a rename/disable. Renaming visible translated labels must NOT silently update IDs/allocations/linked items.
- Bilingual + Light/Dark support; stable search during Thai IME composition.

## 4. Occupation schema: explicit required and choice slots

Retain legacy system.skillRefs as explicit required, exact Skill UUID references. Add a separate structure (proposed system.skillChoiceGroups) rather than treating all eligible skills as compulsory. Typical clause types:

- fixed Skill: exact UUID/reference required
- any Specialty from one family: e.g. Science(any)
- choose N distinct eligible skills from a union of exact references and family options
- choose N distinct specialties within one family (e.g. any two Art skills)
- either/or: choose one of mutually exclusive alternatives
- context/approval restrictions: era, campaign fit, GM approval (never silently infer an official rule from description text)

Example for a hypothetical "choose five Knowledge or Science" requirement (rules-inspired structural example; not a prefilled proprietary occupation):
~~~json
{
  "id": "field-expertise",
  "labelTh": "สาขาความเชี่ยวชาญ",
  "labelEn": "Specialized fields",
  "count": 5,
  "distinct": true,
  "options": [
    {"kind":"family", "familyKey":"knowledge"},
    {"kind":"family", "familyKey":"science"}
  ]
}
~~~
Each chosen Specialty is a separate Skill Item, and a chosen Skill can be recognized as eligible for occupation points using the resolved requirement/choice selection rather than only an identical source UUID.

Legacy Occupations without choice groups continue to work using skillRefs. GM/Compendium editor exposes a dedicated "Required Skills / Choose N / Family Specialty" builder with a preview and a rule-source note. Content publishers should record the real choice clauses from the rulebook; the engine never fabricates missing legal choices.

## 5. Wizard redesign: resolve first, allocate second

Within existing Step 4 (Profession & Skills), introduce nested substeps and keep the six-step navigation intact:

A. Select Occupation → show description, wealth/equipment, fixed required Skills, optional selectable groups, exact counts, missing references and source rule notes.

B. Resolve all mandatory slots and required choice groups; select existing Specialty or create a permitted one with GM policy. A group requiring N distinct Skills is visibly N/N and cannot be confirmed until valid. Choosing a family without a concrete Specialty is not completion.

C. Review "Profession-eligible Skills" and instantiate a *draft* set with independently identified sources (canonical key + selection slot), correct category/base/formula, and zero discretionary points. Do not materialize World/Actor items yet.

D. Allocate **profession points first** only to those eligible concrete Skills. Then allocate **personal points** to any Skill allowed by GM; for newly chosen personal specialties use the same picker. Retain optional Personality bonus (+20 to 13 choices), category bonus, age/EDU power-tier budgets, Power expenditures and skill caps in shared validators. Show exact sources of total rating; never consume extra points for merely selecting a specialty.

E. Review all occupation choices, mandatory/optional counts, individual identities, budgets and caps, then confirm changes. Saving creates or updates only the delta; never resets untouched Actor Skills, post-creation training, advancements, source UUIDs, or Flavor Names. Maintain a reversible draft (including profession-specific draft snapshots and Undo for an accidental profession switch). If a selected Skill must change, do not auto-transfer points to a different Specialty: return unassigned pool points to the player and explain explicitly. Existing skill/campaign records must remain unchanged until Save.

Persist enough of finalized creation selections in Actor flags to allow future reopens without guessing from names or revising historical choices if GM changes World options. Reopening completed characters should default to inspection/non-destructive editing and require deliberate confirmation for rebuilding profession allocations.

## 6. Required integration audit

- Compendium Browser / optional Compendium module: browse/read the effective registry, search both languages and distinguish actual source Items from World options.
- Character and NPC sheet Skill Add: use exactly the same registry and picker; maintain independent Item IDs and duplicate detection.
- Occupation Item editor: add required/choice group builder; preserve existing Skill UUID links and starter equipment/wealth refs.
- Character Creation Wizard: selection-before-allocation, per-Skill draft IDs, rules and counts, commit safety, reopening protection, errors when pack is missing.
- Skill point fullscreen editor and inline editor: shared budget, occupational eligibility and cap validation in creation mode; post-creation edits retain existing GM/permission rules and are never silently retroactively invalidated.
- Starting Skills foundation: separate always-available basic starting Skills from optional Specialty offerings. Preserve existing Worlds' configuration and their Actors; offer migration/GM preview before changing baseline defaults for NEW Worlds.
- Powers / Personality: same pooled-points accounting and specialized skill selectors when applicable; no substring-based profession inference for power eligibility.
- Weapons, Shields, Status modifiers, reference-utils, skill-foundation, advancement and macros: resolve semantic aliases safely; do not migrate IDs or rewrite exact references automatically.
- UI language, Flavor Names and Chat: canonical rule identities persist under display changes; cross-language lookup and summary text must remain stable.

## 7. Compatibility and migration

**Game System:** new domain resolver, overlay registry, optional typed Occupation choice groups, shared creation validation, Wizard UI & tests. Must remain data-free.

**Compendium publisher:** existing packs remain loadable and existing Skill UUIDs remain untouched. Full faithful occupation behavior requires a **content migration** for those Occupations whose rule text includes choose N, any, or either/or. Optional explicit family metadata improves Skill source quality and avoids unsafe heuristics. New compendium output should use upgraded Occupation fields; old schema must not fail loading.

**Worlds / Actors:** no auto-edit to existing Actors, Occupation choices, source IDs, XP, point allocations, names, compendium Items, or world settings on install. Add a read-only migration audit with counts (source candidates, legacy presets, ambiguous family values, missing template UUIDs, unmodeled Occupation choices and duplicates) and require GM explicit consent before any operation that changes persisted data. Archive inactive choices, do not hard-delete.

**Pack unavailable / revoked:** preserve old Actor skills and their points. Wizard shows missing-source diagnostics and blocks only new unsupported selections, not existing character play.

## 8. Tests / release gates

1. Existing v1.21.10 Actor and Occupation load without migration; no ID, skill %, pool, training, references or source item changes.
2. GM management lists (i) Compendium source item, (ii) World Item, (iii) GM added option, (iv) ambiguous placeholder; TH/EN labels, provenance, hide/restore and permissions work.
3. "Science (Chemistry / Physics)" and "(various)" are not silently split or treated as actual singular specialties; data migration report flags them.
4. A custom Science (Astronomy) created through valid template is a distinct Actor Item and not a mutation of a Compendium source; selecting it via an allowed Profession family slot makes it eligible for occupational points.
5. Test choose-N, any, alternatives, duplicate prevention, invalid counts, missing libraries, GM restrictions, custom-approval and era restrictions.
6. Switch profession after allocating points; keep previous draft for Undo/return, never erase actor allocations; transfer no points without an explicit decision.
7. Reopen a completed Actor: untouched skills/points/advancement/Flavor Names remain unchanged. Save per-item deltas only and reject concurrent edits.
8. Rule budgets/caps by Normal/Heroic/Epic/Superhuman; optional EDU, category bonus, age, Personality and skill-mode Powers; personal points on non-occupation Skills still allowed.
9. Full-screen point workbench cannot bypass creation rules but allows permitted post-creation edits. Prevent duplicate or orphaned Skill references.
10. GM vs player Foundry v14 permissions, Thai IME, Light/Dark, desktop/narrow screens, drag-drop, Compendium installation/removal, bilingual display.
11. Run all Node offline regression/packaging tests AND manual Foundry v14 smoke tests before release. No release/tag from this design-only branch.

## 9. Delivery sequence

1. **Engine foundation:** registry resolver, schema/version adapter, ambiguity report and tests. No player workflow change.
2. **GM manager:** full source-aware UI, overlay CRUD, permission gates and tests.
3. **Occupation integration:** choice-groups typed schema, GM builder, resolver, validator and compatibility tests.
4. **Wizard + point systems:** resolve-first selection, safe drafts, shared validators, non-destructive final save/reopen and starting-skill policy.
5. **Optional Compendium update:** annotate real choice clauses and explicit compatible template data without changing UUIDs; add coverage checks and ambiguity report for each pack.
6. **Foundry v14 regression:** Player/GM UI, backups, upgrade from v1.21.10 and release tagging after successful review.

## 10. Explicit non-goals

- Do not rewrite official BRP professions/skills inside the Game System.
- Do not copy/edit a Compendium pack directly from the player's manager.
- Do not treat translated/Flavor labels as rule identities or source UUIDs.
- Do not automatically update/delete Actor-owned items when presets change.
- Do not promise that existing Compendium Occupations with only skillRefs automatically gain choose-N logic; each such occupation requires a verified choice specification.
