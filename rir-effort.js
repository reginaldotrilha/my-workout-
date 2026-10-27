// RIR (reps in reserve) per set. Persists in drafts and completed workout sets without breaking legacy logs.
(function(){
  const RIR_OPTIONS=[['','RIR'],['0','0'],['1','1'],['2','2'],['3','3'],['4','4+']];
  function factor(rir){
    if(rir===null||rir===undefined||rir==='')return 1;
    const r=Number(rir);if(!Number.isFinite(r))return 1;
    if(r<=1)return 1;if(r===2)return .9;if(r===3)return .8;return .65;
  }
  function effectiveSets(sets){return (sets||[]).reduce((n,s)=>n+factor(s?.rir),0)}
  function decorate(){
    const box=document.getElementById('list');if(!box)return;
    const cards=[...box.querySelectorAll(':scope > .ex')].filter(c=>c.querySelector('.set'));
    cards.forEach((card,i)=>{
      const rows=[...card.querySelectorAll('.set')];
      const draft=db.draft?.[day]?.[i]||[];
      rows.forEach((row,k)=>{
        if(row.querySelector('.rir-select'))return;
        const s=draft[k];if(!s)return;
        const sel=document.createElement('select');sel.className='rir-select';sel.setAttribute('aria-label','RIR série '+(k+1));
        RIR_OPTIONS.forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;sel.appendChild(o)});
        sel.value=s.rir===undefined||s.rir===null?'':String(Math.min(4,Number(s.rir)));
        sel.onchange=()=>{s.rir=sel.value===''?'':Number(sel.value);save()};
        const check=row.querySelector('.chk');if(check)row.insertBefore(sel,check);else row.appendChild(sel);
      });
      if(!card.querySelector('.rir-hint')){
        const h=document.createElement('div');h.className='rir-hint';h.textContent='RIR: repetições que ainda sobrariam. 0–1 = muito perto da falha · 2–3 = esforço produtivo · 4+ = mais leve.';
        const first=card.querySelector('.set');if(first)card.insertBefore(h,first);
      }
    });
  }
  if(typeof renderList==='function'){
    const base=renderList;renderList=function(){base.apply(this,arguments);decorate()};
  }

  if(typeof finish==='function'){
    const baseFinish=finish;
    finish=function(){
      const before=(db.logs||[]).length,captured={},finishedDay=day;
      Object.entries(db.draft?.[day]||{}).forEach(([i,rows])=>{captured[i]=(rows||[]).filter(s=>s?.ok).map(s=>s.rir===undefined||s.rir===null||s.rir===''?null:Number(s.rir))});
      baseFinish.apply(this,arguments);
      if((db.logs||[]).length<=before)return;
      const log=db.logs.at(-1);if(!log||log.day!==finishedDay)return;
      Object.entries(captured).forEach(([i,vals])=>{
        const idx=Number(i),id=log.exerciseOrder?.[idx];
        if(id&&Array.isArray(log.exById?.[id]))log.exById[id].forEach((s,k)=>{if(vals[k]!==null&&vals[k]!==undefined)s.rir=vals[k]});
        if(Array.isArray(log.ex?.[idx]))log.ex[idx].forEach((s,k)=>{if(vals[k]!==null&&vals[k]!==undefined)s.rir=vals[k]});
      });
      save();if(typeof render==='function')render();
    };
  }

  window.rirEffortApi={factor,effectiveSets};
  const st=document.createElement('style');st.textContent=`
    .set .rir-select{width:62px;min-width:62px;height:38px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink);font:600 12px Barlow,system-ui,sans-serif;padding:0 6px}.rir-hint{color:var(--mute);font-size:10px;line-height:1.35;margin:5px 0 7px;padding:6px 8px;background:var(--bg);border-radius:8px}@media(max-width:390px){.set .rir-select{width:56px;min-width:56px;padding:0 4px}}
  `;document.head.appendChild(st);
})();
