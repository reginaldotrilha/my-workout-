// Daily energy balance: keeps the calorie goal as a base and adjusts guidance from total daily burn.
// Burn is entered manually from Apple Fitness TOTAL kcal (not Move kcal). Existing meals/data are untouched.
(function(){
  const ENERGY_KEY='treino_energy_balance_v1';
  let state={burn:{},targetDeficit:500};
  try{state=Object.assign(state,JSON.parse(localStorage.getItem(ENERGY_KEY)||'{}')||{})}catch(e){}
  state.burn=state.burn&&typeof state.burn==='object'?state.burn:{};
  state.targetDeficit=[400,500,600].includes(Number(state.targetDeficit))?Number(state.targetDeficit):500;
  const saveState=()=>{try{localStorage.setItem(ENERGY_KEY,JSON.stringify(state))}catch(e){}};
  const round50=n=>Math.round(n/50)*50;
  const fmt=n=>Math.round(Number(n)||0).toLocaleString('pt-BR');
  const todayKey=()=>dayKey(Date.now());
  function eatenFor(key){return sumOf((db.meals||[]).filter(m=>dayKey(m.t)===key)).k}
  function guidance(burn){
    const base=GOAL.k,min=base-150,max=base+250,target=state.targetDeficit;
    const center=Math.max(min,Math.min(max,burn-target));
    let low=Math.max(min,round50(center-100)),high=Math.min(max,round50(center+100));
    if(high<low)high=low;
    return{low,high,target};
  }
  function lastKeys(n){const out=[],d=new Date();for(let i=0;i<n;i++){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()-i,12);out.push(dayKey(x.getTime()))}return out}
  function weeklyStats(){
    // Only the seven finished calendar days are eligible; never assume missing meals mean zero kcal.
    const rows=[];let missingMeals=0,missingBurn=0;
    for(const key of lastKeys(8).slice(1)){
      const burn=Number(state.burn[key]);
      const entries=(db.meals||[]).filter(m=>dayKey(m.t)===key);
      if(!Number.isFinite(burn)||burn<=0){missingBurn++;continue}
      if(!entries.length){missingMeals++;continue}
      const eaten=sumOf(entries).k;
      if(!(eaten>0)){missingMeals++;continue}
      rows.push({key,burn,eaten,deficit:burn-eaten});
    }
    if(!rows.length)return{days:0,missingMeals,missingBurn};
    const sum=k=>rows.reduce((a,x)=>a+x[k],0);
    return{days:rows.length,missingMeals,missingBurn,burn:sum('burn')/rows.length,
      eaten:sum('eaten')/rows.length,deficit:sum('deficit')/rows.length,totalDeficit:sum('deficit')};
  }
  function make(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x}
  function statusText(deficit){
    if(deficit>=350&&deficit<=700)return'Déficit em uma faixa boa para a fase atual.';
    if(deficit>700)return'Déficit alto hoje. Não precisa tentar aumentar ainda mais.';
    if(deficit>=0)return'Déficit leve hoje. Olhe principalmente a média da semana.';
    return'Superávit estimado hoje. Um dia isolado não define o resultado da semana.'
  }
  function buildCard(){
    const key=todayKey(),eaten=eatenFor(key),hasMeals=(db.meals||[]).some(m=>dayKey(m.t)===key),burn=Number(state.burn[key])||0,c=make('div','ex energy-card');
    const head=make('div','ex-h'),h=make('h3','', 'Balanço energético'),badge=make('span','tgt','Meta-base '+GOAL.k+' kcal');head.append(h,badge);c.appendChild(head);
    c.appendChild(make('p','hint','A meta de '+GOAL.k+' kcal continua sendo sua referência. Em dias muito ativos, use o gasto total para decidir se faz sentido comer um pouco mais; em descanso, não é necessário cortar agressivamente.'));
    const grid=make('div','energy-grid');
    const eat=make('div','energy-stat');eat.innerHTML='<span>Consumido hoje</span><b>'+fmt(eaten)+' kcal</b>';grid.appendChild(eat);
    const burnBox=make('label','energy-input');burnBox.appendChild(make('span','','Gasto total do Apple Fitness'));
    const row=make('div','energy-input-row'),inp=make('input');inp.type='number';inp.inputMode='numeric';inp.placeholder='ex.: 2908';inp.value=burn||'';inp.setAttribute('aria-label','Gasto total de calorias no Apple Fitness');
    const save=make('button','ghost','Salvar');save.onclick=()=>{const n=num(inp.value);if(n===null||n<1200||n>6000){toast('Confira o gasto total em kcal');return}state.burn[key]=Math.round(n);saveState();renderComida();toast('Gasto total salvo')};row.append(inp,save);burnBox.appendChild(row);grid.appendChild(burnBox);c.appendChild(grid);
    const controls=make('div','energy-controls'),lab=make('label');lab.appendChild(make('span','','Déficit-alvo'));const sel=make('select');[400,500,600].forEach(x=>{const o=make('option','',x+' kcal');o.value=x;sel.appendChild(o)});sel.value=String(state.targetDeficit);sel.onchange=()=>{state.targetDeficit=Number(sel.value);saveState();renderComida()};lab.appendChild(sel);controls.appendChild(lab);
    if(burn){const clear=make('button','ghost small','Limpar gasto');clear.onclick=()=>{delete state.burn[key];saveState();renderComida()};controls.appendChild(clear)}c.appendChild(controls);
    if(burn&&hasMeals){
      const deficit=burn-eaten,g=guidance(burn),res=make('div','energy-result');
      const cls=deficit>=350&&deficit<=700?'good':deficit>700?'high':deficit<0?'over':'light';
      res.innerHTML='<div class="energy-balance-number '+cls+'"><span>Saldo estimado agora</span><b>'+(deficit>=0?'−':'+')+fmt(Math.abs(deficit))+' kcal</b><small>'+(deficit>=0?'déficit':'superávit')+'</small></div><div class="energy-range"><span>Faixa sugerida hoje</span><b>'+fmt(g.low)+'–'+fmt(g.high)+' kcal</b><small>mantendo a meta-base como âncora</small></div>';
      c.appendChild(res);c.appendChild(make('div','hint energy-status','Saldo parcial: confirme o gasto TOTAL ao fim do dia e registre todas as refeições. '+statusText(deficit)));
    }else c.appendChild(make('div','hint energy-status',burn?'Gasto informado, mas não há alimentação registrada hoje: saldo não calculável.':'Opcional: no fim do dia, informe o gasto TOTAL do Apple Fitness. Não use apenas Move.'));
    const wk=weeklyStats(),w=make('div','energy-week');
    if(wk.days>=3){
      w.innerHTML='<b>Média dos últimos 7 dias encerrados</b><span>'+wk.days+' de 7 dia(s) com gasto e alimentação registrados. Estimativa: confirme se todas as refeições foram anotadas.</span><div><span>Consumo <strong>'+fmt(wk.eaten)+'</strong></span><span>Gasto <strong>'+fmt(wk.burn)+'</strong></span><span>Saldo <strong>'+fmt(wk.deficit)+'</strong></span></div>';
    }else{
      w.appendChild(make('b','','Saldo semanal indisponível'));
      w.appendChild(make('span','','Somente '+wk.days+' de 7 dias encerrados têm alimentação e gasto registrados. São necessários pelo menos 3 dias para uma média provisória.'));
    }
    c.appendChild(w);
    c.appendChild(make('div','energy-footnote','Se você preencher antes da meia-noite, o gasto total ainda é parcial. O app usa esse número apenas como estimativa, não como licença para “comer de volta” todas as calorias do treino.'));
    return c
  }
  function enhance(){
    const v=$('vComida');if(!v)return;v.querySelector('.energy-card')?.remove();const top=v.querySelector(':scope > .ex');if(!top)return;top.insertAdjacentElement('afterend',buildCard());
    const hint=top.querySelector('.hint');if(!hint)return;const burn=Number(state.burn[todayKey()])||0,eaten=eatenFor(todayKey());if(burn&&(db.meals||[]).some(m=>dayKey(m.t)===todayKey())){const deficit=burn-eaten;hint.textContent='Meta-base: '+GOAL.k+' kcal. Com o gasto informado, seu saldo estimado agora é '+(deficit>=0?'déficit de ':'superávit de ')+fmt(Math.abs(deficit))+' kcal.'}
  }
  const css=make('style');css.textContent='.energy-card{margin-top:12px}.energy-grid{display:grid;grid-template-columns:1fr 1.4fr;gap:10px;margin:10px 0}.energy-stat,.energy-input{background:var(--bg);border-radius:10px;padding:10px}.energy-stat span,.energy-input>span,.energy-range span,.energy-balance-number span{display:block;color:var(--mute);font-size:12px;margin-bottom:5px}.energy-stat b{font-size:18px}.energy-input-row{display:flex;gap:6px}.energy-input-row input{min-width:0;width:100%;font:600 16px Barlow,system-ui,sans-serif;padding:8px;border:1.5px solid var(--line);border-radius:8px;background:white;color:var(--ink)}.energy-controls{display:flex;justify-content:space-between;align-items:end;gap:8px;margin:6px 0 10px}.energy-controls label span{display:block;color:var(--mute);font-size:11px;margin-bottom:3px}.energy-controls select{font:600 14px Barlow,system-ui,sans-serif;padding:7px 9px;border:1.5px solid var(--line);border-radius:8px;background:white;color:var(--ink)}.energy-result{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.energy-balance-number,.energy-range{border:1.5px solid var(--line);border-radius:10px;padding:10px}.energy-balance-number b,.energy-range b{display:block;font-size:20px}.energy-balance-number small,.energy-range small{display:block;color:var(--mute);font-size:10px;margin-top:2px}.energy-balance-number.good{border-color:var(--acc)}.energy-balance-number.high{border-color:#b7832f}.energy-balance-number.over{border-color:var(--hot)}.energy-status{margin-top:8px}.energy-week{margin-top:12px;padding-top:10px;border-top:1px solid var(--line)}.energy-week>b,.energy-week>span{display:block}.energy-week>span{color:var(--mute);font-size:11px;margin:2px 0 8px}.energy-week>div{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.energy-week>div span{background:var(--bg);border-radius:8px;padding:7px;text-align:center;color:var(--mute);font-size:10px}.energy-week strong{display:block;color:var(--ink);font-size:13px;margin-top:2px}.energy-footnote{color:var(--mute);font-size:10.5px;line-height:1.35;margin-top:10px}@media(max-width:420px){.energy-grid,.energy-result{grid-template-columns:1fr}.energy-controls{align-items:center}}';document.head.appendChild(css);
  const base=window.renderComida;if(typeof base==='function')window.renderComida=function(){base.apply(this,arguments);enhance()};
})();
