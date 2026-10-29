// Dynamic 7-day training planner. Uses evidence-informed volume and readiness, not fixed recovery countdowns.
(function(){
  const DAY=864e5,HOUR=36e5;
  const dayNames=['DOM','SEG','TER','QUA','QUI','SEX','SÁ'];
  const pad=n=>String(n).padStart(2,'0');
  const dateKey=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const startOfDay=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x};
  const fmtDate=d=>pad(d.getDate())+'/'+pad(d.getMonth()+1);

  function api(){return window.muscleStressApi||null}
  function plan(){return db.training?.current||null}
  function keys(){return typeof trainingDayKeys==='function'?trainingDayKeys():Object.keys(plan()?.days||{})}
  function info(k){const d=plan()?.days?.[k];return {name:d?.name||('Treino '+k),muscles:d?.muscles||''}}
  function completedLogs(){return [...(db.logs||[])].sort((a,b)=>(a.t||0)-(b.t||0))}
  function nextDue(){
    const ks=keys();if(!ks.length)return null;
    const logs=completedLogs();
    for(let i=logs.length-1;i>=0;i--){const p=ks.indexOf(logs[i].day);if(p>=0)return ks[(p+1)%ks.length]}
    return ks[0];
  }
  function eventList(){
    const a=api();if(!a)return [];
    return completedLogs().map(l=>({t:l.t,day:l.day,stress:a.stressFromLog(l),details:a.detailsFromLog?a.detailsFromLog(l):null,actual:true}));
  }
  function weeklyAt(events,ts){
    const out={},cut=ts-7*DAY;
    events.filter(e=>e.t>cut&&e.t<=ts).forEach(e=>Object.entries(e.stress||{}).forEach(([m,v])=>out[m]=(out[m]||0)+v));
    return out;
  }
  function lastByMuscle(events,ts){
    const out={};
    events.filter(e=>e.t<=ts).sort((a,b)=>b.t-a.t).forEach(e=>{
      Object.entries(e.stress||{}).forEach(([m,v])=>{
        if(!out[m]&&v>0)out[m]={t:e.t,v,day:e.day,avgRir:e.details?.[m]?.avgRir??null};
      });
    });
    return out;
  }
  function evaluate(k,ts,events){
    const a=api(),stress=a.planDayStress(k),week=weeklyAt(events,ts),last=lastByMuscle(events,ts),tg=a.targets?a.targets():{weekly:{}};
    let blocked=false,score=0;const reasons=[];
    for(const [m,v] of Object.entries(stress)){
      if(v<=0)continue;
      const target=tg.weekly?.[m]||10,projected=(week[m]||0)+v,ratio=projected/Math.max(1,target);
      if(ratio>1.5)score+=(ratio-1.5)*18*v;else if(ratio>1.2)score+=(ratio-1.2)*8*v;
      if(ratio>1.5)reasons.push(m+' ficaria acima do volume planejado');

      const l=last[m];
      if(l){
        const elapsed=Math.max(0,(ts-l.t)/HOUR);
        if(elapsed<24&&v>=1){blocked=true;score+=100;reasons.push(m+' foi treinado há '+Math.round(elapsed)+' h');}
        else if(elapsed<36)score+=(36-elapsed)*.7*v;
        else if(elapsed<48)score+=(48-elapsed)*.2*v;

        if(a.readiness){
          const rd=a.readiness(m,l,week[m]||0,ts);
          if(rd.label==='Baixa'&&v>=1.5){blocked=true;reasons.push(m+' com prontidão baixa');}
          else if(rd.label==='Moderada')score+=4*v;
        }
      }
    }
    return {day:k,stress,blocked,score,reasons:[...new Set(reasons)],week};
  }
  function shouldForceRest(events,ts){
    const dates=new Set(events.filter(e=>e.t<ts&&e.t>=ts-6*DAY).map(e=>dateKey(new Date(e.t))));
    let streak=0;
    for(let i=1;i<=5;i++){
      const d=new Date(ts-i*DAY);
      if(dates.has(dateKey(d)))streak++;else break;
    }
    if(streak>=5)return 'Cinco dias seguidos de musculação';
    return null;
  }
  function pickWorkout(due,used,ts,events){
    const ks=keys();if(!ks.length)return null;
    const start=Math.max(0,ks.indexOf(due)),order=[];
    for(let i=0;i<ks.length;i++)order.push(ks[(start+i)%ks.length]);
    const candidates=order.filter(k=>!used.has(k)).map(k=>evaluate(k,ts,events));
    const safe=candidates.filter(x=>!x.blocked).sort((a,b)=>a.score-b.score||order.indexOf(a.day)-order.indexOf(b.day));
    return safe[0]||null;
  }
  function explainChoice(choice,due){
    if(!choice)return '';
    if(choice.day===due){
      const caution=choice.reasons.find(r=>r.includes('acima do volume'));
      return caution?'Próximo treino da sequência. '+caution+'.':'Próximo treino da sequência com prontidão compatível.';
    }
    return 'O treino '+due+' foi adiado; '+choice.day+' apresenta melhor prontidão hoje.';
  }
  function schedule(){
    const a=api(),p=plan();if(!a||!p)return [];
    const now=new Date(),today0=startOfDay(now),events=eventList();
    let due=nextDue(),used=new Set(),out=[];
    for(let i=0;i<7;i++){
      const d=new Date(today0.getTime()+i*DAY),ts=new Date(d);ts.setHours(i===0?Math.max(now.getHours(),12):18,0,0,0);const stamp=ts.getTime();
      const actual=events.filter(e=>e.actual&&dateKey(new Date(e.t))===dateKey(d)).at(-1);
      if(actual){
        out.push({date:d,type:'done',day:actual.day,title:'Treino '+actual.day+' concluído',reason:'Treino registrado neste dia.'});
        const ks=keys(),pos=ks.indexOf(actual.day);if(pos>=0)due=ks[(pos+1)%ks.length];used.delete(actual.day);continue;
      }
      const forced=shouldForceRest(events,stamp);
      if(forced){out.push({date:d,type:'rest',title:'Descanso',reason:forced});continue}
      const choice=pickWorkout(due,used,stamp,events);
      if(!choice){
        const checks=keys().map(k=>evaluate(k,stamp,events)),why=[...new Set(checks.flatMap(x=>x.reasons))].filter(r=>!r.includes('acima do volume')).slice(0,2).join(' · ');
        out.push({date:d,type:'rest',title:'Descanso',reason:why||'Prontidão favorece um dia sem musculação.'});continue;
      }
      const meta=info(choice.day);out.push({date:d,type:'workout',day:choice.day,title:choice.day+' · '+meta.name,reason:explainChoice(choice,due),muscles:meta.muscles});
      events.push({t:stamp,day:choice.day,stress:choice.stress,details:null,actual:false});
      if(choice.day===due){const ks=keys(),pos=ks.indexOf(due);due=ks[(pos+1)%ks.length];used.clear()}else used.add(choice.day);
    }
    return out;
  }

  function todayRecommendation(items){return items[0]||null}
  function selectWorkout(k){if(!k)return;day=k;if(typeof render==='function')render();setTimeout(()=>document.getElementById('tabs')?.scrollIntoView({behavior:'smooth',block:'start'}),40)}
  function card(){
    const items=schedule();if(!items.length)return null;
    const c=document.createElement('div');c.id='weeklyPlanner';c.className='weekly-planner';
    const head=document.createElement('div');head.className='weekly-planner-head';head.innerHTML='<div><h3>Sua semana</h3><span>Planejamento automático · próximos 7 dias</span></div><span class="planner-auto">AUTO</span>';c.appendChild(head);
    const strip=document.createElement('div');strip.className='planner-days';
    items.forEach((x,i)=>{
      const b=document.createElement('button');b.type='button';b.className='planner-day '+x.type+(i===0?' today':'');
      const wd=document.createElement('span');wd.className='planner-weekday';wd.textContent=dayNames[x.date.getDay()];
      const dt=document.createElement('span');dt.className='planner-date';dt.textContent=fmtDate(x.date);
      const code=document.createElement('strong');code.textContent=x.type==='rest'?'DESC':(x.day||'✓');
      const name=document.createElement('small');name.textContent=x.type==='rest'?'Descanso':(x.type==='done'?'Concluído':info(x.day).name);
      b.append(wd,dt,code,name);if(x.day)b.onclick=()=>selectWorkout(x.day);strip.appendChild(b);
    });
    c.appendChild(strip);
    const t=todayRecommendation(items),detail=document.createElement('div');detail.className='planner-today';
    const left=document.createElement('div');left.className='planner-today-copy';
    const title=document.createElement('b');title.textContent=t.type==='rest'?'Hoje: descanso recomendado':(t.type==='done'?'Hoje: treino concluído':'Hoje: '+t.title);
    const reason=document.createElement('span');reason.textContent=t.reason||'';left.append(title,reason);detail.appendChild(left);
    if(t.type==='rest'){
      const due=nextDue(),btn=document.createElement('button');btn.type='button';btn.className='ghost small';btn.textContent='Treinar mesmo assim';btn.onclick=()=>selectWorkout(due);detail.appendChild(btn);
    }else if(t.type==='workout'){
      const btn=document.createElement('button');btn.type='button';btn.className='ghost small';btn.textContent='Abrir '+t.day;btn.onclick=()=>selectWorkout(t.day);detail.appendChild(btn);
    }
    c.appendChild(detail);
    const note=document.createElement('div');note.className='planner-note';note.textContent='O calendário considera volume do plano, tempo desde o último estímulo e prontidão. Menos de 24 h para o mesmo músculo pesa fortemente; 24–48 h é cautela, não bloqueio automático.';c.appendChild(note);
    return c;
  }
  function inject(){
    document.getElementById('weeklyPlanner')?.remove();
    const host=document.getElementById('vTreino'),tabs=document.getElementById('tabs'),c=card();if(!host||!tabs||!c)return;host.insertBefore(c,tabs);
    const t=todayRecommendation(schedule()),sub=document.getElementById('sub');if(sub&&t){const current=info(day);sub.textContent='Treino '+day+' · '+current.name+(current.muscles?' · '+current.muscles:'')+' · sugerido hoje: '+(t.type==='rest'?'Descanso':(t.day||'Concluído'));}
  }
  if(typeof renderTabs==='function'){const base=renderTabs;renderTabs=function(){base.apply(this,arguments);inject();};}

  const s=document.createElement('style');s.textContent=`
    .weekly-planner{background:var(--card);border:1.5px solid var(--line);border-radius:12px;padding:12px;margin:0 0 12px}.weekly-planner-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.weekly-planner-head h3{font-size:21px}.weekly-planner-head span{display:block;color:var(--mute);font-size:12px;margin-top:2px}.planner-auto{color:var(--acc)!important;background:var(--ok);font-weight:800;border-radius:999px;padding:5px 8px;letter-spacing:.04em}.planner-days{display:flex;gap:7px;overflow-x:auto;padding:10px 0 7px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.planner-days::-webkit-scrollbar{display:none}.planner-day{flex:0 0 82px;min-height:96px;border:1.5px solid var(--line);background:var(--bg);color:var(--ink);border-radius:10px;padding:7px 6px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:2px}.planner-day.today{border-color:var(--acc)}.planner-day.workout strong{color:var(--acc)}.planner-day.rest strong{color:var(--mute);font-size:15px}.planner-day.done{background:var(--ok);border-color:var(--acc)}.planner-weekday{font-size:10px;font-weight:800;color:var(--mute);letter-spacing:.05em}.planner-date{font-size:11px;color:var(--mute)}.planner-day strong{font:700 24px "Barlow Condensed",Barlow,sans-serif;margin-top:3px}.planner-day small{font-size:10px;line-height:1.1;text-align:center;color:var(--mute)}.planner-today{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;background:var(--bg);border-radius:10px;margin-top:4px}.planner-today-copy b,.planner-today-copy span{display:block}.planner-today-copy b{font-size:14px}.planner-today-copy span{color:var(--mute);font-size:11px;line-height:1.3;margin-top:2px}.planner-note{color:var(--mute);font-size:10px;line-height:1.35;margin-top:8px}@media(max-width:390px){.planner-today{grid-template-columns:1fr}.planner-today .ghost{width:100%}}
  `;document.head.appendChild(s);
})();
