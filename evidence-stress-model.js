// Evidence-informed muscle volume + readiness model (2026).
// Volume: direct sets = 1.0, meaningful indirect sets = 0.5 (fractional method).
// RIR is kept separate from weekly set volume and informs effort/readiness instead.
(function(){
  const DAY=864e5,HOUR=36e5,VIEW_KEY='treino_muscle_stress_view_v2';
  let view=localStorage.getItem(VIEW_KEY)==='week'?'week':'today';
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const add=(o,k,v)=>{o[k]=(o[k]||0)+v};
  const fmt=v=>(Math.round((Number(v)||0)*10)/10).toLocaleString('pt-BR',{maximumFractionDigits:1});

  function muscles(name,id){
    const n=norm((id||'')+' '+(name||''));
    if(/chest_fly|pec deck|crucifixo|crossover|\bfly\b/.test(n))return [['Peito',1]];
    if(/bench_press|incline_dumbbell_press|machine_chest_press|machine_incline_press|supino|chest press/.test(n))return [['Peito',1],['Tríceps',.5],['Deltoide anterior',.5]];
    if(/machine_dip|mergulho|\bdip\b/.test(n))return [['Tríceps',1],['Peito',.5]];
    if(/triceps|skull|frances|pushdown|overhead_extension/.test(n))return [['Tríceps',1]];
    if(/face_pull|rear_delt|reverse pec|crucifixo invertido/.test(n))return [['Deltoide posterior',1],['Costas',.5]];
    if(/barbell_row|seated.*row|one_arm.*row|remada|\brow\b|t-bar|tbar/.test(n))return [['Costas',1],['Bíceps',.5],['Deltoide posterior',.5]];
    if(/lat_pulldown|barra fixa|puxada|pulldown|pullup|pull-up/.test(n))return [['Costas',1],['Bíceps',.5]];
    if(/curl|rosca|biceps/.test(n))return [['Bíceps',1]];
    if(/lateral_raise|elevacao lateral/.test(n))return [['Deltoide lateral',1]];
    if(/shoulder_press|overhead_press|desenvolvimento|militar|arnold/.test(n))return [['Deltoide anterior',1],['Deltoide lateral',.5],['Tríceps',.5]];
    if(/shrug|encolhimento/.test(n))return [['Costas',1]];
    if(/leg_press|back_squat|agachamento|squat|hack|goblet|passada|avan[cç]o|bulgar/.test(n))return [['Quadríceps',1],['Glúteos',.5]];
    if(/leg_extension|extensora/.test(n))return [['Quadríceps',1]];
    if(/leg_curl|flexora/.test(n))return [['Posterior de coxa',1]];
    if(/romanian|\brdl\b|stiff|romeno/.test(n))return [['Posterior de coxa',1],['Glúteos',.5]];
    if(/hip_thrust|glute bridge|ponte de gluteo/.test(n))return [['Glúteos',1]];
    if(/calf|panturrilha/.test(n))return [['Panturrilhas',1]];
    if(/abductor|abdutora/.test(n))return [['Glúteos',1]];
    if(/adductor|adutora/.test(n))return [['Adutores',1]];
    if(/plank|prancha|abdominal|ab_wheel|ab wheel|roda|leg raise|crunch/.test(n))return [['Abdômen',1]];
    return [];
  }

  function planDays(){return db.training?.current?.days||{}}
  function planDayObjects(d){
    const q=planDays()[d];
    if(q?.ex?.length)return q.ex;
    return (PLAN?.[d]?.ex||[]).map((e,i)=>({id:e[3]||d+'_'+i,name:e[0],sets:Number(e[2])||1}));
  }
  function logObjects(log){
    if(log.exById&&Object.keys(log.exById).length){
      const snap=log.planSnapshot?.days?.[log.day]?.ex||[];
      return Object.entries(log.exById).map(([id,sets])=>{const p=snap.find(x=>x.id===id);return{id,name:log.exMeta?.[id]?.name||p?.name||id,sets:sets||[]}});
    }
    const arr=log.planSnapshot?.days?.[log.day]?.ex||planDayObjects(log.day);
    return Object.entries(log.ex||{}).map(([i,sets])=>({id:arr[Number(i)]?.id,name:arr[Number(i)]?.name||('Exercício '+(Number(i)+1)),sets:sets||[]}));
  }
  function accumulate(out,name,id,count){muscles(name,id).forEach(([m,w])=>add(out,m,count*w))}
  function detailsFromExercises(exs){
    const volume={},rirSum={},rirWeight={};
    exs.forEach(x=>(x.sets||[]).forEach(s=>{
      muscles(x.name,x.id).forEach(([m,w])=>{
        add(volume,m,w);
        if(s?.rir!==undefined&&s?.rir!==null&&s?.rir!==''){
          add(rirSum,m,Math.min(4,Math.max(0,Number(s.rir)))*w);add(rirWeight,m,w);
        }
      });
    }));
    const out={};Object.keys(volume).forEach(m=>out[m]={v:volume[m],avgRir:rirWeight[m]?rirSum[m]/rirWeight[m]:null});return out;
  }
  function stressFromLog(log){const d=detailsFromExercises(logObjects(log)),out={};Object.entries(d).forEach(([m,x])=>out[m]=x.v);return out}
  function detailsFromLog(log){return detailsFromExercises(logObjects(log))}
  function planDayStress(d){const out={};planDayObjects(d).forEach(x=>accumulate(out,x.name,x.id,Number(x.sets)||1));return out}
  function targets(){
    const weekly={},session={};
    Object.keys(planDays()).forEach(d=>{
      const s=planDayStress(d);Object.entries(s).forEach(([m,v])=>{add(weekly,m,v);session[m]=Math.max(session[m]||0,v)})
    });
    return {weekly,session};
  }
  function weeklyStress(at=Date.now()){
    const out={},cut=at-7*DAY;
    (db.logs||[]).filter(l=>(l.t||0)>cut&&(l.t||0)<=at).forEach(l=>Object.entries(stressFromLog(l)).forEach(([m,v])=>add(out,m,v)));return out;
  }
  function lastMuscleSessions(at=Date.now()){
    const out={};[...(db.logs||[])].filter(l=>(l.t||0)<=at).sort((a,b)=>(b.t||0)-(a.t||0)).forEach(l=>{
      const d=detailsFromLog(l);Object.entries(d).forEach(([m,x])=>{if(!out[m]&&x.v>0)out[m]={t:l.t,v:x.v,avgRir:x.avgRir,day:l.day}})
    });return out;
  }
  function currentDetails(planned){
    const exs=[];planDayObjects(day).forEach((x,i)=>{
      if(planned){exs.push({id:x.id,name:x.name,sets:Array.from({length:Number(x.sets)||1},()=>({}))});return}
      const rows=(db.draft?.[day]?.[i]||[]).filter(s=>s?.ok);if(rows.length)exs.push({id:x.id,name:x.name,sets:rows});
    });return detailsFromExercises(exs);
  }

  function weekStatus(v,m){
    const t=targets().weekly[m]||10,r=t? v/t:0;
    if(r<.6)return {label:'Baixo',cls:'low',ratio:r,target:t};
    if(r<.9)return {label:'Em construção',cls:'moderate',ratio:r,target:t};
    if(r<=1.2)return {label:'Na faixa',cls:'moderate',ratio:r,target:t};
    if(r<=1.5)return {label:'Alto',cls:'high',ratio:r,target:t};
    return {label:'Muito alto',cls:'excess',ratio:r,target:t};
  }
  function sessionStatus(v,m){
    const t=targets().session[m]||6,r=t? v/t:0;
    if(r<.6)return {label:'Leve',cls:'low',ratio:r,target:t};
    if(r<=1.05)return {label:'Na faixa',cls:'moderate',ratio:r,target:t};
    if(r<=1.3)return {label:'Alta',cls:'high',ratio:r,target:t};
    return {label:'Muito alta',cls:'excess',ratio:r,target:t};
  }
  function effortLabel(rir){
    if(rir===null||rir===undefined||!Number.isFinite(Number(rir)))return 'RIR não informado';
    const r=Number(rir);if(r<=1)return 'Muito intenso · RIR '+fmt(r);if(r<=2)return 'Intenso · RIR '+fmt(r);if(r<=3)return 'Moderado · RIR '+fmt(r);return 'Leve · RIR '+fmt(r);
  }
  function readiness(m,last,weekly,at=Date.now()){
    if(!last)return {label:'Alta',cls:'low',hours:null};
    const h=Math.max(0,(at-last.t)/HOUR),ws=weekStatus(weekly||0,m),ss=sessionStatus(last.v||0,m);
    let level=h<24?0:h<36?1:h<48?2:3;
    if(ws.ratio>1.5)level=Math.max(0,level-1);else if(ws.ratio>1.2&&level===3)level=2;
    if(ss.ratio>1.3&&h<48)level=Math.max(0,level-1);
    if(last.avgRir!==null&&last.avgRir<=1&&h<36)level=Math.max(0,level-1);
    return [
      {label:'Baixa',cls:'excess'},
      {label:'Moderada',cls:'high'},
      {label:'Boa',cls:'moderate'},
      {label:'Alta',cls:'low'}
    ][level]||{label:'Moderada',cls:'high',hours:h};
  }

  function metric(label,value){const d=document.createElement('div');d.className='muscle-stress-metric';const a=document.createElement('span');a.textContent=label;const b=document.createElement('b');b.textContent=value;d.append(a,b);return d}
  function badge(st){const b=document.createElement('span');b.className='muscle-stress-badge '+st.cls;b.textContent=st.label;return b}
  function bar(value,target,st){const d=document.createElement('div');d.className='muscle-stress-bar '+st.cls;const i=document.createElement('i');i.style.width=Math.min(100,(value/Math.max(.1,target*1.5))*100)+'%';d.append(i);return d}

  function trainingRow(m,x,week,planned){
    const v=x?.v||0,selected=view==='week'?week:v,st=view==='week'?weekStatus(selected,m):sessionStatus(selected,m),t=view==='week'?targets().weekly[m]:targets().session[m];
    const r=document.createElement('div');r.className='muscle-stress-row '+st.cls;
    const top=document.createElement('div');top.className='muscle-stress-top';const n=document.createElement('b');n.textContent=m;top.append(n,badge(st));
    const ms=document.createElement('div');ms.className='muscle-stress-metrics';
    ms.append(metric(planned?'Treino planejado':'Hoje',fmt(v)+' séries equivalentes'));
    ms.append(metric('Últimos 7 dias',fmt(week)+' séries equivalentes'));
    ms.append(metric('Meta do plano',fmt(targets().weekly[m]||0)+' / semana'));
    if(!planned)ms.append(metric('Esforço',effortLabel(x?.avgRir)));
    r.append(top,bar(selected,t||1,st),ms);return r;
  }
  function trainingCard(){
    const done=currentDetails(false),hasDone=Object.values(done).some(x=>x.v>0),cur=hasDone?done:currentDetails(true),week=weeklyStress();
    if(hasDone)Object.entries(done).forEach(([m,x])=>add(week,m,x.v));
    const names=Object.keys(cur).sort((a,b)=>(view==='week'?(week[b]||0)-(week[a]||0):(cur[b]?.v||0)-(cur[a]?.v||0)));if(!names.length)return null;
    const c=document.createElement('div');c.className='ex muscle-stress-card evidence-stress-card';
    const h=document.createElement('div');h.className='muscle-stress-head';h.innerHTML='<div><h3>Carga muscular</h3><span>'+(hasDone?'Volume realizado nesta sessão':'Previsão do treino selecionado')+'</span></div><span class="estimate-pill">estimativa</span>';c.append(h);
    const sw=document.createElement('div');sw.className='muscle-stress-switch';[['today','Hoje'],['week','7 dias']].forEach(([k,l])=>{const b=document.createElement('button');b.type='button';b.textContent=l;b.setAttribute('aria-pressed',view===k);b.onclick=()=>{view=k;try{localStorage.setItem(VIEW_KEY,k)}catch(e){}if(typeof render==='function')render()};sw.append(b)});c.append(sw);
    const cap=document.createElement('div');cap.className='muscle-stress-view-label';cap.textContent=view==='week'?'Volume dos últimos 7 dias comparado ao seu plano':'Carga da sessão comparada ao volume planejado por sessão';c.append(cap);
    names.forEach(m=>c.append(trainingRow(m,cur[m],week[m]||0,!hasDone)));
    const note=document.createElement('p');note.className='muscle-stress-note';note.textContent='Séries equivalentes: série direta = 1,0; participação indireta relevante = 0,5. RIR é avaliado separadamente e não reduz artificialmente o volume semanal.';c.append(note);return c;
  }

  function recoveryRow(m,last,week){
    const ss=sessionStatus(last.v,m),ws=weekStatus(week,m),rd=readiness(m,last,week),h=Math.max(0,(Date.now()-last.t)/HOUR);
    const r=document.createElement('div');r.className='muscle-recovery-row';const title=document.createElement('h4');title.textContent=m;r.append(title);
    const s=document.createElement('div');s.className='recovery-dimension';const sh=document.createElement('div');sh.className='recovery-dimension-head';const sl=document.createElement('span');sl.textContent='Última sessão';const sv=document.createElement('b');sv.textContent=fmt(last.v)+' séries equivalentes';sh.append(sl,sv,badge(ss));s.append(sh,bar(last.v,targets().session[m]||1,ss));r.append(s);
    const w=document.createElement('div');w.className='recovery-dimension';const wh=document.createElement('div');wh.className='recovery-dimension-head';const wl=document.createElement('span');wl.textContent='Últimos 7 dias';const wv=document.createElement('b');wv.textContent=fmt(week)+' / '+fmt(targets().weekly[m]||0);wh.append(wl,wv,badge(ws));w.append(wh,bar(week,targets().weekly[m]||1,ws));r.append(w);
    const meta=document.createElement('div');meta.className='recovery-meta';meta.append(metric('Último estímulo',Math.round(h)+' h atrás'));meta.append(metric('Prontidão estimada',rd.label));meta.append(metric('Esforço da última sessão',effortLabel(last.avgRir)));r.append(meta);return r;
  }
  function recoveryCard(){
    const last=lastMuscleSessions(),week=weeklyStress(),entries=Object.entries(last).sort((a,b)=>b[1].t-a[1].t);if(!entries.length)return null;
    const c=document.createElement('div');c.className='ex muscle-stress-card recovery-card evidence-stress-card';const h=document.createElement('div');h.className='muscle-stress-head';h.innerHTML='<div><h3>Prontidão muscular</h3><span>Volume, tempo desde o estímulo e esforço</span></div><span class="estimate-pill">estimativa</span>';c.append(h);entries.forEach(([m,x])=>c.append(recoveryRow(m,x,week[m]||0)));const note=document.createElement('p');note.className='muscle-stress-note';note.textContent='Prontidão é uma estimativa para orientar o treino, não um relógio biológico. Não há contagem regressiva fixa de 72–96 h; desempenho, dor e percepção de recuperação continuam importantes.';c.append(note);return c;
  }

  const legacy=window.muscleStressApi||{};
  window.muscleStressApi=Object.assign({},legacy,{muscles,stressFromLog,detailsFromLog,planDayStress,weeklyStress,lastMuscleSessions,weekStatus,sessionStatus,readiness,targets,effortLabel,recovery:v=>v>10?[36,48]:v>6?[24,48]:[24,36]});
  window.evidenceStressApi=window.muscleStressApi;

  if(typeof renderList==='function'){
    const base=renderList;renderList=function(){base.apply(this,arguments);const box=document.getElementById('list');if(!box)return;box.querySelectorAll(':scope > .muscle-stress-card').forEach(x=>x.remove());const c=trainingCard();if(c)box.insertBefore(c,box.firstChild)};
  }
  if(typeof renderProg==='function'){
    const base=renderProg;renderProg=function(){base.apply(this,arguments);const v=document.getElementById('vProg');if(!v)return;v.querySelectorAll(':scope > .muscle-stress-card').forEach(x=>x.remove());const c=recoveryCard();if(c)v.insertBefore(c,v.firstChild)};
  }
})();
