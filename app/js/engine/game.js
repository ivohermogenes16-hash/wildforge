import { LEAGUES, RESERVE } from '../data/leagues.js';
import { clamp, ri, rf, rnd, gauss, pick, shuffle, money } from '../util.js';
import { SEASON_WEEKS, TICKET, coachWage, playerWage, playerValue } from './econ.js';
import { createWorld, makePlayer, genName, buildU20, clubLevel, START_YEAR, newFin, initFinances, QUOTA } from './world.js';
import { setupSeason, progressComps, recordResult, standings, koWinner, CUPS, CONTS } from './season.js';
import { autoLineup, quickSim, penalties, validLineup, FORMATIONS, FITPOS } from './match.js';
import { aiTransferWeek, inWindow, anyWindow, windowInfo, expireContracts, playerInterest } from './market.js';
import { weeklyPersonal, ownClubWeek, ownSeasonEnd } from './career.js';
import { ensureBase, scoutWeek, baseBudget } from './youth.js';
import { migrate, appointAI, coachLeaves, aiCoachResult, coachChampion, titleWeight, lifeWeek, lifeSeasonEnd, seasonAwards, secondaryEnd, secondaryObjective, afterUserMatch, boardK, devMul, injMul, recovBonus, retiredToCoach, tl } from './life.js';
import { BOARD_TYPES } from './world.js';
import { initNations, natSetupYear, natSlot, natWeek, natSeasonEnd } from './nations.js';
import { marketWeek, loansSeasonEnd } from './market2.js';
import { TRAIN_FX, itrWeek, preseason } from './life.js';
import { initUniverse, universeWeek, universeSeasonEnd, youthBonus, rivalryEvent, fanMatch, fanTitle, rivalOfClub, blockedOffer, jobInfo, onLeaveClub, logUserTactic } from './universe.js';
import { initBiz, bizWeek, bizSeasonEnd, groupWeek, academyWeek, academySeason, scoutNetWeek, sponsorTitleBonus, conflictCheck } from './business.js';
import { coachOf, isDerby as derbyOf } from './life.js';

export function newGame(opts) {
  const G = { v: 1, year: START_YEAR, week: 0, slot: 0, t: 0, inbox: [], news: [], events: [], vac: [], short: [], seen: {}, qual: null };
  createWorld(G);
  G.me = {
    name: opts.name || 'Técnico', age: opts.age || 32, rep: opts.mode === 'livre' ? 45 : 12, money: opts.mode === 'livre' ? 150000 : 25000,
    job: null, hist: [], titles: [], stats: { j: 0, v: 0, e: 0, d: 0 }, inv: { cdi: 0, acoes: 0, imoveis: 0, imovelVal: 0 }, own: null, shares: {}, mode: opts.mode, apps: [], pressOn: true,
  };
  migrate(G);
  initNations(G);
  initUniverse(G); initBiz(G);
  setupSeason(G);
  natSetupYear(G);
  takeJob(G, opts.club, opts.mode !== 'livre', true);
  preseason(G);
  G.news.push({ t: 0, txt: `${G.me.name} assume o ${opts.mode !== 'livre' ? 'sub-20 do ' : ''}${G.clubs[opts.club].name}. Começa a temporada ${G.year}!` });
  welcome(G);
  return G;
}

function welcome(G) {
  const c = G.clubs[G.me.job.cid];
  msg(G, 'Diretoria', `Bem-vindo ao ${c.name}!`, G.me.job.youth
    ? `Você começa como técnico do Sub-20. Revele talentos, ganhe jogos e o futebol vai notar. Seu salário: ${money(G.me.job.wage)}/semana.\n\nDica: jogadores da base que se destacarem podem ser promovidos ao time principal (o técnico do profissional decide). Com o dinheiro que juntar, você pode até fundar seu próprio clube ou comprar uma SAF.`
    : `Objetivo da temporada: ${G.me.obj?.text || 'fazer uma boa campanha'}. Seu salário: ${money(G.me.job.wage)}/semana. Boa sorte!`);
}

export function msg(G, from, title, body, extra = {}) {
  G.inbox.unshift({ id: (G.inbox[0]?.id || 0) + 1, t: G.t, y: G.year, w: G.week, from, title, body, read: false, ...extra });
  if (G.inbox.length > 120) G.inbox.length = 120;
}
export function news(G, txt, cat = '') { G.news.unshift({ t: G.t, y: G.year, w: G.week, txt, cat }); if (G.news.length > 450) G.news.length = 450; }

export function myClub(G) { return G.me.job ? G.clubs[G.me.job.cid] : null; }
export function myCompIds(G) { return G.me.job?.youth ? ['U20'] : null; }

export function isUserFix(G, f) {
  const j = G.me.job; if (!j) return false;
  if (f.h !== j.cid && f.a !== j.cid) return false;
  return j.youth ? f.c === 'U20' : f.c !== 'U20' && f.c !== 'U17';
}
export function userFixNow(G) { return G.fix.find((f) => f.w === G.week && f.s === G.slot && f.hg == null && isUserFix(G, f)); }
export function nextUserFix(G) {
  return G.fix.filter((f) => f.hg == null && isUserFix(G, f)).sort((a, b) => a.w - b.w || a.s - b.s)[0];
}

export function strength(G, cid, youth) {
  const ov = G.players.filter((p) => p && p.club === cid && !!p.u20 === !!youth && p.inj <= 0).map((p) => p.ovr).sort((a, b) => b - a).slice(0, 13);
  return ov.length ? ov.reduce((s, x) => s + x, 0) / ov.length : 40;
}

export function takeJob(G, cid, youth, first, opts = {}) {
  const c = G.clubs[cid];
  const old = G.me.job;
  if (old && !old.youth && old.cid !== cid) { const oc = G.clubs[old.cid]; oc.coach = null; appointAI(G, oc); oc.lineup = null; }
  if (old) { const h = G.me.hist[G.me.hist.length - 1]; if (h && h.to == null) h.to = G.week; }
  if (old && !old.youth && old.cid !== cid) { onLeaveClub(G, old.cid, old.until > G.year + 0 && G.week > 2); const oc = G.clubs[old.cid]; for (const s of Object.values(oc.staff || {})) if (s.q >= 9) (G.me.exStaff ||= []).push({ n: s.n, q: s.q }); }
  G.me.job = { cid, youth, wage: opts.wage ?? coachWage(c.rep, c.country, youth), since: G.t, until: G.year + (opts.years ?? (first ? 2 : 2)), tbon: opts.tbon || 0, pbon: opts.pbon || 0, tb: opts.tb || 0, objAdj: opts.objAdj || 0 };
  if (!youth && c.coach && !c.coach.user) coachLeaves(G, c, 'replaced');
  ensureBase(G, cid); G.me.scout = null; G.me.u20lineup = null;
  if (!youth) { c.coach = { n: G.me.name, rep: G.me.rep, user: true }; c.board.conf = 65; c.lineup = null; }
  G.vac = G.vac.filter((v) => !(v.cid === cid && !!v.youth === !!youth));
  G.me.hist.push({ y: G.year, cid, name: c.name, youth, from: G.week, j: 0, v: 0, e: 0, d: 0, gf: 0, ga: 0 });
  if (G.me.car && !G.me.car.countries.includes(c.country)) G.me.car.countries.push(c.country);
  setObjective(G);
  if (!first) news(G, `${G.me.name} é o novo técnico ${youth ? 'do sub-20 ' : ''}do ${c.name}.`);
}

