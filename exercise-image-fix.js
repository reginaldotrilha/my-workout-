// Keeps exercise visuals stable without forcing exercise-specific artwork.
(function(){
  const st=document.createElement('style');
  st.textContent=`
    .real-photo-box,.catalog-photo-fallback{min-height:0;max-height:none;background:var(--card)}
    .real-photo-box .real-exercise-photo,.catalog-photo-fallback img{width:100%;height:100%;object-fit:contain;object-position:center;background:var(--card)}
    .real-photo-loading,.real-photo-empty{min-height:0;height:100%}
  `;
  document.head.appendChild(st);
})();
