// 6.2: conta Google (opcional) + backup da carreira e da carteira na nuvem
// Entrar com Google liga o Google à conta do jogador (o mesmo usado no Online). Quem reinstalar o jogo
// entra com o mesmo Google e recupera carreiras, Pranfixas, itens e perfil.
import { S, H, openSheet, closeSheet, replaceSheet, centerNote, save } from './app.js';
import { listSlots, loadGame, SLOTS, getSlot } from '../store.js';
import { esc } from '../util.js';

const LA = () => window.LumbraAnalytics;
const NAT = () => window.PranchetaNative;
const K = 'prancheta.conta';
let C = {}; try { C = JSON.parse(localStorage.getItem(K) || '{}'); } catch {}
const csave = () => { try { localStorage.setItem(K, JSON.stringify(C)); } catch {} };
export const logged = () => !!(LA()?.account && C.on);

// ---------- compactar / descompactar (gzip + base64) ----------
const rep = (k, v) => (v instanceof Set ? { __s: [...v] } : v instanceof Map ? { __m: [...v] } : v);
const rev = (k, v) => (v && typeof v === 'object' ? (v.__s ? new Set(v.__s) : v.__m ? new Map(v.__m) : v) : v);
async function pack(obj) {
  const txt = JSON.stringify(obj, rep);
  if (!window.CompressionStream) return 'J' + txt;
  const cs = new Blob([txt]).stream().pipeThrough(new CompressionStream('gzip'));
  const buf = new Uint8Array(await new Response(cs).arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return 'G' + btoa(s);
}
async function unpack(str) {
  if (!str) return null; if (str[0] === 'J') return JSON.parse(str.slice(1), rev);
  const bin = atob(str.slice(1)); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const ds = new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip')); return JSON.parse(await new Response(ds).text(), rev);
}

// ---------- backup ----------
const WALLET_KEYS = ['prancheta.pf', 'prancheta.on', 'prancheta.intro61', 'prancheta.comu'];
let busy = false, lastUp = 0;
export async function backup(force) {
  if (!logged() || busy) return; if (!force && Date.now() - lastUp < 15 * 60e3) return; busy = true;
  try {
    const uid = LA().uid; const w = {}; for (const k of WALLET_KEYS) { const v = localStorage.getItem(k); if (v != null) w[k] = v; }
    await LA().api('PUT', `bk/PRANCHETA/${uid}/w`, { d: await pack(w), t: Date.now() });
    const slots = await listSlots();
    for (const sl of Object.keys(slots)) { if (!force && sl !== getSlot()) continue; const G = sl === getSlot() && S.G ? S.G : await loadGame(sl); if (!G) continue; const c = G._idx; G._idx = null;
      try { await LA().api('PUT', `bk/PRANCHETA/${uid}/s/${sl}`, { d: await pack(G), m: slots[sl], t: Date.now() }); } finally { G._idx = c; } }
    lastUp = Date.now(); C.last = lastUp; csave();
  } catch (e) { console.warn('backup', e); } finally { busy = false; }
}
async function restore() {
  const uid = LA().uid; const idx = await LA().api('GET', `bk/PRANCHETA/${uid}`, undefined, 'shallow=true'); if (!idx) return 0;
  let n = 0;
  try { const w = await LA().api('GET', `bk/PRANCHETA/${uid}/w`); if (w?.d) { const o = await unpack(w.d); for (const [k, v] of Object.entries(o || {})) localStorage.setItem(k, v); n++; } } catch (e) { console.warn(e); }
  try { const ss = await LA().api('GET', `bk/PRANCHETA/${uid}/s`, undefined, 'shallow=true');
    const { saveGame, setSlot } = await import('../store.js'); const cur = getSlot();
    for (const sl of Object.keys(ss || {})) { const b = await LA().api('GET', `bk/PRANCHETA/${uid}/s/${sl}`); if (!b?.d) continue; const G = await unpack(b.d); if (!G) continue; if (!SLOTS.includes(sl)) SLOTS.push(sl); setSlot(sl); await saveGame(G); n++; }
    setSlot(cur);
  } catch (e) { console.warn(e); }
  return n;
}
// salva na nuvem quando o jogo salva (no máximo a cada 15 min) e quando o app vai para o fundo
{ const prev = S.onSave; S.onSave = (G) => { try { prev?.(G); } catch {} backup(false); }; }
document.addEventListener('visibilitychange', () => { if (document.hidden) { lastUp = Math.min(lastUp, Date.now() - 14 * 60e3); backup(false); } });

// ---------- entrar com Google ----------
async function clientId() {
  try { const r = LA()?.remote; if (r?.google?.clientId && r.google.on !== false) return r.google.clientId; } catch {}
  try { const j = await LA().api('GET', 'remote/PRANCHETA/google'); return j && j.on !== false ? j.clientId || '' : ''; } catch { return ''; }
}
H.glogin = async () => {
  const N = NAT(); if (!N?.googleSignIn) { centerNote('Entrar com Google funciona no app do Prancheta (Android).', 2600, 'bad'); return; }
  const id = await clientId(); if (!id) { centerNote('O login com Google ainda está sendo ligado. Tente mais tarde.', 2600, 'bad'); return; }
  replaceSheet(`<div class="gl-box"><div class="pf-spin"></div><h2>Conectando ao Google…</h2></div>`);
  window.onPranchetaGoogle = async (st, tok) => {
    if (st !== 'ok' || !tok) { closeSheet(); if (st !== 'cancel') centerNote('Não deu para entrar com o Google agora.', 2400, 'bad'); return; }
    try {
      const r = await LA().google(tok); C.on = 1; C.email = r.email; csave();
      if (r.switched) {
        replaceSheet(`<div class="gl-box"><div class="pf-spin"></div><h2>Recuperando sua conta…</h2><p class="xs mut">Buscando carreiras, Pranfixas e itens salvos.</p></div>`);
        const n = await restore(); closeSheet(true);
        centerNote(n ? 'Conta recuperada! Suas carreiras e itens voltaram.' : 'Conta conectada!', 2600); setTimeout(() => location.reload(), 1400);
      } else { await backup(true); closeSheet(true); centerNote('Conta protegida! Seu progresso fica salvo no Google.', 2600); }
    } catch (e) { closeSheet(); centerNote('Não deu para entrar: ' + String(e.message || e).slice(0, 60), 2600, 'bad'); }
  };
  try { N.googleSignIn(id); } catch { closeSheet(); }
};
H.glogout = () => { C.on = 0; csave(); closeSheet(); centerNote('Backup automático desligado neste aparelho.', 2000); };
H.gbackup = async () => { if (!logged()) return; replaceSheet(`<div class="gl-box"><div class="pf-spin"></div><h2>Salvando na nuvem…</h2></div>`); await backup(true); replaceSheet(contaHtml()); };
H.gconta = () => openSheet(contaHtml());
H.glater = () => { C.later = Date.now(); csave(); closeSheet(); };
function contaHtml() {
  if (logged()) return `<div class="gl-box"><div class="gl-g">${GSVG}</div><h2>Conta protegida</h2><p class="mut sm">${esc(C.email || LA()?.account?.email || '')}</p>
    <p class="xs mut">Carreiras, Pranfixas, itens e perfil online são salvos no seu Google. Se trocar de celular ou reinstalar, é só entrar com o mesmo Google.</p>
    <div class="xs mut" style="margin:6px 0 10px">Último backup: ${C.last ? new Date(C.last).toLocaleString('pt-BR') : 'ainda não'}</div>
    <div class="row" style="gap:8px"><button class="btn pri grow" data-a="gbackup">Salvar agora</button><button class="btn" data-a="glogout">Desligar</button></div></div>`;
  return promptHtml(false);
}
const GSVG = '<svg viewBox="0 0 48 48" width="26" height="26"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
function promptHtml(first) {
  return `<div class="gl-box"><div class="gl-shield">🛡️</div><h2>Proteja sua conta</h2>
  <p class="sm mut">Entre com o Google para não perder nada se trocar de celular ou desinstalar o jogo: carreiras, Pranfixas, molduras e seu lugar no ranking.</p>
  <button class="gl-btn" data-a="glogin">${GSVG}<span>Entrar com Google</span></button>
  <button class="btn ghost blk" data-a="glater" style="margin-top:6px">${first ? 'Fazer depois' : 'Agora não'}</button></div>`;
}
// aparece uma vez na primeira abertura (e lembra de novo depois de alguns dias), nunca obrigatório
export function contaPrompt() {
  if (logged() || !NAT()?.googleSignIn) return;
  if (C.later && Date.now() - C.later < 4 * 864e5) return;
  if (document.querySelector('.modal-bg, .intro, .pcenter')) { setTimeout(contaPrompt, 2500); return; }
  openSheet(promptHtml(true));
}
window.PCONTA = { logged, backup, prompt: contaPrompt };
