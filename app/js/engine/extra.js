// Grande atualização: lesões detalhadas, capitão, sócio-torcedor e mosaicos, convocações,
// propostas de fim de janela, gerações de ouro, prêmios (Bola de Ouro, seleção), lendas e resumo da semana.
import { clamp, rnd, ri, rf, pick, money, hash, withSeed } from '../util.js';
import { playerValue } from './econ.js';
import { windowInfo, willJoin, askPrice } from './market.js';

function msg(G, from, title, body, extra = {}) { G.inbox.unshift({ id: (G.inbox[0]?.id || 0) + 1, t: G.t, y: G.year, w: G.week, from, title, body, read: false, ...extra }); if (G.inbox.length > 120) G.inbox.length = 120; }
function news(G, txt, cat = '') { G.news.unshift({ t: G.t, y: G.year, w: G.week, txt, cat }); if (G.news.length > 450) G.news.length = 450; }
const myC = (G) => (G.me.job ? G.clubs[G.me.job.cid] : null);

// ---------------- lesões detalhadas ----------------
const INJ = {
  leve: [['Contratura', 'coxa'], ['Entorse leve', 'tornozelo'], ['Pancada', 'joelho'], ['Desconforto muscular', 'panturrilha'], ['Contusão', 'quadril'], ['Gripe forte', 'geral']],
  media: [['Lesão muscular', 'posterior da coxa'], ['Estiramento', 'virilha'], ['Entorse', 'tornozelo'], ['Lesão', 'adutor'], ['Fissura', 'costela'], ['Lesão muscular', 'panturrilha']],
  grave: [['Ruptura de ligamento', 'joelho'], ['Fratura', 'pé'], ['Lesão de menisco', 'joelho'], ['Ruptura', 'tendão de Aquiles'], ['Fratura', 'tíbia'], ['Luxação', 'ombro']],
};
export function injSev(w) { return w >= 7 ? 'grave' : w >= 3 ? 'media' : 'leve'; }
export function describeInj(p) {
  if (!(p.inj > 0)) return null;
  if (!p.injd || p.injd.w0 < p.inj) { const sev = injSev(p.inj); const R = INJ[sev]; const [tipo, parte] = R[(hash(p.id + ':' + (p.tot?.j || 0)) >>> 0) % R.length]; p.injd = { tipo, parte, sev, w0: p.inj, t: 0 }; }
  const d = p.injd; return { ...d, left: p.inj, pct: Math.round((1 - p.inj / Math.max(1, d.w0)) * 100), txt: `${d.tipo} (${d.parte})`, sevTxt: { leve: 'Leve', media: 'Média', grave: 'Grave' }[d.sev] };
}
function injuriesWeek(G) {
  const c = myC(G); if (!c) return;
  for (const p of G.players) {
    if (!p || p.club !== c.id) continue;
    if (p.inj > 0) { const was = p.injd; const d = describeInj(p); if (!was || was !== p.injd) { (p.injH ||= []).push({ y: G.year, w: G.week, txt: d.txt, sev: d.sev, wk: p.inj }); if (p.injH.length > 12) p.injH.shift(); const rec = p.injH.filter((x) => x.txt === d.txt).length > 1;
      msg(G, 'Departamento médico', `🩺 ${p.n}: ${d.txt}`, `Diagnóstico: ${d.txt}. Gravidade: ${d.sevTxt.toLowerCase()}. Previsão de retorno: ${p.inj} semana${p.inj > 1 ? 's' : ''}.${rec ? '\nAtenção: lesão repetida, o risco de nova lesão é maior.' : ''}${d.sev === 'grave' ? '\nO jogador vai precisar de cirurgia e fisioterapia.' : ''}`); } }
    else if (p.injd) { msg(G, 'Departamento médico', `✅ ${p.n} liberado`, `${p.n} se recuperou de ${p.injd.tipo.toLowerCase()} (${p.injd.parte}) e está liberado para jogar.`); p.injd = null; }
  }
}

