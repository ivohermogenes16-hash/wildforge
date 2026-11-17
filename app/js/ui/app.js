import { esc, money, POS_LINE, clamp } from '../util.js';
import { crest, face, ovrBadge, ICONS, FLAG, ovrColor, textOn } from './art.js';
import { saveGame } from '../store.js';
import { SEASON_WEEKS, playerValue } from '../engine/econ.js';
import { myClub, userFixNow, nextUserFix, playSlot, strength, lineupFor, answerPress, takeJob } from '../engine/game.js';
import { standings, fixturesOf } from '../engine/season.js';
import { FORMATIONS, MENT, PRESS, ratings, autoLineup, available, formOf, roleAt } from '../engine/match.js';

export const S = { G: null, tab: 'home', sub: { sq: 'elenco', jg: 'cal', mk: 'busca', base: 'elenco', tat: 'res' }, page: null, sel: null, comp: null, filt: { pos: '', min: '', age: '', league: '', free: false, q: '' }, sqView: 'main', sort: 'pos' };
export const H = {};
const app = document.getElementById('app');

// ---------- utilidades ----------
export function toast(t, ms = 2200) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), ms); }
const sheetStack = [];
export function openSheet(html, onClose) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<button class="sheet-x" data-a="cs">✕</button><div class="sheet">${html}</div>`;
  bg.addEventListener('click', (e) => { if (e.target === bg) closeSheet(); });
  document.body.appendChild(bg); sheetStack.push({ bg, onClose });
  return bg.querySelector('.sheet');
}
export function closeSheet(all) { do { const s = sheetStack.pop(); if (!s) break; s.bg.remove(); s.onClose && s.onClose(); } while (all); }
export function replaceSheet(html) { const s = sheetStack[sheetStack.length - 1]; if (!s) return openSheet(html); const el = s.bg.querySelector('.sheet'); el.innerHTML = html; return el; }
H.cs = () => closeSheet();
let saveT = null;
export function save(now) { clearTimeout(saveT); const go = () => saveGame(S.G).catch((e) => console.warn('save', e)); if (now) return go(); saveT = setTimeout(go, 400); }

document.addEventListener('click', (e) => { const el = e.target.closest('[data-a]'); if (!el) return; const fn = H[el.dataset.a]; if (fn) { e.preventDefault(); fn(el.dataset.v, el, e); } });
document.addEventListener('change', (e) => { const el = e.target.closest('[data-ch]'); if (el && H[el.dataset.ch]) H[el.dataset.ch](el.value, el, e); });
document.addEventListener('input', (e) => { const el = e.target.closest('[data-in]'); if (el && H[el.dataset.in]) H[el.dataset.in](el.value, el, e); });

export const lineOf = (pos) => POS_LINE[pos];
export const posTag = (pos) => `<span class="pos ${POS_LINE[pos]}">${pos}</span>`;
export const clubOf = (p) => (p && p.club >= 0 ? S.G.clubs[p.club] : null);
export function clubTag(c, size = 22) { if (!c) return '<span class="mut">Sem clube</span>'; return `<span class="row" style="gap:6px;display:inline-flex" data-a="club" data-v="${c.id}">${crest(c, size)}<span class="ell">${esc(c.name)}</span></span>`; }
export function stars(rep) { const n = clamp(Math.round(rep / 20), 1, 5); return '<span class="gold">' + '★'.repeat(n) + '</span><span class="dim">' + '★'.repeat(5 - n) + '</span>'; }
export function compName(id) { return S.G.comps[id]?.short || id; }
export function wk(w) { return `Sem. ${w + 1}`; }
export function shortName(n) { const s = n.split(' '); return s.length > 1 && n.length > 12 ? s[s.length - 1] : n; }
export function potRange(p, mine) { if (mine || S.G.me.job?.cid === p.club) return p.pot; const lo = Math.max(p.ovr, p.pot - 4), hi = Math.min(95, p.pot + 3); return lo === hi ? lo : `${lo}–${hi}`; }
export const delta = (p) => { const d = p.ovr - (p.s0 ?? p.ovr); return d > 0 ? `<span class="dl up">▲${d}</span>` : d < 0 ? `<span class="dl dn">▼${-d}</span>` : '<span class="dl">–</span>'; };
export const potStars = (p) => { const n = clamp(Math.round((p.pot - 45) / 10), 1, 5); return `<span class="gold xs">${'★'.repeat(n)}</span>`; };

export function playerRow(p, o = {}) {
  if (!p) return '';
  const c = clubOf(p);
  const flags = [p.inj > 0 ? `<span class="pill r">🩹${p.inj}</span>` : '', p.sus > 0 ? '<span class="pill r">🟥</span>' : '', o.mine && p.con <= S.G.year ? '<span class="pill y">📄</span>' : '', p.lst ? '<span class="pill y">À venda</span>' : ''].join('');
  const sub = o.club ? `${c ? esc(c.short) + ' · ' : 'Livre · '}${p.age} anos · ${money(playerValue(p))}` : `${p.age} anos · ${FLAG[p.nat] || ''} ${o.mine ? `· ⚡${Math.round(p.fit)}` : ''}`;
  return `<div class="li tap" data-a="player" data-v="${p.id}">${face(p, 34, c)}<div class="grow"><div class="row" style="gap:6px"><span class="b ell">${esc(p.n)}</span>${flags}</div><div class="xs mut">${sub}</div></div>${posTag(p.pos)}${ovrBadge(p.ovr)}${o.extra || ''}</div>`;
}

// ---------- estrutura ----------
const NAV = [['home', 'Início', 'home'], ['sq', 'Elenco', 'squad'], ['tat', 'Tática', 'tact'], ['base', 'Base', 'base'], ['jg', 'Jogos', 'cal'], ['mk', 'Mercado', 'mkt'], ['clube', 'Clube', 'club'], ['carreira', 'Carreira', 'career'], ['nat', 'Seleção', 'flag'], ['mundo', 'Mundo', 'world'], ['more', 'Mais', 'more']];
export const PAGES = {}; export const PAGES_T = {}; export const PAGES_BACK = {};
export function render() {
  const G = S.G; if (!G) return;
  const c = myClub(G);
  const unread = G.inbox.filter((m) => !m.read).length;
  const title = c ? (G.me.job.youth ? `${c.name} Sub-20` : c.name) : 'Sem clube';
  let body = '';
  try {
    if (S.page) body = PAGES[S.page]?.() ?? '';
    else body = (VIEWS[S.tab] || VIEWS.home)();
  } catch (e) { console.error(e); body = `<div class="card bad">Erro: ${esc(e.message)}</div>`; }
  const now = userFixNow(G);
  const sc = app.querySelector('main')?.scrollTop || 0; const same = app.dataset.view === (S.page || S.tab);
  app.innerHTML = `<nav class="rail">${NAV.filter(([k]) => k !== 'nat' || S.G.me.nat).map(([k, l, ic]) => `<button class="${S.tab === k && !S.page ? 'on' : ''}" data-a="tab" data-v="${k}">${ICONS[ic]}<span>${l}</span>${k === 'more' && unread ? `<span class="badge">${unread}</span>` : ''}</button>`).join('')}</nav>
  <div class="right"><header class="top">${S.page ? `<button class="btn sm" data-a="back">‹ Voltar</button>` : c ? crest(c, 32) : '<span class="logo" style="font-size:20px">P<span>.</span></span>'}
    <div class="grow"><div class="t1 ell">${esc(S.page ? (PAGES_T[S.page] || '') : title)}</div><div class="t2">${wk(Math.min(G.week, SEASON_WEEKS - 1))} de ${SEASON_WEEKS} · ${G.year}${c && G.me.obj ? ` · 🎯 ${esc(G.me.obj.text)}` : ''}</div></div>
    <button class="icon-btn" data-a="go" data-v="inbox">📩${unread ? `<span class="badge">${unread}</span>` : ''}</button>
    <span class="money-pill" data-a="go" data-v="financas">${money(G.me.money)}</span>
    <button class="btn pri cont" data-a="continue">${now ? '▶ Jogo' : 'Continuar'} ›</button></header>
  <main>${body}</main></div>`;
  app.dataset.view = S.page || S.tab;
  if (same) app.querySelector('main').scrollTop = sc;
}
H.tab = (v) => { S.tab = v; S.page = null; S.sel = null; app.dataset.view = ''; render(); };
H.go = (v) => { S.page = v; app.dataset.view = ''; render(); };
H.back = () => { S.page = PAGES_BACK[S.page] || null; render(); };
H.sub = (v) => { const [k, s] = v.split(':'); S.sub[k] = s; S.sel = null; render(); };
const seg = (k, items) => `<div class="seg">${items.map(([v, l]) => `<button class="${S.sub[k] === v ? 'on' : ''}" data-a="sub" data-v="${k}:${v}">${l}</button>`).join('')}</div>`;

// ---------- INÍCIO ----------
export function fixLine(f, cid) {
  const G = S.G; const home = f.h === cid; const opp = G.clubs[home ? f.a : f.h];
  let res = '';
  if (f.hg != null) {
    const gf = home ? f.hg : f.ag, ga = home ? f.ag : f.hg;
    const r = gf > ga ? 'V' : gf < ga ? 'D' : f.pen ? ((home ? f.pen[0] > f.pen[1] : f.pen[1] > f.pen[0]) ? 'V' : 'D') : 'E';
    res = `<span class="pill ${r === 'V' ? 'g' : r === 'D' ? 'r' : ''}">${f.hg}–${f.ag}${f.pen ? ` (${f.pen[0]}–${f.pen[1]}p)` : ''}</span>`;
  }
  return `<div class="li tap" data-a="fix" data-v="${f.i}"><span class="xs mut" style="width:46px">${wk(f.w)}</span>${crest(opp, 24)}<div class="grow"><div class="b ell">${home ? '' : '@ '}${esc(opp.name)}</div><div class="xs mut">${compName(f.c)}${f.ko >= 0 ? ' · mata-mata' : ''}</div></div>${res || `<span class="pill">${home ? 'Casa' : 'Fora'}</span>`}</div>`;
}
function miniTable(comp, cid) {
  const G = S.G; const gi = Math.max(0, comp.groups.findIndex((g) => g.includes(cid)));
  const tab = standings(G, comp, gi); const me = tab.indexOf(cid);
  const from = clamp(me - 3, 0, Math.max(0, tab.length - 8));
  return `<table class="tb"><tr><th>#</th><th class="l">Clube</th><th>J</th><th>SG</th><th>P</th></tr>${tab.slice(from, from + 8).map((id, k) => { const r = comp.table[id], cl = G.clubs[id]; return `<tr class="${id === cid ? 'me' : ''}" data-a="club" data-v="${id}"><td>${from + k + 1}</td><td class="l"><span class="row" style="gap:6px">${crest(cl, 18)}<span class="ell" style="max-width:120px">${esc(cl.name)}</span></span></td><td>${r.p}</td><td>${r.gf - r.ga}</td><td class="b">${r.pts}</td></tr>`; }).join('')}</table>`;
}
const VIEWS = {};
VIEWS.home = () => {
  const G = S.G, me = G.me, c = myClub(G);
  let col1 = '', col2 = '', col3 = '';
  if (!c) {
    col1 = `<div class="card hero-card"><h3>Situação</h3><div class="xb" style="font-size:18px">Você está sem clube</div><p class="mut sm">Candidate-se a vagas na Carreira ou espere propostas. O tempo passa a cada "Continuar".</p><button class="btn blk" data-a="tab" data-v="carreira">Ver vagas abertas</button></div>`;
  } else {
    const nf = nextUserFix(G);
    if (nf) {
      const hc = G.clubs[nf.h], ac = G.clubs[nf.a]; const now = nf.w === G.week && nf.s === G.slot;
      col1 += `<div class="card hero-card" style="--c1:${hc.c1};--c2:${ac.c1}"><h3><span>Próximo jogo · ${esc(compName(nf.c))}</span><span class="pill ${now ? 'g' : ''}">${now ? 'Hoje' : wk(nf.w)}</span></h3>
      <div class="match-hero"><div data-a="club" data-v="${hc.id}">${crest(hc, 54)}<div class="nm">${esc(hc.name)}</div><div class="xs mut">${Math.round(strength(G, hc.id, me.job.youth))} força</div></div><div class="vs">VS</div><div data-a="club" data-v="${ac.id}">${crest(ac, 54)}<div class="nm">${esc(ac.name)}</div><div class="xs mut">${Math.round(strength(G, ac.id, me.job.youth))} força</div></div></div>
      <button class="btn pri blk" style="margin-top:10px" data-a="continue">${now ? '▶ Ir para o jogo' : 'Continuar ›'}</button></div>`;
    }
    if (!me.job.youth) col1 += `<div class="card"><div class="row sm"><span class="grow mut">Confiança da diretoria</span><b>${Math.round(c.board.conf)}%</b></div><div class="bar"><i style="width:${c.board.conf}%;background:${c.board.conf < 30 ? 'var(--red)' : c.board.conf < 55 ? 'var(--gold)' : 'var(--ac)'}"></i></div><div class="xs mut" style="margin-top:6px">🎯 ${esc(me.obj?.text || '')}</div></div>`;
    else col1 += `<div class="card"><div class="row sm"><span class="grow mut">Sua reputação</span><b>${Math.round(me.rep)}/100</b></div><div class="bar"><i style="width:${me.rep}%;background:linear-gradient(90deg,var(--ac2),var(--gold))"></i></div><div class="xs mut" style="margin-top:6px">Técnico do sub-20: vença e revele talentos para ser notado.</div></div>`;
    const compId = me.job.youth ? 'U20' : c.league; const comp = G.comps[compId];
    if (comp && comp.table[c.id]) col2 += `<div class="card"><h3><span>${esc(comp.short)}</span><span class="form">${comp.table[c.id].form.split('').map((x) => `<i class="${x}"></i>`).join('')}</span></h3>${miniTable(comp, c.id)}</div>`;
    const last = fixturesOf(G, c.id).filter((f) => f.hg != null && (me.job.youth ? f.c === 'U20' : f.c !== 'U20')).slice(-3).reverse();
    if (last.length) col2 += `<div class="card"><h3>Últimos resultados</h3><div class="list">${last.map((f) => fixLine(f, c.id)).join('')}</div></div>`;
  }
  if (c) {
    const recent = {}; for (const e of (me.dev || [])) { if (G.t - e.t > 10) break; recent[e.pid] = (recent[e.pid] || 0) + 1; }
    const ups = Object.entries(recent).map(([id, n]) => [G.players[id], n]).filter(([p]) => p && p.club === c.id).sort((a, b) => b[1] - a[1]).slice(0, 5);
    col1 += `<div class="card"><h3><span>📈 Evolução recente</span><span class="xs mut">últimas 10 sem.</span></h3>${ups.length ? `<div class="list">${ups.map(([p, n]) => `<div class="li tap" data-a="player" data-v="${p.id}">${face(p, 24, c)}<span class="grow b ell">${esc(p.n)}</span>${posTag(p.pos)}<span class="dl up">▲${n}</span>${ovrBadge(p.ovr)}</div>`).join('')}</div>` : '<div class="xs mut">Ninguém evoluiu ainda. Treino técnico e minutos em campo aceleram.</div>'}</div>`;
  }
  const decs = G.inbox.filter((m) => m.kind === 'dec' && !m.done && !m.expired);
  if (decs.length) col3 = `<div class="card dec-card"><h3><span>⚡ Decisões pendentes</span><span class="badge">${decs.length}</span></h3><div class="list">${decs.slice(0, 4).map((m) => `<div class="li tap" data-a="msg" data-v="${m.id}"><div class="grow"><div class="b ell">${esc(m.title)}</div><div class="xs mut">${esc(m.from)} · responda até ${wk(m.exp)}</div></div>›</div>`).join('')}</div></div>` + col3;
  if (c) col2 += `<div class="card"><h3>Clima no clube</h3>${[['Torcida', c.fans ?? 50], ['Entrosamento', c.chem ?? 60], ['Pressão da imprensa', me.pp ?? 20]].map(([l, v], i) => `<div style="margin-bottom:5px"><div class="row xs"><span class="grow mut">${l}</span><b>${Math.round(v)}</b></div><div class="bar"><i style="width:${v}%;background:${i === 2 ? (v > 65 ? 'var(--red)' : 'var(--org)') : v < 35 ? 'var(--red)' : v < 55 ? 'var(--gold)' : 'var(--ac)'}"></i></div></div>`).join('')}</div>`;
  const unread = G.inbox.filter((m) => !m.read && m.kind !== 'dec');
  if (unread.length) col3 += `<div class="card"><h3><span>Caixa de entrada</span><span class="badge">${unread.length}</span></h3><div class="list">${unread.slice(0, 4).map((m) => `<div class="li tap" data-a="msg" data-v="${m.id}"><div class="grow"><div class="b ell">${esc(m.title)}</div><div class="xs mut">${esc(m.from)}</div></div>›</div>`).join('')}</div></div>`;
  col3 += `<div class="card"><h3><span>Notícias</span><span class="sm" data-a="go" data-v="noticias">ver todas ›</span></h3><div class="list">${G.news.slice(0, 6).map((n) => `<div class="li sm">${esc(n.txt)}</div>`).join('')}</div></div>`;
  if (me.nat) { const nf = nextNatFix(G); const T = G.nat.teams[me.nat.code]; const tm = (k) => G.nat.teams[k]; col1 += `<div class="card" data-a="tab" data-v="nat"><h3><span>${T.flag} Seleção ${esc(T.name)}</span><span class="pill">Federação ${Math.round(T.conf)}%</span></h3>${nf ? `<div class="row" style="justify-content:center;gap:10px"><span style="font-size:26px">${tm(nf.h).flag}</span><b>${esc(tm(nf.h).name)} x ${esc(tm(nf.a).name)}</b><span style="font-size:26px">${tm(nf.a).flag}</span></div><div class="xs mut" style="text-align:center">${wk(nf.w)}${nf.w === G.week && G.slot === 0 ? ' · HOJE' : ''}</div>` : '<div class="xs mut">Sem jogos marcados.</div>'}</div>`; }
  return `<div class="dash"><div>${col1}</div><div>${col2 || col3}</div>${col2 ? `<div>${col3}</div>` : ''}</div>`;
};

