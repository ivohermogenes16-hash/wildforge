// =====================================================================
// UNIVERSO VIVO — personalidade dos treinadores, rivalidades, adversários
// que estudam o usuário, agentes, identidade dos clubes, torcidas, crises,
// histórias dos jogadores, legado, federações/regulamentos, aposentadoria.
// Tudo é calculado por eventos/semana, sem simular detalhe desnecessário.
// =====================================================================
import { clamp, ri, rf, rnd, pick, money, hash } from '../util.js';
import { genName } from './world.js';
import { playerValue, playerWage, coachWage } from './econ.js';
import { standings } from './season.js';
import { decision, tl, coachOf, newCoach, staffQ } from './life.js';
import { COUNTRIES } from '../data/leagues.js';
import { FED_OLD } from '../data/leagues2.js';

function msg(G, from, title, body, extra = {}) { G.inbox.unshift({ id: (G.inbox[0]?.id || 0) + 1, t: G.t, y: G.year, w: G.week, from, title, body, read: false, ...extra }); if (G.inbox.length > 140) G.inbox.length = 140; }
function news(G, txt, cat = '') { G.news.unshift({ t: G.t, y: G.year, w: G.week, txt, cat }); if (G.news.length > 220) G.news.length = 220; }
const myClub = (G) => (G.me.job ? G.clubs[G.me.job.cid] : null);

// ---------------- treinadores: traços e filosofia ----------------
export const TRAITS = ['Formador de jovens', 'Especialista em contratações', 'Pragmático', 'Motivador', 'Estrategista'];
export const PHIL = { Ofensivo: 'Futebol de ataque, muitos gols', Defensivo: 'Solidez defensiva acima de tudo', 'Posse de bola': 'Controle do jogo com a bola', 'Contra-ataque': 'Bloco baixo e transições rápidas', Equilibrado: 'Equilíbrio entre setores', 'Pressão alta': 'Marcação alta e intensidade' };
const PREF = ['jovens velozes', 'jogadores experientes', 'meias criativos', 'zagueiros altos', 'atacantes de área', 'laterais ofensivos'];
export function coachTraits(k) {
  if (!k) return k;
  const h = hash(k.n + k.id);
  if (!TRAITS.includes(k.trait)) k.trait = TRAITS[(h >>> 0) % TRAITS.length];
  if (!PREF.includes(k.pref)) k.pref = PREF[(h >>> 3) % PREF.length]; k.brel ??= 50 + (h % 30) - 10;
  return k;
}
// o traço do técnico muda o orçamento de contratações da IA
export function aiBudgetMul(G, c) {
  let m = 1; const k = coachTraits(coachOf(G, c));
  if (k?.trait === 'Especialista em contratações') m *= 1.35; else if (k?.trait === 'Formador de jovens') m *= 0.75;
  if (c.own?.user > 0 && c.strat) m *= { titulos: 1.35, formacao: 0.7, lucro: 0.5, equilibrio: 1 }[c.strat] || 1;
  if (G.uv?.regs?.ffp && c.money < 0) m = 0;
  return m;
}
export function youthBonus(G, c) {
  let b = 0; const k = coachTraits(coachOf(G, c));
  if (k?.trait === 'Formador de jovens') b += 4;
  if (c.own?.user > 0 && c.strat === 'formacao') b += 3;
  for (const a of c.acad || []) b += { nacional: 2, internacional: 1, talentos: 2, escola: 1, parceria: 0 }[a.t] || 0;
  return b;
}
// IA muda a postura durante a partida (usado pelo LiveMatch)
export function aiInMatch(G, side, sd, score, min) {
  if (sd.user || (min !== 60 && min !== 75)) return;
  const k = coachTraits(sd.club.coach?.id != null ? G.coaches[sd.club.coach.id] : null); const st = k?.style;
  const diff = score[side] - score[1 - side];
  if (diff < 0 && st !== 'Defensivo') { sd.tact.ment = 2; sd.tact.press = 2; }
  else if (diff > 0 && (k?.trait === 'Pragmático' || st === 'Defensivo' || st === 'Contra-ataque')) { sd.tact.ment = 0; sd.tact.press = 1; }
  else if (diff === 0 && min === 75 && k?.trait === 'Estrategista') sd.tact.ment = 1;
  return true;
}

