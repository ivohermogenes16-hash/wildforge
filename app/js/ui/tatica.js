// Gerenciamento do Time (estilo modo carreira): campo em perspectiva, reservas embaixo, ficha do atleta ao lado,
// abas no topo (Elenco · Táticas · Atribuições · Treino), estilo de jogo "mexível" e prancheta para desenhar setas.
import { PLAYS } from '../engine/coach.js';
import { S, H, VIEWS, render, toast, save, myLineup, mySide, shortName, posTag } from './app.js';
import { esc, clamp, POS_LINE, hash } from '../util.js';
import { textOn } from './art.js';
import { FORMATIONS, MENT, PRESS, INSTR, ratings, available, formOf, effAt } from '../engine/match.js';
import { attrs } from '../engine/youth.js';
import { setCaptain } from '../engine/extra.js';
import { COUNTRIES } from '../data/leagues.js';

const LINE = { GOL: 'G', LD: 'D', ZAG: 'D', LE: 'D', VOL: 'M', MC: 'M', MEI: 'M', PE: 'A', PD: 'A', ATA: 'A' };
const ovrC = (o) => (o >= 80 ? '#2fe08a' : o >= 72 ? '#9be15d' : o >= 64 ? '#f4c542' : o >= 56 ? '#ff9f43' : '#ff6b6b');
const ROLE = { GOL: 'Goleiro', LD: 'Lateral-direito', LE: 'Lateral-esquerdo', ZAG: 'Zagueiro', VOL: 'Volante', MC: 'Meio-campista', MEI: 'Meia-armador', PE: 'Ponta-esquerda', PD: 'Ponta-direita', ATA: 'Centroavante' };
const FOCO = { GOL: 'Defesa', LD: 'Equilíbrio', LE: 'Equilíbrio', ZAG: 'Defesa', VOL: 'Defesa', MC: 'Equilíbrio', MEI: 'Ataque', PE: 'Ataque', PD: 'Ataque', ATA: 'Ataque' };

// projeção do campo em perspectiva: profundidade 0 = nosso gol (embaixo) · 1 = ataque (em cima)
export const proj = (w, d) => { const s = 1 - 0.3 * d; return { x: 50 + (w - 0.5) * 90 * s, y: 93 - d * 84, s: 0.78 + 0.22 * (1 - d) }; };
export const unproj = (X, Y) => { const d = (93 - Y) / 84; const s = 1 - 0.3 * d; return { depth: d, width: 0.5 + (X - 50) / (90 * s) }; };

export function pinfo(p) {
  const R = hash(p.key || p.n); const foot = R % 100 < 24 ? 'Esquerda' : R % 100 < 28 ? 'Ambas' : 'Direita';
  const base = { GOL: 189, ZAG: 186, VOL: 180, LD: 175, LE: 175, MC: 177, MEI: 174, PE: 173, PD: 173, ATA: 182 }[p.pos] || 178;
  const h = base + (R % 11) - 5; const forma = p.st?.j ? p.st.ns / p.st.j : null;
  return { foot, h, forma, mood: p.mor >= 75 ? ['Feliz', '#2fe08a', '😄'] : p.mor >= 55 ? ['Bem', '#9be15d', '🙂'] : p.mor >= 38 ? ['Normal', '#f4c542', '😐'] : ['Insatisfeito', '#ff6b6b', '😠'] };
}
function shirt(c1, c2, num, w = 46) { const t = textOn(c1); return `<svg viewBox="0 0 100 100" width="${w}" height="${w}"><path d="M30 8 L42 6 Q50 10 58 6 L70 8 L94 22 L84 40 L74 34 L74 94 L26 94 L26 34 L16 40 L6 22 Z" fill="${c1}" stroke="#0006" stroke-width="2"/><path d="M42 6 Q50 12 58 6" stroke="${c2}" stroke-width="4" fill="none"/><text x="50" y="70" text-anchor="middle" font-family="'Barlow Condensed',system-ui" font-weight="800" font-size="36" fill="${t}" stroke="${c2}" stroke-width=".8" paint-order="stroke">${num}</text></svg>`; }

