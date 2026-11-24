# UI 2.0 — Phase 1 Foundation Completion & Release Gate

**Checkpoint:** BRP UGE v1.21.11 stable remains on `main`. UI2 is a separate, cumulative **Draft PR stack**. This document ends the foundation/refactor runway before the next phase of substantial user-facing UI development (Skills, Powers, Inventory, Item, Wizard, GM tools, Combat, Chat).

## Deliverables by phase

| Phase | Delivery | PR | Automated state | Live state |
| --- | --- | --- | --- | --- |
| 0 | Source baseline, UI audit script, Editorial Notebook 2.0 Design System, screen blueprints, standalone HTML mock and QA matrix | [#9](https://github.com/NetAtirash/brp-uge/pull/9) | Static test coverage included | Browser review not recorded |
| 1A | Client-only default-OFF Preview, semantic tokens and scoped control primitives | [#10](https://github.com/NetAtirash/brp-uge/pull/10) | Source/UI isolation tests included | Not tested in Foundry |
| 1B | Opt-in responsive Character Header, accessible portrait, full personal dossier disclosure | [#11](https://github.com/NetAtirash/brp-uge/pull/11) | Original input/action parity tests included | Not tested in Foundry |
| 1C | Opt-in HP/PP/SAN/FP cards, eight Characteristics with unchanged values and roll actions | [#12](https://github.com/NetAtirash/brp-uge/pull/12) | Source field/action multiset parity tests included | Not tested in Foundry |
| 1D | Opt-in eight-page Navigation and horizontal-only tab strip; primary vertical scroll kept as-is | [#13](https://github.com/NetAtirash/brp-uge/pull/13) | Route/action parity + scroll CSS checks included | Not tested in Foundry |

**Important:** Automated passing tests establish source compatibility and package structure, not that the Foundry window is usable or aesthetically correct. Every human-visible promise remains contingent on real Foundry v14 QA.

## Formal stopping point

The project now has reusable **structural UI components** behind a safe opt-in, but it does **not** yet start Phase 2's rework of Skills/Powers/Inventory components. Phase 2 is deliberately deferred until the following checklist is reviewed and accepted.

## Real Foundry testing checklist (must pass before stable merge)

- [ ] Install the cumulative Phase 1D feature branch in a **separate** Foundry v14 test installation and open a **copied** World with an up-to-date independent Compendium. Do **not** rely on the stable `/latest/` manifest (it still targets v1.21.11).
- [ ] Enable UI 2.0 Foundation Preview in the client settings. Save pending edits, close and reopen each Character Sheet after changing the preview setting.
- [ ] Compare both UI2 ON and OFF for a populated PC and a blank PC. Stable OFF must preserve exactly the old Header, Sidebar and Navigation structure and inputs.
- [ ] Use GM/owner/player/observer access. NPC, Item and Wizard must remain unchanged.
- [ ] Inspect Thai and English labels; Light/Dark contrast at 100%, 125%, 150% zoom and 1200, 900, 680, 480 px sheet widths. Take before/after screenshots.
- [ ] Verify every original personal field saves, including Age, Gender, Player, Culture, Height, Weight, Religion, Description; portrait and Occupation controls still work.
- [ ] Verify resource inputs, recovery, wound treatment, optional SAN/FP, current/maximum and derived values; confirm no double write.
- [ ] Verify Characteristic rolls, age/status modifiers, sharing roll results, and tab navigation to all eight original pages.
- [ ] Check long Skills/Inventory lists and multiple Foundry windows: no overlapping controls, scroll loops or inaccessible save actions.
- [ ] Compare Actor export (or backup) **before and after theme/preview/tab-only interactions**: zero unintended document mutations; intentional edits change only the expected fields.
- [ ] Inspect browser console: no missing partial/Handlebars errors, no CSS invalid-property warnings affecting layout, no application render exceptions.

## Automated gate

From a checkout of the **Phase 1D branch**, use Node 22 (or matching GitHub Actions runner):

~~~sh
node scripts/audit-ui.mjs --json
for test in tests/*.mjs; do node "$test"; done
~~~

The repository CI also checks JS syntax, ZIP integrity and System Manifest. Confirm the current **Phase 1D HEAD** passed its workflow, not an earlier commit.

## Review/merge sequence

1. Review Phase 0 design choices and screenshots; merge PR #9 to `main` only after sign-off.
2. Re-target PR #10 from its original Phase 0 feature base after merging #9, ensure it has no unintended files, and require Foundry v14 QA before merge.
3. Repeat for PR #11, #12 and #13 in order, updating base branches and rerunning CI on each exact merge commit.
4. Maintain Stable v1.21.11 until user approves a preview and completes manual Foundry validation; do not move `/releases/latest/` as part of these Draft PRs.
5. Only after all live UI checks pass begin Phase 2: Skill/Power rows, search/filters, Inventory Items; then later GM/Wizard, NPC/Combat/Chat and controlled CSS consolidation per the [Implementation Plan](IMPLEMENTATION-PLAN.md).

## Structural design debt remaining

- **CSS:** 19 historical stylesheets and thousands of existing forced-priority rules remain in `main`; the four UI2 styles are isolated, **not a full CSS cleanup**. The legacy v1173–v1175 classes are still present for rollback.
- **Scroll:** the original `.sheet-body` and Foundry window remain the vertical scroll source. Horizontal-only navigation is a deliberate first step; real window metrics are required before swapping the vertical owner.
- **Rendering:** HBS partial preloading follows Foundry v14 ApplicationV2 documentation, but a live mount and browser console test are still required.
- **Performance:** no measured render-time improvement is claimed. Record reproducible baseline timings, DOM count and scroll metrics before Phase 2 optimization.
- **Data:** no migration of Rules, Compendium, Actor embedded Items, UUIDs, Specialty records, skill allocations, resource values, or combat logic was attempted.

**Project notice:** Unofficial BRP UGE personal-use project developed with ChatGPT assistance. See bilingual disclaimer in root README.
