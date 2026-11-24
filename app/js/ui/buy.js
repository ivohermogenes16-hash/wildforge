// Sala de negociação de COMPRA / contrato / renovação — cena animada com rodadas de propostas
import { S, H, render, closeSheet, save, wk, shortName } from './app.js';
import { crest } from './art.js';
import { esc, money, clamp, POS_LINE } from '../util.js';
import { playerValue } from '../engine/econ.js';
import { myClub } from '../engine/game.js';
import { userBid, userSign, wageDemand, renew, renewDemand, askPrice, doTransfer, weeklyWages, wageBudget, willJoin } from '../engine/market.js';
import { rivalFor, swapValue } from '../engine/market2.js';
import { controls, inject } from '../engine/career.js';

let B = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const r1k = (v) => Math.round(v / 1000) * 1000;
const ovrC = (o) => (o >= 80 ? '#2fe08a' : o >= 72 ? '#9be15d' : o >= 64 ? '#f4c542' : o >= 56 ? '#ff9f43' : '#ff6b6b');
const SAY = {
  open: ['Pode falar, estamos ouvindo.', 'Sabemos por que você veio. Qual é a proposta?', 'Ele é peça importante aqui. Mostre que vale a pena.', 'Interesse a gente tem em ouvir. Vamos aos números.'],
  low: ['Isso é uma piada? Nem chega perto.', 'Com todo respeito, assim fica difícil conversar.', 'Esse valor ofende o jogador e o clube.'],
  near: ['Estamos perto. Melhore um pouco e a gente fecha.', 'Quase lá. Um esforço a mais resolve.', 'Gostamos do caminho, mas ainda falta.'],
  no: ['Não dá. O valor está bem abaixo do que ele vale.', 'Recusamos. Precisa melhorar bastante.', 'Assim não liberamos.'],
  ok: ['Fechado! Pode chamar o empresário dele. 🤝', 'Proposta aceita. Agora é com o jogador.', 'Negócio feito do nosso lado.'],
  walk: ['Chega. Não vamos mais negociar esse jogador.', 'A conversa acabou. Ele fica aqui.'],
  agent: ['Meu cliente quer ouvir o projeto. Quanto ele vai ganhar?', 'Ele está animado, mas não vem por qualquer salário.', 'Vamos falar de números: salário e tempo de contrato.'],
  agentNo: ['Meu cliente não aceita menos que isso.', 'Com esse salário ele nem entra no avião.', 'Abaixo do que conversamos. Não dá.'],
  agentOk: ['Temos um acordo! Ele está muito feliz.', 'Assinado! Ele mal pode esperar para estrear.', 'Fechado. Pode preparar a apresentação!'],
};
const pk = (a) => a[Math.floor(Math.random() * a.length)];