// ---------- ELENCO (tabela estilo FM) ----------
function mySide() {
  const G = S.G, c = myClub(G); const youth = G.me.job?.youth;
  const tact = youth ? (G.me.u20tact ||= { ...c.tact }) : c.tact;
  return { G, c, youth, tact };
}
export function myLineup() {
  const { G, c, youth, tact } = mySide();
  const lu0 = lineupFor(G, youth ? { ...c, tact } : c, youth);
  const lu = { xi: lu0.xi.slice(), bench: lu0.bench.slice() };
  if (youth) G.me.u20lineup = lu; else c.lineup = lu;
  return lu;
}
const POS_ORDER = ['GOL', 'LD', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'PE', 'ATA'];
export function squadTable(ps, o = {}) {
  const G = S.G; const sort = S.sort;
  const key = { pos: (p) => POS_ORDER.indexOf(p.pos) * 100 - p.ovr, ovr: (p) => -p.ovr, pot: (p) => -p.pot, age: (p) => p.age, val: (p) => -playerValue(p), fit: (p) => p.fit, con: (p) => p.con, n: (p) => p.n, evo: (p) => -(p.ovr - (p.s0 ?? p.ovr)) };
  const arr = ps.slice().sort((a, b) => { const A = key[sort](a), B = key[sort](b); return A < B ? -1 : A > B ? 1 : 0; });
  const th = (k, l, cls = '') => `<th class="${cls} ${sort === k ? 'ok' : ''}" data-a="sort" data-v="${k}">${l}</th>`;
  const lu = o.lu;
  return `<div class="card flat tbl-card"><table class="tb sq">
  <tr>${th('pos', 'Pos')}${th('n', 'Nome', 'l')}${th('age', 'Id')}${th('ovr', 'Ger')}${th('evo', 'Evol.')}${th('pot', 'Pot')}${th('fit', '⚡')}<th>Moral</th><th>Satisf.</th>${th('val', 'Valor', 'hide-s')}${o.mine ? `<th class="hide-s">Salário</th>${th('con', 'Contr.')}` : '<th>Clube</th>'}</tr>
  ${arr.map((p) => {
    const st = lu ? (lu.xi.includes(p.id) ? '<span class="dotst on"></span>' : lu.bench.includes(p.id) ? '<span class="dotst b"></span>' : '') : '';
    const mor = p.mor >= 75 ? '😀' : p.mor >= 55 ? '🙂' : p.mor >= 40 ? '😐' : '😠';
    return `<tr data-a="player" data-v="${p.id}"><td>${posTag(p.pos)}</td><td class="l"><span class="row" style="gap:6px">${st}${face(p, 24, clubOf(p))}<span class="b ell" style="max-width:170px">${esc(p.n)}</span>${p.inj > 0 ? '🩹' : ''}${p.sus > 0 ? '🟥' : ''}${p.lst ? '💲' : ''}</span></td><td>${p.age}</td><td>${ovrBadge(p.ovr)}</td><td>${delta(p)}</td><td>${o.mine ? `<b class="ok">${p.pot}</b>` : potStars(p)}</td><td><div class="minibar"><i style="width:${p.fit}%;background:${p.fit < 60 ? 'var(--red)' : p.fit < 80 ? 'var(--gold)' : 'var(--ac)'}"></i></div></td><td>${mor}</td><td title="${esc(p.per || '')}">${(p.sat ?? 65) >= 70 ? '💚' : (p.sat ?? 65) >= 45 ? '💛' : (p.sat ?? 65) >= 25 ? '🧡' : '💔'}</td><td class="hide-s sm">${money(playerValue(p))}</td>${o.mine ? `<td class="hide-s sm">${money(p.wage)}</td><td class="${p.con <= G.year ? 'warn b' : ''}">${p.con}</td>` : `<td class="sm ell">${esc(clubOf(p)?.short || '—')}</td>`}</tr>`;
  }).join('')}</table></div>`;
}
H.sort = (v) => { S.sort = v; render(); };
VIEWS.sq = () => {
  const G = S.G, c = myClub(G);
  if (!c) return `<div class="empty">Você não está treinando nenhum clube.</div>`;
  const youth = G.me.job.youth;
  const sq = G.players.filter((p) => p && p.club === c.id && (youth ? p.u20 : !p.u20));
  const avg = Math.round(sq.reduce((s, p) => s + p.ovr, 0) / (sq.length || 1));
  const wages = sq.reduce((s, p) => s + p.wage, 0);
  const lu = myLineup();
  return `<div class="row" style="gap:10px;margin-bottom:10px;flex-wrap:wrap"><span class="pill">${sq.length} jogadores</span><span class="pill">Média ${avg}</span><span class="pill">Folha ${money(wages)}/sem.</span><span class="pill g">● titular</span><span class="pill b">● banco</span><span class="grow"></span><span class="xs mut">Toque no cabeçalho para ordenar</span></div>${squadTable(sq, { mine: true, lu })}`;
};

