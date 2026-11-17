// Categorias de base: olheiros, peneiras e compra de jogadores das bases de outros clubes
import { clamp, ri, rf, rnd, pick, money, hash, seeded } from '../util.js';
import { makePlayer, genName, buildU20 } from './world.js';
import { playerValue } from './econ.js';
import { importance } from './market.js';

export const REGIONS = [
  { id: 'SE', name: 'Sudeste (SP, RJ, MG, ES)', nat: ['BR'], cost: 4000, tal: 1.0 },
  { id: 'NE', name: 'Nordeste', nat: ['BR'], cost: 2500, tal: 0.97 },
  { id: 'SUL', name: 'Sul', nat: ['BR'], cost: 3000, tal: 0.99 },
  { id: 'NO', name: 'Norte e Centro-Oeste', nat: ['BR'], cost: 2000, tal: 0.94 },
  { id: 'AR', name: 'Argentina e Uruguai', nat: ['AR'], cost: 7000, tal: 1.04 },
  { id: 'EU', name: 'Espanha e Itália', nat: ['ES', 'IT'], cost: 14000, tal: 1.07 },
  { id: 'EN', name: 'Inglaterra', nat: ['EN'], cost: 15000, tal: 1.05 },
];
const POSL = ['GOL', 'LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'MC', 'MC', 'MEI', 'PE', 'PD', 'ATA', 'ATA'];

function msg(G, from, title, body, extra = {}) { G.inbox.unshift({ id: (G.inbox[0]?.id || 0) + 1, t: G.t, y: G.year, w: G.week, from, title, body, read: false, ...extra }); }

export function ensureBase(G, cid) {
  const c = G.clubs[cid];
  if (!G.players.some((p) => p && p.club === cid && p.u20)) buildU20(G, c);
  if (c.yb == null) c.yb = baseBudget(c);
}
export const baseBudget = (c) => Math.round(Math.max(120000, c.rep * c.rep * 260) / 10000) * 10000;

export function startScout(G, region, weeks) {
  const R = REGIONS.find((r) => r.id === region);
  G.me.scout = { region, left: weeks, found: 0 };
  return `Olheiro enviado para ${R.name} por ${weeks} semanas.`;
}

export function scoutWeek(G) {
  const sc = G.me.scout; const j = G.me.job;
  // relatórios antigos expiram
  for (const p of G.players) if (p && p.club === -3 && G.t - p.rept > 8) { p.club = -2; p.ret = true; }
  if (!sc || !j) return;
  const c = G.clubs[j.cid]; const R = REGIONS.find((r) => r.id === sc.region);
  if (c.yb == null) c.yb = baseBudget(c);
  if (c.yb < R.cost) { msg(G, 'Olheiro', 'Olheiro voltou', 'O orçamento da base acabou e o olheiro voltou para casa.'); G.me.scout = null; return; }
  c.yb -= R.cost;
  const n = rnd() < 0.55 ? 1 : rnd() < 0.5 ? 2 : 0;
  for (let k = 0; k < n; k++) {
    const nat = pick(R.nat); const age = ri(15, 17);
    const gem = rnd() < 0.06 * R.tal;
    const pot = clamp(Math.round(52 + Math.pow(rnd(), 1.6) * 30 * R.tal + (gem ? ri(8, 14) : 0)), 50, 94);
    const ovr = clamp(Math.round(36 + (pot - 50) * 0.32 + (age - 15) * 3 + rf(-4, 4)), 30, 62);
    const p = makePlayer(G, { n: genName(nat), pos: pick(POSL), age, ovr, nat, club: -3, wage: 300 });
    p.pot = pot; p.rept = G.t; p.scoutBy = j.cid; p.est = clamp(pot + ri(-6, 6), ovr, 95);
    sc.found++;
  }
  sc.left--;
  if (sc.left <= 0) { msg(G, 'Olheiro', `Relatório final: ${R.name}`, `O olheiro terminou a viagem e indicou ${sc.found} jovem(ns). Veja em Base › Olheiros.`); G.me.scout = null; }
}

export function prospects(G) { const j = G.me.job; return G.players.filter((p) => p && p.club === -3 && j && p.scoutBy === j.cid).sort((a, b) => b.est - a.est); }
export const prospectFee = (p) => Math.round((8000 + 4000 * Math.exp((p.pot - 55) / 7.5)) / 1000) * 1000;

export function signProspect(G, p) {
  const c = G.clubs[G.me.job.cid]; const fee = prospectFee(p);
  if (c.yb < fee) return { ok: false, why: `Orçamento da base insuficiente (${money(c.yb)}).` };
  if (G.players.filter((x) => x && x.club === c.id && x.u20).length >= 34) return { ok: false, why: 'Base lotada (máx. 34). Dispense alguém.' };
  c.yb -= fee; p.club = c.id; p.u20 = true; p.con = G.year + 3; p.wage = 300 + ri(0, 6) * 100; p.lst = false;
  return { ok: true, why: `✍️ ${p.n} assinou com a base por ${money(fee)}!` };
}

// Mercado da base: jovens de outros clubes
export function youthMarket(G, f = {}) {
  const j = G.me.job; if (!j) return [];
  const out = [];
  for (const p of G.players) {
    if (!p || p.club < 0 || p.club === j.cid) continue;
    if (!(p.u20 || (p.age <= 19 && p.ovr < 74))) continue;
    if (f.pos && p.pos !== f.pos) continue;
    if (f.country && G.clubs[p.club].country !== f.country) continue;
    out.push(p);
  }
  out.sort((a, b) => b.pot - a.pot + (b.ovr - a.ovr) * 0.2);
  return out.slice(0, 60);
}
export function youthPrice(G, p) {
  let v = playerValue(p) * (p.u20 ? 0.7 : 1);
  if (!p.u20) v *= 1 + importance(G, p) * 0.5;
  v += prospectFee(p) * 0.6;
  return Math.round(v / 1000) * 1000;
}
export function buyYouth(G, p, fee) {
  const c = G.clubs[G.me.job.cid];
  const pool = c.yb + (G.me.job.youth ? 0 : Math.max(0, c.money * 0.1));
  if (fee > pool) return { ok: false, why: `Sem verba. Orçamento da base: ${money(c.yb)}.` };
  const price = youthPrice(G, p);
  if (fee < price * (rnd() < 0.3 ? 0.9 : 1)) return { ok: false, why: `${G.clubs[p.club].name} recusou. Pedem ${money(price)}.` };
  const from = G.clubs[p.club];
  from.money += fee; from.fin.tin += fee; from.lineup = null;
  const useYb = Math.min(fee, c.yb); c.yb -= useYb; c.money -= fee - useYb; c.fin.tout += fee;
  p.club = c.id; p.u20 = p.age <= 20; p.con = G.year + 3; p.lst = false; p.wage = Math.max(p.wage, 400); p.mor = 80;
  G.news.unshift({ t: G.t, y: G.year, w: G.week, txt: `🌱 ${c.name} contrata o jovem ${p.n} (${p.age}) da base do ${from.name} por ${money(fee)}.` });
  return { ok: true, why: `✍️ ${p.n} é da sua base!` };
}
export function releaseYouth(G, p) { const c = G.clubs[p.club]; p.club = -1; p.u20 = false; if (c.lineup) c.lineup = null; }
export function fundBase(G, amount) { const c = G.clubs[G.me.job.cid]; if (amount > c.money) return 'Caixa insuficiente.'; c.money -= amount; c.yb += amount; c.fin.other += amount; return `${money(amount)} transferidos para a base.`; }

// Atributos derivados (para o perfil do jogador)
const OFF = {
  GOL: null,
  LD: [6, -14, 0, -2, 4, 2], LE: [6, -14, 0, -2, 4, 2], ZAG: [-4, -18, -6, -12, 8, 6], VOL: [-4, -10, 3, -6, 6, 5],
  MC: [-2, -4, 6, 0, 0, 0], MEI: [0, 2, 8, 6, -14, -6], PE: [8, 0, 0, 8, -18, -4], PD: [8, 0, 0, 8, -18, -4], ATA: [4, 9, -4, 2, -22, 3],
};
export function attrs(p) {
  const R = seeded(hash(p.key || p.n) + 7);
  const v = (o) => clamp(Math.round(p.ovr + o + (R() - 0.5) * 12), 15, 99);
  if (p.pos === 'GOL') return [['Reflexos', v(3)], ['Posicionamento', v(1)], ['Mãos', v(0)], ['Saída do gol', v(-4)], ['Reposição', v(-6)], ['Físico', v(-3)]];
  const o = OFF[p.pos];
  return [['Ritmo', v(o[0])], ['Finalização', v(o[1])], ['Passe', v(o[2])], ['Drible', v(o[3])], ['Defesa', v(o[4])], ['Físico', v(o[5])]];
}