function shell(G, p, L, R) {
  document.getElementById('buyroom')?.remove();
  const w = document.createElement('div'); w.className = 'ng-wrap by'; w.id = 'buyroom';
  w.innerHTML = `<div class="ng">
  <div class="ng-top"><span class="by-steps" id="bysteps"></span><span class="xs mut grow" style="text-align:center">💼 Sala de negociação · ${esc(wk(G.week))}</span><button class="btn sm" data-a="byclose">✕</button></div>
  <div class="ng-stage" id="bystage">
    <div class="ng-side l" style="--c:${L.c}">${L.html}<b class="ell">${esc(L.n)}</b><span class="xs mut">${L.t}</span></div>
    <div class="ng-mid">
      <div class="ng-table"><div class="ng-doc" id="ngdoc"><div class="ng-doc-h" id="ngdoch">PROPOSTA</div><div class="ng-doc-p">${esc(p.n)}</div><div class="ng-doc-v" id="ngdocv">—</div><div class="ng-doc-s xs" id="ngdocs"></div><div class="ng-stamp" id="ngstamp"></div></div></div>
      <div class="by-card"><span class="pos ${POS_LINE[p.pos]}">${p.pos}</span><b class="ell">${esc(p.n)}</b><span class="by-ovr" style="--o:${ovrC(p.ovr)}">${p.ovr}</span><span class="xs mut">${p.age} anos · pot. ${p.pot} · valor ${money(playerValue(p))}</span></div>
      <div class="by-meter" id="bymeter"><i></i><span></span></div>
    </div>
    <div class="ng-side r" id="byright" style="--c:${R.c}">${R.html}<b class="ell">${esc(R.n)}</b><span class="xs mut">${R.t}</span></div>
  </div>
  <div class="ng-chat" id="ngchat"></div>
  <div class="ng-ctl" id="ngctl"></div></div>`;
  document.body.appendChild(w);
}
const agentHtml = (p) => `<div class="by-agent"><svg viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="22" r="12" fill="#cfd8d4"/><path d="M10 60c2-14 11-22 22-22s20 8 22 22z" fill="#2a3b35"/><path d="M28 38l4 10 4-10" fill="#e9f2ee"/><path d="M31 40h2l1 14h-4z" fill="#c62828"/></svg></div>`;
function bubble(side, html, cls = '') {
  const ch = document.getElementById('ngchat'); if (!ch) return;
  const d = document.createElement('div'); d.className = `ng-b ${side} ${cls}`; d.innerHTML = html; ch.appendChild(d); ch.scrollTop = ch.scrollHeight; return d;
}
async function typing(side, ms = 1000) { const t = bubble(side, '<span class="dots"><i></i><i></i><i></i></span>', 'typ'); await sleep(ms); t?.remove(); }
function docVal(v, cls, suf = '') {
  const e = document.getElementById('ngdocv'), d = document.getElementById('ngdoc'); if (!e) return;
  const from = +(e.dataset.v || 0); const t0 = performance.now(); e.dataset.v = v;
  const run = (t) => { const k = Math.min(1, (t - t0) / 650); e.textContent = money(Math.round(from + (v - from) * (1 - Math.pow(1 - k, 3)))) + suf; if (k < 1) requestAnimationFrame(run); };
  requestAnimationFrame(run); d.classList.remove('slideL', 'slideR'); void d.offsetWidth; d.classList.add(cls);
}
function stamp(t, cls) { const s = document.getElementById('ngstamp'); if (!s) return; s.textContent = t; s.className = `ng-stamp on ${cls}`; }
function meter(k, lbl) { const m = document.getElementById('bymeter'); if (!m) return; m.querySelector('i').style.width = clamp(k * 100, 3, 100) + '%'; m.querySelector('i').style.background = k >= 1 ? '#2fe08a' : k >= 0.85 ? '#f4c542' : '#ff7b7f'; m.querySelector('span').textContent = lbl; }
function steps() { const e = document.getElementById('bysteps'); if (!e) return; const L = B.kind === 'buy' ? [['fee', 'Clube'], ['wage', 'Jogador'], ['done', 'Assinado']] : [['wage', B.kind === 'renew' ? 'Renovação' : 'Jogador'], ['done', 'Assinado']]; const at = L.findIndex((x) => x[0] === B.stage); e.innerHTML = L.map(([k, l], i) => `<span class="${i < at ? 'ok' : i === at ? 'on' : ''}">${i < at ? '✓' : i + 1} ${l}</span>`).join('<i></i>'); }
function pat() { return `<span class="by-pat">${[0, 1, 2].map((i) => `<i class="${i < B.pat ? 'on' : ''}"></i>`).join('')}</span>`; }

