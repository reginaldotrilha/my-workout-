// Training plan manager + stable exercise history. Preserves all legacy data.
(function(){
  const BACKUP_KEY=KEY+'_backup_pre_training_plans_v1';
  let stored={};
  try{
    const raw=localStorage.getItem(KEY);
    if(raw){stored=JSON.parse(raw)||{};if(!localStorage.getItem(BACKUP_KEY))localStorage.setItem(BACKUP_KEY,raw)}
  }catch(e){}

  const ids={
    A:['bench_press_barbell','incline_dumbbell_press','chest_fly','triceps_skullcrusher','triceps_rope_pushdown'],
    B:['lat_pulldown','barbell_row','one_arm_dumbbell_row','barbell_curl','hammer_curl'],
    C:['back_squat','leg_press','romanian_deadlift','leg_curl','standing_calf_raise'],
    D:['overhead_press','lateral_raise','face_pull','shrug','plank','ab_wheel_or_leg_raise']
  };
  const clone=o=>JSON.parse(JSON.stringify(o));
  const fdate=t=>new Date(t).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
  const now=Date.now();
  const firstLog=(stored.logs||db.logs||[]).length?Math.min(...(stored.logs||db.logs).map(x=>x.t||now)):now;
  function defaultPlan(){
    const days={};
    for(const d of 'ABCD') days[d]={name:PLAN[d].n,ex:PLAN[d].ex.map((e,i)=>({id:ids[d][i],name:e[0],target:e[1],sets:e[2]}))};
    return {id:'plan_initial',name:'Plano ABCD',goal:'Perda de gordura + manutenção muscular',startedAt:firstLog,reviewWeeks:8,days};
  }
  db.training=stored.training||db.training||{current:defaultPlan(),archived:[]};
  if(!db.training.current)db.training.current=defaultPlan();
  if(!Array.isArray(db.training.archived))db.training.archived=[];
  let manage=false,editMode=null,editPlan=null;

  function current(){return db.training.current}
  function dayKeys(){return Object.keys(current().days||{}).filter(d=>current().days[d]).sort()}
  window.trainingDayKeys=dayKeys;
  function exId(d,i,e){return e&&e[3]||current().days[d]?.ex?.[i]?.id||ids[d]?.[i]||d+'_'+i}
  function toPlanArrays(){
    const p=current();
    for(const d of Object.keys(PLAN))if(!p.days[d])delete PLAN[d];
    for(const d of Object.keys(p.days)){const q=p.days[d];PLAN[d]={n:q.name,ex:q.ex.map(x=>[x.name,x.target,Number(x.sets)||1,x.id])}}
  }
  function legacyToStable(){
    let changed=false;
    for(const l of db.logs||[]){
      if(!l.exById)l.exById={};
      const baseDays=(l.planSnapshot&&l.planSnapshot.days)||current().days;
      if(l.ex)for(const [k,sets] of Object.entries(l.ex)){
        if(!/^\d+$/.test(String(k)))continue;
        const i=Number(k),x=baseDays?.[l.day]?.ex?.[i]||current().days?.[l.day]?.ex?.[i];
        if(x&&x.id&&!l.exById[x.id]){l.exById[x.id]=clone(sets);changed=true}
      }
      if(!l.planId){l.planId=current().id;changed=true}
    }
    return changed;
  }
  toPlanArrays();legacyToStable();

  function mergeTimed(a,b,newerLocal){
    const m=new Map();
    const first=newerLocal?(b||[]):(a||[]),second=newerLocal?(a||[]):(b||[]);
    for(const x of first)m.set(x.t,x);
    for(const x of second){const old=m.get(x.t)||{};m.set(x.t,Object.assign({},old,x,{ex:Object.assign({},old.ex||{},x.ex||{}),exById:Object.assign({},old.exById||{},x.exById||{})}))}
    return [...m.values()].sort((x,y)=>x.t-y.t)
  }
  initSync=async function(){try{
    const d=await claude.use('db'),u=await claude.use('user');if(!d||!u)return;const id=await u.id();if(!id)return;cdb=d;duid=id;
    const snap=await d.doc('data/users/'+id+'/state').get();let r=null;if(snap.exists){try{r=JSON.parse((snap.data()||{}).s)}catch(e){}}
    if(r){const newer=(db.u||0)>=(r.u||0);const local=db;
      db={
        logs:mergeTimed(local.logs,r.logs,newer),body:un(local.body,r.body),waist:un(local.waist,r.waist),meals:un(local.meals,r.meals),measures:un(local.measures,r.measures),
        draft:newer?local.draft:(r.draft||local.draft||{}),prefs:Object.assign({goalWeight:82},newer?(local.prefs||{}):(r.prefs||local.prefs||{})),
        training:newer?(local.training||r.training):(r.training||local.training),u:Date.now()
      };
      if(!db.training)db.training={current:defaultPlan(),archived:[]};toPlanArrays();legacyToStable();localStorage.setItem(KEY,JSON.stringify(db));render();
    }
    if(db.logs.length||db.meals.length||db.body.length||db.waist.length||db.measures.length)push();
  }catch(e){}};

  window.trainingHistory=function(d,i,e){const id=exId(d,i,e),out=[];for(const l of db.logs||[]){const s=l.exById?.[id]||((!l.planId||l.planId===current().id)&&l.day===d?l.ex?.[i]:null);if(s&&s.length)out.push({t:l.t,sets:s,planId:l.planId,name:l.exMeta?.[id]?.name||e?.[0]})}return out.sort((a,b)=>a.t-b.t)};
  function lastSets(d,i,e){const h=window.trainingHistory(d,i,e);return h.length?h[h.length-1]:null}
  function bestWeight(d,i,e){const h=window.trainingHistory(d,i,e);let best=null;for(const x of h)for(const s of x.sets||[])if(num(s.w)!==null&&(best===null||num(s.w)>best))best=num(s.w);return best}
  function nextDayStable(){const keys=dayKeys();if(!keys.length)return 'A';for(let i=db.logs.length-1;i>=0;i--){const l=db.logs[i];if(l.planId===current().id){const p=keys.indexOf(l.day);return keys[(p+1+keys.length)%keys.length]}}return keys[0]}
  nextDay=nextDayStable;

  sets=function(d,i){
    const e=PLAN[d].ex[i],n=e[2];db.draft[d]=db.draft[d]||{};let a=db.draft[d][i];
    if(!Array.isArray(a)){a=[];const last=lastSets(d,i,e);for(let k=0;k<n;k++){const q=last?.sets?.[k]||last?.sets?.at(-1);a.push({w:q?.w??'',r:q?.r??'',ok:false})}db.draft[d][i]=a}
    while(a.length<n){const last=lastSets(d,i,e),q=last?.sets?.[a.length]||last?.sets?.at(-1);a.push({w:q?.w??'',r:q?.r??'',ok:false})}
    if(a.length>n)a.length=n;return a
  };
  last=function(d,i){const x=lastSets(d,i,PLAN[d].ex[i]);if(!x)return null;return {t:x.t,ex:{[i]:x.sets}}};
  fmt=function(l,i){return (l.ex[i]||[]).map(s=>s.w+'kg'+(s.r?'×'+s.r:'')).join(', ')};

  function maxTarget(target){const m=String(target||'').match(/(\d+)(?:\s*[-–]\s*(\d+))?(?:s)?\s*$/i);return m?Number(m[2]||m[1]):null}
  function progressionHint(d,i,e){const last=lastSets(d,i,e),mx=maxTarget(e[1]);if(!last||!mx||last.sets.length<Number(e[2]))return '';const done=last.sets.slice(0,e[2]).every(s=>num(s.r)!==null&&num(s.r)>=mx);return done?'✓ Faixa concluída — considere aumentar a carga.':''}
  function planWeek(){return Math.max(1,Math.floor((Date.now()-(current().startedAt||Date.now()))/(7*864e5))+1)}
  function makeButton(text,cls,fn){const b=document.createElement('button');b.textContent=text;b.className=cls||'';b.onclick=fn;return b}

  renderTabs=function(){
    const box=$('tabs'),host=$('vTreino');box.innerHTML='';
    let bar=$('planSummary');if(!bar){bar=document.createElement('div');bar.id='planSummary';bar.className='plan-summary';host.insertBefore(bar,box)}
    const w=planWeek(),review=Number(current().reviewWeeks)||8,needs=w>=review;
    bar.innerHTML='';const tx=document.createElement('div');tx.innerHTML='<b>'+current().name+'</b><span>Semana '+w+' de '+review+(current().goal?' · '+current().goal:'')+'</span>';bar.appendChild(tx);
    const mb=makeButton(manage?'Voltar':'Gerenciar','ghost small',()=>{manage=!manage;render()});bar.appendChild(mb);bar.classList.toggle('review-due',needs);
    if(needs&&!manage){const n=document.createElement('div');n.className='plan-review-note';n.textContent='Hora de revisar o programa. Você pode manter o atual ou iniciar um novo ciclo.';bar.appendChild(n)}
    for(const d of dayKeys()){const b=document.createElement('button');b.textContent=d;b.setAttribute('aria-pressed',d===day);if(db.draft[d]&&Object.values(db.draft[d]).some(a=>a.some(s=>s.ok)))b.classList.add('done');b.onclick=()=>{day=d;manage=false;render()};box.appendChild(b)}
    box.classList.toggle('hidden',manage);
  };

  function exerciseCard(d,e,i,box){
    const ss=sets(d,i),last=lastSets(d,i,e),best=bestWeight(d,i,e),card=document.createElement('div');card.className='ex'+(ss.every(s=>s.ok)?' complete':'');
    const h=document.createElement('div');h.className='ex-h';const h3=document.createElement('h3');h3.textContent=e[0];const tg=document.createElement('span');tg.className='tgt';tg.textContent=e[1];h.append(h3,tg);card.appendChild(h);
    const hint=document.createElement('div');hint.className='hint last-load';if(last){const top=Math.max(...last.sets.map(s=>num(s.w)||0));hint.textContent='Último '+top+' kg · '+dateBR(last.t)+(best!==null?' · Recorde '+best+' kg':'')}else hint.textContent='Sem registro ainda.';card.appendChild(hint);
    const ph=progressionHint(d,i,e);if(ph){const p=document.createElement('div');p.className='progression-hint';p.textContent=ph;card.appendChild(p)}
    const tip=TIPS[e[0]];if(tip){const dt=document.createElement('details');dt.className='how';const sm=document.createElement('summary');sm.textContent='Como fazer';dt.appendChild(sm);const tp=document.createElement('p');tp.textContent=tip;dt.appendChild(tp);const a=document.createElement('a');a.href='https://www.youtube.com/results?search_query='+encodeURIComponent((EN[e[0]]||e[0])+' proper form');a.target='_blank';a.rel='noopener';a.textContent='Buscar vídeo';dt.appendChild(a);card.appendChild(dt)}
    ss.forEach((s,k)=>{const r=document.createElement('div');r.className='set';const n=document.createElement('span');n.textContent=k+1;const w=document.createElement('input');w.type='number';w.inputMode='decimal';w.placeholder='kg';w.value=s.w;const rp=document.createElement('input');rp.type='number';rp.inputMode='numeric';rp.placeholder='reps';rp.value=s.r;const c=document.createElement('button');c.className='chk';c.textContent='✓';c.setAttribute('aria-pressed',s.ok);w.oninput=()=>{s.w=w.value;save()};rp.oninput=()=>{s.r=rp.value;save()};c.onclick=()=>{s.ok=!s.ok;save();render()};r.append(n,w,rp,c);card.appendChild(r)});box.appendChild(card)
  }

  function renderManager(box){
    $('sub').textContent='Gerencie seu programa sem apagar o histórico';$('finish').classList.add('hidden');box.innerHTML='';
    const c=document.createElement('div');c.className='ex plan-manager';const h=document.createElement('h3');h.textContent='Plano atual';c.appendChild(h);const p=document.createElement('p');p.className='hint';p.textContent='Editar mantém este mesmo ciclo. “Novo ciclo” arquiva o plano atual e cria uma cópia para você modificar.';c.appendChild(p);
    const info=document.createElement('div');info.className='plan-info';info.innerHTML='<b>'+current().name+'</b><span>Iniciado em '+fdate(current().startedAt)+' · Semana '+planWeek()+'</span>';c.appendChild(info);
    const actions=document.createElement('div');actions.className='plan-actions';actions.append(makeButton('Editar plano atual','ghost',()=>startEdit(false)),makeButton('Iniciar novo ciclo','primary compact-primary',()=>startEdit(true)));c.appendChild(actions);box.appendChild(c);
    if(db.training.archived.length){const a=document.createElement('div');a.className='ex';const ah=document.createElement('h3');ah.textContent='Planos anteriores';a.appendChild(ah);db.training.archived.slice().reverse().forEach(p=>{const r=document.createElement('div');r.className='archived-plan';r.innerHTML='<b>'+p.name+'</b><span>'+fdate(p.startedAt)+' – '+fdate(p.endedAt||p.startedAt)+'</span>';a.appendChild(r)});box.appendChild(a)}
  }
  function startEdit(newCycle){editMode=newCycle?'new':'edit';editPlan=clone(current());if(newCycle){editPlan.id='plan_'+Date.now();editPlan.startedAt=Date.now();delete editPlan.endedAt;editPlan.name=current().name+' · novo ciclo'}render()}
  function addExercise(d){editPlan.days[d].ex.push({id:'ex_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),name:'Novo exercício',target:'3×8-12',sets:3});render()}
  function renderEditor(box){
    $('sub').textContent=editMode==='new'?'Criar novo ciclo':'Editar plano atual';$('finish').classList.add('hidden');box.innerHTML='';
    const c=document.createElement('div');c.className='ex plan-editor';const h=document.createElement('h3');h.textContent=editMode==='new'?'Novo ciclo de treino':'Editar plano';c.appendChild(h);const note=document.createElement('p');note.className='hint';note.textContent='Para substituir um exercício sem misturar o histórico, remova o antigo e use + Adicionar exercício.';c.appendChild(note);
    const meta=document.createElement('div');meta.className='plan-meta-grid';[['Nome','name'],['Objetivo','goal'],['Revisar após (semanas)','reviewWeeks']].forEach(([lab,k])=>{const lb=document.createElement('label');lb.innerHTML='<span>'+lab+'</span>';const i=document.createElement('input');i.value=editPlan[k]??'';if(k==='reviewWeeks'){i.type='number';i.inputMode='numeric'}i.oninput=()=>editPlan[k]=k==='reviewWeeks'?(num(i.value)||8):i.value;lb.appendChild(i);meta.appendChild(lb)});c.appendChild(meta);box.appendChild(c);
    for(const d of Object.keys(editPlan.days)){const dc=document.createElement('div');dc.className='ex edit-day';const hd=document.createElement('div');hd.className='ex-h';const hh=document.createElement('h3');hh.textContent='Treino '+d;const nm=document.createElement('input');nm.className='day-name-input';nm.value=editPlan.days[d].name;nm.oninput=()=>editPlan.days[d].name=nm.value;hd.append(hh,nm);dc.appendChild(hd);
      editPlan.days[d].ex.forEach((x,i)=>{const r=document.createElement('div');r.className='edit-exercise';const name=document.createElement('input');name.value=x.name;name.placeholder='Exercício';name.oninput=()=>x.name=name.value;const target=document.createElement('input');target.value=x.target;target.placeholder='4×8-12';target.oninput=()=>x.target=target.value;const sc=document.createElement('input');sc.type='number';sc.inputMode='numeric';sc.value=x.sets;sc.min='1';sc.max='10';sc.oninput=()=>x.sets=Math.max(1,Math.min(10,num(sc.value)||1));const del=makeButton('×','ghost delete-ex',()=>{if(confirm('Remover este exercício deste plano?')){editPlan.days[d].ex.splice(i,1);render()}});r.append(name,target,sc,del);dc.appendChild(r)});
      dc.appendChild(makeButton('+ Adicionar exercício','ghost add-ex',()=>addExercise(d)));box.appendChild(dc)}
    const actions=document.createElement('div');actions.className='editor-actions';actions.append(makeButton('Cancelar','ghost',()=>{editMode=null;editPlan=null;render()}),makeButton(editMode==='new'?'Ativar novo ciclo':'Salvar alterações','primary compact-primary',savePlanEdit));box.appendChild(actions)
  }
  function hasDraft(){return Object.values(db.draft||{}).some(day=>Object.values(day||{}).some(a=>Array.isArray(a)&&a.some(s=>s.w||s.r||s.ok)))}
  function savePlanEdit(){
    if(!editPlan.name.trim()){toast('Dê um nome ao plano');return}for(const d of Object.keys(editPlan.days))if(!editPlan.days[d].ex.length){toast('Cada treino precisa ter ao menos um exercício');return}
    if(editMode==='new'&&hasDraft()&&!confirm('Há um treino em andamento. Ativar o novo ciclo vai limpar apenas esse rascunho não finalizado. Continuar?'))return;
    if(editMode==='new'){const old=clone(current());old.endedAt=Date.now();db.training.archived.push(old);db.training.current=editPlan;db.draft={};day=Object.keys(editPlan.days)[0]||'A'}else db.training.current=editPlan;
    editMode=null;editPlan=null;toPlanArrays();legacyToStable();save();manage=false;render();toast('Plano salvo')
  }

  renderList=function(){
    const box=$('list');box.innerHTML='';if(editMode){renderEditor(box);return}if(manage){renderManager(box);return}$('finish').classList.remove('hidden');const p=PLAN[day];if(!p){day=dayKeys()[0];return render()}
    $('sub').textContent='Treino '+day+' · '+p.n+' · sugerido hoje: '+nextDayStable();p.ex.forEach((e,i)=>exerciseCard(day,e,i,box))
  };

  finish=function(){
    const p=PLAN[day],ex={},exById={},exMeta={};let total=0;
    p.ex.forEach((e,i)=>{const a=(db.draft[day]?.[i]||[]).filter(s=>s.ok&&num(s.w)!==null&&num(s.r)!==null).map(s=>({w:num(s.w),r:num(s.r)}));if(a.length){const id=exId(day,i,e);ex[i]=clone(a);exById[id]=clone(a);exMeta[id]={name:e[0],target:e[1]};total+=a.length}});
    if(!total){toast('Marque ao menos uma série com carga e repetições');return}
    db.logs.push({t:Date.now(),day,ex,exById,exMeta,planId:current().id,planName:current().name});delete db.draft[day];save();toast('Treino '+day+' salvo!');render()
  };

  const baseRenderProg=renderProg;
  renderProg=function(){baseRenderProg();const v=$('vProg'),pressed=[...v.querySelectorAll('.prog-switch button')].find(b=>b.getAttribute('aria-pressed')==='true');if(!pressed||pressed.textContent!=='Força')return;const sw=v.querySelector('.prog-switch');v.innerHTML='';if(sw)v.appendChild(sw);renderStableStrength(v)};
  function renderStableStrength(v){
    const groups=new Map();for(const l of db.logs||[]){for(const [id,ss] of Object.entries(l.exById||{})){if(!ss?.length)continue;const name=l.exMeta?.[id]?.name||findExerciseName(id)||id;if(!groups.has(id))groups.set(id,{name,rows:[]});groups.get(id).rows.push({t:l.t,sets:ss})}}
    if(!groups.size){const e=document.createElement('div');e.className='empty';e.textContent='Nenhum treino salvo ainda.';v.appendChild(e);return}
    for(const g of groups.values()){g.rows.sort((a,b)=>a.t-b.t);const tops=g.rows.map(x=>Math.max(...x.sets.map(s=>num(s.w)||0))),now=tops.at(-1),best=Math.max(...tops),df=now-tops[0],c=document.createElement('div');c.className='ex';const h=document.createElement('h3');h.textContent=g.name;c.appendChild(h);const st=document.createElement('div');st.className='stat';st.innerHTML='<span>Atual <b>'+now+' kg</b></span><span>Recorde <b>'+best+' kg</b></span><span>Evolução <b>'+(df>0?'+':'')+df+' kg</b></span>';c.appendChild(st);const sp=spark(tops);if(sp)c.appendChild(sp);v.appendChild(c)}
  }
  function findExerciseName(id){for(const p of [current(),...(db.training.archived||[])])for(const d of Object.values(p.days||{}))for(const x of d.ex||[])if(x.id===id)return x.name;return null}
})();
