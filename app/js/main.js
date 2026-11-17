import { esc, money } from './util.js';
import { S, H, render, toast, openSheet, closeSheet, save, stars } from './ui/app.js';
import './ui/pages.js';
import './ui/live.js';
import './ui/editor.js';
import './ui/base.js';
import './ui/life.js';
import { migrate } from './engine/life.js';
import './ui/nations.js';
import { initNations, natSetupYear } from './engine/nations.js';
import { setupU17 } from './engine/season.js';
import { ensureU17 } from './engine/world.js';
import { ensureBase } from './engine/youth.js';
import { crest } from './ui/art.js';
import { loadGame, deleteGame, loadImages } from './store.js';
import { newGame } from './engine/game.js';
import { LEAGUES, CLUBS, COUNTRIES } from './data/leagues.js';

const app = document.getElementById('app');
let hasSave = false;

function title() {
  app.innerHTML = `<div class="title-screen"><div><div style="font-size:46px">📋</div>
  <div class="logo">PRAN<span>CHETA</span></div>
  <div class="mut" style="font-size:16px;margin-top:8px">Do sub-20 a dono do clube.<br>Brasil, Inglaterra, Espanha, Itália e Argentina.</div>
  <p class="xs dim" style="margin-top:18px">Clubes e ligas reais · escudos e rostos originais gerados pelo jogo · envie suas imagens pelo Editor</p></div>
  <div class="col">${hasSave ? `<button class="btn pri big blk" data-a="loadsave">▶ Continuar carreira</button>` : ''}
  <button class="btn ${hasSave ? '' : 'pri'} big blk" data-a="ng">✨ Nova carreira</button>
  <button class="btn blk" data-a="fs">⛶ Tela cheia</button></div></div>`;
}
H.fs = () => goFull();
async function goFull() {
  try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch {}
  try { await screen.orientation?.lock?.('landscape'); } catch {}
}
H.loadsave = async () => { goFull(); const G = await loadGame(); if (!G) { toast('Nenhum jogo salvo'); return; } S.G = G; migrate(G); if (!G.nat) { initNations(G); natSetupYear(G); G.nat.fix.forEach((f) => { if (f.w < G.week) f.skip = true; }); G.nat.fix = G.nat.fix.filter((f) => !f.skip); G.nat.fix.forEach((f, i) => (f.i = i)); for (const T of Object.values(G.nat.tours)) T.ko = []; } else initNations(G); G.me.cd ||= {}; if (!G.comps.U17) { if (G.week < 24) setupU17(G, G.week + 1); else ensureU17(G); } if (G.me.job) ensureBase(G, G.me.job.cid); S.tab = 'home'; S.page = null; render(); };
H.ng = () => { goFull(); S.ng = { step: 0, name: '', age: 32, mode: 'sub20', lg: 'BRA', club: null }; wiz(); };

function wiz() {
  const n = S.ng;
  let h = `<div class="wiz"><div class="row" style="margin-bottom:12px"><button class="btn sm" data-a="wback">‹ Voltar</button><div class="grow xb" style="font-size:18px;text-align:center">Nova carreira</div><span class="pill">${n.step + 1}/3</span></div><div class="body">`;
  if (n.step === 0) {
    h += `<div class="card" style="max-width:520px;margin:0 auto"><div class="field"><label>Seu nome de técnico</label><input id="ngname" value="${esc(n.name)}" placeholder="Ex.: Ivo Hermógenes" maxlength="30"></div>
    <div class="field"><label>Idade</label><input id="ngage" type="number" min="25" max="65" value="${n.age}"></div>
    <button class="btn pri big blk" data-a="w1">Próximo ›</button></div>`;
  } else if (n.step === 1) {
    h += `<div class="cols2"><button class="card tile" style="min-height:0;text-align:left;${n.mode === 'sub20' ? 'border-color:var(--ac)' : ''}" data-a="wmode" data-v="sub20"><span class="ic">🌱</span><span class="tt">Carreira real — começando no Sub-20</span><span class="ds">Você é técnico da base de um clube da Série A. Pouco dinheiro, pouca fama. Ganhe, cresça, receba propostas, junte dinheiro e chegue a dono de clube.</span></button>
    <button class="card tile" style="min-height:0;text-align:left;${n.mode === 'livre' ? 'border-color:var(--ac)' : ''}" data-a="wmode" data-v="livre"><span class="ic">🌍</span><span class="tt">Modo livre</span><span class="ds">Escolha qualquer clube profissional das 12 divisões e assuma o time principal na hora.</span></button></div>
    <button class="btn pri big blk" style="max-width:420px;margin:6px auto 0" data-a="w2">Próximo ›</button>`;
  } else {
    const lgs = n.mode === 'sub20' ? LEAGUES.filter((l) => l.id === 'BRA') : LEAGUES;
    if (n.mode === 'sub20') n.lg = 'BRA';
    const clubs = S.preview.clubs.filter((c) => c.league === n.lg).sort((a, b) => b.rep - a.rep);
    h += `<div class="hint" style="margin-bottom:10px">${n.mode === 'sub20' ? 'Escolha o clube onde você vai treinar o Sub-20.' : 'Escolha seu clube.'}</div>`;
    if (n.mode !== 'sub20') h += `<select data-ch="wlg" style="margin-bottom:10px">${lgs.map((l) => `<option value="${l.id}" ${n.lg === l.id ? 'selected' : ''}>${COUNTRIES[l.country].flag} ${esc(l.name)}</option>`).join('')}</select>`;
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

window.PRANCHETA = S;
const rot = document.createElement('div'); rot.className = 'rotate'; rot.innerHTML = '<div class="ph"></div><div class="xb" style="font-size:20px">Gire o celular</div><div class="mut">O Prancheta é jogado na horizontal.</div>'; document.body.appendChild(rot);
(async function boot() {
  try { await loadImages(); } catch (e) { console.warn(e); }
  try { hasSave = !!(await loadGame()); } catch (e) { console.warn(e); }
  title();
})();
window.addEventListener('error', (e) => { toast('Erro: ' + e.message, 4000); });
