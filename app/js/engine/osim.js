// Simulação "previsível" usada no online (Desafio da Semana e Liga com amigos).
// Mesmo elenco + mesma escalação + mesma tática + mesma semente = mesmo resultado em qualquer celular.
import { SQUADS } from '../data/squads.js';
import { LEAGUES, CLUBS, COUNTRIES } from '../data/leagues.js';
import { FORMATIONS, instrFx, lambdas } from './match.js';
import { genName } from './world.js';
import { withSeed, hash, poisson, posFit, weighted, rnd, clamp, avg, ri } from '../util.js';

export const OFORMS = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2', '4-1-4-1', '3-4-3', '4-5-1'];
export const OMENT = ['Defensiva', 'Equilibrada', 'Ofensiva'];
export const OPRESS = ['Baixa', 'Média', 'Alta'];

let ALL = null;
export function allClubs() {
  if (ALL) return ALL; ALL = [];
  for (const L of LEAGUES) for (const r of CLUBS[L.id] || []) ALL.push({ key: r[0], name: r[0], short: r[1], city: r[2], c1: r[3], c2: r[4], rep: r[5], league: L.id, lname: L.short || L.name, tier: L.tier, country: L.country, flag: COUNTRIES[L.country]?.flag || '' });
  return ALL;
}
export const clubByKey = (k) => allClubs().find((c) => c.key === k);

const SQC = new Map();
// elenco do clube (jogadores reais + completa com gerados sempre iguais)
export function squadOf(key) {
  if (SQC.has(key)) return SQC.get(key).map((p) => ({ ...p }));
  const c = clubByKey(key) || { key, rep: 50, country: 'BR' }; const out = [];
  for (const s of String(SQUADS[key] || '').split(';')) { const [n, pos, age, ovr] = s.split(':'); if (n && FORMATIONS['4-3-3'].some((f) => f[0] === pos) && +ovr) out.push({ k: key + '#' + n, n, pos, age: +age, ovr: +ovr }); }
  const need = ['GOL', 'GOL', 'LD', 'LE', 'ZAG', 'ZAG', 'ZAG', 'VOL', 'MC', 'MC', 'MEI', 'PE', 'PD', 'ATA', 'ATA', 'MC', 'ZAG', 'ATA'];
  withSeed(hash('sq:' + key), () => {
    const base = clamp(Math.round(44 + (c.rep || 50) * 0.36), 48, 80);
    const have = {}; for (const p of out) have[p.pos] = (have[p.pos] || 0) + 1;
    for (const pos of need) { if (out.length >= 22) break; if ((have[pos] || 0) > 0) { have[pos]--; continue; } out.push({ k: key + '#g' + out.length, n: genName(c.country || 'BR'), pos, age: ri(19, 32), ovr: clamp(base + ri(-5, 4), 40, 86), gen: 1 }); }
    while (out.length < 18) out.push({ k: key + '#g' + out.length, n: genName(c.country || 'BR'), pos: ['MC', 'ZAG', 'ATA', 'LD'][out.length % 4], age: ri(19, 32), ovr: clamp(base + ri(-6, 2), 40, 86), gen: 1 });
  });
  SQC.set(key, out); return out.map((p) => ({ ...p }));
}
export const sqOvr = (sq) => Math.round(avg([...sq].sort((a, b) => b.ovr - a.ovr).slice(0, 14), (p) => p.ovr));
export const pValue = (p) => Math.round(Math.max(0.15, Math.pow(1.15, p.ovr - 60) * (p.age <= 23 ? 1.5 : p.age >= 31 ? 0.6 : 1)) * 1e6 / 1e5) * 1e5;

// melhor escalação para a formação
export function bestXI(sq, form = '4-3-3') {
  const F = FORMATIONS[form] || FORMATIONS['4-3-3']; const used = new Set(); const xi = new Array(11).fill(null);
  const order = F.map((f, i) => i).sort((a, b) => (F[a][0] === 'GOL' ? -1 : 0) - (F[b][0] === 'GOL' ? -1 : 0));
  for (const i of order) { let best = null, bv = -1; for (const p of sq) { if (used.has(p.k)) continue; const v = p.ovr * posFit(p.pos, F[i][0]); if (v > bv || (v === bv && p.k < best.k)) { bv = v; best = p; } } if (best) { used.add(best.k); xi[i] = best.k; } }
  return xi;
}
export function fixXI(sq, xi, form) { const ks = new Set(sq.map((p) => p.k)); if (!Array.isArray(xi) || xi.length !== 11 || xi.some((k) => !ks.has(k)) || new Set(xi).size !== 11) return bestXI(sq, form); return xi; }

