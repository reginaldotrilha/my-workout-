// Compatibility: old renders may have saved empty draft rows. Remove only completely blank drafts so training.js can prefill them from the last completed workout.
(function(){
  for(const d of Object.keys(db.draft||{})){
    const dayDraft=db.draft[d]||{};
    for(const i of Object.keys(dayDraft)){
      const rows=dayDraft[i];
      if(Array.isArray(rows)&&rows.length&&rows.every(s=>!s.ok&&!s.w&&!s.r)) delete dayDraft[i];
    }
    if(!Object.keys(dayDraft).length) delete db.draft[d];
  }
})();
