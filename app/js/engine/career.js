import { clamp, gauss, ri, rf, pick, money } from '../util.js';
import { VARZEA } from '../data/names.js';
import { clubValuation, coachWage } from './econ.js';
import { makeClub, makePlayer, genName, newFin } from './world.js';
import { QUOTA } from './world.js';

export const FOUND_COST = 1500000;
export const APT_PRICE = 650000;

function msg(G, from, title, body, extra = {}) { G.inbox.unshift({ id: (G.inbox[0]?.id || 0) + 1, t: G.t, y: G.year, w: G.week, from, title, body, read: false, ...extra }); }
function news(G, txt) { G.news.unshift({ t: G.t, y: G.year, w: G.week, txt }); }

export function weeklyPersonal(G) {
  const me = G.me, inv = me.inv;
  if (me.job) me.money += Math.round(me.job.wage * 0.75);
  me.money -= 350; // custo de vida
  inv.cdi = Math.round(inv.cdi * 1.0024);
  const r = 0.0022 + gauss() * 0.035;
  inv.acoes = Math.round(inv.acoes * (1 + r));
  inv.lastAcoes = r;
  if (inv.imoveis > 0) { inv.imovelVal = Math.round(inv.imovelVal * 1.0011); me.money += Math.round(inv.imoveis * inv.imovelVal * 0.0009); }
  if (!inv.imovelVal) inv.imovelVal = APT_PRICE;
  inv.hist = (inv.hist || []).concat([Math.round(netWorth(G))]).slice(-40);
}

export function netWorth(G) {
  const me = G.me, inv = me.inv;
  let v = me.money + inv.cdi + inv.acoes + inv.imoveis * (inv.imovelVal || APT_PRICE);
  for (const c of G.clubs) if (c.own.user > 0) v += clubValuation(G, c) * c.own.user / 100;
  return v;
}

export function invest(G, kind, amount) {
  const me = G.me, inv = me.inv;
  if (kind === 'imovel') {
    const n = amount; const cost = n * inv.imovelVal;
    if (n > 0) { if (me.money < cost) return 'Dinheiro insuficiente.'; me.money -= cost; inv.imoveis += n; return `Você comprou ${n} imóvel(is).`; }
    if (inv.imoveis + n < 0) return 'Você não tem imóveis suficientes.';
    me.money += -n * inv.imovelVal * 0.96; inv.imoveis += n; return 'Imóvel vendido.';
  }
  if (amount > 0 && me.money < amount) return 'Dinheiro insuficiente.';
  if (amount < 0 && inv[kind] < -amount) return 'Saldo insuficiente na aplicação.';
  me.money -= amount; inv[kind] += amount;
  return amount > 0 ? 'Aplicação feita.' : 'Resgate feito.';
}

// ---------- Clube próprio ----------
export function foundClub(G, o) {
  const me = G.me;
  if (me.own != null) return { ok: false, why: 'Você já tem um clube.' };
  if (me.money < FOUND_COST + o.aporte) return { ok: false, why: `Você precisa de ${money(FOUND_COST + o.aporte)}.` };
  me.money -= FOUND_COST + o.aporte;
  // garante a liga de várzea
  if (!G.clubs.some((c) => c.league === 'AMA')) {
    for (const n of VARZEA.slice(0, 9)) {
      const c = makeClub(G, [n, n.split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase(), o.city || 'São Paulo', pick(['#d0021b', '#1846a8', '#0b7a3b', '#111111', '#f5d400', '#7a1a33']), '#ffffff', ri(4, 10), 'Campo do bairro', 1], 'AMA', 'BR');
      c.money = 20000; c.spon = 15000; amateurSquad(G, c, 38);
    }
  }
  const c = makeClub(G, [o.name, o.short.toUpperCase().slice(0, 3), o.city || '', o.c1, o.c2, 8, o.stad || `Arena ${o.name}`, 2], 'AMA', 'BR');
  c.own = { assoc: 0, user: 100, fund: 0 }; c.founded = G.year; c.userOwnedVarzea = true; c.key = 'own:' + c.id;
  c.money = o.aporte; c.spon = 30000;
  amateurSquad(G, c, 41);
  me.own = c.id;
  news(G, `🆕 ${me.name} funda o ${c.name}! O clube estreia na Liga Amadora (várzea) em ${G.year + 1}.`);
  return { ok: true, club: c };
}

function amateurSquad(G, c, lvl) {
  for (const [pos, q] of Object.entries(QUOTA)) for (let i = 0; i < Math.max(1, q - 1); i++) makePlayer(G, { n: genName('BR'), pos, age: ri(18, 33), ovr: lvl + gauss() * 3, club: c.id, nat: 'BR', wage: 150 + ri(0, 4) * 50 });
}

