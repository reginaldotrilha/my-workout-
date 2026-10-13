const GOAL={k:2250,p:160,c:245,g:70};
const MEALS=['Café da manhã','Lanche da manhã','Almoço','Lanche da tarde','Pré-treino','Jantar'];
const FOODS=[
['Pacote Chef Select frango com arroz',462,27,59,13],['Pudim proteico Lidl (20 g de proteína)',140,20,11,2],['Iogurte Milbona High Protein (100 g)',75,10,6.5,0.6],['Honey Nut Flakes Crownfield (30 g)',118,2.1,24.3,1.1],
['Frango grelhado (100 g)',165,31,0,4],['Carne bovina magra (100 g)',195,30,0,8],['Carne moída (100 g)',215,26,0,12],
['Ovo',70,6,0.5,5],['Presunto (fatia)',20,3,0,1],['Whey (1 dose)',120,24,3,2],['Iogurte grego 150 g',100,15,6,1],
['Arroz cozido (100 g)',130,3,28,0],['Legumes cozidos (100 g)',35,2,6,0],['Pão integral (fatia)',60,1.9,11,0.4],['Aveia 30 g',115,4,20,2],
['Leite desnatado 200 ml',70,7,10,0],['Pasta de amendoim (colher)',92,3.7,1.8,7.5],['Mel (colher de sopa)',49,0,12.3,0],
['Azeite (colher de sopa)',120,0,0,14],['Castanhas (30 g)',190,5,6,17],
['Banana',105,1,27,0],['Maçã (1 média)',95,0,25,0],['Pera (1 média)',100,1,27,0],['Laranja (1 média)',65,1,16,0],
['Morango (100 g)',32,1,8,0],['Uva (100 g)',70,1,18,0],['Manga (100 g)',60,1,15,0]];
const FM={};FOODS.forEach(f=>{FM[f[0]]=f});
const COMBOS=[
['Café proteico','Café da manhã',[['Ovo',3],['Pão integral (fatia)',2],['Banana',1],['Leite desnatado 200 ml',1]]],
['Café com iogurte e aveia','Café da manhã',[['Iogurte grego 150 g',1],['Aveia 30 g',1],['Morango (100 g)',2],['Banana',1]]],
['Pão, pasta de amendoim e iogurte','Café da manhã',[['Pão integral (fatia)',2],['Pasta de amendoim (colher)',1],['Iogurte Milbona High Protein (100 g)',2],['Leite desnatado 200 ml',1]]],
['Café com iogurte e cereal','Café da manhã',[['Iogurte Milbona High Protein (100 g)',2],['Honey Nut Flakes Crownfield (30 g)',1],['Leite desnatado 200 ml',1]]],
['Iogurte com maçã','Lanche da manhã',[['Iogurte grego 150 g',1],['Maçã (1 média)',1]]],
['Pacote + pudim + pera','Almoço',[['Pacote Chef Select frango com arroz',1],['Pudim proteico Lidl (20 g de proteína)',1],['Pera (1 média)',1]]],
['Frango, arroz e legumes','Almoço',[['Frango grelhado (100 g)',1.5],['Arroz cozido (100 g)',1.5],['Legumes cozidos (100 g)',1.5],['Azeite (colher de sopa)',1]]],
['Whey com banana','Lanche da tarde',[['Whey (1 dose)',1],['Banana',1]]],
['Pão com pasta de amendoim','Pré-treino',[['Pão integral (fatia)',2],['Pasta de amendoim (colher)',1],['Banana',1]]],
['Ovos, presunto e legumes','Jantar',[['Ovo',4],['Presunto (fatia)',3],['Legumes cozidos (100 g)',1.5]]],
['Carne, arroz e legumes','Jantar',[['Carne bovina magra (100 g)',1.5],['Arroz cozido (100 g)',1],['Legumes cozidos (100 g)',1.5],['Azeite (colher de sopa)',1]]]];
let curMeal=MEALS[0];
function el(t,c,x){const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e}
function dayKey(t){const d=new Date(t);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}
const r1=x=>Math.round(x*10)/10;
function addMeal(m,n,k,p,c,g){db.meals.push({t:Date.now(),m:m,n:n,k:k,p:p,c:c||0,g:g||0})}
function addFood(m,f,q){addMeal(m,(q===1?'':q+'× ')+f[0],Math.round(f[1]*q),r1(f[2]*q),r1(f[3]*q),r1(f[4]*q))}
function sumOf(a){return a.reduce((s,m)=>({k:s.k+m.k,p:s.p+m.p,c:s.c+(m.c||0),g:s.g+(m.g||0)}),{k:0,p:0,c:0,g:0})}
function comboTot(cb){return sumOf(cb[2].filter(i=>FM[i[0]]).map(i=>{const f=FM[i[0]],q=i[1];return{k:f[1]*q,p:f[2]*q,c:f[3]*q,g:f[4]*q}}))}
function bar(lbl,val,goal,unit,warn){const w=el('div'),h=el('div','rowx');h.append(el('b','',lbl),el('span','tgt',Math.round(val)+' / '+goal+' '+unit));
  const br=el('div','bar'),i=el('i',warn&&val>goal?'over':'');i.style.width=Math.min(100,val/goal*100)+'%';br.appendChild(i);w.append(h,br);return w}