// ---------- TÁTICA (escalação + tática + treino) ----------
export function pitchLines() { return `<svg class="lines" viewBox="0 0 150 100" preserveAspectRatio="none"><g fill="none" stroke="#ffffff55" stroke-width=".6"><rect x="3" y="3" width="144" height="94"/><line x1="75" y1="3" x2="75" y2="97"/><circle cx="75" cy="50" r="12"/><rect x="3" y="25" width="22" height="50"/><rect x="125" y="25" width="22" height="50"/><rect x="3" y="38" width="8" height="24"/><rect x="139" y="38" width="8" height="24"/></g></svg>`; }
VIEWS.tat = () => {
  const G = S.G, c = myClub(G);
  if (!c) return `<div class="empty">Você não está treinando nenhum clube.</div>`;
  const { youth, tact } = mySide();
  const lu = myLineup(); const form = formOf(tact);
  const kit = c.c1 || '#2fe08a';
  const pitch = `<div class="pitch" id="tpitch">${pitchLines()}${form.map(([pos, x, y], i) => {
    const p = G.players[lu.xi[i]]; const sel = S.sel && S.sel.i === i;
    const bad = p && p.pos !== pos;
    return `<div class="pslot" style="left:${7 + y * 86}%;top:${8 + x * 84}%" data-a="slot" data-v="${i}" data-slot="${i}"><div class="dot ${sel ? 'sel' : ''} ${bad ? 'off' : ''}" style="--k:${pos === 'GOL' ? '#f4c542' : kit};--t:${pos === 'GOL' ? '#111' : textOn(kit)}"><b>${p ? p.ovr : '+'}</b></div><div class="rl ${bad ? 'warn' : ''}">${pos}</div><div class="nm">${p ? esc(shortName(p.n)) : '—'}</div></div>`;
  }).join('')}</div>`;
  const R = ratings(G, c, lu.xi, 0, tact);
  const bar = (l, v) => `<div style="margin-bottom:6px"><div class="row xs"><span class="grow mut">${l}</span><b>${Math.round(v)}</b></div><div class="bar"><i style="width:${clamp((v - 40) * 2, 3, 100)}%"></i></div></div>`;
  let right = seg('tat', [['res', 'Jogadores'], ['tat', 'Estilo'], ['treino', 'Treino']]);
  if (S.sub.tat === 'res') {
    const pool = G.players.filter((p) => p && p.club === c.id && (youth ? p.u20 : !p.u20) && !lu.xi.includes(p.id)).sort((a, b) => (lu.bench.includes(b.id) - lu.bench.includes(a.id)) || b.ovr - a.ovr);
    right += `<div class="hint" style="margin-bottom:8px">${S.sel ? '👉 Agora toque no jogador que vai entrar.' : '✋ Arraste os jogadores no campo para trocar de lugar ou mudar a posição. Arraste pelo ⠿ para colocar um reserva.'}</div><div class="list">${pool.map((p) => `<div class="li tap" data-a="pickp" data-v="${p.id}"><span class="grip" data-dragp="${p.id}">⠿</span>${posTag(p.pos)}<div class="grow"><div class="b ell">${esc(p.n)}</div><div class="xs mut">${lu.bench.includes(p.id) ? '🪑 Banco · ' : ''}⚡${Math.round(p.fit)} ${!available(p) ? '<span class="bad">indisponível</span>' : ''}</div></div>${ovrBadge(p.ovr)}</div>`).join('')}</div>`;
  } else if (S.sub.tat === 'tat') {
    right += `<div class="card flat">${bar('Ataque', R.att)}${bar('Meio-campo', R.ctl)}${bar('Defesa', R.def)}</div>
    <div class="field"><label>Mentalidade</label><div class="seg" style="margin:0">${MENT.map((m, i) => `<button class="${tact.ment === i ? 'on' : ''}" data-a="tact" data-v="ment:${i}">${m}</button>`).join('')}</div></div>
    <div class="field"><label>Pressão</label><div class="seg" style="margin:0">${PRESS.map((m, i) => `<button class="${tact.press === i ? 'on' : ''}" data-a="tact" data-v="press:${i}">${m}</button>`).join('')}</div></div>
    <p class="xs mut">Ofensiva cria mais chances, mas expõe a defesa. Pressão alta domina o meio e cansa mais.</p>`;
  } else {
    const tr = youth ? (G.me.u20train ||= { foco: 'equilibrado', int: 1 }) : c.train;
    const F = [['equilibrado', 'Equilibrado', 'Desenvolvimento normal.'], ['tecnico', 'Técnico', '+12% evolução dos jogadores.'], ['fisico', 'Físico', 'Recupera mais o fôlego.'], ['tatico', 'Tático', '+1 de força em todos os jogos.']];
    right += `<div class="list">${F.map(([k, l, d]) => `<div class="li tap" data-a="train" data-v="foco:${k}"><div class="grow"><div class="b">${l}</div><div class="xs mut">${d}</div></div>${tr.foco === k ? '<span class="ok xb">✓</span>' : ''}</div>`).join('')}</div>
    <div class="field" style="margin-top:8px"><label>Intensidade</label><div class="seg" style="margin:0">${['Leve', 'Normal', 'Pesada'].map((m, i) => `<button class="${tr.int === i ? 'on' : ''}" data-a="train" data-v="int:${i}">${m}</button>`).join('')}</div></div><p class="xs mut">Pesada acelera a evolução, mas cansa e pode lesionar.</p>`;
  }
  const forms = Object.keys(FORMATIONS).concat(tact.custom ? ['Personalizada'] : []);
  return `<div class="tact-wrap"><div class="tact-l"><div class="chips">${forms.map((f) => `<span class="chip ${tact.form === f ? 'on' : ''}" data-a="form" data-v="${f}">${f}</span>`).join('')}</div>${pitch}<div class="row" style="gap:6px;margin-top:6px"><button class="btn sm grow" data-a="autolu">⚡ Escalar automático</button>${tact.form === 'Personalizada' ? '<button class="btn sm" data-a="resetform">↺ Formação padrão</button>' : ''}</div></div><div class="tact-r card flat">${right}</div></div>`;
};
H.resetform = () => { const t = mySide().tact; t.form = '4-3-3'; render(); save(); };
H.form = (v) => { mySide().tact.form = v; render(); save(); };
H.autolu = () => { const { G, c, youth, tact } = mySide(); const lu = autoLineup(G, { ...c, tact }, youth); if (youth) G.me.u20lineup = lu; else c.lineup = lu; toast('Time escalado'); render(); save(); };
H.slot = (v) => { S.sel = { i: +v }; S.sub.tat = 'res'; render(); };
H.pickp = (v) => {
  const { G, c, youth } = mySide(); const p = G.players[+v];
  if (!S.sel) { H.player(v); return; }
  if (!available(p)) { toast('Jogador indisponível'); return; }
  const lu = youth ? G.me.u20lineup : c.lineup;
  const i = S.sel.i; const out = lu.xi[i];
  lu.xi[i] = p.id; lu.bench = lu.bench.filter((x) => x !== p.id);
  if (out >= 0 && !lu.bench.includes(out)) { lu.bench.unshift(out); if (lu.bench.length > 9) lu.bench.pop(); }
  S.sel = null; render(); save();
};
H.tact = (v) => { const [k, n] = v.split(':'); mySide().tact[k] = +n; render(); save(); };
H.train = (v) => { const { G, c, youth } = mySide(); const tr = youth ? G.me.u20train : c.train; const [k, n] = v.split(':'); tr[k] = k === 'int' ? +n : n; render(); save(); };

