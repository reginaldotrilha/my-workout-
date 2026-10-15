// Adds readable values and dates to the body-weight trend chart without changing stored data.
(function(){
  function fmt(v){return Number(v).toFixed(1).replace('.0','')}
  function shortDate(t){return new Date(t).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','')}
  function getRangeDays(card){const b=[...card.querySelectorAll('.range-tabs button')].find(x=>x.getAttribute('aria-pressed')==='true');if(!b)return 30;const x=b.textContent.trim();if(x==='7D')return 7;if(x==='30D')return 30;if(x==='3M')return 90;return 0}
  function pointsFor(card){const days=getRangeDays(card),cut=days?Date.now()-days*864e5:0;return (db.body||[]).filter(x=>num(x.w)!==null&&x.t>=cut).slice().sort((a,b)=>a.t-b.t)}
  function makeSvg(a){
    if(a.length<2)return null;
    const ns='http://www.w3.org/2000/svg',W=360,H=190,L=48,R=12,T=18,B=42;
    const vals=a.map(x=>Number(x.w)),mn=Math.min(...vals),mx=Math.max(...vals),pad=Math.max(.3,(mx-mn)*.2),lo=mn-pad,hi=mx+pad,rg=hi-lo||1;
    const minT=a[0].t,maxT=a[a.length-1].t,tr=maxT-minT||1;
    const pts=a.map(x=>({x:L+((x.t-minT)/tr)*(W-L-R),y:T+((hi-x.w)/rg)*(H-T-B),w:Number(x.w),t:x.t}));
    const s=document.createElementNS(ns,'svg');s.setAttribute('viewBox','0 0 '+W+' '+H);s.setAttribute('class','weight-detail-chart');s.setAttribute('role','img');s.setAttribute('aria-label','Tendência do peso com datas e valores');
    [hi,(hi+lo)/2,lo].forEach(v=>{const y=T+((hi-v)/rg)*(H-T-B),line=document.createElementNS(ns,'line');line.setAttribute('x1',L);line.setAttribute('x2',W-R);line.setAttribute('y1',y);line.setAttribute('y2',y);line.setAttribute('stroke','var(--line)');line.setAttribute('stroke-width','1');s.appendChild(line);const tx=document.createElementNS(ns,'text');tx.setAttribute('x',L-6);tx.setAttribute('y',y+4);tx.setAttribute('text-anchor','end');tx.setAttribute('fill','var(--mute)');tx.setAttribute('font-size','11');tx.textContent=fmt(v)+' kg';s.appendChild(tx)});
    const pl=document.createElementNS(ns,'polyline');pl.setAttribute('points',pts.map(p=>p.x+','+p.y).join(' '));pl.setAttribute('fill','none');pl.setAttribute('stroke','var(--acc)');pl.setAttribute('stroke-width','3');pl.setAttribute('stroke-linecap','round');pl.setAttribute('stroke-linejoin','round');s.appendChild(pl);
    const step=Math.max(1,Math.ceil(a.length/5));pts.forEach((p,i)=>{const c=document.createElementNS(ns,'circle');c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r',i===pts.length-1?'4.5':'3.5');c.setAttribute('fill',i===pts.length-1?'var(--hot)':'var(--acc)');const title=document.createElementNS(ns,'title');title.textContent=shortDate(p.t)+' · '+fmt(p.w)+' kg';c.appendChild(title);s.appendChild(c);const show=i===0||i===pts.length-1||i%step===0;if(show){const val=document.createElementNS(ns,'text');val.setAttribute('x',p.x);val.setAttribute('y',Math.max(12,p.y-9));val.setAttribute('text-anchor','middle');val.setAttribute('fill','var(--ink)');val.setAttribute('font-size','11');val.setAttribute('font-weight','600');val.textContent=fmt(p.w);s.appendChild(val);const dt=document.createElementNS(ns,'text');dt.setAttribute('x',p.x);dt.setAttribute('y',H-14);dt.setAttribute('text-anchor',i===0?'start':i===pts.length-1?'end':'middle');dt.setAttribute('fill','var(--mute)');dt.setAttribute('font-size','10.5');dt.textContent=shortDate(p.t);s.appendChild(dt)}});
    return s
  }
  function enhanceWeightChart(){
    const card=[...document.querySelectorAll('#vProg .ex')].find(c=>c.querySelector('h3')?.textContent.trim()==='Tendência do peso');if(!card)return;
    const a=pointsFor(card);if(a.length<2)return;const old=card.querySelector('.spark,.weight-detail-chart');if(old)old.remove();const svg=makeSvg(a);if(!svg)return;card.appendChild(svg);
    const oldInfo=card.querySelector('.weight-chart-summary');if(oldInfo)oldInfo.remove();const info=document.createElement('div');info.className='weight-chart-summary';const first=a[0],last=a[a.length-1],d=last.w-first.w;info.innerHTML='<span><b>Início</b>'+shortDate(first.t)+' · '+fmt(first.w)+' kg</span><span><b>Atual</b>'+shortDate(last.t)+' · '+fmt(last.w)+' kg</span><span><b>Variação</b>'+(d>0?'+':'')+fmt(d)+' kg</span>';card.appendChild(info)
  }
  const style=document.createElement('style');style.textContent='.weight-detail-chart{display:block;width:100%;height:auto;margin-top:8px}.weight-chart-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}.weight-chart-summary span{background:var(--bg);border-radius:8px;padding:7px;color:var(--mute);font-size:11px;text-align:center}.weight-chart-summary b{display:block;color:var(--ink);font-size:12px;margin-bottom:2px}@media(max-width:360px){.weight-chart-summary{grid-template-columns:1fr}}';document.head.appendChild(style);
  const base=window.renderProg;if(typeof base==='function')window.renderProg=function(){base.apply(this,arguments);requestAnimationFrame(enhanceWeightChart)};
})();
