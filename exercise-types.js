// Exercise input types: weighted reps, bodyweight reps, and timed sets.
// Existing logs are preserved; only entry/display semantics change for core exercises.
(function(){
  const TYPE_BY_ID={plank:'time',ab_wheel_or_leg_raise:'reps'};
  const TYPE_BY_NAME={'Prancha (segundos)':'time','Abdominal infra ou roda':'reps'};
  const typeOf=e=>TYPE_BY_ID[e?.[3]]||TYPE_BY_NAME[e?.[0]]||'weight_reps';
  const idOf=(d,i,e)=>e?.[3]||d+'_'+i;
  const fmtDate=t=>new Date(t).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
  const history=(d,i,e)=>typeof window.trainingHistory==='function'?window.trainingHistory(d,i,e):[];
  const latest=(d,i,e)=>{const h=history(d,i,e);return h.length?h[h.length-1]:null};
  const secs=s=>{const a=num(s?.seconds);if(a!==null)return a;const r=num(s?.r),w=num(s?.w);return r!==null&&(w===0||w===null)?r:null};
  const reps=s=>num(s?.r);

  const originalRenderList=renderList;
  renderList=function(){
    originalRenderList.apply(this,arguments);
    const p=PLAN[day];if(!p||!$('list'))return;
    p.ex.forEach((e,i)=>{
      const type=typeOf(e);if(type==='weight_reps')return;
      const card=[...$('list').querySelectorAll('.ex')].find(c=>c.querySelector('h3')?.textContent===e[0]);if(!card)return;
      const ss=sets(day,i),last=latest(day,i,e),prior=last?.sets||[],rows=[...card.querySelectorAll('.set')];
      card.classList.add('exercise-'+type);
      if(type==='time'){
        ss.forEach((s,k)=>{const v=secs(s)??secs(prior[k]||prior.at(-1));s.seconds=v??'';delete s.w;delete s.r});
        rows.forEach((row,k)=>{const inputs=row.querySelectorAll('input'),w=inputs[0],r=inputs[1];if(w)w.remove();if(r){r.placeholder='segundos';r.value=ss[k]?.seconds??'';r.setAttribute('aria-label','Duração da série '+(k+1)+' em segundos');r.oninput=()=>{ss[k].seconds=r.value;save()}}row.classList.add('simple-set')});
        const hint=card.querySelector('.last-load');if(hint)hint.textContent=last?'Último: '+last.sets.map(s=>(secs(s)??0)+'s').join(', ')+' · '+fmtDate(last.t):'Sem registro ainda.';
        card.querySelector('.progression-hint')?.remove();
        const max=Number(String(e[1]).match(/(\d+)\s*s?\s*$/i)?.[1]||0),done=max&&last?.sets?.length>=Number(e[2])&&last.sets.slice(0,e[2]).every(s=>(secs(s)||0)>=max);
        if(done){const ph=document.createElement('div');ph.className='progression-hint';ph.textContent='✓ Meta de tempo concluída — considere aumentar o tempo ou a dificuldade.';const how=card.querySelector('.how');how?card.insertBefore(ph,how):card.appendChild(ph)}
      }else{
        ss.forEach(s=>delete s.w);
        rows.forEach((row,k)=>{const inputs=row.querySelectorAll('input'),w=inputs[0],r=inputs[1];if(w)w.remove();if(r){r.placeholder='reps';r.value=ss[k]?.r??'';r.setAttribute('aria-label','Repetições da série '+(k+1));r.oninput=()=>{ss[k].r=r.value;save()}}row.classList.add('simple-set')});
        const hint=card.querySelector('.last-load');if(hint)hint.textContent=last?'Último: '+last.sets.map(s=>(reps(s)??0)+' reps').join(', ')+' · '+fmtDate(last.t):'Sem registro ainda.';
        const ph=card.querySelector('.progression-hint');if(ph)ph.textContent='✓ Faixa concluída — considere mais repetições ou uma variação mais difícil.';
      }
    });
  };

  finish=function(){
    const p=PLAN[day],ex={},exById={},exMeta={};let total=0;
    p.ex.forEach((e,i)=>{
      const type=typeOf(e),draft=db.draft[day]?.[i]||[],out=[];
      if(type==='time')draft.filter(s=>s.ok&&secs(s)!==null).forEach(s=>out.push({seconds:secs(s)}));
      else if(type==='reps')draft.filter(s=>s.ok&&reps(s)!==null).forEach(s=>out.push({r:reps(s)}));
      else draft.filter(s=>s.ok&&num(s.w)!==null&&num(s.r)!==null).forEach(s=>out.push({w:num(s.w),r:num(s.r)}));
      if(!out.length)return;
      const id=idOf(day,i,e);ex[i]=JSON.parse(JSON.stringify(out));exById[id]=JSON.parse(JSON.stringify(out));exMeta[id]={name:e[0],target:e[1],type};total+=out.length;
    });
    if(!total){toast('Marque ao menos uma série preenchida');return}
    const cp=db.training?.current;db.logs.push({t:Date.now(),day,ex,exById,exMeta,planId:cp?.id,planName:cp?.name});delete db.draft[day];save();toast('Treino '+day+' salvo!');render();
  };

  const originalRenderProg=renderProg;
  renderProg=function(){
    originalRenderProg.apply(this,arguments);
    requestAnimationFrame(()=>{
      [['Prancha (segundos)','plank','time'],['Abdominal infra ou roda','ab_wheel_or_leg_raise','reps']].forEach(([name,id,type])=>{
        const card=[...document.querySelectorAll('#vProg .ex')].find(c=>c.querySelector('h3')?.textContent===name);if(!card)return;
        const rows=[];for(const l of db.logs||[]){const s=l.exById?.[id];if(s?.length)rows.push({t:l.t,sets:s})}
        if(!rows.length)return;rows.sort((a,b)=>a.t-b.t);
        const metric=x=>type==='time'?Math.max(...x.sets.map(s=>secs(s)||0)):Math.max(...x.sets.map(s=>reps(s)||0));
        const vals=rows.map(metric),now=vals.at(-1),best=Math.max(...vals),delta=now-vals[0],unit=type==='time'?' s':' reps',st=card.querySelector('.stat');
        if(st)st.innerHTML='<span>Atual <b>'+now+unit+'</b></span><span>Recorde <b>'+best+unit+'</b></span><span>Evolução <b>'+(delta>0?'+':'')+delta+unit+'</b></span>';
        const old=card.querySelector('.spark');if(old)old.remove();const sp=spark(vals);if(sp)card.appendChild(sp);
      });
    });
  };

  const style=document.createElement('style');
  style.textContent='.set.simple-set{grid-template-columns:24px 1fr 44px}.set.simple-set input{width:100%;font:600 18px Barlow,system-ui,sans-serif;padding:9px 8px;border:1.5px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink);min-width:0}';
  document.head.appendChild(style);
})();
