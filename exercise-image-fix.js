// Keeps exercise visuals stable and fixes the incline-machine press artwork.
(function(){
  const FIXED='img/machine_incline_press.svg';
  function apply(){
    document.querySelectorAll('#list > .ex').forEach(card=>{
      const title=card.querySelector('.ex-h h3')?.textContent?.trim();
      if(title==='Supino inclinado na máquina'){
        card.querySelectorAll('.real-exercise-photo,.catalog-photo-fallback img').forEach(img=>{
          if(!img.src.endsWith('/'+FIXED)&&!img.src.endsWith(FIXED))img.src=FIXED;
          img.alt='Demonstração do supino inclinado na máquina';
        });
      }
    });
  }
  if(typeof renderList==='function'){
    const base=renderList;renderList=function(){const r=base.apply(this,arguments);requestAnimationFrame(()=>setTimeout(apply,0));return r};
  }
  requestAnimationFrame(()=>setTimeout(apply,0));
  const st=document.createElement('style');
  st.textContent=`
    .real-photo-box,.catalog-photo-fallback{aspect-ratio:16/9;min-height:0;max-height:none;background:var(--card)}
    .real-photo-box .real-exercise-photo,.catalog-photo-fallback img{width:100%;height:100%;object-fit:contain;object-position:center;background:var(--card)}
    .real-photo-loading,.real-photo-empty{min-height:0;height:100%}
  `;
  document.head.appendChild(st);
})();
