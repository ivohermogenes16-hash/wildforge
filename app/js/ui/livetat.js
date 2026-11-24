// Prancheta ao vivo: pausa o jogo e abre o campo com o time em campo, banco, formação, estilo,
// trocas arrastando e setas desenhadas que mudam o jeito do time jogar (3D/2D e simulação).
import { S, H, save, shortName, posTag } from './app.js';
import { esc, clamp, POS_LINE } from '../util.js';
import { textOn } from './art.js';
import { FORMATIONS, MENT, PRESS, formOf, available } from '../engine/match.js';
import { proj, unproj, pinfo, ensureNums } from './tatica.js';

let B = null; // { L, sel, draw, onClose }
const ovrC = (o) => (o >= 80 ? '#2fe08a' : o >= 72 ? '#9be15d' : o >= 64 ? '#f4c542' : o >= 56 ? '#ff9f43' : '#ff6b6b');
const SHOUT = { frente: ['⚔️ Vai pra cima!', { ment: 2 }], segura: ['🧱 Segura o resultado', { ment: 0, press: 0 }], pressao: ['🔥 Pressiona a saída', { press: 2 }], calma: ['🧘 Calma, toca a bola', { press: 1, tempo: 0 }] };

export function openLiveBoard(L, ctx) {
  B = { L, sel: null, draw: false, ctx }; L.viz.paused = true; ctx.updPause?.();
  let el = document.getElementById('lboard'); if (!el) { el = document.createElement('div'); el.id = 'lboard'; el.className = 'lb-wrap'; document.body.appendChild(el); }
  paint();
}
function paint() {
  const el = document.getElementById('lboard'); if (!el || !B) return;
  const G = S.G, L = B.L, m = L.m, s = L.side, sd = m.s[s]; const t = sd.tact; const form = formOf(t); const c = sd.club; ensureNums(G, c);
  const kit = c.c1 || '#2fe08a'; const en = m.en;
  const arrows = t.arrows || {};
  const toks = form.map(([pos, w, d], i) => {
    const id = sd.xi[i]; const p = G.players[id]; const q = proj(w, d); const off = m.sent[s].has(id); const e = Math.round(en[id] ?? p?.fit ?? 100);
    const inj = m.ev.some((x) => x.t === 'les' && x.p === id);
    return `<div class="pslot p3t ${B.sel === i ? 'sel' : ''} ${off ? 'gone' : ''}" style="left:${q.x}%;top:${q.y}%;--s:${q.s}" data-a="lbtok" data-v="${i}" data-slot="${i}">
      <div class="p3-top">${inj ? '<em class="dn">🩹</em>' : ''}${m.cards?.[id] ? '<em class="yc">▮</em>' : ''}</div>
      <div class="dot p3-d ${p && p.pos !== pos ? 'off' : ''}" style="--k:${pos === 'GOL' ? '#f4c542' : kit};--t:${pos === 'GOL' ? '#111' : textOn(kit)}"><b>${p ? p.num || p.ovr : ''}</b></div>
      <div class="p3-nm">${p ? esc(shortName(p.n)) : pos}</div><div class="p3-bar"><i style="width:${e}%;background:${e < 55 ? '#ff6b6b' : e < 72 ? '#f4c542' : '#2fe08a'}"></i></div></div>`;
  }).join('');
  const field = `<svg class="p3-field" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="${[proj(0, 1), proj(1, 1), proj(1, 0), proj(0, 0)].map((q) => `${q.x},${q.y}`).join(' ')}" fill="#1f6a41" stroke="#ffffff77" stroke-width=".45"/><line x1="${proj(0, 0.5).x}" y1="${proj(0, 0.5).y}" x2="${proj(1, 0.5).x}" y2="${proj(1, 0.5).y}" stroke="#ffffff66" stroke-width=".45"/><ellipse cx="50" cy="${proj(0.5, 0.5).y}" rx="9.5" ry="5.5" fill="none" stroke="#ffffff55" stroke-width=".45"/>
    <defs><marker id="lbar" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#ffd34d"/></marker></defs>
    ${Object.entries(arrows).map(([i, [dw, dd]]) => { const f = form[+i]; if (!f) return ''; const a = proj(f[1], f[2]), b = proj(clamp(f[1] + dw, 0.02, 0.98), clamp(f[2] + dd, 0.02, 0.98)); return `<line class="p3-arrow" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#ffd34d" stroke-width=".9" stroke-dasharray="2 1.2" marker-end="url(#lbar)"/>`; }).join('')}<line id="lbghost" stroke="#ffd34d" stroke-width=".9" stroke-dasharray="2 1.2" marker-end="url(#lbar)" x1="0" y1="0" x2="0" y2="0" style="display:none"/></svg>`;
  const used = m.played[s];
  const bench = sd.bench.map((id) => G.players[id]).filter((p) => p && !used.has(p.id));
  const sg = m.suggestSubs(s, 3);
  const forms = Object.keys(FORMATIONS);
  const selP = B.sel != null ? G.players[sd.xi[B.sel]] : null;
  el.innerHTML = `<div class="lb">
    <div class="lb-top"><span class="lb-min">${m.min}'</span><b class="lb-sc">${esc(m.s[0].club.short || m.s[0].club.name)} ${m.score[0]} – ${m.score[1]} ${esc(m.s[1].club.short || m.s[1].club.name)}</b><span class="pill">Trocas ${m.subs[s]}/5</span><span class="grow"></span>
      <button class="btn sm ${B.draw ? 'pri' : ''}" data-a="lbdraw">✏️ ${B.draw ? 'Desenhando…' : 'Desenhar setas'}</button>${Object.keys(arrows).length ? '<button class="btn sm" data-a="lbclr">🧽 Limpar</button>' : ''}<button class="btn pri" data-a="lbclose">▶ Voltar ao jogo</button></div>
    <div class="lb-main"><div class="lb-l"><div class="pitch p3 ${B.draw ? 'drawing' : ''}" id="lbpitch">${field}${toks}</div>
      <div class="lb-hint">${B.draw ? '✏️ Arraste de um jogador até onde ele deve ir. Ele passa a jogar nessa direção.' : B.sel != null ? `👉 ${esc(shortName(selP?.n || ''))} selecionado: toque num reserva para trocar, ou em outro jogador do campo para inverter as posições.` : '✋ Toque num jogador para trocar · arraste um reserva até o campo · ou desenhe setas.'}</div>
      <div class="lb-bench">${bench.map((p) => `<div class="lb-b ${!available(p) ? 'off' : ''}" data-a="lbin" data-v="${p.id}" data-lbp="${p.id}"><span class="pos ${POS_LINE[p.pos]}">${p.pos}</span><b style="color:${ovrC(p.ovr)}">${p.ovr}</b><span class="ell">${esc(shortName(p.n))}</span><div class="bfit"><i style="width:${Math.round(p.fit)}%"></i></div></div>`).join('') || '<span class="xs mut">Sem reservas disponíveis.</span>'}</div></div>
    <div class="lb-r">
      <div class="lb-card"><small>Formação</small><select data-ch="lbform" data-title="Formação">${forms.map((f) => `<option ${t.form === f ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
      <div class="lb-card"><small>Mentalidade</small><div class="seg" style="margin:0">${MENT.map((x, i) => `<button class="${t.ment === i ? 'on' : ''}" data-a="lbset" data-v="ment:${i}">${x}</button>`).join('')}</div><small style="margin-top:6px">Pressão</small><div class="seg" style="margin:0">${PRESS.map((x, i) => `<button class="${t.press === i ? 'on' : ''}" data-a="lbset" data-v="press:${i}">${x}</button>`).join('')}</div></div>
      <div class="lb-card"><small>Instruções rápidas</small><div class="lb-sh">${Object.entries(SHOUT).map(([k, [l]]) => `<button class="btn sm" data-a="lbshout" data-v="${k}">${l}</button>`).join('')}</div></div>
      <div class="lb-card"><small>💡 Trocas sugeridas</small>${sg.length ? sg.map((x, k) => `<div class="lb-sg"><span class="o">⬇ ${esc(shortName(G.players[x.out]?.n || ''))}</span><span class="i">⬆ ${esc(shortName(G.players[x.in]?.n || ''))}</span><em>${x.why}</em></div>`).join('') + `<button class="btn sm pri blk" data-a="lbsug">Fazer ${sg.length > 1 ? 'todas' : 'a troca'}</button>` : '<div class="xs mut">Nada urgente agora 👍</div>'}</div>
    </div></div></div>`;
  bindDraw();
}
function feed() { const L = B.L; try { B.ctx.addFeed?.(L.m.ev[L.m.ev.length - 1]); } catch {} }
H.lbtok = (v) => {
  if (!B || B.draw) return; const i = +v; const L = B.L, sd = L.m.s[L.side];
  if (B.sel == null) { B.sel = i; paint(); return; }
  if (B.sel === i) { B.sel = null; paint(); return; }
  [sd.xi[B.sel], sd.xi[i]] = [sd.xi[i], sd.xi[B.sel]]; B.sel = null; B.ctx.notice?.('🔀 Posições trocadas'); paint();
};
H.lbin = (v) => {
  if (!B) return; const L = B.L; if (B.sel == null) { B.ctx.notice?.('Toque primeiro em quem sai do campo'); return; }
  const outId = L.m.s[L.side].xi[B.sel]; const ok = L.m.sub(L.side, outId, +v);
  if (ok) { feed(); B.ctx.notice?.(`🔄 ${shortName(S.G.players[+v].n)} entra`); } else B.ctx.notice?.(L.m.subs[L.side] >= 5 ? 'Limite de 5 trocas' : 'Troca não permitida');
  B.sel = null; paint();
};
H.lbsug = () => { const L = B.L; const sg = L.m.suggestSubs(L.side, 3); let n = 0; for (const x of sg) if (L.m.sub(L.side, x.out, x.in)) { feed(); n++; } B.ctx.notice?.(`🔄 ${n} troca(s) feita(s)`); paint(); };
H.lbform = (v) => { const t = B.L.m.s[B.L.side].tact; t.form = v; delete t.arrows; paint(); };
H.lbset = (v) => { const [k, n] = v.split(':'); B.L.m.s[B.L.side].tact[k] = +n; paint(); };
H.lbshout = (k) => { Object.assign(B.L.m.s[B.L.side].tact, SHOUT[k][1]); B.ctx.notice?.(SHOUT[k][0]); paint(); };
H.lbdraw = () => { B.draw = !B.draw; B.sel = null; paint(); };
H.lbclr = () => { delete B.L.m.s[B.L.side].tact.arrows; paint(); };
H.lbclose = () => {
  const L = B?.L; const el = document.getElementById('lboard'); if (el) { el.classList.add('out'); setTimeout(() => el.remove(), 220); }
  if (L) { L.viz.paused = false; B.ctx.updPause?.(); try { L.viz.setTact?.(L.side, L.m.s[L.side].tact, L.m.s[L.side].xi); } catch {} }
  B = null; save();
};
function bindDraw() {
  const pitch = document.getElementById('lbpitch'); if (!pitch) return;
  let st = null;
  const pt = (e) => { const r = pitch.getBoundingClientRect(); return { X: (e.clientX - r.left) / r.width * 100, Y: (e.clientY - r.top) / r.height * 100 }; };
  pitch.onpointerdown = (e) => {
    if (!B?.draw) return; const tk = e.target.closest('[data-slot]'); if (!tk) return; e.preventDefault();
    st = { i: +tk.dataset.slot }; const g = document.getElementById('lbghost'); const f = formOf(B.L.m.s[B.L.side].tact)[st.i]; const a = proj(f[1], f[2]);
    g.setAttribute('x1', a.x); g.setAttribute('y1', a.y); g.setAttribute('x2', a.x); g.setAttribute('y2', a.y); g.style.display = '';
  };
  pitch.onpointermove = (e) => { if (!st) return; const { X, Y } = pt(e); const g = document.getElementById('lbghost'); g.setAttribute('x2', X); g.setAttribute('y2', Y); };
  pitch.onpointerup = (e) => {
    if (!st) return; const { X, Y } = pt(e); const t = B.L.m.s[B.L.side].tact; const f = formOf(t)[st.i]; const u = unproj(X, Y);
    const dw = clamp(u.width - f[1], -0.35, 0.35), dd = clamp(u.depth - f[2], -0.35, 0.35);
    if (Math.hypot(dw, dd) > 0.04 && f[0] !== 'GOL') { (t.arrows ||= {})[st.i] = [+dw.toFixed(3), +dd.toFixed(3)]; B.ctx.notice?.(dd > 0.04 ? '⬆️ Jogador vai subir mais' : dd < -0.04 ? '⬇️ Jogador vai recuar' : '↔️ Jogador vai abrir pelo lado'); }
    st = null; paint();
  };
}
// arrastar reserva para o campo
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('[data-lbp]'); if (!b || !B || B.draw) return;
  const id = +b.dataset.lbp; let moved = false; const g = b.cloneNode(true); g.className += ' lb-ghost'; const sx = e.clientX, sy = e.clientY;
  const mv = (ev) => { if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return; if (!moved) { moved = true; document.body.appendChild(g); } g.style.left = ev.clientX + 'px'; g.style.top = ev.clientY + 'px'; };
  const up = (ev) => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); if (!moved) return; g.remove(); const t = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('#lboard [data-slot]'); if (t && B) { B.sel = +t.dataset.slot; H.lbin(String(id)); } };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
});
