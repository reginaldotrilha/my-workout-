// Recommended repetition ranges + user-adjustable target selector.
// The recommendation remains visible even when the user chooses a different target.
// User choices are persisted on the exercise itself (repRange) and in local preferences.
(function(){
  const PREF_KEY='treino_rep_targets_v1';
  const FLEX_KEY='treino_workout_flex_v1';
  const norm=s=>String(s||'').trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const RECOMMENDATIONS=new Map([
    ['Supino reto com barra','6–10'],['Supino inclinado com halteres','8–12'],['Crucifixo na polia ou peck deck','10–15'],['Supino reto com halteres','8–12'],['Supino declinado com barra','8–12'],['Supino inclinado com barra','6–10'],['Crossover polia alta para baixa','10–15'],['Crossover polia baixa para alta','10–15'],['Chest press na máquina','8–12'],['Flexão de braço','10–20'],['Supino inclinado na máquina','8–12'],
    ['Barra fixa ou puxada frontal','8–12'],['Remada curvada com barra','6–10'],['Remada unilateral com halter','8–12'],['Remada baixa na polia','8–12'],['Remada com apoio no peito','8–12'],['Barra fixa','6–12'],['Pulldown com braços retos','10–15'],['Remada T-bar','8–12'],['High row na máquina','8–12'],['Levantamento terra','5–8'],['Remada sentada na máquina','8–12'],
    ['Desenvolvimento com halteres','8–12'],['Desenvolvimento militar','6–10'],['Elevação lateral','12–20'],['Elevação frontal','10–15'],['Crucifixo invertido','12–20'],['Shoulder press na máquina','8–12'],['Elevação lateral na polia','12–20'],['Face pull ou crucifixo invertido','12–20'],['Remada alta','10–15'],['Arnold press','8–12'],
    ['Tríceps na polia (corda)','10–15'],['Tríceps testa','8–12'],['Tríceps testa com barra EZ','8–12'],['Tríceps acima da cabeça com halter','10–15'],['Tríceps acima da cabeça na polia','10–15'],['Tríceps na polia com barra reta','10–15'],['Mergulho no banco','10–20'],['Paralelas','6–12'],['Dip na máquina','8–12'],['Tríceps coice','12–20'],
    ['Rosca direta com barra','8–12'],['Rosca martelo','8–12'],['Rosca direta com barra EZ','8–12'],['Rosca inclinada com halteres','8–12'],['Rosca Scott','8–12'],['Rosca na polia','10–15'],['Rosca concentração','10–15'],['Rosca inversa','10–15'],['Rosca na máquina','10–15'],['Rosca bayesian na polia','10–15'],
    ['Agachamento livre','6–10'],['Leg press','10–15'],['Hack squat','8–12'],['Avanço / passada','8–12'],['Afundo búlgaro','8–12'],['Cadeira extensora','10–15'],['Stiff (levantamento terra romeno)','6–10'],['Mesa flexora sentada','10–15'],['Mesa flexora','10–15'],['Hip thrust','8–12'],['Ponte de glúteo','10–15'],['Agachamento no smith','8–12'],['Agachamento goblet','10–15'],['Terra sumô','6–10'],['Máquina adutora','12–20'],['Máquina abdutora','12–20'],['Panturrilha em pé','12–20'],['Panturrilha sentada','12–20'],['Panturrilha donkey','12–20'],['Step-up','8–12'],
    ['Crunch abdominal','12–20'],['Abdominal na polia','10–15'],['Elevação de pernas na barra','8–15'],['Elevação de pernas na cadeira romana','10–15'],['Prancha (segundos)','45–60s'],['Prancha lateral','30–60s'],['Russian twist','12–20'],['Abdominal infra ou roda','8–15'],['Abdominal reverso','12–20'],['Abdominal na máquina','10–15'],
    ['Encolhimento com barra','8–15'],['Encolhimento','8–15'],['Flexão de punho','12–20'],['Extensão de punho','12–20'],['Farmer walk','30–60s']
  ].map(([n,r])=>[norm(n),r]));

  let prefs={};
  try{prefs=JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{}}catch(e){prefs={}}

  const REP_OPTIONS=['5–8','6–10','6–12','8–12','8–15','10–15','10–20','12–15','12–20','15–20','15–25'];
  const TIME_OPTIONS=['20–30s','30–45s','45–60s','60–90s'];
  const isTimeRange=r=>/s$/i.test(String(r||''));

  function fallback(item){
    const name=norm(item?.name),group=norm(item?.group),equipment=norm(item?.equipment);
    if(item?.type==='time'||/prancha|farmer/.test(name))return '30–60s';
    if(item?.type==='reps')return /flexao|mergulho/.test(name)?'10–20':'8–15';
    if(/panturrilha|adutora|abdutora/.test(name))return '12–20';
    if(/elevacao lateral|face pull|crucifixo invertido|coice|punho/.test(name))return '12–20';
    if(/crucifixo|crossover|pulldown com bracos retos|extensora|flexora|rosca na polia|rosca concentracao|maquina/.test(name))return '10–15';
    if(/terra|agachamento livre|remada curvada|desenvolvimento militar/.test(name))return '6–10';
    if(group==='abdomen / core'||group==='abdômen / core')return '10–20';
    if(/barbell/.test(equipment))return '6–10';
    return '8–12';
  }
  function ideal(item){return RECOMMENDATIONS.get(norm(item?.name))||fallback(item)}
  function prefKey(item){return item?.id||norm(item?.name)}
  function sameExercise(x,item){return !!x&&(x.id===item.id||norm(x.name)===norm(item.name))}
  function setsOf(item){return Math.max(1,Number(item?.sets)||3)}
  function targetForSets(sets,range){return Math.max(1,Number(sets)||3)+'×'+range}
  function targetFor(item,range){return targetForSets(setsOf(item),range)}

  function storedPlanRange(item){
    for(const q of Object.values(db.training?.current?.days||{})){
      const x=(q.ex||[]).find(e=>sameExercise(e,item));
      if(x?.repRange)return x.repRange;
    }
    return null;
  }
  function selected(item){return prefs[prefKey(item)]||storedPlanRange(item)||item?.repRange||ideal(item)}
  function savePrefs(){try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}catch(e){}}

  function updateFlex(item,range){
    let flex;try{flex=JSON.parse(localStorage.getItem(FLEX_KEY)||'{}')||{}}catch(e){return false}
    let changed=false;
    Object.values(flex.sessions||{}).forEach(s=>{
      (s.extras||[]).forEach(x=>{
        if(!sameExercise(x,item))return;
        const t=targetForSets(x.sets||setsOf(item),range);
        if(x.target!==t||x.repRange!==range){x.target=t;x.repRange=range;changed=true}
      });
      Object.values(s.subs||{}).forEach(x=>{
        if(!sameExercise(x,item))return;
        const t=targetForSets(x.sets||setsOf(item),range);
        if(x.target!==t||x.repRange!==range){x.target=t;x.repRange=range;changed=true}
      });
    });
    if(changed)try{localStorage.setItem(FLEX_KEY,JSON.stringify(flex))}catch(e){}
    return changed;
  }

  function applyOne(item,range){
    if(!item)return false;
    let changed=false;
    item.idealReps=ideal(item);
    item.repRange=range;
    const catalogTarget=targetFor(item,range);
    if(item.target!==catalogTarget){item.target=catalogTarget;changed=true}

    const p=db.training?.current;
    for(const [d,q] of Object.entries(p?.days||{})){
      (q.ex||[]).forEach(x=>{
        if(!sameExercise(x,item))return;
        const t=targetForSets(x.sets||setsOf(item),range);
        if(x.target!==t||x.repRange!==range){x.target=t;x.repRange=range;changed=true}
      });
      (PLAN[d]?.ex||[]).forEach(e=>{
        if(e?.[3]===item.id||norm(e?.[0])===norm(item.name)){
          const t=targetForSets(e?.[2]||setsOf(item),range);
          if(e[1]!==t){e[1]=t;changed=true}
        }
      });
    }
    if(updateFlex(item,range))changed=true;
    return changed;
  }

  function syncAll(){
    const items=window.ExerciseCatalog?.all?.()||[];let changed=false;
    items.forEach(item=>{if(applyOne(item,selected(item)))changed=true});
    if(changed&&typeof save==='function')save();
    return changed;
  }

  function optionList(idealRange,currentRange){
    const src=(isTimeRange(idealRange)||isTimeRange(currentRange))?TIME_OPTIONS:REP_OPTIONS;
    return [...new Set([idealRange,currentRange,...src].filter(Boolean))];
  }

  function decorate(){
    const box=document.getElementById('list');if(!box||box.querySelector('.plan-editor,.plan-manager'))return;
    [...box.querySelectorAll(':scope > .ex')].forEach(card=>{
      if(!card.querySelector('.set'))return;
      const name=card.querySelector('.ex-h h3')?.textContent||'';
      const item=window.ExerciseCatalog?.byName?.(name);if(!item)return;
      const recommended=ideal(item),current=selected(item),header=card.querySelector('.ex-h');if(!header)return;
      const tgt=header.querySelector('.tgt');if(tgt)tgt.textContent=targetFor(item,current);

      let panel=card.querySelector('.rep-target-panel');
      if(!panel){
        panel=document.createElement('div');panel.className='rep-target-panel';
        const actions=card.querySelector('.session-ex-actions');
        if(actions)actions.insertAdjacentElement('afterend',panel);else header.insertAdjacentElement('afterend',panel);
      }
      panel.innerHTML='';
      const badge=document.createElement('span');badge.className='rep-ideal-badge';badge.textContent='Ideal: '+recommended+(isTimeRange(recommended)?'':' reps');
      const label=document.createElement('label');label.className='rep-target-label';const cap=document.createElement('span');cap.textContent='Meta fixa';
      const select=document.createElement('select');select.className='rep-target-select';select.setAttribute('aria-label','Meta fixa de repetições para '+item.name);
      optionList(recommended,current).forEach(r=>{const o=document.createElement('option');o.value=r;o.textContent=r+(r===recommended?' · ideal':'');select.appendChild(o)});
      select.value=current;label.append(cap,select);panel.append(badge,label);
      panel.classList.toggle('custom',current!==recommended);
      select.onchange=()=>{
        const value=select.value;
        prefs[prefKey(item)]=value;
        savePrefs();
        applyOne(item,value);
        if(typeof save==='function')save();
        if(typeof toast==='function')toast('Meta de '+item.name+' fixada em '+value);
        if(typeof render==='function')render();
      };
    });
  }

  async function init(){
    try{await window.ExerciseCatalog?.ready}catch(e){}
    const changed=syncAll();
    if(changed&&typeof render==='function')requestAnimationFrame(()=>render());
    requestAnimationFrame(decorate);
  }

  const base=window.renderList;
  if(typeof base==='function')window.renderList=function(){const r=base.apply(this,arguments);requestAnimationFrame(decorate);return r};

  const style=document.createElement('style');
  style.textContent=`
    .rep-target-panel{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:7px 0 9px;padding:7px 8px;border:1px solid var(--line);border-radius:9px;background:var(--bg)}
    .rep-ideal-badge{display:inline-flex;align-items:center;min-height:30px;padding:5px 9px;border-radius:999px;background:var(--ok);color:var(--acc);font-size:11px;font-weight:700;white-space:nowrap}
    .rep-target-label{display:flex;align-items:center;gap:6px;margin-left:auto;color:var(--mute);font-size:10px;font-weight:600}
    .rep-target-select{min-width:92px;height:34px;border:1.5px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink);font:600 12px Barlow,system-ui,sans-serif;padding:0 6px}
    .rep-target-panel.custom .rep-target-select{border-color:var(--hot);color:var(--hot)}
    @media(max-width:390px){.rep-target-panel{align-items:stretch}.rep-ideal-badge{font-size:10px;padding:5px 7px}.rep-target-label{gap:4px}.rep-target-select{min-width:86px;padding:0 3px}}
  `;
  document.head.appendChild(style);
  init();
})();
