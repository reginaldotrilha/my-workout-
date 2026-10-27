// Adds active-recovery vs full-rest guidance to the automatic weekly planner.
(function(){
  const HEALTH_KEY='treino_healthkit_v1';
  const pad=n=>String(n).padStart(2,'0');
  const key=d=>d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
  function health(){try{return JSON.parse(localStorage.getItem(HEALTH_KEY)||'{}')||{}}catch(e){return {}}}
  function todaySteps(){const h=health(),r=h.daily?.[key(new Date())];return Number(r?.steps)||0}
  function decorate(){
    const planner=document.getElementById('weeklyPlanner');if(!planner)return;
    const days=[...planner.querySelectorAll('.planner-day')];
    const rests=days.map((el,i)=>({el,i})).filter(x=>x.el.classList.contains('rest'));
    if(!rests.length)return;
    let fullIndex=-1;
    rests.forEach(x=>{
      const prev=days[x.i-1],next=days[x.i+1],prevCode=prev?.querySelector('strong')?.textContent,nextCode=next?.querySelector('strong')?.textContent;
      if(fullIndex<0&&(prevCode==='C'||nextCode==='C'))fullIndex=x.i;
    });
    if(fullIndex<0&&rests.length>1)fullIndex=rests.at(-1).i;

    rests.forEach(({el,i})=>{
      const full=i===fullIndex,code=el.querySelector('strong'),name=el.querySelector('small');
      el.classList.toggle('active-recovery',!full);el.classList.toggle('full-rest',full);
      if(code)code.textContent=full?'DESC':'ATIVO';
      if(name)name.textContent=full?'Descanso completo':'Recuperação ativa';
      el.title=full?'Descanso completo da musculação; caminhada normal do dia está liberada.':'25–40 min de caminhada, bike ou elíptico leve/moderado; meta de 8–10 mil passos.';
    });

    const today=days[0],detail=planner.querySelector('.planner-today');
    if(today?.classList.contains('rest')&&detail){
      let activity=detail.querySelector('.planner-activity-guidance');if(!activity){activity=document.createElement('div');activity.className='planner-activity-guidance';detail.insertAdjacentElement('afterend',activity)}
      const full=today.classList.contains('full-rest'),steps=todaySteps();
      activity.innerHTML=full
        ?'<b>Descanso completo</b><span>Sem musculação. Caminhada normal e mobilidade leve são opcionais.</span>'
        :'<b>Recuperação ativa</b><span>25–40 min de caminhada/bike/elíptico leve · meta 8–10 mil passos'+(steps?' · hoje: '+steps.toLocaleString('pt-BR')+' passos':'')+'</span>';
    }
  }
  if(typeof renderTabs==='function'){const base=renderTabs;renderTabs=function(){base.apply(this,arguments);decorate()}}
  const st=document.createElement('style');st.textContent=`
    .planner-day.active-recovery strong{color:var(--acc);font-size:14px}.planner-day.active-recovery{border-style:dashed}.planner-day.full-rest{opacity:.82}.planner-activity-guidance{margin-top:7px;padding:9px 10px;border-radius:9px;background:var(--ok);display:grid;gap:2px}.planner-activity-guidance b{font-size:12px;color:var(--acc)}.planner-activity-guidance span{font-size:10px;line-height:1.35;color:var(--mute)}
  `;document.head.appendChild(st);
})();
