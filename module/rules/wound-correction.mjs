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
    if(!next.treated||(!next.firstAidAttempted&&next.treatmentMethod==='firstAid')){
      next.treatmentMethod='';next.treatmentResult='';
    }
    return next;
  });
}