// ---------- JOGOS ----------
VIEWS.jg = () => {
  let h = seg('jg', [['cal', 'Calendário'], ['tab', 'Tabelas'], ['art', 'Artilharia']]);
  if (S.sub.jg === 'cal') h += calView(); else if (S.sub.jg === 'tab') h += tablesView(); else h += scorersView();
  return h;
};
function calView() {
  const G = S.G, c = myClub(G);
  if (!c) return '<div class="empty">Sem clube no momento.</div>';
  const youth = G.me.job.youth;
  const fx = fixturesOf(G, c.id).filter((f) => (youth ? f.c === 'U20' : f.c !== 'U20'));
  const half = Math.ceil(fx.length / 2);
  return `<div class="cols2"><div class="card flat" style="padding:4px 12px"><div class="list">${fx.slice(0, half).map((f) => fixLine(f, c.id)).join('') || '<div class="empty">Sem jogos.</div>'}</div></div><div class="card flat" style="padding:4px 12px"><div class="list">${fx.slice(half).map((f) => fixLine(f, c.id)).join('')}</div></div></div>`;
}
export function myComps() {
  const G = S.G, c = myClub(G);
  if (!c) return [];
  if (G.me.job.youth) return ['U20', c.league].filter((x) => G.comps[x]);
  return Object.values(G.comps).filter((k) => k.clubs.includes(c.id) && k.kind !== 'youth').map((k) => k.id);
}
function compPicker() {
  const G = S.G; const mine = myComps();
  if (!S.comp || !G.comps[S.comp]) S.comp = mine[0] || 'BRA';
  const all = Object.values(G.comps);
  return `<div class="row" style="gap:8px;margin-bottom:10px;flex-wrap:wrap">${mine.map((id) => `<span class="chip ${S.comp === id ? 'on' : ''}" data-a="comp" data-v="${id}">${esc(G.comps[id].short)}</span>`).join('')}
  <select data-ch="comp" style="width:auto;flex:1;min-width:180px">${[['BR', '🇧🇷 Brasil'], ['EN', '🏴 Inglaterra'], ['ES', '🇪🇸 Espanha'], ['IT', '🇮🇹 Itália'], ['AR', '🇦🇷 Argentina'], ['SA', '🌎 América do Sul'], ['EU', '🌍 Europa']].map(([k, l]) => `<optgroup label="${l}">${all.filter((x) => x.country === k).map((x) => `<option value="${x.id}" ${S.comp === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</optgroup>`).join('')}</select></div>`;
}
function tablesView() { return compPicker() + compTables(S.G.comps[S.comp]); }
H.comp = (v) => { S.comp = v; render(); };
export function compTables(comp) {
  const G = S.G; const my = myClub(G)?.id;
  let h = '';
  if (comp.champion != null) h += `<div class="card" style="text-align:center">🏆 <b>Campeão: ${esc(G.clubs[comp.champion].name)}</b></div>`;
  const multi = comp.groups.length > 1;
  if (comp.groups.length && comp.kind !== 'cup') {
    h += `<div class="${multi ? 'cols2' : ''}">`;
    comp.groups.forEach((g, gi) => {
      const tab = standings(G, comp, gi); const n = tab.length;
      const zone = (i) => {
        if (comp.kind === 'league' && comp.format !== 'groups6') { if (comp.up && i < (comp.format === 'zones2' ? 1 : comp.up)) return 'zone-up'; if (comp.tier === 1 && i < 6 && ['BRA', 'ENG1', 'ESP1', 'ITA1', 'ARG1'].includes(comp.id)) return 'zone-cont'; if (comp.down && i >= n - (comp.format === 'zones2' ? 1 : comp.down)) return 'zone-down'; }
        if (comp.koQual && i < comp.koQual) return 'zone-up';
        if (comp.kind === 'amateur' && i === 0) return 'zone-up';
        return '';
      };
      h += `<div class="card flat" style="padding:8px">${multi ? `<h3 style="margin:4px 6px 6px">${comp.format === 'zones2' ? 'Zona' : 'Grupo'} ${String.fromCharCode(65 + gi)}</h3>` : ''}<table class="tb"><tr><th>#</th><th class="l">Clube</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>P</th><th class="hide-s">Forma</th></tr>${tab.map((id, i) => {
        const r = comp.table[id], cl = G.clubs[id];
        return `<tr class="${id === my ? 'me' : ''}" data-a="club" data-v="${id}"><td class="${zone(i)}">${i + 1}</td><td class="l"><span class="row" style="gap:6px">${crest(cl, 18)}<span class="ell" style="max-width:150px">${esc(cl.name)}</span></span></td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gf - r.ga}</td><td class="b">${r.pts}</td><td class="form hide-s">${r.form.split('').map((x) => `<i class="${x}"></i>`).join('')}</td></tr>`;
      }).join('')}</table></div>`;
    });
    h += '</div>';
  }
  if (comp.ko.length) {
    const names = (r, tot) => { const left = tot - r; return left === 1 ? 'Final' : left === 2 ? 'Semifinal' : left === 3 ? 'Quartas de final' : left === 4 ? 'Oitavas de final' : `${r + 1}ª fase`; };
    h += '<div class="cols2">';
    for (let r = comp.ko.length - 1; r >= 0; r--) {
      h += `<div class="card flat"><h3>${names(r, comp.koWeeks.length)}</h3><div class="list">${comp.ko[r].map((i) => { const f = G.fix[i]; const a = G.clubs[f.h], b = G.clubs[f.a]; return `<div class="li tap sm" data-a="fix" data-v="${f.i}">${crest(a, 20)}<span class="grow ell ${f.h === my ? 'b ok' : ''}">${esc(a.name)}</span><b>${f.hg != null ? `${f.hg}–${f.ag}${f.pen ? '*' : ''}` : wk(f.w)}</b><span class="grow ell" style="text-align:right">${esc(b.name)}</span>${crest(b, 20)}</div>`; }).join('')}</div></div>`;
    }
    h += '</div>';
  }
  if (comp.kind === 'cup' && !comp.ko.length) h += '<div class="empty">Ainda não começou.</div>';
  return h;
}
function scorersView() {
  const G = S.G; let h = compPicker();
  const comp = G.comps[S.comp]; const youth = comp.kind === 'youth';
  const ps = G.players.filter((p) => p && p.club >= 0 && comp.clubs.includes(p.club) && !!p.u20 === youth && p.st.g > 0).sort((a, b) => b.st.g - a.st.g || b.st.a - a.st.a).slice(0, 30);
  h += `<div class="card flat tbl-card"><table class="tb"><tr><th>#</th><th class="l">Jogador</th><th>Clube</th><th>J</th><th>Gols</th><th>Assist.</th></tr>${ps.map((p, i) => `<tr data-a="player" data-v="${p.id}"><td>${i + 1}</td><td class="l"><span class="row" style="gap:6px">${face(p, 22, clubOf(p))}<b class="ell">${esc(p.n)}</b></span></td><td>${crest(clubOf(p), 18)}</td><td>${p.st.j}</td><td class="b">${p.st.g}</td><td>${p.st.a}</td></tr>`).join('')}</table>${ps.length ? '' : '<div class="empty">Ninguém marcou ainda.</div>'}<div class="xs mut" style="padding:8px">Gols em todas as competições da temporada</div></div>`;
  return h;
}

