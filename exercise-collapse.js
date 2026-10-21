// Collapsible workout exercise cards. UI-only: never changes plan, drafts or history.
(function(){
  const UI_KEY='treino_exercise_collapse_v1';
  let ui={collapsed:{}};
  try{ui=Object.assign(ui,JSON.parse(localStorage.getItem(UI_KEY)||'{}')||{})}catch(e){}
  ui.collapsed=ui.collapsed&&typeof ui.collapsed==='object'?ui.collapsed:{};

  const saveUI=()=>{try{localStorage.setItem(UI_KEY,JSON.stringify(ui))}catch(e){}};
  const planId=()=>db.training?.current?.id||'plan';
  const slug=s=>String(s||'exercise').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,50)||'exercise';
  const keyFor=(d,i,card)=>planId()+':'+d+':'+i+':'+slug(card.querySelector('h3')?.textContent||'exercise');

  function progressText(card){
    const rows=[...card.querySelectorAll('.set')],total=rows.length;
    const done=rows.filter(r=>r.querySelector('.chk')?.getAttribute('aria-pressed')==='true').length;
    const extra=card.querySelector('.extra-set-badge')?.textContent?.trim();
    let text=done+'/'+total+' '+(total===1?'série concluída':'séries concluídas');
    if(done===total&&total)text='✓ '+text;
    if(extra)text+=' · '+extra;
    return text;
  }

  function applyCard(card,d,i){
    const key=keyFor(d,i,card),head=card.querySelector('.ex-h');if(!head)return null;
    card.classList.add('collapsible-exercise');
    card.dataset.collapseKey=key;

    let summary=card.querySelector(':scope > .collapse-summary');
    if(!summary){summary=document.createElement('div');summary.className='collapse-summary';card.insertBefore(summary,head.nextSibling)}
    summary.textContent=progressText(card);

    let toggle=head.querySelector('.collapse-toggle');
    if(!toggle){
      toggle=document.createElement('button');toggle.type='button';toggle.className='collapse-toggle';head.appendChild(toggle);
    }
    const setState=collapsed=>{
      card.classList.toggle('is-collapsed',collapsed);
      toggle.textContent=collapsed?'▾':'▴';
      toggle.setAttribute('aria-expanded',String(!collapsed));
      toggle.setAttribute('aria-label',collapsed?'Abrir exercício':'Recolher exercício');
      toggle.title=collapsed?'Abrir exercício':'Recolher exercício';
      ui.collapsed[key]=!!collapsed;saveUI();
    };
    toggle.onclick=e=>{e.stopPropagation();setState(!card.classList.contains('is-collapsed'));refreshToolbar(card.parentElement)};
    setState(!!ui.collapsed[key]);
    return{card,key,setState};
  }

  function refreshToolbar(box){
    const toolbar=box?.querySelector(':scope > .exercise-collapse-toolbar');if(!toolbar)return;
    const cards=[...box.querySelectorAll(':scope > .collapsible-exercise')];if(!cards.length)return;
    const allCollapsed=cards.every(c=>c.classList.contains('is-collapsed'));
    const btn=toolbar.querySelector('button');if(!btn)return;
    btn.textContent=allCollapsed?'Abrir todos':'Recolher todos';
    btn.setAttribute('aria-label',allCollapsed?'Abrir todos os exercícios':'Recolher todos os exercícios');
  }

  const baseRenderList=renderList;
  renderList=function(){
    baseRenderList.apply(this,arguments);
    const box=$('list');if(!box||$('finish')?.classList.contains('hidden'))return;
    const cards=[...box.querySelectorAll(':scope > .ex')].filter(c=>c.querySelector('.set'));
    if(!cards.length)return;
    const refs=cards.map((card,i)=>applyCard(card,day,i)).filter(Boolean);

    const toolbar=document.createElement('div');toolbar.className='exercise-collapse-toolbar';
    const btn=document.createElement('button');btn.type='button';btn.className='ghost small collapse-all-btn';toolbar.appendChild(btn);
    btn.onclick=()=>{
      const collapse=!refs.every(x=>x.card.classList.contains('is-collapsed'));
      refs.forEach(x=>x.setState(collapse));refreshToolbar(box);
    };
    box.insertBefore(toolbar,cards[0]);refreshToolbar(box);
  };

  const style=document.createElement('style');
  style.textContent='.exercise-collapse-toolbar{display:flex;justify-content:flex-end;margin:-2px 0 10px}.collapse-all-btn{font-size:13px}.collapsible-exercise>.ex-h{align-items:center}.collapsible-exercise>.ex-h h3{min-width:0}.collapse-toggle{flex:0 0 36px;width:36px;height:36px;border:1.5px solid var(--line);border-radius:9px;background:var(--bg);color:var(--acc);font:700 20px/1 Barlow,system-ui,sans-serif;cursor:pointer;padding:0}.collapse-summary{display:none;color:var(--mute);font-size:13px;font-weight:600;margin-top:5px}.collapsible-exercise.is-collapsed{padding-top:10px;padding-bottom:10px}.collapsible-exercise.is-collapsed>.collapse-summary{display:block}.collapsible-exercise.is-collapsed> :not(.ex-h):not(.collapse-summary){display:none!important}.collapsible-exercise.is-collapsed>.ex-h{margin:0}.collapsible-exercise.is-collapsed.complete{background:var(--ok)}@media(max-width:390px){.collapsible-exercise>.ex-h{gap:6px}.collapsible-exercise>.ex-h .tgt{font-size:13px}.collapse-toggle{flex-basis:34px;width:34px;height:34px}}';
  document.head.appendChild(style);
})();
