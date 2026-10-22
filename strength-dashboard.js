// Compact strength dashboard: exercise stats first, workout-day filters, details on demand.
(function(){
  const UI_KEY='treino_strength_dashboard_v1';
  let ui={day:'all',expanded:{},workoutsOpen:false};
  try{ui=Object.assign(ui,JSON.parse(localStorage.getItem(UI_KEY)||'{}')||{})}catch(e){}
  ui.expanded=ui.expanded&&typeof ui.expanded==='object'?ui.expanded:{};
  const saveUI=()=>{try{localStorage.setItem(UI_KEY,JSON.stringify(ui))}catch(e){}};
  const slug=s=>String(s||'exercise').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,70)||'exercise';

  function activeStrength(v){
    const active=[...v.querySelectorAll('.prog-switch button')].find(b=>b.getAttribute('aria-pressed')==='true');
    return active&&active.textContent.trim()==='Força';
  }
  function cardDay(card){
    const t=card.querySelector('.tgt')?.textContent||'';
    return (t.match(/Treino\s+([^\s]+)/i)?.[1]||'').trim();
  }
  function cardKey(card){return slug(card.querySelector('h3')?.textContent||'exercise')}

  function setExpanded(card,open){
    const key=cardKey(card);card.classList.toggle('strength-card-expanded',!!open);ui.expanded[key]=!!open;saveUI();
    const b=card.querySelector(':scope > .strength-card-toggle');if(b){b.textContent=open?'Ocultar gráfico e histórico':'Ver gráfico e histórico';b.setAttribute('aria-expanded',String(!!open))}
  }
  function compactCard(card){
    if(card.dataset.dashboardReady==='1')return;
    card.dataset.dashboardReady='1';card.classList.add('strength-dashboard-card');
    const stats=card.querySelector('.strength-stats');if(!stats)return;
    const b=document.createElement('button');b.type='button';b.className='ghost strength-card-toggle';b.onclick=()=>setExpanded(card,!card.classList.contains('strength-card-expanded'));
    stats.insertAdjacentElement('afterend',b);setExpanded(card,!!ui.expanded[cardKey(card)]);
  }

  function buildTabs(v,title,cards){
    let tabs=v.querySelector('.strength-day-tabs');if(tabs)tabs.remove();tabs=document.createElement('div');tabs.className='strength-day-tabs';tabs.setAttribute('role','tablist');
    const days=[...new Set(cards.map(cardDay).filter(Boolean))].sort();const choices=['all',...days];
    if(ui.day!=='all'&&!days.includes(ui.day))ui.day='all';
    choices.forEach(d=>{const b=document.createElement('button');b.type='button';b.className='strength-day-tab';b.textContent=d==='all'?'Todos':d;b.setAttribute('aria-pressed',String(ui.day===d));b.onclick=()=>{ui.day=d;saveUI();applyFilter(v,cards);[...tabs.children].forEach(x=>x.setAttribute('aria-pressed',String((x.textContent==='Todos'?'all':x.textContent)===ui.day)))};tabs.appendChild(b)});
    title.insertAdjacentElement('afterend',tabs);return tabs;
  }
  function applyFilter(v,cards){
    let visible=0;cards.forEach(c=>{const show=ui.day==='all'||cardDay(c)===ui.day;c.classList.toggle('hidden',!show);if(show)visible++});
    let count=v.querySelector('.strength-filter-count');if(!count){count=document.createElement('div');count.className='strength-filter-count'}
    count.textContent=visible+' '+(visible===1?'exercício':'exercícios');
    const tabs=v.querySelector('.strength-day-tabs');tabs?.insertAdjacentElement('afterend',count);
  }

  function compactWorkouts(card){
    if(!card)return;
    let btn=card.querySelector('.strength-workouts-toggle');if(!btn){btn=document.createElement('button');btn.type='button';btn.className='ghost strength-workouts-toggle';const hint=card.querySelector('.hint');hint?.insertAdjacentElement('afterend',btn);btn.onclick=()=>{ui.workoutsOpen=!ui.workoutsOpen;saveUI();compactWorkouts(card)}}
    const rows=[...card.querySelectorAll('.completed-workout-row')];
    card.classList.toggle('workouts-collapsed',!ui.workoutsOpen);btn.textContent=ui.workoutsOpen?'Ocultar treinos registrados':'Ver '+rows.length+' '+(rows.length===1?'treino registrado':'treinos registrados');btn.setAttribute('aria-expanded',String(ui.workoutsOpen));
  }

  function organize(){
    const v=document.getElementById('vProg');if(!v||!activeStrength(v))return;
    const sw=v.querySelector('.prog-switch'),title=v.querySelector('.strength-history-title'),cards=[...v.querySelectorAll('.strength-history-card')],completed=v.querySelector('.completed-workouts-card'),editor=v.querySelector('.workout-log-editor');
    if(!sw||!title||!cards.length)return;

    sw.insertAdjacentElement('afterend',title);
    const tabs=buildTabs(v,title,cards);let anchor=tabs;
    cards.forEach(c=>{compactCard(c);anchor.insertAdjacentElement('afterend',c);anchor=c});
    if(completed){compactWorkouts(completed);anchor.insertAdjacentElement('afterend',completed);anchor=completed}
    if(editor)anchor.insertAdjacentElement('afterend',editor);
    applyFilter(v,cards);
  }

  const style=document.createElement('style');style.textContent=`
    .strength-day-tabs{display:flex;gap:6px;overflow-x:auto;padding:2px 0 8px;margin-bottom:2px;scrollbar-width:none}.strength-day-tabs::-webkit-scrollbar{display:none}.strength-day-tab{flex:0 0 auto;min-width:48px;border:1.5px solid var(--line);background:var(--card);color:var(--mute);border-radius:999px;padding:7px 12px;font:600 13px Barlow,system-ui,sans-serif}.strength-day-tab[aria-pressed="true"]{background:var(--acc);border-color:var(--acc);color:var(--accink)}
    .strength-filter-count{font-size:12px;color:var(--mute);margin:0 2px 8px}
    .strength-dashboard-card{margin-bottom:10px!important}.strength-dashboard-card .strength-chart-title,.strength-dashboard-card .strength-detail-chart,.strength-dashboard-card .strength-history-details{display:none!important}.strength-dashboard-card.strength-card-expanded .strength-chart-title,.strength-dashboard-card.strength-card-expanded .strength-detail-chart,.strength-dashboard-card.strength-card-expanded .strength-history-details{display:block!important}.strength-card-toggle{width:100%;margin-top:10px;color:var(--acc);font-weight:700;padding:9px 10px}
    .strength-dashboard-card:not(.strength-card-expanded) .strength-stats{margin-bottom:0!important}.strength-dashboard-card:not(.strength-card-expanded){padding-bottom:12px!important}
    .completed-workouts-card{margin-top:8px!important}.strength-workouts-toggle{width:100%;margin:6px 0 2px;color:var(--acc);font-weight:700}.completed-workouts-card.workouts-collapsed .completed-workout-row{display:none!important}
    @media(max-width:390px){.strength-day-tab{padding:7px 11px}.strength-card-toggle{font-size:14px}}
  `;document.head.appendChild(style);

  const base=window.renderProg;
  if(typeof base==='function')window.renderProg=function(){base.apply(this,arguments);requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(organize)))};
  requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(organize)));
})();