// ---------------- adversários estudam o usuário ----------------
export function logUserTactic(G, tact) {
  const L = (G.me.tlog ||= []); L.push([tact.form, tact.ment, tact.press]); if (L.length > 10) L.shift();
}
export function oppStudy(G, opp) {
  const L = G.me.tlog || []; if (L.length < 5) return { extra: 0, n: L.length };
  const cnt = {}; for (const [f] of L) cnt[f] = (cnt[f] || 0) + 1;
  const [form, n] = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  const share = n / L.length; const mentAvg = L.reduce((s, x) => s + x[1], 0) / L.length;
  const k = coachTraits(coachOf(G, opp)); const skill = clamp((k?.rep ?? opp.rep) / 80, 0.4, 1.2) * (k?.trait === 'Estrategista' ? 1.25 : 1);
  const extra = share >= 0.7 ? Math.min(1.4, (share - 0.6) * 3 * skill) : 0;
  return { extra: Math.round(extra * 10) / 10, form, n, share, counter: mentAvg >= 1.5 ? 0 : mentAvg <= 0.5 ? 2 : null, skill };
}
// relatório pré-jogo do adversário
export function scoutReport(G, opp, R) {
  const k = coachTraits(coachOf(G, opp)); const lines = [];
  const comp = G.comps[opp.league]; const t = comp?.table?.[opp.id];
  const sq = G.players.filter((p) => p && p.club === opp.id && !p.u20).sort((a, b) => b.ovr - a.ovr);
  const top = sq.slice().sort((a, b) => b.st.g - a.st.g)[0];
  const strong = R.att > R.def + 3 ? 'Ataque forte' : R.def > R.att + 3 ? 'Defesa sólida' : 'Time equilibrado';
  const weak = R.def < R.att - 3 ? 'defesa vulnerável' : R.ctl < Math.min(R.att, R.def) ? 'meio-campo fraco' : 'poucas fragilidades';
  lines.push(`Ponto forte: ${strong}. Fragilidade: ${weak}.`);
  if (k) lines.push(`Técnico ${k.n}: ${k.style || 'Equilibrado'} (${PHIL[k.style] || ''}), ${k.trait.toLowerCase()}, prefere ${k.pref}.`);
  if (t) lines.push(`Campanha: ${t.w}V ${t.d}E ${t.l}D, ${t.gf} gols marcados e ${t.ga} sofridos. Forma: ${t.form || '—'}.`);
  if (top && top.st.g) lines.push(`Artilheiro: ${top.n} (${top.st.g} gols).`);
  return lines;
}

// ---------------- rivalidades pessoais ----------------
export function rivalryEvent(G, kid, pts, why) {
  if (kid == null || !G.coaches[kid] || G.coaches[kid].ret) return;
  const R = (G.uv.riv[kid] ||= { pts: 0, why: [], since: G.year });
  const before = R.pts; R.pts = Math.min(30, R.pts + pts); R.why.unshift(`${G.year}: ${why}`); R.why = R.why.slice(0, 6);
  const k = G.coaches[kid];
  if (before < 4 && R.pts >= 4) { news(G, `⚔️ Nasce uma rivalidade: ${G.me.name} x ${k.n}. ${why}`, 'tec'); msg(G, 'Imprensa', `⚔️ ${k.n} virou seu rival`, `A imprensa já trata ${k.n} como seu rival declarado. Motivo mais recente: ${why}\nJogos contra ele terão mais repercussão na torcida e na imprensa.`); tl(G, `Rivalidade: ${G.me.name} x ${k.n}`, 'tec'); }
  if (before < 10 && R.pts >= 10) { news(G, `🔥 ${G.me.name} x ${k.n} já é uma das maiores rivalidades do futebol.`, 'tec'); tl(G, `Grande rivalidade: ${G.me.name} x ${k.n}`, 'tec'); }
}
export const rivalLevel = (G, kid) => { const p = G.uv?.riv?.[kid]?.pts || 0; return p >= 10 ? 2 : p >= 4 ? 1 : 0; };
export function rivalOfClub(G, c) { const k = coachOf(G, c); return k ? rivalLevel(G, k.id) : 0; }