// números de camisa para todo o elenco (goleiro 1, zagueiros 3/4, camisa 10 pro meia…)
export function ensureNums(G, c) {
  const sq = G.players.filter((p) => p && p.club === c.id); if (sq.every((p) => p.num)) return;
  const used = new Set(sq.map((p) => p.num).filter(Boolean)); const pref = { GOL: [1, 12, 23], LD: [2, 13], ZAG: [3, 4, 14, 15], LE: [6, 16], VOL: [5, 8], MC: [8, 15, 18], MEI: [10, 20], PE: [11, 7], PD: [7, 17], ATA: [9, 19, 21] };
  for (const p of sq.sort((a, b) => b.ovr - a.ovr)) { if (p.num) continue; let n = (pref[p.pos] || []).find((x) => !used.has(x)); if (!n) { n = 22; while (used.has(n)) n++; } p.num = n; used.add(n); }
}
// ---------- campo ----------
export function pitchHtml(G, c, lu, tact, o = {}) {
  const form = formOf(tact); const kit = c.c1 || '#2fe08a';
  const arrows = tact.arrows || {};
  const field = `<svg class="p3-field" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="p3g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c5e3a"/><stop offset="1" stop-color="#23784a"/></linearGradient></defs>
    <polygon points="${[proj(0, 1), proj(1, 1), proj(1, 0), proj(0, 0)].map((q) => `${q.x},${q.y}`).join(' ')}" fill="url(#p3g)"/>
    ${Array.from({ length: 8 }, (_, i) => { const a = proj(0, i / 8), b = proj(1, i / 8), a2 = proj(1, (i + 1) / 8), b2 = proj(0, (i + 1) / 8); return i % 2 ? `<polygon points="${a.x},${a.y} ${b.x},${b.y} ${a2.x},${a2.y} ${b2.x},${b2.y}" fill="#ffffff07"/>` : ''; }).join('')}
    <g fill="none" stroke="#ffffff7a" stroke-width=".45"><polygon points="${[proj(0, 1), proj(1, 1), proj(1, 0), proj(0, 0)].map((q) => `${q.x},${q.y}`).join(' ')}"/>
    <line x1="${proj(0, 0.5).x}" y1="${proj(0, 0.5).y}" x2="${proj(1, 0.5).x}" y2="${proj(1, 0.5).y}"/>
    <ellipse cx="50" cy="${proj(0.5, 0.5).y}" rx="${11 * (1 - 0.15)}" ry="6.2"/>
    ${[0, 1].map((e) => { const d0 = e ? 1 : 0, d1 = e ? 0.83 : 0.17; const p = [proj(0.2, d0), proj(0.2, d1), proj(0.8, d1), proj(0.8, d0)]; const q = [proj(0.37, d0), proj(0.37, e ? 0.94 : 0.06), proj(0.63, e ? 0.94 : 0.06), proj(0.63, d0)]; return `<polyline points="${p.map((z) => `${z.x},${z.y}`).join(' ')}"/><polyline points="${q.map((z) => `${z.x},${z.y}`).join(' ')}"/>`; }).join('')}</g>
    <defs><marker id="p3ar" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#ffd34d"/></marker></defs>
    ${Object.entries(arrows).map(([i, [dw, dd]]) => { const f = form[+i]; if (!f) return ''; const a = proj(f[1], f[2]), b = proj(clamp(f[1] + dw, 0.02, 0.98), clamp(f[2] + dd, 0.02, 0.98)); return `<line class="p3-arrow" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#ffd34d" stroke-width=".9" stroke-dasharray="2 1.2" marker-end="url(#p3ar)"/>`; }).join('')}</svg>`;
  const toks = form.map(([pos, w, d], i) => {
    const p = G.players[lu.xi[i]]; const q = proj(w, d); const sel = S.sel && S.sel.i === i; const bad = p && p.pos !== pos;
    const inf = p ? pinfo(p) : null; const evo = p ? p.ovr - (p.s0 ?? p.ovr) : 0;
    return `<div class="pslot p3t ${sel ? 'sel' : ''}" style="left:${q.x}%;top:${q.y}%;--s:${q.s};animation-delay:${i * 25}ms" data-a="${o.draw ? 'drawsel' : 'slot'}" data-v="${i}" data-slot="${i}">
      <div class="p3-top">${p ? `<i class="p3-m" style="background:${inf.mood[1]}" title="${inf.mood[0]}"></i>` : ''}${evo ? `<em class="${evo > 0 ? 'up' : 'dn'}">${evo > 0 ? '+' : ''}${evo}</em>` : ''}</div>
      <div class="dot p3-d ${bad ? 'off' : ''}" style="--k:${pos === 'GOL' ? '#f4c542' : kit};--t:${pos === 'GOL' ? '#111' : textOn(kit)}"><b>${p ? p.ovr : '+'}</b>${p && !available(p) ? `<i class="injm">${p.inj > 0 ? '🩹' : '🟥'}</i>` : ''}${p && c.capId === p.id ? '<i class="capm">C</i>' : ''}</div>
      <div class="p3-nm ${bad ? 'warn' : ''}">${p ? esc(shortName(p.n)) : pos}</div>
      ${p ? `<div class="p3-bar"><i style="width:${Math.round(p.fit)}%;background:${p.fit < 60 ? '#ff6b6b' : p.fit < 78 ? '#f4c542' : '#2fe08a'}"></i></div>` : ''}<div class="rl">${pos}</div></div>`;
  }).join('');
  return `<div class="pitch p3 ${o.draw ? 'drawing' : ''}" id="tpitch">${field}${toks}</div>`;
}

