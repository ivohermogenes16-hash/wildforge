// Configurações do jogo (ficam salvas no aparelho) e notificações
const DEF = { narrador: 'empolgado', view3d: '3d', q3d: 1, theme: 'escuro', clubTheme: true, simple: false, speed: 2, replays: true, narr: true, vib: true, notif: true, accent: 'verde', size: 'normal', fast: false, autosave: true };
export const SET = { ...DEF };
try { Object.assign(SET, JSON.parse(localStorage.getItem('prancheta.set') || '{}')); } catch {}
export const ACCENTS = { verde: ['#2fe08a', '#19b46b'], azul: ['#4aa8ff', '#1f7fe0'], ouro: ['#f4c542', '#d39e16'], rubro: ['#ff5a5f', '#d63339'], roxo: ['#a77bff', '#7b4fe0'] };
export function saveSet() { try { localStorage.setItem('prancheta.set', JSON.stringify(SET)); } catch {} applySet(); }
export function applySet() {
  const r = document.documentElement.style; const [a, b] = ACCENTS[SET.accent] || ACCENTS.verde;
  r.setProperty('--ac', a); r.setProperty('--ac2', b);
  document.documentElement.style.fontSize = { pequeno: '12px', normal: '13px', grande: '14.5px' }[SET.size] || '13px';
}

// ---------- notificações ----------
// No APK: ponte nativa (PranchetaNative) que agenda notificações mesmo com o app fechado.
// No navegador: Notification API enquanto a página estiver aberta em segundo plano.
const N = () => window.PranchetaNative;
export function notifSupported() { return !!N() || 'Notification' in window; }
export async function askNotif() {
  if (N()) { try { N().permission(); } catch {} return true; }
  if ('Notification' in window) { try { return (await Notification.requestPermission()) === 'granted'; } catch { return false; } }
  return false;
}
let webTimers = {};
export function schedule(id, title, body, delayMs) {
  if (!SET.notif) return;
  if (N()) { try { N().schedule(id, title, body, Math.max(1000, Math.round(delayMs))); } catch {} return; }
  if ('Notification' in window && Notification.permission === 'granted') { clearTimeout(webTimers[id]); webTimers[id] = setTimeout(() => { if (!document.hidden) return; try { new Notification(title, { body, icon: 'icon-512.png' }); } catch {} }, delayMs); }
}
export function cancelAll() {
  if (N()) { try { for (const id of [1, 2, 3]) N().cancel(id); } catch {} }
  for (const k of Object.keys(webTimers)) clearTimeout(webTimers[k]); webTimers = {};
}
// lembretes calculados a partir do estado da carreira quando o jogador sai do app
export function planReminders(G) {
  cancelAll(); if (!G || !SET.notif) return;
  const me = G.me; const c = me.job ? G.clubs[me.job.cid] : null;
  const decs = G.inbox.filter((m) => (m.kind === 'dec' || m.kind === 'job' || m.kind === 'natjob' || m.kind === 'bid') && !m.done && !m.expired).length;
  if (decs) schedule(1, `📩 ${decs} decisão(ões) esperando você`, `${c ? `O ${c.name}` : 'Seu escritório'} aguarda suas respostas: propostas, diretoria e elenco.`, 2 * 3600e3);
  const f = c ? G.fix.filter((x) => x.hg == null && (x.h === c.id || x.a === c.id)).sort((a, b) => a.w - b.w || a.s - b.s)[0] : null;
  if (f) { const o = G.clubs[f.h === c.id ? f.a : f.h]; schedule(2, `⚽ ${c.name} x ${o.name}`, `Próximo jogo (${G.comps[f.c]?.short || ''}). A torcida está esperando o técnico ${me.name}!`, 20 * 3600e3); }
  else schedule(2, '📋 Prancheta', 'Sua carreira continua. Volte para a próxima rodada!', 22 * 3600e3);
  const cos = (G.biz?.cos || []).filter((x) => !x.dead && x.sh >= 51);
  if (cos.length) schedule(3, `💼 Relatório das suas empresas`, `${cos.map((x) => x.n).join(', ')}: confira receitas, contratos e patrocínios.`, 46 * 3600e3);
}
export function vibrate(p) { if (SET.vib && navigator.vibrate) try { navigator.vibrate(p); } catch {} }
