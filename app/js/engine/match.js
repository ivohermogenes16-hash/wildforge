import { clamp, rnd, ri, poisson, weighted, posFit, avg, pick } from '../util.js';

// Formações: posição + coordenadas (x 0..1 largura, y 0..1 do próprio gol ao ataque)
export const FORMATIONS = {
  '4-3-3': [['GOL', .5, .04], ['LD', .85, .25], ['ZAG', .62, .2], ['ZAG', .38, .2], ['LE', .15, .25], ['VOL', .5, .4], ['MC', .7, .5], ['MC', .3, .5], ['PD', .85, .75], ['ATA', .5, .82], ['PE', .15, .75]],
  '4-4-2': [['GOL', .5, .04], ['LD', .85, .25], ['ZAG', .62, .2], ['ZAG', .38, .2], ['LE', .15, .25], ['MC', .62, .48], ['MC', .38, .48], ['PD', .88, .55], ['PE', .12, .55], ['ATA', .62, .8], ['ATA', .38, .8]],
  '4-2-3-1': [['GOL', .5, .04], ['LD', .85, .25], ['ZAG', .62, .2], ['ZAG', .38, .2], ['LE', .15, .25], ['VOL', .62, .4], ['VOL', .38, .4], ['MEI', .5, .62], ['PD', .85, .68], ['PE', .15, .68], ['ATA', .5, .85]],
  '4-1-4-1': [['GOL', .5, .04], ['LD', .85, .25], ['ZAG', .62, .2], ['ZAG', .38, .2], ['LE', .15, .25], ['VOL', .5, .38], ['MC', .64, .55], ['MC', .36, .55], ['PD', .88, .62], ['PE', .12, .62], ['ATA', .5, .84]],
  '4-4-2 L': [['GOL', .5, .04], ['LD', .85, .25], ['ZAG', .62, .2], ['ZAG', .38, .2], ['LE', .15, .25], ['VOL', .5, .38], ['MC', .72, .5], ['MC', .28, .5], ['MEI', .5, .64], ['ATA', .62, .82], ['ATA', .38, .82]],
  '3-5-2': [['GOL', .5, .04], ['ZAG', .72, .2], ['ZAG', .5, .18], ['ZAG', .28, .2], ['LD', .9, .48], ['VOL', .5, .4], ['MC', .66, .52], ['MC', .34, .52], ['LE', .1, .48], ['ATA', .62, .8], ['ATA', .38, .8]],
  '5-3-2': [['GOL', .5, .04], ['LD', .9, .3], ['ZAG', .7, .2], ['ZAG', .5, .18], ['ZAG', .3, .2], ['LE', .1, .3], ['VOL', .5, .42], ['MC', .7, .5], ['MC', .3, .5], ['ATA', .62, .78], ['ATA', .38, .78]],
  '3-4-3': [['GOL', .5, .04], ['ZAG', .72, .2], ['ZAG', .5, .18], ['ZAG', .28, .2], ['LD', .9, .48], ['MC', .62, .45], ['MC', .38, .45], ['LE', .1, .48], ['PD', .82, .76], ['ATA', .5, .84], ['PE', .18, .76]],
};
export const MENT = ['Defensiva', 'Equilibrada', 'Ofensiva'];
// formação do time (aceita formação personalizada arrastando no campinho)
export function formOf(t) { return (t && t.form === 'Personalizada' && t.custom && t.custom.length === 11) ? t.custom : FORMATIONS[t?.form] || FORMATIONS['4-3-3']; }
// função automática pela posição no campo (x = largura 0..1, y = profundidade 0..1)
export function roleAt(x, y) {
  const wide = x > 0.74 ? 'R' : x < 0.26 ? 'L' : '';
  if (y < 0.33) return wide === 'R' ? 'LD' : wide === 'L' ? 'LE' : 'ZAG';
  if (y < 0.46) return wide === 'R' ? 'LD' : wide === 'L' ? 'LE' : 'VOL';
  if (y < 0.6) return wide === 'R' ? 'PD' : wide === 'L' ? 'PE' : 'MC';
  if (y < 0.72) return wide === 'R' ? 'PD' : wide === 'L' ? 'PE' : 'MEI';
  return wide === 'R' ? 'PD' : wide === 'L' ? 'PE' : 'ATA';
}
export const PRESS = ['Baixa', 'Média', 'Alta'];

export function available(p) { return p && p.inj <= 0 && p.sus <= 0; }

export function effAt(p, slot, minute = 0) {
  const fit = Math.max(30, p.fit - (minute > 55 ? (minute - 55) * 0.35 : 0));
  return p.ovr * posFit(p.pos, slot) * (0.8 + 0.2 * fit / 100) * (0.94 + 0.12 * p.mor / 100);
}

