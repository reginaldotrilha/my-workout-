const ACTIVE_PROFILE=(window.MeuTreinoProfiles&&typeof window.MeuTreinoProfiles.current==='function')?window.MeuTreinoProfiles.current():'reginaldo';

const PROFILE_META={
 reginaldo:{planName:'Plano ABCD',goal:'Perda de gordura + manutenção e ganho muscular',reviewWeeks:8},
 sandra:{planName:'Retorno ABCD · Sandra',goal:'Perda de gordura + recuperação e ganho de massa muscular',reviewWeeks:6},
 eric:{planName:'ABCD Hipertrofia · Eric',goal:'Perda de gordura + ganho de massa muscular',reviewWeeks:8}
};
window.WORKOUT_PROFILE_META=PROFILE_META[ACTIVE_PROFILE]||PROFILE_META.reginaldo;

const PROFILE_PLANS={
 reginaldo:{
  A:{n:"Peito + Tríceps",ex:[["Supino reto com barra","4×6-10",4],["Supino inclinado com halteres","4×8-12",4],["Crucifixo na polia ou peck deck","3×12",3],["Tríceps testa","3×8-12",3],["Tríceps na polia (corda)","3×10-12",3]]},
  B:{n:"Costas + Bíceps",ex:[["Barra fixa ou puxada frontal","4×6-10",4],["Remada curvada com barra","4×8-10",4],["Remada unilateral com halter","3×10-12",3],["Rosca direta com barra","3×8-12",3],["Rosca martelo","3×10-12",3]]},
  C:{n:"Pernas",ex:[["Agachamento livre","4×6-10",4],["Leg press","4×10-12",4],["Stiff (levantamento terra romeno)","3×8-10",3],["Mesa flexora","3×10-12",3],["Panturrilha em pé","4×12-15",4]]},
  D:{n:"Ombros + Core",ex:[["Desenvolvimento militar","4×6-10",4],["Elevação lateral","4×12-15",4],["Face pull ou crucifixo invertido","3×12-15",3],["Encolhimento","3×10-12",3],["Prancha (segundos)","3×45-60s",3],["Abdominal infra ou roda","3×12-15",3]]}
 },
 sandra:{
  A:{n:"Peito + Tríceps · retorno",ex:[["Supino reto com barra","3×8-12",3],["Supino inclinado com halteres","3×8-12",3],["Crucifixo na polia ou peck deck","2×10-15",2],["Tríceps testa","2×10-12",2],["Tríceps na polia (corda)","2×10-15",2]]},
  B:{n:"Costas + Bíceps · retorno",ex:[["Barra fixa ou puxada frontal","3×8-12",3],["Remada curvada com barra","3×8-12",3],["Remada unilateral com halter","2×10-12",2],["Rosca direta com barra","2×10-12",2],["Rosca martelo","2×10-12",2]]},
  C:{n:"Pernas · retorno",ex:[["Agachamento livre","3×8-10",3],["Leg press","3×10-12",3],["Stiff (levantamento terra romeno)","2×8-12",2],["Mesa flexora","2×10-15",2],["Panturrilha em pé","3×12-15",3]]},
  D:{n:"Ombros + Core · retorno",ex:[["Desenvolvimento militar","3×8-12",3],["Elevação lateral","2×12-15",2],["Face pull ou crucifixo invertido","2×12-15",2],["Encolhimento","2×10-15",2],["Prancha (segundos)","3×30-45s",3],["Abdominal infra ou roda","2×10-15",2]]}
 },
 eric:{
  A:{n:"Peito + Tríceps · hipertrofia",ex:[["Supino reto com barra","4×6-10",4],["Supino inclinado com halteres","3×8-12",3],["Crucifixo na polia ou peck deck","3×10-15",3],["Tríceps testa","3×8-12",3],["Tríceps na polia (corda)","3×10-15",3]]},
  B:{n:"Costas + Bíceps · hipertrofia",ex:[["Barra fixa ou puxada frontal","4×6-10",4],["Remada curvada com barra","4×8-10",4],["Remada unilateral com halter","3×10-12",3],["Rosca direta com barra","3×8-12",3],["Rosca martelo","3×10-12",3]]},
  C:{n:"Pernas · hipertrofia",ex:[["Agachamento livre","4×6-10",4],["Leg press","4×10-12",4],["Stiff (levantamento terra romeno)","3×8-12",3],["Mesa flexora","3×10-15",3],["Panturrilha em pé","4×12-15",4]]},
  D:{n:"Ombros + Core · hipertrofia",ex:[["Desenvolvimento militar","4×6-10",4],["Elevação lateral","4×12-15",4],["Face pull ou crucifixo invertido","3×12-15",3],["Encolhimento","3×10-12",3],["Prancha (segundos)","3×45-60s",3],["Abdominal infra ou roda","3×12-15",3]]}
 }
};

