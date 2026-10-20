// Exercise catalog integration for the plan editor.
// Safe by design: it does not migrate or delete existing logs. Catalog IDs are only applied when the user saves a plan.
(function(){
  let items=[];
  const byId=new Map(),byName=new Map();
  const nativeFetch=window.fetch.bind(window);
  const norm=s=>String(s||'').trim().toLocaleLowerCase('pt-BR');
  const activeProfile=()=>window.MeuTreinoProfiles?.current?.()||'reginaldo';

  const ready=nativeFetch('exercise_catalog.json')
    .then(r=>r.ok?r.json():null)
    .then(data=>{
      items=Array.isArray(data?.exercises)?data.exercises:[];
      items.forEach(x=>{if(x?.id)byId.set(x.id,x);if(x?.name)byName.set(norm(x.name),x)});
      requestAnimationFrame(()=>{enhanceEditor();enhanceWorkoutTypes();setTimeout(ensureCatalogImages,0)});
      return items;
    })
    .catch(()=>[]);

  window.ExerciseCatalog={
    ready,
    all:()=>items.slice(),
    byId:id=>byId.get(id)||null,
    byName:name=>byName.get(norm(name))||null
  };

  // Merge male catalog image paths into the current local-image map.
  // Sandra keeps only the female image mappings already available; the rest will be added later in img_women/.
  window.fetch=async function(input,init){
    const response=await nativeFetch(input,init);
    try{
      const raw=typeof input==='string'?input:(input&&input.url)||'';
      const url=new URL(raw,location.href);
      if(url.pathname.endsWith('/exercise-images.json')){
        await ready;
        const data=await response.clone().json();
        if(activeProfile()!=='sandra')items.forEach(x=>{if(x?.name&&x?.file&&!data[x.name])data[x.name]={file:x.file}});
        return new Response(JSON.stringify(data),{
          status:response.status,
          statusText:response.statusText,
          headers:{'Content-Type':'application/json'}
        });
      }
    }catch(e){}
    return response;
  };

  function fire(el){el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
  function optionGroups(select,currentName){
    select.innerHTML='';
    const empty=document.createElement('option');empty.value='';empty.textContent='Escolher no catálogo';select.appendChild(empty);
    const groups=new Map();
    items.forEach(x=>{const g=x.group||'Outros';if(!groups.has(g))groups.set(g,[]);groups.get(g).push(x)});
    groups.forEach((arr,g)=>{
      const og=document.createElement('optgroup');og.label=g;
      arr.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).forEach(x=>{const o=document.createElement('option');o.value=x.id;o.textContent=x.name+(x.equipment?' · '+x.equipment:'');og.appendChild(o)});
      select.appendChild(og);
    });
    const found=byName.get(norm(currentName));if(found)select.value=found.id;
  }

  function editorRows(){
    const out={};
    document.querySelectorAll('#list .edit-day').forEach(dayCard=>{
      const m=dayCard.querySelector('h3')?.textContent?.match(/Treino\s+(.+)/i);if(!m)return;
      out[m[1].trim()]=[...dayCard.querySelectorAll('.edit-exercise')];
    });
    return out;
  }

  function chosenForRow(row){
    const select=row.querySelector('.catalog-select');
    if(select?.value&&byId.has(select.value))return byId.get(select.value);
    const name=row.querySelector('input[placeholder="Exercício"]')?.value;
    return byName.get(norm(name))||null;
  }

  function captureSelection(){
    const result={};
    for(const [d,rows] of Object.entries(editorRows())){
      result[d]=rows.map(chosenForRow);
      const ids=result[d].filter(Boolean).map(x=>x.id),dupes=ids.filter((id,i)=>ids.indexOf(id)!==i);
      if(dupes.length){toast('O mesmo exercício aparece duas vezes no treino '+d);return null}
    }
    return result;
  }

  function patchSavedPlan(selection){
    const plan=db.training?.current;if(!plan?.days)return;
    let changed=false;
    for(const [d,arr] of Object.entries(selection||{})){
      const ex=plan.days[d]?.ex;if(!Array.isArray(ex))continue;
      arr.forEach((item,i)=>{
        const x=ex[i];if(!x||!item)return;
        if(x.id!==item.id||x.name!==item.name||x.type!==item.type||x.catalogId!==item.id){x.id=item.id;x.name=item.name;x.type=item.type;x.catalogId=item.id;changed=true}
        if(PLAN[d]?.ex?.[i]){PLAN[d].ex[i][0]=item.name;PLAN[d].ex[i][3]=item.id}
      });
    }
    if(changed){save();render()}
  }

  function enhanceEditor(){
    const editor=document.querySelector('#list .plan-editor');if(!editor||!items.length)return;
    const rows=editorRows();
    Object.values(rows).flat().forEach(row=>{
      if(row.querySelector('.catalog-picker'))return;
      const inputs=[...row.querySelectorAll('input')],name=inputs.find(x=>x.placeholder==='Exercício')||inputs[0],target=inputs.find(x=>x.placeholder==='4×8-12')||inputs[1],sets=inputs.find(x=>x.type==='number');
      if(!name)return;
      const wrap=document.createElement('label');wrap.className='catalog-picker';const cap=document.createElement('span');cap.textContent='Exercício';const select=document.createElement('select');select.className='catalog-select';optionGroups(select,name.value);wrap.append(cap,select);row.insertBefore(wrap,row.firstChild);
      select.onchange=()=>{
        const item=byId.get(select.value);if(!item)return;
        name.value=item.name;fire(name);
        if(target){target.value=item.target||target.value;fire(target)}
        if(sets){sets.value=Number(item.sets)||sets.value;fire(sets)}
        row.dataset.catalogId=item.id;
      };
      name.addEventListener('input',()=>{const item=byName.get(norm(name.value));select.value=item?.id||'';row.dataset.catalogId=item?.id||''});
    });

    const saveBtn=document.querySelector('#list .editor-actions .primary');
    if(saveBtn&&!saveBtn.dataset.catalogWrapped){
      saveBtn.dataset.catalogWrapped='1';
      const original=saveBtn.onclick;
      saveBtn.onclick=function(ev){
        const selection=captureSelection();if(!selection)return;
        original?.call(this,ev);
        // Validation/cancel leaves the editor on screen; in that case do not touch stored data.
        if(document.body.contains(saveBtn))return;
        patchSavedPlan(selection);
      };
    }
  }

  // New catalog exercises can be reps-only or timed. Keep the current data model and only simplify the entry row.
  function enhanceWorkoutTypes(){
    const box=document.getElementById('list');if(!box||document.querySelector('#list .plan-editor'))return;
    [...box.querySelectorAll(':scope > .ex')].forEach(card=>{
      const title=card.querySelector('.ex-h h3')?.textContent,item=byName.get(norm(title));
      if(!item||item.type==='weight_reps')return;
      card.classList.add('exercise-'+item.type);
      [...card.querySelectorAll('.set')].forEach((row,k)=>{
        const inputs=[...row.querySelectorAll('input')];
        if(inputs.length>=2)inputs[0].remove();
        const valueInput=[...row.querySelectorAll('input')][0];if(!valueInput)return;
        row.classList.add('simple-set');
        valueInput.placeholder=item.type==='time'?'segundos':'reps';
        valueInput.setAttribute('aria-label',item.type==='time'?'Duração da série '+(k+1)+' em segundos':'Repetições da série '+(k+1));
      });
    });
  }

  // Some new names do not yet have a muscle-profile rule in muscle-map.js. Show their local male image anyway.
  function ensureCatalogImages(){
    if(activeProfile()==='sandra')return;
    const box=document.getElementById('list');if(!box||document.querySelector('#list .plan-editor'))return;
    [...box.querySelectorAll(':scope > .ex')].forEach(card=>{
      if(card.querySelector('.muscle-map,.catalog-photo-fallback'))return;
      const title=card.querySelector('.ex-h h3')?.textContent,item=byName.get(norm(title));if(!item?.file)return;
      const wrap=document.createElement('div');wrap.className='catalog-photo-fallback';const img=document.createElement('img');img.src=item.file;img.alt='Demonstração de '+item.name;img.loading='lazy';img.decoding='async';img.onerror=()=>wrap.remove();wrap.appendChild(img);
      const how=card.querySelector('.how'),hint=card.querySelector('.hint');if(how)card.insertBefore(wrap,how);else if(hint)hint.insertAdjacentElement('afterend',wrap);else card.appendChild(wrap);
    });
  }

  const base=window.renderList;
  if(typeof base==='function')window.renderList=function(){
    const r=base.apply(this,arguments);
    requestAnimationFrame(()=>{enhanceEditor();enhanceWorkoutTypes();setTimeout(ensureCatalogImages,0)});
    return r;
  };

  const style=document.createElement('style');
  style.textContent='.edit-exercise .catalog-picker{grid-column:1/-1;display:grid;gap:4px}.catalog-picker>span{font-size:12px;color:var(--mute);font-weight:600}.catalog-select{width:100%;min-width:0;padding:9px;border:1.5px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink);font:600 15px Barlow,system-ui,sans-serif}.catalog-select:focus-visible{outline:3px solid var(--hot);outline-offset:2px}.catalog-photo-fallback{width:100%;overflow:hidden;border:1px solid var(--line);border-radius:12px;background:var(--bg);margin:8px 0 10px}.catalog-photo-fallback img{display:block;width:100%;height:auto;object-fit:cover}.set.simple-set{grid-template-columns:24px 1fr 44px}';
  document.head.appendChild(style);
})();
