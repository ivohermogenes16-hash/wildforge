import { agentWageMul, agentBlock, onTransfer, onSellYouth, onRelease, aiBudgetMul } from './universe.js';
import { clamp, ri, rf, rnd, pick, money, shuffle } from '../util.js';
import { playerValue, playerWage } from './econ.js';
import { QUOTA } from './world.js';
import { staffQ, tl } from './life.js';
import { queueDeal, swapValue } from './market2.js';

// ===== calendário e janelas de transferência reais (datas de 2026) =====
// semana 0 = 5 de janeiro; cada semana do jogo ≈ 7,6 dias (a temporada vai até meados de dezembro)
const DAY0 = 4, WK = 7.6; const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const doy = (md) => { const [m, d] = md.split('-').map(Number); let n = d - 1; for (let i = 0; i < m - 1; i++) n += MDAYS[i]; return n; };
export function dateOfWeek(w, off = 0) { let n = Math.min(364, Math.round(DAY0 + w * WK + off)); let m = 0; while (n >= MDAYS[m]) { n -= MDAYS[m]; m++; } return { d: n + 1, m }; }
export const dateStr = (w, long, off) => { const x = dateOfWeek(w, off); return long ? `${x.d} de ${MESL[x.m]}` : `${x.d} ${MES[x.m]}`; };
const wOf = (md) => (doy(md) - DAY0) / WK;
// [abre, fecha] — fontes: CBF, FIFA/ligas, MLS; 'ap' = datas aproximadas (ligas com pouca divulgação)
export const WINDOWS = {
  BR: { w: [['01-05', '03-03'], ['07-20', '09-11']] },
  EN: { w: [['01-01', '02-02'], ['06-15', '09-01']] },
  ES: { w: [['01-02', '02-02'], ['07-01', '09-01']] },
  IT: { w: [['01-02', '02-02'], ['06-29', '09-01']] },
  DE: { w: [['01-01', '02-02'], ['07-01', '08-31']] },
  FR: { w: [['01-01', '02-02'], ['07-01', '09-01']] },
  PT: { w: [['01-02', '02-02'], ['07-01', '09-01']] },
  NL: { w: [['01-02', '02-02'], ['07-01', '09-01']] },
  AR: { w: [['01-05', '01-27'], ['06-22', '07-31']] },
  US: { w: [['01-26', '03-26'], ['07-13', '09-02']] },
  SA: { w: [['01-05', '02-02'], ['07-22', '09-06']] },
  MX: { w: [['01-02', '02-03'], ['06-15', '08-31']], ap: 1 },
  JP: { w: [['01-06', '03-27'], ['07-17', '08-14']], ap: 1 },
  AU: { w: [['01-02', '02-02'], ['07-01', '09-15']], ap: 1 },
  UY: { w: [['01-05', '03-06'], ['07-01', '07-31']], ap: 1 },
  CO: { w: [['01-05', '03-06'], ['06-22', '08-28']], ap: 1 },
  MA: { w: [['01-01', '01-31'], ['07-01', '09-30']], ap: 1 },
  ZA: { w: [['01-01', '02-02'], ['07-01', '09-15']], ap: 1 },
};
export function windowsOf(country) { const W = WINDOWS[country] || WINDOWS.BR; return W.w.map(([a, b]) => ({ a: wOf(a), b: wOf(b), da: a, db: b })); }
export function winOpen(G, country, wk = G.week) { const ext = G.uv?.regs?.window ? 2 : 0; return windowsOf(country).some((x, i) => wk >= Math.floor(x.a) && wk <= Math.floor(x.b) + (i === 1 ? ext : 0)); }
const myCountry = (G) => { const j = G.me.job; return j ? G.clubs[j.cid]?.country || 'BR' : 'BR'; };
export const inWindow = (G, country) => winOpen(G, country || myCountry(G));
export const anyWindow = (G) => Object.keys(WINDOWS).some((k) => winOpen(G, k));
const fmt = (md) => { const [m, d] = md.split('-').map(Number); return `${d} ${MES[m - 1]}`; };
// situação da janela para a interface
export function windowInfo(G, country) {
  country = country || myCountry(G); const ws = windowsOf(country); const ext = G.uv?.regs?.window ? 2 : 0;
  for (let i = 0; i < ws.length; i++) { const x = ws[i]; const end = Math.floor(x.b) + (i === 1 ? ext : 0); if (G.week >= Math.floor(x.a) && G.week <= end) return { open: true, left: end - G.week, until: fmt(x.db), from: fmt(x.da), ap: !!WINDOWS[country]?.ap, all: ws.map((y) => `${fmt(y.da)} – ${fmt(y.db)}`) }; }
  const nx = ws.find((x) => Math.floor(x.a) > G.week) || ws[0]; const wait = nx === ws[0] && Math.floor(nx.a) <= G.week ? 46 - G.week + Math.floor(nx.a) : Math.floor(nx.a) - G.week;
  return { open: false, wait, next: fmt(nx.da), ap: !!WINDOWS[country]?.ap, all: ws.map((y) => `${fmt(y.da)} – ${fmt(y.db)}`) };
}

