// =====================================================================
// SELEÇÕES NACIONAIS — convocações, amistosos, eliminatórias,
// Copa América / Eurocopa e Copa do Mundo (a cada 4 anos)
// Os jogos acontecem nas datas FIFA (semanas 8, 14, 28 e 36, meio de semana)
// e os torneios no fim da temporada (semanas 39 a 45).
// =====================================================================
import { NATIONS, CONFS, NAT_OF } from '../data/nations.js';
import { clamp, ri, rnd, pick, shuffle, money } from '../util.js';
import { makePlayer, genName } from './world.js';
import { autoLineup, quickSim, penalties, available } from './match.js';
import { roundRobin } from './season.js';
import { coachWage } from './econ.js';
import { newCoach, tl } from './life.js';

export const NAT_WEEKS = [7, 13, 27, 35];
const GW = [38, 39, 40], KW8 = [43, 44], KW16 = [42, 43, 44];
const QUOTA = { GOL: 3, LD: 2, ZAG: 4, LE: 2, VOL: 2, MC: 3, MEI: 2, PE: 2, PD: 2, ATA: 3 };
const LINE = { GOL: 'G', LD: 'D', ZAG: 'D', LE: 'D', VOL: 'M', MC: 'M', MEI: 'M', PE: 'A', PD: 'A', ATA: 'A' };

function msg(G, from, title, body, extra = {}) { G.inbox.unshift({ id: (G.inbox[0]?.id || 0) + 1, t: G.t, y: G.year, w: G.week, from, title, body, read: false, ...extra }); }
function news(G, txt, cat = 'sel') { G.news.unshift({ t: G.t, y: G.year, w: G.week, txt, cat }); }

// ---------------- inicialização / compatibilidade ----------------
export function initNations(G) {
  for (const p of G.players) if (p && p.real && p.key?.startsWith('r:')) { const n = NAT_OF[p.key.slice(2)]; if (n) p.nat = n; }
  if (G.nat && G.nat.teams) return;
  G.nat = { teams: {}, fix: [], tours: {}, qual: {}, hist: [] };
  for (const [code, d] of Object.entries(NATIONS)) {
    const T = { code, name: d.name, flag: d.flag, c1: d.c1, c2: d.c2, rep: d.rep, base: d.base, cf: d.conf, conf: 65, squad: [], tact: { form: '4-3-3', ment: 1, press: 1 }, titles: [], j: 0, v: 0, e: 0, d: 0, pts: d.rep * 16, coach: null };
    G.nat.teams[code] = T;
    appointNatAI(G, T, true);
  }
  fillVirtual(G);
}
function fillVirtual(G) {
  for (const T of Object.values(G.nat.teams)) {
    const pool = G.players.filter((p) => p && p.nat === T.code && (p.club >= 0 || p.club === -4) && p.ovr >= T.base - 14);
    const cnt = {}; for (const p of pool) cnt[p.pos] = (cnt[p.pos] || 0) + 1;
    for (const [pos, q] of Object.entries(QUOTA)) for (let i = cnt[pos] || 0; i < q; i++) {
      const p = makePlayer(G, { n: genName(T.code), pos, age: ri(20, 32), ovr: T.base - ri(1, 9), nat: T.code, club: -4 });
      p.virt = true; p.pot = Math.max(p.ovr, p.pot);
    }
  }
}
function appointNatAI(G, T, quiet) {
  const free = G.coaches.filter((k) => k.cid === -1 && !k.ret && !k.natTeam && k.rep >= T.rep - 25).sort((a, b) => (b.nat === T.code) - (a.nat === T.code) || b.rep - a.rep);
  const k = free[0] && (free[0].nat === T.code || ['BR', 'AR', 'ES', 'IT', 'EN'].includes(T.code) || rnd() < 0.3) ? free[0] : newCoach(G, { nat: T.code, rep: T.rep - ri(5, 20) });
  k.natTeam = T.code; T.coach = { n: k.n, id: k.id }; T.conf = 65;
  if (!quiet) news(G, `🌍 ${T.flag} ${T.name} anuncia ${k.n} como novo técnico da seleção.`);
}
export const team = (G, code) => G.nat.teams[code];
export function natClub(G, code) {
  const T = team(G, code);
  return { id: -100 - Object.keys(G.nat.teams).indexOf(code), key: 'nat:' + code, name: T.name, short: code, c1: T.c1, c2: T.c2, rep: T.rep, tact: T.tact, country: code, flag: T.flag, coach: T.coach, nat: true };
}

