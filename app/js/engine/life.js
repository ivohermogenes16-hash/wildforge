// =====================================================================
// MUNDO VIVO — treinadores da IA, diretoria, vestiário, imprensa,
// comissão técnica, estrutura, patrocínios, rivalidades, prêmios e história
// Tudo é integrado com o motor (game.js) por ganchos chamados a cada jogo,
// semana e fim de temporada.
// =====================================================================
import { clamp, ri, rf, rnd, pick, money, hash, seeded, shuffle } from '../util.js';
import { genName, makePlayer, BOARD_TYPES, initClubLife, initPlayerLife, clubLevel, expandWorld } from './world.js';
import { playerWage, playerValue, WAGE_SCALE } from './econ.js';
import { standings } from './season.js';
import { pressPre, pressPost, pressHeadline } from './press.js';

export const STYLES = ['Ofensivo', 'Defensivo', 'Posse de bola', 'Contra-ataque', 'Equilibrado', 'Pressão alta'];
export const STAFF = {
  aux: { n: 'Auxiliar técnico', d: 'Melhora o desempenho tático nos jogos.' },
  fis: { n: 'Preparador físico', d: 'Recupera o fôlego e reduz lesões.' },
  gol: { n: 'Treinador de goleiros', d: 'Acelera a evolução dos goleiros.' },
  ana: { n: 'Analista de desempenho', d: 'Estuda o adversário: bônus em jogo e relatório pré-jogo.' },
  olh: { n: 'Olheiro-chefe', d: 'Encontra mais garotos e estima melhor o potencial.' },
  dir: { n: 'Diretor de futebol', d: 'Negocia melhor: compras mais baratas e vendas mais caras.' },
};
export const INFRA = {
  ct: { n: 'Centro de treinamento', d: 'Acelera a evolução de todo o elenco.', base: 3.5e6, w: 8 },
  med: { n: 'Departamento médico', d: 'Lesões mais curtas e menos frequentes.', base: 1.8e6, w: 6 },
  base: { n: 'Categorias de base', d: 'Garotos melhores surgem na base e evoluem mais rápido.', base: 2.6e6, w: 8 },
  obs: { n: 'Rede de observação', d: 'Olheiros acham mais talentos e de melhor nível.', base: 1.2e6, w: 5, max: 3 },
  mod: { n: 'Modernização do estádio', d: 'Mais público, ingressos e patrocínios.', base: 4.5e6, w: 10 },
  est: { n: 'Ampliação do estádio (+5 mil lugares)', d: 'Mais lugares = mais bilheteria.', base: 9e6, w: 20, max: 99 },
};
export const SPECS = { of: 'Ofensivo', df: 'Defensivo', jv: 'Formador de jovens', ge: 'Gestão de elenco', mo: 'Motivacional' };
const SPEC_D = { of: '+0,8 de força de ataque por nível', df: '+0,8 de força de defesa por nível', jv: '+10% evolução de jovens (até 21) por nível', ge: 'Insatisfação cresce 25% mais devagar e +3 de entrosamento por nível', mo: '+2 de moral após vitórias e respostas à imprensa mais eficazes por nível' };
export { SPEC_D };
const SCALE = { BR: 1, AR: 0.5, EN: 3, ES: 2.2, IT: 2 };
const SPONSORS = ['Banco Horizonte', 'Viva Telecom', 'Supermercados Avante', 'Aurora Seguros', 'Rede Prisma', 'Construtora Pilar', 'Nova Energia', 'Mar Azul Turismo', 'TecSul', 'Farol Investimentos', 'Grupo Atlas', 'Bebidas Real', 'Vértice Bet', 'Lumen Saúde', 'Transportes Rota', 'Campo Verde Alimentos'];
const KITS = ['Kappa Sul', 'Dínamo Sports', 'Vento Wear', 'Arena Athletic', 'Pulso Sportswear'];
const CROSS = [['Santos', 'Corinthians'], ['Santos', 'Palmeiras'], ['Santos', 'São Paulo'], ['Manchester United', 'Liverpool'], ['Barcelona', 'Real Madrid'], ['Juventus', 'Inter'], ['Atlético de Madrid', 'Real Madrid'], ['Sevilla', 'Real Betis'], ['Ceará', 'Fortaleza'], ['Athletico-PR', 'Coritiba'], ['Remo', 'Paysandu'], ['Boca Juniors', 'River Plate'], ['Racing Club', 'Independiente'], ['Rosario Central', "Newell's Old Boys"], ['Milan', 'Inter'], ['Roma', 'Lazio'], ['Arsenal', 'Tottenham'], ['Everton', 'Liverpool'], ['Manchester City', 'Manchester United']];

function msg(G, from, title, body, extra = {}) { G.inbox.unshift({ id: (G.inbox[0]?.id || 0) + 1, t: G.t, y: G.year, w: G.week, from, title, body, read: false, ...extra }); if (G.inbox.length > 150) G.inbox.length = 150; }
function news(G, txt, cat = '') { G.news.unshift({ t: G.t, y: G.year, w: G.week, txt, cat }); if (G.news.length > 200) G.news.length = 200; }
export function tl(G, txt, cat = '') { (G.timeline ||= []).push({ y: G.year, w: G.week, txt, cat }); if (G.timeline.length > 600) G.timeline.splice(0, 100); }
const myJobClub = (G) => (G.me.job ? G.clubs[G.me.job.cid] : null);
const isSenior = (G) => G.me.job && !G.me.job.youth;

// ===================== MIGRAÇÃO / COMPATIBILIDADE =====================
export function migrate(G) {
  expandWorld(G);
  G.coaches ||= []; G.hist ||= {}; G.timeline ||= []; G.builds ||= []; G.rec ||= {};
  const me = G.me;
  me.pop ??= 25; me.pp ??= 20; me.xp ??= (me.stats?.j || 0) * 3; me.spec ||= { of: 0, df: 0, jv: 0, ge: 0, mo: 0 };
  me.car ||= { gf: 0, ga: 0, revealed: [], trans: 0, countries: [] };
  me.promises ||= []; me.cd ||= {}; me.awards ||= []; me.decLog ||= [];
  if (me.job && me.job.until == null) me.job.until = G.year + 1;
  for (const h of me.hist) { h.j ??= 0; h.v ??= 0; h.e ??= 0; h.d ??= 0; h.gf ??= 0; h.ga ??= 0; }
  for (const c of G.clubs) {
    initClubLife(c);
    if (!c.spons) initSponsors(G, c);
    if (c.coach && !c.coach.user && c.coach.id == null) {
      const k = newCoach(G, { n: c.coach.n, rep: c.coach.rep, nat: c.country === 'EN' ? 'EN' : c.country });
      k.cid = c.id; k.hist.push({ y: G.year, cid: c.id, n: c.name, j: 0, v: 0, e: 0, d: 0 }); c.coach.id = k.id;
    }
  }
  for (const p of G.players) if (p) initPlayerLife(p);
  // um punhado de técnicos livres no mercado
  if (G.coaches.filter((k) => k.cid === -1).length < 25) for (let i = 0; i < 30; i++) newCoach(G, { nat: pick(['BR', 'BR', 'AR', 'ES', 'IT', 'EN']), rep: ri(15, 70) });
  G.lv = 2;
  return G;
}

