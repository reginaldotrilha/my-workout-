// Fixed recommended repetition ranges shown as reference only.
// Actual reps remain editable per set; series-input-pickers.js provides typed/selectable inputs.
(function(){
  const norm=s=>String(s||'').trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const RECOMMENDATIONS=new Map([
    ['Supino reto com barra','6–10'],['Supino inclinado com halteres','8–12'],['Crucifixo na polia ou peck deck','10–15'],['Supino reto com halteres','8–12'],['Supino declinado com barra','8–12'],['Supino inclinado com barra','6–10'],['Crossover polia alta para baixa','10–15'],['Crossover polia baixa para alta','10–15'],['Chest press na máquina','8–12'],['Flexão de braço','10–20'],['Supino inclinado na máquina','8–12'],
    ['Barra fixa ou puxada frontal','8–12'],['Remada curvada com barra','6–10'],['Remada unilateral com halter','8–12'],['Remada baixa na polia','8–12'],['Remada com apoio no peito','8–12'],['Barra fixa','6–12'],['Pulldown com braços retos','10–15'],['Remada T-bar','8–12'],['High row na máquina','8–12'],['Levantamento terra','5–8'],['Remada sentada na máquina','8–12'],
    ['Desenvolvimento com halteres','8–12'],['Desenvolvimento militar','6–10'],['Elevação lateral','12–20'],['Elevação frontal','10–15'],['Crucifixo invertido','12–20'],['Shoulder press na máquina','8–12'],['Elevação lateral na polia','12–20'],['Face pull ou crucifixo invertido','12–20'],['Remada alta','10–15'],['Arnold press','8–12'],
    ['Tríceps na polia (corda)','10–15'],['Tríceps testa','8–12'],['Tríceps testa com barra EZ','8–12'],['Tríceps acima da cabeça com halter','10–15'],['Tríceps acima da cabeça na polia','10–15'],['Tríceps na polia com barra reta','10–15'],['Mergulho no banco','10–20'],['Paralelas','6–12'],['Dip na máquina','8–12'],['Tríceps coice','12–20'],
    ['Rosca direta com barra','8–12'],['Rosca martelo','8–12'],['Rosca direta com barra EZ','8–12'],['Rosca inclinada com halteres','8–12'],['Rosca Scott','8–12'],['Rosca na polia','10–15'],['Rosca concentração','10–15'],['Rosca inversa','10–15'],['Rosca na máquina','10–15'],['Rosca bayesian na polia','10–15'],
    ['Agachamento livre','6–10'],['Leg press','10–15'],['Hack squat','8–12'],['Avanço / passada','8–12'],['Afundo búlgaro','8–12'],['Cadeira extensora','10–15'],['Stiff (levantamento terra romeno)','6–10'],['Mesa flexora sentada','10–15'],['Mesa flexora','10–15'],['Hip thrust','8–12'],['Ponte de glúteo','10–15'],['Agachamento no smith','8–12'],['Agachamento goblet','10–15'],['Terra sumô','6–10'],['Máquina adutora','12–20'],['Máquina abdutora','12–20'],['Panturrilha em pé','12–20'],['Panturrilha sentada','12–20'],['Panturrilha donkey','12–20'],['Step-up','8–12'],
    ['Crunch abdominal','12–20'],['Abdominal na polia','10–15'],['Elevação de pernas na barra','8–15'],['Elevação de pernas na cadeira romana','10–15'],['Prancha (segundos)','45–60s'],['Prancha lateral','30–60s'],['Russian twist','12–20'],['Abdominal infra ou roda','8–15'],['Abdominal reverso','12–20'],['Abdominal na máquina','10–15'],
    ['Encolhimento com barra','8–15'],['Encolhimento','8–15'],['Flexão de punho','12–20'],['Extensão de punho','12–20'],['Farmer walk','30–60s']
  ].map(([n,r])=>[norm(n),r]));

  function fallback(item){
    const name=norm(item?.name),equipment=norm(item?.equipment);
    if(item?.type==='time'||/prancha|farmer/.test(name))return '30–60s';
    if(item?.type==='reps')return /flexao|mergulho/.test(name)?'10–20':'8–15';
    if(/panturrilha|adutora|abdutora/.test(name))return '12–20';
    if(/elevacao lateral|face pull|crucifixo invertido|coice|punho/.test(name))return '12–20';
    if(/crucifixo|crossover|pulldown com bracos retos|extensora|flexora|rosca na polia|rosca concentracao|maquina/.test(name))return '10–15';
    if(/terra|agachamento livre|remada curvada|desenvolvimento militar/.test(name))return '6–10';
    if(/barbell/.test(equipment))return '6–10';
    return '8–12';
  }
  function ideal(item){return RECOMMENDATIONS.get(norm(item?.name))||fallback(item)}
  function parse(range){
    const m=String(range||'').match(/(\d+)\D+(\d+)/);return m?{min:Number(m[1]),max:Number(m[2]),time:/s$/i.test(range)}:null;
  }

  window.RepTargetsApi={ideal,parse,byName:name=>{
    const item=window.ExerciseCatalog?.byName?.(name);return item?ideal(item):null;
  }};

  function decorate(){
    const box=document.getElementById('list');if(!box||box.querySelector('.plan-editor,.plan-manager'))return;
    [...box.querySelectorAll(':scope > .ex')].forEach(card=>{
      if(!card.querySelector('.set'))return;
      const name=card.querySelector('.ex-h h3')?.textContent||'';
      const item=window.ExerciseCatalog?.byName?.(name);if(!item)return;
      const range=ideal(item),header=card.querySelector('.ex-h');if(!header)return;
      card.querySelector('.rep-target-panel')?.remove();
      let badge=card.querySelector('.ideal-reps-reference');
      if(!badge){badge=document.createElement('div');badge.className='ideal-reps-reference';header.insertAdjacentElement('afterend',badge)}
      badge.textContent='Faixa ideal: '+range+( /s$/i.test(range)?'':' reps');
      badge.dataset.range=range;
    });
  }

  async function init(){try{await window.ExerciseCatalog?.ready}catch(e){}requestAnimationFrame(decorate)}
  const base=window.renderList;
  if(typeof base==='function')window.renderList=function(){const r=base.apply(this,arguments);requestAnimationFrame(decorate);return r};

  const style=document.createElement('style');
  style.textContent='.ideal-reps-reference{display:inline-flex;align-items:center;width:max-content;max-width:100%;margin:6px 0 8px;padding:6px 10px;border-radius:999px;background:var(--ok);color:var(--acc);font-size:11px;font-weight:700}';
  document.head.appendChild(style);init();
})();
