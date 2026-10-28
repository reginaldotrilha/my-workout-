// Recover historical sets for catalog exercises that were previously saved with extra_/alt_ IDs.
// Keeps a backup before migrating saved logs and also backfills untouched current-session drafts.
(function(){
  const BACKUP_KEY='treino_v1_backup_before_exercise_history_alias_v1';
  const FLEX_KEY='treino_workout_flex_v1';
  const norm=s=>String(s||'').trim().toLocaleLowerCase('pt-BR');
  const slug=s=>String(s||'exercise').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,50)||'exercise';
  const clone=x=>JSON.parse(JSON.stringify(x));

  function catalogItem(name){return window.ExerciseCatalog?.byName?.(name)||null}
  function allIdsFor(name,currentId){
    const ids=new Set();
    if(currentId)ids.add(currentId);
    const item=catalogItem(name);
    if(item?.id)ids.add(item.id);
    if(name){ids.add('extra_'+slug(name));ids.add('alt_'+slug(name));}
    return ids;
  }

  function rowsForName(name,currentId){
    const ids=allIdsFor(name,currentId),out=[];
    for(const log of db.logs||[]){
      let sets=[];
      if(log?.exById){
        for(const [id,a] of Object.entries(log.exById)){
          const metaName=log.exMeta?.[id]?.name||'';
          if(ids.has(id)||(name&&norm(metaName)===norm(name)))sets=sets.concat(clone(a||[]));
        }
      }
      if(sets.length)out.push({t:log.t,sets,planId:log.planId,name});
    }
    return out.sort((a,b)=>a.t-b.t);
  }

  function isWeightedCatalogExercise(name){
    const item=catalogItem(name);
    if(!item)return true;
    if(item.type==='reps'||item.type==='time')return false;
    return !/bodyweight/i.test(String(item.equipment||''));
  }

  function cleanRows(name,rows){
    const ordered=(rows||[]).slice().sort((a,b)=>a.t-b.t);
    if(!isWeightedCatalogExercise(name))return ordered;
    const valid=ordered.filter(row=>(row.sets||[]).some(s=>Number(s?.w)>0));
    // Preserve zero-weight legacy rows when they are all we have; otherwise keep them out of
    // Last/Record/autofill calculations without deleting the underlying saved log.
    return valid.length?valid:ordered;
  }

  function usefulLast(name,currentId){
    const rows=cleanRows(name,rowsForName(name,currentId));
    return rows.length?rows.at(-1):null;
  }

  function patchTrainingHistory(){
    if(typeof window.trainingHistory!=='function'||window.trainingHistory.__catalogAliasPatched)return;
    const base=window.trainingHistory;
    const wrapped=function(d,i,e){
      const name=Array.isArray(e)?e[0]:(e?.name||'');
      const id=Array.isArray(e)?e[3]:(e?.id||null);
      const byTime=new Map();
      (base.apply(this,arguments)||[]).forEach(x=>byTime.set(x.t,clone(x)));
      rowsForName(name,id).forEach(x=>{
        const prev=byTime.get(x.t);
        if(!prev){byTime.set(x.t,clone(x));return;}
        const seen=new Set((prev.sets||[]).map(s=>JSON.stringify(s)));
        (x.sets||[]).forEach(s=>{const k=JSON.stringify(s);if(!seen.has(k)){prev.sets.push(clone(s));seen.add(k)}});
      });
      return cleanRows(name,[...byTime.values()]);
    };
    wrapped.__catalogAliasPatched=true;
    window.trainingHistory=wrapped;
  }

  function migrateLogs(){
    if(!window.ExerciseCatalog?.byName||!Array.isArray(db?.logs))return {changed:false,moved:0,logs:0};
    let changed=false,moved=0,logsChanged=0,backedUp=false;
    for(const log of db.logs){
      if(!log?.exById||!log.exMeta)continue;
      let thisLog=false;
      for(const oldId of Object.keys(log.exById)){
        if(!(oldId.startsWith('extra_')||oldId.startsWith('alt_')))continue;
        const meta=log.exMeta?.[oldId],name=meta?.name||'';if(!name)continue;
        const item=catalogItem(name);if(!item?.id||item.id===oldId)continue;
        if(!backedUp){
          try{if(!localStorage.getItem(BACKUP_KEY))localStorage.setItem(BACKUP_KEY,localStorage.getItem(KEY)||JSON.stringify(db))}catch(e){}
          backedUp=true;
        }
        const id=item.id,oldSets=clone(log.exById[oldId]||[]);
        if(Array.isArray(log.exById[id])){
          const seen=new Set(log.exById[id].map(s=>JSON.stringify(s)));
          oldSets.forEach(s=>{const k=JSON.stringify(s);if(!seen.has(k)){log.exById[id].push(s);seen.add(k)}});
        }else log.exById[id]=oldSets;
        log.exMeta[id]=Object.assign({},meta,{name:item.name||name,target:item.target||meta.target,type:item.type||meta.type,catalogId:id});
        delete log.exById[oldId];delete log.exMeta[oldId];
        if(Array.isArray(log.exerciseOrder))log.exerciseOrder=log.exerciseOrder.map(x=>x===oldId?id:x);
        changed=true;thisLog=true;moved++;
      }
      if(thisLog)logsChanged++;
    }
    if(changed){try{save()}catch(e){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(_){}}}
    return {changed,moved,logs:logsChanged};
  }

  function currentFlexExtras(){
    try{
      const flex=JSON.parse(localStorage.getItem(FLEX_KEY)||'{}')||{};
      const key=(db.training?.current?.id||'plan')+':'+day;
      return flex.sessions?.[key]?.extras||[];
    }catch(e){return[]}
  }

  function backfillExtraDrafts(){
    const extras=currentFlexExtras();if(!extras.length)return false;
    const baseCount=db.training?.current?.days?.[day]?.ex?.length??0;
    let changed=false;
    extras.forEach((extra,j)=>{
      const idx=baseCount+j,draft=db.draft?.[day]?.[idx];
      if(!Array.isArray(draft)||!draft.length)return;
      if(draft.some(s=>s?.ok||String(s?.w??'').trim()||String(s?.r??'').trim()||String(s?.seconds??'').trim()))return;
      const last=usefulLast(extra.name,extra.id);if(!last?.sets?.length)return;
      draft.forEach((s,k)=>{
        const q=last.sets[k]||last.sets.at(-1);if(!q)return;
        if(Object.prototype.hasOwnProperty.call(q,'seconds'))s.seconds=q.seconds??'';
        else {if(q.w!==undefined)s.w=q.w??'';if(q.r!==undefined)s.r=q.r??'';}
      });
      changed=true;
    });
    if(changed){try{save()}catch(e){}}
    return changed;
  }

  function patchRender(){
    if(typeof window.renderList!=='function'||window.renderList.__historyBackfillPatched)return;
    const base=window.renderList;
    const wrapped=function(){
      const r=base.apply(this,arguments);
      if(backfillExtraDrafts())requestAnimationFrame(()=>base.apply(this,arguments));
      return r;
    };
    wrapped.__historyBackfillPatched=true;
    window.renderList=wrapped;
  }

  function patchFinish(){
    if(typeof window.finish!=='function'||window.finish.__historyAliasPatched)return;
    const base=window.finish;
    const wrapped=function(){
      const before=(db.logs||[]).length;
      const r=base.apply(this,arguments);
      if((db.logs||[]).length>before)migrateLogs();
      return r;
    };
    wrapped.__historyAliasPatched=true;
    window.finish=wrapped;
  }

  async function run(){
    try{await window.ExerciseCatalog?.ready}catch(e){}
    patchTrainingHistory();patchRender();patchFinish();
    const report=migrateLogs();window.exerciseHistoryAliasReport=report;
    const filled=backfillExtraDrafts();
    if(report.changed||filled){
      if(typeof render==='function')requestAnimationFrame(()=>render());
      if(report.changed&&typeof toast==='function')setTimeout(()=>toast('Histórico de exercícios reconciliado'),250);
    }
  }
  run();
})();
