/** Wealth references resolve only to user-created or optional module documents. */
import {getLocalizedName} from './character-tools.mjs';
export function wealthDisplayFromItem(item,lang='th') {return item?getLocalizedName(item,lang):'';}
export async function resolveWealthItem(ref) {
  if(!ref)return null;
  const own=game.items?.contents?.find?.(i=>i.type==='wealth'&&(i.uuid===ref||i.id===ref));
  if(own)return own;
  try {const doc=await fromUuid(ref);return doc?.type==='wealth'?doc:null;}
  catch {return null;}
}
