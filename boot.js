function render(){
  const t=view==="t";
  $("vTreino").classList.toggle("hidden",!t);$("vProg").classList.toggle("hidden",view!=="p");$("vComida").classList.toggle("hidden",view!=="c");
  $("nTreino").setAttribute("aria-pressed",t);$("nProg").setAttribute("aria-pressed",view==="p");$("nComida").setAttribute("aria-pressed",view==="c");
  if(t){renderTabs();renderList()}else if(view==="p")renderProg();else renderComida();
}
$("nTreino").onclick=()=>{view="t";render()};
$("nProg").onclick=()=>{view="p";render()};
$("nComida").onclick=()=>{view="c";render()};
$("finish").onclick=finish;
day=nextDay();render();initSync();
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}