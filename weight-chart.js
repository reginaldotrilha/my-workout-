// Detailed body-weight trend. Keeps every stored record; chart uses the latest weight from each day.
(function(){
  function fmt(v){return Number(v).toFixed(1).replace('.0','')}
  function shortDate(t){return new Date(t).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','')}
  function axisDate(t){const d=new Date(t),m=d.toLocaleDateString('pt-BR',{month:'short'}).replace('.','');return d.getDate()+' '+m}
  function localDay(t){const d=new Date(t),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
  function getRangeDays(card){const b=[...card.querySelectorAll('.range-tabs button')].find(x=>x.getAttribute('aria-pressed')==='true');if(!b)return 30;const x=b.textContent.trim();if(x==='7D')return 7;if(x==='30D')return 30;if(x==='3M')return 90;return 0}
  function rawPoints(card){const days=getRangeDays(card),cut=days?Date.now()-days*864e5:0;return (db.body||[]).filter(x=>num(x.w)!==null&&x.t>=cut).slice().sort((a,b)=>a.t-b.t)}
  function dailyPoints(raw){const byDay=new Map();raw.forEach(x=>byDay.set(localDay(x.t),x));return [...byDay.values()].sort((a,b)=>a.t-b.t)}
  function labelIndexes(n,maxLabels=5){const s=new Set();if(n<=maxLabels){for(let i=0;i<n;i++)s.add(i);return s}for(let i=0;i<maxLabels;i++)s.add(Math.round(i*(n-1)/(maxLabels-1)));return s}
  function makeSvg(a){
    if(!a.length)return null;
    const ns='http://www.w3.org/2000/svg',W=360,H=190,L=48,R=12,T=18,B=42;
    const vals=a.map(x=>Number(x.w)),mn=Math.min(...vals),mx=Math.max(...vals),pad=Math.max(.3,(mx-mn)*.2),lo=mn-pad,hi=mx+pad,rg=hi-lo||1;
    const minT=a[0].t,maxT=a[a.length-1].t,tr=maxT-minT||1;
    const pts=a.map((x,i)=>({x:a.length===1?(L+(W-R))/2:L+((x.t-minT)/tr)*(W-L-R),y:T+((hi-x.w)/rg)*(H-T-B),w:Number(x.w),t:x.t,i}));
    const s=document.createElementNS(ns,'svg');s.setAttribute('viewBox','0 0 '+W+' '+H);s.setAttribute('class','weight-detail-chart');s.setAttribute('role','img');s.setAttribute('aria-label','Tendência do peso com datas e valores');
    [hi,(hi+lo)/2,lo].forEach(v=>{const y=T+((hi-v)/rg)*(H-T-B),line=document.createElementNS(ns,'line');line.setAttribute('x1',L);line.setAttribute('x2',W-R);line.setAttribute('y1',y);line.setAttribute('y2',y);line.setAttribute('stroke','var(--line)');line.setAttribute('stroke-width','1');s.appendChild(line);const tx=document.createElementNS(ns,'text');tx.setAttribute('x',L-6);tx.setAttribute('y',y+4);tx.setAttribute('text-anchor','end');tx.setAttribute('fill','var(--mute)');tx.setAttribute('font-size','11');tx.textContent=fmt(v)+' kg';s.appendChild(tx)});
    if(pts.length>1){const pl=document.createElementNS(ns,'polyline');pl.setAttribute('points',pts.map(p=>p.x+','+p.y).join(' '));pl.setAttribute('fill','none');pl.setAttribute('stroke','var(--acc)');pl.setAttribute('stroke-width','3');pl.setAttribute('stroke-linecap','round');pl.setAttribute('stroke-linejoin','round');s.appendChild(pl)}
    const labels=labelIndexes(pts.length,5);
    pts.forEach((p,i)=>{const c=document.createElementNS(ns,'circle');c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r',i===pts.length-1?'4.5':'3.5');c.setAttribute('fill',i===pts.length-1?'var(--hot)':'var(--acc)');const title=document.createElementNS(ns,'title');title.textContent=shortDate(p.t)+' · '+fmt(p.w)+' kg';c.appendChild(title);s.appendChild(c);if(labels.has(i)){const val=document.createElementNS(ns,'text');val.setAttribute('x',p.x);val.setAttribute('y',Math.max(12,p.y-9));val.setAttribute('text-anchor',i===0?'start':i===pts.length-1?'end':'middle');val.setAttribute('fill','var(--ink)');val.setAttribute('font-size','11');val.setAttribute('font-weight','600');val.textContent=fmt(p.w);s.appendChild(val);const dt=document.createElementNS(ns,'text');dt.setAttribute('x',p.x);dt.setAttribute('y',H-14);dt.setAttribute('text-anchor',i===0?'start':i===pts.length-1?'end':'middle');dt.setAttribute('fill','var(--mute)');dt.setAttribute('font-size','10');dt.textContent=axisDate(p.t);s.appendChild(dt)}});
    return s
  }
  function enhanceWeightChart(){
    const card=[...document.querySelectorAll('#vProg .ex')].find(c=>c.querySelector('h3')?.textContent.trim()==='Tendência do peso');if(!card)return;
    const raw=rawPoints(card),a=dailyPoints(raw),old=card.querySelector('.spark,.weight-detail-chart');if(old)old.remove();
    const oldInfo=card.querySelector('.weight-chart-summary');if(oldInfo)oldInfo.remove();const oldNote=card.querySelector('.weight-chart-note');if(oldNote)oldNote.remove();
    if(!a.length)return;
    const svg=makeSvg(a);if(svg)card.appendChild(svg);
    const first=raw[0],last=raw[raw.length-1],d=last.w-first.w,info=document.createElement('div');info.className='weight-chart-summary';info.innerHTML='<span><b>Início</b>'+shortDate(first.t)+' · '+fmt(first.w)+' kg</span><span><b>Atual</b>'+shortDate(last.t)+' · '+fmt(last.w)+' kg</span><span><b>Variação</b>'+(d>0?'+':'')+fmt(d)+' kg</span>';card.appendChild(info);
    const note=document.createElement('div');note.className='weight-chart-note';note.textContent='O gráfico usa a última pesagem de cada dia. Todos os registros continuam no Histórico corporal.';card.appendChild(note)
  }
  const style=document.createElement('style');style.textContent='.weight-detail-chart{display:block;width:100%;height:auto;margin-top:8px;overflow:visible}.weight-chart-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}.weight-chart-summary span{background:var(--bg);border-radius:8px;padding:7px;color:var(--mute);font-size:11px;text-align:center}.weight-chart-summary b{display:block;color:var(--ink);font-size:12px;margin-bottom:2px}.weight-chart-note{color:var(--mute);font-size:11px;text-align:center;margin:7px 4px 0}@media(max-width:360px){.weight-chart-summary{grid-template-columns:1fr}}';document.head.appendChild(style);
  const base=window.renderProg;if(typeof base==='function')window.renderProg=function(){base.apply(this,arguments);requestAnimationFrame(enhanceWeightChart)};
})();
