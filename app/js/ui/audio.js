// 5.0: áudio do jogo todo — efeitos de menu, torcida, apito, gol, música do menu e voz do narrador.
// Tudo sintetizado (WebAudio) para não pesar o APK. A voz usa a voz do celular; no futuro, frases
// gravadas pelo dono do jogo entram em CLIPS (ex.: CLIPS.gol = ['audio/gol1.mp3']) e têm prioridade.
import { SET } from '../settings.js';

let AC = null, MASTER = null, NOISE = null, GEST = false;
document.addEventListener('pointerdown', () => { GEST = true; }, { capture: true, once: true });
function ac() {
  if (!GEST) return null;
  if (AC) { if (AC.state === 'suspended') AC.resume().catch(() => {}); return AC; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); MASTER = AC.createGain(); MASTER.gain.value = 0.9; MASTER.connect(AC.destination);
    const len = AC.sampleRate * 2; NOISE = AC.createBuffer(1, len, AC.sampleRate); const d = NOISE.getChannelData(0); let b = 0; for (let i = 0; i < len; i++) { b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); d[i] = b * 6 + (Math.random() * 2 - 1) * 0.15; } } catch { AC = null; }
  return AC;
}
function tone(f, t0, dur, type = 'sine', vol = 0.15, f2 = null) {
  const a = ac(); if (!a) return; const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, a.currentTime + t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, a.currentTime + t0 + dur);
  g.gain.setValueAtTime(0.0001, a.currentTime + t0); g.gain.exponentialRampToValueAtTime(vol, a.currentTime + t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + dur);
  o.connect(g); g.connect(MASTER); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + dur + 0.05);
}
function noise(t0, dur, vol, fq = 800, q = 0.7, attack = 0.3) {
  const a = ac(); if (!a || !NOISE) return null; const s = a.createBufferSource(); s.buffer = NOISE; s.loop = true; const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fq; f.Q.value = q; const g = a.createGain();
  const T = a.currentTime + t0; g.gain.setValueAtTime(0.0001, T); g.gain.linearRampToValueAtTime(vol, T + attack); if (dur) { g.gain.setValueAtTime(vol, T + Math.max(attack, dur - 0.6)); g.gain.linearRampToValueAtTime(0.0001, T + dur); }
  s.connect(f); f.connect(g); g.connect(MASTER); s.start(T); if (dur) s.stop(T + dur + 0.1); return { s, g, f };
}

// ---------- efeitos de interface ----------
const SFX = {
  tick: () => tone(1400, 0, 0.04, 'triangle', 0.05),
  click: () => tone(620, 0, 0.05, 'triangle', 0.06, 420),
  pop: () => { tone(520, 0, 0.08, 'sine', 0.08, 880); },
  ok: () => { tone(660, 0, 0.1, 'triangle', 0.09); tone(990, 0.08, 0.16, 'triangle', 0.09); },
  bad: () => { tone(300, 0, 0.12, 'square', 0.04, 220); tone(220, 0.1, 0.18, 'square', 0.04, 160); },
  horn: () => { tone(233, 0, 0.9, 'sawtooth', 0.05); tone(311, 0, 0.9, 'sawtooth', 0.04); },
  whistle: (n = 1) => { for (let i = 0; i < n; i++) { const t = i * 0.45; tone(2900, t, n > 1 && i === n - 1 ? 0.7 : 0.28, 'sine', 0.12, 2750); tone(3150, t, n > 1 && i === n - 1 ? 0.7 : 0.28, 'sine', 0.05); } },
  coin: () => { tone(988, 0, 0.08, 'square', 0.04); tone(1319, 0.07, 0.2, 'square', 0.04); },
};
export function sfx(k, ...a) { if (k === 'whistle' ? SET.crowd === false : SET.sfx === false) return; try { SFX[k]?.(...a); } catch {} }
window.PSFX = sfx;
// clique em qualquer botão/ação
document.addEventListener('pointerdown', (e) => { const b = e.target.closest?.('[data-a], button, .tile, .li.tap'); if (!b || b.disabled) return; if (b.closest('#live, .lboard') && !b.matches('button')) return; sfx('click'); }, { capture: true, passive: true });

