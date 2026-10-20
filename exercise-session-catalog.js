// Visible exercise catalog for the normal workout screen.
// It reuses the existing session-only substitution/extra logic, so saved workout data is not migrated or deleted.
(function(){
  const norm=s=>String(s||'').trim().toLocaleLowerCase('pt-BR');
  const catalog=()=>window.ExerciseCatalog?.all?.()||[];
  const byName=name=>window.ExerciseCatalog?.byName?.(name)||null;

  function typeCode(type){return type==='reps'?'2':type==='time'?'3':'1'}
  function withPromptAnswers(answers,fn){
    const old=window.prompt;let i=0;
    window.prompt=function(){return i<answers.length?String(answers[i++]):null};
    try{return fn()}finally{window.prompt=old}
  }

  function openPicker(opts={}){
    const items=catalog();if(!items.length){toast('Catálogo ainda está carregando');return}
    document.querySelector('.exercise-catalog-overlay')?.remove();
    const overlay=document.createElement('div');overlay.className='exercise-catalog-overlay';
    const panel=document.createElement('div');panel.className='exercise-catalog-panel';
    const head=document.createElement('div');head.className='exercise-catalog-head';
    const title=document.createElement('div');title.innerHTML='<b>'+(opts.title||'Catálogo de exercícios')+'</b><span>'+items.length+' exercícios disponíveis</span>';
    const close=document.createElement('button');close.className='ghost catalog-close';close.textContent='×';close.setAttribute('aria-label','Fechar catálogo');close.onclick=()=>overlay.remove();
    head.append(title,close);panel.appendChild(head);

    const controls=document.createElement('div');controls.className='exercise-catalog-controls';
    const search=document.createElement('input');search.type='search';search.placeholder='Buscar exercício';search.autocomplete='off';
    const group=document.createElement('select');group.innerHTML='<option value="">Todos os grupos</option>';
    [...new Set(items.map(x=>x.group||'Outros'))].sort((a,b)=>a.localeCompare(b,'pt-BR')).forEach(g=>{const o=document.createElement('option');o.value=g;o.textContent=g;group.appendChild(o)});
    controls.append(search,group);panel.appendChild(controls);

    const list=document.createElement('div');list.className='exercise-catalog-list';panel.appendChild(list);overlay.appendChild(panel);document.body.appendChild(overlay);

    function renderItems(){
      const q=norm(search.value),g=group.value,filterType=opts.type||null;
      const rows=items.filter(x=>(!filterType||x.type===filterType)&&(!g||x.group===g)&&(!q||norm(x.name+' '+(x.equipment||'')+' '+(x.group||'')).includes(q)));
      list.innerHTML='';
      if(!rows.length){const e=document.createElement('div');e.className='catalog-empty';e.textContent='Nenhum exercício encontrado.';list.appendChild(e);return}
      rows.forEach(x=>{
        const b=document.createElement('button');b.className='exercise-catalog-item';
        const visual=document.createElement('div');visual.className='catalog-item-image';
        if(x.file){const img=document.createElement('img');img.src=x.file;img.alt='';img.loading='lazy';img.decoding='async';img.onerror=()=>{img.remove();visual.classList.add('missing')};visual.appendChild(img)}else visual.classList.add('missing');
        const copy=document.createElement('div');copy.className='catalog-item-copy';copy.innerHTML='<b>'+x.name+'</b><span>'+(x.group||'')+(x.equipment?' · '+x.equipment:'')+'</span><small>'+x.target+' · '+x.sets+' série'+(Number(x.sets)===1?'':'s')+'</small>';
        const pick=document.createElement('span');pick.className='catalog-pick-label';pick.textContent='Escolher';
        b.append(visual,copy,pick);b.onclick=()=>{overlay.remove();opts.onPick?.(x)};list.appendChild(b)
      })
    }

    search.oninput=renderItems;group.onchange=renderItems;overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};renderItems();setTimeout(()=>search.focus(),50);
  }

  function enhance(){
    const box=document.getElementById('list');if(!box)return;
    if(box.querySelector('.plan-editor,.plan-manager'))return;
    const items=catalog();if(!items.length)return;

    if(!box.querySelector('.session-catalog-banner')){
      const banner=document.createElement('button');banner.className='session-catalog-banner';
      banner.innerHTML='<span><b>Catálogo de exercícios</b><small>'+items.length+' opções por grupo muscular</small></span><strong>Ver catálogo</strong>';
      banner.onclick=()=>openPicker({title:'Catálogo de exercícios'});box.prepend(banner);
    }

    [...box.querySelectorAll('.session-ex-actions')].forEach(actions=>{
      const swap=[...actions.querySelectorAll('button')].find(b=>/^Trocar exercício$|^Trocar novamente$/.test(b.textContent.trim()));
      if(!swap||swap.dataset.catalogSessionWrapped)return;
      swap.dataset.catalogSessionWrapped='1';const original=swap.onclick;
      const card=actions.closest('.ex'),name=card?.querySelector('.ex-h h3')?.textContent||'';
      const current=byName(name);
      const type=current?.type||(card?.classList.contains('exercise-time')?'time':card?.classList.contains('exercise-reps')?'reps':'weight_reps');
      swap.onclick=e=>{
        e.preventDefault();
        openPicker({title:'Trocar “'+name+'”',type,onPick:item=>withPromptAnswers(['0',item.name],()=>original?.call(swap,e))});
      };
    });

    const add=box.querySelector('.add-session-ex');
    if(add&&!add.dataset.catalogSessionWrapped){
      add.dataset.catalogSessionWrapped='1';const original=add.onclick;
      add.onclick=e=>{
        e.preventDefault();
        openPicker({title:'Acrescentar exercício neste treino',onPick:item=>withPromptAnswers([item.name,item.target||'3×8-12',typeCode(item.type)],()=>original?.call(add,e))});
      };
    }
  }

  const base=window.renderList;
  if(typeof base==='function')window.renderList=function(){const r=base.apply(this,arguments);requestAnimationFrame(enhance);return r};
  window.ExerciseCatalog?.ready?.then(()=>requestAnimationFrame(enhance));

  const style=document.createElement('style');
  style.textContent='.session-catalog-banner{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;background:var(--card);color:var(--ink);border:1.5px solid var(--acc);border-radius:12px;padding:11px 12px;margin:0 0 12px;cursor:pointer}.session-catalog-banner span{display:grid;gap:1px}.session-catalog-banner b{font:700 18px "Barlow Condensed",Barlow,sans-serif}.session-catalog-banner small{color:var(--mute);font-size:11px}.session-catalog-banner strong{color:var(--acc);font-size:13px;white-space:nowrap}.exercise-catalog-overlay{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center;padding-top:40px}.exercise-catalog-panel{width:min(600px,100%);max-height:88vh;background:var(--bg);border-radius:18px 18px 0 0;padding:12px;display:flex;flex-direction:column;box-shadow:0 -8px 30px rgba(0,0,0,.18)}.exercise-catalog-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 2px 10px}.exercise-catalog-head>div{display:grid}.exercise-catalog-head b{font:700 23px "Barlow Condensed",Barlow,sans-serif}.exercise-catalog-head span{font-size:12px;color:var(--mute)}.catalog-close{font-size:22px;line-height:1;padding:7px 11px}.exercise-catalog-controls{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:8px;margin-bottom:9px}.exercise-catalog-controls input,.exercise-catalog-controls select{width:100%;min-width:0;padding:10px;border:1.5px solid var(--line);border-radius:9px;background:var(--card);color:var(--ink);font:500 15px Barlow,system-ui,sans-serif}.exercise-catalog-list{overflow:auto;display:grid;gap:7px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px))}.exercise-catalog-item{width:100%;display:grid;grid-template-columns:58px minmax(0,1fr) auto;gap:10px;align-items:center;text-align:left;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:11px;padding:7px;cursor:pointer}.catalog-item-image{width:58px;height:58px;border-radius:8px;overflow:hidden;background:var(--line)}.catalog-item-image img{width:100%;height:100%;object-fit:cover}.catalog-item-image.missing:after{content:"IMG";display:grid;place-items:center;width:100%;height:100%;font-size:10px;color:var(--mute)}.catalog-item-copy{min-width:0;display:grid}.catalog-item-copy b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.catalog-item-copy span,.catalog-item-copy small{font-size:11px;color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.catalog-pick-label{font-size:12px;font-weight:700;color:var(--acc)}.catalog-empty{padding:30px 12px;text-align:center;color:var(--mute)}@media(max-width:390px){.exercise-catalog-controls{grid-template-columns:1fr}.exercise-catalog-item{grid-template-columns:52px minmax(0,1fr)}.catalog-item-image{width:52px;height:52px}.catalog-pick-label{display:none}}';
  document.head.appendChild(style);
})();
