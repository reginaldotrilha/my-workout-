// Compact Progress (Corpo) presentation for iPhone: moves existing DOM only.
// Does not edit treino_v1, food logs, plans, exercise IDs or history.
(function(){
  const opened={recomposition:false,charts:false,history:false,security:false};
  const make=(tag,cls,text)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined)node.textContent=text;
    return node;
  };
  const findCard=(root,title)=>[...root.querySelectorAll('.ex')].find(c=>
    c.querySelector(':scope > h3')?.textContent.trim()===title);
  function detail(id,title,cards){
    const el=make('details','progress-compact-section');
    el.open=Boolean(opened[id]);
    const summary=make('summary','progress-compact-summary',title);
    el.appendChild(summary);
    const body=make('div','progress-compact-content');
    cards.filter(Boolean).forEach(card=>body.appendChild(card));
    el.appendChild(body);
    el.addEventListener('toggle',()=>{opened[id]=el.open});
    return el;
  }
  function compactRecomposition(root){
    const panel=root.querySelector('.recomp-card'),grid=panel?.querySelector('.recomp-grid');
    if(!panel||!grid||panel.classList.contains('recomp-compact'))return;
    const byLabel=new Map([...grid.children].map(card=>[card.querySelector('span')?.textContent.trim(),card]));
    const main=['Cintura','Cargas de treino','Alimentação completa','Saldo calórico (7d)']
      .map(k=>byLabel.get(k)).filter(Boolean);
    const others=[...grid.children].filter(card=>!main.includes(card));
    if(!main.length)return;
    grid.replaceChildren(...main);
    panel.classList.add('recomp-compact');
    const more=detail('recomposition','Entender resultados e ver mais',[]);
    const content=more.querySelector('.progress-compact-content');
    if(others.length){
      const extra=make('div','recomp-grid recomp-secondary-grid');
      extra.append(...others);content.appendChild(extra);
    }
    [panel.querySelector('.recomp-message'),panel.querySelector('.recomp-evidence'),
      panel.querySelector('.recomp-milestone')].filter(Boolean).forEach(node=>content.appendChild(node));
    panel.appendChild(more);
  }
  function compactBody(){
    const root=document.getElementById('vProg');
    if(!root||!root.querySelector('.recomp-card'))return;
    const hero=findCard(root,'Peso corporal');
    if(!hero||root.querySelector('.progress-compact-section[data-progress-group]'))return;
    const panel=root.querySelector('.recomp-card');
    compactRecomposition(root);
    const action=root.querySelector('.add-progress');
    if(action)hero.insertAdjacentElement('afterend',action);
    const form=root.querySelector('.progress-form');
    if(form&&action)action.insertAdjacentElement('afterend',form);
    const trend=hero.querySelector('.body-trend-summary');
    const graph=findCard(root,'Tendência do peso');
    const measures=findCard(root,'Medidas corporais');
    const measureGraph=root.querySelector('.measurement-trend-card');
    const history=findCard(root,'Histórico corporal');
    const security=findCard(root,'Segurança dos dados');
    let anchor=panel;
    const groups=[
      ['charts','Gráficos e medidas',[trend,graph,measures,measureGraph]],
      ['history','Histórico corporal',[history]],
      ['security','Segurança e backup',[security]]
    ];
    groups.forEach(([id,name,children])=>{
      if(!children.some(Boolean))return;
      const section=detail(id,name,children);
      section.setAttribute('data-progress-group',id);
      anchor.insertAdjacentElement('afterend',section);
      anchor=section;
    });
    root.classList.add('progress-compact-mode');
  }
  if(typeof window.renderProg==='function'){
    const previous=window.renderProg;
    window.renderProg=function(){
      const result=previous.apply(this,arguments);
      requestAnimationFrame(()=>requestAnimationFrame(compactBody));
      return result;
    };
  }
  const css=document.createElement('style');
  css.textContent="\n#vProg.progress-compact-mode .recomp-compact{padding:12px;margin-bottom:10px}\n#vProg.progress-compact-mode .recomp-head{align-items:center;gap:6px}\n#vProg.progress-compact-mode .recomp-head h3{font-size:20px;line-height:1.2}\n#vProg.progress-compact-mode .recomp-head span{font-size:11px}\n#vProg.progress-compact-mode .recomp-badge{flex-shrink:0;font-size:10px;padding:5px 7px}\n#vProg.progress-compact-mode .recomp-compact>.recomp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:9px 0 6px}\n#vProg.progress-compact-mode .recomp-compact>.recomp-grid .recomp-tile{padding:9px 10px;min-width:0}\n#vProg.progress-compact-mode .recomp-compact>.recomp-grid .recomp-tile b{font-size:17px;line-height:1.2;margin:3px 0}\n#vProg.progress-compact-mode .recomp-compact>.recomp-grid .recomp-tile small{font-size:10px;line-height:1.25}\n#vProg.progress-compact-mode .progress-compact-section{border:1.5px solid var(--line);background:var(--card);border-radius:12px;margin-bottom:9px;overflow:visible}\n#vProg.progress-compact-mode .progress-compact-summary{cursor:pointer;padding:12px 14px;font:700 14px Barlow,system-ui,sans-serif;color:var(--ink);list-style:none;display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:43px}\n#vProg.progress-compact-mode .progress-compact-summary::-webkit-details-marker{display:none}\n#vProg.progress-compact-mode .progress-compact-summary::after{content:'⌄';font-size:19px;color:var(--mute)}\n#vProg.progress-compact-mode details[open]>.progress-compact-summary::after{content:'⌃'}\n#vProg.progress-compact-mode .progress-compact-content{padding:0 9px 9px}\n#vProg.progress-compact-mode .progress-compact-content>.ex{margin:6px 0}\n#vProg.progress-compact-mode .recomp-compact>.progress-compact-section{margin:9px 0 0;background:var(--bg);border:0}\n#vProg.progress-compact-mode .recomp-compact>.progress-compact-section>.progress-compact-summary{font-size:12px;font-weight:600;padding:8px 10px;min-height:34px;color:var(--acc)}\n#vProg.progress-compact-mode .recomp-compact .recomp-secondary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:8px}\n#vProg.progress-compact-mode .recomp-compact .recomp-message{margin:10px 2px;font-size:12px}\n#vProg.progress-compact-mode .recomp-compact .recomp-evidence{font-size:11px}\n#vProg.progress-compact-mode .recomp-compact .recomp-milestone{margin-top:8px}\n#vProg.progress-compact-mode .add-progress{width:100%;margin-bottom:10px}\n#vProg.progress-compact-mode .progress-big{margin:8px 0 3px}\n#vProg.progress-compact-mode .progress-big strong{font-size:36px}\n#vProg.progress-compact-mode .measure-chart-summary{grid-template-columns:repeat(3,minmax(0,1fr))}\n#vProg.progress-compact-mode .measure-chart-summary span{overflow-wrap:anywhere}\n@media(max-width:390px){#vProg.progress-compact-mode .recomp-compact>.recomp-grid,#vProg.progress-compact-mode .recomp-compact .recomp-secondary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}\n";
  document.head.appendChild(css);
})();