// ===================== TREINADORES DA IA =====================
export function newCoach(G, o = {}) {
  const nat = o.nat || 'BR';
  const k = { id: G.coaches.length, n: o.n || genName(nat), age: o.age ?? ri(36, 62), nat, style: o.style || pick(STYLES), rep: clamp(Math.round(o.rep ?? ri(20, 70)), 3, 97), cid: -1, hist: [], titles: [], j: 0, v: 0, e: 0, d: 0, ex: !!o.ex, since: G.year };
  G.coaches.push(k); return k;
}
export const coachOf = (G, c) => (c && c.coach && c.coach.id != null ? G.coaches[c.coach.id] : null);
function styleTact(style, t) {
  const m = { Ofensivo: ['4-3-3', 2, 1], Defensivo: ['5-3-2', 0, 0], 'Posse de bola': ['4-2-3-1', 1, 1], 'Contra-ataque': ['4-4-2', 0, 1], Equilibrado: ['4-4-2', 1, 1], 'Pressão alta': ['4-3-3', 1, 2] }[style] || ['4-3-3', 1, 1];
  return { ...t, form: m[0], ment: m[1], press: m[2] };
}
export function appointAI(G, club, opts = {}) {
  const free = G.coaches.filter((k) => k.cid === -1 && !k.ret && !k.natTeam && k.rep >= club.rep - 20 && k.rep <= club.rep + 12);
  let k;
  if (free.length && rnd() < 0.8) { free.sort((a, b) => b.rep + b.titles.length * 2 - a.rep - a.titles.length * 2); k = free[Math.floor(rnd() * Math.min(4, free.length))]; }
  else k = newCoach(G, { nat: club.country === 'EN' ? pick(['EN', 'ES', 'IT']) : club.country, rep: clamp(club.rep + ri(-14, 4), 5, 92) });
  k.cid = club.id; k.hist.push({ y: G.year, cid: club.id, n: club.name, j: 0, v: 0, e: 0, d: 0 });
  club.coach = { n: k.n, rep: k.rep, id: k.id };
  club.tact = styleTact(k.style, club.tact); club.lineup = null; club.board.conf = 60;
  if (!opts.quiet) news(G, `🧑‍💼 ${club.name} anuncia ${k.n} (${k.style.toLowerCase()}) como novo técnico.`, 'tec');
  if (club.rep >= 78 && !opts.quiet) tl(G, `${k.n} assume o ${club.name}`, 'tec');
  return k;
}
export function coachLeaves(G, club, why) {
  const k = coachOf(G, club);
  if (k) { k.cid = -1; const h = k.hist[k.hist.length - 1]; if (h) h.to = G.year; if (why === 'fired') k.rep = clamp(k.rep - 3, 3, 97); }
  club.coach = null;
}
function hEntry(k) { return k.hist[k.hist.length - 1]; }
export function aiCoachResult(G, club, gf, ga, opp) {
  const k = coachOf(G, club); if (!k) return;
  const r = gf > ga ? 'v' : gf === ga ? 'e' : 'd';
  k.j++; k[r]++; const h = hEntry(k); if (h) { h.j++; h[r]++; }
  const q = clamp((opp.rep + 5) / (club.rep + 5), 0.6, 1.6);
  const ts = k.titles.reduce((s, t) => s + t.w, 0);
  const target = clamp(club.rep * 0.8 + Math.min(18, ts * 0.5), 5, 97);
  k.rep = clamp(k.rep + (r === 'v' ? 0.06 * q : r === 'd' ? -0.06 / q : 0) + (target - k.rep) * 0.01, 3, 97);
  club.coach.rep = Math.round(k.rep);
}
export function titleWeight(comp) { return comp.kind === 'cont' ? 15 : comp.kind === 'cup' ? 5 : comp.kind === 'state' ? 3 : comp.kind === 'youth' ? 2 : comp.kind === 'amateur' ? 1 : comp.tier === 1 ? 10 : 4; }
export function coachChampion(G, club, comp) {
  const k = coachOf(G, club); if (!k) return;
  const w = titleWeight(comp);
  k.titles.push({ y: G.year, c: comp.name, club: club.name, w }); k.rep = clamp(k.rep + w * 0.6, 3, 97);
}
// No fim da temporada: técnicos envelhecem, se aposentam, e gigantes buscam treinadores vencedores
function coachesSeason(G) {
  for (const k of G.coaches) {
    if (k.ret) continue; k.age++;
    if (k.age >= 72 || (k.age >= 64 && rnd() < 0.18) || (k.cid === -1 && k.rep < 15 && rnd() < 0.3)) {
      k.ret = true; if (k.natTeam && G.nat?.teams[k.natTeam]) { const T = G.nat.teams[k.natTeam]; T.coach = null; (G.nat.vac ||= []).push({ code: T.code, t: G.t }); k.natTeam = null; }
      if (k.cid >= 0) { const c = G.clubs[k.cid]; coachLeaves(G, c); appointAI(G, c); }
      if (k.titles.length >= 3) { news(G, `👋 ${k.n} se aposenta com ${k.titles.length} títulos.`, 'tec'); tl(G, `${k.n} se aposenta (${k.titles.length} títulos)`, 'tec'); }
    }
  }
  // gigantes insatisfeitos trocam de técnico e buscam vencedores (inclusive de outros clubes)
  for (const c of G.clubs) {
    if (!c.league || c.rep < 78 || c.coach?.user || !c.coach) continue;
    if (c.board.conf > 45 || rnd() > 0.6) continue;
    const old = coachOf(G, c);
    const cands = G.coaches.filter((k) => !k.ret && !k.natTeam && k.id !== old?.id && k.rep >= c.rep - 12 && (k.cid === -1 || (G.clubs[k.cid].rep < c.rep - 5 && !G.clubs[k.cid].coach?.user)));
    if (!cands.length) continue;
    cands.sort((a, b) => b.rep + b.titles.length * 3 - a.rep - a.titles.length * 3);
    const k = cands[0];
    coachLeaves(G, c, 'fired');
    if (k.cid >= 0) { const from = G.clubs[k.cid]; coachLeaves(G, from); appointAI(G, from, { quiet: true }); news(G, `🔁 ${k.n} deixa o ${from.name} para comandar o ${c.name}!`, 'tec'); tl(G, `${k.n} troca ${from.name} pelo ${c.name}`, 'tec'); }
    k.cid = c.id; k.hist.push({ y: G.year + 1, cid: c.id, n: c.name, j: 0, v: 0, e: 0, d: 0 });
    c.coach = { n: k.n, rep: k.rep, id: k.id }; c.tact = styleTact(k.style, c.tact); c.board.conf = 62;
  }
}
export function hallOfFame(G) {
  const list = G.coaches.filter((k) => k.titles.length || k.j > 150).map((k) => ({ n: k.n, nat: k.nat, titles: k.titles.length, score: k.titles.reduce((s, t) => s + t.w, 0) + k.j * 0.02, j: k.j, v: k.v, ret: k.ret, cid: k.cid, user: false }));
  const me = G.me;
  list.push({ n: me.name + ' (você)', nat: 'BR', titles: me.titles.length, score: me.titles.reduce((s, t) => s + (t.w || 5), 0) + me.stats.j * 0.02, j: me.stats.j, v: me.stats.v, user: true, cid: me.job?.cid ?? -1 });
  return list.sort((a, b) => b.score - a.score).slice(0, 30);
}

// ===================== RIVALIDADES =====================
export function isDerby(G, a, b) {
  const A = G.clubs[a], B = G.clubs[b]; if (!A || !B || A.country !== B.country) return false;
  if (A.city && A.city === B.city && A.league && B.league && Math.abs(A.rep - B.rep) < 30) return true;
  return CROSS.some(([x, y]) => (x === A.key && y === B.key) || (y === A.key && x === B.key));
}

// ===================== PATROCÍNIOS =====================
export function sponsorValue(G, c, slot) {
  const share = { Master: 0.6, Manga: 0.22, Fornecedor: 0.18 }[slot];
  const tier = G.comps?.[c.league]?.tier || (c.league ? 2 : 3);
  const base = Math.max(c.rep * c.rep * 1500 * (SCALE[c.country] || 1) * (tier === 1 ? 1 : tier === 2 ? 0.55 : 0.3), c.spon0 || 0);
  return Math.round(base * share * (0.8 + c.fans / 250) * (0.9 + (c.infra?.mod || 1) * 0.04) / 1000) * 1000;
}
export function initSponsors(G, c) {
  const tot = c.spon || 0; c.spon0 = tot;
  c.spons = [['Master', 0.6], ['Manga', 0.22], ['Fornecedor', 0.18]].map(([slot, sh], i) => ({ n: slot === 'Fornecedor' ? pick(KITS) : SPONSORS[(hash(c.key) + i * 7) % SPONSORS.length], slot, val: Math.round(tot * sh / 1000) * 1000, until: G.year + ri(0, 2) }));
  syncSpon(c);
}
export const syncSpon = (c) => { c.spon = c.spons.reduce((s, x) => s + x.val, 0); };
function sponsorsSeason(G) {
  for (const c of G.clubs) {
    if (!c.spons || !c.league) continue;
    for (const s of c.spons) {
      if (s.until > G.year) continue;
      const v = Math.max(sponsorValue(G, c, s.slot), Math.round(s.val * 0.85));
      const mine = myJobClub(G)?.id === c.id || c.own.user >= 51;
      if (mine && v !== s.val) msg(G, 'Departamento comercial', `🤝 Patrocínio renovado: ${s.n}`, `O contrato de ${s.slot.toLowerCase()} com ${s.n} foi renovado por ${money(v)}/temporada (antes ${money(s.val)}), até ${G.year + 3}.\nValor depende da reputação do clube, divisão, torcida e estádio.`);
      s.val = v; s.until = G.year + ri(2, 3);
    }
    syncSpon(c);
  }
}

// ===================== COMISSÃO TÉCNICA =====================
export function staffQ(G, c, role) { const s = c.staff?.[role]; if (s) return s.q; return clamp(Math.round(c.rep / 9), 2, 12); }
export function staffCandidates(G, c, role) {
  const R = seeded(hash(c.key + role) + Math.floor(G.t / 4) * 977 + G.year * 31);
  const out = [];
  for (let i = 0; i < 5; i++) {
    const q = clamp(Math.round(c.rep / 7 - 3 + R() * 10 + (i === 0 ? 3 : 0)), 1, 20);
    const nat = R() < 0.8 ? (c.country === 'EN' ? 'EN' : c.country) : pick(['BR', 'AR', 'ES', 'IT']);
    const wage = Math.round((300 + q * q * 70) * (WAGE_SCALE[c.country] || 0.7) / 50) * 50;
    const N = seeded(Math.floor(R() * 1e9));
    const n = genNameSeeded(nat, N);
    out.push({ n, age: 30 + Math.floor(R() * 32), nat, q, wage, rep: clamp(q * 5 + Math.floor(R() * 10), 5, 99), role });
  }
  return out.sort((a, b) => b.q - a.q);
}
function genNameSeeded(nat, R) { const old = Math.random; Math.random = R; try { return genName(nat); } finally { Math.random = old; } }
export function hireStaff(G, c, cand) {
  if (c.money < cand.wage * 10) return { ok: false, why: 'O caixa do clube não comporta esse salário agora.' };
  const old = c.staff[cand.role];
  if (old) { const cost = old.wage * 6; c.money -= cost; c.fin.staff += cost; }
  c.staff[cand.role] = { ...cand, since: G.year };
  news(G, `🧢 ${c.name} contrata ${cand.n} como ${STAFF[cand.role].n.toLowerCase()}.`, 'clube');
  return { ok: true, why: `${cand.n} contratado${old ? ` (${old.n} saiu, multa ${money(old.wage * 6)})` : ''}.` };
}
export function fireStaff(G, c, role) { const s = c.staff[role]; if (!s) return ''; const cost = s.wage * 6; c.money -= cost; c.fin.staff += cost; delete c.staff[role]; return `${s.n} dispensado (multa ${money(cost)}).`; }
export const staffWages = (c) => Object.values(c.staff || {}).reduce((s, x) => s + x.wage, 0);

