// IndexedDB: jogo salvo + imagens enviadas pelo usuário (escudos e fotos)
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open('prancheta', 1);
    r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('save'); d.createObjectStore('img'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function tx(store, mode, fn) {
  const d = await db();
  return new Promise((res, rej) => { const t = d.transaction(store, mode); const s = t.objectStore(store); const q = fn(s); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); });
}
// 3 espaços de carreira; cada um guarda um resumo (meta) para a tela inicial
let SLOT = 'slot1';
try { SLOT = localStorage.getItem('prancheta.slot') || 'slot1'; } catch {}
export const SLOTS = ['slot1', 'slot2', 'slot3'];
export const getSlot = () => SLOT;
export function setSlot(s) { SLOT = s; try { localStorage.setItem('prancheta.slot', s); } catch {} }
function metaOf(G) { const c = G.me?.job ? G.clubs[G.me.job.cid] : null; const x = { name: G.me?.name, club: c?.name || (G.me?.retired ? 'Aposentado' : 'Sem clube'), c1: c?.c1, c2: c?.c2, year: G.year, week: G.week, rep: Math.round(G.me?.rep || 0), titles: G.me?.titles?.length || 0, ts: Date.now() };
  try { if (c) { x.key = c.key; x.short = c.short; x.troph = c.troph; x.youth = !!G.me.job.youth; const cid = G.me.job.youth ? 'U20' : c.league; const comp = G.comps[cid]; if (comp?.table?.[c.id]) { const g = (comp.groups || [Object.keys(comp.table).map(Number)]).find((gr) => gr.includes(c.id)) || []; const tb = g.map((id) => [id, comp.table[id]]).filter((r) => r[1]).sort((a, b) => b[1].pts - a[1].pts || (b[1].gf - b[1].ga) - (a[1].gf - a[1].ga) || b[1].gf - a[1].gf); x.lg = comp.short || comp.name; x.pos = tb.findIndex((r) => r[0] === c.id) + 1; x.pts = comp.table[c.id].pts; x.form = comp.table[c.id].form; x.of = tb.length; }
    const nf = (G.fix || []).filter((f) => f && f.hg == null && (f.h === c.id || f.a === c.id) && (f.w > G.week || (f.w === G.week && (f.s ?? 0) >= (G.slot ?? 0)))).sort((a, b) => a.w - b.w || (a.s ?? 0) - (b.s ?? 0))[0];
    if (nf) { const o = G.clubs[nf.h === c.id ? nf.a : nf.h]; x.nxt = { name: o.name, key: o.key, short: o.short, c1: o.c1, c2: o.c2, troph: o.troph, home: nf.h === c.id, comp: G.comps[nf.c]?.short || '' }; }
    const sq = G.players.filter((p) => p && p.club === c.id && !p.u20 === !G.me.job.youth); x.ovr = Math.round(sq.reduce((s2, p) => s2 + p.ovr, 0) / (sq.length || 1)); x.money = c.money; } } catch {}
  return x; }
export const saveGame = (G) => { const c = G._idx; G._idx = null; const m = metaOf(G); const p = tx('save', 'readwrite', (s) => { s.put(m, 'meta:' + SLOT); return s.put(G, SLOT); }); G._idx = c; return p; };
export const loadGame = (slot = SLOT) => tx('save', 'readonly', (s) => s.get(slot));
export const deleteGame = (slot = SLOT) => tx('save', 'readwrite', (s) => { s.delete('meta:' + slot); return s.delete(slot); });
export async function listSlots() {
  const out = {};
  for (const sl of SLOTS) { out[sl] = await tx('save', 'readonly', (s) => s.get('meta:' + sl)); if (!out[sl]) { const k = await tx('save', 'readonly', (s) => s.getKey(sl)); if (k) out[sl] = { legacy: true, name: 'Carreira salva', club: '—' }; } }
  return out;
}

export const IMG = new Map();
export async function loadImages() {
  const d = await db();
  return new Promise((res) => { const t = d.transaction('img', 'readonly'); const r = t.objectStore('img').openCursor(); r.onsuccess = () => { const c = r.result; if (c) { IMG.set(c.key, c.value); c.continue(); } else res(); }; r.onerror = () => res(); });
}
export async function setImage(key, dataUrl) { if (dataUrl) IMG.set(key, dataUrl); else IMG.delete(key); await tx('img', 'readwrite', (s) => (dataUrl ? s.put(dataUrl, key) : s.delete(key))); }

// Lê arquivo da galeria e reduz para caber bem no jogo
export function fileToDataUrl(file, size = 192) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const s = Math.min(1, size / Math.max(im.width, im.height));
        const cv = document.createElement('canvas'); cv.width = Math.round(im.width * s); cv.height = Math.round(im.height * s);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        res(cv.toDataURL('image/png'));
      };
      im.onerror = rej; im.src = fr.result;
    };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}
