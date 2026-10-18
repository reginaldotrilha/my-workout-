// Exercise muscle summary + generated anatomy artwork for the main A/B exercises.
// Other exercises keep the existing non-AI wger photo fallback.
(function(){
  const P={
    chest:{label:'Peito',primary:['peito'],secondary:['ombros','tríceps']},
    chestIncline:{label:'Peito superior',primary:['peito superior','ombros'],secondary:['tríceps']},
    triceps:{label:'Tríceps',primary:['tríceps'],secondary:['ombros']},
    back:{label:'Costas',primary:['dorsais','costas/trapézio'],secondary:['bíceps','ombro posterior']},
    lats:{label:'Dorsais',primary:['dorsais'],secondary:['bíceps','ombro posterior']},
    biceps:{label:'Bíceps',primary:['bíceps'],secondary:['antebraços']},
    hammer:{label:'Bíceps + antebraço',primary:['bíceps','antebraços'],secondary:[]},
    squat:{label:'Quadríceps + glúteos',primary:['quadríceps','glúteos'],secondary:['posterior da coxa','abdômen','lombar']},
    hamstrings:{label:'Posterior + glúteos',primary:['posterior da coxa','glúteos'],secondary:['lombar']},
    legcurl:{label:'Posterior da coxa',primary:['posterior da coxa'],secondary:['panturrilhas']},
    calves:{label:'Panturrilhas',primary:['panturrilhas'],secondary:[]},
    shoulders:{label:'Ombros',primary:['ombros'],secondary:['tríceps','costas/trapézio']},
    lateral:{label:'Ombros laterais',primary:['ombros'],secondary:[]},
    rear:{label:'Ombro posterior + costas',primary:['ombro posterior','costas/trapézio'],secondary:['dorsais']},
    traps:{label:'Trapézio',primary:['costas/trapézio'],secondary:['ombros']},
    core:{label:'Core',primary:['abdômen'],secondary:['ombros','glúteos','lombar']},
    abs:{label:'Abdômen',primary:['abdômen'],secondary:['quadríceps']}
  };

  const Q={
    'Supino reto com barra':'barbell bench press',
    'Supino inclinado com halteres':'incline dumbbell bench press',
    'Crucifixo na polia ou peck deck':'pec deck fly',
    'Tríceps testa':'lying triceps extension',
    'Tríceps na polia (corda)':'cable triceps pushdown',
    'Barra fixa ou puxada frontal':'lat pulldown',
    'Remada curvada com barra':'barbell bent over row',
    'Remada unilateral com halter':'one arm dumbbell row',
    'Rosca direta com barra':'barbell biceps curl',
    'Rosca martelo':'dumbbell hammer curl',
    'Agachamento livre':'barbell back squat',
    'Leg press':'leg press',
    'Stiff (levantamento terra romeno)':'romanian deadlift',
    'Mesa flexora':'lying leg curl',
    'Panturrilha em pé':'standing calf raise',
    'Desenvolvimento militar':'barbell overhead press',
    'Elevação lateral':'dumbbell lateral raise',
    'Face pull ou crucifixo invertido':'cable face pull',
    'Encolhimento':'dumbbell shrug',
    'Prancha (segundos)':'plank',
    'Abdominal infra ou roda':'lying leg raise'
  };

  // 5 columns x 2 rows in one high-resolution local sprite.
  const LOCAL_ART={
    'Barra fixa ou puxada frontal':{x:0,y:0},
    'Supino reto com barra':{x:25,y:0},
    'Supino inclinado com halteres':{x:50,y:0},
    'Crucifixo na polia ou peck deck':{x:75,y:0},
    'Tríceps testa':{x:100,y:0},
    'Tríceps na polia (corda)':{x:0,y:100},
    'Remada curvada com barra':{x:25,y:100},
    'Remada unilateral com halter':{x:50,y:100},
    'Rosca direta com barra':{x:75,y:100},
    'Rosca martelo':{x:100,y:100}
  };

  function profile(name){
    const n=String(name||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(/supino inclinado|incline.*press/.test(n))return P.chestIncline;
    if(/supino|chest press|pec deck|crucifixo|crossover|fly/.test(n))return P.chest;
    if(/triceps|skull|frances|mergulho|dip/.test(n))return P.triceps;
    if(/barra fixa|puxada|pulldown|pullup|pull-up/.test(n))return P.lats;
    if(/remada|row|t-bar|tbar/.test(n))return P.back;
    if(/rosca martelo|hammer/.test(n))return P.hammer;
    if(/rosca|curl/.test(n))return P.biceps;
    if(/agachamento|squat|leg press|hack squat|goblet/.test(n))return P.squat;
    if(/stiff|romeno|romanian|rdl/.test(n))return P.hamstrings;
    if(/mesa flexora|flexora|leg curl/.test(n))return P.legcurl;
    if(/panturrilha|calf/.test(n))return P.calves;
    if(/face pull|crucifixo invertido|reverse pec|rear delt/.test(n))return P.rear;
    if(/encolhimento|shrug/.test(n))return P.traps;
    if(/elevacao lateral|lateral raise/.test(n))return P.lateral;
    if(/desenvolvimento|militar|shoulder press|overhead press/.test(n))return P.shoulders;
    if(/prancha|plank/.test(n))return P.core;
    if(/abdominal|ab wheel|roda|leg raise|crunch/.test(n))return P.abs;
    return null;
  }

  const CACHE_KEY='treino_real_exercise_photos_v2';
  let photoCache={};
  try{photoCache=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}')||{}}catch(e){photoCache={}}
  function saveCache(){try{localStorage.setItem(CACHE_KEY,JSON.stringify(photoCache))}catch(e){}}
  function validUrl(u){return typeof u==='string'&&/^https:\/\//i.test(u)}
  function imageUrl(img){const th=img&&img.thumbnails||{};const u=th.medium||th.small||(img&&img.image)||null;return validUrl(u)?u:null}
  function photoFromResults(data){
    const rows=Array.isArray(data)?data:(data&&Array.isArray(data.results)?data.results:[]),photos=[];
    rows.forEach(ex=>(ex.images||[]).forEach(img=>{if(String(img.style)!=='4'||img.is_ai_generated===true)return;const url=imageUrl(img);if(!url)return;photos.push({url,source:img.license_object_url||'https://wger.de',author:img.license_author||'',license:img.license_title||'',main:!!img.is_main})}));
    photos.sort((a,b)=>Number(b.main)-Number(a.main));return photos[0]||null;
  }
  async function findPhoto(title){
    const query=Q[title]||(typeof EN!=='undefined'&&EN[title])||title,cached=photoCache[query];
    if(cached&&cached.url)return cached;if(cached&&cached.none&&Date.now()-cached.none<7*86400000)return null;
    try{const r=await fetch('https://wger.de/api/v2/exerciseinfo/?limit=20&language__code=en&name__search='+encodeURIComponent(query),{headers:{Accept:'application/json'}});if(!r.ok)throw new Error('HTTP '+r.status);const photo=photoFromResults(await r.json());if(photo){photoCache[query]=photo;saveCache();return photo}photoCache[query]={none:Date.now()};saveCache();return null}catch(e){return null}
  }
  function sourceLine(photo){const bits=[];if(photo&&photo.author)bits.push(photo.author);if(photo&&photo.license)bits.push(photo.license);return bits.length?'Foto: '+bits.join(' · '):'Foto real do catálogo wger'}
  function setPhoto(visual,title,photo){
    visual.innerHTML='';
    if(!photo){const none=document.createElement('div');none.className='real-photo-empty';none.innerHTML='<span>Foto real não disponível</span><small>Sem imagem externa para este exercício.</small>';visual.appendChild(none);return}
    const img=document.createElement('img');img.className='real-exercise-photo';img.src=photo.url;img.alt='Demonstração real de '+title;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.onerror=()=>{photoCache[Q[title]||title]={none:Date.now()};saveCache();setPhoto(visual,title,null)};visual.appendChild(img);
    const cap=document.createElement('div');cap.className='real-photo-credit';cap.textContent=sourceLine(photo);visual.appendChild(cap);
  }
  function setLocalArtwork(visual,title,art){
    visual.innerHTML='';
    const img=document.createElement('div');img.className='local-anatomy-art';img.style.backgroundPosition=art.x+'% '+art.y+'%';img.setAttribute('role','img');img.setAttribute('aria-label','Ilustração anatômica de '+title+' com músculos trabalhados destacados');visual.appendChild(img);
  }

  function enhance(){
    const box=document.getElementById('list');if(!box)return;
    [...box.querySelectorAll(':scope > .ex')].forEach(card=>{
      if(card.querySelector('.muscle-map'))return;
      const title=card.querySelector('.ex-h h3')?.textContent;if(!title)return;
      const p=profile(title);if(!p)return;
      const wrap=document.createElement('div');wrap.className='muscle-map real-map';
      const visual=document.createElement('div');visual.className='real-photo-box';
      const copy=document.createElement('div');copy.className='muscle-copy';
      const h=document.createElement('b');h.textContent=p.label;copy.appendChild(h);
      const pri=document.createElement('span');pri.innerHTML='<i class="dot primary"></i>Principal: '+p.primary.join(', ');copy.appendChild(pri);
      if(p.secondary.length){const sec=document.createElement('span');sec.innerHTML='<i class="dot secondary"></i>Também: '+p.secondary.join(', ');copy.appendChild(sec)}
      wrap.append(visual,copy);
      const how=card.querySelector('.how');if(how)card.insertBefore(wrap,how);else{const hint=card.querySelector('.hint');hint?hint.insertAdjacentElement('afterend',wrap):card.appendChild(wrap)}
      const local=LOCAL_ART[title];
      if(local)setLocalArtwork(visual,title,local);else{visual.innerHTML='<div class="real-photo-loading">Buscando foto real…</div>';findPhoto(title).then(photo=>{if(document.body.contains(visual))setPhoto(visual,title,photo)})}
    });
  }

  const base=window.renderList;if(typeof base==='function')window.renderList=function(){base.apply(this,arguments);requestAnimationFrame(enhance)};

  const style=document.createElement('style');
  style.textContent='.muscle-map.real-map{display:grid;grid-template-columns:220px minmax(0,1fr);align-items:center;gap:14px;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:10px;margin:8px 0 10px}.real-photo-box{position:relative;width:220px;height:150px;border-radius:10px;overflow:hidden;background:#f4f2ed;border:1px solid var(--line)}.local-anatomy-art{width:100%;height:100%;background-image:url("./assets/anatomy/exercise-anatomy-v3.jpg");background-repeat:no-repeat;background-size:500% 200%;background-color:#fff}.real-exercise-photo{display:block;width:100%;height:100%;object-fit:cover;object-position:center}.real-photo-loading,.real-photo-empty{height:100%;display:flex;align-items:center;justify-content:center;text-align:center;padding:10px;color:var(--mute);font-size:12px}.real-photo-empty{flex-direction:column;gap:3px}.real-photo-empty small{font-size:10px;line-height:1.25}.real-photo-credit{position:absolute;left:6px;right:6px;bottom:6px;padding:3px 5px;border-radius:5px;background:rgba(0,0,0,.58);color:#fff;font-size:8px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.muscle-copy{display:grid;gap:5px;min-width:0}.muscle-copy>b{font:700 19px "Barlow Condensed",Barlow,sans-serif;color:var(--ink)}.muscle-copy span{font-size:12px;color:var(--mute);line-height:1.35}.muscle-copy .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}.muscle-copy .dot.primary{background:var(--acc)}.muscle-copy .dot.secondary{background:var(--hot)}@media(max-width:520px){.muscle-map.real-map{grid-template-columns:1fr;gap:9px;padding:9px}.real-photo-box{width:100%;height:190px}.muscle-copy{padding:0 4px 2px}.muscle-copy>b{font-size:18px}.muscle-copy span{font-size:12px}}';
  document.head.appendChild(style);
})();