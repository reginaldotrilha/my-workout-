// Recomposition dashboard: weight trend + waist + strength, with an intermediate reassessment milestone.
(function(){
  const DAY=864e5;
  const fmt=v=>Number(v).toFixed(1).replace('.0','');
  const sorted=a=>(a||[]).slice().sort((x,y)=>(x.t||0)-(y.t||0));
  const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
  function weightSeries(){return sorted(db.body||[]).filter(x=>Number.isFinite(Number(x.w))).map(x=>({t:x.t,v:Number(x.w)}))}
  function waistSeries(){
    const a=[];(db.waist||[]).forEach(x=>{if(Number.isFinite(Number(x.c)))a.push({t:x.t,v:Number(x.c)})});
    (db.measures||[]).forEach(x=>{if(Number.isFinite(Number(x.waist)))a.push({t:x.t,v:Number(x.waist)})});
    const m=new Map();a.forEach(x=>m.set(x.t,x));return [...m.values()].sort((x,y)=>x.t-y.t);
  }
  function avgWindow(series,from,to){return mean(series.filter(x=>x.t>=from&&x.t<to).map(x=>x.v))}
  function weightTrend(){
    const a=weightSeries(),now=Date.now(),cur=avgWindow(a,now-7*DAY,now+1),prev=avgWindow(a,now-14*DAY,now-7*DAY);
    if(cur!==null&&prev!==null)return {value:cur-prev,label:'média 7d'};
    if(a.length>=2)return {value:a.at(-1).v-a[0].v,label:'desde o início'};
    return {value:null,label:'sem dados suficientes'};
  }
  function waistTrend(){const a=waistSeries();return a.length>=2?a.at(-1).v-a[0].v:null}
  function strengthTrend(){
    const by={};
    (db.logs||[]).forEach(l=>{
      const map=l.exById&&Object.keys(l.exById).length?l.exById:null;
      if(map)Object.entries(map).forEach(([id,sets])=>{const vals=(sets||[]).map(s=>Number(s.w)).filter(Number.isFinite);if(!vals.length)return;(by[id]=by[id]||[]).push({t:l.t,v:Math.max(...vals)})});
      else Object.entries(l.ex||{}).forEach(([i,sets])=>{const vals=(sets||[]).map(s=>Number(s.w)).filter(Number.isFinite);if(!vals.length)return;const id=l.day+'_'+i;(by[id]=by[id]||[]).push({t:l.t,v:Math.max(...vals)})});
    });
    let up=0,down=0,same=0;
    Object.values(by).forEach(a=>{a.sort((x,y)=>x.t-y.t);if(a.length<2)return;const d=a.at(-1).v-a[0].v;if(d>0.5)up++;else if(d<-.5)down++;else same++});
    if(!up&&!down&&!same)return null;return {up,down,same,label:up>down?'subindo':down>up?'caindo':'estável'};
  }
  function trainingConsistency(){const cut=Date.now()-14*DAY;return (db.logs||[]).filter(l=>(l.t||0)>=cut).length}
  function status(){
    const w=weightTrend().value,waist=waistTrend(),str=strengthTrend(),train=trainingConsistency();let score=0;
    if(waist!==null){if(waist<=-1)score+=2;else if(waist<0)score+=1;else if(waist>1)score-=1}
    if(w!==null){if(w<-.15)score+=1;else if(w>.5)score-=1}
    if(str){if(str.label==='subindo')score+=2;else if(str.label==='estável')score+=1;else score-=1}
    if(train>=6)score+=1;
    if(score>=4)return {label:'Muito bom',cls:'good',text:'Cintura, peso e desempenho apontam na direção certa.'};
    if(score>=2)return {label:'Bom',cls:'good',text:'Há sinais consistentes de recomposição. Continue observando a tendência, não um único dia.'};
    if(score>=0)return {label:'Estável',cls:'neutral',text:'Ainda não há sinal forte para mudar o plano. Acumule mais dados.'};
    return {label:'Revisar',cls:'warn',text:'A tendência merece revisão de calorias, recuperação e aderência.'};
  }
  function milestone(){
    db.prefs=db.prefs||{};
    if(!Number.isFinite(Number(db.prefs.reassessmentWeight))){const last=weightSeries().at(-1)?.v;db.prefs.reassessmentWeight=last?Math.max(20,Math.floor(last-3.5)):92;try{save()}catch(e){}}
    return Number(db.prefs.reassessmentWeight);
  }
  function tile(label,value,detail){const d=document.createElement('div');d.className='recomp-tile';d.innerHTML='<span>'+label+'</span><b>'+value+'</b><small>'+detail+'</small>';return d}
  function card(){
    const weights=weightSeries(),waists=waistSeries(),w=weightTrend(),wc=waistTrend(),str=strengthTrend(),st=status(),m=milestone(),last=weights.at(-1)?.v;
    if(!weights.length&&!waists.length&&!(db.logs||[]).length)return null;
    const c=document.createElement('div');c.className='ex recomp-card';
    const h=document.createElement('div');h.className='recomp-head';h.innerHTML='<div><h3>Recomposição</h3><span>Mais importante que o peso isolado</span></div><span class="recomp-badge '+st.cls+'">'+st.label+'</span>';c.appendChild(h);
    const g=document.createElement('div');g.className='recomp-grid';
    g.appendChild(tile('Peso',w.value===null?'—':((w.value>0?'+':'')+fmt(w.value)+' kg'),w.label));
    g.appendChild(tile('Cintura',wc===null?'—':((wc>0?'+':'')+fmt(wc)+' cm'),'desde o início'));
    g.appendChild(tile('Força',str?str.label:'—',str?(str.up+' exercícios ↑ · '+str.down+' ↓'):'ainda sem comparação'));
    g.appendChild(tile('Treinos',trainingConsistency()+' / 14d',trainingConsistency()>=6?'boa consistência':'continue acumulando dados'));
    c.appendChild(g);
    const msg=document.createElement('p');msg.className='recomp-message';msg.textContent=st.text;c.appendChild(msg);
    const goal=document.createElement('div');goal.className='recomp-milestone';const left=document.createElement('div');left.innerHTML='<span>Próximo marco</span><b>'+fmt(m)+' kg · reavaliar composição</b>'+(last?'<small>'+fmt(Math.max(0,last-m))+' kg até a reavaliação</small>':'');
    const btn=document.createElement('button');btn.type='button';btn.className='ghost small';btn.textContent='Alterar';btn.onclick=()=>{const raw=prompt('Peso para reavaliar composição corporal (kg)',m);if(raw===null)return;const x=Number(String(raw).replace(',','.'));if(!Number.isFinite(x)||x<20||x>400){toast('Digite um peso válido');return}db.prefs.reassessmentWeight=x;save();renderProg()};goal.append(left,btn);c.appendChild(goal);return c;
  }
  function enhanceGoal(){
    const v=document.getElementById('vProg');if(!v)return;
    const old=v.querySelector('.goal-btn');if(old){const m=milestone();old.textContent='Reavaliar em: '+fmt(m)+' kg';old.onclick=()=>{const raw=prompt('Peso para reavaliar composição corporal (kg)',m);if(raw===null)return;const x=Number(String(raw).replace(',','.'));if(!Number.isFinite(x)||x<20||x>400){toast('Digite um peso válido');return}db.prefs.reassessmentWeight=x;save();renderProg()};const hero=old.closest('.ex');const hint=[...(hero?.querySelectorAll('.hint')||[])].find(x=>/Faltam|Meta atingida/i.test(x.textContent));if(hint)hint.textContent='Use este peso como ponto de reavaliação; o objetivo final depende da composição corporal.'}
  }
  function inject(){
    const v=document.getElementById('vProg');if(!v)return;v.querySelector('.recomp-card')?.remove();
    const weightTitle=[...v.querySelectorAll('h3')].find(h=>h.textContent==='Peso corporal');if(!weightTitle)return;
    enhanceGoal();const c=card();if(!c)return;const hero=weightTitle.closest('.ex');if(hero)hero.insertAdjacentElement('afterend',c);
  }
  if(typeof renderProg==='function'){const base=renderProg;renderProg=function(){base.apply(this,arguments);inject()}}
  const st=document.createElement('style');st.textContent=`
    .recomp-card{padding:13px}.recomp-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.recomp-head h3{font-size:21px}.recomp-head span{display:block;color:var(--mute);font-size:12px;margin-top:2px}.recomp-badge{font-size:11px;font-weight:800;border-radius:999px;padding:5px 8px;background:var(--bg);color:var(--mute)}.recomp-badge.good{background:var(--ok);color:var(--acc)}.recomp-badge.warn{color:#a73f2a}.recomp-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.recomp-tile{background:var(--bg);border-radius:9px;padding:9px}.recomp-tile span,.recomp-tile small,.recomp-tile b{display:block}.recomp-tile span{color:var(--mute);font-size:11px}.recomp-tile b{font-size:16px;margin:2px 0}.recomp-tile small{color:var(--mute);font-size:10px;line-height:1.25}.recomp-message{font-size:12px;line-height:1.4;margin:10px 0;color:var(--ink)}.recomp-milestone{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:9px;background:var(--bg);border-radius:9px}.recomp-milestone span,.recomp-milestone b,.recomp-milestone small{display:block}.recomp-milestone span,.recomp-milestone small{font-size:10px;color:var(--mute)}.recomp-milestone b{font-size:13px;margin:2px 0}@media(max-width:390px){.recomp-grid{grid-template-columns:1fr}}
  `;document.head.appendChild(st);
})();
