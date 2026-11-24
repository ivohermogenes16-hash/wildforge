// Coletivas de imprensa variadas: muitos cenários, várias formas de perguntar,
// respostas em tons diferentes (sorteadas a cada coletiva) e manchete depois da resposta.
const pk = (a) => a[Math.floor(Math.random() * a.length)];
const shuf = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => (v[k] != null ? v[k] : ''));

export const REPORTERS = [
  ['Carla Menezes', 'Rádio Arquibancada'], ['Rogério Pires', 'Portal Bola Rolando'], ['Juliana Prado', 'Canal Resenha FC'], ['Marcos Vidal', 'Jornal do Torcedor'],
  ['Fernanda Lopes', 'TV Lance Livre'], ['Diego Sampaio', 'Podcast Camisa 10'], ['Patrícia Rocha', 'Blog Prancheta Tática'], ['Thiago Alencar', 'Rádio Grande Área'],
  ['Bruna Teles', 'Revista Meia-Lua'], ['Eduardo Neves', 'Folha da Torcida'], ['Larissa Campos', 'Canal Linha de Fundo'], ['Renato Farias', 'Rádio Gol de Placa'],
];

// tons: efeito base + rótulo
export const TONES = {
  calmo: { n: 'Equilibrado', fx: { pp: -2, mor: 1 } },
  confiante: { n: 'Confiante', fx: { mor: 3, fans: 2, pp: 1 } },
  provoca: { n: 'Provocador', fx: { fans: 4, pop: 3, pp: 3 }, boast: true },
  elenco: { n: 'Defende o elenco', fx: { mor: 4, rel: 2 } },
  assume: { n: 'Assume a culpa', fx: { pp: -3, conf: 1, mor: 2 } },
  cobra: { n: 'Cobra os jogadores', fx: { mor: -4, conf: 2, chem: -2 } },
  torcida: { n: 'Fala com a torcida', fx: { fans: 4, pop: 1 } },
  evasivo: { n: 'Evasivo', fx: { pp: 2, pop: -1 } },
  pede: { n: 'Pede reforços', fx: { conf: -3, mor: -1, fans: 1 } },
  humilde: { n: 'Humilde', fx: { pp: -2, rep: 0.3 } },
};

