// Itens visuais do técnico: molduras, emblemas, faixas, títulos, comemorações de gol, temas e cards.
// Tudo desenhado aqui (SVG + CSS animado). Nada de rostos nem escudos reais.
import { esc } from '../util.js';

export const RARITY = {
  comum: { t: 'Comum', c: '#a7b4ae' }, raro: { t: 'Raro', c: '#4cc9f0' }, epico: { t: 'Épico', c: '#b36bff' }, lendario: { t: 'Lendário', c: '#f4c542' },
  exclusivo: { t: 'Exclusivo', c: '#2fe08a' }, evento: { t: 'Evento', c: '#ff7a59' },
};
export const KINDS = { fr: 'Moldura', em: 'Emblema', ban: 'Faixa', tit: 'Título', gfx: 'Comemoração de gol', th: 'Tema', cd: 'Card' };

// ---------- eventos (estoque pronto para ligar pelo Lumbra Control) ----------
export const EVENTS = {
  natal: { t: 'Natal', c: '#d62839', c2: '#1f7a3e' }, ano: { t: 'Ano Novo', c: '#f4c542', c2: '#4cc9f0' }, carnaval: { t: 'Carnaval', c: '#ff4dd8', c2: '#ffd166' },
  saojoao: { t: 'São João', c: '#ff9100', c2: '#d62839' }, copa: { t: 'Copa do Mundo', c: '#1f9d55', c2: '#ffd400' }, criancas: { t: 'Dia das Crianças', c: '#4cc9f0', c2: '#ff4d6d' },
  halloween: { t: 'Halloween', c: '#ff7a00', c2: '#7b2cbf' }, final: { t: 'Noite de Final', c: '#f4c542', c2: '#0b1210' }, classico: { t: 'Clássico', c: '#d62839', c2: '#1e5bd8' },
};

