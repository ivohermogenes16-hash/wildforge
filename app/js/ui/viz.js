// Visualização 2D da partida: 22 jogadores com movimento de time, condução, passes, chutes e goleiro.
// O resultado vem do motor (LiveMatch); aqui encenamos cada minuto de forma coerente com os eventos.
import { FORMATIONS, formOf } from '../engine/match.js';
import { textOn } from './art.js';

const PW = 105, PH = 68, M = 4;
const rnd = Math.random;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const SHOT = ['gol', 'def', 'trave', 'fora'];
const NUM = { GOL: 1, LD: 2, ZAG: 4, LE: 6, VOL: 5, MC: 8, MEI: 10, PD: 7, PE: 11, ATA: 9 };

function hexRgb(h) { const n = parseInt((h || '#888').slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function cdist(a, b) { const A = hexRgb(a), B = hexRgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); }

export class MatchViz {
  constructor(cv, G, m, userSide, hooks) {
    this.cv = cv; this.ctx = cv.getContext('2d'); this.G = G; this.m = m; this.us = userSide; this.h = hooks;
    this.speed = 2; this.paused = false; this.q = []; this.cur = null; this.score = [0, 0]; this.done = false;
    this.minDur = 2.8; this.half = 1; this.run = null; this.gkT = null; this.banner = null; this.label = null; this.flash = 0;
    const hc = m.s[0].club, ac = m.s[1].club;
    let a1 = ac.c1, a2 = ac.c2;
    if (cdist(hc.c1, ac.c1) < 110) { a1 = cdist(hc.c1, ac.c2) > 110 ? ac.c2 : (cdist(hc.c1, '#ffffff') > 150 ? '#ffffff' : '#111111'); a2 = ac.c1; }
    this.kit = [{ f: hc.c1, s: hc.c2 === hc.c1 ? '#fff' : hc.c2, gk: '#f4c542' }, { f: a1, s: a2 === a1 ? '#000' : a2, gk: '#7cf2c8' }];
    this.ents = [0, 1].map((s) => Array.from({ length: 11 }, (_, i) => ({ s, i, x: 0, y: 0, vx: 0, vy: 0, fx: 1, fy: 0 })));
    this.ball = { x: PW / 2, y: PH / 2, z: 0, mode: 'held', own: null };
    this.numbers();
    this.kickoff(0, true);
    this.resize();
  }
  numbers() {
    for (let s = 0; s < 2; s++) {
      const used = new Set(); const form = this.form(s);
      this.ents[s].forEach((e, i) => { let n = NUM[form[i][0]]; while (used.has(n)) n += n < 12 ? 11 : 1; used.add(n); e.num = n; });
    }
  }
  resize() {
    const r = this.cv.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.width * (PH + 2 * M) / (PW + 2 * M) * dpr);
    this.sc = this.cv.width / (PW + 2 * M);
  }
  form(s) { return formOf(this.m.s[s].tact); }
  pid(s, i) { return this.m.s[s].xi[i]; }
  alive(s, i) { const id = this.pid(s, i); return id != null && !this.m.sent[s].has(id); }
  player(s, i) { return this.G.players[this.pid(s, i)]; }
  dir(s) { return s === 0 ? 1 : -1; }
  T(s, x, y) { return s === 0 ? [x, y] : [PW - x, PH - y]; }
  posSide() { const b = this.ball; return b.own ? b.own.s : b.passS ?? null; }
  owner() { const o = this.ball.own; return o ? this.ents[o.s][o.i] : null; }

  kickoff(s, instant) {
    for (let t = 0; t < 2; t++) {
      const form = this.form(t);
      this.ents[t].forEach((e, i) => {
        const [pos, fx, fy] = form[i];
        let tx = pos === 'GOL' ? 3 : 8 + fy * 40, ty = PH / 2 + (fx - 0.5) * PH * 0.8;
        if (t === s && pos === 'ATA' && !this._ko) { tx = 51; ty = 33; this._ko = i; }
        const [x, y] = this.T(t, Math.min(tx, 51.5), ty);
        if (instant) { e.x = x; e.y = y; e.vx = e.vy = 0; }
      });
    }
    let ki = this._ko; this._ko = null;
    if (ki == null || !this.alive(s, ki)) ki = this.ents[s].findIndex((e, i) => this.alive(s, i) && this.form(s)[i][0] !== 'GOL');
    const e = this.ents[s][ki];
    const [x, y] = this.T(s, 52, 34); e.x = x - this.dir(s) * 0.6; e.y = y;
    this.ball = { x: PW / 2, y: PH / 2, z: 0, mode: 'held', own: { s, i: ki } };
    this.run = null; this.gkT = null;
  }

  // ---------- planejamento de cada minuto ----------
  plan() {
    if (this.m.done) { if (!this.done) { this.done = true; this.h.onEnd(); } return; }
    const evs = this.m.step();
    const own = this.m.ball.own;
    const shot = evs.find((e) => SHOT.includes(e.t));
    for (const e of evs) if (!SHOT.includes(e.t) && e.t !== 'int' && e.t !== 'fim') this.q.push({ t: 'event', ev: e });
    const ps = shot ? shot.side : own;
    if (this.posSide() !== ps) this.q.push({ t: 'steal', s: ps });
    if (shot) {
      let i = this.m.s[ps].xi.indexOf(shot.p);
      if (i < 0) i = this.mostAdvanced(ps);
      const n = rnd() < 0.5 ? 1 : 2;
      for (let k = 0; k < n; k++) this.q.push({ t: 'pass', fwd: true });
      this.q.push({ t: 'setup', s: ps, i }); this.q.push({ t: 'shot', s: ps, i, ev: shot });
    } else {
      let est = 0;
      while (est < this.minDur) {
        if (rnd() < 0.35) { const d = 0.6 + rnd() * 1.2; this.q.push({ t: 'carry', dur: d }); est += d; }
        else { this.q.push({ t: 'pass', fwd: rnd() < 0.55 }); est += 1.3; }
      }
    }
    const it = evs.find((e) => e.t === 'int'); if (it) { this.q.push({ t: 'event', ev: it }); this.q.push({ t: 'half' }); }
    const fim = evs.find((e) => e.t === 'fim'); if (fim) { this.q.push({ t: 'event', ev: fim }); this.q.push({ t: 'end' }); }
  }
  mostAdvanced(s) {
    let best = 0, bv = -1; this.ents[s].forEach((e, i) => { if (!this.alive(s, i)) return; const [tx] = this.T(s, e.x, e.y); if (tx > bv) { bv = tx; best = i; } });
    return best;
  }
  chooseReceiver(s, fwd, prefer) {
    const o = this.ball.own; if (!o) return null;
    const c = this.ents[s][o.i]; const [cx] = this.T(s, c.x, c.y);
    let best = null, bv = -1e9;
    this.ents[s].forEach((e, i) => {
      if (i === o.i || !this.alive(s, i)) return;
      const [tx] = this.T(s, e.x, e.y); const d = Math.hypot(e.x - c.x, e.y - c.y);
      if (d < 6 || d > 42) return;
      let v = -Math.abs(d - 18) * 0.4 + rnd() * 8;
      v += fwd ? (tx - cx) * 0.6 : (tx - cx > -15 ? 2 : -4);
      if (this.form(s)[i][0] === 'GOL') v -= cx > 30 ? 40 : 6;
      if (prefer === i) v += 50;
      // passe bloqueado por adversário perto da linha
      for (const op of this.ents[1 - s]) { const t = ((op.x - c.x) * (e.x - c.x) + (op.y - c.y) * (e.y - c.y)) / (d * d); if (t > 0.1 && t < 0.9) { const px = c.x + (e.x - c.x) * t, py = c.y + (e.y - c.y) * t; if (Math.hypot(op.x - px, op.y - py) < 1.6) v -= 12; } }
      if (v > bv) { bv = v; best = i; }
    });
    return best;
  }

  start(a) {
    const b = this.ball, o = b.own;
    switch (a.t) {
      case 'event': this.h.onEvent(a.ev); if (a.ev.t === 'ver') this.labelFor(a.ev.side, a.ev.p, '🟥'); if (a.ev.t === 'am') this.labelFor(a.ev.side, a.ev.p, '🟨'); a.dur = a.ev.t === 'sub' ? 0.6 : 0.25; break;
      case 'carry': a.dur = a.dur || 1; break;
      case 'pass': {
        if (!o) { a.dur = 0.2; break; }
        const to = a.to != null ? a.to : this.chooseReceiver(o.s, a.fwd, a.prefer);
        if (to == null) { a.t = 'carry'; a.dur = 0.8; break; }
        this.kick(o.s, to, a.long);
        a.wait = true; break;
      }
      case 'steal': {
        const s = a.s; let best = null, bd = 1e9;
        this.ents[s].forEach((e, i) => { if (!this.alive(s, i) || this.form(s)[i][0] === 'GOL') return; const d = Math.hypot(e.x - b.x, e.y - b.y); if (d < bd) { bd = d; best = i; } });
        if (best == null) { a.dur = 0.1; break; }
        const e = this.ents[s][best];
        this.ball = { ...b, mode: 'pass', own: null, passS: s, x0: b.x, y0: b.y, x1: e.x + e.vx * 0.3, y1: e.y + e.vy * 0.3, t: 0, dur: Math.max(0.25, bd / 14), hgt: 0.2, to: { s, i: best } };
        a.wait = true; break;
      }
      case 'setup': {
        if (!o || o.s !== a.s) { a.dur = 0.1; break; }
        const [bx] = this.T(a.s, b.x, b.y);
        const tx = clamp(Math.max(bx + 6, 84 + rnd() * 9), 70, 96), ty = 34 + (rnd() - 0.5) * 22;
        const [wx, wy] = this.T(a.s, tx, ty);
        this.run = { s: a.s, i: a.i, x: wx, y: wy };
        if (o.i === a.i) { this.q.unshift({ t: 'carry', dur: 0.9 }); }
        else { this.q.unshift({ t: 'pass', to: a.i }); this.q.unshift({ t: 'carry', dur: 0.7 }); }
        a.dur = 0; break;
      }
      case 'shot': this.shoot(a); a.wait = true; break;
      case 'celebrate': {
        const sc = this.ents[a.s][a.i]; const [cx, cy] = this.T(a.s, 103, sc.y > PH / 2 ? 66 : 2);
        this.celeb = { s: a.s, i: a.i, x: cx, y: cy }; a.dur = 2.6; this.ball.mode = 'dead'; break;
      }
      case 'kickoff': this.celeb = null; this.kickoff(a.s, true); a.dur = 0.8; break;
      case 'half': this.h.onPause('int'); this.kickoff(1, true); a.dur = 0.5; break;
      case 'end': this.done = true; this.h.onEnd(); a.dur = 999; break;
      case 'gk': { // goleiro repõe
        const gi = this.form(a.s).findIndex((f) => f[0] === 'GOL');
        const g = this.ents[a.s][gi];
        if (a.place) { const [x, y] = this.T(a.s, 5.5, 34 + (rnd() - 0.5) * 10); g.x = x; g.y = y; }
        this.ball = { x: g.x + this.dir(a.s) * 0.8, y: g.y, z: 0, mode: 'held', own: { s: a.s, i: gi } };
        this.q.unshift({ t: 'pass', fwd: true, long: true }); this.q.unshift({ t: 'wait', dur: 0.7 });
        a.dur = 0; break;
      }
      case 'wait': break;
    }
    a.el = 0;
  }
  kick(s, to, long) {
    const b = this.ball, r = this.ents[s][to];
    const d0 = Math.hypot(r.x - b.x, r.y - b.y);
    const v = d0 > 28 || long ? 23 : 16;
    const tt = d0 / v;
    const x1 = clamp(r.x + r.vx * tt * 0.7, 0.5, PW - 0.5), y1 = clamp(r.y + r.vy * tt * 0.7, 0.5, PH - 0.5);
    const d = Math.hypot(x1 - b.x, y1 - b.y);
    this.ball = { x: b.x, y: b.y, z: 0, mode: 'pass', own: null, passS: s, x0: b.x, y0: b.y, x1, y1, t: 0, dur: Math.max(0.3, d / v), hgt: d > 26 || long ? 2 + d * 0.09 : 0.25, to: { s, i: to } };
  }
  shoot(a) {
    const b = this.ball, s = a.s, oo = 1 - s;
    const out = a.ev.t;
    const side = rnd() < 0.5 ? -1 : 1;
    let tx = 105.6, ty = 34 + side * (1.2 + rnd() * 2.3);
    if (out === 'trave') { tx = 105; ty = 34 + side * 3.66; }
    if (out === 'fora') { tx = 108; ty = 34 + side * (5 + rnd() * 9); }
    if (out === 'def') { tx = 104.2; ty = 34 + side * (rnd() * 2.6); }
    const [wx, wy] = this.T(s, tx, ty);
    const d = Math.hypot(wx - b.x, wy - b.y);
    this.ball = { x: b.x, y: b.y, z: 0, mode: 'shot', own: null, passS: s, x0: b.x, y0: b.y, x1: wx, y1: wy, t: 0, dur: Math.max(0.35, d / 27), hgt: out === 'fora' ? 2.6 : 0.8 + rnd() * 1.2, out, ev: a.ev, shooter: { s, i: a.i } };
    const gi = this.form(oo).findIndex((f) => f[0] === 'GOL');
    if (gi >= 0) {
      const [gx, gy] = this.T(s, 104, out === 'gol' ? 34 - side * 1.5 : ty);
      this.gkT = { s: oo, i: gi, x: gx, y: gy, fast: true };
    }
    this.label = { s, i: a.i, t: 1.8 };
    this.run = null;
  }
  arrive() {
    const b = this.ball;
    if (b.mode === 'pass') {
      const r = b.to; this.ball = { x: b.x1, y: b.y1, z: 0, mode: 'held', own: r };
      if (this.run && this.run.i === r.i && this.run.s === r.s) {} else this.label = { s: r.s, i: r.i, t: 1.2 };
      return;
    }
    if (b.mode === 'shot') {
      const s = b.shooter.s;
      this.gkT = null;
      if (b.out === 'gol') {
        this.score[s]++; this.flash = 2.2; this.banner = { s, p: this.pid(s, b.shooter.i) };
        this.h.onEvent(b.ev);
        this.ball = { x: b.x1, y: b.y1, z: 0, mode: 'dead', own: null };
        this.q.unshift({ t: 'kickoff', s: 1 - s }); this.q.unshift({ t: 'celebrate', s, i: b.shooter.i });
      } else if (b.out === 'def') {
        this.h.onEvent(b.ev);
        const gi = this.form(1 - s).findIndex((f) => f[0] === 'GOL');
        this.ball = { x: b.x1, y: b.y1, z: 0, mode: 'held', own: { s: 1 - s, i: gi } };
        this.q.unshift({ t: 'gk', s: 1 - s });
      } else if (b.out === 'trave') {
        this.h.onEvent(b.ev);
        this.ball = { x: b.x1, y: b.y1, z: 0.5, mode: 'free', own: null, vx: -this.dir(s) * (7 + rnd() * 5), vy: (rnd() - 0.5) * 10, t: 0 };
      } else {
        this.h.onEvent(b.ev);
        this.ball = { x: b.x1, y: b.y1, z: 0, mode: 'dead', own: null };
        this.q.unshift({ t: 'gk', s: 1 - s, place: true }); this.q.unshift({ t: 'wait', dur: 0.9 });
      }
    }
  }
  labelFor(s, pid, icon) { const i = this.m.s[s].xi.indexOf(pid); if (i >= 0) this.label = { s, i, t: 2, icon }; }

  // ---------- simulação visual ----------
  update(rdt) {
    if (this.paused || this.done) return;
    const total = Math.min(0.1, rdt) * this.speed;
    const steps = Math.ceil(total / 0.035); const dt = total / steps;
    for (let k = 0; k < steps; k++) this.tick(dt);
    if (this.flash > 0) this.flash -= total / this.speed;
  }
  tick(dt) {
    // ações
    if (!this.cur) { if (!this.q.length) this.plan(); this.cur = this.q.shift(); if (this.cur) this.start(this.cur); }
    const a = this.cur;
    if (a) { a.el += dt; if (!a.wait && a.el >= (a.dur ?? 0)) this.cur = null; }
    // bola
    const b = this.ball;
    if (b.mode === 'pass' || b.mode === 'shot') {
      b.t += dt; const u = Math.min(1, b.t / b.dur);
      b.x = b.x0 + (b.x1 - b.x0) * u; b.y = b.y0 + (b.y1 - b.y0) * u; b.z = b.hgt * 4 * u * (1 - u);
      if (u >= 1) { this.arrive(); if (a && a.wait) this.cur = null; }
    } else if (b.mode === 'free') {
      b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 1 - 1.6 * dt; b.vy *= 1 - 1.6 * dt; b.z = Math.max(0, b.z - dt);
      let best = null, bd = 1e9;
      for (const T of this.ents) for (const e of T) { if (!this.alive(e.s, e.i)) continue; const d = Math.hypot(e.x - b.x, e.y - b.y); if (d < bd) { bd = d; best = e; } }
      if (best && (bd < 1.4 || b.t > 1.4)) this.ball = { x: b.x, y: b.y, z: 0, mode: 'held', own: { s: best.s, i: best.i } };
    }
    const o = this.ball.own;
    if (this.ball.mode === 'held' && o && !this.alive(o.s, o.i)) { const ni = this.ents[o.s].findIndex((e, i) => this.alive(o.s, i)); this.ball.own = { s: o.s, i: ni }; }
    // jogadores
    const targets = this.targets();
    for (const T of this.ents) for (const e of T) {
      if (!this.alive(e.s, e.i)) { e.x += (e.x < PW / 2 ? -1 : 1) * 0; continue; }
      const [tx, ty, spd] = targets[e.s][e.i];
      const p = this.player(e.s, e.i); const pace = 0.88 + ((p?.ovr || 60) - 60) / 180;
      const vmax = 7.2 * pace * spd;
      const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1e-6;
      const want = Math.min(vmax, d * 1.6);
      const ax = (dx / d) * want - e.vx, ay = (dy / d) * want - e.vy;
      const k = Math.min(1, 3.2 * dt);
      e.vx += ax * k; e.vy += ay * k;
      e.x = clamp(e.x + e.vx * dt, -2, PW + 2); e.y = clamp(e.y + e.vy * dt, -2, PH + 2);
      const sp = Math.hypot(e.vx, e.vy); if (sp > 0.4) { e.fx = e.vx / sp; e.fy = e.vy / sp; }
    }
    // separação
    const all = this.ents[0].concat(this.ents[1]);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const A = all[i], B = all[j]; const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < 3.4) { const push = (3.4 - d) * 0.22; A.x -= dx / d * push; A.y -= dy / d * push; B.x += dx / d * push; B.y += dy / d * push; }
    }
    // bola grudada no pé
    if (this.ball.mode === 'held' && this.ball.own) {
      const e = this.ents[this.ball.own.s][this.ball.own.i];
      const fx = Math.hypot(e.vx, e.vy) > 0.5 ? e.fx : this.dir(e.s), fy = Math.hypot(e.vx, e.vy) > 0.5 ? e.fy : 0;
      this.ball.x = e.x + fx * 0.85; this.ball.y = e.y + fy * 0.85; this.ball.z = 0;
    }
    if (this.label) { this.label.t -= dt; if (this.label.t <= 0) this.label = null; }
  }
  targets() {
    const b = this.ball, ps = this.posSide();
    const out = [[], []];
    for (let s = 0; s < 2; s++) {
      const form = this.form(s); const [bx, by] = this.T(s, b.x, b.y); const poss = ps === s;
      for (let i = 0; i < 11; i++) {
        const [pos, fx, fy] = form[i];
        let tx, ty, spd = 0.75;
        if (pos === 'GOL') { tx = 2.5 + clamp(bx - 25, 0, 50) * 0.12; ty = 34 + (by - 34) * 0.25; }
        else if (poss) { const line = clamp(bx * 0.6 + 8, 14, 56); tx = line + (fy - 0.2) * 64; ty = 34 + (fx - 0.5) * PH * 0.9 + (by - 34) * 0.12; tx = Math.min(tx, Math.max(bx + 16, 62)); }
        else { const line = clamp(bx * 0.55 + 4, 6, 40); tx = line + (fy - 0.2) * 44; ty = 34 + (fx - 0.5) * PH * 0.62 + (by - 34) * 0.4; }
        // variação natural
        const wob = Math.sin(performance.now() / 1300 + i * 2.1 + s * 5) * 1.2;
        ty += wob; tx = clamp(tx, 1, 100);
        out[s][i] = [...this.T(s, tx, clamp(ty, 2, 66)), spd];
      }
    }
    // pressão: 2 mais próximos do adversário vão na bola
    if (ps != null) {
      const d = 1 - ps; const near = this.ents[d].filter((e, i) => this.alive(d, i) && this.form(d)[i][0] !== 'GOL').map((e) => [e, Math.hypot(e.x - b.x, e.y - b.y)]).sort((x, y) => x[1] - y[1]);
      const press = this.m.s[d].tact.press;
      if (near[0]) out[d][near[0][0].i] = [b.x - this.dir(d) * 1.2, b.y, 1.05 + press * 0.08];
      if (near[1] && press > 0) { const e = near[1][0]; const t = out[d][e.i]; out[d][e.i] = [t[0] * 0.4 + b.x * 0.6, t[1] * 0.4 + b.y * 0.6, 0.95]; }
      // apoio: companheiros perto da bola se aproximam
      for (const e of this.ents[ps]) { const dd = Math.hypot(e.x - b.x, e.y - b.y); if (dd < 16 && this.form(ps)[e.i][0] !== 'GOL') { const t = out[ps][e.i]; out[ps][e.i] = [t[0] * 0.85 + b.x * 0.15, t[1] * 0.85 + b.y * 0.15, 0.85]; } }
    }
    const o = this.ball.own;
    if (this.ball.mode === 'held' && o) { // condução
      const e = this.ents[o.s][o.i]; const [ex, ey] = this.T(o.s, e.x, e.y);
      const isGK = this.form(o.s)[o.i][0] === 'GOL';
      if (!isGK) out[o.s][o.i] = [...this.T(o.s, Math.min(ex + 7, 97), clamp(ey + (34 - ey) * 0.15 + Math.sin(performance.now() / 700) * 3, 3, 65)), 0.82];
      else out[o.s][o.i] = [e.x, e.y, 0.3];
    }
    if (this.ball.mode === 'pass' && this.ball.to) { const r = this.ball.to; out[r.s][r.i] = [this.ball.x1, this.ball.y1, 1.1]; }
    if (this.run) out[this.run.s][this.run.i] = [this.run.x, this.run.y, 1.15];
    if (this.gkT) out[this.gkT.s][this.gkT.i] = [this.gkT.x, this.gkT.y, 1.6];
    if (this.celeb) {
      const c = this.celeb; out[c.s][c.i] = [c.x, c.y, 1.1];
      const sc = this.ents[c.s][c.i];
      this.ents[c.s].forEach((e, i) => { if (i !== c.i && this.form(c.s)[i][0] !== 'GOL') out[c.s][i] = [sc.x - this.dir(c.s) * (1.5 + (i % 3)), sc.y + ((i % 5) - 2) * 1.4, 1]; });
      this.ents[1 - c.s].forEach((e, i) => { const t = out[1 - c.s][i]; out[1 - c.s][i] = [t[0], t[1], 0.35]; });
    }
    return out;
  }

  // ---------- desenho ----------
  draw() {
    const { ctx, cv } = this; const s = this.sc;
    const X = (x) => (x + M) * s, Y = (y) => (y + M) * s;
    ctx.drawImage(this.bg(), 0, 0);
    // rastro da bola
    const tr = (this.trail ||= []); const bb = this.ball;
    if (bb.mode === 'pass' || bb.mode === 'shot' || bb.mode === 'free') { tr.push([bb.x, bb.y - bb.z * 0.35]); if (tr.length > 14) tr.shift(); } else if (tr.length) tr.shift();
    for (let k = 1; k < tr.length; k++) { ctx.strokeStyle = `rgba(255,255,255,${k / tr.length * 0.45})`; ctx.lineWidth = s * 0.5 * k / tr.length; ctx.beginPath(); ctx.moveTo(X(tr[k - 1][0]), Y(tr[k - 1][1])); ctx.lineTo(X(tr[k][0]), Y(tr[k][1])); ctx.stroke(); }
    // jogadores
    const r = 2.05 * s; const own = bb.own;
    for (const T of this.ents) for (const e of T) {
      if (!this.alive(e.s, e.i)) continue;
      const k = this.kit[e.s]; const gk = this.form(e.s)[e.i][0] === 'GOL';
      const px = X(e.x), py = Y(e.y);
      ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(px + r * 0.35, py + r * 0.55, r * 1.05, r * 0.62, 0, 0, 7); ctx.fill();
      if (own && own.s === e.s && own.i === e.i) { ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = s * 0.35; ctx.beginPath(); ctx.arc(px, py, r * 1.55, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fill(); }
      const fill = gk ? k.gk : k.f;
      const gr = ctx.createRadialGradient(px - r * 0.35, py - r * 0.4, r * 0.1, px, py, r * 1.05);
      gr.addColorStop(0, shade(fill, 0.35)); gr.addColorStop(1, shade(fill, -0.12));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
      ctx.lineWidth = Math.max(1.5, r * 0.2); ctx.strokeStyle = gk ? '#111' : k.s; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(px + e.fx * r * 0.82, py + e.fy * r * 0.82, r * 0.2, 0, 7); ctx.fill();
      ctx.fillStyle = gk ? '#111' : textOn(fill); ctx.font = `800 ${Math.round(r * 1.02)}px 'Barlow Condensed', system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(e.num), px, py + r * 0.06);
      if (this.names) { const p = this.player(e.s, e.i); if (p) { ctx.font = `600 ${Math.round(s * 1.35)}px system-ui`; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(short(p.n).slice(0, 12), px, py + r * 1.75); } }
    }
    // bola
    const b = this.ball;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(X(b.x) + b.z * s * 0.3, Y(b.y) + b.z * s * 0.4, s * 0.55, s * 0.38, 0, 0, 7); ctx.fill();
    const br = s * (0.75 + b.z * 0.07);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(b.x), Y(b.y - b.z * 0.35), br, 0, 7); ctx.fill(); ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.stroke();
    // nome de quem está com a bola
    const lab = this.label || (b.own ? { s: b.own.s, i: b.own.i } : null);
    if (lab) {
      const e = this.ents[lab.s][lab.i]; const p = this.player(lab.s, lab.i);
      if (p) {
        const nm = (lab.icon ? lab.icon + ' ' : '') + short(p.n);
        ctx.font = `700 ${Math.round(s * 2)}px system-ui`; const w = ctx.measureText(nm).width + s * 1.4;
        const lx = X(e.x), ly = Y(e.y) - r * 2.3;
        ctx.fillStyle = 'rgba(0,0,0,.72)'; roundRect(ctx, lx - w / 2, ly - s * 1.4, w, s * 2.8, s * 0.7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(nm, lx, ly);
      }
    }
    if (this.flash > 0 && this.banner) {
      const a = Math.min(1, this.flash);
      ctx.fillStyle = `rgba(0,0,0,${0.45 * a})`; ctx.fillRect(0, cv.height * 0.36, cv.width, cv.height * 0.28);
      ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = this.banner.s === this.us ? '#2fe08a' : '#ff6b6b'; ctx.font = `900 ${Math.round(s * 7)}px system-ui`;
      ctx.fillText('GOOOL!', cv.width / 2, cv.height * 0.47);
      ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(s * 2.6)}px system-ui`;
      ctx.fillText(this.G.players[this.banner.p]?.n || '', cv.width / 2, cv.height * 0.57);
      ctx.globalAlpha = 1;
    }
  }
  bg() {
    const cv = this.cv; if (this._bg && this._bg.width === cv.width && this._bg.height === cv.height) return this._bg;
    const o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height; const c = o.getContext('2d'); const s = this.sc;
    const X = (x) => (x + M) * s, Y = (y) => (y + M) * s;
    c.fillStyle = '#16502f'; c.fillRect(0, 0, o.width, o.height);
    for (let i = 0; i < 18; i++) { c.fillStyle = i % 2 ? '#1f6a3f' : '#237647'; c.fillRect(X(i * PW / 18), Y(-M), PW / 18 * s + 1, (PH + 2 * M) * s); }
    for (let j = 0; j < 8; j++) if (j % 2) { c.fillStyle = 'rgba(0,0,0,.05)'; c.fillRect(0, Y(j * PH / 8), o.width, PH / 8 * s); }
    // granulado da grama
    const n = Math.round(o.width * o.height / 90);
    for (let k = 0; k < n; k++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)'; c.fillRect(Math.random() * o.width, Math.random() * o.height, 1.5, 1.5); }
    c.strokeStyle = 'rgba(255,255,255,.82)'; c.lineWidth = Math.max(1, s * 0.16); c.shadowColor = 'rgba(255,255,255,.25)'; c.shadowBlur = s * 0.5;
    c.strokeRect(X(0), Y(0), PW * s, PH * s);
    c.beginPath(); c.moveTo(X(PW / 2), Y(0)); c.lineTo(X(PW / 2), Y(PH)); c.stroke();
    c.beginPath(); c.arc(X(PW / 2), Y(PH / 2), 9.15 * s, 0, 7); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(X(PW / 2), Y(PH / 2), s * 0.3, 0, 7); c.fill();
    for (const side of [0, 1]) {
      const x0 = side ? PW - 16.5 : 0, x1 = side ? PW - 5.5 : 0;
      c.strokeRect(X(x0), Y(PH / 2 - 20.16), 16.5 * s, 40.32 * s);
      c.strokeRect(X(x1), Y(PH / 2 - 9.16), 5.5 * s, 18.32 * s);
      const px = side ? PW - 11 : 11;
      c.beginPath(); c.arc(X(px), Y(PH / 2), s * 0.3, 0, 7); c.fill();
      c.beginPath(); c.arc(X(px), Y(PH / 2), 9.15 * s, side ? Math.PI * 0.705 : -Math.PI * 0.295, side ? Math.PI * 1.295 : Math.PI * 0.295); c.stroke();
      for (const cy of [0, PH]) { c.beginPath(); c.arc(X(side ? PW : 0), Y(cy), s, side ? (cy ? Math.PI : Math.PI / 2) : (cy ? Math.PI * 1.5 : 0), side ? (cy ? Math.PI * 1.5 : Math.PI) : (cy ? Math.PI * 2 : Math.PI / 2)); c.stroke(); }
    }
    c.shadowBlur = 0;
    for (const side of [0, 1]) {
      const gx = side ? PW : -2.2;
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(X(gx), Y(PH / 2 - 3.66), 2.2 * s, 7.32 * s);
      c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 1;
      for (let k = 0; k <= 9; k++) { c.beginPath(); c.moveTo(X(gx), Y(PH / 2 - 3.66 + k * 0.813)); c.lineTo(X(gx + 2.2), Y(PH / 2 - 3.66 + k * 0.813)); c.stroke(); }
      for (let k = 0; k <= 3; k++) { c.beginPath(); c.moveTo(X(gx + k * 0.73), Y(PH / 2 - 3.66)); c.lineTo(X(gx + k * 0.73), Y(PH / 2 + 3.66)); c.stroke(); }
      c.strokeStyle = '#fff'; c.lineWidth = Math.max(2, s * 0.3); c.strokeRect(X(gx), Y(PH / 2 - 3.66), 2.2 * s, 7.32 * s);
    }
    const v = c.createRadialGradient(o.width / 2, o.height / 2, o.height * 0.3, o.width / 2, o.height / 2, o.width * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.38)'); c.fillStyle = v; c.fillRect(0, 0, o.width, o.height);
    this._bg = o; return o;
  }
  skipToEnd() {
    for (const a of [this.cur, ...this.q]) { if (!a) continue; if (a.ev && a.t !== 'event' && a.ev.t !== 'gol' && a.ev.t !== 'fim') continue; if (a.ev && a.ev.t !== 'fim') this.h.onEvent(a.ev, true); }
    if (this.ball.mode === 'shot' && this.ball.out !== 'gol') {}
    this.q = []; this.cur = null;
    while (!this.m.done) for (const e of this.m.step()) { this.h.onEvent(e, true); if (e.t === 'gol') this.score[e.side]++; }
    this.score = this.m.score.slice(); this.done = true; this.h.onEnd();
  }
}
function shade(hex, k) { const [r, g, b] = hexRgb(hex); const f = (v) => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)); return `rgb(${f(r)},${f(g)},${f(b)})`; }
function short(n) { const p = n.split(' '); return p.length > 1 && n.length > 13 ? p[p.length - 1] : n; }
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