// ---------------- capitão e líderes ----------------
export function leadersOf(G, c) {
  const sq = G.players.filter((p) => p && p.club === c.id && !p.u20);
  return sq.map((p) => ({ p, v: (p.per === 'Líder' ? 30 : p.per === 'Experiente' ? 14 : p.per === 'Profissional' ? 8 : 0) + Math.min(20, (p.tot?.j || 0) / 15) + Math.max(0, p.age - 24) * 1.2 + p.ovr / 10 + (p.rel || 50) / 10 }))
    .sort((a, b) => b.v - a.v).slice(0, 4).map((x) => x.p);
}
export function setCaptain(G, c, pid) {
  const old = c.capId != null ? G.players[c.capId] : null; c.capId = pid; const p = G.players[pid];
  if (!p) return; p.mor = clamp(p.mor + 8, 0, 100); p.rel = clamp((p.rel || 50) + 6, 0, 100);
  if (old && old !== p && old.club === c.id) { old.mor = clamp(old.mor - 6, 0, 100); }
  const fit = leadersOf(G, c).includes(p); c.chem = clamp(c.chem + (fit ? 3 : -2), 0, 100);
}
function captainWeek(G) {
  const c = myC(G); if (!c || G.me.job.youth) return; const cap = c.capId != null ? G.players[c.capId] : null;
  if (cap && cap.club !== c.id) { c.capId = null; msg(G, 'Vestiário', '🧢 Escolha um novo capitão', `${cap.n} deixou o clube. Escolha o novo capitão no Elenco.`); return; }
  if (cap) { const lead = cap.per === 'Líder' ? 0.5 : 0.25; c.chem = clamp(c.chem + lead * 0.4, 0, 100); }
}

// ---------------- sócio-torcedor, público e mosaicos ----------------
export const SOCIO_BASE = { BR: 30, EN: 55, ES: 45, IT: 40, AR: 15, DE: 25, FR: 30, PT: 18 };
export function socioOf(G, c) { c.socio ||= { price: SOCIO_BASE[c.country] ?? 25, n: Math.round((c.cap || 3) * 1000 * (0.08 + c.rep / 600)), plan: 'normal' }; return c.socio; }
export function socioTarget(G, c) { const s = socioOf(G, c); const base = (c.cap || 3) * 1000 * (0.05 + c.rep / 420) * (0.7 + (c.fans ?? 55) / 180); const pr = (SOCIO_BASE[c.country] ?? 25) / Math.max(5, s.price); return Math.round(base * clamp(Math.pow(pr, 0.9), 0.25, 2.2) * (s.plan === 'premium' ? 0.75 : s.plan === 'popular' ? 1.35 : 1)); }
function socioWeek(G) {
  const c = myC(G); if (!c || G.me.job.youth) return; const s = socioOf(G, c);
  s.n = Math.round(s.n + (socioTarget(G, c) - s.n) * 0.06); const fee = s.plan === 'premium' ? 1.6 : s.plan === 'popular' ? 0.7 : 1;
  const inc = Math.round(s.n * s.price * fee / 4.3); c.money += inc; c.fin && (c.fin.socio = (c.fin.socio || 0) + inc);
}
export function attendance(G, hc, ac, f, comp) {
  const s = hc.socio ? Math.min(hc.socio.n * 0.7, (hc.cap || 3) * 1000 * 0.6) : 0; const price = hc.price ?? 40;
  const occ = clamp(0.3 + hc.rep / 170 + (ac.rep > 75 ? 0.12 : 0) + (f.ko >= 0 ? 0.1 : 0) + ((hc.fans ?? 55) - 55) / 300 - Math.max(0, price - 60) / 400, 0.12, 1);
  return Math.round(Math.min((hc.cap || 3) * 1000, s + (hc.cap || 3) * 1000 * occ * 0.92));
}
export function mosaicFor(G, f) { const c = myC(G); if (!c || f.h !== c.id) return null; const big = f.ko >= 0 || (G.clubs[f.a].rep > 72) || f.derby; if (!big) return null; return pick(['Mosaico 3D com o escudo', 'Bandeirão gigante na arquibancada', 'Mosaico com as cores do clube', 'Coreografia com sinalizadores e papel picado']); }

// ---------------- convocações dos seus jogadores ----------------
function callupsWeek(G) {
  const c = myC(G); if (!c || !G.nat) return;
  for (const T of Object.values(G.nat.teams || {})) {
    if (T.callT !== G.t || !T.squad) continue; const mine = T.squad.map((id) => G.players[id]).filter((p) => p && p.club === c.id); if (!mine.length) continue;
    for (const p of mine) { p.mor = clamp(p.mor + 6, 0, 100); (p.caps ||= 0); p.caps++; }
    msg(G, 'Federação', `🌍 ${mine.length} convocado${mine.length > 1 ? 's' : ''} para ${T.flag || ''} ${T.name}`, `${mine.map((p) => `${p.n} (${p.pos})`).join(', ')} ${mine.length > 1 ? 'foram convocados' : 'foi convocado'} para a seleção. Eles vão defender o país na próxima data FIFA. A moral deles subiu.`);
    news(G, `🌍 ${T.name} convoca ${mine.map((p) => p.n).join(', ')}, do ${c.name}.`, 'sel');
  }
}

