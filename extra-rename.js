// Rename extra exercises added only for the current workout session.
(function(){
  const FLEX_KEY='treino_workout_flex_v1';

  function readFlex(){
    try{return JSON.parse(localStorage.getItem(FLEX_KEY)||'{}')||{}}
    catch(e){return{}}
  }
  function writeFlex(x){try{localStorage.setItem(FLEX_KEY,JSON.stringify(x))}catch(e){}}
  function sessionKey(){return (db.training?.current?.id||'plan')+':'+day}

  function enhanceExtraNames(){
    const box=$('list');if(!box)return;
    const flex=readFlex(),s=flex.sessions?.[sessionKey()];
    if(!s||!Array.isArray(s.extras)||!s.extras.length)return;

    const extraActions=[...box.querySelectorAll('.session-ex-actions')].filter(a=>
      [...a.querySelectorAll('.session-tag')].some(t=>t.textContent.trim()==='Extra de hoje')
    );

    extraActions.forEach((actions,idx)=>{
      if(actions.querySelector('.rename-extra'))return;
      const extra=s.extras[idx];if(!extra)return;
      const b=document.createElement('button');
      b.className='ghost small rename-extra';
      b.textContent='Editar nome';
      b.onclick=()=>{
        const name=prompt('Nome do exercício',extra.name||'');
        if(name===null)return;
        const clean=name.trim().slice(0,70);
        if(!clean){toast('Digite um nome para o exercício');return}
        const latest=readFlex(),live=latest.sessions?.[sessionKey()];
        if(!live?.extras?.[idx])return;
        // Keep the exercise ID stable so entered sets/history are not lost.
        live.extras[idx].name=clean;
        writeFlex(latest);
        render();
        toast('Nome atualizado');
      };
      const remove=actions.querySelector('button');
      if(remove)actions.insertBefore(b,remove);else actions.prepend(b);
    });
  }

  const base=window.renderList;
  if(typeof base==='function')window.renderList=function(){
    base.apply(this,arguments);
    requestAnimationFrame(enhanceExtraNames);
  };
})();
