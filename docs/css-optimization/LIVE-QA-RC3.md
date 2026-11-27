# Live QA follow-up — RC.3 candidate (not published)

Scope: testing branch only, based on RC.2. No stable merge, no Compendium changes, no new UI direction.

- Occupation Step 4 is split into three explicit stages; counted checkboxes select/deselect concrete eligible skill candidates. Allocation controls only appear in the occupation column for eligible skills.
- Personality uses a bounded checkbox list of concrete skills in the current catalog. The current data-free engine's PERSONALITY_TYPES contains no template-specific allowed skill data; the existing 13-skill rule is preserved. This is not a claim that book-specific Personality eligibility is complete.
- Missing structured Occupation Choice Groups remain a content-data blocker; no rules are inferred from descriptions, and the user can return to the Occupation picker.
- Tooltip ownership follows the Foundry v14 TooltipManager anchor, retained until the next activation. Real transition testing is still required.
- Contrast fixes cover the observed combat status, empty hint and light window title, and checkbox/step affordances. WCAG compliance across the entire UI is not claimed.
- The original seven canonical CSS owners and optimized bytes remain unchanged. One small separately tracked QA stylesheet is appended deterministically to the single delivered stylesheet; historic parity tests verify the baseline prefix and overlay separately. Full runtime SHA intentionally changes; CI builds and checks the complete output. No new runtime CSS request.
- This is a focused interaction and accessibility fix, not a global visual redesign. Release and channel advancement require explicit owner approval.
