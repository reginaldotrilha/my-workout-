// Sequence-first weekly planner for Reginaldo's ABCDE routine.
// Muscle stress/readiness is displayed as guidance only; it never blocks or reorders the sequence.
(function(){
  const DAY=864e5,STATE_KEY='treino_week_sequence_v1';
  const dayNames=['DOM','SEG','TER','QUA','QUI','SEX','SÁ'];
  const pad=n=>String(n).padStart(2,'0');
  const dateKey=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const startOfDay=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x};
  const fmtDate=d=>pad(d.getDate())+'/'+pad(d.getMonth()+1);
  let state={skips:{}};
  try{state=Object.assign(state,JSON.parse(localStorage.getItem(STATE_KEY)||'{}')||{})}catch(e){}
  state.skips=state.skips&&typeof state.skips==='object'?state.skips:{};

  function saveState(){
    try{
      const cut=Date.now()-60*DAY;
      Object.keys(state.skips).forEach(k=>{const t=Date.parse(k+'T12:00:00');if(Number.isFinite(t)&&t<cut)delete state.skips[k]});
      localStorage.setItem(STATE_KEY,JSON.stringify(state));
    }catch(e){}
  }
  function api(){return window.muscleStressApi||null}
  function plan(){return db.training?.current||null}
  function keys(){return typeof trainingDayKeys==='function'?trainingDayKeys():Object.keys(plan()?.days||{})}
  function info(k){const d=plan()?.days?.[k];return {name:d?.name||('Treino '+k),muscles:d?.muscles||''}}
  function completedLogs(){return [...(db.logs||[])].filter(l=>l&&Number(l.t)>0).sort((a,b)=>(a.t||0)-(b.t||0))}
  function nextAfter(k){const ks=keys(),p=ks.indexOf(k);return p>=0?ks[(p+1)%ks.length]:(ks[0]||null)}
  function nextDue(){
    const ks=keys();if(!ks.length)return null;
    const logs=completedLogs();
    for(let i=logs.length-1;i>=0;i--){if(ks.includes(logs[i].day))return nextAfter(logs[i].day)}
    return ks[0];
  }
  function logsByDate(){
    const map={};completedLogs().forEach(l=>{const k=dateKey(new Date(l.t));map[k]=l});return map;
  }
  function skipped(k){return !!state.skips[k]}
  function eligibleSaturday(items){return items.some(x=>x.type==='skipped')}

  function stressGuidance(k,ts=Date.now()){
    const a=api();if(!a||!k)return '';
    try{
      const stress=a.planDayStress(k)||{},week=a.weeklyStress(ts)||{},last=a.lastMuscleSessions(ts)||{};
      const low=[],moderate=[];
      Object.entries(stress).forEach(([m,v])=>{
        if(Number(v)<1)return;
        const l=last[m];if(!l||!a.readiness)return;
        const rd=a.readiness(m,l,week[m]||0,ts);
        if(rd?.label==='Baixa')low.push(m);else if(rd?.label==='Moderada')moderate.push(m);
      });
      if(low.length)return 'Atenção: prontidão estimada baixa em '+low.slice(0,3).join(', ')+'. A sequência continua; ajuste esforço/RIR ou adie somente se a fadiga real justificar.';
      if(moderate.length)return 'Prontidão moderada em '+moderate.slice(0,3).join(', ')+'. A sequência continua normalmente; use o RIR para ajustar a sessão.';
      return 'Stress e prontidão estão sendo monitorados, mas não alteram a sequência ABCDE.';
    }catch(e){return ''}
  }

  function schedule(){
    const p=plan(),ks=keys();if(!p||!ks.length)return [];
    const now=new Date(),today0=startOfDay(now),actualByDate=logsByDate();
    let due=nextDue(),out=[];
    for(let i=0;i<7;i++){
      const d=new Date(today0.getTime()+i*DAY),key=dateKey(d),actual=actualByDate[key],dow=d.getDay();
      if(actual&&ks.includes(actual.day)){
        out.push({date:d,type:'done',day:actual.day,title:'Treino '+actual.day+' concluído',reason:'Treino registrado neste dia.'});
        due=nextAfter(actual.day);continue;
      }
      if(skipped(key)){
        out.push({date:d,type:'skipped',day:due,title:'Dia pulado',reason:'O treino '+due+' ficou pendente e passa para o próximo dia disponível.'});
        continue;
      }
      if(dow===0){out.push({date:d,type:'rest',title:'Descanso',reason:'Domingo reservado como descanso padrão.'});continue}
      const saturday=dow===6;
      if(saturday&&!eligibleSaturday(out)){
        out.push({date:d,type:'rest',title:'Descanso flexível',reason:'Sábado fica livre por padrão. Pode ser usado para recuperar um treino pulado.'});continue;
      }
      const meta=info(due);
      out.push({date:d,type:'workout',day:due,title:due+' · '+meta.name,reason:saturday?'Recuperação opcional de um treino deslocado na semana.':'Sequência ABCDE preservada.',muscles:meta.muscles});
      due=nextAfter(due);
    }
    return out;
  }

  function selectWorkout(k){if(!k)return;day=k;if(typeof render==='function')render();setTimeout(()=>document.getElementById('tabs')?.scrollIntoView({behavior:'smooth',block:'start'}),40)}
  function rerender(){if(typeof render==='function')render();else if(typeof renderTabs==='function')renderTabs()}
  function skipToday(){
    const items=schedule(),t=items[0];if(!t||t.type!=='workout')return;
    if(!confirm('Pular o treino de hoje? O treino '+t.day+' ficará pendente para o próximo dia disponível.'))return;
    state.skips[dateKey(new Date())]={t:Date.now(),day:t.day};saveState();rerender();
  }
  function undoSkipToday(){delete state.skips[dateKey(new Date())];saveState();rerender()}

  function card(){
    const items=schedule();if(!items.length)return null;
    const c=document.createElement('div');c.id='weeklyPlanner';c.className='weekly-planner';
    const head=document.createElement('div');head.className='weekly-planner-head';
    head.innerHTML='<div><h3>Sua semana</h3><span>Seg–sex como padrão · sábado flexível</span></div><span class="planner-auto">ABCDE</span>';c.appendChild(head);
    const strip=document.createElement('div');strip.className='planner-days';
    items.forEach((x,i)=>{
      const b=document.createElement('button');b.type='button';b.className='planner-day '+x.type+(i===0?' today':'');
      const wd=document.createElement('span');wd.className='planner-weekday';wd.textContent=dayNames[x.date.getDay()];
      const dt=document.createElement('span');dt.className='planner-date';dt.textContent=fmtDate(x.date);
      const code=document.createElement('strong');code.textContent=x.type==='rest'?'DESC':x.type==='skipped'?'PULOU':(x.type==='done'?'✓':x.day);
      const name=document.createElement('small');name.textContent=x.type==='rest'?'Descanso':x.type==='skipped'?'Vai para o próximo':x.type==='done'?'Concluído':info(x.day).name;
      b.append(wd,dt,code,name);if(x.type==='workout'||x.type==='done')b.onclick=()=>selectWorkout(x.day);strip.appendChild(b);
    });
    c.appendChild(strip);

    const t=items[0],detail=document.createElement('div');detail.className='planner-today';
    const left=document.createElement('div');left.className='planner-today-copy';
    const title=document.createElement('b');
    title.textContent=t.type==='rest'?'Hoje: descanso':t.type==='skipped'?'Hoje: treino pulado':t.type==='done'?'Hoje: treino concluído':'Hoje: '+t.title;
    const reason=document.createElement('span');reason.textContent=t.reason||'';left.append(title,reason);detail.appendChild(left);
    const actions=document.createElement('div');actions.className='planner-actions';
    if(t.type==='workout'){
      const open=document.createElement('button');open.type='button';open.className='ghost small';open.textContent='Abrir '+t.day;open.onclick=()=>selectWorkout(t.day);actions.appendChild(open);
      const skip=document.createElement('button');skip.type='button';skip.className='ghost small planner-skip';skip.textContent='Pular hoje';skip.onclick=skipToday;actions.appendChild(skip);
    }else if(t.type==='skipped'){
      const undo=document.createElement('button');undo.type='button';undo.className='ghost small';undo.textContent='Desfazer pulo';undo.onclick=undoSkipToday;actions.appendChild(undo);
    }
    if(actions.children.length)detail.appendChild(actions);
    c.appendChild(detail);

    if(t.type==='workout'){
      const guidance=stressGuidance(t.day);if(guidance){const g=document.createElement('div');g.className='planner-stress-guidance';g.textContent=guidance;c.appendChild(g)}
    }
    const note=document.createElement('div');note.className='planner-note';
    note.textContent='A ordem A→B→C→D→E não é alterada pelo stress muscular. O stress continua visível como estimativa para ajustar carga, RIR ou decidir manualmente por descanso.';c.appendChild(note);
    return c;
  }

  function inject(){
    document.getElementById('weeklyPlanner')?.remove();
    const host=document.getElementById('vTreino'),tabs=document.getElementById('tabs'),c=card();if(!host||!tabs||!c)return;host.insertBefore(c,tabs);
    const t=schedule()[0],sub=document.getElementById('sub');
    if(sub&&t){
      const current=info(day),todayText=t.type==='workout'?t.day:t.type==='done'?'Concluído':t.type==='skipped'?'Pulado':'Descanso';
      sub.textContent='Treino '+day+' · '+current.name+(current.muscles?' · '+current.muscles:'')+' · hoje: '+todayText;
    }
  }
  if(typeof renderTabs==='function'){const base=renderTabs;renderTabs=function(){base.apply(this,arguments);inject();};}

  window.weekSequenceApi={schedule,nextDue,skipToday,undoSkipToday};

  const s=document.createElement('style');s.textContent=`
    .weekly-planner{background:var(--card);border:1.5px solid var(--line);border-radius:12px;padding:12px;margin:0 0 12px}.weekly-planner-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.weekly-planner-head h3{font-size:21px}.weekly-planner-head span{display:block;color:var(--mute);font-size:12px;margin-top:2px}.planner-auto{color:var(--acc)!important;background:var(--ok);font-weight:800;border-radius:999px;padding:5px 8px;letter-spacing:.04em}.planner-days{display:flex;gap:7px;overflow-x:auto;padding:10px 0 7px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.planner-days::-webkit-scrollbar{display:none}.planner-day{flex:0 0 82px;min-height:96px;border:1.5px solid var(--line);background:var(--bg);color:var(--ink);border-radius:10px;padding:7px 6px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:2px}.planner-day.today{border-color:var(--acc)}.planner-day.workout strong{color:var(--acc)}.planner-day.rest strong{color:var(--mute);font-size:15px}.planner-day.done{background:var(--ok);border-color:var(--acc)}.planner-day.skipped{border-style:dashed;opacity:.82}.planner-day.skipped strong{font-size:13px;color:var(--mute)}.planner-weekday{font-size:10px;font-weight:800;color:var(--mute);letter-spacing:.05em}.planner-date{font-size:11px;color:var(--mute)}.planner-day strong{font:700 24px "Barlow Condensed",Barlow,sans-serif;margin-top:3px}.planner-day small{font-size:10px;line-height:1.1;text-align:center;color:var(--mute)}.planner-today{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;background:var(--bg);border-radius:10px;margin-top:4px}.planner-today-copy b,.planner-today-copy span{display:block}.planner-today-copy b{font-size:14px}.planner-today-copy span{color:var(--mute);font-size:11px;line-height:1.3;margin-top:2px}.planner-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.planner-skip{color:var(--mute)}.planner-stress-guidance{margin-top:8px;padding:9px 10px;border-radius:9px;background:var(--bg);color:var(--mute);font-size:10.5px;line-height:1.35}.planner-note{color:var(--mute);font-size:10px;line-height:1.35;margin-top:8px}@media(max-width:390px){.planner-today{grid-template-columns:1fr}.planner-actions{justify-content:stretch}.planner-actions .ghost{flex:1}}
  `;document.head.appendChild(s);
})();