let _r = Math.random;
export const rnd = () => _r();
// executa fn com sorteios previsíveis (mesma semente = mesmo resultado em qualquer save)
export function withSeed(seed, fn) { const o = _r, om = Math.random; const sr = seeded(seed); _r = sr; Math.random = sr; try { return fn(); } finally { _r = o; Math.random = om; } }
export const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
export const rf = (a, b) => a + rnd() * (b - a);
export const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const sum = (a, f = (x) => x) => a.reduce((s, x) => s + f(x), 0);
export const avg = (a, f) => (a.length ? sum(a, f) / a.length : 0);
export const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
export const poisson = (l) => { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= rnd(); } while (p > L); return k - 1; };
export function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function seeded(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function weighted(items, w) { const tot = sum(items, w); let r = rnd() * tot; for (const it of items) { r -= w(it); if (r <= 0) return it; } return items[items.length - 1]; }

// moeda de exibição: os valores do jogo são guardados em reais e convertidos só na tela
export const CUR = { k: 'BRL' };
export const CURS = { BRL: ['R$', 1, 'Real'], USD: ['US$', 5.3, 'Dólar'], EUR: ['€', 5.8, 'Euro'] };
export function money(v) {
  const [sym, rate] = CURS[CUR.k] || CURS.BRL; v = v / rate;
  const s = v < 0 ? '-' : ''; v = Math.abs(v);
  if (v >= 1e9) return `${s}${sym} ${(v / 1e9).toFixed(2).replace('.', ',')} bi`;
  if (v >= 1e6) return `${s}${sym} ${(v / 1e6).toFixed(v >= 1e8 ? 0 : 1).replace('.', ',')} mi`;
  if (v >= 1e3) return `${s}${sym} ${Math.round(v / 1e3)} mil`;
  return `${s}${sym} ${Math.round(v)}`;
}
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const POS = ['GOL', 'LD', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PE', 'PD', 'ATA'];
export const POS_NAME = { GOL: 'Goleiro', LD: 'Lateral-direito', ZAG: 'Zagueiro', LE: 'Lateral-esquerdo', VOL: 'Volante', MC: 'Meio-campo', MEI: 'Meia', PE: 'Ponta-esquerda', PD: 'Ponta-direita', ATA: 'Atacante' };
export const POS_LINE = { GOL: 'G', LD: 'D', ZAG: 'D', LE: 'D', VOL: 'M', MC: 'M', MEI: 'M', PE: 'A', PD: 'A', ATA: 'A' };
// Quão bem um jogador da posição p rende jogando na posição q (0..1)
const FAM = { GOL: ['GOL'], LD: ['LD', 'ZAG', 'PD', 'LE'], LE: ['LE', 'ZAG', 'PE', 'LD'], ZAG: ['ZAG', 'VOL', 'LD', 'LE'], VOL: ['VOL', 'MC', 'ZAG'], MC: ['MC', 'VOL', 'MEI'], MEI: ['MEI', 'MC', 'PE', 'PD', 'ATA'], PE: ['PE', 'PD', 'MEI', 'ATA', 'LE'], PD: ['PD', 'PE', 'MEI', 'ATA', 'LD'], ATA: ['ATA', 'PE', 'PD', 'MEI'] };
export function posFit(p, q) { if (p === q) return 1; if (p === 'GOL' || q === 'GOL') return 0.35; const i = FAM[p].indexOf(q); return i < 0 ? 0.7 : [1, 0.94, 0.9, 0.86, 0.82][i]; }
