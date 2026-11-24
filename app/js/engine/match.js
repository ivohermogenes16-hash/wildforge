import { setPieceChance } from './coach.js';
import { aiInMatch } from './universe.js';
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
  '4-1-2-1-2': [['GOL', .5, .04], ['LD', .85, .25], ['ZAG', .62, .2], ['ZAG', .38, .2], ['LE', .15, .25], ['VOL', .5, .38], ['MC', .72, .52], ['MC', .28, .52], ['MEI', .5, .64], ['ATA', .62, .82], ['ATA', .38, .82]],
  '4-3-2-1': [['GOL', .5, .04], ['LD', .85, .25], ['ZAG', .62, .2], ['ZAG', .38, .2], ['LE', .15, .25], ['VOL', .5, .4], ['MC', .72, .46], ['MC', .28, .46], ['MEI', .66, .66], ['MEI', .34, .66], ['ATA', .5, .84]],
  '4-2-2-2': [['GOL', .5, .04], ['LD', .85, .25], ['ZAG', .62, .2], ['ZAG', .38, .2], ['LE', .15, .25], ['VOL', .62, .4], ['VOL', .38, .4], ['MEI', .78, .62], ['MEI', .22, .62], ['ATA', .62, .82], ['ATA', .38, .82]],
  '4-5-1': [['GOL', .5, .04], ['LD', .85, .25], ['ZAG', .62, .2], ['ZAG', .38, .2], ['LE', .15, .25], ['VOL', .5, .4], ['MC', .68, .5], ['MC', .32, .5], ['PD', .88, .6], ['PE', .12, .6], ['ATA', .5, .82]],
  '3-4-2-1': [['GOL', .5, .04], ['ZAG', .72, .2], ['ZAG', .5, .18], ['ZAG', .28, .2], ['LD', .9, .46], ['MC', .62, .44], ['MC', .38, .44], ['LE', .1, .46], ['MEI', .66, .66], ['MEI', .34, .66], ['ATA', .5, .84]],
  '3-4-1-2': [['GOL', .5, .04], ['ZAG', .72, .2], ['ZAG', .5, .18], ['ZAG', .28, .2], ['LD', .9, .46], ['MC', .62, .44], ['MC', .38, .44], ['LE', .1, .46], ['MEI', .5, .64], ['ATA', .62, .82], ['ATA', .38, .82]],
  '5-4-1': [['GOL', .5, .04], ['LD', .9, .3], ['ZAG', .7, .2], ['ZAG', .5, .18], ['ZAG', .3, .2], ['LE', .1, .3], ['MC', .62, .46], ['MC', .38, .46], ['PD', .85, .6], ['PE', .15, .6], ['ATA', .5, .8]],
};
export const MENT = ['Defensiva', 'Equilibrada', 'Ofensiva'];
// instruções extras do time: cada uma tem efeito nos números do jogo
export const INSTR = {
  tempo: { n: 'Ritmo', o: ['Cadenciado', 'Normal', 'Acelerado'], fx: [{ ctl: 1, att: -0.8 }, {}, { att: 1, def: -0.6 }] },
  larg: { n: 'Largura', o: ['Por dentro', 'Normal', 'Pelas pontas'], fx: [{ ctl: 1, att: -0.4 }, {}, { att: 1, ctl: -0.6 }] },
  linha: { n: 'Linha defensiva', o: ['Baixa', 'Média', 'Alta'], fx: [{ def: 1.5, att: -1 }, {}, { ctl: 1.2, def: -1.2 }] },
  passe: { n: 'Passes', o: ['Curtos', 'Mistos', 'Longos'], fx: [{ ctl: 1.5, att: -0.5 }, {}, { att: 1, ctl: -1.5 }] },
  marc: { n: 'Marcação', o: ['Por zona', 'Individual'], fx: [{}, { def: 0.8, ctl: -0.4 }] },
  bola: { n: 'Bolas paradas', o: ['Curtas', 'Na área'], fx: [{ ctl: 0.3 }, { att: 0.6 }] },
  contra: { n: 'Contra-ataque', o: ['Não', 'Sim'], fx: [{}, { att: 0.4, ctl: -0.8, def: 0.4 }] },
  impd: { n: 'Linha de impedimento', o: ['Não', 'Sim'], fx: [{}, { def: 0.5, ctl: 0.3 }] },
  foco: { n: 'Lado do ataque', o: ['Esquerda', 'Equilibrado', 'Direita'], fx: [{ att: 0.3 }, {}, { att: 0.3 }] },
  perda: { n: 'Ao perder a bola', o: ['Recompor', 'Normal', 'Pressionar na hora'], fx: [{ def: 0.8, ctl: -0.4 }, {}, { ctl: 0.9, def: -0.5 }] },
  cera: { n: 'Segurar o jogo', o: ['Não', 'Quando estiver ganhando'], fx: [{}, {}] },
  liber: { n: 'Liberdade criativa', o: ['Disciplinado', 'Normal', 'Livre'], fx: [{ def: 0.5, att: -0.4 }, {}, { att: 0.8, def: -0.5 }] },
};
export function instrFx(t) { const r = { att: 0, def: 0, ctl: 0 }; for (const [k, d] of Object.entries(INSTR)) { const f = d.fx[t?.[k] ?? (d.o.length === 3 ? 1 : 0)] || {}; for (const x of ['att', 'def', 'ctl']) r[x] += f[x] || 0; } return r; }
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

