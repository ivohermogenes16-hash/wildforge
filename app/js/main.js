import { esc, money } from './util.js';
import { S, H, render, toast, openSheet, closeSheet, replaceSheet, save, stars, starsH, clubStars } from './ui/app.js';
import './ui/pages.js';
import './ui/live.js';
import './ui/editor.js';
import './ui/base.js';
import './ui/life.js';
import { migrate } from './engine/life.js';
import './ui/nations.js';
import './ui/universe.js';
import './ui/nego.js';
import { afterRender, applyTheme } from './ui/extra.js';
import './ui/picker.js';
import './ui/tatica.js';
import './ui/simular.js';
import './ui/presidente.js';
import { musicOn, musicOff } from './ui/audio.js';
import { firstCommunity } from './ui/comunidade.js';
import { checkUpdate } from './ui/pacotes.js';
import { startIcons, stripEmoji } from './ui/icons.js';
import { initUniverse } from './engine/universe.js';
import { initBiz } from './engine/business.js';
import { initNations, natSetupYear } from './engine/nations.js';
import { setupU17 } from './engine/season.js';
import { ensureU17 } from './engine/world.js';
import { ensureBase } from './engine/youth.js';
import { crest } from './ui/art.js';
import { loadGame, deleteGame, loadImages, listSlots, getSlot, setSlot, SLOTS } from './store.js';
import { SET, DEF, saveSet, applySet, ACCENTS, askNotif, notifSupported, planReminders, cancelAll } from './settings.js';
import { newGame } from './engine/game.js';
import { LEAGUES, CLUBS, COUNTRIES } from './data/leagues.js';

const app = document.getElementById('app');
let hasSave = false;

