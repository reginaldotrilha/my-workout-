// Hybrid per-set inputs: type any value or choose from a quick selector.
// Repetition options are color coded against the exercise's fixed ideal range.
(function(){
  const norm=s=>String(s||'').trim().toLocaleLowerCase('pt-BR');

  function fireInput(input,value){
    input.value=String(value);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    input.focus({preventScroll:true});
  }

  function exerciseForCard(card){
    const name=card.querySelector('.ex-h h3')?.textContent||'';
    return window.ExerciseCatalog?.byName?.(name)||null;
  }

  function idealRange(card){
    const item=exerciseForCard(card);
    const range=item&&window.RepTargetsApi?.ideal?.(item);
    return window.RepTargetsApi?.parse?.(range)||null;
  }

  function repValues(range,current){
    const max=Math.max(25,range?.max||0,Number(current)||0);
    const min=Math.min(1,range?.min||1);
    const out=[];
    for(let n=min;n<=Math.min(40,max+5);n++)out.push(n);
    return out;
  }

  function weightValues(current){
    const cur=Number(String(current||'').replace(',','.'))||0;
    const vals=new Set([0]);
    for(let n=2.5;n<=50;n+=2.5)vals.add(Number(n.toFixed(1)));
    for(let n=55;n<=120;n+=5)vals.add(n);
    for(let n=130;n<=200;n+=10)vals.add(n);
    if(cur>0)vals.add(cur);
    return [...vals].sort((a,b)=>a-b);
  }

  function closeAll(except){
    document.querySelectorAll('.series-picker-menu.open').forEach(m=>{if(m!==except)m.classList.remove('open')});
  }

  function positionMenu(menu,wrap){
    const r=wrap.getBoundingClientRect(),pad=8;
    const width=Math.min(300,window.innerWidth-pad*2);
    menu.style.width=width+'px';
    menu.style.left=Math.max(pad,Math.min(window.innerWidth-width-pad,r.left))+'px';
    const estimated=Math.min(300,menu.scrollHeight||260);
    const below=window.innerHeight-r.bottom-pad;
    if(below>=Math.min(220,estimated)){
      menu.style.top=(r.bottom+6)+'px';menu.style.bottom='auto';
    }else{
      menu.style.top='auto';menu.style.bottom=(window.innerHeight-r.top+6)+'px';
    }
  }

  function makeMenu(type,input,wrap,card){
    const menu=document.createElement('div');
    menu.className='series-picker-menu '+type+'-picker-menu';
    menu.setAttribute('role','listbox');
    document.body.appendChild(menu);

    const title=document.createElement('div');title.className='series-picker-title';
    const range=type==='reps'?idealRange(card):null;
    title.textContent=type==='reps'?(range?'Escolha reps · ideal '+range.min+'–'+range.max:'Escolha reps'):'Escolha o peso (kg)';
    menu.appendChild(title);

    const grid=document.createElement('div');grid.className='series-picker-grid';menu.appendChild(grid);
    const values=type==='reps'?repValues(range,input.value):weightValues(input.value);
    values.forEach(value=>{
      const b=document.createElement('button');b.type='button';b.className='series-picker-option';b.textContent=String(value);
      if(type==='reps'&&range){
        if(value>=range.min&&value<=range.max){b.classList.add('ideal');b.title='Dentro da faixa ideal'}
        else if(value<range.min)b.classList.add('below');
        else b.classList.add('above');
      }
      if(String(value)===String(input.value))b.classList.add('current');
      b.onclick=e=>{e.preventDefault();fireInput(input,value);menu.classList.remove('open');decorate()};
      grid.appendChild(b);
    });

    const custom=document.createElement('div');custom.className='series-picker-custom';
    custom.textContent=type==='reps'?'Ou feche e digite qualquer número no campo.':'Ou feche e digite qualquer peso no campo.';
    menu.appendChild(custom);
    return menu;
  }

  function enhanceInput(input,type,row,card){
    if(input.dataset.pickerEnhanced==='1')return;
    input.dataset.pickerEnhanced='1';
    const wrap=document.createElement('div');wrap.className='series-value-picker '+type+'-value-picker';
    input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
    const btn=document.createElement('button');btn.type='button';btn.className='series-picker-trigger';btn.setAttribute('aria-label',type==='reps'?'Escolher repetições':'Escolher peso');btn.textContent='⌄';wrap.appendChild(btn);
    let menu=null;
    btn.onclick=e=>{
      e.preventDefault();e.stopPropagation();
      if(menu){menu.remove();menu=null}
      menu=makeMenu(type,input,wrap,card);
      closeAll(menu);menu.classList.add('open');requestAnimationFrame(()=>positionMenu(menu,wrap));
    };
    input.addEventListener('focus',()=>{wrap.classList.add('editing')});
    input.addEventListener('blur',()=>{wrap.classList.remove('editing')});
  }

  function colorRepInput(input,card){
    const range=idealRange(card),v=Number(input.value);
    input.classList.remove('rep-in-ideal','rep-below-ideal','rep-above-ideal');
    if(!range||!Number.isFinite(v)||!input.value)return;
    if(v>=range.min&&v<=range.max)input.classList.add('rep-in-ideal');
    else if(v<range.min)input.classList.add('rep-below-ideal');
    else input.classList.add('rep-above-ideal');
  }

  function decorate(){
    const box=document.getElementById('list');if(!box||box.querySelector('.plan-editor,.plan-manager'))return;
    [...box.querySelectorAll(':scope > .ex')].forEach(card=>{
      [...card.querySelectorAll('.set')].forEach(row=>{
        const inputs=[...row.querySelectorAll('input')];
        inputs.forEach(input=>{
          const aria=input.getAttribute('aria-label')||'';
          if(/^Carga série/i.test(aria)||input.placeholder==='kg')enhanceInput(input,'weight',row,card);
          else if(/^Repetições série/i.test(aria)||input.placeholder==='reps'){
            enhanceInput(input,'reps',row,card);colorRepInput(input,card);
            if(input.dataset.repColorBound!=='1'){
              input.dataset.repColorBound='1';input.addEventListener('input',()=>colorRepInput(input,card));
            }
          }
        });
      });
    });
  }

  document.addEventListener('pointerdown',e=>{
    if(!e.target.closest('.series-picker-menu,.series-picker-trigger'))closeAll();
  });
  window.addEventListener('resize',()=>closeAll());
  window.addEventListener('scroll',()=>closeAll(),{passive:true});

  const base=window.renderList;
  if(typeof base==='function')window.renderList=function(){const r=base.apply(this,arguments);requestAnimationFrame(decorate);return r};
  requestAnimationFrame(decorate);

  const style=document.createElement('style');
  style.textContent=`
    .series-value-picker{position:relative;min-width:0;display:flex;align-items:stretch}
    .series-value-picker>input{width:100%;min-width:0;padding-right:30px!important}
    .series-picker-trigger{position:absolute;right:2px;top:2px;bottom:2px;width:28px;border:0;border-left:1px solid var(--line);border-radius:0 7px 7px 0;background:transparent;color:var(--acc);font:700 18px/1 system-ui;padding:0;display:flex;align-items:center;justify-content:center}
    .series-value-picker.editing{outline:2px solid color-mix(in srgb,var(--acc) 18%,transparent);border-radius:9px}
    input.rep-in-ideal{border-color:var(--acc)!important;background:color-mix(in srgb,var(--ok) 58%,var(--bg))!important}
    input.rep-below-ideal,input.rep-above-ideal{border-color:var(--hot)!important}
    .series-picker-menu{display:none;position:fixed;z-index:9999;max-height:310px;overflow:auto;padding:10px;border:1px solid var(--line);border-radius:14px;background:var(--card);box-shadow:0 12px 36px rgba(0,0,0,.18);-webkit-overflow-scrolling:touch}
    .series-picker-menu.open{display:block}
    .series-picker-title{font-size:12px;font-weight:700;color:var(--ink);margin:0 0 8px}
    .series-picker-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
    .series-picker-option{min-height:38px;border:1px solid var(--line);border-radius:9px;background:var(--bg);color:var(--ink);font:700 13px Barlow,system-ui,sans-serif}
    .series-picker-option.ideal{border-color:var(--acc);background:var(--ok);color:var(--acc)}
    .series-picker-option.below,.series-picker-option.above{color:var(--mute)}
    .series-picker-option.current{box-shadow:inset 0 0 0 2px var(--hot)}
    .series-picker-custom{margin-top:8px;font-size:10px;line-height:1.3;color:var(--mute)}
    .set.has-rir .series-value-picker{min-width:0}
    @media(max-width:390px){.series-picker-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.series-picker-menu{max-height:280px}.series-picker-trigger{width:25px}.series-value-picker>input{padding-right:27px!important}}
  `;
  document.head.appendChild(style);
})();
