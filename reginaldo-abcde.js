// Reginaldo-specific ABCDE priority plan.
// Keeps the current plan id/start date and stable exercise IDs so history stays connected.
(function(){
  try{
    if(typeof ACTIVE_PROFILE==='undefined'||ACTIVE_PROFILE!=='reginaldo')return;
    if(!db?.training?.current)return;

    const VERSION='reginaldo_abcde_priority_v4';
    const PLAN_BACKUP_KEY='treino_v1_backup_before_abcde_v4_20261030';
    const REPAIR_KEY='treino_reginaldo_lateral_raise_25_to_9_20261029_v1';
    const REPAIR_BACKUP_KEY='treino_v1_backup_before_lateral_raise_repair_20261029';
    const p=db.training.current;
    const clone=x=>JSON.parse(JSON.stringify(x));

    function repairLateralRaise(){
      try{if(localStorage.getItem(REPAIR_KEY)==='1')return false}catch(e){}
      let changed=false,backedUp=false;
      const backup=()=>{
        if(backedUp)return;
        backedUp=true;
        try{
          if(!localStorage.getItem(REPAIR_BACKUP_KEY)){
            const raw=localStorage.getItem(KEY);
            if(raw)localStorage.setItem(REPAIR_BACKUP_KEY,raw);
          }
        }catch(e){}
      };
      const fixRows=rows=>{
        if(!Array.isArray(rows))return;
        rows.forEach(s=>{if(s&&Number(s.w)===25){backup();s.w=9;changed=true;}});
      };
      for(const log of db.logs||[]){
        fixRows(log?.exById?.lateral_raise);
        if(Array.isArray(log?.exerciseOrder))log.exerciseOrder.forEach((id,i)=>{if(id==='lateral_raise')fixRows(log?.ex?.[i]);});
        else (log?.planSnapshot?.days?.[log.day]?.ex||[]).forEach((x,i)=>{if(x?.id==='lateral_raise')fixRows(log?.ex?.[i]);});
      }
      for(const [d,def] of Object.entries(p.days||{}))(def.ex||[]).forEach((x,i)=>{if(x?.id==='lateral_raise')fixRows(db.draft?.[d]?.[i]);});
      if(changed){try{save()}catch(e){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(_){}}}
      try{localStorage.setItem(REPAIR_KEY,'1')}catch(e){}
      return changed;
    }

    repairLateralRaise();
    if(p.programVersion===VERSION||p.programVersion==='reginaldo_abcde_priority_v5')return;

    // Do not rearrange a workout while a real session is in progress.
    const activeDraft=Object.values(db.draft||{}).some(dayDraft=>Object.values(dayDraft||{}).some(rows=>Array.isArray(rows)&&rows.some(s=>s&&s.ok)));
    if(activeDraft)return;

    // Local safety copy of treino_v1 before changing the permanent plan structure.
    try{
      if(!localStorage.getItem(PLAN_BACKUP_KEY)){
        const raw=localStorage.getItem(KEY);
        if(raw)localStorage.setItem(PLAN_BACKUP_KEY,raw);
      }
    }catch(e){}

    const ex=(id,name,target,sets,type='weight_reps')=>({id,name,target,sets,type,catalogId:id});
    const oldDays=clone(p.days||{}),oldDraft=clone(db.draft||{});

    p.name='Plano Prioridade Superior';
    p.goal='Recomposição corporal + hipertrofia prioritária de peito, braços e ombros';
    p.reviewWeeks=8;
    p.programVersion=VERSION;
    p.schedule={mode:'sequence',preferredDays:[1,2,3,4,5],allowSaturdayCatchup:true};
    p.days={
      A:{name:'Peito Forte',muscles:'Peito • Tríceps • Ombro lateral',ex:[
        ex('bench_press_barbell','Supino reto com barra','3×6-10',3),
        ex('incline_dumbbell_press','Supino inclinado com halteres','3×8-12',3),
        ex('chest_fly','Crucifixo na polia ou peck deck','2×10-15',2),
        ex('lateral_raise','Elevação lateral','3×12-20',3),
        ex('triceps_rope_pushdown','Tríceps na polia (corda)','3×10-15',3)
      ]},
      B:{name:'Costas & Bíceps',muscles:'Costas • Bíceps • Ombro posterior',ex:[
        ex('lat_pulldown','Barra fixa ou puxada frontal','4×8-12',4),
        ex('machine_seated_row','Remada sentada na máquina','4×8-12',4),
        ex('face_pull','Face pull ou crucifixo invertido','3×12-20',3),
        ex('ez_bar_curl','Rosca direta com barra EZ','3×8-12',3),
        ex('hammer_curl','Rosca martelo','2×10-15',2)
      ]},
      C:{name:'Pernas & Core',muscles:'Quadríceps • Posterior • Glúteos • Panturrilha • Abdômen',ex:[
        ex('leg_press','Leg press','3×8-12',3),
        ex('leg_extension','Cadeira extensora','3×10-15',3),
        ex('leg_curl','Mesa flexora','3×10-15',3),
        ex('hip_thrust','Hip thrust','3×8-12',3),
        ex('seated_calf_raise','Panturrilha sentada','3×10-20',3),
        ex('ab_wheel_or_leg_raise','Abdominal infra ou roda','3×12-15',3,'reps')
      ]},
      D:{name:'Peito & Ombros',muscles:'Peito • Ombros',ex:[
        ex('machine_incline_press','Supino inclinado na máquina','3×8-12',3),
        ex('machine_chest_press','Chest press na máquina','2×8-12',2),
        ex('machine_shoulder_press','Shoulder press na máquina','3×8-12',3),
        ex('lateral_raise','Elevação lateral','3×12-20',3),
        ex('rear_delt_fly','Crucifixo invertido','2×12-20',2)
      ]},
      E:{name:'Braços & Acabamento',muscles:'Bíceps • Tríceps • Ombro lateral',ex:[
        ex('ez_bar_curl','Rosca direta com barra EZ','3×8-12',3),
        ex('incline_dumbbell_curl','Rosca inclinada com halteres','2×10-15',2),
        ex('triceps_rope_pushdown','Tríceps na polia (corda)','3×8-12',3),
        ex('cable_overhead_extension','Tríceps acima da cabeça na polia','2×10-15',2),
        ex('lateral_raise','Elevação lateral','2×12-20',2)
      ]}
    };

    // Drafts are positional in the legacy data model. Rebuild unfinished drafts by stable ID.
    // Completed history is never deleted; exercises removed from the future plan keep their old logs.
    for(const d of Object.keys(oldDraft)){
      const previous=oldDays?.[d]?.ex||[],next=p.days?.[d]?.ex||[],src=oldDraft[d]||{},dst={};
      previous.forEach((oldEx,oldIndex)=>{
        const newIndex=next.findIndex(x=>x.id===oldEx?.id);
        if(newIndex>=0&&Array.isArray(src[oldIndex]))dst[newIndex]=clone(src[oldIndex]);
      });
      if(Object.keys(dst).length)db.draft[d]=dst;else if(db.draft)delete db.draft[d];
    }

    for(const k of Object.keys(PLAN))delete PLAN[k];
    for(const [k,d] of Object.entries(p.days))PLAN[k]={n:d.name,ex:d.ex.map(x=>[x.name,x.target,Number(x.sets)||1,x.id])};

    if(typeof TIPS!=='undefined')Object.assign(TIPS,{
      'Chest press na máquina':'Ajuste o banco para as pegadas ficarem na linha média do peito. Mantenha as escápulas apoiadas, empurre sem tirar os ombros do encosto e retorne com controle.',
      'Tríceps acima da cabeça na polia':'Mantenha os cotovelos apontados para a frente e estenda os braços sem abrir os cotovelos. Volte devagar até sentir o tríceps alongar.',
      'Cadeira extensora':'Ajuste o joelho ao eixo da máquina. Estenda as pernas com controle e desça sem deixar o peso bater.',
      'Panturrilha sentada':'Desça o calcanhar para alongar e suba o máximo possível, pausando brevemente no topo.'
    });
    save();
  }catch(e){console.warn('Reginaldo ABCDE priority migration skipped',e);}
})();

