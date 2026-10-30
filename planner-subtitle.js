// Keep the header in sync with the sequence-first weekly planner.
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
      const status=code==='DESC'?'Descanso':code==='✓'?'Concluído':code==='PULOU'?'Pulado':code;
      const clean=sub.textContent.replace(/\s*·\s*(?:hoje|sugerido hoje):.*$/,'');
      sub.textContent=clean+' · hoje: '+status;
    }catch(e){}
  };
})();