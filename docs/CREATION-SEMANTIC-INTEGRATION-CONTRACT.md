# BRP UGE — Creation Semantic Integration Contract (RC.9 candidate)
Status: implemented engine candidate; external content conversion and live Foundry v14 acceptance pending. No automatic conversion of RC12 exact keys. This is a versioned contract for the next complete Compendium package; not a runtime book catalog.

## Ownership
- System: schema checks, eligibility, distinctness and count validation, GM settings presentation, read-only diagnostics.
- Content module: stable source UUIDs and book keys, bilingual labels, explicit typed options, source-verified class membership, slot counts and rule evidence.
- World GM: concrete campaign concepts and approved choices. Existing actor Items, allocations, advancement and Flavor Names are not migrated.
- Keep the current occupation-overlay-1.0 and brp-personality-template-v1-proposed envelopes. RC.9 adds optional fields and a new option kind; old engines do not support them. Declare the intended minimum engine in compatibility/release notes; do not claim older engines understand the new kind.

## 1. Option schema
Existing kind values: skill, family, specialty. New: semantic-specialty.
Each new option has familyKey and semantic object. The semantic object accepts only type, conceptKey, context, allowedCanonicalKeys. It requires type OR nonempty allowedCanonicalKeys; all supplied conditions must match. Allowed types are group, region, religion, programming-language. conceptKey is a lowercase ASCII identifier (letters/digits plus . _ : -), max 100 chars, and requires type. context is local-area or range and requires type region. allowedCanonicalKeys is a nonempty unique list of normalized family|specialty identities all belonging to the specified family. The concrete enabled option can match via current key OR stable bookKey. No wildcard, inferred synonyms, or arbitrary Family fallback.

Examples of intended data shape (not a decision on class membership):
```json
{"kind":"semantic-specialty","familyKey":"knowledge","semantic":{"type":"group"}}
{"kind":"semantic-specialty","familyKey":"knowledge","semantic":{"type":"region","context":"local-area"}}
{"kind":"semantic-specialty","familyKey":"knowledge","semantic":{"type":"region","context":"range"}}
{"kind":"semantic-specialty","familyKey":"knowledge","semantic":{"type":"religion"}}
{"kind":"semantic-specialty","familyKey":"firearm","semantic":{"allowedCanonicalKeys":["firearm|pistol","firearm|revolver"]}}
```
Last example is illustrative: content maintainers must certify every allowed key, including the aircraft set, from source evidence. Do not include a class member just because its name sounds similar. For Pilot use the same shape with familyKey pilot and verified pilot keys. Do not make a literal Group, Region, Religion, Handgun, Aircraft or Range dummy Specialty.
A Personality fixed semantic slot may use requirement semantic-specialty, familyKey and semantic with the same shape. This consumes exactly one mandatory choice. Do not alter the 13 slots or +20 bonus.
The option type must not be replaced by a plain family to avoid validation. Each alternative has its own conditions; multiple alternatives in a counted group are unioned, then all applicable group guards are intersected. Insufficient mandatory slots block; unavailable optional alternatives remain visible in diagnostics without blocking a satisfiable group.

## 2. GM classification
In Specialty Management, create or edit a concrete Specialty. Under Campaign classification (optional) select Type and enter a concrete conceptKey; for region optionally check local-area and/or range. Enable the entry and save. For example a GM may define Knowledge (City A) and assign:
```json
{"type":"region","conceptKey":"city-a","contexts":["local-area"]}
```
Metadata lives in World specialtyRegistry overlays (additions, bookOverrides, sourceOverrides). The existing schemaVersion 3 is extended additively; old entries remain unclassified and are never inferred from their names. A name must be a real campaign concept; the engine validates its declared classification, not fictional-world truth. Classification does not change Skill base or progression. Explicitly tagged programming languages are excluded from non-native spoken-language options; Own is excluded by key and stable bookKey. The existing languageRole programming_language guard accepts an explicit source-approved allowlist or GM-tagged programming-language option, never Own. Supply a concrete programming-language choice, not a general Language option.

## 3. Campaign approval for contextual/flexible lists
Add semanticGuards.campaignApprovalKey to a choice group or the associated extendedReview.requirements row. Lowercase ASCII ID, max 100 chars; choose a stable unique identifier for independent approval lists. It is NOT a fixed requirement constraint. The GM opens Specialty Management > Campaign-approved skills, selects a group, checks appropriate entries and saves. The preview contains the source-defined candidates before this campaign filter; only those satisfying the actual plan will ever be eligible. An unset or empty list admits zero choices, not all choices. A source allowedCanonicalKeys filter and a World approval list each independently constrain the identity (including stable book aliases). When a group and its review both contain guards, both are enforced; no group override relaxes a review. Shared IDs deliberately share approvals.
```json
{"semanticGuards":{"excludeAlreadySelected":true,"campaignApprovalKey":"example-courses"}}
```
World storage: specialtyRegistry.campaignApprovals is an object mapping IDs to arrays of canonical identities (standalone skills use trailing |). The GM editor uses stable book keys for book entries. Suggestions/suggested stay advisory; never parse prose to generate eligibility. For era-dependent or "appropriate" clauses, define source candidates and use explicit campaign approval if GM judgment is necessary. No automatic era classifier is supplied because RC12 Skill Items have no era field and the runtime manifest contains no typed era guards. Do not use broad lists to relax exact requirements. A campaign approval filter is an explicit GM decision, not automatic campaign-era detection.

## 4. Required RC13 source work
- Convert the 11 contextual exact occurrences: 2 Knowledge Group, 4 Knowledge Region, 1 Local Area, 1 Range, 1 Religion, 1 Firearm Handgun, 1 Pilot Aircraft. Leave Science Pharmacy unresolved until rule review; no automatic Pharmacology alias.
- Retain verified Natural History and other RC12 fixes, stable UUIDs, all counts and Thai labels.
- Clear the stale Accounting and Psychology unresolvedTokens only after verifying their corrected exact options. Keep Assassin Electronics unresolved until source evidence supports a mapping.
- Review flexible and era-sensitive clauses; use campaignApprovalKey when contextual approval is needed, and preserve advisory text as such. Do not generate source options from prose or add content to system runtime.
- Preserve distinctness across fixed/selected slots and between groups inside each Personality or occupation; Personality and occupation bonuses may legitimately overlap.
- Keep 11 empty weapon skillRef entries and Literacy total-link policy separate pending explicit approval.
- Deliver the complete module ZIP, revised manifest/compatibility and review report. No import macro or partial patch. Revalidate actual packaged DB and JSON parity, all 44 occupations and 4 personalities.

## 5. Acceptance
- Load RC13 in Foundry v14, full package replacement; verify installed packs and creation manifests, fresh World and copied existing World.
- With GM classifications, verify the precise groups allow only matching concrete type/context; unclassified and hidden options excluded. Verify two contexts on one region, wrong conceptKey, source allowlist exclusion, mixed options, stable alias after rename and missing approval.
- Verify non-native language, programming languages, duplicate protection, campaign-appropriate course lists, no forced suggestion, and data preservation.
- Read-only audits: game.brp.auditCreationTemplates() and game.brp.auditSpecialtySources() are optional QA diagnostics, not installation steps. No stable promotion without actual v14 QA.
