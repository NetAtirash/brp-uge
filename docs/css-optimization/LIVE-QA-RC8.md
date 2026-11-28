# RC8 — Live QA follow-up
RC7 + RC11 checklist: 33 pass, 0 fail, 1 untested as submitted; screenshots reopen Specialty disabled-row behavior and wound-status presentation.
- RC11 source contains disabled generic Play Instrument with Thai explanatory parentheses. Keep hidden/review state; no implicit activation on rename, validate correct language on explicit enable, and preserve explicitly approved concrete overrides. Add concrete instrument via GM registry without altering the Compendium. No automatic setting migration.
- Remove wealth badges from occupation list (only Clerk showed one); no wealth rule/data changes. Use read-only Personality text for completed actors.
- Targeted contrast corrections for age and occupation tag. Keep historical CSS baseline. Wound picker uses consistent chevron; native datalist behavior remains, test in Foundry client/browser.
- Show explicit treated/untreated/resolved independent of last roll. A GM change to treatment state clears stale result rather than inventing a roll result; HP, closure and major effects remain unchanged. Group wound controls on same row, wrap as a unit when space is limited.
- Existing Actor data preservation still untested. No Compendium changes or global redesign. Candidate only; full release after approval.
