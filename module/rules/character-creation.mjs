/** BRP Universal Game Engine (ORC) character creation, pp. 10–17 and 22–23.
 * Pure rule helpers; rulebook defaults are separate from GM optional switches.
 * These apply to NEW wizard allocations and never silently rewrite existing Actors.
 */
export const POWER_LEVELS = Object.freeze({normal:0, heroic:1, epic:2, superhuman:3});
export const PROFESSION_POINTS = Object.freeze({normal:250, heroic:325, epic:400, superhuman:500});
export const EDU_MULTIPLIER = Object.freeze({normal:20, heroic:25, epic:30, superhuman:40});
export const OLDER_AGE_BONUS = Object.freeze({normal:0, heroic:20, epic:30, superhuman:40});
export const PERSONAL_MULTIPLIER_OPTION = Object.freeze({normal:10, heroic:15, epic:20, superhuman:25});
export const CREATION_SKILL_CAP = Object.freeze({normal:75, heroic:90, epic:101, superhuman:Infinity});
export const POINT_BUY_BUDGET = Object.freeze({normal:24, heroic:36, epic:48, superhuman:60});
export const PERSONALITY_TYPES = Object.freeze({
  none: {en:'None', th:'ไม่ใช้กฎเสริม Personality', keys:[]},
  brutal: {en:'Brutal', th:'ใช้กำลัง (Brutal)', keys:[]},
  skilled: {en:'Skilled', th:'ชำนาญการ (Skilled)', keys:[]},
  cunning: {en:'Cunning', th:'เจ้าเล่ห์ (Cunning)', keys:[]},
  charming: {en:'Charming', th:'มีเสน่ห์ (Charming)', keys:[]}
});
export function categoryBonusPreview(c,category,mode='standard',useEdu=false) {
  if(mode==='none')return 0;
  const p={combat:['dex',['int','str'],null],communication:['int',['pow','cha'],null],
    manipulation:['dex',['int','str'],null],mental:['int',['pow',...(useEdu?['edu']:[])],null],
    perception:['int',['pow','con'],null],physical:['dex',['str','con'],'siz']}[category];
  if(!p)return 0;
  const v=k=>Number(c[k]??10);
  if(mode==='simple')return Math.ceil(v(({combat:'dex',communication:'cha',manipulation:'dex',mental:'int',perception:'pow',physical:'str'})[category])/2);
  const half=x=>x<0?-Math.floor(-x/2):Math.floor(x/2);
  return (v(p[0])-10)+p[1].reduce((sum,k)=>sum+half(v(k)-10),0)-(p[2]?v(p[2])-10:0);
}
export function generationFormula(key, method='rolled') {
  if (key === 'edu') return '2d6+6'; // optional EDU, p.10
  if (method === 'heroic_roll') return '2d6+6'; // Higher Starting Characteristics option, p.10
  return ['siz','int'].includes(key) ? '2d6+6' : '3d6';
}
/** Rulebook p.10: the standard rolled method permits moving up to three
 * starting characteristic points between characteristics (no free increase).
 * Keep the rolled baseline so the user's later allocations remain auditable.
 */
