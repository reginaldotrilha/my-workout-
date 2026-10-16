// Adds safe exercise-name editing to the completed-workout correction screen.
(function(){
  let activeLogT=null;
  const pending={};

  function sortedLogs(){return (db.logs||[]).slice().sort((a,b)=>b.t-a.t).slice(0,12)}
  function currentLog(){return (db.logs||[]).find(x=>x.t===activeLogT)||null}
  function idsFor(log){
    if(!log)return[];
    if(log.exById&&Object.keys(log.exById).length)return Object.keys(log.exById);
    if(Array.isArray(log.exerciseOrder)&&log.exerciseOrder.length)return log.exerciseOrder.filter(Boolean);
    return Object.keys(log.ex||{}).map(k=>log.day+'_'+k);
  }
  function currentName(log,id,idx){
    if(log?.exMeta?.[id]?.name)return log.exMeta[id].name;
    const blocks=[...document.querySelectorAll('.workout-log-editor .log-ex-edit')];
    return blocks[idx]?.querySelector('b')?.textContent||id;
  }
  function applyRename(log,id,name){
    if(!log||!id||!name)return;
    log.exMeta=log.exMeta||{};
    log.exMeta[id]=Object.assign({},log.exMeta[id]||{},{name});
  }
  function persistPending(){
    const log=currentLog();if(!log)return;
    const m=pending[activeLogT]||{};
    Object.entries(m).forEach(([id,name])=>applyRename(log,id,name));
    save();
  }
  function hookWorkoutRows(){
    const rows=[...document.querySelectorAll('.completed-workouts-card .completed-workout-row')],logs=sortedLogs();
    rows.forEach((row,i)=>{
      const b=row.querySelector('button');if(!b||b.dataset.renameHook)return;
      b.dataset.renameHook='1';
      b.addEventListener('click',()=>{if(logs[i])activeLogT=logs[i].t},{capture:true});
    });
  }
  function enhanceEditor(){
    hookWorkoutRows();
    const editor=document.querySelector('.workout-log-editor');if(!editor)return;
    const log=currentLog();if(!log)return;
    const ids=idsFor(log),blocks=[...editor.querySelectorAll('.log-ex-edit')];
    blocks.forEach((block,i)=>{
      if(block.querySelector('.rename-completed-ex'))return;
      const id=ids[i];if(!id)return;
      const title=block.querySelector('b');if(!title)return;
      const head=document.createElement('div');head.className='completed-ex-head';
      title.parentNode.insertBefore(head,title);head.appendChild(title);
      const btn=document.createElement('button');btn.className='ghost small rename-completed-ex';btn.textContent='Editar nome';
      btn.onclick=()=>{
        const old=(pending[activeLogT]?.[id])||currentName(log,id,i);
        const name=prompt('Nome do exercício',old);if(name===null)return;
        const clean=name.trim().slice(0,70);if(!clean){toast('Digite um nome para o exercício');return}
        pending[activeLogT]=pending[activeLogT]||{};pending[activeLogT][id]=clean;
        title.textContent=clean;applyRename(log,id,clean);save();toast('Nome atualizado');
      };
      head.appendChild(btn);
    });
    const saveBtn=[...editor.querySelectorAll('button')].find(b=>b.textContent.trim()==='Salvar correções');
    if(saveBtn&&!saveBtn.dataset.renameSaveHook){saveBtn.dataset.renameSaveHook='1';saveBtn.addEventListener('click',()=>setTimeout(()=>{persistPending();renderProg()},0),{capture:true})}
  }

  const base=window.renderProg;
  if(typeof base==='function')window.renderProg=function(){base.apply(this,arguments);requestAnimationFrame(enhanceEditor)};

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('.completed-workouts-card .completed-workout-row button'))setTimeout(enhanceEditor,0);
  });

  const style=document.createElement('style');
  style.textContent='.completed-ex-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}.completed-ex-head>b{margin:0}.rename-completed-ex{flex:0 0 auto}';
  document.head.appendChild(style);
})();
