import { playerExtra, scoutNetView } from './universe.js';
import { onPromote } from '../engine/universe.js';
import { esc, money, clamp, POS, POS_NAME } from '../util.js';
import { crest, face, ovrBadge, FLAG } from './art.js';
import { S, H, PAGES, PAGES_T, PAGES_BACK, VIEWS, render, toast, openSheet, closeSheet, replaceSheet, save, playerRow, posTag, clubTag, stars, wk, potRange, myComps } from './app.js';
import { preMatch } from './live.js';
import { natUserFixNow } from '../engine/nations.js';
import { natPreMatch } from './nations.js';
import { playerValue, clubValuation, coachWage, seasonIncome, SEASON_WEEKS } from '../engine/econ.js';
import { myClub, userFixNow, playSlot, takeJob, resign, strength } from '../engine/game.js';
import { doTransfer } from '../engine/market.js';
import { rivalFor, swapValue, loanRequest, LOAN_T } from '../engine/market2.js';
import { userBid, userSign, wageDemand, renew, renewDemand, release, askPrice, acceptBid, scoutSearch, weeklyWages, wageBudget, inWindow, willJoin } from '../engine/market.js';
import { invest, netWorth, foundClub, FOUND_COST, APT_PRICE, inject, safQuote, buySAF, sellStake, controls, hireCoachFor } from '../engine/career.js';
import { LEAGUES } from '../data/leagues.js';
import { clubLevel } from '../engine/world.js';
import { attrs, youthPrice } from '../engine/youth.js';
import { revealPlayer, ITR } from '../engine/life.js';

// ---------- Avançar ----------
H.continue = () => {
  const G = S.G;
  if (G.inbox.some((m) => m.kind === 'press' && !m.done && !m.expired && G.t - m.t < 1)) { const m = G.inbox.find((x) => x.kind === 'press' && !x.done); toast('Responda a coletiva antes'); H.msg(String(m.id)); return; }
  const pre = G.inbox.find((m) => m.pre && !m.done && !m.expired); if (pre) { toast('Defina a pré-temporada antes'); H.msg(String(pre.id)); return; }
  const before = G.inbox.length; const y0 = G.year;
  let n = 0;
  while (n < 4) {
    const nf = natUserFixNow(G);
    if (nf) { if (n > 0) { render(); save(); } natPreMatch(nf); return; }
    const uf = userFixNow(G);
    if (uf) { if (n > 0) { render(); save(); } preMatch(uf); return; }
    playSlot(G); n++;
    if (G.slot === 0) break;
  }
  save(); render();
  const nw = G.inbox.length - before;
  if (G.year !== y0) toast(`🎉 Nova temporada ${G.year}!`, 3000);
  else if (nw > 0) toast(`📩 ${nw} nova(s) mensagem(ns)`);
};