// ---------------- proposta milionária no fim da janela ----------------
function deadlineOffer(G) {
  const c = myC(G); if (!c || G.me.job.youth) return; const wi = windowInfo(G); if (!wi.open || wi.left > 1) return;
  const key = G.year + ':' + G.week; if (G.me.dl === key || G.me.dlWin === wi.until + G.year) return; G.me.dl = key; if (rnd() > 0.45) return; G.me.dlWin = wi.until + G.year;
  const stars = G.players.filter((p) => p && p.club === c.id && !p.u20 && !p.loan && p.ovr >= 68).sort((a, b) => playerValue(b) - playerValue(a)).slice(0, 4); if (!stars.length) return; const p = pick(stars);
  const buyers = G.clubs.filter((b) => b.league && b.id !== c.id && b.rep >= Math.max(70, c.rep) && b.money > playerValue(p) * 1.6 && willJoin(G, p, b.id).ok); if (!buyers.length) return;
  const b = pick(buyers); const fee = Math.round(Math.max(askPrice(G, p) * 1.15, playerValue(p) * rf(1.7, 2.3)) / 10000) * 10000;
  msg(G, b.name, `💰 PROPOSTA MILIONÁRIA por ${p.n}`, `Último dia de janela! O ${b.name} oferece ${money(fee)} por ${p.n} (${p.pos}, ${p.ovr}). É ${Math.round(fee / playerValue(p) * 100)}% do valor de mercado.\n⏳ A proposta só vale até a janela fechar (${wi.until}). Depois disso, o negócio morre.`, { kind: 'bid', pid: p.id, from: b.id, fee, exp: G.t + Math.max(0, wi.left), big: true, until: wi.until });
  news(G, `🚨 Bomba no fim da janela: ${b.name} oferece ${money(fee)} por ${p.n}!`, 'rumor');
}

// ---------------- resumo da semana ----------------
function weeklySummary(G) {
  const c = myC(G); if (!c) return; const t = G.t;
  const games = G.fix.filter((f) => f.w === G.week && f.hg != null && (f.h === c.id || f.a === c.id));
  const res = games.map((f) => { const home = f.h === c.id; const gf = home ? f.hg : f.ag, ga = home ? f.ag : f.hg; return { opp: G.clubs[home ? f.a : f.h].name, gf, ga, r: gf > ga ? 'V' : gf === ga ? 'E' : 'D', comp: G.comps[f.c]?.short || '' }; });
  let best = null, bv = 0; for (const f of games) for (const [id, n] of Object.entries(f.notas || {})) { const p = G.players[id]; if (p && p.club === c.id && n > bv) { bv = n; best = p; } }
  const inj = G.players.filter((p) => p && p.club === c.id && p.inj > 0).map((p) => p.n);
  G.me.weekly = { t, y: G.year, w: G.week, res, best: best ? { n: best.n, v: bv } : null, inj, news: G.news.filter((n) => n.t === t).slice(0, 3).map((n) => n.txt) };
}

export function extraWeek(G) {
  try { injuriesWeek(G); } catch (e) { console.warn(e); }
  try { captainWeek(G); socioWeek(G); callupsWeek(G); deadlineOffer(G); weeklySummary(G); } catch (e) { console.warn(e); }
}

// ---------------- base: garotos fixos por clube e gerações de ouro ----------------
export function seededYouth(G, c, fn) { return withSeed(hash(`${c.key || c.name}:${G.year}`), fn); }
export function goldenGen(G, c, kids) {
  const r = (hash(`${c.key || c.name}:ouro:${G.year}`) % 1000) / 1000; if (r > 0.06 || !kids.length) return false;
  const top = kids.slice().sort((a, b) => b.pot - a.pot).slice(0, Math.min(3, kids.length));
  for (const p of top) { p.pot = clamp(p.pot + 7 + (hash(p.n) % 4), p.ovr + 10, 96); p.gold = G.year; }
  news(G, `✨ Geração de ouro na base do ${c.name}: ${top.map((p) => p.n).join(', ')} chamam a atenção.`, 'base');
  if (G.me.job && G.me.job.cid === c.id) msg(G, 'Categorias de base', '✨ Geração de ouro!', `Os olheiros estão eufóricos: a nova safra da base tem talentos raros — ${top.map((p) => `${p.n} (${p.pos}, ${p.age} anos)`).join(', ')}. Cuide bem deles!`);
  return true;
}