function infoPanel(G, c, p, slotPos) {
  if (!p) return `<div class="ath-empty"><div class="ath-ic">👆</div><b>Toque num jogador</b><p class="xs mut">no campo ou no banco para ver as informações do atleta.</p></div>`;
  const inf = pinfo(p); const at = attrs(p);
  const row = (l, v) => `<div class="ath-r"><span>${l}</span><b>${v}</b></div>`;
  return `<div class="ath"><div class="ath-hd">${shirt(c.c1, c.c2, p.num || '?', 54)}<div class="grow" style="min-width:0"><div class="ath-o"><b style="color:${ovrC(p.ovr)}">${p.ovr}</b><span>${p.pos}</span></div><div class="ath-n ell">${COUNTRIES[p.nat]?.flag || ''} ${esc(p.n.toUpperCase())}</div></div></div>
    <div class="ath-t">Informações de atleta</div>
    <div class="ath-cols"><div>${row('Energia', `<span style="color:${p.fit < 60 ? '#ff6b6b' : '#2fe08a'}">⚡ ${Math.round(p.fit)}%</span>`)}${row('Ritmo de jogo', inf.forma ? `🔥 ${inf.forma.toFixed(1)}` : '—')}${row('Moral', `<span style="color:${inf.mood[1]}">${inf.mood[0]} ${inf.mood[2]}</span>`)}${row('Perna', inf.foot)}${row('Função', slotPos ? ROLE[slotPos] : ROLE[p.pos])}${row('Foco', FOCO[slotPos || p.pos])}${row('Altura', `${inf.h} cm`)}</div>
    <div>${row('Idade', p.age)}${at.map(([l, v]) => `<div class="ath-r"><span>${l}</span><b style="color:${v >= 80 ? '#2fe08a' : v >= 65 ? 'var(--tx)' : v >= 50 ? '#f4c542' : '#ff6b6b'}">${v}</b></div>`).join('')}</div></div>
    <div class="ath-st"><span>${p.st.j} jogos</span><span>${p.st.g} gols</span><span>${p.st.a} assist.</span>${p.inj > 0 ? `<span class="bad">🩹 ${p.inj} sem.</span>` : ''}</div>
    <div class="row" style="gap:6px"><button class="btn sm grow" data-a="player" data-v="${p.id}">Ficha completa</button>${c.capId !== p.id ? `<button class="btn sm" data-a="tcap" data-v="${p.id}">🧢 Capitão</button>` : ''}</div></div>`;
}
H.tcap = (v) => { const G = S.G, c = mySide().c; setCaptain(G, c, +v); render(); save(); };