// ===================== ESTRUTURA =====================
export function infraCost(c, kind) {
  const lvl = kind === 'est' ? 1 : (c.infra[kind] || 0) + 1;
  return Math.round(INFRA[kind].base * Math.pow(kind === 'est' ? 1 + c.cap / 40 : lvl, kind === 'est' ? 1 : 1.55) * (SCALE[c.country] || 1) / 10000) * 10000;
}
export function canBuild(G, c, kind) {
  const max = INFRA[kind].max ?? 5;
  if (kind !== 'est' && (c.infra[kind] || 0) >= max) return 'Nível máximo.';
  if (G.builds.some((b) => b.cid === c.id && b.kind === kind)) return 'Obra em andamento.';
  return '';
}
export function startBuild(G, c, kind, payer = 'club') {
  const cost = infraCost(c, kind);
  if (payer === 'club') { if (c.money < cost) return { ok: false, why: `Caixa insuficiente (${money(cost)}).` }; c.money -= cost; c.fin.infra += cost; }
  else { if (G.me.money < cost) return { ok: false, why: `Você não tem ${money(cost)}.` }; G.me.money -= cost; }
  const lvl = kind === 'est' ? 0 : (c.infra[kind] || 0) + 1;
  G.builds.push({ cid: c.id, kind, lvl, done: G.t + INFRA[kind].w * (kind === 'est' ? 1 : Math.max(1, lvl - 1)) });
  news(G, `🏗️ ${c.name} inicia obra: ${INFRA[kind].n}.`, 'clube');
  return { ok: true, why: `Obra iniciada: ${INFRA[kind].n}. Fica pronta em ${INFRA[kind].w * (kind === 'est' ? 1 : Math.max(1, lvl - 1))} semanas.` };
}
function buildsWeek(G) {
  for (const b of G.builds.slice()) {
    if (G.t < b.done) continue;
    const c = G.clubs[b.cid];
    if (b.kind === 'est') c.cap += 5; else c.infra[b.kind] = b.lvl;
    G.builds = G.builds.filter((x) => x !== b);
    news(G, `✅ ${c.name} inaugura: ${INFRA[b.kind].n}${b.kind !== 'est' ? ` (nível ${b.lvl})` : ` — agora ${c.cap} mil lugares`}.`, 'clube');
    if (myJobClub(G)?.id === c.id || c.own.user > 0) msg(G, 'Obras', `✅ Obra concluída: ${INFRA[b.kind].n}`, `A obra foi concluída no ${c.name}.`);
    c.fans = clamp(c.fans + 2, 0, 100);
  }
}
export function requestBuild(G, kind) {
  const c = myJobClub(G); const t = c.board.type;
  const cost = infraCost(c, kind);
  if (G.me.cd['req_' + kind] && G.t - G.me.cd['req_' + kind] < 12) return { ok: false, why: 'A diretoria já analisou esse pedido recentemente.' };
  G.me.cd['req_' + kind] = G.t;
  let p = c.money > cost * 1.6 ? 0.75 : c.money > cost ? 0.4 : 0.05;
  if (t === 'investidora') p += 0.2; if (t === 'conservadora') p -= 0.25; if (t === 'formadora' && kind === 'base') p += 0.35;
  p += (c.board.conf - 50) / 150;
  if (rnd() < p) { const r = startBuild(G, c, kind); return { ok: r.ok, why: r.ok ? `✅ A diretoria aprovou! ${r.why}` : r.why }; }
  c.board.conf = clamp(c.board.conf - 1, 0, 100);
  return { ok: false, why: '❌ A diretoria negou o investimento por enquanto.' };
}

// ===================== FATORES (usados pelo motor) =====================
export function devMul(G, p, c) {
  if (!c) return 1;
  let m = 0.84 + (c.infra?.ct || 2) * 0.06;
  if (p.per === 'Profissional') m *= 1.1; else if (p.per === 'Promessa') m *= p.playedW ? 1.18 : 1.05; else if (p.per === 'Individualista') m *= 0.95;
  if (p.u20) m *= 0.9 + (c.infra?.base || 2) * 0.05;
  if (p.pos === 'GOL') m *= 0.92 + staffQ(G, c, 'gol') * 0.012;
  if (G.me.job && c.id === G.me.job.cid && p.age <= 21) m *= 1 + (G.me.spec?.jv || 0) * 0.1;
  return m;
}
export function userMatchBonus(G, c) {
  const sp = G.me.spec || {};
  const staff = (staffQ(G, c, 'aux') - 8) * 0.06 + (staffQ(G, c, 'ana') - 8) * 0.05;
  const chem = ((c.chem ?? 60) - 60) / 18;
  const tr = (G.me.job?.youth ? G.me.u20train : c.train) || {};
  const tf = TRAIN_FX[tr.foco] || {};
  const pre = G.me.preBon && G.t < G.me.preBon.until ? G.me.preBon.all : 0;
  return { all: clamp(staff + chem + pre, -3, 3), att: (sp.of || 0) * 0.8 + (tf.att || 0), def: (sp.df || 0) * 0.8 + (tf.def || 0) };
}
// focos de treino coletivo: efeito real nas partidas (att/def) e na evolução (ev)/recuperação (rec)
export const TRAIN_FX = {
  equilibrado: { n: 'Equilibrado', d: 'Desenvolvimento normal, sem pontos fracos.' },
  tecnico: { n: 'Técnico', d: '+12% de evolução dos jogadores.', ev: 1.12 },
  fisico: { n: 'Físico', d: 'Recupera +3 de fôlego por semana; evolução um pouco menor.', ev: 0.95, rec: 3 },
  tatico: { n: 'Tático', d: '+1 de força em todos os jogos.' },
  ofensivo: { n: 'Finalização', d: '+1,2 no ataque nos jogos; evolução -5%.', att: 1.2, ev: 0.95 },
  defensivo: { n: 'Defensivo', d: '+1,2 na defesa nos jogos; evolução -5%.', def: 1.2, ev: 0.95 },
  bolaparada: { n: 'Bola parada', d: '+0,6 no ataque e +0,4 na defesa (escanteios e faltas).', att: 0.6, def: 0.4 },
  jovens: { n: 'Foco nos jovens', d: 'Jogadores até 21 anos evoluem +25%; os mais velhos, -10%.', young: 1.25, old: 0.9 },
};
// treino individual
export const ITR = {
  evol: { n: 'Evolução acelerada', d: '+25% de evolução, mas cansa (-3 de fôlego/semana).' },
  fis: { n: 'Condicionamento físico', d: '+5 de fôlego por semana e menos risco de lesão.' },
  rec: { n: 'Recuperação de lesão', d: 'Volta mais rápido de lesões (não evolui enquanto isso).' },
  pos: { n: 'Aprender nova posição', d: 'Em ~10 semanas passa a jogar na posição escolhida (perde 1–2 de geral).' },
};
export function itrWeek(G, p) {
  const t = p.itr; if (!t) return 1;
  if (t === 'evol') { p.fit = Math.max(30, p.fit - 3); return 1.25; }
  if (t === 'fis') { p.fit = Math.min(100, p.fit + 5); return 1; }
  if (t === 'rec') { if (p.inj > 0 && (G.t % 2 === 0)) p.inj = Math.max(0, p.inj - 1); if (p.inj <= 0) p.itr = null; return 0.5; }
  if (t.startsWith('pos:')) {
    p.posL = (p.posL || 0) + 1;
    if (p.posL >= 10) { const np = t.slice(4); const old = p.pos; p.pos = np; p.ovr = Math.max(30, p.ovr - ri(1, 2)); p.itr = null; p.posL = 0; msg(G, 'Comissão técnica', `🔁 ${p.n} agora é ${np}`, `Depois de semanas de treino, ${p.n} aprendeu a jogar de ${np} (antes ${old}).`); }
    return 0.9;
  }
  return 1;
}
// ---------------- pré-temporada ----------------
export const PRE = {
  ct: { n: '🏋️ Intertemporada no CT', d: 'Foco físico e tático: elenco 100% e +0,8 de força nas 6 primeiras semanas. Custo para o clube.' },
  exc: { n: '✈️ Excursão internacional', d: 'Jogos no exterior: muito dinheiro e torcida, mas o cansaço da viagem tira 0,4 de força nas 4 primeiras semanas.' },
  tor: { n: '⚽ Torneio de pré-temporada', d: 'Três amistosos: +10 de entrosamento, moral alta e +0,5 de força nas 6 primeiras semanas.' },
  des: { n: '😴 Pré-temporada curta', d: 'Mais descanso: moral sobe, mas o time começa fora de forma (-0,8 de força nas 5 primeiras semanas).' },
};
export function preseason(G) {
  const c = myJobClub(G); if (!c) return;
  const cost = Math.round(c.rep * 9000 / 1000) * 1000;
  decision(G, 'Preparador físico', `📋 Pré-temporada ${G.year}`, `Como vamos preparar o elenco para a temporada ${G.year}? A escolha vale para as primeiras semanas e mexe com físico, entrosamento e finanças.\n\nIntertemporada no CT custa ${money(cost)}.`,
    Object.entries(PRE).map(([k, v]) => ({ l: `${v.n} — ${v.d}`, act: 'pre', k })), { def: 3, weeks: 1, pre: true });
}
function applyPre(G, k) {
  const c = myJobClub(G); const me = G.me; const youth = me.job.youth;
  const sq = G.players.filter((p) => p && p.club === c.id && !!p.u20 === !!youth);
  const opp = () => pick(G.clubs.filter((x) => x.league && x.id !== c.id && Math.abs(x.rep - c.rep) < 15)) || c;
  me.pre = { y: G.year, k };
  if (k === 'ct') { const cost = Math.round(c.rep * 9000 / 1000) * 1000; c.money -= cost; c.fin.other = (c.fin.other || 0) + cost; for (const p of sq) p.fit = 100; me.preBon = { all: 0.8, until: G.t + 6 }; c.chem = clamp((c.chem ?? 60) + 4, 0, 100); return `Intertemporada no CT feita (${money(cost)}). Elenco voando: +0,8 de força nas próximas 6 semanas.`; }
  if (k === 'exc') { const inc = Math.round((c.rep * c.rep * 450 + 200000) / 10000) * 10000; c.money += inc; c.fin.other = (c.fin.other || 0) - inc; c.fans = clamp((c.fans ?? 50) + 6, 0, 100); me.preBon = { all: -0.4, until: G.t + 4 }; const r = [0, 1, 2].map(() => `${c.name} ${ri(0, 3)}x${ri(0, 2)} ${opp().name}`); return `Excursão rendeu ${money(inc)} e +6 de torcida.\nJogos: ${r.join(' · ')}`; }
  if (k === 'tor') { c.chem = clamp((c.chem ?? 60) + 10, 0, 100); for (const p of sq) p.mor = clamp(p.mor + 5, 0, 100); me.preBon = { all: 0.5, until: G.t + 6 }; c.money += 300000; const r = [0, 1, 2].map(() => `${c.name} ${ri(0, 3)}x${ri(0, 2)} ${opp().name}`); return `Torneio de pré-temporada: ${r.join(' · ')}. Entrosamento +10.`; }
  for (const p of sq) { p.mor = clamp(p.mor + 8, 0, 100); p.fit = Math.min(p.fit, 85); } me.preBon = { all: -0.8, until: G.t + 5 }; return 'Pré-temporada curta: elenco descansado e feliz, mas fora de forma nas primeiras semanas.';
}
export const injMul = (c) => 1.2 - (c?.infra?.med || 2) * 0.08;
export const recovBonus = (G, c) => (c ? (staffQ(G, c, 'fis') - 8) * 0.35 : 0);