function renderComida(){
  const v=$('vComida');v.innerHTML='';$('sub').textContent='Meta: '+GOAL.k+' kcal, P '+GOAL.p+' g, C '+GOAL.c+' g, G '+GOAL.g+' g';
  const today=dayKey(Date.now()),list=db.meals.filter(m=>dayKey(m.t)===today),T=sumOf(list);
  const top=el('div','ex');
  top.append(bar('Calorias',T.k,GOAL.k,'kcal',true),bar('Proteína',T.p,GOAL.p,'g'),bar('Carboidrato',T.c,GOAL.c,'g',true),bar('Gordura',T.g,GOAL.g,'g',true));
  top.appendChild(el('div','hint',T.k>GOAL.k?'Você passou '+Math.round(T.k-GOAL.k)+' kcal da meta hoje.':'Ainda cabem '+Math.round(GOAL.k-T.k)+' kcal. Faltam '+Math.max(0,Math.round(GOAL.p-T.p))+' g de proteína.'));
  v.appendChild(top);
  const sg=el('div','ex');sg.appendChild(el('h3','','Sugestões prontas'));sg.appendChild(el('div','hint','Toque para adicionar a refeição inteira.'));
  COMBOS.forEach(cb=>{const t=comboTot(cb),b=el('button','ghost combo');b.append(el('b','',cb[0]),el('span','',cb[1]+': '+Math.round(t.k)+' kcal, P '+Math.round(t.p)+' g, C '+Math.round(t.c)+' g, G '+Math.round(t.g)+' g'));
    b.onclick=()=>{cb[2].forEach(i=>{if(FM[i[0]])addFood(cb[1],FM[i[0]],i[1])});save();renderComida();toast(cb[0]+' adicionado em '+cb[1])};sg.appendChild(b)});
  v.appendChild(sg);
  const ad=el('div','ex');ad.appendChild(el('h3','','Adicionar alimento'));
  const sl=el('label','hint','Refeição');sl.htmlFor='mealsel';ad.appendChild(sl);
  const sel=el('select');sel.id='mealsel';MEALS.forEach(m=>{const o=el('option','',m);o.value=m;sel.appendChild(o)});sel.value=curMeal;sel.onchange=()=>{curMeal=sel.value};
  const sr=el('div','fin');sr.appendChild(sel);ad.appendChild(sr);
  const ql=el('label','hint','Quantidade: 1 = porção do atalho. Para 150 g de frango, use 1,5.');ql.htmlFor='qty';ad.appendChild(ql);
  const qi=el('input');qi.id='qty';qi.type='number';qi.inputMode='decimal';qi.step='0.25';qi.value='1';
  const qr=el('div','fin');qr.appendChild(qi);ad.appendChild(qr);
  const q=()=>{const n=num(qi.value);return n!==null&&n>0&&n<=50?n:1};
  const chips=el('div','chips');
  FOODS.forEach(f=>{const c=el('button','ghost chip','+ '+f[0]);c.onclick=()=>{curMeal=sel.value;addFood(curMeal,f,q());save();renderComida();toast('Adicionado em '+curMeal)};chips.appendChild(c)});
  ad.appendChild(chips);ad.appendChild(el('div','hint','Valores aproximados. O pacote do almoço vem do rótulo (carbo estimado). Prefira o rótulo quando tiver.'));
  const dt=el('details','how');dt.appendChild(el('summary','','Outro alimento (digitar)'));
  const fm=el('div','fin'),nm=el('input','wide'),mk=(ph)=>{const i=el('input');i.type='number';i.inputMode='decimal';i.placeholder=ph;i.setAttribute('aria-label',ph);return i};
  nm.type='text';nm.placeholder='O que você comeu';nm.setAttribute('aria-label','Alimento');
  const kk=mk('kcal'),pp=mk('proteína (g)'),cc=mk('carboidrato (g)'),gg=mk('gordura (g)'),ab=el('button','ghost wide','Adicionar');
  ab.onclick=()=>{const k=num(kk.value),p=num(pp.value)||0,c=num(cc.value)||0,g=num(gg.value)||0;if(k===null||k<0||k>3000){toast('Informe as calorias');return}addMeal(sel.value,nm.value.trim().slice(0,60)||'Alimento',k,p,c,g);save();renderComida();toast('Adicionado')};
  fm.append(nm,kk,pp,cc,gg,ab);dt.appendChild(fm);ad.appendChild(dt);v.appendChild(ad);
  const hc=el('div','ex');hc.appendChild(el('h3','','Hoje'));
  if(!list.length)hc.appendChild(el('div','hint','Nada registrado hoje. Use uma sugestão pronta ou um atalho.'));
  MEALS.concat(['Outros']).forEach(mn=>{const es=list.filter(m=>(MEALS.indexOf(m.m)<0?'Outros':m.m)===mn);if(!es.length)return;
    const s=sumOf(es),h=el('div','rowx mh');h.append(el('b','',mn),el('span','tgt',Math.round(s.k)+' kcal, P '+Math.round(s.p)+' g'));hc.appendChild(h);
    es.forEach(m=>{const r=el('div','log rowx');r.appendChild(el('span','',m.n+' ('+Math.round(m.k)+' kcal, P '+Math.round(m.p)+', C '+Math.round(m.c||0)+', G '+Math.round(m.g||0)+')'));
      const x=el('button','ghost','Apagar');x.setAttribute('aria-label','Apagar '+m.n);x.onclick=()=>{db.meals=db.meals.filter(z=>z!==m);save();renderComida()};r.appendChild(x);hc.appendChild(r)})});
  v.appendChild(hc);
  const days={};db.meals.forEach(m=>{const k=dayKey(m.t);days[k]=days[k]||{t:m.t,a:[]};days[k].a.push(m)});
  const past=Object.keys(days).filter(k=>k!==today).map(k=>days[k]).sort((a,b)=>b.t-a.t).slice(0,7);
  if(past.length){const pc=el('div','ex');pc.appendChild(el('h3','','Dias anteriores'));
    past.forEach(d=>{const s=sumOf(d.a);pc.appendChild(el('div','log',dateBR(d.t)+': '+Math.round(s.k)+' kcal, P '+Math.round(s.p)+', C '+Math.round(s.c)+', G '+Math.round(s.g)))});v.appendChild(pc)}
}