// sugestões de troca: cansados, lesionados, fora de posição
export function suggestions(G, c, lu, tact, youth, minute = 0, en = null) {
  const form = formOf(tact); const used = new Set(lu.xi); const out = [];
  const pool = lu.bench.map((id) => G.players[id]).filter((p) => p && available(p));
  for (let i = 0; i < form.length; i++) {
    const p = G.players[lu.xi[i]]; const slot = form[i][0]; const cur = p ? effAt(p, slot, minute, en?.[p.id]) : 0;
    let best = null, bv = cur + 2.5;
    for (const q of pool) { if (used.has(q.id)) continue; const v = effAt(q, slot, minute, en?.[q.id]); if (v > bv) { bv = v; best = q; } }
    if (best && (!p || !available(p) || p.fit < 72 || (en && en[p.id] < 62) || bv - cur > 4)) { out.push({ i, out: p, in: best, why: !p || !available(p) ? 'indisponível' : (en ? en[p.id] : p.fit) < 72 ? 'cansado' : 'rende mais' }); used.add(best.id); }
  }
  return out.slice(0, 5);
}
H.tsug = () => {
  const { G, c, youth, tact } = mySide(); const lu = myLineup(); const sg = suggestions(G, c, lu, tact, youth);
  S.tsug = sg; S.tsugOpen = true; render();
};
H.tsugapply = () => {
  const lu = myLineup(); for (const s of S.tsug || []) { const o = lu.xi[s.i]; lu.xi[s.i] = s.in.id; const bi = lu.bench.indexOf(s.in.id); if (bi >= 0) lu.bench[bi] = o; }
  S.tsugOpen = false; S.tsug = null; toast('🔄 Trocas aplicadas'); render(); save();
};
H.tsugclose = () => { S.tsugOpen = false; render(); };