// ---------------- agentes ----------------
export const AG_TYPES = { Exigente: 'Exige salários altos e cláusulas', Dinheiro: 'Prioriza o maior salário', 'Clube grande': 'Só aceita clubes maiores', Jovens: 'Prioriza minutos para jovens', Difícil: 'Trava negociações e pede mais' };
function genAgents(G) {
  const out = []; const nats = ['BR', 'BR', 'AR', 'ES', 'IT', 'EN', 'PT', 'FR', 'DE', 'NL'];
  for (let i = 0; i < 44; i++) out.push({ id: i, n: genName(pick(nats)), t: Object.keys(AG_TYPES)[i % 5], inf: ri(20, 95), conf: 0 });
  return out;
}
export function agentOf(G, p) { if (!p || !G.uv) return null; return G.uv.agents[(p.ag ??= hash(p.key || p.n) % G.uv.agents.length)]; }
export function agentWageMul(G, p, c) {
  const a = agentOf(G, p); if (!a) return 1;
  const from = p.club >= 0 ? G.clubs[p.club] : null;
  return { Dinheiro: 1.18, Exigente: 1.1, Difícil: 1.12, Jovens: p.age <= 21 && c.rep < 70 ? 0.9 : 1, 'Clube grande': from && c.rep < from.rep ? 1.25 : 1 }[a.t] || 1;
}
export function agentBlock(G, p, c) {
  const a = agentOf(G, p); if (!a) return null;
  const from = p.club >= 0 ? G.clubs[p.club] : null;
  if (a.t === 'Clube grande' && from && c.rep < from.rep - 3 && p.ovr >= 70) return `O empresário ${a.n} só aceita levar ${p.n} para um clube maior.`;
  if (a.t === 'Difícil' && rnd() < 0.15) { a.conf++; return `O empresário ${a.n} travou a negociação e quer reabrir os termos. Tente de novo mais tarde.`; }
  return null;
}
function agentsWeek(G) {
  const c = myClub(G); const cd = G.me.cd;
  if (c && !G.me.job.youth && G.week > 3 && G.t - (cd.agRaise ?? -99) > 6 && rnd() < 0.3) {
    const p = G.players.filter((x) => x && x.club === c.id && !x.u20 && !x.loan && x.ovr >= (x.s0 ?? x.ovr) + 2 && x.wage < playerWage(x, c.country) * 0.85 && x.agRaise !== G.year).sort((a, b) => b.ovr - a.ovr)[0];
    if (p) {
      cd.agRaise = G.t; p.agRaise = G.year; const a = agentOf(G, p); const nw = Math.round(playerWage(p, c.country) * (a.t === 'Dinheiro' ? 1.15 : 1) / 50) * 50;
      decision(G, `Empresário ${a.n}`, `💼 Agente de ${p.n} pede aumento`, `${a.n} (${a.t.toLowerCase()}) diz que ${p.n} evoluiu e ganha pouco: hoje ${money(p.wage)}/sem. Ele quer ${money(nw)}/sem.`, [
        { l: `Dar o aumento (${money(nw)}/sem.)`, pid: p.id, act: 'agRaise', w: nw, fx: { psat: 12, pmor: 6 } },
        { l: 'Prometer revisão no fim da temporada', pid: p.id, fx: { psat: -4, prel: -3 } },
        { l: 'Recusar: contrato é contrato', pid: p.id, fx: { psat: -14, pmor: -8, chem: -1 } },
      ], { def: 1 });
    }
  }
  if (c && !G.me.job.youth && G.t - (cd.agSecret ?? -99) > 12 && rnd() < 0.08) {
    const p = G.players.filter((x) => x && x.club === c.id && !x.u20 && x.ovr >= 72).sort(() => rnd() - 0.5)[0];
    const buyer = p && G.clubs.filter((b) => b.league && b.rep > c.rep + 3 && b.id !== c.id).sort(() => rnd() - 0.5)[0];
    if (p && buyer) {
      cd.agSecret = G.t; const a = agentOf(G, p);
      decision(G, 'Bastidores', `🕵️ Negociação sigilosa: ${p.n}`, `Você descobriu que o empresário ${a.n} conversa em segredo com o ${buyer.name} sobre ${p.n}, sem avisar o clube.`, [
        { l: 'Confrontar o empresário publicamente', pid: p.id, fx: { pmor: -8, psat: -6, pp: 3, conf: 2 } },
        { l: 'Oferecer renovação para segurar o jogador', pid: p.id, act: 'renov', fx: { psat: 8 } },
        { l: 'Ignorar e seguir o trabalho', pid: p.id, fx: { psat: -3 }, act: 'secretLeak', buyer: buyer.id },
      ], { def: 2 });
    }
  }
  if (G.week % 9 === 4 && rnd() < 0.5) {
    const cl = pick(G.clubs.filter((x) => x.league && x.rep > 55)); const a = pick(G.uv.agents);
    if (cl && a) { a.conf++; news(G, `💼 Bastidores: o empresário ${a.n} rompe com a diretoria do ${cl.name} e ameaça tirar seus clientes do clube.`, 'bast'); cl.chem = clamp((cl.chem ?? 60) - 3, 0, 100); }
  }
}

