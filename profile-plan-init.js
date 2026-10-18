// Apply profile-specific plan metadata only to fresh Sandra/Eric profiles.
(function(){
  try{
    if(typeof ACTIVE_PROFILE==='undefined'||ACTIVE_PROFILE==='reginaldo')return;
    if(!window.WORKOUT_PROFILE_META||!db?.training?.current)return;
    if((db.logs||[]).length)return;
    const p=db.training.current;
    if(p.id!=='plan_initial')return;
    const m=window.WORKOUT_PROFILE_META;
    p.name=m.planName||p.name;
    p.goal=m.goal||p.goal;
    p.reviewWeeks=Number(m.reviewWeeks)||p.reviewWeeks||8;
    localStorage.setItem(KEY,JSON.stringify(db));
  }catch(e){}
})();