// ---------- tela ----------
VIEWS.tat = () => {
  const G = S.G; const { c, youth, tact } = mySide();
  if (!c) return `<div class="empty">Você não está treinando nenhum clube.</div>`;
  ensureNums(G, c);
  S.pitchInv = unproj;
  const lu = myLineup(); const form = formOf(tact); const tab = S.sub.tat || 'res';
  const forms = Object.keys(FORMATIONS).concat(tact.custom ? ['Personalizada'] : []);
  const R = ratings(G, c, lu.xi, 0, tact);
  const head = `<div class="gt-head"><div class="gt-tabs">${[['res', 'Elenco'], ['tat', 'Táticas'], ['atr', 'Atribuições'], ['treino', 'Treino']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-a="sub" data-v="tat:${k}">${l}</button>`).join('')}</div>
    <div class="gt-rat"><span>ATA <b>${Math.round(R.att)}</b></span><span>MEI <b>${Math.round(R.ctl)}</b></span><span>DEF <b>${Math.round(R.def)}</b></span></div></div>`;
  if (tab === 'tat') return head + styleView(G, c, tact, R);
  if (tab === 'atr') return head + attribView(G, c, lu, tact);
  if (tab === 'treino') return head + `<div class="gt-pad">${VIEWS._train ? VIEWS._train(G, c, youth) : ''}</div>`;
  const pool = G.players.filter((p) => p && p.club === c.id && (youth ? p.u20 && !p.u17 : !p.u20) && !lu.xi.includes(p.id));
  const bench = lu.bench.map((id) => G.players[id]).filter((p) => p && pool.includes(p));
  const out = pool.filter((p) => !lu.bench.includes(p.id)).sort((a, b) => b.ovr - a.ovr);
  const card = (p, n) => `<div class="bcard gt-b ${!available(p) ? 'off' : ''} ${S.swapIn != null ? 'swapt' : ''} ${S.infoP === p.id ? 'sel' : ''}" data-a="benchtap" data-v="${p.id}"><span class="bx" data-a="unbench" data-v="${p.id}" title="Tirar do banco">✕</span><span class="grip" data-dragp="${p.id}">⠿</span>
    <div class="gt-bt"><span class="pos ${POS_LINE[p.pos]}">${p.pos}</span><b style="color:${ovrC(p.ovr)}">${p.ovr}</b></div><div class="gt-bn ell">${esc(shortName(p.n))}</div><div class="bfit"><i style="width:${Math.round(p.fit)}%;background:${p.fit < 65 ? '#ff9f43' : '#2fe08a'}"></i></div><span class="bnum">${n}</span></div>`;
  const selP = S.sel ? G.players[lu.xi[S.sel.i]] : S.infoP != null ? G.players[S.infoP] : null;
  const hint = S.swapIn != null ? `👉 Toque no reserva que vai sair do banco para ${esc(shortName(G.players[S.swapIn].n))} entrar.` : S.sel ? '👉 Toque num reserva para colocar no lugar, ou arraste o titular.' : '';
  const sug = S.tsugOpen ? `<div class="gt-sug"><div class="row"><b class="grow">💡 Substituições sugeridas</b><button class="btn sm" data-a="tsugclose">✕</button></div>${(S.tsug || []).length ? S.tsug.map((s) => `<div class="gt-sw"><span class="out">${esc(s.out ? shortName(s.out.n) : '—')}</span><i>⇄</i><span class="in">${esc(shortName(s.in.n))}</span><em>${s.why}</em></div>`).join('') + `<button class="btn pri sm blk" data-a="tsugapply">Aplicar ${S.tsug.length} troca(s)</button>` : '<p class="xs mut">Seu time já está no melhor que dá com o banco atual. 👌</p>'}</div>` : '';
  return head + `<div class="gt-wrap">
    <div class="gt-l"><div class="gt-tools"><select data-ch="form" data-title="Formação">${forms.map((f) => `<option value="${f}" ${tact.form === f ? 'selected' : ''}>${f}</option>`).join('')}</select><button class="btn sm" data-a="autolu">⚡ Automático</button><button class="btn sm" data-a="tsug">💡 Sugestões</button><button class="btn sm pri" data-a="savetac">💾 Salvar</button>${tact.form === 'Personalizada' ? '<button class="btn sm" data-a="resetform">↺</button>' : ''}</div>
      ${pitchHtml(G, c, lu, tact)}${hint ? `<div class="hint pulse gt-hint">${hint}</div>` : ''}
      <div class="gt-res"><div class="gt-rh"><b>Reservas</b><span class="pill">${bench.length}/9</span><span class="grow"></span><button class="btn sm ${S.showOut ? 'pri' : ''}" data-a="tout">Fora da lista (${out.length})</button></div>
      <div class="gt-bg">${bench.map((p, i) => card(p, 12 + i)).join('')}${Array.from({ length: Math.max(0, 9 - bench.length) }, (_, i) => `<div class="bcard gt-b empty"><span class="xs mut">vago</span><span class="bnum">${12 + bench.length + i}</span></div>`).join('')}</div>
      ${S.showOut ? `<div class="gt-out">${out.map((p) => `<div class="gt-o ${S.swapIn === p.id ? 'swapsel' : ''}" data-a="pickp" data-v="${p.id}"><span class="grip" data-dragp="${p.id}">⠿</span><span class="pos ${POS_LINE[p.pos]}">${p.pos}</span><b class="grow ell">${esc(shortName(p.n))}</b>${!available(p) ? `<span class="xs bad">${p.inj > 0 ? '🩹' : '🟥'}</span>` : ''}<b style="color:${ovrC(p.ovr)}">${p.ovr}</b><button class="btn sm ${S.swapIn === p.id ? 'pri' : ''}" data-a="tobench" data-v="${p.id}">${S.swapIn === p.id ? '✕' : '⇄ banco'}</button></div>`).join('') || '<span class="xs mut">Todo mundo está relacionado.</span>'}</div>` : ''}</div></div>
    <div class="gt-r">${sug}${infoPanel(G, c, selP, S.sel ? form[S.sel.i][0] : null)}</div></div>`;
};
H.tout = () => { S.showOut = !S.showOut; render(); };
{ const old = H.benchtap; H.benchtap = (v) => { if (S.swapIn == null && !S.sel) { S.infoP = +v; render(); return; } old(v); }; }

// ---------- Táticas: estilo mexível ----------
const T3 = (t, k) => t[k] ?? (INSTR[k]?.o.length === 3 ? 1 : 0);
function previewDots(tact) {
  const form = formOf(tact); const m = tact.ment ?? 1, pr = tact.press ?? 1, ln = T3(tact, 'linha'), lg = T3(tact, 'larg');
  const shift = (m - 1) * 0.07 + (ln - 1) * 0.05; const comp = 1 - (pr - 1) * 0.12; const wide = 1 + (lg - 1) * 0.14;
  return form.map(([pos, w, d]) => { const dd = pos === 'GOL' ? d : clamp(0.5 + (d - 0.5) * comp + shift, 0.08, 0.95); const ww = pos === 'GOL' ? w : clamp(0.5 + (w - 0.5) * wide, 0.04, 0.96); const q = proj(ww, dd); return { q, pos }; });
}
function styleView(G, c, tact, R) {
  const dots = previewDots(tact);
  const knob = (k, label, opts, val, ic) => `<div class="mx-row"><div class="mx-h"><span>${ic} ${label}</span><b id="mxv-${k}">${opts[val]}</b></div><div class="mx-track" style="--n:${opts.length}"><input type="range" min="0" max="${opts.length - 1}" step="1" value="${val}" data-in="tslide" data-k="${k}">${opts.map((o, i) => `<span class="${i === val ? 'on' : ''}" style="left:${opts.length > 1 ? i / (opts.length - 1) * 100 : 0}%"></span>`).join('')}</div><div class="mx-l">${opts.map((o) => `<small>${o}</small>`).join('')}</div></div>`;
  const tog = (k, d) => `<button class="mx-tog ${T3(tact, k) ? 'on' : ''}" data-a="ttog" data-v="${k}"><i></i><span>${d.n}<small>${d.o[T3(tact, k)]}</small></span></button>`;
  const ring = (l, v, k) => `<div class="mx-ring" style="--v:${clamp((v - 40) * 2, 0, 100)}"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16"/><circle class="f" cx="20" cy="20" r="16" pathLength="100"/></svg><b id="mxr-${k}">${Math.round(v)}</b><small>${l}</small></div>`;
  const three = Object.entries(INSTR).filter(([, d]) => d.o.length === 3); const two = Object.entries(INSTR).filter(([, d]) => d.o.length === 2);
  return `<div class="mx-wrap"><div class="mx-l-col"><div class="pitch p3 mini" id="mxpitch"><svg class="p3-field" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="${[proj(0, 1), proj(1, 1), proj(1, 0), proj(0, 0)].map((q) => `${q.x},${q.y}`).join(' ')}" fill="#1f6a41" stroke="#ffffff66" stroke-width=".5"/><line x1="${proj(0, 0.5).x}" y1="${proj(0, 0.5).y}" x2="${proj(1, 0.5).x}" y2="${proj(1, 0.5).y}" stroke="#ffffff55" stroke-width=".5"/></svg>
      <div class="mx-band" id="mxband"></div>${dots.map((d, i) => `<i class="mx-dot ${LINE[d.pos]}" id="mxd${i}" style="left:${d.q.x}%;top:${d.q.y}%"></i>`).join('')}</div>
      <div class="mx-rings">${ring('Ataque', R.att, 'att')}${ring('Meio', R.ctl, 'ctl')}${ring('Defesa', R.def, 'def')}</div>
      <p class="xs mut" id="mxtip">${tipOf(tact)}</p></div>
    <div class="mx-r-col">${knob('ment', 'Mentalidade', MENT, tact.ment ?? 1, '🧠')}${knob('press', 'Pressão', PRESS, tact.press ?? 1, '🔥')}${three.map(([k, d]) => knob(k, d.n, d.o, T3(tact, k), { tempo: '⏱️', larg: '↔️', linha: '📏', passe: '🎯', foco: '🧭', perda: '⚡', liber: '🎨' }[k] || '•')).join('')}
      <div class="mx-togs">${two.map(([k, d]) => tog(k, d)).join('')}</div>
      <div class="card flat" style="margin-top:8px"><h3>Táticas salvas</h3>${[0, 1, 2].map((i) => { const P = (c.presets ||= [])[i]; return `<div class="li"><span class="grow"><b>${P ? esc(P.n) : `Espaço ${i + 1}`}</b>${P ? ` <span class="xs mut">${P.t.form} · ${MENT[P.t.ment]}</span>` : ''}</span>${P ? `<button class="btn sm" data-a="preload" data-v="${i}">Carregar</button>` : ''}<button class="btn sm" data-a="presave" data-v="${i}">Salvar aqui</button></div>`; }).join('')}</div></div></div>`;
}
function tipOf(t) {
  const m = t.ment ?? 1, p = t.press ?? 1;
  return m === 2 && p === 2 ? '🔥 Time todo pra frente, sufocando a saída de bola. Cria muito, cansa muito e deixa espaço atrás.' : m === 0 && p === 0 ? '🛡️ Bloco baixo e fechado. Difícil de furar, mas cria pouco: aposte no contra-ataque.' : m === 2 ? '⚔️ Mais gente chegando na área. Atenção aos contra-ataques.' : m === 0 ? '🧱 Prioridade é não sofrer gols: laterais seguram e o time recua.' : p === 2 ? '⚡ Pressão alta: rouba bola no campo deles, mas o fôlego acaba antes.' : '⚖️ Equilíbrio entre atacar e defender.';
}
function refreshStyle() {
  const { G, c, tact } = mySide(); const lu = myLineup(); const R = ratings(G, c, lu.xi, 0, tact);
  previewDots(tact).forEach((d, i) => { const e = document.getElementById('mxd' + i); if (e) { e.style.left = d.q.x + '%'; e.style.top = d.q.y + '%'; } });
  for (const k of ['att', 'ctl', 'def']) { const e = document.getElementById('mxr-' + k); if (e) { e.textContent = Math.round(R[k]); e.parentElement.style.setProperty('--v', clamp((R[k] - 40) * 2, 0, 100)); } }
  const tip = document.getElementById('mxtip'); if (tip) tip.textContent = tipOf(tact);
  const band = document.getElementById('mxband'); if (band) { const ln = T3(tact, 'linha'), m = tact.ment ?? 1; const y = proj(0.5, clamp(0.28 + (ln - 1) * 0.08 + (m - 1) * 0.06, 0.1, 0.6)).y; band.style.top = y + '%'; }
  document.querySelectorAll('.gt-rat b').forEach((b, i) => { b.textContent = Math.round([R.att, R.ctl, R.def][i]); });
}
let svT = null;
H.tslide = (v, el) => {
  const k = el.dataset.k; const { tact } = mySide(); tact[k] = +v;
  const opts = k === 'ment' ? MENT : k === 'press' ? PRESS : INSTR[k].o; const lab = document.getElementById('mxv-' + k); if (lab) { lab.textContent = opts[+v]; lab.classList.remove('pop'); void lab.offsetWidth; lab.classList.add('pop'); }
  el.parentElement.querySelectorAll('span').forEach((s, i) => s.classList.toggle('on', i === +v));
  try { window.PSFX?.('tick'); } catch {}
  refreshStyle(); clearTimeout(svT); svT = setTimeout(() => save(), 400);
};
H.ttog = (k) => { const { tact } = mySide(); tact[k] = T3(tact, k) ? 0 : 1; render(); save(); };
const _ar = S.afterRender; S.afterRender = () => { try { _ar?.(); } catch {} if (document.getElementById('mxpitch')) refreshStyle(); };

