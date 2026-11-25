// Partida em 3D: o motor (LiveMatch) decide tudo; a cena 3D (m3d/index.html, num iframe) encena cada lance.
import { SET } from '../settings.js';
import { formOf } from '../engine/match.js';

const SHOT = ['gol', 'def', 'trave', 'fora'];
const NUM = { GOL: 1, LD: 2, ZAG: 4, LE: 6, VOL: 5, MC: 8, MEI: 10, PD: 7, PE: 11, ATA: 9, ALD: 2, ALE: 6, SA: 10 };
function hexRgb(h) { const n = parseInt((h || '#888888').slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function cdist(a, b) { const A = hexRgb(a), B = hexRgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); }
const short = (n) => { const s = (n || '').split(' '); return s.length > 1 && n.length > 12 ? s[s.length - 1] : n; };

export class Match3D {
  constructor(host, G, m, userSide, hooks, opt = {}) {
    this.G = G; this.m = m; this.us = userSide; this.h = hooks; this.opt = opt;
    this._speed = 2; this._paused = false; this.score = [0, 0]; this.done = false; this._replays = true; this._names = true;
    this.acc = 0; this.wait = null; this.ready = false; this.sid = 0; this.waitT = 0;
    const fr = document.createElement('iframe'); fr.className = 'm3d'; fr.title = 'Partida em 3D';
    fr.src = `m3d/index.html?embed=1&q=${SET.q3d ?? 1}`; host.appendChild(fr); this.fr = fr;
    this.onMsg = (e) => { if (e.source === fr.contentWindow) this.msg(e.data || {}); };
    window.addEventListener('message', this.onMsg);
    this.loadT = setTimeout(() => { if (!this.ready) this.h.onFail?.(); }, 20000);
  }
  walkBtn() { if (this.sk) return; const b = document.createElement('button'); b.className = 'btn m3d-skip'; b.textContent = 'Pular entrada ›'; b.onclick = () => { this.post({ t: 'skipWalk' }); b.remove(); }; this.fr.parentElement.appendChild(b); this.sk = b; }
  post(o) { try { this.fr.contentWindow?.postMessage(o, '*'); } catch {} }
  get paused() { return this._paused; } set paused(v) { this._paused = v; this.post({ t: 'pause', v }); }
  get speed() { return this._speed; } set speed(v) { this._speed = v; this.post({ t: 'speed', n: this.ts() }); }
  get replays() { return this._replays; } set replays(v) { this._replays = v; this.post({ t: 'replays', v }); }
  get names() { return this._names; } set names(v) { this._names = v; this.post({ t: 'names', v }); }
  ts() { return this._speed >= 8 ? 3 : this._speed >= 4 ? 2 : 1; }
  kits() {
    const hc = this.m.s[0].club, ac = this.m.s[1].club; let a1 = ac.c1, a2 = ac.c2;
    if (cdist(hc.c1, ac.c1) < 110) { a1 = cdist(hc.c1, ac.c2) > 110 ? ac.c2 : (cdist(hc.c1, '#ffffff') > 150 ? '#ffffff' : '#111111'); a2 = ac.c1; }
    return [{ f: hc.c1, s: hc.c2 === hc.c1 ? '#ffffff' : hc.c2, gk: '#f2c500', gks: '#151515' }, { f: a1, s: a2 === a1 ? '#000000' : a2, gk: '#25c4d8', gks: '#0b3a40' }];
  }
  team(s) {
    const sd = this.m.s[s], form = formOf(sd.tact), used = new Set();
    return sd.xi.map((id, i) => { const p = this.G.players[id]; const [pos, fx, fy] = form[i] || ['MC', 0.5, 0.5]; let n = NUM[pos] || 8; while (used.has(n)) n += n < 12 ? 11 : 1; used.add(n);
      return { id: id ?? i, name: short(p?.n || '—'), num: n, pos, fx, fy: pos === 'GOL' ? 0 : fy }; });
  }
  tactOf(i) { const t = this.m.s[i].tact || {}; return { ment: t.ment ?? 1, press: t.press ?? 1, linha: t.linha ?? 1, larg: t.larg ?? 1, arrows: t.arrows || {} }; }
  setTact(side) { this.post({ t: 'tact', side, tact: this.tactOf(side) }); this.post({ t: 'lineup', side, team: this.team(side) }); }
  msg(d) {
    switch (d.t) {
      case 'loaded': {
        const hc = this.m.s[0].club; const f = this.m.f; const night = (f && f.s === 1) || Math.random() < 0.35;
        this.post({ t: 'setup', home: { name: hc.name, c1: hc.c1, c2: hc.c2 }, stadium: hc.stadium || `Estádio ${hc.city || hc.name}`, kits: this.kits(), teams: [this.team(0), this.team(1)],
          time: this.opt.time || (night ? 'noite' : Math.random() < 0.5 ? 'dia' : 'tarde'), rain: !!this.opt.rain, replays: this._replays, names: this._names, ts: this.ts(), tact: [this.tactOf(0), this.tactOf(1)], final: !!this.opt.final });
        break; }
      case 'walk': clearTimeout(this.loadT); this.walkBtn(); break;
      case 'ready': this.ready = true; clearTimeout(this.loadT); this.sk?.remove(); this.sk = null; this.h.onReady?.(); break;
      case 'shotDone': if (this.wait && this.wait.id === d.id) this.resolve(); break;
      case 'resume': if (this.wait && this.wait.resolved) this.wait = null; break;
    }
  }
  resolve() {
    const w = this.wait; if (!w || w.resolved) return; w.resolved = true; const e = w.ev;
    if (e.t === 'gol') this.score[e.side]++; this.post({ t: 'score', s: this.score });
    this.h.onEvent(e);
    if (e.t !== 'gol') this.wait = null; else this.waitT = 0;
  }
  update(dt) {
    if (!this.ready || this.done || this._paused) return;
    if (this.wait) { this.waitT += dt; if (this.waitT > (this.wait.resolved ? 30 : 28)) { if (!this.wait.resolved) this.resolve(); this.wait = null; } return; }
    this.acc += dt; if (this.acc < 2.6 / this.ts()) return; this.acc = 0; this.plan();
  }
  slotOf(side, id) { return this.m.s[side].xi.indexOf(id); }
  plan() {
    if (this.m.done) { this.finish(); return; }
    const evs = this.m.step();
    for (const e of evs) {
      if (SHOT.includes(e.t) && !this.wait) { let slot = this.slotOf(e.side, e.p); if (slot < 0) slot = 9; this.wait = { ev: e, id: ++this.sid }; this.waitT = 0; this.post({ t: 'shot', side: e.side, slot, out: e.t, id: this.sid }); }
      else if (SHOT.includes(e.t)) { if (e.t === 'gol') this.score[e.side]++; this.h.onEvent(e); this.post({ t: 'score', s: this.score }); }
      else if (e.t === 'int') { this.h.onEvent(e); this.post({ t: 'half' }); this.h.onPause('int'); }
      else if (e.t === 'fim') { this.h.onEvent(e); const sc = this.m.score; const w = sc[0] > sc[1] ? 0 : sc[1] > sc[0] ? 1 : -1;
        if (this.opt.final && w >= 0) { const cap = this.m.s[w].club.capId; let slot = cap != null ? this.slotOf(w, cap) : -1; if (slot < 0) slot = 9; this.post({ t: 'champ', side: w, cap: slot }); this.champT = setTimeout(() => this.finish(), 9000); this.h.onChamp?.(w); }
        else { this.post({ t: 'end' }); this.finish(); } }
      else { this.h.onEvent(e); const slot = this.slotOf(e.side, e.p); if (['sub', 'ver', 'am', 'les'].includes(e.t) && slot >= 0) this.post({ t: 'ev', e: e.t, side: e.side, slot, id: e.p, name: short(this.G.players[e.p]?.n || '') }); }
    }
  }
  finish() { if (this.done) return; this.done = true; this.h.onEnd(); }
  skipReplay() { this.post({ t: 'skip' }); }
  skipToEnd() {
    if (this.wait && !this.wait.resolved) { const e = this.wait.ev; this.h.onEvent(e, true); if (e.t === 'gol') this.score[e.side]++; }
    this.wait = null;
    while (!this.m.done) for (const e of this.m.step()) { this.h.onEvent(e, true); if (e.t === 'gol') this.score[e.side]++; }
    this.score = this.m.score.slice(); this.post({ t: 'score', s: this.score }); this.post({ t: 'end' }); this.finish();
  }
  inject(e) { if (e.t === 'gol') { this.score[e.side]++; this.post({ t: 'score', s: this.score }); } }
  resize() {} draw() {}
  destroy() { window.removeEventListener('message', this.onMsg); clearTimeout(this.loadT); clearTimeout(this.champT); this.sk?.remove(); this.fr.remove(); }
}