export function setObjective(G) {
  const j = G.me.job; if (!j) return;
  const c = G.clubs[j.cid];
  const compId = j.youth ? 'U20' : c.league;
  const comp = G.comps[compId]; if (!comp) { G.me.obj = { text: 'Fazer uma boa campanha', pos: 5, comp: compId }; return; }
  const group = comp.groups.find((g) => g.includes(c.id)) || comp.clubs;
  const ranks = group.slice().sort((a, b) => strength(G, b, j.youth) - strength(G, a, j.youth));
  const r = ranks.indexOf(c.id) + 1, n = group.length;
  let text, pos;
  if (comp.kind === 'amateur') { pos = 1; text = 'Ser campeão e subir para a Série D'; }
  else if (comp.format === 'groups6') { pos = r <= 2 ? 1 : 3; text = r <= 2 ? 'Passar de fase e brigar pelo acesso' : 'Passar da fase de grupos'; }
  else if (r === 1) { pos = 1; text = 'Ser campeão'; }
  else if (comp.up && r <= comp.up + 2) { pos = comp.up; text = `Conseguir o acesso (top ${comp.up})`; }
  else if (r <= Math.ceil(n * 0.25)) { pos = Math.ceil(n * 0.25); text = `Terminar entre os ${pos} primeiros`; }
  else if (r <= Math.ceil(n * 0.6)) { pos = Math.ceil(n * 0.55); text = 'Fazer campanha de meio de tabela'; }
  else { pos = n - (comp.down || 2); text = 'Evitar o rebaixamento'; }
  if (!j.youth && c.board.type === 'ambiciosa' && pos > 1) { pos = Math.max(1, pos - 2); text = pos === 1 ? 'Ser campeão' : `Terminar entre os ${pos} primeiros`; }
  if (j.objAdj) { pos = clamp(pos + j.objAdj, 1, n); text = pos === 1 ? 'Ser campeão' : `Terminar entre os ${pos} primeiros`; }
  G.me.obj = { text, pos, comp: compId, n };
  secondaryObjective(G);
}

// ---------------- Rodada ----------------
function buildIndex(G) {
  const idx = new Map();
  for (const p of G.players) { if (!p || p.club < 0) continue; let e = idx.get(p.club); if (!e) idx.set(p.club, (e = { s: [], y: [] })); (p.u20 ? e.y : e.s).push(p); }
  G._idx = idx;
}

export function lineupFor(G, club, youth) {
  if (!youth && club.lineup && G.me.job && !G.me.job.youth && G.me.job.cid === club.id && validLineup(G, club, club.lineup, false)) return club.lineup;
  if (youth && G.me.job?.youth && G.me.job.cid === club.id && G.me.u20lineup && validLineup(G, { ...club, tact: G.me.u20tact || club.tact }, G.me.u20lineup, true)) return G.me.u20lineup;
  const tact = youth && G.me.job?.youth && G.me.job.cid === club.id ? (G.me.u20tact || club.tact) : club.tact;
  return autoLineup(G, { ...club, tact }, youth);
}

export function u17Pool(G, cid) { return G.players.filter((p) => p && p.club === cid && p.u17); }
export function u17Lineup(G, club) { return autoLineup(G, { ...club, tact: G.me.job?.cid === club.id ? (G.me.u17tact || club.tact) : club.tact }, true, true, u17Pool(G, club.id)); }
export function playSlot(G, userRes) {
  buildIndex(G);
  G.events = [];
  if (G.nat) natSlot(G);
  const fixes = G.fix.filter((f) => f.w === G.week && f.s === G.slot && f.hg == null);
  for (const f of fixes) {
    const youth = f.c === 'U20' || f.c === 'U17';
    const hc = G.clubs[f.h], ac = G.clubs[f.a];
    let res;
    if (userRes && isUserFix(G, f)) res = userRes;
    else {
      const hl = f.c === 'U17' ? u17Lineup(G, hc) : lineupFor(G, hc, youth), al = f.c === 'U17' ? u17Lineup(G, ac) : lineupFor(G, ac, youth);
      const comp = G.comps[f.c];
      res = quickSim(G, f, hc, ac, hl.xi, al.xi, { neutral: comp.kind === 'cont' && f.ko === comp.koWeeks.length - 1 });
      res.xi = [hl.xi, al.xi]; res.played = [new Set(hl.xi), new Set(al.xi)];
    }
    applyMatch(G, f, res);
  }
  progressComps(G);
  for (const e of G.events) onEvent(G, e);
  recoverHalf(G);
  G.slot++;
  if (G.slot > 1) { G.slot = 0; endWeek(G); G.week++; G.t++; }
  if (G.week >= SEASON_WEEKS) endSeason(G);
  G._idx = null;
}