// Targeted v5 adjustment; never rewrite completed logs or other profiles.
(function(){try{(function priorityV5(db,PLAN,storage,KEY,profile,notify){
  if(profile!=='reginaldo')return false;
  const old=db?.training?.current;
  if(!old||old.programVersion!=='reginaldo_abcde_priority_v4')return false;
  const currentE=old.days?.E?.ex;
  const expected=['ez_bar_curl','incline_dumbbell_curl','triceps_rope_pushdown','cable_overhead_extension','lateral_raise'];
  if(!currentE||JSON.stringify(currentE.map(x=>x.id))!==JSON.stringify(expected))return false;
  const drafts=db.draft||{};
  if(Object.values(drafts).some(d=>Object.values(d||{}).some(rows=>Array.isArray(rows)&&rows.some(s=>s?.ok))))return false;
  const flex=JSON.parse(storage.getItem('treino_workout_flex_v1')||'{}');
  const extraSets=JSON.parse(storage.getItem('treino_session_extra_sets_v1')||'{}');
  const hasVariant=d=>{const s=flex.sessions?.[old.id+':'+d];return !!(Object.keys(s?.subs||{}).length||s?.extras?.length)};
  if(hasVariant('E')||Object.keys(extraSets.sessions||{}).length)return false;
  if(Object.keys(drafts.E||{}).some(k=>!Number.isInteger(Number(k))||Number(k)<0||Number(k)>=currentE.length))return false;
  const clone=x=>JSON.parse(JSON.stringify(x));
  const next=clone(old),nextDraft=clone(drafts);
  const ex=(id,name,target,sets)=>({id,name,target,sets,type:'weight_reps',catalogId:id});
  next.days.E.ex=[
    ex('machine_seated_row','Remada sentada na máquina','3×8-12',3),
    ex('machine_biceps_curl','Rosca na máquina','3×8-12',3),
    ex('bayesian_curl','Rosca bayesian na polia','2×10-15',2),
    clone(currentE[2]),clone(currentE[3])
  ];
  next.days.E.muscles='Costas • Bíceps • Tríceps';
  next.programVersion='reginaldo_abcde_priority_v5';
  if(drafts.E){const dst={};currentE.forEach((x,i)=>{const j=next.days.E.ex.findIndex(y=>y.id===x.id);if(j>=0&&Array.isArray(drafts.E[i]))dst[j]=clone(drafts.E[i]);});if(Object.keys(dst).length)nextDraft.E=dst;else delete nextDraft.E;}
  // Known stale prefill in this export: 55 kg from a chest fly in the lateral raise slot.
  // Clear only that exact unchecked pattern, never a completed set or an active substitution.
  for(const d of ['A','D']){if(hasVariant(d))continue;const i=old.days?.[d]?.ex?.findIndex(x=>x.id==='lateral_raise');const rows=nextDraft[d]?.[i];if(i>=0&&Array.isArray(rows)&&rows.length&&rows.every(s=>!s?.ok&&Number(s?.w)===55&&Number(s?.r)===12))delete nextDraft[d][i];}
  const backupKey='treino_v1_backup_before_abcde_v5_20261125';
  const raw=storage.getItem(KEY);
  if(raw===null)return false;
  if(storage.getItem(backupKey)===null)storage.setItem(backupKey,raw);
  if(storage.getItem(backupKey)!==raw)return false;
  const updated={...db,training:{...db.training,current:next},draft:nextDraft,u:Date.now()};
  const serialized=JSON.stringify(updated);
  storage.setItem(KEY,serialized);
  if(storage.getItem(KEY)!==serialized)return false;
  db.training.current=next;db.draft=nextDraft;db.u=updated.u;
  for(const [k,d] of Object.entries(next.days))PLAN[k]={n:d.name,ex:d.ex.map(x=>[x.name,x.target,Number(x.sets)||1,x.id])};
  if(typeof notify==='function')notify();
  return true;
})(db,PLAN,localStorage,KEY,typeof ACTIVE_PROFILE==='undefined'?null:ACTIVE_PROFILE,typeof push==='function'?push:null);}catch(e){console.warn('Reginaldo ABCDE v5 skipped',e);}})();
