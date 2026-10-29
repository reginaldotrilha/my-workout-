// Recover missing exercise metadata for old strength logs without changing sets, weights, reps or dates.
(function(){
  const BACKUP_KEY='treino_v1_backup_before_strength_name_recovery_20261029_v1';
  const DONE_KEY='treino_strength_name_recovery_20261029_v1';
  const clone=x=>JSON.parse(JSON.stringify(x));
  const technical=id=>!id||/^ex_\d+_/i.test(id)||/^(extra_|alt_)/i.test(id);

  function plans(){
    const out=[];
    if(db?.training?.current)out.push(db.training.current);
    for(const p of db?.training?.archived||[])if(p)out.push(p);
    for(const log of db?.logs||[])if(log?.planSnapshot)out.push(log.planSnapshot);
    return out;
  }

  function metaFromPlan(plan,id){
    if(!plan?.days||!id)return null;
    for(const [day,d] of Object.entries(plan.days)){
      for(const x of d?.ex||[]){
        if(x?.id===id)return {name:x.name||'',target:x.target||'',type:x.type||'',day};
      }
    }
    return null;
  }

  function knownMeta(id){
    if(!id)return null;
    // Best source: another completed log that already knows this same stable ID.
    for(const log of db?.logs||[]){
      const m=log?.exMeta?.[id];
      if(m?.name&&m.name!==id)return {name:m.name,target:m.target||'',type:m.type||'',day:log.day||''};
    }
    // Then search every saved plan snapshot/current/archived plan.
    for(const p of plans()){
      const m=metaFromPlan(p,id);if(m?.name)return m;
    }
    // Current live PLAN can recover stable IDs still present in the program.
    try{
      for(const [day,d] of Object.entries(window.PLAN||{})){
        for(const e of d?.ex||[]){if(e?.[3]===id)return {name:e[0]||'',target:e[1]||'',type:'',day};}
      }
    }catch(e){}
    // Catalog IDs, when available.
    try{
      const c=window.ExerciseCatalog?.byId?.(id);
      if(c?.name)return {name:c.name,target:c.target||'',type:c.type||'',day:''};
    }catch(e){}
    return null;
  }

  function positionalMeta(log,id){
    if(!log||!id)return null;
    const order=Array.isArray(log.exerciseOrder)?log.exerciseOrder:[];
    const i=order.indexOf(id);
    if(i<0)return null;
    const snap=log.planSnapshot?.days?.[log.day]?.ex?.[i];
    if(snap?.name)return {name:snap.name,target:snap.target||'',type:snap.type||'',day:log.day||''};
    const p=(db?.training?.current?.id===log.planId?db.training.current:(db?.training?.archived||[]).find(x=>x?.id===log.planId));
    const x=p?.days?.[log.day]?.ex?.[i];
    if(x?.name)return {name:x.name,target:x.target||'',type:x.type||'',day:log.day||''};
    return null;
  }

  function recover(){
    if(!Array.isArray(db?.logs)||!db.logs.length)return {changed:false,recovered:0,unresolved:[]};
    let changed=false,recovered=0,backed=false;
    const unresolved=new Set();
    const backup=()=>{
      if(backed)return;backed=true;
      try{
        if(!localStorage.getItem(BACKUP_KEY)){
          const raw=localStorage.getItem(KEY);
          if(raw)localStorage.setItem(BACKUP_KEY,raw);
        }
      }catch(e){}
    };

    for(const log of db.logs){
      if(!log?.exById)continue;
      log.exMeta=log.exMeta||{};
      for(const id of Object.keys(log.exById)){
        const current=log.exMeta[id]||{};
        if(current.name&&current.name!==id&&!technical(current.name))continue;
        const m=positionalMeta(log,id)||knownMeta(id);
        if(m?.name&&m.name!==id){
          backup();
          log.exMeta[id]=Object.assign({},current,{name:m.name});
          if(!log.exMeta[id].target&&m.target)log.exMeta[id].target=m.target;
          if(!log.exMeta[id].type&&m.type)log.exMeta[id].type=m.type;
          changed=true;recovered++;
        }else if(technical(id))unresolved.add(id);
      }
    }

    if(changed){
      try{save()}catch(e){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(_){}}
    }
    try{localStorage.setItem(DONE_KEY,JSON.stringify({at:Date.now(),recovered,unresolved:[...unresolved]}))}catch(e){}
    const report={changed,recovered,unresolved:[...unresolved]};
    window.strengthNameRecoveryReport=report;
    return report;
  }

  const report=recover();
  // Run again after the exercise catalog becomes available; this only fills still-missing metadata.
  Promise.resolve(window.ExerciseCatalog?.ready).catch(()=>null).then(()=>{
    const second=recover();
    if((report.changed||second.changed)&&typeof window.renderProg==='function')requestAnimationFrame(()=>window.renderProg());
  });
})();
