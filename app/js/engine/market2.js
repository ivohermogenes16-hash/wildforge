import { agentOf } from './universe.js';
// =====================================================================
// MERCADO AVANÇADO — empréstimos (simples, com opção, com obrigação),
// empresários oferecendo jogadores, rumores e negociações em andamento,
// disputa entre clubes, troca de jogadores na negociação
// =====================================================================
import { clamp, ri, rf, rnd, pick, money, shuffle } from '../util.js';
import { playerValue, playerWage } from './econ.js';
import { inWindow, askPrice, importance, willJoin, wageDemand, doTransfer, isUserClub, userControls } from './market.js';
import { QUOTA } from './world.js';
import { tl } from './life.js';

export const LOAN_T = { simples: 'Empréstimo simples', opcao: 'Empréstimo com opção de compra', obrig: 'Empréstimo com obrigação de compra' };
function msg(G, from, title, body, extra = {}) { G.inbox.unshift({ id: (G.inbox[0]?.id || 0) + 1, t: G.t, y: G.year, w: G.week, from, title, body, read: false, ...extra }); }
function news(G, txt, cat = 'mercado') { G.news.unshift({ t: G.t, y: G.year, w: G.week, txt, cat }); }
const myCid = (G) => (G.me.job && !G.me.job.youth ? G.me.job.cid : -99);

// ---------------- empréstimos ----------------
export function doLoan(G, p, to, type, fee, share) {
  const from = p.club; const F = G.clubs[from], T = G.clubs[to];
  p.loan = { from, type, fee, share, until: G.year };
  p.club = to; p.lst = false; p.loanLst = false; p.u20 = false; p.mor = clamp(p.mor + 5, 0, 100); p.bw = 0;
  if (F.lineup) F.lineup = null; if (T.lineup) T.lineup = null;
  news(G, `🔁 ${p.n} é emprestado pelo ${F.name} ao ${T.name} (${LOAN_T[type].toLowerCase()}${type !== 'simples' ? `, ${money(fee)}` : ''}).`);
}
export function endLoan(G, p, buy) {
  const L = p.loan; if (!L) return;
  const F = G.clubs[L.from], T = G.clubs[p.club];
  if (!T || !F || p.club < 0) { p.loan = null; return; }
  if (buy) {
    T.money -= L.fee; T.fin.tout += L.fee; F.money += L.fee; F.fin.tin += L.fee;
    p.loan = null; p.con = Math.max(p.con, G.year + 3); p.wage = Math.max(p.wage, playerWage(p, T.country));
    news(G, `✍️ ${T.name} ${L.type === 'obrig' ? 'cumpre a obrigação e compra' : 'exerce a opção e compra'} ${p.n} por ${money(L.fee)}.`);
  } else {
    p.club = L.from; p.loan = null; if (T.lineup) T.lineup = null; if (F.lineup) F.lineup = null;
    news(G, `↩️ ${p.n} volta ao ${F.name} após empréstimo ao ${T.name}.`);
  }
}
// pedido de empréstimo do usuário por um jogador de outro clube
export function loanRequest(G, p, type, share) {
  const c = G.clubs[G.me.job.cid];
  if (p.club < 0 || p.loan) return { ok: false, why: 'Esse jogador não pode ser emprestado.' };
  if (!inWindow(G)) return { ok: false, why: 'Janela fechada.' };
  if (G.me.freeze && G.me.freeze >= G.t) return { ok: false, why: 'A diretoria congelou as contratações.' };
  const imp = importance(G, p); const own = G.clubs[p.club];
  if (imp >= 0.7 && p.age < 30) return { ok: false, why: `O ${own.name} não empresta um titular.` };
  const wj = willJoin(G, p, c.id); if (!wj.ok) return wj;
  const fee = type === 'simples' ? 0 : Math.round(playerValue(p) * (type === 'obrig' ? 0.95 : 1.1) / 1000) * 1000;
  if (type !== 'simples' && fee > c.money * 1.2) return { ok: false, why: `Seu clube não teria caixa para a compra futura (${money(fee)}).` };
  let pr = 0.25 + share * 0.6 + (type === 'obrig' ? 0.2 : type === 'opcao' ? 0.05 : 0) + (p.age <= 21 ? 0.1 : 0) - imp * 0.3;
  if (rnd() < pr) { doLoan(G, p, c.id, type, fee, share); if (G.me.car) G.me.car.trans++; return { ok: true, why: `✅ ${p.n} chega emprestado${type !== 'simples' ? ` (compra: ${money(fee)})` : ''}!` }; }
  return { ok: false, why: `❌ O ${own.name} recusou. Tente pagar mais do salário ou incluir obrigação de compra.` };
}