let SL = {};
async function title() {
  try { SL = await listSlots(); } catch { SL = {}; }
  const cur = getSlot(); const m = SL[cur];
  hasSave = !!m;
  const build = window.PranchetaNative?.versionCode ? (() => { try { return ' · build ' + window.PranchetaNative.versionCode(); } catch { return ''; } })() : '';
  const M = [
    m ? ['loadsave', 'Continuar', `${esc(m.club)}${m.year ? ' · ' + m.year : ''}`] : null,
    ['ng', 'Nova carreira', 'Do sub-20 ao topo'],
    ['tslots', 'Carreiras', 'Até 3 salvas'],
    ['tcomu', 'Comunidade', 'Ideias e bugs'],
    ['tset', 'Configurações', 'Som, 3D, moeda'],
    ['tnews', 'Novidades', 'Versão 5.0'],
    ['thelp', 'Como jogar', ''],
    ['tpack', 'Pacotes', 'Escudos e times'],
  ].filter(Boolean);
  app.innerHTML = `<canvas id="bgcv" class="title-bg"></canvas><div class="rc-title">
  <div class="rc-prof"><span class="rc-av">${esc((m?.name || 'T')[0] || 'T').toUpperCase()}</span><div><b>${esc(m?.name || 'Novo técnico')}</b><small>${m?.rep != null && !m?.legacy ? `Reputação ${m.rep} · ${m.titles} títulos` : 'Bem-vindo ao Prancheta'}</small></div></div>
  <nav class="rc-menu">${M.map(([a, t, d], i) => `<button class="rc-mi${i === 0 ? ' first' : ''}" data-a="${a}" style="--d:${i * 0.05}s"><span class="rc-t">${t}</span>${d ? `<small>${d}</small>` : ''}</button>`).join('')}
    <button class="rc-mi sm" data-a="fs" style="--d:${M.length * 0.05}s"><span class="rc-t">⛶ Tela cheia</span></button></nav>
  <div class="rc-panel"><div class="rc-slant"></div><div class="rc-in">
    <div class="rc-kicker">MANAGER DE FUTEBOL</div>
    <div class="rc-logo">PRAN<span>CHETA</span></div>
    <div class="rc-sub">Do sub-20 ao império do futebol.</div>
    <div class="rc-stats"><div><b>960+</b><span>clubes reais</span></div><div><b>28</b><span>ligas</span></div><div><b>18</b><span>países</span></div></div>
    ${m ? `<div class="rc-save" data-a="loadsave" style="--c1:${m.c1 || '#1b2a25'};--c2:${m.c2 || '#0b1210'}"><small>Continuar · ${slotName(cur)}</small><b>${esc(m.club)}</b><span>${m.year ? `${m.year}, semana ${m.week + 1}` : ''}</span><i>▶</i></div>` : `<button class="btn pri big rc-cta" data-a="ng">✨ Começar carreira</button>`}
  </div></div>
  <div class="rc-ver">Lumbra Games · Versão 5.0${build}</div></div>`;
  startBg();
  firstCommunity(); musicOn();
}
const slotName = (s) => 'Espaço ' + s.slice(-1);
H.tslots = () => {
  openSheet(`<h2>Carreiras salvas</h2><div class="list">${SLOTS.map((sl) => { const m = SL[sl]; return `<div class="li"><div class="grow"><b>${slotName(sl)}${sl === getSlot() ? ' · atual' : ''}</b><div class="xs mut">${m ? `${esc(m.name || '')} · ${esc(m.club)}${m.year ? ` · ${m.year}` : ''}` : 'Vazio'}</div></div>${m ? `<button class="btn sm pri" data-a="tslot" data-v="${sl}:load">Jogar</button><button class="btn sm red" data-a="tslot" data-v="${sl}:del">Apagar</button>` : `<button class="btn sm" data-a="tslot" data-v="${sl}:new">Nova aqui</button>`}</div>`; }).join('')}</div><p class="xs mut">Até 3 carreiras diferentes ao mesmo tempo, cada uma no seu espaço.</p>`);
};
H.tslot = async (v) => {
  const [sl, a] = v.split(':');
  if (a === 'del') { if (S.delConf !== sl) { S.delConf = sl; toast('Toque de novo em Apagar para confirmar'); return; } S.delConf = null; await deleteGame(sl); closeSheet(); toast('Carreira apagada'); title(); return; }
  setSlot(sl); closeSheet(); if (a === 'load') H.loadsave(); else { title(); H.ng(); }
};
H.tset = () => openSheet(setHtml());
function setHtml() {
  const seg = (k, opts) => `<div class="seg" style="margin:0">${opts.map(([v, l]) => `<button class="${SET[k] === v ? 'on' : ''}" data-a="setv" data-v="${k}:${typeof v === 'boolean' ? (v ? 1 : 0) : v}">${l}</button>`).join('')}</div>`;
  return `<h2>Configurações</h2>
  <div class="field"><label>Moeda do jogo</label>${seg('cur', [['BRL', 'R$ Real'], ['USD', 'US$ Dólar'], ['EUR', '€ Euro']])}</div>
  <div class="field"><label>Efeitos sonoros (menus e botões)</label>${seg('sfx', [[true, 'Ligados'], [false, 'Desligados']])}</div>
  <div class="field"><label>Música do menu</label>${seg('music', [[true, 'Ligada'], [false, 'Desligada']])}</div>
  <div class="field"><label>Som da torcida e do jogo</label>${seg('crowd', [[true, 'Ligado'], [false, 'Desligado']])}</div>
  <div class="field"><label>Voz do narrador</label>${seg('voice', [['celular', 'Ligada'], ['off', 'Desligada']])}<div class="xs mut">Usa a voz do celular. Em breve: narração gravada.</div></div>
  <div class="field"><label>Dia de jogo (só em jogos grandes)</label>${seg('matchday', [[true, 'Ligado'], [false, 'Desligado']])}</div>
  <div class="field"><label>Redes sociais do jogo</label>${seg('social', [[true, 'Ligadas'], [false, 'Desligadas']])}</div>
  <div class="field"><label>Partida ao vivo</label>${seg('view3d', [['3d', '3D'], ['2d', '2D']])}</div>
  <div class="field"><label>Qualidade do 3D</label>${seg('q3d', [[0, 'Leve'], [1, 'Normal'], [2, 'Alta']])}</div>
  <div class="field"><label>Tema</label>${seg('theme', [['escuro', 'Escuro'], ['claro', 'Claro']])}</div>
  <div class="field"><label>Cores do seu clube na interface</label>${seg('clubTheme', [[true, 'Ligado'], [false, 'Desligado']])}</div>
  <div class="field"><label>Interface</label>${seg('simple', [[false, 'Completa'], [true, 'Simplificada']])}</div>
  <div class="field"><label>Velocidade inicial da partida ao vivo</label>${seg('speed', [[1, '1x'], [2, '2x'], [4, '4x'], [8, '8x']])}</div>
  <div class="field"><label>Replays dos gols</label>${seg('replays', [[true, 'Ligados'], [false, 'Desligados']])}</div>
  <div class="field"><label>Narrador</label>${seg('narrador', [['empolgado', 'Empolgado'], ['classico', 'Clássico'], ['resenha', 'Resenha']])}</div>
  <div class="field"><label>Legenda de narração no campo</label>${seg('narr', [[true, 'Mostrar'], [false, 'Esconder']])}</div>
  <div class="field"><label>Vibração nos gols</label>${seg('vib', [[true, 'Ligada'], [false, 'Desligada']])}</div>
  <div class="field"><label>Notificações (lembretes de jogos, propostas e empresas)</label>${seg('notif', [[true, 'Ligadas'], [false, 'Desligadas']])}${notifSupported() ? '<button class="btn sm" style="margin-top:6px" data-a="setnotif">🔔 Permitir notificações</button>' : '<div class="xs mut">Este navegador não suporta notificações; no APK elas funcionam.</div>'}</div>
  <div class="field"><label>Cor de destaque</label><div class="row" style="gap:8px">${Object.entries(ACCENTS).map(([k, [c]]) => `<button class="swatch ${SET.accent === k ? 'on' : ''}" style="background:${c}" data-a="setv" data-v="accent:${k}"></button>`).join('')}</div></div>
  <div class="field"><label>Tamanho do texto</label>${seg('size', [['pequeno', 'Pequeno'], ['normal', 'Normal'], ['grande', 'Grande']])}</div>
  <div class="field"><label>Ao clicar em Continuar com jogo do seu time</label>${seg('fast', [[false, 'Abrir pré-jogo'], [true, 'Resultado rápido direto']])}</div>`;
}
H.setv = (v) => { const [k, x] = v.split(':'); SET[k] = typeof DEFV[k] === 'boolean' ? x === '1' : typeof DEFV[k] === 'number' ? +x : x; saveSet(); if (k === 'music') { if (SET.music && !S.G) musicOn(); else musicOff(); } if (k === 'voice' && SET.voice !== 'off') { import('./ui/audio.js').then((a) => a.say('Narração ligada. Bola rolando!', 'teste', true)); } replaceSheet(setHtml()); applyTheme(); if (S.G) render(); };
const DEFV = DEF;
H.setnotif = async () => { const ok = await askNotif(); toast(ok ? '🔔 Notificações liberadas' : 'Permissão negada ou indisponível'); };
H.tnews = () => openSheet(`<h2>🆕 Novidades da versão 5.0</h2><div class="list">${[
  ['📋', 'Tática nova estilo EA FC: campo em perspectiva, abas Elenco/Táticas/Atribuições, reservas em grade e trocas sugeridas'],
  ['🎚️', 'Estilo de jogo com controles deslizantes — e o time realmente joga diferente no 3D e no 2D'],
  ['✏️', 'Prancheta ao vivo: pause, desenhe setas e o time obedece; substituições com o campo na tela'],
  ['🚩', 'Jogadas ensaiadas de escanteio e falta, com cobradores definidos'],
  ['🧑‍💼', 'Auxiliar técnico que analisa o adversário de verdade e sugere ajustes (dá vantagem real)'],
  ['💬', 'Conversas individuais com os jogadores: elogiar, cobrar, prometer vaga…'],
  ['⚽', '3D melhor: marcação, atacantes acompanhados, gol que entra conta como gol, textos discretos'],
  ['💰', 'Economia realista: salários, valores e premiações por fase, título e acesso; escolha Real, Dólar ou Euro'],
  ['⏩', 'Simular período (X jogos, até uma data, até a janela) com botão PARAR'],
  ['👔', 'Painel do Presidente: administre o clube que é seu enquanto treina outro'],
  ['🔊', 'Sons em tudo: menus, torcida, apito, gol e narração por voz'],
  ['📱', 'Redes sociais do jogo, dia de jogo nos jogos grandes e coletivas só nos jogos importantes'],
  ['🏟️', 'Tela inicial nova, escolha de modo com estrelas e ajustes antes de começar a carreira'],
  ['🤝', 'Comunidade no WhatsApp direto do jogo para mandar ideias e bugs'],
].map(([i, t]) => `<div class="li"><span style="font-size:20px">${i}</span><span class="grow">${t}</span></div>`).join('')}</div>`);
H.thelp = () => openSheet(`<h2>Como jogar</h2><div class="list">${[
  ['▶ Continuar', 'Avança o calendário. Nos jogos do seu time você escolhe jogar ao vivo ou ver só o resultado.'],
  ['📋 Tática', 'Escolha formação, instruções e escalação. Toque numa posição e depois no jogador. Salve táticas para trocar rápido.'],
  ['🌱 Base', 'Sub-20, Sub-17, olheiros e jovens de outras bases.'],
  ['💰 Mercado', 'Propostas, empréstimos, rede de olheiros e notícias do mercado.'],
  ['🏟️ Clube', 'Diretoria, finanças, estrutura, torcida, academias e comissão técnica.'],
  ['💼 Negócios', 'Seu patrimônio, empresas, patrocínios e clubes que você possui.'],
  ['🌍 Mundo', 'Jornal, temporadas, rivalidades, seleções, federações e história.'],
].map(([t, d]) => `<div class="li"><div class="grow"><b>${t}</b><div class="xs mut">${d}</div></div></div>`).join('')}</div>`);