// frases genéricas por tom (completam qualquer cenário)
const GEN = {
  calmo: ['Futebol é feito de momentos. Vamos analisar com calma.', 'Nem tão ao céu, nem tão à terra. Seguimos trabalhando.', 'A temporada é longa. O importante é a regularidade.', 'Prefiro avaliar tudo com tranquilidade amanhã, no CT.', 'Cada jogo tem sua história. Esse aqui também.', 'Equilíbrio é a palavra. Não dá para se empolgar nem se desesperar.'],
  confiante: ['Esse grupo tem qualidade para ir muito longe.', 'Acredito muito no que estamos construindo.', 'Pode ter certeza: vamos brigar lá em cima.', 'Estamos no caminho certo e todo mundo está vendo.', 'Esse time ainda vai dar muita alegria.', 'Confio de olhos fechados nesse elenco.'],
  provoca: ['Quem não acreditava em nós vai ter que engolir.', 'Tem gente que ainda não entendeu o tamanho deste clube.', 'Podem anotar: o favorito aqui somos nós.', 'Respeito todo mundo, mas não tenho medo de ninguém.', 'Os críticos estão muito quietos hoje, né?', 'O adversário que se preocupe com a gente.'],
  elenco: ['O mérito é todo dos jogadores. Eles abraçaram a ideia.', 'Tenho um grupo trabalhador, que se entrega em todo treino.', 'Os jogadores merecem todos os elogios.', 'Esse vestiário é diferente. Um ajuda o outro.', 'Quero destacar o comprometimento de cada atleta.', 'Ninguém aqui se esconde. Isso me orgulha.'],
  assume: ['A responsabilidade é minha. Eu escalei e eu respondo.', 'Errei na leitura do jogo. Vou corrigir.', 'Se alguém tem que ser cobrado, sou eu.', 'Assumo. Os jogadores fizeram o que eu pedi.', 'Não vou procurar desculpas. Falhei.', 'A conta é minha. Ponto.'],
  cobra: ['Alguns jogadores precisam entender a camisa que vestem.', 'Faltou atitude. Vou conversar individualmente.', 'Quem não estiver a fim vai sentar no banco.', 'Não aceito essa falta de intensidade.', 'Tem gente aqui jogando abaixo do que pode. Muito abaixo.', 'Vai ter mudança. Quem não render, sai.'],
  torcida: ['Essa é para a nossa torcida, que nunca abandona.', 'Peço que a torcida continue com a gente. Precisamos de vocês.', 'O torcedor é o nosso décimo segundo jogador.', 'Quero ver o estádio lotado no próximo jogo!', 'A torcida merece isso e muito mais.', 'Sem o apoio da arquibancada, nada disso seria possível.'],
  evasivo: ['Prefiro não comentar isso agora.', 'Próxima pergunta, por favor.', 'Isso é assunto interno. Fica no vestiário.', 'Não vou entrar nessa polêmica.', 'Vamos falar de futebol, que é o que interessa.', 'Sem comentários.'],
  pede: ['O elenco está curto. A diretoria sabe o que precisamos.', 'Precisamos de reforços para competir de verdade.', 'Com mais duas ou três peças, seríamos outro time.', 'Já passei para a diretoria as posições que precisam de reforço.', 'Não dá para disputar tudo com esse elenco.'],
  humilde: ['Ainda temos muito a aprender.', 'Respeito muito o adversário, que fez um grande trabalho.', 'Não somos melhores que ninguém. Trabalhamos.', 'Pés no chão. Ainda não ganhamos nada.', 'Há muito para melhorar, e eu sou o primeiro a reconhecer.', 'Humildade sempre. É assim que se cresce.'],
};

