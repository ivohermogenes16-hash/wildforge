import { LEAGUES } from '../data/leagues.js';
import { shuffle } from '../util.js';
import { SEASON_WEEKS } from './econ.js';
import { ensureU17 } from './world.js';
import { CUPS2, CONTS_ALL } from '../data/leagues2.js';

export const CUPS = [
  { id: 'CDB', name: 'Copa do Brasil', short: 'Copa do Brasil', country: 'BR', from: ['BRA', 'BRB', 'BRC'], extra: ['BRD', 4], prize: 70e6 },
  { id: 'FAC', name: 'FA Cup', short: 'FA Cup', country: 'EN', from: ['ENG1', 'ENG2'], prize: 25e6 },
  { id: 'CDR', name: 'Copa del Rey', short: 'Copa del Rey', country: 'ES', from: ['ESP1', 'ESP2'], prize: 20e6 },
  { id: 'CIT', name: 'Coppa Italia', short: 'Coppa Italia', country: 'IT', from: ['ITA1', 'ITA2'], prize: 20e6 },
  { id: 'CAR', name: 'Copa Argentina', short: 'Copa Argentina', country: 'AR', from: ['ARG1', 'ARG2'], prize: 4e6 },
];
export const CONTS = CONTS_ALL;
CUPS.push(...CUPS2);
const CUP_WEEKS = [3, 9, 15, 21, 29, 37];
const CONT_GROUP_WEEKS = [5, 8, 11, 14, 17, 20];
const CONT_KO_WEEKS = [25, 33, 41];

// Rodízio (método do círculo)
export function roundRobin(ids) {
  const t = ids.slice(); if (t.length % 2) t.push(-1);
  const n = t.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const m = [];
    for (let i = 0; i < n / 2; i++) {
      const a = t[i], b = t[n - 1 - i];
      if (a !== -1 && b !== -1) m.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(m);
    t.splice(1, 0, t.pop());
  }
  return rounds;
}

function addFix(G, comp, w, s, h, a, g = -1, ko = -1) {
  const f = { i: G.fix.length, c: comp.id, w, s, h, a, hg: null, ag: null, g, ko };
  G.fix.push(f);
  return f;
}

function newComp(base) {
  return { table: {}, groups: [], ko: [], koWeeks: [], koRound: -1, champion: null, phase: 'rr', ...base };
}

function scheduleRR(G, comp, double, weekSpan, slot) {
  const per = comp.groups.map((g) => { const r = roundRobin(shuffle(g.slice())); return double ? r.concat(r.map((m) => m.map(([h, a]) => [a, h]))) : r; });
  const R = Math.max(...per.map((r) => r.length));
  comp.rounds = R;
  for (let r = 0; r < R; r++) {
    const w = weekSpan[0] + Math.floor(r * (weekSpan[1] - weekSpan[0]) / R);
    per.forEach((rounds, gi) => { if (rounds[r]) for (const [h, a] of rounds[r]) addFix(G, comp, w, slot, h, a, gi); });
  }
  for (const g of comp.groups) for (const id of g) comp.table[id] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: '' };
  comp.games = double ? (comp.groups[0].length - 1) * 2 : comp.groups[0].length - 1;
}

