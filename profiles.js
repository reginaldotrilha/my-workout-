// Local multi-profile support for Reginaldo, Sandra and Eric.
// Reginaldo keeps the original localStorage keys so existing data is preserved.
(function(){
  const PROFILE_KEY='meu_treino_active_profile_v1';
  const PROFILES={
    reginaldo:{id:'reginaldo',name:'Reginaldo'},
    sandra:{id:'sandra',name:'Sandra'},
    eric:{id:'eric',name:'Eric'}
  };

  const raw={
    get:Storage.prototype.getItem,
    set:Storage.prototype.setItem,
    remove:Storage.prototype.removeItem,
    clear:Storage.prototype.clear,
    key:Storage.prototype.key
  };
  const rawGet=k=>raw.get.call(window.localStorage,k);
  const rawSet=(k,v)=>raw.set.call(window.localStorage,k,v);

  const fromUrl=new URLSearchParams(location.search).get('profile');
  let active=(fromUrl&&PROFILES[fromUrl])?fromUrl:rawGet(PROFILE_KEY);
  let needsChoice=false;

  if(fromUrl&&PROFILES[fromUrl]) rawSet(PROFILE_KEY,fromUrl);
  if(!PROFILES[active]){
    // An existing treino_v1 belongs to Reginaldo. Never move or rename it.
    if(rawGet('treino_v1')){
      active='reginaldo';
      rawSet(PROFILE_KEY,active);
    }else{
      // Fresh device: temporarily use Reginaldo only until the chooser appears.
      active='reginaldo';
      needsChoice=true;
    }
  }

  const prefix=()=>active==='reginaldo'?'':`meu_treino_user_${active}__`;
  const globalKeys=new Set([PROFILE_KEY]);
  const mapKey=k=>{
    k=String(k);
    if(globalKeys.has(k))return k;
    return prefix()+k;
  };

  Storage.prototype.getItem=function(k){
    if(this!==window.localStorage)return raw.get.call(this,k);
    return raw.get.call(this,mapKey(k));
  };
  Storage.prototype.setItem=function(k,v){
    if(this!==window.localStorage)return raw.set.call(this,k,v);
    return raw.set.call(this,mapKey(k),v);
  };
  Storage.prototype.removeItem=function(k){
    if(this!==window.localStorage)return raw.remove.call(this,k);
    return raw.remove.call(this,mapKey(k));
  };
  Storage.prototype.clear=function(){
    if(this!==window.localStorage)return raw.clear.call(this);
    const remove=[];
    for(let i=0;i<window.localStorage.length;i++){
      const k=raw.key.call(window.localStorage,i);
      if(!k||globalKeys.has(k))continue;
      if(active==='reginaldo'){
        if(!k.startsWith('meu_treino_user_sandra__')&&!k.startsWith('meu_treino_user_eric__'))remove.push(k);
      }else if(k.startsWith(prefix()))remove.push(k);
    }
    remove.forEach(k=>raw.remove.call(window.localStorage,k));
  };
  Storage.prototype.key=function(index){
    if(this!==window.localStorage)return raw.key.call(this,index);
    const keys=[];
    for(let i=0;i<window.localStorage.length;i++){
      const k=raw.key.call(window.localStorage,i);
      if(!k||globalKeys.has(k))continue;
      if(active==='reginaldo'){
        if(!k.startsWith('meu_treino_user_sandra__')&&!k.startsWith('meu_treino_user_eric__'))keys.push(k);
      }else if(k.startsWith(prefix()))keys.push(k.slice(prefix().length));
    }
    return keys[index]??null;
  };

  window.MeuTreinoProfiles={
    current:()=>active,
    name:()=>PROFILES[active].name,
    all:()=>Object.values(PROFILES).map(p=>({...p})),
    switchTo:id=>{
      if(!PROFILES[id])return;
      rawSet(PROFILE_KEY,id);
      location.reload();
    }
  };

  function addStyles(){
    const s=document.createElement('style');
    s.textContent=`
      .profile-bar{display:flex;justify-content:flex-end;margin:-2px 0 4px}
      .profile-btn{border:1.5px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;padding:6px 10px;font:600 13px Barlow,system-ui,sans-serif;cursor:pointer}
      .profile-overlay{position:fixed;inset:0;background:rgba(12,20,17,.52);z-index:1000;display:flex;align-items:center;justify-content:center;padding:22px}
      .profile-dialog{width:min(360px,100%);background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:18px;padding:20px;box-shadow:0 18px 60px rgba(0,0,0,.25)}
      .profile-dialog h2{font-size:28px;margin-bottom:5px}.profile-dialog p{margin:0 0 14px;color:var(--mute);font-size:14px}
      .profile-options{display:grid;gap:9px}.profile-option{width:100%;border:1.5px solid var(--line);background:var(--bg);color:var(--ink);border-radius:12px;padding:13px 14px;text-align:left;font:700 18px Barlow,system-ui,sans-serif;cursor:pointer}
      .profile-option.active{border-color:var(--acc);background:var(--ok)}
      .profile-note{display:block;margin-top:13px;color:var(--mute);font-size:11px;line-height:1.35}
      .profile-cancel{width:100%;margin-top:10px}
    `;
    document.head.appendChild(s);
  }

  function chooser(required){
    const ov=document.createElement('div');ov.className='profile-overlay';
    const dlg=document.createElement('div');dlg.className='profile-dialog';dlg.setAttribute('role','dialog');dlg.setAttribute('aria-modal','true');
    dlg.innerHTML='<h2>Quem está usando?</h2><p>Escolha o perfil deste celular.</p>';
    const opts=document.createElement('div');opts.className='profile-options';
    Object.values(PROFILES).forEach(p=>{
      const b=document.createElement('button');b.className='profile-option'+(p.id===active?' active':'');b.textContent=p.name;
      b.onclick=()=>{rawSet(PROFILE_KEY,p.id);location.reload()};opts.appendChild(b);
    });
    dlg.appendChild(opts);
    const note=document.createElement('small');note.className='profile-note';note.textContent='Os dados de cada perfil ficam separados neste aparelho. O perfil Reginaldo continua usando os dados já existentes.';dlg.appendChild(note);
    if(!required){const c=document.createElement('button');c.className='ghost profile-cancel';c.textContent='Cancelar';c.onclick=()=>ov.remove();dlg.appendChild(c)}
    ov.appendChild(dlg);document.body.appendChild(ov);
  }

  function mount(){
    addStyles();
    const main=document.querySelector('main');
    if(main){
      const bar=document.createElement('div');bar.className='profile-bar';
      const btn=document.createElement('button');btn.className='profile-btn';btn.textContent='👤 '+PROFILES[active].name+' ▾';btn.setAttribute('aria-label','Trocar usuário');btn.onclick=()=>chooser(false);
      bar.appendChild(btn);main.insertBefore(bar,main.firstChild);
    }
    if(needsChoice)chooser(true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