function applyMatch(G, f, res) {
  f.hg = res.hg; f.ag = res.ag;
  const comp = G.comps[f.c];
  if (f.ko >= 0 && f.hg === f.ag) f.pen = res.pen || penalties();
  if (f.c === 'U17') for (const s of [0, 1]) for (const id of (res.played?.[s] || [])) { const p = G.players[id]; if (p) p.j17 = (p.j17 || 0) + 1; }
  f.ev = res.ev.filter((e) => e.t === 'gol' || e.t === 'ver').map((e) => [e.m, e.t === 'gol' ? 0 : 1, e.side, e.p]);
  recordResult(G, f);
  const clubs = [G.clubs[f.h], G.clubs[f.a]];
  const youth = f.c === 'U20' || f.c === 'U17';
  // suspensões cumpridas
  for (const c of clubs) { const sq = G._idx?.get(c.id); if (sq) for (const p of (youth ? sq.y : sq.s)) if (p.sus > 0) p.sus--; }
  const played = res.played || [new Set(res.xi?.[0] || []), new Set(res.xi?.[1] || [])];
  const ratingsOut = {};
  for (let side = 0; side < 2; side++) {
    const gf = side ? f.ag : f.hg, ga = side ? f.hg : f.ag;
    const won = gf > ga, lost = gf < ga;
    const xi0 = new Set(res.xi?.[side] || []); const hasSub = (res.ev || []).some((e) => e.t === 'sub');
    for (const id of played[side]) {
      const p = G.players[id]; if (!p) continue;
      p.st.j++; p.tot.j++;
      // desgaste proporcional aos minutos jogados, posição e idade
      let mins = 90; const si = (res.ev || []).find((e) => e.t === 'sub' && e.p === +id), so = (res.ev || []).find((e) => e.t === 'sub' && e.o === +id);
      if (si) mins = 90 - si.m; if (so) mins = Math.min(mins, so.m - (si ? si.m : 0)); if (!hasSub && !res.played) mins = 82;
      if (youth) mins *= 0.85;
      p.fit = res.en && res.en[id] != null ? Math.max(25, Math.round(Math.min(p.fit, res.en[id] + (youth ? 3 : 0)))) : Math.max(25, p.fit - fitCost(p, mins));
      if (p.fit < 62 && rnd() < (62 - p.fit) * 0.004) p.inj = Math.max(p.inj, ri(1, 3)); // músculo cansado se lesiona mais
      p.mor = clamp(p.mor + (won ? 4 : lost ? -4 : 0), 5, 100);
      p.playedW = (p.playedW || 0) + 1;
      let nota = 6.2 + (won ? 0.4 : lost ? -0.35 : 0) + gauss() * 0.45;
      if (['GOL', 'ZAG', 'LD', 'LE'].includes(p.pos)) nota += ga === 0 ? 0.6 : -0.12 * ga;
      ratingsOut[id] = nota;
    }
  }
  for (const e of res.ev) {
    const p = G.players[e.p]; if (!p) continue;
    if (e.t === 'gol') { p.st.g++; p.tot.g++; ratingsOut[e.p] = (ratingsOut[e.p] || 6.3) + 1.1; if (e.as >= 0 && G.players[e.as]) { G.players[e.as].st.a++; ratingsOut[e.as] = (ratingsOut[e.as] || 6.3) + 0.6; } }
    else if (e.t === 'am') { p.st.y++; p.yc++; if (p.yc >= 3) { p.sus = Math.max(p.sus, 1); p.yc = 0; } ratingsOut[e.p] = (ratingsOut[e.p] || 6) - 0.25; }
    else if (e.t === 'ver') { p.st.r++; p.sus = Math.max(p.sus, ri(1, 2)); ratingsOut[e.p] = (ratingsOut[e.p] || 6) - 1.2; }
    else if (e.t === 'les') { p.inj = Math.max(p.inj, Math.max(1, Math.round((ri(1, 6) + (rnd() < 0.12 ? ri(4, 12) : 0)) * injMul(G.clubs[p.club])))); }
  }
  for (const [id, n] of Object.entries(ratingsOut)) { const p = G.players[id]; if (p) p.st.ns += clamp(n, 3, 10); }
  f.notas = isUserFix(G, f) ? Object.fromEntries(Object.entries(ratingsOut).map(([k, v]) => [k, Math.round(clamp(v, 3, 10) * 10) / 10])) : undefined;
  f.stats = res.stats;
  // bilheteria
  const hc = clubs[0];
  if (!youth && comp.kind !== 'amateur' && !hc.closed) {
    const occ = clamp(0.3 + hc.rep / 170 + (G.clubs[f.a].rep > 75 ? 0.12 : 0) + (f.ko >= 0 ? 0.1 : 0), 0.15, 1);
    const inc = Math.round(hc.cap * 1000 * occ * (hc.price ?? TICKET[hc.country] ?? 20) * (comp.kind === 'cont' ? 1.6 : 1));
    hc.money += inc; hc.fin.tick += inc;
  }
  // técnico (usuário)
  if (isUserFix(G, f)) userAfterMatch(G, f, res);
  else if (!youth) aiCoachAfter(G, f);
}

function userAfterMatch(G, f, res) {
  const j = G.me.job; const side = f.h === j.cid ? 0 : 1;
  const gf = side ? f.ag : f.hg, ga = side ? f.hg : f.ag;
  const my = G.clubs[j.cid], op = G.clubs[side ? f.h : f.a];
  const s = G.me.stats; s.j++;
  let pts;
  if (gf > ga || (f.pen && koWinner(f) === j.cid)) { s.v += gf > ga ? 1 : 0; s.e += gf > ga ? 0 : 1; pts = gf > ga ? 3 : 1.5; }
  else if (gf === ga) { s.e++; pts = 1; } else { s.d++; pts = 0; }
  if (gf === ga && f.pen) { /* já contado */ }
  const mS = strength(G, my.id, j.youth), oS = strength(G, op.id, j.youth);
  const exp = clamp(1.4 + (mS - oS) / 9 + (side === 0 ? 0.2 : -0.2), 0.3, 2.6);
  const k = j.youth ? 0.6 : 1;
  G.me.rep = clamp(G.me.rep + (pts - exp) * 0.18 * k + (pts === 3 ? (j.youth ? 0.3 : 0.05) : 0) * (op.rep / 60), 1, 99);
  if (!j.youth) {
    my.board.conf = clamp(my.board.conf + (pts - exp) * 3.2 * boardK(my), 0, 100);
    if (my.coach) my.coach.rep = G.me.rep;
  }
  afterUserMatch(G, f, res, pts >= 1.5 && gf >= ga, pts === 0);
  matchHeadline(G, f, res, my, op, gf, ga);
  if (!j.youth) {
    const k = coachOf(G, op); const derby = derbyOf(G, my.id, op.id); const riv = rivalOfClub(G, op);
    fanMatch(G, my, gf, ga, op, derby || riv > 0 || f.ko >= 0);
    if (k) { if (derby) rivalryEvent(G, k.id, 1, `Clássico ${my.name} x ${op.name}`); if (f.ko >= 0 && comp0(G, f).kind !== 'league') rivalryEvent(G, k.id, 1, `Mata-mata decisivo em ${comp0(G, f).short}`); if (Math.abs(gf - ga) >= 4) rivalryEvent(G, k.id, 2, `Goleada ${gf > ga ? 'aplicada' : 'sofrida'} (${gf}–${ga})`); }
    if (riv > 0) { G.me.pop = clamp((G.me.pop || 0) + (gf > ga ? 1.5 : gf < ga ? -1.5 : 0), 0, 100); if (gf !== ga) news(G, `⚔️ ${gf > ga ? G.me.name + ' vence' : k.n + ' leva a melhor sobre'} o duelo de rivais: ${my.name} ${gf}–${ga} ${op.name}.`, 'tec'); }
    logUserTactic(G, my.tact);
  }
}

