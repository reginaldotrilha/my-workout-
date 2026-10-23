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
    return all.slice(0,n);
  }
  function summary(days){
    if(!days.length)return null;
    const withBurn=days.map(d=>({d,h:healthFor(d.key)})).filter(x=>x.h.total>0);
    const avg=(field)=>days.reduce((s,d)=>s+(Number(d[field])||0),0)/days.length;
    const out={avgK:avg('k'),avgP:avg('p'),burnDays:withBurn.length,avgBurn:0,avgBalance:0,totalBalance:0};
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
    const rows=[['Data','Calorias ingeridas','Proteina (g)','Carboidrato (g)','Gordura (g)','Calorias ativas','Calorias em repouso','Gasto total','Saldo (gasto - consumo)','Fonte do gasto']];
    all.slice().sort((a,b)=>a.t-b.t).forEach(d=>{
      const h=healthFor(d.key),balance=h.total?h.total-d.k:'';
      rows.push([d.key,Math.round(d.k),r1(d.p),r1(d.c),r1(d.g),h.active||'',h.resting||'',h.total||'',balance===''?'':Math.round(balance),h.source||'']);
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
  function buildCard(){
    const all=foodDays(),shown=selectedDays(all),card=make('div','ex food-history-card');
    const head=make('div','history-head'),titles=make('div');titles.append(make('h3','','Histórico de alimentação'),make('div','hint',all.length+' dia(s) com alimentação registrada'));
    const exp=make('button','ghost history-export','Exportar CSV');exp.type='button';exp.onclick=()=>exportCsv(all);head.append(titles,exp);card.appendChild(head);
    rangeButtons(card);
    const s=summary(shown);
    if(s){
      const stats=make('div','history-stats');
      const add=(label,value,sub)=>{const x=make('div','history-stat');x.append(make('span','',label),make('b','',value),make('small','',sub||''));stats.appendChild(x)};
      add('Média consumo',fmt(s.avgK)+' kcal',shown.length+' dia(s)');
      add('Média proteína',fmt(s.avgP)+' g','por dia');
      if(s.burnDays)add('Saldo médio',(s.avgBalance>=0?'−':'+')+fmt(Math.abs(s.avgBalance))+' kcal',s.burnDays+' dia(s) com gasto');
      else add('Apple Health','—','sem gasto sincronizado');
      card.appendChild(stats);
    }
    const list=make('div','history-list');
    if(!shown.length)list.appendChild(make('div','hint','Nenhum dia registrado ainda.'));
    shown.forEach(d=>{
      const h=healthFor(d.key),row=make('div','history-day');
      const main=make('div','history-day-main'),left=make('div'),right=make('div','history-day-kcal');
      left.append(make('b','',labelDate(d.t)),make('small','',`P ${fmt(d.p)} · C ${fmt(d.c)} · G ${fmt(d.g)}`));
      right.append(make('b','',fmt(d.k)+' kcal'));
      if(h.total){const bal=h.total-d.k;right.append(make('small','',`Gasto ${fmt(h.total)} · ${bal>=0?'Déficit':'Superávit'} ${fmt(Math.abs(bal))}`))}
      else right.append(make('small','','Gasto não informado'));
      main.append(left,right);row.appendChild(main);list.appendChild(row);
    });
    card.appendChild(list);
    if(ui.range!=='all'&&all.length>shown.length){
      const more=make('button','ghost wide history-more','Ver todos os '+all.length+' dias');more.type='button';more.onclick=()=>{ui.range='all';saveUi();renderComida()};card.appendChild(more);
    }
    const note=make('div','hint history-note','O CSV inclui alimentação e, quando disponível, calorias ativas, repouso, gasto total e saldo diário.');card.appendChild(note);
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
    @media(max-width:520px){.history-stats{grid-template-columns:1fr 1fr}.history-stats .history-stat:last-child{grid-column:1/-1}.history-head{align-items:center}.history-day-main{align-items:flex-start}.history-day-kcal{max-width:52%}}
  `;document.head.appendChild(css);
  const base=window.renderComida;if(typeof base==='function')window.renderComida=function(){base.apply(this,arguments);enhance()};
})();