// ---------- torcida e jogo ----------
let CROWD = null, crowdT = 0;
// torcida: murmúrio de vozes (não chiado) + cantos ritmados com palmas e bumbo, que mudam de tempo em tempo
function babble(vol) {
  const a = AC; const out = a.createGain(); out.gain.value = 0.0001; out.connect(MASTER); out.gain.linearRampToValueAtTime(vol, a.currentTime + 1.5);
  const src = a.createBufferSource(); src.buffer = NOISE; src.loop = true;
  const vs = [];
  for (const [f, q, g] of [[420, 6, 0.5], [780, 7, 0.38], [1250, 8, 0.24], [2400, 9, 0.12]]) {
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; const gg = a.createGain(); gg.gain.value = g;
    const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 3 + Math.random() * 4; lg.gain.value = g * 0.6; lfo.connect(lg); lg.connect(gg.gain); lfo.start();
    const lfo2 = a.createOscillator(), lg2 = a.createGain(); lfo2.frequency.value = 0.15 + Math.random() * 0.2; lg2.gain.value = f * 0.12; lfo2.connect(lg2); lg2.connect(bp.frequency); lfo2.start();
    src.connect(bp); bp.connect(gg); gg.connect(out); vs.push(lfo, lfo2);
  }
  src.start(); return { out, src, vs };
}
const CHANTS = [
  // [notas (Hz) do canto, ritmo em batidas, bpm]
  { n: [392, 392, 440, 392, 330, 294, 330, 392], r: [1, 1, 1, 1, 1, 1, 2, 2], bpm: 132 },
  { n: [330, 392, 392, 440, 494, 440, 392, 330], r: [1, 1, 2, 1, 1, 1, 1, 2], bpm: 120 },
  { n: [440, 440, 392, 440, 523, 494, 440, 392], r: [2, 1, 1, 2, 1, 1, 1, 1], bpm: 140 },
];
function chant(t0, k, vol) {
  const a = AC; const C = CHANTS[k % CHANTS.length]; const beat = 60 / C.bpm; let t = t0;
  for (let i = 0; i < C.n.length; i++) { const d = C.r[i] * beat; const f = C.n[i];
    // milhares de vozes = vários osciladores levemente desafinados passando por um filtro de "vogal"
    const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.05); g.gain.setValueAtTime(vol, t + d * 0.75); g.gain.linearRampToValueAtTime(0.0001, t + d * 0.98);
    const v = a.createBiquadFilter(); v.type = 'bandpass'; v.frequency.value = 900; v.Q.value = 1.4; v.connect(g); g.connect(MASTER);
    for (const det of [-22, -9, 0, 7, 18, 31]) { const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f / 2; o.detune.value = det + (Math.random() - 0.5) * 10; o.connect(v); o.start(t); o.stop(t + d); }
    const n = a.createBufferSource(); n.buffer = NOISE; const nf = a.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1600; nf.Q.value = 0.8; const ng = a.createGain(); ng.gain.value = 0.35; n.connect(nf); nf.connect(ng); ng.connect(g); n.start(t); n.stop(t + d);
    t += d; }
  // palmas e bumbo no tempo
  const bars = C.r.reduce((x, y) => x + y, 0);
  for (let i = 0; i < bars; i++) { const tt = t0 + i * beat;
    if (i % 2 === 0) { const o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(110, tt); o.frequency.exponentialRampToValueAtTime(45, tt + 0.18); g.gain.setValueAtTime(vol * 2.2, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.25); o.connect(g); g.connect(MASTER); o.start(tt); o.stop(tt + 0.3); }
    const n = a.createBufferSource(); n.buffer = NOISE; const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500; const g = a.createGain(); g.gain.setValueAtTime(vol * 1.6, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.09); n.connect(f); f.connect(g); g.connect(MASTER); n.start(tt, Math.random()); n.stop(tt + 0.12); }
  return t0 + bars * beat;
}
function crowdOn(level = 0.35) {
  if (SET.crowd === false || !ac()) return;
  if (!CROWD) { CROWD = { b: babble(level * 0.55), lvl: level, next: AC.currentTime + 2, k: Math.floor(Math.random() * 3) };
    CROWD.tick = setInterval(() => { if (!CROWD || !AC) return; const now = AC.currentTime; if (now > CROWD.next - 0.2) { const end = chant(Math.max(now, CROWD.next), CROWD.k, CROWD.lvl * 0.06); CROWD.reps = (CROWD.reps || 0) + 1; if (CROWD.reps >= 2 + Math.floor(Math.random() * 2)) { CROWD.reps = 0; CROWD.k++; CROWD.next = end + 5 + Math.random() * 6; } else CROWD.next = end; } }, 400); }
  else { CROWD.lvl = level; CROWD.b.out.gain.linearRampToValueAtTime(level * 0.55, AC.currentTime + 0.8); }
  clearInterval(crowdT); crowdT = setInterval(() => { if (!document.getElementById('live') && !document.querySelector('.mday')) crowdOff(); }, 1500);
}
function crowdOff() { clearInterval(crowdT); if (!CROWD || !AC) return; clearInterval(CROWD.tick); const t = AC.currentTime; try { CROWD.b.out.gain.linearRampToValueAtTime(0.0001, t + 1); CROWD.b.src.stop(t + 1.2); CROWD.b.vs.forEach((o) => o.stop(t + 1.2)); } catch {} CROWD = null; }
function roar(mine = true) { if (SET.crowd === false) return; try { if (AC) { const r = babble(mine ? 1.1 : 0.35); const t = AC.currentTime; r.out.gain.setValueAtTime(mine ? 1.1 : 0.35, t + 0.3); r.out.gain.linearRampToValueAtTime(0.0001, t + (mine ? 5 : 2.2)); r.src.stop(t + (mine ? 5.2 : 2.4)); r.vs.forEach((o) => o.stop(t + 5.3)); } } catch {} noise(0, mine ? 5 : 2.2, mine ? 0.9 : 0.35, 700, 0.4, 0.25); noise(0.1, mine ? 4.5 : 2, mine ? 0.4 : 0.15, 1800, 0.6, 0.3); if (mine) { tone(392, 0.2, 0.35, 'sawtooth', 0.03); tone(523, 0.55, 0.6, 'sawtooth', 0.03); } }
function ooh() { if (SET.crowd === false) return; const n = noise(0, 1.6, 0.5, 420, 1.2, 0.2); if (n) n.f.frequency.linearRampToValueAtTime(300, AC.currentTime + 1.5); }
export const PAUDIO = {
  crowd: (lvl, secs) => { crowdOn(lvl); if (secs) setTimeout(() => { if (!document.getElementById('live')) crowdOff(); }, secs * 1000); },
  crowdOff, roar, ooh,
  whistle: (n) => sfx('whistle', n),
  ev(e, mine) {
    if (e.t === 'gol') { roar(mine); if (mine) setTimeout(() => sfx('horn'), 300); }
    else if (e.t === 'trave' || e.t === 'def') ooh();
    else if (e.t === 'int') sfx('whistle', 2);
    else if (e.t === 'fim') sfx('whistle', 3);
    else if (e.t === 'ver' || e.t === 'am' || e.t === 'pen') sfx('whistle', 1);
  },
};
window.PAUDIO = PAUDIO;