export function squadOf(G, cid, youth) { return G.players.filter((p) => p && p.club === cid && !!p.u20 === !!youth); }

// Escalação automática gulosa
export function autoLineup(G, club, youth, keepFit = true, pool0 = null) {
  const form = formOf(club.tact);
  let pool = (pool0 || squadOf(G, club.id, youth)).filter(available);
  if (!pool0 && !youth && pool.length < 14) pool = pool.concat(squadOf(G, club.id, true).filter(available).sort((a, b) => b.ovr - a.ovr).slice(0, 14 - pool.length));
  const used = new Set(); const xi = new Array(form.length).fill(-1);
  const order = form.map((f, i) => i).sort((a, b) => (form[a][0] === 'GOL' ? -1 : 0) - (form[b][0] === 'GOL' ? -1 : 0));
  for (const i of order) {
    const slot = form[i][0]; let best = null, bv = -1;
    for (const p of pool) {
      if (used.has(p.id)) continue;
      let v = effAt(p, slot); if (keepFit && p.fit < 70) v *= 0.85;
      if (v > bv) { bv = v; best = p; }
    }
    if (best) { xi[i] = best.id; used.add(best.id); }
  }
  const bench = pool.filter((p) => !used.has(p.id)).sort((a, b) => b.ovr - a.ovr);
  const bn = [];
  const gk = bench.find((p) => p.pos === 'GOL'); if (gk) bn.push(gk.id);
  for (const p of bench) { if (bn.length >= 9) break; if (!bn.includes(p.id)) bn.push(p.id); }
  return { xi, bench: bn };
}

export function validLineup(G, club, lu, youth) {
  if (!lu || !lu.xi || lu.xi.length !== 11) return false;
  const form = formOf(club.tact);
  if (!form || form.length !== 11) return false;
  const seen = new Set();
  for (const id of lu.xi.concat(lu.bench || [])) {
    const p = G.players[id]; if (!p || p.club !== club.id || !available(p) || seen.has(id)) return false;
    if (!youth && p.u20 && !lu.xi.includes(id) && false) return false;
    seen.add(id);
  }
  return true;
}

export function ratings(G, club, xi, minute = 0, tact = club.tact, extra = 0, bon = null) {
  const form = formOf(tact);
  const lines = { G: [], D: [], M: [], A: [] };
  xi.forEach((id, i) => {
    const p = G.players[id]; if (!p) return;
    const slot = form[i][0];
    const e = effAt(p, slot, minute);
    const L = slot === 'GOL' ? 'G' : ['LD', 'LE', 'ZAG'].includes(slot) ? 'D' : ['VOL', 'MC', 'MEI'].includes(slot) ? 'M' : 'A';
    lines[L].push(e);
  });
  const missing = 11 - xi.filter((id) => G.players[id]).length;
  const g = avg(lines.G) || 30, d = avg(lines.D) || 30, m = avg(lines.M) || 30, a = avg(lines.A) || avg(lines.M) || 30;
  let att = 0.5 * a + 0.35 * m + 0.15 * d, def = 0.5 * d + 0.3 * m + 0.2 * g, ctl = m * 0.8 + 0.2 * (a + d) / 2;
  if (bon) { att += bon.att || 0; def += bon.def || 0; }
  const ment = tact.ment - 1; att += ment * 2.5; def -= ment * 2.5;
  ctl += (tact.press - 1) * 1.5;
  const pen = missing * 4;
  return { att: att + extra - pen, def: def + extra - pen, ctl: ctl + extra - pen, gk: g };
}

export function lambdas(Rh, Ra, neutral) {
  const ctl = Math.exp((Rh.ctl - Ra.ctl) / 40);
  const lh = clamp(1.16 * Math.exp((Rh.att - Ra.def) / 20) * Math.sqrt(ctl) * (neutral ? 0.92 : 1.08), 0.08, 5.5);
  const la = clamp(1.16 * Math.exp((Ra.att - Rh.def) / 20) / Math.sqrt(ctl) * (neutral ? 0.92 : 0.86), 0.08, 5.5);
  return [lh, la];
}

const GW = { ATA: 2.8, PE: 2.3, PD: 2.3, MEI: 1.9, MC: 1.1, VOL: 0.5, LD: 0.45, LE: 0.45, ZAG: 0.55, GOL: 0.005 };
const AW = { ATA: 1.8, PE: 2.8, PD: 2.8, MEI: 3.4, MC: 2, VOL: 0.9, LD: 1.5, LE: 1.5, ZAG: 0.4, GOL: 0.05 };
export function pickScorer(G, xi, form, w = GW, excl = -1) {
  const opts = xi.map((id, i) => ({ id, slot: form[i][0] })).filter((o) => G.players[o.id] && o.id !== excl);
  if (!opts.length) return -1;
  return weighted(opts, (o) => w[o.slot] * Math.pow(G.players[o.id].ovr / 70, 2)).id;
}

