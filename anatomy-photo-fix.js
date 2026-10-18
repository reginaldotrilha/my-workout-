// Safari/PWA fallback: replace failed local anatomy artwork with a real exercise photo.
(function(){
  const Q={
    'Barra fixa ou puxada frontal':'lat pulldown',
    'Supino reto com barra':'barbell bench press',
    'Supino inclinado com halteres':'incline dumbbell bench press',
    'Crucifixo na polia ou peck deck':'pec deck fly',
    'Tríceps testa':'lying triceps extension',
    'Tríceps na polia (corda)':'cable triceps pushdown',
    'Remada curvada com barra':'barbell bent over row',
    'Remada unilateral com halter':'one arm dumbbell row',
    'Rosca direta com barra':'barbell biceps curl',
    'Rosca martelo':'dumbbell hammer curl'
  };
  const cache={};
  function getUrl(img){const t=img?.thumbnails||{};return t.medium||t.small||img?.image||null}
  async function find(title){
    if(cache[title]!==undefined)return cache[title];
    try{
      const r=await fetch('https://wger.de/api/v2/exerciseinfo/?limit=20&language__code=en&name__search='+encodeURIComponent(Q[title]||title),{headers:{Accept:'application/json'}});
      if(!r.ok)throw 0;
      const d=await r.json(),rows=Array.isArray(d)?d:(d.results||[]),pics=[];
      rows.forEach(ex=>(ex.images||[]).forEach(img=>{const u=getUrl(img);if(u&&String(img.style)==='4'&&img.is_ai_generated!==true)pics.push({u,main:!!img.is_main})}));
      pics.sort((a,b)=>Number(b.main)-Number(a.main));
      return cache[title]=pics[0]?.u||null;
    }catch(e){return cache[title]=null}
  }
  function repair(){
    const list=document.getElementById('list');if(!list)return;
    list.querySelectorAll(':scope > .ex').forEach(card=>{
      const title=card.querySelector('.ex-h h3')?.textContent;if(!Q[title])return;
      const visual=card.querySelector('.real-photo-box');if(!visual||visual.dataset.photoFallback==='1')return;
      const local=visual.querySelector('.local-anatomy-art');if(!local)return;
      visual.dataset.photoFallback='1';
      find(title).then(url=>{
        if(!url||!document.body.contains(visual)){visual.dataset.photoFallback='';return}
        local.remove();
        const img=document.createElement('img');img.className='real-exercise-photo';img.src=url;img.alt='Demonstração real de '+title;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
        visual.insertBefore(img,visual.firstChild);
        const cap=visual.querySelector('.anatomy-credit');if(cap)cap.textContent='Foto real do exercício';
      });
    });
  }
  const base=window.renderList;if(typeof base==='function')window.renderList=function(){base.apply(this,arguments);requestAnimationFrame(repair)};
  const list=document.getElementById('list');if(list)new MutationObserver(()=>requestAnimationFrame(repair)).observe(list,{childList:true,subtree:true});
  requestAnimationFrame(repair);
})();
