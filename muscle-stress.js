// Muscle stress + recovery estimator. Heuristic, not a physiological measurement.
(function(){
  const DAY=864e5,HOUR=36e5;
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

  function status(v){
    if(v<=3)return {label:'Leve',cls:'low'};
    if(v<=6)return {label:'Moderado',cls:'moderate'};
    if(v<=10)return {label:'Alto',cls:'high'};
    return {label:'Possivelmente excessivo',cls:'excess'};
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
  function accumulateExercise(out,name,setCount){
    muscles(name).forEach(([m,w])=>add(out,m,setCount*w));
  }
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

  function row(name,v,weekly,withRemaining,last){
    const st=status(v),rec=recovery(v),r=document.createElement('div');r.className='muscle-stress-row '+st.cls;
    const top=document.createElement('div');top.className='muscle-stress-top';
    const n=document.createElement('b');n.textContent=name;
    const badge=document.createElement('span');badge.className='muscle-stress-badge';badge.textContent=st.label;
    top.append(n,badge);
    const bar=document.createElement('div');bar.className='muscle-stress-bar';const fill=document.createElement('i');fill.style.width=Math.min(100,(v/12)*100)+'%';bar.appendChild(fill);
    const meta=document.createElement('div');meta.className='muscle-stress-meta';
    let text=fmt(v)+' séries efetivas · 7 dias: '+fmt(weekly||0)+' · recuperação ~'+rec[0]+'–'+rec[1]+' h';
    if(withRemaining&&last){const elapsed=Math.max(0,(Date.now()-last.t)/HOUR),remaining=Math.max(0,rec[1]-elapsed);text+=remaining>0?' · até ~'+Math.ceil(remaining)+' h restantes':' · recuperação estimada concluída';}
    meta.textContent=text;r.append(top,bar,meta);return r;
  }

  function trainingCard(){
    const done=currentStress(false),planned=currentStress(true),hasDone=Object.values(done).some(v=>v>0),data=hasDone?done:planned,week=weeklyStress();
    if(!hasDone)Object.entries(data).forEach(([m,v])=>week[m]=(week[m]||0)+v);
    const entries=Object.entries(data).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);if(!entries.length)return null;
    const c=document.createElement('div');c.className='ex muscle-stress-card';
    const h=document.createElement('div');h.className='muscle-stress-head';h.innerHTML='<div><h3>Stress muscular</h3><span>'+(hasDone?'Séries concluídas nesta sessão':'Previsão do treino planejado')+'</span></div><span class="estimate-pill">estimativa</span>';c.appendChild(h);
    entries.forEach(([m,v])=>c.appendChild(row(m,v,week[m]||0,false,null)));
    const note=document.createElement('p');note.className='muscle-stress-note';note.textContent='Série principal = 1,0; participação secundária = 0,5. A recuperação é uma faixa estimada, não uma medição direta do músculo.';c.appendChild(note);
    return c;
  }

  function recoveryCard(){
    const last=lastMuscleSessions(),week=weeklyStress(),entries=Object.entries(last).sort((a,b)=>b[1].t-a[1].t);if(!entries.length)return null;
    const c=document.createElement('div');c.className='ex muscle-stress-card';
    const h=document.createElement('div');h.className='muscle-stress-head';h.innerHTML='<div><h3>Recuperação muscular</h3><span>Baseada nos treinos registrados</span></div><span class="estimate-pill">estimativa</span>';c.appendChild(h);
    entries.forEach(([m,x])=>c.appendChild(row(m,x.v,week[m]||0,true,x)));
    const note=document.createElement('p');note.className='muscle-stress-note';note.textContent='Dor, queda de desempenho, sono e alimentação podem fazer sua recuperação real ser mais rápida ou mais lenta.';c.appendChild(note);return c;
  }

  function injectTraining(){const box=$('list'),card=trainingCard();if(!box||!card)return;box.insertBefore(card,box.firstChild)}
  if(typeof renderList==='function'){const base=renderList;renderList=function(){base.apply(this,arguments);injectTraining();};}
  if(typeof renderProg==='function'){const base=renderProg;renderProg=function(){base.apply(this,arguments);const v=$('vProg'),card=recoveryCard();if(v&&card)v.insertBefore(card,v.firstChild);};}

  const s=document.createElement('style');s.textContent=`
    .muscle-stress-card{padding:13px}.muscle-stress-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:10px}.muscle-stress-head h3{font-size:21px}.muscle-stress-head>div>span{display:block;color:var(--mute);font-size:12px;margin-top:2px}.estimate-pill{font-size:11px;font-weight:700;color:var(--acc);background:var(--ok);border-radius:999px;padding:5px 8px;white-space:nowrap}
    .muscle-stress-row{padding:8px 0;border-top:1px solid var(--line)}.muscle-stress-row:first-of-type{border-top:0}.muscle-stress-top{display:flex;justify-content:space-between;gap:8px;align-items:center}.muscle-stress-top b{font-size:14px}.muscle-stress-badge{font-size:11px;font-weight:700;border-radius:999px;padding:3px 7px;background:var(--bg);color:var(--mute)}
    .muscle-stress-bar{height:7px;background:var(--line);border-radius:999px;overflow:hidden;margin:6px 0 4px}.muscle-stress-bar i{display:block;height:100%;background:var(--acc);border-radius:inherit}.muscle-stress-row.high .muscle-stress-bar i{background:var(--hot)}.muscle-stress-row.excess .muscle-stress-bar i{background:#a73f2a}.muscle-stress-row.excess .muscle-stress-badge{color:#a73f2a;font-weight:800}.muscle-stress-meta{color:var(--mute);font-size:11px;line-height:1.3}.muscle-stress-note{margin:9px 0 0;padding-top:8px;border-top:1px solid var(--line);color:var(--mute);font-size:11px;line-height:1.35}
  `;document.head.appendChild(s);
})();