export function setupU17(G, from) {
  ensureU17(G);
  const ids = G.clubs.filter((c) => c.league === 'BRA').map((c) => c.id);
  const cu = newComp({ id: 'U17', kind: 'youth', name: 'Brasileirão Sub-17', short: 'Sub-17', country: 'BR', clubs: ids, groups: [ids] });
  scheduleRR(G, cu, false, [from, Math.min(SEASON_WEEKS - 2, Math.max(from + 19, SEASON_WEEKS - 6))], 0); G.comps.U17 = cu;
}
export function setupSeason(G) {
  G.fix = []; G.comps = {}; G.week = 0; G.slot = 0;
  const repSort = (a, b) => G.clubs[b].rep - G.clubs[a].rep;
  for (const L of LEAGUES) {
    const ids = G.clubs.filter((c) => c.league === L.id).map((c) => c.id);
    const comp = newComp({ id: L.id, kind: 'league', name: L.name, short: L.short, country: L.country, tier: L.tier, format: L.format, up: L.up, down: L.down, tv: L.tv, clubs: ids });
    if (L.format === 'groups6') {
      const pots = ids.slice().sort(repSort); const ng = Math.round(ids.length / 6);
      comp.groups = Array.from({ length: ng }, () => []);
      // agrupa por região aproximada: ordem original da lista ~ estados
      const orig = ids.slice();
      orig.forEach((id, i) => comp.groups[Math.floor(i / (ids.length / ng))].push(id));
      scheduleRR(G, comp, true, [0, 30], 1);
      comp.koWeeks = [32, 35, 38, 41, 44]; comp.koQual = 2; void pots;
    } else if (L.format === 'zones2') {
      const s = shuffle(ids.slice()); const h = Math.ceil(s.length / 2);
      comp.groups = [s.slice(0, h), s.slice(h)];
      scheduleRR(G, comp, true, [0, SEASON_WEEKS], 1);
    } else {
      comp.groups = [ids];
      scheduleRR(G, comp, L.format === 'double', [0, SEASON_WEEKS], 1);
    }
    G.comps[L.id] = comp;
  }
  // Sub-20
  const u20 = G.clubs.filter((c) => c.league === 'BRA').map((c) => c.id);
  const cu = newComp({ id: 'U20', kind: 'youth', name: 'Brasileirão Sub-20', short: 'Sub-20', country: 'BR', clubs: u20, groups: [u20] });
  scheduleRR(G, cu, true, [0, SEASON_WEEKS - 4], 1); G.comps.U20 = cu;
  setupU17(G, 2);
  // Liga amadora (clube próprio)
  const ama = G.clubs.filter((c) => c.league === 'AMA').map((c) => c.id);
  if (ama.length >= 4) {
    const ca = newComp({ id: 'AMA', kind: 'amateur', name: 'Liga Amadora (Várzea)', short: 'Várzea', country: 'BR', clubs: ama, groups: [ama], up: 1 });
    scheduleRR(G, ca, true, [2, SEASON_WEEKS - 2], 1); G.comps.AMA = ca;
  }
  // Copas nacionais
  for (const cup of CUPS) {
    let ids = G.clubs.filter((c) => cup.from.includes(c.league)).map((c) => c.id);
    if (cup.extra) ids = ids.concat(G.clubs.filter((c) => c.league === cup.extra[0]).sort((a, b) => b.rep - a.rep).slice(0, cup.extra[1]).map((c) => c.id));
    ids.sort(repSort);
    const comp = newComp({ id: cup.id, kind: 'cup', name: cup.name, short: cup.short, country: cup.country, clubs: ids, prize: cup.prize, phase: 'ko' });
    let P = 1; while (P < ids.length) P *= 2;
    const nRounds = Math.log2(P);
    comp.koWeeks = CUP_WEEKS.slice(CUP_WEEKS.length - nRounds);
    const byes = P - ids.length; // os melhores passam direto
    const playing = ids.slice(byes);
    comp.byes = ids.slice(0, byes);
    const pairs = [];
    for (let i = 0; i < playing.length / 2; i++) pairs.push([playing[i], playing[playing.length - 1 - i]]);
    startKO(G, comp, shuffle(pairs), 0);
    G.comps[cup.id] = comp;
  }
  // Continentais
  const qual = G.qual || {};
  for (const cont of CONTS) {
    let ids = qual[cont.id];
    if (!ids || ids.length < 16) ids = defaultQual(G, cont.id);
    const taken = new Set(Object.values(G.comps).filter((k) => k.kind === 'cont').flatMap((k) => k.clubs));
    ids = [...new Set(ids)].filter((id) => G.clubs[id] && G.clubs[id].league && !taken.has(id)).slice(0, 16);
    if (ids.length < 16) { const C = cont; for (const [lg] of C.slots) for (const c of G.clubs.filter((x) => x.league === lg && !taken.has(x.id) && !ids.includes(x.id)).sort((a, b) => b.rep - a.rep)) { if (ids.length >= 16) break; ids.push(c.id); } }
    if (ids.length < 16) continue;
    const comp = newComp({ id: cont.id, kind: 'cont', name: cont.name, short: cont.short, country: cont.country, clubs: ids, prize: cont.prize });
    // potes
    const sorted = ids.slice().sort(repSort);
    comp.groups = [[], [], [], []];
    for (let pot = 0; pot < 4; pot++) { const p = shuffle(sorted.slice(pot * 4, pot * 4 + 4)); p.forEach((id, i) => comp.groups[i].push(id)); }
    scheduleRR(G, comp, true, [CONT_GROUP_WEEKS[0], CONT_GROUP_WEEKS[5] + 1], 0);
    // reposiciona as rodadas nas semanas certas
    const rr = G.fix.filter((f) => f.c === cont.id);
    const weeks = [...new Set(rr.map((f) => f.w))].sort((a, b) => a - b);
    for (const f of rr) f.w = CONT_GROUP_WEEKS[weeks.indexOf(f.w)] ?? f.w;
    comp.koWeeks = CONT_KO_WEEKS; comp.koQual = 2;
    G.comps[cont.id] = comp;
  }
}

