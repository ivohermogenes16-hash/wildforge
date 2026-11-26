// Prancheta Online: tela própria com Início, Ranking (geral, temporada e desafio), Desafio da Semana,
// Liga com amigos e Perfil (troféus, selos, conquistas e coleção).
import { S, H, openSheet, closeSheet, replaceSheet, centerNote } from './app.js';
import { esc, hash, withSeed, pick, shuffle, clamp } from '../util.js';
import { crest } from './art.js';
import { IMG } from '../store.js';
import { SQUADS } from '../data/squads.js';
import { FORMATIONS } from '../engine/match.js';
import { allClubs, squadOf, bestXI, playO, sqOvr, OFORMS, OMENT, OPRESS } from '../engine/osim.js';
import { PF_SVG, pfTag, pfAdd, pfSpend, isVip, W as WAL, adOk, adsLeft, watchAd, has, grant, myLook } from './loja.js';
import { avatar as cav, bannerCls, bannerStyle, bannerFx, titleTag, cosStr, cosParse, item, CAT, EVENTS } from './cosmetics.js';

const OK = 'prancheta.on';
const O = (() => { const d = { nick: '', best: 0, ch: {}, paid: [], st: {}, sea: {}, selos: [], ach: [], lgs: [], lgPaid: {} }; try { return { ...d, ...JSON.parse(localStorage.getItem(OK) || '{}') }; } catch { return d; } })();
O.st ||= {}; O.sea ||= {}; O.selos ||= []; O.ach ||= [];
const osave = () => { try { localStorage.setItem(OK, JSON.stringify(O)); } catch {} };
const api = (m, p, b, q) => (window.LumbraAnalytics?.api ? window.LumbraAnalytics.api(m, p, b, q) : Promise.reject(new Error('offline')));
const me = () => window.LumbraAnalytics?.uid || null;
export const ONL = { O, api, me, osave };
const q = (o) => Object.entries(o).map(([k, v]) => k + '=' + encodeURIComponent(typeof v === 'string' ? JSON.stringify(v) : v)).join('&');
const nickOf = () => O.nick || (S.G?.me.name || '').slice(0, 20);
export const av = (p, size = 38, still) => cav({ ...(p.cos ? cosParse(p.cos) : { fr: p.fr }), n: p.n, vip: p.vip, still }, size);
const myAv = (size = 44) => cav({ ...myLook(), n: O.nick || 'T' }, size);
const stat = (k, n = 1) => { O.st[k] = (O.st[k] || 0) + n; osave(); };

// ---------- divisões e temporada mensal ----------
export const DIVS = [
  { id: 'bronze', t: 'Bronze', min: 0, c: '#c07a3a', pf: 30 }, { id: 'prata', t: 'Prata', min: 150, c: '#c9d2dc', pf: 80 }, { id: 'ouro', t: 'Ouro', min: 450, c: '#f4c542', pf: 160 },
  { id: 'diam', t: 'Diamante', min: 1000, c: '#4cc9f0', pf: 300 }, { id: 'lenda', t: 'Lenda', min: 2000, c: '#b36bff', pf: 500 },
];
const seaKey = (t = new Date()) => `m${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, '0')}`;
const seaEnd = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 1); };
const seaName = (k) => { const m = +k.slice(5), y = k.slice(1, 5); return `${['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][m - 1]} ${y}`; };
export const divOf = (sp) => { let d = DIVS[0]; for (const x of DIVS) if ((sp || 0) >= x.min) d = x; return d; };
const mySp = () => O.sea[seaKey()]?.sp || 0;
export function divBadge(d, size = 34) {
  const i = DIVS.indexOf(d);
  return `<span class="dv dv-${d.id}" style="--dc:${d.c};--s:${size}px" title="Divisão ${d.t}"><svg viewBox="0 0 40 46"><defs><linearGradient id="dvg${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${d.c}"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient></defs><path d="M20 2 L37 9 V24 C37 35 29 42 20 45 C11 42 3 35 3 24 V9Z" fill="url(#dvg${i})" stroke="${d.c}" stroke-width="1.5"/><path d="M20 8 L31 12.5 V24 C31 31 26 36 20 38.5 C14 36 9 31 9 24 V12.5Z" fill="#0b1210cc"/>${Array.from({ length: i + 1 }, (_, k) => `<path d="M${20 + (k - i / 2) * 6.4} 19.5 l2.6 4.5 -2.6 4.5 -2.6 -4.5z" fill="${d.c}"/>`).join('')}</svg>${i >= 3 ? '<i class="dv-shine"></i>' : ''}</span>`;
}
// pontos de temporada: desafio, liga, títulos da carreira e login diário
let seaT = 0;
function sp(n, why) {
  if (!n) return; const k = seaKey(); const r = (O.sea[k] ||= { sp: 0 }); const before = divOf(r.sp); r.sp += Math.round(n); osave();
  const after = divOf(r.sp);
  if (after !== before) { setTimeout(() => divUp(after), 600); if (after.id === 'lenda') grant('tit_lenda', 'Chegou à divisão Lenda!'); feedPost(`subiu para a divisão ${after.t}`, 'div'); }
  clearTimeout(seaT); seaT = setTimeout(syncSeason, 3000);
  const hd = document.querySelector('.on-div'); if (hd) { const d = divOf(r.sp); hd.innerHTML = `${divBadge(d, 40)}<div><small>DIVISÃO</small><b style="color:${d.c}">${d.t}</b><span>${r.sp} pts · ${seaName(k)}</span></div>`; }
}
window.PONT = { sp, stat };
function divUp(d) {
  const el = document.createElement('div'); el.className = 'dv-up'; el.innerHTML = `<div class="dv-up-box">${divBadge(d, 110)}<small>NOVA DIVISÃO</small><b style="color:${d.c}">${d.t}</b></div>`;
  document.body.appendChild(el); setTimeout(() => el.remove(), 3400); try { window.PSFX?.('horn'); } catch {}
}
async function syncSeason() {
  if (!O.nick || !me()) return; const k = seaKey(); const r = O.sea[k]; if (!r) return;
  try { await api('PUT', `pr/sea/${k}/${me()}`, { n: O.nick, sp: r.sp, cos: cosStr(myLook()), vip: isVip(), t: { '.sv': 'timestamp' } }); } catch {}
}
async function seasonRewards() {
  const now = seaKey();
  for (const [k, r] of Object.entries(O.sea)) {
    if (k >= now || r.paid || !r.sp) continue;
    try {
      const j = await api('GET', `pr/sea/${k}`, undefined, q({ orderBy: 'sp', startAt: r.sp + 1, limitToFirst: 15 })); const pos = Object.keys(j || {}).length + 1; const d = divOf(r.sp);
      r.paid = 1; r.pos = pos; O.selos.unshift({ k, div: d.id, pos }); O.selos = O.selos.slice(0, 24); osave();
      pfAdd(d.pf, `Temporada ${seaName(k)}: divisão ${d.t}`); if (pos <= 10) grant('ex_top10', `Top 10 na temporada ${seaName(k)}!`);
    } catch { break; }
  }
}

// ---------- pontuação da carreira (ranking geral) ----------
export function careerScore(G) {
  if (!G?.me) return 0; const t = G.me.titles || [];
  return Math.round(t.reduce((s, x) => s + clamp(x.w || 3, 1, 40) * 12, 0) + (G.me.rep || 0) * 8 + (G.me.stats?.v || 0) * 2 + Math.max(0, G.year - 2026) * 15);
}
function myProfile() {
  const G = S.G; const c = G?.me.job ? G.clubs[G.me.job.cid] : null; const sc = Math.max(O.best || 0, careerScore(G));
  const top = (G?.me.titles || []).slice().sort((a, b) => (b.w || 0) - (a.w || 0)).slice(0, 4).map((t) => `${t.c} ${t.y}`).join('|').slice(0, 160);
  return { n: nickOf() || 'Técnico', cl: (c?.name || O.cl || 'Sem clube').slice(0, 30), c1: (c?.c1 || O.c1 || '#1f6f4a').slice(0, 9), c2: (c?.c2 || O.c2 || '#ffffff').slice(0, 9), sc, rep: Math.round(G?.me.rep || O.rep || 0), ti: (G?.me.titles || []).length || O.ti || 0, se: G ? Math.max(0, G.year - 2026) : O.se || 0, fr: (myLook().fr || '').slice(0, 10), cos: cosStr(myLook()), vip: isVip(), tt: top || O.tt || '', lg: O.lgw || 0, chb: O.chb || 0, sp: mySp(), t: { '.sv': 'timestamp' }, v: '6.2' };
}
let lastSync = 0;
export async function syncProfile(force) {
  if (!O.nick || !me()) return false; if (!force && Date.now() - lastSync < 5 * 60e3) return true; lastSync = Date.now();
  const p = myProfile(); if (p.sc > (O.best || 0)) O.best = p.sc; Object.assign(O, { cl: p.cl, c1: p.c1, c2: p.c2, rep: p.rep, ti: p.ti, se: p.se, tt: p.tt }); osave();
  try { await api('PUT', `pr/prof/${me()}`, p); return true; }
  catch (e) { // regras antigas: manda só os campos de antes
    if (/Permission|401/.test(String(e))) { try { const { cos, sp: _sp, ...old } = p; old.v = '6.0'; await api('PUT', `pr/prof/${me()}`, old); return true; } catch {} }
    return false;
  }
}
window.PONLINE_SYNC = () => { syncProfile(true); syncSeason(); const el = document.getElementById('onpage'); if (el && O.nick) { const st = document.getElementById('onbody')?.scrollTop || 0; el.innerHTML = shell(); body(); const b = document.getElementById('onbody'); if (b) b.scrollTop = st; } };
setInterval(() => { if (S.G && O.nick) syncProfile(); }, 10 * 60e3);

