import { LEAGUES, CLUBS, RESERVE, COUNTRIES } from '../data/leagues.js';
import { NAMES, FOREIGN } from '../data/names.js';
import { SQUADS } from '../data/squads.js';
import { NAT_OF, NAMES_EXTRA, NAME_POOL_OF } from '../data/nations.js';
import { ri, rf, pick, rnd, clamp, gauss, POS, hash } from '../util.js';
import { playerWage } from './econ.js';

export const QUOTA = { GOL: 3, LD: 2, ZAG: 4, LE: 2, VOL: 3, MC: 3, MEI: 2, PE: 2, PD: 2, ATA: 3 };
export const START_YEAR = 2026;

let uidc = 0;
export const uid = () => Date.now().toString(36) + (uidc++).toString(36) + Math.floor(rnd() * 1e6).toString(36);

export function genName(nat) {
  const N = NAMES[nat] || NAMES_EXTRA[nat] || NAMES[NAME_POOL_OF[nat]] || NAMES.BR;
  if (nat === 'BR' && rnd() < 0.28) return pick(N.nick) + (rnd() < 0.3 ? ' ' + pick(N.last) : '');
  return pick(N.first) + ' ' + pick(N.last);
}

export function makePlayer(G, o) {
  const age = o.age ?? ri(18, 33);
  const ovr = clamp(Math.round(o.ovr ?? 55), 25, 95);
  let pot = o.pot;
  if (pot == null) {
    const room = Math.max(0, 25 - age);
    pot = clamp(ovr + Math.round(room * rf(0.6, 2.4) + (age <= 20 ? rf(0, 6) : 0)), ovr, 95);
  }
  const p = {
    id: G.players.length, key: o.key || uid(), n: o.n, pos: o.pos, age, ovr, pot, nat: o.nat || 'BR',
    club: o.club ?? -1, con: o.con ?? G.year + ri(1, 4), wage: 0, mor: 70, fit: 100, inj: 0, sus: 0, yc: 0,
    st: { j: 0, g: 0, a: 0, y: 0, r: 0, ns: 0 }, tot: { j: 0, g: 0 }, prog: 0, s0: ovr, oh: [], face: o.face ?? hash(o.n + (o.key || '')) % 100000, real: !!o.real, u20: !!o.u20, lst: false,
  };
  const c = G.clubs[p.club];
  p.wage = o.wage ?? playerWage(p, c ? c.country : 'BR');
  initPlayerLife(p);
  G.players.push(p);
  return p;
}

// ---------- personalidade / diretoria / estrutura (dados base) ----------
export const PERS = ['Líder', 'Profissional', 'Ambicioso', 'Disciplinado', 'Individualista', 'Temperamental', 'Experiente', 'Promessa', 'Leal'];
export function initPlayerLife(p) {
  if (!p.per) {
    const h = hash((p.key || '') + p.n) % 1000 / 1000;
    if (p.age >= 31 && h < 0.45) p.per = 'Experiente';
    else if (p.age <= 21 && p.pot >= p.ovr + 10 && h < 0.5) p.per = 'Promessa';
    else p.per = ['Líder', 'Profissional', 'Profissional', 'Ambicioso', 'Ambicioso', 'Disciplinado', 'Individualista', 'Temperamental', 'Leal', 'Profissional'][Math.floor(h * 1000) % 10];
  }
  if (p.rel == null) p.rel = 50;
  if (p.sat == null) p.sat = 65;
  if (p.bw == null) p.bw = 0;
  if (p.s0 == null) p.s0 = p.ovr;
  if (!p.oh) p.oh = [];
}
export const BOARD_TYPES = {
  ambiciosa: { n: 'Ambiciosa', d: 'Exige títulos e campanhas fortes. Cobra muito, mas valoriza conquistas.', k: 1.15, fire: 14 },
  conservadora: { n: 'Conservadora', d: 'Prioriza as contas em dia. Odeia dívidas e folha estourada.', k: 0.85, fire: 12 },
  formadora: { n: 'Formadora', d: 'Valoriza a base e quer jovens jogando.', k: 0.9, fire: 12 },
  investidora: { n: 'Investidora', d: 'Quer crescimento rápido e aceita investir para isso.', k: 1, fire: 13 },
  impaciente: { n: 'Impaciente', d: 'Demite rápido quando os resultados não aparecem.', k: 1.4, fire: 22 },
};
export function initClubLife(c) {
  const h = hash(c.key || c.name);
  if (!BOARD_TYPES[c.board.type]) c.board.type = Object.keys(BOARD_TYPES)[(h >>> 3) % 5];
  if (!c.board.pres) { c.board.pres = genName(c.country); }
  if (c.fans == null) c.fans = clamp(Math.round(55 + (c.rep - 50) * 0.25), 20, 85);
  if (c.chem == null) c.chem = 60;
  if (!c.infra) { const l = (x) => clamp(Math.round(c.rep / 22 + x), 1, 5); c.infra = { ct: l(0), med: l(-0.3), base: l(((h >>> 5) % 3) - 1), obs: clamp(Math.round(c.rep / 35), 0, 3), mod: l(-0.5) }; }
  if (!c.staff) c.staff = {};
  if (!c.fin.staff) Object.assign(c.fin, { staff: 0, infra: 0, juros: 0 });
}