// ---------------- disputa por jogador ----------------
export function rivalFor(G, p, cid) {
  if (p.ovr < 68 || rnd() > 0.4) return null;
  const me = G.clubs[cid]; const fee = p.club >= 0 ? askPrice(G, p) : 0;
  const cands = G.clubs.filter((c) => c.league && c.id !== cid && c.id !== p.club && !isUserClub(G, c.id) && c.rep >= me.rep - 8 && c.money > fee * 1.1 && willJoin(G, p, c.id).ok);
  if (!cands.length) return null;
  const c = pick(cands);
  return { cid: c.id, wage: Math.round(wageDemand(G, p, c.id) * rf(1.0, 1.25) / 50) * 50 };
}
// valor de um jogador oferecido numa troca, na visão do clube vendedor
export function swapValue(G, swap, sellerCid) {
  if (!swap) return 0;
  const S = G.clubs[sellerCid];
  const cnt = G.players.filter((x) => x && x.club === sellerCid && !x.u20 && x.pos === swap.pos).length;
  const need = cnt < QUOTA[swap.pos] ? 1 : 0.7;
  const fit = willJoin(G, swap, sellerCid).ok ? 1 : 0;
  return Math.round(playerValue(swap) * 0.85 * need * fit * (swap.age >= 31 ? 0.7 : 1) * (S.rep + 10 >= G.clubs[swap.club].rep ? 1 : 0.8) / 1000) * 1000;
}

// ---------------- negociações da IA (com rumores) ----------------
export function queueDeal(G, buyer, p, fee, wage) {
  G.deals ||= [];
  if (G.deals.some((d) => d.pid === p.id)) return;
  G.deals.push({ b: buyer.id, pid: p.id, from: p.club, fee, wage, t: G.t + ri(1, 2) });
  if (p.ovr >= 72 || buyer.rep >= 75) news(G, `📰 Rumor: ${buyer.name} está perto de fechar com ${p.n}${p.club >= 0 ? ` (${G.clubs[p.club].name})` : ''}.`, 'rumor');
}
function processDeals(G) {
  for (const d of (G.deals || []).slice()) {
    if (G.t < d.t) continue;
    G.deals = G.deals.filter((x) => x !== d);
    const p = G.players[d.pid], B = G.clubs[d.b];
    if (!p || p.club !== d.from || p.loan || isUserClub(G, p.club) || B.money < d.fee) { if (p && p.ovr >= 72) news(G, `📰 Negociação entre ${B.name} e ${p.n} esfria.`, 'rumor'); continue; }
    if (p.per === 'Leal' && p.club >= 0 && G.clubs[p.club].rep >= B.rep - 10 && rnd() < 0.6) { news(G, `💚 ${p.n} recusa o ${B.name}: "Meu lugar é aqui."`, 'rumor'); continue; }
    doTransfer(G, p, B.id, d.fee, d.wage, ri(2, 4));
  }
}
function rumors(G) {
  if (rnd() > 0.5) return;
  const stars = G.players.filter((p) => p && p.club >= 0 && p.ovr >= 80 && !p.loan && !p.u20);
  const p = pick(stars); if (!p) return;
  const B = pick(G.clubs.filter((c) => c.league && c.id !== p.club && c.rep >= G.clubs[p.club].rep - 3 && c.money > playerValue(p) * 0.6));
  if (!B) return;
  news(G, pick([`📰 ${B.name} monitora ${p.n}, do ${G.clubs[p.club].name}.`, `📰 Imprensa: ${p.n} estaria interessado em jogar no ${B.name}.`, `📰 ${B.name} prepara proposta por ${p.n}.`]), 'rumor');
}

// ---------------- empréstimos da IA ----------------
function aiLoans(G) {
  if (!(G.week <= 2 || (G.week >= 22 && G.week <= 23))) return;
  let n = 0;
  for (const p of shuffle(G.players.filter((x) => x && x.club >= 0 && !x.u20 && !x.loan && x.age <= 22 && !isUserClub(G, x.club) && !userControls(G, x.club)))) {
    if (n >= 10) break;
    const F = G.clubs[p.club]; if (!F.league || importance(G, p) >= 0.7 || rnd() > 0.15) continue;
    const T = pick(G.clubs.filter((c) => c.league && c.country === F.country && c.rep < F.rep - 10 && c.rep > F.rep - 40 && !isUserClub(G, c.id) && !userControls(G, c.id)));
    if (!T) continue;
    const type = pick(['simples', 'simples', 'opcao']); doLoan(G, p, T.id, type, Math.round(playerValue(p) * 1.1 / 1000) * 1000, rf(0.5, 1)); n++;
  }
}