// ---------------- convocação ----------------
export function eligible(G, code) { return G.players.filter((p) => p && p.nat === code && (p.club >= 0 || p.club === -4) && !p.u20 && p.age >= 17); }
export function autoSquad(G, code) {
  const ps = eligible(G, code).filter((p) => p.inj <= 2).sort((a, b) => b.ovr - a.ovr);
  const out = []; const need = { G: 3, D: 8, M: 7, A: 5 }; const have = { G: 0, D: 0, M: 0, A: 0 };
  for (const p of ps) { const l = LINE[p.pos]; if (have[l] < need[l]) { out.push(p.id); have[l]++; } }
  for (const p of ps) { if (out.length >= 23) break; if (!out.includes(p.id) && LINE[p.pos] !== 'G') out.push(p.id); }
  return out.slice(0, 23);
}
function callUps(G, tour) {
  const me = G.me;
  for (const T of Object.values(G.nat.teams)) {
    if (me.nat && me.nat.code === T.code) {
      let sq = (me.natSquad || []).filter((id) => G.players[id] && G.players[id].nat === T.code);
      if (sq.length < 16) sq = autoSquad(G, T.code);
      // pedidos de dispensa
      const out = [];
      for (const id of sq) { const p = G.players[id]; const ch = 0.025 + (['Individualista', 'Temperamental'].includes(p.per) ? 0.06 : 0) + (p.age >= 34 ? 0.08 : 0); if (rnd() < ch && !p.virt) out.push(p); }
      if (out.length) { sq = sq.filter((id) => !out.some((p) => p.id === id)); msg(G, 'Federação', `📋 Pedido de dispensa: ${out.map((p) => p.n).join(', ')}`, `${out.map((p) => `${p.n} (${p.per?.toLowerCase() || ''})`).join(', ')} pediu dispensa da convocação${out.some((p) => p.age >= 34) ? ' — alguns veteranos pensam em se despedir da seleção' : ''}. A federação convocou substitutos automaticamente.`); for (const p of autoSquad(G, T.code)) if (sq.length < 23 && !sq.includes(p)) sq.push(p); }
      T.squad = sq; T.callT = G.t; me.natSquad = sq.slice();
      msg(G, 'Federação', `📋 Convocação: ${T.flag} ${T.name}`, `${tour ? 'Lista para o torneio' : 'Lista para a data FIFA'} definida com ${sq.length} jogadores. Você pode ajustar na aba Seleção antes do jogo.`);
    } else { T.squad = autoSquad(G, T.code); T.callT = G.t; }
  }
}

