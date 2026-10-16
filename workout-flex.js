// Workout flexibility: session-only substitutions/extras + safe editing of completed workout sets.
// Does not change the permanent plan unless the user uses the existing plan manager.
(function(){
  const FLEX_KEY='treino_workout_flex_v1';
  let flex={sessions:{}};
  try{flex=Object.assign(flex,JSON.parse(localStorage.getItem(FLEX_KEY)||'{}')||{})}catch(e){}
  flex.sessions=flex.sessions&&typeof flex.sessions==='object'?flex.sessions:{};
  let editLogT=null,editData=null;

  const clone=x=>JSON.parse(JSON.stringify(x));
  const slug=s=>String(s||'exercise').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,50)||'exercise';
  const saveFlex=()=>{try{localStorage.setItem(FLEX_KEY,JSON.stringify(flex))}catch(e){}};
  const planId=()=>db.training?.current?.id||'plan';
  const sessionKey=d=>planId()+':'+d;
  function session(d){const k=sessionKey(d);return flex.sessions[k]||(flex.sessions[k]={subs:{},extras:[]})}
  function clearSession(d){delete flex.sessions[sessionKey(d)];saveFlex()}
  function inferType(eOrMeta,id){const name=Array.isArray(eOrMeta)?eOrMeta[0]:eOrMeta?.name||'';const type=eOrMeta?.type;if(type)return type;if(id==='plank'||name==='Prancha (segundos)')return'time';if(id==='ab_wheel_or_leg_raise'||name==='Abdominal infra ou roda')return'reps';return'weight_reps'}
  function baseObjects(d){
    const q=db.training?.current?.days?.[d];
    if(q?.ex?.length)return q.ex.map(x=>({id:x.id,name:x.name,target:x.target,sets:Number(x.sets)||1,type:x.type||inferType(x,x.id)}));
    return (PLAN[d]?.ex||[]).map((e,i)=>({id:e[3]||d+'_'+i,name:e[0],target:e[1],sets:Number(e[2])||1,type:inferType(e,e[3])}));
  }
  function variantObjects(d){
    const base=baseObjects(d),s=session(d);const out=base.map((x,i)=>s.subs[i]?Object.assign({},s.subs[i],{substituteFor:x.id,substituteForName:x.name}):x);
    return out.concat((s.extras||[]).map(x=>Object.assign({},x,{extra:true})));
  }
  function toArray(x){return[x.name,x.target,Number(x.sets)||1,x.id]}

  const ALT={
    bench_press_barbell:[['Chest press na máquina','alt_chest_press_machine'],['Supino com halteres','alt_dumbbell_bench_press'],['Supino no Smith','alt_smith_bench_press']],
    incline_dumbbell_press:[['Supino inclinado na máquina','alt_incline_chest_press_machine'],['Supino inclinado no Smith','alt_incline_smith_press'],['Supino inclinado com barra','alt_incline_barbell_press']],
    chest_fly:[['Crucifixo com halteres','alt_dumbbell_fly'],['Crossover na polia','alt_cable_crossover'],['Peck deck','alt_pec_deck']],
    triceps_skullcrusher:[['Tríceps francês com halter','alt_overhead_dumbbell_triceps'],['Tríceps na polia com barra','alt_cable_triceps_bar'],['Mergulho assistido','alt_assisted_dip']],
    triceps_rope_pushdown:[['Tríceps na polia com barra','alt_cable_triceps_bar'],['Tríceps francês na polia','alt_cable_overhead_triceps'],['Mergulho assistido','alt_assisted_dip']],
    lat_pulldown:[['Barra fixa assistida','alt_assisted_pullup'],['Puxada neutra','alt_neutral_pulldown'],['Puxada unilateral na polia','alt_single_arm_pulldown']],
    barbell_row:[['Remada baixa na polia','alt_seated_cable_row'],['Remada máquina com apoio','alt_chest_supported_row'],['Remada T-bar','alt_tbar_row']],
    one_arm_dumbbell_row:[['Remada unilateral na polia','alt_single_arm_cable_row'],['Remada máquina unilateral','alt_single_arm_machine_row'],['Remada baixa na polia','alt_seated_cable_row']],
    barbell_curl:[['Rosca na polia','alt_cable_curl'],['Rosca com halteres','alt_dumbbell_curl'],['Rosca máquina','alt_machine_curl']],
    hammer_curl:[['Rosca martelo na corda','alt_rope_hammer_curl'],['Rosca alternada','alt_alternating_curl'],['Rosca máquina pegada neutra','alt_machine_neutral_curl']],
    back_squat:[['Agachamento no Smith','alt_smith_squat'],['Hack squat','alt_hack_squat'],['Leg press','alt_leg_press']],
    leg_press:[['Hack squat','alt_hack_squat'],['Agachamento no Smith','alt_smith_squat'],['Agachamento goblet','alt_goblet_squat']],
    romanian_deadlift:[['Stiff com halteres','alt_dumbbell_rdl'],['Stiff no Smith','alt_smith_rdl'],['Mesa flexora','alt_lying_leg_curl']],
    leg_curl:[['Flexora sentada','alt_seated_leg_curl'],['Flexora unilateral','alt_single_leg_curl'],['Stiff com halteres','alt_dumbbell_rdl']],
    standing_calf_raise:[['Panturrilha sentada','alt_seated_calf_raise'],['Panturrilha no leg press','alt_leg_press_calf'],['Panturrilha unilateral','alt_single_calf_raise']],
    overhead_press:[['Desenvolvimento com halteres','alt_dumbbell_shoulder_press'],['Desenvolvimento na máquina','alt_machine_shoulder_press'],['Desenvolvimento no Smith','alt_smith_shoulder_press']],
    lateral_raise:[['Elevação lateral na polia','alt_cable_lateral_raise'],['Elevação lateral máquina','alt_machine_lateral_raise'],['Elevação lateral unilateral','alt_single_lateral_raise']],
    face_pull:[['Crucifixo invertido máquina','alt_reverse_pec_deck'],['Crucifixo invertido com halteres','alt_reverse_dumbbell_fly'],['Face pull unilateral','alt_single_face_pull']],
    shrug:[['Encolhimento com barra','alt_barbell_shrug'],['Encolhimento no Smith','alt_smith_shrug'],['Encolhimento máquina','alt_machine_shrug']],
    plank:[['Prancha lateral (segundos)','alt_side_plank'],['Prancha com apoio alto (segundos)','alt_high_plank']],
    ab_wheel_or_leg_raise:[['Elevação de pernas','alt_leg_raise'],['Crunch na máquina','alt_machine_crunch'],['Crunch na polia','alt_cable_crunch']]
  };
  function chooseAlternative(original){
    const options=ALT[original.id]||[];let text='Trocar “'+original.name+'” somente neste treino:\n';options.forEach((x,i)=>text+=(i+1)+'. '+x[0]+'\n');text+='0. Outro exercício';
    const raw=prompt(text);if(raw===null)return null;const n=parseInt(raw,10);
    if(n>0&&n<=options.length){const x=options[n-1];return{id:x[1],name:x[0],target:original.target,sets:original.sets,type:original.type}}
    if(n===0){const name=prompt('Nome do exercício substituto');if(!name?.trim())return null;return{id:'alt_'+slug(name),name:name.trim().slice(0,70),target:original.target,sets:original.sets,type:original.type}}
    toast('Escolha uma opção válida');return null
  }
  function addExtra(d){
    const name=prompt('Qual exercício quer acrescentar neste treino?');if(!name?.trim())return;
    const target=prompt('Meta de séries/repetições (ex.: 3×8-12)', '3×8-12');if(target===null)return;
    const setsMatch=String(target).match(/^\s*(\d+)/),sets=Math.max(1,Math.min(10,Number(setsMatch?.[1]||3)));
    const kind=prompt('Tipo: 1 = peso + reps, 2 = somente reps, 3 = tempo em segundos','1');if(kind===null)return;
    const type=kind==='2'?'reps':kind==='3'?'time':'weight_reps';const id='extra_'+slug(name);
    const s=session(d);if(s.extras.some(x=>x.id===id)){toast('Esse exercício já foi acrescentado hoje');return}
    s.extras.push({id,name:name.trim().slice(0,70),target:target.trim()||(''+sets+' séries'),sets,type});saveFlex();render()
  }
  function clearDraftIndex(d,i){if(db.draft?.[d]){delete db.draft[d][i];save()}}

  const baseRenderList=renderList;
  renderList=function(){
    const original=PLAN[day]?.ex,variant=variantObjects(day);if(PLAN[day])PLAN[day].ex=variant.map(toArray);
    try{baseRenderList.apply(this,arguments)}finally{if(PLAN[day])PLAN[day].ex=original}
    const box=$('list');if(!box)return;const cards=[...box.querySelectorAll(':scope > .ex')];const baseCount=baseObjects(day).length,s=session(day);
    cards.slice(0,variant.length).forEach((card,i)=>{
      const obj=variant[i],actions=document.createElement('div');actions.className='session-ex-actions';
      if(i<baseCount){
        const swap=document.createElement('button');swap.className='ghost small';swap.textContent=s.subs[i]?'Trocar novamente':'Trocar exercício';swap.onclick=()=>{const originalObj=baseObjects(day)[i],draft=db.draft?.[day]?.[i],dirty=Array.isArray(draft)&&draft.some(x=>x.w||x.r||x.seconds||x.ok);if(dirty&&!confirm('Trocar o exercício e limpar as séries digitadas neste exercício?'))return;const alt=chooseAlternative(originalObj);if(!alt)return;s.subs[i]=alt;clearDraftIndex(day,i);saveFlex();render()};actions.appendChild(swap);
        if(s.subs[i]){const undo=document.createElement('button');undo.className='ghost small';undo.textContent='Usar planejado';undo.onclick=()=>{const draft=db.draft?.[day]?.[i],dirty=Array.isArray(draft)&&draft.some(x=>x.w||x.r||x.seconds||x.ok);if(dirty&&!confirm('Voltar ao exercício planejado e limpar as séries digitadas aqui?'))return;delete s.subs[i];clearDraftIndex(day,i);saveFlex();render()};actions.appendChild(undo);const tag=document.createElement('span');tag.className='session-tag';tag.textContent='Substitui '+obj.substituteForName;actions.appendChild(tag)}
      }else{
        const rem=document.createElement('button');rem.className='ghost small danger';rem.textContent='Remover extra';rem.onclick=()=>{if(!confirm('Remover este exercício extra do treino de hoje?'))return;s.extras=s.extras.filter(x=>x.id!==obj.id);if(db.draft?.[day])Object.keys(db.draft[day]).filter(k=>Number(k)>=baseCount).forEach(k=>delete db.draft[day][k]);saveFlex();save();render()};actions.appendChild(rem);const tag=document.createElement('span');tag.className='session-tag';tag.textContent='Extra de hoje';actions.appendChild(tag)
      }
      const h=card.querySelector('.ex-h');h?h.insertAdjacentElement('afterend',actions):card.prepend(actions)
    });
    const add=document.createElement('button');add.className='ghost add-session-ex';add.textContent='+ Acrescentar exercício neste treino';add.onclick=()=>addExtra(day);box.appendChild(add);
    if(Object.keys(s.subs||{}).length||s.extras?.length){const note=document.createElement('div');note.className='session-note';note.textContent='Alterações abaixo valem só para esta sessão. Seu plano permanente não será modificado.';box.prepend(note)}
  };

  function setValueFor(type,s){if(type==='time'){const v=num(s?.seconds);if(v!==null)return{seconds:v};const r=num(s?.r);return r!==null?{seconds:r}:null}if(type==='reps'){const r=num(s?.r);return r!==null?{r}:null}const w=num(s?.w),r=num(s?.r);return w!==null&&r!==null?{w,r}:null}
  finish=function(){
    const variant=variantObjects(day),ex={},exById={},exMeta={},exerciseOrder=[];let total=0;
    variant.forEach((obj,i)=>{const type=obj.type||inferType(obj,obj.id),draft=db.draft?.[day]?.[i]||[],out=[];draft.filter(s=>s.ok).forEach(s=>{const v=setValueFor(type,s);if(v)out.push(v)});if(!out.length)return;ex[i]=clone(out);exById[obj.id]=clone(out);exMeta[obj.id]={name:obj.name,target:obj.target,type,substituteFor:obj.substituteFor||null,extra:!!obj.extra};exerciseOrder[i]=obj.id;total+=out.length});
    if(!total){toast('Marque ao menos uma série preenchida');return}
    const cp=db.training?.current;db.logs.push({t:Date.now(),day,ex,exById,exMeta,exerciseOrder,planId:cp?.id,planName:cp?.name,planSnapshot:cp?clone(cp):null});delete db.draft[day];clearSession(day);save();toast('Treino '+day+' salvo!');render()
  };

  function planById(id){if(db.training?.current?.id===id)return db.training.current;return(db.training?.archived||[]).find(p=>p.id===id)||null}
  function findMeta(id,log){if(log.exMeta?.[id])return Object.assign({id},log.exMeta[id]);const p=planById(log.planId);for(const d of Object.values(p?.days||{}))for(const x of d.ex||[])if(x.id===id)return{id,name:x.name,target:x.target,type:x.type};for(const x of baseObjects(log.day||day))if(x.id===id)return x;return{id,name:id,target:'',type:inferType(null,id)}}
  function logExercises(log){
    const out=[];
    if(log.exById&&Object.keys(log.exById).length){for(const[id,sets]of Object.entries(log.exById)){const m=findMeta(id,log);out.push({id,name:m.name||id,target:m.target||'',type:m.type||inferType(m,id),sets:clone(sets||[])})}return out}
    const p=planById(log.planId),arr=p?.days?.[log.day]?.ex||baseObjects(log.day);for(const[k,sets]of Object.entries(log.ex||{})){const i=Number(k),m=arr?.[i]||{id:log.day+'_'+i,name:'Exercício '+(i+1),target:'',type:'weight_reps'};out.push({id:m.id,name:m.name,target:m.target,type:m.type||inferType(m,m.id),sets:clone(sets||[])})}return out
  }
  function startLogEdit(log){editLogT=log.t;editData=logExercises(log);renderProg()}
  function saveLogEdit(){
    const log=db.logs.find(x=>x.t===editLogT);if(!log)return;log.exById=log.exById||{};log.exMeta=log.exMeta||{};
    const keep=new Set();editData.forEach(x=>{const clean=x.sets.map(s=>setValueFor(x.type,s)).filter(Boolean);if(!clean.length)return;keep.add(x.id);log.exById[x.id]=clean;log.exMeta[x.id]=Object.assign({},log.exMeta[x.id]||{},{name:x.name,target:x.target,type:x.type})});
    Object.keys(log.exById).forEach(id=>{if(!keep.has(id)){delete log.exById[id];delete log.exMeta[id]}});
    if(Array.isArray(log.exerciseOrder)){log.ex={};log.exerciseOrder.forEach((id,i)=>{if(log.exById[id])log.ex[i]=clone(log.exById[id])})}else{const p=planById(log.planId),arr=p?.days?.[log.day]?.ex||baseObjects(log.day);log.ex=log.ex||{};arr.forEach((x,i)=>{if(log.exById[x.id])log.ex[i]=clone(log.exById[x.id])})}
    editLogT=null;editData=null;save();renderProg();toast('Treino corrigido')
  }
  function editorCard(log){
    const c=document.createElement('div');c.className='ex workout-log-editor';const hd=document.createElement('div');hd.className='ex-h';const h=document.createElement('h3');h.textContent='Editar treino '+dateBR(log.t);const badge=document.createElement('span');badge.className='tgt';badge.textContent='Treino '+log.day;hd.append(h,badge);c.appendChild(hd);
    const p=document.createElement('p');p.className='hint';p.textContent='Corrija peso, repetições ou tempo. Isso atualiza o histórico de força sem criar um treino novo.';c.appendChild(p);
    editData.forEach((x,xi)=>{const block=document.createElement('div');block.className='log-ex-edit';const title=document.createElement('b');title.textContent=x.name;block.appendChild(title);x.sets.forEach((s,si)=>{const row=document.createElement('div');row.className='log-set-edit';const n=document.createElement('span');n.textContent=si+1;if(x.type==='time'){const a=document.createElement('input');a.type='number';a.inputMode='numeric';a.placeholder='segundos';a.value=s.seconds??s.r??'';a.oninput=()=>{x.sets[si]={seconds:a.value}};row.append(n,a)}else if(x.type==='reps'){const a=document.createElement('input');a.type='number';a.inputMode='numeric';a.placeholder='reps';a.value=s.r??'';a.oninput=()=>{x.sets[si]={r:a.value}};row.append(n,a)}else{const w=document.createElement('input');w.type='number';w.inputMode='decimal';w.placeholder='kg';w.value=s.w??'';const r=document.createElement('input');r.type='number';r.inputMode='numeric';r.placeholder='reps';r.value=s.r??'';w.oninput=()=>x.sets[si].w=w.value;r.oninput=()=>x.sets[si].r=r.value;row.append(n,w,r)}const del=document.createElement('button');del.className='ghost tiny danger';del.textContent='×';del.onclick=()=>{x.sets.splice(si,1);renderProg()};row.appendChild(del);block.appendChild(row)});const add=document.createElement('button');add.className='ghost small';add.textContent='+ Série';add.onclick=()=>{x.sets.push(x.type==='time'?{seconds:''}:x.type==='reps'?{r:''}:{w:'',r:''});renderProg()};block.appendChild(add);c.appendChild(block)});
    const ac=document.createElement('div');ac.className='edit-workout-actions';const cancel=document.createElement('button');cancel.className='ghost';cancel.textContent='Cancelar';cancel.onclick=()=>{editLogT=null;editData=null;renderProg()};const saveB=document.createElement('button');saveB.className='primary compact-primary';saveB.textContent='Salvar correções';saveB.onclick=saveLogEdit;ac.append(cancel,saveB);c.appendChild(ac);return c
  }
  function enhanceStrength(){
    const v=$('vProg');if(!v)return;const active=[...v.querySelectorAll('.prog-switch button')].find(b=>b.getAttribute('aria-pressed')==='true');if(!active||active.textContent.trim()!=='Força')return;
    v.querySelector('.completed-workouts-card')?.remove();v.querySelector('.workout-log-editor')?.remove();
    const card=document.createElement('div');card.className='ex completed-workouts-card';const hd=document.createElement('div');hd.className='ex-h';const h=document.createElement('h3');h.textContent='Treinos registrados';const badge=document.createElement('span');badge.className='tgt';badge.textContent='Corrigir registro';hd.append(h,badge);card.appendChild(hd);const p=document.createElement('p');p.className='hint';p.textContent='Se registrou uma carga ou repetição errada, edite o treino original aqui.';card.appendChild(p);
    db.logs.slice().sort((a,b)=>b.t-a.t).slice(0,12).forEach(log=>{const r=document.createElement('div');r.className='completed-workout-row';const tx=document.createElement('div');const series=Object.values(log.exById||log.ex||{}).reduce((n,a)=>n+(a?.length||0),0);tx.innerHTML='<b>'+dateBR(log.t)+' · Treino '+log.day+'</b><span>'+(log.planName||'Plano')+' · '+series+' séries</span>';const b=document.createElement('button');b.className='ghost small';b.textContent='Editar';b.onclick=()=>startLogEdit(log);r.append(tx,b);card.appendChild(r)});
    const sw=v.querySelector('.prog-switch');sw?.insertAdjacentElement('afterend',card);if(editLogT){const log=db.logs.find(x=>x.t===editLogT);if(log)card.insertAdjacentElement('afterend',editorCard(log))}
  }
  const baseRenderProg=renderProg;renderProg=function(){baseRenderProg.apply(this,arguments);requestAnimationFrame(enhanceStrength)};

  const style=document.createElement('style');style.textContent='.session-ex-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:-2px 0 9px}.session-tag{font-size:11px;color:var(--mute);margin-left:auto}.add-session-ex{width:100%;margin:4px 0 12px;padding:11px}.session-note{font-size:12px;color:var(--mute);background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:9px 10px;margin-bottom:10px}.completed-workout-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid var(--line)}.completed-workout-row:first-of-type{border-top:0}.completed-workout-row div{min-width:0}.completed-workout-row b,.completed-workout-row span{display:block}.completed-workout-row span{font-size:11px;color:var(--mute);margin-top:2px}.log-ex-edit{border-top:1px solid var(--line);padding:10px 0}.log-ex-edit>b{display:block;margin-bottom:7px}.log-set-edit{display:grid;grid-template-columns:22px minmax(0,1fr) minmax(0,1fr) 34px;gap:6px;align-items:center;margin:6px 0}.log-set-edit input{min-width:0;width:100%;font:600 15px Barlow,system-ui,sans-serif;padding:8px;border:1.5px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)}.log-set-edit:has(input:nth-of-type(1):last-of-type){grid-template-columns:22px minmax(0,1fr) 34px}.ghost.tiny{padding:7px 8px;min-width:0}.edit-workout-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}';document.head.appendChild(style);
})();
