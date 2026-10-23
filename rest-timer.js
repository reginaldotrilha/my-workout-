// Automatic rest timer between workout sets. Uses its own localStorage keys and does not alter workout data.
(function(){
  'use strict';

  const SETTINGS_KEY='treino_rest_timer_v1';
  const ACTIVE_KEY='treino_rest_timer_active_v1';
  const DEFAULT_SECONDS=90;
  const MIN_SECONDS=30;
  const MAX_SECONDS=300;

  let settings=loadJson(SETTINGS_KEY,{exercises:{}});
  if(!settings||typeof settings!=='object')settings={exercises:{}};
  if(!settings.exercises||typeof settings.exercises!=='object')settings.exercises={};

  let active=null;
  let tickId=null;
  let audioCtx=null;

  function loadJson(key,fallback){
    try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch(e){return fallback}
  }
  function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}catch(e){}}
  function saveActive(){
    try{
      if(active)localStorage.setItem(ACTIVE_KEY,JSON.stringify(active));
      else localStorage.removeItem(ACTIVE_KEY);
    }catch(e){}
  }
  function secondsFor(name){
    const n=Number(settings.exercises[name]);
    return Number.isFinite(n)&&n>=MIN_SECONDS&&n<=MAX_SECONDS?Math.round(n):DEFAULT_SECONDS;
  }
  function clampSeconds(value){
    const n=Math.round(Number(value));
    if(!Number.isFinite(n))return null;
    return Math.max(MIN_SECONDS,Math.min(MAX_SECONDS,n));
  }
  function ensureAudio(){
    try{
      const Ctx=window.AudioContext||window.webkitAudioContext;
      if(!Ctx)return;
      if(!audioCtx)audioCtx=new Ctx();
      if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
    }catch(e){}
  }
  function beep(){
    try{
      ensureAudio();
      if(!audioCtx)return;
      const now=audioCtx.currentTime;
      [0,0.22].forEach(offset=>{
        const osc=audioCtx.createOscillator();
        const gain=audioCtx.createGain();
        osc.type='sine';osc.frequency.value=880;
        gain.gain.setValueAtTime(0.0001,now+offset);
        gain.gain.exponentialRampToValueAtTime(0.22,now+offset+0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001,now+offset+0.16);
        osc.connect(gain);gain.connect(audioCtx.destination);
        osc.start(now+offset);osc.stop(now+offset+0.18);
      });
    }catch(e){}
  }
  function notifyReady(){
    beep();
    try{if(navigator.vibrate)navigator.vibrate([180,90,180])}catch(e){}
  }
  function formatTime(ms){
    const total=Math.max(0,Math.ceil(ms/1000));
    const m=Math.floor(total/60),s=total%60;
    return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  }
  function ensurePanel(){
    let panel=document.getElementById('restTimerPanel');
    if(panel)return panel;
    const tabs=document.getElementById('tabs');
    if(!tabs)return null;
    panel=document.createElement('div');
    panel.id='restTimerPanel';
    panel.className='rest-timer-panel hidden';
    panel.setAttribute('aria-live','polite');
    tabs.insertAdjacentElement('afterend',panel);
    return panel;
  }
  function button(label,cls,handler){
    const b=document.createElement('button');
    b.type='button';b.className=cls;b.textContent=label;b.addEventListener('click',handler);return b;
  }
  function renderPanel(){
    const panel=ensurePanel();
    if(!panel)return;
    if(!active){panel.classList.add('hidden');panel.innerHTML='';return}

    const remaining=active.endAt-Date.now();
    const ready=remaining<=0;
    panel.classList.remove('hidden');
    panel.classList.toggle('rest-ready',ready);
    panel.innerHTML='';

    const top=document.createElement('div');top.className='rest-timer-top';
    const copy=document.createElement('div');copy.className='rest-timer-copy';
    const title=document.createElement('strong');
    title.textContent=ready?'Descanso concluído':'Descanso antes da série '+active.nextSet;
    const sub=document.createElement('span');
    sub.textContent=active.exerciseName+(ready?' · pode começar':' · série '+active.completedSet+' concluída');
    copy.append(title,sub);

    const clock=document.createElement('div');clock.className='rest-timer-clock';
    clock.textContent=ready?'PRONTO':formatTime(remaining);
    top.append(copy,clock);panel.appendChild(top);

    const actions=document.createElement('div');actions.className='rest-timer-actions';
    if(!ready){
      actions.append(
        button('+30 s','rest-btn',()=>{active.endAt+=30000;saveActive();renderPanel()}),
        button(active.baseSeconds+' s','rest-btn rest-time-btn',editExerciseTime),
        button('Pular descanso','rest-btn rest-skip',()=>finishTimer(true))
      );
    }else{
      actions.appendChild(button('Iniciar série '+active.nextSet,'rest-btn rest-start',clearTimer));
    }
    panel.appendChild(actions);
  }
  function editExerciseTime(){
    if(!active)return;
    const current=secondsFor(active.exerciseName);
    const value=window.prompt('Tempo de descanso para '+active.exerciseName+' (30–300 segundos):',String(current));
    if(value===null)return;
    const seconds=clampSeconds(value);
    if(seconds===null){window.alert('Digite um tempo entre 30 e 300 segundos.');return}
    settings.exercises[active.exerciseName]=seconds;
    saveSettings();
    active.baseSeconds=seconds;
    active.endAt=Date.now()+seconds*1000;
    saveActive();renderPanel();
  }
  function startTimer(exerciseName,completedSet,nextSet){
    const seconds=secondsFor(exerciseName);
    const now=Date.now();
    active={exerciseName,completedSet,nextSet,startAt:now,endAt:now+seconds*1000,baseSeconds:seconds};
    saveActive();
    if(tickId)clearInterval(tickId);
    tickId=setInterval(tick,250);
    renderPanel();
  }
  function tick(){
    if(!active){if(tickId){clearInterval(tickId);tickId=null}return}
    if(active.endAt<=Date.now()){finishTimer(false);return}
    renderPanel();
  }
  function finishTimer(skipped){
    if(!active)return;
    if(tickId){clearInterval(tickId);tickId=null}
    active.endAt=Date.now();
    saveActive();renderPanel();
    if(!skipped)notifyReady();
  }
  function clearTimer(){
    if(tickId){clearInterval(tickId);tickId=null}
    active=null;saveActive();renderPanel();
  }
  function restoreTimer(){
    const saved=loadJson(ACTIVE_KEY,null);
    if(!saved||!saved.exerciseName||!saved.endAt)return;
    if(Date.now()-Number(saved.endAt)>10*60*1000){try{localStorage.removeItem(ACTIVE_KEY)}catch(e){};return}
    active=saved;
    if(active.endAt>Date.now())tickId=setInterval(tick,250);
    else active.endAt=Date.now();
    renderPanel();
  }

  // Capture the click before training.js re-renders the exercise card.
  document.addEventListener('click',function(event){
    const btn=event.target&&event.target.closest?event.target.closest('.chk'):null;
    if(!btn)return;
    ensureAudio();

    const wasDone=btn.getAttribute('aria-pressed')==='true';
    const row=btn.closest('.set');
    const card=btn.closest('.ex');
    if(!row||!card)return;

    const rows=Array.from(card.querySelectorAll('.set'));
    const completedSet=rows.indexOf(row)+1;
    const heading=card.querySelector('.ex-h h3')||card.querySelector('h3');
    const exerciseName=heading&&heading.textContent?heading.textContent.trim():'Exercício';

    if(wasDone){
      if(active&&active.exerciseName===exerciseName&&active.completedSet===completedSet)clearTimer();
      return;
    }

    const nextRow=rows.slice(completedSet).find(r=>{
      const check=r.querySelector('.chk');
      return check&&check.getAttribute('aria-pressed')!=='true';
    });
    if(!nextRow){
      if(active&&active.exerciseName===exerciseName)clearTimer();
      return;
    }

    const nextSet=rows.indexOf(nextRow)+1;
    setTimeout(()=>startTimer(exerciseName,completedSet,nextSet),0);
  },true);

  document.addEventListener('visibilitychange',()=>{
    if(active&&active.endAt<=Date.now())finishTimer(false);
  });

  const style=document.createElement('style');
  style.textContent=`
    .rest-timer-panel{margin:12px 0 16px;padding:14px 16px;border:1px solid rgba(31,95,74,.28);border-radius:16px;background:#f4f8f5;color:#18352b}
    .rest-timer-panel.hidden{display:none!important}
    .rest-timer-top{display:flex;align-items:center;justify-content:space-between;gap:14px}
    .rest-timer-copy{display:flex;flex-direction:column;min-width:0;gap:3px}
    .rest-timer-copy strong{font-size:16px;line-height:1.2}
    .rest-timer-copy span{font-size:13px;color:#607068;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .rest-timer-clock{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:28px;font-weight:800;letter-spacing:.02em;flex:none}
    .rest-timer-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    .rest-btn{min-height:42px;border:1px solid #c8d4ce;border-radius:11px;background:#fff;color:#24483a;font:inherit;font-weight:700;padding:8px 12px}
    .rest-btn:active{transform:scale(.98)}
    .rest-time-btn{min-width:72px}
    .rest-skip{margin-left:auto}
    .rest-start{background:#1f5f4a;color:#fff;border-color:#1f5f4a;margin-left:auto}
    .rest-ready{background:#e5f2eb;border-color:#1f5f4a}
    .rest-ready .rest-timer-clock{font-size:18px;color:#1f5f4a}
    @media(max-width:420px){.rest-timer-clock{font-size:25px}.rest-skip{margin-left:0}.rest-timer-actions .rest-btn{flex:1 1 auto}}
  `;
  document.head.appendChild(style);

  ensurePanel();
  restoreTimer();
})();