export function defaultQual(G, id) {
  const C = CONTS.find((x) => x.id === id); const used = new Set();
  // clubos já colocados numa continental de prioridade maior ficam de fora
  for (const o of CONTS) { if (o.id === id) break; if (G.comps?.[o.id]) for (const x of G.comps[o.id].clubs) used.add(x); }
  const out = [];
  for (const [lg, n] of C.slots) out.push(...G.clubs.filter((c) => c.league === lg && !used.has(c.id)).sort((a, b) => b.rep - a.rep).slice(0, n).map((c) => c.id));
  return out;
}

function startKO(G, comp, pairs, r) {
  comp.koRound = r; comp.phase = 'ko';
  const w = comp.koWeeks[r];
  const slot = comp.kind === 'league' ? 1 : 0;
  comp.ko[r] = pairs.map(([h, a]) => addFix(G, comp, w, slot, h, a, -1, r).i);
}

export function standings(G, comp, gi = 0) {
  const ids = comp.groups[gi] || comp.clubs;
  return ids.slice().sort((a, b) => {
    const A = comp.table[a], B = comp.table[b];
    return B.pts - A.pts || (B.gf - B.ga) - (A.gf - A.ga) || B.gf - A.gf || B.w - A.w || G.clubs[b].rep - G.clubs[a].rep;
  });
}

export function koWinner(f) {
  if (f.hg > f.ag) return f.h; if (f.ag > f.hg) return f.a;
  return f.pen && f.pen[0] > f.pen[1] ? f.h : f.a;
}

// Avança fases (chamado após cada rodada)
export function progressComps(G) {
  for (const comp of Object.values(G.comps)) {
    if (comp.champion != null) continue;
    const mine = G.fix.filter((f) => f.c === comp.id);
    if (comp.phase === 'rr') {
      if (mine.some((f) => f.hg == null)) continue;
      if (comp.koWeeks.length) {
        const q = comp.groups.map((g, gi) => standings(G, comp, gi).slice(0, comp.koQual));
        let pairs = [];
        if (q.length === 4 && comp.kind === 'cont') {
          pairs = [[q[0][0], q[1][1]], [q[1][0], q[0][1]], [q[2][0], q[3][1]], [q[3][0], q[2][1]]];
        } else {
          for (let i = 0; i < q.length; i += 2) { pairs.push([q[i][0], q[i + 1][1]]); pairs.push([q[i + 1][0], q[i][1]]); }
        }
        startKO(G, comp, pairs, 0);
      } else {
        comp.phase = 'done';
        if (comp.groups.length === 2) {
          const a = standings(G, comp, 0)[0], b = standings(G, comp, 1)[0];
          comp.champion = comp.table[a].pts >= comp.table[b].pts ? a : b;
        } else comp.champion = standings(G, comp, 0)[0];
        G.events.push({ t: 'champion', c: comp.id, club: comp.champion });
      }
    } else if (comp.phase === 'ko') {
      const r = comp.koRound; const ties = comp.ko[r].map((i) => G.fix[i]);
      if (ties.some((f) => f.hg == null)) continue;
      let winners = ties.map(koWinner);
      if (r === 0 && comp.byes && comp.byes.length) { winners = comp.byes.concat(winners); comp.byes = []; }
      if (comp.kind === 'league' && r === comp.koWeeks.length - 3) comp.semis = winners.slice();
      if (winners.length === 1) {
        comp.champion = winners[0]; comp.phase = 'done';
        comp.runnerUp = ties[0].h === winners[0] ? ties[0].a : ties[0].h;
        G.events.push({ t: 'champion', c: comp.id, club: comp.champion });
      } else {
        const pairs = [];
        for (let i = 0; i < winners.length / 2; i++) {
          const a = winners[i], b = winners[winners.length - 1 - i];
          pairs.push(G.clubs[a].rep >= G.clubs[b].rep ? [a, b] : [b, a]);
        }
        startKO(G, comp, r === 0 && comp.kind === 'cup' ? shuffle(pairs) : pairs, r + 1);
      }
    }
  }
}

export function recordResult(G, f) {
  const comp = G.comps[f.c];
  if (f.ko >= 0 || !comp.table[f.h]) return;
  const H = comp.table[f.h], A = comp.table[f.a];
  H.p++; A.p++; H.gf += f.hg; H.ga += f.ag; A.gf += f.ag; A.ga += f.hg;
  const rh = f.hg > f.ag ? 'V' : f.hg === f.ag ? 'E' : 'D';
  const ra = rh === 'V' ? 'D' : rh === 'D' ? 'V' : 'E';
  for (const [T, r] of [[H, rh], [A, ra]]) {
    if (r === 'V') { T.w++; T.pts += 3; } else if (r === 'E') { T.d++; T.pts++; } else T.l++;
    T.form = (T.form + r).slice(-5);
  }
}

export function fixturesOf(G, cid) { return G.fix.filter((f) => f.h === cid || f.a === cid).sort((a, b) => a.w - b.w || a.s - b.s); }
