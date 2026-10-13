const PRODUCT_CACHE_KEY='treino_products_v1';
let activeBarcodeScanner=null;

function getProductCache(){
  try{return JSON.parse(localStorage.getItem(PRODUCT_CACHE_KEY)||'{}')||{}}catch(e){return{}}
}
function putProductCache(p){
  if(!p||!p.code)return;
  const c=getProductCache();c[p.code]={...p,savedAt:Date.now()};
  try{localStorage.setItem(PRODUCT_CACHE_KEY,JSON.stringify(c))}catch(e){}
}
function cleanBarcode(v){return String(v||'').replace(/\D/g,'').slice(0,14)}
function offNum(v){const n=parseFloat(v);return Number.isFinite(n)?n:null}
function productFromOff(code,p){
  const n=p.nutriments||{};
  let kcal=offNum(n['energy-kcal_100g']);
  if(kcal===null){const kj=offNum(n.energy_100g);if(kj!==null)kcal=kj/4.184}
  return{
    code,
    name:(p.product_name||p.product_name_en||'Produto sem nome').trim(),
    brand:(p.brands||'').trim(),
    image:p.image_front_small_url||p.image_front_url||'',
    k:kcal===null?0:Math.round(kcal*10)/10,
    p:offNum(n.proteins_100g)??0,
    c:offNum(n.carbohydrates_100g)??0,
    g:offNum(n.fat_100g)??0
  };
}
async function lookupBarcode(code,force=false){
  code=cleanBarcode(code);
  if(code.length<6){throw new Error('Código de barras inválido')}
  const cached=getProductCache()[code];
  if(cached&&!force)return{product:cached,source:'cache'};
  const fields='code,product_name,product_name_en,brands,image_front_small_url,image_front_url,nutriments';
  const url='https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields='+encodeURIComponent(fields)+'&cc=ie&lc=en';
  const r=await fetch(url,{method:'GET',mode:'cors',cache:'no-store'});
  if(!r.ok)throw new Error('Não foi possível consultar o produto');
  const j=await r.json();
  if(j.status!==1||!j.product)return{product:{code,name:'',brand:'',image:'',k:0,p:0,c:0,g:0},source:'missing'};
  const product=productFromOff(code,j.product);putProductCache(product);
  return{product,source:'openfoodfacts'};
}
function scannerField(label,type='number',value=''){
  const wrap=el('label','scan-field');wrap.appendChild(el('span','hint',label));
  const i=el('input');i.type=type;i.value=value??'';if(type==='number'){i.inputMode='decimal';i.step='0.1';i.min='0'}
  wrap.appendChild(i);return{wrap,input:i};
}
function renderScannedProduct(host,product,source){
  host.innerHTML='';
  const head=el('div','scan-product-head');
  if(product.image){const im=document.createElement('img');im.src=product.image;im.alt='Foto do produto';im.loading='lazy';head.appendChild(im)}
  const info=el('div');info.appendChild(el('h3','',product.name||'Produto não encontrado'));
  info.appendChild(el('div','hint',(product.brand?product.brand+' · ':'')+'código '+product.code));head.appendChild(info);host.appendChild(head);
  if(source==='missing')host.appendChild(el('div','scan-warning','Não encontrei esse código no Open Food Facts. Preencha os dados do rótulo abaixo; eles ficarão salvos neste aparelho para a próxima vez.'));
  else if(source==='cache')host.appendChild(el('div','hint','Produto recuperado do seu histórico.'));
  else host.appendChild(el('div','hint','Dados obtidos do Open Food Facts. Confira o rótulo quando possível.'));

  const name=scannerField('Nome do produto','text',product.name);name.wrap.classList.add('wide');
  const kcal=scannerField('kcal / 100 g','number',product.k);
  const prot=scannerField('Proteína / 100 g','number',product.p);
  const carb=scannerField('Carboidrato / 100 g','number',product.c);
  const fat=scannerField('Gordura / 100 g','number',product.g);
  const grams=scannerField('Quantidade consumida (g)','number','100');
  const grid=el('div','scan-grid');grid.append(name.wrap,kcal.wrap,prot.wrap,carb.wrap,fat.wrap,grams.wrap);host.appendChild(grid);

  const mealWrap=el('label','scan-field wide');mealWrap.appendChild(el('span','hint','Refeição'));
  const meal=el('select');MEALS.forEach(m=>{const o=el('option','',m);o.value=m;meal.appendChild(o)});meal.value=curMeal;mealWrap.appendChild(meal);host.appendChild(mealWrap);
  const preview=el('div','scan-preview');host.appendChild(preview);
  const calc=()=>{
    const q=Math.max(0,offNum(grams.input.value)||0)/100;
    const k=(offNum(kcal.input.value)||0)*q,p=(offNum(prot.input.value)||0)*q,c=(offNum(carb.input.value)||0)*q,g=(offNum(fat.input.value)||0)*q;
    preview.textContent=Math.round(k)+' kcal · P '+r1(p)+' g · C '+r1(c)+' g · G '+r1(g)+' g';
    return{k,p,c,g,q};
  };
  [kcal.input,prot.input,carb.input,fat.input,grams.input].forEach(i=>i.addEventListener('input',calc));calc();

  const actions=el('div','scan-actions');
  const add=el('button','primary','Adicionar à refeição');
  add.onclick=()=>{
    const nm=name.input.value.trim();const gms=offNum(grams.input.value);const vals=calc();
    if(!nm){toast('Digite o nome do produto');name.input.focus();return}
    if(gms===null||gms<=0||gms>5000){toast('Digite uma quantidade válida em gramas');grams.input.focus();return}
    const saved={code:product.code,name:nm,brand:product.brand||'',image:product.image||'',k:offNum(kcal.input.value)||0,p:offNum(prot.input.value)||0,c:offNum(carb.input.value)||0,g:offNum(fat.input.value)||0};
    putProductCache(saved);curMeal=meal.value;
    addMeal(curMeal,nm+' ('+r1(gms)+' g)',Math.round(vals.k),r1(vals.p),r1(vals.c),r1(vals.g));
    save();renderComida();toast(nm+' adicionado em '+curMeal);
  };
  const again=el('button','ghost','Escanear outro');again.onclick=()=>{host.innerHTML='';openBarcodeScanner(host)};
  actions.append(add,again);host.appendChild(actions);
}
async function searchBarcodeInto(host,code){
  code=cleanBarcode(code);if(code.length<6){toast('Digite um código de barras válido');return}
  host.innerHTML='';host.appendChild(el('div','scan-loading','Consultando produto…'));
  try{const r=await lookupBarcode(code);renderScannedProduct(host,r.product,r.source)}catch(e){
    host.innerHTML='';host.appendChild(el('div','scan-warning',e.message||'Não foi possível consultar o produto. Verifique a internet ou preencha manualmente.'));
    renderScannedProduct(host,{code,name:'',brand:'',image:'',k:0,p:0,c:0,g:0},'missing');
  }
}
function loadScannerLib(){
  if(window.Html5Qrcode)return Promise.resolve();
  if(loadScannerLib.p)return loadScannerLib.p;
  loadScannerLib.p=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';s.async=true;
    s.onload=resolve;s.onerror=()=>reject(new Error('Não foi possível carregar o leitor de código de barras'));document.head.appendChild(s);
  });
  return loadScannerLib.p;
}
async function stopBarcodeScanner(){
  if(activeBarcodeScanner){try{await activeBarcodeScanner.stop()}catch(e){}try{activeBarcodeScanner.clear()}catch(e){}activeBarcodeScanner=null}
}
async function openBarcodeScanner(resultHost){
  await stopBarcodeScanner();resultHost.innerHTML='';
  const panel=el('div','scan-camera');const reader=el('div');reader.id='barcode-reader-'+Date.now();panel.appendChild(reader);
  const cancel=el('button','ghost','Cancelar câmera');cancel.onclick=async()=>{await stopBarcodeScanner();resultHost.innerHTML=''};panel.appendChild(cancel);resultHost.appendChild(panel);
  try{
    await loadScannerLib();
    const scanner=new Html5Qrcode(reader.id,{verbose:false});activeBarcodeScanner=scanner;
    await scanner.start({facingMode:'environment'},{fps:10,qrbox:{width:250,height:140},aspectRatio:1.777},async decoded=>{
      const code=cleanBarcode(decoded);if(code.length<6)return;
      await stopBarcodeScanner();searchBarcodeInto(resultHost,code);
    },()=>{});
  }catch(e){
    await stopBarcodeScanner();resultHost.innerHTML='';
    resultHost.appendChild(el('div','scan-warning','Não consegui abrir a câmera. Use o campo de código de barras abaixo ou verifique a permissão da câmera no Safari.'));
  }
}
function buildBarcodeCard(){
  const card=el('div','ex barcode-card');card.id='barcodeCard';
  const h=el('div','ex-h');h.appendChild(el('h3','','Escanear produto'));h.appendChild(el('span','tgt','EAN / UPC'));card.appendChild(h);
  card.appendChild(el('div','hint','Leia o código de barras e busque automaticamente calorias, proteína, carboidrato e gordura.'));
  const result=el('div','scan-result');
  const scan=el('button','primary scan-main','📷 Escanear com a câmera');scan.onclick=()=>openBarcodeScanner(result);card.appendChild(scan);
  const row=el('div','scan-code-row');const input=el('input');input.type='text';input.inputMode='numeric';input.autocomplete='off';input.placeholder='Ou digite o código de barras';
  const search=el('button','ghost','Buscar');search.onclick=()=>searchBarcodeInto(result,input.value);input.addEventListener('keydown',e=>{if(e.key==='Enter')search.click()});row.append(input,search);card.appendChild(row);
  card.appendChild(result);return card;
}
function injectBarcodeScanner(){
  const v=$('vComida');if(!v||$('barcodeCard'))return;
  const card=buildBarcodeCard();const first=v.querySelector('.ex');if(first)first.insertAdjacentElement('afterend',card);else v.prepend(card);
}
const renderComidaBase=renderComida;
renderComida=function(){renderComidaBase();injectBarcodeScanner()};
