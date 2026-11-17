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
export const saveGame = (G) => { const c = G._idx; G._idx = null; const p = tx('save', 'readwrite', (s) => s.put(G, 'slot1')); G._idx = c; return p; };
export const loadGame = () => tx('save', 'readonly', (s) => s.get('slot1'));
export const deleteGame = () => tx('save', 'readwrite', (s) => s.delete('slot1'));

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