const comp0 = (G, f) => G.comps[f.c] || {};
export function fitCost(p, mins) { const ag = p.age >= 33 ? 1.3 : p.age >= 30 ? 1.15 : p.age <= 21 ? 0.92 : 1; return Math.round((FITPOS[p.pos] || 24) * ag * Math.min(120, mins) / 90 + (rnd() * 6 - 3)); }
// recuperação a cada meia semana (entre um jogo e outro)
function recoverHalf(G) {
  const job = G.me.job; const club = job ? G.clubs[job.cid] : null;
  for (const p of G.players) {
    if (!p || p.fit >= 100) continue;
    const isMine = job && p.club === job.cid && !!p.u20 === !!job.youth;
    const tr = isMine ? (p.u20 ? G.me.u20train || club.train : club.train) : { foco: 'equilibrado', int: 1 };
    const ag = p.age >= 33 ? 0.78 : p.age >= 30 ? 0.88 : p.age <= 22 ? 1.1 : 1;
    const base = [12, 9.5, 7][tr.int] ?? 9.5;
    p.fit = Math.min(100, p.fit + (base + (isMine ? (recovBonus(G, club) + (TRAIN_FX[tr.foco]?.rec || 0)) / 2 : 0)) * ag * (p.inj > 0 ? 0.6 : 1));
  }
}
function matchHeadline(G, f, res, my, op, gf, ga) {
  const sc = {}; for (const e of res.ev || res.events || []) if (e.t === 'gol' && G.players[e.p]?.club === my.id) sc[e.p] = (sc[e.p] || 0) + 1;
  const top = Object.entries(sc).sort((a, b) => b[1] - a[1])[0]; const hero = top ? G.players[top[0]] : null;
  const cp = comp0(G, f).short || comp0(G, f).name || ''; const pl = `${my.name} ${gf}–${ga} ${op.name}`;
  const d = gf - ga; let t;
  if (d >= 3) t = pick([`⚽ Show! ${my.name} atropela o ${op.name}`, `⚽ Goleada: ${my.name} não dá chances ao ${op.name}`]);
  else if (d > 0) t = pick([`⚽ ${my.name} vence o ${op.name}`, `⚽ Vitória do ${my.name} sobre o ${op.name}`, `⚽ ${G.me.name} comemora: ${my.name} bate o ${op.name}`]);
  else if (d === 0) t = pick([`⚽ ${my.name} e ${op.name} ficam no empate`, `⚽ Empate entre ${my.name} e ${op.name}`]);
  else if (d <= -3) t = pick([`⚽ Vexame: ${my.name} é goleado pelo ${op.name}`, `⚽ Noite para esquecer: ${op.name} passa por cima do ${my.name}`]);
  else t = pick([`⚽ ${my.name} perde para o ${op.name}`, `⚽ Tropeço: ${op.name} derrota o ${my.name}`]);
  t += ` (${pl}${cp ? ', ' + cp : ''})` + (hero && d >= 0 ? `. ${hero.n} ${top[1] >= 3 ? 'faz hat-trick' : top[1] === 2 ? 'marca duas vezes' : 'marca'}${d > 0 ? ' e decide' : ''}.` : '.');
  news(G, t, 'jogo'); if (G.news[0]) { G.news[0].cl = [my.id, op.id]; G.news[0].mine = 1; }
}
function aiCoachAfter(G, f) {
  for (const [cid, gf, ga] of [[f.h, f.hg, f.ag], [f.a, f.ag, f.hg]]) {
    const c = G.clubs[cid]; if (c.coach?.user) continue;
    c.board.conf = clamp(c.board.conf + (gf > ga ? 2.5 : gf === ga ? -0.3 : -3) * boardK(c), 0, 100);
    aiCoachResult(G, c, gf, ga, G.clubs[cid === f.h ? f.a : f.h]);
  }
}

function onEvent(G, e) {
  if (e.t !== 'champion') return;
  const comp = G.comps[e.c]; const c = G.clubs[e.club];
  c.troph.push({ y: G.year, c: comp.name });
  news(G, `🏆 ${c.name} é campeão: ${comp.name} ${G.year}!`);
  const prize = comp.prize || (comp.kind === 'league' ? (comp.tv || 1e6) * 0.25 : comp.kind === 'youth' ? 300000 : 100000);
  c.money += prize; c.fin.prize += prize;
  if (comp.runnerUp != null) { const r = G.clubs[comp.runnerUp]; r.money += prize * 0.45; r.fin.prize += prize * 0.45; }
  const j = G.me.job;
  const userWon = j && j.cid === e.club && (j.youth ? comp.id === 'U20' : comp.kind !== 'youth');
  if (comp.kind !== 'youth') sponsorTitleBonus(G, c);
  if (userWon && !j.youth) { fanTitle(G, c); if (j.tbon) { G.me.money += j.tbon; msg(G, 'Diretoria', '💰 Bônus por título', `Bônus contratual de ${money(j.tbon)} pago pelo título.`); } }
  if (comp.id === 'U17' && j && j.cid === e.club) { c.yb = (c.yb || 0) + 150000; G.me.pop = clamp((G.me.pop || 0) + 2, 0, 100); msg(G, 'Base', '🏆 Sub-17 campeão!', `A Sub-17 do ${c.name} conquistou o ${comp.name}! O orçamento da base ganhou R$ 150 mil e os garotos ficam mais valorizados.`); for (const p of u17Pool(G, c.id)) p.mor = clamp(p.mor + 10, 0, 100); }
  if (!userWon && comp.kind !== 'youth') coachChampion(G, c, comp);
  if (userWon) {
    G.me.titles.push({ y: G.year, c: comp.name, club: c.name, w: titleWeight(comp) }); G.me.xp = (G.me.xp || 0) + 40 + titleWeight(comp) * 3; G.me.pop = clamp((G.me.pop || 0) + 6, 0, 100); c.fans = clamp((c.fans || 50) + 8, 0, 100);
    tl(G, `🏆 ${G.me.name} conquista ${comp.name} com o ${c.name}`, 'user');
    const boost = comp.kind === 'cont' ? 15 : comp.kind === 'youth' ? 8 : comp.kind === 'cup' ? 6 : comp.tier === 1 ? 12 : comp.kind === 'amateur' ? 4 : 6;
    G.me.rep = clamp(G.me.rep + boost, 1, 99);
    if (!j.youth) c.board.conf = clamp(c.board.conf + 25, 0, 100);
    msg(G, 'Imprensa', `🏆 Campeão! ${comp.name}`, `Você conquistou ${comp.name} com o ${c.name}! Sua reputação subiu para ${Math.round(G.me.rep)}.`);
  }
}