function msg(G, from, title, body, extra = {}) { G.inbox.unshift({ id: (G.inbox[0]?.id || 0) + 1, t: G.t, y: G.year, w: G.week, from, title, body, read: false, ...extra }); }
function news(G, txt) { G.news.unshift({ t: G.t, y: G.year, w: G.week, txt, cat: 'mercado' }); }

export function isUserClub(G, cid) { return G.me.job && !G.me.job.youth && G.me.job.cid === cid; }
export function userControls(G, cid) { return isUserClub(G, cid) || (G.clubs[cid]?.own.user >= 51 && !G.clubs[cid].coach); }

export function squad(G, cid) { const e = G._idx?.get(cid); if (e) return e.s.filter((p) => p.club === cid); return G.players.filter((p) => p && p.club === cid && !p.u20); }

// Importância do jogador no elenco (0..1)
export function importance(G, p) {
  if (p.club < 0) return 0;
  const sq = squad(G, p.club).sort((a, b) => b.ovr - a.ovr);
  const r = sq.indexOf(p);
  return r < 0 ? 0.3 : r < 3 ? 1 : r < 11 ? 0.7 : r < 16 ? 0.4 : 0.15;
}
export function askPrice(G, p) {
  if (p.club < 0) return 0;
  const v = playerValue(p);
  const yrs = Math.max(0, p.con - G.year);
  return Math.round(v * (1.05 + importance(G, p) * 0.55) * (yrs <= 0 ? 0.35 : yrs === 1 ? 0.8 : 1) * (p.lst ? 0.85 : 1) / 1000) * 1000;
}
export function wageDemand(G, p, cid) {
  const c = G.clubs[cid];
  let w = playerWage(p, c.country);
  const from = G.clubs[p.club];
  if (from && from.rep > c.rep) w *= 1 + (from.rep - c.rep) / 60;
  w = Math.max(w, p.wage * 1.1);
  w *= agentWageMul(G, p, c);
  return Math.round(w / 50) * 50;
}
// Jogador aceita ir para o clube?
export function willJoin(G, p, cid) {
  const c = G.clubs[cid];
  const need = (p.ovr - 40) * 1.3; // jogadores bons exigem clubes de nome
  const from = p.club >= 0 ? G.clubs[p.club] : null;
  if (c.rep + 18 < need) return { ok: false, why: `${p.n} acha o ${c.name} pequeno demais para ele.` };
  if (from && from.rep > c.rep + 30 && p.age < 31) return { ok: false, why: `${p.n} não quer deixar um clube tão maior.` };
  return { ok: true };
}

export function weeklyWages(G, cid) { return G.players.reduce((s, p) => (p && p.club === cid ? s + p.wage : s), 0); }
export function wageBudget(G, c) {
  const L = G.comps[c.league];
  const tv = L ? L.tv * (0.55 + 0.9 * c.rep / 100) : 50000;
  return Math.round(((tv + (c.spon || 0)) * 0.85 + Math.max(0, c.money) * 0.08) / 52 + (c.extraWB || 0));
}

