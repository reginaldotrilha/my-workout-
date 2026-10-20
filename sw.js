const CACHE='meu-treino-v27';
const ASSETS=['./','./index.html','./styles.css','./food-library.css','./profiles.js','./workouts.js','./app.js','./food.js','./scanner.js','./food-library.js','./energy-balance.js','./smart-food-suggestions.js','./meal-aware-suggestions.js','./progress.js','./training.js','./training-compat.js','./exercise-types.js','./workout-flex.js','./exercise-catalog.js','./exercise-session-catalog.js','./exercise_catalog.json','./exercise-art.js','./exercise-images.json','./muscle-map.js','./extra-rename.js','./completed-workout-rename.js','./strength-history.js','./weight-chart.js','./measurement-trends.js','./boot.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin){return}
  e.respondWith(fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