// ===================== DIRETORIA =====================
export function boardK(c) { return BOARD_TYPES[c.board.type]?.k || 1; }
export function secondaryObjective(G) {
  const c = myJobClub(G); if (!c || G.me.job.youth) { G.me.obj2 = null; return; }
  const t = c.board.type; const last = c.hist.filter((h) => h.lg === G.comps[c.league]?.short).slice(-1)[0];
  G.me.obj2 = t === 'formadora' ? { k: 'jovens', n: 2, text: 'Dar minutos à base: 2 jogadores de até 21 anos com 10+ jogos' }
    : t === 'conservadora' ? { k: 'caixa', text: 'Fechar a temporada com o caixa positivo' }
    : t === 'investidora' ? { k: 'melhorar', pos: last ? last.pos : null, text: last ? `Superar a campanha passada (${last.pos}º)` : 'Fazer o clube crescer: 10 vitórias na liga' }
    : t === 'ambiciosa' ? { k: 'final', text: 'Chegar a uma final ou ganhar um título' }
    : { k: 'jejum', text: 'Nunca passar 6 jogos seguidos sem vencer' };
  G.me.winless = 0; G.me.maxWinless = 0;
}
function evalSecondary(G, c) {
  const o = G.me.obj2; if (!o) return null;
  let ok = false;
  if (o.k === 'jovens') ok = G.players.filter((p) => p && p.club === c.id && p.age <= 22 && p.st.j >= 10).length >= o.n;
  else if (o.k === 'caixa') ok = c.money > 0;
  else if (o.k === 'melhorar') { const comp = G.comps[c.league]; const gi = Math.max(0, comp.groups.findIndex((g) => g.includes(c.id))); const pos = standings(G, comp, gi).indexOf(c.id) + 1; ok = o.pos ? pos < o.pos : comp.table[c.id].w >= 10; }
  else if (o.k === 'final') ok = Object.values(G.comps).some((k) => k.champion === c.id || k.runnerUp === c.id);
  else if (o.k === 'jejum') ok = (G.me.maxWinless || 0) < 6;
  return ok;
}

// Opções de decisão: cada uma tem efeitos reais (fx) e/ou ações especiais (act)
export function decision(G, from, title, body, opts, extra = {}) {
  msg(G, from, title, body, { kind: 'dec', opts, def: extra.def ?? opts.length - 1, exp: G.t + (extra.weeks ?? 2), cid: G.me.job?.cid ?? null, ...extra });
}

function boardWeek(G) {
  if (!isSenior(G)) return;
  const c = myJobClub(G), me = G.me, t = c.board.type, cd = me.cd;
  const since = (k) => G.t - (cd[k] ?? -99);
  const comp = G.comps[c.league];
  // 1) metas da temporada (início)
  if (G.week === 1 && cd.meta !== G.year && me.obj && comp?.kind === 'league') {
    cd.meta = G.year;
    decision(G, `Diretoria (${BOARD_TYPES[t].n})`, '📋 Reunião: metas da temporada', `Presidente ${c.board.pres}: "Nossa meta é: ${me.obj.text}."${me.obj2 ? `\nMeta secundária: ${me.obj2.text}.` : ''}\n\nVocê pode aceitar, tentar negociar uma meta mais realista ou prometer mais (a diretoria vai cobrar).`,
      [{ l: 'Aceitar as metas', fx: { conf: 2 } }, { l: 'Negociar uma meta mais baixa', act: 'metaDown' }, { l: 'Prometer mais do que isso', act: 'metaUp' }], { def: 0 });
    return;
  }
  // 2) cobrança por resultados
  if (c.board.conf < 35 && since('cobranca') > 8 && G.week > 4) {
    cd.cobranca = G.t;
    decision(G, 'Diretoria', '⚠️ Reunião: cobrança por resultados', `O presidente ${c.board.pres} chamou você: "A torcida está impaciente e os resultados não vêm. O que você vai fazer?"\nConfiança atual: ${Math.round(c.board.conf)}%.`,
      [{ l: 'Prometer reação nos próximos 4 jogos', act: 'promReacao' }, { l: 'Pedir paciência e tempo de trabalho', act: 'paciencia' }, { l: 'Culpar a falta de comprometimento do elenco', fx: { conf: 3, mor: -6, rel: -6, chem: -4 } }], { def: 1 });
    return;
  }
  // 3) problemas financeiros
  const wb = c.spon / 52 + (comp?.tv || 0) / 52;
  if ((c.money < 0 || (t === 'conservadora' && c.money < wb * 4)) && since('fin') > 10) {
    cd.fin = G.t;
    decision(G, 'Diretoria financeira', '💸 Reunião: problemas financeiros', `As contas do ${c.name} estão no vermelho (caixa: ${money(c.money)}). A diretoria quer uma solução.`,
      [{ l: 'Colocar o jogador mais valioso à venda', act: 'vendeEstrela' }, { l: 'Congelar contratações até o fim da temporada', act: 'congelar' }, { l: 'Dizer que não é problema do técnico', fx: { conf: t === 'conservadora' ? -12 : -7 } }], { def: 2 });
    return;
  }
  // 4) avaliação do meio da temporada (pode mudar metas)
  if (G.week === 22 && cd.meio !== G.year && comp?.kind === 'league' && comp.table[c.id]) {
    cd.meio = G.year;
    const gi = Math.max(0, comp.groups.findIndex((g) => g.includes(c.id))); const pos = standings(G, comp, gi).indexOf(c.id) + 1;
    if (pos > me.obj.pos + 5) decision(G, 'Diretoria', '📉 Avaliação do meio da temporada', `Estamos em ${pos}º e a meta era ${me.obj.text.toLowerCase()}. A diretoria propõe ajustar a meta para evitar uma temporada perdida, mas sua confiança cai.`,
      [{ l: 'Aceitar meta revisada', act: 'metaRevisada' }, { l: 'Manter a meta original e lutar', fx: { conf: 2, pop: 2 } }], { def: 0 });
    else if (pos <= Math.max(1, me.obj.pos - 4)) decision(G, 'Diretoria', '📈 Avaliação do meio da temporada', `Excelente! Estamos em ${pos}º, acima do esperado. A diretoria quer subir a meta — e oferece um bônus se você aceitar.`,
      [{ l: 'Aceitar meta maior (+bônus)', act: 'metaMaior' }, { l: 'Manter a meta atual por segurança', fx: { conf: 3 } }], { def: 1 });
    else msg(G, 'Diretoria', '📊 Avaliação do meio da temporada', `Estamos em ${pos}º. A diretoria considera o trabalho dentro do esperado. Confiança: ${Math.round(c.board.conf)}%.`);
    return;
  }
  // 5) renovação de contrato do técnico
  if (me.job.until <= G.year && G.week >= 28 && cd.renov !== G.year) {
    cd.renov = G.year;
    if (c.board.conf >= 52 || c.own.user >= 51) {
      decision(G, 'Diretoria', '✍️ Proposta de renovação', `Seu contrato termina no fim desta temporada. A diretoria quer renovar. Salário atual: ${money(me.job.wage)}/sem.`,
        [{ l: 'Renovar por 1 ano (+8%)', act: 'renov', y: 1, r: 1.08 }, { l: 'Renovar por 2 anos (+14%)', act: 'renov', y: 2, r: 1.14 }, { l: 'Pedir 3 anos e +25%', act: 'renovAlta' }, { l: 'Não renovar (sair no fim da temporada)', act: 'naoRenov' }], { def: 0, weeks: 6 });
    } else msg(G, 'Diretoria', '📄 Contrato não será renovado', `A diretoria informou que não pretende renovar seu contrato, que termina no fim da temporada. Só uma reação forte pode mudar isso (confiança ≥ 60%).`, { kind: 'info' });
    return;
  }
  // 6) pressão da imprensa corrói a confiança
  if (me.pp > 70) c.board.conf = clamp(c.board.conf - 0.6, 0, 100);
}

export function requestFunds(G) {
  const c = myJobClub(G); const me = G.me;
  if (me.cd.verba === G.year) return 'A diretoria já discutiu verba nesta temporada.';
  if (me.freeze && me.freeze >= G.t) return 'As contratações estão congeladas por decisão da diretoria.';
  me.cd.verba = G.year;
  const t = c.board.type; const wb = (c.spon + (G.comps[c.league]?.tv || 0)) / 52;
  let p = 0.35 + (c.board.conf - 50) / 100 + (t === 'investidora' ? 0.3 : t === 'ambiciosa' ? 0.15 : t === 'conservadora' ? -0.25 : 0) + (c.money > 0 ? 0.1 : -0.3);
  if (rnd() < p) {
    const v = Math.round(wb * rf(4, 9) * (t === 'investidora' ? 1.5 : 1) / 10000) * 10000;
    c.money += v; c.fin.other -= v;
    news(G, `💰 Diretoria do ${c.name} libera ${money(v)} para reforços.`, 'mercado');
    return `✅ A diretoria liberou ${money(v)} para reforços! Ela espera retorno em campo.`;
  }
  c.board.conf = clamp(c.board.conf - 2, 0, 100);
  return '❌ A diretoria negou verba extra neste momento.';
}