// ---------- caixa de entrada ----------
H.msg = (v) => {
  const G = S.G; const m = G.inbox.find((x) => x.id === +v); if (!m) return;
  m.read = true;
  let act = '';
  if (!m.done && !m.expired) {
    if (m.kind === 'job') act = `<div class="row" style="margin-top:14px"><button class="btn red grow" data-a="msgact" data-v="${m.id}:no">Recusar</button><button class="btn pri grow" data-a="msgact" data-v="${m.id}:yes">Aceitar</button></div>`;
    if (m.kind === 'bid') act = `<div class="row" style="margin-top:14px"><button class="btn red grow" data-a="msgact" data-v="${m.id}:no">Recusar</button><button class="btn pri grow" data-a="msgact" data-v="${m.id}:yes">Vender</button></div>`;
    if (m.kind === 'natjob') act = `<div class="row" style="margin-top:14px"><button class="btn red grow" data-a="msgact" data-v="${m.id}:no">Recusar</button><button class="btn pri grow" data-a="msgact" data-v="${m.id}:yes">Aceitar a seleção</button></div>`;
    if (m.kind === 'loanoff') act = `<div class="row" style="margin-top:14px"><button class="btn red grow" data-a="msgact" data-v="${m.id}:no">Recusar</button><button class="btn pri grow" data-a="msgact" data-v="${m.id}:yes">Emprestar</button></div>`;
    if (m.kind === 'agent') act = `<div class="row" style="margin-top:14px"><button class="btn grow" data-a="msgact" data-v="${m.id}:no">Dispensar</button><button class="btn pri grow" data-a="msgact" data-v="${m.id}:ver">Ver jogador</button></div>`;
    if (m.kind === 'dec') act = `<div class="col" style="margin-top:12px">${m.opts.map((o, i) => `<button class="btn" style="justify-content:flex-start;text-align:left" data-a="decide" data-v="${m.id}:${i}">${m.press ? '“' + esc(o.l) + '”' : esc(o.l)}</button>`).join('')}</div><p class="xs mut" style="margin-top:6px">Sem resposta até ${wk(m.exp)}: vale a opção “${esc(m.opts[m.def ?? 0].l)}”.</p>`;
    if (m.kind === 'press') act = `<div class="col" style="margin-top:14px">${m.ans.map((a, i) => `<button class="btn" style="justify-content:flex-start;text-align:left" data-a="msgact" data-v="${m.id}:${i}">“${esc(a[0])}”</button>`).join('')}</div>`;
  } else if (m.expired) act = '<p class="mut sm">Esta proposta expirou.</p>';
  else if (m.kind === 'press' && m.choice != null) act = `<p class="sm ok">Você respondeu: “${esc(m.ans[m.choice][0])}”</p>`;
  if (m.kind === 'dec' && m.done) act = `<p class="sm ok">Decisão: “${esc(m.opts[m.choice]?.l || '')}”</p>${m.auto ? `<p class="xs mut">${esc(m.auto)}</p>` : ''}`;
  openSheet(`<div class="xs mut">${esc(m.from)} · ${wk(m.w)} ${m.y}</div><h2>${esc(m.title)}</h2><div style="white-space:pre-wrap">${esc(m.body)}</div>${act}`);
  render();
};
H.msgact = (v) => {
  const G = S.G; const [id, a] = v.split(':'); const m = G.inbox.find((x) => x.id === +id); if (!m) return;
  if (m.kind === 'job') {
    if (a === 'yes') { closeSheet(); H.jobneg(m.id); return; }
    m.done = true;
  } else if (m.kind === 'natjob') { if (a === 'yes') { takeNatJob(G, m.code); toast(`🌍 Você é o técnico da seleção!`, 3000); } m.done = true; }
  else if (m.kind === 'loanoff') { if (a === 'yes') toast(acceptLoanOffer(G, m)); m.done = true; }
  else if (m.kind === 'agent') { m.done = true; if (a === 'ver') { closeSheet(); H.player(String(m.pid)); render(); save(); return; } }
  else if (m.kind === 'bid') { if (a === 'yes') toast(H._acceptBid(m)); m.done = true; }
  else if (m.kind === 'press') { answerPress(G, m, +a); toast('Resposta dada à imprensa'); }
  closeSheet(); render(); save();
};
PAGES.inbox = () => { const G = S.G; return `<div class="card flat" style="padding:2px 12px"><div class="list">${G.inbox.map((m) => `<div class="inb tap ${m.read ? '' : 'unread'}" data-a="msg" data-v="${m.id}"><div class="row"><div class="grow"><div class="ti ell">${esc(m.title)}</div><div class="xs mut">${esc(m.from)} · ${wk(m.w)} ${m.y}${m.kind && !m.done && !m.expired ? ' · <span class="ok">aguardando resposta</span>' : ''}</div></div>›</div></div>`).join('') || '<div class="empty">Nada por aqui.</div>'}</div></div>`; };
PAGES_T.inbox = 'Caixa de entrada';
PAGES.noticias = () => `<div class="card flat" style="padding:2px 12px"><div class="list">${S.G.news.map((n) => `<div class="li sm"><span class="xs dim" style="width:56px">${wk(n.w)}<br>${n.y}</span><span class="grow">${esc(n.txt)}</span></div>`).join('')}</div></div>`;
PAGES_T.noticias = 'Notícias';
export { VIEWS };
export { playSlot, userFixNow, strength };