// ---------------- identidade dos clubes ----------------
const PHIL_OF = { ambiciosa: 'Títulos imediatos', formadora: 'Formação de jogadores', investidora: 'Projeto de longo prazo', conservadora: 'Equilíbrio financeiro', impaciente: 'Resultados a qualquer custo' };
export function clubIdent(G, c) {
  const trad = clamp(Math.round(c.rep / 20 + (c.troph?.length || 0) / 10), 1, 5);
  const fanK = Math.round((c.cap || 10) * (0.6 + c.rep / 80) * (COUNTRIES[c.country]?.flag ? 1 : 1) * 60) * 1000;
  const comp = G.comps[c.league]; const tier = comp?.tier || 3;
  const expect = tier > 1 ? (c.rep >= 60 ? 'Acesso imediato' : 'Brigar pelo acesso') : c.rep >= 85 ? 'Títulos todo ano' : c.rep >= 74 ? 'Vaga continental' : c.rep >= 62 ? 'Meio de tabela para cima' : 'Permanência';
  const reg = c.rep >= 80 ? 'Internacional' : c.rep >= 65 ? 'Nacional' : c.rep >= 45 ? 'Regional' : 'Local';
  const fin = c.money < 0 ? 'Endividado' : c.money > (c.spon || 1) ? 'Saudável' : 'Apertado';
  return { phil: PHIL_OF[c.board?.type] || 'Equilíbrio', trad, fanK, expect, reg, fin, admin: c.board?.type || '—', pres: c.board?.pres || '—' };
}

// ---------------- torcida participativa ----------------
export const FAN_GROUPS = { org: 'Organizadas', soc: 'Sócios-torcedores', jov: 'Torcida das redes' };
export function initFans(c) { if (!c.fg) { const f = c.fans ?? 55; c.fg = { org: f, soc: f, jov: f }; } return c.fg; }
const syncFans = (c) => { const g = c.fg; c.fans = clamp(Math.round(g.org * 0.4 + g.soc * 0.35 + g.jov * 0.25), 0, 100); };
export function fanMatch(G, c, gf, ga, opp, big) {
  const g = initFans(c); const r = gf > ga ? 1 : gf < ga ? -1 : 0; const m = big ? 2 : 1;
  g.org = clamp(g.org + (r > 0 ? 4 : r < 0 ? -5 : -1) * m, 0, 100);
  g.soc = clamp(g.soc + (r > 0 ? 2 : r < 0 ? -2 : 0), 0, 100);
  g.jov = clamp(g.jov + (r > 0 ? 3 : r < 0 ? -3 : 0) * (gf >= 3 || ga >= 3 ? 1.5 : 1), 0, 100);
  syncFans(c);
}
function fansWeek(G) {
  const c = myClub(G); if (!c || G.me.job.youth) return; const g = initFans(c); const cd = G.me.cd;
  // drift
  for (const k of Object.keys(g)) g[k] += (55 - g[k]) * 0.01;
  if (c.money < 0) g.soc = clamp(g.soc - 0.6, 0, 100);
  syncFans(c);
  if (g.jov < 32 && G.t - (cd.fjov ?? -99) > 8 && (G.week <= 4 || (G.week >= 22 && G.week <= 26))) { cd.fjov = G.t; c.board.conf = clamp(c.board.conf - 2, 0, 100); msg(G, 'Torcida', '📱 Torcida cobra contratações', 'Nas redes, a torcida cobra reforços urgentes. Diretoria pressionada.'); news(G, `📱 Torcida do ${c.name} cobra contratações nas redes.`, 'torcida'); }
  if (g.soc < 30 && c.money < 0 && G.t - (cd.fsoc ?? -99) > 10) { cd.fsoc = G.t; c.board.conf = clamp(c.board.conf - 3, 0, 100); news(G, `🏛️ Sócios do ${c.name} criticam a gestão financeira da diretoria.`, 'torcida'); }
  if (g.org < 22 && G.t - (cd.forg ?? -99) > 8) { cd.forg = G.t; G.me.pp = clamp((G.me.pp || 20) + 6, 0, 100); news(G, `📢 Organizadas do ${c.name} fazem protesto e pedem a saída de ${G.me.name}.`, 'torcida'); }
  // homenagem a ídolos
  if (G.week === 30) for (const p of G.players) if (p && p.club === c.id && !p.idol && (p.yrs || 0) >= 4 && p.tot.j >= 120) { p.idol = c.id; story(G, p, `Virou ídolo do ${c.name}`); news(G, `🎖️ Torcida do ${c.name} homenageia ${p.n}, novo ídolo do clube.`, 'torcida'); g.org = clamp(g.org + 4, 0, 100); }
}
export function fanTitle(G, c) { const g = initFans(c); g.org = clamp(g.org + 15, 0, 100); g.soc = clamp(g.soc + 12, 0, 100); g.jov = clamp(g.jov + 15, 0, 100); syncFans(c); const s = (G.me.idol ||= {}); s[c.id] = (s[c.id] || 0) + 1; if (s[c.id] === 2) { news(G, `👑 ${G.me.name} vira ídolo da torcida do ${c.name}.`, 'torcida'); tl(G, `${G.me.name} é ídolo do ${c.name}`, 'user'); } }

