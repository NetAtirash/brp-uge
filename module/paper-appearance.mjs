/** BRP UGE: presentation-only, per-client paper palette. No gameplay data is modified. */
export const PAPER_THEMES = Object.freeze({light:'Light — Character Notebook', dark:'Dark — Night Notebook'});
export const DEFAULT_PAPER_THEME = 'light';
export function normalizePaperTheme(value) { return value === 'dark' ? 'dark' : 'light'; }
export function currentPaperTheme(settings = globalThis.game?.settings) {
  try { return normalizePaperTheme(settings?.get?.('brp-uge','paperTheme')); }
  catch { return DEFAULT_PAPER_THEME; }
}
export function applyPaperTheme(settings = globalThis.game?.settings, root = globalThis.document?.documentElement) {
  const theme = currentPaperTheme(settings);
  if (root?.dataset) root.dataset.brpTheme = theme;
  return theme;
}
