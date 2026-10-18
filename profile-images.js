// Profile-specific exercise image paths.
// Sandra uses img_women/ for files that exist there; other profiles keep img/.
(function(){
  const profile=window.MeuTreinoProfiles?.current?.()||'reginaldo';
  if(profile!=='sandra')return;

  const WOMEN_FILES=new Set([
    'bench_press.png','incline_press.png','pec_deck.png','rope_pushdown.png',
    'lat_pulldown.png','barbell_row.png','barbell_curl.png','overhead_press.png',
    'lateral_raise.png','leg_press.png'
  ]);

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const response=await nativeFetch(input,init);
    try{
      const raw=typeof input==='string'?input:(input&&input.url)||'';
      const url=new URL(raw,location.href);
      if(url.pathname.endsWith('/exercise-images.json')){
        const data=await response.clone().json();
        Object.values(data||{}).forEach(item=>{
          if(!item||typeof item.file!=='string')return;
          const m=item.file.match(/^img\/(.+)$/);
          if(m&&WOMEN_FILES.has(m[1]))item.file='img_women/'+m[1];
        });
        return new Response(JSON.stringify(data),{
          status:response.status,
          statusText:response.statusText,
          headers:{'Content-Type':'application/json'}
        });
      }
    }catch(e){}
    return response;
  };

  // The first women's pack was exported on a 4:3 white canvas with the
  // exercise photo centered inside it. Crop that canvas only at display time
  // so the photo fills the exercise card without modifying the uploaded files.
  const style=document.createElement('style');
  style.textContent=`
    .women-pack1-box{aspect-ratio:3/4;background:#fff}
    .women-pack1-box .real-exercise-photo{
      width:100%;height:100%;object-fit:cover;
      transform:scale(2);transform-origin:50% 50%;
    }
  `;
  document.head.appendChild(style);

  function fixWomenImages(root=document){
    root.querySelectorAll?.('img.real-exercise-photo').forEach(img=>{
      let file='';
      try{file=new URL(img.src,location.href).pathname.split('/').pop()||''}catch(e){}
      if(!img.src.includes('/img_women/')||!WOMEN_FILES.has(file))return;
      img.parentElement?.classList.add('women-pack1-box');
    });
  }
  const observer=new MutationObserver(()=>fixWomenImages());
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{
      fixWomenImages();observer.observe(document.body,{childList:true,subtree:true});
    },{once:true});
  }else{
    fixWomenImages();observer.observe(document.body,{childList:true,subtree:true});
  }
})();