// Simulação rápida (Poisson) para jogos da IA
export function quickSim(G, f, hc, ac, hxi, axi, opt = {}) {
  const Rh = ratings(G, hc, hxi, 0, hc.tact, opt.hx || 0), Ra = ratings(G, ac, axi, 0, ac.tact, opt.ax || 0);
  const [lh, la] = lambdas(Rh, Ra, opt.neutral);
  const hg = poisson(lh), ag = poisson(la);
  const fh = formOf(hc.tact), fa = formOf(ac.tact);
  const ev = [];
  const mins = () => ri(1, 90);
  for (let i = 0; i < hg; i++) { const s = pickScorer(G, hxi, fh); const as = rnd() < 0.72 ? pickScorer(G, hxi, fh, AW, s) : -1; ev.push({ m: mins(), t: 'gol', side: 0, p: s, as }); }
  for (let i = 0; i < ag; i++) { const s = pickScorer(G, axi, fa); const as = rnd() < 0.72 ? pickScorer(G, axi, fa, AW, s) : -1; ev.push({ m: mins(), t: 'gol', side: 1, p: s, as }); }
  for (const [side, xi] of [[0, hxi], [1, axi]]) {
    const ny = poisson(1.9); for (let i = 0; i < ny; i++) ev.push({ m: mins(), t: 'am', side, p: pick(xi) });
    if (rnd() < 0.045) ev.push({ m: mins(), t: 'ver', side, p: pick(xi) });
    if (rnd() < 0.09) ev.push({ m: mins(), t: 'les', side, p: pick(xi) });
  }
  ev.sort((a, b) => a.m - b.m);
  return { hg, ag, ev, stats: { pos: [Math.round(50 + (Rh.ctl - Ra.ctl) * 0.9), 0], sh: [Math.round(lh * 5 + ri(0, 4)), Math.round(la * 5 + ri(0, 4))] } };
}