// ---------------- Semana ----------------
function endWeek(G) {
  const wages = new Map();
  for (const p of G.players) { if (!p || p.club < 0) continue; if (p.loan) { const sh = p.loan.share ?? 1; wages.set(p.club, (wages.get(p.club) || 0) + p.wage * sh); wages.set(p.loan.from, (wages.get(p.loan.from) || 0) + p.wage * (1 - sh)); } else wages.set(p.club, (wages.get(p.club) || 0) + p.wage); }
  for (const c of G.clubs) {
    if (!c.league) continue;
    const comp = G.comps[c.league];
    const tv = (comp?.tv || 30000) * (0.55 + 0.9 * c.rep / 100) / SEASON_WEEKS;
    const sp = (c.spon || 0) / SEASON_WEEKS;
    const w = (wages.get(c.id) || 0) + (c.coach?.user ? G.me.job.wage : coachWage(c.rep, c.country, false));
    c.money += tv + sp - w; c.fin.tv += tv; c.fin.spon += sp; c.fin.wages += w;
    // clubes muito ricos investem em estrutura (evita acúmulo infinito)
    const cap = w * 52 * 1.5 + 5e6;
    if (c.money > cap && c.own.user < 51) { const x = (c.money - cap) * 0.02; c.money -= x; c.fin.other += x; }
  }
  const train = G.me.job ? G.clubs[G.me.job.cid].train : null;
  for (const p of G.players) {
    if (!p) continue;
    if (p.inj > 0) p.inj--;
    const club = G.clubs[p.club];
    const isMine = G.me.job && p.club === G.me.job.cid && !!p.u20 === !!G.me.job.youth;
    const tr = isMine ? (p.u20 ? G.me.u20train || club.train : train) : { foco: 'equilibrado', int: 1 };
    p.mor += (65 - p.mor) * 0.06;
    if (!p.playedW && p.ovr >= 70 && club && !p.u20) p.mor -= 0.6;
    p.playedW = 0;
    const im = isMine ? itrWeek(G, p) : 1;
    // evolução
    // evolução: mais lenta conforme a idade e o nível; teto de ganho por temporada
    const capS = (p.age <= 18 ? 8 : p.age <= 20 ? 6 : p.age <= 23 ? 4 : p.age <= 26 ? 3 : 2) - (p.ovr >= 85 ? 2 : p.ovr >= 78 ? 1 : 0);
    if (p.club >= 0 && p.ovr < p.pot && p.ovr - (p.s0 ?? p.ovr) < Math.max(1, capS)) {
      const ageF = (p.age <= 18 ? 0.0045 : p.age <= 20 ? 0.004 : p.age <= 23 ? 0.004 : p.age <= 27 ? 0.002 : 0.0007) * (p.ovr >= 85 ? 0.4 : p.ovr >= 80 ? 0.55 : p.ovr >= 75 ? 0.7 : p.ovr >= 68 ? 0.85 : 1);
      const TF = TRAIN_FX[tr.foco] || {}; const fe = (TF.ev || 1) * (TF.young ? (p.age <= 21 ? TF.young : TF.old) : 1) * im;
      p.prog += (p.pot - p.ovr) * ageF * [0.75, 1, 1.25][tr.int] * fe * (p.st.j > 2 ? 1.15 : 0.9) * rf(0.5, 1.5) * devMul(G, p, club);
      while (p.prog >= 1 && p.ovr < p.pot && p.ovr - (p.s0 ?? p.ovr) < Math.max(1, capS)) { p.ovr++; p.prog -= 1; p.up = G.t; if (G.me.job && p.club === G.me.job.cid) { (G.me.dev ||= []).unshift({ t: G.t, y: G.year, w: G.week, pid: p.id, o: p.ovr }); if (G.me.dev.length > 60) G.me.dev.length = 60; } }
    }
    if (isMine && tr.int === 2 && p.itr !== 'fis' && rnd() < 0.004 * injMul(club)) p.inj = Math.max(p.inj, ri(1, 3));
  }
  { // avisos da janela do país do usuário
    const cn = G.me.job ? G.clubs[G.me.job.cid]?.country : null;
    if (cn && !G.me.job.youth) { const o = inWindow(G), wi = windowInfo(G);
      if (o && !G._winWas) news(G, `🟢 Abriu a janela de transferências: o mercado vai até ${wi.until}.`, 'mercado');
      if (!o && G._winWas) news(G, `🔴 Fechou a janela de transferências. Reabre em ${wi.next}.`, 'mercado');
      if (o && wi.left === 1) msg(G, 'Diretoria', '⏰ Última semana de mercado', `A janela fecha em ${wi.until}. Se ainda precisa de reforços ou quer vender alguém, é agora.`);
      G._winWas = o; }
  }
  if (anyWindow(G)) aiTransferWeek(G);
  else if (rnd() < 0.15) aiTransferWeek(G, true);
  playerInterest(G);
  coachMarket(G);
  boardCheck(G);
  weeklyPersonal(G);
  scoutWeek(G);
  ownClubWeek(G);
  lifeWeek(G);
  universeWeek(G); bizWeek(G); groupWeek(G); academyWeek(G); scoutNetWeek(G);
  if (G.nat) natWeek(G);
  marketWeek(G);
  // ofertas expiram
  for (const m of G.inbox) if (m.exp != null && m.exp < G.t && !m.done) { m.done = true; m.expired = true; }
}

function coachMarket(G) {
  // demissões da IA
  if ([10, 18, 26, 34].includes(G.week)) {
    for (const L of LEAGUES) {
      const comp = G.comps[L.id]; if (!comp || comp.phase !== 'rr') continue;
      const tab = standings(G, comp, 0); const n = tab.length;
      tab.forEach((cid, i) => {
        const c = G.clubs[cid]; if (c.coach?.user || !c.coach) return;
        const bad = i >= n - Math.max(3, comp.down || 2) || c.board.conf < 25;
        if (bad && rnd() < 0.45) {
          news(G, `❌ ${c.name} demite o técnico ${c.coach.n}.`, 'tec');
          coachLeaves(G, c, 'fired'); c.board.conf = 55; G.vac.push({ cid, youth: false, t: G.t });
        }
      });
    }
  }
  // vagas preenchidas pela IA
  for (const v of G.vac.slice()) {
    if (G.t - v.t >= 3 && rnd() < 0.5) {
      const c = G.clubs[v.cid];
      if (!v.youth && !c.coach) appointAI(G, c);
      G.vac = G.vac.filter((x) => x !== v);
    }
  }
  // vagas de sub-20 aparecem às vezes
  if (rnd() < 0.08) { const cs = G.clubs.filter((c) => c.league === 'BRA' && !(G.me.job?.youth && G.me.job.cid === c.id)); const c = pick(cs); if (c && !G.vac.some((v) => v.cid === c.id && v.youth)) G.vac.push({ cid: c.id, youth: true, t: G.t }); }
  // ofertas para o usuário
  const me = G.me;
  let sent = 0;
  for (const v of shuffle(G.vac.slice())) {
    if (v.offered || sent >= 1) continue;
    const c = G.clubs[v.cid];
    if (!c.league) { v.offered = true; continue; }
    if (me.job && me.job.cid === v.cid && !v.youth && !me.job.youth) continue;
    const mineSenior = me.job?.youth && me.job.cid === v.cid && !v.youth;
    const lim = mineSenior ? 30 : me.job ? 12 : 18;
    if (v.youth && me.job && !me.job.youth) continue;
    if (blockedOffer(G, c)) continue;
    const effRep = me.rep + (me.pop || 0) / 12;
    if (c.rep > effRep + lim || c.rep < effRep - 40) continue;
    const pr = mineSenior ? 0.6 : v.youth ? 0.12 : 0.22;
    if (rnd() < pr) {
      v.offered = true; sent++;
      const wage = coachWage(c.rep, c.country, v.youth);
      const J = jobInfo(G, c.id); const st = ['', 'muito fácil', 'fácil', 'equilibrado', 'difícil', 'muito difícil'][J.diff];
      msg(G, c.name, `Proposta de emprego: ${c.name}${v.youth ? ' (Sub-20)' : ''}`, `O ${c.name} (${G.comps[c.league]?.short || 'sem liga'}) quer você como técnico${v.youth ? ' do sub-20' : ''}.\nSalário: ${money(wage)}/semana · contrato de ${J.project ? 3 : 2} anos.\n\n🎯 Expectativa: ${J.idt.expect}\n📊 Elenco: ${J.rank}º mais forte de ${J.n}${J.pos ? ` · posição atual: ${J.pos}º` : ''}\n💰 Finanças: ${J.idt.fin} · verba para contratações ~${money(J.budget)}\n🏟️ Estrutura: CT ${J.infra.ct || 2}, base ${J.infra.base || 2}, médico ${J.infra.med || 2}\n📣 Torcida: ${Math.round(J.fans ?? 50)}% satisfeita · diretoria ${c.board.type}\n⚖️ Dificuldade do projeto: ${st}${J.project ? `\n🌱 ${J.project}` : ''}\n\nNa negociação você pode pedir salário, anos, bônus por título e por meta, verba e ajustar a meta.\nA proposta vale por 2 semanas.`, { kind: 'job', cid: v.cid, youth: !!v.youth, exp: G.t + 2 });
    }
  }
}