export function rate(sq, xi, t = {}) {
  const F = FORMATIONS[t.form] || FORMATIONS['4-3-3']; const by = new Map(sq.map((p) => [p.k, p]));
  const L = { G: [], D: [], M: [], A: [] };
  xi.forEach((k, i) => { const p = by.get(k); if (!p || !F[i]) return; const s = F[i][0]; const e = p.ovr * posFit(p.pos, s); L[s === 'GOL' ? 'G' : ['LD', 'LE', 'ZAG'].includes(s) ? 'D' : ['VOL', 'MC', 'MEI'].includes(s) ? 'M' : 'A'].push(e); });
  const g = avg(L.G) || 30, d = avg(L.D) || 30, m = avg(L.M) || 30, a = avg(L.A) || avg(L.M) || 30;
  let att = 0.5 * a + 0.35 * m + 0.15 * d, def = 0.5 * d + 0.3 * m + 0.2 * g, ctl = m * 0.8 + 0.2 * (a + d) / 2;
  const ix = instrFx(t); att += ix.att; def += ix.def; ctl += ix.ctl;
  const ment = (t.ment ?? 1) - 1; att += ment * 2.5; def -= ment * 2.5; ctl += ((t.press ?? 1) - 1) * 1.5;
  return { att, def, ctl, gk: g };
}
// pedra-papel-tesoura leve entre as táticas: pressão alta castiga time que sai jogando curto, retranca segura time ofensivo...
function edge(a, b) {
  let e = 0; const ma = a.ment ?? 1, mb = b.ment ?? 1, pa = a.press ?? 1, pb = b.press ?? 1;
  if (pa === 2 && (b.passe ?? 1) === 0) e += 1.2; if (ma === 0 && mb === 2) e += 0.8; if (ma === 2 && mb === 0 && pa < 2) e -= 0.6;
  if ((a.contra ?? 0) === 1 && (b.linha ?? 1) === 2) e += 1.1; if ((a.linha ?? 1) === 2 && (b.contra ?? 0) === 1) e -= 0.5;
  return e;
}
const GW = { ATA: 2.8, PE: 2.3, PD: 2.3, MEI: 1.9, MC: 1.1, VOL: 0.5, LD: 0.45, LE: 0.45, ZAG: 0.55, GOL: 0.005 };
const AW = { ATA: 1.8, PE: 2.8, PD: 2.8, MEI: 3.4, MC: 2, VOL: 0.9, LD: 1.5, LE: 1.5, ZAG: 0.4, GOL: 0.05 };

// A e B: { sq, xi, t } (t = tática). home: A joga em casa.
export function playO(seed, A, B, home = true) {
  return withSeed(seed >>> 0, () => {
    const ra = rate(A.sq, A.xi, A.t), rb = rate(B.sq, B.xi, B.t); const ea = edge(A.t || {}, B.t || {}), eb = edge(B.t || {}, A.t || {});
    ra.att += ea; ra.ctl += ea * 0.5; rb.att += eb; rb.ctl += eb * 0.5;
    const [lh, la] = lambdas(ra, rb, !home);
    const gh = Math.min(7, poisson(lh)), ga = Math.min(7, poisson(la));
    const ev = []; const F = (t) => FORMATIONS[t?.form] || FORMATIONS['4-3-3'];
    const scorer = (S, n) => { const by = new Map(S.sq.map((p) => [p.k, p])); const f = F(S.t); const cand = S.xi.map((k, i) => ({ p: by.get(k), s: f[i]?.[0] })).filter((x) => x.p); for (let i = 0; i < n; i++) { const g = weighted(cand, (x) => (GW[x.s] || 1) * (x.p.ovr / 70) ** 3); const rest = cand.filter((x) => x !== g); const a = rnd() < 0.72 ? weighted(rest, (x) => (AW[x.s] || 1) * (x.p.ovr / 70) ** 2) : null; ev.push({ m: ri(2, 93), s: S === A ? 0 : 1, n: g.p.n, a: a?.p.n || '' }); } };
    scorer(A, gh); scorer(B, ga); ev.sort((x, y) => x.m - y.m);
    const pos = clamp(Math.round(50 + (ra.ctl - rb.ctl) * 1.6 + (rnd() * 6 - 3)), 28, 72);
    const sh = [Math.max(gh, Math.round(lh * 6 + rnd() * 4)), Math.max(ga, Math.round(la * 6 + rnd() * 4))];
    const best = (S) => [...S.sq].filter((p) => S.xi.includes(p.k)).sort((a, b) => b.ovr - a.ovr)[0]?.n || '';
    return { gh, ga, ev, pos, sh, mvp: gh >= ga ? best(A) : best(B) };
  });
}
// ordem das rodadas (todos contra todos, ida e volta)
export function roundRobin(ids) {
  const t = [...ids]; if (t.length % 2) t.push(null); const n = t.length, R = [];
  for (let r = 0; r < n - 1; r++) { const m = []; for (let i = 0; i < n / 2; i++) { const a = t[i], b = t[n - 1 - i]; if (a != null && b != null) m.push(r % 2 ? [b, a] : [a, b]); } R.push(m); t.splice(1, 0, t.pop()); }
  return R.concat(R.map((m) => m.map(([a, b]) => [b, a])));
}
