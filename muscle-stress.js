// Muscle stress + recovery estimator. Heuristic, not a physiological measurement.
(function(){
  const DAY=864e5,HOUR=36e5,VIEW_KEY='treino_muscle_stress_view_v1';
  let stressView=localStorage.getItem(VIEW_KEY)==='week'?'week':'today';
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const add=(o,k,v)=>{o[k]=(o[k]||0)+v};

  function muscles(name){
    const n=norm(name);
    if(/supino|chest press|pec deck|crucifixo|crossover|\bfly\b/.test(n))return [['Peito',1],['Tríceps',.5],['Ombros',.5]];
    if(/triceps|skull|frances|mergulho|\bdip\b/.test(n))return [['Tríceps',1]];
    if(/barra fixa|puxada|pulldown|pullup|pull-up|remada|\brow\b|t-bar|tbar/.test(n))return [['Costas',1],['Bíceps',.5],['Ombro posterior',.5]];
    if(/rosca martelo|hammer|rosca|\bcurl\b/.test(n))return [['Bíceps',1]];
    if(/leg press|agachamento|squat|hack|goblet|passada|avan[cç]o|bulgar/.test(n))return [['Quadríceps',1],['Glúteos',1],['Posterior de coxa',.5]];
    if(/cadeira extensora|leg extension/.test(n))return [['Quadríceps',1]];
    if(/mesa flexora|flexora|leg curl/.test(n))return [['Posterior de coxa',1]];
    if(/hip thrust|ponte de gluteo|glute bridge/.test(n))return [['Glúteos',1],['Posterior de coxa',.5]];
    if(/stiff|romeno|romanian|\brdl\b/.test(n))return [['Posterior de coxa',1],['Glúteos',1],['Costas',.25]];
    if(/panturrilha|\bcalf/.test(n))return [['Panturrilhas',1]];
    if(/face pull|crucifixo invertido|reverse pec|rear delt/.test(n))return [['Ombro posterior',1],['Costas',.5]];
    if(/elevacao lateral|lateral raise/.test(n))return [['Ombros',1]];
    if(/desenvolvimento|militar|shoulder press|overhead press|arnold/.test(n))return [['Ombros',1],['Tríceps',.5]];
    if(/encolhimento|shrug/.test(n))return [['Costas',1],['Ombros',.5]];
    if(/prancha|plank|abdominal|ab wheel|roda|leg raise|crunch/.test(n))return [['Abdômen',1]];
    if(/adutora|adductor/.test(n))return [['Adutores',1]];
    if(/abdutora|abductor/.test(n))return [['Glúteos',1]];
    return [];
  }

  function sessionStatus(v){
    if(v<=3)return {label:'Leve',cls:'low'};
    if(v<=6)return {label:'Moderado',cls:'moderate'};
    if(v<=10)return {label:'Alto',cls:'high'};
    return {label:'Muito alto',cls:'excess'};
  }
  function weekStatus(v){
    if(v<=8)return {label:'Baixo',cls:'low'};
    if(v<=14)return {label:'Adequado',cls:'moderate'};
    if(v<=20)return {label:'Alto',cls:'high'};
    return {label:'Acima da meta',cls:'excess'};
  }
  function recovery(v){
    if(v<=3)return [24,36];
    if(v<=6)return [36,48];
    if(v<=10)return [48,72];
    return [72,96];
  }
  function fmt(v){return (Math.round(v*10)/10).toLocaleString('pt-BR',{maximumFractionDigits:1})}

  function planDayObjects(d){
    const q=db.training?.current?.days?.[d];
    if(q?.ex?.length)return q.ex;
    return (PLAN[d]?.ex||[]).map((e,i)=>({id:e[3]||d+'_'+i,name:e[0],sets:Number(e[2])||1}));
  }
  function logObjects(log){
    if(log.exById&&Object.keys(log.exById).length){
      const snap=log.planSnapshot?.days?.[log.day]?.ex||[];
      return Object.entries(log.exById).map(([id,sets])=>{const s=snap.find(x=>x.id===id);return{name:log.exMeta?.[id]?.name||s?.name||id,sets:sets||[]}});
    }
    const arr=log.planSnapshot?.days?.[log.day]?.ex||planDayObjects(log.day);
    return Object.entries(log.ex||{}).map(([i,sets])=>({name:arr[Number(i)]?.name||('Exercício '+(Number(i)+1)),sets:sets||[]}));
  }
  function accumulateExercise(out,name,setCount){muscles(name).forEach(([m,w])=>add(out,m,setCount*w));}
  function stressFromLog(log){const out={};logObjects(log).forEach(x=>accumulateExercise(out,x.name,x.sets.length));return out}
  function weeklyStress(){
    const out={},cut=Date.now()-7*DAY;
    (db.logs||[]).filter(l=>(l.t||0)>=cut).forEach(l=>{const s=stressFromLog(l);Object.entries(s).forEach(([m,v])=>add(out,m,v))});
    return out;
  }
  function currentStress(planned){
    const out={};
    planDayObjects(day).forEach((x,i)=>{
      const rows=db.draft?.[day]?.[i]||[];
      const n=planned?(Number(x.sets)||1):rows.filter(s=>s?.ok).length;
      if(n)accumulateExercise(out,x.name,n);
    });
    return out;
  }
  function lastMuscleSessions(){
    const out={};
    [...(db.logs||[])].sort((a,b)=>(b.t||0)-(a.t||0)).forEach(l=>{
      const s=stressFromLog(l);Object.entries(s).forEach(([m,v])=>{if(!out[m]&&v>0)out[m]={t:l.t,v}});
    });
    return out;
  }
  function withCurrent(base,current){const out=Object.assign({},base);Object.entries(current||{}).forEach(([m,v])=>add(out,m,v));return out}

  function metricLine(label,value){
    const line=document.createElement('div');line.className='muscle-stress-metric';
    const k=document.createElement('span');k.textContent=label;
    const v=document.createElement('b');v.textContent=value;
    line.append(k,v);return line;
  }
  function fillBar(value,max,cls){
    const bar=document.createElement('div');bar.className='muscle-stress-bar '+cls;
    const fill=document.createElement('i');fill.style.width=Math.min(100,(value/max)*100)+'%';bar.appendChild(fill);return bar;
  }
  function statusPill(st){const b=document.createElement('span');b.className='muscle-stress-badge '+st.cls;b.textContent=st.label;return b}

  function trainingRow(name,today,weekly){
    const selected=stressView==='week'?weekly:today;
    const st=stressView==='week'?weekStatus(selected):sessionStatus(selected);
    const rec=recovery(today),r=document.createElement('div');r.className='muscle-stress-row '+st.cls;
    const top=document.createElement('div');top.className='muscle-stress-top';
    const n=document.createElement('b');n.textContent=name;top.append(n,statusPill(st));
    const bar=fillBar(selected,stressView==='week'?24:12,st.cls);
    const metrics=document.createElement('div');metrics.className='muscle-stress-metrics';
    metrics.appendChild(metricLine('Hoje',fmt(today)+' séries efetivas'));
    metrics.appendChild(metricLine('Últimos 7 dias',fmt(weekly||0)+' séries efetivas'));
    metrics.appendChild(metricLine('Recuperação estimada',rec[0]+'–'+rec[1]+' h'));
    r.append(top,bar,metrics);return r;
  }

  function recoveryRow(name,lastSession,weekly,last){
    const sessionSt=sessionStatus(lastSession),weekSt=weekStatus(weekly),rec=recovery(lastSession);
    const r=document.createElement('div');r.className='muscle-recovery-row';
    const title=document.createElement('h4');title.textContent=name;r.appendChild(title);

    const session=document.createElement('div');session.className='recovery-dimension';
    const sh=document.createElement('div');sh.className='recovery-dimension-head';
    const sl=document.createElement('span');sl.textContent='Última sessão';
    const sv=document.createElement('b');sv.textContent=fmt(lastSession)+' séries efetivas';
    sh.append(sl,sv,statusPill(sessionSt));
    session.append(sh,fillBar(lastSession,12,sessionSt.cls));

    const week=document.createElement('div');week.className='recovery-dimension';
    const wh=document.createElement('div');wh.className='recovery-dimension-head';
    const wl=document.createElement('span');wl.textContent='Últimos 7 dias';
    const wv=document.createElement('b');wv.textContent=fmt(weekly)+' séries efetivas';
    wh.append(wl,wv,statusPill(weekSt));
    week.append(wh,fillBar(weekly,24,weekSt.cls));

    const meta=document.createElement('div');meta.className='recovery-meta';
    meta.appendChild(metricLine('Recuperação estimada',rec[0]+'–'+rec[1]+' h'));
    if(last){
      const elapsed=Math.max(0,(Date.now()-last.t)/HOUR),remaining=Math.max(0,rec[1]-elapsed);
      meta.appendChild(metricLine('Situação',remaining>0?'até ~'+Math.ceil(remaining)+' h restantes':'recuperação estimada concluída'));
    }
    r.append(session,week,meta);return r;
  }

  function switcher(card,rerender){
    const sw=document.createElement('div');sw.className='muscle-stress-switch';
    [['today','Hoje'],['week','7 dias']].forEach(([key,label])=>{
      const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-pressed',stressView===key);
      b.onclick=()=>{if(stressView===key)return;stressView=key;try{localStorage.setItem(VIEW_KEY,key)}catch(e){}rerender()};sw.appendChild(b);
    });
    card.appendChild(sw);
    const cap=document.createElement('div');cap.className='muscle-stress-view-label';cap.textContent=stressView==='week'?'Barra e classificação: carga acumulada nos últimos 7 dias':'Barra e classificação: stress do treino de hoje';card.appendChild(cap);
  }

  function trainingCard(){
    const done=currentStress(false),planned=currentStress(true),hasDone=Object.values(done).some(v=>v>0),today=hasDone?done:planned;
    const week=withCurrent(weeklyStress(),today);
    const names=[...new Set([...Object.keys(today),...Object.keys(week)])].filter(m=>(today[m]||0)>0).sort((a,b)=>(stressView==='week'?(week[b]||0)-(week[a]||0):(today[b]||0)-(today[a]||0)));
    if(!names.length)return null;
    const c=document.createElement('div');c.className='ex muscle-stress-card';
    const h=document.createElement('div');h.className='muscle-stress-head';h.innerHTML='<div><h3>Stress muscular</h3><span>'+(hasDone?'Séries concluídas nesta sessão':'Previsão do treino planejado')+'</span></div><span class="estimate-pill">estimativa</span>';c.appendChild(h);
    switcher(c,()=>render());
    names.forEach(m=>c.appendChild(trainingRow(m,today[m]||0,week[m]||0)));
    const note=document.createElement('p');note.className='muscle-stress-note';note.textContent='Hoje e 7 dias usam escalas diferentes. Série principal = 1,0; participação secundária = 0,5. “Muito alto” é um alerta de volume, não prova de excesso ou lesão.';c.appendChild(note);
    return c;
  }

  function recoveryCard(){
    const last=lastMuscleSessions(),week=weeklyStress(),entries=Object.entries(last).sort((a,b)=>b[1].t-a[1].t);if(!entries.length)return null;
    const c=document.createElement('div');c.className='ex muscle-stress-card recovery-card';
    const h=document.createElement('div');h.className='muscle-stress-head';h.innerHTML='<div><h3>Recuperação muscular</h3><span>Sessão e semana avaliadas separadamente</span></div><span class="estimate-pill">estimativa</span>';c.appendChild(h);
    entries.forEach(([m,x])=>c.appendChild(recoveryRow(m,x.v,week[m]||0,x)));
    const note=document.createElement('p');note.className='muscle-stress-note';note.textContent='A recuperação é estimada a partir da última sessão. O status semanal serve para mostrar o volume acumulado e usa uma escala diferente da sessão.';c.appendChild(note);return c;
  }

  function injectTraining(){const box=$('list'),card=trainingCard();if(!box||!card)return;box.insertBefore(card,box.firstChild)}
  if(typeof renderList==='function'){const base=renderList;renderList=function(){base.apply(this,arguments);injectTraining();};}
  if(typeof renderProg==='function'){const base=renderProg;renderProg=function(){base.apply(this,arguments);const v=$('vProg'),card=recoveryCard();if(v&&card)v.insertBefore(card,v.firstChild);};}

  const s=document.createElement('style');s.textContent=`
    .muscle-stress-card{padding:13px}.muscle-stress-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px}.muscle-stress-head h3{font-size:21px}.muscle-stress-head>div>span{display:block;color:var(--mute);font-size:12px;margin-top:2px}.estimate-pill{font-size:11px;font-weight:700;color:var(--acc);background:var(--ok);border-radius:999px;padding:5px 8px;white-space:nowrap}
    .muscle-stress-switch{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;background:var(--line);border-radius:10px;margin:8px 0 5px}.muscle-stress-switch button{border:0;border-radius:7px;padding:7px 10px;background:transparent;color:var(--mute);font:700 13px Barlow,system-ui,sans-serif}.muscle-stress-switch button[aria-pressed="true"]{background:var(--card);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.08)}.muscle-stress-view-label{color:var(--mute);font-size:11px;text-align:center;margin:0 0 7px}
    .muscle-stress-row{padding:10px 0;border-top:1px solid var(--line)}.muscle-stress-top{display:flex;justify-content:space-between;gap:8px;align-items:center}.muscle-stress-top b{font-size:15px}.muscle-stress-badge{font-size:11px;font-weight:700;border-radius:999px;padding:3px 7px;background:var(--bg);color:var(--mute);white-space:nowrap}.muscle-stress-badge.excess{color:#a73f2a;font-weight:800}
    .muscle-stress-bar{height:7px;background:var(--line);border-radius:999px;overflow:hidden;margin:7px 0}.muscle-stress-bar i{display:block;height:100%;background:var(--acc);border-radius:inherit}.muscle-stress-bar.high i{background:var(--hot)}.muscle-stress-bar.excess i{background:#a73f2a}
    .muscle-stress-metrics{display:grid;gap:3px}.muscle-stress-metric{display:flex;justify-content:space-between;gap:14px;align-items:baseline;font-size:12px;line-height:1.35}.muscle-stress-metric span{color:var(--mute)}.muscle-stress-metric b{color:var(--ink);font-size:12px;text-align:right;font-weight:700}.muscle-stress-note{margin:10px 0 0;padding-top:9px;border-top:1px solid var(--line);color:var(--mute);font-size:11px;line-height:1.35}
    .muscle-recovery-row{padding:13px 0;border-top:1px solid var(--line)}.muscle-recovery-row h4{font:700 18px "Barlow Condensed",Barlow,sans-serif;margin:0 0 8px}.recovery-dimension{padding:7px 9px;background:var(--bg);border-radius:9px;margin:6px 0}.recovery-dimension-head{display:grid;grid-template-columns:minmax(90px,1fr) auto auto;gap:8px;align-items:center}.recovery-dimension-head>span:first-child{color:var(--mute);font-size:12px}.recovery-dimension-head>b{font-size:12px;text-align:right}.recovery-dimension .muscle-stress-bar{margin:6px 0 0}.recovery-meta{display:grid;gap:3px;margin-top:8px}
    @media(max-width:390px){.muscle-stress-metric{font-size:11px}.muscle-stress-metric b{font-size:11px}.recovery-dimension-head{grid-template-columns:1fr auto}.recovery-dimension-head .muscle-stress-badge{grid-column:2}.recovery-dimension-head>b{grid-column:1;grid-row:2;text-align:left}}
  `;document.head.appendChild(s);
})();