// ---------------- histórias dos jogadores ----------------
export function story(G, p, txt) { (p.sto ||= []).push([G.year, txt]); if (p.sto.length > 12) p.sto.shift(); }
export function onTransfer(G, p, fromCid, toCid, fee) {
  const to = G.clubs[toCid], from = G.clubs[fromCid];
  p.orig ??= fromCid; p.yrs = 0;
  if (toCid === p.orig && fromCid !== p.orig) { story(G, p, `Voltou ao ${to.name}, clube onde começou`); news(G, `🏠 ${p.n} volta ao ${to.name}, clube que o revelou.`, 'mercado'); }
  else story(G, p, `Transferido ${from ? `do ${from.name} ` : ''}para o ${to.name}${fee ? ` (${money(fee)})` : ''}`);
  if (from && to && from.country !== to.country && rnd() < 0.3) { p.adapt = 8; p.mor = clamp(p.mor - 12, 0, 100); story(G, p, `Dificuldade de adaptação em ${COUNTRIES[to.country]?.name || to.country}`); }
  if (fee >= 80e6) G.uv.records.bigT = Math.max(G.uv.records.bigT || 0, fee);
}
function playersSeason(G) {
  for (const p of G.players) {
    if (!p || p.club < 0) continue;
    p.yrs = (p.yrs || 0) + 1; p.orig ??= p.club;
    if (p.st.g >= 18) story(G, p, `Temporada artilheira: ${p.st.g} gols`);
    if (p.age >= 31 && p.oh?.length >= 2 && p.oh[p.oh.length - 2][1] - p.ovr >= 3) story(G, p, 'Começou a perder rendimento');
    if (p.ovr >= 85 && !p.star) { p.star = G.year; story(G, p, 'Tornou-se uma estrela mundial'); if (p.age <= 23) { news(G, `🌟 Nova estrela: ${p.n} (${p.age} anos, ${G.clubs[p.club].name}).`); tl(G, `Surge uma estrela: ${p.n}`, 'jogador'); } }
  }
}

// ---------------- decisões com efeito tardio ----------------
export function later(G, weeks, type, data) { G.uv.delayed.push({ t: G.t + weeks, type, data }); }
function delayedWeek(G) {
  const due = G.uv.delayed.filter((d) => d.t <= G.t); G.uv.delayed = G.uv.delayed.filter((d) => d.t > G.t);
  for (const d of due) {
    const p = G.players[d.data.pid];
    if (d.type === 'soldYouth' && p && p.ovr >= 78) { news(G, `💎 ${p.n}, revelado por ${G.me.name} e vendido, hoje brilha no ${G.clubs[p.club]?.name || 'exterior'} (geral ${p.ovr}).`); G.me.legacy = (G.me.legacy || 0) + 3; G.me.rep = clamp(G.me.rep + 1, 1, 99); }
    if (d.type === 'released' && p && p.club >= 0 && p.ovr >= d.data.ovr + 3) { news(G, `😬 ${p.n}, dispensado por ${G.me.name}, faz grande fase no ${G.clubs[p.club].name}. A torcida não esqueceu.`); const c = G.clubs[d.data.cid]; if (c) { initFans(c).org -= 4; syncFans(c); } }
    if (d.type === 'promoted' && p && p.club >= 0 && p.ovr >= 75) { story(G, p, `Promovido por ${G.me.name}, virou titular de nível ${p.ovr}`); G.me.legacy = (G.me.legacy || 0) + 2; msg(G, 'Imprensa', `🌱 ${p.n} confirmou sua aposta`, `O jogador que você promoveu da base é hoje um profissional de geral ${p.ovr}. Seu legado como formador cresce.`); }
  }
}
// hooks de decisões permanentes
export function onRelease(G, p, c) {
  const avg = G.players.filter((x) => x && x.club === c.id && !x.u20).map((x) => x.ovr).sort((a, b) => b - a).slice(0, 11).reduce((s, x, _, a) => s + x / a.length, 0);
  if (p.ovr >= avg || p.idol === c.id) { const g = initFans(c); g.org -= p.idol === c.id ? 14 : 6; g.soc -= 3; syncFans(c); news(G, `😠 Torcida do ${c.name} reage mal à dispensa de ${p.n}.`, 'torcida'); later(G, ri(40, 80), 'released', { pid: p.id, ovr: p.ovr, cid: c.id }); }
  story(G, p, `Dispensado pelo ${c.name}`);
}
export function onPromote(G, p) { p.promBy = 'me'; story(G, p, `Promovido ao profissional por ${G.me.name}`); later(G, ri(46, 92), 'promoted', { pid: p.id }); }
export function onSellYouth(G, p) { if (p.promBy === 'me' || (p.age <= 21 && p.pot >= 78)) later(G, ri(50, 100), 'soldYouth', { pid: p.id }); }
export function onLeaveClub(G, oldCid, early) { const c = G.clubs[oldCid]; if (!c) return; if (early) { c.grudge = G.year; const g = initFans(c); g.org -= 15; g.soc -= 8; syncFans(c); news(G, `💔 Torcida do ${c.name} se sente traída pela saída de ${G.me.name} no meio do contrato.`, 'torcida'); } }
export function onRefuseJob(G, cid) { const c = G.clubs[cid]; if (c && c.rep >= G.me.rep + 5) { c.snub = G.year; news(G, `🙅 ${G.me.name} recusa proposta do ${c.name}.`, 'tec'); } }
export const blockedOffer = (G, c) => (c.snub && G.year - c.snub < 3) || (c.grudge && G.year - c.grudge < 4) || G.me.retired;

