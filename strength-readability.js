// Improves hierarchy/readability of strength progression cards without changing workout data.
(function(){
  function improve(){
    const v=document.getElementById('vProg');if(!v)return;
    v.querySelectorAll('.strength-history-card').forEach(card=>{
      const stats=card.querySelector('.strength-stats');if(!stats)return;
      const tiles=[...stats.querySelectorAll('.strength-stat')];if(tiles.length<4)return;
      const current=tiles[0],previous=tiles[1],record=tiles[2],delta=tiles[3];
      current.classList.add('strength-current');previous.classList.add('strength-previous');record.classList.add('strength-record');delta.classList.add('strength-delta');

      const currentSmall=current.querySelector('small'),recordSmall=record.querySelector('small');
      if(currentSmall&&recordSmall){
        const sessionDetail=recordSmall.textContent.trim();
        if(sessionDetail&&sessionDetail!=='—'&&!currentSmall.dataset.movedDetail){
          currentSmall.textContent=currentSmall.textContent.trim()+' · '+sessionDetail;
          currentSmall.dataset.movedDetail='1';
          recordSmall.textContent='melhor marca registrada';
        }
      }

      const deltaValue=delta.querySelector('b')?.textContent.trim()||'';
      delta.classList.toggle('is-positive',/^\+/.test(deltaValue));
      delta.classList.toggle('is-first',/Primeiro registro/i.test(deltaValue));

      const title=card.querySelector('.strength-chart-title');
      if(title)title.textContent=title.textContent.replace('Carga por sessão','Progresso da carga').replace('Repetições por sessão','Progresso das repetições').replace('Tempo por sessão','Progresso do tempo');
    });
  }

  const style=document.createElement('style');style.textContent=`
    .strength-history-title{margin-top:18px!important;margin-bottom:10px!important}
    .strength-history-title b{font-size:24px!important;line-height:1.05!important}
    .strength-history-title span{font-size:14px!important;line-height:1.35!important;margin-top:4px!important}

    .strength-history-card{padding:14px!important;margin-bottom:16px!important}
    .strength-history-card>.ex-h{align-items:flex-start!important;gap:10px!important}
    .strength-history-card>.ex-h h3{font-size:24px!important;line-height:1.05!important;max-width:78%}
    .strength-history-card>.ex-h .tgt{font-size:14px!important;padding-top:3px}

    .strength-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important;grid-template-areas:'current current' 'record delta' 'previous previous'!important;gap:8px!important;margin-top:12px!important}
    .strength-stat{padding:11px 12px!important;border:1px solid color-mix(in srgb,var(--line) 80%,transparent)!important}
    .strength-stat span{font-size:12px!important;letter-spacing:.01em}
    .strength-stat b{font-size:18px!important;line-height:1.15!important;margin:4px 0!important}
    .strength-stat small{font-size:11.5px!important;line-height:1.25!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important}

    .strength-current{grid-area:current!important;background:color-mix(in srgb,var(--acc) 8%,var(--card))!important;border-color:color-mix(in srgb,var(--acc) 25%,var(--line))!important}
    .strength-current span{font-size:13px!important;font-weight:600!important;color:var(--acc)!important}
    .strength-current b{font:700 27px/1.05 'Barlow Condensed',system-ui,sans-serif!important;color:var(--ink)!important}
    .strength-current small{font-size:12px!important;margin-top:3px!important;color:var(--mute)!important}

    .strength-record{grid-area:record!important}.strength-delta{grid-area:delta!important}.strength-previous{grid-area:previous!important}
    .strength-record b{font-size:20px!important}.strength-delta b{font-size:20px!important}
    .strength-delta.is-positive b{color:var(--acc)!important}.strength-delta.is-first b{font-size:17px!important}
    .strength-previous{display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;column-gap:10px!important;align-items:center!important;background:transparent!important;border-color:var(--line)!important}
    .strength-previous span{grid-column:1!important}.strength-previous b{grid-column:2!important;margin:0!important;font-size:16px!important}.strength-previous small{grid-column:3!important;text-align:right!important}

    .strength-chart-title{font-size:13px!important;font-weight:500!important;margin:15px 3px 4px!important}
    .strength-detail-chart{margin-top:6px!important;min-height:145px}
    .strength-chart-value{font-size:10.5px!important;font-weight:700!important}.strength-chart-date{font-size:9.5px!important}
    .strength-history-details{margin-top:10px!important;padding-top:8px!important}
    .strength-history-details summary{font-size:14px!important;padding:7px 2px!important}
    .strength-history-row{padding:10px 2px!important}.strength-history-row b{font-size:13px!important}.strength-history-row span{font-size:11.5px!important;line-height:1.3!important}

    @media(max-width:380px){
      .strength-history-card>.ex-h h3{font-size:22px!important;max-width:74%}
      .strength-current b{font-size:25px!important}
      .strength-previous{grid-template-columns:1fr auto!important;row-gap:2px!important}.strength-previous span{grid-column:1!important}.strength-previous b{grid-column:2!important;text-align:right!important}.strength-previous small{grid-column:1/-1!important;text-align:left!important}
    }
  `;document.head.appendChild(style);

  const base=window.renderProg;
  if(typeof base==='function')window.renderProg=function(){base.apply(this,arguments);requestAnimationFrame(()=>requestAnimationFrame(improve))};
  requestAnimationFrame(()=>requestAnimationFrame(improve));
})();
