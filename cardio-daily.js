// Manual daily cardio and steps; profile-local storage, separate from lifting and energy totals.
(function cardioModule(storage,doc,clock,notify){
  'use strict';
  const KEY='treino_cardio_daily_v1', HEALTH='treino_healthkit_v1';
  const TYPES={walk:'Caminhada na esteira',run:'Corrida na esteira',outdoor:'Caminhada ao ar livre',bike:'Bicicleta',elliptical:'Elíptico',other:'Outro cardio'};
  const dateKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const today=()=>dateKey(clock());
  function validDate(key){if(!/^\d{4}-\d{2}-\d{2}$/.test(key))return false;const [y,m,d]=key.split('-').map(Number);return dateKey(new Date(y,m-1,d))===key&&key<=today();}
  function read(){const raw=storage.getItem(KEY);if(raw===null)return {version:1,daily:{}};const s=JSON.parse(raw);if(s?.version!==1||!s.daily||typeof s.daily!=='object'||Array.isArray(s.daily))throw Error('Histórico de cardio inválido; não foi sobrescrito.');return s;}
  function healthSteps(key){try{const h=JSON.parse(storage.getItem(HEALTH)||'{}');const k=key.split('-').map(Number).join('-');const x=h.daily?.[k]?.steps??h.daily?.[key]?.steps;return Number.isInteger(x)&&x>0?x:null;}catch(e){return null;}}
  function value(raw,label,min,max,integer=false){if(raw===null||raw===undefined||String(raw).trim()==='')return null;const x=Number(String(raw).replace(',','.'));if(!Number.isFinite(x)||x<min||x>max||(integer&&!Number.isInteger(x)))throw Error('Confira '+label+'.');return x;}
  function record(key,input){if(!validDate(key))throw Error('Escolha uma data válida, até hoje.');const minutes=value(input.minutes,'a duração (0–600 min)',0,600,true);const steps=value(input.steps,'os passos (0–100.000)',0,100000,true);if(minutes===null&&steps===null)throw Error('Informe a duração ou os passos.');const type=minutes>0?input.type:null;if(minutes>0&&!Object.hasOwn(TYPES,type))throw Error('Escolha a atividade.');const treadmill=type==='walk'||type==='run';const row={type,minutes,steps,speed:treadmill?value(input.speed,'a velocidade (0,1–30 km/h)',0.1,30):null,incline:treadmill?value(input.incline,'a inclinação (0–40%)',0,40):null,hr:minutes>0?value(input.hr,'a frequência cardíaca (30–250 bpm)',30,250,true):null,updatedAt:clock().getTime()};
    const state=read();state.daily[key]=row;const json=JSON.stringify(state);storage.setItem(KEY,json);if(storage.getItem(KEY)!==json)throw Error('Não foi possível confirmar o registro.');return row;
  }
  function week(offset=0){const date=clock(),monday=new Date(date.getFullYear(),date.getMonth(),date.getDate()-(date.getDay()+6)%7+offset*7);return Array.from({length:7},(_,i)=>dateKey(new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+i))).filter(k=>k<=today());}
  function stats(keys,state=read()){let minutes=0,steps=0,stepDays=0,cardioDays=0,hrSum=0,hrMinutes=0;for(const k of keys){const r=state.daily[k];const m=Number(r?.minutes)||0;if(m>0){minutes+=m;cardioDays++;if(Number(r.hr)>0){hrSum+=m*r.hr;hrMinutes+=m;}}const v=r?.steps??healthSteps(k);if(Number.isFinite(v)&&v>=0){steps+=v;stepDays++;}}return{minutes,cardioDays,stepDays,avgSteps:stepDays?Math.round(steps/stepDays):null,avgHr:hrMinutes?Math.round(hrSum/hrMinutes):null};}
  if(!doc)return {record,read,stats,week,validDate};
  const make=(tag,cls,txt)=>{const el=doc.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=txt;return el;};
  const finish=doc.getElementById('finish');if(!finish||doc.getElementById('cardioDaily'))return;
  const panel=make('details','ex cardio-daily');panel.id='cardioDaily';
  const summary=make('summary','cardio-summary');const label=make('strong','','Cardio e passos');const mini=make('span','cardio-mini','');summary.append(label,mini);panel.append(summary);
  const content=make('div','cardio-content');
  const weekly=make('div','cardio-week');content.append(weekly);
  const form=make('form','cardio-form');const grid=make('div','cardio-grid');const fields={};
  function field(id,label,type,placeholder,attrs={}){const wrap=make('label','cardio-field');wrap.append(make('span','',label));const e=make(type==='select'?'select':'input');if(type!=='select')e.type=type;e.name=id;e.id='cardio-'+id;if(placeholder)e.placeholder=placeholder;for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);fields[id]=e;wrap.append(e);grid.append(wrap);return wrap;}
  const dateWrap=field('date','Data','date','',{required:'',max:today()});dateWrap.classList.add('cardio-wide');
  const typeWrap=field('type','Atividade','select');typeWrap.classList.add('cardio-wide');for(const [k,v] of Object.entries(TYPES)){const o=make('option','',v);o.value=k;fields.type.append(o);}
  field('minutes','Duração (min)','number','25',{min:'0',max:'600',step:'1',inputmode:'numeric'});
  field('steps','Passos do dia','number','8000',{min:'0',max:'100000',step:'1',inputmode:'numeric'});
  const speedWrap=field('speed','Velocidade (km/h)','number','5,5',{min:'0.1',max:'30',step:'0.1',inputmode:'decimal'});
  const inclineWrap=field('incline','Inclinação (%)','number','5',{min:'0',max:'40',step:'0.1',inputmode:'decimal'});
  field('hr','FC média (bpm)','number','Opcional',{min:'30',max:'250',step:'1',inputmode:'numeric'});
  const stateNote=make('p','hint cardio-note','');const save=make('button','primary cardio-save','Salvar cardio / passos');save.type='submit';
  const msg=make('p','hint cardio-message','');msg.setAttribute('role','status');
  form.append(grid,stateNote,save,msg);content.append(form);
  const history=make('details','cardio-history');history.append(make('summary','','Histórico de cardio e passos'));const rows=make('div');history.append(rows);content.append(history);
  content.append(make('p','hint cardio-note','Use os totais do Apple Fitness. Os passos da esteira já contam no total diário; o cardio não soma calorias ao balanço energético.'));
  panel.append(content);finish.insertAdjacentElement('beforebegin',panel);
  const fmt=x=>x===null?'—':x.toLocaleString('pt-BR');
  function syncType(){const t=fields.type.value;speedWrap.hidden=inclineWrap.hidden=!(t==='walk'||t==='run');}
  function refresh(){try{const state=read(),w=stats(week(),state),p=stats(week(-1),state);mini.textContent=w.minutes+' / 100 min · '+(w.avgSteps===null?'passos —':fmt(w.avgSteps)+' passos/dia');weekly.replaceChildren(make('strong','','Semana atual · '+w.minutes+' / 100 min'),make('div','hint',w.cardioDays+' dia(s) com cardio · anterior: '+p.minutes+' min'),make('div','hint','Passos: '+fmt(w.avgSteps)+' / 8.000 por dia'+(w.stepDays?' ('+w.stepDays+'/'+week().length+' dias registrados)':' · sem dados')+' · FC média: '+(w.avgHr===null?'—':w.avgHr+' bpm')));
    rows.replaceChildren();const entries=Object.entries(state.daily).sort((a,b)=>b[0].localeCompare(a[0]));if(!entries.length)rows.append(make('p','hint','Nenhum registro ainda.'));
    for(const [k,r] of entries.slice(0,30)){const line=make('button','ghost cardio-history-row');line.type='button';const values=[k.split('-').reverse().join('/'),r.minutes>0?TYPES[r.type]||'Cardio':'',r.minutes!==null?r.minutes+' min':'',r.speed!==null?r.speed+' km/h':'',r.incline!==null?r.incline+'%':'',r.hr!==null?r.hr+' bpm':'',r.steps!==null?fmt(r.steps)+' passos':''].filter(Boolean);line.textContent=values.join(' · ');line.onclick=()=>{load(k);panel.open=true;form.scrollIntoView({block:'nearest'});};rows.append(line);}
  }catch(e){mini.textContent='Histórico indisponível';msg.textContent=e.message;}}
  function load(key){try{const r=read().daily[key];fields.date.value=key;fields.type.value=r?.type&&Object.hasOwn(TYPES,r.type)?r.type:'walk';for(const k of ['minutes','steps','speed','incline','hr'])fields[k].value=r?.[k]??'';const hs=healthSteps(key);stateNote.textContent=(r?'Registro existente: salvar atualiza este dia. ':'Um registro diário; preencha apenas o que realizou. ')+(hs!==null?'Apple Health disponível: '+fmt(hs)+' passos (usados se o campo ficar vazio).':'Passos podem ser informados manualmente.');msg.textContent='';syncType();}catch(e){msg.textContent=e.message;}}
  fields.date.onchange=()=>{if(validDate(fields.date.value))load(fields.date.value);};fields.type.onchange=syncType;
  form.onsubmit=e=>{e.preventDefault();try{const input=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value]));const old=read().daily[input.date];if(old&&!(old.minutes===null&&old.steps===null)&&!doc.defaultView.confirm('Atualizar o registro de cardio/passos de '+input.date.split('-').reverse().join('/')+'?'))return;record(input.date,input);load(input.date);refresh();msg.textContent='Registro salvo.';notify('Cardio / passos salvos');}catch(e){msg.textContent=e.message||'Não foi possível salvar.';}};
  panel.addEventListener('toggle',()=>{if(panel.open){fields.date.max=today();refresh();}});
  const css=make('style');css.textContent='.cardio-daily{padding:11px 12px}.cardio-summary{cursor:pointer;font-size:16px;color:var(--ink)}.cardio-mini{display:block;font-size:12px;color:var(--mute);margin-left:17px;margin-top:3px}.cardio-content{margin-top:10px}.cardio-week{background:var(--ok);padding:9px;border-radius:9px;margin-bottom:9px}.cardio-week .hint{font-size:12px;margin:2px 0}.cardio-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.cardio-wide{grid-column:1/-1}.cardio-field{min-width:0;display:grid;gap:3px}.cardio-field[hidden]{display:none!important}.cardio-field span{font-size:12px;color:var(--mute)}.cardio-field input,.cardio-field select{min-width:0;width:100%;padding:9px;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:8px;font:16px Barlow,system-ui,sans-serif}.cardio-save{font-size:18px;padding:10px;margin:5px 0}.cardio-note,.cardio-message{font-size:12px;margin:6px 0}.cardio-message:empty{display:none}.cardio-history summary{cursor:pointer;font-weight:600;color:var(--acc);padding:7px 0}.cardio-history-row{width:100%;display:block;text-align:left;font-size:12px;margin:5px 0;padding:8px}.cardio-daily[hidden]{display:none!important}';doc.head.append(css);
  load(today());refresh();
  // No wrapping of finish, no change to workout logs or energy accounting.
  // Keep the card visible in the workout tab, including after finishing a session.
  return {refresh};
})(localStorage,document,()=>new Date(),message=>{try{toast(message)}catch(e){}});
