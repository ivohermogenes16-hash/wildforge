import { clamp } from '../util.js';

export const WAGE_SCALE = { BR: 1, EN: 1.6, ES: 1.3, IT: 1.2, AR: 0.45, XX: 0.5 };
export const TICKET = { BR: 45, EN: 260, ES: 190, IT: 170, AR: 14, XX: 10 };
export const SEASON_WEEKS = 46;
import { ECON2 } from '../data/leagues2.js';
Object.assign(WAGE_SCALE, Object.fromEntries(Object.entries(ECON2.WAGE).map(([k, v]) => [k, Math.round(v * 0.9 * 100) / 100]))); Object.assign(TICKET, ECON2.TICKET);
export const BRAND = { BR: 1, AR: 0.5, EN: 2.5, ES: 2.5, IT: 2.5, ...ECON2.BRAND };

// valores e salários em reais, calibrados com o mercado real (estilo Transfermarkt / folhas reais)
export function playerValue(p) {
  const o = p.ovr; let v = 10000 * Math.exp((Math.min(o, 86) - 40) / 4.2) * (o > 86 ? Math.exp((o - 86) / 7) : 1);
  const gap = Math.max(0, p.pot - p.ovr);
  if (p.age <= 21) v *= 1 + gap / 11;
  else if (p.age <= 25) v *= 1 + gap / 18;
  else if (p.age >= 30) v *= Math.max(0.1, 1 - (p.age - 29) * 0.14);
  if (p.inj > 4) v *= 0.85;
  return Math.round(v / 1000) * 1000;
}

export function playerWage(p, country) {
  const v = playerValue({ ...p, age: Math.min(p.age, 29) }); const w = (0.0026 * Math.min(v, 1.2e8) + 0.0011 * Math.max(0, v - 1.2e8)) * (WAGE_SCALE[country] ?? 0.5);
  return Math.max(country === 'XX' ? 150 : 400, Math.round(w / 50) * 50);
}

export function coachWage(rep, country, youth) {
  const w = (1000 + Math.pow(rep, 3) * 0.27) * (WAGE_SCALE[country] ?? 0.6) * 1.2;
  return Math.round((youth ? (1200 + rep * 55) * (WAGE_SCALE[country] ?? 0.6) : w) / 100) * 100;
}

// valor do clube: múltiplo das receitas (como nas vendas reais de SAF e clubes europeus) + elenco + caixa
export function clubValuation(G, c) {
  const sq = G.players.filter((p) => p && p.club === c.id && !p.u20);
  let squad = 0; for (const p of sq) squad += playerValue(p);
  const inc = seasonIncome(G, c).total;
  const mult = (2 + (c.rep || 0) / 40) * Math.sqrt(BRAND[c.country] ?? 1);
  return Math.max(500000, Math.round((inc * mult + squad * 0.5 + c.money * 0.8) / 10000) * 10000);
}
// premiações reais por fase (em reais)
export const PRIZES = {
  CDB: { r32: 2.1e6, r16: 3.6e6, r8: 4.5e6, r4: 9e6, runner: 32e6, champ: 77e6 },
  LIB: { part: 15e6, r16: 6.5e6, r8: 9e6, r4: 12e6, runner: 47e6, champ: 125e6 },
  SUD: { part: 5.5e6, r16: 2e6, r8: 3e6, r4: 4.5e6, runner: 15e6, champ: 35e6 },
  UCL: { part: 110e6, r16: 66e6, r8: 75e6, r4: 90e6, runner: 110e6, champ: 150e6 },
  UEL: { part: 25e6, r16: 10e6, r8: 14e6, r4: 20e6, runner: 40e6, champ: 55e6 },
  FAC: { r32: 0.9e6, r16: 1.5e6, r8: 3e6, r4: 6e6, runner: 7e6, champ: 15e6 },
};
export function prizeOf(comp, stage) {
  const P = PRIZES[comp.id]; if (P) return P[stage] || 0;
  const champ = comp.prize || 0;
  const share = comp.kind === 'cont' ? { part: 0.12, r16: 0.05, r8: 0.07, r4: 0.095, runner: 0.38, champ: 1 } : { r32: 0.028, r16: 0.047, r8: 0.058, r4: 0.12, runner: 0.42, champ: 1 };
  return Math.round(champ * (share[stage] || 0));
}
export const LEAGUE_PRIZE = { BRA: 48e6, BRB: 5e6, BRC: 1.5e6, BRD: 0.4e6, ENG1: 350e6, ENG2: 8e6, ESP1: 120e6, ESP2: 6e6, ITA1: 100e6, ITA2: 5e6, GER1: 110e6, GER2: 6e6, FRA1: 50e6, ARG1: 6e6, ARG2: 0.8e6, POR1: 15e6 };
export const PROMO_BONUS = { BRB: 15e6, BRC: 4e6, BRD: 1.5e6, ENG2: 60e6, ESP2: 25e6, ITA2: 20e6, GER2: 25e6, GER3: 4e6, FRA2: 10e6, ARG2: 3e6 };

export function seasonIncome(G, c) {
  const L = G.comps[c.league];
  const tv = L && L.tv ? L.tv * (0.55 + 0.9 * c.rep / 100) : 20000;
  const occ = clamp(0.35 + c.rep / 180, 0.2, 0.97);
  const games = L && L.games ? Math.round(L.games / 2) : 9;
  const tickets = (c.cap || 3) * 1000 * occ * (c.price ?? TICKET[c.country] ?? 20) * games;
  return { tv, tickets, sponsor: c.spon || 0, total: tv + tickets + (c.spon || 0) };
}