// cenários: perguntas, tons permitidos e frases próprias por tom
const PRE = {
  classico: { q: ['É clássico contra o {opp}. O que a torcida pode esperar?', 'Semana de clássico! Como está o clima no vestiário para enfrentar o {opp}?', 'O {opp} disse que é favorito no clássico. Você concorda?', 'Clássico vale mais que três pontos?'], t: ['calmo', 'provoca', 'torcida', 'confiante', 'humilde'], s: { provoca: ['Vamos vencer. Pode escrever.', 'Clássico é a gente que ganha. Sempre foi assim.', 'Favorito? Eles que falem. Domingo a gente responde em campo.'], calmo: ['Clássico não tem favorito. Respeito e intensidade.', 'É um jogo especial, mas a preparação é a mesma.'], torcida: ['Quero o estádio pulsando. Clássico se ganha com a torcida junto!'] } },
  decisivo: { q: ['Jogo decisivo de {comp}. A pressão pesa?', 'É mata-mata. Vocês estão prontos para decidir?', 'Uma vaga em jogo. Qual o segredo para jogos grandes?'], t: ['confiante', 'calmo', 'elenco', 'humilde', 'provoca'], s: { confiante: ['Pressão é privilégio. Estamos prontos.', 'Jogo grande é para time grande. E nós somos.'], calmo: ['Decisão se joga com a cabeça fria.'] } },
  lideranca: { q: ['Confronto direto pela liderança contra o {opp}. É uma final?', 'Líder contra vice-líder. Quem ganhar dispara?', 'Vale o topo da tabela. O título passa por esse jogo?'], t: ['calmo', 'confiante', 'provoca', 'humilde'], s: { confiante: ['Quem ganhar dá um passo enorme rumo ao título.'], provoca: ['Somos melhores que eles. Vamos mostrar.'] } },
  ameaca: { q: ['Há rumores de que este jogo pode decidir o seu futuro. Você se sente ameaçado?', 'A diretoria já procura outro técnico?', 'Você ainda tem o vestiário nas mãos?'], t: ['calmo', 'evasivo', 'confiante', 'assume', 'pede'], s: { calmo: ['Estou focado no trabalho, não em rumores.'], confiante: ['Confio que vamos virar essa situação.'], evasivo: ['Se a diretoria quiser mudar, é direito dela.'] } },
  favorito: { q: ['O {opp} está bem abaixo na tabela. É obrigação vencer?', 'Todo mundo dá a vitória como certa contra o {opp}. Isso preocupa?', 'Jogo fácil no papel. Vai poupar alguém?'], t: ['humilde', 'confiante', 'calmo', 'provoca'], s: { humilde: ['Não existe jogo fácil. O {opp} merece respeito.'], confiante: ['Jogando em casa, a obrigação é nossa. E vamos cumprir.'] } },
  azarao: { q: ['O {opp} é muito mais forte no papel. Dá para surpreender?', 'Ninguém aposta em vocês contra o {opp}. Isso motiva?', 'Como parar um time do tamanho do {opp}?'], t: ['humilde', 'confiante', 'provoca', 'elenco'], s: { provoca: ['Papel não ganha jogo. Gigante também cai.'], humilde: ['Eles são favoritos, mas futebol se joga em campo.'], confiante: ['Ninguém acredita? Melhor ainda. Vamos sem peso nenhum.'] } },
  embalado: { q: ['O time vem embalado. Até onde vai essa sequência?', 'Ninguém para vocês! Qual o segredo dessa fase?', 'Sequência de vitórias. Medo de relaxar?'], t: ['calmo', 'confiante', 'elenco', 'humilde'], s: { calmo: ['O segredo é não pensar na sequência. Um jogo de cada vez.'] } },
  crise: { q: ['O time vem de derrotas. O que muda para este jogo?', 'A torcida está impaciente. O que dizer a ela?', 'Fase ruim. Vai mexer no time titular?'], t: ['assume', 'cobra', 'torcida', 'calmo', 'pede'], s: { torcida: ['Peço paciência. Vamos dar a resposta em campo.'], cobra: ['Vai ter mudança, sim. Quem não está rendendo vai sair.'] } },
  estreia: { q: ['Começa a temporada! Qual é a meta?', 'Primeiro jogo do ano. O que esperar desse time?', 'Expectativa alta para a estreia. O elenco está pronto?'], t: ['confiante', 'humilde', 'torcida', 'provoca', 'pede'], s: {} },
  geral: { q: ['Como o time chega para enfrentar o {opp}?', 'Alguma novidade na escalação contra o {opp}?', 'O que você espera do {opp}?', 'Como foi a semana de treinos?', 'O {opp} vem bem. Qual cuidado especial?', 'O que você mudaria no time depois do último jogo?'], t: ['calmo', 'confiante', 'humilde', 'elenco', 'evasivo', 'provoca'], s: { evasivo: ['Escalação eu só passo para os jogadores.'] } },
};
const POST = {
  classicoV: { q: ['Vitória no clássico contra o {opp}! Uma mensagem para a torcida?', 'Clássico é de vocês! Qual o sabor dessa vitória?', 'Ganhar do {opp} vale quanto?'], t: ['torcida', 'elenco', 'provoca', 'calmo'], s: { torcida: ['Essa é para vocês, torcida! Clássico se ganha!'], provoca: ['A cidade tem dono. E não é o {opp}.'] } },
  classicoD: { q: ['Derrota no clássico. Como explicar para a torcida?', 'Perder para o {opp} dói mais?', 'O rival comemorou. Como fica o ambiente?'], t: ['assume', 'cobra', 'evasivo', 'torcida', 'calmo'], s: { cobra: ['Faltou entrega de alguns jogadores.'], evasivo: ['O resultado não reflete o que jogamos.'] } },
  classicoE: { q: ['Empate no clássico. Ficou bom para quem?', 'Clássico sem vencedor. Satisfeito?'], t: ['calmo', 'confiante', 'cobra', 'humilde'], s: {} },
  goleadaV: { q: ['Goleada de {gf}x{ga}! O time encontrou o caminho?', '{gf} gols! É o melhor jogo do time na temporada?', 'Atropelo sobre o {opp}. Dá para manter esse nível?', 'Que noite! O que funcionou tão bem hoje?'], t: ['calmo', 'confiante', 'elenco', 'humilde', 'provoca', 'torcida'], s: { calmo: ['O grupo está de parabéns, mas os pés no chão.'], confiante: ['Esse é o padrão que quero ver sempre.'], humilde: ['Ainda temos muito a melhorar.'] } },
  goleadaD: { q: ['Goleada sofrida por {gf}x{ga}. O que aconteceu?', 'Noite para esquecer. Faltou o quê?', '{ga} gols sofridos. A defesa preocupa?'], t: ['assume', 'cobra', 'pede', 'calmo', 'evasivo'], s: { calmo: ['Dia ruim. Vamos corrigir e seguir.'], assume: ['Eu errei na estratégia. Assumo.'] } },
  vitoria: { q: ['Vitória por {gf}x{ga}. Foi a atuação que você queria?', 'Três pontos importantes contra o {opp}. Satisfeito?', 'Vitória com sofrimento? Como você avalia?', 'O que decidiu o jogo hoje?'], t: ['calmo', 'elenco', 'confiante', 'humilde', 'torcida'], s: {} },
  apertada: { q: ['Vitória magra, mas vitória. Faltou matar o jogo?', 'Placar apertado. O time sofreu no fim?', 'Um gol de diferença. Dá para relaxar?'], t: ['calmo', 'cobra', 'elenco', 'humilde'], s: { cobra: ['Ganhamos, mas tem coisa que não pode se repetir.'] } },
  virada: { q: ['Que virada! O que você falou no vestiário?', 'Estavam perdendo e viraram. É o time com mais caráter do campeonato?', 'Virada heroica contra o {opp}! Como explicar?'], t: ['elenco', 'confiante', 'torcida', 'provoca'], s: { elenco: ['Esse grupo não desiste nunca. Caráter puro.'] } },
  empate: { q: ['Empate em {gf}x{ga}. Ponto ganho ou dois perdidos?', 'Ficou com gosto de quero mais?', 'Empate fora de casa é bom resultado?', 'O que faltou para vencer o {opp}?'], t: ['calmo', 'cobra', 'humilde', 'confiante', 'evasivo'], s: {} },
  zeroZero: { q: ['Zero a zero. Faltou criatividade?', 'Jogo truncado, sem gols. O ataque preocupa?'], t: ['calmo', 'cobra', 'pede', 'humilde'], s: {} },
  derrota: { q: ['Derrota para o {opp}. O que deu errado?', 'O time não jogou bem hoje. Concorda?', 'Como recuperar depois desse resultado?', 'Faltou o quê para pontuar?'], t: ['assume', 'cobra', 'calmo', 'evasivo', 'pede', 'torcida'], s: {} },
  zebraV: { q: ['Zebra! Vitória sobre o {opp}. Qual foi o segredo?', 'Ninguém apostava em vocês. Recado dado?', 'Derrubaram um gigante! Já dá para sonhar?'], t: ['elenco', 'provoca', 'humilde', 'confiante'], s: { humilde: ['Estudamos muito o adversário.'], elenco: ['Coração e entrega dos jogadores.'], provoca: ['Não é zebra. Somos um grande time.'] } },
  zebraD: { q: ['Derrota para o {opp}, que está bem abaixo. Vexame?', 'Perder para o {opp} foi inaceitável?'], t: ['assume', 'cobra', 'evasivo', 'humilde'], s: {} },
  serieD: { q: ['Três derrotas seguidas. O trabalho está em risco?', 'Sequência negativa. A diretoria conversou com você?', 'O time perdeu a confiança?'], t: ['calmo', 'assume', 'confiante', 'evasivo', 'pede', 'cobra'], s: { calmo: ['Confio no grupo e no processo.'], confiante: ['Vamos mudar algumas coisas já no próximo jogo.'], evasivo: ['Não estou preocupado com meu cargo.'] } },
  serieV: { q: ['Quatro vitórias seguidas. Dá para sonhar com o título?', 'Que fase! Esse é o melhor momento da sua carreira?', 'O time não para de vencer. Até onde?'], t: ['calmo', 'confiante', 'provoca', 'humilde', 'torcida'], s: { calmo: ['Sonhar é de graça, mas o foco é jogo a jogo.'], confiante: ['Sim! Esse time pode ser campeão.'] } },
  hat: { q: ['{pl} fez {n} gols! Ele merece a seleção?', 'Noite de {pl}. É o melhor jogador do campeonato?', '{pl} decidiu sozinho. Como segurar esse jogador?'], t: ['elenco', 'confiante', 'calmo', 'provoca'], s: { elenco: ['{pl} é diferenciado, mas o coletivo fez ele brilhar.', 'Não tenho dúvida: {pl} merece a seleção.'], calmo: ['Fico feliz por ele, mas ninguém ganha sozinho.'] } },
  expulso: { q: ['A expulsão de {pl} mudou o jogo?', '{pl} foi expulso. Vai ser punido internamente?'], t: ['cobra', 'calmo', 'evasivo', 'elenco'], s: { cobra: ['Foi infantil. Vamos conversar com ele.'], elenco: ['{pl} é intenso, e é isso que gosto nele. Vai aprender.'], evasivo: ['Melhor perguntar para o árbitro.'] } },
  semSofrer: { q: ['Mais um jogo sem sofrer gols. A defesa é o ponto forte?', 'Defesa sólida hoje. Mérito de quem?'], t: ['elenco', 'calmo', 'confiante'], s: { elenco: ['A defesa começa no ataque. Todo mundo marcou hoje.'] } },
};

