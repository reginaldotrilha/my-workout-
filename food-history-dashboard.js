// Full food history + export. Keeps meal storage untouched and replaces only the 7-day summary UI.
(function(){
  const UI_KEY='treino_food_history_ui_v2';
  const ENERGY_KEY='treino_energy_balance_v1';
  const HEALTH_KEY='treino_healthkit_v1';
  let ui={range:'30'};
  try{ui=Object.assign(ui,JSON.parse(localStorage.getItem(UI_KEY)||'{}')||{})}catch(e){}
  const saveUi=()=>{try{localStorage.setItem(UI_KEY,JSON.stringify(ui))}catch(e){}};
  const fmt=n=>Math.round(Number(n)||0).toLocaleString('pt-BR');
  const r1=n=>Math.round((Number(n)||0)*10)/10;
  const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
  const escCsv=v=>'"'+String(v??'').replace(/"/g,'""')+'"';


  const dayStatus=window.MeuTreinoFoodDayStatus;
  function statusFor(d){return d?dayStatus?.get(d.key,d.a)||'unreviewed':'missing'}
  const statusNames={complete:'Completo',partial:'Parcial',unreviewed:'Pendente',missing:'Sem registro'};
  function localTime(key){const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d,12).getTime()}
  function readJson(key,fallback){try{return Object.assign(fallback,JSON.parse(localStorage.getItem(key)||'{}')||{})}catch(e){return fallback}}
  function foodDays(){
    const map={};
    (db.meals||[]).forEach(m=>{
      const key=dayKey(m.t);
      if(!map[key])map[key]={key,t:m.t,a:[]};
      map[key].a.push(m);
      if(m.t>map[key].t)map[key].t=m.t;
    });
    return Object.values(map).map(d=>Object.assign(d,sumOf(d.a))).sort((a,b)=>b.t-a.t);
  }
  function healthFor(key){
    const health=readJson(HEALTH_KEY,{daily:{}}),energy=readJson(ENERGY_KEY,{burn:{}});
    const h=health.daily&&health.daily[key]?health.daily[key]:{};
    const total=Number(h.total)>0?Number(h.total):(Number(energy.burn&&energy.burn[key])>0?Number(energy.burn[key]):0);
    return{active:Number(h.active)||0,resting:Number(h.resting)||0,total,source:h.source||((energy.burn&&energy.burn[key])?'manual':'')};
  }
  function labelDate(t){
    try{return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(t)).replace('.','')}catch(e){return dateBR(t)}
  }
  function selectedDays(all){
    if(ui.range==='all')return all;
    const n=Number(ui.range)||30;
    const start=new Date();start.setHours(0,0,0,0);start.setDate(start.getDate()-n+1);
    return all.filter(d=>d.t>=start.getTime());
  }
  function foodIssues(entries){
    const issues=[];
    (entries||[]).forEach(m=>{
      const k=Number(m.k)||0,p=Number(m.p)||0,c=Number(m.c)||0,g=Number(m.g)||0;
      if(k>0&&(4*p+4*c+9*g)>k*1.35+30)issues.push(m.n||'Alimento');
      else if(k>=150&&p===0&&c===0&&g===0)issues.push(m.n||'Alimento');
    });
    return issues;
  }
  function calendarRows(all){
    if(!all.length)return[];
    const map=new Map(all.map(d=>[d.key,d]));
    const first=new Date(Math.min(...all.map(d=>d.t)));first.setHours(12,0,0,0);
    const last=new Date();last.setHours(12,0,0,0);
    const out=[];
    for(const date=new Date(first);date<=last;date.setDate(date.getDate()+1)){
      const key=dayKey(date.getTime());out.push({key,food:map.get(key)||null});
    }
    return out;
  }
  function summary(days){
    const today=dayKey(Date.now());
    const completed=days.filter(d=>d.key!==today&&statusFor(d)==='complete');
    const withBurn=completed.map(d=>({d,h:healthFor(d.key)})).filter(x=>x.h.total>0);
    const avg=field=>completed.length?completed.reduce((s,d)=>s+(Number(d[field])||0),0)/completed.length:null;
    const out={completeDays:completed.length,avgK:avg('k'),avgP:avg('p'),burnDays:withBurn.length,avgBurn:null,avgBalance:null,totalBalance:null};
    if(withBurn.length){
      out.avgBurn=withBurn.reduce((s,x)=>s+x.h.total,0)/withBurn.length;
      out.totalBalance=withBurn.reduce((s,x)=>s+(x.h.total-x.d.k),0);
      out.avgBalance=out.totalBalance/withBurn.length;
    }
    return out;
  }
  function rangeButtons(card){
    const wrap=make('div','history-range');
    [['7','7 dias'],['30','30 dias'],['90','90 dias'],['all','Tudo']].forEach(([value,label])=>{
      const b=make('button','ghost history-filter'+(ui.range===value?' active':''),label);
      b.type='button';b.onclick=()=>{ui.range=value;saveUi();renderComida()};wrap.appendChild(b);
    });
    card.appendChild(wrap);
  }
  function exportCsv(all){
    if(!all.length){toast('Não há dias para exportar');return}
    const rows=[['Data','Calorias ingeridas','Proteina (g)','Carboidrato (g)','Gordura (g)','Calorias ativas','Calorias em repouso','Gasto total','Saldo estimado (gasto - consumo)','Fonte do gasto','Situação alimentação']];
    calendarRows(all).forEach(({key,food:d})=>{
      const h=healthFor(key),hasFood=!!d,status=statusFor(d),bal=status==='complete'&&key!==dayKey(Date.now())&&h.total?h.total-d.k:'';
      rows.push([key,hasFood?Math.round(d.k):'',hasFood?r1(d.p):'',hasFood?r1(d.c):'',
        hasFood?r1(d.g):'',h.active||'',h.resting||'',h.total||'',
        bal===''?'':Math.round(bal),h.source||'',statusNames[status]]);
    });
    const csv='\uFEFF'+rows.map(r=>r.map(escCsv).join(';')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='meu-treino-historico-'+dayKey(Date.now())+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Histórico exportado');
  }
  function removeLegacyCard(v){
    Array.from(v.children).forEach(node=>{
      const h=node.querySelector&&node.querySelector(':scope > h3');
      if(h&&h.textContent.trim()==='Dias anteriores')node.remove();
    });
  }
  function inSelectedRange(key){
    if(ui.range==='all')return true;
    const n=Number(ui.range)||30,start=new Date();
    start.setHours(12,0,0,0);start.setDate(start.getDate()-n+1);
    return localTime(key)>=start.getTime();
  }
  function buildCard(){
    const all=foodDays(),shown=selectedDays(all),card=make('div','ex food-history-card');
    const head=make('div','history-head'),titles=make('div');titles.append(make('h3','','Histórico de alimentação'),make('div','hint',all.length+' dia(s) com alimentação registrada'));
    const exp=make('button','ghost history-export','Exportar CSV');exp.type='button';exp.onclick=()=>exportCsv(all);head.append(titles,exp);card.appendChild(head);
    rangeButtons(card);
    const missing=calendarRows(all).filter(x=>!x.food&&inSelectedRange(x.key));
    const complete=shown.filter(x=>statusFor(x)==='complete').length;
    const partial=shown.filter(x=>statusFor(x)==='partial').length;
    const pending=shown.filter(x=>statusFor(x)==='unreviewed').length;
    card.appendChild(make('div','hint history-completeness',
      complete+' dia(s) completo(s) · '+partial+' parcial(is) · '+pending+
      ' pendente(s) · '+missing.length+' sem registro. Confirme somente dias com todas as refeições anotadas.'));
    if(ui.range!=='all'&&shown.length<Number(ui.range))card.appendChild(make('div','hint','Somente '+shown.length+' de '+ui.range+' dias têm alimentação registrada.'));
    const s=summary(shown);
    if(s){
      const stats=make('div','history-stats');
      const add=(label,value,sub)=>{const x=make('div','history-stat');x.append(make('span','',label),make('b','',value),make('small','',sub||''));stats.appendChild(x)};
      add('Média consumo',s.avgK===null?'—':fmt(s.avgK)+' kcal',s.completeDays+' dia(s) encerrados e completos');
      add('Média proteína',s.avgP===null?'—':fmt(s.avgP)+' g','somente dias completos');
      if(s.burnDays>=3)add('Saldo estimado',(s.avgBalance>=0?'−':'+')+fmt(Math.abs(s.avgBalance))+' kcal',s.burnDays+' dia(s) encerrados e completos com gasto');
      else add('Saldo estimado','—','Somente '+s.burnDays+' dia(s) com gasto; dados insuficientes');
      card.appendChild(stats);
    }
    const list=make('div','history-list');
    if(!shown.length)list.appendChild(make('div','hint','Nenhum dia registrado ainda.'));
    shown.forEach(d=>{
      const h=healthFor(d.key),row=make('div','history-day');
      const main=make('div','history-day-main'),left=make('div'),right=make('div','history-day-kcal');
      left.append(make('b','',labelDate(d.t)),make('small','',`P ${fmt(d.p)} · C ${fmt(d.c)} · G ${fmt(d.g)}`));
      right.append(make('b','',fmt(d.k)+' kcal'));
      if(h.total&&statusFor(d)==='complete'&&d.key!==dayKey(Date.now())){
        const bal=h.total-d.k;
        right.append(make('small','','Gasto '+fmt(h.total)+' · Saldo estimado '+
          (bal>=0?'−':'+')+fmt(Math.abs(bal))));
      }else if(h.total)right.append(make('small','','Gasto '+fmt(h.total)+' · saldo não confirmado'));
      else right.append(make('small','','Gasto não informado'));
      main.append(left,right);row.appendChild(main);
      const label=make('label','history-status-control');
      label.appendChild(make('span','','Situação do registro'));
      const selector=make('select','history-status-select');
      selector.setAttribute('aria-label','Situação alimentar em '+labelDate(d.t));
      [['unreviewed','Pendente'],['complete','Completo'],['partial','Parcial']].forEach(([val,desc])=>{
        const opt=make('option','',desc);opt.value=val;selector.appendChild(opt);
      });
      const current=statusFor(d);selector.value=current;
      selector.onchange=()=>{
        if(!dayStatus?.set(d.key,selector.value,d.a)){
          toast('Não foi possível salvar a situação deste dia.');
          selector.value=current;return;
        }
        renderComida();
      };
      label.appendChild(selector);row.appendChild(label);
      if(current==='unreviewed')row.appendChild(make('div','hint','Pendente: confirme se anotou todas as refeições.'));
      const issues=foodIssues(d.a);
      if(issues.length)row.appendChild(make('div','hint food-quality-warning','⚠ Confira os macros de '+issues.slice(0,2).join(', ')+(issues.length>2?' e outros':'')+'.'));
      list.appendChild(row);
    });
    if(missing.length){
      const box=make('details','history-missing-days'),sum=make('summary','',
        missing.length+' dia(s) sem alimentação registrada');
      box.appendChild(sum);
      missing.slice().reverse().forEach(x=>box.appendChild(make('div','history-missing-day',
        labelDate(localTime(x.key))+' · Sem registro (não contado como zero kcal)')));
      list.appendChild(box);
    }
    card.appendChild(list);
    if(ui.range!=='all'&&all.length>shown.length){
      const more=make('button','ghost wide history-more','Ver todos os '+all.length+' dias');more.type='button';more.onclick=()=>{ui.range='all';saveUi();renderComida()};card.appendChild(more);
    }
    const note=make('div','hint history-note','Apenas dias encerrados confirmados como completos entram no saldo. Dias sem alimentação ficam vazios no CSV; registros antigos não são alterados.');card.appendChild(note);
    return card;
  }
  function enhance(){
    const v=$('vComida');if(!v)return;removeLegacyCard(v);v.querySelector('.food-history-card')?.remove();v.appendChild(buildCard());
  }
  const css=make('style');css.textContent=`
    .history-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.history-head h3{margin:0}.history-export{white-space:nowrap}
    .history-range{display:flex;gap:6px;overflow:auto;padding:10px 0 2px}.history-filter{padding:7px 10px;white-space:nowrap}.history-filter.active{background:var(--acc);color:white;border-color:var(--acc)}
    .history-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:10px 0}.history-stat{background:var(--bg);border-radius:10px;padding:9px;text-align:center}.history-stat span,.history-stat small{display:block;color:var(--mute);font-size:10px}.history-stat b{display:block;font-size:16px;margin:2px 0}
    .history-list{margin-top:6px}.history-day{border-top:1px solid var(--line);padding:10px 0}.history-day:first-child{border-top:0}.history-day-main{display:flex;justify-content:space-between;gap:12px;align-items:center}.history-day-main>div:first-child{min-width:0}.history-day b,.history-day small{display:block}.history-day small{color:var(--mute);font-size:11px;margin-top:3px}.history-day-kcal{text-align:right;flex:0 0 auto}.history-more{margin-top:8px}.history-note{margin-top:10px}
    .history-completeness{margin-top:8px}.history-status-control{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:7px;font-size:12px;color:var(--mute)}.history-status-select{min-height:38px;max-width:170px;border:1px solid var(--line);border-radius:9px;padding:6px 9px;background:var(--card);color:var(--ink);font:600 13px Barlow,system-ui,sans-serif}.history-missing-days{border-top:1px solid var(--line);padding-top:10px;margin-top:10px}.history-missing-days summary{cursor:pointer;font-weight:600}.history-missing-day{padding:7px 0;color:var(--mute);font-size:12px}
    @media(max-width:520px){.history-stats{grid-template-columns:1fr 1fr}.history-stats .history-stat:last-child{grid-column:1/-1}.history-head{align-items:center}.history-day-main{align-items:flex-start}.history-day-kcal{max-width:52%}}
  `;document.head.appendChild(css);
  const base=window.renderComida;if(typeof base==='function')window.renderComida=function(){base.apply(this,arguments);enhance()};
})();
