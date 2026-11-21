/** BRP UGE data-source adapter. This system ships no rules/items/compendia.
 * World documents and installed, accessible Item/Actor packs are the only sources.
 * The adapter does not create packs or mutate any source document.
 */
export const LIBRARY_CATEGORIES = Object.freeze({
  skills:['skill'], weapons:['weapon','shield'], armor:['armor'], powers:['power'],
  gear:['gear'], passions:['passion'], actors:['character','npc'],
  occupations:['occupation'], wealth:['wealth'], statuses:['status']
});

function compatiblePack(pack) {
  if (!['Item','Actor'].includes(pack?.documentName)) return false;
  // Foundry allows packs from any module that targets this active game system.
  const target = pack.metadata?.system;
  return !target || target === 'brp-uge';
}

/** A source reference is always the document's real UUID. */
export async function getLibraryDocuments({types=null,includeWorld=true,includePacks=true,includeActors=false}={}) {
  const wanted=types ? new Set(types) : null;
  const docs=new Map();
  const add=(doc)=>{
    if (!doc?.uuid || !doc.type || (wanted && !wanted.has(doc.type))) return;
    if (doc.documentName==='Actor' && !includeActors) return;
    docs.set(doc.uuid,doc);
  };
  if (includeWorld) {
    for(const doc of game.items?.contents??[]) add(doc);
    if (includeActors) for (const doc of game.actors?.contents??[]) add(doc);
  }
  if(includePacks) for(const pack of game.packs?.values?.()??[]) {
    if (!compatiblePack(pack)) continue;
    if (pack.documentName==='Actor' && !includeActors) continue;
    try {for(const doc of await pack.getDocuments()) add(doc);}
    catch(error){ console.warn('BRP-UGE | Cannot read optional content pack',pack.collection,error); }
  }
  return [...docs.values()];
}

export function documentToEmbeddedItem(doc) {
  if (doc?.documentName !== 'Item' || typeof doc?.toObject !== 'function') return null;
  const copy=foundry.utils.deepClone(doc.toObject());
  delete copy._id; delete copy.folder; delete copy.pack;
  copy.flags??={};copy.flags.core??={};
  if(doc.uuid){
    copy.flags['brp-uge']??={};
    // A module Item imported into a World pack often keeps the module's old
    // sourceId. Retain that as provenance, but use the *live* UUID for links.
    const previous=copy.flags.core.sourceId;
    if(previous && previous !== doc.uuid) copy.flags['brp-uge'].originalSourceUuid ||= previous;
    copy.flags.core.sourceId=doc.uuid;
    copy.flags['brp-uge'].sourceUuid=doc.uuid;
    copy.flags['brp-uge'].liveDocumentUuid=doc.uuid;
  }
  return copy;
}

export async function getLibraryChoices(type, {includeWorld=true,includePacks=true}={}) {
  return getLibraryDocuments({types:[type],includeWorld,includePacks});
}