// ---------------- calendário do ano ----------------
function addFix(G, o) { const f = { i: G.nat.fix.length, hg: null, ag: null, ...o }; G.nat.fix.push(f); return f; }
const cycleStart = (y) => (y % 4 === 3 ? y : y % 4 === 0 ? y - 1 : y % 4 === 1 ? y - 2 : null);
export function natSetupYear(G) {
  const y = G.year; G.nat.fix = []; G.nat.tours = {};
  const cs = cycleStart(y);
  if (cs != null) {
    const Q = (G.nat.qual[cs] ||= {});
    for (const cf of Object.keys(CONFS)) {
      const teams = Object.values(G.nat.teams).filter((t) => t.cf === cf).map((t) => t.code);
      if (!Q[cf]) { Q[cf] = { tab: Object.fromEntries(teams.map((c) => [c, { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }])), rounds: null }; const rr = roundRobin(teams); let full = rr.concat(rr.map((r) => r.map(([h, a]) => [a, h]))); while (full.length < 12) full = full.concat(rr); Q[cf].rounds = full.slice(0, 12); }
      for (let k = 0; k < 4; k++) { const wi = (y - cs) * 4 + k; for (const [h, a] of Q[cf].rounds[wi] || []) addFix(G, { w: NAT_WEEKS[k], comp: 'Q' + cf, cyc: cs, h, a, st: 'q' }); }
    }
  } else {
    for (const w of NAT_WEEKS) { const codes = shuffle(Object.keys(G.nat.teams)); for (let i = 0; i + 1 < codes.length; i += 2) addFix(G, { w, comp: 'AMI', h: codes[i], a: codes[i + 1], st: 'a' }); }
  }
  if (y % 4 === 2 && y > 2026) makeTour(G, 'WC', 'Copa do Mundo ' + y, qualified(G, y - 3), 16);
  if (y % 4 === 0) {
    makeTour(G, 'CA', 'Copa América ' + y, Object.values(G.nat.teams).filter((t) => t.cf === 'SA').map((t) => t.code).concat(['MX']), 8);
    makeTour(G, 'EU', 'Eurocopa ' + y, Object.values(G.nat.teams).filter((t) => t.cf === 'EU').sort((a, b) => b.rep - a.rep).slice(0, 8).map((t) => t.code), 8);
  }
}
export function qualified(G, cs) {
  const Q = G.nat.qual[cs]; const out = [];
  for (const [cf, d] of Object.entries(CONFS)) {
    const teams = Object.values(G.nat.teams).filter((t) => t.cf === cf).map((t) => t.code);
    const tab = Q?.[cf]?.tab;
    const ord = tab ? qualTable(tab) : teams.sort((a, b) => team(G, b).rep - team(G, a).rep);
    out.push(...ord.slice(0, d.spots));
  }
  return out.slice(0, 16);
}
export function qualTable(tab) { return Object.keys(tab).sort((a, b) => tab[b].pts - tab[a].pts || (tab[b].gf - tab[b].ga) - (tab[a].gf - tab[a].ga) || tab[b].gf - tab[a].gf); }
function makeTour(G, id, name, teams, size) {
  teams = teams.slice(0, size);
  const sorted = teams.slice().sort((a, b) => team(G, b).pts - team(G, a).pts);
  const ng = size / 4; const groups = Array.from({ length: ng }, () => []);
  for (let pot = 0; pot < 4; pot++) shuffle(sorted.slice(pot * ng, pot * ng + ng)).forEach((c, i) => groups[i].push(c));
  const T = { id, name, teams, groups, table: {}, ko: [], kw: size === 16 ? KW16 : KW8, champion: null, phase: 'g' };
  for (const c of teams) T.table[c] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
  groups.forEach((g, gi) => { roundRobin(g).forEach((r, ri2) => r.forEach(([h, a]) => addFix(G, { w: GW[ri2], comp: id, h, a, st: 'g', g: gi }))); });
  G.nat.tours[id] = T;
  news(G, `🌍 Sorteio da ${name}: ${groups.map((g, i) => `Grupo ${String.fromCharCode(65 + i)}: ${g.map((c) => team(G, c).flag).join(' ')}`).join(' · ')}`);
}

