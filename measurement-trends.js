// Body measurement trends. Read-only enhancement: does not change treino_v1 or existing records.
(function(){
  const FIELDS=[['waist','Cintura'],['abdomen','Abdômen'],['chest','Peito'],['hips','Quadril'],['neck','Pescoço'],['armR','Braço D'],['armL','Braço E'],['thighR','Coxa D'],['thighL','Coxa E']];
  let selected='waist',measureRange='30';
  const fmt=v=>Number(v).toFixed(1).replace('.0','');
  const shortDate=t=>new Date(t).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','');
  const axisDate=t=>{const d=new Date(t),m=d.toLocaleDateString('pt-BR',{month:'short'}).replace('.','');return d.getDate()+' '+m};
  const localDay=t=>{const d=new Date(t),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())};
  const byTime=a=>(a||[]).slice().sort((x,y)=>x.t-y.t);
  function seriesFor(k){
    const m=(db.measures||[]).filter(x=>num(x[k])!==null).map(x=>({t:x.t,v:num(x[k])}));
    if(k==='waist')m.push(...(db.waist||[]).filter(x=>num(x.c)!==null).map(x=>({t:x.t,v:num(x.c)})));
    const uniq=new Map();byTime(m).forEach(x=>uniq.set(x.t,x));
    return [...uniq.values()].sort((a,b)=>a.t-b.t)
  }
  function dailyLatest(a){const m=new Map();byTime(a).forEach(x=>m.set(localDay(x.t),x));return [...m.values()].sort((a,b)=>a.t-b.t)}
  function rangePoints(a){if(measureRange==='all')return a;const cut=Date.now()-Number(measureRange)*864e5;return a.filter(x=>x.t>=cut)}
  function available(){return FIELDS.filter(([k])=>seriesFor(k).length)}
  function labelIndexes(pts,maxLabels=5,minGap=48){
    const n=pts.length,s=new Set();if(!n)return s;if(n===1){s.add(0);return s}
    const candidates=[];
    if(n<=maxLabels){for(let i=0;i<n;i++)candidates.push(i)}
    else{for(let i=0;i<maxLabels;i++)candidates.push(Math.round(i*(n-1)/(maxLabels-1)))}
    s.add(0);let last=0;
    for(const i of candidates){if(i===0||i===n-1)continue;if(pts[i].x-pts[last].x>=minGap&&pts[n-1].x-pts[i].x>=minGap){s.add(i);last=i}}
    s.add(n-1);return s
  }
  function makeSvg(a,label){
    if(!a.length)return null;
    const ns='http://www.w3.org/2000/svg',W=360,H=198,L=50,R=16,T=20,B=48;
    const vals=a.map(x=>x.v),mn=Math.min(...vals),mx=Math.max(...vals),pad=Math.max(.5,(mx-mn)*.2),lo=mn-pad,hi=mx+pad,rg=hi-lo||1;
    const minT=a[0].t,maxT=a[a.length-1].t,tr=maxT-minT||1;
    const pts=a.map((x,i)=>({x:a.length===1?(L+(W-R))/2:L+((x.t-minT)/tr)*(W-L-R),y:T+((hi-x.v)/rg)*(H-T-B),v:x.v,t:x.t,i}));
    const s=document.createElementNS(ns,'svg');s.setAttribute('viewBox','0 0 '+W+' '+H);s.setAttribute('class','measure-detail-chart');s.setAttribute('role','img');s.setAttribute('aria-label','Evolução de '+label+' em centímetros');
    [hi,(hi+lo)/2,lo].forEach(v=>{const y=T+((hi-v)/rg)*(H-T-B),line=document.createElementNS(ns,'line');line.setAttribute('x1',L);line.setAttribute('x2',W-R);line.setAttribute('y1',y);line.setAttribute('y2',y);line.setAttribute('stroke','var(--line)');line.setAttribute('stroke-width','1');s.appendChild(line);const tx=document.createElementNS(ns,'text');tx.setAttribute('x',L-7);tx.setAttribute('y',y+4);tx.setAttribute('text-anchor','end');tx.setAttribute('fill','var(--mute)');tx.setAttribute('font-size','11');tx.textContent=fmt(v)+' cm';s.appendChild(tx)});
    if(pts.length>1){const pl=document.createElementNS(ns,'polyline');pl.setAttribute('points',pts.map(p=>p.x+','+p.y).join(' '));pl.setAttribute('fill','none');pl.setAttribute('stroke','var(--acc)');pl.setAttribute('stroke-width','3');pl.setAttribute('stroke-linecap','round');pl.setAttribute('stroke-linejoin','round');s.appendChild(pl)}
    const labels=labelIndexes(pts,5,48);
    pts.forEach((p,i)=>{const c=document.createElementNS(ns,'circle');c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r',i===pts.length-1?'4.5':'3.5');c.setAttribute('fill',i===pts.length-1?'var(--hot)':'var(--acc)');const title=document.createElementNS(ns,'title');title.textContent=shortDate(p.t)+' · '+fmt(p.v)+' cm';c.appendChild(title);s.appendChild(c);if(labels.has(i)){const val=document.createElementNS(ns,'text');val.setAttribute('x',p.x);val.setAttribute('y',Math.max(13,p.y-9));val.setAttribute('text-anchor',i===0?'start':i===pts.length-1?'end':'middle');val.setAttribute('fill','var(--ink)');val.setAttribute('font-size','11');val.setAttribute('font-weight','600');val.textContent=fmt(p.v);s.appendChild(val);const dt=document.createElementNS(ns,'text');dt.setAttribute('x',p.x);dt.setAttribute('y',H-16);dt.setAttribute('text-anchor',i===0?'start':i===pts.length-1?'end':'middle');dt.setAttribute('fill','var(--mute)');dt.setAttribute('font-size','10');dt.textContent=axisDate(p.t);s.appendChild(dt)}});
    return s
  }
  function addBodySummary(){
    const card=[...document.querySelectorAll('#vProg .ex')].find(c=>c.querySelector('h3')?.textContent.trim()==='Peso corporal');if(!card)return;
    card.querySelector('.body-trend-summary')?.remove();
    const end=Date.now(),start=end-7*864e5;
    const weights=dailyLatest((db.body||[]).filter(x=>num(x.w)!==null).map(x=>({t:x.t,v:num(x.w)}))).filter(x=>x.t>=start);
    const waist=dailyLatest(seriesFor('waist')).filter(x=>x.t>=start);
    if(!weights.length&&!waist.length)return;
    const box=document.createElement('div');box.className='body-trend-summary';
    if(weights.length){const avg=weights.reduce((a,x)=>a+x.v,0)/weights.length,s=document.createElement('span');s.innerHTML='<b>Média 7 dias</b>'+fmt(avg)+' kg<small>'+weights.length+' pesagem'+(weights.length===1?'':'s')+'</small>';box.appendChild(s)}
    if(waist.length){const d=waist.length>1?waist.at(-1).v-waist[0].v:null,s=document.createElement('span');s.innerHTML='<b>Cintura 7 dias</b>'+fmt(waist.at(-1).v)+' cm<small>'+(d===null?'1 medição':((d>0?'+':'')+fmt(d)+' cm'))+'</small>';box.appendChild(s)}
    const hint=card.querySelector('.hint');if(hint)hint.insertAdjacentElement('afterend',box);else card.appendChild(box)
  }
  function enhanceMeasures(){
    const old=document.querySelector('#vProg .measurement-trend-card');if(old)old.remove();
    const measureCard=[...document.querySelectorAll('#vProg .ex')].find(c=>c.querySelector('h3')?.textContent.trim()==='Medidas corporais');if(!measureCard)return;
    const list=available();if(!list.length)return;
    if(!list.some(([k])=>k===selected))selected=list[0][0];
    const labelToKey=new Map(FIELDS.map(([k,l])=>[l,k]));
    measureCard.querySelectorAll('.measure-tile').forEach(tile=>{
      const label=tile.querySelector('span')?.textContent.trim(),k=labelToKey.get(label);if(!k)return;
      tile.classList.add('measure-tile-button');tile.setAttribute('role','button');tile.setAttribute('tabindex','0');tile.setAttribute('aria-label','Ver evolução de '+label);tile.setAttribute('aria-pressed',String(k===selected));
      const choose=()=>{selected=k;enhanceMeasures()};tile.onclick=choose;tile.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}}
    });
    const card=document.createElement('div');card.className='ex measurement-trend-card';
    const h=document.createElement('h3');h.textContent='Evolução das medidas';card.appendChild(h);
    const selector=document.createElement('div');selector.className='measure-selector';list.forEach(([k,l])=>{const b=document.createElement('button');b.textContent=l;b.setAttribute('aria-pressed',String(k===selected));b.onclick=()=>{selected=k;enhanceMeasures()};selector.appendChild(b)});card.appendChild(selector);
    const ranges=document.createElement('div');ranges.className='range-tabs';[['7','7D'],['30','30D'],['90','3M'],['all','Tudo']].forEach(([k,l])=>{const b=document.createElement('button');b.textContent=l;b.setAttribute('aria-pressed',String(k===measureRange));b.onclick=()=>{measureRange=k;enhanceMeasures()};ranges.appendChild(b)});card.appendChild(ranges);
    const label=FIELDS.find(([k])=>k===selected)?.[1]||selected,all=dailyLatest(seriesFor(selected)),a=rangePoints(all);
    if(a.length){
      const head=document.createElement('div');head.className='measure-current';const current=a.at(-1),overallFirst=all[0],overallDiff=current.v-overallFirst.v;head.innerHTML='<span>'+label+'</span><strong>'+fmt(current.v)+' cm</strong><small>'+(all.length>1?((overallDiff>0?'+':'')+fmt(overallDiff)+' cm desde o início'):'primeiro registro')+'</small>';card.appendChild(head);
      const svg=makeSvg(a,label);if(svg)card.appendChild(svg);
      const first=a[0],last=a.at(-1),d=last.v-first.v,info=document.createElement('div');info.className='measure-chart-summary';info.innerHTML='<span><b>Início</b>'+shortDate(first.t)+' · '+fmt(first.v)+' cm</span><span><b>Atual</b>'+shortDate(last.t)+' · '+fmt(last.v)+' cm</span><span><b>Variação</b>'+(d>0?'+':'')+fmt(d)+' cm</span>';card.appendChild(info);
      const note=document.createElement('div');note.className='measure-chart-note';note.textContent='O gráfico usa a última medição de cada dia. Todos os registros continuam no Histórico corporal.';card.appendChild(note)
    }else{const e=document.createElement('div');e.className='hint';e.textContent='Nenhuma medição de '+label.toLowerCase()+' nesse período.';card.appendChild(e)}
    measureCard.insertAdjacentElement('afterend',card)
  }
  function enhance(){addBodySummary();enhanceMeasures()}
  const style=document.createElement('style');style.textContent='.body-trend-summary{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:10px 0 2px}.body-trend-summary span{background:var(--bg);border-radius:9px;padding:8px 10px;color:var(--ink);font-weight:600}.body-trend-summary b,.body-trend-summary small{display:block}.body-trend-summary b{font-size:11px;color:var(--mute);margin-bottom:2px}.body-trend-summary small{font-size:10.5px;color:var(--mute);font-weight:500;margin-top:1px}.measure-tile-button{cursor:pointer;border:1.5px solid transparent}.measure-tile-button[aria-pressed="true"]{border-color:var(--acc);background:var(--ok)}.measure-tile-button:focus-visible{outline:3px solid var(--hot);outline-offset:2px}.measure-selector{display:flex;gap:6px;overflow-x:auto;padding:2px 0 5px;margin-top:10px;-webkit-overflow-scrolling:touch}.measure-selector button{flex:0 0 auto;border:1px solid var(--line);background:var(--bg);color:var(--mute);border-radius:999px;padding:7px 10px;font:600 12px Barlow,system-ui,sans-serif}.measure-selector button[aria-pressed="true"]{background:var(--acc);border-color:var(--acc);color:var(--accink)}.measure-current{display:flex;align-items:baseline;gap:8px;margin:9px 0 0}.measure-current span{font-weight:600}.measure-current strong{font-size:22px}.measure-current small{color:var(--mute);font-size:11px;margin-left:auto}.measure-detail-chart{display:block;width:100%;height:auto;margin-top:6px;overflow:visible}.measure-chart-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}.measure-chart-summary span{background:var(--bg);border-radius:8px;padding:7px;color:var(--mute);font-size:11px;text-align:center}.measure-chart-summary b{display:block;color:var(--ink);font-size:12px;margin-bottom:2px}.measure-chart-note{color:var(--mute);font-size:11px;text-align:center;margin:7px 4px 0}@media(max-width:390px){.body-trend-summary{grid-template-columns:1fr 1fr}.measure-chart-summary{grid-template-columns:1fr}.measure-current{flex-wrap:wrap}.measure-current small{width:100%;margin-left:0}}';document.head.appendChild(style);
  const base=window.renderProg;if(typeof base==='function')window.renderProg=function(){base.apply(this,arguments);requestAnimationFrame(enhance)};
})();
