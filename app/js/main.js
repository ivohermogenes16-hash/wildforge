import { esc, money } from './util.js';
import { S, H, render, toast, openSheet, closeSheet, save, stars } from './ui/app.js';
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
import { SET, saveSet, applySet, ACCENTS, askNotif, notifSupported, planReminders, cancelAll } from './settings.js';
import { newGame } from './engine/game.js';
import { LEAGUES, CLUBS, COUNTRIES } from './data/leagues.js';

const app = document.getElementById('app');
let hasSave = false;

let SL = {};
async function title() {
  try { SL = await listSlots(); } catch { SL = {}; }
  const cur = getSlot(); const m = SL[cur];
  hasSave = !!m;
  app.innerHTML = `<canvas id="bgcv" class="title-bg"></canvas><div class="title-screen t2">
  <div class="t-left"><div class="t-badge">⚽ MANAGER DE FUTEBOL</div>
    <div class="logo big">PRAN<span>CHETA</span></div>
    <div class="t-sub">Do sub-20 ao império do futebol.</div>
    <div class="t-stats"><div><b>960+</b><span>clubes reais</span></div><div><b>28</b><span>ligas</span></div><div><b>18</b><span>países</span></div><div><b>7</b><span>continentais</span></div></div>
    <div class="xs dim" style="margin-top:10px">Versão 3.0 · nov/2026${window.PranchetaNative?.versionCode ? ` · build ${(() => { try { return window.PranchetaNative.versionCode(); } catch { return ''; } })()}` : ''}</div></div>
  <div class="t-right">
    ${m ? `<div class="t-save" data-a="loadsave" style="--c1:${m.c1 || '#1b2a25'};--c2:${m.c2 || '#0b1210'}"><div class="xs mut">Continuar · ${slotName(cur)}</div><div class="xb" style="font-size:18px">${esc(m.club)}</div><div class="xs">${esc(m.name || '')}${m.year ? ` · ${m.year}, semana ${m.week + 1}` : ''}${m.rep != null && !m.legacy ? ` · rep. ${m.rep} · ${m.titles} títulos` : ''}</div><span class="t-play">▶</span></div>` : ''}
    <button class="btn ${m ? '' : 'pri'} big blk" data-a="ng">✨ Nova carreira</button>
    <div class="t-grid"><button class="btn" data-a="tpack">📦 Instalar pacote</button><button class="btn" data-a="tslots">💾 Carreiras</button><button class="btn" data-a="tset">⚙️ Configurações</button><button class="btn" data-a="tnews">🆕 Novidades</button><button class="btn" data-a="thelp">❓ Como jogar</button></div>
    <button class="btn ghost blk" data-a="fs">⛶ Tela cheia</button>
  </div></div>`;
  startBg();
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
H.setv = (v) => { const [k, x] = v.split(':'); SET[k] = typeof DEFV[k] === 'boolean' ? x === '1' : typeof DEFV[k] === 'number' ? +x : x; saveSet(); replaceSheet(setHtml()); applyTheme(); if (S.G) render(); };
const DEFV = { narrador: 'empolgado', view3d: '3d', q3d: 1, theme: 'escuro', clubTheme: true, simple: false, speed: 2, replays: true, narr: true, vib: true, notif: true, accent: 'verde', size: 'normal', fast: false };
H.setnotif = async () => { const ok = await askNotif(); toast(ok ? '🔔 Notificações liberadas' : 'Permissão negada ou indisponível'); };
H.tnews = () => openSheet(`<h2>🆕 Novidades da versão 3.0</h2><div class="list">${[
  ['⚽', 'Partida em 3D com estádio, torcida, câmera de TV e replays (o 2D continua como opção nas Configurações)'],
  ['⚡', 'Lances decisivos jogáveis: pênalti, falta, cara a cara e pênalti contra'],
  ['📋', 'Mais táticas, gritos da beira do campo, vestiário no intervalo e vantagens táticas entre estilos'],
  ['🌧', 'Clima, gramado, perfil do árbitro, VAR, xG, mapa de calor, rede de passes e narradores com personalidade'],
  ['🏆', 'Premiações animadas: Bola de Ouro, melhores das ligas e seleção do campeonato; sala de troféus e mural de lendas'],
  ['🧢', 'Capitão e líderes, promessas leves, lesões detalhadas, base com garotos fixos e gerações de ouro'],
  ['🏟', 'Estádio, público, sócio-torcedor e mosaicos; uniformes; convocações; propostas milionárias de fim de janela'],
  ['🌍', 'Nova carreira em qualquer clube, país e divisão'],
  ['🎨', 'Tema com as cores do seu clube, tema claro, busca, gestos, chaveamento, resumo da semana e interface simplificada'],
  ['📦', 'Instalar e exportar pacotes de escudos e o assistente de escudos'],
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
H.loadsave = async () => { goFull(); const G = await loadGame(); if (!G) { toast('Nenhum jogo salvo'); return; } S.G = G; migrate(G); if (!G.nat) { initNations(G); natSetupYear(G); G.nat.fix.forEach((f) => { if (f.w < G.week) f.skip = true; }); G.nat.fix = G.nat.fix.filter((f) => !f.skip); G.nat.fix.forEach((f, i) => (f.i = i)); for (const T of Object.values(G.nat.tours)) T.ko = []; } else initNations(G); G.me.cd ||= {}; initUniverse(G); initBiz(G); if (!G.comps.U17) { if (G.week < 24) setupU17(G, G.week + 1); else ensureU17(G); } if (G.me.job) ensureBase(G, G.me.job.cid); S.tab = 'home'; S.page = null; render(); };
H.ng = () => { goFull(); S.ng = { step: 0, name: '', age: 32, mode: 'sub20', lg: 'BRA', club: null }; wiz(); };

function wiz() {
  const n = S.ng;
  let h = `<div class="wiz"><div class="row" style="margin-bottom:12px"><button class="btn sm" data-a="wback">‹ Voltar</button><div class="grow xb" style="font-size:18px;text-align:center">Nova carreira</div><span class="pill">${n.step + 1}/3</span></div><div class="body">`;
  if (n.step === 0) {
    h += `<div class="card" style="max-width:520px;margin:0 auto"><div class="field"><label>Seu nome de técnico</label><input id="ngname" value="${esc(n.name)}" placeholder="Ex.: Ivo Hermógenes" maxlength="30"></div>
    <div class="field"><label>Idade</label><input id="ngage" type="number" min="25" max="65" value="${n.age}"></div>
    <button class="btn pri big blk" data-a="w1">Próximo ›</button></div>`;
  } else if (n.step === 1) {
    h += `<div class="cols3"><button class="card tile" style="min-height:0;text-align:left;${n.mode === 'sub20' ? 'border-color:var(--ac)' : ''}" data-a="wmode" data-v="sub20"><span class="ic">🌱</span><span class="tt">Carreira real — começando no Sub-20</span><span class="ds">Você é técnico da base de um clube da Série A. Pouco dinheiro, pouca fama. Ganhe, cresça, receba propostas, junte dinheiro e chegue a dono de clube.</span></button>
    <button class="card tile" style="min-height:0;text-align:left;${n.mode === 'baixo' ? 'border-color:var(--ac)' : ''}" data-a="wmode" data-v="baixo"><span class="ic">🧗</span><span class="tt">Carreira real — qualquer clube profissional</span><span class="ds">Assuma o time principal de qualquer clube, de qualquer país e divisão, como técnico em início de carreira: pouca fama e pouco dinheiro.</span></button>
    <button class="card tile" style="min-height:0;text-align:left;${n.mode === 'livre' ? 'border-color:var(--ac)' : ''}" data-a="wmode" data-v="livre"><span class="ic">🌍</span><span class="tt">Modo livre</span><span class="ds">Qualquer clube de qualquer país e divisão, já como técnico experiente e com dinheiro no bolso.</span></button></div>
    <button class="btn pri big blk" style="max-width:420px;margin:6px auto 0" data-a="w2">Próximo ›</button>`;
  } else {
    const lgs = n.mode === 'sub20' ? LEAGUES.filter((l) => l.id === 'BRA') : LEAGUES;
    if (n.mode === 'sub20') n.lg = 'BRA';
    const clubs = S.preview.clubs.filter((c) => c.league === n.lg).sort((a, b) => b.rep - a.rep);
    h += `<div class="hint" style="margin-bottom:10px">${n.mode === 'sub20' ? 'Escolha o clube onde você vai treinar o Sub-20.' : 'Escolha seu clube.'}</div>`;
    if (n.mode !== 'sub20') { const cts = [...new Set(LEAGUES.map((l) => l.country))]; const ct = n.ct || LEAGUES.find((l) => l.id === n.lg)?.country || 'BR';
      h += `<div class="chips" style="margin-bottom:8px">${cts.map((k) => `<span class="chip ${ct === k ? 'on' : ''}" data-a="wct" data-v="${k}">${COUNTRIES[k]?.flag || ''} ${esc(COUNTRIES[k]?.name || k)}</span>`).join('')}</div>`;
      h += `<div class="seg" style="margin:0 0 10px">${lgs.filter((l) => l.country === ct).map((l) => `<button class="${n.lg === l.id ? 'on' : ''}" data-a="wlg" data-v="${l.id}">${esc(l.short || l.name)}</button>`).join('')}</div>`; }
    h += `<div class="clubgrid">${clubs.map((c) => `<div class="li tap ${n.club === c.id ? 'sel' : ''}" data-a="wclub" data-v="${c.id}">${crest(c, 34)}<div class="grow"><div class="b ell">${esc(c.name)}</div><div class="xs mut ell">${stars(c.rep)}</div></div></div>`).join('')}</div></div>
    <div style="padding-top:10px"><button class="btn pri big blk" data-a="w3" ${n.club == null ? 'disabled' : ''}>Começar carreira ⚽</button></div>`;
    app.innerHTML = h + '</div>'; return;
  }
  app.innerHTML = h + '</div></div>';
}
H.wback = () => { if (S.ng.step === 0) title(); else { S.ng.step--; wiz(); } };
H.w1 = () => { const n = S.ng; n.name = document.getElementById('ngname').value.trim(); n.age = +document.getElementById('ngage').value || 32; if (n.name.length < 2) { toast('Digite seu nome'); return; } n.step = 1; wiz(); };
H.wmode = (v) => { S.ng.mode = v; wiz(); };
H.w2 = () => {
  // pré-visualização simples dos clubes (sem gerar o mundo ainda)
  const clubs = []; let id = 0;
  for (const L of LEAGUES) for (const r of CLUBS[L.id]) clubs.push({ id: id++, key: r[0], name: r[0], short: r[1], city: r[2], c1: r[3], c2: r[4], rep: r[5], league: L.id });
  S.preview = { clubs }; S.ng.step = 2; S.ng.club = null; window.scrollTo(0, 0); wiz();
};
H.wlg = (v) => { S.ng.lg = v; S.ng.club = null; wiz(); };
H.wct = (v) => { S.ng.ct = v; S.ng.lg = LEAGUES.find((l) => l.country === v)?.id; S.ng.club = null; wiz(); };
H.wclub = (v) => { S.ng.club = +v; wiz(); };
H.w3 = () => {
  const n = S.ng;
  app.innerHTML = `<div class="title-screen" style="align-items:center;text-align:center"><div style="font-size:48px">⚽</div><div class="xb">Montando o mundo do futebol…</div><div class="mut sm">12 divisões, copas nacionais, Libertadores e Champions</div></div>`;
  setTimeout(async () => {
    S.G = newGame({ name: n.name, age: n.age, mode: n.mode, club: n.club });
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