// desgaste por minuto em campo (posição, idade, pressão)
export const FITPOS = { GOL: 5, ZAG: 13, LD: 18, LE: 18, ALD: 19, ALE: 19, VOL: 17, MC: 18, MEI: 17, PD: 18, PE: 18, SA: 17, ATA: 16 };
export function fitRate(p, tact) { const ag = p.age >= 33 ? 1.3 : p.age >= 30 ? 1.15 : p.age <= 21 ? 0.92 : 1; return (FITPOS[p.pos] || 24) * ag / 90 * (1 + ((tact?.press ?? 1) - 1) * 0.15); }
export function effAt(p, slot, minute = 0, en = null) {
  const fit = en != null ? Math.max(15, en) : Math.max(30, p.fit - (minute > 55 ? (minute - 55) * 0.35 : 0));
  return p.ovr * posFit(p.pos, slot) * (0.8 + 0.2 * fit / 100) * (0.94 + 0.12 * p.mor / 100);
}

export function squadOf(G, cid, youth) { const e = G._idx?.get(cid); if (e) return (youth ? e.y : e.s).filter((p) => p.club === cid && !!p.u20 === !!youth); return G.players.filter((p) => p && p.club === cid && !!p.u20 === !!youth); }

// Escalação automática gulosa
export function autoLineup(G, club, youth, keepFit = true, pool0 = null) {
  const form = formOf(club.tact);
  let pool = (pool0 || squadOf(G, club.id, youth).filter((p) => !youth || !p.u17)).filter(available);
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

export function ratings(G, club, xi, minute = 0, tact = club.tact, extra = 0, bon = null, en = null) {
  const form = formOf(tact);
  const lines = { G: [], D: [], M: [], A: [] };
  xi.forEach((id, i) => {
    const p = G.players[id]; if (!p) return;
    const slot = form[i][0];
    const e = effAt(p, slot, minute, en ? en[id] : null);
    const L = slot === 'GOL' ? 'G' : ['LD', 'LE', 'ZAG'].includes(slot) ? 'D' : ['VOL', 'MC', 'MEI'].includes(slot) ? 'M' : 'A';
    lines[L].push(e);
  });
  const missing = 11 - xi.filter((id) => G.players[id]).length;
  const g = avg(lines.G) || 30, d = avg(lines.D) || 30, m = avg(lines.M) || 30, a = avg(lines.A) || avg(lines.M) || 30;
  let att = 0.5 * a + 0.35 * m + 0.15 * d, def = 0.5 * d + 0.3 * m + 0.2 * g, ctl = m * 0.8 + 0.2 * (a + d) / 2;
  if (bon) { att += bon.att || 0; def += bon.def || 0; ctl += bon.ctl || 0; }
  { const ix = instrFx(tact); att += ix.att; def += ix.def; ctl += ix.ctl; }
  const ment = tact.ment - 1; att += ment * 2.5; def -= ment * 2.5;
  ctl += (tact.press - 1) * 1.5;
  // setas desenhadas na prancheta: subir um jogador ajuda o ataque e abre espaço atrás (e vice-versa)
  if (tact.arrows) { let up = 0, dn = 0, wide = 0; for (const [i, a] of Object.entries(tact.arrows)) { if (!form[+i] || form[+i][0] === 'GOL') continue; if (a[1] > 0.04) up += Math.min(a[1], 0.3); else if (a[1] < -0.04) dn += Math.min(-a[1], 0.3); wide += Math.abs(a[0]); }
    att += Math.min(2.2, up * 5) - Math.min(1.5, dn * 3); def += Math.min(2, dn * 5) - Math.min(1.6, up * 3); ctl += Math.min(0.8, wide * 1.5) - Math.min(0.6, up * 1.2); }
  const pen = missing * 4;
  return { att: att + extra - pen, def: def + extra - pen, ctl: ctl + extra - pen, gk: g };
}

export function lambdas(Rh, Ra, neutral) {
  const ctl = Math.exp((Rh.ctl - Ra.ctl) / 40);
  // diferenças muito grandes são amortecidas (gigante x pequeno dá 3, 4 a 0 — não 11)
  const soft = (d) => (d > 10 ? 10 + (d - 10) * 0.35 : d < -10 ? -10 + (d + 10) * 0.6 : d);
  const lh = clamp(1.16 * Math.exp(soft(Rh.att - Ra.def) / 17) * Math.sqrt(ctl) * (neutral ? 0.92 : 1.08), 0.08, 3.0);
  const la = clamp(1.16 * Math.exp(soft(Ra.att - Rh.def) / 17) / Math.sqrt(ctl) * (neutral ? 0.92 : 0.86), 0.08, 3.0);
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
    this.en = {}; for (const sd of sides) for (const id of sd.xi) { const p = G.players[id]; if (p) this.en[id] = p.fit; }
    // clima, gramado, árbitro e estatísticas avançadas
    const wk = f?.w ?? 0; const cold = wk > 20 && wk < 33;
    this.weather = opt.weather || pick(cold ? ['sol', 'nublado', 'chuva', 'frio', 'frio'] : ['sol', 'sol', 'nublado', 'chuva', 'calor']);
    this.pitch = opt.pitch || pick(['ótimo', 'bom', 'bom', 'irregular']);
    this.ref = opt.ref || makeRef(f);
    this.st.xg = [0, 0]; this.st.pas = [0, 0]; this.st.pok = [0, 0]; this.st.imp = [0, 0];
    this.heat = [new Array(48).fill(0), new Array(48).fill(0)]; this.net = [{}, {}]; this.lances = 0; this.pend = null;
  }
  wx() { return { chuva: { ctl: -1.5, err: 0.06 }, calor: { fit: 1.15 }, frio: { fit: 0.95 }, sol: {}, nublado: {} }[this.weather] || {}; }
  form(i) { return formOf(this.s[i].tact); }
  R(i) { const sd = this.s[i]; const r = ratings(this.G, sd.club, sd.xi.map((id) => (this.sent[i].has(id) ? -1 : id)), this.min, sd.tact, (sd.extra || 0) + tacticEdge(sd.tact, this.s[1 - i].tact), sd.bon, this.en);
    const w = this.wx(); if (w.ctl) { r.ctl += w.ctl * (sd.tact.passe === 0 ? 1.4 : 0.6); } if (this.pitch === 'irregular' && sd.tact.passe === 0) r.ctl -= 1;
    if (sd.tact.cera === 1 && this.score[i] > this.score[1 - i] && this.min > 70) { r.def += 1.2; r.att -= 1.5; }
    return r; }
  name(id) { const p = this.G.players[id]; return p ? p.n : '—'; }
  push(e) { e.m = this.min; this.ev.push(e); return e; }
  // jogadas ensaiadas: escanteio e falta perigosa usam a jogada escolhida e o cobrador definido
  setPiece(own, kind, out) {
    const sd = this.s[own], op = this.s[1 - own]; const xi = sd.xi.filter((id) => !this.sent[own].has(id)); if (!xi.length) return;
    const tk0 = sd.tact?.takers?.[kind]; const taker = xi.includes(tk0) ? tk0 : xi.slice().sort((a, b) => (this.G.players[b]?.ovr || 0) - (this.G.players[a]?.ovr || 0)).find((id) => this.form(own)[sd.xi.indexOf(id)]?.[0] !== 'GOL');
    const tp = this.G.players[taker]; const ch = setPieceChance(this.G, own, kind, sd.tact, op.club, tp ? tp.ovr : 65);
    const play = sd.tact?.plays?.[kind] || (kind === 'ck' ? 'primeiro' : 'cruz');
    if (rnd() >= ch * 1.9) return; // não virou nem finalização
    this.st.sh[own]++; const xg = Math.round(ch * 100 * 1.6) / 100; this.st.xg[own] = Math.round((this.st.xg[own] + xg) * 100) / 100;
    const form = this.form(own);
    let sc = taker; if (!(kind === 'fk' && play === 'direto')) { const cand = xi.filter((id) => id !== taker && form[sd.xi.indexOf(id)]?.[0] !== 'GOL'); const w = (id) => { const p = this.G.players[id]; const pos = form[sd.xi.indexOf(id)]?.[0]; return (p?.ovr || 60) * (['ZAG', 'ATA'].includes(pos) ? (play === 'marca' || play === 'rolada' ? 0.7 : 1.6) : ['MC', 'MEI', 'VOL'].includes(pos) ? (play === 'marca' || play === 'rolada' ? 1.8 : 0.7) : 0.8); }; let t = cand.reduce((a, id) => a + w(id), 0) * rnd(); for (const id of cand) { t -= w(id); if (t <= 0) { sc = id; break; } } }
    if (rnd() < 0.52) { this.score[own]++; this.st.ont[own]++; out.push(this.push({ t: 'gol', side: own, p: sc, as: sc === taker ? -1 : taker, xg, bp: kind, play })); }
    else { this.st.ont[own]++; out.push(this.push({ t: 'def', side: own, p: sc, gk: op.xi.find((id, i) => this.form(1 - own)[i][0] === 'GOL'), xg, bp: kind })); }
  }
  step() {
    if (this.done) return [];
    if (this.pend) { if (this.auto || (!this.s[0].user && !this.s[1].user)) return this.resolveLance(rnd() < (this.pend.q || 0.3)); return []; }
    this.min++;
    for (const i of [0, 1]) { const sd = this.s[i]; for (const id of sd.xi) { if (this.sent[i].has(id)) continue; const p = this.G.players[id]; if (!p) continue; if (this.en[id] == null) this.en[id] = p.fit; this.en[id] = Math.max(15, this.en[id] - fitRate(p, sd.tact) * (this.wx().fit || 1) * (this.min > 45 ? 1.12 : 0.88) * (0.85 + Math.random() * 0.3)); } }
    for (const i of [0, 1]) aiInMatch(this.G, i, this.s[i], this.score, this.min);
    const out = [];
    const R0 = this.R(0), R1 = this.R(1);
    const [l0, l1] = lambdas(R0, R1, this.opt.neutral);
    const pos0 = clamp(0.5 + (R0.ctl - R1.ctl) / 50, 0.28, 0.72);
    const own = rnd() < pos0 ? 0 : 1; this.st.pos[own]++;
    this.ball.own = own; this.track(own, R0, R1);
    if (this.pend) return out;
    // pênalti em falta na área (com checagem do VAR às vezes)
    if (this.min !== 45 && this.min >= 6 && this.min < 89 && rnd() < 0.0055) { const sdp = this.s[own]; const xip = sdp.xi.filter((id) => !this.sent[own].has(id)); const tk = pickScorer(this.G, xip, this.form(own)); const gkp = this.s[1 - own].xi.find((id, k) => this.form(1 - own)[k][0] === 'GOL');
      if (this.s[own].user && !this.auto) { this.pend = { t: 'lance', kind: 'pen', side: own, p: tk, gk: gkp, q: 0.76, xg: 0.76, var: rnd() < 0.3 }; out.push(this.push({ ...this.pend })); return out; }
      if (this.s[1 - own].user && !this.auto) { this.pend = { t: 'lance', kind: 'defpen', side: own, p: tk, gk: gkp, q: 0.76, xg: 0.76, var: rnd() < 0.3 }; out.push(this.push({ ...this.pend })); return out; }
      this.st.sh[own]++; this.st.xg[own] += 0.76; out.push(this.push({ t: 'pen', side: own, p: tk }));
      if (rnd() < 0.76) { this.score[own]++; this.st.ont[own]++; out.push(this.push({ t: 'gol', side: own, p: tk, as: -1, pen: true, xg: 0.76 })); } else out.push(this.push({ t: 'def', side: own, p: tk, gk: gkp, pen: true, xg: 0.76 }));
    }
    const lam = own === 0 ? l0 : l1, posS = own === 0 ? pos0 : 1 - pos0;
    const conv = 0.3;
    const pChance = lam / (conv * 90 * posS) * 0.86;
    const sd = this.s[own], opp = this.s[1 - own];
    const xi = sd.xi.filter((id) => !this.sent[own].has(id));
    if (rnd() < pChance && xi.length) {
      const shooter = pickScorer(this.G, sd.xi.filter((id) => !this.sent[own].has(id)), this.form(own).filter((_, i) => !this.sent[own].has(sd.xi[i])));
      const gkId = opp.xi.find((id, i) => this.form(1 - own)[i][0] === 'GOL');
      const sp = this.G.players[shooter], gk = this.G.players[gkId];
      const q = conv * clamp(Math.exp(((sp ? sp.ovr : 60) - (gk ? gk.ovr : 60)) / 50), 0.75, 1.2);
      this.st.sh[own]++; const xg = Math.round(clamp(q * (0.6 + rnd() * 0.8), 0.02, 0.85) * 100) / 100; this.st.xg[own] = Math.round((this.st.xg[own] + xg) * 100) / 100;
      // lance decisivo jogável (só para o time do usuário, nos momentos que importam)
      const userSide = this.s[own].user && !this.auto; const close = Math.abs(this.score[0] - this.score[1]) <= 1;
      if (userSide && this.lances < 2 && this.min >= 55 && this.min < 89 && close && rnd() < 0.22) { this.lances++; const kind = pick(['pen', 'falta', '1x1']); this.pend = { t: 'lance', kind, side: own, p: shooter, gk: gkId, q, xg }; out.push(this.push({ ...this.pend })); return out; }
      if (!this.s[1 - own].user || this.auto ? false : (this.lances < 2 && this.min >= 60 && this.min < 89 && close && rnd() < 0.12)) { this.lances++; this.pend = { t: 'lance', kind: 'defpen', side: own, p: shooter, gk: gkId, q, xg }; out.push(this.push({ ...this.pend })); return out; }
      const r = rnd();
      if (r < q) {
        this.score[own]++; this.st.ont[own]++;
        const as = rnd() < 0.7 ? pickScorer(this.G, xi, this.form(own), AW, shooter) : -1;
        const ge = this.push({ t: 'gol', side: own, p: shooter, as, xg });
        if (rnd() < 0.07) { this.score[own]--; ge.t = 'var'; ge.res = 'anulado'; ge.why = pick(['impedimento', 'falta no início da jogada', 'mão na bola']); }
        else if (rnd() < 0.06) ge.var = 'confirmado';
        out.push(ge);
      } else if (r < q + 0.32) { this.st.ont[own]++; out.push(this.push({ t: 'def', side: own, p: shooter, gk: gkId, xg })); }
      else if (r < q + 0.38) out.push(this.push({ t: 'trave', side: own, p: shooter, xg }));
      else { out.push(this.push({ t: 'fora', side: own, p: shooter, xg })); if (rnd() < 0.35) { this.st.cor[own]++; this.setPiece(own, 'ck', out); } }
    } else if (rnd() < 0.035 * (opp.tact.press + 1) / 2) {
      this.st.fal[1 - own]++; if (rnd() < 0.28) this.setPiece(own, 'fk', out);
      if (rnd() < 0.16 * (this.ref?.k || 1)) {
        const oxi = opp.xi.filter((id) => !this.sent[1 - own].has(id));
        const p = pick(oxi);
        const already = this.ev.some((e) => e.t === 'am' && e.p === p);
        if (already || rnd() < 0.03) { this.sent[1 - own].add(p); out.push(this.push({ t: 'ver', side: 1 - own, p, second: already })); }
        else out.push(this.push({ t: 'am', side: 1 - own, p }));
      }
    }
    else if (rnd() < 0.075 && !this.pend) { this.st.cor[own]++; this.setPiece(own, 'ck', out); }
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
    sd.xi[k] = inId; sd.bench = sd.bench.filter((x) => x !== inId); this.subs[i]++; this.played[i].add(inId); { const q = this.G.players[inId]; if (q) this.en[inId] = q.fit; }
    this.push({ t: 'sub', side: i, p: inId, o: outId });
    return true;
  }
  // sugestões de troca: lesionado, pendurado com amarelo, cansado, ou reserva claramente melhor
  suggestSubs(i, max = 3) {
    const sd = this.s[i]; const G = this.G; const form = this.form(i); const out = [];
    const left = 5 - this.subs[i]; if (left <= 0) return out;
    const yel = new Set(this.ev.filter((e) => e.t === 'am' && e.side === i).map((e) => e.p));
    const injd = new Set(this.ev.filter((e) => e.t === 'les' && e.side === i).map((e) => e.p));
    const [a, b] = i === 0 ? this.score : [this.score[1], this.score[0]]; const diff = a - b;
    const cand = [];
    sd.xi.forEach((id, j) => {
      const p = G.players[id]; if (!p || this.sent[i].has(id)) return; const slot = form[j][0];
      if (slot === 'GOL' && !injd.has(id)) return;
      const live = this.en[id] ?? p.fit;
      let need = 0, why = '';
      if (injd.has(id)) { need = 100; why = 'lesionado'; }
      else if (yel.has(id) && this.min >= 55 && ['ZAG', 'VOL', 'LD', 'LE'].includes(p.pos)) { need = 30; why = 'pendurado'; }
      if (this.min >= 55 && live < 70 && need < 40) { need = Math.max(need, 80 - live); why = why || 'cansado'; }
      cand.push({ j, id, slot, need, why, v: effAt(p, slot, this.min, this.en[id]) - (yel.has(id) ? 3 : 0) });
    });
    const used = new Set();
    cand.sort((x, y) => y.need - x.need || x.v - y.v);
    for (const c of cand) {
      if (out.length >= Math.min(max, left)) break;
      let best = null, bv = -1;
      for (const id of sd.bench) {
        if (this.played[i].has(id) || used.has(id)) continue; const p = G.players[id]; if (!p || !available(p)) continue;
        let v = effAt(p, c.slot);
        // perdendo: prefere atacante; ganhando: prefere defensor
        if (this.min >= 65 && diff < 0 && ['ATA', 'SA', 'PD', 'PE', 'MEI'].includes(p.pos)) v += 2;
        if (this.min >= 70 && diff > 0 && ['ZAG', 'VOL', 'LD', 'LE'].includes(p.pos)) v += 1.5;
        if (v > bv) { bv = v; best = id; }
      }
      if (best == null) continue;
      if (!c.need && (this.min < 46 || bv < c.v + 2)) continue;
      if (c.need && c.need < 100 && bv < c.v - 6) continue;
      used.add(best); out.push({ out: c.id, in: best, why: c.why || 'reforço', gain: Math.round((bv - c.v) * 10) / 10 });
    }
    return out;
  }
  aiSubs(i, out) {
    const sd = this.s[i];
    if (this.subs[i] >= 5 || !sd.bench.length) return;
    const inj = this.ev.find((e) => e.t === 'les' && e.side === i && sd.xi.includes(e.p) && !e.handled);
    const want = (this.min === 60 && this.subs[i] < 2) || (this.min === 70 && this.subs[i] < 3) || (this.min === 78 && this.subs[i] < 4) || (this.min === 85 && this.subs[i] < 5 && rnd() < 0.5);
    if (!want && !inj) return;
    if (inj) inj.handled = true;
    const n = inj ? 1 : this.min === 60 ? 2 - this.subs[i] : 1;
    for (const sg of this.suggestSubs(i, Math.max(1, n))) if (this.sub(i, sg.out, sg.in)) out.push(this.ev[this.ev.length - 1]);
  }
  track(own, R0, R1) {
    const sd = this.s[own], form = this.form(own), xi = sd.xi.filter((id) => !this.sent[own].has(id)); const R = own ? R1 : R0, O = own ? R0 : R1;
    const n = 4 + Math.round(rnd() * 4 + (sd.tact.passe === 0 ? 3 : sd.tact.passe === 2 ? -1 : 0)); const acc = clamp(0.78 + (R.ctl - O.ctl) / 120 + (sd.tact.passe === 0 ? 0.04 : sd.tact.passe === 2 ? -0.06 : 0) - (this.wx().err || 0), 0.6, 0.93);
    this.st.pas[own] += n; this.st.pok[own] += Math.round(n * acc);
    for (let k = 0; k < n; k++) { const a = Math.floor(rnd() * xi.length), b = Math.floor(rnd() * xi.length); if (a === b) continue; const ia = sd.xi.indexOf(xi[a]), ib = sd.xi.indexOf(xi[b]); const fa = form[ia], fb = form[ib]; if (!fa || !fb) continue;
      if (Math.hypot(fa[1] - fb[1], fa[2] - fb[2]) > 0.42) continue; const key = xi[a] < xi[b] ? xi[a] + '-' + xi[b] : xi[b] + '-' + xi[a]; this.net[own][key] = (this.net[own][key] || 0) + 1; }
    const adv = clamp(0.5 + (R.att - O.def) / 60 + (sd.tact.ment - 1) * 0.08, 0.2, 0.85);
    for (let k = 0; k < 3; k++) { const y = clamp(Math.floor((rnd() < adv ? 0.45 + rnd() * 0.55 : rnd() * 0.6) * 8), 0, 7); const wide = sd.tact.larg === 2 ? (rnd() < 0.6 ? (rnd() < 0.5 ? 0 : 5) : Math.floor(rnd() * 6)) : sd.tact.larg === 0 ? 1 + Math.floor(rnd() * 4) : Math.floor(rnd() * 6); this.heat[own][y * 6 + wide]++; }
  }
  // resultado do lance decisivo jogado pelo usuário
  resolveLance(ok) {
    const L = this.pend; if (!L) return []; this.pend = null; const out = [];
    this.st.sh[L.side]++; this.st.xg[L.side] = Math.round((this.st.xg[L.side] + (L.xg || 0.3)) * 100) / 100;
    if (L.kind === 'defpen') ok = !ok; // no pênalti contra, "ok" = o goleiro defendeu
    if (ok) { this.score[L.side]++; this.st.ont[L.side]++; out.push(this.push({ t: 'gol', side: L.side, p: L.p, as: -1, lance: L.kind, pen: L.kind === 'pen' || L.kind === 'defpen', xg: L.xg })); }
    else { this.st.ont[L.side]++; out.push(this.push({ t: 'def', side: L.side, p: L.p, gk: L.gk, lance: L.kind, xg: L.xg })); }
    return out;
  }
  finish(auto) { this.auto = true; if (auto) for (const sd of this.s) sd.user = false; if (this.pend) this.resolveLance(rnd() < (this.pend.q || 0.3)); while (!this.done) this.step(); return this.result(); }
  result() {
    const tot = this.st.pos[0] + this.st.pos[1] || 1;
    return { en: this.en, hg: this.score[0], ag: this.score[1], ev: this.ev.filter((e) => ['gol', 'am', 'ver', 'les', 'sub'].includes(e.t)), stats: { pos: [Math.round(this.st.pos[0] / tot * 100), 0], sh: this.st.sh, ont: this.st.ont, xg: this.st.xg, pas: this.st.pas, pok: this.st.pok, cor: this.st.cor, fal: this.st.fal }, adv: { netXi: [this.s[0].xi.slice(), this.s[1].xi.slice()], weather: this.weather, pitch: this.pitch, ref: this.ref, heat: this.heat, net: this.net.map((o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 14)), var: this.ev.filter((e) => e.t === 'var' || e.var).map((e) => ({ m: e.m, side: e.side, res: e.res || e.var, why: e.why || '' })) }, played: this.played, xi: [this.s[0].xi, this.s[1].xi] };
  }
}