// ---------- Atribuições: cobradores (e jogadas ensaiadas, via módulo de bola parada) ----------
function attribView(G, c, lu, tact) {
  const xi = lu.xi.map((id) => G.players[id]).filter(Boolean); const tk = (tact.takers ||= {});
  const pickSel = (k, label, ic, sc) => { const best = xi.slice().sort((a, b) => sc(b) - sc(a))[0]; const cur = tk[k] != null && xi.some((p) => p.id === tk[k]) ? tk[k] : best?.id;
    return `<div class="at-card"><div class="at-ic">${ic}</div><div class="grow"><small>${label}</small><select data-ch="ttaker" data-k="${k}" data-title="${label}">${xi.sort((a, b) => sc(b) - sc(a)).map((p) => `<option value="${p.id}" data-pos="${p.pos}" data-ovr="${Math.round(sc(p))}" data-n="${esc(p.n)}" data-sub="geral ${p.ovr}" ${p.id === cur ? 'selected' : ''}>${esc(p.n)}</option>`).join('')}</select></div></div>`; };
  const A = (p, i) => attrs(p)[i]?.[1] || p.ovr;
  return `<div class="gt-pad"><div class="at-grid">
    <div class="at-card"><div class="at-ic">🧢</div><div class="grow"><small>Capitão</small><select data-ch="tcapsel" data-title="Capitão">${xi.map((p) => `<option value="${p.id}" data-pos="${p.pos}" data-ovr="${p.ovr}" data-n="${esc(p.n)}" data-sub="${p.age} anos" ${c.capId === p.id ? 'selected' : ''}>${esc(p.n)}</option>`).join('')}</select></div></div>
    ${pickSel('pen', 'Pênaltis', '🎯', (p) => (p.pos === 'GOL' ? 0 : A(p, 1) * 0.7 + p.ovr * 0.3))}
    ${pickSel('fk', 'Faltas', '🌀', (p) => (p.pos === 'GOL' ? 0 : A(p, 2) * 0.6 + A(p, 1) * 0.4))}
    ${pickSel('ck', 'Escanteios', '🚩', (p) => (p.pos === 'GOL' ? 0 : A(p, 2) * 0.8 + A(p, 3) * 0.2))}
  </div>${VIEWS._setPieces ? VIEWS._setPieces(G, c, tact) : ''}</div>`;
}
// ---------- jogadas ensaiadas ----------
const SPD = { // desenho simples da jogada (campo de ataque 100x60: gol em cima)
  ck: { primeiro: 'M96 4 Q70 10 42 12', segundo: 'M96 4 Q60 -4 22 14', curto: 'M96 4 L84 10 Q60 22 40 14', marca: 'M96 4 Q72 22 50 26' },
  fk: { direto: 'M50 40 Q46 18 40 4', cruz: 'M30 38 Q44 14 54 12', rolada: 'M50 40 L62 38 Q58 24 54 6' },
};
VIEWS._setPieces = (G, c, tact) => {
  const pl = (tact.plays ||= {}); const card = (k, id, d) => { const on = (pl[k] || (k === 'ck' ? 'primeiro' : 'cruz')) === id;
    return `<button class="sp-card${on ? ' on' : ''}" data-a="tplay" data-v="${k}:${id}"><svg class="sp-svg" viewBox="0 0 100 44"><rect x="1" y="1" width="98" height="42" rx="3" class="sp-f"/><rect x="30" y="1" width="40" height="16" class="sp-l"/><rect x="42" y="1" width="16" height="6" class="sp-l"/><circle cx="50" cy="13" r=".9" class="sp-d"/><path d="${SPD[k][id]}" class="sp-p"/>${k === 'ck' ? '<circle cx="96" cy="4" r="2" class="sp-b"/>' : `<circle cx="${id === 'cruz' ? 30 : 50}" cy="${id === 'cruz' ? 38 : 40}" r="2" class="sp-b"/>`}</svg><b>${d[0]} ${d[1]}</b><small>${d[2]}</small></button>`; };
  const tr = tact.spTrain || 0;
  return `<div class="sp-wrap"><h3 class="sp-h">🚩 Jogadas ensaiadas · Escanteio</h3><div class="sp-grid">${Object.entries(PLAYS.ck).map(([id, d]) => card('ck', id, d)).join('')}</div>
  <h3 class="sp-h">🌀 Jogadas ensaiadas · Falta</h3><div class="sp-grid">${Object.entries(PLAYS.fk).map(([id, d]) => card('fk', id, d)).join('')}</div>
  <div class="sp-train"><div class="grow"><b class="sm">Ensaio no treino</b><div class="xs mut">Mais ensaio = jogada mais afiada (nível ${tr}/3). Cada adversário defende melhor umas jogadas que outras — o auxiliar técnico te avisa antes do jogo.</div></div><button class="btn sm" data-a="tsptrain">${tr >= 3 ? '✓ Máx.' : '+ Ensaiar'}</button></div></div>`;
};
H.tplay = (v) => { const [k, id] = v.split(':'); const { tact } = mySide(); (tact.plays ||= {})[k] = id; try { window.PSFX?.('tick'); } catch {} save(); render(); };
H.tsptrain = () => { const { tact } = mySide(); if ((tact.spTrain || 0) >= 3) return; tact.spTrain = (tact.spTrain || 0) + 1; try { window.PSFX?.('ok'); } catch {} save(); render(); };
H.ttaker = (v, el) => { const { tact } = mySide(); (tact.takers ||= {})[el.dataset.k] = +v; save(); toast('Cobrador definido'); };
H.tcapsel = (v) => { H.tcap(v); };
