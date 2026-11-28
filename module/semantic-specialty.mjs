/** Campaign classifications, not a source catalog. No inferred labels or book aliases. */
export const SEMANTIC_TYPES=Object.freeze(['group','region','religion','programming-language']);
export const SEMANTIC_CONTEXTS=Object.freeze(['local-area','range']);
const token=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9_.:-]{0,99}$/.test(v);
const key=v=>typeof v==='string'&&/^[^|]+\|[^|]+$/.test(v)&&v===v.trim()&&v===v.toLowerCase();
const own=(o,k)=>Object.hasOwn(o,k);
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function readSemanticMetadata(value){
  if(!object(value)||!SEMANTIC_TYPES.includes(value.type)||!token(value.conceptKey))return null;
  if(Object.keys(value).some(k=>!['type','conceptKey','contexts'].includes(k)))return null;
  const contexts=value.contexts??[];
  if(!Array.isArray(contexts)||contexts.some(c=>!SEMANTIC_CONTEXTS.includes(c))||new Set(contexts).size!==contexts.length||contexts.length&&value.type!=='region')return null;
  return {type:value.type,conceptKey:value.conceptKey,contexts:[...contexts].sort()};
}
export function validSemanticRequirement(value,family){
  if(!object(value)||Object.keys(value).some(k=>!['type','conceptKey','context','allowedCanonicalKeys'].includes(k)))return false;
  if(!own(value,'type')&&!own(value,'allowedCanonicalKeys'))return false;
  if(own(value,'type')&&!SEMANTIC_TYPES.includes(value.type))return false;
  if(own(value,'conceptKey')&&(!value.type||!token(value.conceptKey)))return false;
  if(own(value,'context')&&(value.type!=='region'||!SEMANTIC_CONTEXTS.includes(value.context)))return false;
  if(own(value,'allowedCanonicalKeys')&&(!Array.isArray(value.allowedCanonicalKeys)||!value.allowedCanonicalKeys.length||new Set(value.allowedCanonicalKeys).size!==value.allowedCanonicalKeys.length||!value.allowedCanonicalKeys.every(k=>key(k)&&k.split('|')[0]===family)))return false;
  return true;
}
export function semanticMatches(requirement,family,option){
  if(!validSemanticRequirement(requirement,family)||!option||option.hidden||option.review||option.state!=='enabled')return false;
  const identity=[family+'|'+option.key,...(option.bookKey?[family+'|'+option.bookKey]:[])];
  if(requirement.allowedCanonicalKeys&&!requirement.allowedCanonicalKeys.some(k=>identity.includes(k)))return false;
  if(!requirement.type)return true;
  const meta=readSemanticMetadata(option.semantic);
  return !!meta&&meta.type===requirement.type&&(!requirement.conceptKey||meta.conceptKey===requirement.conceptKey)&&(!requirement.context||meta.contexts.includes(requirement.context));
}
export function semanticInstruction(requirement,familyLabel,lang='en'){
  const th=lang==='th',r=requirement||{};
  const names={group:['กลุ่มสังคม / วัฒนธรรม','Group'],region:['ภูมิภาค','Region'],religion:['ศาสนา','Religion'],'programming-language':['ภาษาคอมพิวเตอร์','Programming language'],'local-area':['พื้นที่ท้องถิ่น','Local area'],range:['พื้นที่เลี้ยงสัตว์','Range']};
  const label=k=>names[k]?.[th?0:1]||k;
  const parts=[familyLabel,r.type&&label(r.type),r.context&&label(r.context),r.conceptKey].filter(Boolean);
  return parts.join(' · ')+(r.type?(th?' — GM: เพิ่มหรือจัดประเภทความเชี่ยวชาญจริง ระบุรหัสบริบท และเปิดให้เลือกในจัดการความเชี่ยวชาญ':' — GM: add or classify a concrete specialty, set a concept key and enable it in Specialty Management'):(th?' — เปิดใช้รายการที่ได้รับอนุญาตจากข้อมูลต้นทาง':' — Enable a source-approved specialty'))+(r.allowedCanonicalKeys?' ['+r.allowedCanonicalKeys.join(', ')+']':'');
}

export function validCampaignApprovalKey(value){return token(value)&&!['constructor','prototype','__proto__'].includes(value);}
export function readCampaignApprovals(raw){
  if(!object(raw))return {};
  return Object.fromEntries(Object.entries(raw).filter(([id,keys])=>validCampaignApprovalKey(id)&&Array.isArray(keys)).map(([id,keys])=>[id,[...new Set(keys.filter(k=>typeof k==='string'&&/^[^|]+\|[^|]*$/.test(k)&&k===k.trim()&&k===k.toLowerCase()))]]));
}
export function campaignGuard(guard,approvals){
  if(!guard.campaignApprovalKey)return guard;
  const allowed=Object.hasOwn(approvals||{},guard.campaignApprovalKey)?approvals[guard.campaignApprovalKey]:[];
  const keys=Array.isArray(allowed)?allowed:[];
  return {...guard,campaignAllowedCanonicalKeys:keys};
}

export function matchesCanonicalAllowlists(guard,identities){
  return [guard.allowedCanonicalKeys,guard.campaignAllowedCanonicalKeys].every(keys=>!Array.isArray(keys)||keys.some(k=>identities.includes(k)));
}
