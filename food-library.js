// Food library v1: recurring foods, favorites, editable logs and reusable meals.
(function(){
  const UI_KEY='treino_food_ui_v1';
  const DB_BACKUP_KEY='treino_v1_backup_pre_food_library_v1';
  try{const raw=localStorage.getItem(KEY);if(raw&&!localStorage.getItem(DB_BACKUP_KEY))localStorage.setItem(DB_BACKUP_KEY,raw)}catch(e){}

  let state={favorites:[],customFoods:[],overrides:{},templates:[],usage:{}};
  try{state=Object.assign(state,JSON.parse(localStorage.getItem(UI_KEY)||'{}')||{})}catch(e){}
  state.favorites=Array.isArray(state.favorites)?state.favorites:[];
  state.customFoods=Array.isArray(state.customFoods)?state.customFoods:[];
  state.templates=Array.isArray(state.templates)?state.templates:[];
  state.overrides=state.overrides&&typeof state.overrides==='object'?state.overrides:{};
  state.usage=state.usage&&typeof state.usage==='object'?state.usage:{};

  let tab='recent',searchText='',selectedFoodId=null,editingFoodId=null,editingMeal=null,editingTemplateId=null;
  const units=['g','ml','unidade','fatia','colher','dose','porção'];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const idSafe=s=>'builtin:'+encodeURIComponent(s);
  const saveState=()=>{try{localStorage.setItem(UI_KEY,JSON.stringify(state))}catch(e){}};
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const fmtN=n=>Number(n||0).toFixed(1).replace('.0','');

  function inferBase(name){
    let m=String(name).match(/(\d+(?:[.,]\d+)?)\s*ml\b/i);if(m)return{baseQty:num(m[1])||1,unit:'ml'};
    m=String(name).match(/(\d+(?:[.,]\d+)?)\s*g\b/i);if(m)return{baseQty:num(m[1])||1,unit:'g'};
    if(/fatia/i.test(name))return{baseQty:1,unit:'fatia'};
    if(/colher/i.test(name))return{baseQty:1,unit:'colher'};
    if(/dose/i.test(name))return{baseQty:1,unit:'dose'};
    if(/ovo|banana|maçã|pera|laranja|pudim/i.test(name))return{baseQty:1,unit:'unidade'};
    return{baseQty:1,unit:'porção'};
  }
  function builtinFoods(){return FOODS.map(f=>{const b=inferBase(f[0]);return{id:idSafe(f[0]),source:'builtin',name:f[0],baseQty:b.baseQty,unit:b.unit,k:f[1],p:f[2],c:f[3],g:f[4]}})}
  function scannedFoods(){
    let cache={};try{cache=getProductCache()}catch(e){}
    return Object.values(cache||{}).filter(x=>x&&x.code).map(x=>({id:'scan:'+x.code,source:'scan',name:x.name||('Produto '+x.code),baseQty:100,unit:'g',k:x.k||0,p:x.p||0,c:x.c||0,g:x.g||0,savedAt:x.savedAt||0,code:x.code,brand:x.brand||''}));
  }
  function allFoods(){
    const out=[];const seen=new Set();
    for(const f of [...builtinFoods(),...scannedFoods(),...state.customFoods]){if(!f||!f.id||seen.has(f.id))continue;seen.add(f.id);out.push(Object.assign({},f,state.overrides[f.id]||{}))}
    return out;
  }
  function foodById(id){return allFoods().find(x=>x.id===id)||null}
  function totals(f,amount){const q=Math.max(0,num(amount)||0),factor=q/(num(f.baseQty)||1);return{k:r1(f.k*factor),p:r1(f.p*factor),c:r1(f.c*factor),g:r1(f.g*factor)}}
  function usageTime(f){
    let t=state.usage[f.id]||f.savedAt||0,needle=norm(f.name);
    if(!t&&needle)for(const m of db.meals||[])if(norm(m.n).includes(needle))t=Math.max(t,m.t||0);
    return t;
  }
  function touchFood(id){state.usage[id]=Date.now();saveState()}
  function toggleFav(id){const i=state.favorites.indexOf(id);if(i>=0)state.favorites.splice(i,1);else state.favorites.push(id);saveState();renderComida()}
  function foodLabel(f){return fmtN(f.baseQty)+' '+f.unit}
  function foodLogName(f,amount){const a=fmtN(amount);if(f.unit==='g'||f.unit==='ml')return f.name+' ('+a+' '+f.unit+')';if(Number(amount)===1)return f.name;return a+'× '+f.name}
  function addLibraryFood(f,amount,meal){const T=totals(f,amount);db.meals.push({t:Date.now(),m:meal,n:foodLogName(f,amount),k:T.k,p:T.p,c:T.c,g:T.g,foodId:f.id,amount:num(amount),unit:f.unit});touchFood(f.id);save();toast('Adicionado em '+meal)}

  function topCard(v){
    const today=dayKey(Date.now()),list=db.meals.filter(m=>dayKey(m.t)===today),T=sumOf(list),top=el('div','ex');
    top.append(bar('Calorias',T.k,GOAL.k,'kcal',true),bar('Proteína',T.p,GOAL.p,'g'),bar('Carboidrato',T.c,GOAL.c,'g',true),bar('Gordura',T.g,GOAL.g,'g',true));
    top.appendChild(el('div','hint',T.k>GOAL.k?'Você passou '+Math.round(T.k-GOAL.k)+' kcal da meta hoje.':'Ainda cabem '+Math.round(GOAL.k-T.k)+' kcal. Faltam '+Math.max(0,Math.round(GOAL.p-T.p))+' g de proteína.'));v.appendChild(top)
  }
  function quickCard(v){
    const c=el('div','ex food-quick');const h=el('div','ex-h');h.append(el('h3','','Adicionar rápido'),el('button','ghost small','+ Novo alimento'));h.lastChild.onclick=()=>{editingFoodId='new';renderComida()};c.appendChild(h);
    const q=el('input','food-search');q.type='search';q.placeholder='Buscar alimento ou produto';q.value=searchText;c.appendChild(q);
    const tabs=el('div','food-tabs');[['recent','Recentes'],['fav','Favoritos'],['meals','Refeições'],['all','Todos']].forEach(([k,l])=>{const b=el('button','',l);b.setAttribute('aria-pressed',tab===k);b.onclick=()=>{tab=k;selectedFoodId=null;renderComida()};tabs.appendChild(b)});c.appendChild(tabs);
    const host=el('div','food-results');c.appendChild(host);q.oninput=()=>{searchText=q.value;renderFoodResults(host)};renderFoodResults(host);v.appendChild(c)
  }
  function renderFoodResults(host){
    host.innerHTML='';if(tab==='meals'){renderTemplates(host);return}
    let foods=allFoods(),needle=norm(searchText);if(needle)foods=foods.filter(f=>norm(f.name+' '+(f.brand||'')).includes(needle));
    if(tab==='fav')foods=foods.filter(f=>state.favorites.includes(f.id));
    if(tab==='recent')foods=foods.map(f=>[f,usageTime(f)]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,10).map(x=>x[0]);
    if(tab==='all')foods.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    if(!foods.length){host.appendChild(el('div','hint',tab==='recent'?'Seus alimentos usados recentemente aparecerão aqui.':tab==='fav'?'Toque na estrela de um alimento para adicioná-lo aos favoritos.':'Nenhum alimento encontrado.'));return}
    foods.forEach(f=>{const row=el('div','food-row');const main=el('button','food-main');main.innerHTML='<b>'+esc(f.name)+'</b><span>'+foodLabel(f)+' · '+Math.round(f.k)+' kcal · P '+fmtN(f.p)+' · C '+fmtN(f.c)+' · G '+fmtN(f.g)+'</span>';main.onclick=()=>{selectedFoodId=selectedFoodId===f.id?null:f.id;renderComida()};const star=el('button','food-star',state.favorites.includes(f.id)?'★':'☆');star.setAttribute('aria-label','Favorito');star.onclick=()=>toggleFav(f.id);row.append(main,star);host.appendChild(row)});
  }
  function selectedCard(v){
    const f=foodById(selectedFoodId);if(!f)return;const c=el('div','ex selected-food');const h=el('div','ex-h');h.append(el('h3','',f.name),el('button','ghost small','Editar alimento'));h.lastChild.onclick=()=>{editingFoodId=f.id;renderComida()};c.appendChild(h);
    c.appendChild(el('div','hint','Referência: '+foodLabel(f)+' · '+Math.round(f.k)+' kcal, P '+fmtN(f.p)+', C '+fmtN(f.c)+', G '+fmtN(f.g)));
    const g=el('div','food-add-grid'),amount=el('input'),meal=el('select');amount.type='number';amount.inputMode='decimal';amount.step=f.unit==='g'||f.unit==='ml'?'1':'0.25';amount.value=fmtN(f.baseQty);MEALS.forEach(m=>{const o=el('option','',m);o.value=m;meal.appendChild(o)});meal.value=curMeal;
    const al=el('label');al.innerHTML='<span>Quantidade ('+esc(f.unit)+')</span>';al.appendChild(amount);const ml=el('label');ml.innerHTML='<span>Refeição</span>';ml.appendChild(meal);g.append(al,ml);c.appendChild(g);
    const prev=el('div','food-preview');const calc=()=>{const T=totals(f,amount.value);prev.textContent=Math.round(T.k)+' kcal · P '+fmtN(T.p)+' g · C '+fmtN(T.c)+' g · G '+fmtN(T.g)+' g'};amount.oninput=calc;calc();c.appendChild(prev);
    const add=el('button','primary','Adicionar à refeição');add.onclick=()=>{const a=num(amount.value);if(a===null||a<=0||a>10000){toast('Digite uma quantidade válida');return}curMeal=meal.value;addLibraryFood(f,a,curMeal);selectedFoodId=null;renderComida()};c.appendChild(add);v.appendChild(c)
  }
  function foodEditor(v){
    if(editingFoodId===null)return;const old=editingFoodId==='new'?{id:'custom:'+Date.now(),source:'custom',name:'',baseQty:100,unit:'g',k:0,p:0,c:0,g:0}:foodById(editingFoodId);if(!old){editingFoodId=null;return}
    const c=el('div','ex food-editor');c.appendChild(el('h3','',editingFoodId==='new'?'Novo alimento':'Editar alimento'));const g=el('div','food-editor-grid');
    const field=(label,val,type='number')=>{const l=el('label');l.appendChild(el('span','',label));const i=el('input');i.type=type;i.value=val??'';if(type==='number')i.inputMode='decimal';l.appendChild(i);g.appendChild(l);return i};
    const name=field('Nome',old.name,'text'),base=field('Quantidade de referência',old.baseQty),unitWrap=el('label');unitWrap.appendChild(el('span','','Unidade'));const unit=el('select');units.forEach(x=>{const o=el('option','',x);o.value=x;unit.appendChild(o)});unit.value=old.unit||'g';unitWrap.appendChild(unit);g.appendChild(unitWrap);const k=field('kcal',old.k),p=field('Proteína (g)',old.p),cc=field('Carboidrato (g)',old.c),fat=field('Gordura (g)',old.g);c.appendChild(g);
    const ac=el('div','food-editor-actions');const cancel=el('button','ghost','Cancelar');cancel.onclick=()=>{editingFoodId=null;renderComida()};const sv=el('button','primary compact-primary','Salvar');sv.onclick=()=>{const nm=name.value.trim(),b=num(base.value),vals=[num(k.value),num(p.value)||0,num(cc.value)||0,num(fat.value)||0];if(!nm||b===null||b<=0||vals[0]===null){toast('Confira nome, quantidade e calorias');return}const data={name:nm,baseQty:b,unit:unit.value,k:vals[0],p:vals[1],c:vals[2],g:vals[3]};if(editingFoodId==='new'){state.customFoods.push(Object.assign({id:old.id,source:'custom'},data));selectedFoodId=old.id}else{state.overrides[old.id]=Object.assign({},state.overrides[old.id]||{},data);selectedFoodId=old.id}saveState();editingFoodId=null;renderComida();toast('Alimento salvo')};ac.append(cancel,sv);
    if(editingFoodId!=='new'&&old.source==='custom'){const del=el('button','ghost danger','Apagar alimento');del.onclick=()=>{if(confirm('Apagar este alimento da sua lista? Os registros já feitos não serão apagados.')){state.customFoods=state.customFoods.filter(x=>x.id!==old.id);state.favorites=state.favorites.filter(x=>x!==old.id);delete state.usage[old.id];saveState();editingFoodId=null;selectedFoodId=null;renderComida()}};ac.prepend(del)}c.appendChild(ac);v.appendChild(c)
  }

  function comboTemplate(cb,i){const items=[];cb[2].forEach(([name,q])=>{const f=FM[name];if(!f)return;items.push({n:(q===1?'':q+'× ')+name,k:r1(f[1]*q),p:r1(f[2]*q),c:r1(f[3]*q),g:r1(f[4]*q)})});return{id:'combo:'+i,name:cb[0],meal:cb[1],items,builtin:true}}
  function allTemplates(){return [...COMBOS.map(comboTemplate),...state.templates]}
  function templateTotal(t){return sumOf(t.items||[])}
  function addTemplate(t){for(const x of t.items||[])addMeal(t.meal||curMeal,x.n,x.k,x.p,x.c,x.g);save();toast(t.name+' adicionado');renderComida()}
  function renderTemplates(host){
    const plus=el('button','ghost combo add-template','+ Criar refeição');plus.onclick=()=>{editingTemplateId='new';renderComida()};host.appendChild(plus);let list=allTemplates(),needle=norm(searchText);if(needle)list=list.filter(t=>norm(t.name).includes(needle));
    list.forEach(t=>{const T=templateTotal(t),r=el('div','template-row');const b=el('button','template-main');b.innerHTML='<b>'+esc(t.name)+'</b><span>'+esc(t.meal||'Refeição')+' · '+Math.round(T.k)+' kcal · P '+Math.round(T.p)+' · C '+Math.round(T.c)+' · G '+Math.round(T.g)+'</span>';b.onclick=()=>addTemplate(t);const ed=el('button','ghost small',t.builtin?'Personalizar':'Editar');ed.onclick=()=>{if(t.builtin){const cp=JSON.parse(JSON.stringify(t));cp.id='tpl:'+Date.now();delete cp.builtin;state.templates.push(cp);saveState();editingTemplateId=cp.id}else editingTemplateId=t.id;renderComida()};r.append(b,ed);host.appendChild(r)});
  }
  function templateEditor(v){
    if(editingTemplateId===null)return;let t=editingTemplateId==='new'?{id:'tpl:'+Date.now(),name:'Minha refeição',meal:curMeal,items:[]}:state.templates.find(x=>x.id===editingTemplateId);if(!t){editingTemplateId=null;return}t=JSON.parse(JSON.stringify(t));
    const c=el('div','ex template-editor');c.appendChild(el('h3','',editingTemplateId==='new'?'Nova refeição':'Editar refeição'));const top=el('div','template-meta'),name=el('input'),meal=el('select');name.value=t.name;name.placeholder='Nome da refeição';MEALS.forEach(m=>{const o=el('option','',m);o.value=m;meal.appendChild(o)});meal.value=t.meal||curMeal;top.append(name,meal);c.appendChild(top);
    const items=el('div','template-items');function redraw(){items.innerHTML='';t.items.forEach((x,i)=>{const r=el('div','template-item-edit');const nm=el('input');nm.value=x.n;nm.placeholder='Item';const vals=['k','p','c','g'].map(key=>{const z=el('input');z.type='number';z.inputMode='decimal';z.value=x[key]??0;z.oninput=()=>x[key]=num(z.value)||0;return z});nm.oninput=()=>x.n=nm.value;const del=el('button','ghost','×');del.onclick=()=>{t.items.splice(i,1);redraw()};r.append(nm,...vals,del);items.appendChild(r)});const add=el('button','ghost add-template-item','+ Adicionar item');add.onclick=()=>{t.items.push({n:'Novo item',k:0,p:0,c:0,g:0});redraw()};items.appendChild(add)}redraw();c.appendChild(items);
    const ac=el('div','food-editor-actions'),cancel=el('button','ghost','Cancelar');cancel.onclick=()=>{editingTemplateId=null;renderComida()};const sv=el('button','primary compact-primary','Salvar');sv.onclick=()=>{t.name=name.value.trim()||'Minha refeição';t.meal=meal.value;if(!t.items.length){toast('Adicione pelo menos um item');return}if(editingTemplateId==='new')state.templates.push(t);else state.templates=state.templates.map(x=>x.id===t.id?t:x);saveState();editingTemplateId=null;renderComida();toast('Refeição salva')};ac.append(cancel,sv);if(editingTemplateId!=='new'){const del=el('button','ghost danger','Apagar');del.onclick=()=>{if(confirm('Apagar esta refeição salva?')){state.templates=state.templates.filter(x=>x.id!==t.id);saveState();editingTemplateId=null;renderComida()}};ac.prepend(del)}c.appendChild(ac);v.appendChild(c)
  }

  function mealEditor(v){
    if(!editingMeal)return;const m=editingMeal,c=el('div','ex meal-editor');c.appendChild(el('h3','','Editar registro'));const g=el('div','meal-editor-grid'),name=el('input'),meal=el('select');name.value=m.n;MEALS.forEach(x=>{const o=el('option','',x);o.value=x;meal.appendChild(o)});meal.value=m.m;
    const l1=el('label');l1.append(el('span','','Alimento'),name);const l2=el('label');l2.append(el('span','','Refeição'),meal);g.append(l1,l2);
    let amount=null,food=m.foodId?foodById(m.foodId):null,macroInputs=[];
    if(food){const la=el('label');la.appendChild(el('span','','Quantidade ('+food.unit+')'));amount=el('input');amount.type='number';amount.inputMode='decimal';amount.value=m.amount??food.baseQty;la.appendChild(amount);g.appendChild(la)}
    else ['k','p','c','g'].forEach((key,i)=>{const lab=['Calorias','Proteína (g)','Carboidrato (g)','Gordura (g)'][i],l=el('label');l.appendChild(el('span','',lab));const inp=el('input');inp.type='number';inp.inputMode='decimal';inp.value=m[key]??0;l.appendChild(inp);g.appendChild(l);macroInputs.push([key,inp])});c.appendChild(g);
    const ac=el('div','food-editor-actions'),cancel=el('button','ghost','Cancelar');cancel.onclick=()=>{editingMeal=null;renderComida()};const sv=el('button','primary compact-primary','Salvar alterações');sv.onclick=()=>{m.m=meal.value;m.n=name.value.trim()||'Alimento';if(food&&amount){const a=num(amount.value);if(a===null||a<=0){toast('Quantidade inválida');return}const T=totals(food,a);m.amount=a;m.unit=food.unit;m.k=T.k;m.p=T.p;m.c=T.c;m.g=T.g;m.n=foodLogName(Object.assign({},food,{name:name.value.trim()||food.name}),a)}else macroInputs.forEach(([key,inp])=>m[key]=num(inp.value)||0);save();editingMeal=null;renderComida();toast('Registro atualizado')};ac.append(cancel,sv);c.appendChild(ac);v.appendChild(c)
  }

  function saveMealAsTemplate(mealName,entries){const name=prompt('Nome para esta refeição recorrente',mealName);if(name===null)return;const t={id:'tpl:'+Date.now(),name:name.trim()||mealName,meal:mealName,items:entries.map(m=>({n:m.n,k:m.k,p:m.p,c:m.c||0,g:m.g||0}))};state.templates.push(t);saveState();toast('Refeição salva em Minhas refeições')}
  function todayCard(v){
    const today=dayKey(Date.now()),list=db.meals.filter(m=>dayKey(m.t)===today),hc=el('div','ex');hc.appendChild(el('h3','','Hoje'));if(!list.length)hc.appendChild(el('div','hint','Nada registrado hoje. Use Recentes, Favoritos, Refeições ou o scanner.'));
    MEALS.concat(['Outros']).forEach(mn=>{const es=list.filter(m=>(MEALS.indexOf(m.m)<0?'Outros':m.m)===mn);if(!es.length)return;const s=sumOf(es),h=el('div','meal-head');const tx=el('div');tx.innerHTML='<b>'+esc(mn)+'</b><span>'+Math.round(s.k)+' kcal · P '+Math.round(s.p)+' g</span>';h.appendChild(tx);if(mn!=='Outros'){const saveB=el('button','ghost small','Salvar refeição');saveB.onclick=()=>saveMealAsTemplate(mn,es);h.appendChild(saveB)}hc.appendChild(h);
      es.forEach(m=>{const r=el('div','meal-log');const tx=el('div','meal-log-text');tx.innerHTML='<b>'+esc(m.n)+'</b><span>'+Math.round(m.k)+' kcal · P '+Math.round(m.p)+' · C '+Math.round(m.c||0)+' · G '+Math.round(m.g||0)+'</span>';const ac=el('div','meal-actions');const ed=el('button','ghost small','Editar');ed.onclick=()=>{editingMeal=m;renderComida()};const dup=el('button','ghost small','Duplicar');dup.onclick=()=>{db.meals.push(Object.assign({},m,{t:Date.now()}));save();renderComida();toast('Duplicado')};const del=el('button','ghost small','Apagar');del.onclick=()=>{if(confirm('Apagar '+m.n+'?')){db.meals=db.meals.filter(x=>x!==m);save();renderComida()}};ac.append(ed,dup,del);r.append(tx,ac);hc.appendChild(r)})});v.appendChild(hc)
  }
  function pastCard(v){const today=dayKey(Date.now()),days={};db.meals.forEach(m=>{const k=dayKey(m.t);days[k]=days[k]||{t:m.t,a:[]};days[k].a.push(m)});const past=Object.keys(days).filter(k=>k!==today).map(k=>days[k]).sort((a,b)=>b.t-a.t).slice(0,7);if(!past.length)return;const pc=el('div','ex');pc.appendChild(el('h3','','Dias anteriores'));past.forEach(d=>{const s=sumOf(d.a);pc.appendChild(el('div','log',dateBR(d.t)+': '+Math.round(s.k)+' kcal, P '+Math.round(s.p)+', C '+Math.round(s.c)+', G '+Math.round(s.g)))});v.appendChild(pc)}

  renderComida=function(){
    const v=$('vComida');v.innerHTML='';$('sub').textContent='Meta: '+GOAL.k+' kcal, P '+GOAL.p+' g, C '+GOAL.c+' g, G '+GOAL.g+' g';topCard(v);quickCard(v);if(selectedFoodId)selectedCard(v);if(editingFoodId!==null)foodEditor(v);if(editingTemplateId!==null)templateEditor(v);if(typeof buildBarcodeCard==='function')v.appendChild(buildBarcodeCard());if(editingMeal)mealEditor(v);todayCard(v);pastCard(v)
  };
})();