export function doTransfer(G, p, toCid, fee, wage, years) {
  const from = p.club >= 0 ? G.clubs[p.club] : null; const to = G.clubs[toCid];
  if (from) { from.money += fee; from.fin.tin += fee; if (from.lineup) from.lineup = null; }
  if (p.sellOn && from && fee > 0 && p.sellOn.cid !== toCid) { const so = G.clubs[p.sellOn.cid]; const cut = Math.round(fee * p.sellOn.pct / 100); if (so) { so.money += cut; so.fin.tin += cut; from.money -= cut; news(G, `💸 ${so.name} recebe ${money(cut)} (${p.sellOn.pct}% da revenda de ${p.n}).`); } p.sellOn = null; }
  to.money -= fee; to.fin.tout += fee;
  if (from && from.id !== toCid) { onTransfer(G, p, from.id, toCid, fee); if (G.me.job && from.id === G.me.job.cid) onSellYouth(G, p); }
  p.club = toCid; p.wage = wage; p.con = G.year + years; p.lst = false; p.u20 = false; p.u17 = false; p.mor = Math.min(p.mor + 30, 80);
  G.short = G.short.filter((x) => x !== p.id);
  if (to.lineup) to.lineup = null;
  if (fee >= 80e6) tl(G, `💰 ${p.n}: ${from ? from.name : 'livre'} → ${to.name} (${money(fee)})`, 'mercado');
  if (!G.rec) G.rec = {}; if (fee > (G.rec.trans?.fee || 0)) G.rec.trans = { n: p.n, fee, y: G.year, from: from?.name || '—', to: to.name };
  news(G, fee > 0 ? `💰 ${p.n} troca ${from ? from.name : 'sem clube'} pelo ${to.name} por ${money(fee)}.` : `✍️ ${p.n} assina com o ${to.name}${from ? ` (vindo do ${from.name})` : ' (sem clube)'}.`);
  if (G.news[0]) { G.news[0].fee = fee; G.news[0].cl = [from?.id, to.id].filter((x) => x != null); }
}

// Proposta do usuário por um jogador
export function userBid(G, p, fee, swap = null) {
  const me = G.me.job; const club = G.clubs[me.cid];
  if (G.me.freeze && G.me.freeze >= G.t && fee > 0) return { ok: false, why: 'A diretoria congelou as contratações (reunião financeira).' };
  if (fee > club.money) return { ok: false, why: 'O clube não tem dinheiro suficiente.' };
  if (G.uv?.regs?.ffp && club.money < 0 && fee > 0) return { ok: false, why: 'Fair play financeiro: clubes com caixa negativo não podem contratar.' };
  { const ab = agentBlock(G, p, club); if (ab) return { ok: false, why: ab }; }
  if (p.club < 0) return { ok: true, free: true };
  if (p.club === club.id) return { ok: false, why: 'Ele já é seu jogador.' };
  const j = willJoin(G, p, club.id); if (!j.ok) return j;
  if (p.loan) return { ok: false, why: `${p.n} está emprestado e não pode ser negociado agora.` };
  if (p.per === 'Leal' && G.clubs[p.club].rep >= club.rep - 10 && rnd() < 0.5) return { ok: false, why: `${p.n} é leal ao ${G.clubs[p.club].name} e não quer sair.` };
  fee += swap ? swapValue(G, swap, p.club) : 0;
  if (p.prefTo === club.id && p.prefFee && fee >= p.prefFee) return { ok: true };
  const ask = Math.round(askPrice(G, p) * (1.04 - staffQ(G, club, 'dir') * 0.006) / 1000) * 1000;
  if (fee >= ask) return { ok: true };
  if (fee >= ask * 0.88 && rnd() < 0.35) return { ok: true };
  return { ok: false, counter: ask, why: `${G.clubs[p.club].name} recusou. Eles pedem ${money(ask)}.` };
}