export function hireCoachFor(G, cid) {
  const c = G.clubs[cid]; c.coach = { n: genName('BR'), rep: clamp(c.rep + ri(-5, 8), 3, 90) };
  return c.coach;
}

export function inject(G, cid, amount) {
  const me = G.me; const c = G.clubs[cid];
  if (amount > me.money) return 'Dinheiro insuficiente.';
  me.money -= amount; c.money += amount; c.fin.other -= amount;
  return `Aporte de ${money(amount)} feito no ${c.name}.`;
}

// ---------- SAF ----------
export function safQuote(G, cid, pct, fund) {
  const c = G.clubs[cid];
  const val = clubValuation(G, c);
  const fundPct = fund ? Math.min(30, 90 - pct) : 0;
  return { val, cost: Math.round(val * pct / 100), fundPct, fundCost: Math.round(val * fundPct / 100), control: pct >= 51 || (fund && pct > fundPct && pct + fundPct >= 51) };
}

export function buySAF(G, cid, pct, fund) {
  const c = G.clubs[cid]; const me = G.me;
  const free = c.own.assoc;
  if (pct + (fund ? Math.min(30, 90 - pct) : 0) > free) return { ok: false, why: `Só ${free}% das ações estão disponíveis.` };
  const q = safQuote(G, cid, pct, fund);
  if (me.money < q.cost) return { ok: false, why: `Você precisa de ${money(q.cost)} (tem ${money(me.money)}).` };
  me.money -= q.cost;
  c.own.user += pct; c.own.fund += q.fundPct; c.own.assoc -= pct + q.fundPct;
  const toClub = Math.round((q.cost + q.fundCost) * 0.5);
  c.money += toClub;
  c.saf = true;
  if (q.control) c.ctrl = true;
  if (q.control && !c.coach) hireCoachFor(G, cid);
  news(G, `🏦 ${me.name} compra ${pct}% da SAF do ${c.name}${fund ? ` junto com um fundo (${q.fundPct}%)` : ''} por ${money(q.cost)}. ${money(toClub)} entram no caixa do clube.`);
  return { ok: true, q };
}

export function sellStake(G, cid, pct) {
  const c = G.clubs[cid]; const me = G.me;
  pct = Math.min(pct, c.own.user);
  const price = Math.round(clubValuation(G, c) * pct / 100 * 0.95);
  me.money += price; c.own.user -= pct; c.own.fund += pct;
  if (c.own.user < 51) c.ctrl = c.own.user > c.own.fund && c.own.user + c.own.fund >= 51 ? c.ctrl : false;
  if (me.own === cid && c.own.user === 0) me.own = null;
  news(G, `${me.name} vende ${pct}% do ${c.name} por ${money(price)}.`);
  return price;
}

export function controls(G, c) { return c.own.user >= 51 || !!c.ctrl; }

export function ownClubWeek(G) {
  // garante técnico da IA em clubes do usuário que ele não treina
  for (const c of G.clubs) {
    if (c.own.user > 0 && controls(G, c) && !c.coach && !(G.me.job && G.me.job.cid === c.id && !G.me.job.youth)) hireCoachFor(G, c.id);
  }
}

export function ownSeasonEnd(G, moves) {
  const me = G.me;
  // dividendos
  for (const c of G.clubs) {
    if (c.own.user <= 0) continue;
    const f = c.fin; const inc = f.tv + f.tick + f.spon + f.prize + f.tin; const out = f.wages + f.tout + Math.max(0, f.other);
    const profit = inc - out;
    if (profit > 0) { const d = Math.round(profit * 0.25 * c.own.user / 100); me.money += d; c.money -= d; msg(G, c.name, `Dividendos: ${c.name}`, `O clube teve lucro de ${money(profit)} na temporada. Sua parte (${c.own.user}%): ${money(d)}.`); }
  }
  // várzea → Série D
  const ama = G.comps.AMA;
  if (ama && ama.champion != null) {
    const ch = G.clubs[ama.champion];
    if (ch.userOwnedVarzea) {
      const d = G.clubs.filter((c) => c.league === 'BRD' && !moves.some((m) => m[0] === c.id)).sort((a, b) => a.rep - b.rep)[0];
      if (d) { d.league = null; }
      ch.league = 'BRD'; ch.userOwnedVarzea = false; ch.rep = Math.max(ch.rep, 15); ch.spon = Math.max(ch.spon, 250000);
      msg(G, 'CBF', `⬆️ ${ch.name} na Série D!`, `Campeão da várzea, o ${ch.name} ganhou vaga na Série D do Brasileirão ${G.year + 1}. É o futebol profissional!`);
      news(G, `⬆️ ${ch.name}, clube de ${me.name}, vai disputar a Série D!`);
    }
  }
  for (const c of G.clubs) if (c.pendingNow) c.pendingNow = false;
}

export { coachWage, newFin, rf };
