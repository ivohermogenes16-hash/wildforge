// Eventos com prêmios. Quem cria é o Lumbra Control (remote/PRANCHETA/evp):
// { on, id, name, theme, from, to, shop, bonus: { daily }, mis: [{ k, n, pf, it }] }
import { H, openSheet, replaceSheet, closeSheet } from './app.js';
import { esc } from '../util.js';
import { EVENTS, CAT, item, preview, emblemSvg, RARITY } from './cosmetics.js';
import { W, pfAdd, pfTag, grant, has, myLook } from './loja.js';

let EVC = null;
try { window.LumbraAnalytics?.onRemote((r) => { EVC = r && r.evp ? r.evp : null; try { window.PEVREFRESH?.(); } catch {} }); } catch {}
const save = () => { try { localStorage.setItem('prancheta.pf', JSON.stringify(W)); } catch {} };
export const MK = {
  vit: (n) => `Vença ${n} jogo${n > 1 ? 's' : ''} na carreira`, jogos: (n) => `Jogue ${n} partida${n > 1 ? 's' : ''} na carreira`, desafio: (n) => `Jogue ${n} tentativa${n > 1 ? 's' : ''} no Desafio da Semana`,
  dias: (n) => `Pegue o bônus diário em ${n} dia${n > 1 ? 's' : ''}`, liga: (n) => `Vença ${n} jogo${n > 1 ? 's' : ''} na liga com amigos`,
};
export function active() {
  const e = EVC; if (!e || !e.on || !EVENTS[e.theme]) return null; const t = Date.now();
  if (e.from && t < e.from) return null; if (e.to && t > e.to) return null; return { ...e, id: e.id || e.theme, name: e.name || 'Evento ' + EVENTS[e.theme].t };
}
const prog = (e) => (W.evp ||= {})[e.id] ||= { p: {}, got: [] };
export function track(k, n = 1) { const e = active(); if (!e || !(e.mis || []).some((m) => m.k === k)) return; const P = prog(e); P.p[k] = (P.p[k] || 0) + n; save(); }
const ready = (e) => (e.mis || []).filter((m, i) => (prog(e).p[m.k] || 0) >= m.n && !prog(e).got.includes(i)).length;
const cdTxt = (t) => { const s = Math.max(0, (t - Date.now()) / 1000); const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600); return d > 0 ? `${d}d ${h}h` : `${h}h ${Math.floor((s % 3600) / 60)}min`; };
export function card() {
  const e = active(); if (!e) return ''; const E = EVENTS[e.theme]; const P = prog(e); const done = (e.mis || []).filter((m, i) => P.got.includes(i)).length; const r = ready(e);
  return `<button class="ev-card" data-a="evopen" style="--e1:${E.c};--e2:${E.c2}"><span class="ev-em">${emblemSvg('ev_' + e.theme)}</span><span class="grow"><small>EVENTO · termina em ${cdTxt(e.to)}</small><b>${esc(e.name)}</b><span class="xs">${(e.mis || []).length ? `Missões: ${done}/${e.mis.length}` : 'Itens exclusivos na loja'}${r ? ` · <b class="ev-ready">${r} prêmio${r > 1 ? 's' : ''} para pegar!</b>` : ''}</span></span><span class="ev-go">Ver ›</span></button>`;
}
function evHtml() {
  const e = active(); if (!e) return '<h2>Nenhum evento agora</h2><p class="sm mut">Fique de olho: eventos aparecem de tempos em tempos com prêmios exclusivos.</p>';
  const E = EVENTS[e.theme]; const P = prog(e); const items = CAT.filter((x) => x.ev === e.theme);
  return `<div class="ev-page" style="--e1:${E.c};--e2:${E.c2}"><div class="ev-hd"><span class="ev-em big">${emblemSvg('ev_' + e.theme)}</span><div class="grow"><small>EVENTO · termina em ${cdTxt(e.to)}</small><h2>${esc(e.name)}</h2>${e.bonus?.daily > 1 ? '<div class="xs"><b>Bônus diário em dobro durante o evento!</b></div>' : ''}</div></div>
  ${(e.mis || []).length ? `<h3>Missões</h3><div class="ev-mis">${e.mis.map((m, i) => { const v = Math.min(P.p[m.k] || 0, m.n); const got = P.got.includes(i), ok = v >= m.n; const it = m.it && item(m.it); return `<div class="ev-m ${got ? 'got' : ok ? 'ready' : ''}"><div class="grow"><b>${esc(MK[m.k] ? MK[m.k](m.n) : m.k)}</b><div class="oh-bar"><i style="width:${Math.round((v / m.n) * 100)}%"></i></div><small>${v}/${m.n}</small></div><div class="ev-rw">${it ? `<span class="ev-it" data-a="itopen" data-v="${it.id}">${preview(it, myLook(), 'T', 40)}</span>` : ''}${m.pf ? pfTag(m.pf) : ''}</div>${got ? '<span class="good">✓</span>' : ok ? `<button class="btn sm pri" data-a="evclaim" data-v="${i}">Pegar</button>` : ''}</div>`; }).join('')}</div>` : ''}
  ${items.length ? `<h3>Coleção do evento</h3><div class="xs mut">Ganhe nas missões${e.shop !== false ? ' ou pegue na Loja enquanto o evento durar' : ''}.</div><div class="it-grid" style="margin-top:6px">${items.map((it) => `<button class="it-card ra-evento ${has(it.id) ? 'own' : ''}" data-a="itopen" data-v="${it.id}" style="--rc:${RARITY.evento.c}"><span class="it-prev">${preview(it, myLook(), 'T', 54)}</span><b>${esc(it.n)}</b><small>${has(it.id) ? '<span class="good">É seu</span>' : 'Evento'}</small></button>`).join('')}</div>` : ''}</div>`;
}
H.evopen = () => { const s = openSheet(evHtml()); s.parentElement.classList.add('wide'); };
H.evclaim = (i) => {
  const e = active(); if (!e) return; const m = e.mis?.[+i]; const P = prog(e); if (!m || P.got.includes(+i) || (P.p[m.k] || 0) < m.n) return;
  P.got.push(+i); save(); if (m.pf) pfAdd(m.pf, `Missão do evento ${e.name}`); if (m.it) setTimeout(() => grant(m.it, `Prêmio do evento ${e.name}`), m.pf ? 2300 : 0);
  replaceSheet(evHtml());
};
window.PEV = { active, track, card, __set: (e) => { EVC = e; } };