const REFN = ['Anderson Daronco', 'Raphael Claus', 'Wilton Sampaio', 'Ramon Abatti', 'Bruno Arleu', 'Savio Pereira', 'Flávio de Souza', 'Paulo Zanovelli', 'Rafael Klein', 'Braulio Machado'];
export function makeRef(f) { const k = ((f?.h ?? 1) * 31 + (f?.a ?? 2) * 17 + (f?.w ?? 0)) % REFN.length; const rig = [0.75, 1, 1, 1.3][k % 4]; return { n: 'Árbitro ' + (k + 1), nome: REFN[k], k: rig, perfil: rig > 1.1 ? 'rigoroso' : rig < 0.9 ? 'deixa o jogo correr' : 'equilibrado' }; }
// vantagem tática: algumas escolhas funcionam melhor contra outras
export function tacticEdge(a, b) { if (!a || !b) return 0; let e = 0;
  if (a.contra === 1 && b.ment === 2) e += 1.2; if (a.contra === 1 && b.ment === 0) e -= 0.6;
  if (a.press === 2 && b.passe === 2) e += 0.6; if (a.press === 2 && b.passe === 0) e -= 0.4;
  if (a.linha === 2 && b.contra === 1) e -= 0.8; if (a.impd === 1 && b.passe === 2) e += 0.5;
  if (a.larg === 2 && b.larg === 0) e += 0.4; if (a.perda === 2 && b.tempo === 0) e += 0.4;
  return e; }
export function penalties() { let a = 0, b = 0; for (let i = 0; i < 5; i++) { if (rnd() < 0.76) a++; if (rnd() < 0.76) b++; } while (a === b) { if (rnd() < 0.76) a++; if (rnd() < 0.76) b++; } return [a, b]; }
