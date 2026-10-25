// Reginaldo-specific ABCDE plan migration.
// Keeps the current plan id/start date so all stable exercise history remains connected.
(function(){
  try{
    if(typeof ACTIVE_PROFILE==='undefined'||ACTIVE_PROFILE!=='reginaldo')return;
    if(!db?.training?.current)return;

    const VERSION='reginaldo_abcde_focus_v1';
    const p=db.training.current;
    if(p.programVersion===VERSION)return;

    const ex=(id,name,target,sets,type='weight_reps')=>({id,name,target,sets,type,catalogId:id});

    p.name='Plano ABCDE';
    p.goal='Recomposição corporal + hipertrofia prioritária de peito, braços e ombros';
    p.reviewWeeks=8;
    p.programVersion=VERSION;
    p.days={
      A:{
        name:'Peito + Tríceps',
        ex:[
          ex('bench_press_barbell','Supino reto com barra','4×6-10',4),
          ex('incline_dumbbell_press','Supino inclinado com halteres','4×8-12',4),
          ex('chest_fly','Crucifixo na polia ou peck deck','4×10-15',4),
          ex('triceps_skullcrusher','Tríceps testa','3×8-12',3),
          ex('triceps_rope_pushdown','Tríceps na polia (corda)','3×10-15',3)
        ]
      },
      B:{
        name:'Costas + Bíceps',
        ex:[
          ex('lat_pulldown','Barra fixa ou puxada frontal','4×6-10',4),
          ex('barbell_row','Remada curvada com barra','4×8-10',4),
          ex('one_arm_dumbbell_row','Remada unilateral com halter','3×10-12',3),
          ex('barbell_curl','Rosca direta com barra','3×8-12',3),
          ex('hammer_curl','Rosca martelo','3×10-12',3)
        ]
      },
      C:{
        name:'Pernas',
        ex:[
          ex('leg_press','Leg press','4×10-12',4),
          ex('leg_curl','Mesa flexora','3×10-12',3),
          ex('leg_extension','Cadeira extensora','3×10-15',3),
          ex('seated_calf_raise','Panturrilha sentada','4×12-20',4),
          ex('abductor_machine','Máquina abdutora','3×15-20',3),
          ex('adductor_machine','Máquina adutora','3×15-20',3)
        ]
      },
      D:{
        name:'Ombros + Core',
        ex:[
          ex('overhead_press','Desenvolvimento militar','4×6-10',4),
          ex('lateral_raise','Elevação lateral','4×12-15',4),
          ex('face_pull','Face pull ou crucifixo invertido','3×12-15',3),
          ex('shrug','Encolhimento','3×10-12',3),
          ex('plank','Prancha (segundos)','3×45-60s',3,'time'),
          ex('ab_wheel_or_leg_raise','Abdominal infra ou roda','3×12-15',3,'reps')
        ]
      },
      E:{
        name:'Peito + Braços + Ombro lateral',
        ex:[
          ex('incline_dumbbell_press','Supino inclinado com halteres','3×8-12',3),
          ex('machine_chest_press','Chest press na máquina','3×8-12',3),
          ex('lateral_raise','Elevação lateral','3×12-20',3),
          ex('cable_curl','Rosca na polia','3×10-15',3),
          ex('cable_overhead_extension','Tríceps acima da cabeça na polia','3×10-15',3)
        ]
      }
    };

    // PLAN is the live rendering source. Keep it synchronized with the migrated plan.
    for(const k of Object.keys(PLAN))delete PLAN[k];
    for(const [k,d] of Object.entries(p.days)){
      PLAN[k]={n:d.name,ex:d.ex.map(x=>[x.name,x.target,Number(x.sets)||1,x.id])};
    }

    // C changed exercise order; discard only that stale unfinished draft to avoid remapping sets.
    if(db.draft){delete db.draft.C;delete db.draft.E;}

    // Add technique guidance for exercises introduced by the new plan.
    if(typeof TIPS!=='undefined')Object.assign(TIPS,{
      'Chest press na máquina':'Ajuste o banco para as pegadas ficarem na linha média do peito. Mantenha as escápulas apoiadas, empurre sem tirar os ombros do encosto e retorne com controle.',
      'Rosca na polia':'Mantenha os cotovelos junto ao tronco e o corpo parado. Flexione os cotovelos até contrair o bíceps e desça controlando até quase estender completamente.',
      'Tríceps acima da cabeça na polia':'Fique firme, mantenha os cotovelos apontados para a frente e estenda os braços sem abrir os cotovelos. Volte devagar até sentir o tríceps alongar.',
      'Cadeira extensora':'Ajuste o joelho ao eixo da máquina. Estenda as pernas com controle, contraia o quadríceps no topo e desça sem deixar o peso bater.',
      'Panturrilha sentada':'Mantenha a parte da frente dos pés apoiada, desça o calcanhar para alongar bem e suba o máximo possível, pausando brevemente no topo.',
      'Máquina abdutora':'Mantenha o tronco estável e abra os joelhos contra a resistência sem impulso. Retorne devagar mantendo tensão.',
      'Máquina adutora':'Mantenha o tronco apoiado e aproxime as pernas com controle. Evite bater os pesos e retorne devagar.'
    });
    if(typeof EN!=='undefined')Object.assign(EN,{
      'Chest press na máquina':'machine chest press',
      'Rosca na polia':'cable biceps curl',
      'Tríceps acima da cabeça na polia':'cable overhead triceps extension',
      'Cadeira extensora':'leg extension machine',
      'Panturrilha sentada':'seated calf raise',
      'Máquina abdutora':'hip abductor machine',
      'Máquina adutora':'hip adductor machine'
    });

    save();
  }catch(e){
    console.warn('Reginaldo ABCDE migration skipped',e);
  }
})();
