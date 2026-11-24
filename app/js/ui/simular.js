// 5.0: simular um período (X jogos, até uma data, até a janela, até o fim da temporada) com botão PARAR
import { S, H, render, toast, openSheet, closeSheet, save, wk } from './app.js';
import { esc } from '../util.js';
import { crest } from './art.js';
import { playSlot, userFixNow, myClub } from '../engine/game.js';
import { natUserFixNow } from '../engine/nations.js';
import { penalties } from '../engine/match.js';
import { winOpen } from '../engine/market.js';
import { setup } from './live.js';
import { socialAfterMatch } from '../engine/social.js';
import { SET } from '../settings.js';

const STOPK = ['job', 'natjob', 'bid', 'dec', 'agent', 'loanoff', 'state'];
let RUN = null;
H.simper = () => {
  const G = S.G; const c = myClub(G); const ctry = c?.country || 'BR';
  let toWin = null; for (let w = G.week + 1; w < G.week + 52; w++) if (winOpen(G, ctry, w) && !winOpen(G, ctry, w - 1)) { toWin = w; break; }
  const O = [['g:3', '⚽', 'Próximos 3 jogos', 'Rápido, pra pular a rodada'], ['g:5', '⚽', 'Próximos 5 jogos', ''], ['g:10', '⚽', 'Próximos 10 jogos', ''],
    toWin != null ? [`w:${toWin}`, '🔁', 'Até a janela de transferências', `Abre em ${wk(toWin)}`] : null, ['s:end', '🏁', 'Até o fim da temporada', 'Para em cada evento importante']].filter(Boolean);
  openSheet(`<h2>⏩ Simular período</h2><p class="xs mut" style="margin:0 0 10px">Seus jogos viram resultado rápido. A simulação <b>para sozinha</b> em propostas, ofertas pelos seus jogadores, decisões da diretoria e jogos da seleção — e você pode tocar em <b>PARAR</b> a qualquer momento.</p>
  <div class="sim-opts">${O.map(([v, i, t, d]) => `<button class="sim-o" data-a="simgo" data-v="${v}"><span>${i}</span><div><b>${t}</b>${d ? `<small>${d}</small>` : ''}</div></button>`).join('')}</div>
  <div class="field" style="margin-top:10px"><label>Ou até uma data</label><div class="row" style="gap:8px"><select id="simwk">${Array.from({ length: 30 }, (_, k) => G.week + 2 + k * 2).filter((w) => w < 52).map((w) => `<option value="${w}">${wk(w)}</option>`).join('')}</select><button class="btn sm pri" data-a="simdate">Simular</button></div></div>`);
};
H.simdate = () => { const w = +document.getElementById('simwk').value; H.simgo('w:' + w); };
H.simgo = (v) => {
  const G = S.G; const [k, x] = v.split(':'); closeSheet(true);
  RUN = { k, x: k === 's' ? G.year : +x, games: 0, res: [], stop: false, why: '', y0: G.year, ib: G.inbox[0]?.id || 0, startW: G.week };
  const el = document.createElement('div'); el.className = 'simov'; el.id = 'simov'; el.innerHTML = `<div class="sim-card"><div class="sim-h"><div class="sim-spin"></div><div class="grow"><b>Simulando…</b><div class="xs mut" id="simst"></div></div><button class="btn red" id="simstop">■ PARAR</button></div><div class="sim-bar"><i id="simbar"></i></div><div class="sim-res" id="simres"></div></div>`;
  document.body.appendChild(el); el.querySelector('#simstop').onclick = () => { RUN.stop = true; RUN.why = 'Você parou a simulação.'; };
  setTimeout(tick, 120);
};
function done(why) {
  const G = S.G; const r = RUN; RUN = null; save(); render();
  const el = document.getElementById('simov'); if (!el) return;
  const W = r.res.filter((x) => x.r === 'V').length, E = r.res.filter((x) => x.r === 'E').length, D = r.res.filter((x) => x.r === 'D').length;
  el.querySelector('.sim-h').innerHTML = `<div class="grow"><b>Simulação concluída</b><div class="xs mut">${esc(why)}</div></div>`;
  el.querySelector('.sim-bar').remove();
  el.querySelector('.sim-card').insertAdjacentHTML('beforeend', `<div class="sim-sum"><div><b>${r.games}</b><span>jogos</span></div><div class="ok"><b>${W}</b><span>vitórias</span></div><div><b>${E}</b><span>empates</span></div><div class="bad"><b>${D}</b><span>derrotas</span></div></div><button class="btn pri big blk" id="simok">OK</button>`);
  el.querySelector('#simok').onclick = () => el.remove();
}
function tick() {
  const G = S.G; const r = RUN; if (!r) return;
  for (let n = 0; n < 2; n++) {
    if (r.stop) return done(r.why);
    if (natUserFixNow(G)) return done('Tem jogo da seleção para você comandar.');
    const pre = G.inbox.find((m) => m.pre && !m.done && !m.expired); if (pre) return done('Hora de definir a pré-temporada.');
    if (r.k === 'w' && G.week >= r.x) return done(`Chegou em ${wk(G.week)}.`);
    if (r.k === 's' && G.year !== r.x) return done('Fim da temporada!');
    if (r.k === 'g' && r.games >= r.x) return done(`${r.games} jogos simulados.`);
    const uf = userFixNow(G);
    if (uf) {
      const c = myClub(G); const { m } = setup(uf); const res = m.finish(true); if (uf.ko >= 0 && res.hg === res.ag) res.pen = penalties();
      playSlot(G, res); try { if (!G.me.job?.youth && SET.social !== false) socialAfterMatch(G, uf, c); } catch {}
      const side = uf.h === c.id ? 0 : 1; const gf = side ? uf.ag : uf.hg, ga = side ? uf.hg : uf.ag; const o = G.clubs[side ? uf.h : uf.a];
      const pw = uf.pen ? (side ? uf.pen[1] > uf.pen[0] : uf.pen[0] > uf.pen[1]) : null;
      r.res.push({ r: gf > ga || pw === true ? 'V' : gf < ga || pw === false ? 'D' : 'E', o, gf, ga }); r.games++;
      const box = document.getElementById('simres'); const x = r.res[r.res.length - 1];
      if (box) box.insertAdjacentHTML('afterbegin', `<div class="sim-row ${x.r}"><span class="sim-r">${x.r}</span>${crest(o, 20)}<span class="grow ell">${esc(o.name)}</span><b>${gf}–${ga}</b></div>`);
      if (!G.me.job) return done('Você foi demitido.');
    } else playSlot(G);
    const nw = G.inbox.filter((m) => m.id > r.ib && STOPK.includes(m.kind) && !m.done && !m.expired);
    if (nw.length) { r.ib = G.inbox[0].id; return done(`📩 ${nw[0].title}`); }
    r.ib = G.inbox[0]?.id || r.ib;
  }
  const st = document.getElementById('simst'); if (st) st.textContent = `${wk(G.week)} · ${r.games} jogo${r.games === 1 ? '' : 's'}`;
  const bar = document.getElementById('simbar'); if (bar) { const p = r.k === 'g' ? r.games / r.x : r.k === 'w' ? (G.week - r.startW) / Math.max(1, r.x - r.startW) : G.week / 52; bar.style.width = Math.min(100, p * 100) + '%'; }
  setTimeout(tick, 60);
}
