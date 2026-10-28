// Native iOS-friendly selectors for each set.
// Users can type freely in the input or choose a value from the adjacent native <select>.
(function(){
  function fireInput(input,value){
    input.value=String(value);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
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
    const out=[];
    for(let n=1;n<=Math.min(40,max+5);n++)out.push(n);
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

  function colorRepInput(input,card){
    const range=idealRange(card),v=Number(input.value);
    input.classList.remove('rep-in-ideal','rep-below-ideal','rep-above-ideal');
    if(!range||!Number.isFinite(v)||!input.value)return;
    if(v>=range.min&&v<=range.max)input.classList.add('rep-in-ideal');
    else if(v<range.min)input.classList.add('rep-below-ideal');
    else input.classList.add('rep-above-ideal');
  }

  function buildSelect(type,input,card){
    const select=document.createElement('select');
    select.className='series-native-select '+type+'-native-select';
    select.setAttribute('aria-label',type==='reps'?'Escolher repetições':'Escolher peso');

    const placeholder=document.createElement('option');
    placeholder.value='';placeholder.textContent='▼';placeholder.selected=true;
    select.appendChild(placeholder);

    if(type==='reps'){
      const range=idealRange(card);
      repValues(range,input.value).forEach(v=>{
        const o=document.createElement('option');o.value=String(v);
        if(range&&v>=range.min&&v<=range.max)o.textContent='🟢 '+v+' reps';
        else if(range)o.textContent='🟠 '+v+' reps';
        else o.textContent=v+' reps';
        select.appendChild(o);
      });
    }else{
      weightValues(input.value).forEach(v=>{
        const o=document.createElement('option');o.value=String(v);o.textContent=v+' kg';select.appendChild(o);
      });
    }

    select.onchange=()=>{
      if(select.value==='')return;
      fireInput(input,select.value);
      if(type==='reps')colorRepInput(input,card);
      select.value='';
    };
    return select;
  }

  function enhanceInput(input,type,card){
    if(input.dataset.nativePickerEnhanced==='1')return;
    input.dataset.nativePickerEnhanced='1';

    const wrap=document.createElement('div');
    wrap.className='series-value-picker '+type+'-value-picker';
    input.parentNode.insertBefore(wrap,input);
    wrap.appendChild(input);
    wrap.appendChild(buildSelect(type,input,card));

    if(type==='reps'){
      colorRepInput(input,card);
      input.addEventListener('input',()=>colorRepInput(input,card));
    }
  }

  function decorate(){
    const box=document.getElementById('list');
    if(!box||box.querySelector('.plan-editor,.plan-manager'))return;

    [...box.querySelectorAll(':scope > .ex')].forEach(card=>{
      [...card.querySelectorAll('.set')].forEach(row=>{
        [...row.querySelectorAll('input')].forEach(input=>{
          const aria=input.getAttribute('aria-label')||'';
          if(/^Carga série/i.test(aria)||input.placeholder==='kg')enhanceInput(input,'weight',card);
          else if(/^Repetições série/i.test(aria)||input.placeholder==='reps')enhanceInput(input,'reps',card);
        });
      });
    });
  }

  const base=window.renderList;
  if(typeof base==='function')window.renderList=function(){
    const r=base.apply(this,arguments);
    requestAnimationFrame(decorate);
    return r;
  };
  requestAnimationFrame(decorate);

  const style=document.createElement('style');
  style.textContent=`
    .series-value-picker{display:grid;grid-template-columns:minmax(0,1fr) 42px;align-items:stretch;min-width:0}
    .series-value-picker>input{width:100%;min-width:0;border-radius:8px 0 0 8px!important}
    .series-native-select{width:42px;min-width:42px;height:100%;margin:0;border:1.5px solid var(--line);border-left:0;border-radius:0 8px 8px 0;background:var(--card);color:var(--acc);font:700 13px Barlow,system-ui,sans-serif;padding:0 2px;-webkit-appearance:menulist;appearance:auto}
    input.rep-in-ideal{border-color:var(--acc)!important;background:var(--ok)!important}
    input.rep-below-ideal,input.rep-above-ideal{border-color:var(--hot)!important;background:color-mix(in srgb,var(--hot) 7%,var(--bg))!important}
    .set.has-rir .series-value-picker{min-width:0}
    @media(max-width:390px){
      .series-value-picker{grid-template-columns:minmax(0,1fr) 36px}
      .series-native-select{width:36px;min-width:36px;font-size:12px}
    }
  `;
  document.head.appendChild(style);
})();