// ---------- catálogo ----------
// p = preço em Pranfixas (0 = não se compra: ganha jogando/evento); how = como ganhar
export const CAT = [
  // molduras (evolução de animação do Bronze à Lenda)
  { id: 'fr_bronze', k: 'fr', n: 'Bronze', ra: 'comum', p: 300 },
  { id: 'fr_prata', k: 'fr', n: 'Prata', ra: 'raro', p: 700 },
  { id: 'fr_ouro', k: 'fr', n: 'Ouro', ra: 'epico', p: 1500 },
  { id: 'fr_diam', k: 'fr', n: 'Diamante', ra: 'epico', p: 3000 },
  { id: 'fr_neon', k: 'fr', n: 'Neon', ra: 'lendario', p: 5000 },
  { id: 'fr_lenda', k: 'fr', n: 'Lenda', ra: 'lendario', p: 9000 },
  { id: 'ex_desafio', k: 'fr', n: 'Campeão da Semana', ra: 'exclusivo', p: 0, how: 'Termine em 1º no Desafio da Semana' },
  { id: 'ex_liga', k: 'fr', n: 'Campeão de Liga', ra: 'exclusivo', p: 0, how: 'Seja campeão de uma liga com amigos' },
  { id: 'ex_socio', k: 'fr', n: 'Sócio Prancheta', ra: 'exclusivo', p: 0, how: 'Disponível enquanto for Sócio' },
  { id: 'ex_top10', k: 'fr', n: 'Top 10 da Temporada', ra: 'exclusivo', p: 0, how: 'Termine uma temporada do ranking no top 10' },
  // emblemas
  ...[['prancheta', 'Prancheta'], ['apito', 'Apito'], ['chuteira', 'Chuteira'], ['bola', 'Bola clássica'], ['bandeira', 'Bandeira'], ['megafone', 'Megafone'], ['tambor', 'Tambor da torcida'], ['cronometro', 'Cronômetro']].map(([id, n]) => ({ id: 'em_' + id, k: 'em', n, ra: 'comum', p: 150 })),
  ...[['trofeu', 'Taça'], ['sinalizador', 'Sinalizador'], ['lobo', 'Lobo'], ['touro', 'Touro']].map(([id, n]) => ({ id: 'em_' + id, k: 'em', n, ra: 'raro', p: 400 })),
  ...[['aguia', 'Águia'], ['tubarao', 'Tubarão'], ['leao', 'Leão'], ['bolafogo', 'Bola em chamas'], ['raio', 'Raio']].map(([id, n]) => ({ id: 'em_' + id, k: 'em', n, ra: 'epico', p: 900 })),
  ...[['dragao', 'Dragão'], ['fenix', 'Fênix'], ['coroa', 'Coroa'], ['estrela', 'Estrela cadente']].map(([id, n]) => ({ id: 'em_' + id, k: 'em', n, ra: 'lendario', p: 2000 })),
  { id: 'em_medalha', k: 'em', n: 'Medalha de ouro', ra: 'exclusivo', p: 0, how: 'Conquista: vença 25 jogos no Desafio da Semana' },
  { id: 'em_escudo', k: 'em', n: 'Escudo do Sócio', ra: 'exclusivo', p: 0, how: 'Disponível enquanto for Sócio' },
  // faixas (fundo atrás do nome)
  { id: 'ban_noite', k: 'ban', n: 'Estádio à noite', ra: 'raro', p: 500 },
  { id: 'ban_torcida', k: 'ban', n: 'Bandeiras da torcida', ra: 'raro', p: 600 },
  { id: 'ban_papel', k: 'ban', n: 'Papel picado', ra: 'epico', p: 1200 },
  { id: 'ban_chuva', k: 'ban', n: 'Chuva e raios', ra: 'epico', p: 1400 },
  { id: 'ban_fogos', k: 'ban', n: 'Fogos de artifício', ra: 'lendario', p: 2500 },
  { id: 'ban_ouro', k: 'ban', n: 'Ouro puro', ra: 'lendario', p: 3000 },
  // títulos
  ...[['Professor', 200], ['O Estrategista', 300], ['Retranqueiro', 300], ['Futebol Ofensivo', 300], ['O Moderno', 400], ['Pé Quente', 500], ['Mestre da Base', 600], ['Caçador de Títulos', 800], ['Lenda Viva', 1500]].map(([n, p], i) => ({ id: 'tit_' + i, k: 'tit', n, ra: p >= 800 ? 'epico' : p >= 400 ? 'raro' : 'comum', p })),
  { id: 'tit_campsem', k: 'tit', n: 'Campeão da Semana', ra: 'exclusivo', p: 0, how: 'Termine em 1º no Desafio da Semana' },
  { id: 'tit_campliga', k: 'tit', n: 'Rei da Liga', ra: 'exclusivo', p: 0, how: 'Seja campeão de uma liga com amigos' },
  { id: 'tit_lenda', k: 'tit', n: 'Divisão Lenda', ra: 'exclusivo', p: 0, how: 'Chegue à divisão Lenda numa temporada' },
  // comemorações de gol (partida 3D)
  { id: 'g_ouro', k: 'gfx', n: 'Chuva de ouro', ra: 'epico', p: 1200 },
  { id: 'g_fogos', k: 'gfx', n: 'Fogos no estádio', ra: 'epico', p: 1500 },
  { id: 'g_raio', k: 'gfx', n: 'Tempestade de raios', ra: 'lendario', p: 2200 },
  { id: 'g_fogo', k: 'gfx', n: 'Estádio em chamas', ra: 'lendario', p: 2500 },
  { id: 'g_neon', k: 'gfx', n: 'Explosão neon', ra: 'lendario', p: 2500 },
  // temas da tela inicial
  { id: 'th_final', k: 'th', n: 'Noite de Final', ra: 'raro', p: 600 },
  { id: 'th_classico', k: 'th', n: 'Clássico', ra: 'raro', p: 600 },
  { id: 'th_retro', k: 'th', n: 'Retrô', ra: 'epico', p: 900 },
  { id: 'th_neon', k: 'th', n: 'Neon', ra: 'epico', p: 1200 },
  // cards de compartilhar
  { id: 'cd_ouro', k: 'cd', n: 'Card dourado', ra: 'epico', p: 800 },
  { id: 'cd_holo', k: 'cd', n: 'Card holográfico', ra: 'lendario', p: 1600 },
  // estoque de eventos: moldura + emblema + faixa + título para cada tema
  ...Object.entries(EVENTS).flatMap(([e, E]) => [
    { id: 'evf_' + e, k: 'fr', n: 'Moldura ' + E.t, ra: 'evento', p: 1200, ev: e },
    { id: 'eve_' + e, k: 'em', n: 'Emblema ' + E.t, ra: 'evento', p: 700, ev: e },
    { id: 'evb_' + e, k: 'ban', n: 'Faixa ' + E.t, ra: 'evento', p: 900, ev: e },
    { id: 'evt_' + e, k: 'tit', n: { natal: 'Bom Velhinho', ano: 'Virada Campeã', carnaval: 'Rei da Folia', saojoao: 'Arraiá FC', copa: 'Rumo ao Hexa', criancas: 'Craque Mirim', halloween: 'Assombração', final: 'Decisivo', classico: 'Dono do Clássico' }[e], ra: 'evento', p: 400, ev: e },
  ]),
];
export const item = (id) => CAT.find((x) => x.id === id);
export const RA_ORDER = ['comum', 'raro', 'epico', 'lendario', 'exclusivo', 'evento'];