function natFor(country) {
  if (rnd() < 0.86) return country;
  return pick(FOREIGN[country] || ['BR']);
}

export function clubLevel(rep) { return 40 + rep * 0.43; }

export function makeClub(G, row, leagueId, country, inactive) {
  const [name, short, city, c1, c2, rep, stad, cap] = row.length >= 6 ? row : [row[0], row[1], '', row[2], row[3], row[4]];
  const c = {
    id: G.clubs.length, key: name, name, short, city: city || '', c1, c2, rep, stad: stad || `Estádio ${city || name}`, cap: cap || Math.max(2, Math.round(rep / 6)),
    country, league: inactive ? null : leagueId, money: 0, spon: 0, price: null,
    coach: { n: genName(country === 'EN' ? 'EN' : country), rep: clamp(Math.round(rep + gauss() * 8), 5, 95) },
    tact: { form: '4-3-3', ment: 1, press: 1, tempo: 1 }, lineup: null, train: { foco: 'equilibrado', int: 1 },
    board: { conf: 60 }, own: { assoc: 100, user: 0, fund: 0 }, fin: newFin(), troph: [], hist: [],
  };
  initClubLife(c);
  G.clubs.push(c);
  return c;
}
export const newFin = () => ({ tv: 0, tick: 0, spon: 0, prize: 0, tin: 0, tout: 0, wages: 0, other: 0, staff: 0, infra: 0, juros: 0 });

export function buildSquad(G, c, extraYouth) {
  const real = SQUADS[c.key];
  const out = [];
  if (real) {
    for (const s of real.split(';')) {
      const [n, pos, age, ovr] = s.split(':');
      if (!n || !POS.includes(pos)) continue;
      out.push(makePlayer(G, { n, pos, age: +age, ovr: +ovr, club: c.id, real: true, key: 'r:' + n, nat: guessNat(n, c.country) }));
    }
  }
  const realLvl = out.length ? out.map((p) => p.ovr).sort((a, b) => b - a).slice(0, 14).reduce((s, x, _, a) => s + x / a.length, 0) : 0;
  const L = real ? realLvl : clubLevel(c.rep) + (['EN', 'ES', 'IT'].includes(c.country) ? 3 : 0);
  const count = {}; for (const p of out) count[p.pos] = (count[p.pos] || 0) + 1;
  const small = c.rep < 25;
  for (const pos of POS) {
    const need = Math.max(0, (small ? Math.max(1, QUOTA[pos] - (pos === 'ZAG' || pos === 'ATA' || pos === 'GOL' ? 1 : 0)) : QUOTA[pos]) - (count[pos] || 0));
    for (let i = 0; i < need; i++) {
      const starter = !real && i === 0;
      const ovr = real ? L - ri(3, 10) : starter ? L + gauss() * 3 : L - ri(2, 9);
      const age = real && rnd() < 0.5 ? ri(17, 21) : ri(18, 34);
      const nat = natFor(c.country);
      out.push(makePlayer(G, { n: genName(nat), pos, age, ovr: age <= 20 ? ovr - ri(0, 4) : ovr, club: c.id, nat }));
    }
  }
  return out;
}