// ---------------- crises institucionais ----------------
function crisesWeek(G) {
  if (G.week % 4 !== 2) return;
  const me = G.me; const mine = myClub(G);
  for (const c of G.clubs) {
    if (!c.league || c.league === 'AMA') continue;
    const r = rnd();
    // conflito entre dirigentes / troca de administração
    if (r < 0.006) { const old = c.board.type; c.board.type = pick(['ambiciosa', 'conservadora', 'formadora', 'investidora', 'impaciente'].filter((x) => x !== old)); c.board.pres = genName(c.country); news(G, `🏛️ Racha na diretoria do ${c.name}: ${c.board.pres} assume e muda a linha (${c.board.type}).`, 'clube');
      if (mine?.id === c.id) { c.board.conf = 55; msg(G, 'Diretoria', '🏛️ Nova diretoria', `${c.board.pres} assumiu o ${c.name} com uma diretoria ${c.board.type}. A confiança em você foi reavaliada.`); } }
    // interdição de estádio (problema estrutural)
    else if (r < 0.009 && !c.closed) { c.closed = G.t + ri(2, 4); news(G, `🚧 Estádio do ${c.name} é interditado por problemas estruturais. Jogos sem renda de bilheteria por algumas semanas.`, 'clube'); if (mine?.id === c.id) msg(G, 'Diretoria', '🚧 Estádio interditado', 'O estádio foi interditado. Sem bilheteria nas próximas semanas.'); }
    // salários atrasados em clubes endividados
    else if (c.money < -(c.spon || 1e6) * 0.3 && r < 0.05) {
      for (const p of G.players) if (p && p.club === c.id && !p.u20) p.mor = clamp(p.mor - 6, 0, 100);
      c.crisis = G.year; news(G, `💸 ${c.name} atrasa salários. Elenco insatisfeito.`, 'clube');
      if (mine?.id === c.id) msg(G, 'Diretoria', '💸 Salários atrasados', 'O clube atrasou salários. O moral do elenco caiu e patrocinadores ficaram receosos.');
      // patrocinador sai em crise
      const s = c.spons?.find((x) => x.slot === 'Manga'); if (s && rnd() < 0.4) { s.val = Math.round(s.val * 0.6); s.n = 'Sem patrocínio fixo'; news(G, `📉 Patrocinador deixa o ${c.name} por causa da crise.`, 'clube'); }
      // oportunidade: clube à venda com desconto para o usuário rico
      if (c.own.assoc >= 51 && me.money > 5e6 && rnd() < 0.35 && !c.discount) { c.discount = G.year; msg(G, 'Mercado de clubes', `🏷️ ${c.name} aceita vender a SAF com desconto`, `Em crise, o ${c.name} aceita vender o controle da SAF com 30% de desconto até o fim da temporada. Veja em Carreira › Clube próprio/SAF.`); }
    }
    // disputa pelo controle (SAF com fundo)
    else if (c.saf && c.own.fund > 20 && c.own.user > 0 && c.own.user < 51 && r < 0.03) {
      msg(G, 'Investidores', `⚖️ Disputa pelo controle do ${c.name}`, `O fundo que divide a SAF do ${c.name} com você quer aumentar a participação e pressiona por austeridade. A diretoria cortou 10% do orçamento.`); c.money -= Math.round(Math.max(0, c.money) * 0.1);
    }
  }
  for (const c of G.clubs) if (c.closed && c.closed <= G.t) c.closed = null;
}

