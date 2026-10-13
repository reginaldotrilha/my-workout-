const KEY="treino_v1";
let db={logs:[],draft:{},body:[],waist:[],meals:[]},day="A",view="t";
try{const s=localStorage.getItem(KEY);if(s){const o=JSON.parse(s);if(o&&Array.isArray(o.logs))db={logs:o.logs,draft:o.draft||{},body:o.body||[],waist:o.waist||[],meals:o.meals||[],u:o.u||0};}}catch(e){}
function save(){db.u=Date.now();try{localStorage.setItem(KEY,JSON.stringify(db));}catch(e){}push();}
let cdb=null,duid=null,ptimer=null;
function push(){if(!cdb||!duid)return;clearTimeout(ptimer);ptimer=setTimeout(()=>{cdb.doc('data/users/'+duid+'/state').set({u:db.u,s:JSON.stringify(db)}).catch(()=>{})},800)}
function un(x,y){const m=new Map();[].concat(x||[],y||[]).forEach(e=>m.set(e.t,e));return Array.from(m.values()).sort((p,q)=>p.t-q.t)}
async function initSync(){try{
  const d=await claude.use('db'),u=await claude.use('user');if(!d||!u)return;
  const id=await u.id();if(!id)return;cdb=d;duid=id;
  const snap=await d.doc('data/users/'+id+'/state').get();let r=null;
  if(snap.exists){try{r=JSON.parse((snap.data()||{}).s)}catch(e){}}
  const before=db.logs.length+db.meals.length+db.body.length+db.waist.length;
  if(r){db={logs:un(db.logs,r.logs),body:un(db.body,r.body),waist:un(db.waist,r.waist),meals:un(db.meals,r.meals),draft:(db.u||0)>=(r.u||0)?db.draft:(r.draft||{}),u:Date.now()};
    try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}
    if(db.logs.length+db.meals.length+db.body.length+db.waist.length>before){render();toast('Dados recuperados')}}
  if(db.logs.length||db.meals.length||db.body.length||db.waist.length)push();
}catch(e){}}
const $=id=>document.getElementById(id);
function toast(t){const el=$("toast");el.textContent=t;el.classList.remove("hidden");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.add("hidden"),2200);}
const num=v=>{const n=parseFloat(String(v).replace(",","."));return isFinite(n)?n:null};
function last(d,i){for(let k=db.logs.length-1;k>=0;k--){const l=db.logs[k];if(l.day===d&&l.ex&&l.ex[i]&&l.ex[i].length)return l;}return null}
function nextDay(){if(!db.logs.length)return "A";const l=db.logs[db.logs.length-1].day;return "ABCD"[("ABCD".indexOf(l)+1)%4]}
function sets(d,i){const n=PLAN[d].ex[i][2];db.draft[d]=db.draft[d]||{};const a=db.draft[d][i]=db.draft[d][i]||[];while(a.length<n)a.push({w:"",r:"",ok:false});return a}
function fmt(l,i){return l.ex[i].map(s=>s.w+"kg"+(s.r?"×"+s.r:"")).join(", ")}
function dateBR(t){return new Date(t).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}