export function userSign(G, p, fee, wage, years) {
  const c = G.clubs[G.me.job.cid];
  const dem = wageDemand(G, p, c.id);
  if (wage < dem * 0.95) return { ok: false, why: `${p.n} pede pelo menos ${money(dem)}/semana.` };
  if (weeklyWages(G, c.id) + wage > wageBudget(G, c) * 1.15 && wage > 2000) return { ok: false, why: 'A diretoria não aprova: estoura o teto salarial. Venda ou dispense jogadores antes.' };
  if (squad(G, c.id).length >= 32) return { ok: false, why: 'Elenco cheio (máx. 32). Dispense alguém primeiro.' };
  doTransfer(G, p, c.id, fee, wage, years);
  if (G.me.car) G.me.car.trans++;
  const used = new Set(G.players.filter((x) => x && x.club === c.id && x.num).map((x) => x.num)); let num = [10, 9, 7, 11, 8, 19, 17, 21, 23, 27, 29, 30].find((n) => !used.has(n)) || 33; p.num = p.num && !used.has(p.num) ? p.num : num;
  G.me.lastSign = { pid: p.id, fee, num: p.num };
  return { ok: true };
}

export function renewDemand(G, p) { const c = G.clubs[p.club]; return Math.max(p.wage, Math.round(playerWage(p, c.country) * (p.mor < 50 ? 1.2 : 1.05) / 50) * 50); }
export function renew(G, p, wage, years) {
  const d = renewDemand(G, p);
  if (wage < d * 0.95) return { ok: false, why: `${p.n} quer ${money(d)}/semana.` };
  if (p.age >= 33 && years > 2) return { ok: false, why: 'Com essa idade ele só aceita até 2 anos.' };
  p.wage = wage; p.con = G.year + years; p.mor = clamp(p.mor + 8, 0, 100);
  return { ok: true };
}
export function release(G, p) {
  const c = G.clubs[p.club]; const yrs = Math.max(0, p.con - G.year) + 0.5;
  if (G.me.job && c.id === G.me.job.cid) onRelease(G, p, c);
  const cost = Math.round(p.wage * 52 * yrs * 0.5);
  c.money -= cost; c.fin.other += cost;
  p.club = -1; p.lst = false; p.u20 = false; c.lineup = null;
  news(G, `${c.name} rescinde com ${p.n}.`);
  return cost;
}

// Mercado da IA
export function aiTransferWeek(G, light) {
  const clubs = shuffle(G.clubs.filter((c) => c.league && c.league !== 'AMA' && !userControls(G, c.id)));
  const byClub = new Map();
  for (const p of G.players) { if (!p || p.club < 0 || p.u20) continue; let a = byClub.get(p.club); if (!a) byClub.set(p.club, (a = [])); a.push(p); }
  const free = G.players.filter((p) => p && p.club === -1 && p.age < 35 && !p.u20);
  const nDeals = light ? 3 : 25;
  let done = 0;
  for (const c of clubs) {
    if (done >= nDeals) break;
    if (!winOpen(G, c.country)) continue;
    if (rnd() > (light ? 0.05 : 0.25)) continue;
    const sq = byClub.get(c.id) || [];
    // vende excesso
    if (sq.length > 30) { const worst = sq.sort((a, b) => a.ovr - b.ovr)[0]; worst.club = -1; continue; }
    const cnt = {}; for (const p of sq) cnt[p.pos] = (cnt[p.pos] || 0) + 1;
    const lvl = sq.map((p) => p.ovr).sort((a, b) => b - a).slice(0, 11);
    const avg = lvl.reduce((s, x) => s + x, 0) / (lvl.length || 1);
    let pos = Object.keys(QUOTA).find((k) => (cnt[k] || 0) < QUOTA[k] - 1) || pick(Object.keys(QUOTA));
    const budget = Math.max(0, c.money * (c.budPct ?? 0.45) * aiBudgetMul(G, c));
    // procura alvos
    let best = null, bs = -1;
    const pool = rnd() < 0.3 ? free : G.players;
    for (let k = 0; k < 250; k++) {
      const p = pick(pool); if (!p || p.club === c.id || p.u20 || p.loan || p.pos !== pos || p.club < -1) continue;
      if (p.ovr < avg - 1 || p.ovr > avg + 9) continue;
      if (p.club >= 0) { const fc = G.clubs[p.club]; if (!fc.league || isUserClub(G, p.club)) continue; if (fc.rep > c.rep + 15) continue; }
      const price = p.club >= 0 ? askPrice(G, p) : 0;
      if (price > budget) continue;
      if (!willJoin(G, p, c.id).ok) continue;
      const sc = p.ovr + (p.pot - p.ovr) * 0.3 - price / (budget + 1) * 5;
      if (sc > bs) { bs = sc; best = p; }
    }
    if (best) {
      const fee = best.club >= 0 ? askPrice(G, best) : 0;
      const wage = wageDemand(G, best, c.id);
      queueDeal(G, c, best, fee, wage);
      done++;
      // clube vendedor pode precisar repor depois
    }
  }
}