// ---------- Jogador ----------
H.player = (v) => {
  const G = S.G; const p = G.players[+v]; if (!p) return;
  const c = p.club >= 0 ? G.clubs[p.club] : null;
  const j = G.me.job;
  const mine = j && p.club === j.cid && (!!p.u20 === !!j.youth || (!j.youth && p.u20));
  const seniorMine = j && !j.youth && p.club === j.cid;
  const sh = G.short.includes(p.id);
  const val = playerValue(p);
  let acts = '';
  if (seniorMine && !p.u20 && p.loan) acts = `<div class="hint">🔁 ${esc(LOAN_T[p.loan.type])} do ${esc(G.clubs[p.loan.from].name)} até o fim de ${p.loan.until}${p.loan.type !== 'simples' ? ` · compra: ${money(p.loan.fee)}` : ''}. Você paga ${Math.round(p.loan.share * 100)}% do salário.</div>`;
  else if (seniorMine && !p.u20) acts = `${itrBtn(p)}<div class="row" style="flex-wrap:wrap;gap:8px"><button class="btn sm grow" data-a="renew" data-v="${p.id}">📄 Renovar</button><button class="btn sm grow" data-a="list" data-v="${p.id}">${p.lst ? 'Tirar da venda' : '💲 Pôr à venda'}</button><button class="btn sm grow" data-a="loanlst" data-v="${p.id}">${p.loanLst ? 'Cancelar empréstimo' : '🔁 Emprestar'}</button><button class="btn sm red grow" data-a="release" data-v="${p.id}">Dispensar</button></div>`;
  else if (seniorMine && p.u20) acts = `${catBtn(p)}<div class="row"><button class="btn sm pri grow" data-a="promote" data-v="${p.id}">⬆️ Promover ao profissional</button><button class="btn sm red grow" data-a="relyouth" data-v="${p.id}">Dispensar</button></div>`;
  else if (j && j.youth && mine) acts = `${catBtn(p)}${itrBtn(p)}<div class="row"><button class="btn sm pri grow" data-a="recommend" data-v="${p.id}">⭐ Indicar ao profissional</button><button class="btn sm red grow" data-a="relyouth" data-v="${p.id}">Dispensar</button></div>`;
  else if (j && !j.youth && !p.u20) acts = `<div class="row"><button class="btn sm grow" data-a="short" data-v="${p.id}">${sh ? '★ Observando' : '☆ Observar'}</button><button class="btn sm pri grow" data-a="bid" data-v="${p.id}">${p.club < 0 ? 'Contratar' : 'Fazer proposta'}</button></div>`;
  if (j && !j.youth && !mine && p.club >= 0 && !p.u20 && !p.loan) acts += `<button class="btn sm blk" style="margin-top:6px" data-a="loanin" data-v="${p.id}">🔁 Pedir empréstimo</button>`;
  if (p.loan && !seniorMine) acts = `<div class="hint" style="margin-bottom:6px">🔁 Emprestado pelo ${esc(G.clubs[p.loan.from].name)} até ${p.loan.until}.</div>` + acts;
  if (j && !mine && p.club >= 0 && (p.u20 || (p.age <= 19 && p.ovr < 74))) acts += `<button class="btn sm blk" style="margin-top:8px" data-a="ybid" data-v="${p.id}">🌱 Trazer para a minha base (${money(youthPrice(G, p))})</button>`;
  const at = attrs(p);
  const st = p.st;
  const d = p.ovr - (p.s0 ?? p.ovr);
  const hist = (p.oh || []).concat([[G.year, p.ovr]]);
  const c1 = c?.c1 || '#2a3a35', c2 = c?.c2 || '#1b2a25';
  openSheet(`<div class="pf-hero" style="--c1:${c1};--c2:${c2}">
    <div class="pf-face">${face(p, 76, c)}</div>
    <div class="grow" style="min-width:0"><div class="pf-name ell">${esc(p.n)}</div>
      <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:3px">${posTag(p.pos)}<span class="xs">${POS_NAME[p.pos]}</span><span class="xs">· ${p.age} anos ${FLAG[p.nat] || ''}</span></div>
      <div class="xs" style="margin-top:5px">${c ? clubTag(c, 16) : '<span class="mut">Sem clube</span>'}</div></div>
    ${ring(p.ovr, potRange(p, mine), d)}</div>
  <div class="pf-grid">
    <div class="card flat pf-card"><h3>Atributos</h3>${radar(at)}</div>
    <div class="card flat pf-card"><h3><span>Evolução</span>${d ? `<span class="dl ${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'}${Math.abs(d)} na temporada</span>` : '<span class="xs mut">estável</span>'}</h3>${evoChart(hist, p.pot, p)}</div>
    <div class="card flat pf-card wide"><div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:6px"><span class="pill b">🧠 ${esc(p.per || '—')}</span>${(p.aw || []).slice(-3).map((a) => `<span class="pill y">🏅 ${esc(a.k)} ${esc(a.lg)} ${a.y}</span>`).join('')}</div>
      <div class="kvs" style="margin-bottom:4px"><div class="kv"><span class="mut">Relação c/ técnico</span><b>${Math.round(p.rel ?? 50)}</b></div><div class="kv"><span class="mut">Satisfação</span><b>${Math.round(p.sat ?? 65)}</b></div><div class="kv"><span class="mut">Confiança (forma)</span><b>${st.j ? (st.ns / st.j).toFixed(1) : '—'}</b></div></div><div class="kvs"><div class="kv"><span class="mut">Valor</span><b>${money(val)}</b></div><div class="kv"><span class="mut">Salário</span><b>${money(p.wage)}/sem.</b></div><div class="kv"><span class="mut">Contrato</span><b>${p.club >= 0 ? 'até ' + p.con : '—'}</b></div>
      <div class="kv"><span class="mut">Fôlego</span><b>⚡${Math.round(p.fit)}</b></div><div class="kv"><span class="mut">Moral</span><b>${p.mor >= 75 ? '😀' : p.mor >= 55 ? '🙂' : p.mor >= 40 ? '😐' : '😠'} ${Math.round(p.mor)}</b></div>
      ${p.inj > 0 ? `<div class="kv"><span class="mut">Lesão</span><b class="bad">${p.inj} sem.</b></div>` : ''}${p.sus > 0 ? `<div class="kv"><span class="mut">Suspenso</span><b class="bad">${p.sus} jogo(s)</b></div>` : ''}
      <div class="kv"><span class="mut">Temporada</span><b>${st.j}J ${st.g}G ${st.a}A</b></div>${st.j ? `<div class="kv"><span class="mut">Nota média</span><b>${(st.ns / st.j).toFixed(1)}</b></div>` : ''}<div class="kv"><span class="mut">No jogo</span><b>${p.tot.j}J ${p.tot.g}G</b></div><div class="kv"><span class="mut">Seleção ${FLAG[p.nat] || ''}</span><b>${p.intl ? `${p.intl.j}J ${p.intl.g}G` : '—'}</b></div></div></div>
  </div>
  ${playerExtra(G, p)}${acts}<button class="btn sm blk ghost" style="margin-top:6px" data-a="edplayer" data-v="${p.id}">✏️ Editar nome / foto / dados</button>`);
};
function ring(o, pot, d) {
  const C = 2 * Math.PI * 26, f = Math.max(0, Math.min(1, (o - 30) / 65));
  const col = o >= 85 ? '#2fe08a' : o >= 78 ? '#8fe06a' : o >= 70 ? '#d7e05a' : o >= 62 ? '#f4c542' : '#ff9f43';
  return `<div class="pf-ring"><svg viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="26" fill="none" stroke="#ffffff1a" stroke-width="6"/><circle cx="32" cy="32" r="26" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C * f} ${C}" transform="rotate(-90 32 32)"/><text x="32" y="38" text-anchor="middle" font-family="Barlow Condensed,system-ui" font-weight="800" font-size="21" fill="#fff">${o}</text></svg><div class="xs mut">pot. <b class="gold">${pot}</b></div></div>`;
}
function radar(at) {
  const n = at.length, R = 48, cx = 80, cy = 76;
  const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const grid = [0.25, 0.5, 0.75, 1].map((k) => `<polygon points="${at.map((_, i) => pt(i, R * k).join(',')).join(' ')}" fill="none" stroke="#ffffff14"/>`).join('');
  const poly = at.map(([, v], i) => pt(i, R * Math.max(0.08, (v - 20) / 79)).join(',')).join(' ');
  const labels = at.map(([l, v], i) => { const [x, y] = pt(i, R + 15); return `<text x="${x}" y="${y - 5}" text-anchor="middle" dominant-baseline="middle" font-size="8" fill="#8ba39a">${l.split(' ')[0]}</text><text x="${x}" y="${y + 7}" text-anchor="middle" font-size="9" font-weight="800" fill="#e9f2ee">${v}</text>`; }).join('');
  return `<svg viewBox="0 0 160 152" class="radar">${grid}<polygon points="${poly}" fill="#2fe08a33" stroke="#2fe08a" stroke-width="1.6" stroke-linejoin="round"/>${labels}</svg>`;
}
function evoChart(h, pot, p) {
  if (h.length < 2) {
    const G = S.G; const s0 = p.s0 ?? p.ovr;
    const ups = (G.me.dev || []).filter((e) => e.pid === p.id && e.y === G.year).slice(0, 4);
    return `<div class="evo-empty"><div class="row" style="justify-content:center;gap:10px"><div><div class="xs mut">início</div><div class="xb evo-n">${s0}</div></div><div class="evo-arrow ${p.ovr > s0 ? 'ok' : p.ovr < s0 ? 'bad' : 'mut'}">➜</div><div><div class="xs mut">hoje</div><div class="xb evo-n">${p.ovr}</div></div><div><div class="xs mut">potencial</div><div class="xb evo-n gold">${p.pot}</div></div></div>
    <div class="bar" style="margin:8px 4px 6px"><i style="width:${Math.max(4, Math.min(100, (p.ovr - 30) / Math.max(1, p.pot - 30) * 100))}%;background:linear-gradient(90deg,var(--ac2),var(--gold))"></i></div>
    ${ups.length ? ups.map((e) => `<div class="xs"><span class="dl up">▲1</span> chegou a ${e.o} na sem. ${e.w + 1}</div>`).join('') : '<div class="xs mut">O gráfico por temporada aparece a partir do 2º ano.</div>'}</div>`;
  }
  const W = 160, Hh = 58, mn = Math.min(...h.map((x) => x[1]), pot) - 3, mx = Math.max(...h.map((x) => x[1]), pot) + 2;
  const X = (i) => 8 + i * (W - 16) / (h.length - 1), Y = (v) => Hh - 6 - (v - mn) / (mx - mn) * (Hh - 14);
  const pts = h.map((x, i) => `${X(i)},${Y(x[1])}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${Hh + 12}" class="evo"><line x1="0" x2="${W}" y1="${Y(pot)}" y2="${Y(pot)}" stroke="#f4c54255" stroke-dasharray="3 3"/><polyline points="${pts}" fill="none" stroke="#2fe08a" stroke-width="2" stroke-linejoin="round"/>${h.map((x, i) => `<circle cx="${X(i)}" cy="${Y(x[1])}" r="2.6" fill="#2fe08a"/><text x="${X(i)}" y="${Y(x[1]) - 5}" text-anchor="middle" font-size="7.5" fill="#e9f2ee">${x[1]}</text><text x="${X(i)}" y="${Hh + 9}" text-anchor="middle" font-size="7" fill="#5d746b">${String(x[0]).slice(2)}</text>`).join('')}</svg>`;
}
H.short = (v) => { const G = S.G; const id = +v; G.short = G.short.includes(id) ? G.short.filter((x) => x !== id) : G.short.concat(id); closeSheet(); H.player(v); save(); };
H.list = (v) => { const p = S.G.players[+v]; p.lst = !p.lst; toast(p.lst ? 'Colocado à venda — aguarde propostas' : 'Retirado da venda'); closeSheet(); H.player(v); save(); };
H.release = (v) => {
  const G = S.G, p = G.players[+v]; const yrs = Math.max(0, p.con - G.year) + 0.5; const cost = Math.round(p.wage * 52 * yrs * 0.5);
  replaceSheet(`<h2>Dispensar ${esc(p.n)}?</h2><p>Rescisão custa <b>${money(cost)}</b> ao clube.</p><div class="row"><button class="btn grow" data-a="cs">Cancelar</button><button class="btn red grow" data-a="release2" data-v="${p.id}">Dispensar</button></div>`);
};
H.cs = () => closeSheet();
H.release2 = (v) => { const c = release(S.G, S.G.players[+v]); toast(`Dispensado (${money(c)})`); closeSheet(); render(); save(); };
H.promote = (v) => { const G = S.G, p = G.players[+v]; revealPlayer(G, p); onPromote(G, p); p.u20 = false; p.u17 = false; p.wage = Math.max(p.wage, 1500); p.con = G.year + 3; myClub(G).lineup = null; toast(`${p.n} promovido!`); closeSheet(); render(); save(); };
H.recommend = (v) => {
  const G = S.G, p = G.players[+v]; const c = G.clubs[p.club];
  if (p._rec === G.year) { toast('Você já indicou ele nesta temporada'); return; }
  p._rec = G.year;
  const sq = G.players.filter((x) => x && x.club === c.id && !x.u20 && x.pos === p.pos).sort((a, b) => a.ovr - b.ovr);
  const worst = sq[0]?.ovr ?? 0;
  if (p.ovr >= worst - 3 || p.pot >= clubLevel(c.rep) + 4) { revealPlayer(G, p); onPromote(G, p); p.u20 = false; p.u17 = false; p.con = G.year + 3; p.wage = 1500; G.me.rep = clamp(G.me.rep + 1, 1, 99); toast(`✅ O técnico do profissional aprovou! ${p.n} subiu.`); }
  else toast('❌ O técnico do profissional achou que ele ainda não está pronto.');
  closeSheet(); render(); save();
};

H.renew = (v) => {
  const G = S.G, p = G.players[+v]; const d = renewDemand(G, p);
  S.neg = { p: p.id, wage: d, years: 3 };
  replaceSheet(negHtml(p, d, 'renew2', 'Renovar contrato'));
};
function negHtml(p, d, act, title, fee) {
  const n = S.neg; const G = S.G;
  if (n.dem) d = n.dem;
  return `<h2>${title}</h2>${n.rival ? `<div class="hint warn" style="margin-bottom:8px">⚔️ Disputa: o ${esc(G.clubs[n.rival.cid].name)} oferece ${money(n.rival.wage)}/sem. a ${esc(p.n)}. Se você oferecer menos, ele pode escolher o rival.</div>` : ''}${n.swap != null ? `<div class="kv"><span class="mut">Vai na troca</span><b>${esc(G.players[n.swap]?.n || '')}</b></div>` : ''}<div class="row" style="margin-bottom:12px">${face(p, 44)}<div class="grow"><b>${esc(p.n)}</b><div class="xs mut">Pede ${money(d)}/semana</div></div></div>
  ${fee != null ? `<div class="kv"><span class="mut">Transferência</span><b>${money(fee)}</b></div>` : ''}
  <div class="field"><label>Salário semanal: <b id="negw">${money(n.wage)}</b></label><input type="range" min="${Math.round(d * 0.6)}" max="${Math.round(d * 1.8)}" step="${Math.max(50, Math.round(d / 100))}" value="${n.wage}" data-in="negw"></div>
  <div class="field"><label>Duração</label><div class="seg" style="margin:0">${[1, 2, 3, 4, 5].map((y) => `<button class="${n.years === y ? 'on' : ''}" data-a="negy" data-v="${y}:${act}">${y} ano${y > 1 ? 's' : ''}</button>`).join('')}</div></div>
  <button class="btn pri blk" data-a="${act}">Oferecer contrato</button>`;
}
H.negw = (v) => { S.neg.wage = +v; document.getElementById('negw').textContent = money(+v); };
H.negy = (v) => { const [y, act] = v.split(':'); S.neg.years = +y; const p = S.G.players[S.neg.p]; replaceSheet(negHtml(p, act === 'renew2' ? renewDemand(S.G, p) : wageDemand(S.G, p, myClub(S.G).id), act, act === 'renew2' ? 'Renovar contrato' : 'Contrato', act === 'sign2' ? S.neg.fee : null)); };
H.renew2 = () => { const G = S.G, n = S.neg, p = G.players[n.p]; const r = renew(G, p, n.wage, n.years); toast(r.ok ? `✅ ${p.n} renovou até ${p.con}` : r.why, 2800); if (r.ok) { closeSheet(); render(); save(); } };

H.bid = (v) => {
  const G = S.G, p = G.players[+v];
  if (!G.me.job || G.me.job.youth) { toast('Só o técnico do profissional contrata'); return; }
  if (!inWindow(G) && p.club >= 0) { toast('Janela de transferências fechada (abre nas semanas 1–6 e 23–26)', 3000); return; }
  const c = myClub(G);
  const wj = willJoin(G, p, c.id); if (!wj.ok) { toast(wj.why, 3000); return; }
  if (p.club < 0) { S.neg = { p: p.id, wage: wageDemand(G, p, c.id), years: 2, fee: 0 }; replaceSheet(negHtml(p, S.neg.wage, 'sign2', 'Contratar jogador livre', 0)); return; }
  const ask = askPrice(G, p); S.swap = null; S.lastBidP = p.id;
  S.bidv = Math.min(Math.round(playerValue(p) / 1000) * 1000, Math.max(0, c.money));
  replaceSheet(`<h2>Proposta por ${esc(p.n)}</h2><div class="kv"><span class="mut">Valor de mercado</span><b>${money(playerValue(p))}</b></div><div class="kv"><span class="mut">Caixa do clube</span><b>${money(c.money)}</b></div>
  <div class="field" style="margin-top:12px"><label>Sua oferta: <b id="bidv">${money(S.bidv)}</b></label><input type="range" min="0" max="${Math.max(1000, Math.round(ask * 1.6))}" step="${Math.max(1000, Math.round(ask / 200 / 1000) * 1000)}" value="${S.bidv}" data-in="bidv"></div>
  <div class="field"><label>Incluir jogador na troca (opcional)</label><select data-ch="bidswap"><option value="">Nenhum</option>${G.players.filter((x) => x && x.club === c.id && !x.u20 && !x.loan).sort((a, b) => b.ovr - a.ovr).map((x) => `<option value="${x.id}" ${S.swap === x.id ? 'selected' : ''}>${esc(x.n)} (${x.pos}, ${x.ovr}) · ${money(playerValue(x))}</option>`).join('')}</select><div class="xs mut" id="swapv">${S.swap != null ? `O ${esc(G.clubs[p.club].name)} avalia ${esc(G.players[S.swap].n)} em ${money(swapValue(G, G.players[S.swap], p.club))}` : 'Oferecer um jogador reduz o dinheiro necessário.'}</div></div>
  <button class="btn pri blk" data-a="bid2" data-v="${p.id}">Enviar proposta</button>`);
};
H.bidswap = (v) => { S.swap = v === '' ? null : +v; const el = document.getElementById('swapv'); const G = S.G; const p = G.players[S.neg?.p ?? S.lastBidP]; if (el && S.swap != null && p) el.textContent = `O ${G.clubs[p.club].name} avalia ${G.players[S.swap].n} em ${money(swapValue(G, G.players[S.swap], p.club))}`; };
H.bidv = (v) => { S.bidv = +v; document.getElementById('bidv').textContent = money(+v); };
H.bid2 = (v) => {
  const G = S.G, p = G.players[+v]; const sw = S.swap != null ? G.players[S.swap] : null; const r = userBid(G, p, S.bidv, sw);
  if (!r.ok) { toast(r.why, 3200); return; }
  const riv = rivalFor(G, p, myClub(G).id);
  let dem = wageDemand(G, p, myClub(G).id); if (riv) dem = Math.max(dem, Math.round(riv.wage * (G.clubs[riv.cid].rep > myClub(G).rep ? 1.1 : 1.02) / 50) * 50);
  S.neg = { p: p.id, wage: dem, years: 3, fee: S.bidv, swap: sw ? sw.id : null, rival: riv, dem };
  toast(riv ? `⚔️ Proposta aceita, mas o ${G.clubs[riv.cid].name} também quer ${p.n}!` : '✅ Proposta aceita! Agora negocie o salário.', 3200);
  replaceSheet(negHtml(p, S.neg.wage, 'sign2', 'Contrato', S.bidv));
};
H.sign2 = () => { const G = S.G, n = S.neg, p = G.players[n.p];
  if (n.rival && n.wage < n.dem * 0.97) { const R = G.clubs[n.rival.cid]; doTransfer(G, p, R.id, n.fee || 0, n.rival.wage, 3); toast(`😞 ${p.n} preferiu o ${R.name}.`, 3200); closeSheet(true); render(); save(); return; }
  const from = p.club; const r = userSign(G, p, n.fee || 0, n.wage, n.years);
  if (r.ok && n.swap != null) { const s = G.players[n.swap]; if (s && s.club === myClub(G).id && from >= 0) doTransfer(G, s, from, 0, Math.max(s.wage, wageDemand(G, s, from)), 3); } toast(r.ok ? `✍️ ${p.n} é seu jogador!` : r.why, 3000); if (r.ok) { closeSheet(true); render(); save(); } };
H._acceptBid = (m) => acceptBid(S.G, m);

// ---------- Clube ----------
H.club = (v) => {
  const G = S.G, c = G.clubs[+v]; if (!c) return;
  const sq = G.players.filter((p) => p && p.club === c.id && !p.u20).sort((a, b) => b.ovr - a.ovr);
  const L = G.comps[c.league];
  const own = c.own;
  openSheet(`<div class="row" style="gap:14px">${crest(c, 72)}<div class="grow"><h2 style="margin:0">${esc(c.name)}</h2><div class="sm mut">${esc(c.city)} · ${esc(L?.short || (c.league === 'AMA' ? 'Várzea' : 'Fora das ligas'))}</div><div>${stars(c.rep)} <span class="xs mut">rep. ${c.rep}</span></div></div></div>
  <div class="card flat" style="margin-top:12px"><div class="kv"><span class="mut">Estádio</span><b>${esc(c.stad)} (${c.cap} mil)</b></div><div class="kv"><span class="mut">Técnico</span><b>${c.coach ? esc(c.coach.n) : '<span class="warn">vago</span>'}</b></div><div class="kv"><span class="mut">Força do elenco</span><b>${Math.round(strength(G, c.id))}</b></div><div class="kv"><span class="mut">Valor estimado (SAF)</span><b>${money(clubValuation(G, c))}</b></div>${own.user > 0 ? `<div class="kv"><span class="mut">Sua participação</span><b class="ok">${own.user}%</b></div>` : ''}${c.saf ? `<div class="kv"><span class="mut">Estrutura</span><b>SAF · assoc. ${own.assoc}% · fundo ${own.fund}%</b></div>` : ''}<div class="kv"><span class="mut">Títulos (no jogo)</span><b>${c.troph.length}</b></div></div>
  <div class="row" style="gap:8px;margin-bottom:10px"><button class="btn sm grow" data-a="saf" data-v="${c.id}">🏦 ${own.user > 0 ? 'Ações' : 'Comprar SAF'}</button><button class="btn sm grow" data-a="edclub" data-v="${c.id}">✏️ Editar</button></div>
  <div class="card flat" style="padding:4px 12px"><h3 style="margin:8px 0 2px">Elenco</h3><div class="list">${sq.map((p) => playerRow(p)).join('')}</div></div>`);
};

H.fix = (v) => {
  const G = S.G, f = G.fix[+v]; const hc = G.clubs[f.h], ac = G.clubs[f.a];
  const ev = f.ev || [];
  openSheet(`<div class="xs mut" style="text-align:center">${esc(G.comps[f.c].name)} · ${wk(f.w)}</div><div class="match-hero" style="margin:10px 0"><div data-a="club" data-v="${hc.id}">${crest(hc, 54)}<div class="nm">${esc(hc.name)}</div></div><div class="score">${f.hg != null ? `${f.hg}–${f.ag}` : 'x'}</div><div data-a="club" data-v="${ac.id}">${crest(ac, 54)}<div class="nm">${esc(ac.name)}</div></div></div>
  ${f.pen ? `<div style="text-align:center" class="b">Pênaltis ${f.pen[0]}–${f.pen[1]}</div>` : ''}
  <div class="list">${ev.map((e) => `<div class="li sm" style="${e[2] ? 'flex-direction:row-reverse;text-align:right' : ''}"><b class="dim">${e[0]}'</b><span>${e[1] === 0 ? '⚽' : '🟥'} ${esc(G.players[e[3]]?.n || '?')}</span></div>`).join('') || (f.hg != null ? '<div class="empty">Sem gols.</div>' : '<div class="empty">Jogo ainda não aconteceu.</div>')}</div>`);
};

// ---------- MERCADO ----------
PAGES.market = () => {
  const G = S.G, j = G.me.job;
  if (!j || j.youth) return `<div class="card"><h3>Mercado</h3><p>Só o técnico do time profissional negocia jogadores.</p><p class="mut sm">Mesmo assim você pode olhar os jogadores pelo mundo:</p><button class="btn blk" data-a="sub" data-v="mk:busca">Buscar jogadores</button></div>${S.sub.mk === 'busca' ? searchView(true) : ''}`;
  const c = myClub(G);
  const ww = weeklyWages(G, c.id), wb = wageBudget(G, c);
  let h = `<div class="card"><div class="row"><div class="grow"><div class="xs mut">Caixa do clube</div><div class="xb" style="font-size:20px">${money(c.money)}</div></div><div style="text-align:right"><div class="xs mut">Folha / teto semanal</div><div class="b ${ww > wb ? 'bad' : ''}">${money(ww)} / ${money(wb)}</div></div></div><div class="xs ${inWindow(G) ? 'ok' : 'warn'}" style="margin-top:8px">${inWindow(G) ? '🟢 Janela de transferências aberta' : '🔴 Janela fechada — só jogadores livres (abre nas semanas 1–6 e 23–26)'}</div></div>`;
  const bids = G.inbox.filter((m) => m.kind === 'bid' && !m.done && !m.expired);
  h += `<div class="seg">${[['busca', 'Buscar'], ['obs', `Observados (${G.short.length})`], ['prop', `Propostas${bids.length ? ` (${bids.length})` : ''}`], ['venda', 'À venda'], ['olh', 'Olheiros'], ['emp', 'Empréstimos'], ['news', 'Notícias']].map(([k, l]) => `<button class="${S.sub.mk === k ? 'on' : ''}" data-a="sub" data-v="mk:${k}">${l}</button>`).join('')}</div>`;
  if (S.sub.mk === 'busca') h += searchView();
  else if (S.sub.mk === 'olh') h += scoutNetView(G);
  else if (S.sub.mk === 'obs') h += `<div class="card flat" style="padding:4px 12px"><div class="list">${G.short.map((id) => playerRow(G.players[id], { club: true })).join('') || '<div class="empty">Toque em ☆ Observar no perfil de um jogador.</div>'}</div></div>`;
  else if (S.sub.mk === 'prop') h += `<div class="card flat" style="padding:4px 12px"><div class="list">${bids.map((m) => `<div class="li tap" data-a="msg" data-v="${m.id}">${crest(G.clubs[m.from], 30)}<div class="grow"><div class="b ell">${esc(G.players[m.pid]?.n || '')}</div><div class="xs mut">${esc(G.clubs[m.from].name)} oferece ${money(m.fee)}</div></div>›</div>`).join('') || '<div class="empty">Nenhuma proposta. Coloque jogadores à venda para atrair interessados.</div>'}</div></div>`;
  else if (S.sub.mk === 'emp') { const out = G.players.filter((p) => p && p.loan && p.loan.from === c.id), inn = G.players.filter((p) => p && p.loan && p.club === c.id), lst = G.players.filter((p) => p && p.club === c.id && p.loanLst);
    h += `<div class="cols2"><div class="card flat"><h3>Emprestados por você</h3><div class="list">${out.map((p) => playerRow(p, { club: true, extra: `<span class="xs mut" style="width:90px;text-align:right">${esc(LOAN_T[p.loan.type].replace('Empréstimo ', ''))}</span>` })).join('') || '<div class="xs mut">Nenhum.</div>'}</div><h3 style="margin-top:8px">Disponíveis para empréstimo</h3><div class="list">${lst.map((p) => playerRow(p, { mine: true })).join('') || '<div class="xs mut">No perfil do jogador, toque em "Emprestar".</div>'}</div></div>
    <div class="card flat"><h3>Emprestados para você</h3><div class="list">${inn.map((p) => playerRow(p, { club: true, extra: `<span class="xs mut" style="width:90px;text-align:right">do ${esc(G.clubs[p.loan.from].short)}</span>` })).join('') || '<div class="xs mut">Peça um empréstimo no perfil de qualquer jogador.</div>'}</div></div></div>`; }
  else if (S.sub.mk === 'news') h += `<div class="card flat"><div class="list">${G.news.filter((n) => n.cat === 'mercado' || n.cat === 'rumor').slice(0, 60).map((n) => `<div class="li sm"><span class="xs dim" style="width:52px">${wk(n.w)}<br>${n.y}</span><span class="grow">${esc(n.txt)}</span></div>`).join('') || '<div class="empty">Sem movimentações ainda.</div>'}</div></div>`;
  else h += `<div class="card flat" style="padding:4px 12px"><div class="list">${G.players.filter((p) => p && p.club === c.id && p.lst).map((p) => playerRow(p, { mine: true })).join('') || '<div class="empty">Nenhum jogador à venda.</div>'}</div></div>`;
  return h;
};
function searchView(ro) {
  const G = S.G, f = S.filt;
  const res = scoutSearch(G, { pos: f.pos, min: +f.min || 0, age: +f.age || 0, league: f.league, free: f.free, q: f.q });
  return `<div class="card flat"><div class="row" style="gap:8px;margin-bottom:8px"><input placeholder="Buscar nome…" value="${esc(f.q)}" data-ch="fq"><select data-ch="fpos" style="width:110px"><option value="">Posição</option>${POS.map((p) => `<option ${f.pos === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
  <div class="row" style="gap:8px"><select data-ch="fmin"><option value="">Geral mín.</option>${[50, 55, 60, 65, 70, 75, 80, 85].map((x) => `<option value="${x}" ${+f.min === x ? 'selected' : ''}>${x}+</option>`).join('')}</select><select data-ch="fage"><option value="">Idade máx.</option>${[19, 21, 23, 25, 28, 31].map((x) => `<option value="${x}" ${+f.age === x ? 'selected' : ''}>até ${x}</option>`).join('')}</select></div>
  <div class="row" style="gap:8px;margin-top:8px"><select data-ch="flg"><option value="">Todas as ligas</option>${LEAGUES.map((l) => `<option value="${l.id}" ${f.league === l.id ? 'selected' : ''}>${esc(l.short)}</option>`).join('')}</select><span class="chip ${f.free ? 'on' : ''}" data-a="ffree">Livres</span></div></div>
  <div class="card flat" style="padding:4px 12px"><div class="xs mut" style="padding-top:8px">${res.length} jogadores${res.length >= 80 ? ' (mostrando 80)' : ''}</div><div class="list">${res.map((p) => playerRow(p, { club: true })).join('')}</div></div>`;
}
H.fq = (v) => { S.filt.q = v; render(); }; H.fpos = (v) => { S.filt.pos = v; render(); }; H.fmin = (v) => { S.filt.min = v; render(); }; H.fage = (v) => { S.filt.age = v; render(); }; H.flg = (v) => { S.filt.league = v; render(); };
H.ffree = () => { S.filt.free = !S.filt.free; render(); };

// ---------- MAIS ----------
PAGES.more = () => {
  const G = S.G; const unread = G.inbox.filter((m) => !m.read).length;
  const T = [['inbox', '📩', 'Caixa de entrada', 'Propostas e avisos', unread], ['noticias', '📰', 'Notícias', 'O que rola no futebol'], ['financas', '💰', 'Patrimônio', 'Salário e investimentos'], ['meuclube', '🏗️', 'Meu clube & SAF', 'Fundar clube, comprar ações'], ['editor', '✏️', 'Editor', 'Nomes, escudos e fotos'], ['opcoes', '⚙️', 'Opções', 'Salvar, ajuda, nova carreira']];
  return `<div class="tiles t3">${T.map(([k, ic, t, d, b]) => `<button class="tile" data-a="go" data-v="${k}"><span class="ic">${ic}</span><span class="tt">${t}</span><span class="ds">${d}</span>${b ? `<span class="badge">${b}</span>` : ''}</button>`).join('')}</div>`;
};
for (const k of ['inbox', 'noticias', 'clube', 'carreira', 'financas', 'meuclube', 'ligas', 'editor', 'opcoes']) PAGES_BACK[k] = null;
Object.assign(PAGES_T, { clube: 'Clube', carreira: 'Carreira', financas: 'Patrimônio', meuclube: 'Meu clube & SAF', ligas: 'Ligas do mundo', editor: 'Editor', opcoes: 'Opções' });

PAGES.clube = () => {
  const G = S.G, c = myClub(G);
  if (!c) return '<div class="empty">Você está sem clube.</div>';
  const f = c.fin; const inc = f.tv + f.tick + f.spon + f.prize + f.tin, out = f.wages + f.tout + f.other;
  const senior = !G.me.job.youth;
  return `<div class="card"><div class="row" style="gap:14px">${crest(c, 64)}<div class="grow"><div class="xb" style="font-size:18px">${esc(c.name)}</div><div class="sm mut">${esc(c.stad)} · ${c.cap} mil lugares</div><div>${stars(c.rep)}</div></div></div></div>
  <div class="card"><h3>Finanças da temporada</h3><div class="kv"><span class="mut">Caixa atual</span><b class="${c.money < 0 ? 'bad' : 'ok'}">${money(c.money)}</b></div>
  <div class="kv"><span>Direitos de TV</span><b>${money(f.tv)}</b></div><div class="kv"><span>Bilheteria</span><b>${money(f.tick)}</b></div><div class="kv"><span>Patrocínio</span><b>${money(f.spon)}</b></div><div class="kv"><span>Premiações</span><b>${money(f.prize)}</b></div><div class="kv"><span>Vendas de jogadores</span><b>${money(f.tin)}</b></div>
  <div class="kv"><span>Salários</span><b class="bad">-${money(f.wages)}</b></div><div class="kv"><span>Compras de jogadores</span><b class="bad">-${money(f.tout)}</b></div><div class="kv"><span>Outros</span><b class="bad">-${money(Math.max(0, f.other))}</b></div>
  <div class="kv"><span class="b">Saldo</span><b class="${inc - out < 0 ? 'bad' : 'ok'}">${money(inc - out)}</b></div></div>
  ${senior ? `<div class="card"><h3>Ingresso</h3><div class="field"><label>Preço médio: <b id="tkv">${money(c.price ?? ({ BR: 45, EN: 260, ES: 190, IT: 170, AR: 14 }[c.country] || 20))}</b></label><input type="range" min="5" max="${c.country === 'BR' ? 300 : c.country === 'AR' ? 80 : 900}" value="${Math.round(c.price ?? ({ BR: 45, EN: 260, ES: 190, IT: 170, AR: 14 }[c.country] || 20))}" data-in="ticket"></div><p class="xs mut">Ingresso caro dá mais dinheiro por jogo, mas pode irritar a torcida. (Efeito simples nesta versão.)</p></div>` : ''}
  <div class="card"><h3>Diretoria</h3>${senior ? `<div class="row sm"><span class="grow mut">Confiança</span><b>${Math.round(c.board.conf)}%</b></div><div class="bar"><i style="width:${c.board.conf}%"></i></div>` : ''}<p class="sm">🎯 ${esc(G.me.obj?.text || '')}</p>${c.saf ? `<p class="xs mut">SAF — associação ${c.own.assoc}%, fundo ${c.own.fund}%, você ${c.own.user}%</p>` : ''}</div>
  <div class="card"><h3>Títulos no jogo</h3>${c.troph.length ? c.troph.slice().reverse().map((t) => `<div class="kv"><span>🏆 ${esc(t.c)}</span><b>${t.y}</b></div>`).join('') : '<div class="mut sm">Nenhum ainda. Bora mudar isso.</div>'}</div>
  ${c.hist.length ? `<div class="card"><h3>Campanhas</h3>${c.hist.slice().reverse().map((h) => `<div class="kv"><span>${h.y} · ${esc(h.lg)}</span><b>${h.pos}º</b></div>`).join('')}</div>` : ''}`;
};
H.ticket = (v) => { const c = myClub(S.G); c.price = +v; document.getElementById('tkv').textContent = money(+v); save(); };

PAGES.carreira = () => {
  const G = S.G, me = G.me, j = me.job, s = me.stats;
  const vac = G.vac.filter((v) => { const c = G.clubs[v.cid]; return c.league && !(j && j.cid === v.cid && !!j.youth === !!v.youth); }).sort((a, b) => G.clubs[b.cid].rep - G.clubs[a.cid].rep);
  return `<div class="card"><div class="row" style="gap:12px"><div style="font-size:42px">🧑‍💼</div><div class="grow"><div class="xb" style="font-size:18px">${esc(me.name)}</div><div class="sm mut">${me.age} anos · ${j ? `${j.youth ? 'Sub-20 do ' : 'Técnico do '}${esc(G.clubs[j.cid].name)}` : 'Sem clube'}</div></div></div>
  <div style="margin-top:12px"><div class="row sm"><span class="grow mut">Reputação</span><b>${Math.round(me.rep)}/100</b></div><div class="bar"><i style="width:${me.rep}%;background:linear-gradient(90deg,var(--ac2),var(--gold))"></i></div><div class="xs mut" style="margin-top:4px">${repLabel(me.rep)}</div></div>
  <div class="stat-grid" style="margin-top:12px"><div class="stat"><div class="v">${s.j}</div><div class="l">jogos</div></div><div class="stat"><div class="v">${s.j ? Math.round(s.v / s.j * 100) : 0}%</div><div class="l">vitórias</div></div><div class="stat"><div class="v">${me.titles.length}</div><div class="l">títulos</div></div></div>
  ${j ? `<div class="kv" style="margin-top:8px"><span class="mut">Salário</span><b>${money(j.wage)}/sem.</b></div>` : ''}</div>
  <div class="card"><h3><span>Vagas abertas</span><span class="pill">${vac.length}</span></h3><div class="list">${vac.slice(0, 30).map((v) => { const c = G.clubs[v.cid]; const ch = applyChance(G, c, v.youth); return `<div class="li">${crest(c, 30)}<div class="grow"><div class="b ell">${esc(c.name)}${v.youth ? ' <span class="pill b">Sub-20</span>' : ''}</div><div class="xs mut">${esc(G.comps[c.league]?.short || '')} · rep ${c.rep} · ${money(coachWage(c.rep, c.country, v.youth))}/sem.</div></div><button class="btn sm ${ch > 0.4 ? 'pri' : ''}" data-a="apply" data-v="${v.cid}:${v.youth ? 1 : 0}">${Math.round(ch * 100)}%</button></div>`; }).join('') || '<div class="empty">Nenhuma vaga no momento.</div>'}</div><p class="xs mut">O número é a chance de ser contratado. Vagas aparecem quando clubes demitem técnicos.</p></div>
  ${me.titles.length ? `<div class="card"><h3>Títulos</h3>${me.titles.slice().reverse().map((t) => `<div class="kv"><span>🏆 ${esc(t.c)} <span class="mut">(${esc(t.club)})</span></span><b>${t.y}</b></div>`).join('')}</div>` : ''}
  <div class="card"><h3>Histórico</h3>${me.hist.slice().reverse().map((h) => `<div class="kv"><span>${esc(h.name)}${h.youth ? ' (Sub-20)' : ''}</span><b>${h.y}${h.pos ? ` · ${h.pos}º` : ''}</b></div>`).join('')}</div>
  ${j ? `<button class="btn red blk" data-a="resign">Pedir demissão</button>` : ''}`;
};
function repLabel(r) { return r < 15 ? 'Desconhecido — comece de baixo' : r < 30 ? 'Promessa — clubes pequenos te notam' : r < 45 ? 'Respeitado nas divisões de acesso' : r < 60 ? 'Nome forte no país' : r < 75 ? 'Técnico de elite nacional' : r < 88 ? 'Cobiçado por gigantes' : 'Lenda do futebol'; }
function applyChance(G, c, youth) { return clamp(0.75 - (c.rep - G.me.rep - (youth ? 20 : 0)) * 0.035, 0.02, 0.95); }
H.apply = (v) => {
  const G = S.G; const [cid, y] = v.split(':').map(Number); const c = G.clubs[cid];
  G.me.apps ||= [];
  if (G.me.apps.includes(cid + ':' + G.t)) { toast('Você já se candidatou esta semana'); return; }
  G.me.apps.push(cid + ':' + G.t);
  if (Math.random() < applyChance(G, c, y)) {
    G.inbox.unshift({ id: (G.inbox[0]?.id || 0) + 1, t: G.t, y: G.year, w: G.week, from: c.name, title: `✅ ${c.name} aceitou sua candidatura`, body: `O ${c.name} quer você como técnico${y ? ' do sub-20' : ''}. Salário: ${money(coachWage(c.rep, c.country, !!y))}/semana. Aceita?`, read: false, kind: 'job', cid, youth: !!y, exp: G.t + 2 });
    toast('✅ Aprovado! Veja a caixa de entrada.');
    const vv = G.vac.find((x) => x.cid === cid); if (vv) vv.offered = true;
  } else toast(`❌ ${c.name} preferiu outro técnico.`);
  render(); save();
};
H.resign = () => openSheet(`<h2>Pedir demissão?</h2><p>Você fica sem clube e perde um pouco de reputação.</p><div class="row"><button class="btn grow" data-a="cs">Cancelar</button><button class="btn red grow" data-a="resign2">Sair do clube</button></div>`);
H.resign2 = () => { resign(S.G); closeSheet(); toast('Você deixou o clube.'); render(); save(); };

// ---------- Patrimônio ----------
PAGES.financas = () => {
  const G = S.G, me = G.me, inv = me.inv;
  const nw = netWorth(G);
  const hist = inv.hist || [];
  const spark = hist.length > 1 ? (() => { const mn = Math.min(...hist), mx = Math.max(...hist); const pts = hist.map((v, i) => `${(i / (hist.length - 1)) * 100},${48 - ((v - mn) / (mx - mn || 1)) * 44}`).join(' '); return `<svg class="spark" viewBox="0 0 100 50" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="#2fe08a" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`; })() : '';
  return `<div class="card"><div class="xs mut">Patrimônio total</div><div class="xb" style="font-size:26px">${money(nw)}</div>${spark}<div class="kv"><span class="mut">Dinheiro na conta</span><b>${money(me.money)}</b></div><div class="kv"><span class="mut">Salário líquido</span><b>${me.job ? money(Math.round(me.job.wage * 0.75)) + '/sem.' : '—'}</b></div><div class="kv"><span class="mut">Custo de vida</span><b>R$ 350/sem.</b></div></div>
  <div class="card"><h3>💵 Renda fixa (CDI)</h3><div class="kv"><span>Saldo</span><b>${money(inv.cdi)}</b></div><p class="xs mut">Rende ~13% ao ano, sem risco.</p>${invBtns('cdi')}</div>
  <div class="card"><h3>📈 Ações</h3><div class="kv"><span>Saldo</span><b>${money(inv.acoes)}</b></div><div class="kv"><span>Última semana</span><b class="${(inv.lastAcoes || 0) >= 0 ? 'ok' : 'bad'}">${((inv.lastAcoes || 0) * 100).toFixed(1)}%</b></div><p class="xs mut">Rende mais no longo prazo, mas oscila bastante.</p>${invBtns('acoes')}</div>
  <div class="card"><h3>🏢 Imóveis</h3><div class="kv"><span>Apartamentos</span><b>${inv.imoveis}</b></div><div class="kv"><span>Preço de cada</span><b>${money(inv.imovelVal || APT_PRICE)}</b></div><p class="xs mut">Valorizam devagar e pagam aluguel toda semana.</p><div class="row"><button class="btn sm grow" data-a="inv" data-v="imovel:-1">Vender 1</button><button class="btn sm pri grow" data-a="inv" data-v="imovel:1">Comprar 1</button></div></div>`;
};
function invBtns(k) { return `<div class="row" style="flex-wrap:wrap;gap:6px">${[-1, -0.5].map((x) => `<button class="btn sm grow" data-a="inv" data-v="${k}:${x}">Resgatar ${x === -1 ? 'tudo' : '50%'}</button>`).join('')}${[0.25, 1].map((x) => `<button class="btn sm pri grow" data-a="inv" data-v="${k}:${x}">Aplicar ${x === 1 ? 'tudo' : '25%'}</button>`).join('')}</div>`; }
H.inv = (v) => {
  const G = S.G; const [k, x] = v.split(':'); const n = +x;
  let r;
  if (k === 'imovel') r = invest(G, 'imovel', n);
  else { const amt = n > 0 ? Math.floor(Math.max(0, G.me.money - 1000) * n) : Math.floor(G.me.inv[k] * n); if (!amt) { toast('Nada a movimentar'); return; } r = invest(G, k, amt); }
  toast(r); render(); save();
};

// ---------- Meu clube & SAF ----------
PAGES.meuclube = () => {
  const G = S.G, me = G.me;
  let h = '';
  const owned = G.clubs.filter((c) => c.own.user > 0);
  if (me.own != null) {
    const c = G.clubs[me.own];
    const coaching = me.job && me.job.cid === c.id && !me.job.youth;
    h += `<div class="card"><h3>Seu clube</h3><div class="row" style="gap:12px" data-a="club" data-v="${c.id}">${crest(c, 56)}<div class="grow"><div class="xb">${esc(c.name)}</div><div class="sm mut">${esc(G.comps[c.league]?.short || (c.league === 'AMA' ? 'Liga Amadora' : '—'))} · fundado em ${c.founded}</div></div></div>
    <div class="kv"><span class="mut">Caixa do clube</span><b class="${c.money < 0 ? 'bad' : 'ok'}">${money(c.money)}</b></div><div class="kv"><span class="mut">Técnico</span><b>${coaching ? 'Você' : c.coach ? esc(c.coach.n) : 'vago'}</b></div>
    ${c.league === 'AMA' && !G.comps.AMA ? `<div class="hint">O clube estreia na Liga Amadora na próxima temporada. Campeão da várzea sobe para a Série D!</div>` : c.league === 'AMA' ? `<div class="hint">Seja campeão da várzea para subir para a Série D.</div>` : ''}
    <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn sm grow" data-a="aporte" data-v="${c.id}">💸 Fazer aporte</button>${coaching ? '' : `<button class="btn sm pri grow" data-a="selfcoach" data-v="${c.id}">🧑‍💼 Ser o técnico</button>`}</div></div>`;
  } else {
    h += `<div class="card"><h3>Fundar seu próprio clube</h3><p class="sm">Crie um clube do zero: nome, cores e escudo. Ele começa na <b>Liga Amadora (várzea)</b>; se for campeão, sobe para a <b>Série D</b> e pode chegar à elite.</p><div class="kv"><span class="mut">Custo de fundação</span><b>${money(FOUND_COST)}</b></div><div class="kv"><span class="mut">Seu dinheiro</span><b class="${me.money >= FOUND_COST ? 'ok' : 'bad'}">${money(me.money)}</b></div>
    <button class="btn ${me.money >= FOUND_COST ? 'pri' : ''} blk" data-a="found" ${me.money >= FOUND_COST ? '' : 'disabled'}>🏗️ Fundar clube</button>${me.money < FOUND_COST ? '<p class="xs mut">Junte dinheiro com seu salário e investimentos.</p>' : ''}</div>`;
  }
  if (owned.length) h += `<div class="card"><h3>Suas participações</h3><div class="list">${owned.map((c) => `<div class="li tap" data-a="saf" data-v="${c.id}">${crest(c, 30)}<div class="grow"><div class="b ell">${esc(c.name)}</div><div class="xs mut">${c.own.user}% · ${controls(G, c) ? 'controlador' : 'minoritário'}</div></div><b>${money(clubValuation(G, c) * c.own.user / 100)}</b></div>`).join('')}</div></div>`;
  h += `<div class="card"><h3>Comprar SAF</h3><p class="sm">Compre ações de um clube. Com 51% (ou liderando um consórcio com um fundo) você controla o clube: escolhe o técnico — pode ser você — e investe no elenco. Metade do valor pago entra no caixa do clube.</p>
  ${S.safLg ? '' : ((S.safLg = 'BRD'), '')}<select data-ch="saflg" style="margin-bottom:8px">${LEAGUES.map((l) => `<option value="${l.id}" ${S.safLg === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select>
  <div class="list">${G.clubs.filter((c) => c.league === (S.safLg || 'BRD')).sort((a, b) => clubValuation(G, a) - clubValuation(G, b)).map((c) => `<div class="li tap" data-a="saf" data-v="${c.id}">${crest(c, 28)}<span class="grow ell b">${esc(c.name)}</span><span class="sm">${money(clubValuation(G, c))}</span></div>`).join('')}</div></div>`;
  return h;
};
H.saflg = (v) => { S.safLg = v; render(); };

H.found = () => {
  S.fc = { name: '', short: '', city: '', c1: '#1846a8', c2: '#ffffff', aporte: 0 };
  openSheet(foundHtml());
};
function foundHtml() {
  const f = S.fc, me = S.G.me;
  const prev = { key: 'preview-' + f.name, name: f.name || 'Seu Clube', short: (f.short || f.name.slice(0, 3) || 'SEU').toUpperCase(), c1: f.c1, c2: f.c2 };
  return `<h2>Fundar clube</h2><div style="text-align:center;margin-bottom:10px" id="fprev">${crest(prev, 80)}</div>
  <div class="field"><label>Nome do clube</label><input value="${esc(f.name)}" data-in="fcf" data-k="name" placeholder="Ex.: Esporte Clube Vila Nova"></div>
  <div class="row" style="gap:8px"><div class="field grow"><label>Sigla (3 letras)</label><input maxlength="3" value="${esc(f.short)}" data-in="fcf" data-k="short"></div><div class="field grow"><label>Cidade</label><input value="${esc(f.city)}" data-in="fcf" data-k="city"></div></div>
  <div class="row" style="gap:8px"><div class="field grow"><label>Cor principal</label><input type="color" value="${f.c1}" data-in="fcf" data-k="c1"></div><div class="field grow"><label>Cor secundária</label><input type="color" value="${f.c2}" data-in="fcf" data-k="c2"></div></div>
  <div class="field"><label>Aporte inicial no caixa: <b id="fap">${money(f.aporte)}</b></label><input type="range" min="0" max="${Math.max(0, Math.floor(me.money - FOUND_COST))}" step="10000" value="${f.aporte}" data-in="fcap"></div>
  <p class="xs mut">Depois você pode trocar o escudo por uma imagem sua no Editor.</p>
  <button class="btn pri blk" data-a="found2">Fundar por ${money(FOUND_COST)}</button>`;
}
H.fcf = (v, el) => { S.fc[el.dataset.k] = v; const f = S.fc; document.getElementById('fprev').innerHTML = crest({ key: 'preview-' + f.name, name: f.name, short: (f.short || f.name.slice(0, 3) || 'SEU').toUpperCase(), c1: f.c1, c2: f.c2 }, 80); };
H.fcap = (v) => { S.fc.aporte = +v; document.getElementById('fap').textContent = money(+v); };
H.found2 = () => {
  const f = S.fc; if (f.name.trim().length < 3) { toast('Dê um nome ao clube'); return; }
  const r = foundClub(S.G, { ...f, name: f.name.trim(), short: (f.short || f.name.slice(0, 3)).toUpperCase() });
  if (!r.ok) { toast(r.why); return; }
  closeSheet(); toast(`🎉 ${r.club.name} fundado!`, 3000); render(); save();
};
H.aporte = (v) => { S.apc = +v; S.apv = 0; openSheet(`<h2>Aporte no clube</h2><p class="sm mut">Dinheiro sai da sua conta e vai para o caixa do clube.</p><div class="field"><label>Valor: <b id="apv">${money(0)}</b></label><input type="range" min="0" max="${Math.max(0, Math.floor(S.G.me.money))}" step="10000" value="0" data-in="apv"></div><button class="btn pri blk" data-a="aporte2">Confirmar aporte</button>`); };
H.apv = (v) => { S.apv = +v; document.getElementById('apv').textContent = money(+v); };
H.aporte2 = () => { toast(inject(S.G, S.apc, S.apv)); closeSheet(); render(); save(); };
H.selfcoach = (v) => {
  const G = S.G, c = G.clubs[+v];
  if (G.me.job && !confirm(`Deixar o ${G.clubs[G.me.job.cid].name} para treinar o ${c.name}?`)) return;
  if (G.me.job) resign(G);
  takeJob(G, c.id, false); c.board.conf = 90;
  toast(`Você agora treina o ${c.name}!`); S.page = null; S.tab = 'home'; render(); save();
};

H.saf = (v) => {
  const G = S.G, c = G.clubs[+v];
  S.saf = { cid: c.id, pct: Math.min(51, c.own.assoc), fund: false };
  closeSheet(true);
  openSheet(safHtml());
};
function safHtml() {
  const G = S.G, s = S.saf, c = G.clubs[s.cid];
  const q = safQuote(G, c.id, s.pct, s.fund);
  const mine = c.own.user;
  return `<div class="row" style="gap:12px">${crest(c, 56)}<div class="grow"><h2 style="margin:0">${esc(c.name)}</h2><div class="sm mut">Valor do clube: ${money(q.val)}</div></div></div>
  <div class="card flat" style="margin-top:12px"><div class="kv"><span>Associação (à venda)</span><b>${c.own.assoc}%</b></div><div class="kv"><span>Fundos</span><b>${c.own.fund}%</b></div><div class="kv"><span>Você</span><b class="ok">${mine}%</b></div></div>
  ${c.own.assoc >= 10 ? `<div class="field"><label>Comprar: <b id="safp">${s.pct}%</b> · custo <b id="safc">${money(q.cost)}</b></label><input type="range" min="10" max="${Math.min(90, c.own.assoc)}" value="${s.pct}" data-in="safpct"></div>
  <div class="li tap" data-a="saffund"><div class="grow"><div class="b">Trazer fundo parceiro</div><div class="xs mut">O fundo compra até 30% junto com você (paga a parte dele). Você controla se tiver mais ações que ele e juntos passarem de 51%.</div></div><span class="chip ${s.fund ? 'on' : ''}">${s.fund ? 'Sim' : 'Não'}</span></div>
  <div class="hint" style="margin:10px 0" id="safctl">${q.control ? '✅ Você terá o controle do clube.' : 'ℹ️ Participação minoritária: você recebe dividendos, mas não manda no clube.'}</div>
  <button class="btn pri blk" data-a="safbuy">Comprar por ${money(q.cost)}</button>` : '<p class="mut">Não há ações disponíveis da associação.</p>'}
  ${mine > 0 ? `<button class="btn red blk" style="margin-top:8px" data-a="safsell">Vender minhas ações (${money(q.val * mine / 100 * 0.95)})</button>` : ''}
  <p class="xs mut" style="margin-top:8px">Seu dinheiro: ${money(G.me.money)}</p>`;
}
H.safpct = (v) => { S.saf.pct = +v; const q = safQuote(S.G, S.saf.cid, +v, S.saf.fund); document.getElementById('safp').textContent = v + '%'; document.getElementById('safc').textContent = money(q.cost); document.getElementById('safctl').textContent = q.control ? '✅ Você terá o controle do clube.' : 'ℹ️ Participação minoritária: você recebe dividendos, mas não manda no clube.'; };
H.saffund = () => { S.saf.fund = !S.saf.fund; replaceSheet(safHtml()); };
H.safbuy = () => { const r = buySAF(S.G, S.saf.cid, S.saf.pct, S.saf.fund); if (!r.ok) { toast(r.why, 3000); return; } toast('🏦 Compra concluída!', 2500); closeSheet(); render(); save(); };
H.safsell = () => { const p = sellStake(S.G, S.saf.cid, S.G.clubs[S.saf.cid].own.user); toast(`Vendido por ${money(p)}`); closeSheet(); render(); save(); };

// ---------- Ligas ----------
PAGES.ligas = () => { S.tab = 'jg'; S.sub.jg = 'tab'; S.page = null; setTimeout(render); return ''; };

// ---------- Opções ----------
PAGES.opcoes = () => `<div class="card"><h3>Jogo</h3><button class="btn blk" data-a="savenow">💾 Salvar agora</button><p class="xs mut">O jogo também salva sozinho a cada avanço.</p>
  <div class="li tap" data-a="presstog"><span class="grow">Entrevistas coletivas</span><span class="chip ${S.G.me.pressOn !== false ? 'on' : ''}">${S.G.me.pressOn !== false ? 'Ligadas' : 'Desligadas'}</span></div></div>
  <div class="card"><h3>Como jogar</h3><div class="sm" style="line-height:1.55">
  • <b>Continuar</b> avança o tempo até o próximo jogo seu.<br>• Monte o time em <b>Elenco › Escalação</b> e a estratégia em <b>Tática</b>.<br>• Ganhe jogos para subir sua <b>reputação</b> — clubes maiores passam a te chamar.<br>• Com seu salário, invista em <b>Patrimônio</b>. Com ${money(FOUND_COST)} você <b>funda um clube</b> na várzea; ou compre ações de uma <b>SAF</b>.<br>• No <b>Editor</b> você troca escudos e fotos por imagens da sua galeria (ficam só no seu aparelho).</div></div>
  <div class="card"><h3>Sobre os dados</h3><p class="sm mut">Clubes e ligas reais da temporada 2026. Os elencos das primeiras divisões são reais (base até meados de 2026) e podem estar desatualizados; nas divisões de baixo os jogadores são gerados. Corrija o que quiser no Editor.</p></div>
  <button class="btn red blk" data-a="newcareer">Começar nova carreira</button>`;
H.savenow = async () => { await save(true); toast('💾 Jogo salvo'); };
H.presstog = () => { S.G.me.pressOn = S.G.me.pressOn === false; render(); save(); };
H.newcareer = () => openSheet(`<h2>Nova carreira?</h2><p>O jogo atual será apagado (escudos e fotos enviados continuam).</p><div class="row"><button class="btn grow" data-a="cs">Cancelar</button><button class="btn red grow" data-a="newcareer2">Apagar e recomeçar</button></div>`);

VIEWS.mk = () => PAGES.market();
VIEWS.clube = () => PAGES.clube();
VIEWS.carreira = () => PAGES.carreira();
VIEWS.more = () => PAGES.more();

// ---------- empréstimos ----------
H.loanlst = (v) => { const p = S.G.players[+v]; p.loanLst = !p.loanLst; if (p.loanLst) p.lst = false; toast(p.loanLst ? 'Disponível para empréstimo — aguarde propostas na janela' : 'Empréstimo cancelado'); closeSheet(); H.player(v); save(); };
H.loanin = (v) => { S.ln = { p: +v, type: 'simples', share: 0.7 }; replaceSheet(loanHtml()); };
function loanHtml() {
  const G = S.G, n = S.ln, p = G.players[n.p];
  return `<h2>Empréstimo: ${esc(p.n)}</h2><div class="xs mut">${esc(G.clubs[p.club].name)} · salário ${money(p.wage)}/sem.</div>
  <div class="field" style="margin-top:10px"><label>Tipo</label><div class="seg" style="margin:0">${Object.entries(LOAN_T).map(([k, l]) => `<button class="${n.type === k ? 'on' : ''}" data-a="lnt" data-v="${k}">${l.replace('Empréstimo ', '').replace('simples', 'Simples')}</button>`).join('')}</div></div>
  ${n.type !== 'simples' ? `<div class="hint" style="margin-bottom:8px">Valor de compra estimado: ${money(Math.round(playerValue(p) * (n.type === 'obrig' ? 0.95 : 1.1) / 1000) * 1000)}${n.type === 'obrig' ? ' — compra obrigatória no fim da temporada.' : ' — você decide na semana 41.'}</div>` : ''}
  <div class="field"><label>Você paga <b id="lns">${Math.round(n.share * 100)}%</b> do salário</label><input type="range" min="0.3" max="1" step="0.05" value="${n.share}" data-in="lns"></div>
  <p class="xs mut">Pagar mais do salário e incluir obrigação de compra aumentam a chance de o clube aceitar. Titulares quase nunca são emprestados.</p>
  <button class="btn pri blk" data-a="lnok">Enviar pedido</button>`;
}
H.lnt = (v) => { S.ln.type = v; replaceSheet(loanHtml()); };
H.lns = (v) => { S.ln.share = +v; document.getElementById('lns').textContent = Math.round(+v * 100) + '%'; };
H.lnok = () => { const G = S.G; const r = loanRequest(G, G.players[S.ln.p], S.ln.type, S.ln.share); toast(r.why, 3200); if (r.ok) { closeSheet(true); render(); save(); } };

// ---------- categoria (Sub-17 / Sub-20) e treino individual ----------
function catBtn(p) {
  if (p.u17) return `<button class="btn sm blk" style="margin-bottom:6px" data-a="cat" data-v="${p.id}:20">⬆️ Subir para o Sub-20</button>`;
  if (p.u20 && p.age <= 17 && S.G.comps.U17?.clubs.includes(p.club)) return `<button class="btn sm blk" style="margin-bottom:6px" data-a="cat" data-v="${p.id}:17">⬇️ Mandar para o Sub-17 (ganhar minutos)</button>`;
  return '';
}
H.cat = (v) => { const G = S.G; const [id, k] = v.split(':'); const p = G.players[+id]; p.u17 = k === '17'; if (G.me.u20lineup) G.me.u20lineup = null; toast(p.u17 ? `${p.n} vai jogar no Sub-17` : `${p.n} subiu para o Sub-20`); closeSheet(); render(); save(); };
function itrBtn(p) {
  const t = p.itr; const lab = !t ? 'Nenhum' : t.startsWith('pos:') ? `Nova posição: ${t.slice(4)} (${p.posL || 0}/10 sem.)` : ITR[t].n;
  return `<div class="li tap" style="margin-bottom:6px;border:1px solid var(--line);border-radius:10px;padding:6px 10px" data-a="itr" data-v="${p.id}"><span>🎯</span><div class="grow"><div class="xs mut">Treino individual</div><div class="b sm">${esc(lab)}</div></div><span class="mut">›</span></div>`;
}
H.itr = (v) => {
  const p = S.G.players[+v];
  openSheet(`<h2>Treino individual · ${esc(p.n)}</h2><div class="list">${[['', 'Nenhum', 'Segue só o treino coletivo.']].concat(Object.entries(ITR).filter(([k]) => k !== 'pos').map(([k, x]) => [k, x.n, x.d])).map(([k, n, d]) => `<div class="li tap" data-a="itr2" data-v="${p.id}:${k}"><div class="grow"><div class="b">${n}</div><div class="xs mut">${d}</div></div>${(p.itr || '') === k ? '<span class="ok xb">✓</span>' : ''}</div>`).join('')}</div>
  <h3 style="margin-top:10px">${ITR.pos.n}</h3><p class="xs mut">${ITR.pos.d}</p><div class="chips" style="flex-wrap:wrap">${POS.filter((x) => x !== p.pos && (x === 'GOL') === (p.pos === 'GOL')).map((x) => `<span class="chip ${p.itr === 'pos:' + x ? 'on' : ''}" data-a="itr2" data-v="${p.id}:pos:${x}">${x}</span>`).join('')}</div>`);
};
H.itr2 = (v) => { const [id, ...k] = v.split(':'); const p = S.G.players[+id]; const t = k.join(':'); if (t !== p.itr) p.posL = 0; p.itr = t || null; toast('Treino individual definido'); closeSheet(true); H.player(id); render(); save(); };
