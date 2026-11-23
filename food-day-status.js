// Meal-log completeness by local calendar day. Metadata only: never changes historical meals.
(function(){
  const KEY='treino_food_day_status_v1';
  let days={};
  try{
    const stored=JSON.parse(localStorage.getItem(KEY)||'{}');
    if(stored&&stored.version===1&&stored.days&&typeof stored.days==='object'&&!Array.isArray(stored.days))days=stored.days;
  }catch(e){}

  function fingerprint(entries){
    // A completed day becomes unconfirmed when a meal is added, edited or removed.
    return JSON.stringify((entries||[]).map(m=>[
      m.t??null,m.m??'',m.n??'',m.k??null,m.p??null,m.c??null,m.g??null,
      m.foodId??'',m.amount??null,m.unit??''
    ]).sort((a,b)=>Number(a[0])-Number(b[0])||String(a[2]).localeCompare(String(b[2]))));
  }
  function get(key,entries){
    if(!Array.isArray(entries)||!entries.length)return'missing';
    const rec=days[key];
    if(!rec||!['complete','partial'].includes(rec.status))return'unreviewed';
    if(rec.status==='complete'&&rec.fingerprint!==fingerprint(entries))return'unreviewed';
    return rec.status;
  }
  function set(key,status,entries){
    if(!/^\d{4}-\d{1,2}-\d{1,2}$/.test(key)||!['complete','partial','unreviewed'].includes(status))return false;
    if(status!=='unreviewed'&&(!Array.isArray(entries)||!entries.length))return false;
    const previous=days[key];
    if(status==='unreviewed')delete days[key];
    else days[key]={status,fingerprint:fingerprint(entries),confirmedAt:Date.now()};
    try{localStorage.setItem(KEY,JSON.stringify({version:1,days}));return true}
    catch(e){
      if(previous===undefined)delete days[key];else days[key]=previous;
      return false;
    }
  }
  window.MeuTreinoFoodDayStatus={get,set};
})();
