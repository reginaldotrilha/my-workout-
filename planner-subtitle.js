// Keep the header recommendation in sync with the automatic weekly planner.
(function(){
  if(typeof renderList!=='function')return;
  const base=renderList;
  renderList=function(){
    base.apply(this,arguments);
    try{
      const today=document.querySelector('#weeklyPlanner .planner-day.today');
      const code=today?.querySelector('strong')?.textContent?.trim();
      const sub=document.getElementById('sub');
      if(!sub||!code)return;
      const recommendation=code==='DESC'?'Descanso':(code==='✓'?'Concluído':code);
      const clean=sub.textContent.replace(/\s*·\s*sugerido hoje:.*$/,'');
      sub.textContent=clean+' · sugerido hoje: '+recommendation;
    }catch(e){}
  };
})();