// ---------------- federações e regulamentos ----------------
export function feds() {
  const out = [];
  for (const [code, co] of Object.entries(COUNTRIES)) { const o = FED_OLD[code]; out.push({ code, name: co.name, flag: co.flag, fed: co.fed || o?.[0] || '—', conf: co.conf || o?.[1] || '—' }); }
  return out;
}
function regsSeason(G) {
  const R = G.uv.regs; if (rnd() > 0.3) return;
  const opts = [];
  opts.push(() => { R.ffp = !R.ffp; return R.ffp ? '⚖️ Confederações aprovam regras de fair play financeiro: clubes com caixa negativo não podem contratar.' : '⚖️ As regras de fair play financeiro foram suspensas.'; });
  opts.push(() => { R.contMul = Math.round(clamp((R.contMul || 1) * rf(0.9, 1.25), 0.8, 1.6) * 100) / 100; return `🏆 Nova distribuição de premiação nas competições continentais (fator ${R.contMul}x).`; });
  opts.push(() => { const conts = ['LIB', 'UCL', 'SUD', 'UEL']; const id = pick(conts); const last = G.comps[id]?.champion; const lg = last != null ? G.clubs[last].league : null; if (!lg) return null; (R.slots[id] ||= {})[lg] = Math.min(2, (R.slots[id][lg] || 0) + 1); return `📊 Coeficiente: a liga ${G.comps[lg]?.short || lg} ganha +1 vaga em ${G.comps[id]?.short || id} pelo desempenho recente.`; });
  opts.push(() => { R.subs = R.subs === 5 ? 5 : 5; R.window = !R.window; return R.window ? '🗓️ Federações ampliam a janela de transferências do meio da temporada.' : '🗓️ Janela do meio da temporada volta ao formato curto.'; });
  const t = pick(opts)(); if (!t) return;
  news(G, t, 'fed'); tl(G, t, 'fed'); (R.log ||= []).unshift(`${G.year}: ${t}`); R.log = R.log.slice(0, 15);
}

// ---------------- legado entre gerações ----------------
function legacySeason(G) {
  const me = G.me;
  // ex-auxiliares viram técnicos
  for (const a of (me.exStaff ||= [])) {
    if (a.done || rnd() > 0.25) continue;
    const c = G.clubs.filter((x) => x.league && !x.coach?.user && Math.abs(x.rep - (40 + a.q * 3)) < 12).sort(() => rnd() - 0.5)[0]; if (!c) continue;
    a.done = true; const k = newCoach(G, { n: a.n, rep: 30 + a.q * 3, nat: c.country }); k.trait = 'Estrategista'; k.exOf = me.name;
    news(G, `🎓 ${a.n}, ex-auxiliar de ${me.name}, é anunciado técnico do ${c.name}.`, 'tec'); tl(G, `${a.n}, cria de ${me.name}, assume o ${c.name}`, 'tec');
    if (c.coach && !c.coach.user) { c.coach = { n: k.n, rep: k.rep, id: k.id }; k.cid = c.id; }
  }
  // jogadores históricos viram dirigentes
  for (const p of G.players) if (p && p.ret && p.idol != null && !p.dir) { const c = G.clubs[p.idol]; if (c) { p.dir = true; c.board.dir = p.n; c.board.conf = clamp(c.board.conf + 4, 0, 100); news(G, `👔 Ídolo ${p.n} se aposenta e vira dirigente do ${c.name}.`, 'clube'); } }
}
export function legacyScore(G) { const me = G.me; return Math.round(me.titles.reduce((s, t) => s + (t.w || 5), 0) + (me.legacy || 0) + me.stats.j * 0.03 + Object.values(me.idol || {}).reduce((s, x) => s + x * 3, 0)); }
export function legacyCompare(G) {
  const L = legacyScore(G); const H = G.coaches.filter((k) => k.titles?.length).map((k) => ({ n: k.n, s: k.titles.reduce((s, t) => s + (t.w || 5), 0) + k.j * 0.03 })).sort((a, b) => b.s - a.s);
  const above = H.filter((h) => h.s > L).length; const near = H.find((h) => h.s <= L);
  return { L, rank: above + 1, near: near?.n, top: H.slice(0, 5) };
}

