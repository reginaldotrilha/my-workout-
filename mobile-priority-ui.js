// Prioritizes frequent actions on iPhone; read-only DOM restructuring.
// No changes to treino_v1, meal entries, exercise identities, plans or nutritional goals.
(function(){
  const openState={scanner:false,today:false,suggestions:false,energy:false,history:false,recovery:false};
  const create=(tag,cls,text)=>{
    const x=document.createElement(tag);
    if(cls)x.className=cls;
    if(text!==undefined)x.textContent=text;
    return x;
  };
  function section(key,label,nodes){
    const wrap=create('details','food-ux-section');
    wrap.open=Boolean(openState[key]);
    const heading=create('summary','',label),body=create('div','food-ux-content');
    nodes.filter(Boolean).forEach(n=>body.appendChild(n));
    wrap.append(heading,body);
    wrap.addEventListener('toggle',()=>{openState[key]=wrap.open});
    return wrap;
  }
  function directCard(root,title){
    return [...root.children].find(n=>n.classList?.contains('ex')&&
      n.querySelector(':scope > h3')?.textContent.trim()===title)||null;
  }
  function foodSummary(){
    const today=dayKey(Date.now()),items=(db.meals||[]).filter(m=>dayKey(m.t)===today);
    const T=sumOf(items),root=create('div','ex food-ux-daily');
    const header=create('div','food-ux-daily-top'),label=create('h3','','Hoje');
    const total=create('strong','',Math.round(T.k)+' / '+GOAL.k+' kcal');
    header.append(label,total);root.appendChild(header);
    const macros=create('div','food-ux-macro-line');
    ['P '+Math.round(T.p)+'/'+GOAL.p+' g','C '+Math.round(T.c)+'/'+GOAL.c+' g',
      'G '+Math.round(T.g)+'/'+GOAL.g+' g'].forEach(t=>macros.appendChild(create('span','',t)));
    root.appendChild(macros);
    const track=create('div','food-ux-progress'),fill=create('i');
    fill.style.width=Math.max(0,Math.min(100,T.k/GOAL.k*100))+'%';
    track.appendChild(fill);root.appendChild(track);return root;
  }
  function compactFood(){
    const root=document.getElementById('vComida');
    if(!root||root.querySelector('.food-ux-daily'))return;
    const quick=root.querySelector(':scope > .food-quick');
    if(!quick)return;
    const mainCard=[...root.children].find(n=>n.classList?.contains('ex')&&
      !n.classList.contains('food-quick')&&n.querySelector('.bar'));
    const energy=root.querySelector(':scope > .energy-card');
    const health=root.querySelector(':scope > .health-sync-card');
    const scan=root.querySelector(':scope > .barcode-card');
    const smart=root.querySelector(':scope > .smart-food-card');
    const aware=root.querySelector(':scope > .meal-aware-card');
    const selected=root.querySelector(':scope > .selected-food');
    const editor=root.querySelector(':scope > .food-editor');
    const template=root.querySelector(':scope > .template-editor');
    const mealEditor=root.querySelector(':scope > .meal-editor');
    const today=directCard(root,'Hoje');
    const history=root.querySelector(':scope > .food-history-card');
    const past=directCard(root,'Dias anteriores');

    // Keep add/edit forms adjacent to the food search rather than below the entire list.
    const results=quick.querySelector('.food-results');
    [editor,template,selected].filter(Boolean).forEach(form=>{
      if(results)results.insertAdjacentElement('beforebegin',form);
      else quick.appendChild(form);
    });
    const hdr=quick.querySelector(':scope > .ex-h');
    if(hdr){
      const title=hdr.querySelector('h3');
      if(title)title.textContent='Registrar alimento';
      if(scan){
        const scanBtn=create('button','ghost small food-ux-scanner-button','📷 Scanner');
        scanBtn.type='button';
        hdr.appendChild(scanBtn);
        // Assign the handler after the disclosure is in the document.
        scanBtn.onclick=()=>{
          const group=root.querySelector('.food-ux-scanner');
          if(!group)return;
          group.open=!group.open;
          openState.scanner=group.open;
          if(group.open)requestAnimationFrame(()=>group.scrollIntoView({block:'nearest',behavior:'smooth'}));
        };
      }
    }

    root.appendChild(foodSummary());
    root.appendChild(quick);

    if(scan){
      const scannerGroup=section('scanner','Escanear produto',[scan]);
      scannerGroup.classList.add('food-ux-scanner');
      root.appendChild(scannerGroup);
    }
    if(today){
      const count=(db.meals||[]).filter(m=>dayKey(m.t)===dayKey(Date.now())).length;
      const before=openState.today;
      if(mealEditor)openState.today=true;
      root.appendChild(section('today','Refeições de hoje ('+count+')',[mealEditor,today]));
      if(mealEditor)openState.today=before;
    }else if(mealEditor)root.appendChild(mealEditor);
    if(smart||aware){
      root.appendChild(section('suggestions','Sugestões de refeições',[aware,smart]));
    }
    if(energy||health||mainCard){
      root.appendChild(section('energy','Balanço energético e metas',[energy,health,mainCard]));
    }
    if(history||past){
      root.appendChild(section('history','Histórico de alimentação',[history,past]));
    }
    root.classList.add('mobile-priority');
  }
  function compactRecovery(){
    const root=document.getElementById('vProg');
    if(!root||root.querySelector('.recovery-ux-section'))return;
    const card=root.querySelector(':scope > .recovery-card');
    if(!card)return;
    const group=create('details','recovery-ux-section');
    group.open=Boolean(openState.recovery);
    const summary=create('summary','','Prontidão muscular · ver detalhes');
    group.appendChild(summary);
    const desc=create('div','recovery-ux-hint');
    const muscles=[...card.querySelectorAll('.muscle-recovery-row h4')]
      .slice(0,3).map(h=>h.textContent.trim());
    desc.textContent=(muscles.length?muscles.join(' · '):'Recuperação por músculo')+
      ' · estimativa, não medição fisiológica';
    group.appendChild(desc);
    const body=create('div','recovery-ux-body');
    body.appendChild(card);
    group.appendChild(body);
    group.addEventListener('toggle',()=>{openState.recovery=group.open});
    const dashboard=root.querySelector(':scope > .recomp-card');
    if(dashboard){
      dashboard.insertAdjacentElement('afterend',group);
    }else{
      // In Strength mode, place the recovery breakdown after the strength records.
      root.appendChild(group);
    }
  }
  if(typeof window.renderComida==='function'){
    const previous=window.renderComida;
    window.renderComida=function(){
      const result=previous.apply(this,arguments);
      requestAnimationFrame(()=>requestAnimationFrame(compactFood));
      return result;
    };
  }
  if(typeof window.renderProg==='function'){
    const previous=window.renderProg;
    window.renderProg=function(){
      const result=previous.apply(this,arguments);
      requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(
        ()=>requestAnimationFrame(compactRecovery))));
      return result;
    };
  }
  const css=document.createElement('style');
  css.textContent="\n/* The content remains available via native details; no stored data is hidden permanently. */\n#vComida.mobile-priority .food-ux-daily{padding:11px 12px;margin-bottom:9px}\n#vComida.mobile-priority .food-ux-daily-top{display:flex;justify-content:space-between;gap:8px;align-items:baseline}\n#vComida.mobile-priority .food-ux-daily h3{font-size:19px;margin:0}\n#vComida.mobile-priority .food-ux-daily strong{font:700 22px \"Barlow Condensed\",system-ui,sans-serif;white-space:nowrap}\n#vComida.mobile-priority .food-ux-macro-line{display:flex;flex-wrap:wrap;gap:7px 13px;margin:5px 0 9px;color:var(--mute);font-size:12px}\n#vComida.mobile-priority .food-ux-progress{height:6px;border-radius:8px;background:var(--line);overflow:hidden}\n#vComida.mobile-priority .food-ux-progress>i{display:block;height:100%;background:var(--acc);border-radius:8px}\n#vComida.mobile-priority .food-quick{margin-bottom:9px;padding:11px 12px}\n#vComida.mobile-priority .food-quick .ex-h{align-items:center;flex-wrap:wrap;gap:7px}\n#vComida.mobile-priority .food-quick .ex-h h3{font-size:20px;flex:1 1 120px}\n#vComida.mobile-priority .food-quick .ex-h .food-ux-scanner-button{white-space:nowrap;padding:7px 9px}\n#vComida.mobile-priority .food-quick .ex-h .ghost.small{white-space:nowrap;padding:7px 9px}\n#vComida.mobile-priority .food-quick .food-search{margin-top:8px}\n#vComida.mobile-priority .food-quick .food-results{max-height:250px;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}\n#vComida.mobile-priority .food-quick .selected-food,\n#vComida.mobile-priority .food-quick .food-editor,\n#vComida.mobile-priority .food-quick .template-editor{margin:8px 0;border-color:var(--acc);padding:10px}\n#vComida.mobile-priority .food-ux-section{background:var(--card);border:1.5px solid var(--line);border-radius:12px;margin-bottom:8px;overflow:visible}\n#vComida.mobile-priority .food-ux-section>summary{display:flex;align-items:center;justify-content:space-between;gap:9px;cursor:pointer;list-style:none;min-height:44px;padding:11px 13px;font:700 14px Barlow,system-ui,sans-serif;color:var(--ink)}\n#vComida.mobile-priority .food-ux-section>summary::-webkit-details-marker{display:none}\n#vComida.mobile-priority .food-ux-section>summary::after{content:'⌄';font-size:20px;font-weight:400;color:var(--mute)}\n#vComida.mobile-priority .food-ux-section[open]>summary::after{content:'⌃'}\n#vComida.mobile-priority .food-ux-content{padding:0 9px 9px}\n#vComida.mobile-priority .food-ux-content>.ex{margin:5px 0}\n#vComida.mobile-priority .food-ux-scanner:not([open]){display:none}\n#vComida.mobile-priority .food-ux-scanner>summary{color:var(--acc)}\n#vProg .recovery-ux-section{border:1.5px solid var(--line);background:var(--card);border-radius:12px;margin-bottom:9px}\n#vProg .recovery-ux-section>summary{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;list-style:none;padding:12px 14px;min-height:44px;font:700 14px Barlow,system-ui,sans-serif;color:var(--ink)}\n#vProg .recovery-ux-section>summary::-webkit-details-marker{display:none}\n#vProg .recovery-ux-section>summary::after{content:'⌄';font-size:20px;font-weight:400;color:var(--mute)}\n#vProg .recovery-ux-section[open]>summary::after{content:'⌃'}\n#vProg .recovery-ux-hint{font-size:11px;color:var(--mute);padding:0 13px 9px;margin-top:-4px;line-height:1.3}\n#vProg .recovery-ux-section[open]>.recovery-ux-hint{display:none}\n#vProg .recovery-ux-body{padding:0 8px 8px}\n#vProg .recovery-ux-body>.recovery-card{margin:0}\n@media(max-width:390px){\n #vComida.mobile-priority .food-quick .ex-h h3{flex-basis:100%}\n #vComida.mobile-priority .food-quick .food-results{max-height:220px}\n #vComida.mobile-priority .food-ux-daily-top{align-items:center}\n}";
  document.head.appendChild(css);
})();