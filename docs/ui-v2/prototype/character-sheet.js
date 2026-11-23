/*
 * Standalone design prototype ONLY — no Foundry APIs, network, Actor writes
 * or dice. Interactive controls demonstrate UX concepts, not game mechanics.
 */
'use strict';
(() => {
  const root=document.querySelector('.brp-ui2');
  if(!root)return;
  const html=document.documentElement;
  const tabs=[...root.querySelectorAll('[role="tab"][data-tab]')];
  const panels=[...root.querySelectorAll('[role="tabpanel"]')];
  const rows=[...root.querySelectorAll('.skill-row')];
  const filters=[...root.querySelectorAll('[data-filter]')];
  const search=root.querySelector('#skillSearch');
  const status=root.querySelector('#skillStatus');
  const message=(th,en)=>{status.textContent=html.lang==='en'?en:th;};
  const translate=()=>{
    for(const element of root.querySelectorAll('[data-i18n-th][data-i18n-en]')){
      element.textContent=element.getAttribute(html.lang==='en'?'data-i18n-en':'data-i18n-th');
    }
  };

  const languageButton=root.querySelector('#languageToggle');
  languageButton.addEventListener('click',()=>{
    html.lang=html.lang==='th'?'en':'th';
    languageButton.setAttribute('aria-pressed',String(html.lang==='en'));
    translate();
    message('เปลี่ยนภาษาในต้นแบบเท่านั้น','Prototype language changed; no game setting was written.');
  });

  const themeButton=root.querySelector('#themeToggle');
  themeButton.addEventListener('click',()=>{
    html.dataset.theme=html.dataset.theme==='light'?'dark':'light';
    message('เปลี่ยน Light/Dark ของต้นแบบแล้ว','Prototype Light/Dark changed.');
  });

  const editButton=root.querySelector('#editToggle');
  editButton.addEventListener('click',()=>{
    const edit=root.dataset.edit==='off';
    root.dataset.edit=edit?'on':'off';
    editButton.setAttribute('aria-pressed',String(edit));
    const indicator=root.querySelector('#modeIndicator');
    if(edit){
      indicator.setAttribute('data-i18n-th','โหมดแก้ไข · ดูที่มาของแต้ม');
      indicator.setAttribute('data-i18n-en','Edit preview · point breakdown');
    }else{
      indicator.setAttribute('data-i18n-th','โหมดเล่น · อ่านและทอย');
      indicator.setAttribute('data-i18n-en','Play mode · read and roll');
    }
    translate();
    message('โหมดนี้จำลองการแสดงผล ไม่ได้แก้ข้อมูลตัวละคร','Only the preview layout changed; no character data was edited.');
  });

  const activateTab=(next,moveFocus=false)=>{
    if(!next)return;
    for(const button of tabs){
      const active=button===next;
      button.setAttribute('aria-selected',String(active));
      button.tabIndex=active?0:-1;
    }
    const requested=next.dataset.tab;
    const target=['skills','combat','notes'].includes(requested)
      ?'panel-'+requested:'panel-placeholder';
    for(const panel of panels)panel.hidden=panel.id!==target;
    if(target==='panel-placeholder'){
      const placeholder=root.querySelector('#panel-placeholder');
      placeholder.setAttribute('aria-labelledby',next.id);
      root.querySelector('#placeholderHeading').textContent=next.textContent.trim();
    }
    if(moveFocus)next.focus();
  };
  tabs.forEach((button,index)=>{
    button.addEventListener('click',()=>activateTab(button));
    button.addEventListener('keydown',event=>{
      let nextIndex=index;
      if(event.key==='ArrowRight')nextIndex=(index+1)%tabs.length;
      else if(event.key==='ArrowLeft')nextIndex=(index-1+tabs.length)%tabs.length;
      else if(event.key==='Home')nextIndex=0;
      else if(event.key==='End')nextIndex=tabs.length-1;
      else return;
      event.preventDefault();
      activateTab(tabs[nextIndex],true);
    });
  });

  const refreshSkillRows=()=>{
    const filter=filters.find(button=>button.getAttribute('aria-pressed')==='true')?.dataset.filter||'all';
    const query=String(search.value||'').toLocaleLowerCase().trim();
    let visible=0;
    for(const row of rows){
      const hasFilter=filter==='all'||(filter==='occupation'&&row.dataset.occupation==='true')
        ||(filter==='marked'&&row.dataset.marked==='true');
      const matches=!query||String(row.dataset.search||'').toLocaleLowerCase().includes(query);
      row.hidden=!(hasFilter&&matches);
      if(!row.hidden)visible++;
    }
    message('แสดง '+visible+' จาก '+rows.length+' ทักษะในตัวอย่าง',
      'Showing '+visible+' of '+rows.length+' sample Skills');
  };
  filters.forEach(button=>button.addEventListener('click',()=>{
    for(const item of filters)item.setAttribute('aria-pressed',String(item===button));
    refreshSkillRows();
  }));
  search.addEventListener('input',refreshSkillRows);

  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-demo-action]');
    if(!button)return;
    const action=button.dataset.demoAction;
    if(action==='roll'){
      message('ตัวอย่างปุ่มทอย '+(button.dataset.rollLabel||'')+' — ไม่มีการทอยเต๋าจริง',
        'Example '+(button.dataset.rollLabel||'')+' roll — no real dice are rolled.');
    }else if(action==='wizard'){
      message('Wizard ยังไม่อยู่ในขอบเขต Prototype นี้','Wizard is outside this prototype scope.');
    }else if(action==='compendium'){
      message('Compendium ไม่ถูกโหลดใน Prototype นี้','No Compendium is loaded in this prototype.');
    }else if(action==='add'){
      message('ตัวอย่างปุ่มเพิ่มทักษะ — ไม่สร้าง Item','Example Add Skill action — no Item created.');
    }
  });
  translate();
  activateTab(tabs[0]);
  refreshSkillRows();
})();