// ---------- emblemas (SVG 64x64) ----------
const D = (id, body, defs = '') => `<svg class="emb emb-${id}" viewBox="0 0 64 64" aria-hidden="true"><defs>${defs}</defs>${body}</svg>`;
const GR = (id, a, b, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const RG = (id, a, b) => `<radialGradient id="${id}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
const GOLD = GR('eg_gold', '#fff1b8', '#c8961a') ;
const FLAME = (x, y, s = 1, cls = 'fl') => `<g class="${cls}" transform="translate(${x} ${y}) scale(${s})"><path d="M0 -14 C6 -6 9 -2 6 5 C4 10 -4 10 -6 5 C-9 -1 -4 -5 0 -14Z" fill="url(#eg_fire)"/><path d="M0 -6 C3 -2 4 1 2 5 C1 7 -2 7 -3 4 C-4 1 -2 -2 0 -6Z" fill="#fff3b0"/></g>`;
const FIRE = `<linearGradient id="eg_fire" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff3d00"/><stop offset=".55" stop-color="#ff9100"/><stop offset="1" stop-color="#ffd600"/></linearGradient>`;
const SPARK = (x, y, s = 1, d = 0) => `<path class="spk" style="animation-delay:${d}s" transform="translate(${x} ${y}) scale(${s})" d="M0 -5 L1.2 -1.2 L5 0 L1.2 1.2 L0 5 L-1.2 1.2 L-5 0 L-1.2 -1.2Z" fill="#fff"/>`;
const BALL = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#eg_ball)" stroke="#1a1a1a" stroke-width="1.2"/><path d="M${cx} ${cy - r * 0.42} l${r * 0.4} ${r * 0.29} l-${r * 0.15} ${r * 0.47} h-${r * 0.5} l-${r * 0.15} -${r * 0.47}Z" fill="#1a1a1a"/><path d="M${cx} ${cy - r * 0.42} V${cy - r} M${cx + r * 0.4} ${cy - r * 0.13} L${cx + r * 0.95} ${cy - r * 0.3} M${cx + r * 0.25} ${cy + r * 0.34} L${cx + r * 0.55} ${cy + r * 0.82} M${cx - r * 0.25} ${cy + r * 0.34} L${cx - r * 0.55} ${cy + r * 0.82} M${cx - r * 0.4} ${cy - r * 0.13} L${cx - r * 0.95} ${cy - r * 0.3}" stroke="#1a1a1a" stroke-width="1.2"/>`;
const BALLG = RG('eg_ball', '#ffffff', '#c9d2dc');
export const EMB = {
  prancheta: () => D('prancheta', `<rect x="14" y="8" width="36" height="50" rx="5" fill="#8a5a2b"/><rect x="18" y="14" width="28" height="40" rx="2" fill="#f4f1e8"/><rect x="24" y="5" width="16" height="8" rx="2" fill="#c9d2dc" stroke="#555" stroke-width="1"/><g stroke="#1f6f4a" stroke-width="2" fill="none" stroke-linecap="round"><circle cx="25" cy="24" r="3"/><path d="M36 21l5 5M41 21l-5 5"/><path d="M26 32 C30 42 36 38 40 46" stroke-dasharray="2 3" class="dash"/><path d="M38 44l3 3-4 1"/></g>`),
  apito: () => D('apito', `<path d="M34 10 C20 18 18 24 18 24" stroke="#d62839" stroke-width="3" fill="none"/><path d="M14 30 a14 14 0 1 0 22 -12 L52 18 L52 28 L38 28" fill="url(#eg_sil)" stroke="#5c6b73" stroke-width="1.5"/><circle cx="23" cy="36" r="5" fill="#2c3a40"/><path d="M18 32 a8 8 0 0 1 6 -6" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>`, GR('eg_sil', '#ffffff', '#8796a0')),
  chuteira: () => D('chuteira', `<path d="M8 38 C10 26 20 22 26 20 L34 18 C38 22 40 28 46 30 L56 34 C60 36 60 44 56 46 L12 46 C8 46 7 42 8 38Z" fill="#14181a"/><path d="M26 24 L44 34" stroke="#2fe08a" stroke-width="3" stroke-linecap="round"/><path d="M22 28 L40 38" stroke="#2fe08a" stroke-width="3" stroke-linecap="round"/><path d="M28 20 l4 8 M32 19 l4 8" stroke="#fff" stroke-width="1.4"/><g fill="#c9d2dc"><rect x="14" y="46" width="4" height="5" rx="1"/><rect x="24" y="46" width="4" height="5" rx="1"/><rect x="40" y="46" width="4" height="5" rx="1"/><rect x="50" y="46" width="4" height="5" rx="1"/></g>`),
  bola: () => D('bola', `<g class="spin-s">${BALL(32, 32, 22)}</g>`, BALLG),
  bandeira: () => D('bandeira', `<rect x="12" y="8" width="3" height="50" rx="1" fill="#c9d2dc"/><path class="wave" d="M15 10 C25 6 33 14 43 10 C47 9 50 9 54 10 L54 34 C50 33 47 33 43 34 C33 38 25 30 15 34Z" fill="url(#eg_flag)"/><path d="M15 22 C25 18 33 26 43 22 C47 21 50 21 54 22" stroke="#fff" stroke-width="3" fill="none" opacity=".85" class="wave"/>`, GR('eg_flag', '#2fe08a', '#127a4a', 1, 0)),
  megafone: () => D('megafone', `<path d="M14 26 L36 14 L36 50 L14 38Z" fill="#ff7a00"/><rect x="8" y="26" width="8" height="12" rx="2" fill="#333"/><ellipse cx="36" cy="32" rx="5" ry="18" fill="#ffb15c"/><path d="M20 38 L22 52 L28 52 L26 41" fill="#333"/><g stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none" class="pulse"><path d="M46 24 q5 8 0 16"/><path d="M52 19 q8 13 0 26"/></g>`),
  tambor: () => D('tambor', `<ellipse cx="32" cy="22" rx="20" ry="7" fill="#f4f1e8" stroke="#8a5a2b" stroke-width="2"/><path d="M12 22 V44 C12 52 52 52 52 44 V22" fill="#d62839"/><path d="M12 22 L20 46 L28 24 L36 48 L44 24 L52 44" stroke="#ffd166" stroke-width="2" fill="none"/><g class="bounce"><path d="M40 4 L30 18" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round"/><circle cx="30" cy="18" r="3" fill="#fff"/></g>`),
  cronometro: () => D('cronometro', `<rect x="28" y="4" width="8" height="6" rx="2" fill="#5c6b73"/><circle cx="32" cy="36" r="22" fill="url(#eg_sil)" stroke="#5c6b73" stroke-width="2"/><circle cx="32" cy="36" r="17" fill="#0b1210"/><g stroke="#2fe08a" stroke-width="1.4">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => `<path d="M32 21 v3" transform="rotate(${i * 30} 32 36)"/>`).join('')}</g><path class="hand" d="M32 36 V23" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="32" cy="36" r="2" fill="#2fe08a"/>`, GR('eg_sil', '#ffffff', '#8796a0')),
  trofeu: () => D('trofeu', `<path d="M18 8h28v12c0 12-6 20-14 22C24 40 18 32 18 20z" fill="url(#eg_gold)"/><path d="M18 12H9c0 9 4 14 10 15M46 12h9c0 9-4 14-10 15" stroke="url(#eg_gold)" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="28" y="42" width="8" height="8" fill="url(#eg_gold)"/><path d="M20 50h24l3 8H17z" fill="url(#eg_gold)"/><rect class="glint" x="20" y="8" width="5" height="30" fill="#fff" opacity=".55" transform="skewX(-18)"/>`, GOLD),
  sinalizador: () => D('sinalizador', `<g class="smoke"><circle cx="32" cy="14" r="8" fill="#ff4d6d" opacity=".35"/><circle cx="38" cy="8" r="6" fill="#ff4d6d" opacity=".25"/><circle cx="26" cy="6" r="5" fill="#ff4d6d" opacity=".2"/></g><rect x="28" y="28" width="8" height="30" rx="2" fill="#333"/><rect x="28" y="40" width="8" height="5" fill="#ffd166"/><g class="flick"><circle cx="32" cy="24" r="9" fill="#ff1f4b" opacity=".6"/><circle cx="32" cy="24" r="5" fill="#ffd1dc"/></g>`),
  lobo: () => D('lobo', `<path d="M14 8 L24 22 L40 22 L50 8 L52 30 C52 44 42 56 32 58 C22 56 12 44 12 30Z" fill="url(#eg_wolf)"/><path d="M20 14 L25 22 M44 14 L39 22" stroke="#2c3a40" stroke-width="2"/><path d="M22 32 L28 34 M42 32 L36 34" stroke="#fff" stroke-width="3" stroke-linecap="round" class="eyes"/><path d="M24 40 C28 46 36 46 40 40 L32 54Z" fill="#dfe7eb"/><path d="M29 44 h6 l-3 4z" fill="#14181a"/>`, GR('eg_wolf', '#9aa8b0', '#4a5960')),
  touro: () => D('touro', `<path d="M8 14 C10 24 18 26 22 24 M56 14 C54 24 46 26 42 24" stroke="#f4f1e8" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M20 22 C20 16 44 16 44 22 L46 40 C46 52 40 58 32 58 C24 58 18 52 18 40Z" fill="url(#eg_bull)"/><ellipse cx="32" cy="48" rx="10" ry="7" fill="#c97b63"/><circle cx="28" cy="48" r="2" fill="#3a1f1a"/><circle cx="36" cy="48" r="2" fill="#3a1f1a"/><path d="M24 32 l5 2 M40 32 l-5 2" stroke="#ffd166" stroke-width="3" stroke-linecap="round"/><g class="steam" fill="#fff" opacity=".6"><circle cx="22" cy="56" r="3"/><circle cx="42" cy="56" r="3"/></g>`, GR('eg_bull', '#8b3a2b', '#4a1a12')),
  aguia: () => D('aguia', `<g class="wingL"><path d="M30 30 C20 18 8 18 2 22 C8 24 10 28 6 32 C12 32 14 34 12 38 C20 36 26 36 30 34Z" fill="url(#eg_wing)"/></g><g class="wingR"><path d="M34 30 C44 18 56 18 62 22 C56 24 54 28 58 32 C52 32 50 34 52 38 C44 36 38 36 34 34Z" fill="url(#eg_wing)"/></g><path d="M26 30 C26 20 38 20 38 30 L38 44 C38 52 34 56 32 58 C30 56 26 52 26 44Z" fill="#5a3a1a"/><path d="M27 22 C27 14 37 14 37 22 C37 26 34 28 32 28 C30 28 27 26 27 22Z" fill="#fff"/><path d="M32 22 L38 25 L33 28Z" fill="#ffb400"/><circle cx="30" cy="21" r="1.6" fill="#14181a"/>`, GR('eg_wing', '#8a5a2b', '#3a2410')),
  tubarao: () => D('tubarao', `<g class="swim"><path d="M6 36 C18 26 38 24 54 32 C58 34 60 36 58 38 C44 44 22 44 6 36Z" fill="url(#eg_shark)"/><path d="M30 28 L36 10 L42 30Z" fill="#4a6b80"/><path d="M6 36 L0 28 L2 38 L0 46Z" fill="#4a6b80"/><path d="M14 38 C26 42 40 42 54 37" stroke="#fff" stroke-width="2" opacity=".7" fill="none"/><circle cx="50" cy="33" r="1.6" fill="#0b1210"/><path d="M44 38 l2 2 2 -2 2 2" stroke="#fff" stroke-width="1" fill="none"/></g><path class="wv" d="M0 54 Q8 50 16 54 T32 54 T48 54 T64 54" stroke="#4cc9f0" stroke-width="3" fill="none"/>`, GR('eg_shark', '#7fa3b8', '#3a5a6d')),
  leao: () => D('leao', `<g class="mane">${Array.from({ length: 14 }, (_, i) => `<path d="M32 4 L37 16 L27 16Z" fill="${i % 2 ? '#e07a10' : '#c25a00'}" transform="rotate(${i * 25.7} 32 32)"/>`).join('')}</g><circle cx="32" cy="32" r="17" fill="url(#eg_lion)"/><circle cx="26" cy="29" r="2.4" fill="#2a1a0a"/><circle cx="38" cy="29" r="2.4" fill="#2a1a0a"/><path d="M28 38 h8 l-4 4z" fill="#3a1f1a"/><path d="M32 42 C30 46 26 46 25 44 M32 42 C34 46 38 46 39 44" stroke="#3a1f1a" stroke-width="1.5" fill="none"/>`, RG('eg_lion', '#ffd27a', '#e0a040')),
  bolafogo: () => D('bolafogo', `${FLAME(20, 22, 1.3)}${FLAME(44, 22, 1.3, 'fl d2')}${FLAME(32, 16, 1.6, 'fl d3')}<g class="spin-s">${BALL(32, 38, 17)}</g>`, BALLG + FIRE),
  raio: () => D('raio', `<circle cx="32" cy="32" r="26" fill="#1e5bd8" opacity=".18" class="flash"/><path d="M36 4 L14 36 H30 L24 60 L50 26 H34Z" fill="url(#eg_bolt)" stroke="#fff" stroke-width="1.5" stroke-linejoin="round" class="bolt"/>`, GR('eg_bolt', '#ffffff', '#ffd400')),
  dragao: () => D('dragao', `<g class="breath">${FLAME(56, 40, 0.9, 'fl')}${FLAME(60, 34, 0.7, 'fl d2')}</g><path d="M6 50 C8 30 20 14 36 14 C46 14 52 22 52 30 L48 34 L52 38 C48 44 40 44 34 42 L28 56 L18 50 L10 58Z" fill="url(#eg_drag)"/><path d="M30 14 L26 2 L36 12 M40 15 L42 4 L46 17" fill="#1f6f4a"/><circle cx="40" cy="26" r="2.4" fill="#ffd400"/><path d="M36 22 L44 22" stroke="#0b1210" stroke-width="1.5"/><path d="M14 40 C20 36 24 38 26 42" stroke="#9ff3c8" stroke-width="2" fill="none"/>`, GR('eg_drag', '#2fe08a', '#0b4d2c') + FIRE),
  fenix: () => D('fenix', `<g class="wingL">${FLAME(14, 30, 1.6, 'fl')}<path d="M30 34 C20 22 8 16 2 20 C8 26 10 32 16 38 C20 40 26 40 30 38Z" fill="url(#eg_fire)"/></g><g class="wingR">${FLAME(50, 30, 1.6, 'fl d2')}<path d="M34 34 C44 22 56 16 62 20 C56 26 54 32 48 38 C44 40 38 40 34 38Z" fill="url(#eg_fire)"/></g><path d="M28 30 C28 20 36 20 36 30 L36 46 L40 58 L32 52 L24 58 L28 46Z" fill="#ff9100"/><path d="M29 22 C29 16 35 16 35 22 C35 25 33 27 32 27 C31 27 29 25 29 22Z" fill="#ffd600"/><path d="M32 21 L37 23 L33 25Z" fill="#fff"/>`, FIRE),
  coroa: () => D('coroa', `<circle cx="32" cy="34" r="26" fill="#f4c542" opacity=".2" class="glow"/><path d="M8 46 L6 18 L20 30 L32 10 L44 30 L58 18 L56 46Z" fill="url(#eg_gold)" stroke="#8a5d0c" stroke-width="1.5"/><rect x="8" y="46" width="48" height="8" rx="2" fill="url(#eg_gold)" stroke="#8a5d0c" stroke-width="1.5"/><circle cx="32" cy="36" r="5" fill="#d62839" class="gem"/><circle cx="18" cy="40" r="3.5" fill="#1e5bd8" class="gem d2"/><circle cx="46" cy="40" r="3.5" fill="#1f9d55" class="gem d3"/>${SPARK(14, 14, 1, 0)}${SPARK(50, 12, 0.8, 0.6)}${SPARK(56, 52, 0.7, 1.1)}`, GOLD),
  estrela: () => D('estrela', `<path class="trail" d="M4 60 L30 30" stroke="url(#eg_trail)" stroke-width="10" stroke-linecap="round"/><path class="star" d="M40 6 L45 18 L58 19 L48 27 L51 40 L40 33 L29 40 L32 27 L22 19 L35 18Z" fill="url(#eg_gold)" stroke="#fff" stroke-width="1.2"/>${SPARK(16, 40, 0.8, 0.2)}${SPARK(54, 50, 0.9, 0.9)}${SPARK(10, 18, 0.7, 1.4)}`, GOLD + `<linearGradient id="eg_trail" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#4cc9f0" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".9"/></linearGradient>`),
  medalha: () => D('medalha', `<path d="M20 2h10l6 22h-10zM44 2H34l-6 22h10z" fill="#1f9d55"/><circle cx="32" cy="40" r="18" fill="url(#eg_gold)" stroke="#8a5d0c" stroke-width="1.5"/><path d="M32 30l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#fff" opacity=".85"/><rect class="glint" x="20" y="24" width="4" height="34" fill="#fff" opacity=".5" transform="skewX(-18)"/>`, GOLD),
  escudo: () => D('escudo', `<path d="M32 4 L54 12 V30 C54 46 44 56 32 60 C20 56 10 46 10 30 V12Z" fill="url(#eg_gold)" stroke="#8a5d0c" stroke-width="2"/><path d="M32 12 L46 17 V30 C46 41 40 48 32 52 C24 48 18 41 18 30 V17Z" fill="#0b1210"/><path d="M32 20 l3.5 7 8 1-6 5.5 1.5 8-7-4-7 4 1.5-8-6-5.5 8-1z" fill="url(#eg_gold)" class="pulse"/>`, GOLD),
  // eventos
  ev_natal: () => D('ev_natal', `<path d="M32 6 L50 30 H42 L54 46 H10 L22 30 H14Z" fill="#1f7a3e"/><rect x="28" y="46" width="8" height="10" fill="#8a5a2b"/>${[[24, 26, '#ffd400'], [38, 24, '#ff4d6d'], [20, 40, '#4cc9f0'], [32, 36, '#ffd400'], [44, 40, '#ff4d6d'], [28, 44, '#fff']].map(([x, y, c], i) => `<circle class="blink" style="animation-delay:${i * 0.25}s" cx="${x}" cy="${y}" r="2.4" fill="${c}"/>`).join('')}<path class="star" d="M32 0 l2.4 5 5.6 .6-4 3.8 1 5.6-5-2.8-5 2.8 1-5.6-4-3.8 5.6-.6z" fill="#ffd400"/>`),
  ev_ano: () => D('ev_ano', `${[[20, 20, '#ff4d6d', 0], [44, 18, '#ffd166', 0.5], [32, 40, '#4cc9f0', 1]].map(([x, y, c, d]) => `<g class="burst" style="animation-delay:${d}s;transform-origin:${x}px ${y}px">${Array.from({ length: 10 }, (_, i) => `<path d="M${x} ${y} l0 -11" stroke="${c}" stroke-width="2.4" stroke-linecap="round" transform="rotate(${i * 36} ${x} ${y})"/>`).join('')}<circle cx="${x}" cy="${y}" r="2.5" fill="#fff"/></g>`).join('')}<text x="32" y="62" text-anchor="middle" font-size="11" font-weight="900" fill="#f4c542">2027</text>`),
  ev_carnaval: () => D('ev_carnaval', `<path d="M6 26 C14 18 26 22 32 28 C38 22 50 18 58 26 C58 40 46 44 38 38 C34 36 30 36 26 38 C18 44 6 40 6 26Z" fill="url(#eg_mask)"/><ellipse cx="20" cy="30" rx="6" ry="4" fill="#0b1210"/><ellipse cx="44" cy="30" rx="6" ry="4" fill="#0b1210"/><g class="feath"><path d="M50 20 C54 6 62 4 62 4 C60 12 58 18 52 24" fill="#4cc9f0"/><path d="M46 20 C46 8 52 2 52 2 C54 10 52 16 48 22" fill="#ffd166"/></g>${SPARK(10, 46, 0.8, 0)}${SPARK(32, 50, 0.7, 0.5)}${SPARK(54, 48, 0.8, 1)}`, GR('eg_mask', '#ff4dd8', '#7b2cbf', 1, 0)),
  ev_saojoao: () => D('ev_saojoao', `<g>${FLAME(32, 38, 1.8, 'fl')}${FLAME(24, 42, 1.1, 'fl d2')}${FLAME(40, 42, 1.1, 'fl d3')}</g><path d="M14 56 L50 46 M14 46 L50 56" stroke="#8a5a2b" stroke-width="5" stroke-linecap="round"/><path class="wave" d="M2 8 L62 8" stroke="#555" stroke-width="1"/>${['#d62839', '#ffd400', '#1f9d55', '#1e5bd8', '#ff7a00'].map((c, i) => `<path class="wave" style="animation-delay:${i * 0.15}s" d="M${4 + i * 12} 8 l5 9 l5 -9z" fill="${c}"/>`).join('')}`, FIRE),
  ev_copa: () => D('ev_copa', `<g class="spin-s">${BALL(32, 34, 20)}</g><path d="M12 34 A20 20 0 0 1 52 34" stroke="#1f9d55" stroke-width="4" fill="none" opacity=".9"/><path d="M12 34 A20 20 0 0 0 52 34" stroke="#ffd400" stroke-width="4" fill="none" opacity=".9"/>${[[16, 8], [32, 4], [48, 8]].map(([x, y], i) => `<path class="blink" style="animation-delay:${i * 0.3}s" d="M${x} ${y - 4} l1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.4-2.5 1.4.6-2.8-2.1-1.9 2.8-.3z" fill="#ffd400"/>`).join('')}`, BALLG),
  ev_criancas: () => D('ev_criancas', `<g class="float"><path d="M32 4 L52 24 L32 44 L12 24Z" fill="url(#eg_kite)"/><path d="M32 4 V44 M12 24 H52" stroke="#fff" stroke-width="1.5" opacity=".8"/><path d="M32 44 C28 50 36 54 30 60" stroke="#fff" stroke-width="1.5" fill="none"/>${['#ffd400', '#4cc9f0', '#ff4d6d'].map((c, i) => `<path d="M${30 - i} ${50 + i * 4} l4 -2 v4z" fill="${c}"/>`).join('')}</g>`, GR('eg_kite', '#ff4d6d', '#4cc9f0', 1, 1)),
  ev_halloween: () => D('ev_halloween', `<path d="M32 12 C36 8 40 8 40 8 C38 10 36 12 34 14" stroke="#1f7a3e" stroke-width="3" fill="none"/><ellipse cx="32" cy="38" rx="24" ry="20" fill="url(#eg_pump)"/><path d="M20 22 C18 30 18 46 20 54 M44 22 C46 30 46 46 44 54 M32 18 V58" stroke="#b34700" stroke-width="1.5" fill="none" opacity=".6"/><g class="glowin"><path d="M20 34 l6 -5 l2 7z M44 34 l-6 -5 l-2 7z" fill="#ffd600"/><path d="M20 44 q12 10 24 0 l-4 3 -4 -3 -4 3 -4 -3 -4 3z" fill="#ffd600"/></g><g class="batf"><path d="M50 8 q3 -4 6 0 q3 -4 6 0 q-6 2 -6 6 q0 -4 -6 -6" fill="#2a1a3a"/></g>`, RG('eg_pump', '#ffa53d', '#e05a00')),
  ev_final: () => D('ev_final', `<path class="beam" d="M6 4 L26 60 L38 60 Z" fill="#fff" opacity=".18"/><path class="beam d2" d="M58 4 L38 60 L26 60 Z" fill="#fff" opacity=".18"/><path d="M22 22h20v8c0 9-4 14-10 15-6-1-10-6-10-15z" fill="url(#eg_gold)"/><path d="M22 25h-6c0 6 3 9 7 10M42 25h6c0 6-3 9-7 10" stroke="url(#eg_gold)" stroke-width="3" fill="none"/><rect x="29" y="45" width="6" height="6" fill="url(#eg_gold)"/><rect x="24" y="51" width="16" height="6" rx="1" fill="#3a2a10"/>${SPARK(14, 30, 0.8, 0)}${SPARK(50, 34, 0.8, 0.7)}`, GOLD),
  ev_classico: () => D('ev_classico', `<path d="M32 4 L54 12 V30 C54 46 44 56 32 60Z" fill="#1e5bd8"/><path d="M32 4 L10 12 V30 C10 46 20 56 32 60Z" fill="#d62839"/><path class="bolt" d="M36 10 L24 34 H32 L28 54 L42 28 H34Z" fill="#ffd400" stroke="#fff" stroke-width="1.2"/>`),
};
export function emblemSvg(id) { const k = String(id || '').replace(/^em_/, '').replace(/^eve_/, 'ev_'); const f = EMB[k]; return f ? f() : ''; }

// ---------- decoração das molduras ----------
const LAUREL = `<svg class="fd fd-laurel" viewBox="0 0 100 100"><g fill="#f4c542">${Array.from({ length: 7 }, (_, i) => `<ellipse cx="${18 + i * 3.4}" cy="${86 - i * 9}" rx="3.2" ry="7" transform="rotate(${-30 + i * 9} ${18 + i * 3.4} ${86 - i * 9})"/><ellipse cx="${82 - i * 3.4}" cy="${86 - i * 9}" rx="3.2" ry="7" transform="rotate(${30 - i * 9} ${82 - i * 3.4} ${86 - i * 9})"/>`).join('')}</g></svg>`;
const CROWN = `<svg class="fd fd-crown" viewBox="0 0 40 26"><path d="M3 24 L1 6 L11 14 L20 1 L29 14 L39 6 L37 24Z" fill="#f4c542" stroke="#8a5d0c" stroke-width="1.4"/><circle cx="20" cy="17" r="3" fill="#d62839"/><circle cx="10" cy="19" r="2" fill="#b36bff"/><circle cx="30" cy="19" r="2" fill="#4cc9f0"/></svg>`;
const SHARDS = `<div class="fd fd-orbit">${[0, 90, 180, 270].map((r) => `<i style="--r:${r}deg"></i>`).join('')}</div>`;
const TWINK = (n = 3) => `<div class="fd fd-twk">${Array.from({ length: n }, (_, i) => `<i style="--a:${i * (360 / n) + 20}deg;--d:${i * 0.55}s"></i>`).join('')}</div>`;
const RISE = (n = 8) => `<div class="fd fd-rise">${Array.from({ length: n }, (_, i) => `<i style="--x:${10 + ((i * 37) % 80)}%;--d:${(i * 0.37) % 2.4}s"></i>`).join('')}</div>`;
const FALL = (n = 8) => `<div class="fd fd-fall">${Array.from({ length: n }, (_, i) => `<i style="--x:${5 + ((i * 41) % 90)}%;--d:${(i * 0.43) % 3}s"></i>`).join('')}</div>`;
const RIB = (t) => `<span class="fd fd-rib">${t}</span>`;
const ZAP = `<svg class="fd fd-zap" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="6 14 2 20" stroke-linecap="round"/></svg>`;
const FRAME_DECO = {
  fr_bronze: '', fr_prata: '', fr_ouro: LAUREL + TWINK(2), fr_diam: SHARDS + TWINK(4), fr_neon: ZAP + TWINK(3), fr_lenda: CROWN + RISE(10) + TWINK(4),
  ex_desafio: RIB('1º') + TWINK(3), ex_liga: RIB('LIGA') + LAUREL, ex_socio: RIB('SÓCIO') + TWINK(3), ex_top10: RIB('TOP 10') + RISE(8),
  evf_natal: FALL(10), evf_ano: TWINK(5), evf_carnaval: FALL(12), evf_saojoao: RISE(8), evf_copa: TWINK(4), evf_criancas: RISE(6), evf_halloween: RISE(6), evf_final: LAUREL + TWINK(3), evf_classico: ZAP,
};

// ---------- avatar (moldura + emblema/inicial) ----------
export function avatar(o = {}, size = 44) {
  const fr = o.fr || '', em = o.em || '';
  const inner = em && emblemSvg(em) ? emblemSvg(em) : `<b>${esc(String(o.n || '?').trim()[0] || '?').toUpperCase()}</b>`;
  const evk = fr.startsWith('evf_') ? fr.slice(4) : '';
  const st = evk ? `;--e1:${EVENTS[evk]?.c};--e2:${EVENTS[evk]?.c2}` : '';
  return `<span class="avx ${fr ? 'F-' + fr : 'F-none'}${evk ? ' F-ev' : ''}${o.still ? ' still' : ''}" style="--s:${size}px${st}"><i class="avx-ring"></i><span class="avx-in">${inner}</span>${FRAME_DECO[fr] || ''}${o.vip ? '<i class="avx-vip">★</i>' : ''}</span>`;
}
// fundo animado (faixa) para colocar atrás de um bloco
export function bannerCls(id) { if (!id) return ''; if (id.startsWith('evb_')) return `ban ban-ev ban-ev-${id.slice(4)}`; return `ban ${id.replace('_', '-')}`; }
export function bannerStyle(id) { if (!id || !id.startsWith('evb_')) return ''; const E = EVENTS[id.slice(4)]; return E ? `--e1:${E.c};--e2:${E.c2}` : ''; }
export function bannerFx(id) {
  if (!id) return '';
  if (id === 'ban_papel' || id === 'evb_carnaval' || id === 'evb_natal') return `<span class="ban-fx">${Array.from({ length: 14 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i * 0.31) % 3}s;--c:${['#ffd166', '#2fe08a', '#ff4d6d', '#4cc9f0', '#fff'][i % 5]}"></i>`).join('')}</span>`;
  if (id === 'ban_fogos' || id === 'evb_ano') return `<span class="ban-fw">${[12, 48, 82].map((x, i) => `<i style="--x:${x}%;--d:${i * 0.7}s"></i>`).join('')}</span>`;
  if (id === 'ban_chuva') return `<span class="ban-rain"></span><span class="ban-bolt"></span>`;
  return '';
}
export function titleTag(id) { const it = item(id); return it && it.k === 'tit' ? `<span class="tit-tag ra-${it.ra}">${esc(it.n)}</span>` : ''; }
export const cosStr = (eq) => [eq.fr || '', eq.em || '', eq.ban || '', eq.tit || ''].join('.').slice(0, 60);
export const cosParse = (s) => { const [fr, em, ban, tit] = String(s || '').split('.'); return { fr, em, ban, tit }; };
// prévia de um item qualquer
export function preview(it, eq = {}, n = 'T', size = 64) {
  if (!it) return '';
  if (it.k === 'fr') return avatar({ fr: it.id, em: eq.em, n }, size);
  if (it.k === 'em') return avatar({ fr: eq.fr, em: it.id, n }, size);
  if (it.k === 'ban') return `<span class="ban-prev ${bannerCls(it.id)}" style="${bannerStyle(it.id)}">${bannerFx(it.id)}<b>${esc(n)}</b></span>`;
  if (it.k === 'tit') return `<span class="tit-prev">${titleTag(it.id)}</span>`;
  if (it.k === 'gfx') return `<span class="gfx-prev gfx-${it.id}"><i></i><i></i><i></i><i></i><i></i><i></i><b>GOL!</b></span>`;
  if (it.k === 'th') return `<span class="th-prev ${it.id}"><i></i><b>PRANCHETA</b></span>`;
  if (it.k === 'cd') return `<span class="cd-prev ${it.id}"><b>${esc(n)}</b><small>CARD DO TÉCNICO</small></span>`;
  return '';
}
window.PCOSCAT = { CAT, item, avatar, emblemSvg, preview };