// Clubes se interessam pelos jogadores do usuário
export function playerInterest(G) {
  const j = G.me.job; if (!j || j.youth || !inWindow(G)) return;
  const sq = squad(G, j.cid);
  for (const p of sq) {
    if (p.loan) continue;
    const chance = p.lst ? 0.3 : p.ovr >= 75 ? 0.025 : 0.008;
    if (rnd() > chance) continue;
    if (G.inbox.some((m) => m.kind === 'bid' && m.pid === p.id && !m.done)) continue;
    const buyers = G.clubs.filter((c) => c.league && c.id !== j.cid && winOpen(G, c.country) && c.money > askPrice(G, p) * 0.7 && willJoin(G, p, c.id).ok && c.rep >= G.clubs[j.cid].rep - 15);
    if (!buyers.length) continue;
    const b = pick(buyers);
    let fee = Math.round(playerValue(p) * rf(p.lst ? 0.75 : 0.9, 1.35) * (0.96 + staffQ(G, G.clubs[j.cid], 'dir') * 0.006) / 1000) * 1000;
    let sw = null;
    if (rnd() < 0.25) { sw = pick(G.players.filter((x) => x && x.club === b.id && !x.u20 && !x.loan && Math.abs(x.ovr - p.ovr) <= 6 && playerValue(x) < playerValue(p) && willJoin(G, x, j.cid).ok)); if (sw) fee = Math.max(0, Math.round((fee - playerValue(sw) * 0.85) / 1000) * 1000); }
    msg(G, b.name, `Proposta por ${p.n}`, `O ${b.name} oferece ${money(fee)}${sw ? ` + ${sw.n} (${sw.pos}, ${sw.ovr}, ${sw.age} anos)` : ''} por ${p.n} (${p.pos}, ${p.ovr}). Valor de mercado: ${money(playerValue(p))}.\nA proposta vale por 2 semanas.`, { kind: 'bid', pid: p.id, from: b.id, fee, swap: sw ? sw.id : null, exp: G.t + 2 });
    G.news.unshift({ t: G.t, y: G.year, w: G.week, txt: `📰 ${b.name} faz proposta oficial por ${p.n}.`, cat: 'rumor' });
  }
}
// ===== negociação de venda (contraproposta) =====
export function negInit(G, m) {
  if (m.neg) return m.neg;
  const p = G.players[m.pid]; const b = G.clubs[m.from]; const v = playerValue(p);
  const want = p.ovr >= 80 ? rf(1.15, 1.55) : rf(1.05, 1.4); // quanto o comprador está disposto a esticar
  const max = Math.max(m.fee, Math.min(m.fee * want, Math.max(m.fee, b.money * 0.85), v * 2.2));
  m.neg = { max: Math.round(max / 1000) * 1000, pat: ri(2, 4), log: [], start: m.fee, sell: 0 };
  return m.neg;
}
export function negCounter(G, m, ask, sell = 0) {
  const n = negInit(G, m); const b = G.clubs[m.from]; const p = G.players[m.pid];
  ask = Math.round(ask / 1000) * 1000; const k = 1 + sell * 0.012; const eff = ask * k;
  n.log.push({ me: 1, ask, sell });
  if (eff <= n.max) { m.fee = ask; n.sell = sell; n.log.push({ me: 0, r: 'ok', fee: ask, sell }); n.deal = true; return { r: 'ok', fee: ask }; }
  n.pat--;
  if (n.pat < 0 || eff > n.max * 1.6) {
    if (n.pat < 0 || rnd() < 0.5) { n.walk = true; m.done = true; m.expired = true; n.log.push({ me: 0, r: 'walk' }); return { r: 'walk' }; }
  }
  if (eff <= n.max * 1.25) {
    const top = n.max / k; const nf = Math.round(Math.min(top, m.fee + (top - m.fee) * rf(0.45, 0.85)) / 1000) * 1000;
    if (nf > m.fee) { m.fee = nf; n.sell = sell; n.log.push({ me: 0, r: 'counter', fee: nf, sell }); return { r: 'counter', fee: nf }; }
  }
  const bump = Math.round(Math.min(n.max / k, m.fee * rf(1.02, 1.06)) / 1000) * 1000;
  if (bump > m.fee) { m.fee = bump; n.sell = sell; }
  n.log.push({ me: 0, r: 'no', fee: m.fee, sell: n.sell }); return { r: 'no', fee: m.fee };
}
export function acceptBid(G, m) {
  const p = G.players[m.pid]; const b = G.clubs[m.from];
  if (!p || p.club !== G.me.job?.cid) { m.done = true; return 'Jogador não está mais no clube.'; }
  if (b.money < m.fee) { m.done = true; return 'O clube comprador desistiu (sem dinheiro).'; }
  doTransfer(G, p, b.id, m.fee, wageDemand(G, p, b.id), ri(2, 5));
  if (m.swap != null) { const s = G.players[m.swap]; if (s && s.club === b.id) doTransfer(G, s, G.me.job.cid, 0, Math.max(s.wage, wageDemand(G, s, G.me.job.cid)), ri(2, 4)); }
  if (m.neg?.sell) p.sellOn = { cid: G.me.job.cid, pct: m.neg.sell };
  if (G.me.car) G.me.car.trans++;
  m.done = true; return `${p.n} vendido por ${money(m.fee)}${m.neg?.sell ? ` + ${m.neg.sell}% de uma venda futura` : ''}.`;
}

