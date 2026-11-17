import { clamp } from '../util.js';

export const WAGE_SCALE = { BR: 0.75, EN: 2.1, ES: 1.45, IT: 1.35, AR: 0.42, XX: 0.6 };
export const TICKET = { BR: 45, EN: 260, ES: 190, IT: 170, AR: 14, XX: 10 };
export const SEASON_WEEKS = 46;
import { ECON2 } from '../data/leagues2.js';
Object.assign(WAGE_SCALE, ECON2.WAGE); Object.assign(TICKET, ECON2.TICKET);
export const BRAND = { BR: 1, AR: 0.5, EN: 2.5, ES: 2.5, IT: 2.5, ...ECON2.BRAND };

export function playerValue(p) {
  let v = 10000 * Math.exp((p.ovr - 40) / 4.6);
  const gap = Math.max(0, p.pot - p.ovr);
  if (p.age <= 21) v *= 1 + gap / 11;
  else if (p.age <= 25) v *= 1 + gap / 18;
  else if (p.age >= 30) v *= Math.max(0.1, 1 - (p.age - 29) * 0.14);
  if (p.inj > 4) v *= 0.85;
  return Math.round(v / 1000) * 1000;
}

export function playerWage(p, country) {
  const w = playerValue({ ...p, age: Math.min(p.age, 29) }) * 0.0021 * (WAGE_SCALE[country] ?? 0.6);
  return Math.max(country === 'XX' ? 150 : 400, Math.round(w / 50) * 50);
}

export function coachWage(rep, country, youth) {
  const w = (1000 + Math.pow(rep, 3) * 0.27) * (WAGE_SCALE[country] ?? 0.6) * 1.2;
  return Math.round((youth ? (1200 + rep * 55) * (WAGE_SCALE[country] ?? 0.6) : w) / 100) * 100;
}

export function clubValuation(G, c) {
  const sq = G.players.filter((p) => p && p.club === c.id && !p.u20);
  let squad = 0; for (const p of sq) squad += playerValue(p);
  const brand = Math.pow(c.rep, 2.6) * 900 * (BRAND[c.country] ?? 1);
  return Math.max(500000, Math.round((brand + squad * 0.35 + Math.max(0, c.money) * 0.8) / 10000) * 10000);
}

export function seasonIncome(G, c) {
  const L = G.comps[c.league];
  const tv = L ? L.tv * (0.55 + 0.9 * c.rep / 100) : 20000;
  const occ = clamp(0.35 + c.rep / 180, 0.2, 0.97);
  const games = L ? Math.round(L.games / 2) : 9;
  const tickets = (c.cap || 3) * 1000 * occ * (c.price ?? TICKET[c.country] ?? 20) * games;
  return { tv, tickets, sponsor: c.spon || 0, total: tv + tickets + (c.spon || 0) };
}