export function rolledRedistribution(baseline, current, useEdu=false) {
  if(!baseline)return {moved:0,balanced:true,valid:true};
  const keys=['str','con','siz','int','pow','dex','cha',...(useEdu?['edu']:[])];
  const deltas=keys.map(key=>Number(current?.[key]??10)-Number(baseline?.[key]??10));
  const moved=deltas.reduce((sum,n)=>sum+Math.max(0,n),0);
  const balanced=deltas.reduce((sum,n)=>sum+n,0)===0;
  return {moved,balanced,valid:balanced&&moved<=3};
}
export function pointBuyCost(key) { return ['dex','int','pow','edu'].includes(key) ? 3 : 1; }
export function pointBuySpent(chars, useEdu=false) {
  const keys = ['str','con','siz','int','pow','dex','cha', ...(useEdu ? ['edu'] : [])];
  return keys.reduce((sum,key)=>sum+(Number(chars[key]??10)-10)*pointBuyCost(key),0);
}
export function ageProfessionDelta(age, ageReference, level='normal') {
  const bonus=OLDER_AGE_BONUS[level]??0;
  const a=Number(age), ref=Number(ageReference);
  if (!Number.isFinite(a) || a<0 || !Number.isFinite(ref) || ref<18) return 0;
  return Math.floor(Math.max(0,a-ref)/10)*bonus - Math.max(0,18-a)*bonus;
}
export function youthCharacteristicLoss(age, ageReference) {
  const a=Number(age),ref=Number(ageReference);
  return Number.isFinite(a)&&Number.isFinite(ref)&&ref>=18 ? Math.max(0,Math.floor(ref)-Math.floor(a)) : 0;
}
export function eduAgeBonus(age, ageReference) {
  const a=Number(age),ref=Number(ageReference);
  return Number.isFinite(a)&&Number.isFinite(ref)&&ref>=18 ? Math.floor(Math.max(0,a-ref)/10) : 0;
}
export function creationBudgets({level='normal',useEdu=false,occupationBudgetMethod='fixed',edu=10,int=10,age=null,ageReference=null,increasedPersonal=false}={}) {
  const professionBase=useEdu && occupationBudgetMethod==='edu' ? Math.max(0,Number(edu))*EDU_MULTIPLIER[level] : PROFESSION_POINTS[level];
  const ageAdjustment=ageProfessionDelta(age,ageReference,level);
  const personalMult=increasedPersonal ? PERSONAL_MULTIPLIER_OPTION[level] : 10;
  return {professionBase,ageAdjustment,profession:Math.max(0,professionBase+ageAdjustment),personal:Math.max(0,Number(int))*personalMult};
}
export function validateCreation({characteristics={},useEdu=false,occupationBudgetMethod='fixed',age=null,ageReference=null,level='normal',method='rolled',rolledBasis=null,professionSpent=0,personalSpent=0,increasedPersonal=false,professionEligible=true}={}) {
  const errors=[]; const warnings=[];
  const ch=characteristics;
  const budget=creationBudgets({level,useEdu,occupationBudgetMethod,edu: Number(ch.edu??10)+ (useEdu?eduAgeBonus(age,ageReference):0),int:ch.int,age,ageReference,increasedPersonal});
  const spent=pointBuySpent(ch,useEdu);
  if(method==='point_buy' && spent>POINT_BUY_BUDGET[level]) errors.push(`Point-buy exceeds budget (${spent}/${POINT_BUY_BUDGET[level]})`);
  if(method!=='point_buy' && rolledBasis){
    const redistributed=rolledRedistribution(rolledBasis,ch,useEdu);
    if(!redistributed.valid)errors.push(`Rolled characteristics: move at most 3 points, without changing their total (moved ${redistributed.moved})`);
  }
  if(Object.values(ch).some(n=>!Number.isFinite(Number(n))||Number(n)<1||Number(n)>21)) {
    errors.push('Starting characteristics must be within the BRP creation limit (1–21), unless the GM grants an exception');
  }
  if(professionSpent>budget.profession) errors.push(`Occupation points exceed budget (${professionSpent}/${budget.profession})`);
  if(personalSpent>budget.personal) errors.push(`Personal points exceed budget (${personalSpent}/${budget.personal})`);
  if(!professionEligible) errors.push('Occupation points can only be assigned to an occupational skill');
  if(useEdu && Number(age)<Number(ch.edu)+5) warnings.push('EDU option: starting age should be at least EDU + 5 (GM approval required)');
  if(Number.isFinite(Number(age))&&Number(age)<18) warnings.push('Young character: age penalties apply under the age-18 rule (p.10)');
  return {budget,spent,errors,warnings};
}
