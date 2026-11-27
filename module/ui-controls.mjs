/** Uniform affordances across Actor/NPC/Item/Wizard forms.
 * The DOM annotations are presentation-only and never mutate form values. */
export function applyBRPControlLanguage(root){
  const th = globalThis.game?.settings?.get?.('brp-uge','uiLanguage') !== 'en';
  if(!root?.querySelectorAll)return;
  for(const el of root.querySelectorAll('input:not([type="hidden"]),select,textarea')){
    if(el.type==='checkbox'||el.type==='radio'){
      el.dataset.brpControl='choice';continue;
    }
    el.dataset.brpControl=(el.readOnly||el.disabled)?'readout':'input';
    if(!el.readOnly&&!el.disabled&&el.type!=='search')el.title ||= (el.closest('label')?.textContent||'').trim().slice(0,80);
  }
  // Native title acts as a reliable fallback when a Foundry tooltip provider
  // is not mounted (pop-out applications, embedded sheets, preview windows).
  for(const el of root.querySelectorAll('[data-tooltip]')) {
    const message=String(el.dataset.tooltip||'').trim();
    if(message && !el.title)el.title=message.slice(0,500);
  }
  for(const btn of root.querySelectorAll('button')){
    const action=String(btn.dataset.action||'');
    if(/^shareEntry$/i.test(action)){
      btn.dataset.brpControl='share';
      btn.title ||= th ? 'ส่งข้อมูลลงแชท' : 'Share details';
    }else if(/^roll|check|resist|attack|cast|exp/i.test(action)||btn.matches('.roll-char-compact,.skill-roll-icon,[data-roll]')){
      btn.dataset.brpControl='roll';
      btn.title ||= th ? 'ทอยลูกเต๋า' : 'Roll';
    }else if(/edit|create|delete|remove|add|toggle|update|allocate|set/i.test(action)){
      btn.dataset.brpControl='edit-action';
    }else if(/switchTab|nextStep|prevStep/i.test(action)){
      btn.dataset.brpControl='navigation';
    }else{
      btn.dataset.brpControl='action';
    }
    if(!btn.title){
      const label=String(btn.getAttribute('aria-label')||btn.dataset.tooltip||btn.innerText||btn.textContent||'').trim().replace(/\s+/g,' ');
      btn.title=label.slice(0,160)||action.replace(/([A-Z])/g,' $1').trim();
    }
  }
  for(const el of root.querySelectorAll('[data-action]:not(button)')) {
    if(el.title)return;
    const label=String(el.dataset.tooltip||el.getAttribute('aria-label')||el.textContent||'').trim().replace(/\s+/g,' ');
    if(label)el.title=label.slice(0,160);
  }
}