// ===================== VESTIÁRIO =====================
function captain(G, c) { if (c.capId != null) { const cp = G.players[c.capId]; if (cp && cp.club === c.id) return cp; } const sq = G.players.filter((p) => p && p.club === c.id && !p.u20); return sq.filter((p) => p.per === 'Líder').sort((a, b) => b.tot.j - a.tot.j)[0] || sq.sort((a, b) => b.age - a.age)[0]; }
export function captainOf(G, c) { return captain(G, c); }
// chamado depois de cada jogo do usuário
export function afterUserMatch(G, f, res, won, lost) {
  const j = G.me.job; const c = G.clubs[j.cid]; const side = f.h === c.id ? 0 : 1;
  const played = res.played ? res.played[side] : new Set(res.xi?.[side] || []);
  const sq = G.players.filter((p) => p && p.club === c.id && !!p.u20 === !!j.youth);
  for (const p of sq) {
    if (played.has(p.id)) { p.bw = 0; if (won) p.rel = clamp(p.rel + 0.6, 0, 100); }
    else if (p.inj <= 0 && p.sus <= 0) p.bw = (p.bw || 0) + 1;
    if (won) p.mor = clamp(p.mor + (G.me.spec?.mo || 0) * 2, 0, 100);
  }
  // promessas de titularidade
  for (const pr of G.me.promises) if (pr.k === 'titular' && !pr.done && played.has(pr.pid)) { pr.done = true; const p = G.players[pr.pid]; if (p) { p.rel = clamp(p.rel + 6, 0, 100); p.sat = clamp(p.sat + 10, 0, 100); } }
  // carreira
  const gf = side ? f.ag : f.hg, ga = side ? f.hg : f.ag;
  G.me.car.gf += gf; G.me.car.ga += ga;
  const h = G.me.hist[G.me.hist.length - 1]; if (h) { h.j++; h[won ? 'v' : lost ? 'd' : 'e']++; h.gf += gf; h.ga += ga; }
  G.me.xp += 2 + (won ? 3 : 0);
  G.me.winless = won ? 0 : (G.me.winless || 0) + 1; G.me.maxWinless = Math.max(G.me.maxWinless || 0, G.me.winless);
  // torcida / imprensa / popularidade
  const derby = isDerby(G, f.h, f.a); const m = derby ? 2 : 1;
  c.fans = clamp(c.fans + (won ? 1.5 : lost ? -2 : -0.3) * m, 0, 100);
  G.me.pp = clamp(G.me.pp + (lost ? 4 : won ? -3 : 0.5) * m, 0, 100);
  G.me.pop = clamp(G.me.pop + (won ? 0.4 : lost ? -0.3 : 0) * m, 0, 100);
  if (derby && !j.youth) { c.board.conf = clamp(c.board.conf + (won ? 3 : lost ? -4 : 0), 0, 100); if (f._boast && lost) { c.fans = clamp(c.fans - 8, 0, 100); G.me.pp = clamp(G.me.pp + 10, 0, 100); news(G, `😬 Depois de prometer vitória, ${G.me.name} perde o clássico. A torcida não perdoa.`); } }
}

function squadWeek(G) {
  const j = G.me.job; if (!j) return;
  const c = G.clubs[j.cid]; const sp = G.me.spec || {};
  const sq = G.players.filter((p) => p && p.club === c.id && !!p.u20 === !!j.youth);
  if (!sq.length) return;
  const key = new Set(sq.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 14).map((p) => p.id));
  const slow = 1 - (sp.ge || 0) * 0.25;
  let leaders = 0, indiv = 0;
  for (const p of sq) {
    const fair = playerWage(p, c.country);
    let d = 0;
    if (key.has(p.id) && p.bw >= 2) d -= ({ Ambicioso: 6, Individualista: 5, Temperamental: 5, Promessa: 5, Profissional: 2, Experiente: 2, Leal: 2 }[p.per] || 4);
    else if (p.bw === 0) d += 2;
    if (!p.u20 && p.wage < fair * 0.6) d -= p.per === 'Ambicioso' ? 2 : 1;
    if (p.lst) d -= 1;
    p.sat = clamp(p.sat + (d < 0 ? d * slow : d), 0, 100);
    p.rel = clamp(p.rel + (50 - p.rel) * 0.01 + (p.sat < 30 ? -0.8 * slow : 0), 0, 100);
    p.mor = clamp(p.mor + ((p.sat + p.rel) / 2 - p.mor) * 0.05, 0, 100);
    if (p.per === 'Líder') leaders++; if (p.per === 'Individualista' || (p.per === 'Temperamental' && p.mor < 40)) indiv++;
  }
  const avgRel = sq.reduce((s, p) => s + p.rel, 0) / sq.length;
  const target = clamp(55 + leaders * 3 - indiv * 2.5 + (avgRel - 50) * 0.4 + (sp.ge || 0) * 3, 15, 95);
  c.chem = clamp(c.chem + (target - c.chem) * 0.12, 0, 100);
  // promessas vencidas
  for (const pr of G.me.promises) if (!pr.done && !pr.broken && G.t > pr.until) {
    pr.broken = true;
    if (pr.k === 'titular') { const p = G.players[pr.pid]; if (p && p.club === c.id) { p.rel = clamp(p.rel - 10, 0, 100); p.sat = clamp(p.sat - 8, 0, 100); p.mor = clamp(p.mor - 6, 0, 100); c.chem = clamp(c.chem - 2, 0, 100); msg(G, p.n, `😠 ${p.n} se sente enganado`, `Você prometeu que ele seria titular e não cumpriu. A relação de vocês piorou e o vestiário comenta.`); } }
    if (pr.k === 'reacao') { const ok = (pr.pts0 != null) && (ptsOf(G, c) - pr.pts0) >= 6; if (!ok) { c.board.conf = clamp(c.board.conf - 15, 0, 100); msg(G, 'Diretoria', '❌ Promessa de reação não cumprida', 'Você prometeu reação e ela não veio. A paciência da diretoria está no fim.'); } else { pr.done = true; c.board.conf = clamp(c.board.conf + 8, 0, 100); msg(G, 'Diretoria', '✅ A reação veio', 'A diretoria reconhece a resposta do time. Confiança em alta.'); } }
  }
  G.me.promises = G.me.promises.filter((p) => G.t - p.until < 10);
  squadEvent(G, c, sq, key);
}
const ptsOf = (G, c) => G.comps[c.league]?.table[c.id]?.pts ?? 0;

function squadEvent(G, c, sq, key) {
  const cd = G.me.cd; if (G.t - (cd.sq ?? -9) < 2) return;
  const ok = (k, w = 10) => G.t - (cd['e_' + k] ?? -99) >= w;
  const pcd = (p, k) => G.t - (p.evT ?? -99) >= 16 && !(p.evY && p.evY[k] === G.year);
  const fire = (k, p, title, body, opts, def) => { cd.sq = G.t; cd['e_' + k] = G.t; if (p) { p.evT = G.t; (p.evY ||= {})[k] = G.year; } decision(G, p ? p.n : 'Vestiário', title, body, opts.map((o) => ({ ...o, pid: p?.id })), { def }); };
  const youth = G.me.job.youth;
  let p;
  // pede para ser titular
  if (ok('tit') && (p = sq.find((x) => key.has(x.id) && x.bw >= 3 && x.sat < 55 && x.inj <= 0 && pcd(x, 'tit')))) return fire('tit', p, `🗣️ ${p.n} pede para ser titular`, `${p.n} (${p.pos}, ${p.ovr}, ${p.per.toLowerCase()}) está há ${p.bw} jogos sem entrar e veio conversar: "Professor, quero minha chance."`,
    [{ l: 'Prometer titularidade nos próximos jogos', act: 'promTit' }, { l: 'Explicar que precisa merecer no treino', act: 'explicar' }, ...(youth ? [] : [{ l: 'Liberar para negociar com outros clubes', act: 'liberar' }])], 1);
  // jovem cobra oportunidades
  if (ok('jov') && (p = sq.find((x) => x.age <= 21 && x.pot >= x.ovr + 8 && x.bw >= 3 && pcd(x, 'jov')))) return fire('jov', p, `🌱 ${p.n} quer mais oportunidades`, `O jovem ${p.n} (${p.age} anos, potencial alto) sente que não está tendo chances e teme estagnar.`,
    [{ l: 'Prometer minutos nas próximas semanas', act: 'promTit' }, { l: 'Pedir calma, a hora dele vai chegar', act: 'explicar' }, ...(youth ? [] : [{ l: 'Emprestar/negociar o jogador', act: 'liberar' }])], 1);
  // pede transferência
  if (!youth && ok('transf', 26) && Math.random() < 0.12 && (p = sq.find((x) => x.sat < 22 && ['Ambicioso', 'Individualista', 'Temperamental'].includes(x.per) && !x.lst && pcd(x, 'transf')))) return fire('transf', p, `✈️ ${p.n} pede para ser negociado`, `${p.n} está insatisfeito (satisfação ${Math.round(p.sat)}) e pediu publicamente para sair.`,
    [{ l: 'Aceitar e colocar à venda', act: 'liberar' }, { l: 'Recusar: ele tem contrato', fx: { pmor: -15, prel: -15, chem: -4, psat: -5 } }, { l: 'Conversar e tentar convencê-lo', act: 'convencer' }], 1);
  // insatisfação salarial
  if (!youth && ok('sal') && (p = sq.find((x) => key.has(x.id) && x.wage < playerWage(x, c.country) * 0.6 && x.sat < 60 && x.con > G.year && pcd(x, 'sal')))) return fire('sal', p, `💬 ${p.n} reclama do salário`, `${p.n} ganha ${money(p.wage)}/sem., bem abaixo do que acha justo (${money(playerWage(p, c.country))}). O empresário dele quer conversar.`,
    [{ l: 'Abrir negociação de renovação agora', act: 'abrirRenov' }, { l: 'Prometer reajuste no fim da temporada', fx: { psat: 8, prel: 3 } }, { l: 'Recusar: contrato é contrato', fx: { psat: -10, prel: -8 } }], 2);
  // conflito entre jogadores
  const hot = sq.filter((x) => (x.per === 'Temperamental' || x.per === 'Individualista') && x.mor < 50);
  if (ok('conf', 10) && c.chem < 58 && hot.length >= 2 && Math.random() < 0.5) { const [a, b] = hot; return fire('conf', null, `🥊 Briga no treino: ${a.n} x ${b.n}`, `${a.n} e ${b.n} discutiram feio no treino. O clima pesou.`, [{ l: 'Punir os dois com multa', act: 'punir', a: a.id, b: b.id }, { l: 'Reunir os dois e conversar', act: 'apaziguar', a: a.id, b: b.id }, { l: 'Deixar quieto', fx: { chem: -8 } }], 2); }
  // capitão questiona
  const form = G.comps[youth ? 'U20' : c.league]?.table[c.id]?.form || '';
  const cap = captain(G, c);
  if (ok('cap', 10) && cap && (form.match(/D/g) || []).length >= 3 && !youth) return fire('cap', cap, `🧢 O capitão ${cap.n} questiona o trabalho`, `Depois de ${(form.match(/D/g) || []).length} derrotas nos últimos jogos, o capitão ${cap.n} pediu uma reunião: "O grupo não está entendendo a proposta."`,
    [{ l: 'Ouvir o elenco e ajustar o plano', fx: { prel: 8, chem: 5, mor: 3, conf: -1 } }, { l: 'Bancar suas ideias com firmeza', act: 'firmeza' }, { l: 'Tirar a braçadeira dele', fx: { prel: -25, pmor: -20, chem: -10, mor: -3 } }], 0);
  // quer renovar
  if (!youth && ok('ren') && G.week > 8 && (p = sq.find((x) => x.con <= G.year && x.sat > 60 && key.has(x.id) && pcd(x, 'ren')))) return fire('ren', p, `📄 ${p.n} quer renovar`, `${p.n} está feliz no clube e o contrato termina no fim da temporada. Ele quer saber se você conta com ele.`,
    [{ l: 'Abrir negociação de renovação', act: 'abrirRenov' }, { l: 'Dizer que vai avaliar depois', fx: { psat: -4 } }, { l: 'Avisar que não será renovado', fx: { psat: -25, pmor: -15, prel: -10 } }], 1);
  // perdeu a motivação
  if (ok('mot') && (p = sq.find((x) => x.mor < 32 && key.has(x.id) && pcd(x, 'mot')))) return fire('mot', p, `😔 ${p.n} perdeu a motivação`, `${p.n} anda desanimado nos treinos (moral ${Math.round(p.mor)}).`,
    [{ l: 'Conversa individual de incentivo', act: 'incentivo' }, { l: 'Dar alguns dias de folga', fx: { pmor: 10, pfit: 10, chem: -1 } }, { l: 'Cobrar publicamente', fx: { pmor: -8, prel: -10, mor: 2 } }], 0);
  // relação melhora (positivo, sem decisão)
  if (ok('elo', 12) && (p = sq.find((x) => x.rel > 78 && x.bw === 0 && x.st.j > 5 && pcd(x, 'elo')))) { cd.e_elo = G.t; p.evT = G.t; p.mor = clamp(p.mor + 5, 0, 100); msg(G, p.n, `🤝 ${p.n} elogia o treinador`, `Em entrevista, ${p.n} disse que vive seu melhor momento e agradeceu a confiança do treinador. O elenco gostou.`); c.chem = clamp(c.chem + 2, 0, 100); }
}

