(function(){
  const nativeFetch=window.fetch.bind(window);
  const parts=[
    'img/lat-pulldown-hd-v4/part1.txt',
    'img/lat-pulldown-hd-v4/part2.txt',
    'img/lat-pulldown-hd-v4/part3.txt',
    'img/lat-pulldown-hd-v4/part4.txt'
  ];
  let dataUrlPromise=null;
  function buildDataUrl(){
    if(!dataUrlPromise){
      dataUrlPromise=Promise.all(parts.map(p=>nativeFetch(p,{cache:'no-store'}).then(r=>{
        if(!r.ok) throw new Error('image part '+r.status);
        return r.text();
      }))).then(chunks=>'data:image/webp;base64,'+chunks.join(''));
    }
    return dataUrlPromise;
  }
  window.fetch=function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(/(?:^|\/)exercise-images\.json(?:\?|$)/.test(url)){
      return buildDataUrl().then(file=>new Response(JSON.stringify({
        'Barra fixa ou puxada frontal':{file}
      }),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}));
    }
    return nativeFetch(input,init);
  };
})();
