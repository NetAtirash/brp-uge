# Full-package testing and external creation data

## Required development/testing workflow

Every testing release contains a complete Game System ZIP and its manifest; no partial patches for the tester. Install the system via the existing Testing Manifest URL after removing the previous system version through Setup. Keep the same system ID. Back up test World and package first; never delete World data. Install Compendium by replacing the entire module directory while Foundry is stopped, with a complete matching module package. No manual JSON imports, file-by-file overlays or macro prerequisites. Restart, enable the module, and test in a copied World. For clean installation tests also use a fresh World.

## Module package contract

Module ID: brp-uge-compendium. The package root must contain module.json, all its packs/assets, and both JSON manifests:

- data/creation/personality-4-book-templates.json — schemaVersion brp-personality-template-v1-proposed
- data/creation/occupations-44-staged-choice-groups.json — schemaVersion occupation-overlay-1.0

Ship both with the same module version and preserve stable Skill/Occupation IDs. The engine reads both from the active module on Wizard load; file requests bypass browser cache. Missing or invalid files fail closed for module-backed occupations and standard Personality. No fallback to legacy World-imported book data; those old settings are not automatically deleted. Custom GM-approved Personality and Specialty Registry remain World data. Actor-owned Items and existing points are not migrated by a package replacement.

The engine exposes game.brp.importCreationTemplates only for explicit GM-approved customPersonalities; no standard-content imports. The optional read-only diagnostic game.brp.auditCreationTemplates() returns module source/version, load errors, and all template readiness checks; it is not an installation step.

Both manifests must be included in the complete Compendium ZIP by its maintainer. The Game System release does not include these content files. Remaining unresolved source tokens and programming-language constraints are still validated, not bypassed.

## Release gate

Verify matching versions, full ZIP integrity, manifest destination and CI before publishing. No main merge or stable release changes without explicit approval. The testing channel advances only after approved release verification. Foundry VTT v14 live QA is still required.
