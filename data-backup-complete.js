// Complete, read-only export of the active profile. Does not migrate or modify stored data.
(function(){
  const MAIN_KEY='treino_v1';
  const isAppKey=k=>k.startsWith('treino_')||k.startsWith('meu_treino_');

  function snapshot(){
    // profiles.js virtualizes localStorage.getItem/key, isolating Sandra and Eric.
    const raw=localStorage.getItem(MAIN_KEY);
    if(!raw)throw new Error('Dados principais não encontrados neste perfil.');
    const data=JSON.parse(raw);
    if(!data||!Array.isArray(data.logs)||!Array.isArray(data.meals)||
       !Array.isArray(data.body)||!Array.isArray(data.waist)){
      throw new Error('O histórico principal não passou na validação.');
    }
    const extra={};
    const keys=new Set();
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key&&key!==MAIN_KEY&&isAppKey(key))keys.add(key);
    }
    for(const key of keys){
      const value=localStorage.getItem(key);
      if(value!==null)extra[key]=value;
    }
    const profile=window.MeuTreinoProfiles?.current?.()||'reginaldo';
    return {
      format:'meu-treino-backup-v2',
      exportedAt:new Date().toISOString(),
      profile,
      data,
      storage:extra,
      manifest:{
        logs:data.logs.length,
        meals:data.meals.length,
        weights:data.body.length,
        waists:data.waist.length,
        measures:Array.isArray(data.measures)?data.measures.length:0,
        includedStorageKeys:Object.keys(extra).sort()
      }
    };
  }

  function exportComplete(){
    try{
      const backup=snapshot();
      const text=JSON.stringify(backup,null,2);
      // Validate the downloaded payload before offering it to the user.
      const check=JSON.parse(text);
      if(check.data.logs.length!==backup.manifest.logs||
         check.data.meals.length!==backup.manifest.meals)throw new Error('Contagem dos dados não confere.');
      const blob=new Blob([text],{type:'application/json;charset=utf-8'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      const date=new Date().toISOString().slice(0,10);
      a.href=url;
      a.download='meu-treino-backup-completo-'+backup.profile+'-'+date+'.json';
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),10000);
      toast('Backup completo gerado. Guarde o arquivo fora do app.');
    }catch(err){
      console.error('Falha ao exportar backup completo',err);
      toast('Backup não gerado: confira o histórico deste perfil.');
    }
  }

  function enhance(){
    const root=document.getElementById('vProg');if(!root)return;
    const section=[...root.querySelectorAll('.ex')].find(x=>
      x.querySelector(':scope > h3')?.textContent.trim()==='Segurança dos dados');
    if(!section)return;
    const button=[...section.querySelectorAll('button')].find(x=>
      x.textContent.includes('Exportar'));
    if(!button||button.classList.contains('backup-complete-v2'))return;
    button.classList.add('backup-complete-v2');
    button.textContent='Exportar backup completo';
    button.onclick=exportComplete;
    const hint=section.querySelector('.hint');
    if(hint)hint.textContent='Inclui histórico, planos, alimentação e dados adicionais do perfil atual. Não altera os registros.';
  }

  const previous=window.renderProg;
  if(typeof previous==='function'){
    window.renderProg=function(){
      const result=previous.apply(this,arguments);
      enhance();
      return result;
    };
  }
})();