// ---------------- entrada ----------------
export function openBuy(p) {
  const G = S.G, c = myClub(G);
  closeSheet(true);
  const seller = p.club >= 0 ? G.clubs[p.club] : null;
  B = { pid: p.id, kind: seller ? 'buy' : 'free', stage: seller ? 'fee' : 'wage', pat: 3, busy: true, swap: null, fee: 0, ask: seller ? askPrice(G, p) : 0, years: 3, counter: null };
  B.offer = seller ? Math.min(r1k(playerValue(p)), Math.max(0, r1k(c.money))) : 0;
  shell(G, p, { c: c.c1, html: crest(c, 64), n: c.name, t: 'comprador' }, seller ? { c: seller.c1, html: crest(seller, 64), n: seller.name, t: 'vendedor' } : { c: '#8ba39a', html: agentHtml(p), n: 'Empresário', t: `de ${shortName(p.n)}` });
  steps();
  const wj = willJoin(G, p, c.id);
  const fr = G.me.freeze && G.me.freeze >= G.t; const ffp = G.uv?.regs?.ffp && c.money < 0;
  if (seller && (fr || ffp)) { (async () => { await typing('c', 500); bubble('c', fr ? `🧊 <b>Contratações congeladas</b> pela diretoria por mais ${G.me.freeze - G.t + 1} semana(s). Até lá só dá para trazer jogadores livres (sem custo).` : '⚖️ <b>Fair play financeiro:</b> o caixa do clube está negativo, então ele não pode pagar transferências agora.', 'bad'); stamp('BLOQUEADO', 'bad'); endBad(fr ? 'Contratações congeladas pela diretoria.' : 'Caixa negativo: venda jogadores ou espere receitas.'); })(); return; }
  if (!wj.ok) { (async () => { await typing('r', 900); bubble('r', esc(wj.why), 'bad'); stamp('SEM ACORDO', 'bad'); endBad('O jogador não quer conversar com o seu clube agora.'); })(); return; }
  if (seller) introFee(G, p, seller); else introWage(G, p, c);
}
export function openRenew(p) {
  const G = S.G, c = myClub(G); closeSheet(true);
  B = { pid: p.id, kind: 'renew', stage: 'wage', pat: 3, busy: true, years: 3 };
  shell(G, p, { c: c.c1, html: crest(c, 64), n: c.name, t: 'seu clube' }, { c: '#8ba39a', html: agentHtml(p), n: 'Empresário', t: `de ${shortName(p.n)}` });
  steps(); introWage(G, p, c);
}