function boardCheck(G) {
  const j = G.me.job; if (!j || j.youth) return;
  const c = G.clubs[j.cid];
  const bt = BOARD_TYPES[c.board.type] || { fire: 12 };
  if (G.t - j.since < (c.board.type === 'impaciente' ? 4 : 6)) return;
  if (c.own.user >= 51) return; // dono não se demite
  if (c.board.conf < bt.fire) fireUser(G, `A diretoria (${bt.n?.toLowerCase() || ''}) perdeu a confiança no seu trabalho.`);
  else if (c.board.conf < 25 && !G.me.warned) { G.me.warned = true; msg(G, 'Diretoria', '⚠️ Aviso da diretoria', 'Os resultados não estão bons. Se não melhorar logo, você será demitido.'); }
  if (c.board.conf > 40) G.me.warned = false;
}

export function fireUser(G, why) {
  const c = G.clubs[G.me.job.cid];
  const left = Math.max(0, (G.me.job.until ?? G.year) - G.year) * 46 + (46 - G.week);
  const fine = Math.round(G.me.job.wage * Math.max(8, left * 0.5));
  msg(G, 'Diretoria', `Você foi demitido do ${c.name}`, `${why}\nPela rescisão do contrato (até ${G.me.job.until ?? G.year}) você recebe ${money(fine)}. Procure uma nova vaga na aba Carreira.`);
  news(G, `❌ ${c.name} demite ${G.me.name}.`, 'tec');
  G.me.money += fine;
  G.me.rep = clamp(G.me.rep - 4, 1, 99);
  c.coach = null; c.lineup = null; G.vac.push({ cid: c.id, youth: false, t: G.t, offered: true });
  G.me.hist[G.me.hist.length - 1].to = G.week; G.me.hist[G.me.hist.length - 1].fired = true;
  G.me.pp = clamp((G.me.pp || 0) + 10, 0, 100);
  tl(G, `${G.me.name} é demitido do ${c.name}`, 'user');
  G.me.job = null;
}

export function resign(G) {
  const c = G.clubs[G.me.job.cid];
  news(G, `${G.me.name} pede demissão do ${c.name}.`);
  if (!G.me.job.youth) { c.coach = null; G.vac.push({ cid: c.id, youth: false, t: G.t, offered: true }); }
  G.me.hist[G.me.hist.length - 1].to = G.week;
  G.me.job = null; G.me.rep = clamp(G.me.rep - 1.5, 1, 99);
}

const PRESS = [
  { q: 'O time vem de uma sequência {f}. Qual sua avaliação?', a: [['Confio no grupo, vamos crescer.', 2, 0, 0], ['Precisamos de mais entrega de alguns jogadores.', -4, 2, 0.3], ['A responsabilidade é minha.', 1, 1, 0.2]] },
  { q: 'A torcida pede reforços. A diretoria vai investir?', a: [['Estamos atentos ao mercado.', 0, 1, 0], ['Precisamos de reforços urgentemente!', -2, -3, 0.2], ['Confio no elenco que tenho.', 3, 0, 0]] },
  { q: 'Como você vê o próximo adversário?', a: [['Respeito muito, mas vamos para vencer.', 1, 0, 0.1], ['Somos favoritos.', 2, -1, 0.4], ['Jogo duríssimo, temos que ter cuidado.', -1, 1, 0]] },
  { q: 'Há rumores de que você pode deixar o clube. É verdade?', a: [['Estou 100% focado aqui.', 1, 3, 0], ['No futebol tudo pode acontecer.', -1, -4, 0.3], ['Sem comentários.', 0, -1, 0]] },
];
function pressEvent(G) {
  const c = myClub(G); const comp = G.comps[c.league]; const f = comp?.table[c.id]?.form || '';
  const P = pick(PRESS);
  msg(G, 'Imprensa', '🎤 Entrevista coletiva', P.q.replace('{f}', f.endsWith('VV') ? 'boa' : f.endsWith('DD') ? 'ruim' : 'irregular'), { kind: 'press', ans: P.a });
}
export function answerPress(G, m, i) {
  const [, mor, conf, rep] = m.ans[i];
  const c = myClub(G); if (!c) return;
  for (const p of G.players) if (p && p.club === c.id && !p.u20) p.mor = clamp(p.mor + mor, 5, 100);
  c.board.conf = clamp(c.board.conf + conf, 0, 100); G.me.rep = clamp(G.me.rep + rep, 1, 99);
  m.done = true; m.choice = i;
}