// ---------- fundo animado: estádio à noite ----------
let bgRaf = 0;
function startBg() {
  cancelAnimationFrame(bgRaf);
  const cv = document.getElementById('bgcv'); if (!cv) return; const ctx = cv.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const crowd = Array.from({ length: 900 }, () => [Math.random(), Math.random(), Math.random()]);
  let flashes = [];
  const frame = (t) => {
    if (!document.getElementById('bgcv')) return;
    const W = cv.width = Math.round(innerWidth * dpr), H2 = cv.height = Math.round(innerHeight * dpr);
    const sky = ctx.createLinearGradient(0, 0, 0, H2); sky.addColorStop(0, '#02060a'); sky.addColorStop(0.5, '#071812'); sky.addColorStop(1, '#03100a'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H2);
    // arquibancada
    const top = H2 * 0.18, base = H2 * 0.55;
    ctx.fillStyle = '#0a1512'; ctx.beginPath(); ctx.moveTo(0, base); ctx.lineTo(0, top + H2 * 0.08); ctx.quadraticCurveTo(W / 2, top - H2 * 0.05, W, top + H2 * 0.08); ctx.lineTo(W, base); ctx.fill();
    for (const [x, y, k] of crowd) { const yy = top + H2 * 0.06 + y * (base - top - H2 * 0.06) - Math.sin(x * Math.PI) * H2 * 0.05; const tw = 0.25 + 0.35 * Math.abs(Math.sin(t / 900 + k * 40)); ctx.fillStyle = `rgba(${k < 0.33 ? '255,255,255' : k < 0.66 ? '47,224,138' : '244,197,66'},${tw * 0.5})`; ctx.fillRect(x * W, yy, 2 * dpr, 2 * dpr); }
    // gramado em perspectiva
    const gy = base; const g = ctx.createLinearGradient(0, gy, 0, H2); g.addColorStop(0, '#0f4a2b'); g.addColorStop(1, '#16683c'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(W * 0.08, gy); ctx.lineTo(W * 0.92, gy); ctx.lineTo(W * 1.2, H2); ctx.lineTo(-W * 0.2, H2); ctx.fill();
    for (let i = 0; i < 9; i++) { if (i % 2) continue; const a = i / 9, b2 = (i + 1) / 9; ctx.fillStyle = 'rgba(255,255,255,.03)'; ctx.beginPath(); ctx.moveTo(W * (0.08 + 0.84 * a), gy); ctx.lineTo(W * (0.08 + 0.84 * b2), gy); ctx.lineTo(W * (-0.2 + 1.4 * b2), H2); ctx.lineTo(W * (-0.2 + 1.4 * a), H2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5 * dpr; ctx.beginPath(); ctx.moveTo(W / 2, gy); ctx.lineTo(W / 2, H2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(W / 2, gy + (H2 - gy) * 0.45, W * 0.12, (H2 - gy) * 0.16, 0, 0, 7); ctx.stroke();
    // refletores e fachos
    for (const [lx, dir] of [[0.12, 1], [0.88, -1]]) {
      const x = W * lx, y = H2 * 0.08; const sw = Math.sin(t / 2600 + lx * 5) * 0.12;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, H2 * 0.5); gr.addColorStop(0, 'rgba(255,255,230,.35)'); gr.addColorStop(1, 'rgba(255,255,230,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H2);
      ctx.fillStyle = 'rgba(255,255,220,.06)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(W * (0.5 + dir * (-0.05 + sw)), H2); ctx.lineTo(W * (0.5 + dir * (0.25 + sw)), H2); ctx.fill();
      ctx.fillStyle = '#fffbe6'; for (let k = 0; k < 6; k++) ctx.fillRect(x - 15 * dpr + (k % 3) * 11 * dpr, y - 6 * dpr + Math.floor(k / 3) * 7 * dpr, 8 * dpr, 5 * dpr);
    }
    // flashes de câmera na torcida
    if (Math.random() < 0.15) flashes.push([Math.random() * W, top + Math.random() * (base - top) * 0.8, 1]);
    flashes = flashes.filter((f) => (f[2] -= 0.08) > 0); for (const [x, y, a] of flashes) { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.arc(x, y, 3 * dpr * a, 0, 7); ctx.fill(); }
    // vinheta
    const v = ctx.createRadialGradient(W / 2, H2 / 2, H2 * 0.3, W / 2, H2 / 2, W * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.7)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H2);
    bgRaf = requestAnimationFrame(frame);
  };
  bgRaf = requestAnimationFrame(frame);
}
H.fs = () => goFull();
async function goFull() {
  try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch {}
  try { await screen.orientation?.lock?.('landscape'); } catch {}
}
H.loadsave = async () => { goFull(); musicOff(); const G = await loadGame(); if (!G) { toast('Nenhum jogo salvo'); return; } S.G = G; migrate(G); if (!G.nat) { initNations(G); natSetupYear(G); G.nat.fix.forEach((f) => { if (f.w < G.week) f.skip = true; }); G.nat.fix = G.nat.fix.filter((f) => !f.skip); G.nat.fix.forEach((f, i) => (f.i = i)); for (const T of Object.values(G.nat.tours)) T.ko = []; } else initNations(G); G.me.cd ||= {}; initUniverse(G); initBiz(G); if (!G.comps.U17) { if (G.week < 24) setupU17(G, G.week + 1); else ensureU17(G); } if (G.me.job) ensureBase(G, G.me.job.cid); S.tab = 'home'; S.page = null; render(); };
H.ng = () => { goFull(); S.ng = { step: 0, name: '', age: 32, mode: 'sub20', lg: 'BRA', club: null, nat: 'BR', style: 'equil', origin: 'exjog', color: 'esmeralda' }; wiz(); };

const MODES = {
  sub20: { ic: '🌱', k: 'CARREIRA', t: 'Começar no Sub-20', d: 'Você assume a base de um clube da Série A. Revele garotos, ganhe nome e suba até o profissional.', dif: 3.5, din: 1, fam: 0.5, rec: true, g: ['#16a34a', '#064e3b'], p: ['Base, Sub-17 e olheiros', 'Propostas do profissional ao se destacar', 'Junte dinheiro e vire dono de clube'] },
  baixo: { ic: '🧗', k: 'CARREIRA', t: 'Técnico em início de carreira', d: 'Assuma o time principal de qualquer clube do mundo, de qualquer divisão, sem fama e sem dinheiro.', dif: 4, din: 1.5, fam: 1, g: ['#2563eb', '#1e1b4b'], p: ['Qualquer país e divisão', 'Diretoria exigente, pouca verba', 'Do pior ao topo'] },
  livre: { ic: '🌍', k: 'SEM AMARRAS', t: 'Modo livre', d: 'Escolha qualquer clube já como técnico experiente e com dinheiro no bolso para investir.', dif: 2, din: 4.5, fam: 4, g: ['#ca8a04', '#422006'], p: ['Fama e dinheiro desde o início', 'Ideal para montar um império', 'Compre clubes e empresas cedo'] },
};
const DIFS = [
  { n: 'Fácil', st: 1.5, d: 'Seu time rende um pouco acima, diretoria paciente e mais dinheiro no bolso.', bon: 1.5, money: 1.6, conf: 10 },
  { n: 'Normal', st: 3, d: 'O jogo como foi pensado: equilibrado.', bon: 0, money: 1, conf: 0 },
  { n: 'Difícil', st: 4, d: 'Adversários mais fortes contra você e diretoria cobrando mais.', bon: -1, money: 0.8, conf: -8 },
  { n: 'Lenda', st: 5, d: 'Para quem quer sofrer: tudo contra, menos dinheiro e paciência curta.', bon: -2, money: 0.6, conf: -15 },
];
const CSTYLE = { ofens: ['⚔️', 'Ofensivo', 'Time pra frente, muitos gols'], equil: ['⚖️', 'Equilibrado', 'Nem tanto ao ataque, nem à defesa'], defens: ['🛡️', 'Defensivo', 'Primeiro não sofrer gols'], posse: ['🎯', 'Posse de bola', 'Toque curto e paciência'], contra: ['⚡', 'Contra-ataque', 'Espera e mata em velocidade'] };
const CORIG = { exjog: ['👟', 'Ex-jogador', 'Respeito no vestiário'], analista: ['📊', 'Analista', 'Leitura tática apurada'], professor: ['📚', 'Professor', 'Começou dando aula de Educação Física'], base: ['🌱', 'Formador', 'Anos revelando garotos na base'] };
const CCOL = { esmeralda: ['#2fe08a', '#0e5a37'], ouro: ['#f4c542', '#6b4e0b'], gelo: ['#7fd6ff', '#164a66'], rubi: ['#ff5d73', '#5e1020'], ametista: ['#b38cff', '#3a1f6b'], grafite: ['#e9f2ee', '#2b3532'] };
const CNATS = ['BR', 'AR', 'UY', 'PT', 'ES', 'IT', 'EN', 'DE', 'FR', 'NL', 'CO', 'MX', 'US', 'JP'];
function coachCard(n) {
  const [c1, c2] = CCOL[n.color] || CCOL.esmeralda; const st = CSTYLE[n.style], og = CORIG[n.origin];
  const ini = (n.name || 'Seu Nome').split(/\s+/).filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  const lv = Math.max(1, Math.min(5, Math.round((n.age - 22) / 9)));
  return `<div class="cc-card" style="--c1:${c1};--c2:${c2}"><div class="cc-holo"></div><div class="cc-top"><span class="cc-tag">TÉCNICO</span><span class="cc-flag">${COUNTRIES[n.nat]?.flag || '🏳️'}</span></div>
    <div class="cc-av"><svg viewBox="0 0 100 100"><defs><linearGradient id="ccg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity=".05"/></linearGradient></defs><circle cx="50" cy="34" r="17" fill="url(#ccg)"/><path d="M16 96c3-24 17-36 34-36s31 12 34 36z" fill="url(#ccg)"/><path d="M42 62l8 14 8-14" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/></svg><b>${esc(ini || '?')}</b></div>
    <div class="cc-name" id="ccname">${esc(n.name || 'Seu nome')}</div>
    <div class="cc-sub"><span id="ccage">${n.age} anos</span> · ${esc(COUNTRIES[n.nat]?.name || '')}</div>
    <div class="cc-badges"><span>${st[0]} ${st[1]}</span><span>${og[0]} ${og[1]}</span></div>
    <div class="cc-exp"><small>Experiência</small><i>${'★'.repeat(lv)}<u>${'★'.repeat(5 - lv)}</u></i></div></div>`;
}
function wizSteps(i) { return `<div class="wz-steps">${['Treinador', 'Modo', 'Clube', 'Ajustes'].map((l, k) => `<div class="${k < i ? 'ok' : k === i ? 'on' : ''}"><span>${k < i ? '✓' : k + 1}</span>${l}</div>`).join('<i></i>')}</div>`; }
function wiz() {
  const n = S.ng;
  let h = `<div class="wiz"><div class="wz-top"><button class="btn sm" data-a="wback">‹ Voltar</button>${wizSteps(n.step)}<span style="width:70px"></span></div><div class="body">`;
  if (n.step === 0) {
    h += `<div class="cc-wrap"><div class="cc-left">${coachCard(n)}</div><div class="cc-form">
      <div class="cc-f"><label>Nome do técnico</label><input id="ngname" value="${esc(n.name)}" placeholder="Ex.: Carlos Andrade" maxlength="30" data-in="wname" autocomplete="off"></div>
      <div class="cc-row"><div class="cc-f"><label>Idade</label><div class="cc-age"><button class="btn sm" data-a="wage" data-v="-1">−</button><b id="ngage2">${n.age}</b><button class="btn sm" data-a="wage" data-v="1">+</button></div></div>
        <div class="cc-f grow"><label>Nacionalidade</label><select data-ch="wnat" data-title="Nacionalidade">${CNATS.filter((k) => COUNTRIES[k]).map((k) => `<option value="${k}" ${n.nat === k ? 'selected' : ''}>${COUNTRIES[k].flag} ${esc(COUNTRIES[k].name)}</option>`).join('')}</select></div></div>
      <div class="cc-f"><label>Estilo de jogo</label><div class="cc-opts">${Object.entries(CSTYLE).map(([k, [i, t, d]]) => `<button class="cc-o ${n.style === k ? 'on' : ''}" data-a="wsty" data-v="${k}" title="${esc(d)}"><span>${i}</span>${t}</button>`).join('')}</div><div class="xs mut" style="margin-top:3px">${esc(CSTYLE[n.style][2])} · vira a tática inicial do seu time.</div></div>
      <div class="cc-f"><label>Origem</label><div class="cc-opts">${Object.entries(CORIG).map(([k, [i, t, d]]) => `<button class="cc-o ${n.origin === k ? 'on' : ''}" data-a="wori" data-v="${k}" title="${esc(d)}"><span>${i}</span>${t}</button>`).join('')}</div><div class="xs mut" style="margin-top:3px">${esc(CORIG[n.origin][2])}.</div></div>
      <div class="cc-f"><label>Cor do seu cartão</label><div class="cc-cols">${Object.entries(CCOL).map(([k, [a, b2]]) => `<button class="cc-sw ${n.color === k ? 'on' : ''}" style="background:linear-gradient(135deg,${a},${b2})" data-a="wcol" data-v="${k}"></button>`).join('')}</div></div>
      <button class="btn pri big blk" data-a="w1">Continuar ›</button></div></div>`;
  } else if (n.step === 1) {
    h += `<div class="md-modes">${Object.entries(MODES).map(([k, M], i) => `<button class="md-card ${n.mode === k ? 'on' : ''}" data-a="wmode" data-v="${k}" style="--d:${i * 0.08}s;--g1:${M.g[0]};--g2:${M.g[1]}">
      ${M.rec ? '<span class="md-rib">RECOMENDADO</span>' : ''}<div class="md-art"><span>${M.ic}</span></div>
      <div class="md-body"><small>${M.k}</small><b>${M.t}</b><p>${M.d}</p>
      <div class="md-rows"><div><span>Dificuldade</span>${starsH(M.dif)}</div><div><span>Dinheiro inicial</span>${starsH(M.din)}</div><div><span>Fama inicial</span>${starsH(M.fam)}</div></div>
      <ul>${M.p.map((x) => `<li>${x}</li>`).join('')}</ul></div>${n.mode === k ? '<span class="md-check">✓</span>' : ''}</button>`).join('')}</div>
    <button class="btn pri big blk" style="max-width:420px;margin:10px auto 0" data-a="w2">Próximo ›</button>`;
  } else if (n.step === 2) {
    const lgs = n.mode === 'sub20' ? LEAGUES.filter((l) => l.id === 'BRA') : LEAGUES;
    if (n.mode === 'sub20') n.lg = 'BRA';
    const clubs = S.preview.clubs.filter((c) => c.league === n.lg).sort((a, b) => b.rep - a.rep);
    const sel = clubs.find((c) => c.id === n.club);
    h += `<div class="hint" style="margin-bottom:10px">${n.mode === 'sub20' ? 'Escolha o clube onde você vai treinar o Sub-20.' : 'Escolha seu clube. As estrelas mostram a força do elenco.'}</div>`;
    if (n.mode !== 'sub20') { const cts = [...new Set(LEAGUES.map((l) => l.country))]; const ct = n.ct || LEAGUES.find((l) => l.id === n.lg)?.country || 'BR';
      h += `<div class="chips" style="margin-bottom:8px">${cts.map((k) => `<span class="chip ${ct === k ? 'on' : ''}" data-a="wct" data-v="${k}">${COUNTRIES[k]?.flag || ''} ${esc(COUNTRIES[k]?.name || k)}</span>`).join('')}</div>`;
      h += `<div class="seg" style="margin:0 0 10px">${lgs.filter((l) => l.country === ct).map((l) => `<button class="${n.lg === l.id ? 'on' : ''}" data-a="wlg" data-v="${l.id}">${esc(l.short || l.name)}</button>`).join('')}</div>`; }
    h += `<div class="clubgrid">${clubs.map((c) => `<div class="li tap ${n.club === c.id ? 'sel' : ''}" data-a="wclub" data-v="${c.id}">${crest(c, 34)}<div class="grow"><div class="b ell">${esc(c.name)}</div><div class="xs ell">${starsH(clubStars(c.rep))}</div></div></div>`).join('')}</div></div>
    <div class="wz-foot">${sel ? `<div class="wz-sel">${crest(sel, 30)}<div><b>${esc(sel.name)}</b><div class="xs">${starsH(clubStars(sel.rep))} <span class="mut">· ${esc(LEAGUES.find((l) => l.id === sel.league)?.short || '')}</span></div></div></div>` : '<div class="xs mut">Toque num clube para escolher</div>'}<button class="btn pri big" data-a="w3a" ${n.club == null ? 'disabled' : ''}>Próximo ›</button></div>`;
    app.innerHTML = h + '</div>'; return;
  } else {
    const o = n.opt; const seg = (k, opts) => `<div class="seg" style="margin:0">${opts.map(([v, l]) => `<button class="${o[k] === v ? 'on' : ''}" data-a="wopt" data-v="${k}:${typeof v === 'boolean' ? (v ? 1 : 0) : v}">${l}</button>`).join('')}</div>`;
    const D = DIFS[o.dif];
    h += `<div class="wz-set"><div class="ws-col">
      <div class="ws-card"><h3>🎚️ Dificuldade</h3><div class="ws-difs">${DIFS.map((d, i) => `<button class="ws-dif ${o.dif === i ? 'on' : ''}" data-a="wopt" data-v="dif:${i}"><b>${d.n}</b>${starsH(d.st)}</button>`).join('')}</div><div class="xs mut" style="margin-top:6px">${D.d}</div></div>
      <div class="ws-card"><h3>⚽ Partida ao vivo</h3><div class="ws-f"><label>Visão</label>${seg('view3d', [['3d', '3D'], ['2d', '2D']])}</div><div class="ws-f"><label>Qualidade do 3D</label>${seg('q3d', [[0, 'Leve'], [1, 'Normal'], [2, 'Alta']])}</div><div class="ws-f"><label>Velocidade inicial</label>${seg('speed', [[1, '1x'], [2, '2x'], [4, '4x']])}</div></div>
    </div><div class="ws-col">
      <div class="ws-card"><h3>🌐 Mundo e carreira</h3><div class="ws-f"><label>Moeda</label>${seg('cur', [['BRL', 'R$'], ['USD', 'US$'], ['EUR', '€']])}</div><div class="ws-f"><label>Coletivas de imprensa</label>${seg('press', [[true, 'Jogos importantes'], [false, 'Desligadas']])}</div><div class="ws-f"><label>Dia de jogo (jogos grandes)</label>${seg('matchday', [[true, 'Ligado'], [false, 'Desligado']])}</div><div class="ws-f"><label>Redes sociais</label>${seg('social', [[true, 'Ligadas'], [false, 'Desligadas']])}</div><div class="ws-f"><label>Narração por voz</label>${seg('voice', [['celular', 'Ligada'], ['off', 'Desligada']])}</div></div>
      <div class="ws-sum">${n.club != null ? crest(S.preview.clubs[n.club], 36) : ''}<div class="grow"><b>${esc(n.name)}</b><div class="xs mut">${esc(MODES[n.mode].t)} · ${esc(S.preview.clubs[n.club]?.name || '')} · ${D.n}</div></div></div>
      <button class="btn pri big blk" data-a="w3">Começar carreira ⚽</button>
    </div></div>`;
  }
  app.innerHTML = h + '</div></div>';
}
H.wback = () => { if (S.ng.step === 0) title(); else { S.ng.step--; wiz(); } };
H.w1 = () => { const n = S.ng; n.name = document.getElementById('ngname').value.trim(); if (n.name.length < 2) { const i = document.getElementById('ngname'); i.classList.remove('shake'); void i.offsetWidth; i.classList.add('shake'); i.focus(); toast('Digite o nome do seu técnico'); return; } n.step = 1; wiz(); };
H.wname = (v) => { S.ng.name = v; const e = document.getElementById('ccname'); if (e) e.textContent = v.trim() || 'Seu nome'; const av = document.querySelector('.cc-av b'); if (av) av.textContent = (v.trim().split(/\s+/).filter(Boolean).map((x) => x[0]).slice(0, 2).join('') || '?').toUpperCase(); };
const wre = () => { const nm = document.getElementById('ngname')?.value; if (nm != null) S.ng.name = nm; wiz(); const c = document.querySelector('.cc-card'); if (c) { c.classList.add('pop'); } };
H.wage = (v) => { S.ng.age = Math.max(25, Math.min(70, S.ng.age + +v)); wre(); };
H.wnat = (v) => { S.ng.nat = v; wre(); }; H.wsty = (v) => { S.ng.style = v; wre(); }; H.wori = (v) => { S.ng.origin = v; wre(); }; H.wcol = (v) => { S.ng.color = v; wre(); };
H.wmode = (v) => { S.ng.mode = v; wiz(); };
H.w2 = () => {
  // pré-visualização simples dos clubes (sem gerar o mundo ainda)
  const clubs = []; let id = 0;
  for (const L of LEAGUES) for (const r of CLUBS[L.id]) clubs.push({ id: id++, key: r[0], name: r[0], short: r[1], city: r[2], c1: r[3], c2: r[4], rep: r[5], league: L.id });
  S.preview = { clubs }; S.ng.step = 2; S.ng.club = null; window.scrollTo(0, 0); wiz();
};
H.wlg = (v) => { S.ng.lg = v; S.ng.club = null; wiz(); };
H.wct = (v) => { S.ng.ct = v; S.ng.lg = LEAGUES.find((l) => l.country === v)?.id; S.ng.club = null; wiz(); };
H.wclub = (v) => { S.ng.club = +v; const sc = document.querySelector('.wiz .body')?.scrollTop || 0; wiz(); const b = document.querySelector('.wiz .body'); if (b) b.scrollTop = sc; };
H.w3a = () => { const n = S.ng; if (n.club == null) return; n.opt ||= { dif: 1, view3d: SET.view3d, q3d: SET.q3d, speed: SET.speed, cur: SET.cur, press: true, matchday: SET.matchday !== false, social: SET.social !== false, voice: SET.voice }; n.step = 3; wiz(); };
H.wopt = (v) => { const [k, x] = v.split(':'); const o = S.ng.opt; const d = { dif: 1, q3d: 1, speed: 2 }; o[k] = k in d ? +x : (x === '1' ? true : x === '0' ? false : x); wiz(); };
H.w3 = () => {
  const n = S.ng; const o = n.opt || {};
  for (const k of ['view3d', 'q3d', 'speed', 'cur', 'matchday', 'social', 'voice']) if (o[k] != null) SET[k] = o[k]; saveSet(); applySet(); musicOff();
  app.innerHTML = `<div class="title-screen" style="align-items:center;text-align:center"><div style="font-size:48px">⚽</div><div class="xb">Montando o mundo do futebol…</div><div class="mut sm">12 divisões, copas nacionais, Libertadores e Champions</div></div>`;
  setTimeout(async () => {
    S.G = newGame({ name: n.name, age: n.age, mode: n.mode, club: n.club });
    S.G.me.bio = { nat: n.nat, style: n.style, origin: n.origin, color: n.color };
    S.G.me.diff = o.dif ?? 1; if (o.press === false) S.G.me.pressOn = false;
    { const D = DIFS[S.G.me.diff]; S.G.me.money = Math.round(S.G.me.money * D.money); const jc = S.G.clubs[S.G.me.job.cid]; jc.board.conf = Math.max(20, Math.min(95, jc.board.conf + D.conf)); }
    if (n.origin === 'exjog') S.G.me.rep = Math.min(99, S.G.me.rep + 2);
    { const jc = S.G.clubs[S.G.me.job.cid]; const t = S.G.me.job.youth ? (S.G.me.u20tact ||= { ...jc.tact }) : jc.tact; const M = { ofens: { ment: 2, press: 2 }, equil: { ment: 1, press: 1 }, defens: { ment: 0, press: 1 }, posse: { ment: 1, press: 1, tempo: 0 }, contra: { ment: 0, press: 0, tempo: 2 } }[n.style]; if (M) Object.assign(t, M); }
    S.tab = 'home'; S.page = null; S.comp = null;
    await save(true); hasSave = true;
    render();
    toast(`Bem-vindo, ${n.name}!`, 2500);
  }, 50);
};
H.newcareer2 = async () => { closeSheet(true); await deleteGame(); S.G = null; hasSave = false; title(); };
H.tomenu = async () => { closeSheet(true); if (S.G) await save(true); S.G = null; title(); };
let lastPlan = 0;
S.onSave = (G) => { if (Date.now() - lastPlan > 30e3) { lastPlan = Date.now(); planReminders(G); } };
document.addEventListener('visibilitychange', () => { if (document.hidden && S.G) { lastPlan = 0; save(true); } });

window.PRANCHETA = S;
const rot = document.createElement('div'); rot.className = 'rotate'; rot.innerHTML = '<div class="ph"></div><div class="xb" style="font-size:20px">Gire o celular</div><div class="mut">O Prancheta é jogado na horizontal.</div>'; document.body.appendChild(rot);
applySet();
S.afterRender = afterRender; applyTheme();
startIcons();
try { if (window.PranchetaNative && SET.notif && !localStorage.getItem('prancheta.askedNotif')) { localStorage.setItem('prancheta.askedNotif', '1'); setTimeout(() => askNotif(), 2500); } } catch {}
(async function boot() {
  try { await loadImages(); } catch (e) { console.warn(e); }
  title();
  checkUpdate();
})();
window.addEventListener('error', (e) => { toast('Erro: ' + e.message, 4000); });
