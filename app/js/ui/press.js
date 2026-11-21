// Sala de imprensa: repórter, pergunta digitando, respostas em cards com tom e efeito, manchete animada
import { S, H, render, save } from './app.js';
import { crest } from './art.js';
import { esc } from '../util.js';
import { resolveDecision } from '../engine/life.js';
import { TONES } from '../engine/press.js';
import { myClub } from '../engine/game.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FXN = { mor: 'Moral', fans: 'Torcida', pop: 'Popularidade', pp: 'Pressão', conf: 'Diretoria', chem: 'Entrosamento', rep: 'Reputação', rel: 'Elenco' };
const TONEIC = { calmo: '🧘', confiante: '💪', provoca: '🔥', elenco: '🤝', assume: '🙋', cobra: '📢', torcida: '📣', evasivo: '🤐', pede: '🛒', humilde: '🙏' };
let R = null;

function fxChips(fx, full) {
  return Object.entries(fx || {}).filter(([k, v]) => FXN[k] && v).map(([k, v]) => { const good = k === 'pp' ? v < 0 : v > 0; return `<span class="pr-fx ${good ? 'g' : 'b'}">${v > 0 ? '▲' : '▼'} ${FXN[k]}${full ? ` ${v > 0 ? '+' : ''}${Math.round(v)}` : ''}</span>`; }).join('');
}
const micSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';

export function openPress(m, onDone) {
  const G = S.G; const c = myClub(G); if (!m) return;
  document.getElementById('pressroom')?.remove();
  R = { m, onDone, busy: true };
  const rep = m.rep || { n: 'Repórter', o: 'Imprensa' };
  const w = document.createElement('div'); w.id = 'pressroom'; w.className = 'pr-wrap';
  w.innerHTML = `<div class="pr-wall">${c ? Array.from({ length: 18 }, () => `<span>${crest(c, 34)}</span>`).join('') : ''}</div><div class="pr-flash"></div>
  <div class="pr">
    <div class="pr-top"><span class="pr-live"><i></i>AO VIVO</span><span class="xs mut grow">${esc(m.title.replace(/^🎤\s*/, ''))}${c ? ' · ' + esc(c.name) : ''}</span><button class="btn sm" data-a="prclose">${m.done ? '✕' : 'Pular'}</button></div>
    <div class="pr-stage">
      <div class="pr-rep"><div class="pr-av">${esc(rep.n.split(' ').map((x) => x[0]).join('').slice(0, 2))}</div><div><b>${esc(rep.n)}</b><div class="xs mut">${esc(rep.o)}</div></div><span class="pr-mic">${micSvg}</span></div>
      <div class="pr-q" id="prq"></div>
    </div>
    <div class="pr-ans" id="prans"></div>
  </div>`;
  document.body.appendChild(w);
  let n = 0; const iv = setInterval(() => { if (!w.isConnected || n++ > 10) { clearInterval(iv); return; } const f = w.querySelector('.pr-flash'); const d = document.createElement('i'); d.style.left = Math.random() * 100 + '%'; d.style.top = 70 + Math.random() * 28 + '%'; f.appendChild(d); setTimeout(() => d.remove(), 500); }, 320);
  run();
}
async function typeQ(text) {
  const el = document.getElementById('prq'); if (!el) return; el.innerHTML = '<span class="pr-t"></span><i class="pr-car"></i>';
  const t = el.querySelector('.pr-t'); for (let i = 0; i <= text.length; i += 2) { if (!el.isConnected) return; t.textContent = text.slice(0, i); await sleep(16); } t.textContent = text;
}
async function run() {
  const m = R.m; await sleep(350); await typeQ(m.body);
  const box = document.getElementById('prans'); if (!box) return;
  if (m.done) { showResult(m.choice ?? 0, true); return; }
  box.innerHTML = m.opts.map((o, i) => `<button class="pr-a" data-a="pransw" data-v="${i}" style="animation-delay:${i * 90}ms"><span class="pr-tone">${TONEIC[o.tone] || '💬'} ${esc(TONES[o.tone]?.n || 'Resposta')}</span><span class="pr-l">“${esc(o.l)}”</span><span class="pr-fxs">${fxChips(o.fx)}</span></button>`).join('');
  R.busy = false;
}
H.pransw = async (v) => {
  if (!R || R.busy) return; R.busy = true; const G = S.G, m = R.m, i = +v;
  const box = document.getElementById('prans');
  box.querySelectorAll('.pr-a').forEach((b, k) => b.classList.add(k === i ? 'pick' : 'gone'));
  await sleep(420);
  resolveDecision(G, m, i); save();
  showResult(i, false);
};
function showResult(i, old) {
  const m = R.m, o = m.opts[i]; const box = document.getElementById('prans'); if (!box) return;
  const head = m.head || '';
  box.innerHTML = `<div class="pr-said"><span class="pr-tone">${TONEIC[o.tone] || '💬'} Você respondeu</span><b>“${esc(o.l)}”</b></div>
  ${head ? `<div class="pr-news"><div class="pr-news-h">📰 MANCHETE</div><div class="pr-news-t">${esc(head)}</div><div class="pr-fxs">${fxChips(o.fx, true)}</div></div>` : ''}
  <button class="btn pri blk" data-a="prclose">${old ? 'Fechar' : 'Continuar'}</button>`;
  if (!old) document.querySelector('.pr-flash')?.classList.add('burst');
  const tb = document.querySelector('.pr-top [data-a=prclose]'); if (tb) tb.textContent = '✕';
  R.busy = false;
}
H.prclose = () => {
  if (!R) return; const { m, onDone } = R;
  if (!m.done) { resolveDecision(S.G, m, m.def ?? 0, true); save(); }
  const w = document.getElementById('pressroom'); if (w) { w.classList.add('out'); setTimeout(() => w.remove(), 260); }
  R = null; if (onDone) onDone(m); else render();
};
