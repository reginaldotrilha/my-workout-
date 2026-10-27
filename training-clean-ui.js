// Cleaner hierarchy for the main workout screen. Keeps all features, reduces repeated/secondary information.
(function(){
  const KEY='treino_clean_ui_v1';
  let stressOpen=false;
  try{stressOpen=localStorage.getItem(KEY+':stress')==='1'}catch(e){}

  function renameNav(){
    const t=document.getElementById('nTreino'),c=document.getElementById('nComida');
    if(t)t.textContent='Treino';
    if(c)c.textContent='Alimentação';
  }
  function dayMeta(){
    const q=db.training?.current?.days?.[day];
    return {name:q?.name||PLAN?.[day]?.n||('Treino '+day)};
  }
  function recommendation(){
    const el=document.querySelector('#weeklyPlanner .planner-day.today');
    if(!el)return'';
    const code=el.querySelector('strong')?.textContent?.trim();
    if(code==='DESC')return'Descanso';
    if(code==='ATIVO')return'Recuperação ativa';
    if(code==='✓')return'Treino concluído';
    return code?('Treino '+code):'';
  }
  function compactHeader(){
    const sub=document.getElementById('sub');if(!sub)return;
    const m=dayMeta(),rec=recommendation();
    sub.textContent='Selecionado: '+day+' · '+m.name+(rec?' · Hoje: '+rec:'');
  }
  function compactPlan(){
    const bar=document.getElementById('planSummary');if(!bar)return;
    bar.classList.add('clean-plan-summary');
    const span=bar.querySelector(':scope > div span');
    if(span){
      span.title=span.textContent;
      const m=span.textContent.match(/Semana\s+(\d+)\s+de\s+(\d+)/i);
      if(m)span.textContent='Semana '+m[1]+'/'+m[2];
    }
  }
  function compactPlanner(){
    const p=document.getElementById('weeklyPlanner');if(!p)return;
    p.classList.add('clean-weekly-planner');
    const headSub=p.querySelector('.weekly-planner-head div span');if(headSub)headSub.textContent='Próximos 7 dias';
    const note=p.querySelector('.planner-note');if(note)note.classList.add('clean-secondary-note');
  }
  function compactCatalog(){
    const b=document.querySelector('.session-catalog-banner');if(!b)return;
    b.classList.add('clean-catalog-banner');
    const small=b.querySelector('small');if(small)small.textContent=small.textContent.replace(' opções por grupo muscular',' exercícios');
  }
  function stressPeriod(card){
    const selected=card.querySelector('.muscle-stress-switch button[aria-pressed="true"]')?.textContent?.trim().toLowerCase()||'';
    if(selected.includes('7'))return'7 dias';
    const subtitle=card.querySelector('.muscle-stress-head > div > span')?.textContent?.trim().toLowerCase()||'';
    if(subtitle.includes('previs'))return'Treino planejado';
    return'Hoje';
  }
  function stressSummary(card){
    const first=card.querySelector('.muscle-stress-row');if(!first)return'';
    const muscle=first.querySelector('.muscle-stress-top > b')?.textContent||'';
    const badge=first.querySelector('.muscle-stress-badge')?.textContent||'';
    const period=stressPeriod(card);
    return muscle&&badge?period+': '+muscle+' · '+badge:'Toque para ver stress por músculo';
  }
  function compactStress(){
    const card=document.querySelector('#vTreino .muscle-stress-card');if(!card)return;
    card.classList.add('clean-stress-card');
    let summary=card.querySelector('.clean-stress-summary');
    if(!summary){
      summary=document.createElement('div');summary.className='clean-stress-summary';
      const text=document.createElement('span');text.className='clean-stress-summary-text';
      const btn=document.createElement('button');btn.type='button';btn.className='ghost small clean-stress-toggle';
      btn.onclick=()=>{stressOpen=!stressOpen;try{localStorage.setItem(KEY+':stress',stressOpen?'1':'0')}catch(e){}applyStressState(card)};
      summary.append(text,btn);
      const head=card.querySelector('.muscle-stress-head');if(head)head.insertAdjacentElement('afterend',summary);else card.prepend(summary);
    }
    const text=summary.querySelector('.clean-stress-summary-text');if(text)text.textContent=stressSummary(card);
    applyStressState(card);
  }
  function applyStressState(card){
    card.classList.toggle('stress-expanded',stressOpen);
    const btn=card.querySelector('.clean-stress-toggle');if(btn)btn.textContent=stressOpen?'Recolher':'Ver detalhes';
    [...card.children].forEach(ch=>{
      if(ch.classList.contains('muscle-stress-head')||ch.classList.contains('clean-stress-summary'))return;
      ch.classList.toggle('clean-stress-hidden',!stressOpen);
    });
  }
  function compactExerciseSection(){
    const toolbar=document.querySelector('#list > .exercise-collapse-toolbar');if(!toolbar)return;
    toolbar.classList.add('clean-exercise-toolbar');
    let title=toolbar.querySelector('.exercise-section-title');
    if(!title){title=document.createElement('div');title.className='exercise-section-title';toolbar.prepend(title)}
    const m=dayMeta();
    title.innerHTML='<b>Exercícios do treino '+day+'</b><span>'+m.name+'</span>';
  }
  function cleanup(){
    renameNav();compactPlan();compactPlanner();compactCatalog();compactStress();compactExerciseSection();compactHeader();
  }

  if(typeof renderTabs==='function'){
    const base=renderTabs;renderTabs=function(){const r=base.apply(this,arguments);requestAnimationFrame(cleanup);return r};
  }
  if(typeof renderList==='function'){
    const base=renderList;renderList=function(){const r=base.apply(this,arguments);requestAnimationFrame(cleanup);return r};
  }
  renameNav();

  const st=document.createElement('style');st.textContent=`
    #sub{font-size:14px;line-height:1.35;margin:1px 0 11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .nav{margin-bottom:12px}.nav button{padding:7px 5px;font-size:15px}
    .clean-plan-summary{padding:9px 11px;margin:0 0 10px;border-radius:11px}.clean-plan-summary>div{min-width:0}.clean-plan-summary b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.clean-plan-summary span{font-size:11px!important;margin-top:1px!important}.clean-plan-summary .ghost.small{padding:5px 8px;font-size:11px}
    .clean-weekly-planner{padding:10px;margin-bottom:10px}.clean-weekly-planner .weekly-planner-head h3{font-size:19px}.clean-weekly-planner .weekly-planner-head span{font-size:11px}.clean-weekly-planner .planner-auto{padding:4px 7px;font-size:10px}.clean-weekly-planner .planner-days{gap:6px;padding:8px 0 6px}.clean-weekly-planner .planner-day{flex-basis:72px;min-height:84px;padding:6px 5px}.clean-weekly-planner .planner-day strong{font-size:21px;margin-top:2px}.clean-weekly-planner .planner-day small{font-size:9px}.clean-weekly-planner .planner-weekday{font-size:9px}.clean-weekly-planner .planner-date{font-size:10px}.clean-weekly-planner .planner-today{padding:8px 9px;margin-top:2px}.clean-weekly-planner .planner-today-copy b{font-size:13px}.clean-weekly-planner .planner-today-copy span{font-size:10px}.clean-weekly-planner .planner-activity-guidance{margin-top:5px;padding:7px 9px}.clean-weekly-planner .planner-activity-guidance span{font-size:9px}.clean-secondary-note{display:none}
    .tabs.named-workout-tabs{gap:7px;margin-bottom:9px}.tabs.named-workout-tabs button{flex-basis:158px!important;min-height:58px!important;padding:7px 8px!important;grid-template-columns:32px minmax(0,1fr)!important}.workout-letter{width:30px!important;height:30px!important;font-size:20px!important}.workout-tab-copy strong{font-size:13px!important}.workout-tab-copy small{font-size:9px!important;margin-top:2px!important}
    .clean-catalog-banner{padding:8px 10px!important;margin-bottom:10px!important;border-color:var(--line)!important}.clean-catalog-banner b{font-size:16px!important}.clean-catalog-banner small{font-size:10px!important}.clean-catalog-banner strong{font-size:12px!important}
    .clean-stress-card{padding:10px 12px!important;margin-bottom:10px!important}.clean-stress-card .muscle-stress-head{margin-bottom:3px}.clean-stress-card .muscle-stress-head h3{font-size:19px}.clean-stress-card .muscle-stress-head>div>span{font-size:10px}.clean-stress-summary{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:4px}.clean-stress-summary-text{color:var(--mute);font-size:11px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.clean-stress-toggle{flex:0 0 auto;padding:5px 8px!important;font-size:11px!important}.clean-stress-hidden{display:none!important}
    .exercise-collapse-toolbar.clean-exercise-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:4px 0 9px;padding:2px 1px}.exercise-section-title{display:grid;gap:1px;min-width:0}.exercise-section-title b{font:700 18px "Barlow Condensed",Barlow,sans-serif;color:var(--ink)}.exercise-section-title span{font-size:10px;color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.clean-exercise-toolbar .collapse-all-btn{flex:0 0 auto;font-size:11px;padding:5px 8px}
    @media(max-width:390px){#sub{font-size:13px}.clean-weekly-planner .planner-day{flex-basis:68px}.tabs.named-workout-tabs button{flex-basis:150px!important}.exercise-section-title b{font-size:17px}}
  `;document.head.appendChild(st);
})();