// ---------------- aposentadoria do usuário ----------------
export function retireUser(G) {
  const me = G.me; if (me.retired) return 'Você já está aposentado.';
  if (me.job) { const c = G.clubs[me.job.cid]; const h = me.hist[me.hist.length - 1]; if (h) h.to = G.week; if (!me.job.youth) { c.coach = null; G.vac.push({ cid: c.id, youth: false, t: G.t }); } me.job = null; }
  if (me.nat) me.nat = null;
  me.retired = G.year;
  const lg = legacyCompare(G);
  news(G, `🎩 ${me.name} anuncia aposentadoria como treinador após ${me.stats.j} jogos e ${me.titles.length} títulos.`, 'tec');
  tl(G, `${me.name} encerra a carreira de técnico (${me.titles.length} títulos, legado ${lg.L})`, 'user');
  for (const [cid, n] of Object.entries(me.idol || {})) if (n >= 1) msg(G, G.clubs[cid].name, `🎖️ Homenagem do ${G.clubs[cid].name}`, `O ${G.clubs[cid].name} prepara uma homenagem a ${me.name}, campeão pelo clube. A torcida agradece!`);
  return `Carreira encerrada. Seus negócios, empresas e clubes continuam funcionando.`;
}

// ---------------- propostas de emprego completas ----------------
export function jobInfo(G, cid) {
  const c = G.clubs[cid]; const comp = G.comps[c.league];
  const grp = comp ? (comp.groups.find((g) => g.includes(c.id)) || comp.clubs) : [c.id];
  const str = (id) => G.players.filter((p) => p && p.club === id && !p.u20).map((p) => p.ovr).sort((a, b) => b - a).slice(0, 13).reduce((s, x, _, a) => s + x / a.length, 0);
  const rank = grp.slice().sort((a, b) => str(b) - str(a)).indexOf(c.id) + 1;
  const pos = comp?.table?.[c.id] ? standings(G, comp, Math.max(0, comp.groups.findIndex((g) => g.includes(c.id)))).indexOf(c.id) + 1 : null;
  const idt = clubIdent(G, c);
  const target = idt.expect === 'Títulos todo ano' ? 1 : idt.expect === 'Vaga continental' ? 5 : idt.expect.includes('acesso') || idt.expect === 'Acesso imediato' ? 4 : idt.expect === 'Meio de tabela para cima' ? 9 : Math.max(1, grp.length - 4);
  const diff = clamp(Math.round(3 + (rank - target) / 3 + (c.money < 0 ? 1 : 0) + (c.board.type === 'impaciente' ? 1 : 0)), 1, 5);
  const budget = Math.max(0, Math.round(c.money * 0.4 / 1e4) * 1e4);
  const wage = coachWage(c.rep, c.country, false);
  const project = c.rep < G.me.rep && c.board.type !== 'impaciente' ? 'Projeto de longo prazo: diretoria paciente e mais anos de contrato' : null;
  return { c, comp, rank, n: grp.length, pos, idt, target, diff, budget, wage, project, infra: c.infra || {}, fans: c.fans };
}

// ---------------- semana / temporada ----------------
export function initUniverse(G) {
  G.uv ||= { riv: {}, regs: { ffp: false, contMul: 1, slots: {}, log: [] }, delayed: [], agents: [], records: {} };
  G.uv.regs.slots ||= {};
  if (!G.uv.agents.length) G.uv.agents = genAgents(G);
  for (const k of G.coaches) coachTraits(k);
  for (const c of G.clubs) initFans(c);
}
export function universeWeek(G) {
  initUniverse(G);
  agentsWeek(G); fansWeek(G); crisesWeek(G); delayedWeek(G);
  for (const p of G.players) if (p && p.adapt > 0) { p.adapt--; if (!p.adapt) story(G, p, 'Adaptou-se ao novo país'); }
}
export function universeSeasonEnd(G) {
  initUniverse(G);
  playersSeason(G); regsSeason(G); legacySeason(G);
  // força dos clubes ao longo dos anos (top 12 por reputação)
  const H = (G.hist[G.year] ||= {}); H.pow = G.clubs.filter((c) => c.league).sort((a, b) => b.rep - a.rep).slice(0, 12).map((c) => [c.id, c.rep]);
  // rivalidade por disputa de título
  const c = myClub(G);
  if (c && !G.me.job.youth) { const comp = G.comps[c.league]; if (comp) { const t = standings(G, comp, 0); const i = t.indexOf(c.id); if (i >= 0 && i <= 1) { const other = G.clubs[t[i === 0 ? 1 : 0]]; const k = coachOf(G, other); if (k) rivalryEvent(G, k.id, 3, `Disputa direta pelo título da ${comp.short}`); } } }
  for (const R of Object.values(G.uv.riv)) R.pts = Math.max(0, R.pts - 1);
}
export function dynasties(G) {
  const cnt = {};
  for (const y of Object.keys(G.hist)) for (const ch of G.hist[y].champs || []) { if (ch.kind === 'youth' || ch.kind === 'amateur') continue; const k = ch.c + '|' + ch.club; cnt[k] = (cnt[k] || 0) + 1; }
  return Object.entries(cnt).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, n]) => { const [c, club] = k.split('|'); return { c, club, n }; });
}