// ---------------- Fim de temporada ----------------
function endSeason(G) {
  const me = G.me; const y = G.year;
  // avaliação do usuário
  if (me.job) {
    const c = G.clubs[me.job.cid]; const comp = G.comps[me.obj?.comp];
    if (comp && comp.kind !== 'cont') {
      const gi = comp.groups.findIndex((g) => g.includes(c.id));
      const pos = standings(G, comp, Math.max(0, gi)).indexOf(c.id) + 1;
      const diff = (me.obj.pos - pos);
      me.hist[me.hist.length - 1].pos = pos;
      if (!me.job.youth) c.board.conf = clamp(c.board.conf + diff * 4 + 10, 0, 100);
      me.rep = clamp(me.rep + diff * 0.6 + (pos <= me.obj.pos ? 3 : 0), 1, 99);
      me.season = { y, pos, obj: me.obj.text, ok: pos <= me.obj.pos };
      if (pos <= me.obj.pos && me.job.pbon) { me.money += me.job.pbon; msg(G, 'Diretoria', '💰 Bônus por meta', `Meta cumprida! Bônus de ${money(me.job.pbon)}.`); }
    }
  }
  // premiação por posição
  for (const L of LEAGUES) {
    const comp = G.comps[L.id]; if (!comp) continue;
    comp.groups.forEach((g, gi) => standings(G, comp, gi).forEach((cid, i) => { const c = G.clubs[cid]; const pr = L.tv * 0.2 * Math.max(0, 1 - i / g.length); c.money += pr; c.fin.prize += pr; c.hist.push({ y, lg: L.short, pos: i + 1 }); if (c.hist.length > 15) c.hist.shift(); }));
  }
  seasonAwards(G); secondaryEnd(G); loansSeasonEnd(G);
  // classificação continental
  G.qual = continentalQual(G);
  // acesso e rebaixamento
  const moves = [];
  const byCountry = {};
  for (const L of LEAGUES) (byCountry[L.country] ||= []).push(L);
  for (const [country, ls] of Object.entries(byCountry)) {
    ls.sort((a, b) => a.tier - b.tier);
    for (let i = 0; i < ls.length; i++) {
      const L = ls[i], comp = G.comps[L.id];
      if (!comp) continue;
      if (L.down) {
        let down;
        if (L.format === 'zones2') down = [standings(G, comp, 0).slice(-1)[0], standings(G, comp, 1).slice(-1)[0]];
        else down = standings(G, comp, 0).slice(-L.down);
        const target = ls[i + 1] ? ls[i + 1].id : null;
        for (const id of down) moves.push([id, target, 'down']);
      }
      if (L.up) {
        let up;
        if (L.format === 'groups6') up = comp.semis || standings(G, comp, 0).slice(0, 4);
        else if (L.format === 'zones2') up = [standings(G, comp, 0)[0], standings(G, comp, 1)[0]];
        else up = standings(G, comp, 0).slice(0, L.up);
        for (const id of up) moves.push([id, ls[i - 1].id, 'up']);
      }
    }
    // repescagem (Alemanha/França): 16º de cima x 3º de baixo
    for (let i = 0; i + 1 < ls.length; i++) {
      const U = ls[i], D = ls[i + 1]; if (!U.po || !G.comps[U.id] || !G.comps[D.id]) continue;
      const tu = standings(G, G.comps[U.id], 0), td = standings(G, G.comps[D.id], 0);
      const a = tu[tu.length - U.down - 1], b = td[D.up]; if (a == null || b == null) continue;
      const sa = strength(G, a, false), sb = strength(G, b, false);
      const bWins = rnd() < clamp(0.5 + (sb - sa) / 14, 0.15, 0.85);
      news(G, `🔁 Repescagem ${U.short}: ${G.clubs[a].name} x ${G.clubs[b].name} — ${bWins ? G.clubs[b].name + ' sobe!' : G.clubs[a].name + ' se mantém.'}`);
      if (bWins) { moves.push([a, D.id, 'down']); moves.push([b, U.id, 'up']); }
    }
    // reposição pela reserva
    const lastL = ls[ls.length - 1];
    const leaving = moves.filter((m) => m[2] === 'down' && m[1] === null && G.clubs[m[0]].country === country).length;
    if (leaving) {
      const res = G.clubs.filter((c) => c.country === country && c.league === null && !c.userOwnedVarzea && !moves.some((m) => m[0] === c.id)).sort((a, b) => b.rep + rf(-8, 8) - a.rep);
      res.slice(0, leaving).forEach((c) => moves.push([c.id, lastL.id, 'up']));
    }
  }
  for (const [id, to, dir] of moves) {
    const c = G.clubs[id]; const from = c.league;
    c.league = to;
    c.rep = clamp(c.rep + (dir === 'up' ? 3 : -3), 3, 99);
    if (from) news(G, dir === 'up' ? `⬆️ ${c.name} conquista o acesso para ${to ? LEAGUES.find((l) => l.id === to).short : '?'}!` : `⬇️ ${c.name} é rebaixado${to ? '' : ' e sai das divisões nacionais'}.`);
    if (!to && me.job && me.job.cid === id) { msg(G, 'Clube', '📄 Clube fora das divisões do jogo', `O ${c.name} caiu para uma divisão que não é disputada no jogo. Seu contrato foi encerrado e você está livre no mercado.`); me.hist[me.hist.length - 1].to = 46; me.job = null; }
    if (me.job && me.job.cid === id && !me.job.youth) { me.rep = clamp(me.rep + (dir === 'up' ? 5 : -7), 1, 99); msg(G, 'Diretoria', dir === 'up' ? '⬆️ Acesso conquistado!' : '⬇️ Rebaixamento', dir === 'up' ? `O ${c.name} subiu de divisão! A torcida está em festa.` : `O ${c.name} foi rebaixado. A diretoria vai avaliar seu futuro.`); if (dir === 'down') c.board.conf -= 25; }
  }
  ownSeasonEnd(G, moves);
  // campeões aumentam reputação
  for (const comp of Object.values(G.comps)) if (comp.champion != null && comp.kind !== 'youth') { const c = G.clubs[comp.champion]; c.rep = clamp(c.rep + (comp.kind === 'cont' ? 4 : comp.tier === 1 ? 3 : 1), 3, 99); }
  // envelhecimento, aposentadoria, base
  for (const p of G.players) {
    if (!p) continue;
    (p.oh ||= []).push([G.year, p.ovr]); if (p.oh.length > 8) p.oh.shift();
    p.age++;
    if (p.age >= 31) p.ovr = Math.max(30, p.ovr - ri(0, 2) - Math.floor(Math.max(0, p.age - 32) * rf(0.4, 1.1)));
    if (p.pot < p.ovr) p.pot = p.ovr;
    if (p.age > 24) p.pot = Math.min(p.pot, p.ovr + Math.max(0, 29 - p.age));
    p.st = { j: 0, g: 0, a: 0, y: 0, r: 0, ns: 0 }; p.yc = 0; p.sus = 0; p.fit = 100; p.s0 = p.ovr;
    if ((p.age >= 35 && rnd() < 0.35 + (p.age - 35) * 0.2) || (p.age >= 33 && p.ovr < 55 && rnd() < 0.5)) {
      if (p.club >= 0 && G.me.job && p.club === G.me.job.cid) news(G, `👋 ${p.n} anuncia aposentadoria.`);
      retiredToCoach(G, p);
      p.club = -2; p.ret = true;
    }
    if (p.u17 && p.age >= 18) { p.u17 = false; if (G.me.job && p.club === G.me.job.cid) news(G, `🌱 ${p.n} sobe da Sub-17 para a Sub-20.`); }
    if (p.u20 && p.age > 20 && p.club >= 0) { // sai do sub-20
      const c = G.clubs[p.club];
      if (p.ovr >= clubLevel(c.rep) - 10) { p.u20 = false; p.wage = playerWage(p, c.country); p.con = G.year + 3; news(G, `🌱 ${p.n} é promovido ao profissional do ${c.name}.`); }
      else { p.club = -1; p.u20 = false; }
    }
  }
  expireContracts(G);
  // agentes livres há muito tempo somem do jogo
  for (const p of G.players) if (p && p.club === -1) { p.fa = (p.fa || 0) + 1; if ((p.fa >= 2 || p.age >= 33 || p.ovr < 45) && !G.short.includes(p.id)) p.ret = true; } else if (p) p.fa = 0;
  // jogadores aposentados são removidos de vez
  for (let i = 0; i < G.players.length; i++) { const p = G.players[i]; if (p && p.ret && !p.keep) G.players[i] = null; }
  youthIntake(G);
  universeSeasonEnd(G); bizSeasonEnd(G);
  academySeason(G, (c, nat, boost) => { const p = makePlayer(G, { n: genName(nat), pos: pick(Object.keys(QUOTA)), age: ri(15, 17), ovr: 40 + c.rep * 0.12 + gauss() * 4, club: c.id, u20: true, nat, wage: 300 }); p.pot = clamp(p.ovr + ri(15, 30) + boost, p.ovr, 95); if (p.age <= 17 && c.league === 'BRA') p.u17 = true; return p; });
  // novos patrocínios
  for (const c of G.clubs) {
    if (!c.league && c.league !== 'AMA') continue;
    c.troph = c.troph.slice(-40);
    if (!(me.job && me.job.cid === c.id) && c.own.user < 51) initSponsor(G, c);
    else c.spon = Math.round(Math.max(c.spon * (0.9 + c.rep / 500), c.rep * c.rep * 1500));
    c.lastFin = c.fin; c.fin = newFin();
  }
  if (me.job) { const mc = G.clubs[me.job.cid]; mc.yb = baseBudget(mc) + Math.round((mc.yb || 0) * 0.3); }
  if (G.nat) natSeasonEnd(G);
  const lifeRes = lifeSeasonEnd(G);
  if (lifeRes === 'leave' && me.job) {
    const oc = G.clubs[me.job.cid];
    msg(G, 'Diretoria', '📄 Fim de contrato', `Seu contrato com o ${oc.name} terminou e não foi renovado. Você está livre no mercado.`);
    news(G, `📄 ${me.name} deixa o ${oc.name} ao fim do contrato.`, 'tec');
    me.hist[me.hist.length - 1].to = 46; me.job = null; oc.coach = null; appointAI(G, oc);
  }
  G.year++;
  me.age++;
  setupSeason(G);
  if (G.nat) natSetupYear(G);
  // sub-20: novos clubes da Série A recebem base
  for (const c of G.clubs) if (c.league === 'BRA' && !G.players.some((p) => p && p.club === c.id && p.u20)) buildU20(G, c);
  if (me.job) { setObjective(G); msg(G, 'Diretoria', `Temporada ${G.year}`, `Nova temporada! Objetivo: ${me.obj.text}.`); preseason(G); }
  news(G, `📅 Começa a temporada ${G.year}.`);
  // ofertas de fim de temporada
  if (me.job?.youth || !me.job || me.rep > 30) {
    const cands = G.clubs.filter((c) => c.league && c.league !== 'AMA' && !c.coach?.user && c.rep <= me.rep + 10 && c.rep >= me.rep - 25 && !(me.job && me.job.cid === c.id));
    for (const c of shuffle(cands).slice(0, me.job ? 1 : 3)) if (rnd() < 0.5) { if (!G.vac.some((v) => v.cid === c.id)) G.vac.push({ cid: c.id, youth: false, t: G.t, pre: true }); }
  }
  G.season = null;
}

