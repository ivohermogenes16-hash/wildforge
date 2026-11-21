// Seletor próprio do Prancheta: troca TODO <select> nativo por um botão estilizado
// que abre um painel animado (cards de jogador, bandeiras, grupos e busca).
import { esc, POS_LINE } from '../util.js';

const CHEV = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>';
const ovrC = (o) => (o >= 80 ? '#2fe08a' : o >= 72 ? '#9be15d' : o >= 64 ? '#f4c542' : o >= 56 ? '#ff9f43' : '#ff6b6b');

function titleOf(sel) {
  if (sel.dataset.title) return sel.dataset.title;
  const lb = sel.closest('.field')?.querySelector('label');
  if (lb) return lb.textContent.replace(/[:：]\s*$/, '').trim();
  const first = sel.options[0];
  if (first && first.value === '') return first.textContent.trim();
  return 'Escolher';
}
function rich(o) { const d = o.dataset; return d.pos ? d : null; }
function labelHtml(o) {
  if (!o) return '<span class="mut">Escolher…</span>';
  const r = rich(o);
  if (r) return `<span class="pos ${POS_LINE[r.pos] || ''}">${esc(r.pos)}</span><span class="ell b">${esc(r.n || o.textContent)}</span><span class="xsel-ovr" style="background:${ovrC(+r.ovr)}">${esc(r.ovr)}</span>`;
  return `<span class="ell">${esc(o.textContent.trim())}</span>`;
}
function sync(sel) { const b = sel._xs; if (!b) return; b.innerHTML = `<span class="xsel-l">${labelHtml(sel.selectedOptions[0])}</span><i class="xsel-c">${CHEV}</i>`; b.classList.toggle('empty', sel.value === ''); }

export function enhanceSelects(root = document) {
  root.querySelectorAll('select:not([data-xs])').forEach((sel) => {
    sel.dataset.xs = '1';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'xsel' + (sel.classList.length ? ' ' + sel.className : '');
    b.style.cssText = sel.style.cssText; sel._xs = b; sel.classList.add('xs-hid'); sel.after(b); sync(sel);
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openPicker(sel); });
  });
  root.querySelectorAll('select[data-xs]').forEach((sel) => { if (sel._xs && !sel._xs.isConnected && sel.isConnected) { sel.removeAttribute('data-xs'); } });
}

function itemHtml(o, i, cur) {
  const r = rich(o); const on = o.value === cur; const d = `style="animation-delay:${Math.min(i, 18) * 22}ms"`;
  const v = esc(o.value);
  if (r) return `<div class="xpk-it pl ${on ? 'on' : ''}" data-xv="${v}" ${d}><span class="pos ${POS_LINE[r.pos] || ''}">${esc(r.pos)}</span><div class="grow" style="min-width:0"><b class="ell">${esc(r.n)}</b><small>${esc(r.sub || '')}</small></div>${r.tag ? `<span class="xpk-tag">${esc(r.tag)}</span>` : ''}<span class="xpk-ovr" style="--o:${ovrC(+r.ovr)}">${esc(r.ovr)}</span>${on ? `<i class="xpk-ck">${CHECK}</i>` : ''}</div>`;
  const t = o.textContent.trim(); const m = t.match(/^(\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]{2}|🏴[^\s]*)\s*/u);
  const ic = m ? `<span class="xpk-ic">${m[0].trim()}</span>` : '';
  const body = m ? t.slice(m[0].length) : t; const pm = body.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  const main = pm ? pm[1] : body, sub = o.dataset.sub || (pm ? pm[2] : '');
  return `<div class="xpk-it ${o.value === '' ? 'clr' : ''} ${on ? 'on' : ''}" data-xv="${v}" ${d}>${ic}<div class="grow" style="min-width:0"><b class="ell">${esc(main)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>${on ? `<i class="xpk-ck">${CHECK}</i>` : ''}</div>`;
}

export function openPicker(sel) {
  const cur = sel.value; const opts = [...sel.options];
  const short = opts.length <= 24 && opts.every((o) => !rich(o) && o.textContent.trim().length <= 9);
  let html = '', i = 0;
  if (short) html = `<div class="xpk-grid">${opts.map((o) => `<button class="xpk-chip ${o.value === cur ? 'on' : ''} ${o.value === '' ? 'clr' : ''}" data-xv="${esc(o.value)}" style="animation-delay:${Math.min(i++, 20) * 18}ms">${esc(o.textContent.trim())}</button>`).join('')}</div>`;
  else for (const ch of sel.children) {
    if (ch.tagName === 'OPTGROUP') html += `<div class="xpk-gh">${esc(ch.label)}</div>` + [...ch.children].map((o) => itemHtml(o, i++, cur)).join('');
    else html += itemHtml(ch, i++, cur);
  }
  const bg = document.createElement('div'); bg.className = 'xpk-bg';
  bg.innerHTML = `<div class="xpk ${short ? 'short' : ''}"><div class="xpk-h"><b>${esc(titleOf(sel))}</b><span class="xpk-n">${opts.filter((o) => o.value !== '').length}</span><button class="xpk-x" aria-label="Fechar">✕</button></div>${!short && opts.length > 9 ? `<div class="xpk-s"><input type="search" placeholder="Procurar…" autocomplete="off"></div>` : ''}<div class="xpk-l">${html}</div></div>`;
  document.body.appendChild(bg);
  const close = () => { bg.classList.add('out'); setTimeout(() => bg.remove(), 200); };
  bg.addEventListener('click', (e) => {
    if (e.target === bg || e.target.closest('.xpk-x')) { close(); return; }
    const it = e.target.closest('[data-xv]'); if (!it) return;
    it.classList.add('tap');
    const v = it.dataset.xv;
    setTimeout(() => { if (sel.value !== v || v === '') { sel.value = v; sync(sel); sel.dispatchEvent(new Event('change', { bubbles: true })); } close(); }, 120);
  });
  const inp = bg.querySelector('input');
  if (inp) inp.addEventListener('input', () => {
    const q = inp.value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    bg.querySelectorAll('.xpk-it').forEach((el) => { el.style.display = !q || el.textContent.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(q) ? '' : 'none'; el.style.animation = 'none'; });
    bg.querySelectorAll('.xpk-gh').forEach((g) => { let n = g.nextElementSibling, any = false; while (n && !n.classList.contains('xpk-gh')) { if (n.style.display !== 'none') any = true; n = n.nextElementSibling; } g.style.display = any ? '' : 'none'; });
  });
  requestAnimationFrame(() => bg.querySelector('.xpk-it.on, .xpk-chip.on')?.scrollIntoView({ block: 'center' }));
}

// observa a tela inteira: qualquer select novo vira seletor do Prancheta
let pend = false;
new MutationObserver(() => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; enhanceSelects(); }); }).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT' && e.target._xs) sync(e.target); }, true);