const PLAN=PROFILE_PLANS[ACTIVE_PROFILE]||PROFILE_PLANS.reginaldo;

const TIPS={
"Supino reto com barra":"Deite com os olhos sob a barra, escápulas juntas e pés firmes no chão. Desça até o meio do peito, cotovelos a uns 45° do corpo, e empurre sem tirar o quadril do banco.",
"Supino inclinado com halteres":"Banco a 30-45°, escápulas para trás. Desça os halteres até a linha do peito e suba sem bater um no outro.",
"Crucifixo na polia ou peck deck":"Cotovelos levemente flexionados e fixos. Abra até sentir o peito alongar, sem forçar o ombro, e feche juntando os braços à frente.",
"Tríceps testa":"Cotovelos apontando para o teto e parados. Só o antebraço se move: desça até perto da testa e estenda sem travar o cotovelo com força.",
"Tríceps na polia (corda)":"Cotovelos colados ao tronco. Estenda os braços para baixo abrindo a corda no final e volte devagar até uns 90°.",
"Barra fixa ou puxada frontal":"Pegada um pouco mais larga que os ombros. Puxe levando os cotovelos para baixo, com o peito aberto, sem balançar o tronco.",
"Remada curvada com barra":"Tronco inclinado uns 45°, coluna reta e joelhos levemente flexionados. Puxe a barra em direção ao abdômen juntando as escápulas e desça com controle.",
"Remada unilateral com halter":"Apoie mão e joelho no banco, coluna reta. Puxe o halter em direção ao quadril, sem girar o tronco, e desça alongando as costas.",
"Rosca direta com barra":"Cotovelos colados ao corpo, sem balançar o tronco. Suba até contrair o bíceps e desça devagar até estender por completo.",
"Rosca martelo":"Palmas viradas uma para a outra. Suba sem mexer o cotovelo e desça controlando o movimento.",
"Agachamento livre":"Pés na largura dos ombros, abdômen firme. Leve o quadril para trás e os joelhos na direção dos pés, desça até a coxa ficar paralela ao chão e suba empurrando o chão. Use os suportes de segurança do rack.",
"Leg press":"Pés na largura dos ombros e lombar colada no encosto. Desça até uns 90° nos joelhos sem descolar o quadril e não trave os joelhos no topo.",
"Stiff (levantamento terra romeno)":"Joelhos levemente flexionados e coluna reta. Leve o quadril para trás deslizando a barra perto das pernas até sentir o posterior alongar, e volte contraindo o glúteo.",
"Mesa flexora":"Quadril colado ao banco. Flexione levando os calcanhares em direção ao glúteo e volte devagar, sem soltar o peso.",
"Panturrilha em pé":"Suba o máximo que puder nas pontas dos pés, pause 1 segundo no topo e desça alongando por completo.",
"Desenvolvimento militar":"Abdômen e glúteo contraídos, sem arquear a lombar. Empurre a barra acima da cabeça até estender os braços e desça até a altura do queixo.",
"Elevação lateral":"Cotovelos levemente flexionados. Suba os halteres até a altura dos ombros, sem balançar o corpo, e desça devagar.",
"Face pull ou crucifixo invertido":"No face pull, puxe a corda em direção ao rosto com os cotovelos altos, juntando as escápulas. No crucifixo invertido, incline o tronco e abra os braços sem usar impulso.",
"Encolhimento":"Braços estendidos, suba os ombros em direção às orelhas, pause 1 segundo e desça devagar, sem girar os ombros.",
"Prancha (segundos)":"Cotovelos sob os ombros e corpo em linha reta da cabeça aos calcanhares, com abdômen e glúteo contraídos, sem deixar o quadril cair.",
"Abdominal infra ou roda":"No abdominal infra, mantenha a lombar colada e suba o quadril com controle. Na roda, vá só até onde conseguir manter a lombar neutra."
};
const EN={"Supino reto com barra":"barbell bench press","Supino inclinado com halteres":"incline dumbbell bench press","Crucifixo na polia ou peck deck":"pec deck fly","Tríceps testa":"skull crusher","Tríceps na polia (corda)":"cable rope triceps pushdown","Barra fixa ou puxada frontal":"lat pulldown","Remada curvada com barra":"barbell bent over row","Remada unilateral com halter":"one arm dumbbell row","Rosca direta com barra":"barbell curl","Rosca martelo":"hammer curl","Agachamento livre":"barbell back squat","Leg press":"leg press","Stiff (levantamento terra romeno)":"romanian deadlift","Mesa flexora":"lying leg curl","Panturrilha em pé":"standing calf raise","Desenvolvimento militar":"overhead press","Elevação lateral":"dumbbell lateral raise","Face pull ou crucifixo invertido":"face pull","Encolhimento":"dumbbell shrug","Prancha (segundos)":"plank","Abdominal infra ou roda":"lying leg raise"};