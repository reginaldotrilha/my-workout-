// HealthKit bridge adapter. The PWA cannot read HealthKit directly, but this module is ready for an iOS WKWebView/native wrapper.
(function(){
  const HEALTH_KEY='treino_healthkit_v1',ENERGY_KEY='treino_energy_balance_v1';
  let state={daily:{},lastSync:null};
  try{state=Object.assign(state,JSON.parse(localStorage.getItem(HEALTH_KEY)||'{}')||{})}catch(e){}
  state.daily=state.daily&&typeof state.daily==='object'?state.daily:{};
  const save=()=>{try{localStorage.setItem(HEALTH_KEY,JSON.stringify(state))}catch(e){}};
  const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
  const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
  function normalizeKey(raw){
    if(!raw)return'';
    const s=String(raw).slice(0,10),m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m)return `${Number(m[1])}-${Number(m[2])}-${Number(m[3])}`;
    const d=new Date(raw);return Number.isNaN(d.getTime())?'':dayKey(d.getTime());
  }
  function mirrorToEnergy(key,total){
    if(!(total>0))return;
    let energy={burn:{},targetDeficit:500};
    try{energy=Object.assign(energy,JSON.parse(localStorage.getItem(ENERGY_KEY)||'{}')||{})}catch(e){}
    energy.burn=energy.burn&&typeof energy.burn==='object'?energy.burn:{};energy.burn[key]=Math.round(total);
    try{localStorage.setItem(ENERGY_KEY,JSON.stringify(energy))}catch(e){}
  }
  function accept(payload){
    const rows=Array.isArray(payload)?payload:(Array.isArray(payload?.daily)?payload.daily:(payload?[payload]:[]));let added=0;
    rows.forEach(r=>{
      const key=normalizeKey(r.key||r.date||r.day);if(!key)return;
      const active=n(r.active??r.activeEnergy),resting=n(r.resting??r.restingEnergy??r.basal),total=n(r.total??r.totalEnergy)||(active+resting);
      if(!(total>0||active>0||resting>0))return;
      state.daily[key]={active:Math.round(active),resting:Math.round(resting),total:Math.round(total),exerciseMinutes:Math.round(n(r.exerciseMinutes)),steps:Math.round(n(r.steps)),source:'healthkit',updatedAt:Date.now()};
      if(total>0)mirrorToEnergy(key,total);added++;
    });
    if(added){state.lastSync=Date.now();save();try{renderComida()}catch(e){};try{toast('Apple Health sincronizado: '+added+' dia(s)')}catch(e){}}
    return added;
  }
  window.meuTreinoReceiveHealthData=accept;
  function nativeBridge(){
    if(window.HealthKitBridge&&typeof window.HealthKitBridge.syncDailyEnergy==='function')return{type:'object',sync:window.HealthKitBridge.syncDailyEnergy.bind(window.HealthKitBridge)};
    if(window.webkit?.messageHandlers?.healthKit?.postMessage)return{type:'webkit',sync:(req)=>window.webkit.messageHandlers.healthKit.postMessage(req)};
    return null;
  }
  function requestSync(){
    const bridge=nativeBridge();if(!bridge){toast('Sincronização automática exige a versão iOS com HealthKit');return}
    const to=new Date(),from=new Date(to.getFullYear(),to.getMonth(),to.getDate()-89,0,0,0),req={action:'syncDailyEnergy',from:from.toISOString(),to:to.toISOString()};
    try{
      const result=bridge.sync(req);
      if(result&&typeof result.then==='function')result.then(accept).catch(()=>toast('Não foi possível sincronizar o Apple Health'));
      else toast('Solicitando dados ao Apple Health…');
    }catch(e){toast('Não foi possível sincronizar o Apple Health')}
  }
  function buildCard(){
    const bridge=!!nativeBridge(),c=make('div','ex health-sync-card'),head=make('div','health-sync-head'),title=make('div');
    title.append(make('h3','','Apple Health'),make('div','hint',bridge?'HealthKit disponível neste dispositivo':'Preparado para sincronização HealthKit'));
    const badge=make('span','health-sync-badge '+(bridge?'ready':'web'),bridge?'Conectado':'Web');head.append(title,badge);c.appendChild(head);
    if(bridge){
      const b=make('button','ghost wide','Sincronizar agora');b.type='button';b.onclick=requestSync;c.appendChild(b);
      if(state.lastSync)c.appendChild(make('div','hint health-sync-last','Última sincronização: '+new Date(state.lastSync).toLocaleString('pt-BR')));
    }else c.appendChild(make('div','hint','No site instalado como PWA, o iOS não libera leitura direta do HealthKit. O histórico e a exportação já aceitam esses dados automaticamente assim que o app estiver dentro do wrapper iOS.'));
    return c;
  }
  function enhance(){
    const v=$('vComida');if(!v)return;v.querySelector('.health-sync-card')?.remove();const energy=v.querySelector('.energy-card');if(energy)energy.insertAdjacentElement('afterend',buildCard());
  }
  const css=make('style');css.textContent='.health-sync-card{margin-top:12px}.health-sync-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.health-sync-head h3{margin:0}.health-sync-badge{font-size:11px;font-weight:700;border-radius:999px;padding:5px 8px;background:var(--bg);color:var(--mute)}.health-sync-badge.ready{background:var(--acc);color:white}.health-sync-last{margin-top:7px}';document.head.appendChild(css);
  const base=window.renderComida;if(typeof base==='function')window.renderComida=function(){base.apply(this,arguments);enhance()};
  window.meuTreinoHealthSync={request:requestSync,receive:accept,getState:()=>JSON.parse(JSON.stringify(state))};
})();
