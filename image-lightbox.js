// Full-screen exercise image viewer. Presentation-only: does not touch workout/history data.
(function(){
  'use strict';

  let overlay=null,viewer=null,stage=null,closeBtn=null,hint=null,lastFocus=null;

  function ensure(){
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.className='image-lightbox hidden';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Imagem ampliada do exercício');

    closeBtn=document.createElement('button');
    closeBtn.type='button';
    closeBtn.className='image-lightbox-close';
    closeBtn.setAttribute('aria-label','Fechar imagem ampliada');
    closeBtn.textContent='×';

    stage=document.createElement('div');
    stage.className='image-lightbox-stage';

    viewer=document.createElement('img');
    viewer.className='image-lightbox-img';
    viewer.alt='';
    viewer.draggable=false;

    hint=document.createElement('div');
    hint.className='image-lightbox-hint';
    hint.textContent='Toque na imagem para aproximar';

    stage.appendChild(viewer);
    overlay.append(closeBtn,stage,hint);
    document.body.appendChild(overlay);

    closeBtn.addEventListener('click',close);
    overlay.addEventListener('click',e=>{if(e.target===overlay||e.target===stage)close()});
    viewer.addEventListener('click',e=>{
      e.stopPropagation();
      const zoomed=overlay.classList.toggle('zoomed');
      hint.textContent=zoomed?'Toque novamente para ajustar':'Toque na imagem para aproximar';
      if(!zoomed){stage.scrollTop=0;stage.scrollLeft=0;}
    });
    return overlay;
  }

  function open(img){
    ensure();
    const src=img.currentSrc||img.src;
    if(!src)return;
    lastFocus=document.activeElement;
    viewer.src=src;
    viewer.alt=img.alt||'Imagem do exercício';
    overlay.classList.remove('hidden','zoomed');
    hint.textContent='Toque na imagem para aproximar';
    document.documentElement.classList.add('image-lightbox-open');
    document.body.classList.add('image-lightbox-open');
    stage.scrollTop=0;stage.scrollLeft=0;
    closeBtn.focus({preventScroll:true});
  }

  function close(){
    if(!overlay||overlay.classList.contains('hidden'))return;
    overlay.classList.add('hidden');
    overlay.classList.remove('zoomed');
    viewer.removeAttribute('src');
    document.documentElement.classList.remove('image-lightbox-open');
    document.body.classList.remove('image-lightbox-open');
    if(lastFocus&&typeof lastFocus.focus==='function')try{lastFocus.focus({preventScroll:true})}catch(e){}
  }

  function isExerciseImage(el){
    return !!(el&&el.matches&&el.matches('.real-exercise-photo,.catalog-photo-fallback img'));
  }

  document.addEventListener('click',e=>{
    const img=e.target&&e.target.closest?e.target.closest('.real-exercise-photo,.catalog-photo-fallback img'):null;
    if(!isExerciseImage(img))return;
    e.preventDefault();
    open(img);
  });

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){close();return}
    if((e.key==='Enter'||e.key===' ')&&isExerciseImage(e.target)){
      e.preventDefault();open(e.target);
    }
  });

  function decorate(){
    document.querySelectorAll('.real-exercise-photo,.catalog-photo-fallback img').forEach(img=>{
      if(img.dataset.zoomReady==='1')return;
      img.dataset.zoomReady='1';
      img.tabIndex=0;
      img.setAttribute('role','button');
      img.setAttribute('aria-label',(img.alt||'Imagem do exercício')+' — toque para ampliar');
      img.title='Toque para ampliar';
    });
  }

  const mo=new MutationObserver(decorate);
  if(document.body)mo.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();

  const style=document.createElement('style');
  style.textContent=`
    .real-exercise-photo,.catalog-photo-fallback img{cursor:zoom-in;-webkit-tap-highlight-color:transparent}
    .image-lightbox-open{overflow:hidden!important;overscroll-behavior:none}
    .image-lightbox{position:fixed;inset:0;z-index:5000;background:rgba(6,12,10,.94);display:grid;grid-template-rows:auto minmax(0,1fr) auto;padding:calc(10px + env(safe-area-inset-top)) 10px calc(12px + env(safe-area-inset-bottom));touch-action:manipulation}
    .image-lightbox.hidden{display:none!important}
    .image-lightbox-close{justify-self:end;width:46px;height:46px;border:1px solid rgba(255,255,255,.28);border-radius:999px;background:rgba(255,255,255,.12);color:#fff;font:300 34px/1 system-ui,-apple-system,sans-serif;display:grid;place-items:center;padding:0;margin:0 2px 8px;z-index:2}
    .image-lightbox-stage{min-width:0;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;display:flex;align-items:center;justify-content:center;padding:4px;overscroll-behavior:contain}
    .image-lightbox-img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border-radius:10px;background:#fff;box-shadow:0 12px 40px rgba(0,0,0,.32);cursor:zoom-in;touch-action:pan-x pan-y pinch-zoom;user-select:none;-webkit-user-select:none}
    .image-lightbox.zoomed .image-lightbox-stage{align-items:flex-start;justify-content:flex-start}
    .image-lightbox.zoomed .image-lightbox-img{max-width:none;max-height:none;width:180vw;height:auto;cursor:zoom-out;margin:auto}
    .image-lightbox-hint{justify-self:center;color:rgba(255,255,255,.82);font:600 12px Barlow,system-ui,sans-serif;padding:9px 12px 2px;text-align:center}
    @media(orientation:landscape){.image-lightbox.zoomed .image-lightbox-img{width:125vw}}
  `;
  document.head.appendChild(style);
})();