// ===================== RESOLUÇÃO DE DECISÕES =====================
export function resolveDecision(G, m, i, auto) {
  const o = m.opts[i]; if (!o || m.done) return '';
  m.done = true; m.choice = i;
  const c = myJobClub(G); const me = G.me;
  if (m.cid != null && (!c || c.id !== m.cid) && !o.act?.startsWith('spons')) return 'A decisão perdeu efeito: você não está mais naquele clube.';
  const P = o.pid != null ? G.players[o.pid] : null;
  if (o.pid != null && (!P || !c || P.club !== c.id)) return 'A situação se resolveu sozinha (o jogador não está mais no elenco).';
  let out = auto ? `(Sem resposta — a diretoria/elenco entendeu como: "${o.l}")` : '';
  const fx = o.fx || {};
  const motK = 1 + (me.spec?.mo || 0) * 0.25;
  if (c) {
    if (fx.conf) c.board.conf = clamp(c.board.conf + fx.conf, 0, 100);
    if (fx.chem) c.chem = clamp(c.chem + fx.chem, 0, 100);
    if (fx.fans) c.fans = clamp(c.fans + fx.fans, 0, 100);
    if (fx.mor || fx.rel) for (const p of G.players) if (p && p.club === c.id && !!p.u20 === !!me.job.youth) { p.mor = clamp(p.mor + (fx.mor || 0) * (fx.mor > 0 ? motK : 1), 0, 100); p.rel = clamp(p.rel + (fx.rel || 0), 0, 100); }
  }
  if (fx.pop) me.pop = clamp(me.pop + fx.pop, 0, 100);
  if (fx.pp) me.pp = clamp(me.pp + fx.pp, 0, 100);
  if (fx.rep) me.rep = clamp(me.rep + fx.rep, 1, 99);
  if (P) { if (fx.pmor) P.mor = clamp(P.mor + fx.pmor, 0, 100); if (fx.prel) P.rel = clamp(P.rel + fx.prel, 0, 100); if (fx.psat) P.sat = clamp(P.sat + fx.psat, 0, 100); if (fx.pfit) P.fit = clamp(P.fit + fx.pfit, 0, 100); }
  if (m.fixId != null && o.boast) { const f = G.fix[m.fixId]; if (f) f._boast = true; }
  if (m.press && o.tone) { m.head = pressHeadline(G, m, i); news(G, `🎤 ${m.head}`); }
  const t = c?.board.type;
  switch (o.act) {
    case 'metaDown': { const p = 0.35 + (me.rep - c.rep) / 100 + (t === 'conservadora' ? 0.1 : t === 'impaciente' || t === 'ambiciosa' ? -0.15 : 0); if (Math.random() < p) { me.obj.pos = Math.min(me.obj.n || 20, me.obj.pos + 3); me.obj.text = me.obj.pos <= 1 ? me.obj.text : `Terminar entre os ${me.obj.pos} primeiros`; c.board.conf = clamp(c.board.conf - 3, 0, 100); out = `✅ Meta revisada: ${me.obj.text}.`; } else { c.board.conf = clamp(c.board.conf - 6, 0, 100); out = '❌ A diretoria manteve a meta e não gostou do pedido.'; } break; }
    case 'metaUp': me.obj.pos = Math.max(1, me.obj.pos - 3); me.obj.text = me.obj.pos === 1 ? 'Ser campeão' : `Terminar entre os ${me.obj.pos} primeiros`; c.board.conf = clamp(c.board.conf + 8, 0, 100); me.pop = clamp(me.pop + 3, 0, 100); out = `📈 Nova meta: ${me.obj.text}. A diretoria adorou — e vai cobrar.`; break;
    case 'metaRevisada': me.obj.pos = Math.min(me.obj.n || 20, me.obj.pos + 5); me.obj.text = `Terminar entre os ${me.obj.pos} primeiros`; c.board.conf = clamp(c.board.conf - 5, 0, 100); out = `Meta revisada: ${me.obj.text}.`; break;
    case 'metaMaior': me.obj.pos = Math.max(1, me.obj.pos - 3); me.obj.text = me.obj.pos === 1 ? 'Ser campeão' : `Terminar entre os ${me.obj.pos} primeiros`; me.money += me.job.wage * 4; c.board.conf = clamp(c.board.conf + 6, 0, 100); out = `Meta: ${me.obj.text}. Bônus de ${money(me.job.wage * 4)} pago.`; break;
    case 'promReacao': me.promises.push({ k: 'reacao', until: G.t + 4, pts0: ptsOf(G, c) }); c.board.conf = clamp(c.board.conf + 6, 0, 100); out = 'Promessa feita: pelo menos 6 pontos nas próximas 4 semanas.'; break;
    case 'paciencia': if (Math.random() < me.rep / 100 + 0.25) { c.board.conf = clamp(c.board.conf + 4, 0, 100); out = 'A diretoria concordou em dar mais tempo.'; } else { c.board.conf = clamp(c.board.conf - 4, 0, 100); out = 'A diretoria não se convenceu.'; } break;
    case 'vendeEstrela': { const best = G.players.filter((p) => p && p.club === c.id && !p.u20).sort((a, b) => playerValue(b) - playerValue(a))[0]; if (best) { best.lst = true; best.sat = clamp(best.sat - 5, 0, 100); } c.board.conf = clamp(c.board.conf + 5, 0, 100); out = best ? `${best.n} foi colocado à venda.` : ''; break; }
    case 'congelar': me.freeze = G.t + Math.max(4, 46 - G.week); c.board.conf = clamp(c.board.conf + 4, 0, 100); out = 'Contratações congeladas até o fim da temporada.'; break;
    case 'renov': me.job.wage = Math.round(me.job.wage * o.r / 100) * 100; me.job.until = G.year + o.y; out = `✍️ Contrato renovado até ${me.job.until}. Novo salário: ${money(me.job.wage)}/sem.`; c.board.conf = clamp(c.board.conf + 3, 0, 100); break;
    case 'renovAlta': if (c.board.conf > 72 || Math.random() < (c.board.conf - 40) / 60) { me.job.wage = Math.round(me.job.wage * 1.25 / 100) * 100; me.job.until = G.year + 3; out = `✍️ A diretoria aceitou! Contrato até ${me.job.until}, salário ${money(me.job.wage)}/sem.`; } else { me.job.wage = Math.round(me.job.wage * 1.08 / 100) * 100; me.job.until = G.year + 1; out = 'A diretoria recusou o aumento grande; renovou por 1 ano com +8%.'; } break;
    case 'naoRenov': me.job.leaving = true; out = 'Você sai do clube ao fim da temporada.'; break;
    case 'promTit': me.promises.push({ k: 'titular', pid: P.id, until: G.t + 3 }); P.sat = clamp(P.sat + 15, 0, 100); P.rel = clamp(P.rel + 8, 0, 100); out = `Promessa feita a ${P.n}: ele precisa jogar nas próximas 3 semanas.`; break;
    case 'explicar': if (['Profissional', 'Experiente', 'Disciplinado', 'Leal'].includes(P.per)) { P.sat = clamp(P.sat + 6, 0, 100); P.rel = clamp(P.rel + 3, 0, 100); out = `${P.n} entendeu e vai seguir trabalhando.`; } else { P.rel = clamp(P.rel - 8, 0, 100); P.mor = clamp(P.mor - 6, 0, 100); out = `${P.n} (${P.per.toLowerCase()}) não gostou da resposta.`; } break;
    case 'liberar': P.lst = true; P.sat = clamp(P.sat + 12, 0, 100); out = `${P.n} está à venda. Aguarde propostas.`; break;
    case 'convencer': if (Math.random() < P.rel / 100 + 0.15) { P.sat = clamp(P.sat + 20, 0, 100); P.rel = clamp(P.rel + 5, 0, 100); out = `${P.n} aceitou ficar e lutar por espaço.`; } else { P.sat = clamp(P.sat - 5, 0, 100); P.lst = true; out = `${P.n} não mudou de ideia; você o colocou à venda.`; } break;
    case 'abrirRenov': out = `Vá ao perfil de ${P.n} e toque em "Renovar".`; P.sat = clamp(P.sat + 5, 0, 100); break;
    case 'punir': for (const id of [o.a, o.b]) { const x = G.players[id]; if (x) { x.mor = clamp(x.mor - 10, 0, 100); x.rel = clamp(x.rel - 4, 0, 100); } } c.chem = clamp(c.chem + 6, 0, 100); out = 'Multa aplicada. O elenco entendeu o recado.'; break;
    case 'apaziguar': if (Math.random() < 0.6 + (me.spec?.ge || 0) * 0.1) { c.chem = clamp(c.chem + 5, 0, 100); out = 'Os dois fizeram as pazes.'; } else { c.chem = clamp(c.chem - 3, 0, 100); out = 'A conversa não resolveu.'; } break;
    case 'firmeza': if (me.rep > 55 || c.board.conf > 60) { c.chem = clamp(c.chem + 2, 0, 100); out = 'Sua autoridade foi respeitada.'; } else { c.chem = clamp(c.chem - 6, 0, 100); if (P) P.rel = clamp(P.rel - 10, 0, 100); out = 'Parte do elenco ficou contra você.'; } break;
    case 'incentivo': if (Math.random() < 0.55 + P.rel / 200 + (me.spec?.mo || 0) * 0.08) { P.mor = clamp(P.mor + 18, 0, 100); P.rel = clamp(P.rel + 5, 0, 100); out = `${P.n} voltou animado.`; } else { P.mor = clamp(P.mor + 4, 0, 100); out = `${P.n} melhorou um pouco.`; } break;
    case 'pre': out = applyPre(G, o.k); break;
    case 'agRaise': if (P) { P.wage = o.w; out = `${P.n} recebeu o aumento: ${money(o.w)}/sem.`; } break;
    case 'secretLeak': if (P && Math.random() < 0.5) { P.lst = true; P.sat = clamp(P.sat - 10, 0, 100); out = `${P.n} pediu para ser negociado. O ${G.clubs[o.buyer]?.name || 'interessado'} deve fazer proposta.`; } else out = 'A história esfriou.'; break;
    case 'buyOpt': if (P && P.loan) { P.loan.buy = true; out = `Você vai comprar ${P.n} por ${money(P.loan.fee)} ao fim da temporada.`; } break;
    case 'spons': { if (c) { const s = c.spons.find((x) => x.slot === o.slot); if (s) { s.n = o.sn; s.val = o.val; s.until = G.year + o.y; syncSpon(c); out = `🤝 Contrato com ${o.sn}: ${money(o.val)}/temporada até ${s.until}.`; } } break; }
  }
  if (!out || out === auto) { const L = { conf: 'Diretoria', mor: 'Moral do elenco', chem: 'Entrosamento', fans: 'Torcida', pop: 'Popularidade', pp: 'Pressão da imprensa', rep: 'Reputação', pmor: 'Moral dele', prel: 'Relação com ele', psat: 'Satisfação dele', rel: 'Relação com o elenco' }; const t = Object.entries(fx).filter(([k, v]) => L[k] && v).map(([k, v]) => `${L[k]} ${v > 0 ? '+' : ''}${v}`).join(' · '); if (t) out = (out ? out + ' ' : '') + t; }
  me.decLog.unshift({ y: G.year, w: G.week, t: m.title, a: o.l }); if (me.decLog.length > 60) me.decLog.length = 60;
  return out || 'Decisão registrada.';
}

