// Replaces macro-only suggestions with meal-aware, realistic combinations.
(function(){
  const FOOD_UI_KEY='treino_food_ui_v1';
  const SUGGEST_KEY='treino_food_suggestions_v1';
  let selectedMeal=null;

  const MEAL_LIMITS={
    'Café da manhã':{k:500,p:35,c:65,g:25,kind:'breakfast'},
    'Lanche da manhã':{k:300,p:25,c:40,g:20,kind:'snack'},
    'Almoço':{k:600,p:45,c:75,g:30,kind:'main'},
    'Lanche da tarde':{k:350,p:25,c:45,g:25,kind:'snack'},
    'Pré-treino':{k:450,p:30,c:65,g:15,kind:'pre'},
    'Jantar':{k:600,p:45,c:70,g:30,kind:'main'}
  };
  const ALLOWED={
    breakfast:new Set(['egg','bread','dairy','fruit','cereal','oats','nuts','nutbutter','honey','whey','dessert','other']),
    snack:new Set(['bread','dairy','fruit','cereal','oats','nuts','nutbutter','honey','whey','dessert','other']),
    pre:new Set(['bread','dairy','fruit','cereal','oats','nutbutter','honey','whey','other']),
    main:new Set(['meat','egg','rice','veg','oil','bread','other'])
  };

  const fmt=n=>Number(n||0).toFixed(1).replace('.0','');
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  function foodState(){try{return JSON.parse(localStorage.getItem(FOOD_UI_KEY)||'{}')||{}}catch(e){return{}}}
  function prefs(){try{return Object.assign({fatMin:55,fatTarget:70},JSON.parse(localStorage.getItem(SUGGEST_KEY)||'{}')||{})}catch(e){return{fatMin:55,fatTarget:70}}}
  function inferMeal(){const h=new Date().getHours();if(h<9)return'Café da manhã';if(h<11)return'Lanche da manhã';if(h<14)return'Almoço';if(h<18)return'Lanche da tarde';return'Jantar'}
  function currentMeal(){return selectedMeal||inferMeal()}
  function inferBase(name){
    let m=String(name).match(/(\d+(?:[.,]\d+)?)\s*ml\b/i);if(m)return{baseQty:num(m[1])||1,unit:'ml'};
    m=String(name).match(/(\d+(?:[.,]\d+)?)\s*g\b/i);if(m)return{baseQty:num(m[1])||1,unit:'g'};
    if(/fatia/i.test(name))return{baseQty:1,unit:'fatia'};if(/colher/i.test(name))return{baseQty:1,unit:'colher'};if(/dose/i.test(name))return{baseQty:1,unit:'dose'};
    if(/ovo|banana|maçã|pera|laranja|pudim/i.test(name))return{baseQty:1,unit:'unidade'};return{baseQty:1,unit:'porção'}
  }
  function category(name){
    const n=norm(name);
    if(/azeite|olive oil|oleo/.test(n))return'oil';
    if(/castanha|amendoa|noz|nuts|almond|walnut/.test(n)&&!/pasta|butter/.test(n))return'nuts';
    if(/pasta de amendoim|peanut butter|almond butter/.test(n))return'nutbutter';
    if(/mel\b|honey/.test(n))return'honey';
    if(/aveia|oat/.test(n))return'oats';
    if(/cereal|flakes|granola/.test(n))return'cereal';
    if(/banana|maca|pera|laranja|morango|uva|manga|fruit/.test(n))return'fruit';
    if(/leite|iogurte|yog|milk|pudim|creme dessert/.test(n))return'dairy';
    if(/whey|protein shake|milkshake/.test(n))return'whey';
    if(/pao|bread|torrada|toast/.test(n))return'bread';
    if(/arroz|rice|batata|potato|massa|pasta\b/.test(n))return'rice';
    if(/legume|veget|salad|brocol|cenoura/.test(n))return'veg';
    if(/frango|chicken|carne|beef|porco|pork|peixe|fish|salmao|salmon|atum|tuna/.test(n))return'meat';
    if(/ovo|egg/.test(n))return'egg';
    if(/sobremesa|dessert|chocolate|biscoito|cookie/.test(n))return'dessert';
    return'other'
  }
  function builtins(){return(typeof FOODS==='undefined'?[]:FOODS).map(f=>{const b=inferBase(f[0]);return{id:'builtin:'+encodeURIComponent(f[0]),name:f[0],baseQty:b.baseQty,unit:b.unit,k:+f[1]||0,p:+f[2]||0,c:+f[3]||0,g:+f[4]||0}})}
  function scanned(){let cache={};try{if(typeof getProductCache==='function')cache=getProductCache()||{}}catch(e){}return Object.values(cache).filter(x=>x&&x.code).map(x=>({id:'scan:'+x.code,name:x.name||('Produto '+x.code),baseQty:100,unit:'g',k:+x.k||0,p:+x.p||0,c:+x.c||0,g:+x.g||0}))}
  function allFoods(){
    const st=foodState(),over=st.overrides||{},custom=Array.isArray(st.customFoods)?st.customFoods:[],seen=new Set(),out=[];
    for(const raw of [...builtins(),...scanned(),...custom]){if(!raw?.id||seen.has(raw.id))continue;seen.add(raw.id);const f=Object.assign({},raw,over[raw.id]||{});f.cat=category(f.name);if(f.k>0&&f.baseQty>0)out.push(f)}return out
  }
  function rank(f){const st=foodState(),fav=new Set(st.favorites||[]),u=st.usage||{};return fav.has(f.id)?0:u[f.id]?1:2}
  function totalsToday(){const k=dayKey(Date.now()),T=sumOf((db.meals||[]).filter(m=>dayKey(m.t)===k));return{k:+T.k||0,p:+T.p||0,c:+T.c||0,g:+T.g||0}}
  function remaining(){const T=totalsToday(),pf=prefs();return{T,k:Math.max(0,GOAL.k-T.k),p:Math.max(0,GOAL.p-T.p),c:Math.max(0,GOAL.c-T.c),g:Math.max(0,pf.fatTarget-T.g),gMin:Math.max(0,pf.fatMin-T.g),fatMin:pf.fatMin,fatTarget:pf.fatTarget}}
  function mealTarget(rem,meal){const lim=MEAL_LIMITS[meal]||MEAL_LIMITS['Jantar'];return{k:Math.min(rem.k,lim.k),p:Math.min(rem.p,lim.p),c:Math.min(rem.c,lim.c),g:Math.min(rem.gMin>0?rem.gMin:Math.min(rem.g,8),lim.g),kind:lim.kind}}
  function portionCap(f){const c=f.cat;if(c==='oil')return 1;if(c==='nuts')return f.unit==='g'?30:1;if(c==='nutbutter')return 2;if(c==='honey')return 1;if(c==='fruit')return f.unit==='g'?180:1;if(c==='cereal'||c==='oats')return f.unit==='g'?60:2;if(c==='bread')return 3;if(c==='egg')return 3;if(c==='rice')return f.unit==='g'?200:2;if(c==='veg')return f.unit==='g'?250:2.5;if(c==='meat')return f.unit==='g'?200:2;if(c==='dairy')return f.unit==='g'||f.unit==='ml'?250:2;if(c==='whey')return 1;return f.unit==='g'||f.unit==='ml'?200:2}
  function nutrients(f,q){const m=q/f.baseQty;return{k:f.k*m,p:f.p*m,c:f.c*m,g:f.g*m}}
  function quantity(f,t){
    let q=f.baseQty,needs=[[t.g,f.g,4],[t.p,f.p,2],[t.c,f.c,1.5]].filter(x=>x[0]>0&&x[1]>0).sort((a,b)=>b[2]-a[2]);
    if(needs.length)q=f.baseQty*(needs[0][0]/needs[0][1]);if(t.k>0&&f.k>0)q=Math.min(q,f.baseQty*(t.k/f.k));
    const lo=f.unit==='g'||f.unit==='ml'?10:.25,hi=portionCap(f);return clamp(q,lo,hi)
  }
  function pairOK(a,b){
    if(a===b)return true;
    if(a==='oil'||b==='oil'){const x=a==='oil'?b:a;return['meat','egg','rice','veg','bread','other'].includes(x)}
    const savory=new Set(['meat','rice','veg']),sweet=new Set(['cereal','oats','fruit','dairy','whey','honey','nutbutter','nuts','dessert']);
    if((savory.has(a)&&sweet.has(b))||(savory.has(b)&&sweet.has(a)))return false;
    if(a==='honey'&&['egg'].includes(b)||b==='honey'&&['egg'].includes(a))return false;
    return true
  }
  function score(f,t,meal){
    const lim=MEAL_LIMITS[meal]||MEAL_LIMITS['Jantar'];if(!ALLOWED[lim.kind].has(f.cat))return null;
    const q=quantity(f,t),n=nutrients(f,q);if(n.k>t.k+80&&t.k>0)return null;
    let s=0;if(t.g>0)s+=4*Math.min(n.g,t.g)/Math.max(1,t.g);if(t.p>0)s+=2*Math.min(n.p,t.p)/Math.max(1,t.p);if(t.c>0)s+=1.5*Math.min(n.c,t.c)/Math.max(1,t.c);if(t.k>0)s+=.5*Math.min(n.k,t.k)/t.k;
    if(t.p===0&&n.p>15)s-=1.5;if(t.c===0&&n.c>20)s-=1;if(f.cat==='oil'&&q>1)s-=4;s-=rank(f)*.12;return{f,q,n,score:s}
  }
  function subtract(t,n){return{k:Math.max(0,t.k-n.k),p:Math.max(0,t.p-n.p),c:Math.max(0,t.c-n.c),g:Math.max(0,t.g-n.g),kind:t.kind}}
  function combo(seed,foods,t,meal){
    const chosen=[],used=new Set();let left=Object.assign({},t);if(seed){chosen.push(seed);used.add(seed.f.id);left=subtract(left,seed.n)}
    while(chosen.length<3&&left.k>50){let best=null;for(const f of foods){if(used.has(f.id))continue;if(chosen.some(x=>!pairOK(x.f.cat,f.cat)))continue;const c=score(f,left,meal);if(c&&(!best||c.score>best.score))best=c}if(!best||best.score<.2)break;chosen.push(best);used.add(best.f.id);left=subtract(left,best.n)}
    if(!chosen.length)return null;const total=chosen.reduce((a,x)=>({k:a.k+x.n.k,p:a.p+x.n.p,c:a.c+x.n.c,g:a.g+x.n.g}),{k:0,p:0,c:0,g:0});
    const fit=Math.abs(t.g-total.g)*3+Math.abs(t.p-total.p)*1.1+Math.abs(t.c-total.c)*.7+Math.abs(t.k-total.k)*.025;return{items:chosen,total,fit}
  }
  function suggestions(meal){
    const rem=remaining(),t=mealTarget(rem,meal),foods=allFoods(),ranked=foods.map(f=>score(f,t,meal)).filter(Boolean).sort((a,b)=>b.score-a.score),arr=[];
    for(const seed of ranked.slice(0,10)){const c=combo(seed,foods,t,meal);if(c)arr.push(c)}const seen=new Set(),out=[];arr.sort((a,b)=>a.fit-b.fit).forEach(c=>{const key=c.items.map(x=>x.f.id).sort().join('|');if(!seen.has(key)){seen.add(key);out.push(c)}});return{rem,target:t,list:out.slice(0,3)}
  }
  function displayQty(f,q){const v=f.unit==='g'||f.unit==='ml'?Math.round(q):Math.round(q*4)/4;return fmt(v)+' '+f.unit}
  function addSuggestion(s,meal){s.items.forEach(x=>{const n=x.n;db.meals.push({t:Date.now(),m:meal,n:x.f.name+' ('+displayQty(x.f,x.q)+')',k:r1(n.k),p:r1(n.p),c:r1(n.c),g:r1(n.g),foodId:x.f.id,amount:x.q,unit:x.f.unit})});save();toast('Sugestão adicionada em '+meal);renderComida()}
  function mealSelect(value){const s=document.createElement('select');(typeof MEALS!=='undefined'?MEALS:Object.keys(MEAL_LIMITS)).forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=m;s.appendChild(o)});s.value=value;return s}
  function render(){
    const v=$('vComida');if(!v)return;v.querySelector('.smart-food-card')?.remove();v.querySelector('.meal-aware-card')?.remove();const quick=[...v.querySelectorAll('.ex')].find(x=>x.querySelector('h3')?.textContent.trim()==='Adicionar rápido');if(!quick)return;
    const meal=currentMeal(),data=suggestions(meal),c=document.createElement('div');c.className='ex meal-aware-card';const hd=document.createElement('div');hd.className='ex-h';const h=document.createElement('h3');h.textContent='Completar seus macros';const ms=mealSelect(meal);ms.className='meal-context';ms.onchange=()=>{selectedMeal=ms.value;render()};hd.append(h,ms);c.appendChild(hd);
    const r=data.rem,sum=document.createElement('div');sum.className='macro-remaining';sum.innerHTML='<span><b>'+Math.round(r.k)+'</b> kcal</span><span><b>'+Math.round(r.p)+'</b> g P</span><span><b>'+Math.round(r.c)+'</b> g C</span><span><b>'+Math.round(r.g)+'</b> g G</span>';c.appendChild(sum);
    const note=document.createElement('p');note.className='hint';note.textContent=r.gMin>0?'Faltam '+Math.round(r.gMin)+' g para a faixa mínima de '+Math.round(r.fatMin)+' g. O app sugere uma refeição normal e compatível, sem tentar colocar os '+Math.round(r.g)+' g restantes de gordura de uma vez.':'Você já atingiu a faixa mínima de gordura. As sugestões priorizam uma refeição coerente com o horário e com os macros restantes.';c.appendChild(note);
    if(!data.list.length){c.appendChild(Object.assign(document.createElement('div'),{className:'hint',textContent:'Não encontrei uma combinação coerente com os alimentos cadastrados para esta refeição. Tente outra refeição ou adicione mais alimentos à biblioteca.'}))}
    data.list.forEach((s,i)=>{const row=document.createElement('div');row.className='smart-suggestion';const title=document.createElement('div');title.className='smart-suggestion-title';title.innerHTML='<b>'+(i===0?'Melhor encaixe':i===1?'Opção prática':'Alternativa')+'</b><span>'+Math.round(s.total.k)+' kcal · P '+Math.round(s.total.p)+' · C '+Math.round(s.total.c)+' · G '+Math.round(s.total.g)+'</span>';row.appendChild(title);const items=document.createElement('div');items.className='smart-suggestion-items';s.items.forEach(x=>{const d=document.createElement('span');d.textContent=displayQty(x.f,x.q)+' · '+x.f.name;items.appendChild(d)});row.appendChild(items);const add=document.createElement('button');add.className='primary compact-primary meal-add';add.textContent='Adicionar em '+meal;add.onclick=()=>addSuggestion(s,meal);row.appendChild(add);c.appendChild(row)});
    const hint=document.createElement('div');hint.className='meal-aware-note';hint.textContent='As combinações respeitam o tipo de refeição: por exemplo, azeite não é combinado com cereal ou banana, e a porção de azeite é limitada a 1 colher por sugestão.';c.appendChild(hint);quick.insertAdjacentElement('beforebegin',c)
  }
  const base=window.renderComida;if(typeof base==='function')window.renderComida=function(){base.apply(this,arguments);requestAnimationFrame(render)};
  const style=document.createElement('style');style.textContent='.meal-context{max-width:190px;padding:8px;border:1.5px solid var(--line);border-radius:8px;background:var(--bg);font:600 13px Barlow,system-ui,sans-serif;color:var(--ink)}.meal-aware-card .meal-add{width:100%;margin-top:8px}.meal-aware-note{font-size:11px;color:var(--mute);margin-top:9px;padding-top:8px;border-top:1px solid var(--line)}@media(max-width:420px){.meal-aware-card .ex-h{align-items:flex-start}.meal-context{max-width:170px}}';document.head.appendChild(style)
})();