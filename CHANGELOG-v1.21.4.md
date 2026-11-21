# BRP UGE v1.21.4 — Charcoal Notebook & Occupation Skill Links

## Theme
- Dark Mode now uses neutral black/charcoal paper, borders and cards; red remains only a restrained UI accent.
- Existing ImageGen paper material remains in use with a neutral charcoal wash (no generated tile textures).
- Light Mode remains unchanged.

## Character Creation Wizard
- Occupation Skill reference matching now handles Compendium records whose original module UUID differs from their operational World Pack UUID.
- When finishing the Wizard, linked occupation Skills are embedded on the Actor at their existing base chance even if zero additional points were spent.
- Occupation and personal point allocations remain user-controlled; this does not award points automatically.
- Step 4 shows the number of linked occupation Skills and warns on unresolved references.
- Saving is stopped with a useful error if an Occupation contains missing Skill links, instead of silently leaving a character empty.
- No skills are fabricated when an Occupation has no links, and no Compendium content is bundled.

## Compatibility and notes
- Game System architecture remains data-free. Quick Reference module import still requires the GM to create its World packs explicitly.
- Content modules may contain optional skill choices not yet encoded as machine-readable references. The Wizard only auto-adds skills explicitly linked in `system.skillRefs`; additional choices should be handled by the player according to the Occupation text.
- Automated tests and mocked end-to-end Wizard checks are NOT live Foundry V14 tests.
