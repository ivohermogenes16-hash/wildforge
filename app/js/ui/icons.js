// Ícones vetoriais no lugar de emojis: todo emoji que aparecer na tela vira um ícone desenhado no estilo do jogo.
const P = {
  shirt: '<path d="M8 3l-5 3 2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  wand: '<path d="M4 20L16 8M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 11l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5z"/>',
  pin: '<path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 4.5h-5L8 10z"/><path d="M12 3v4M21 10.5l-5-.5M18 19l-3.5-4.5M6 19l3.5-4.5M3 10.5l5-.5"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
  brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
  building: '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M2 21h20M8 8h3M8 12h3M8 16h3"/>',
  deal: '<path d="M3 11l4-4 3 2 3-2 4 4"/><path d="M7 7l-4 4 6 6a2 2 0 0 0 3 0l6-6-4-4"/><path d="M10 14l2 2M12 12l2 2"/>',
  pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  sprout: '<path d="M12 21v-9"/><path d="M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z"/>',
  swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  scale: '<path d="M12 3v18M5 21h14M6 7h12M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',
  swords: '<path d="M4 4l10 10M20 4L10 14M14 14l2 2-2 2 4 2 2-4-2 2-2-2M10 14l-2 2 2 2-4 2-2-4 2 2 2-2"/>',
  dot: '<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>',
  card: '<rect x="7" y="3" width="10" height="16" rx="2" fill="currentColor" stroke="none" transform="rotate(8 12 12)"/>',
  med: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M12 10v7M8.5 13.5h7"/>',
  flame: '<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-9-1 2-2 3-3 3 0-3-1-5-3-7 0 4-4 6-4 13 0 4 3 7 7 7z"/>',
  up: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  down: '<path d="M3 7l6 6 4-4 8 8M15 17h6v-6"/>',
  star: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.3 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.7l6.2-.9z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
  tool: '<path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3z"/><path d="M14.5 6.5L17 4l3 3-2.5 2.5"/>',
  arrowUp: '<path d="M12 20V4M5 11l7-7 7 7"/>',
  arrowDown: '<path d="M12 4v16M5 13l7 7 7-7"/>',
  arrowRight: '<path d="M4 12h16M13 5l7 7-7 7"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  call: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  mega: '<path d="M3 11v3l11 5V6L3 11zM14 8a4 4 0 0 1 0 8M6 13l1.5 6h2.5l-1-5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>',
  stadium: '<ellipse cx="12" cy="9" rx="9" ry="4"/><path d="M3 9v6c0 2.2 4 4 9 4s9-1.8 9-4V9M7 12.5v4M12 13v5M17 12.5v4"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14c1 1.5 2.4 2 4 2s3-.5 4-2M9 9.5v.5M15 9.5v.5"/>',
  frown: '<circle cx="12" cy="12" r="9"/><path d="M8 16c1-1.5 2.4-2 4-2s3 .5 4 2M9 9.5v.5M15 9.5v.5"/>',
  meh: '<circle cx="12" cy="12" r="9"/><path d="M8.5 15h7M9 9.5v.5M15 9.5v.5"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
  flask: '<path d="M9 3h6M10 3v6L4 19a1.5 1.5 0 0 0 1.3 2h13.4A1.5 1.5 0 0 0 20 19l-6-10V3M7 15h10"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M2 20h20"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  ffwd: '<path d="M3 5l9 7-9 7zM12 5l9 7-9 7z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  home: '<path d="M3 11l9-8 9 8M5 9v12h14V9"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  cap: '<path d="M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7v.5M12 17v.5"/>',
  expand: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  medal: '<circle cx="12" cy="15" r="6"/><path d="M8 3l4 6 4-6M12 12.5v5"/>',
  tag: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  dumbbell: '<path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  bench: '<path d="M3 10h18M5 10v8M19 10v8M3 14h18M6 6h12v4"/>',
  school: '<path d="M3 21h18M5 21V10l7-5 7 5v11M10 21v-5h4v5"/>',
  hand: '<path d="M8 13V5a1.5 1.5 0 0 1 3 0v6M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V6a1.5 1.5 0 0 1 3 0v8c0 4-3 7-6.5 7S5 18 4 15l-1-3a1.5 1.5 0 0 1 2.5-1.5L8 13"/>',
  fist: '<path d="M7 11V8a2 2 0 0 1 4 0v3M11 10V7a2 2 0 0 1 4 0v4M15 10a2 2 0 0 1 4 0v4c0 4-3 7-7 7s-7-3-7-7v-3a2 2 0 0 1 4 0"/>',
  gift: '<rect x="3" y="8" width="18" height="4"/><path d="M5 12v9h14v-9M12 8v13M12 8c-2-4-6-4-6-1s4 1 6 1c2 0 6 2 6-1s-4-3-6 1"/>',
  new: '<rect x="2" y="7" width="20" height="10" rx="3"/><path d="M6 14v-4l3 4v-4M12 14h3M12 10h3M12 12h2.5M17 10l1 4 1-2.5 1 2.5 1-4" stroke-width="1.3"/>',
  rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 15l-3-3c1.5-4 6-9 14-9 0 8-5 12.5-9 14z"/><circle cx="15" cy="9" r="1.8"/>',
};
// emoji -> [ícone, cor]
const E = {};
const add = (list, name, tone = '') => { for (const e of list) E[e] = [name, tone]; };
add(['🏆', '🥇', '🏅', '👑'], 'trophy', 'gold'); add(['🥈'], 'medal', 'silver'); add(['🥉'], 'medal', 'bronze');
add(['⚽'], 'ball'); add(['✅', '✔', '✓', '☑'], 'check', 'ok'); add(['❌', '✕', '🚫', '🙅', '📵'], 'x', 'bad');
add(['🌍', '🌎', '🌏', '✈'], 'globe', 'blue'); add(['💼', '👔', '🕴', '🎩'], 'brief'); add(['🏢', '🏦', '🏭', '🏛'], 'building');
add(['🤝'], 'deal', 'ok'); add(['✍', '✏'], 'pen'); add(['📄', '📋', '📰', '🗞'], 'doc'); add(['🌱'], 'sprout', 'ok');
add(['🔁', '🔄', '↺', '🔀', '↩'], 'swap', 'blue'); add(['💰', '💸', '💵', '💲', '💎'], 'coin', 'gold'); add(['⚡'], 'bolt', 'gold');
add(['⚖'], 'scale'); add(['💾', '📂'], 'save'); add(['⚠', '🚨'], 'alert', 'warn'); add(['⏰', '⏳', '⌛'], 'clock', 'warn');
add(['🧑', '👋', '🕵', '🧑‍💼'], 'user'); add(['⚔', '🥊'], 'swords', 'bad'); add(['🟢'], 'dot', 'ok'); add(['🔴'], 'dot', 'bad'); add(['🟡'], 'dot', 'warn');
add(['🟥'], 'card', 'bad'); add(['🟨'], 'card', 'warn'); add(['🩹', '🚑'], 'med', 'bad'); add(['🔥', '🤯'], 'flame', 'hot'); add(['📈', '🚀'], 'up', 'ok');
add(['📉', '💔'], 'down', 'bad'); add(['★', '⭐', '🌟', '✨'], 'star', 'gold'); add(['🎖', '🎯'], 'target'); add(['🏗', '🚧'], 'tool');
add(['⬆', '🔼'], 'arrowUp', 'ok'); add(['⬇', '↓', '👇', '🔽'], 'arrowDown', 'bad'); add(['→', '➜', '👉', '➡'], 'arrowRight');
add(['📱', '🤳'], 'phone'); add(['📞', '☎'], 'call'); add(['📣', '📢'], 'mega'); add(['🎤', '🎙', '🗣'], 'mic'); add(['💬'], 'chat');
add(['📩', '✉', '📨'], 'mail'); add(['🔔'], 'bell'); add(['🏟'], 'stadium'); add(['📸', '🎥', '🎬', '🖼', '📷'], 'camera');
add(['😀', '🙂', '😍', '😉', '😂', '😄', '😁'], 'smile', 'ok'); add(['😠', '😱', '😬', '😞', '😔', '😡', '😤'], 'frown', 'bad'); add(['😐', '🤔', '😮', '😴', '🙄'], 'meh', 'warn');
add(['❤', '💚', '💛', '🧡', '💙', '💜'], 'heart', 'hot'); add(['👍', '💪', '💯', '✋', '🙌'], 'fist', 'ok'); add(['🧠', '💡'], 'bulb', 'gold'); add(['🧪'], 'flask');
add(['📊'], 'chart'); add(['🧤', '🛡'], 'shield'); add(['🎉', '🎊'], 'spark', 'gold'); add(['🎁'], 'gift', 'gold'); add(['⏸'], 'pause'); add(['▶'], 'play'); add(['⏩', '⏭'], 'ffwd');
add(['⚙'], 'gear'); add(['🏠'], 'home'); add(['📅', '🗓'], 'cal'); add(['🎓', '🧢'], 'cap'); add(['❓', '❔'], 'help', 'blue'); add(['⛶'], 'expand');
add(['🏳', '🏁', '🚩'], 'flag'); add(['🎵', '🎶'], 'music'); add(['💨'], 'wind'); add(['🔎', '🔍', '🔭'], 'search'); add(['🏷'], 'tag'); add(['🏋'], 'dumbbell');
add(['👕', '👚'], 'shirt'); add(['📦'], 'box'); add(['🪄'], 'wand', 'gold'); add(['🩺'], 'med', 'bad'); add(['🎫', '🎟'], 'tag'); add(['🎨'], 'spark', 'gold'); add(['🧗'], 'up', 'ok'); add(['⏱'], 'clock'); add(['🧘', '🧊'], 'meh'); add(['🛡️'], 'shield'); add(['👏'], 'fist', 'ok'); add(['📺'], 'camera'); add(['👀'], 'eye'); add(['🪑'], 'bench'); add(['🏫'], 'school'); add(['🆕'], 'new', 'ok'); add(['⬜'], 'dot', 'mut'); add(['☆'], 'star', 'mut'); add(['🧑‍🏫'], 'user');
const CACHE = {};
export function icon(name, tone = '') { const k = name + tone; return CACHE[k] ||= `<svg class="ic ${tone}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.dot}</svg>`; }
// bandeiras (dois indicadores regionais) viram uma etiqueta com a sigla do país
const FLAG_RE = /([\u{1F1E6}-\u{1F1FF}])([\u{1F1E6}-\u{1F1FF}])/u;
const RX = /(\p{Regional_Indicator}{2}|🏴(?:\u{E0067}\u{E0062}[\u{E0061}-\u{E007A}]+\u{E007F})?|(?:\p{Extended_Pictographic}|[★☆→↓↺✓✔✕⛶])(?:️|‍(?:\p{Extended_Pictographic})️?)*)/gu;
function cc(ri) { return String.fromCharCode(ri.codePointAt(0) - 0x1F1E6 + 65); }
function toHTML(m) {
  const f = m.match(FLAG_RE); if (f) return `<span class="flagc">${cc(f[1])}${cc(f[2])}</span>`;
  if (m.startsWith('🏴')) return '<span class="flagc">ENG</span>';
  const base = m.replace(/️/g, ''); const e = E[base] || E[base.split('‍')[0]];
  return e ? icon(e[0], e[1]) : '';
}
const TEST = /[\p{Extended_Pictographic}\p{Regional_Indicator}★☆→↓↺✓✔✕⛶]/u;
function fixText(node) {
  const t = node.nodeValue; if (!t || !TEST.test(t)) return;
  const par = node.parentNode; if (!par) return;
  const tag = par.nodeName;
  if (tag === 'OPTION' || tag === 'TEXTAREA' || tag === 'TITLE' || tag === 'SCRIPT' || tag === 'STYLE' || tag === 'OPTGROUP') { node.nodeValue = t.replace(RX, '').replace(/^\s+/, ''); return; }
  RX.lastIndex = 0; const html = t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]).replace(RX, (m) => toHTML(m));
  const tpl = document.createElement('template'); tpl.innerHTML = html; par.replaceChild(tpl.content, node);
}
function scan(root) {
  if (root.nodeType === 3) { fixText(root); return; }
  if (root.nodeType !== 1 || root.closest?.('svg')) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const list = [];
  for (let n = w.nextNode(); n; n = w.nextNode()) if (TEST.test(n.nodeValue)) list.push(n);
  for (const n of list) fixText(n);
  // atributos visíveis: placeholder e label de optgroup
  for (const el of root.querySelectorAll?.('[placeholder],optgroup[label],[title]') || []) for (const a of ['placeholder', 'label', 'title']) { const v = el.getAttribute(a); if (v && TEST.test(v)) el.setAttribute(a, v.replace(RX, '').trim()); }
}
export function startIcons() {
  scan(document.body);
  new MutationObserver((ms) => { for (const m of ms) { if (m.type === 'characterData') fixText(m.target); else for (const n of m.addedNodes) scan(n); } }).observe(document.body, { childList: true, subtree: true, characterData: true });
}
export const stripEmoji = (t) => String(t).replace(RX, '').replace(/\s{2,}/g, ' ').trim();