// ---------- narrador ----------
export const CLIPS = {}; // frases gravadas (futuro): { gol: ['audio/narr/gol1.mp3', ...], trave: [...], ... }
let voice = null; let lastSay = 0;
function pickVoice() { try { const vs = speechSynthesis.getVoices(); voice = vs.find((v) => /pt[-_]BR/i.test(v.lang) && /male|masc|daniel|ricardo/i.test(v.name)) || vs.find((v) => /pt[-_]BR/i.test(v.lang)) || vs.find((v) => /^pt/i.test(v.lang)) || null; } catch {} }
try { speechSynthesis.onvoiceschanged = pickVoice; pickVoice(); } catch {}
export function say(text, key, prio = false) {
  if (SET.voice === 'off' || !text) return;
  const now = Date.now(); if (!prio && now - lastSay < 2500) return; lastSay = now;
  const clip = key && CLIPS[key]?.length ? CLIPS[key][Math.floor(Math.random() * CLIPS[key].length)] : null;
  if (clip) { try { new Audio(clip).play(); return; } catch {} }
  const clean = String(text).replace(/<[^>]+>/g, '').replace(/[\p{Extended_Pictographic}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
  const N = window.PranchetaNative; if (N?.speak) { try { if (!prio && N.speaking?.()) return; N.speak(clean, key === 'gol' ? 1.15 : 1.05, key === 'gol' ? 1.12 : 1, !!prio); } catch {} return; }
  try {
    if (!('speechSynthesis' in window)) return; if (prio) speechSynthesis.cancel(); else if (speechSynthesis.speaking) return;
    const u = new SpeechSynthesisUtterance(String(text).replace(/<[^>]+>/g, '').replace(/[\p{Extended_Pictographic}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim());
    u.lang = 'pt-BR'; if (voice) u.voice = voice; u.rate = key === 'gol' ? 1.15 : 1.05; u.pitch = key === 'gol' ? 1.15 : 1; u.volume = 1; speechSynthesis.speak(u);
  } catch {}
}
export function sayStop() { try { window.PranchetaNative?.stopSpeak?.(); speechSynthesis.cancel(); } catch {} }
try { window.PranchetaNative?.ttsReady?.(); } catch {}
window.PSAY = say;

// ---------- música do menu (pad suave gerado) ----------
let MUS = null;
const CH = [[220, 277.2, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6], [196, 246.9, 329.6]];
export function musicOn() {
  if (SET.music === false || MUS || !ac()) return; const a = AC; const g = a.createGain(); g.gain.value = 0.0001; g.connect(MASTER); g.gain.linearRampToValueAtTime(0.05, a.currentTime + 3);
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(g);
  let i = 0; const play = () => { if (!MUS) return; const t = a.currentTime; for (const f of CH[i % CH.length]) for (const det of [-4, 4]) { const o = a.createOscillator(), og = a.createGain(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; og.gain.setValueAtTime(0.0001, t); og.gain.linearRampToValueAtTime(0.12, t + 1.2); og.gain.linearRampToValueAtTime(0.0001, t + 4.2); o.connect(og); og.connect(lp); o.start(t); o.stop(t + 4.3); }
    const bo = a.createOscillator(), bg = a.createGain(); bo.type = 'sine'; bo.frequency.value = CH[i % CH.length][0] / 2; bg.gain.setValueAtTime(0.0001, t); bg.gain.linearRampToValueAtTime(0.25, t + 0.4); bg.gain.linearRampToValueAtTime(0.0001, t + 3.8); bo.connect(bg); bg.connect(lp); bo.start(t); bo.stop(t + 4);
    i++; MUS.t = setTimeout(play, 3800); };
  MUS = { g, t: 0 }; play();
}
export function musicOff() { if (!MUS) return; clearTimeout(MUS.t); try { MUS.g.gain.linearRampToValueAtTime(0.0001, AC.currentTime + 1); } catch {} MUS = null; }
// o navegador só libera áudio depois de um toque
document.addEventListener('pointerdown', () => { ac(); if (document.querySelector('.rc-title')) musicOn(); }, { once: true, capture: true });
