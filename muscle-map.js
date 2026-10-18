// Compact anatomical muscle maps for each exercise card. Pure inline SVG: no external assets.
(function(){
  const P={
    chest:{label:'Peito',primary:['chest'],secondary:['shoulders','triceps']},
    chestIncline:{label:'Peito superior',primary:['chest','shoulders'],secondary:['triceps']},
    triceps:{label:'Tríceps',primary:['triceps'],secondary:['shoulders']},
    back:{label:'Costas',primary:['lats','upperback'],secondary:['biceps','rearshoulders']},
    lats:{label:'Dorsais',primary:['lats'],secondary:['biceps','rearshoulders']},
    biceps:{label:'Bíceps',primary:['biceps'],secondary:['forearms']},
    hammer:{label:'Bíceps + antebraço',primary:['biceps','forearms'],secondary:[]},
    squat:{label:'Quadríceps + glúteos',primary:['quads','glutes'],secondary:['hamstrings','abs','lowerback']},
    hamstrings:{label:'Posterior + glúteos',primary:['hamstrings','glutes'],secondary:['lowerback']},
    legcurl:{label:'Posterior da coxa',primary:['hamstrings'],secondary:['calves']},
    calves:{label:'Panturrilhas',primary:['calves'],secondary:[]},
    shoulders:{label:'Ombros',primary:['shoulders'],secondary:['triceps','upperback']},
    lateral:{label:'Ombros laterais',primary:['shoulders'],secondary:[]},
    rear:{label:'Ombro posterior + costas',primary:['rearshoulders','upperback'],secondary:['lats']},
    traps:{label:'Trapézio',primary:['upperback'],secondary:['shoulders']},
    core:{label:'Core',primary:['abs'],secondary:['shoulders','glutes','lowerback']},
    abs:{label:'Abdômen',primary:['abs'],secondary:['quads']}
  };

  function profile(name){
    const n=String(name||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(/supino inclinado|incline.*press/.test(n))return P.chestIncline;
    if(/supino|chest press|pec deck|crucifixo|crossover|fly/.test(n))return P.chest;
    if(/triceps|skull|frances|mergulho|dip/.test(n))return P.triceps;
    if(/barra fixa|puxada|pulldown|pullup|pull-up/.test(n))return P.lats;
    if(/remada|row|t-bar|tbar/.test(n))return P.back;
    if(/rosca martelo|hammer/.test(n))return P.hammer;
    if(/rosca|curl/.test(n))return P.biceps;
    if(/agachamento|squat|leg press|hack squat|goblet/.test(n))return P.squat;
    if(/stiff|romeno|romanian|rdl/.test(n))return P.hamstrings;
    if(/mesa flexora|flexora|leg curl/.test(n))return P.legcurl;
    if(/panturrilha|calf/.test(n))return P.calves;
    if(/face pull|crucifixo invertido|reverse pec|rear delt/.test(n))return P.rear;
    if(/encolhimento|shrug/.test(n))return P.traps;
    if(/elevacao lateral|lateral raise/.test(n))return P.lateral;
    if(/desenvolvimento|militar|shoulder press|overhead press/.test(n))return P.shoulders;
    if(/prancha|plank/.test(n))return P.core;
    if(/abdominal|ab wheel|roda|leg raise|crunch/.test(n))return P.abs;
    return null
  }

  const frontShapes={
    shoulders:'<ellipse cx="31" cy="38" rx="8" ry="6"/><ellipse cx="69" cy="38" rx="8" ry="6"/>',
    chest:'<path d="M38 42 Q50 37 62 42 L61 57 Q50 62 39 57Z"/>',
    biceps:'<ellipse cx="25" cy="58" rx="5" ry="10"/><ellipse cx="75" cy="58" rx="5" ry="10"/>',
    forearms:'<ellipse cx="22" cy="78" rx="4" ry="12"/><ellipse cx="78" cy="78" rx="4" ry="12"/>',
    abs:'<path d="M43 59 L57 59 L59 86 L41 86Z"/>',
    quads:'<path d="M39 91 L48 91 L46 119 L36 119Z"/><path d="M52 91 L61 91 L64 119 L54 119Z"/>',
    calves:'<path d="M37 121 L46 121 L44 143 L38 143Z"/><path d="M54 121 L63 121 L62 143 L56 143Z"/>'
  };
  const backShapes={
    rearshoulders:'<ellipse cx="111" cy="38" rx="8" ry="6"/><ellipse cx="149" cy="38" rx="8" ry="6"/>',
    upperback:'<path d="M118 39 Q130 32 142 39 L139 57 Q130 53 121 57Z"/>',
    lats:'<path d="M117 50 Q130 56 143 50 L139 78 Q130 84 121 78Z"/>',
    triceps:'<ellipse cx="105" cy="58" rx="5" ry="10"/><ellipse cx="155" cy="58" rx="5" ry="10"/>',
    lowerback:'<path d="M123 76 L137 76 L139 89 L121 89Z"/>',
    glutes:'<ellipse cx="124" cy="96" rx="8" ry="7"/><ellipse cx="136" cy="96" rx="8" ry="7"/>',
    hamstrings:'<path d="M119 101 L128 101 L126 121 L117 121Z"/><path d="M132 101 L141 101 L143 121 L134 121Z"/>',
    calves:'<path d="M117 123 L126 123 L124 144 L118 144Z"/><path d="M134 123 L143 123 L142 144 L136 144Z"/>'
  };

  function baseBody(cx){return '<circle cx="'+cx+'" cy="18" r="9"/><path d="M'+(cx-12)+' 30 Q'+cx+' 25 '+(cx+12)+' 30 L'+(cx+15)+' 84 Q'+cx+' 91 '+(cx-15)+' 84Z"/><path d="M'+(cx-14)+' 36 L'+(cx-26)+' 80"/><path d="M'+(cx+14)+' 36 L'+(cx+26)+' 80"/><path d="M'+(cx-8)+' 88 L'+(cx-11)+' 145"/><path d="M'+(cx+8)+' 88 L'+(cx+11)+' 145"/>'}
  function svg(profile){
    const pri=new Set(profile.primary),sec=new Set(profile.secondary);
    const cls=m=>pri.has(m)?'mm-primary':sec.has(m)?'mm-secondary':'mm-off';
    let f='',b='';Object.entries(frontShapes).forEach(([m,s])=>f+='<g class="'+cls(m)+'">'+s+'</g>');Object.entries(backShapes).forEach(([m,s])=>b+='<g class="'+cls(m)+'">'+s+'</g>');
    return '<svg class="muscle-svg" viewBox="0 0 180 155" role="img" aria-label="Mapa muscular: '+profile.label+'"><g class="mm-body">'+baseBody(50)+baseBody(130)+'</g>'+f+b+'<text x="50" y="153">frente</text><text x="130" y="153">costas</text></svg>'
  }
  function names(profile){
    const map={chest:'peito',shoulders:'ombros',triceps:'tríceps',lats:'dorsais',upperback:'costas/trapézio',rearshoulders:'ombro posterior',biceps:'bíceps',forearms:'antebraços',abs:'abdômen',quads:'quadríceps',glutes:'glúteos',hamstrings:'posterior da coxa',lowerback:'lombar',calves:'panturrilhas'};
    return{p:profile.primary.map(x=>map[x]||x).join(', '),s:profile.secondary.map(x=>map[x]||x).join(', ')}
  }
  function enhance(){
    const box=document.getElementById('list');if(!box)return;
    [...box.querySelectorAll(':scope > .ex')].forEach(card=>{
      if(card.querySelector('.muscle-map'))return;const title=card.querySelector('.ex-h h3')?.textContent;if(!title)return;const p=profile(title);if(!p)return;
      const n=names(p),wrap=document.createElement('div');wrap.className='muscle-map';wrap.innerHTML='<div class="muscle-art">'+svg(p)+'</div><div class="muscle-copy"><b>'+p.label+'</b><span><i class="dot primary"></i>Principal: '+n.p+'</span>'+(n.s?'<span><i class="dot secondary"></i>Também: '+n.s+'</span>':'')+'</div>';
      const how=card.querySelector('.how');if(how)card.insertBefore(wrap,how);else{const hint=card.querySelector('.hint');hint?hint.insertAdjacentElement('afterend',wrap):card.appendChild(wrap)}
    })
  }
  const base=window.renderList;if(typeof base==='function')window.renderList=function(){base.apply(this,arguments);requestAnimationFrame(enhance)};
  const style=document.createElement('style');style.textContent='.muscle-map{display:flex;align-items:center;gap:12px;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:8px 10px;margin:8px 0 10px}.muscle-art{width:112px;flex:0 0 112px}.muscle-svg{display:block;width:100%;height:auto}.muscle-svg .mm-body{fill:none;stroke:#aeb7ad;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;opacity:.72}.muscle-svg .mm-off{fill:#dfe4dd;opacity:.45}.muscle-svg .mm-primary{fill:var(--acc);opacity:.96}.muscle-svg .mm-secondary{fill:var(--hot);opacity:.72}.muscle-svg text{fill:var(--mute);font:600 7px Barlow,system-ui,sans-serif;text-anchor:middle}.muscle-copy{display:grid;gap:4px;min-width:0}.muscle-copy>b{font:700 18px "Barlow Condensed",Barlow,sans-serif;color:var(--ink)}.muscle-copy span{font-size:12px;color:var(--mute);line-height:1.3}.muscle-copy .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}.muscle-copy .dot.primary{background:var(--acc)}.muscle-copy .dot.secondary{background:var(--hot)}@media(max-width:390px){.muscle-art{width:96px;flex-basis:96px}.muscle-map{gap:9px;padding:7px 8px}.muscle-copy>b{font-size:16px}.muscle-copy span{font-size:11px}}';document.head.appendChild(style);
})();