const HEAD = {
  calmo: ['{coach} pede calma: "{a}"', '{coach} mantém o equilíbrio na coletiva', 'Pés no chão: {coach} evita euforia'],
  confiante: ['{coach} confia: "{a}"', 'Confiança em alta no {club}', '{coach} promete brigar lá em cima'],
  provoca: ['{coach} provoca e esquenta o clima: "{a}"', 'Polêmica! {coach} cutuca os críticos', 'Fala de {coach} repercute e irrita rivais'],
  elenco: ['{coach} exalta o elenco: "{a}"', 'Técnico do {club} blinda os jogadores', 'Vestiário fechado com {coach}'],
  assume: ['{coach} assume a culpa: "{a}"', 'Mea-culpa: {coach} chama a responsabilidade', '{coach} protege o grupo e assume o erro'],
  cobra: ['{coach} cobra o elenco publicamente: "{a}"', 'Clima tenso no {club} após fala de {coach}', 'Recado dado: {coach} ameaça mudanças'],
  torcida: ['{coach} convoca a torcida: "{a}"', 'Torcida do {club} aprova fala do técnico', '{coach} se declara à arquibancada'],
  evasivo: ['{coach} foge das perguntas na coletiva', 'Sem respostas: {coach} encerra o assunto', 'Silêncio de {coach} gera especulação'],
  pede: ['{coach} pede reforços: "{a}"', 'Recado à diretoria: {coach} quer contratações', 'Técnico do {club} expõe elenco curto'],
  humilde: ['{coach} adota tom humilde: "{a}"', 'Humildade marca a coletiva de {coach}', '{coach} reconhece: "ainda falta muito"'],
};