// ---------- arrastar no campinho ----------
let drag = null, lastDrop = 0;
document.addEventListener('click', (e) => { if (Date.now() - lastDrop < 350) { e.stopPropagation(); e.preventDefault(); } }, true);
document.addEventListener('pointerdown', (e) => {
  const sl = e.target.closest('.pslot[data-slot]'), gr = e.target.closest('[data-dragp]');
  if (!sl && !gr) return;
  drag = { slot: sl ? +sl.dataset.slot : null, pid: gr ? +gr.dataset.dragp : null, x0: e.clientX, y0: e.clientY, on: false, src: sl || gr };
  if (gr) startDrag(e);
});
function startDrag(e) {
  const { G, c, youth } = mySide(); const lu = youth ? G.me.u20lineup : c.lineup;
  const p = G.players[drag.pid ?? lu.xi[drag.slot]]; if (!p) { drag = null; return; }
  drag.on = true;
  const g = document.createElement('div'); g.className = 'drag-ghost';
  g.innerHTML = `<div class="dot" style="--k:${c.c1};--t:${textOn(c.c1)}"><b>${p.ovr}</b></div><div class="nm">${esc(shortName(p.n))}</div>`;
  document.body.appendChild(g); drag.g = g; drag.src.classList.add('dragsrc');
  moveGhost(e);
}
function moveGhost(e) {
  drag.g.style.left = e.clientX + 'px'; drag.g.style.top = e.clientY + 'px';
  document.querySelectorAll('.pslot.droptgt').forEach((x) => x.classList.remove('droptgt'));
  drag.g.style.display = 'none'; const el = document.elementFromPoint(e.clientX, e.clientY); drag.g.style.display = '';
  const t = el?.closest('.pslot[data-slot]'); if (t && +t.dataset.slot !== drag.slot) t.classList.add('droptgt');
  const pitch = document.getElementById('tpitch'); if (pitch) pitch.classList.toggle('dropzone', !!el?.closest('#tpitch') && !t && drag.slot != null);
}
document.addEventListener('pointermove', (e) => {
  if (!drag) return;
  if (!drag.on) { if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 7) startDrag(e); else return; }
  if (drag && drag.on) { e.preventDefault(); moveGhost(e); }
}, { passive: false });
function endDrag(e, cancel) {
  if (!drag) return; const d = drag; drag = null;
  if (!d.on) return;
  lastDrop = Date.now();
  d.g.remove(); d.src.classList.remove('dragsrc');
  const pitch = document.getElementById('tpitch'); pitch?.classList.remove('dropzone');
  if (cancel) { render(); return; }
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const t = el?.closest('.pslot[data-slot]');
  const { G, c, youth, tact } = mySide(); const lu = youth ? G.me.u20lineup : c.lineup;
  if (t) {
    const j = +t.dataset.slot;
    if (d.slot != null) { if (j !== d.slot) { [lu.xi[d.slot], lu.xi[j]] = [lu.xi[j], lu.xi[d.slot]]; toast('Posições trocadas'); } }
    else {
      const p = G.players[d.pid]; if (!available(p)) { toast('Jogador indisponível'); render(); return; }
      const out = lu.xi[j]; lu.xi[j] = p.id; lu.bench = lu.bench.filter((x) => x !== p.id);
      if (out >= 0 && !lu.bench.includes(out)) { lu.bench.unshift(out); if (lu.bench.length > 9) lu.bench.pop(); }
      toast(`${shortName(p.n)} entra no time`);
    }
  } else if (d.slot != null && el?.closest('#tpitch')) {
    const r = pitch.getBoundingClientRect();
    const depth = clamp(((e.clientX - r.left) / r.width * 100 - 7) / 86, 0.1, 0.92), width = clamp(((e.clientY - r.top) / r.height * 100 - 8) / 84, 0.03, 0.97);
    const form = formOf(tact);
    if (form[d.slot][0] === 'GOL') { toast('O goleiro fica no gol 😉'); render(); return; }
    if (tact.form !== 'Personalizada') { tact.custom = form.map((f) => f.slice()); tact.form = 'Personalizada'; }
    const role = roleAt(width, depth);
    tact.custom[d.slot] = [role, +width.toFixed(3), +depth.toFixed(3)];
    toast(`Nova função: ${role}`);
  }
  render(); save();
}
document.addEventListener('pointerup', (e) => endDrag(e));
document.addEventListener('pointercancel', (e) => endDrag(e, true));