// ===================== IMPRENSA CONTEXTUAL =====================
const A = (l, fx, extra = {}) => ({ l, fx, ...extra });
export function pressBefore(G, f) {
  if (!isSenior(G) || G.me.pressOn === false) return null;
  const c = myJobClub(G); const opp = G.clubs[f.h === c.id ? f.a : f.h]; const comp = G.comps[f.c];
  const L = G.comps[c.league]; const form = L?.table?.[c.id]?.form || '';
  let st = null; if (comp.kind === 'league' && comp.table?.[c.id]) { try { st = standings(G, comp, 0); } catch { st = null; } }
  return pressPre(G, { c, opp, comp, f, derby: isDerby(G, f.h, f.a), form, st });
}
export function pressAfter(G, f) {
  if (!isSenior(G) || G.me.pressOn === false) return null;
  const c = myJobClub(G); const side = f.h === c.id ? 0 : 1; const opp = G.clubs[side ? f.h : f.a];
  const gf = side ? f.ag : f.hg, ga = side ? f.hg : f.ag; const comp = G.comps[c.league];
  const form = comp?.table[c.id]?.form || '';
  return pressPost(G, { c, opp, f, side, gf, ga, derby: isDerby(G, f.h, f.a), form });
}
export function pressDecision(G, f, P, when) {
  decision(G, 'Imprensa', when === 'pre' ? '🎤 Coletiva pré-jogo' : '🎤 Coletiva pós-jogo', P.q, P.a, { def: 0, fixId: f.i, press: true, weeks: 1, rep: P.rep, ctx: P.ctx, when });
  return G.inbox[0];
}

// ===================== ESPECIALIZAÇÕES =====================
export const specPoints = (G) => { const tot = Math.floor((G.me.xp || 0) / 140); const used = Object.values(G.me.spec || {}).reduce((s, x) => s + x, 0); return { tot, used, free: Math.max(0, tot - used) }; };
export function spendSpec(G, k) { const sp = specPoints(G); if (sp.free <= 0) return 'Sem pontos livres. Ganhe experiência treinando.'; if ((G.me.spec[k] || 0) >= 3) return 'Nível máximo nesta especialização.'; G.me.spec[k]++; return `Especialização ${SPECS[k]} nível ${G.me.spec[k]}!`; }
export function repBreakdown(G) {
  const me = G.me;
  return [
    ['Títulos', Math.min(100, me.titles.reduce((s, t) => s + (t.w || 5), 0) * 2)],
    ['Experiência', Math.min(100, me.stats.j / 4)],
    ['Jovens revelados', Math.min(100, (me.car?.revealed?.length || 0) * 12)],
    ['Resultados', me.stats.j ? Math.round(me.stats.v / me.stats.j * 100) : 0],
    ['Popularidade', Math.round(me.pop)],
    ['Imagem na imprensa', Math.round(100 - me.pp)],
  ];
}

// ===================== CONQUISTAS PESSOAIS =====================
export function achievements(G) {
  const me = G.me; const big = me.hist.some((h) => !h.youth && (G.clubs[h.cid]?.rep || 0) >= 85);
  const countries = new Set(me.hist.filter((h) => !h.youth).map((h) => G.clubs[h.cid]?.country));
  const ownSerieA = me.own != null && G.clubs[me.own]?.league === 'BRA';
  return [
    ['🏆', 'Primeiro título', me.titles.length >= 1],
    ['🥇', 'Campeão de uma 1ª divisão', me.titles.some((t) => t.w === 10)],
    ['🌎', 'Campeão continental', me.titles.some((t) => t.w === 15)],
    ['🌱', 'Revelar 5 jogadores da base', (me.car?.revealed?.length || 0) >= 5],
    ['🏟️', 'Treinar um gigante (reputação 85+)', big],
    ['✈️', 'Trabalhar em 3 países', countries.size >= 3],
    ['💯', '100 vitórias na carreira', me.stats.v >= 100],
    ['🏗️', 'Fundar o próprio clube', me.own != null],
    ['⭐', 'Levar seu clube à Série A', ownSerieA],
    ['🏦', 'Controlar uma SAF', G.clubs.some((c) => c.own.user >= 51 && c.saf)],
    ['🎖️', 'Prêmio de melhor técnico', me.awards.some((a) => a.k === 'tecnico')],
    ['🌍', 'Comandar uma seleção', (me.natHist || []).length > 0],
    ['🏆', 'Campeão do mundo', me.titles.some((t) => t.w === 25)],
    ['🥇', 'Campeão continental de seleções', me.titles.some((t) => t.nat && t.w === 12)],
  ];
}

