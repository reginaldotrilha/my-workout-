// Recover foods that exist in meal history but are missing from the reusable food library.
// Runs before food-library.js so recovered foods are available immediately in "Todos".
(function(){
  const UI_KEY='treino_food_ui_v1';
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const n=v=>{const x=parseFloat(String(v??'').replace(',','.'));return Number.isFinite(x)?x:null};
  const r1=x=>Math.round((Number(x)||0)*10)/10;

  function parseLoggedName(raw){
    let name=String(raw||'').trim();
    let multiplier=1;
    const lead=name.match(/^\s*(\d+(?:[.,]\d+)?)\s*[×x]\s*(.+)$/i);
    if(lead){multiplier=n(lead[1])||1;name=lead[2].trim()}
    let amount=null,unit=null;
    const tail=name.match(/\s*\(\s*(\d+(?:[.,]\d+)?)\s*(g|ml)\s*\)\s*$/i);
    if(tail){amount=n(tail[1]);unit=tail[2].toLowerCase();name=name.slice(0,tail.index).trim()}
    return{name:name||String(raw||'').trim()||'Alimento',amount,unit,multiplier};
  }

  function existingNameKeys(state){
    const keys=new Set();
    const add=name=>{const k=norm(name);if(k)keys.add(k)};
    try{(FOODS||[]).forEach(f=>add(f?.[0]))}catch(e){}
    try{Object.values(getProductCache()||{}).forEach(p=>add(p?.name))}catch(e){}
    (state.customFoods||[]).forEach(f=>add(f?.name));
    Object.values(state.overrides||{}).forEach(f=>add(f?.name));
    return keys;
  }

  function recoveredFood(meal,parsed){
    const k=n(meal.k)||0,p=n(meal.p)||0,c=n(meal.c)||0,g=n(meal.g)||0;
    let baseQty=1,unit='porção',factor=1;
    const storedAmount=n(meal.amount),storedUnit=String(meal.unit||'').toLowerCase();

    if(storedAmount&&storedAmount>0&&storedUnit){
      if(storedUnit==='g'||storedUnit==='ml'){
        baseQty=100;unit=storedUnit;factor=100/storedAmount;
      }else{
        baseQty=1;unit=storedUnit;factor=1/storedAmount;
      }
    }else if(parsed.amount&&parsed.amount>0&&(parsed.unit==='g'||parsed.unit==='ml')){
      baseQty=100;unit=parsed.unit;factor=100/parsed.amount;
    }else if(parsed.multiplier&&parsed.multiplier!==1){
      baseQty=1;unit='porção';factor=1/parsed.multiplier;
    }

    const key=norm(parsed.name);
    return{
      id:'history:'+encodeURIComponent(key),source:'custom',recoveredFromHistory:true,
      name:parsed.name,baseQty,unit,
      k:r1(k*factor),p:r1(p*factor),c:r1(c*factor),g:r1(g*factor),
      recoveredAt:meal.t||Date.now()
    };
  }

  try{
    if(typeof db==='undefined'||!Array.isArray(db.meals)||!db.meals.length)return;
    let state={favorites:[],customFoods:[],overrides:{},templates:[],usage:{}};
    try{state=Object.assign(state,JSON.parse(localStorage.getItem(UI_KEY)||'{}')||{})}catch(e){}
    state.customFoods=Array.isArray(state.customFoods)?state.customFoods:[];
    state.usage=state.usage&&typeof state.usage==='object'?state.usage:{};
    state.overrides=state.overrides&&typeof state.overrides==='object'?state.overrides:{};

    const existing=existingNameKeys(state),seenHistory=new Set();
    let added=0;
    const meals=db.meals.slice().sort((a,b)=>(b.t||0)-(a.t||0));
    for(const meal of meals){
      if(!meal||!meal.n)continue;
      const parsed=parseLoggedName(meal.n),rawKey=norm(meal.n),key=norm(parsed.name);
      if(!key||seenHistory.has(key))continue;
      seenHistory.add(key);

      // Newer library records already carry a foodId. Only recover them if their food is genuinely missing.
      let linkedExists=false;
      if(meal.foodId){
        const id=String(meal.foodId);
        try{
          if(id.startsWith('builtin:'))linkedExists=true;
          else if(id.startsWith('scan:'))linkedExists=!!getProductCache()?.[id.slice(5)];
          else linkedExists=state.customFoods.some(f=>f&&f.id===id);
        }catch(e){}
      }
      if(linkedExists)continue;

      // Treat either the exact logged label or its quantity-stripped name as an existing match.
      if(existing.has(rawKey)||existing.has(key))continue;
      const food=recoveredFood(meal,parsed);
      state.customFoods.push(food);state.usage[food.id]=meal.t||Date.now();existing.add(key);added++;
    }
    if(added){
      localStorage.setItem(UI_KEY,JSON.stringify(state));
      localStorage.setItem('treino_food_history_recovery_last',JSON.stringify({t:Date.now(),added}));
    }
  }catch(e){}
})();
