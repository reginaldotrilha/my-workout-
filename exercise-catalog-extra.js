// Extra exercises added without changing existing exercise IDs/history.
(function(){
  const extraExercises=[
    {
      id:'machine_seated_row',
      name:'Remada sentada na máquina',
      group:'Costas',
      equipment:'machine',
      target:'3×8-12',
      sets:3,
      type:'weight_reps',
      file:'img/machine_seated_row.jpg'
    },
    {
      id:'machine_incline_press',
      name:'Supino inclinado na máquina',
      group:'Peito',
      equipment:'machine',
      target:'3×8-12',
      sets:3,
      type:'weight_reps'
    },
    {
      id:'dumbbell_fly',
      name:'Crucifixo com halteres',
      group:'Peito',
      equipment:'dumbbell',
      target:'2×10-15',
      sets:2,
      type:'weight_reps'
    },
    {
      id:'decline_dumbbell_press',
      name:'Supino declinado com halteres',
      group:'Peito',
      equipment:'dumbbell',
      target:'3×8-12',
      sets:3,
      type:'weight_reps'
    },
    {
      id:'incline_dumbbell_fly',
      name:'Crucifixo inclinado com halteres',
      group:'Peito',
      equipment:'dumbbell',
      target:'3×10-15',
      sets:3,
      type:'weight_reps'
    },
    {
      id:'decline_dumbbell_fly',
      name:'Crucifixo declinado com halteres',
      group:'Peito',
      equipment:'dumbbell',
      target:'3×10-15',
      sets:3,
      type:'weight_reps'
    },
    {
      id:'dumbbell_squeeze_press',
      name:'Supino squeeze com halteres',
      group:'Peito',
      equipment:'dumbbell',
      target:'3×10-15',
      sets:3,
      type:'weight_reps'
    },
    {
      id:'dumbbell_floor_press',
      name:'Supino no chão com halteres',
      group:'Peito',
      equipment:'dumbbell',
      target:'3×8-12',
      sets:3,
      type:'weight_reps'
    },
    {
      id:'single_arm_dumbbell_press',
      name:'Supino unilateral com halter',
      group:'Peito',
      equipment:'dumbbell',
      target:'3×8-12',
      sets:3,
      type:'weight_reps'
    },
    {
      id:'single_arm_incline_dumbbell_press',
      name:'Supino inclinado unilateral com halter',
      group:'Peito',
      equipment:'dumbbell',
      target:'3×8-12',
      sets:3,
      type:'weight_reps'
    },
    {
      id:'neutral_grip_dumbbell_press',
      name:'Supino com pegada neutra com halteres',
      group:'Peito',
      equipment:'dumbbell',
      target:'3×8-12',
      sets:3,
      type:'weight_reps'
    },
    {
      id:'dumbbell_close_grip_press',
      name:'Supino fechado com halteres',
      group:'Peito',
      equipment:'dumbbell',
      target:'3×8-12',
      sets:3,
      type:'weight_reps'
    },
    {
      id:'alternating_dumbbell_press',
      name:'Supino alternado com halteres',
      group:'Peito',
      equipment:'dumbbell',
      target:'3×8-12',
      sets:3,
      type:'weight_reps'
    }
  ];

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const response=await nativeFetch(input,init);
    try{
      const raw=typeof input==='string'?input:(input&&input.url)||'';
      const url=new URL(raw,location.href);
      if(url.pathname.endsWith('/exercise_catalog.json')){
        const data=await response.clone().json();
        if(Array.isArray(data?.exercises)){
          const ids=new Set(data.exercises.map(x=>x?.id));
          extraExercises.forEach(x=>{if(!ids.has(x.id))data.exercises.push(x)});
          data.totalExercises=data.exercises.length;
          return new Response(JSON.stringify(data),{
            status:response.status,
            statusText:response.statusText,
            headers:{'Content-Type':'application/json'}
          });
        }
      }
    }catch(e){}
    return response;
  };
})();