// ---------------- partidas ----------------
export function natUserFixNow(G) {
  const n = G.me.nat; if (!n || G.slot !== 0) return null;
  return G.nat.fix.find((f) => f.w === G.week && f.hg == null && (f.h === n.code || f.a === n.code));
}
export function nextNatFix(G) { const n = G.me.nat; if (!n) return null; return G.nat.fix.filter((f) => f.hg == null && (f.h === n.code || f.a === n.code)).sort((a, b) => a.w - b.w)[0]; }
export function natLineup(G, code) {
  const T = team(G, code); if (!T.squad.length) T.squad = autoSquad(G, code);
  const pool = T.squad.map((id) => G.players[id]).filter(Boolean);
  if (G.me.nat?.code === code && natXiOk(G, T)) return { xi: T.xi.slice(), bench: pool.filter((p) => !T.xi.includes(p.id) && available(p)).sort((a, b) => b.ovr - a.ovr).slice(0, 9).map((p) => p.id) };
  return autoLineup(G, natClub(G, code), false, false, pool);
}
export function natXiOk(G, T) {
  return !!T.xi && T.xi.length === 11 && new Set(T.xi).size === 11 && T.xi.every((id) => T.squad.includes(id) && available(G.players[id]));
}
export function natRecord(G, f, res) {
  f.hg = res.hg; f.ag = res.ag;
  const tour = G.nat.tours[f.comp];
  if (f.st === 'ko' && f.hg === f.ag) f.pen = res.pen || penalties();
  f.ev = (res.ev || []).filter((e) => e.t === 'gol').map((e) => [e.m, e.side, e.p]);
  for (const s of [0, 1]) for (const id of res.played?.[s] || res.xi?.[s] || []) { const p = G.players[id]; if (!p) continue; (p.intl ||= { j: 0, g: 0 }).j++; p.fit = Math.max(30, p.fit - 8); }
  for (const e of res.ev || []) if (e.t === 'gol') { const p = G.players[e.p]; if (p) (p.intl ||= { j: 0, g: 0 }).g++; }
  const H = team(G, f.h), A = team(G, f.a);
  // ranking (elo)
  const exp = 1 / (1 + Math.pow(10, (A.pts - H.pts) / 600)); const sc = f.hg > f.ag ? 1 : f.hg === f.ag ? 0.5 : 0; const k = f.st === 'a' ? 20 : 40;
  H.pts += k * (sc - exp); A.pts -= k * (sc - exp);
  for (const [T, gf, ga] of [[H, f.hg, f.ag], [A, f.ag, f.hg]]) { T.j++; T[gf > ga ? 'v' : gf === ga ? 'e' : 'd']++; }
  // tabelas
  const upd = (tab) => { const a = tab[f.h], b = tab[f.a]; if (!a || !b) return; a.p++; b.p++; a.gf += f.hg; a.ga += f.ag; b.gf += f.ag; b.ga += f.hg; if (f.hg > f.ag) { a.w++; a.pts += 3; b.l++; } else if (f.hg < f.ag) { b.w++; b.pts += 3; a.l++; } else { a.d++; b.d++; a.pts++; b.pts++; } };
  if (f.st === 'q') upd(G.nat.qual[f.cyc][f.comp.slice(1)].tab);
  if (tour && f.st === 'g') upd(tour.table);
  // confiança da federação
  for (const [T, gf, ga, O] of [[H, f.hg, f.ag, A], [A, f.ag, f.hg, H]]) {
    const e = clamp(1.4 + (T.pts - O.pts) / 250, 0.3, 2.6); const pts = gf > ga ? 3 : gf === ga ? 1 : 0;
    T.conf = clamp(T.conf + (pts - e) * (f.st === 'a' ? 1.5 : 3.5), 0, 100);
    const user = G.me.nat && G.me.nat.code === T.code;
    if (user) { const n = G.me.nat; n.j = (n.j || 0) + 1; n[gf > ga ? 'v' : gf === ga ? 'e' : 'd'] = (n[gf > ga ? 'v' : gf === ga ? 'e' : 'd'] || 0) + 1; G.me.rep = clamp(G.me.rep + (pts - e) * 0.15, 1, 99); G.me.xp = (G.me.xp || 0) + 3; G.me.pop = clamp((G.me.pop || 0) + (pts === 3 ? 0.6 : pts === 0 ? -0.6 : 0), 0, 100); }
  }
}
export function natSlot(G) {
  if (G.slot !== 0) return;
  const fx = G.nat.fix.filter((f) => f.w === G.week && f.hg == null);
  if (!fx.length) return;
  for (const f of fx) {
    const hc = natClub(G, f.h), ac = natClub(G, f.a);
    const hl = natLineup(G, f.h), al = natLineup(G, f.a);
    const res = quickSim(G, f, hc, ac, hl.xi, al.xi, { neutral: f.st !== 'q' && f.st !== 'a' });
    res.xi = [hl.xi, al.xi];
    natRecord(G, f, res);
  }
  natProgress(G);
}
export function natProgress(G) {
  for (const T of Object.values(G.nat.tours)) {
    if (T.champion) continue;
    const mine = G.nat.fix.filter((f) => f.comp === T.id);
    if (T.phase === 'g') {
      if (mine.some((f) => f.hg == null)) continue;
      const q = T.groups.map((g) => g.slice().sort((a, b) => T.table[b].pts - T.table[a].pts || (T.table[b].gf - T.table[b].ga) - (T.table[a].gf - T.table[a].ga) || T.table[b].gf - T.table[a].gf).slice(0, 2));
      const pairs = []; for (let i = 0; i < q.length; i += 2) { pairs.push([q[i][0], q[i + 1][1]]); pairs.push([q[i + 1][0], q[i][1]]); }
      T.phase = 'ko'; T.ko.push(pairs.map(([h, a]) => addFix(G, { w: T.kw[0], comp: T.id, h, a, st: 'ko', r: 0 }).i));
      news(G, `🌍 ${T.name}: definidos os confrontos do mata-mata.`);
    } else if (T.phase === 'ko') {
      const r = T.ko.length - 1; const ties = T.ko[r].map((i) => G.nat.fix[i]);
      if (ties.some((f) => f.hg == null)) continue;
      const win = ties.map((f) => (f.hg > f.ag ? f.h : f.ag > f.hg ? f.a : f.pen[0] > f.pen[1] ? f.h : f.a));
      if (win.length === 1) { finishTour(G, T, win[0], ties[0].h === win[0] ? ties[0].a : ties[0].h); continue; }
      const pairs = []; for (let i = 0; i < win.length; i += 2) pairs.push([win[i], win[i + 1]]);
      T.ko.push(pairs.map(([h, a]) => addFix(G, { w: T.kw[r + 1], comp: T.id, h, a, st: 'ko', r: r + 1 }).i));
    }
  }
}
function finishTour(G, T, ch, ru) {
  T.champion = ch; T.runnerUp = ru; T.phase = 'done';
  const C = team(G, ch); C.titles.push({ y: G.year, c: T.name }); C.conf = clamp(C.conf + 25, 0, 100);
  news(G, `🏆 ${C.flag} ${C.name} é campeã da ${T.name}!`); tl(G, `🏆 ${C.name} campeã: ${T.name}`, 'titulo');
  G.nat.hist.push({ y: G.year, c: T.name, ch, ru });
  const w = T.id === 'WC' ? 25 : 12;
  if (G.me.nat && G.me.nat.code === ch) { G.me.titles.push({ y: G.year, c: T.name, club: C.name, w, nat: true }); G.me.rep = clamp(G.me.rep + (T.id === 'WC' ? 20 : 10), 1, 99); G.me.pop = clamp(G.me.pop + 15, 0, 100); G.me.xp += 120; msg(G, 'Federação', `🏆 Campeão! ${T.name}`, `Você levou ${C.name} ao título da ${T.name}! Seu nome entra para a história.`); tl(G, `🏆 ${G.me.name} conquista a ${T.name} com ${C.name}`, 'user'); }
  else if (C.coach?.id != null) { const k = G.coaches[C.coach.id]; if (k) { k.titles.push({ y: G.year, c: T.name, club: C.name, w }); k.rep = clamp(k.rep + w * 0.5, 3, 97); } }
}

