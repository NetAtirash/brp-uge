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

/** Follow the actual Foundry v14 TooltipManager anchor, not pointer exit.
 * The last owner remains set while the tooltip fades; the next activation
 * determines its own owner, including non-BRP tooltips. */
export function syncTooltipOwner(manager,root){
  const anchor=manager?.element;
  if(anchor&&root?.dataset)root.dataset.brpTooltip=anchor.closest?.('.brp-uge')?'true':'false';
  return root?.dataset?.brpTooltip;
}
export function installTooltipThemeSync(manager=globalThis.game?.tooltip,root=globalThis.document?.documentElement,Observer=globalThis.MutationObserver){
  if(!manager?.tooltip||!root||!Observer)return null;
  const sync=()=>syncTooltipOwner(manager,root);
  const observer=new Observer(sync);
  observer.observe(manager.tooltip,{attributes:true,attributeFilter:['class','style'],childList:true,subtree:true});
  sync();
  return observer;
}
