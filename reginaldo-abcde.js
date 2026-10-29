// Reginaldo-specific ABCDE priority plan.
// Keeps the current plan id/start date and stable exercise IDs so history stays connected.
(function(){
  try{
    if(typeof ACTIVE_PROFILE==='undefined'||ACTIVE_PROFILE!=='reginaldo')return;
    if(!db?.training?.current)return;

    const VERSION='reginaldo_abcde_priority_v2';
    const REPAIR_KEY='treino_reginaldo_lateral_raise_25_to_9_20261029_v1';
    const REPAIR_BACKUP_KEY='treino_v1_backup_before_lateral_raise_repair_20261029';
    const p=db.training.current;
    const clone=x=>JSON.parse(JSON.stringify(x));

    // One-time correction for data polluted when the priority plan changed exercise positions.
    // Lateral raise moved inside workout D and an old positional value (25) was carried into
    // both the draft and history. Reginaldo confirmed the correct value is 9 kg.
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
        rows.forEach(s=>{
          if(s&&Number(s.w)===25){backup();s.w=9;changed=true;}
        });
      };

      for(const log of db.logs||[]){
        fixRows(log?.exById?.lateral_raise);
        if(Array.isArray(log?.exerciseOrder)){
          log.exerciseOrder.forEach((id,i)=>{if(id==='lateral_raise')fixRows(log?.ex?.[i]);});
        }else{
          const snap=log?.planSnapshot?.days?.[log.day]?.ex||[];
          snap.forEach((x,i)=>{if(x?.id==='lateral_raise')fixRows(log?.ex?.[i]);});
        }
      }

      for(const [d,def] of Object.entries(p.days||{})){
        (def.ex||[]).forEach((x,i)=>{if(x?.id==='lateral_raise')fixRows(db.draft?.[d]?.[i]);});
      }

      if(changed){try{save()}catch(e){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(_){}}}
      try{localStorage.setItem(REPAIR_KEY,'1')}catch(e){}
      return changed;
    }

    repairLateralRaise();
    if(p.programVersion===VERSION)return;

    // Do not remap a session that is actually in progress. Prefilled historical weights alone do not count.
    const activeDraft=Object.values(db.draft||{}).some(dayDraft=>Object.values(dayDraft||{}).some(rows=>Array.isArray(rows)&&rows.some(s=>s&&s.ok)));
    if(activeDraft)return;

    const ex=(id,name,target,sets,type='weight_reps')=>({id,name,target,sets,type,catalogId:id});
    const oldDays=clone(p.days||{}),oldDraft=clone(db.draft||{});

    p.name='Plano Prioridade Superior';
    p.goal='Recomposição corporal + hipertrofia prioritária de peito, braços e ombros';
    p.reviewWeeks=8;
    p.programVersion=VERSION;
    p.days={
      A:{name:'Peito Forte',muscles:'Peito • Tríceps • Ombro lateral',ex:[
        ex('bench_press_barbell','Supino reto com barra','3×6-10',3),
        ex('incline_dumbbell_press','Supino inclinado com halteres','3×8-12',3),
        ex('chest_fly','Crucifixo na polia ou peck deck','2×10-15',2),
        ex('lateral_raise','Elevação lateral','3×12-20',3),
        ex('triceps_rope_pushdown','Tríceps na polia (corda)','3×10-15',3),
        ex('cable_overhead_extension','Tríceps acima da cabeça na polia','2×10-15',2)
      ]},
      B:{name:'Costas & Bíceps',muscles:'Costas • Bíceps • Ombro posterior',ex:[
        ex('lat_pulldown','Barra fixa ou puxada frontal','3×8-12',3),
        ex('machine_seated_row','Remada sentada na máquina','3×8-12',3),
        ex('seated_cable_row','Remada baixa na polia','2×10-12',2),
        ex('face_pull','Face pull ou crucifixo invertido','2×12-20',2),
        ex('ez_bar_curl','Rosca direta com barra EZ','3×8-12',3),
        ex('hammer_curl','Rosca martelo','3×10-15',3)
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
        ex('machine_chest_press','Chest press na máquina','3×8-12',3),
        ex('chest_fly','Crucifixo na polia ou peck deck','2×12-15',2),
        ex('machine_shoulder_press','Shoulder press na máquina','2×8-12',2),
        ex('lateral_raise','Elevação lateral','3×12-20',3),
        ex('rear_delt_fly','Crucifixo invertido','2×12-20',2)
      ]},
      E:{name:'Braços & Acabamento',muscles:'Bíceps • Tríceps • Ombro lateral • Costas leve',ex:[
        ex('ez_bar_curl','Rosca direta com barra EZ','3×8-12',3),
        ex('incline_dumbbell_curl','Rosca inclinada com halteres','2×10-15',2),
        ex('triceps_rope_pushdown','Tríceps na polia (corda)','3×8-12',3),
        ex('cable_overhead_extension','Tríceps acima da cabeça na polia','2×10-15',2),
        ex('lateral_raise','Elevação lateral','2×12-20',2),
        ex('machine_seated_row','Remada sentada na máquina','2×10-15',2)
      ]}
    };

    // Drafts are positional in the legacy data model. Whenever exercises are reordered,
    // rebuild each unfinished draft by stable exercise ID so values cannot leak to another exercise.
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
