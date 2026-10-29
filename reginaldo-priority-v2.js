// Reginaldo priority ABCDE v2: chest/arms/shoulders focus + named workout navigation.
// Keeps the current plan id/start date and stable exercise IDs so historical data remains connected.
(function(){
  try{
    if(typeof ACTIVE_PROFILE==='undefined'||ACTIVE_PROFILE!=='reginaldo')return;

    const VERSION='reginaldo_abcde_priority_v2';
    const META={
      A:{name:'Peito Forte',muscles:'Peito • Tríceps • Ombro lateral'},
      B:{name:'Costas & Bíceps',muscles:'Costas • Bíceps • Ombro posterior'},
      C:{name:'Pernas & Core',muscles:'Quadríceps • Posterior • Glúteos • Panturrilha • Abdômen'},
      D:{name:'Peito & Ombros',muscles:'Peito • Ombros'},
      E:{name:'Braços & Acabamento',muscles:'Bíceps • Tríceps • Ombro lateral • Costas leve'}
    };
    const ex=(id,name,target,sets,type='weight_reps')=>({id,name,target,sets,type,catalogId:id});

    function hasActiveDraft(){
      for(const d of Object.keys(db?.draft||{})){
        for(const rows of Object.values(db.draft[d]||{})){
          if(!Array.isArray(rows))continue;
          if(rows.some(s=>s&&(s.ok||String(s.w??'').trim()||String(s.r??'').trim()||String(s.seconds??'').trim())))return true;
        }
      }
      return false;
    }

    function syncPlanArrays(p){
      if(typeof PLAN==='undefined')return;
      for(const k of Object.keys(PLAN))delete PLAN[k];
      for(const [k,d] of Object.entries(p.days||{})){
        PLAN[k]={n:d.name,ex:(d.ex||[]).map(x=>[x.name,x.target,Number(x.sets)||1,x.id])};
      }
    }

    function applyPlan(){
      const p=db?.training?.current;
      if(!p)return false;
      if(p.programVersion===VERSION){syncPlanArrays(p);return true;}
      if(hasActiveDraft())return false;

      // Keep p.id and p.startedAt unchanged: this is a refinement of the same cycle, not a history reset.
      p.name='Plano Prioridade Superior';
      p.goal='Recomposição corporal + hipertrofia prioritária de peito, braços e ombros';
      p.reviewWeeks=8;
      p.programVersion=VERSION;
      p.days={
        A:{name:META.A.name,muscles:META.A.muscles,ex:[
          ex('bench_press_barbell','Supino reto com barra','3×6-10',3),
          ex('incline_dumbbell_press','Supino inclinado com halteres','3×8-12',3),
          ex('chest_fly','Crucifixo na polia ou peck deck','2×10-15',2),
          ex('lateral_raise','Elevação lateral','3×12-20',3),
          ex('triceps_rope_pushdown','Tríceps na polia (corda)','3×10-15',3),
          ex('cable_overhead_extension','Tríceps acima da cabeça na polia','2×10-15',2)
        ]},
        B:{name:META.B.name,muscles:META.B.muscles,ex:[
          ex('lat_pulldown','Barra fixa ou puxada frontal','3×8-12',3),
          ex('machine_seated_row','Remada sentada na máquina','3×8-12',3),
          ex('seated_cable_row','Remada baixa na polia','2×10-12',2),
          ex('face_pull','Face pull ou crucifixo invertido','2×12-20',2),
          ex('ez_bar_curl','Rosca direta com barra EZ','3×8-12',3),
          ex('hammer_curl','Rosca martelo','3×10-15',3)
        ]},
        C:{name:META.C.name,muscles:META.C.muscles,ex:[
          ex('leg_press','Leg press','3×8-12',3),
          ex('leg_extension','Cadeira extensora','3×10-15',3),
          ex('leg_curl','Mesa flexora','3×10-15',3),
          ex('hip_thrust','Hip thrust','3×8-12',3),
          ex('seated_calf_raise','Panturrilha sentada','3×10-20',3),
          ex('ab_wheel_or_leg_raise','Abdominal infra ou roda','3×12-15',3,'reps')
        ]},
        D:{name:META.D.name,muscles:META.D.muscles,ex:[
          ex('machine_incline_press','Supino inclinado na máquina','3×8-12',3),
          ex('machine_chest_press','Chest press na máquina','3×8-12',3),
          ex('chest_fly','Crucifixo na polia ou peck deck','2×12-15',2),
          ex('machine_shoulder_press','Shoulder press na máquina','2×8-12',2),
          ex('lateral_raise','Elevação lateral','3×12-20',3),
          ex('rear_delt_fly','Crucifixo invertido','2×12-20',2)
        ]},
        E:{name:META.E.name,muscles:META.E.muscles,ex:[
          ex('ez_bar_curl','Rosca direta com barra EZ','3×8-12',3),
          ex('incline_dumbbell_curl','Rosca inclinada com halteres','2×10-15',2),
          ex('triceps_rope_pushdown','Tríceps na polia (corda)','3×8-12',3),
          ex('cable_overhead_extension','Tríceps acima da cabeça na polia','2×10-15',2),
          ex('lateral_raise','Elevação lateral','2×12-20',2),
          ex('machine_seated_row','Remada sentada na máquina','2×10-15',2)
        ]}
      };

      syncPlanArrays(p);
      save();
      return true;
    }

    function info(d){
      const q=db?.training?.current?.days?.[d];
      return {name:q?.name||META[d]?.name||('Treino '+d),muscles:q?.muscles||META[d]?.muscles||''};
    }

    function installStyles(){
      if(document.getElementById('reginaldoPriorityV2Styles'))return;
      const s=document.createElement('style');
      s.id='reginaldoPriorityV2Styles';
      s.textContent=`
        .tabs.named-workout-tabs{display:flex;gap:8px;overflow-x:auto;padding:1px 0 7px;margin-bottom:10px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;scrollbar-width:none}
        .tabs.named-workout-tabs::-webkit-scrollbar{display:none}
        .tabs.named-workout-tabs button{flex:0 0 184px;min-height:66px;padding:8px 9px;display:grid;grid-template-columns:36px minmax(0,1fr);gap:8px;align-items:center;text-align:left;scroll-snap-align:start;font-family:Barlow,system-ui,sans-serif}
        .workout-letter{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:var(--bg);color:var(--acc);font:700 22px "Barlow Condensed",system-ui,sans-serif}
        .tabs.named-workout-tabs button[aria-pressed="true"] .workout-letter{background:color-mix(in srgb,var(--card) 88%,transparent);color:var(--acc)}
        .workout-tab-copy{min-width:0}.workout-tab-copy strong,.workout-tab-copy small{display:block}.workout-tab-copy strong{font-size:14px;line-height:1.1}.workout-tab-copy small{margin-top:4px;color:var(--mute);font-size:10px;font-weight:500;line-height:1.15;white-space:normal}
        .tabs.named-workout-tabs button[aria-pressed="true"] .workout-tab-copy small{color:color-mix(in srgb,var(--accink) 78%,transparent)}
        .priority-plan-pending{grid-column:1/-1;padding-top:6px;border-top:1px solid var(--line);color:var(--acc);font-size:12px;font-weight:600}
      `;
      document.head.appendChild(s);
    }

    function decorateTabs(){
      const box=$('tabs');if(!box)return;
      box.classList.add('named-workout-tabs');
      const keys=typeof trainingDayKeys==='function'?trainingDayKeys():Object.keys(db?.training?.current?.days||{});
      [...box.querySelectorAll('button')].forEach((b,i)=>{
        const d=keys[i];if(!d)return;
        const m=info(d);
        b.innerHTML='<span class="workout-letter"></span><span class="workout-tab-copy"><strong></strong><small></small></span>';
        b.querySelector('.workout-letter').textContent=d;
        b.querySelector('strong').textContent=m.name;
        b.querySelector('small').textContent=m.muscles;
        b.setAttribute('aria-label','Treino '+d+' · '+m.name+(m.muscles?' · '+m.muscles:''));
      });
      const selected=box.querySelector('button[aria-pressed="true"]');
      if(selected)requestAnimationFrame(()=>selected.scrollIntoView({block:'nearest',inline:'nearest'}));

      const bar=$('planSummary');
      if(bar&&db?.training?.current?.programVersion!==VERSION&&hasActiveDraft()&&!bar.querySelector('.priority-plan-pending')){
        const n=document.createElement('div');n.className='priority-plan-pending';n.textContent='Novo plano preparado — será aplicado ao finalizar o treino em andamento.';bar.appendChild(n);
      }
    }

    installStyles();
    applyPlan();

    if(typeof renderTabs==='function'){
      const baseRenderTabs=renderTabs;
      renderTabs=function(){baseRenderTabs.apply(this,arguments);decorateTabs();};
    }

    if(typeof renderList==='function'){
      const baseRenderList=renderList;
      renderList=function(){
        baseRenderList.apply(this,arguments);
        const m=info(day),next=typeof nextDay==='function'?nextDay():'';
        const sub=$('sub');
        if(sub)sub.textContent='Treino '+day+' · '+m.name+(m.muscles?' · '+m.muscles:'')+(next?' · sugerido hoje: '+next:'');
      };
    }

    // Loaded after workout-flex.js, so this wraps the final save routine.
    if(typeof finish==='function'){
      const baseFinish=finish;
      finish=function(){
        const before=(db.logs||[]).length;
        baseFinish.apply(this,arguments);
        if((db.logs||[]).length>before&&db?.training?.current?.programVersion!==VERSION&&!hasActiveDraft()){
          if(applyPlan()&&typeof render==='function')render();
        }
      };
    }
  }catch(e){console.warn('Reginaldo priority ABCDE v2 skipped',e);}
})();