// ---------------- semana: convocações, vagas, técnico do usuário ----------------
export function natWeek(G) {
  const me = G.me;
  if ([6, 12, 26, 34].includes(G.week) && G.nat.fix.some((f) => f.w === G.week + 1)) callUps(G, false);
  if (G.week === 37 && Object.keys(G.nat.tours).length) callUps(G, true);
  if (me.nat) { me.money += Math.round(me.nat.wage * 0.75); }
  // vagas
  G.nat.vac ||= [];
  for (const T of Object.values(G.nat.teams)) {
    const user = me.nat && me.nat.code === T.code;
    if (user || !T.coach) continue;
    if (T.conf < 18 && rnd() < 0.5) { const k = G.coaches[T.coach.id]; if (k) { k.natTeam = null; k.rep = clamp(k.rep - 4, 3, 97); } news(G, `🌍 ${T.flag} ${T.name} demite o técnico ${T.coach.n}.`); T.coach = null; G.nat.vac.push({ code: T.code, t: G.t }); }
  }
  for (const v of G.nat.vac.slice()) {
    const T = team(G, v.code);
    if (T.coach || (me.nat && me.nat.code === v.code)) { G.nat.vac = G.nat.vac.filter((x) => x !== v); continue; }
    const eff = me.rep + (me.pop || 0) / 10;
    if (!v.offered && eff >= T.rep - 22 && rnd() < 0.35) { v.offered = true; msg(G, `Federação (${T.name})`, `🌍 Convite: técnico da seleção ${T.flag} ${T.name}`, `A federação de ${T.name} quer você como técnico da seleção.\nSalário: ${money(natWage(T))}/semana. Você pode acumular com um clube.\nA proposta vale por 2 semanas.`, { kind: 'natjob', code: T.code, exp: G.t + 2 }); }
    if (G.t - v.t >= 4) { appointNatAI(G, T); G.nat.vac = G.nat.vac.filter((x) => x !== v); }
  }
  // usuário demitido pela federação
  if (me.nat) { const T = team(G, me.nat.code); if (T.conf < 14) natFire(G, 'A federação perdeu a confiança no seu trabalho.'); }
}
export const natWage = (T) => Math.round(coachWage(T.rep, 'BR', false) * 0.45 / 100) * 100;
export function takeNatJob(G, code) {
  const T = team(G, code);
  if (T.coach?.id != null) { const k = G.coaches[T.coach.id]; if (k) k.natTeam = null; }
  T.coach = { n: G.me.name, user: true }; T.conf = 65;
  G.me.nat = { code, since: G.year, wage: natWage(T), j: 0, v: 0, e: 0, d: 0 }; G.me.natSquad = autoSquad(G, code);
  G.nat.vac = (G.nat.vac || []).filter((v) => v.code !== code);
  news(G, `🌍 ${G.me.name} é o novo técnico da seleção ${T.flag} ${T.name}!`); tl(G, `${G.me.name} assume a seleção de ${T.name}`, 'user');
  (G.me.natHist ||= []).push({ code, from: G.year });
}
export function natFire(G, why) {
  const T = team(G, G.me.nat.code);
  msg(G, 'Federação', `Você deixou a seleção de ${T.name}`, why); news(G, `🌍 ${T.flag} ${T.name} demite ${G.me.name}.`);
  const h = (G.me.natHist || []).slice(-1)[0]; if (h) h.to = G.year;
  G.me.nat = null; T.coach = null; G.nat.vac.push({ code: T.code, t: G.t, offered: true }); G.me.rep = clamp(G.me.rep - 3, 1, 99);
}
export function natObjective(G, code) {
  const T = team(G, code); const y = G.year;
  if (G.nat.tours.WC?.teams.includes(code)) return T.rep >= 88 ? 'Ser campeão do mundo' : T.rep >= 78 ? 'Chegar às semifinais da Copa' : 'Passar da fase de grupos da Copa';
  if (G.nat.tours.CA?.teams.includes(code) || G.nat.tours.EU?.teams.includes(code)) return T.rep >= 88 ? 'Vencer o torneio continental' : 'Chegar à semifinal do torneio continental';
  if (cycleStart(y) != null) return `Classificar para a Copa (top ${CONFS[T.cf].spots} das ${CONFS[T.cf].n})`;
  return 'Fazer bons amistosos e montar a base para o próximo ciclo';
}
// fim de temporada: avalia classificação e torneios
export function natSeasonEnd(G) {
  const y = G.year;
  if (y % 4 === 1) { // fim do ciclo de eliminatórias
    const q = qualified(G, y - 2);
    news(G, `🌍 Classificados para a Copa ${y + 1}: ${q.map((c) => team(G, c).flag).join(' ')}`); tl(G, `Classificados para a Copa do Mundo ${y + 1}: ${q.map((c) => team(G, c).name).join(', ')}`, 'sel');
    for (const T of Object.values(G.nat.teams)) {
      const ok = q.includes(T.code); T.conf = clamp(T.conf + (ok ? 10 : T.rep >= 80 ? -40 : -20), 0, 100);
      if (G.me.nat && G.me.nat.code === T.code) msg(G, 'Federação', ok ? `✅ ${T.name} classificada para a Copa!` : `❌ ${T.name} fora da Copa`, ok ? 'Missão cumprida: estamos na Copa do Mundo!' : 'Não conseguimos a vaga. A federação vai avaliar seu futuro.');
    }
  }
  for (const Tour of Object.values(G.nat.tours)) for (const code of Tour.teams) {
    const T = team(G, code); const ko = G.nat.fix.filter((f) => f.comp === Tour.id && f.st === 'ko' && (f.h === code || f.a === code));
    const reached = code === Tour.champion ? 4 : ko.length; const want = T.rep >= 88 ? 3 : T.rep >= 78 ? 2 : 1;
    T.conf = clamp(T.conf + (reached - want) * 12, 0, 100);
  }
  for (const T of Object.values(G.nat.teams)) { T.rep = clamp(Math.round(T.rep * 0.9 + (T.pts / 16) * 0.1), 50, 97); }
  // aposentados virtuais repostos
  fillVirtual(G);
}
export function natSeasonAge(G) { for (const p of G.players) if (p && p.virt && p.age >= 34) { p.club = -2; p.ret = true; } }
