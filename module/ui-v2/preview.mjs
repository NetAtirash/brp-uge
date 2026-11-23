/**
 * UI2 Phase 1A opt-in: client-only sheet styling gate.
 *
 * This file intentionally knows nothing about Foundry documents, Actor data
 * updates, resource rules, or sheet rendering. It only toggles a CSS class.
 * Non-character sheets are never opted in.
 */
export const UI2_PREVIEW_SETTING = 'ui2Preview';
export const UI2_ROOT_CLASS = 'brp-ui2';

export function isUI2PreviewEnabled(settings, actorType) {
  if (actorType !== 'character') return false;
  try {
    return settings?.get?.('brp-uge', UI2_PREVIEW_SETTING) === true;
  } catch {
    // Unregistered settings or test environments default to the stable UI.
    return false;
  }
}

export function syncUI2PreviewRoot(element, actorType, enabled) {
  if (!element) return false;
  const root = element.matches?.('.brp-sheet')
    ? element
    : element.querySelector?.('.brp-sheet');
  if (!root?.classList?.toggle) return false;
  const active = actorType === 'character' && enabled === true;
  root.classList.toggle(UI2_ROOT_CLASS, active);
  return active;
}

/** Update only CSS scope of already open Character Sheets (no rerender).
 * Re-rendering an edit form solely to switch a CSS token can lose input focus
 * or submit pending form values, so preview switching is DOM-class only.
 */
export function syncUI2PreviewOpenSheets(apps, enabled) {
  let affected = 0;
  for (const app of apps ?? []) {
    if (app?.constructor?.name !== 'BRPActorSheet') continue;
    if (app.document?.type !== 'character') continue;
    const root = app.element;
    if (!root) continue;
    syncUI2PreviewRoot(root, app.document.type, enabled);
    affected++;
  }
  return affected;
}
