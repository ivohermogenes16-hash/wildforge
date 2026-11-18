// Sala de negociação de vendas: cena animada + contrapropostas
import { S, H, render, toast, closeSheet, save, wk } from './app.js';
import { crest } from './art.js';
import { esc, money } from '../util.js';
import { negInit, negCounter, acceptBid } from '../engine/market.js';
import { playerValue } from '../engine/econ.js';

let N = null; // { m, ask, sell, busy }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function openNego(m) {
  const G = S.G; const p = G.players[m.pid]; const b = G.clubs[m.from]; const me = G.clubs[G.me.job.cid];
  if (!p || p.club !== me.id) { toast('Jogador não está mais no clube'); m.done = true; return; }
  negInit(G, m);
  N = { m, ask: Math.round(m.fee * 1.2 / 1000) * 1000, sell: 0, busy: true };
  document.getElementById('nego')?.remove();
  const sw = m.swap != null ? G.players[m.swap] : null;
  const wrap = document.createElement('div'); wrap.className = 'ng-wrap'; wrap.id = 'nego';
  wrap.innerHTML = `<div class="ng">
  <div class="ng-top"><span class="xs mut">💼 Sala de negociação · ${esc(wk(G.week))}</span><button class="btn sm" data-a="ngclose">✕</button></div>
  <div class="ng-stage">
    <div class="ng-side l" style="--c:${me.c1}">${crest(me, 64)}<b class="ell">${esc(me.name)}</b><span class="xs mut">vendedor</span></div>
    <div class="ng-mid">
      <div class="ng-table"><div class="ng-doc" id="ngdoc"><div class="ng-doc-h">CONTRATO</div><div class="ng-doc-p">${esc(p.n)}</div><div class="ng-doc-v" id="ngdocv">—</div><div class="ng-stamp" id="ngstamp"></div></div></div>
      <div class="ng-pl"><span class="ng-pos">${p.pos}</span><b>${esc(p.n)}</b><span class="xs mut">${p.age} anos · geral ${p.ovr} · valor ${money(playerValue(p))}</span></div>
    </div>
    <div class="ng-side r" style="--c:${b.c1}">${crest(b, 64)}<b class="ell">${esc(b.name)}</b><span class="xs mut">comprador</span></div>
    <div class="ng-phone" id="ngphone">📞</div>
  </div>
  <div class="ng-chat" id="ngchat"></div>
  <div class="ng-ctl" id="ngctl"></div>
  </div>`;
  document.body.appendChild(wrap);
  intro(G, m, p, b, sw);
}

