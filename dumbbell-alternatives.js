// Quick session-only dumbbell alternatives for busy machines/cables.
// Reuses the existing session catalog + workout-flex flow, so permanent plan/history rules stay intact.
(function(){
  const QUICK={
    'Supino reto com barra':['Supino reto com halteres'],
    'Supino inclinado na máquina':['Supino inclinado com halteres'],
    'Chest press na máquina':['Supino reto com halteres'],
    'Crucifixo na polia ou peck deck':['Crucifixo com halteres'],
    'Shoulder press na máquina':['Desenvolvimento com halteres']
  };

  function injectQuick(actions){
    const card=actions?.closest('.ex');
    const current=card?.querySelector('.ex-h h3')?.textContent?.trim();
    const names=QUICK[current];
    if(!names?.length)return;
    setTimeout(()=>{
      const panel=document.querySelector('.exercise-catalog-panel');
      const list=panel?.querySelector('.exercise-catalog-list');
      if(!panel||!list||panel.querySelector('.quick-alt-box'))return;
      const box=document.createElement('div');box.className='quick-alt-box';
      const title=document.createElement('div');title.className='quick-alt-title';title.innerHTML='<b>Alternativas rápidas</b><span>Mesmo foco, usando halteres</span>';box.appendChild(title);
      names.forEach(name=>{
        const b=document.createElement('button');b.type='button';b.className='quick-alt-btn';b.textContent=name;
        b.onclick=()=>{
          const items=[...list.querySelectorAll('.exercise-catalog-item')];
          const target=items.find(x=>x.querySelector('.catalog-item-copy b')?.textContent?.trim()===name);
          if(target)target.click();
          else if(typeof toast==='function')toast('Alternativa ainda não disponível no catálogo');
        };
        box.appendChild(b);
      });
      list.insertAdjacentElement('beforebegin',box);
    },30);
  }

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('.session-ex-actions button');
    if(!btn)return;
    const t=btn.textContent.trim();
    if(t==='Trocar exercício'||t==='Trocar novamente')injectQuick(btn.closest('.session-ex-actions'));
  },true);

  const st=document.createElement('style');
  st.textContent='.quick-alt-box{display:grid;gap:7px;margin:0 0 9px;padding:10px;border:1.5px solid var(--acc);border-radius:11px;background:var(--ok)}.quick-alt-title{display:grid;gap:1px}.quick-alt-title b{font-size:13px;color:var(--acc)}.quick-alt-title span{font-size:10px;color:var(--mute)}.quick-alt-btn{width:100%;text-align:left;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:9px;padding:10px 11px;font:700 14px Barlow,system-ui,sans-serif}.quick-alt-btn:after{content:"halteres";float:right;color:var(--acc);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}';
  document.head.appendChild(st);
})();