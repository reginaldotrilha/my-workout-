// Profile-specific exercise image paths.
// Sandra uses img_women/ for files that exist there; other profiles keep img/.
(function(){
  const profile=window.MeuTreinoProfiles?.current?.()||'reginaldo';
  if(profile!=='sandra')return;

  const WOMEN_FILES=new Set([
    'bench_press.png','incline_press.png','pec_deck.png','skullcrusher.png','rope_pushdown.png',
    'lat_pulldown.png','barbell_row.png','one_arm_row.png','barbell_curl.png','hammer_curl.png'
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
})();