// ===================== ACONTECIMENTOS DO MUNDO =====================
function worldEvents(G) {
  const cd = G.me.cd;
  // clubes em crise vendem estrelas
  if (G.week % 3 === 0) {
    const crisis = G.clubs.filter((c) => c.league && c.money < -(c.spon || 1e6) * 0.5 && !(G.me.job && G.me.job.cid === c.id) && c.own.user < 51);
    for (const c of crisis.slice(0, 2)) {
      const star = G.players.filter((p) => p && p.club === c.id && !p.u20).sort((a, b) => playerValue(b) - playerValue(a))[0];
      const buyer = star && G.clubs.filter((b) => b.league && b.id !== c.id && b.money > playerValue(star) * 1.2 && b.rep >= c.rep - 5 && !(G.me.job && G.me.job.cid === b.id)).sort((a, b) => b.money - a.money)[0];
      if (!buyer) continue;
      const fee = Math.round(playerValue(star) * 0.85 / 1000) * 1000;
      c.money += fee; c.fin.tin += fee; buyer.money -= fee; buyer.fin.tout += fee;
      star.club = buyer.id; star.wage = playerWage(star, buyer.country); star.con = G.year + 3; star.lst = false; c.lineup = null; buyer.lineup = null;
      news(G, `🔥 Em crise financeira, ${c.name} vende ${star.n} ao ${buyer.name} por ${money(fee)}.`, 'mercado');
      if (fee > 80e6) tl(G, `${star.n}: ${c.name} → ${buyer.name} (${money(fee)})`, 'mercado');
      c.fans = clamp(c.fans - 4, 0, 100);
      if (rnd() < 0.3) { c.board.type = 'conservadora'; c.board.pres = genName(c.country); news(G, `🏛️ ${c.name} troca de presidente após a crise: ${c.board.pres} assume prometendo austeridade.`, 'clube'); }
    }
  }
  const c = myJobClub(G); if (!c) return;
  // protesto da torcida
  if (c.fans < 22 && G.t - (cd.prot ?? -99) > 8 && !G.me.job.youth) {
    cd.prot = G.t; c.board.conf = clamp(c.board.conf - 5, 0, 100);
    for (const p of G.players) if (p && p.club === c.id && !p.u20) p.mor = clamp(p.mor - 3, 0, 100);
    msg(G, 'Torcida', '📢 Protesto da torcida', `Torcedores do ${c.name} protestaram no CT contra a fase do time. A diretoria sentiu a pressão.`);
    news(G, `📢 Torcida do ${c.name} protesta no CT.`);
  }
  // patrocinador interessado (boa fase)
  const form = G.comps[c.league]?.table[c.id]?.form || '';
  if (!G.me.job.youth && c.fans > 68 && (form.match(/V/g) || []).length >= 4 && G.t - (cd.spint ?? -99) > 20) {
    cd.spint = G.t;
    const s = c.spons.find((x) => x.slot === 'Manga') || c.spons[0];
    const val = Math.round(Math.max(s.val * rf(1.25, 1.5), sponsorValue(G, c, s.slot)) / 1000) * 1000;
    const sn = pick(SPONSORS.filter((n) => !c.spons.some((x) => x.n === n)));
    if (c.own.user >= 51) decision(G, 'Departamento comercial', `🤝 ${sn} quer patrocinar o clube`, `Com a boa fase, ${sn} oferece ${money(val)}/temporada pela ${s.slot.toLowerCase()} (hoje: ${s.n}, ${money(s.val)}).`, [{ l: 'Aceitar por 3 anos', act: 'spons', slot: s.slot, sn, val, y: 3 }, { l: 'Recusar e manter o atual', fx: {} }], { def: 1 });
    else { s.n = sn; s.val = val; s.until = G.year + 3; syncSpon(c); c.board.conf = clamp(c.board.conf + 3, 0, 100); news(G, `🤝 ${c.name} fecha novo patrocínio com ${sn} (${money(val)}/temporada) graças à boa fase.`, 'clube'); }
  }
  // joia surge na base
  if ((c.infra.base || 1) >= 3 && rnd() < 0.008 * c.infra.base && G.t - (cd.joia ?? -99) > 20) {
    cd.joia = G.t;
    const p = makePlayer(G, { n: genName(c.country), pos: pick(['ATA', 'MEI', 'PE', 'PD', 'ZAG', 'VOL', 'GOL']), age: 15, ovr: 44 + ri(0, 8), club: c.id, u20: true, nat: c.country, wage: 300 });
    p.pot = ri(84, 93); p.per = 'Promessa';
    msg(G, 'Categorias de base', `💎 Joia na base: ${p.n}`, `Os treinadores da base estão impressionados com ${p.n}, 15 anos (${p.pos}). Dizem que é a maior promessa dos últimos anos.`);
  }
  // aposentadoria anunciada
  if (G.week === 38) for (const p of G.players) if (p && p.club === c.id && p.age >= 35 && !p.retAnn && rnd() < 0.5) { p.retAnn = true; news(G, `👋 ${p.n} anuncia que vai se aposentar ao fim da temporada.`); }
}

// ===================== GANCHOS SEMANAIS =====================
export function lifeWeek(G) {
  buildsWeek(G);
  boardWeek(G);
  squadWeek(G);
  worldEvents(G);
  // juros de dívida e salários da comissão
  for (const c of G.clubs) {
    if (!c.league && c.league !== 'AMA') continue;
    const sw = staffWages(c); if (sw) { c.money -= sw; c.fin.staff += sw; }
    if (c.money < 0) { const j = -c.money * 0.0025; c.money -= j; c.fin.juros += j; }
  }
  // decisões que expiram sem resposta usam a opção padrão
  for (const m of G.inbox) if (m.kind === 'dec' && !m.done && m.exp != null && m.exp < G.t) { const r = resolveDecision(G, m, m.def ?? 0, true); m.auto = r; }
}

// ===================== PRÊMIOS E HISTÓRIA (fim de temporada) =====================
export function seasonAwards(G) {
  const y = G.year; const H = (G.hist[y] ||= { champs: [], awards: [], notes: [] });
  for (const comp of Object.values(G.comps)) if (comp.champion != null) H.champs.push({ c: comp.name, cid: comp.champion, club: G.clubs[comp.champion].name, kind: comp.kind, tier: comp.tier, coach: G.clubs[comp.champion].coach?.n || '' });
  for (const lg of ['BRA', 'ENG1', 'ESP1', 'ITA1', 'ARG1', 'BRB']) {
    const comp = G.comps[lg]; if (!comp) continue;
    const ps = G.players.filter((p) => p && p.club >= 0 && !p.u20 && comp.clubs.includes(p.club));
    const minJ = Math.max(8, Math.round((comp.games || 30) * 0.4));
    const nota = (p) => (p.st.j ? p.st.ns / p.st.j : 0);
    const best = ps.filter((p) => p.st.j >= minJ).sort((a, b) => nota(b) + b.st.g * 0.03 - nota(a) - a.st.g * 0.03)[0];
    const top = ps.slice().sort((a, b) => b.st.g - a.st.g)[0];
    const young = ps.filter((p) => p.age <= 21 && p.st.j >= minJ * 0.6).sort((a, b) => nota(b) - nota(a))[0];
    const champ = comp.champion != null ? G.clubs[comp.champion] : null;
    const userCoach = G.me.job && !G.me.job.youth && champ && champ.id === G.me.job.cid;
    const coachN = champ ? (userCoach ? G.me.name : champ.coach?.n || '—') : '—';
    const a = { lg: comp.short, best: best && { n: best.n, club: G.clubs[best.club].short, v: nota(best).toFixed(2) }, top: top && { n: top.n, club: G.clubs[top.club].short, g: top.st.g }, young: young && { n: young.n, club: G.clubs[young.club].short }, coach: coachN };
    H.awards.push(a);
    for (const [p, k] of [[best, 'Melhor jogador'], [top, 'Artilheiro'], [young, 'Melhor jovem']]) if (p) (p.aw ||= []).push({ y, k, lg: comp.short });
    if (userCoach) { G.me.awards.push({ y, k: 'tecnico', lg: comp.short }); G.me.rep = clamp(G.me.rep + 3, 1, 99); msg(G, 'Prêmios', `🎖️ Melhor técnico da ${comp.short}`, `Você foi eleito o melhor técnico da temporada ${y}!`); }
    if (top && (!G.rec.goals || top.st.g > G.rec.goals.g)) { G.rec.goals = { n: top.n, g: top.st.g, y, lg: comp.short }; if (y > 2026) tl(G, `Recorde: ${top.n} marca ${top.st.g} gols na temporada`, 'rec'); }
  }
  for (const ch of H.champs.filter((x) => x.kind === 'cont' || (x.kind === 'league' && x.tier === 1))) tl(G, `🏆 ${ch.club} campeão: ${ch.c}`, 'titulo');
}

export function secondaryEnd(G) {
  const me = G.me; const c = myJobClub(G);
  if (c && !me.job.youth) {
    const ok = evalSecondary(G, c);
    if (ok != null && me.obj2) { c.board.conf = clamp(c.board.conf + (ok ? 10 : -12), 0, 100); if (ok) me.rep = clamp(me.rep + 1, 1, 99); msg(G, 'Diretoria', ok ? '✅ Meta secundária cumprida' : '❌ Meta secundária não cumprida', `${me.obj2.text}: ${ok ? 'cumprida! A diretoria ficou satisfeita.' : 'não foi cumprida. A diretoria anotou.'}`); }
  }
}
export function lifeSeasonEnd(G) {
  const me = G.me; const c = myJobClub(G);
  coachesSeason(G);
  sponsorsSeason(G);
  // diretorias mudam às vezes
  for (const k of G.clubs) {
    if (!k.league) continue;
    if (rnd() < (k.fans < 25 ? 0.25 : 0.04)) {
      const old = k.board.type; k.board.type = pick(Object.keys(BOARD_TYPES).filter((x) => x !== old)); k.board.pres = genName(k.country);
      if (c && k.id === c.id) { msg(G, 'Clube', `🏛️ Nova diretoria no ${k.name}`, `${k.board.pres} assume a presidência. Perfil da nova diretoria: ${BOARD_TYPES[k.board.type].n} — ${BOARD_TYPES[k.board.type].d}`); k.board.conf = 55; }
      else if (k.rep >= 75) news(G, `🏛️ ${k.board.pres} é o novo presidente do ${k.name}.`, 'clube');
    }
    // IA investe em estrutura
    if (k.own.user < 51 && !(c && c.id === k.id)) for (const kind of ['ct', 'base', 'med', 'mod']) { if (k.money > infraCost(k, kind) * 3 && !canBuild(G, k, kind) && rnd() < 0.25) startBuild(G, k, kind); }
    // torcida cresce com sucesso
    const last = k.hist[k.hist.length - 1]; if (last) k.fans = clamp(k.fans + (last.pos <= 3 ? 4 : last.pos >= 15 ? -3 : 0) + (50 - k.fans) * 0.05, 5, 100);
    k.chem = 60;
  }
  for (const p of G.players) if (p) { p.bw = 0; if (p.sat < 50) p.sat += 10; }
  me.promises = []; me.freeze = null;
  // contrato do técnico
  if (c && !me.job.youth && (me.job.leaving || (me.job.until <= G.year && c.own.user < 51 && c.board.conf < 52))) return 'leave';
  if (c && !me.job.youth && me.job.until <= G.year) me.job.until = G.year + 1;
  return null;
}
export function retiredToCoach(G, p) {
  if (p.ovr >= 74 && rnd() < 0.3) { const k = newCoach(G, { n: p.n, nat: p.nat, age: p.age + 1, rep: 18 + (p.ovr - 70) * 2, ex: true }); if (p.ovr >= 82) news(G, `🎓 Ídolo ${p.n} se aposenta e inicia carreira de técnico.`, 'tec'); return k; }
}
export function revealPlayer(G, p) { const r = G.me.car.revealed; if (!r.includes(p.id)) { r.push(p.id); G.me.rep = clamp(G.me.rep + 0.8, 1, 99); } }
