// Smart macro-aware food suggestions for the Comida tab.
(function(){
  const FOOD_UI_KEY='treino_food_ui_v1';
  const SUGGEST_KEY='treino_food_suggestions_v1';
  let prefs={fatMin:55,fatTarget:70,maxSuggestions:3};
  try{prefs=Object.assign(prefs,JSON.parse(localStorage.getItem(SUGGEST_KEY)||'{}')||{})}catch(e){}

  const fmt=n=>Number(n||0).toFixed(1).replace('.0','');
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function foodUiState(){try{return JSON.parse(localStorage.getItem(FOOD_UI_KEY)||'{}')||{}}catch(e){return{}}}
  function inferBase(name){
    let m=String(name).match(/(\d+(?:[.,]\d+)?)\s*ml\b/i);if(m)return{baseQty:num(m[1])||1,unit:'ml'};
    m=String(name).match(/(\d+(?:[.,]\d+)?)\s*g\b/i);if(m)return{baseQty:num(m[1])||1,unit:'g'};
    if(/fatia/i.test(name))return{baseQty:1,unit:'fatia'};
    if(/colher/i.test(name))return{baseQty:1,unit:'colher'};
    if(/dose/i.test(name))return{baseQty:1,unit:'dose'};
    if(/ovo|banana|maçã|pera|laranja|pudim/i.test(name))return{baseQty:1,unit:'unidade'};
    return{baseQty:1,unit:'porção'};
  }
  function builtins(){
    if(typeof FOODS==='undefined')return[];
    return FOODS.map(f=>{const b=inferBase(f[0]);return{id:'builtin:'+encodeURIComponent(f[0]),name:f[0],baseQty:b.baseQty,unit:b.unit,k:Number(f[1])||0,p:Number(f[2])||0,c:Number(f[3])||0,g:Number(f[4])||0,source:'builtin'}})
  }
  function scans(){
    let cache={};try{if(typeof getProductCache==='function')cache=getProductCache()||{}}catch(e){}
    return Object.values(cache).filter(x=>x&&x.code).map(x=>({id:'scan:'+x.code,name:x.name||('Produto '+x.code),baseQty:100,unit:'g',k:Number(x.k)||0,p:Number(x.p)||0,c:Number(x.c)||0,g:Number(x.g)||0,source:'scan'}))
  }
  function foods(){
    const st=foodUiState(),over=st.overrides||{},custom=Array.isArray(st.customFoods)?st.customFoods:[],seen=new Set(),out=[];
    for(const raw of [...builtins(),...scans(),...custom]){if(!raw?.id||seen.has(raw.id))continue;seen.add(raw.id);out.push(Object.assign({},raw,over[raw.id]||{}))}
    return out.filter(f=>f.k>0&&f.baseQty>0)
  }
  function preferredRank(f){const st=foodUiState(),fav=new Set(st.favorites||[]),usage=st.usage||{};if(fav.has(f.id))return 0;if(usage[f.id])return 1;return 2}
  function todayTotals(){const key=dayKey(Date.now()),list=(db.meals||[]).filter(m=>dayKey(m.t)===key),T=sumOf(list);return{k:Number(T.k)||0,p:Number(T.p)||0,c:Number(T.c)||0,g:Number(T.g)||0}}
  function remaining(){const T=todayTotals();return{T,k:Math.max(0,GOAL.k-T.k),p:Math.max(0,GOAL.p-T.p),c:Math.max(0,GOAL.c-T.c),g:Math.max(0,prefs.fatTarget-T.g),fatMinGap:Math.max(0,prefs.fatMin-T.g)}}
  function nutrientFor(f,qty){const mult=qty/f.baseQty;return{k:f.k*mult,p:f.p*mult,c:f.c*mult,g:f.g*mult}}
  function displayQty(f,qty){const q=f.unit==='g'||f.unit==='ml'?Math.round(qty):Math.round(qty*4)/4;return fmt(q)+' '+f.unit}
  function candidateQty(f,rem){
    let q=f.baseQty;
    if(f.g>0&&rem.g>0)q=f.baseQty*(rem.g/f.g);else if(f.c>0&&rem.c>0)q=f.baseQty*(rem.c/f.c);else if(f.p>0&&rem.p>0)q=f.baseQty*(rem.p/f.p);
    const maxByCalories=f.k>0&&rem.k>0?f.baseQty*(rem.k/f.k):q;q=Math.min(q,maxByCalories||q);
    const lo=(f.unit==='g'||f.unit==='ml')?10:0.25,hi=(f.unit==='g'||f.unit==='ml')?250:3;return clamp(q,lo,hi)
  }
  function scoreFood(f,rem){
    const q=candidateQty(f,rem),n=nutrientFor(f,q);if(n.k>rem.k+80)return null;
    const fatNeed=rem.g>0,protNeed=rem.p>0,carbNeed=rem.c>0;
    const fatFit=fatNeed?Math.min(n.g,rem.g)/Math.max(1,rem.g):0,protFit=protNeed?Math.min(n.p,rem.p)/Math.max(1,rem.p):0,carbFit=carbNeed?Math.min(n.c,rem.c)/Math.max(1,rem.c):0,calFit=rem.k?Math.min(n.k,rem.k)/rem.k:0;
    let score=fatFit*4+protFit*2+carbFit*1.5+calFit*.5;if(!protNeed&&n.p>15)score-=1.3;if(!carbNeed&&n.c>20)score-=1;if(fatNeed&&f.g>0)score+=Math.min(1,f.g/10);score-=preferredRank(f)*.12;
    return{f,q,n,score}
  }
  function makeCombo(seed,all,rem,maxItems=3){
    const chosen=[],used=new Set();let left=Object.assign({},rem);
    if(seed){chosen.push(seed);used.add(seed.f.id);left.k=Math.max(0,left.k-seed.n.k);left.p=Math.max(0,left.p-seed.n.p);left.c=Math.max(0,left.c-seed.n.c);left.g=Math.max(0,left.g-seed.n.g)}
    while(chosen.length<maxItems&&left.k>60){let best=null;for(const f of all){if(used.has(f.id))continue;const c=scoreFood(f,left);if(!c)continue;if(!best||c.score>best.score)best=c}if(!best||best.score<.15)break;chosen.push(best);used.add(best.f.id);left.k=Math.max(0,left.k-best.n.k);left.p=Math.max(0,left.p-best.n.p);left.c=Math.max(0,left.c-best.n.c);left.g=Math.max(0,left.g-best.n.g)}
    if(!chosen.length)return null;const total=chosen.reduce((a,x)=>({k:a.k+x.n.k,p:a.p+x.n.p,c:a.c+x.n.c,g:a.g+x.n.g}),{k:0,p:0,c:0,g:0});const fit=(Math.abs(rem.g-total.g)*3)+(Math.abs(rem.p-total.p)*1.2)+(Math.abs(rem.c-total.c)*.7)+(Math.abs(rem.k-total.k)*.03);return{items:chosen,total,fit}
  }
  function suggestions(){
    const rem=remaining(),all=foods();if(!all.length)return{rem,list:[]};const ranked=all.map(f=>scoreFood(f,rem)).filter(Boolean).sort((a,b)=>b.score-a.score),combos=[];
    for(const seed of ranked.slice(0,8)){const c=makeCombo(seed,all,rem,3);if(c)combos.push(c)}
    const seen=new Set(),out=[];combos.sort((a,b)=>a.fit-b.fit).forEach(c=>{const key=c.items.map(x=>x.f.id).sort().join('|');if(seen.has(key))return;seen.add(key);out.push(c)});return{rem,list:out.slice(0,prefs.maxSuggestions)}
  }
  function mealSelect(){const s=document.createElement('select');(typeof MEALS!=='undefined'?MEALS:['Café da manhã','Almoço','Lanche da tarde','Jantar','Pré-treino','Pós-treino']).forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=m;s.appendChild(o)});s.value=window.curMeal||'Jantar';return s}
  function addCombo(combo,meal){combo.items.forEach(x=>{const q=x.q,T=x.n,name=x.f.name+' ('+displayQty(x.f,q)+')';db.meals.push({t:Date.now(),m:meal,n:name,k:r1(T.k),p:r1(T.p),c:r1(T.c),g:r1(T.g),foodId:x.f.id,amount:q,unit:x.f.unit})});save();toast('Sugestão adicionada em '+meal);renderComida()}
  function priorityText(rem){const a=[];if(rem.g>0)a.push('gordura');if(rem.p>0)a.push('proteína');if(rem.c>0)a.push('carboidrato');return a.length?'Prioridade: '+a.join(' + '):'Macros principais já atingidos'}
  function renderCard(){
    const v=$('vComida');if(!v)return;v.querySelector('.smart-food-card')?.remove();const quick=[...v.querySelectorAll('.ex')].find(x=>x.querySelector('h3')?.textContent.trim()==='Adicionar rápido');if(!quick)return;
    const {rem,list}=suggestions(),c=document.createElement('div');c.className='ex smart-food-card';const hd=document.createElement('div');hd.className='ex-h';const h=document.createElement('h3');h.textContent='Completar seus macros';const badge=document.createElement('span');badge.className='tgt';badge.textContent=priorityText(rem);hd.append(h,badge);c.appendChild(hd);
    const summary=document.createElement('div');summary.className='macro-remaining';summary.innerHTML='<span><b>'+Math.round(rem.k)+'</b> kcal</span><span><b>'+Math.round(rem.p)+'</b> g P</span><span><b>'+Math.round(rem.c)+'</b> g C</span><span><b>'+Math.round(rem.g)+'</b> g G</span>';c.appendChild(summary);
    const note=document.createElement('p');note.className='hint';note.textContent=rem.fatMinGap>0?'A gordura está abaixo da faixa mínima de '+prefs.fatMin+' g. As sugestões priorizam fontes de gordura sem forçar proteína extra.':'Você já está dentro da faixa mínima de gordura. As sugestões tentam equilibrar o restante sem precisar fechar cada macro exatamente.';c.appendChild(note);
    if(!list.length){const e=document.createElement('div');e.className='hint';e.textContent='Não encontrei uma combinação boa com sua biblioteca atual. Adicione ou favorite alimentos para melhorar as sugestões.';c.appendChild(e)}
    list.forEach((s,i)=>{const row=document.createElement('div');row.className='smart-suggestion';const title=document.createElement('div');title.className='smart-suggestion-title';title.innerHTML='<b>'+(i===0?'Melhor encaixe':i===1?'Opção menor':'Alternativa')+'</b><span>'+Math.round(s.total.k)+' kcal · P '+Math.round(s.total.p)+' · C '+Math.round(s.total.c)+' · G '+Math.round(s.total.g)+'</span>';row.appendChild(title);const ul=document.createElement('div');ul.className='smart-suggestion-items';s.items.forEach(x=>{const d=document.createElement('span');d.textContent=displayQty(x.f,x.q)+' · '+x.f.name;ul.appendChild(d)});row.appendChild(ul);const ac=document.createElement('div');ac.className='smart-suggestion-actions';const meal=mealSelect(),add=document.createElement('button');add.className='primary compact-primary';add.textContent='Adicionar';add.onclick=()=>addCombo(s,meal.value);ac.append(meal,add);row.appendChild(ac);c.appendChild(row)});
    const foot=document.createElement('div');foot.className='smart-food-foot';const pref=document.createElement('button');pref.className='ghost small';pref.textContent='Ajustar faixa de gordura';pref.onclick=()=>{const min=prompt('Mínimo diário de gordura (g)',prefs.fatMin);if(min===null)return;const target=prompt('Meta superior de gordura (g)',prefs.fatTarget);if(target===null)return;const a=num(min),b=num(target);if(a===null||b===null||a<30||b<a||b>150){toast('Confira os valores');return}prefs.fatMin=a;prefs.fatTarget=b;localStorage.setItem(SUGGEST_KEY,JSON.stringify(prefs));renderComida()};foot.appendChild(pref);c.appendChild(foot);quick.insertAdjacentElement('beforebegin',c)
  }
  const base=window.renderComida;if(typeof base==='function')window.renderComida=function(){base.apply(this,arguments);requestAnimationFrame(renderCard)};
  const style=document.createElement('style');style.textContent='.smart-food-card{overflow:hidden}.macro-remaining{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0 10px}.macro-remaining span{background:var(--bg);border-radius:9px;padding:8px 4px;text-align:center;color:var(--mute);font-size:11px}.macro-remaining b{display:block;color:var(--ink);font-size:17px}.smart-suggestion{border-top:1px solid var(--line);padding:11px 0}.smart-suggestion-title{display:flex;justify-content:space-between;gap:8px;align-items:baseline}.smart-suggestion-title b{font-size:15px}.smart-suggestion-title span{font-size:11px;color:var(--mute);text-align:right}.smart-suggestion-items{display:grid;gap:4px;margin:7px 0;color:var(--ink);font-size:13px}.smart-suggestion-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px}.smart-suggestion-actions select{min-width:0;width:100%;padding:9px;border:1.5px solid var(--line);border-radius:8px;background:var(--bg);font:600 13px Barlow,system-ui,sans-serif;color:var(--ink)}.smart-food-foot{display:flex;justify-content:flex-end;margin-top:8px}@media(max-width:380px){.macro-remaining{grid-template-columns:repeat(2,1fr)}.smart-suggestion-title{display:block}.smart-suggestion-title span{display:block;margin-top:2px;text-align:left}}';document.head.appendChild(style);
})();