function renderTabs(){
  const t=$("tabs");t.innerHTML="";
  for(const d of "ABCD"){const b=document.createElement("button");b.textContent=d;b.setAttribute("aria-pressed",d===day);
    if(db.draft[d]&&Object.values(db.draft[d]).some(a=>a.some(s=>s.ok)))b.classList.add("done");
    b.onclick=()=>{day=d;render()};t.appendChild(b);}
}
function renderList(){
  const p=PLAN[day],box=$("list");box.innerHTML="";
  $("sub").textContent="Treino "+day+" · "+p.n+" · sugerido hoje: "+nextDay();
  p.ex.forEach((e,i)=>{
    const ss=sets(day,i),pl=last(day,i);
    const card=document.createElement("div");card.className="ex"+(ss.every(s=>s.ok)?" complete":"");
    const h=document.createElement("div");h.className="ex-h";
    const h3=document.createElement("h3");h3.textContent=e[0];
    const tg=document.createElement("span");tg.className="tgt";tg.textContent=e[1];
    h.append(h3,tg);card.appendChild(h);
    const hint=document.createElement("div");hint.className="hint";
    hint.textContent=pl?"Última vez ("+dateBR(pl.t)+"): "+fmt(pl,i):"Sem registro ainda: comece com ~75% da carga que usava antes.";
    card.appendChild(hint);
    const tx=TIPS[e[0]];
    if(tx){const dt=document.createElement("details");dt.className="how";const sm=document.createElement("summary");sm.textContent="Como fazer";dt.appendChild(sm);
      const tp=document.createElement("p");tp.textContent=tx;dt.appendChild(tp);
      const a=document.createElement("a");a.href="https://www.youtube.com/results?search_query="+encodeURIComponent((EN[e[0]]||e[0])+" proper form");a.target="_blank";a.rel="noopener";a.textContent="Buscar vídeo";dt.appendChild(a);card.appendChild(dt);}
    ss.forEach((s,k)=>{
      const r=document.createElement("div");r.className="set";
      const n=document.createElement("span");n.textContent=k+1;
      const w=document.createElement("input");w.type="number";w.inputMode="decimal";w.placeholder="kg";w.value=s.w;w.setAttribute("aria-label","Carga série "+(k+1));
      const rp=document.createElement("input");rp.type="number";rp.inputMode="numeric";rp.placeholder="reps";rp.value=s.r;rp.setAttribute("aria-label","Repetições série "+(k+1));
      const c=document.createElement("button");c.className="chk";c.textContent="✓";c.setAttribute("aria-pressed",s.ok);c.setAttribute("aria-label","Concluir série "+(k+1));
      w.oninput=()=>{s.w=w.value;save()};rp.oninput=()=>{s.r=rp.value;save()};
      c.onclick=()=>{
        if(!s.ok&&pl){const q=pl.ex[i][k]||pl.ex[i][pl.ex[i].length-1];if(!s.w)s.w=q.w;if(!s.r)s.r=q.r;}
        s.ok=!s.ok;save();render();};
      r.append(n,w,rp,c);card.appendChild(r);
    });
    box.appendChild(card);
  });
}
function finish(){
  const p=PLAN[day],ex={};let total=0;
  p.ex.forEach((e,i)=>{const a=(db.draft[day]&&db.draft[day][i]||[]).filter(s=>s.ok&&num(s.w)!==null&&num(s.r)!==null).map(s=>({w:num(s.w),r:num(s.r)}));if(a.length){ex[i]=a;total+=a.length;}});
  if(!total){toast("Marque ao menos uma série com carga e repetições");return}
  db.logs.push({t:Date.now(),day,ex});delete db.draft[day];save();toast("Treino "+day+" salvo!");render();
}
function spark(vals){
  if(vals.length<2)return null;
  const W=300,H=46,mn=Math.min(...vals),mx=Math.max(...vals),rg=mx-mn||1;
  const pts=vals.map((v,i)=>[(i/(vals.length-1))*(W-8)+4,H-6-((v-mn)/rg)*(H-14)]);
  const ns="http://www.w3.org/2000/svg",s=document.createElementNS(ns,"svg");
  s.setAttribute("viewBox","0 0 "+W+" "+H);s.setAttribute("class","spark");s.setAttribute("aria-hidden","true");
  const pl=document.createElementNS(ns,"polyline");pl.setAttribute("points",pts.map(p=>p.join(",")).join(" "));
  pl.setAttribute("fill","none");pl.setAttribute("stroke","var(--acc)");pl.setAttribute("stroke-width","2.5");pl.setAttribute("stroke-linejoin","round");s.appendChild(pl);
  const lp=pts[pts.length-1],c=document.createElementNS(ns,"circle");c.setAttribute("cx",lp[0]);c.setAttribute("cy",lp[1]);c.setAttribute("r","4");c.setAttribute("fill","var(--hot)");s.appendChild(c);
  return s;
}
function renderProg(){
  const v=$("vProg");v.innerHTML="";$("sub").textContent=db.logs.length+" treino(s) registrado(s)";
  const bw=document.createElement("div");bw.className="ex";
  const bh=document.createElement("h3");bh.textContent="Peso corporal";bw.appendChild(bh);
  const lb=db.body[db.body.length-1];
  const bi=document.createElement("div");bi.className="hint";
  bi.textContent=lb?"Último: "+lb.w+" kg em "+dateBR(lb.t)+(db.body.length>1?" (início: "+db.body[0].w+" kg)":""):"Anote seu peso para acompanhar a tendência.";
  bw.appendChild(bi);
  const bs=spark(db.body.map(b=>b.w));if(bs)bw.appendChild(bs);
  const f=document.createElement("div");f.className="bw";
  const inp=document.createElement("input");inp.type="number";inp.inputMode="decimal";inp.placeholder="kg hoje";inp.setAttribute("aria-label","Peso de hoje em kg");
  const bt=document.createElement("button");bt.className="ghost";bt.textContent="Salvar peso";
  bt.onclick=()=>{const n=num(inp.value);if(n===null||n<20||n>400){toast("Digite um peso válido");return}db.body.push({t:Date.now(),w:n});save();renderProg();toast("Peso salvo")};
  f.append(inp,bt);bw.appendChild(f);v.appendChild(bw);
  const wc=document.createElement("div");wc.className="ex";
  const wh=document.createElement("h3");wh.textContent="Cintura (no umbigo)";wc.appendChild(wh);
  const lw=db.waist[db.waist.length-1],wi=document.createElement("div");wi.className="hint";
  wi.textContent=lw?"Última: "+lw.c+" cm em "+dateBR(lw.t)+(db.waist.length>1?" (início: "+db.waist[0].c+" cm)":""):"Meça na altura do umbigo, sem apertar a fita, sempre de manhã.";
  wc.appendChild(wi);
  const ws=spark(db.waist.map(b=>b.c));if(ws)wc.appendChild(ws);
  const wf=document.createElement("div");wf.className="bw";
  const wn=document.createElement("input");wn.type="number";wn.inputMode="decimal";wn.placeholder="cm hoje";wn.setAttribute("aria-label","Cintura de hoje em cm");
  const wb=document.createElement("button");wb.className="ghost";wb.textContent="Salvar cintura";
  wb.onclick=()=>{const n=num(wn.value);if(n===null||n<40||n>250){toast("Digite uma medida válida");return}db.waist.push({t:Date.now(),c:n});save();renderProg();toast("Cintura salva")};
  wf.append(wn,wb);wc.appendChild(wf);v.appendChild(wc);
  if(!db.logs.length){const e=document.createElement("div");e.className="empty";e.textContent="Nenhum treino salvo ainda. Faça um treino e toque em Finalizar treino para ver sua evolução aqui.";v.appendChild(e);return}
  for(const d of "ABCD"){
    PLAN[d].ex.forEach((e,i)=>{
      const hist=db.logs.filter(l=>l.day===d&&l.ex[i]).map(l=>({t:l.t,top:Math.max(...l.ex[i].map(s=>s.w)),vol:l.ex[i].reduce((a,s)=>a+s.w*s.r,0)}));
      if(!hist.length)return;
      const c=document.createElement("div");c.className="ex";
      const h=document.createElement("div");h.className="ex-h";
      const t=document.createElement("h3");t.textContent=e[0];const tg=document.createElement("span");tg.className="tgt";tg.textContent="Treino "+d;
      h.append(t,tg);c.appendChild(h);
      const first=hist[0].top,now=hist[hist.length-1].top,best=Math.max(...hist.map(x=>x.top)),diff=now-first;
      const st=document.createElement("div");st.className="stat";
      st.innerHTML="<span>Atual <b></b></span><span>Recorde <b></b></span><span>Evolução <b></b></span>";
      const bs2=st.querySelectorAll("b");bs2[0].textContent=now+" kg";bs2[1].textContent=best+" kg";bs2[2].textContent=(diff>0?"+":"")+diff+" kg";
      c.appendChild(st);const sp=spark(hist.map(x=>x.top));if(sp)c.appendChild(sp);
      v.appendChild(c);
    });
  }
  const hc=document.createElement("div");hc.className="ex";const hh=document.createElement("h3");hh.textContent="Últimos treinos";hc.appendChild(hh);
  db.logs.slice(-8).reverse().forEach(l=>{
    const r=document.createElement("div");r.className="log rowx";
    const tx=document.createElement("span");const n=Object.values(l.ex).reduce((a,x)=>a+x.length,0);
    tx.textContent=dateBR(l.t)+" · Treino "+l.day+" · "+n+" séries";
    const x=document.createElement("button");x.className="ghost";x.textContent="Apagar";x.setAttribute("aria-label","Apagar treino de "+dateBR(l.t));
    x.onclick=()=>{if(confirm("Apagar este treino do histórico?")){db.logs=db.logs.filter(z=>z!==l);save();renderProg()}};
    r.append(tx,x);hc.appendChild(r);
  });
  v.appendChild(hc);
}