function answers(sc, v) {
  const tones = shuf(sc.t).slice(0, Math.random() < 0.4 ? 4 : 3);
  return tones.map((t) => {
    const T = TONES[t]; const own = sc.s?.[t] || []; const pool = own.length && Math.random() < 0.6 ? own : GEN[t];
    const l = fill(pk(pool), v); const fx = { ...T.fx };
    for (const k in fx) fx[k] = Math.round(fx[k] * (0.8 + Math.random() * 0.5) * 10) / 10;
    if (v.mult) for (const k in fx) fx[k] = Math.round(fx[k] * v.mult * 10) / 10;
    return { l, fx, tone: t, ...(T.boast && v.boastOk ? { boast: true } : {}) };
  });
}
function build(map, key, v) {
  const sc = map[key]; const rep = pk(REPORTERS);
  return { q: fill(pk(sc.q), v), a: answers(sc, v), rep: { n: rep[0], o: rep[1] }, ctx: key };
}

export function pressPre(G, ctx) {
  const { c, opp, comp, f, derby, form, st } = ctx; const v = { opp: opp.name, comp: comp.name, boastOk: true };
  let key = null;
  if (derby) key = 'classico';
  else if (f.ko >= 0 && f.ko >= comp.koWeeks.length - 2) { key = 'decisivo'; v.mult = 1.3; }
  else if (st && st.indexOf(c.id) < 3 && st.indexOf(opp.id) < 3 && st.indexOf(c.id) >= 0) key = 'lideranca';
  else if (c.board.conf < 30 && Math.random() < 0.5) key = 'ameaca';
  else if (ctx.big && opp.rep >= c.rep + 12) key = 'azarao';
  else if (ctx.big && /DDD$/.test(form)) key = 'crise';
  else if (ctx.big) key = 'geral';
  // 5.0: coletiva só em jogo importante (clássico, decisão, briga direta, jogo grande)
  return key ? build(PRE, key, v) : null;
}