function initSponsor(G, c) {
  const old = c.money; initFinances(G, c); c.money = old;
  if (c.money < 0) c.spon += -c.money / 3; // clubes endividados recebem ajuda para não quebrar a liga
}

function youthIntake(G) {
  for (const c of G.clubs) {
    if (!c.league) continue;
    const L = clubLevel(c.rep);
    const sq = G.players.filter((p) => p && p.club === c.id && !p.u20);
    const n = sq.length < 22 ? 22 - sq.length + 2 : ri(1, 3);
    const youthClub = G.players.some((p) => p && p.club === c.id && p.u20);
    if (youthClub) {
      const has17 = c.league === 'BRA'; for (let i = 0; i < 6; i++) { const pos = pick(Object.keys(QUOTA)); const p = makePlayer(G, { n: genName('BR'), pos, age: has17 ? 15 : 16, ovr: 45 + c.rep * 0.12 + gauss() * 4, club: c.id, u20: true, wage: 300 }); if (has17) p.u17 = true; p.pot = youthBonus(G, c) + clamp(p.ovr + ri(10, 32), p.ovr, 93); }
      // completa vagas do profissional
      const need = Math.max(0, 22 - sq.length);
      for (let i = 0; i < need; i++) { const p = makePlayer(G, { n: genName(c.country), pos: pick(Object.keys(QUOTA)), age: ri(19, 29), ovr: L - ri(2, 8), club: c.id, nat: c.country }); void p; }
    } else {
      for (let i = 0; i < n; i++) {
        const pos = pick(Object.keys(QUOTA));
        const age = sq.length < 20 ? ri(19, 28) : ri(17, 19);
        const p = makePlayer(G, { n: genName(c.country), pos, age, ovr: age < 20 ? L - ri(8, 16) : L - ri(2, 8), club: c.id, nat: c.country });
        if (age < 20) p.pot = clamp(p.ovr + ri(8, 28), p.ovr, 93);
      }
    }
    // equilibra o elenco por posição
    const cnt = {}; for (const p of G.players) if (p && p.club === c.id && !p.u20) cnt[p.pos] = (cnt[p.pos] || 0) + 1;
    for (const pos of Object.keys(QUOTA)) { const need = Math.max(0, Math.min(2, QUOTA[pos] - 1) - (cnt[pos] || 0)); for (let i = 0; i < need; i++) makePlayer(G, { n: genName(c.country), pos, age: ri(20, 30), ovr: L - ri(3, 8), club: c.id, nat: c.country }); }
  }
}

// classificação continental genérica (vagas por liga, campeões de copa e prioridade principal > secundária)
export function continentalQual(G) {
  const used = new Set(); const out = {};
  for (const C of CONTS) {
    const ids = [];
    const champ = G.comps[C.id]?.champion; if (champ != null && G.clubs[champ].league && !used.has(champ)) ids.push(champ);
    for (const cup of C.cups || []) { const w = G.comps[cup]?.champion; if (w != null && G.clubs[w].league && !used.has(w) && !ids.includes(w) && C.slots.some(([lg]) => lg === G.clubs[w].league)) ids.push(w); }
    for (const [lg, n] of C.slots) {
      const comp = G.comps[lg]; if (!comp) continue;
      let k = ids.filter((x) => G.clubs[x].league === lg).length; const nn = n + (G.uv?.regs?.slots?.[C.id]?.[lg] || 0);
      for (const id of standings(G, comp, 0)) { if (k >= nn) break; const cc = G.clubs[id]; const ctrl = cc.own.user >= 51; if (ctrl && [...used, ...ids].some((x) => G.clubs[x].own.user >= 51)) continue; if (!used.has(id) && !ids.includes(id)) { ids.push(id); k++; } }
    }
    out[C.id] = ids.slice(0, 16); for (const x of out[C.id]) used.add(x);
  }
  return out;
}
export { RESERVE, FORMATIONS, playerValue, CUPS, CONTS };