// ---------------- jogadores do usuário: ofertas de empréstimo e empresários ----------------
function loanOffers(G) {
  const cid = myCid(G); if (cid < 0 || !inWindow(G)) return;
  for (const p of G.players) {
    if (!p || p.club !== cid || !p.loanLst || p.loan || rnd() > 0.35) continue;
    if (G.inbox.some((m) => m.kind === 'loanoff' && m.pid === p.id && !m.done)) continue;
    const T = pick(G.clubs.filter((c) => c.league && c.id !== cid && c.rep <= G.clubs[cid].rep + 5 && c.rep >= G.clubs[cid].rep - 35 && willJoin(G, p, c.id).ok));
    if (!T) continue;
    const type = pick(['simples', 'simples', 'opcao', 'obrig']); const fee = type === 'simples' ? 0 : Math.round(playerValue(p) * rf(0.9, 1.2) / 1000) * 1000; const share = Math.round(rf(0.5, 1) * 20) / 20;
    msg(G, T.name, `🔁 Proposta de empréstimo: ${p.n}`, `O ${T.name} quer ${p.n} emprestado até o fim da temporada.\nTipo: ${LOAN_T[type]}${type !== 'simples' ? ` (${money(fee)})` : ''}.\nEles pagam ${Math.round(share * 100)}% do salário.`, { kind: 'loanoff', pid: p.id, to: T.id, type, fee, share, exp: G.t + 2 });
  }
}
export function acceptLoanOffer(G, m) {
  const p = G.players[m.pid]; m.done = true;
  if (!p || p.club !== myCid(G)) return 'O jogador não está mais no clube.';
  doLoan(G, p, m.to, m.type, m.fee, m.share); if (G.me.car) G.me.car.trans++;
  return `${p.n} emprestado ao ${G.clubs[m.to].name}.`;
}
function agents(G) {
  const cid = myCid(G); if (cid < 0 || !inWindow(G) || G.t - (G.me.cd?.agent ?? -9) < 3 || rnd() > 0.5) return;
  const c = G.clubs[cid]; const sq = G.players.filter((p) => p && p.club === cid && !p.u20);
  const cnt = {}; for (const p of sq) cnt[p.pos] = (cnt[p.pos] || 0) + 1;
  const avg = sq.map((p) => p.ovr).sort((a, b) => b - a).slice(0, 11).reduce((s, x, _, a) => s + x / a.length, 0);
  const weak = Object.keys(QUOTA).sort((a, b) => (cnt[a] || 0) / QUOTA[a] - (cnt[b] || 0) / QUOTA[b])[0];
  const cands = G.players.filter((p) => p && !p.u20 && !p.loan && p.club !== cid && p.club >= -1 && Math.abs(p.ovr - avg) <= 5 && (p.club === -1 || p.lst || p.con <= G.year) && (!weak || p.pos === weak || rnd() < 0.3) && willJoin(G, p, cid).ok);
  const p = pick(cands); if (!p) return;
  G.me.cd.agent = G.t;
  const fee = p.club >= 0 ? askPrice(G, p) : 0;
  msg(G, `Empresário ${agentOf(G, p)?.n || 'independente'}`, `🕴️ Empresário oferece ${p.n}`, `"Tenho um jogador ideal para vocês: ${p.n}, ${p.age} anos, ${p.pos}, geral ${p.ovr}${p.club >= 0 ? `, do ${G.clubs[p.club].name}` : ', livre no mercado'}."\n${p.club >= 0 ? `Valor pedido pelo clube: ~${money(fee)}.` : 'Sem custo de transferência.'} Salário esperado: ~${money(wageDemand(G, p, cid))}/sem.${p.con <= G.year && p.club >= 0 ? '\nContrato termina no fim da temporada — oportunidade!' : ''}`, { kind: 'agent', pid: p.id });
}

// ---------------- ganchos ----------------
export function marketWeek(G) {
  processDeals(G);
  if (inWindow(G)) { rumors(G); aiLoans(G); loanOffers(G); agents(G); }
  // decisão sobre opção de compra (usuário pegou emprestado)
  if (G.week === 40) {
    const cid = myCid(G);
    for (const p of G.players) if (p && p.loan && p.club === cid && p.loan.type === 'opcao' && !p.loan.asked) {
      p.loan.asked = true;
      G.inbox.unshift({ id: (G.inbox[0]?.id || 0) + 1, t: G.t, y: G.year, w: G.week, from: G.clubs[p.loan.from].name, title: `🔁 Opção de compra: ${p.n}`, body: `O empréstimo de ${p.n} termina no fim da temporada. Você pode exercer a opção e comprá-lo por ${money(p.loan.fee)}.\nTemporada: ${p.st.j} jogos, ${p.st.g} gols${p.st.j ? `, nota ${(p.st.ns / p.st.j).toFixed(1)}` : ''}.`, read: false, kind: 'dec', opts: [{ l: `Comprar por ${money(p.loan.fee)}`, act: 'buyOpt', pid: p.id }, { l: 'Devolver ao fim do empréstimo', fx: {} }], def: 1, exp: G.t + 5, cid });
    }
  }
}
export function loansSeasonEnd(G) {
  for (const p of G.players) {
    if (!p || !p.loan || p.loan.until > G.year) continue;
    const L = p.loan; const T = G.clubs[p.club];
    let buy = false;
    if (L.type === 'obrig') buy = T && T.money > -1e9;
    else if (L.type === 'opcao') {
      if (isUserClub(G, p.club) || userControls(G, p.club)) buy = !!L.buy;
      else { const nota = p.st.j ? p.st.ns / p.st.j : 0; buy = (nota >= 6.7 || p.st.g >= 8) && T.money > L.fee && !isUserClub(G, L.from); }
    }
    endLoan(G, p, buy);
  }
}
export { tl };