function bubble(side, html, cls = '') {
  const ch = document.getElementById('ngchat'); if (!ch) return;
  const d = document.createElement('div'); d.className = `ng-b ${side} ${cls}`; d.innerHTML = html; ch.appendChild(d);
  ch.scrollTop = ch.scrollHeight; return d;
}
async function typing(side, ms = 1100) { const t = bubble(side, '<span class="dots"><i></i><i></i><i></i></span>', 'typ'); await sleep(ms); t?.remove(); }
function docVal(v, cls) {
  const e = document.getElementById('ngdocv'); const d = document.getElementById('ngdoc'); if (!e) return;
  const from = +(e.dataset.v || 0); const t0 = performance.now(); e.dataset.v = v;
  const run = (t) => { const k = Math.min(1, (t - t0) / 700); e.textContent = money(Math.round(from + (v - from) * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(run); };
  requestAnimationFrame(run); d.classList.remove('slideL', 'slideR'); void d.offsetWidth; d.classList.add(cls);
}
async function intro(G, m, p, b, sw) {
  const ph = document.getElementById('ngphone'); ph?.classList.add('ring');
  await sleep(900); ph?.classList.remove('ring'); ph?.classList.add('gone');
  await typing('r', 900);
  bubble('r', `Boa tarde! O <b>${esc(b.name)}</b> tem muito interesse em <b>${esc(p.n)}</b>.`);
  await typing('r', 800);
  bubble('r', `Nossa proposta: <b class="gold">${money(m.fee)}</b>${sw ? ` + <b>${esc(sw.n)}</b> (${sw.pos}, ${sw.ovr})` : ''}.`);
  docVal(m.fee, 'slideL');
  const mood = G.clubs[m.from].rep > G.clubs[G.me.job.cid].rep + 4 ? '😍 O jogador sonha com essa transferência.' : G.clubs[m.from].rep < G.clubs[G.me.job.cid].rep - 6 ? '😐 O jogador não vê a mudança como um passo à frente.' : '🤔 O jogador está dividido.';
  await sleep(500); bubble('c', `<span class="xs">${mood} Valor de mercado: ${money(playerValue(p))}.</span>`);
  N.busy = false; ctl();
}
function ctl() {
  const el = document.getElementById('ngctl'); if (!el || !N) return; const m = N.m, n = m.neg;
  if (n.deal) { el.innerHTML = `<div class="ng-res ok">🤝 Acordo: ${money(m.fee)}${n.sell ? ` + ${n.sell}% de revenda` : ''}</div><div class="row" style="gap:8px"><button class="btn grow" data-a="ngno">Desistir</button><button class="btn pri grow" data-a="ngyes">✍️ Assinar a venda</button></div>`; return; }
  if (n.walk) { el.innerHTML = `<div class="ng-res bad">📵 O comprador encerrou as negociações.</div><button class="btn blk" data-a="ngclose">Sair da sala</button>`; return; }
  const lo = m.fee, hi = Math.round(m.fee * 2.2 / 1000) * 1000; N.ask = Math.min(hi, Math.max(lo, N.ask));
  const pat = n.pat;
  el.innerHTML = `<div class="ng-row"><span class="xs mut">Proposta na mesa</span><b class="gold">${money(m.fee)}</b><span class="xs mut grow" style="text-align:right">${pat <= 0 ? '<b class="bad">⚠️ Última chance — ele pode desistir</b>' : `Paciência: ${'🟢'.repeat(pat)}`}</span></div>
  <div class="field" style="margin:4px 0"><label>Pedir: <b id="ngask">${money(N.ask)}</b> <span class="xs mut">(${Math.round((N.ask / m.fee - 1) * 100)}% a mais)</span></label><input type="range" min="${lo}" max="${hi}" step="${Math.max(1000, Math.round(m.fee / 200 / 1000) * 1000)}" value="${N.ask}" data-in="ngask"></div>
  <div class="row" style="gap:6px;margin-bottom:6px;flex-wrap:wrap"><span class="xs mut">Revenda futura:</span>${[0, 10, 20, 30].map((x) => `<span class="chip ${N.sell === x ? 'on' : ''}" data-a="ngsell" data-v="${x}">${x ? x + '%' : 'sem'}</span>`).join('')}</div>
  <div class="row" style="gap:6px"><button class="btn red" data-a="ngno">Recusar</button><button class="btn grow" data-a="ngcounter">💬 Pedir mais</button><button class="btn pri grow" data-a="ngyes">✅ Aceitar ${money(m.fee)}</button></div>`;
}
H.ngask = (v) => { if (!N) return; N.ask = +v; const e = document.getElementById('ngask'); if (e) e.textContent = money(N.ask); const pct = e?.nextElementSibling; if (pct) pct.textContent = `(${Math.round((N.ask / N.m.fee - 1) * 100)}% a mais)`; };
H.ngsell = (v) => { if (!N || N.busy) return; N.sell = +v; ctl(); };
H.ngcounter = async () => {
  if (!N || N.busy) return; N.busy = true; const G = S.G, m = N.m; const ask = N.ask, sell = N.sell;
  document.getElementById('ngctl').innerHTML = '<div class="ng-res">⏳ Negociando…</div>';
  bubble('l', `Por menos de <b class="gold">${money(ask)}</b>${sell ? ` + <b>${sell}%</b> de revenda` : ''} não liberamos.`);
  docVal(ask, 'slideR');
  await typing('r', 1300 + Math.random() * 600);
  const r = negCounter(G, m, ask, sell);
  if (r.r === 'ok') { bubble('r', `Fechado. Aceitamos <b class="gold">${money(r.fee)}</b>${sell ? ` com ${sell}% de revenda` : ''}. 🤝`); docVal(r.fee, 'slideL'); stamp('ACORDO', 'ok'); }
  else if (r.r === 'counter') { bubble('r', `Não chegamos a tanto. Podemos subir para <b class="gold">${money(r.fee)}</b>${sell ? ` (aceitando os ${sell}%)` : ''}.`); docVal(r.fee, 'slideL'); N.ask = Math.round(r.fee * 1.1 / 1000) * 1000; }
  else if (r.r === 'no') { bubble('r', `Muito alto para nós. O máximo agora é <b class="gold">${money(r.fee)}</b>.`); docVal(r.fee, 'slideL'); }
  else { bubble('r', 'Assim não dá. Vamos procurar outras opções. Boa sorte.', 'bad'); stamp('ENCERRADO', 'bad'); }
  N.busy = false; ctl(); save();
};
function stamp(t, cls) { const s = document.getElementById('ngstamp'); if (!s) return; s.textContent = t; s.className = `ng-stamp on ${cls}`; }
H.ngyes = async () => {
  if (!N || N.busy) return; N.busy = true; const G = S.G, m = N.m;
  bubble('l', `Negócio fechado: <b class="gold">${money(m.fee)}</b>.`); stamp('VENDIDO', 'ok');
  document.getElementById('ngctl').innerHTML = '<div class="ng-res ok">✍️ Assinando…</div>';
  document.querySelector('.ng-stage')?.classList.add('deal');
  await sleep(1400);
  const t = acceptBid(G, m); toast(t, 3200); m.done = true; save(); closeNego(); render();
};
H.ngno = () => { if (!N || N.busy) return; N.m.done = true; toast('Proposta recusada'); save(); closeNego(); render(); };
H.ngclose = () => { closeNego(); render(); };
function closeNego() { document.getElementById('nego')?.remove(); N = null; }
H.nego = (v) => { const m = S.G.inbox.find((x) => x.id === +v); if (!m) return; closeSheet(true); openNego(m); };