export function pressPost(G, ctx) {
  const { c, opp, f, side, gf, ga, derby, form } = ctx; const v = { opp: opp.name, gf, ga };
  const ev = (f.ev || []).map((e) => ({ m: e[0], t: e[1], s: e[2], p: e[3] })).sort((a, b) => a.m - b.m);
  const mine = side; const goals = {}; let run = 0, wasBehind = false;
  for (const e of ev) { if (e.t !== 0) continue; run += e.s === mine ? 1 : -1; if (e.s === mine) goals[e.p] = (goals[e.p] || 0) + 1; if (run < 0) wasBehind = true; }
  const top = Object.entries(goals).sort((a, b) => b[1] - a[1])[0];
  const red = ev.find((e) => e.t === 1 && e.s === mine);
  const P = (id) => G.players[id]?.n || '';
  let key;
  // 5.0: coletiva pós-jogo só em jogo importante ou resultado marcante
  const notable = derby || ctx.big || (top && top[1] >= 3) || Math.abs(gf - ga) >= 4 || (gf > ga && opp.rep >= c.rep + 15) || (gf < ga && opp.rep <= c.rep - 18);
  if (!notable) return null;
  if (derby) key = gf > ga ? 'classicoV' : gf < ga ? 'classicoD' : 'classicoE';
  else if (top && top[1] >= 3 && Math.random() < 0.8) { key = 'hat'; v.pl = P(+top[0]); v.n = top[1]; }
  else if (red && Math.random() < 0.6) { key = 'expulso'; v.pl = P(red.p); }
  else if (gf > ga && wasBehind) key = 'virada';
  else if (gf - ga >= 3) key = 'goleadaV';
  else if (ga - gf >= 3) key = 'goleadaD';
  else if (gf > ga && opp.rep >= c.rep + 12) key = 'zebraV';
  else if (gf < ga && opp.rep <= c.rep - 14) key = 'zebraD';
  else if (/DDD$/.test(form)) key = 'serieD';
  else if (/VVVV$/.test(form)) key = 'serieV';
  else if (gf > ga && ga === 0 && Math.random() < 0.35) key = 'semSofrer';
  else if (gf > ga) key = gf - ga === 1 && Math.random() < 0.5 ? 'apertada' : 'vitoria';
  else if (gf === ga) key = gf === 0 && Math.random() < 0.6 ? 'zeroZero' : 'empate';
  else key = 'derrota';

  return build(POST, key, v);
}

export function pressHeadline(G, m, i) {
  const o = m.opts?.[i]; if (!o) return '';
  const short = o.l.length > 60 ? o.l.slice(0, 57).replace(/\s+\S*$/, '') + '…' : o.l;
  const c = G.me.job ? G.clubs[G.me.job.cid] : null;
  return fill(pk(HEAD[o.tone] || HEAD.calmo), { coach: G.me.name, a: short, club: c?.name || '' });
}