// ---------- Motor ao vivo (minuto a minuto) ----------
export class LiveMatch {
  constructor(G, f, sides, opt = {}) {
    // sides: [{club, xi, bench, tact, user}] ×2
    this.G = G; this.f = f; this.s = sides; this.opt = opt;
    this.min = 0; this.score = [0, 0]; this.ev = []; this.subs = [0, 0]; this.sent = [new Set(), new Set()];
    this.st = { pos: [0, 0], sh: [0, 0], ont: [0, 0], cor: [0, 0], fal: [0, 0] };
    this.ball = { x: 0.5, y: 0.5, own: 0 }; this.played = [new Set(sides[0].xi), new Set(sides[1].xi)];
    this.done = false; this.half = false;
  }
  form(i) { return formOf(this.s[i].tact); }
  R(i) { const sd = this.s[i]; return ratings(this.G, sd.club, sd.xi.map((id) => (this.sent[i].has(id) ? -1 : id)), this.min, sd.tact, sd.extra || 0, sd.bon); }
  name(id) { const p = this.G.players[id]; return p ? p.n : '—'; }
  push(e) { e.m = this.min; this.ev.push(e); return e; }
  step() {
    if (this.done) return [];
    this.min++;
    const out = [];
    const R0 = this.R(0), R1 = this.R(1);
    const [l0, l1] = lambdas(R0, R1, this.opt.neutral);
    const pos0 = clamp(0.5 + (R0.ctl - R1.ctl) / 50, 0.28, 0.72);
    const own = rnd() < pos0 ? 0 : 1; this.st.pos[own]++;
    this.ball.own = own;
    const lam = own === 0 ? l0 : l1, posS = own === 0 ? pos0 : 1 - pos0;
    const conv = 0.3;
    const pChance = lam / (conv * 90 * posS);
    const sd = this.s[own], opp = this.s[1 - own];
    const xi = sd.xi.filter((id) => !this.sent[own].has(id));
    if (rnd() < pChance && xi.length) {
      const shooter = pickScorer(this.G, sd.xi.filter((id) => !this.sent[own].has(id)), this.form(own).filter((_, i) => !this.sent[own].has(sd.xi[i])));
      const gkId = opp.xi.find((id, i) => this.form(1 - own)[i][0] === 'GOL');
      const sp = this.G.players[shooter], gk = this.G.players[gkId];
      const q = conv * Math.exp(((sp ? sp.ovr : 60) - (gk ? gk.ovr : 60)) / 40);
      this.st.sh[own]++;
      const r = rnd();
      if (r < q) {
        this.score[own]++; this.st.ont[own]++;
        const as = rnd() < 0.7 ? pickScorer(this.G, xi, this.form(own), AW, shooter) : -1;
        out.push(this.push({ t: 'gol', side: own, p: shooter, as }));
      } else if (r < q + 0.32) { this.st.ont[own]++; out.push(this.push({ t: 'def', side: own, p: shooter, gk: gkId })); }
      else if (r < q + 0.38) out.push(this.push({ t: 'trave', side: own, p: shooter }));
      else { out.push(this.push({ t: 'fora', side: own, p: shooter })); if (rnd() < 0.35) { this.st.cor[own]++; } }
    } else if (rnd() < 0.035 * (opp.tact.press + 1) / 2) {
      this.st.fal[1 - own]++;
      if (rnd() < 0.16) {
        const oxi = opp.xi.filter((id) => !this.sent[1 - own].has(id));
        const p = pick(oxi);
        const already = this.ev.some((e) => e.t === 'am' && e.p === p);
        if (already || rnd() < 0.03) { this.sent[1 - own].add(p); out.push(this.push({ t: 'ver', side: 1 - own, p, second: already })); }
        else out.push(this.push({ t: 'am', side: 1 - own, p }));
      }
    }
    if (rnd() < 0.0012) { const p = pick(xi); out.push(this.push({ t: 'les', side: own, p })); }
    // IA faz substituições
    for (let i = 0; i < 2; i++) if (!this.s[i].user) this.aiSubs(i, out);
    if (this.min === 45) { out.push(this.push({ t: 'int' })); this.half = true; }
    if (this.min >= 90 + (this.opt.extra || 0)) { this.done = true; out.push(this.push({ t: 'fim' })); }
    return out;
  }
  sub(i, outId, inId) {
    const sd = this.s[i]; const k = sd.xi.indexOf(outId);
    if (k < 0 || this.subs[i] >= 5 || this.sent[i].has(outId) || this.played[i].has(inId)) return false;
    sd.xi[k] = inId; sd.bench = sd.bench.filter((x) => x !== inId); this.subs[i]++; this.played[i].add(inId);
    this.push({ t: 'sub', side: i, p: inId, o: outId });
    return true;
  }
  aiSubs(i, out) {
    const sd = this.s[i];
    if (this.subs[i] >= 5 || !sd.bench.length) return;
    const want = (this.min === 60 && this.subs[i] < 2) || (this.min === 72 && this.subs[i] < 4) || (this.min === 82 && this.subs[i] < 5 && rnd() < 0.5);
    const inj = this.ev.find((e) => e.t === 'les' && e.side === i && sd.xi.includes(e.p) && !e.handled);
    if (!want && !inj) return;
    const form = this.form(i);
    let k;
    if (inj) { inj.handled = true; k = sd.xi.indexOf(inj.p); } else {
      let worst = 1e9; sd.xi.forEach((id, j) => { if (form[j][0] === 'GOL' || this.sent[i].has(id)) return; const v = effAt(this.G.players[id], form[j][0], this.min); if (v < worst) { worst = v; k = j; } });
    }
    if (k == null || k < 0) return;
    const slot = form[k][0];
    let best = null, bv = -1;
    for (const id of sd.bench) { if (this.played[i].has(id)) continue; const p = this.G.players[id]; if (!p) continue; const v = effAt(p, slot); if (v > bv) { bv = v; best = id; } }
    if (best != null && (inj || bv > effAt(this.G.players[sd.xi[k]], slot, this.min))) { const o = sd.xi[k]; if (this.sub(i, o, best)) out.push(this.ev[this.ev.length - 1]); }
  }
  finish() { while (!this.done) this.step(); return this.result(); }
  result() {
    const tot = this.st.pos[0] + this.st.pos[1] || 1;
    return { hg: this.score[0], ag: this.score[1], ev: this.ev.filter((e) => ['gol', 'am', 'ver', 'les', 'sub'].includes(e.t)), stats: { pos: [Math.round(this.st.pos[0] / tot * 100), 0], sh: this.st.sh, ont: this.st.ont }, played: this.played, xi: [this.s[0].xi, this.s[1].xi] };
  }
}

export function penalties() { let a = 0, b = 0; for (let i = 0; i < 5; i++) { if (rnd() < 0.76) a++; if (rnd() < 0.76) b++; } while (a === b) { if (rnd() < 0.76) a++; if (rnd() < 0.76) b++; } return [a, b]; }
