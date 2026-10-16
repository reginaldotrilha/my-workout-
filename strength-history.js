// Rich strength progression cards: current vs previous session, dates, record and per-session history.
(function(){
  const clone=x=>JSON.parse(JSON.stringify(x));
  const n=v=>{const x=Number(v);return Number.isFinite(x)?x:null};
  const fmt=v=>Number(v).toFixed(1).replace('.0','');
  const dateShort=t=>new Date(t).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','');

  function planById(id){
    if(db.training?.current?.id===id)return db.training.current;
    return (db.training?.archived||[]).find(p=>p.id===id)||null;
  }
  function inferType(meta,id){
    if(meta?.type)return meta.type;
    const name=meta?.name||'';
    if(id==='plank'||/prancha/i.test(name))return 'time';
    if(id==='ab_wheel_or_leg_raise'||/abdominal|elevação de pernas|leg raise/i.test(name))return 'reps';
    return 'weight_reps';
  }
  function fallbackExercise(log,index){
    const p=log.planSnapshot||planById(log.planId)||db.training?.current;
    const x=p?.days?.[log.day]?.ex?.[index];
    if(x)return{id:x.id||log.day+'_'+index,name:x.name||('Exercício '+(index+1)),type:x.type,target:x.target,day:log.day};
    const e=PLAN?.[log.day]?.ex?.[index];
    if(e)return{id:e[3]||log.day+'_'+index,name:e[0],type:null,target:e[1],day:log.day};
    return{id:log.day+'_'+index,name:'Exercício '+(index+1),type:null,target:'',day:log.day};
  }
  function logEntries(log){
    const out=[];
    if(log.exById&&Object.keys(log.exById).length){
      const order=Array.isArray(log.exerciseOrder)&&log.exerciseOrder.length?log.exerciseOrder:Object.keys(log.exById);
      const seen=new Set();
      order.forEach((id,i)=>{if(!id||seen.has(id)||!log.exById[id])return;seen.add(id);const m=Object.assign({},log.exMeta?.[id]||{});out.push({id,name:m.name||id,type:inferType(m,id),target:m.target||'',day:log.day,sets:clone(log.exById[id]||[])})});
      Object.keys(log.exById).forEach(id=>{if(seen.has(id))return;const m=Object.assign({},log.exMeta?.[id]||{});out.push({id,name:m.name||id,type:inferType(m,id),target:m.target||'',day:log.day,sets:clone(log.exById[id]||[])})});
      return out;
    }
    Object.entries(log.ex||{}).forEach(([k,sets])=>{const i=Number(k),m=fallbackExercise(log,i);out.push({id:m.id,name:m.name,type:inferType(m,m.id),target:m.target||'',day:log.day,sets:clone(sets||[])})});
    return out;
  }
  function histories(){
    const map=new Map();
    (db.logs||[]).slice().sort((a,b)=>a.t-b.t).forEach(log=>{
      logEntries(log).forEach(x=>{
        if(!x.sets?.length)return;
        if(!map.has(x.id))map.set(x.id,{id:x.id,name:x.name,type:x.type,day:x.day,rows:[]});
        const g=map.get(x.id);g.name=x.name||g.name;g.type=x.type||g.type;g.day=x.day||g.day;g.rows.push({t:log.t,sets:x.sets,name:x.name,day:x.day});
      });
    });
    return [...map.values()].sort((a,b)=>{
      const ta=a.rows.at(-1)?.t||0,tb=b.rows.at(-1)?.t||0;
      if(tb!==ta)return tb-ta;
      return a.name.localeCompare(b.name,'pt-BR');
    });
  }
  function bestWeightSet(row){
    let best=null;
    (row?.sets||[]).forEach(s=>{const w=n(s.w),r=n(s.r);if(w===null||r===null)return;if(!best||w>best.w||(w===best.w&&r>best.r))best={w,r}});
    return best;
  }
  function bestTime(row){let best=null;(row?.sets||[]).forEach(s=>{const v=n(s.seconds??s.r);if(v!==null&&(best===null||v>best))best=v});return best}
  function bestReps(row){let best=null;(row?.sets||[]).forEach(s=>{const v=n(s.r);if(v!==null&&(best===null||v>best))best=v});return best}
  function volume(row){return (row?.sets||[]).reduce((sum,s)=>{const w=n(s.w),r=n(s.r);return sum+(w!==null&&r!==null?w*r:0)},0)}
  function totalReps(row){return (row?.sets||[]).reduce((sum,s)=>sum+(n(s.r)||0),0)}
  function totalTime(row){return (row?.sets||[]).reduce((sum,s)=>sum+(n(s.seconds??s.r)||0),0)}
  function primary(g,row){if(g.type==='time')return bestTime(row);if(g.type==='reps')return bestReps(row);return bestWeightSet(row)?.w??null}
  function metricLabel(g){return g.type==='time'?'Tempo por sessão':g.type==='reps'?'Repetições por sessão':'Carga por sessão'}
  function metricUnit(g){return g.type==='time'?'s':g.type==='reps'?' reps':' kg'}
  function sessionMain(g,row){
    if(!row)return '—';
    if(g.type==='time'){const v=bestTime(row);return v===null?'—':fmt(v)+' s'}
    if(g.type==='reps'){const v=bestReps(row);return v===null?'—':fmt(v)+' reps'}
    const b=bestWeightSet(row);return b?fmt(b.w)+' kg × '+fmt(b.r):'—'
  }
  function recordText(g){
    if(g.type==='time'){const vals=g.rows.map(bestTime).filter(v=>v!==null);return vals.length?fmt(Math.max(...vals))+' s':'—'}
    if(g.type==='reps'){const vals=g.rows.map(bestReps).filter(v=>v!==null);return vals.length?fmt(Math.max(...vals))+' reps':'—'}
    const vals=g.rows.map(bestWeightSet).filter(Boolean);return vals.length?fmt(Math.max(...vals.map(x=>x.w)))+' kg':'—'
  }
  function secondaryText(g,row){
    if(!row)return '—';
    if(g.type==='time')return 'Total '+fmt(totalTime(row))+' s';
    if(g.type==='reps')return 'Total '+fmt(totalReps(row))+' reps';
    return 'Volume '+Math.round(volume(row)).toLocaleString('pt-BR')+' kg';
  }
  function deltaText(g,cur,prev){
    if(!cur||!prev)return 'Primeiro registro';
    if(g.type==='time'){const a=bestTime(cur),b=bestTime(prev);if(a===null||b===null)return '—';const d=a-b;return (d>0?'+':'')+fmt(d)+' s'}
    if(g.type==='reps'){const a=bestReps(cur),b=bestReps(prev);if(a===null||b===null)return '—';const d=a-b;return (d>0?'+':'')+fmt(d)+' reps'}
    const a=bestWeightSet(cur),b=bestWeightSet(prev);if(!a||!b)return '—';const dw=a.w-b.w,dr=a.r-b.r;let x=(dw>0?'+':'')+fmt(dw)+' kg';if(dw===0||dr!==0)x+=' · '+(dr>0?'+':'')+fmt(dr)+' reps';return x
  }
  function setsText(g,row){
    return (row.sets||[]).map(s=>{
      if(g.type==='time')return fmt(n(s.seconds??s.r)||0)+' s';
      if(g.type==='reps')return fmt(n(s.r)||0)+' reps';
      return fmt(n(s.w)||0)+'×'+fmt(n(s.r)||0);
    }).join(' · ')
  }

  function chart(g){
    const rows=g.rows.slice(-8),vals=rows.map(r=>primary(g,r)).filter(v=>v!==null);if(!vals.length)return null;
    const ns='http://www.w3.org/2000/svg',W=340,H=128,L=16,R=16,T=22,B=28,mn=Math.min(...vals),mx=Math.max(...vals),pad=Math.max(g.type==='weight_reps'?1:.5,(mx-mn)*.18),lo=mn-pad,hi=mx+pad,rg=hi-lo||1;
    const valid=rows.map(r=>({r,v:primary(g,r)})).filter(x=>x.v!==null),count=valid.length;
    const pts=valid.map((x,i)=>({x:count===1?W/2:L+i*((W-L-R)/(count-1)),y:T+((hi-x.v)/rg)*(H-T-B),v:x.v,t:x.r.t}));
    const s=document.createElementNS(ns,'svg');s.setAttribute('viewBox','0 0 '+W+' '+H);s.classList.add('strength-detail-chart');s.setAttribute('role','img');s.setAttribute('aria-label',metricLabel(g));
    const base=document.createElementNS(ns,'line');base.setAttribute('x1',L);base.setAttribute('x2',W-R);base.setAttribute('y1',H-B);base.setAttribute('y2',H-B);base.setAttribute('class','strength-grid');s.appendChild(base);
    if(pts.length>1){const pl=document.createElementNS(ns,'polyline');pl.setAttribute('points',pts.map(p=>p.x+','+p.y).join(' '));pl.setAttribute('class','strength-line');s.appendChild(pl)}
    pts.forEach((p,i)=>{const c=document.createElementNS(ns,'circle');c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r',i===pts.length-1?'4.5':'3.5');c.setAttribute('class',i===pts.length-1?'strength-point last':'strength-point');s.appendChild(c);const val=document.createElementNS(ns,'text');val.setAttribute('x',p.x);val.setAttribute('y',Math.max(12,p.y-8));val.setAttribute('text-anchor',i===0?'start':i===pts.length-1?'end':'middle');val.setAttribute('class','strength-chart-value');val.textContent=fmt(p.v)+metricUnit(g);s.appendChild(val);const dt=document.createElementNS(ns,'text');dt.setAttribute('x',p.x);dt.setAttribute('y',H-8);dt.setAttribute('text-anchor',i===0?'start':i===pts.length-1?'end':'middle');dt.setAttribute('class','strength-chart-date');dt.textContent=dateShort(p.t);s.appendChild(dt)});
    return s
  }

  function card(g){
    const rows=g.rows,cur=rows.at(-1),prev=rows.length>1?rows.at(-2):null,c=document.createElement('div');c.className='ex strength-history-card';
    const hd=document.createElement('div');hd.className='ex-h';const h=document.createElement('h3');h.textContent=g.name;const badge=document.createElement('span');badge.className='tgt';badge.textContent='Treino '+(g.day||cur?.day||'');hd.append(h,badge);c.appendChild(hd);

    const grid=document.createElement('div');grid.className='strength-stats';
    const tile=(label,value,sub)=>{const d=document.createElement('div');d.className='strength-stat';d.innerHTML='<span>'+label+'</span><b>'+value+'</b><small>'+sub+'</small>';grid.appendChild(d)};
    tile('Atual',sessionMain(g,cur),dateShort(cur.t));
    tile('Anterior',prev?sessionMain(g,prev):'—',prev?dateShort(prev.t):'sem anterior');
    tile('Recorde',recordText(g),secondaryText(g,cur));
    tile('Variação',deltaText(g,cur,prev),prev?'vs. '+dateShort(prev.t):'desde o início');
    c.appendChild(grid);

    const title=document.createElement('div');title.className='strength-chart-title';title.textContent=metricLabel(g)+' · últimas '+Math.min(8,rows.length)+' sessões';c.appendChild(title);
    const svg=chart(g);if(svg)c.appendChild(svg);

    const det=document.createElement('details');det.className='strength-history-details';const sm=document.createElement('summary');sm.textContent='Ver histórico ('+rows.length+')';det.appendChild(sm);
    rows.slice().reverse().forEach((r,i)=>{const row=document.createElement('div');row.className='strength-history-row';const left=document.createElement('div');left.innerHTML='<b>'+dateShort(r.t)+'</b><span>'+setsText(g,r)+'</span>';const right=document.createElement('div');right.className='strength-history-side';right.innerHTML='<b>'+sessionMain(g,r)+'</b><span>'+secondaryText(g,r)+'</span>';row.append(left,right);det.appendChild(row)});
    c.appendChild(det);return c
  }

  function enhance(){
    const v=$('vProg');if(!v)return;
    const active=[...v.querySelectorAll('.prog-switch button')].find(b=>b.getAttribute('aria-pressed')==='true');if(!active||active.textContent.trim()!=='Força')return;
    [...v.querySelectorAll(':scope > .ex')].forEach(x=>{if(!x.classList.contains('completed-workouts-card')&&!x.classList.contains('workout-log-editor'))x.remove()});
    v.querySelectorAll('.strength-history-title').forEach(x=>x.remove());
    const groups=histories();if(!groups.length)return;
    const title=document.createElement('div');title.className='strength-history-title';title.innerHTML='<b>Evolução por exercício</b><span>Atual, sessão anterior, recorde e histórico completo.</span>';v.appendChild(title);
    groups.forEach(g=>v.appendChild(card(g)));
  }

  const style=document.createElement('style');style.textContent=`
    .strength-history-title{margin:14px 2px 8px}.strength-history-title b,.strength-history-title span{display:block}.strength-history-title b{font:700 20px Barlow Condensed,system-ui,sans-serif;color:var(--ink)}.strength-history-title span{font-size:12px;color:var(--mute);margin-top:2px}
    .strength-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:8px}.strength-stat{background:var(--bg);border-radius:9px;padding:9px 10px;min-width:0}.strength-stat span,.strength-stat small{display:block;color:var(--mute)}.strength-stat span{font-size:11px}.strength-stat b{display:block;color:var(--ink);font-size:15px;margin:2px 0}.strength-stat small{font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .strength-chart-title{font-size:11px;color:var(--mute);margin:11px 2px 0}.strength-detail-chart{display:block;width:100%;height:auto;margin-top:3px}.strength-grid{stroke:var(--line);stroke-width:1}.strength-line{fill:none;stroke:var(--acc);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}.strength-point{fill:var(--acc)}.strength-point.last{fill:var(--hot)}.strength-chart-value{fill:var(--ink);font-size:9.5px;font-weight:600}.strength-chart-date{fill:var(--mute);font-size:9px}
    .strength-history-details{margin-top:7px;border-top:1px solid var(--line);padding-top:5px}.strength-history-details summary{cursor:pointer;color:var(--acc);font-weight:600;font-size:12px;padding:5px 0}.strength-history-row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--line)}.strength-history-row>div{min-width:0}.strength-history-row b,.strength-history-row span{display:block}.strength-history-row b{font-size:12px}.strength-history-row span{font-size:10.5px;color:var(--mute);margin-top:2px}.strength-history-side{text-align:right}
    @media(max-width:360px){.strength-stats{grid-template-columns:1fr}.strength-history-row{display:block}.strength-history-side{text-align:left;margin-top:4px}}
  `;document.head.appendChild(style);

  const base=window.renderProg;if(typeof base==='function')window.renderProg=function(){base.apply(this,arguments);requestAnimationFrame(enhance)};
})();
