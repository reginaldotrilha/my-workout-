// Session-only extra set controls for workout exercise cards.
// Extra sets are kept outside the permanent plan and existing workout history.
(function(){
  const EXTRA_KEY='treino_session_extra_sets_v1';
  let state={sessions:{}};
  try{state=Object.assign(state,JSON.parse(localStorage.getItem(EXTRA_KEY)||'{}')||{})}catch(e){}
  state.sessions=state.sessions&&typeof state.sessions==='object'?state.sessions:{};

  const metaByDay={};
  const planId=()=>db.training?.current?.id||'plan';
  const sessionKey=d=>planId()+':'+d;
  const saveState=()=>{try{localStorage.setItem(EXTRA_KEY,JSON.stringify(state))}catch(e){}};
  const clamp=n=>Math.max(0,Math.min(9,Number(n)||0));
  const dirty=s=>!!(s&&(s.ok||String(s.w??'').trim()||String(s.r??'').trim()||String(s.seconds??'').trim()));

  function bucket(d,create){
    const k=sessionKey(d);
    if(!state.sessions[k]&&create)state.sessions[k]={};
    return state.sessions[k]||null;
  }
  function extraFor(d,id){return clamp(bucket(d,false)?.[id])}
  function setExtra(d,id,n){
    const value=clamp(n),k=sessionKey(d),b=bucket(d,value>0);
    if(value>0)b[id]=value;
    else if(b){delete b[id];if(!Object.keys(b).length)delete state.sessions[k]}
    saveState();
  }
  function copySet(s){
    if(s&&Object.prototype.hasOwnProperty.call(s,'seconds'))return{seconds:s.seconds??'',ok:false};
    if(s&&!Object.prototype.hasOwnProperty.call(s,'w'))return{r:s.r??'',ok:false};
    return{w:s?.w??'',r:s?.r??'',ok:false};
  }

  const baseSets=sets;
  sets=function(d,i){
    const e=PLAN[d]?.ex?.[i];
    if(!e)return baseSets(d,i);
    const id=e[3]||d+'_'+i,planned=Math.max(1,Number(e[2])||1),extra=extraFor(d,id),desired=Math.min(10,planned+extra),old=e[2];
    let a;
    e[2]=desired;
    try{a=baseSets(d,i)}finally{e[2]=old}
    metaByDay[d]=metaByDay[d]||{};
    metaByDay[d][i]={id,planned,extra,active:Array.isArray(a)?a.length:desired};
    return a;
  };

  function addExtra(d,i,meta){
    if(meta.planned+meta.extra>=10){toast('Máximo de 10 séries por exercício');return}
    const a=db.draft?.[d]?.[i];
    if(Array.isArray(a))a.push(copySet(a[a.length-1]));
    setExtra(d,meta.id,meta.extra+1);
    save();render();
  }
  function removeExtra(d,i,meta){
    if(meta.extra<=0)return;
    const a=db.draft?.[d]?.[i];
    const last=Array.isArray(a)?a[a.length-1]:null;
    if(dirty(last)&&!confirm('Remover a última série extra deste treino?'))return;
    if(Array.isArray(a)&&a.length>meta.planned)a.pop();
    setExtra(d,meta.id,meta.extra-1);
    save();render();
  }

  const baseRenderList=renderList;
  renderList=function(){
    metaByDay[day]={};
    baseRenderList.apply(this,arguments);
    const box=$('list');
    if(!box||$('finish')?.classList.contains('hidden'))return;
    const cards=[...box.querySelectorAll(':scope > .ex')].filter(c=>c.querySelector('.set'));
    cards.forEach((card,i)=>{
      const meta=metaByDay[day]?.[i];if(!meta)return;
      const controls=document.createElement('div');controls.className='extra-set-controls';
      const add=document.createElement('button');add.className='ghost extra-set-add';add.type='button';add.textContent='+ Adicionar série';add.onclick=()=>addExtra(day,i,meta);controls.appendChild(add);
      if(meta.extra>0){
        const badge=document.createElement('span');badge.className='extra-set-badge';badge.textContent='+'+meta.extra+' '+(meta.extra===1?'série extra':'séries extras');controls.appendChild(badge);
        const remove=document.createElement('button');remove.className='ghost small extra-set-remove';remove.type='button';remove.textContent='Remover extra';remove.onclick=()=>removeExtra(day,i,meta);controls.appendChild(remove);
      }
      card.appendChild(controls);
    });
  };

  const baseFinish=finish;
  finish=function(){
    const d=day,k=sessionKey(d),saved=state.sessions[k]?JSON.parse(JSON.stringify(state.sessions[k])):null,before=(db.logs||[]).length;
    if(saved){delete state.sessions[k];saveState()}
    try{baseFinish.apply(this,arguments)}finally{
      if((db.logs||[]).length===before&&saved){state.sessions[k]=saved;saveState()}
    }
  };

  const style=document.createElement('style');
  style.textContent='.extra-set-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid var(--line)}.extra-set-add{color:var(--acc);font-weight:700}.extra-set-badge{font-size:12px;font-weight:700;color:var(--acc);background:var(--ok);border-radius:999px;padding:5px 8px}.extra-set-remove{margin-left:auto}@media(max-width:390px){.extra-set-controls{align-items:stretch}.extra-set-add{flex:1 1 100%}.extra-set-badge{align-self:center}.extra-set-remove{margin-left:auto}}';
  document.head.appendChild(style);
})();