// ---------------- prêmios do fim de temporada ----------------
export function bigAwards(G) {
  const y = G.year; const nota = (p) => (p.st.j ? p.st.ns / p.st.j : 0);
  const all = G.players.filter((p) => p && p.club >= 0 && !p.u20 && p.st.j >= 12);
  const score = (p) => nota(p) * 10 + p.st.g * 0.9 + p.st.a * 0.5 + p.ovr * 0.4 + (G.clubs[p.club]?.rep || 0) * 0.08;
  const ballon = all.slice().sort((a, b) => score(b) - score(a)).slice(0, 5);
  const c = myC(G); const lg = c ? (G.me.job.youth ? null : G.comps[c.league]) : G.comps.BRA;
  const team = [];
  if (lg) { const ps = all.filter((p) => lg.clubs.includes(p.club)); const need = { GOL: 1, D: 4, M: 3, A: 3 }; const lineOf = (pos) => (pos === 'GOL' ? 'GOL' : ['ZAG', 'LD', 'LE', 'ALD', 'ALE'].includes(pos) ? 'D' : ['VOL', 'MC', 'MEI'].includes(pos) ? 'M' : 'A');
    for (const p of ps.sort((a, b) => nota(b) - nota(a))) { const l = lineOf(p.pos); if (need[l] > 0) { need[l]--; team.push(p); } if (team.length >= 11) break; } }
  const show = { y, ballon: ballon.map((p) => ({ id: p.id, n: p.n, club: G.clubs[p.club]?.name || '', c1: G.clubs[p.club]?.c1, g: p.st.g, a: p.st.a, nota: nota(p).toFixed(2), pos: p.pos })),
    team: team.map((p) => ({ id: p.id, n: p.n, pos: p.pos, club: G.clubs[p.club]?.short || '', c1: G.clubs[p.club]?.c1 })), lg: lg?.name || '', lgAw: (G.hist[y]?.awards || []).slice(), mine: [] };
  if (ballon[0]) { (ballon[0].aw ||= []).push({ y, k: 'Bola de Ouro' }); news(G, `🏆 ${ballon[0].n} (${show.ballon[0].club}) vence a Bola de Ouro ${y}!`, 'premio'); }
  for (const p of team) (p.aw ||= []).push({ y, k: 'Seleção do campeonato', lg: lg?.short });
  if (c) { for (const p of ballon) if (p.club === c.id) show.mine.push(`${p.n} entre os 5 melhores do mundo`); for (const p of team) if (p.club === c.id) show.mine.push(`${p.n} na seleção da ${lg?.short || 'liga'}`); }
  G.awardsShow = show; (G.awardsHist ||= []).push({ y, ballon: show.ballon[0]?.n, club: show.ballon[0]?.club });
  return show;
}

// ---------------- lendas (mural) ----------------
export function legendsCapture(G) {
  const c = myC(G);
  for (const p of G.players) { if (!p || !p.ret || p.legend) continue;
    const big = (p.tot?.j || 0) >= 320 || (p.aw || []).some((a) => a.k === 'Bola de Ouro') || (p.aw || []).length >= 4;
    const mine = c && p.clubs ? false : false; void mine;
    if (big) { p.legend = true; (G.legends ||= []).push({ n: p.n, pos: p.pos, nat: p.nat, j: p.tot?.j || 0, g: p.tot?.g || 0, aw: (p.aw || []).length, y: G.year, club: G.clubs[p.idol ?? p.club]?.name || '', ball: (p.aw || []).filter((a) => a.k === 'Bola de Ouro').length }); news(G, `🌟 Lenda: ${p.n} se aposenta após ${p.tot?.j || 0} jogos e ${p.tot?.g || 0} gols.`, 'lenda'); }
  }
  if ((G.legends || []).length > 80) G.legends = G.legends.slice(-80);
}

// ---------------- troféus e retrospectiva ----------------
export function seasonRecap(G) {
  const me = G.me; const c = myC(G); const y = G.year;
  const h = me.hist?.[me.hist.length - 1] || {};
  const top = c ? G.players.filter((p) => p && p.club === c.id && !p.u20).sort((a, b) => b.st.g - a.st.g)[0] : null;
  const bestN = c ? G.players.filter((p) => p && p.club === c.id && !p.u20 && p.st.j >= 8).sort((a, b) => b.st.ns / b.st.j - a.st.ns / a.st.j)[0] : null;
  const titles = (me.titles || []).filter((t) => t.y === y);
  G.recap = { y, club: c?.name, c1: c?.c1, pos: me.season?.pos, obj: me.season?.obj, ok: me.season?.ok, titles: titles.map((t) => t.c || t.n || ''), top: top ? { n: top.n, g: top.st.g } : null, best: bestN ? { n: bestN.n, v: (bestN.st.ns / bestN.st.j).toFixed(2) } : null, stats: { ...(me.stats || {}) }, rep: me.rep };
}