const ES_HINT = /(ez|ín|án|ón|ú)$|^(Juan|Santiago|Nicolás|Matías|Gonzalo|Facundo|Lautaro|Agustín|Franco|Leandro|Marcos|Germán|Exequiel|Milton|Miguel|Kevin|Tomás|Rodrigo|Gastón|Enzo|Lucas)/;
function guessNat(n, country) {
  if (NAT_OF[n]) return NAT_OF[n];
  if (country === 'BR') return ES_HINT.test(n.split(' ')[0]) && n.includes(' ') && !/ (Silva|Santos|Souza)$/.test(n) ? 'AR' : 'BR';
  return country;
}

export function buildU17(G, c) {
  const L = 44 + c.rep * 0.13;
  const q = { GOL: 2, LD: 1, ZAG: 3, LE: 1, VOL: 2, MC: 2, MEI: 2, PE: 1, PD: 1, ATA: 3 };
  for (const pos of POS) for (let i = 0; i < q[pos]; i++) {
    const age = ri(15, 17);
    const p = makePlayer(G, { n: genName('BR'), pos, age, ovr: L + gauss() * 4 - (17 - age) * 2, club: c.id, u20: true, nat: 'BR', wage: 150 + ri(0, 4) * 50 });
    p.u17 = true; p.pot = clamp(p.ovr + ri(10, 32), p.ovr, 93);
  }
}
export function ensureU17(G) {
  for (const c of G.clubs) if (c.league === 'BRA' && !G.players.some((p) => p && p.club === c.id && p.u17)) buildU17(G, c);
}
export function buildU20(G, c) {
  const L = 49 + c.rep * 0.14;
  const ids = [];
  const q = { GOL: 2, LD: 2, ZAG: 3, LE: 2, VOL: 2, MC: 2, MEI: 2, PE: 2, PD: 2, ATA: 2 };
  for (const pos of POS) for (let i = 0; i < q[pos]; i++) {
    const age = ri(16, 20);
    const p = makePlayer(G, { n: genName('BR'), pos, age, ovr: L + gauss() * 4 - (20 - age), club: c.id, u20: true, nat: 'BR', wage: 300 + ri(0, 8) * 100 });
    p.pot = clamp(p.ovr + ri(6, 26), p.ovr, 92);
    ids.push(p.id);
  }
  return ids;
}

export function createWorld(G) {
  G.clubs = []; G.players = [];
  for (const L of LEAGUES) {
    for (const row of CLUBS[L.id]) {
      const c = makeClub(G, row, L.id, L.country);
      buildSquad(G, c);
    }
  }
  for (const [country, rows] of Object.entries(RESERVE)) for (const row of rows) { const c = makeClub(G, row, null, country, true); buildSquad(G, c); }
  // Base sub-20 para todos os clubes brasileiros da Série A e B
  for (const c of G.clubs) if (c.country === 'BR' && (c.league === 'BRA' || c.league === 'BRB')) buildU20(G, c);
  // Dinheiro e patrocínio para fechar a conta
  for (const c of G.clubs) initFinances(G, c);
}

export function initFinances(G, c) {
  const L = LEAGUES.find((l) => l.id === c.league);
  const wages = G.players.reduce((s, p) => (p && p.club === c.id ? s + p.wage : s), 0) * 52;
  const tv = L ? L.tv * (0.55 + 0.9 * c.rep / 100) : 100000;
  const tick = c.cap * 1000 * clamp(0.35 + c.rep / 180, 0.2, 0.97) * (L ? 19 : 9) * (c.country === 'BR' ? 45 : c.country === 'AR' ? 14 : 200);
  c.spon = Math.round(Math.max(c.rep * c.rep * 1500, wages * rf(1.05, 1.25) - tv - tick) / 1000) * 1000;
  c.money = Math.round((wages * rf(0.15, 0.45) + c.rep * c.rep * 3000) / 1000) * 1000;
}

export { COUNTRIES };
