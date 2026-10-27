// Applies RIR weighting to muscle-stress calculations and refreshes the stress/recovery UI.
(function(){
  const DAY=864e5,HOUR=36e5;
  const add=(o,k,v)=>{o[k]=(o[k]||0)+v};
  const rirFactor=s=>window.rirEffortApi?.factor?window.rirEffortApi.factor(s?.rir):1;
  const api=()=>window.muscleStressApi||null;

  function logExercises(log){
    if(log.exById&&Object.keys(log.exById).length){
      const snap=log.planSnapshot?.days?.[log.day]?.ex||[];
      return Object.entries(log.exById).map(([id,sets])=>{const p=snap.find(x=>x.id===id);return{name:log.exMeta?.[id]?.name||p?.name||id,sets:sets||[]}});
    }
    const arr=log.planSnapshot?.days?.[log.day]?.ex||[];
    return Object.entries(log.ex||{}).map(([i,sets])=>({name:arr[Number(i)]?.name||PLAN?.[log.day]?.ex?.[Number(i)]?.[0]||('Exercício '+(Number(i)+1)),sets:sets||[]}));
  }
  function weightedStressFromLog(log){
    const a=api(),out={};if(!a)return out;
    logExercises(log).forEach(x=>{
      const effective=(x.sets||[]).reduce((n,s)=>n+rirFactor(s),0);
      a.muscles(x.name).forEach(([m,w])=>add(out,m,effective*w));
    });
    return out;
  }
  function weightedWeekly(){
    const out={},cut=Date.now()-7*DAY;
    (db.logs||[]).filter(l=>(l.t||0)>=cut).forEach(l=>Object.entries(weightedStressFromLog(l)).forEach(([m,v])=>add(out,m,v)));
    return out;
  }
  function weightedCurrent(){
    const a=api(),out={};if(!a)return out;
    (PLAN?.[day]?.ex||[]).forEach((e,i)=>{
      const rows=db.draft?.[day]?.[i]||[],effective=rows.filter(s=>s?.ok).reduce((n,s)=>n+rirFactor(s),0);
      if(effective)a.muscles(e[0]).forEach(([m,w])=>add(out,m,effective*w));
    });
    return out;
  }
  function weightedLast(){
    const out={};[...(db.logs||[])].sort((a,b)=>(b.t||0)-(a.t||0)).forEach(l=>{
      Object.entries(weightedStressFromLog(l)).forEach(([m,v])=>{if(!out[m]&&v>0)out[m]={t:l.t,v}});
    });return out;
  }
  function statusClass(st){return st?.cls||'low'}
  function fmt(v){return (Math.round((Number(v)||0)*10)/10).toLocaleString('pt-BR',{maximumFractionDigits:1})}
  function paintBar(el,value,max,cls){if(!el)return;el.classList.remove('low','moderate','high','excess');el.classList.add(cls);const i=el.querySelector('i');if(i)i.style.width=Math.min(100,(value/max)*100)+'%'}

  function refreshTrainingCard(){
    const a=api(),card=document.querySelector('#list .muscle-stress-card');if(!a||!card)return;
    const current=weightedCurrent(),week=weightedWeekly(),done=Object.values(current).some(v=>v>0);
    const weekShown=Object.assign({},week);if(done)Object.entries(current).forEach(([m,v])=>add(weekShown,m,v));
    const weekMode=(card.querySelector('.muscle-stress-view-label')?.textContent||'').includes('7 dias');
    card.querySelectorAll('.muscle-stress-row').forEach(row=>{
      const name=row.querySelector('.muscle-stress-top b')?.textContent;if(!name)return;
      const metrics=row.querySelectorAll('.muscle-stress-metric b');
      const currentDisplayed=done?(current[name]||0):Number(String(metrics[0]?.textContent||'0').replace(',','.').match(/[\d.]+/)?.[0]||0);
      const weekly=weekShown[name]||0,selected=weekMode?weekly:currentDisplayed,st=weekMode?a.weekStatus(selected):a.sessionStatus(selected);
      row.className='muscle-stress-row '+statusClass(st);
      const badge=row.querySelector('.muscle-stress-badge');if(badge){badge.textContent=st.label;badge.className='muscle-stress-badge '+st.cls}
      paintBar(row.querySelector('.muscle-stress-bar'),selected,weekMode?24:12,st.cls);
      if(metrics[0]&&done)metrics[0].textContent=fmt(currentDisplayed)+' séries efetivas';
      if(metrics[1])metrics[1].textContent=fmt(weekly)+' séries efetivas';
      if(metrics[2]){const rec=a.recovery(currentDisplayed);metrics[2].textContent=rec[0]+'–'+rec[1]+' h'}
    });
    const note=card.querySelector('.muscle-stress-note');if(note)note.textContent+=' RIR informado ajusta o peso de cada série no cálculo.';
  }

  function refreshRecoveryCard(){
    const a=api(),card=document.querySelector('#vProg .recovery-card');if(!a||!card)return;
    const week=weightedWeekly(),last=weightedLast();
    card.querySelectorAll('.muscle-recovery-row').forEach(row=>{
      const name=row.querySelector('h4')?.textContent,x=last[name];if(!name||!x)return;
      const blocks=row.querySelectorAll('.recovery-dimension'),session=x.v,weekly=week[name]||0;
      if(blocks[0]){
        const st=a.sessionStatus(session),b=blocks[0].querySelector('.recovery-dimension-head b'),badge=blocks[0].querySelector('.muscle-stress-badge');if(b)b.textContent=fmt(session)+' séries efetivas';if(badge){badge.textContent=st.label;badge.className='muscle-stress-badge '+st.cls}paintBar(blocks[0].querySelector('.muscle-stress-bar'),session,12,st.cls);
      }
      if(blocks[1]){
        const st=a.weekStatus(weekly),b=blocks[1].querySelector('.recovery-dimension-head b'),badge=blocks[1].querySelector('.muscle-stress-badge');if(b)b.textContent=fmt(weekly)+' séries efetivas';if(badge){badge.textContent=st.label;badge.className='muscle-stress-badge '+st.cls}paintBar(blocks[1].querySelector('.muscle-stress-bar'),weekly,24,st.cls);
      }
      const meta=row.querySelectorAll('.recovery-meta .muscle-stress-metric b'),rec=a.recovery(session);if(meta[0])meta[0].textContent=rec[0]+'–'+rec[1]+' h';if(meta[1]){const rem=Math.max(0,rec[1]-(Date.now()-x.t)/HOUR);meta[1].textContent=rem>0?'até ~'+Math.ceil(rem)+' h restantes':'recuperação estimada concluída'}
    });
  }

  const a=api();if(a){a.stressFromLog=weightedStressFromLog;a.weeklyStress=weightedWeekly;a.lastMuscleSessions=weightedLast}
  if(typeof renderList==='function'){const base=renderList;renderList=function(){base.apply(this,arguments);refreshTrainingCard()}}
  if(typeof renderProg==='function'){const base=renderProg;renderProg=function(){base.apply(this,arguments);refreshRecoveryCard()}}
  window.rirStressApi={stressFromLog:weightedStressFromLog,weeklyStress:weightedWeekly,currentStress:weightedCurrent,lastMuscleSessions:weightedLast};
})();