// ---------- decisões (diretoria, vestiário, imprensa, comercial) ----------
import { resolveDecision } from '../engine/life.js';
import { takeNatJob, nextNatFix } from '../engine/nations.js';
import { acceptLoanOffer } from '../engine/market2.js';
import { coachWage } from '../engine/econ.js';
H.decide = (v) => {
  const G = S.G; const [id, i] = v.split(':').map(Number); const m = G.inbox.find((x) => x.id === id); if (!m) return;
  const r = resolveDecision(G, m, i); closeSheet(); toast(r, 3200); render(); save();
};
// ---------- negociação de contrato do técnico ----------
H.jobneg = (id) => {
  const G = S.G; const m = G.inbox.find((x) => x.id === +id); if (!m) return;
  const c = G.clubs[m.cid]; const base = coachWage(c.rep, c.country, m.youth);
  S.jn = { m: m.id, base, wage: base, years: m.youth ? 1 : 2, tries: 0 };
  openSheet(jobNegHtml());
};
function jobNegHtml() {
  const G = S.G, n = S.jn, m = G.inbox.find((x) => x.id === n.m), c = G.clubs[m.cid];
  return `<div class="row" style="gap:10px">${crest(c, 40)}<div><h2 style="margin:0">Contrato: ${esc(c.name)}${m.youth ? ' (Sub-20)' : ''}</h2><div class="xs mut">Diretoria ${esc(c.board.type || '')} · reputação do clube ${c.rep}</div></div></div>
  <div class="card flat" style="margin-top:10px"><div class="kv"><span class="mut">Oferta do clube</span><b>${money(n.base)}/sem.</b></div>
  <div class="field" style="margin-top:6px"><label>Seu pedido: <b id="jnw">${money(n.wage)}</b>/sem.</label><input type="range" min="${Math.round(n.base * 0.9)}" max="${Math.round(n.base * 1.6)}" step="${Math.max(100, Math.round(n.base / 100))}" value="${n.wage}" data-in="jnw"></div>
  <div class="field"><label>Duração</label><div class="seg" style="margin:0">${[1, 2, 3, 4].map((y) => `<button class="${n.years === y ? 'on' : ''}" data-a="jny" data-v="${y}">${y} ano${y > 1 ? 's' : ''}</button>`).join('')}</div></div>
  <p class="xs mut">Pedir muito acima da oferta pode fazer o clube recusar. Contratos longos protegem você (multa maior se for demitido).</p></div>
  <div class="row"><button class="btn red grow" data-a="jnno">Recusar proposta</button><button class="btn pri grow" data-a="jnok">Enviar proposta</button></div>`;
}
H.jnw = (v) => { S.jn.wage = +v; document.getElementById('jnw').textContent = money(+v); };
H.jny = (v) => { S.jn.years = +v; replaceSheet(jobNegHtml()); };
H.jnno = () => { const m = S.G.inbox.find((x) => x.id === S.jn.m); if (m) m.done = true; closeSheet(); render(); save(); };
H.jnok = () => {
  const G = S.G, n = S.jn, m = G.inbox.find((x) => x.id === n.m), c = G.clubs[m.cid];
  const ratio = n.wage / n.base; const p = 1 - Math.max(0, ratio - 1) * 2.2 + (G.me.rep - c.rep) / 60 - (n.years >= 4 ? 0.15 : 0);
  if (Math.random() < p) {
    takeJob(G, m.cid, m.youth, false, { wage: n.wage, years: n.years }); m.done = true;
    for (const x of G.inbox) if (x.kind === 'job' && !x.done) x.done = true;
    closeSheet(); toast(`✍️ Você é o novo técnico do ${c.name}! Contrato até ${G.me.job.until}.`, 3200); S.tab = 'home'; S.page = null; render(); save();
  } else if (n.tries++ < 1) { toast('❌ O clube recusou esses termos. Última chance: reduza o pedido.', 3000); n.wage = Math.round((n.wage + n.base) / 2); replaceSheet(jobNegHtml()); }
  else { m.done = true; closeSheet(); toast(`O ${c.name} desistiu da negociação.`, 3000); render(); save(); }
};