// Contratos que vencem
export function expireContracts(G) {
  for (const p of G.players) {
    if (!p || p.club < 0 || p.u20 || p.loan || p.con > G.year) continue;
    const c = G.clubs[p.club];
    if (isUserClub(G, p.club) || (c.own.user >= 51 && !c.coach)) {
      news(G, `📄 Contrato de ${p.n} terminou e ele deixou o ${c.name}.`);
      p.club = -1; continue;
    }
    // IA renova se jogador é útil
    const keep = p.age < 33 && rnd() < 0.75;
    if (keep) { p.con = G.year + ri(1, 3); p.wage = playerWage(p, c.country); } else p.club = -1;
  }
}

export function scoutSearch(G, f) {
  const out = [];
  for (const p of G.players) {
    if (!p || p.club < -1 || p.u20) continue;
    if (f.pos && p.pos !== f.pos) continue;
    if (f.min && p.ovr < f.min) continue;
    if (f.max && p.ovr > f.max) continue;
    if (f.age && p.age > f.age) continue;
    if (f.free && p.club !== -1) continue;
    if (f.listed && !p.lst) continue;
    if (f.league && (p.club < 0 || G.clubs[p.club].league !== f.league)) continue;
    if (f.q && !p.n.toLowerCase().includes(f.q.toLowerCase())) continue;
    if (G.me.job && p.club === G.me.job.cid) continue;
    if (f.maxv && playerValue(p) > f.maxv) continue;
    out.push(p);
  }
  out.sort((a, b) => b.ovr - a.ovr || a.age - b.age);
  return out.slice(0, 80);
}
