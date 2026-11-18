import { IMG } from '../store.js';
import { hash, seeded, esc } from '../util.js';
import { LEAGUES } from '../data/leagues.js';
const TOP1 = new Set(LEAGUES.filter((l) => l.tier === 1).map((l) => l.name));

function lum(hex) { const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
export const textOn = (hex) => (lum(hex) > 0.6 ? '#111' : '#fff');

// Escudo original (cores + sigla), ou a imagem enviada pelo usuário
const CREST_CACHE = new Map();
const SHAPES = [
  'M50 4 L92 16 V52 C92 76 72 90 50 98 C28 90 8 76 8 52 V16 Z',
  'M12 6 H88 V50 C88 74 71 90 50 98 C29 90 12 74 12 50 Z',
  'M50 3 C72 3 94 12 94 12 C94 60 80 84 50 98 C20 84 6 60 6 12 C6 12 28 3 50 3 Z',
  'O',
  'M10 8 H38 L50 2 L62 8 H90 V48 C90 74 72 90 50 98 C28 90 10 74 10 48 Z',
  'M50 2 L94 20 L84 76 L50 98 L16 76 L6 20 Z',
];
function darker(hex, k = 0.35) { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.round(v * (1 - k)); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
function crestPattern(v, c1, c2) {
  switch (v) {
    case 1: return [0, 1, 2, 3, 4].map((i) => `<rect x="${6 + i * 20}" y="0" width="10" height="100" fill="${c2}"/>`).join('');
    case 2: return [0, 1, 2, 3].map((i) => `<rect x="0" y="${14 + i * 24}" width="100" height="11" fill="${c2}"/>`).join('');
    case 3: return `<polygon points="0,18 18,0 100,82 82,100" fill="${c2}"/>`;
    case 4: return `<rect x="50" y="0" width="50" height="100" fill="${c2}"/>`;
    case 5: return `<rect x="50" y="0" width="50" height="50" fill="${c2}"/><rect x="0" y="50" width="50" height="50" fill="${c2}"/>`;
    case 6: return `<polygon points="0,30 50,62 100,30 100,48 50,80 0,48" fill="${c2}"/>`;
    case 7: return `<rect x="42" y="0" width="16" height="100" fill="${c2}"/><rect x="0" y="40" width="100" height="16" fill="${c2}"/>`;
    case 8: return `<rect x="0" y="0" width="100" height="32" fill="${c2}"/>`;
    default: return '';
  }
}
export function crest(c, size = 36) {
  if (!c) return `<span class="crest" style="width:${size}px;height:${size}px"></span>`;
  if (c.nat && c.flag) return `<span class="crest" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.8)}px;line-height:${size}px;text-align:center;display:inline-block">${c.flag}</span>`;
  const img = IMG.get('c:' + c.key);
  if (img) return `<img class="crest" src="${img}" width="${size}" height="${size}" alt="">`;
  const stars = Math.min(5, (c.troph || []).filter((t) => TOP1.has(t.c)).length);
  const ck = `${c.key || c.name}|${c.c1}|${c.c2}|${c.short}|${size}|${stars}`;
  const hit = CREST_CACHE.get(ck); if (hit) return hit;
  const h = hash(c.key || c.name);
  const c1 = c.c1 || '#444', c2 = c.c2 && c.c2.toLowerCase() !== (c.c1 || '').toLowerCase() ? c.c2 : (lum(c1) > 0.5 ? '#111111' : '#ffffff');
  const shape = SHAPES[h % SHAPES.length]; const v = (h >>> 3) % 9; const emb = (h >>> 7) % 4;
  const id = 'k' + h.toString(36) + size;
  const label = (c.short || c.name.slice(0, 3)).slice(0, 3).toUpperCase();
  const big = size >= 46;
  let svg;
  if (shape === 'O') {
    // escudo redondo com anel e nome em volta
    const name = esc((c.name || '').toUpperCase());
    svg = `<svg class="crest" width="${size}" height="${size}" viewBox="0 0 100 100"><defs><clipPath id="${id}"><circle cx="50" cy="50" r="31"/></clipPath><path id="${id}t" d="M50 50 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0"/><radialGradient id="${id}g" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
<circle cx="50" cy="50" r="48" fill="${darker(c1, 0.15)}" stroke="${c2}" stroke-width="3"/><circle cx="50" cy="50" r="33" fill="none" stroke="${c2}" stroke-width="2"/>
<g clip-path="url(#${id})"><rect width="100" height="100" fill="${c1}"/>${crestPattern(v, c1, c2)}</g>
${big ? `<text font-family="'Barlow Condensed',system-ui,sans-serif" font-weight="800" font-size="10" letter-spacing="1.5" fill="${textOn(darker(c1, 0.15))}"><textPath href="#${id}t" startOffset="0">${name.length > 26 ? name.slice(0, 26) : name} • ${name.length > 26 ? '' : name.length < 14 ? name : ''}</textPath></text>` : ''}
<text x="50" y="${label.length > 2 ? 58 : 60}" text-anchor="middle" font-family="'Barlow Condensed',system-ui,sans-serif" font-weight="900" font-size="${label.length > 2 ? 24 : 28}" fill="#fff" stroke="#000" stroke-opacity=".6" stroke-width="3" paint-order="stroke">${esc(label)}</text>
<circle cx="50" cy="50" r="48" fill="url(#${id}g)"/></svg>`;
  } else {
    const tc = lum(c1) > 0.6 && lum(c2) > 0.6 ? '#111' : '#fff';
    const stroke = `stroke="${tc === '#fff' ? '#000' : '#fff'}" stroke-opacity=".6" stroke-width="3" paint-order="stroke"`;
    let mid;
    if (emb === 1) mid = `<circle cx="50" cy="52" r="20" fill="${darker(c1, 0.25)}" stroke="${c2}" stroke-width="3"/><text x="50" y="${label.length > 2 ? 58 : 60}" text-anchor="middle" font-family="'Barlow Condensed',system-ui,sans-serif" font-weight="900" font-size="${label.length > 2 ? 17 : 22}" fill="${textOn(darker(c1, 0.25))}">${esc(label)}</text>`;
    else if (emb === 2) mid = `<text x="50" y="66" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="900" font-size="46" font-style="italic" fill="${tc}" ${stroke}>${esc(label[0])}</text>`;
    else if (emb === 3) mid = `<rect x="14" y="40" width="72" height="22" fill="${darker(c2 === '#ffffff' ? c1 : c2, 0.2)}" stroke="${c2}" stroke-width="1.5"/><text x="50" y="57.5" text-anchor="middle" font-family="'Barlow Condensed',system-ui,sans-serif" font-weight="900" font-size="18" letter-spacing="2" fill="#fff">${esc(label)}</text>`;
    else mid = `<text x="50" y="${label.length > 2 ? 60 : 62}" text-anchor="middle" font-family="'Barlow Condensed',system-ui,sans-serif" font-weight="900" font-size="${label.length > 2 ? 30 : 36}" fill="${tc}" ${stroke}>${esc(label)}</text>`;
    svg = `<svg class="crest" width="${size}" height="${size}" viewBox="0 0 100 100"><defs><clipPath id="${id}"><path d="${shape}"/></clipPath><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient></defs>
<g clip-path="url(#${id})"><rect width="100" height="100" fill="${c1}"/>${crestPattern(v, c1, c2)}<rect width="100" height="100" fill="url(#${id}g)"/></g>
<path d="${shape}" fill="none" stroke="${c2}" stroke-width="5"/><path d="${shape}" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1.5"/>${mid}</svg>`;
  }
  if (stars) { const w = 9; const x0 = 50 - (stars * w) / 2 + w / 2; const st = Array.from({ length: stars }, (_, i) => `<polygon transform="translate(${x0 + i * w} ${shape === 'O' ? 9 : 0}) scale(.42)" points="0,-10 2.4,-3.1 9.5,-3.1 3.8,1.2 5.9,8.1 0,4 -5.9,8.1 -3.8,1.2 -9.5,-3.1 -2.4,-3.1" fill="#f4c542" stroke="#000" stroke-opacity=".4" stroke-width="1.5"/>`).join('');
    svg = svg.replace('viewBox="0 0 100 100">', 'viewBox="0 -8 100 108">').replace('</svg>', st + '</svg>'); }
  if (CREST_CACHE.size > 3000) CREST_CACHE.clear();
  CREST_CACHE.set(ck, svg); return svg;
}

const SKIN = ['#f6d3b3', '#eec19a', '#e0ac7e', '#c98d5f', '#a86e45', '#8a5533', '#6b3e22', '#4e2c18'];
const HAIR = ['#111', '#1d140e', '#3a2416', '#5b3a22', '#8a5a2b', '#c49a5a', '#d9b36c', '#7a2e12', '#999'];

export function face(p, size = 40, club) {
  return ''; // sem rostos: o jogo mostra apenas os nomes
  if (!p) return `<span class="face" style="width:${size}px;height:${size}px;display:inline-block"></span>`;
  const img = IMG.get('p:' + p.key);
  if (img) return `<img class="face" src="${img}" width="${size}" height="${size}" alt="">`;
  const R = seeded(p.face * 7919 + 13);
  const light = { EN: [0, 3], ES: [0, 4], IT: [0, 4], AR: [0, 4], BR: [0, 8] }[p.nat] || [0, 8];
  let si = Math.floor(light[0] + R() * (light[1] - light[0])); if (p.nat === 'EN' && R() < 0.2) si = 4 + Math.floor(R() * 4);
  const skin = SKIN[si];
  const dark = si >= 5;
  const hc = dark ? HAIR[Math.floor(R() * 2)] : HAIR[Math.floor(R() * (p.age > 33 ? 9 : 8))];
  const style = Math.floor(R() * 7);
  const beard = R() < 0.35, mous = !beard && R() < 0.12;
  const shirt = club?.c1 || '#2a3a35';
  const eyeY = 47, ex = 9 + R() * 2;
  let hair = '';
  if (style === 0) hair = `<path d="M28 40 C28 22 72 22 72 40 C66 30 34 30 28 40Z" fill="${hc}"/>`;
  else if (style === 1) hair = `<path d="M27 44 C24 18 76 18 73 44 C70 33 60 28 50 28 C40 28 30 33 27 44Z" fill="${hc}"/>`;
  else if (style === 2) hair = `<circle cx="50" cy="31" r="21" fill="${hc}"/><circle cx="34" cy="37" r="9" fill="${hc}"/><circle cx="66" cy="37" r="9" fill="${hc}"/>`;
  else if (style === 3) hair = `<path d="M26 52 C20 18 80 18 74 52 L70 40 C62 30 38 30 30 40Z" fill="${hc}"/>`;
  else if (style === 4) hair = '';
  else if (style === 5) hair = `<path d="M44 20 C48 14 52 14 56 20 L56 34 L44 34Z" fill="${hc}"/><path d="M30 40 C32 31 68 31 70 40 C64 35 36 35 30 40Z" fill="${hc}" opacity=".35"/>`;
  else hair = `<path d="M28 42 C26 22 74 22 72 42 C70 30 30 30 28 42Z" fill="${hc}"/><path d="M30 30 L40 24 L46 30 L54 23 L60 30 L70 26 L70 34 L30 34Z" fill="${hc}"/>`;
  const br = beard ? `<path d="M31 52 C32 72 44 80 50 80 C56 80 68 72 69 52 C66 64 60 70 50 70 C40 70 34 64 31 52Z" fill="${hc}" opacity=".9"/>` : mous ? `<path d="M41 62 C46 59 54 59 59 62 C54 61 46 61 41 62Z" fill="${hc}" stroke="${hc}" stroke-width="2"/>` : '';
  return `<svg class="face" width="${size}" height="${size}" viewBox="0 0 100 100"><rect width="100" height="100" fill="#13201c"/>
<path d="M14 100 C16 82 30 76 50 76 C70 76 84 82 86 100Z" fill="${shirt}"/><path d="M42 76 L50 86 L58 76" fill="none" stroke="#0004" stroke-width="3"/>
<rect x="42" y="62" width="16" height="16" fill="${skin}"/><path d="M42 72 C46 76 54 76 58 72 L58 78 L42 78Z" fill="#0002"/>
<ellipse cx="50" cy="48" rx="21" ry="25" fill="${skin}"/><ellipse cx="29" cy="50" rx="4" ry="6" fill="${skin}"/><ellipse cx="71" cy="50" rx="4" ry="6" fill="${skin}"/>
${hair}${br}
<path d="M${50 - ex - 5} ${eyeY - 6} h9 M${50 + ex - 4} ${eyeY - 6} h9" stroke="${hc}" stroke-width="2.6" stroke-linecap="round"/>
<ellipse cx="${50 - ex}" cy="${eyeY}" rx="3.2" ry="2.6" fill="#fff"/><ellipse cx="${50 + ex}" cy="${eyeY}" rx="3.2" ry="2.6" fill="#fff"/>
<circle cx="${50 - ex}" cy="${eyeY}" r="1.8" fill="#2a1a10"/><circle cx="${50 + ex}" cy="${eyeY}" r="1.8" fill="#2a1a10"/>
<path d="M50 49 L47 58 L52 58" fill="none" stroke="#0003" stroke-width="2" stroke-linecap="round"/>
<path d="M44 65 C47 ${R() < 0.5 ? 68 : 66} 53 ${R() < 0.5 ? 68 : 66} 56 65" fill="none" stroke="#6b2b22" stroke-width="2.4" stroke-linecap="round"/></svg>`;
}

export function ovrColor(o) { return o >= 85 ? '#2fe08a' : o >= 78 ? '#8fe06a' : o >= 70 ? '#d7e05a' : o >= 62 ? '#f4c542' : o >= 54 ? '#ff9f43' : '#ff6b5a'; }
export const ovrBadge = (o) => `<span class="ovr" style="background:${ovrColor(o)}">${o}</span>`;
export const FLAG = { BR: '🇧🇷', EN: '🏴', ES: '🇪🇸', IT: '🇮🇹', AR: '🇦🇷' };

export const ICONS = {
  biz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  squad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M17 14c2.3 0 4 1.4 4.6 4"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M7 14h3M7 17h3M13 14h4"/></svg>',
  mkt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h14l-2 9H8L6 3H3"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>',
  tact: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18M3 12h4M17 12h4"/><circle cx="12" cy="12" r="2.5"/></svg>',
  base: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V11"/><path d="M12 11C12 7 9 5 5 5c0 4 3 6 7 6zM12 13c0-3 2.5-5 6-5 0 3.5-2.5 5-6 5z"/></svg>',
  club: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/></svg>',
  career: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="7" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
  world: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>',
};
