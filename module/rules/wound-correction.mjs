/** Explicit correction to one wound record. Never alters current HP or major wound consequences. */
export function correctedWoundRecovery(wounds,id,values,isGM){
  if(isGM!==true)throw new Error('GM permission required');
  const n=values?.recoveryHp;
  if(n===null||n===undefined||String(n).trim()===''||!Number.isSafeInteger(Number(n))||Number(n)<0)throw new Error('Recovered HP must be a nonnegative integer');
  if(typeof values.firstAidAttempted!=='boolean'||typeof values.treated!=='boolean')throw new Error('Invalid treatment state');
  if(!wounds.some(w=>w.id===id))throw new Error('Wound not found');
  return wounds.map(w=>{
    if(w.id!==id)return w;
    const next={...w,firstAidAttempted:values.firstAidAttempted,treated:values.treated,recoveryHp:Number(n)};
    if(next.treated!==Boolean(w.treated)||!next.treated||(!next.firstAidAttempted&&next.treatmentMethod==='firstAid')){
      next.treatmentMethod='';next.treatmentResult='';
    }
    return next;
  });
}

/** Explicit current state, independent of historical roll result and HP gain. */
export function woundTreatmentState(w,th=false){
  if(w?.healed)return {key:'resolved',label:th?'ปิดบาดแผลแล้ว':'Resolved'};
  if(w?.treated)return {key:'treated',label:th?'รักษาสำเร็จ · รอปิดแผล':'Treated · awaiting closure'};
  return {key:'untreated',label:th?'ยังไม่รักษาสำเร็จ':'Not successfully treated'};
}
