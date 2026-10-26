// Named A-E workout tabs for Reginaldo's priority plan.
(function(){
  try{
    if(typeof ACTIVE_PROFILE==='undefined'||ACTIVE_PROFILE!=='reginaldo')return;
    const VERSION='reginaldo_abcde_priority_v2';
    const META={
      A:['Peito Forte','Peito • Tríceps • Ombro lateral'],
      B:['Costas & Bíceps','Costas • Bíceps • Ombro posterior'],
      C:['Pernas & Core','Quadríceps • Posterior • Glúteos • Panturrilha • Abdômen'],
      D:['Peito & Ombros','Peito • Ombros'],
      E:['Braços & Acabamento','Bíceps • Tríceps • Ombro lateral • Costas leve']
    };
    const style=document.createElement('style');
    style.textContent=`
      .tabs.named-tabs{display:flex;gap:8px;overflow-x:auto;padding:1px 0 7px;margin-bottom:10px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.tabs.named-tabs::-webkit-scrollbar{display:none}
      .tabs.named-tabs button{flex:0 0 184px;min-height:66px;padding:8px 9px;display:grid;grid-template-columns:36px minmax(0,1fr);gap:8px;align-items:center;text-align:left;font-family:Barlow,system-ui,sans-serif}
      .day-letter{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:var(--bg);color:var(--acc);font:700 22px "Barlow Condensed",system-ui,sans-serif}
      .tabs.named-tabs button[aria-pressed="true"] .day-letter{background:color-mix(in srgb,var(--card) 88%,transparent);color:var(--acc)}
      .day-copy strong,.day-copy small{display:block}.day-copy strong{font-size:14px;line-height:1.1}.day-copy small{margin-top:4px;color:var(--mute);font-size:10px;font-weight:500;line-height:1.15;white-space:normal}
      .tabs.named-tabs button[aria-pressed="true"] .day-copy small{color:color-mix(in srgb,var(--accink) 78%,transparent)}
      .plan-pending{grid-column:1/-1;padding-top:6px;border-top:1px solid var(--line);color:var(--acc);font-size:12px;font-weight:600}
    `;
    document.head.appendChild(style);

    function activeDraft(){return Object.values(db.draft||{}).some(x=>Object.values(x||{}).some(rows=>Array.isArray(rows)&&rows.some(s=>s&&s.ok)));}
    function info(d){const q=db.training?.current?.days?.[d];return [q?.name||META[d]?.[0]||('Treino '+d),q?.muscles||META[d]?.[1]||''];}
    function decorate(){
      const box=$('tabs');if(!box)return;box.classList.add('named-tabs');
      const keys=typeof trainingDayKeys==='function'?trainingDayKeys():Object.keys(db.training?.current?.days||{});
      [...box.querySelectorAll('button')].forEach((b,i)=>{const d=keys[i];if(!d)return;const m=info(d);b.innerHTML='<span class="day-letter">'+d+'</span><span class="day-copy"><strong></strong><small></small></span>';b.querySelector('strong').textContent=m[0];b.querySelector('small').textContent=m[1];});
      const bar=$('planSummary');if(bar&&db.training?.current?.programVersion!==VERSION&&activeDraft()&&!bar.querySelector('.plan-pending')){const n=document.createElement('div');n.className='plan-pending';n.textContent='Novo plano preparado — entra automaticamente após finalizar o treino atual.';bar.appendChild(n);}
    }
    if(typeof renderTabs==='function'){const base=renderTabs;renderTabs=function(){base.apply(this,arguments);decorate();};}
    if(typeof renderList==='function'){const base=renderList;renderList=function(){base.apply(this,arguments);const m=info(day),sub=$('sub');if(sub)sub.textContent='Treino '+day+' · '+m[0]+(m[1]?' · '+m[1]:'')+' · sugerido hoje: '+nextDay();};}
    if(typeof finish==='function'){const base=finish;finish=function(){const before=(db.logs||[]).length;base.apply(this,arguments);if((db.logs||[]).length>before&&db.training?.current?.programVersion!==VERSION&&!activeDraft())setTimeout(()=>location.reload(),80);};}
  }catch(e){console.warn('Named workout tabs skipped',e);}
})();
