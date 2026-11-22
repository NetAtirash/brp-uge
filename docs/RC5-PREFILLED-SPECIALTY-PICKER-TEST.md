# BRP UGE v1.21.11-rc.5 — Pre-rendered Specialty Choices

## Reason for RC5

RC4 repaired World setting refresh but the Foundry Character Creation Wizard still showed an empty second Specialty picker for a Family such as Art even while GM Specialty Management showed 9/9 enabled.

Previously, the Handlebars Wizard template rendered an **empty** `<select>` and the `_onRender` handler had to inject `new Option(...)` elements. This created a fragile gap between valid Registry data and the visible menu.

## Structural UI fix

- The Wizard `_prepareContext` now creates an effective source-of-truth `wizardSpecialtyFamilies` model containing each Family and all enabled Specialty options together, and an Occupation variant with authorized Family options.
- Handlebars pre-renders the complete native `<option>` list within a separate `<select>` for each eligible Family. The UI event handler only shows/enables the select for the active Family; it no longer creates or replaces option nodes.
- Personal and Occupation selectors use exactly the same GM World Registry data, with bilingual labels.
- The Wizard displays a **GM-approved Specialty total** and a **Refresh** button that rescans installed Skills + World settings WITHOUT replacing the skill catalog or the user's draft skill points.
- The number next to each Family, e.g. `Art (9)`, shows the real approved Specialty count the Wizard received. If the count is zero, this is a content/settings load issue rather than a native select rendering failure.
- New offline tests confirm GM Art Writing/Songwriting choices appear in the actual render model in TH/EN and that no runtime Option injection remains.

## Install Preview

After the RC5 Publish workflow succeeds, use Foundry Setup -> Game Systems -> Install System with:

~~~text
https://github.com/NetAtirash/brp-uge/releases/download/v1.21.11-rc.5/system.json
~~~

Use a copied World and ideally a separate Foundry User Data directory. The system package uses the same `brp-uge` ID as Stable; RC4 preview may be pinned to its own manifest. Back up test World data first, and refresh Foundry/browser after updating so old cached application scripts are not in use. Do NOT merge PR #8 or replace latest stable based on this pre-release.

## In-World smoke test

1. Verify Game System version `1.21.11-rc.5` on Foundry v14 and the updated independent Compendium RC5 module is enabled.
2. Open GM Specialty Management; verify Art source template exists and desired options are Enabled; click Save, close and reopen to confirm World settings persisted.
3. On Character Creation Wizard step 4, locate the personal Specialty chooser. It should state `GM-approved Specialties: N`, and the Skill Family dropdown should show `Art (9)` if nine Art variants are enabled.
4. Pick Art and check that the Specialty dropdown has the native pre-rendered options including Writing and Songwriting. Add Writing, confirm it appears in skill allocation, spend Personal points.
5. In an Occupation choice group allowing Art, pick the Art Family and observe the same set of choices. Confirm only selected specialty gains eligibility for Occupational points.
6. Keep Wizard open, add a new Art Specialty in GM Settings, Save. Check the World setting listener refreshes the Wizard; or click Refresh to force reloading installed skill sources while retaining the current draft.
7. Hide a variant in World Settings; confirm it is not available for *new selection* but existing actor-owned Skills remain unchanged.
8. Test Light and Dark modes, Thai/English, Player and GM permissions, and complete character creation on a disposable Actor.

## Diagnostic when still empty

Compare the number shown beside `Art` in the Wizard to `Art`'s enabled count in Specialty Management. If the two disagree, record both screens after a complete Foundry browser reload. Browser Console checks (GM only):

~~~js
const registry=JSON.parse(game.settings.get('brp-uge','specialtyRegistry'));
console.log('World Art settings',registry.families?.art);
console.log('Rendered Art options',[...document.querySelectorAll('[data-personal-family-specialties="art"] option')].map(o=>({value:o.value,text:o.textContent})));
~~~

These checks only print World configuration and rendered labels. They do not mutate World data.

## Limitations

GitHub Actions verify syntax, offline regression and package manifest, not Foundry's live DOM rendering. RC5 remains a prerelease and stable Latest stays unchanged until real Foundry v14 checks pass.