// ---------- mural (feed) ----------
async function feedPost(txt, k = 'x') { if (!O.nick || !me()) return; try { await api('POST', 'pr/feed', { n: O.nick, cos: cosStr(myLook()), k: String(k).slice(0, 6), x: String(txt).slice(0, 120), t: { '.sv': 'timestamp' } }); } catch {} }
window.PFEED = feedPost;
const FEED_IC = { div: '🛡️', tit: '🏆', ch: '🎯', lg: '🤝', it: '✨', x: '⚽' };

// ---------- tela do Online ----------
let TAB = 'inicio'; let RT = 'geral';
const TABS = [['inicio', 'Início', '🏠'], ['rank', 'Ranking', '📊'], ['desafio', 'Desafio', '🎯'], ['liga', 'Liga', '🤝'], ['perfil', 'Perfil', '👤']];
function page() {
  let el = document.getElementById('onpage'); if (el) return el;
  el = document.createElement('div'); el.id = 'onpage'; el.className = 'on-page'; document.body.appendChild(el); return el;
}
H.tonline = (v) => {
  TAB = v || TAB; const el = page();
  if (!O.nick) { el.innerHTML = `<div class="on-wrap"><button class="on-x" data-a="onclose">✕</button><div class="on-main">${nickHtml()}</div></div>`; return; }
  el.innerHTML = shell(); body(); try { window.PSFX?.('ok'); } catch {}
};
H.onclose = () => { const el = document.getElementById('onpage'); if (el) { el.classList.add('out'); setTimeout(() => el.remove(), 250); } try { window.PHOMEREFRESH?.(); } catch {} };
H.ontab = (v) => { TAB = v; const el = document.getElementById('onpage'); if (!el) return H.tonline(v); el.querySelectorAll('.on-nav button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); body(); };
function shell() {
  const L = myLook(); const d = divOf(mySp());
  return `<div class="on-wrap"><div class="on-bgfx"><i></i><i></i><i></i></div>
  <nav class="on-nav"><div class="on-brand">ONLINE<i class="live-dot"></i></div>${TABS.map(([k, t, ic]) => `<button class="${TAB === k ? 'on' : ''}" data-a="ontab" data-v="${k}"><span>${ic}</span>${t}</button>`).join('')}<button class="on-shop" data-a="tloja"><span>💎</span>Loja</button><button class="on-close" data-a="onclose">✕ Fechar</button></nav>
  <div class="on-main"><div class="on-top ${bannerCls(L.ban)}" style="${bannerStyle(L.ban)}">${bannerFx(L.ban)}<div class="on-me">${myAv(54)}<div><b>${esc(O.nick)}</b><div>${titleTag(L.tit) || `<small class="mut">Toque em Perfil para mudar seu visual</small>`}</div></div></div>
    <div class="on-top-r"><div class="on-div" data-a="ontab" data-v="rank">${divBadge(d, 40)}<div><small>DIVISÃO</small><b style="color:${d.c}">${d.t}</b><span>${mySp()} pts · ${seaName(seaKey())}</span></div></div><button class="pf-chip" data-a="tloja">${PF_SVG}<b class="pf-n">${window.PPF?.bal() ?? 0}</b></button><button class="on-x" data-a="onclose">✕</button></div></div>
  <div id="onbody"></div></div></div>`;
}
function setBody(h) { const b = document.getElementById('onbody'); if (b) b.innerHTML = h; }
function body() {
  if (TAB === 'inicio') { setBody(homeHtml()); loadHome(); }
  else if (TAB === 'rank') { setBody(rankShell()); loadRank(); }
  else if (TAB === 'desafio') { setBody(chHome()); chRewards(); loadChTop(); }
  else if (TAB === 'liga') { setBody(window.PLIGA?.home() || ''); window.PLIGA?.load(); }
  else if (TAB === 'perfil') { setBody(profHtml(myProfile(), true)); }
  seasonRewards();
}
function nickHtml(edit) {
  return `<div class="on-nick"><h2>${edit ? 'Mudar apelido' : 'Bem-vindo ao Prancheta Online'}</h2><p class="sm mut">Escolha um apelido. É ele que aparece no ranking, no Desafio da Semana e na liga com amigos. Não use seu nome completo.</p>
  <div class="field"><label>Apelido (3 a 20 letras)</label><input id="onnick" maxlength="20" value="${esc(O.nick || '')}" placeholder="Ex.: Professor Pardal"></div>
  <button class="btn pri big blk" data-a="onnick">${edit ? 'Salvar' : 'Entrar no online'}</button></div>`;
}
H.onnick = async () => {
  const v = (document.getElementById('onnick')?.value || '').replace(/[<>\[\]{}#$/.]/g, '').replace(/\s+/g, ' ').trim();
  if (v.length < 3) { centerNote('O apelido precisa ter pelo menos 3 letras.'); return; }
  O.nick = v.slice(0, 20); osave(); closeSheet(true); await syncProfile(true); H.tonline(TAB);
};
H.oneditnick = () => openSheet(nickHtml(true));
const offline = (e) => `<div class="hint">Não consegui conectar ao online agora. Confira a internet e tente de novo.${e ? `<div class="xs mut">${esc(String(e.message || e).slice(0, 90))}</div>` : ''}</div><button class="btn blk" data-a="ontab" data-v="${TAB}">Tentar de novo</button>`;

// ---------- Início ----------
const cd = (t) => { const s = Math.max(0, Math.round((t - Date.now()) / 1000)); const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}min` : `${m} min`; };
function homeHtml() {
  const W = weekly(); const r = O.ch[W.n] || {}; const left = Math.max(0, tries() - used()); const d = divOf(mySp()); const nx = DIVS[DIVS.indexOf(d) + 1];
  const ev = window.PEV?.active?.();
  return `${ev ? window.PEV.card() : ''}
  <div class="oh-grid">
    <div class="oh-card oh-ch" style="--c1:${esc(W.club.c1)};--c2:${esc(W.club.c2)}" data-a="ontab" data-v="desafio"><div class="oh-k">🎯 DESAFIO DA SEMANA <span class="oh-cd">termina em ${cd(weekEnd(W.n).getTime())}</span></div><div class="row" style="gap:10px;align-items:center">${crest(W.club, 52)}<div class="grow"><b>${esc(W.club.name)}</b><div class="xs">${esc(W.th.t)} · 5 jogos</div><div class="xs">Seu recorde: <b>${r.best || 0}</b> · ${left} tentativa${left === 1 ? '' : 's'}</div></div></div><div class="oh-prize">Prêmio: até ${pfTag(PRIZE[0])} + moldura exclusiva</div><span class="btn pri blk">${r.best ? 'Melhorar recorde' : 'Jogar agora'}</span></div>
    <div class="oh-card oh-sea"><div class="oh-k">🛡️ TEMPORADA ${seaName(seaKey()).toUpperCase()} <span class="oh-cd">acaba em ${cd(seaEnd().getTime())}</span></div><div class="row" style="gap:12px;align-items:center">${divBadge(d, 64)}<div class="grow"><b style="color:${d.c};font-size:20px">${d.t}</b><div class="xs mut">${mySp()} pontos${nx ? ` · faltam ${nx.min - mySp()} para ${nx.t}` : ' · divisão máxima!'}</div><div class="oh-bar"><i style="width:${nx ? Math.round(((mySp() - d.min) / (nx.min - d.min)) * 100) : 100}%;background:${d.c}"></i></div></div></div>
      <div class="xs mut" style="margin-top:6px">Ganhe pontos jogando o Desafio, vencendo na liga, conquistando títulos e entrando todo dia. No fim do mês tem prêmio por divisão.</div></div>
    <div class="oh-card"><div class="oh-k">🤝 MINHAS LIGAS</div><div id="ohlg">${O.lgs?.length ? '<div class="pf-spin"></div>' : '<div class="xs mut">Crie uma liga e chame os amigos com um código.</div><button class="btn sm pri" data-a="ontab" data-v="liga" style="margin-top:6px">Criar liga</button>'}</div></div>
    <div class="oh-card"><div class="oh-k">🏅 CONQUISTAS</div>${achMini()}</div>
  </div>
  <h3 class="oh-h">📰 Acontecendo agora</h3><div id="ohfeed" class="oh-feed"><div class="pf-spin"></div></div>`;
}
async function loadHome() {
  syncProfile();
  try { const j = await api('GET', 'pr/feed', undefined, q({ orderBy: 't', limitToLast: 30 })); const L = Object.values(j || {}).sort((a, b) => b.t - a.t);
    const el = document.getElementById('ohfeed'); if (el) el.innerHTML = L.map((f, i) => `<div class="oh-f" style="--d:${Math.min(i, 12) * 0.04}s">${av(f, 30, i > 8)}<span class="grow"><b>${esc(f.n)}</b> ${esc(f.x)}</span><small>${ago(f.t)}</small><i>${FEED_IC[f.k] || '⚽'}</i></div>`).join('') || '<div class="xs mut">Ainda nada por aqui. Jogue o Desafio ou suba de divisão para aparecer!</div>';
  } catch (e) { const el = document.getElementById('ohfeed'); if (el) el.innerHTML = '<div class="xs mut">Sem conexão com o mural agora.</div>'; }
  const lg = document.getElementById('ohlg'); if (lg && O.lgs?.length) { try { const rows = await Promise.all(O.lgs.slice(0, 3).map((c) => api('GET', `pr/lg/${c}/meta`).then((m) => [c, m]).catch(() => [c, null]))); lg.innerHTML = rows.filter(([, m]) => m).map(([c, m]) => `<button class="oh-lg" data-a="lgopen" data-v="${c}"><b class="grow ell">${esc(m.name)}</b><small>${m.st === 'lobby' ? 'Esperando jogadores' : m.st === 'end' ? 'Encerrada' : 'Em andamento'}</small><span>›</span></button>`).join('') || '<div class="xs mut">Nenhuma liga ativa.</div>'; } catch {} }
}
const ago = (t) => { const s = (Date.now() - t) / 1000; return s < 3600 ? `${Math.max(1, Math.round(s / 60))} min` : s < 86400 ? `${Math.round(s / 3600)} h` : `${Math.round(s / 86400)} d`; };

// ---------- Ranking (geral, temporada, desafio) ----------
let RANK = [];
function rankShell() { return `<div class="seg sm on-rt">${[['geral', 'Geral (carreira)'], ['sea', 'Temporada'], ['ch', 'Desafio da semana']].map(([k, t]) => `<button class="${RT === k ? 'on' : ''}" data-a="onrt" data-v="${k}">${t}</button>`).join('')}</div><div id="onrk"><div class="pf-spin"></div></div>`; }
H.onrt = (v) => { RT = v; setBody(rankShell()); loadRank(); };
const rowHtml = (r, i, score, sub) => { const c = r.cos ? cosParse(r.cos) : {}; return `<button class="on-row ${r.u === me() ? 'me' : ''} ${i < 3 ? 'top' + (i + 1) : ''} ${bannerCls(c.ban)}" style="--d:${Math.min(i, 20) * 0.03}s;${bannerStyle(c.ban)}" data-a="onprof" data-v="${i}">${bannerFx(c.ban)}<span class="on-p">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>${av(r, 36, i > 12)}<span class="grow ell"><b>${esc(r.n)}</b> ${titleTag(c.tit)}<small>${sub}</small></span><span class="on-sc">${score}</span></button>`; };
const podium = (R, sc) => R.length < 3 ? '' : `<div class="on-pod">${[1, 0, 2].map((i) => { const r = R[i]; const c = r.cos ? cosParse(r.cos) : {}; return `<button class="pod p${i + 1} ${r.u === me() ? 'me' : ''}" data-a="onprof" data-v="${i}"><span class="pod-av">${av(r, i ? 54 : 70)}</span><b class="ell">${esc(r.n)}</b>${titleTag(c.tit)}<em>${sc(r)}</em><i class="pod-base">${i + 1}º</i></button>`; }).join('')}</div>`;
async function loadRank() {
  const el = () => document.getElementById('onrk');
  try {
    await syncProfile();
    if (RT === 'geral') {
      const j = await api('GET', 'pr/prof', undefined, q({ orderBy: 'sc', limitToLast: 100 }));
      RANK = Object.entries(j || {}).map(([u, p]) => ({ u, ...p })).sort((a, b) => b.sc - a.sc);
      let pos = RANK.findIndex((r) => r.u === me()) + 1; let total = '';
      if (!pos && O.best) { try { const a = await api('GET', 'pr/prof', undefined, q({ orderBy: 'sc', startAt: O.best + 1, limitToFirst: 2000 })); pos = Object.keys(a || {}).length + 1; } catch {} }
      try { const all = await api('GET', 'pr/prof', undefined, 'shallow=true'); total = Object.keys(all || {}).length; O.total = total; osave(); } catch {}
      if (RT !== 'geral' || !el()) return;
      el().innerHTML = `<div class="on-mypos"><div><small>Sua posição</small><b>${pos ? pos + 'º' : '—'}</b></div><div><small>Técnicos</small><b>${total || RANK.length}</b></div><div><small>Seus pontos</small><b>${Math.max(O.best || 0, careerScore(S.G))}</b></div><button class="btn sm" data-a="onshare">Compartilhar</button></div>
      <div class="xs mut" style="margin:4px 0 8px">Pontos da carreira: títulos (os grandes valem mais), reputação, vitórias e temporadas.</div>${podium(RANK, (r) => r.sc)}<div class="on-rank">${RANK.map((r, i) => rowHtml(r, i, r.sc, `<i class="on-cl" style="--c1:${esc(r.c1 || '#333')};--c2:${esc(r.c2 || '#fff')}"></i>${esc(r.cl || '')} · ${r.ti || 0} títulos`)).join('') || '<div class="hint">Ninguém ainda. Seja o primeiro!</div>'}</div>`;
    } else if (RT === 'sea') {
      const k = seaKey(); const j = await api('GET', `pr/sea/${k}`, undefined, q({ orderBy: 'sp', limitToLast: 100 }));
      RANK = Object.entries(j || {}).map(([u, p]) => ({ u, ...p })).sort((a, b) => b.sp - a.sp); if (RT !== 'sea' || !el()) return;
      el().innerHTML = `<div class="sea-divs">${DIVS.map((d) => `<div class="${divOf(mySp()) === d ? 'on' : ''}">${divBadge(d, 34)}<small>${d.t}</small><i>${d.min}+</i></div>`).join('')}</div>
      <div class="xs mut" style="margin:4px 0 8px">Temporada de ${seaName(k)} · acaba em ${cd(seaEnd().getTime())}. Prêmio no fim do mês para cada divisão, e moldura exclusiva para o top 10.</div>${podium(RANK, (r) => r.sp)}<div class="on-rank">${RANK.map((r, i) => { const d = divOf(r.sp); return rowHtml(r, i, `${r.sp}`, `${divBadge(d, 14)} ${d.t}`); }).join('') || '<div class="hint">A temporada acabou de começar. Jogue para aparecer aqui!</div>'}</div>`;
    } else {
      const n = weekNo(); const j = await api('GET', `pr/ch/w${n}`, undefined, q({ orderBy: 'sc', limitToLast: 100 }));
      RANK = Object.entries(j || {}).map(([u, r]) => ({ u, ...r })).sort((a, b) => b.sc - a.sc); if (RT !== 'ch' || !el()) return;
      el().innerHTML = `<div class="xs mut" style="margin:4px 0 8px">Desafio ${n + 1}: ${esc(weekly().club.name)}. Termina em ${cd(weekEnd(n).getTime())}.</div>${podium(RANK, (r) => r.sc)}<div class="on-rank">${RANK.map((r, i) => rowHtml(r, i, r.sc, esc(r.r || ''))).join('') || '<div class="hint">Ninguém jogou ainda. Seja o primeiro!</div>'}</div>`;
    }
  } catch (e) { if (el()) el().innerHTML = offline(e); }
}
H.onprof = async (i) => { const r = RANK[+i]; if (!r) return; let p = r; if (RT !== 'geral') { try { p = { ...(await api('GET', `pr/prof/${r.u}`)), u: r.u } || r; } catch {} } openSheet(profHtml(p, r.u === me())).parentElement.classList.add('wide'); };

// ---------- conquistas online ----------
const ACH = [
  { id: 'ch1', t: 'Primeiro desafio', d: 'Jogue o Desafio da Semana', k: 'chPlayed', n: 1, pf: 30 },
  { id: 'ch10', t: 'Viciado em desafio', d: 'Jogue 10 tentativas no Desafio', k: 'chPlayed', n: 10, pf: 100 },
  { id: 'chw25', t: 'Colecionador de vitórias', d: 'Vença 25 jogos no Desafio', k: 'chWins', n: 25, pf: 150, item: 'em_medalha' },
  { id: 'chtop', t: 'Pódio', d: 'Termine uma semana no top 3 do Desafio', k: 'chTop3', n: 1, pf: 150 },
  { id: 'lg1', t: 'Entre amigos', d: 'Entre numa liga com amigos', k: 'lgJoined', n: 1, pf: 30 },
  { id: 'lgw10', t: 'Dono da rodada', d: 'Vença 10 jogos em ligas', k: 'lgWins', n: 10, pf: 100 },
  { id: 'lgc', t: 'Campeão entre amigos', d: 'Seja campeão de uma liga', k: 'lgw', n: 1, pf: 200 },
  { id: 'dv3', t: 'Elite', d: 'Chegue à divisão Ouro', k: 'divMax', n: 2, pf: 150 },
  { id: 'dv5', t: 'Lendário', d: 'Chegue à divisão Lenda', k: 'divMax', n: 4, pf: 500 },
  { id: 'col10', t: 'Colecionador', d: 'Tenha 10 itens na coleção', k: 'items', n: 10, pf: 80 },
  { id: 'col30', t: 'Museu do técnico', d: 'Tenha 30 itens na coleção', k: 'items', n: 30, pf: 250 },
  { id: 'str7', t: 'Fiel', d: 'Pegue o bônus diário 7 dias seguidos', k: 'streak', n: 7, pf: 70 },
  { id: 'shr', t: 'Garoto-propaganda', d: 'Compartilhe seu card', k: 'shares', n: 1, pf: 40 },
];
const achVal = (a) => a.k === 'divMax' ? Math.max(O.st.divMax || 0, DIVS.indexOf(divOf(mySp()))) : a.k === 'items' ? CAT.filter((x) => has(x.id)).length : a.k === 'streak' ? (WAL.streak || 0) : a.k === 'lgw' ? (O.lgw || 0) : O.st[a.k] || 0;
const achDone = (a) => achVal(a) >= a.n;
function achMini() { const ready = ACH.filter((a) => achDone(a) && !O.ach.includes(a.id)); const got = O.ach.length; return `<div class="row" style="gap:10px;align-items:center"><b style="font-size:26px">${got}<small class="mut" style="font-size:13px">/${ACH.length}</small></b><div class="grow xs mut">${ready.length ? `<b class="gold">${ready.length} prêmio${ready.length > 1 ? 's' : ''} para pegar!</b>` : 'Complete conquistas e ganhe Pranfixas e itens.'}</div><button class="btn sm ${ready.length ? 'pri' : ''}" data-a="ontab" data-v="perfil">Ver</button></div>`; }
H.onach = (id) => { const a = ACH.find((x) => x.id === id); if (!a || !achDone(a) || O.ach.includes(id)) return; O.ach.push(id); osave(); pfAdd(a.pf, `Conquista: ${a.t}`); if (a.item) setTimeout(() => grant(a.item, `Conquista: ${a.t}`), 2300); if (TAB === 'perfil') setBody(profHtml(myProfile(), true)); };

// ---------- perfil ----------
function profHtml(p, mine) {
  const c = mine ? myLook() : p.cos ? cosParse(p.cos) : { fr: p.fr };
  const tt = String(p.tt || '').split('|').filter(Boolean); const d = divOf(p.sp || (mine ? mySp() : 0));
  return `<div class="on-prof">
  <div class="on-prof-hd ${bannerCls(c.ban)}" style="--c1:${esc(p.c1 || '#1f6f4a')};${bannerStyle(c.ban)}">${bannerFx(c.ban)}${cav({ ...c, n: p.n, vip: p.vip }, 84)}<div class="grow"><h2>${esc(p.n)}</h2><div>${titleTag(c.tit)}</div><div class="xs" style="margin-top:4px">${p.vip ? '<b class="gold">SÓCIO PRANCHETA</b> · ' : ''}Técnico do ${esc(p.cl || '—')}</div></div><div class="on-prof-dv">${divBadge(d, 54)}<small style="color:${d.c}">${d.t}</small></div></div>
  <div class="on-stats"><div><b>${p.sc || 0}</b><small>pontos</small></div><div><b>${p.ti || 0}</b><small>títulos</small></div><div><b>${p.rep || 0}</b><small>reputação</small></div><div><b>${p.se || 0}</b><small>temporadas</small></div><div><b>${p.chb || 0}</b><small>melhor desafio</small></div><div><b>${p.lg || 0}</b><small>ligas ganhas</small></div></div>
  ${mine ? `<div class="row" style="gap:8px;margin:10px 0;flex-wrap:wrap"><button class="btn pri grow" data-a="tloja" data-v="col">🎨 Mudar meu visual</button><button class="btn grow" data-a="onshare">Compartilhar card</button><button class="btn grow" data-a="oneditnick">Mudar apelido</button></div>` : ''}
  <h3>🏆 Sala de troféus</h3><div class="troph">${tt.map((t) => `<div class="tr-it"><span class="tr-cup">🏆</span><small>${esc(t)}</small></div>`).join('')}${(mine ? O.selos : []).slice(0, 8).map((s) => { const dd = DIVS.find((x) => x.id === s.div) || DIVS[0]; return `<div class="tr-it">${divBadge(dd, 34)}<small>${dd.t} · ${esc(seaName(s.k))}${s.pos <= 10 ? ` · ${s.pos}º` : ''}</small></div>`; }).join('')}${(mine ? O.lgw : p.lg) ? `<div class="tr-it"><span class="tr-cup">🤝</span><small>${mine ? O.lgw : p.lg}× campeão de liga</small></div>` : ''}${!tt.length && !(mine && O.selos.length) ? '<div class="xs mut">Títulos da carreira, selos de temporada e ligas ganhas aparecem aqui.</div>' : ''}</div>
  ${mine ? `<h3>🏅 Conquistas online <span class="xs mut">${O.ach.length}/${ACH.length}</span></h3><div class="ach-list">${ACH.map((a) => { const v = Math.min(achVal(a), a.n), dn = achDone(a), got = O.ach.includes(a.id); return `<div class="ach ${got ? 'got' : dn ? 'ready' : ''}"><div class="grow"><b>${esc(a.t)}</b><small>${esc(a.d)}</small><div class="oh-bar"><i style="width:${Math.round((v / a.n) * 100)}%"></i></div></div><div class="ach-r">${got ? '<span class="good">✓</span>' : dn ? `<button class="btn sm pri" data-a="onach" data-v="${a.id}">Pegar ${pfTag(a.pf)}</button>` : `<small>${v}/${a.n}</small>${pfTag(a.pf)}`}${a.item ? `<small class="xs" style="color:${'#b36bff'}">+ ${esc(item(a.item)?.n || '')}</small>` : ''}</div></div>`; }).join('')}</div>` : ''}</div>`;
}

// ---------- card de compartilhar ----------
H.onshare = async () => {
  const p = myProfile(); const G = S.G; const c = G?.me.job ? G.clubs[G.me.job.cid] : null; const style = myLook().cd || window.PCOS?.eq('cd') || '';
  const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350; const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 1080, 1350);
  if (style === 'cd_ouro') { g.addColorStop(0, '#2a1d02'); g.addColorStop(0.4, '#8a5d0c'); g.addColorStop(0.55, '#f4c542'); g.addColorStop(1, '#3a2a10'); }
  else if (style === 'cd_holo') { g.addColorStop(0, '#2a0f3a'); g.addColorStop(0.3, '#1e5bd8'); g.addColorStop(0.55, '#2ff3c5'); g.addColorStop(0.8, '#ff4dd8'); g.addColorStop(1, '#14082a'); }
  else { g.addColorStop(0, '#07110e'); g.addColorStop(0.55, '#0f2a20'); g.addColorStop(1, p.c1 || '#1f6f4a'); }
  x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  if (style) { x.globalAlpha = 0.18; for (let i = 0; i < 14; i++) { x.fillStyle = '#fff'; x.save(); x.translate(i * 110 - 200, 0); x.rotate(0.35); x.fillRect(0, -200, 26, 1900); x.restore(); } x.globalAlpha = 1; }
  x.globalAlpha = 0.08; x.strokeStyle = '#fff'; x.lineWidth = 6; x.strokeRect(80, 560, 920, 620); x.beginPath(); x.arc(540, 870, 120, 0, 7); x.stroke(); x.beginPath(); x.moveTo(80, 870); x.lineTo(1000, 870); x.stroke(); x.globalAlpha = 1;
  x.fillStyle = '#fff'; x.font = '900 italic 84px system-ui, sans-serif'; x.fillText('PRAN', 80, 150); x.fillStyle = style === 'cd_ouro' ? '#fff1b8' : '#2ff3a0'; x.fillText('CHETA', 80 + x.measureText('PRAN').width, 150);
  x.fillStyle = '#ffffffaa'; x.font = '700 30px system-ui'; x.fillText('CARD DO TÉCNICO', 82, 200);
  const cimg = c && IMG.get('c:' + c.key);
  await new Promise((ok) => { if (!cimg) { x.fillStyle = p.c1; x.beginPath(); x.arc(860, 140, 90, 0, 7); x.fill(); x.lineWidth = 10; x.strokeStyle = p.c2; x.stroke(); x.fillStyle = p.c2; x.font = '900 54px system-ui'; x.textAlign = 'center'; x.fillText((c?.short || p.cl || 'PR').slice(0, 3).toUpperCase(), 860, 160); x.textAlign = 'left'; ok(); return; } const im = new Image(); im.onload = () => { x.drawImage(im, 770, 50, 180, 180); ok(); }; im.onerror = ok; im.src = cimg; });
  // avatar: moldura + emblema desenhados a partir do SVG
  const L = myLook(); const fcol = { fr_bronze: '#d9925a', fr_prata: '#e8eef1', fr_ouro: '#f4c542', fr_diam: '#4cc9f0', fr_neon: '#2ff3c5', fr_lenda: '#b36bff', ex_desafio: '#2fe08a', ex_liga: '#4cc9f0', ex_socio: '#f4c542', ex_top10: '#ff3d00' }[L.fr] || (L.fr?.startsWith('evf_') ? EVENTS[L.fr.slice(4)]?.c : '#ffffff55');
  const rg = x.createLinearGradient(90, 290, 310, 510); rg.addColorStop(0, '#fff'); rg.addColorStop(0.4, fcol); rg.addColorStop(1, '#000'); x.fillStyle = rg; x.beginPath(); x.arc(200, 400, 112, 0, 7); x.fill(); x.fillStyle = '#0b1714'; x.beginPath(); x.arc(200, 400, 94, 0, 7); x.fill();
  const esvg = L.em ? window.PCOSCAT.emblemSvg(L.em) : '';
  await new Promise((ok) => { if (!esvg) { x.fillStyle = '#fff'; x.font = '900 100px system-ui'; x.textAlign = 'center'; x.fillText((p.n || 'T')[0].toUpperCase(), 200, 436); x.textAlign = 'left'; ok(); return; } const im = new Image(); im.onload = () => { x.drawImage(im, 125, 325, 150, 150); ok(); }; im.onerror = ok; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(esvg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" ')); });
  x.font = '900 70px system-ui'; x.fillStyle = '#fff'; x.fillText(p.n.slice(0, 18), 350, 385); const tit = item(L.tit); x.font = '800 32px system-ui'; x.fillStyle = '#ffe08a'; if (tit) x.fillText(tit.n.toUpperCase(), 352, 430);
  x.font = '600 34px system-ui'; x.fillStyle = '#ffffffcc'; x.fillText(`${p.vip ? '★ Sócio · ' : ''}${p.cl}`, 350, tit ? 480 : 445);
  const d = divOf(mySp()); const st = [['PONTOS', p.sc], ['TÍTULOS', p.ti], ['DIVISÃO', d.t.toUpperCase()], ['TEMPORADAS', p.se]];
  st.forEach(([l, v], i) => { const bx = 80 + (i % 2) * 470, by = 600 + Math.floor(i / 2) * 230; x.fillStyle = '#00000066'; x.fillRect(bx, by, 450, 200); x.fillStyle = l === 'DIVISÃO' ? d.c : style === 'cd_ouro' ? '#fff1b8' : '#2ff3a0'; x.font = `900 ${String(v).length > 6 ? 70 : 96}px system-ui`; x.fillText(String(v), bx + 36, by + 120); x.fillStyle = '#ffffffaa'; x.font = '700 30px system-ui'; x.fillText(l, bx + 40, by + 170); });
  const tt = String(p.tt || '').split('|').filter(Boolean).slice(0, 3); x.font = '700 34px system-ui'; x.fillStyle = '#fff'; tt.forEach((t, i) => x.fillText('🏆 ' + t, 80, 1120 + i * 52));
  x.fillStyle = '#ffffff88'; x.font = '600 28px system-ui'; x.fillText('Baixe o Prancheta: lumbragames.github.io/Prancheta', 80, 1300);
  const url = cv.toDataURL('image/png'); const b64 = url.split(',')[1]; const name = `prancheta-card-${Date.now()}.png`;
  openSheet(`<h2>Seu card</h2><img src="${url}" style="width:100%;max-width:340px;border-radius:14px;display:block;margin:0 auto 10px"><div class="row" style="gap:8px"><button class="btn pri grow" data-a="oncardsave">Salvar na galeria</button><button class="btn grow" data-a="oncardwa">Mandar no WhatsApp</button></div><div class="xs mut" style="margin-top:6px">Para postar a imagem: salve na galeria e escolha ela no app.${style ? '' : ' Dá para trocar o estilo do card na Loja.'}</div>`);
  CARD = { b64, name, url, p }; if (!O.st.shares) stat('shares');
};
let CARD = null;
H.oncardsave = async () => {
  if (!CARD) return; const N = window.PranchetaNative;
  if (N?.saveFile) { const w = N.saveFile(CARD.name, CARD.b64, 'image/png'); centerNote(w ? 'Card salvo na galeria!' : 'Não consegui salvar', 2200); return; }
  try { const blob = await (await fetch(CARD.url)).blob(); const f = new File([blob], CARD.name, { type: 'image/png' }); if (navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f], title: 'Prancheta' }); return; } } catch {}
  const a = document.createElement('a'); a.href = CARD.url; a.download = CARD.name; document.body.appendChild(a); a.click(); a.remove();
};
H.oncardwa = () => { const p = CARD?.p || myProfile(); const t = `Sou o técnico ${p.n} no Prancheta ⚽\n🏆 ${p.ti} títulos · ${p.sc} pontos no ranking geral\nBaixa e vem me enfrentar: https://lumbragames.github.io/Prancheta/`; try { window.PranchetaNative?.openUrl ? window.PranchetaNative.openUrl('https://wa.me/?text=' + encodeURIComponent(t)) : window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank'); } catch {} };

// ---------- Desafio da Semana ----------
const WEEK0 = Date.UTC(2026, 0, 5, 3); // segunda-feira 00h de Brasília
export const weekNo = (t = Date.now()) => Math.floor((t - WEEK0) / (7 * 864e5));
export const weekEnd = (n) => new Date(WEEK0 + (n + 1) * 7 * 864e5);
export const PRIZE = [220, 150, 90, 45, 15]; // 1º, 2º-3º, até 10º, até 50º, participou
const THEMES = [
  { id: 'normal', t: 'Sequência dura', d: 'Cinco jogos contra times mais fortes. Monte a melhor estratégia.' },
  { id: 'craque', t: 'Sem o craque', d: 'Seu melhor jogador está lesionado a semana toda.', fx: (sq) => { const b = [...sq].sort((a, c) => c.ovr - a.ovr)[0]; return sq.filter((p) => p !== b); } },
  { id: 'fora', t: 'Maratona fora de casa', d: 'Todos os cinco jogos são na casa do adversário.', away: 1 },
  { id: 'cansado', t: 'Elenco cansado', d: 'Semana de muitos jogos: todo o elenco joga com -3 de geral.', fx: (sq) => sq.map((p) => ({ ...p, ovr: p.ovr - 3 })) },
  { id: 'jovem', t: 'Aposta na juventude', d: 'Só jogadores de até 25 anos podem ser escalados (e gerados da base completam).', fx: (sq) => { const y = sq.filter((p) => p.age <= 25); return y.length >= 14 ? y : sq; } },
];
const WCACHE = {};
export function weekly(n = weekNo()) {
  if (WCACHE[n]) return WCACHE[n];
  return (WCACHE[n] = withSeed(hash('desafio:' + n), () => {
    const real = allClubs().filter((c) => SQUADS[c.key] && String(SQUADS[c.key]).split(';').length >= 14);
    const pool = real.filter((c) => c.rep >= 40 && c.rep <= 70); const club = pick(pool.length ? pool : real);
    const opp = shuffle(real.filter((c) => c.key !== club.key && c.rep >= club.rep + 3 && c.rep <= club.rep + 26)).slice(0, 5).sort((a, b) => a.rep - b.rep);
    const th = THEMES[n % THEMES.length];
    let sq = squadOf(club.key); if (th.fx) sq = th.fx(sq);
    return { n, club, opp, th, sq };
  }));
}
const tries = () => (isVip() ? 5 : 3) + (O.ch[weekNo()]?.extra || 0);
const used = () => O.ch[weekNo()]?.tries || 0;
window.PONHOMEDATA = () => { const W = weekly(); const r = O.ch[W.n] || {}; return { W, best: r.best || 0, left: Math.max(0, tries() - used()), end: weekEnd(W.n).getTime(), nick: O.nick, total: O.total || 0, pos: O.lastPos || 0, div: divOf(mySp()), sp: mySp(), prize: PRIZE[0], lgs: O.lgs?.length || 0 }; };
let TOP3 = null;
async function loadChTop() {
  try { const n = weekNo() - 1; const j = await api('GET', `pr/ch/w${n}`, undefined, q({ orderBy: 'sc', limitToLast: 3 })); TOP3 = Object.values(j || {}).sort((a, b) => b.sc - a.sc);
    const el = document.getElementById('chtop'); if (el) el.innerHTML = TOP3.length ? `<div class="oh-k">👑 CAMPEÕES DA SEMANA PASSADA</div><div class="ch-podium">${TOP3.map((r, i) => `<div class="p${i + 1}">${av(r, i ? 40 : 52)}<b class="ell">${esc(r.n)}</b><small>${r.sc}</small><i>${['🥇', '🥈', '🥉'][i]}</i></div>`).join('')}</div>` : '';
  } catch {}
}
function chHome() {
  const W = weekly(); const r = O.ch[W.n] || {}; const left = Math.max(0, tries() - used()); const end = weekEnd(W.n);
  const hist = Object.entries(O.ch).filter(([k, v]) => +k < W.n && v.best).sort((a, b) => b[0] - a[0]).slice(0, 6);
  return `<div class="ch-hero" style="--c1:${esc(W.club.c1)};--c2:${esc(W.club.c2)}"><div class="ch-crest">${crest(W.club, 64)}</div><div class="grow"><small>DESAFIO DA SEMANA ${W.n + 1} · termina em ${cd(end.getTime())}</small><h2>${esc(W.club.name)}</h2><div class="xs">${esc(W.th.t)}: ${esc(W.th.d)}</div><div class="xs mut">Elenco: geral médio ${sqOvr(W.sq)} · ${esc(W.club.lname)}</div></div></div>
  <div class="ch-opp">${W.opp.map((o, i) => { const res = r.last?.[i]; return `<div class="ch-o" style="--d:${i * 0.06}s"><small>Jogo ${i + 1}</small>${crest(o, 34)}<b class="ell">${esc(o.short || o.name)}</b><span class="xs mut">${sqOvr(squadOf(o.key))} geral</span>${res ? `<i class="${res[0] > res[1] ? 'good' : res[0] < res[1] ? 'bad' : ''}">${res[0]}-${res[1]}</i>` : ''}</div>`; }).join('')}</div>
  <div class="ch-info"><div><small>Seu recorde</small><b>${r.best || 0}</b></div><div><small>Tentativas</small><b>${left}/${tries()}</b></div><div><small>Prêmio do 1º</small><b>${pfTag(PRIZE[0])}</b><small>+ moldura e título</small></div></div>
  <div class="row" style="gap:8px;margin:10px 0">${left ? '<button class="btn pri big grow ch-go" data-a="chstart">▶ Começar tentativa</button>' : `${adOk() && adsLeft() ? '<button class="btn grow" data-a="chextra" data-v="ad">▶ Anúncio: +1 tentativa</button>' : ''}<button class="btn grow" data-a="chextra" data-v="pf">+1 tentativa ${pfTag(20)}</button>`}<button class="btn grow" data-a="onrkch">Ranking da semana</button></div>
  <div class="xs mut">Todo mundo joga a mesma situação. O resultado depende só da sua escalação e da sua tática: mesma escolha, mesmo placar. Vitória vale 300, empate 100, cada gol de saldo 40 e cada gol feito 10.</div>
  <div id="chtop" class="ch-topw"></div>
  ${hist.length ? `<h3>Suas últimas semanas</h3><div class="list">${hist.map(([k, v]) => `<div class="li sm"><span class="grow">Desafio ${+k + 1} · ${esc(weekly(+k).club.name)}</span><b>${v.best}</b>${v.pos ? `<span class="xs mut">${v.pos}º lugar</span>` : ''}</div>`).join('')}</div>` : ''}`;
}
H.chextra = async (v) => { if (v === 'ad') { if (!(await watchAd())) return; } else if (!pfSpend(20, 'Tentativa extra no desafio')) return; const r = (O.ch[weekNo()] ||= {}); r.extra = (r.extra || 0) + 1; osave(); setBody(chHome()); };
let CH = null;
H.chstart = () => {
  const W = weekly(); if (tries() - used() <= 0) return; const r = (O.ch[W.n] ||= {}); r.tries = (r.tries || 0) + 1; osave(); stat('chPlayed'); try { window.PEV?.track('desafio', 1); } catch {}
  const t = { form: '4-3-3', ment: 1, press: 1, contra: 0, linha: 1, passe: 1 }; CH = { W, i: 0, res: [], t, xi: bestXI(W.sq, t.form) };
  openSheet(chMatchHtml()).parentElement.classList.add('wide');
};
function chMatchHtml() {
  const { W, i, t, xi } = CH; const o = W.opp[i]; const F = FORMATIONS[t.form]; const by = new Map(W.sq.map((p) => [p.k, p]));
  const seg = (k, opts) => `<div class="seg sm">${opts.map((x, j) => `<button class="${t[k] === j ? 'on' : ''}" data-a="cht" data-v="${k}:${j}">${x}</button>`).join('')}</div>`;
  const home = !W.th.away && i % 2 === 0;
  return `<div class="ch-play"><div class="ch-vs"><div>${crest(W.club, 44)}<b>${esc(W.club.short || W.club.name)}</b></div><div class="ch-mid"><small>JOGO ${i + 1} DE 5 · ${home ? 'EM CASA' : 'FORA'}</small><b>${CH.res.reduce((s, r) => s + r.pts, 0)} pts</b></div><div>${crest(o, 44)}<b>${esc(o.short || o.name)}</b></div></div>
  <div class="ch-grid"><div class="ch-pitch">${F.map(([pos, x, y], j) => { const p = by.get(xi[j]); return `<button class="ch-dot" style="left:${x * 100}%;top:${(1 - y) * 88 + 4}%" data-a="chslot" data-v="${j}"><b>${p ? p.ovr : '-'}</b><span>${esc(p ? p.n.split(' ').slice(-1)[0] : '?')}</span><i>${pos}</i></button>`; }).join('')}</div>
  <div class="ch-tac"><label>Formação</label><div class="ch-forms">${OFORMS.map((f) => `<button class="${t.form === f ? 'on' : ''}" data-a="chform" data-v="${f}">${f}</button>`).join('')}</div>
  <label>Mentalidade</label>${seg('ment', OMENT)}<label>Pressão</label>${seg('press', OPRESS)}<label>Linha defensiva</label>${seg('linha', ['Baixa', 'Média', 'Alta'])}<label>Contra-ataque</label>${seg('contra', ['Não', 'Sim'])}<label>Passes</label>${seg('passe', ['Curtos', 'Mistos', 'Longos'])}
  <div class="xs mut" style="margin-top:4px">Adversário: geral ${sqOvr(squadOf(o.key))}. Toque num jogador no campinho para trocar.</div></div></div>
  <button class="btn pri big blk" data-a="chplay">▶ Jogar contra o ${esc(o.short || o.name)}</button></div>`;
}
H.cht = (v) => { const [k, j] = v.split(':'); CH.t[k] = +j; replaceSheet(chMatchHtml()); };
H.chform = (f) => { CH.t.form = f; CH.xi = bestXI(CH.W.sq, f); replaceSheet(chMatchHtml()); };
H.chslot = (j) => {
  const F = FORMATIONS[CH.t.form]; const pos = F[+j][0]; const cur = CH.xi[+j];
  const list = [...CH.W.sq].sort((a, b) => (b.ovr * (b.pos === pos ? 1 : 0.85)) - (a.ovr * (a.pos === pos ? 1 : 0.85)));
  openSheet(`<h2>Escolher ${pos}</h2><div class="list">${list.map((p) => `<button class="li ${p.k === cur ? 'on' : ''}" data-a="chpick" data-v="${j}|${esc(p.k)}"><span class="pos">${p.pos}</span><span class="grow">${esc(p.n)} <span class="xs mut">${p.age} anos${CH.xi.includes(p.k) && p.k !== cur ? ' · titular' : ''}</span></span><b>${p.ovr}</b></button>`).join('')}</div>`);
};
H.chpick = (v) => { const [j, k] = v.split('|'); const xi = CH.xi; const o = xi.indexOf(k); if (o >= 0) xi[o] = xi[+j]; xi[+j] = k; closeSheet(); replaceSheet(chMatchHtml()); };
H.chplay = () => {
  const { W, i } = CH; const o = W.opp[i]; const home = !W.th.away && i % 2 === 0;
  const B = { sq: squadOf(o.key) }; B.t = withSeed(hash(`cht:${W.n}:${i}`), () => ({ form: pick(['4-3-3', '4-4-2', '4-2-3-1', '3-5-2']), ment: pick([1, 1, 2, 0]), press: pick([1, 2, 1]), linha: 1, contra: pick([0, 0, 1]), passe: 1 })); B.xi = bestXI(B.sq, B.t.form);
  const r0 = playO(hash(`ch:${W.n}:${i}`), { sq: W.sq, xi: CH.xi, t: CH.t }, B, home);
  const my = home ? r0.gh : r0.ga, op = home ? r0.ga : r0.gh; const ev = r0.ev.map((e) => ({ ...e, mine: home ? e.s === 0 : e.s === 1 }));
  const pts = (my > op ? 300 : my === op ? 100 : 0) + (my - op) * 40 + my * 10;
  CH.res.push({ my, op, pts, ev, mvp: r0.mvp, pos: home ? r0.pos : 100 - r0.pos }); if (my > op) stat('chWins');
  matchAnim(CH.res[i], W.club, o, () => replaceSheet(chResultHtml()));
};
// lances animados num campinho antes do placar final
let MA = null;
function matchAnim(r, A, B, done) {
  clearInterval(MA?.t); const evs = [...r.ev].sort((a, b) => a.m - b.m);
  replaceSheet(`<div class="ma"><div class="ma-sb"><span>${crest(A, 30)}<b>${esc(A.short)}</b></span><b class="ma-sc"><span id="mas0">0</span> - <span id="mas1">0</span></b><span><b>${esc(B.short)}</b>${crest(B, 30)}</span><i id="mamin">0'</i></div>
  <div class="ma-pitch" style="--ca:${esc(A.c1)};--cb:${esc(B.c1)}">${Array.from({ length: 20 }, (_, k) => `<i class="ma-p ${k < 10 ? 'a' : 'b'}" id="map${k}" style="left:${k < 10 ? 12 + (k % 4) * 11 : 88 - (k % 4) * 11}%;top:${15 + ((k * 23) % 70)}%"></i>`).join('')}<i class="ma-gk a" style="left:4%;top:50%"></i><i class="ma-gk b" style="left:96%;top:50%"></i><i class="ma-ball" id="maball"></i><div class="ma-gol" id="magol"></div></div><div class="ma-feed" id="mafeed"></div><button class="btn blk" data-a="maskip">Pular ›</button></div>`);
  let min = 0; const sc = [0, 0]; let bx = 50, by = 50; const ball = () => document.getElementById('maball');
  MA = { done, t: setInterval(() => {
    min += 1.5; const el = document.getElementById('mamin'); if (!el) { clearInterval(MA.t); return; } el.textContent = Math.min(90, Math.floor(min)) + "'";
    const e = evs.find((x) => !x.shown && x.m <= min);
    if (e) { e.shown = 1; const side = e.mine ? 0 : 1; sc[side]++; bx = e.mine ? 97 : 3; by = 50; document.getElementById('mas' + side).textContent = sc[side]; const g = document.getElementById('magol'); g.innerHTML = `<b>GOL!</b><span>${esc(e.n)}</span>`; g.className = 'ma-gol on ' + (e.mine ? 'me' : 'op'); setTimeout(() => (g.className = 'ma-gol'), 1100); document.getElementById('mafeed').insertAdjacentHTML('afterbegin', `<div class="${e.mine ? 'me' : ''}"><i>${e.m}'</i> ⚽ ${esc(e.n)}</div>`); try { window.PSFX?.(e.mine ? 'horn' : 'tap'); } catch {} }
    else { bx = clamp(bx + (Math.random() - 0.5) * 26, 8, 92); by = clamp(by + (Math.random() - 0.5) * 30, 10, 90); }
    const b = ball(); if (b) { b.style.left = bx + '%'; b.style.top = by + '%'; }
    for (let k = 0; k < 20; k++) { const el2 = document.getElementById('map' + k); if (!el2) continue; const hx = k < 10 ? 12 + (k % 4) * 11 : 88 - (k % 4) * 11, hy = 15 + ((k * 23) % 70); const pull = k % 3 === 0 ? 0.55 : 0.25; el2.style.left = clamp(hx + (bx - hx) * pull + (Math.random() - 0.5) * 6, 3, 97) + '%'; el2.style.top = clamp(hy + (by - hy) * pull + (Math.random() - 0.5) * 6, 5, 95) + '%'; }
    if (min >= 92) { clearInterval(MA.t); setTimeout(done, 700); }
  }, 85) };
}
H.maskip = () => { if (!MA) return; clearInterval(MA.t); MA.done(); };
function chResultHtml() {
  const { W, i } = CH; const o = W.opp[i]; const r = CH.res[i]; const last = i >= 4;
  return `<div class="ch-res"><div class="ch-score ${r.my > r.op ? 'win' : r.my < r.op ? 'loss' : 'draw'}"><div>${crest(W.club, 54)}<b>${esc(W.club.short)}</b></div><div class="ch-sc"><span class="cnt">${r.my}</span><i>×</i><span class="cnt">${r.op}</span><small>${r.my > r.op ? 'VITÓRIA' : r.my < r.op ? 'DERROTA' : 'EMPATE'} · +${Math.max(0, r.pts)} pts</small></div><div>${crest(o, 54)}<b>${esc(o.short)}</b></div></div>
  <div class="ch-evs">${r.ev.map((e) => `<div class="ch-ev in ${e.mine ? 'me' : ''}"><i>${e.m}'</i>⚽ <b>${esc(e.n)}</b>${e.a ? ` <span class="xs mut">(${esc(e.a)})</span>` : ''}</div>`).join('') || '<div class="xs mut">Sem gols.</div>'}</div>
  <div class="xs mut">Posse ${r.pos}% · Melhor em campo: ${esc(r.mvp)}</div>
  <button class="btn pri big blk" style="margin-top:10px" data-a="${last ? 'chend' : 'chnext'}">${last ? 'Ver pontuação final' : 'Próximo jogo ›'}</button></div>`;
}
H.chnext = () => { CH.i++; replaceSheet(chMatchHtml()); };
H.chend = async () => {
  const { W } = CH; const sc = Math.max(0, CH.res.reduce((s, r) => s + r.pts, 0)); const rec = (O.ch[W.n] ||= {}); const prev = rec.best || 0; const better = sc > prev;
  if (better) { rec.best = sc; rec.last = CH.res.map((r) => [r.my, r.op]); O.chb = Math.max(O.chb || 0, sc); sp(Math.round((sc - prev) / 20), 'desafio'); } osave();
  replaceSheet(`<div class="ch-end"><small>PONTUAÇÃO FINAL</small><div class="ch-big">${sc}</div><div class="ch-line">${CH.res.map((r) => `<span class="${r.my > r.op ? 'good' : r.my < r.op ? 'bad' : ''}">${r.my}-${r.op}</span>`).join('')}</div>${better ? `<div class="hint good">Novo recorde seu nesta semana!${sc - prev >= 20 ? ` +${Math.round((sc - prev) / 20)} pontos de temporada` : ''}</div>` : `<div class="xs mut">Seu recorde da semana continua ${rec.best}.</div>`}<div id="chpos" class="xs mut">Enviando para o ranking…</div><div class="row" style="gap:8px;margin-top:10px"><button class="btn pri grow" data-a="chback">Voltar</button></div></div>`);
  try {
    if (better && me()) await api('PUT', `pr/ch/w${W.n}/${me()}`, { n: O.nick, sc, fr: (myLook().fr || '').slice(0, 10), cos: cosStr(myLook()), vip: isVip(), r: rec.last.map((x) => x.join('-')).join(' '), t: { '.sv': 'timestamp' } }).catch(async (e) => { if (/Permission|401/.test(String(e))) await api('PUT', `pr/ch/w${W.n}/${me()}`, { n: O.nick, sc, fr: (myLook().fr || '').slice(0, 10), vip: isVip(), r: rec.last.map((x) => x.join('-')).join(' '), t: { '.sv': 'timestamp' } }); else throw e; });
    const j = await api('GET', `pr/ch/w${W.n}`, undefined, q({ orderBy: 'sc', startAt: (rec.best || 0) + 1, limitToFirst: 1000 })); const pos = Object.keys(j || {}).length + 1;
    const el = document.getElementById('chpos'); if (el) el.innerHTML = `Você está em <b>${pos}º</b> no Desafio desta semana.`;
    if (better && pos === 1) feedPost(`assumiu a liderança do Desafio da Semana com ${sc} pontos`, 'ch');
    syncProfile(true);
  } catch (e) { const el = document.getElementById('chpos'); if (el) el.textContent = 'Sem conexão: sua pontuação será enviada depois.'; rec.pend = 1; osave(); }
};
H.chback = () => { closeSheet(); if (TAB === 'desafio') setBody(chHome()); };
// prêmio das semanas que já acabaram
async function chRewards() {
  const now = weekNo();
  for (const [wk, r] of Object.entries(O.ch)) {
    const n = +wk; if (n >= now || O.paid.includes(n) || !r.best) continue;
    try {
      if (r.pend && me()) { await api('PUT', `pr/ch/w${n}/${me()}`, { n: O.nick, sc: r.best, fr: (myLook().fr || '').slice(0, 10), vip: isVip(), r: (r.last || []).map((x) => x.join('-')).join(' '), t: { '.sv': 'timestamp' } }).catch(() => {}); r.pend = 0; }
      const j = await api('GET', `pr/ch/w${n}`, undefined, q({ orderBy: 'sc', startAt: r.best + 1, limitToFirst: 60 })); const pos = Object.keys(j || {}).length + 1;
      const v = pos === 1 ? PRIZE[0] : pos <= 3 ? PRIZE[1] : pos <= 10 ? PRIZE[2] : pos <= 50 ? PRIZE[3] : PRIZE[4]; O.paid.push(n); r.pos = pos; osave(); pfAdd(v, `Desafio ${n + 1}: ${pos}º lugar`);
      if (pos <= 3) stat('chTop3');
      if (pos === 1) { setTimeout(() => { grant('ex_desafio', 'Campeão do Desafio da Semana!'); grant('tit_campsem'); }, 2400); feedPost(`foi campeão do Desafio ${n + 1}`, 'ch'); }
    } catch { break; }
  }
  if (O.paid.length > 60) { O.paid = O.paid.slice(-60); osave(); }
  for (const k of Object.keys(O.ch)) if (+k < now - 8) delete O.ch[k];
}
// títulos grandes da carreira viram pontos de temporada e aparecem no mural
window.PONTITLE = (t) => { sp(clamp((t.w || 3) * 8, 10, 200), 'titulo'); if ((t.w || 0) >= 8) feedPost(`conquistou ${t.c}`, 'tit'); };
window.PONTWIN = () => sp(2, 'vitoria');
H.onrkch = () => { RT = 'ch'; H.ontab('rank'); };

// ---------- atalhos dentro da carreira ----------
// globo e loja na barra de cima (com ponto quando tem novidade)
window.PTOPON = () => {
  const W = weekly(); const r = O.ch[W.n] || {}; const ev = window.PEV?.active?.();
  const dot = !r.best || (ev && !(WAL.evp?.[ev.id]?.seen)) || Date.now() - (O.lgVisit || 0) > 864e5 && O.lgs?.length;
  const sn = (() => { try { return (WAL.seenShop || 0) < 61 || (ev && WAL.seenEv !== ev.id); } catch { return false; } })();
  return `<button class="tb-on" data-a="tonline" title="Online">🌍${dot ? '<i class="dot"></i>' : ''}</button><button class="tb-shop" data-a="tloja" title="Loja">💎${sn ? '<i class="shop-new">NOVO</i>' : ''}</button>`;
};
// cards no Início da carreira: Desafio e liga/temporada
window.PONHOME = () => {
  const W = weekly(); const r = O.ch[W.n] || {}; const left = Math.max(0, tries() - used()); const d = divOf(mySp()); const ev = window.PEV?.active?.();
  return `${ev ? window.PEV.card() : ''}<div class="hm-on"><div data-a="tonline" data-v="desafio" style="--c1:${esc(W.club.c1)}"><small>🎯 DESAFIO DA SEMANA · termina em ${cd(weekEnd(W.n).getTime())}</small><b>${esc(W.club.name)} contra 5 gigantes</b><span>${r.best ? `Seu recorde: ${r.best} · ` : ''}${left} tentativa${left === 1 ? '' : 's'} · prêmio até ${PRIZE[0]} Pranfixas</span> <span class="hm-go">Jogar ›</span></div>
  <div data-a="tonline" data-v="${O.lgs?.length ? 'liga' : 'rank'}" style="--c1:${d.c}"><small>🛡️ ONLINE · TEMPORADA ${seaName(seaKey()).toUpperCase()}</small><b>Divisão ${d.t} · ${mySp()} pts</b><span>${O.lgs?.length ? 'Veja a rodada da sua liga com amigos' : 'Ranking geral, liga com amigos e muito mais'}</span> <span class="hm-go">Abrir ›</span></div></div>`;
};
window.PHOMEREFRESH = () => { try { if (S.G && document.querySelector('header')) import('./app.js').then((a) => a.render()); } catch {} };
// lembretes no celular (notificações locais): desafio novo, desafio acabando e rodada da liga
window.PNOTIF = () => {
  const N = window.PranchetaNative; if (!N?.schedule) return; const now = Date.now();
  const n = weekNo(); const monday = WEEK0 + (n + 1) * 7 * 864e5 + 13 * 36e5; const sunday = WEEK0 + (n + 1) * 7 * 864e5 - 4 * 36e5;
  try {
    N.schedule(7101, '🎯 Novo Desafio da Semana!', `${weekly(n + 1).club.name} contra 5 gigantes. Você consegue chegar ao topo?`, Math.max(60e3, monday - now));
    const r = O.ch[n] || {}; if (sunday > now) N.schedule(7102, '⏰ O Desafio da Semana acaba hoje', r.best ? `Seu recorde é ${r.best}. Ainda dá tempo de subir no ranking!` : 'Você ainda não jogou. Ainda dá tempo de entrar no ranking!', sunday - now);
    if (O.lgNext && O.lgNext - 36e5 > now) N.schedule(7103, '🤝 Rodada da liga em 1 hora', 'Escalou o time? Confira a escalação antes da rodada.', O.lgNext - 36e5 - now);
  } catch {}
};