async function introFee(G, p, seller) {
  document.getElementById('ngdocv').textContent = '—';
  meter(0, 'Ainda sem proposta');
  await typing('r', 800); bubble('r', pk(SAY.open));
  await sleep(250); bubble('c', `<span class="xs">${p.lst ? '💲 Ele está na lista de transferências — o clube aceita vender por menos.' : p.con <= G.year ? '⏳ Contrato acabando: o clube pede bem menos.' : 'O clube não precisa vender. Propostas baixas irritam e gastam a paciência deles.'}</span>`);
  B.busy = false; ctlFee();
}
function ctlFee() {
  const G = S.G, p = G.players[B.pid], c = myClub(G), el = document.getElementById('ngctl'); if (!el) return;
  const max = Math.max(1000, r1k(B.ask * 1.7)); B.offer = clamp(B.offer, 0, max);
  const st = Math.max(1000, r1k(B.ask / 50));
  const sw = B.swap != null ? G.players[B.swap] : null; const swv = sw ? swapValue(G, sw, p.club) : 0;
  const broke = B.offer > c.money;
  el.innerHTML = `<div class="by-row"><div class="grow"><div class="xs mut">Sua oferta ${pat()}</div><div class="by-big ${broke ? 'bad' : ''}" id="byoffer">${money(B.offer)}</div><div class="xs ${broke ? 'bad' : 'mut'}">${broke ? `⚠️ Caixa do clube: ${money(c.money)} (seu dinheiro pessoal não entra aqui)${controls(G, c) ? ` · <a class="lnk" data-a="byinject" data-v="${B.offer - c.money}">Aportar ${money(B.offer - c.money)} do seu bolso</a>` : ''}` : `Caixa do clube: ${money(c.money)}`}${swv ? ` · + ${esc(shortName(sw.n))} (vale ${money(swv)} p/ eles)` : ''}</div></div>
    <div class="by-step"><button class="btn sm" data-a="byst" data-v="${-st}">−</button><button class="btn sm" data-a="byst" data-v="${st}">+</button></div></div>
  <input type="range" min="0" max="${max}" step="${st}" value="${B.offer}" data-in="byoff">
  <div class="chips" style="margin:6px 0">${[['Valor de mercado', r1k(playerValue(p))], ['+10%', r1k(B.offer * 1.1)], ...(B.counter ? [['O que pedem', B.counter]] : [])].map(([l, v]) => `<span class="chip" data-a="byset" data-v="${v}">${l}</span>`).join('')}
  <select data-ch="byswap" data-title="Incluir jogador na troca"><option value="">🔁 Sem troca</option>${G.players.filter((x) => x && x.club === c.id && !x.u20 && !x.loan).sort((a, b) => b.ovr - a.ovr).map((x) => `<option value="${x.id}" data-pos="${x.pos}" data-ovr="${x.ovr}" data-n="${esc(x.n)}" data-sub="${x.age} anos · ${money(playerValue(x))}" ${B.swap === x.id ? 'selected' : ''}>${esc(x.n)}</option>`).join('')}</select></div>
  <div class="row" style="gap:6px"><button class="btn red" data-a="byclose">Desistir</button><button class="btn pri grow" data-a="bysend" ${broke ? 'disabled' : ''}>📨 Enviar proposta</button></div>`;
}
H.byinject = (v) => { const G = S.G, c = myClub(G); const amt = Math.ceil(+v / 1000) * 1000; const r = inject(G, c.id, amt); bubble('c', `<span class="xs">💼 ${esc(r)}</span>`); save(); ctlFee(); };
H.byoff = (v) => { if (!B) return; B.offer = +v; const e = document.getElementById('byoffer'); if (e) e.textContent = money(B.offer); };
H.byst = (v) => { if (!B || B.busy) return; B.offer = Math.max(0, B.offer + +v); B.stage === 'fee' ? ctlFee() : null; };
H.byset = (v) => { if (!B || B.busy) return; B.offer = +v; ctlFee(); };
H.byswap = (v) => { if (!B) return; B.swap = v === '' ? null : +v; ctlFee(); };
H.bysend = async () => {
  if (!B || B.busy) return; B.busy = true; const G = S.G, p = G.players[B.pid];
  const sw = B.swap != null ? G.players[B.swap] : null; const fee = B.offer;
  document.getElementById('ngctl').innerHTML = '<div class="ng-res">⏳ Aguardando resposta…</div>';
  bubble('l', `Oferecemos <b class="gold">${money(fee)}</b>${sw ? ` + <b>${esc(sw.n)}</b>` : ''} por ${esc(shortName(p.n))}.`);
  docVal(fee, 'slideR');
  await typing('r', 1100 + Math.random() * 700);
  const r = userBid(G, p, fee, sw);
  const tot = fee + (sw ? swapValue(G, sw, p.club) : 0);
  if (r.ok) {
    B.fee = fee; bubble('r', pk(SAY.ok)); stamp('ACEITO', 'ok'); meter(1, 'Valor aceito');
    await sleep(1100); return startWage(G, p);
  }
  if (r.counter) {
    B.counter = r.counter; const k = tot / r.counter; meter(k, `${Math.round(k * 100)}% do que pedem`);
    B.pat -= k < 0.6 ? 2 : 1;
    if (B.pat < 0) { bubble('r', pk(SAY.walk), 'bad'); stamp('ENCERRADO', 'bad'); return endBad('📵 O clube encerrou as negociações.'); }
    bubble('r', `${pk(k < 0.6 ? SAY.low : k > 0.9 ? SAY.near : SAY.no)} Pedimos <b class="gold">${money(r.counter)}</b>.`, k < 0.6 ? 'bad' : '');
    docVal(r.counter, 'slideL');
    if (B.pat === 0) bubble('c', '<span class="xs bad">⚠️ Última chance: mais uma recusa e eles desistem.</span>');
  } else { bubble('r', esc(r.why), 'bad'); stamp('RECUSADO', 'bad'); return endBad(r.why); }
  B.busy = false; ctlFee();
};

