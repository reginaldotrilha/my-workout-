// Ilustrações embutidas (SVG, funcionam offline) com a posição inicial e final de cada exercício.
// Cada pose: [quadrilX, quadrilY, tronco, braço, antebraço, coxa, perna, elevaçãoOmbro, pé] (ângulos em graus, 0=direita, 90=baixo).
// Props: [tipo('bar'|'db'|'cable'|''), ancoraX, ancoraY, banco(1/0)]
(function(){
  const R=Math.PI/180,P=(x,y,a,l)=>[x+l*Math.cos(a*R),y+l*Math.sin(a*R)];
  const U=[150,97,-90],LF=[100,138,180],IN=[110,140,-145],SE=[110,140,-90],PU=[110,140,-80],BE=[110,100,-25],BU=[110,100,-10];
  const D={
    'Supino reto com barra':[['bar',0,0,1],[...LF,100,-80,-35,75],[...LF,-90,-90,-35,75]],
    'Supino inclinado com halteres':[['db',0,0,1],[...IN,105,-75,0,90],[...IN,-80,-80,0,90]],
    'Supino inclinado na máquina':[['',0,0,1],[...IN,105,-75,0,90],[...IN,-80,-80,0,90]],
    'Crucifixo na polia ou peck deck':[['',0,0,1],[...SE,150,20,0,90],[...SE,0,0,0,90]],
    'Tríceps testa':[['bar',0,0,1],[...LF,-90,-160,-35,75],[...LF,-90,-90,-35,75]],
    'Tríceps na polia (corda)':[['cable',230,10,0],[...U,90,-20,90,90],[...U,90,90,90,90]],
    'Barra fixa ou puxada frontal':[['cable',130,-10,1],[...PU,-90,-90,0,90],[...PU,95,-75,0,90]],
    'Remada curvada com barra':[['bar',0,0,0],[...BE,90,90,70,95],[...BE,160,70,70,95]],
    'Remada unilateral com halter':[['db',0,0,0],[...BU,90,90,70,95],[...BU,160,70,70,95]],
    'Rosca direta com barra':[['bar',0,0,0],[...U,90,90,90,90],[...U,90,-60,90,90]],
    'Rosca martelo':[['db',0,0,0],[...U,90,90,90,90],[...U,90,-60,90,90]],
    'Agachamento livre':[['bar',0,0,0],[...U,120,-60,90,90],[105,135,-55,120,-60,10,105]],
    'Leg press':[['',0,0,1],[90,150,-150,60,60,-50,30],[90,150,-150,60,60,-35,-35]],
    'Stiff (levantamento terra romeno)':[['bar',0,0,0],[...U,90,90,90,90],[118,100,-20,90,90,70,95]],
    'Mesa flexora':[['',0,0,1],[130,150,180,-120,-30,0,0],[130,150,180,-120,-30,0,-100]],
    'Panturrilha em pé':[['',0,0,0],[...U,90,90,90,90,0,0],[150,87,-90,90,90,90,90,0,40]],
    'Desenvolvimento militar':[['bar',0,0,0],[...U,60,-90,90,90],[...U,-90,-90,90,90]],
    'Elevação lateral':[['db',0,0,0],[...U,90,90,90,90],[...U,5,5,90,90]],
    'Face pull ou crucifixo invertido':[['cable',290,40,0],[...U,0,0,90,90],[...U,160,-10,90,90]],
    'Encolhimento':[['db',0,0,0],[...U,90,90,90,90,0],[...U,90,90,90,90,10]],
    'Prancha (segundos)':[['',0,0,0],[60,160,-8,90,0,172,172,0,90]],
    'Abdominal infra ou roda':[['',0,0,0],[80,178,180,0,0,0,0],[80,178,180,0,0,-90,-90]]
  };
  function pts(po){
    const [hx,hy,t,ua,fa,th,sh,lf=0,ft=0]=po,s=P(hx,hy,t,60);s[1]-=lf;
    const e=P(s[0],s[1],ua,34),w=P(e[0],e[1],fa,32),k=P(hx,hy,th,44),a=P(k[0],k[1],sh,44);
    return {hip:[hx,hy],s,e,w,k,a,f:P(a[0],a[1],ft,16),h:P(s[0],s[1],t,17),t};
  }
  const f1=n=>n.toFixed(1),pl=(a,c,w)=>'<polyline points="'+a.map(p=>f1(p[0])+','+f1(p[1])).join(' ')+'" fill="none" stroke="'+c+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round"/>';
  function draw(g,pr,vb){
    let o='<line x1="'+f1(vb[0])+'" y1="185" x2="'+f1(vb[0]+vb[2])+'" y2="185" stroke="var(--line)" stroke-width="3"/>';
    if(pr[3]){const d=[Math.cos(g.t*R),Math.sin(g.t*R)],n=[Math.sin(g.t*R),-Math.cos(g.t*R)];
      o+=pl([[g.hip[0]-d[0]*18+n[0]*11,g.hip[1]-d[1]*18+n[1]*11],[g.s[0]+d[0]*14+n[0]*11,g.s[1]+d[1]*14+n[1]*11]],'var(--line)',9)}
    if(pr[0]==='cable')o+='<line x1="'+f1(g.w[0])+'" y1="'+f1(g.w[1])+'" x2="'+pr[1]+'" y2="'+pr[2]+'" stroke="var(--mute)" stroke-width="2"/><circle cx="'+pr[1]+'" cy="'+pr[2]+'" r="4" fill="var(--mute)"/>';
    o+=pl([g.f,g.a,g.k,g.hip,g.s],'var(--ink)',6)+pl([g.s,g.e,g.w],'var(--acc)',6);
    o+='<circle cx="'+f1(g.h[0])+'" cy="'+f1(g.h[1])+'" r="9" fill="var(--card)" stroke="var(--ink)" stroke-width="3.5"/>';
    if(pr[0]==='bar')o+='<circle cx="'+f1(g.w[0])+'" cy="'+f1(g.w[1])+'" r="11" fill="none" stroke="var(--hot)" stroke-width="4"/>';
    if(pr[0]==='db')o+='<circle cx="'+f1(g.w[0])+'" cy="'+f1(g.w[1])+'" r="7" fill="var(--hot)"/>';
    return o;
  }
  window.exerciseArt=function(name){
    const d=D[name];if(!d)return null;
    const pr=d[0],gs=d.slice(1).map(pts),all=[[0,185]];
    gs.forEach(g=>['hip','s','e','w','k','a','f','h'].forEach(k=>all.push(g[k])));if(pr[0]==='cable')all.push([pr[1],pr[2]]);
    const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),x0=Math.min(...xs)-16,x1=Math.max(...xs)+16,y0=Math.min(...ys)-16,y1=Math.max(...ys)+8;
    const w=Math.max(x1-x0,(y1-y0)*4/3),h=w*3/4,vb=[(x0+x1)/2-w/2,(y0+y1)/2-h/2,w,h];
    const el=document.createElement('div');el.className='ex-art'+(gs.length<2?' single':'');
    el.innerHTML=gs.map((g,i)=>{const cap=gs.length<2?'Posição':i?'Fim':'Início';
      return '<figure><svg viewBox="'+vb.map(f1).join(' ')+'" role="img" aria-label="'+name+' — '+cap.toLowerCase()+'">'+draw(g,pr,vb)+'</svg><figcaption>'+cap+'</figcaption></figure>'}).join('');
    return el;
  };
  const st=document.createElement('style');
  st.textContent='.ex-art{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%}.ex-art.single{grid-template-columns:minmax(0,60%);justify-content:center}.ex-art figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:9px;overflow:hidden}.ex-art svg{display:block;width:100%;height:auto}.ex-art figcaption{text-align:center;font:600 11px Barlow,system-ui,sans-serif;color:var(--mute);padding:2px 0 4px;text-transform:uppercase;letter-spacing:.04em}';
  document.head.appendChild(st);
})();
