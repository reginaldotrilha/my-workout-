// Evidence-based recomposition panel. Read-only except explicit user preference edits.
// Stable exercise IDs and all historical training, body and meal entries are preserved.
(function(){
  const DAY=864e5;
  const fmt=v=>Number(v).toFixed(1).replace('.0','');
  const signed=(v,unit)=> (v>0?'+':'')+fmt(v)+' '+unit;
  const sorted=a=>(a||[]).slice().sort((x,y)=>(x.t||0)-(y.t||0));
  const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
  const dateKey=t=>{
    const d=new Date(t);
    return Number.isFinite(d.getTime())?d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate():'';
  };
  const daysAgo=t=>Math.max(0,Math.floor((Date.now()-t)/DAY));
  const isNumber=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  function dailyLatest(points){
    const days=new Map();
    sorted(points).forEach(p=>{const key=dateKey(p.t);if(key)days.set(key,p)});
    return [...days.values()].sort((a,b)=>a.t-b.t);
  }
  function weightSeries(){
    return dailyLatest((db.body||[])
      .filter(x=>x&&Number.isFinite(x.t)&&isNumber(x.w)&&Number(x.w)>=20&&Number(x.w)<=400)
      .map(x=>({t:x.t,v:Number(x.w)})));
  }
  function waistSeries(){
    const a=[];
    (db.waist||[]).forEach(x=>{
      if(x&&Number.isFinite(x.t)&&isNumber(x.c)&&Number(x.c)>=20&&Number(x.c)<=250)
        a.push({t:x.t,v:Number(x.c)});
    });
    (db.measures||[]).forEach(x=>{
      if(x&&Number.isFinite(x.t)&&isNumber(x.waist)&&Number(x.waist)>=20&&Number(x.waist)<=250)
        a.push({t:x.t,v:Number(x.waist)});
    });
    return dailyLatest(a);
  }
  function windowStats(a,from,to){
    const rows=a.filter(x=>x.t>=from&&x.t<to);
    return {count:rows.length,avg:mean(rows.map(x=>x.v))};
  }
  function weightInfo(){
    const a=weightSeries(),last=a.at(-1),first=a[0],now=Date.now();
    const current=windowStats(a,now-7*DAY,now+1);
    const previous=windowStats(a,now-14*DAY,now-7*DAY);
    const trend=current.count>=2&&previous.count>=2?current.avg-previous.avg:null;
    return {a,last,first,trend,samples:current.count,
      overall:a.length>=2?last.v-first.v:null,
      recent:last&&daysAgo(last.t)<=14};
  }
  function waistInfo(){
    const a=waistSeries(),last=a.at(-1),first=a[0];
    return {a,last,first,
      overall:a.length>=2?last.v-first.v:null,
      recent:last&&daysAgo(last.t)<=21};
  }
  function strengthInfo(){
    const by=new Map();
    (db.logs||[]).forEach(l=>{
      if(!l||!Number.isFinite(l.t))return;
      // Do not map exercises by their position when a stable ID exists.
      const ids=l.exById&&typeof l.exById==='object'?l.exById:{};
      Object.entries(ids).forEach(([id,sets])=>{
        if(!id||!Array.isArray(sets))return;
        const weights=sets.filter(s=>s&&isNumber(s.w)&&Number(s.w)>0&&isNumber(s.r)&&Number(s.r)>0)
          .map(s=>Number(s.w));
        if(!weights.length)return;
        if(!by.has(id))by.set(id,[]);
        by.get(id).push({t:l.t,top:Math.max(...weights)});
      });
    });
    let up=0,down=0,same=0;
    by.forEach(rows=>{
      const a=sorted(rows);if(a.length<2)return;
      const delta=a.at(-1).top-a[0].top;
      if(delta>0.5)up++;else if(delta<-.5)down++;else same++;
    });
    const total=up+down+same;
    return {up,down,same,total,label:total===0?'—':up>down?'Cargas subindo':down>up?'Cargas caindo':'Misto'};
  }
  function trainingDays(){
    const since=Date.now()-14*DAY;
    return new Set((db.logs||[])
      .filter(l=>l&&isNumber(l.t)&&l.t>=since&&l.t<=Date.now()&&
        l.exById&&Object.values(l.exById).some(a=>Array.isArray(a)&&a.length))
      .map(l=>dateKey(l.t)).filter(Boolean)).size;
  }
  function readState(key){
    try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}catch(e){return{}}
  }
  function nutritionInfo(){
    const energy=readState('treino_energy_balance_v1');
    const health=readState('treino_healthkit_v1');
    const meals=db.meals||[],api=window.MeuTreinoFoodDayStatus;
    let complete=0,paired=0,missing=0,partial=0,sumIn=0,sumBurn=0;
    const now=new Date();
    for(let i=1;i<=7;i++){
      const date=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i,12);
      const key=dateKey(date.getTime());
      const entries=meals.filter(m=>m&&dateKey(m.t)===key);
      if(!entries.length){missing++;continue}
      if(!api||api.get(key,entries)!=='complete'){partial++;continue}
      const intake=entries.reduce((s,m)=>s+(Number(m.k)||0),0);
      if(!(intake>0)){partial++;continue}
      complete++;
      const h=health.daily&&health.daily[key];
      const total=Number(h?.total)>0?Number(h.total):Number(energy.burn?.[key])||0;
      if(total>0){sumIn+=intake;sumBurn+=total;paired++}
    }
    return {complete,paired,missing,partial,
      avgBalance:paired>=3?(sumBurn-sumIn)/paired:null};
  }
  function classify(w,c,s,n){
    if(!w.last&&!c.last&&s.total===0)return {
      label:'Sem dados suficientes',cls:'neutral',
      text:'Registre peso, cintura e treinos para acompanhar a evolução.'};
    if(c.overall!==null&&c.overall<=-1&&s.up>s.down&&s.total>=2)
      return {label:'Sinais positivos',cls:'good',
        text:'A cintura diminuiu desde o início e várias cargas de treino aumentaram. Esses sinais são compatíveis com progresso, mas não quantificam perda de gordura nem ganho muscular.'};
    if(c.overall!==null&&c.overall<0)
      return {label:'Acompanhando',cls:'neutral',
        text:'Há redução registrada da cintura. Continue acompanhando medidas, peso e desempenho para confirmar a tendência.'};
    return {label:'Em observação',cls:'neutral',
      text:'Ainda não há evidências suficientes para concluir que a composição corporal mudou. Continue acumulando registros comparáveis.'};
  }
  function tile(label,value,detail){
    const d=document.createElement('div');d.className='recomp-tile';
    const a=document.createElement('span'),b=document.createElement('b'),small=document.createElement('small');
    a.textContent=label;b.textContent=value;small.textContent=detail;d.append(a,b,small);return d;
  }
  function milestone(){
    const v=db.prefs?.reassessmentWeight;
    return isNumber(v)&&Number(v)>=20&&Number(v)<=400?Number(v):null;
  }
  function editMilestone(){
    const existing=milestone();
    const raw=prompt('Peso opcional para reavaliar a composição corporal (kg)',existing===null?'':fmt(existing));
    if(raw===null)return;
    const value=raw.trim();
    if(!value){toast('Nenhuma alteração realizada.');return}
    const x=Number(value.replace(',','.'));
    if(!Number.isFinite(x)||x<20||x>400){toast('Digite um peso válido');return}
    db.prefs=db.prefs||{};db.prefs.reassessmentWeight=x;save();renderProg();
  }
  function card(){
    const w=weightInfo(),c=waistInfo(),s=strengthInfo(),n=nutritionInfo();
    if(!w.a.length&&!c.a.length&&s.total===0&&!(db.logs||[]).length)return null;
    const status=classify(w,c,s,n);
    const root=document.createElement('div');root.className='ex recomp-card';
    const header=document.createElement('div');header.className='recomp-head';
    const heading=document.createElement('div'),h3=document.createElement('h3'),sub=document.createElement('span');
    h3.textContent='Recomposição corporal';sub.textContent='Peso, cintura, força e alimentação';
    heading.append(h3,sub);
    const badge=document.createElement('span');badge.className='recomp-badge '+status.cls;badge.textContent=status.label;
    header.append(heading,badge);root.appendChild(header);

    const grid=document.createElement('div');grid.className='recomp-grid';
    grid.appendChild(tile('Peso atual',w.last?fmt(w.last.v)+' kg':'—',
      w.last?(w.a.length+' dia(s) medidos · última pesagem há '+daysAgo(w.last.t)+' dia(s)'):'Sem pesagens'));
    grid.appendChild(tile('Tendência de peso (7d)',
      w.trend===null?'—':signed(w.trend,'kg'),
      w.trend===null?'Exige 2 pesagens em cada uma das últimas 2 semanas':'Diferença entre duas médias de 7 dias'));
    grid.appendChild(tile('Cintura',c.last?fmt(c.last.v)+' cm':'—',
      c.overall===null?'Sem comparação':signed(c.overall,'cm')+' desde o início'));
    grid.appendChild(tile('Cargas de treino',s.label,
      s.total?s.up+' exercício(s) ↑ · '+s.down+' ↓ · '+s.same+' estável(is)':'Sem comparações por ID'));
    const count=trainingDays();
    grid.appendChild(tile('Dias de treino',count+' / 14',
      'Dias distintos com sessões registradas'));
    grid.appendChild(tile('Alimentação completa',n.complete+' / 7',
      n.paired+' dia(s) também com gasto total registrado'));
    grid.appendChild(tile('Saldo calórico (7d)',n.avgBalance===null?'—':
      (n.avgBalance>=0?'−':'+')+fmt(Math.abs(n.avgBalance))+' kcal/dia',
      n.avgBalance===null?'Exige ao menos 3 dias completos com gasto':'Estimativa apenas dos '+n.paired+' dias confirmados'));
    root.appendChild(grid);

    const msg=document.createElement('p');msg.className='recomp-message';msg.textContent=status.text;root.appendChild(msg);
    const evidence=document.createElement('div');evidence.className='recomp-evidence';
    const flags=[];
    if(w.a.length&&w.trend===null)flags.push('Pesagens insuficientes para comparar médias semanais.');
    if(w.last&&!w.recent)flags.push('A última pesagem é antiga; atualize quando puder.');
    if(c.last&&!c.recent)flags.push('A última medida de cintura tem mais de 21 dias.');
    if(n.complete<3)flags.push('Confirme dias de alimentação completos para analisar o déficit com mais confiança.');
    if(n.paired<3)flags.push('Ainda não é possível confirmar um déficit calórico semanal.');
    if(s.total)flags.push('Aumento de carga não comprova, sozinho, crescimento muscular.');
    if(!flags.length)flags.push('Tendências são estimativas; sono, água e execução também influenciam os resultados.');
    const list=document.createElement('ul');flags.slice(0,4).forEach(t=>{
      const li=document.createElement('li');li.textContent=t;list.appendChild(li);
    });
    evidence.appendChild(list);root.appendChild(evidence);
    const m=milestone(),goal=document.createElement('div');goal.className='recomp-milestone';
    const left=document.createElement('div'),label=document.createElement('span'),desc=document.createElement('b');
    label.textContent='Reavaliação opcional';
    desc.textContent=m===null?'Sem peso definido para reavaliação':fmt(m)+' kg · reavaliar composição';
    left.append(label,desc);
    const btn=document.createElement('button');btn.type='button';btn.className='ghost small';
    btn.textContent=m===null?'Definir':'Alterar';btn.onclick=editMilestone;
    goal.append(left,btn);root.appendChild(goal);
    return root;
  }
  function enhanceGoal(){
    const root=document.getElementById('vProg');if(!root)return;
    const old=root.querySelector('.goal-btn');
    if(!old)return;
    const m=milestone();
    old.textContent=m===null?'Definir reavaliação':'Reavaliar em: '+fmt(m)+' kg';
    old.onclick=editMilestone;
    const hero=old.closest('.ex');
    const hint=[...(hero?.querySelectorAll('.hint')||[])].find(x=>/Faltam|Meta atingida/i.test(x.textContent));
    if(hint)hint.textContent='O peso isolado não define seu objetivo físico final.';
  }
  function inject(){
    const root=document.getElementById('vProg');if(!root)return;
    root.querySelector('.recomp-card')?.remove();
    const heading=[...root.querySelectorAll('h3')].find(x=>x.textContent==='Peso corporal');
    if(!heading)return;
    enhanceGoal();
    const cardNode=card(),hero=heading.closest('.ex');
    if(cardNode&&hero)hero.insertAdjacentElement('afterend',cardNode);
  }
  if(typeof renderProg==='function'){
    const previous=renderProg;
    renderProg=function(){const out=previous.apply(this,arguments);inject();return out};
  }
  const style=document.createElement('style');
  style.textContent='.recomp-card{padding:13px}.recomp-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.recomp-head h3{font-size:21px}.recomp-head span{display:block;color:var(--mute);font-size:12px;margin-top:2px}.recomp-badge{font-size:11px;font-weight:700;border-radius:999px;padding:5px 8px;background:var(--bg);color:var(--mute)}.recomp-badge.good{background:var(--ok);color:var(--acc)}.recomp-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.recomp-tile{background:var(--bg);border-radius:9px;padding:9px;min-width:0}.recomp-tile span,.recomp-tile small,.recomp-tile b{display:block}.recomp-tile span{color:var(--mute);font-size:11px}.recomp-tile b{font-size:16px;margin:2px 0;overflow-wrap:anywhere}.recomp-tile small{color:var(--mute);font-size:10px;line-height:1.3}.recomp-message{font-size:12px;line-height:1.4;margin:10px 0;color:var(--ink)}.recomp-evidence{color:var(--mute);font-size:11px;line-height:1.5}.recomp-evidence ul{padding-left:18px;margin:4px 0 12px}.recomp-evidence li{margin:3px 0}.recomp-milestone{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:9px;background:var(--bg);border-radius:9px}.recomp-milestone span,.recomp-milestone b{display:block}.recomp-milestone span{font-size:10px;color:var(--mute)}.recomp-milestone b{font-size:13px;margin:2px 0}@media(max-width:390px){.recomp-grid{grid-template-columns:1fr}}';
  document.head.appendChild(style);
})();