// ---------------- salário / contrato ----------------
async function startWage(G, p) {
  B.stage = 'wage'; steps(); B.pat = 3;
  const right = document.getElementById('byright');
  right.style.animation = 'none'; void right.offsetWidth; right.style.animation = '';
  right.style.setProperty('--c', '#8ba39a'); right.innerHTML = `${agentHtml(p)}<b class="ell">Empresário</b><span class="xs mut">de ${esc(shortName(p.n))}</span>`;
  const s = document.getElementById('ngstamp'); s.className = 'ng-stamp';
  document.getElementById('ngdoch').textContent = 'CONTRATO';
  bubble('c', '<span class="xs">🤝 Clube de acordo. Agora negocie com o empresário do jogador.</span>');
  introWage(G, p, myClub(G));
}
async function introWage(G, p, c) {
  const renewing = B.kind === 'renew';
  B.dem = renewing ? renewDemand(G, p) : wageDemand(G, p, c.id);
  B.rival = renewing ? null : rivalFor(G, p, c.id);
  if (B.rival) B.dem = Math.max(B.dem, Math.round(B.rival.wage * (G.clubs[B.rival.cid].rep > c.rep ? 1.1 : 1.02) / 50) * 50);
  B.wage = B.dem; B.years = renewing ? 3 : B.kind === 'free' ? 2 : 3;
  const dv = document.getElementById('ngdocv'); if (dv) dv.dataset.v = 0; docVal(B.dem, 'slideL', '/sem.'); meter(0, 'Pede ' + money(B.dem) + '/sem.');
  await typing('r', 900);
  bubble('r', renewing ? `${pk(['Ele está feliz aqui, mas quer ser valorizado.', 'Para renovar, ele quer um reajuste justo.', 'Vamos conversar sobre o futuro dele no clube.'])} Pedimos <b class="gold">${money(B.dem)}/sem.</b>` : `${pk(SAY.agent)} Pedimos <b class="gold">${money(B.dem)}/sem.</b>`);
  if (B.rival) { await sleep(300); bubble('c', `<span class="xs warn">⚔️ O <b>${esc(G.clubs[B.rival.cid].name)}</b> também oferece ${money(B.rival.wage)}/sem. Se você pagar menos que o pedido, ele pode escolher o rival.</span>`); }
  const wl = weeklyWages(G, c.id), wb = wageBudget(G, c);
  await sleep(200); bubble('c', `<span class="xs mut">Folha: ${money(wl)} / teto ${money(Math.round(wb * 1.15))} por semana.</span>`);
  B.busy = false; ctlWage();
}
function ctlWage() {
  const el = document.getElementById('ngctl'); if (!el) return; const d = B.dem;
  const st = Math.max(50, Math.round(d / 40 / 50) * 50);
  B.wage = clamp(B.wage, Math.round(d * 0.5), Math.round(d * 2));
  el.innerHTML = `<div class="by-row"><div class="grow"><div class="xs mut">Salário oferecido ${pat()}</div><div class="by-big" id="bywage">${money(B.wage)}<small>/sem.</small></div><div class="xs mut" id="bywk">${Math.round(B.wage / d * 100)}% do pedido · ${money(B.wage * 52 * B.years)} no contrato</div></div>
    <div class="by-step"><button class="btn sm" data-a="bywst" data-v="${-st}">−</button><button class="btn sm" data-a="bywst" data-v="${st}">+</button></div></div>
  <input type="range" min="${Math.round(d * 0.5)}" max="${Math.round(d * 2)}" step="${st}" value="${B.wage}" data-in="bywag">
  <div class="seg" style="margin:6px 0">${[1, 2, 3, 4, 5].map((y) => `<button class="${B.years === y ? 'on' : ''}" data-a="byyr" data-v="${y}">${y} ano${y > 1 ? 's' : ''}</button>`).join('')}</div>
  <div class="row" style="gap:6px"><button class="btn red" data-a="byclose">Desistir</button><button class="btn pri grow" data-a="bysign">✍️ Oferecer contrato</button></div>`;
}
H.bywag = (v) => { if (!B) return; B.wage = +v; const e = document.getElementById('bywage'); if (e) e.innerHTML = `${money(B.wage)}<small>/sem.</small>`; const k = document.getElementById('bywk'); if (k) k.textContent = `${Math.round(B.wage / B.dem * 100)}% do pedido · ${money(B.wage * 52 * B.years)} no contrato`; };
H.bywst = (v) => { if (!B || B.busy) return; B.wage = Math.max(50, B.wage + +v); ctlWage(); };
H.byyr = (v) => { if (!B || B.busy) return; B.years = +v; ctlWage(); };
H.bysign = async () => {
  if (!B || B.busy) return; B.busy = true; const G = S.G, p = G.players[B.pid], c = myClub(G);
  document.getElementById('ngctl').innerHTML = '<div class="ng-res">⏳ O empresário está analisando…</div>';
  bubble('l', `Oferecemos <b class="gold">${money(B.wage)}/sem.</b> por ${B.years} ano${B.years > 1 ? 's' : ''}.`);
  docVal(B.wage, 'slideR', '/sem.');
  await typing('r', 1100 + Math.random() * 600);
  const k = B.wage / B.dem; meter(k, `${Math.round(k * 100)}% do salário pedido`);
  if (B.rival && B.wage < B.dem * 0.97) {
    const R = G.clubs[B.rival.cid]; doTransfer(G, p, R.id, B.fee || 0, B.rival.wage, 3);
    bubble('r', `Desculpe. Ele preferiu a proposta do <b>${esc(R.name)}</b>.`, 'bad'); stamp('PERDIDO', 'bad'); save(); return endBad(`😞 ${p.n} assinou com o ${R.name}.`);
  }
  let r;
  if (B.kind === 'renew') r = renew(G, p, B.wage, B.years);
  else { const from = p.club; r = userSign(G, p, B.fee || 0, B.wage, B.years); if (r.ok && B.swap != null) { const s = G.players[B.swap]; if (s && s.club === c.id && from >= 0) doTransfer(G, s, from, 0, Math.max(s.wage, wageDemand(G, s, from)), 3); } }
  if (r.ok) {
    bubble('r', pk(SAY.agentOk)); stamp('ASSINADO', 'ok'); B.stage = 'done'; steps();
    document.getElementById('bystage')?.classList.add('deal'); confetti();
    document.getElementById('ngctl').innerHTML = `<div class="ng-res ok">${B.kind === 'renew' ? `✅ ${esc(p.n)} renovou até ${p.con}` : `✍️ ${esc(p.n)} é seu jogador!`}</div><button class="btn pri blk" data-a="bydone">${B.kind === 'renew' ? 'Concluir' : '🎉 Ver apresentação'}</button>`;
    save(); return;
  }
  const hard = /teto|Elenco cheio|idade/.test(r.why);
  if (hard) { bubble('r', esc(r.why), 'bad'); stamp('VETADO', 'bad'); return endBad(r.why); }
  B.pat -= k < 0.75 ? 2 : 1;
  if (B.pat < 0) { bubble('r', 'Não vamos mais conversar. Ele segue outro caminho.', 'bad'); stamp('ENCERRADO', 'bad'); return endBad('📵 O empresário encerrou a negociação.'); }
  bubble('r', `${pk(SAY.agentNo)} Mínimo <b class="gold">${money(B.dem)}/sem.</b>`, k < 0.75 ? 'bad' : '');
  if (B.pat === 0) bubble('c', '<span class="xs bad">⚠️ Última chance com o empresário.</span>');
  B.busy = false; ctlWage();
};
function endBad(t) { const el = document.getElementById('ngctl'); if (el) el.innerHTML = `<div class="ng-res bad">${esc(t)}</div><button class="btn blk" data-a="byclose">Sair da sala</button>`; B.busy = true; save(); }
function confetti() { const st = document.getElementById('bystage'); if (!st) return; const d = document.createElement('div'); d.className = 'confetti'; d.innerHTML = Array.from({ length: 40 }, () => `<i style="--x:${Math.random() * 100};--d:${(Math.random() * 1.2).toFixed(2)}s;--c:${['#2fe08a', '#f4c542', '#4aa8ff', '#ff5a5f', '#fff'][Math.floor(Math.random() * 5)]}"></i>`).join(''); st.appendChild(d); }
function closeBuy() { const w = document.getElementById('buyroom'); if (w) { w.classList.add('out'); setTimeout(() => w.remove(), 220); } B = null; }
H.byclose = () => { closeBuy(); render(); };
H.bydone = () => { closeBuy(); render(); };
