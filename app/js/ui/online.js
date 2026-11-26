// Online do Prancheta: perfil público, ranking geral, card de compartilhar e Desafio da Semana.
import { S, H, openSheet, closeSheet, replaceSheet, centerNote } from './app.js';
import { esc, hash, withSeed, pick, shuffle, clamp } from '../util.js';
import { crest } from './art.js';
import { IMG } from '../store.js';
import { SQUADS } from '../data/squads.js';
import { FORMATIONS } from '../engine/match.js';
import { allClubs, clubByKey, squadOf, bestXI, playO, sqOvr, OFORMS, OMENT, OPRESS } from '../engine/osim.js';
import { PF_SVG, pfTag, pfAdd, pfSpend, isVip, W as WAL, frameColor, adOk, adsLeft, watchAd } from './loja.js';

const OK = 'prancheta.on';
const O = (() => { try { return { nick: '', best: 0, ch: {}, paid: [], ...JSON.parse(localStorage.getItem(OK) || '{}') }; } catch { return { nick: '', best: 0, ch: {}, paid: [] }; } })();
const osave = () => { try { localStorage.setItem(OK, JSON.stringify(O)); } catch {} };
const api = (m, p, b, q) => (window.LumbraAnalytics?.api ? window.LumbraAnalytics.api(m, p, b, q) : Promise.reject(new Error('offline')));
const me = () => window.LumbraAnalytics?.uid || null;
export const ONL = { O, api, me, osave };
const q = (o) => Object.entries(o).map(([k, v]) => k + '=' + encodeURIComponent(typeof v === 'string' ? JSON.stringify(v) : v)).join('&');
const sheetWide = (html) => { const s = document.querySelector('.on-hub'); if (s) return replaceSheet(html); openSheet(html).parentElement.classList.add('wide'); };
const nickOf = () => O.nick || (S.G?.me.name || '').slice(0, 20);
const avatar = (n, fr, vip, size = 38) => `<span class="on-av" style="--fc:${frameColor(fr) || '#ffffff22'};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px">${esc((n || '?')[0].toUpperCase())}${vip ? '<i class="on-vip">★</i>' : ''}</span>`;

// ---------- pontuação da carreira ----------
export function careerScore(G) {
  if (!G?.me) return 0; const t = G.me.titles || [];
  return Math.round(t.reduce((s, x) => s + clamp(x.w || 3, 1, 40) * 12, 0) + (G.me.rep || 0) * 8 + (G.me.stats?.v || 0) * 2 + Math.max(0, G.year - 2026) * 15);
}
function myProfile() {
  const G = S.G; const c = G?.me.job ? G.clubs[G.me.job.cid] : null; const sc = Math.max(O.best || 0, careerScore(G));
  const top = (G?.me.titles || []).slice().sort((a, b) => (b.w || 0) - (a.w || 0)).slice(0, 4).map((t) => `${t.c} ${t.y}`).join('|').slice(0, 160);
  return { n: nickOf() || 'Técnico', cl: (c?.name || O.cl || 'Sem clube').slice(0, 30), c1: (c?.c1 || O.c1 || '#1f6f4a').slice(0, 9), c2: (c?.c2 || O.c2 || '#ffffff').slice(0, 9), sc, rep: Math.round(G?.me.rep || O.rep || 0), ti: (G?.me.titles || []).length || O.ti || 0, se: G ? Math.max(0, G.year - 2026) : O.se || 0, fr: (WAL.frame || '').slice(0, 10), vip: isVip(), tt: top || O.tt || '', lg: O.lgw || 0, chb: O.chb || 0, t: { '.sv': 'timestamp' }, v: '6.0' };
}
let lastSync = 0;
export async function syncProfile(force) {
  if (!O.nick || !me()) return false; if (!force && Date.now() - lastSync < 5 * 60e3) return true; lastSync = Date.now();
  const p = myProfile(); if (p.sc > (O.best || 0)) O.best = p.sc; Object.assign(O, { cl: p.cl, c1: p.c1, c2: p.c2, rep: p.rep, ti: p.ti, se: p.se, tt: p.tt }); osave();
  try { await api('PUT', `pr/prof/${me()}`, p); return true; } catch (e) { console.warn(e); return false; }
}
window.PONLINE_SYNC = () => syncProfile(true);
setInterval(() => { if (S.G && O.nick) syncProfile(); }, 10 * 60e3);

// ---------- hub ----------
let TAB = 'rank';
H.tonline = (v) => { TAB = v || TAB; if (!O.nick) return sheetWide(nickHtml()); sheetWide(hubHtml()); loadTab(); };
H.ontab = (v) => { TAB = v; replaceSheet(hubHtml()); loadTab(); };
function nickHtml(edit) {
  return `<div class="on-hub"><h2>${edit ? 'Mudar apelido' : 'Bem-vindo ao Prancheta Online'}</h2><p class="sm mut">Escolha um apelido. É ele que aparece no ranking geral, no Desafio da Semana e na liga com amigos. Não use seu nome completo.</p>
  <div class="field"><label>Apelido (3 a 20 letras)</label><input id="onnick" maxlength="20" value="${esc(O.nick || nickOf())}" placeholder="Ex.: Professor Pardal"></div>
  <button class="btn pri big blk" data-a="onnick">${edit ? 'Salvar' : 'Entrar no online'}</button></div>`;
}
H.onnick = async () => {
  const v = (document.getElementById('onnick')?.value || '').replace(/[<>\[\]{}#$/.]/g, '').replace(/\s+/g, ' ').trim();
  if (v.length < 3) { centerNote('O apelido precisa ter pelo menos 3 letras.'); return; }
  O.nick = v.slice(0, 20); osave(); replaceSheet(`<div class="on-hub"><div class="pf-spin"></div></div>`); await syncProfile(true); replaceSheet(hubHtml()); loadTab();
};
H.oneditnick = () => replaceSheet(nickHtml(true));
function hubHtml() {
  const tabs = [['rank', 'Ranking geral'], ['desafio', 'Desafio da Semana'], ['liga', 'Liga com amigos'], ['perfil', 'Meu perfil']];
  return `<div class="on-hub"><div class="on-hd"><div class="on-me">${avatar(O.nick, WAL.frame, isVip(), 42)}<div><b>${esc(O.nick)}</b><small>${me() ? 'Online' : 'Sem conexão'} · ${Math.max(O.best || 0, careerScore(S.G))} pts</small></div></div><button class="pf-chip" data-a="tloja">${PF_SVG}<b class="pf-n">${window.PPF?.bal() ?? 0}</b></button></div>
  <div class="seg on-tabs">${tabs.map(([k, t]) => `<button class="${TAB === k ? 'on' : ''}" data-a="ontab" data-v="${k}">${t}</button>`).join('')}</div>
  <div id="onbody">${TAB === 'desafio' ? chHome() : TAB === 'perfil' ? profHtml(myProfile(), true) : TAB === 'liga' ? (window.PLIGA?.home() || '') : '<div class="pf-spin"></div>'}</div></div>`;
}
function setBody(h) { const b = document.getElementById('onbody'); if (b) b.innerHTML = h; }
function loadTab() { if (TAB === 'rank') loadRank(); if (TAB === 'desafio') chRewards(); if (TAB === 'liga') window.PLIGA?.load(); }
const offline = (e) => `<div class="hint">Não consegui conectar ao online agora. Confira a internet e tente de novo.${e ? `<div class="xs mut">${esc(String(e.message || e).slice(0, 90))}</div>` : ''}</div><button class="btn blk" data-a="ontab" data-v="${TAB}">Tentar de novo</button>`;

// ---------- ranking geral ----------
let RANK = [];
async function loadRank() {
  try {
    await syncProfile();
    const j = await api('GET', 'pr/prof', undefined, q({ orderBy: 'sc', limitToLast: 100 }));
    RANK = Object.entries(j || {}).map(([u, p]) => ({ u, ...p })).sort((a, b) => b.sc - a.sc);
    let pos = RANK.findIndex((r) => r.u === me()) + 1; let total = '';
    if (!pos && O.best) { try { const a = await api('GET', 'pr/prof', undefined, q({ orderBy: 'sc', startAt: O.best + 1, limitToFirst: 2000 }) + '&shallow=false'); pos = Object.keys(a || {}).length + 1; } catch {} }
    try { const all = await api('GET', 'pr/prof', undefined, 'shallow=true'); total = Object.keys(all || {}).length; } catch {}
    if (TAB !== 'rank') return;
    setBody(`<div class="on-mypos"><div><small>Sua posição</small><b>${pos ? pos + 'º' : '—'}</b></div><div><small>Técnicos no ranking</small><b>${total || RANK.length}</b></div><div><small>Seus pontos</small><b>${Math.max(O.best || 0, careerScore(S.G))}</b></div><button class="btn sm" data-a="onshare">Compartilhar</button></div>
    <div class="xs mut" style="margin:4px 0 8px">Pontos vêm da carreira: títulos (os grandes valem mais), reputação, vitórias e temporadas. Atualiza sozinho enquanto você joga.</div>
    <div class="on-rank">${RANK.map((r, i) => `<button class="on-row ${r.u === me() ? 'me' : ''} ${i < 3 ? 'top' + (i + 1) : ''}" data-a="onprof" data-v="${i}" style="--d:${Math.min(i, 20) * 0.03}s"><span class="on-p">${i + 1}</span>${avatar(r.n, r.fr, r.vip, 34)}<span class="grow ell"><b>${esc(r.n)}</b><small><i class="on-cl" style="--c1:${esc(r.c1 || '#333')};--c2:${esc(r.c2 || '#fff')}"></i>${esc(r.cl || '')} · ${r.ti || 0} títulos</small></span><span class="on-sc">${r.sc}</span></button>`).join('') || '<div class="hint">Ninguém no ranking ainda. Seja o primeiro!</div>'}</div>`);
  } catch (e) { setBody(offline(e)); }
}
H.onprof = (i) => { const r = RANK[+i]; if (!r) return; openSheet(profHtml(r, r.u === me())); };
function profHtml(p, mine) {
  const tt = String(p.tt || '').split('|').filter(Boolean);
  return `<div class="on-prof" style="--c1:${esc(p.c1 || '#1f6f4a')};--c2:${esc(p.c2 || '#fff')}"><div class="on-prof-hd">${avatar(p.n, p.fr, p.vip, 64)}<div><h2>${esc(p.n)}</h2><div class="xs">${p.vip ? '<b class="gold">SÓCIO PRANCHETA</b> · ' : ''}Técnico do ${esc(p.cl || '—')}</div></div></div>
  <div class="on-stats"><div><b>${p.sc || 0}</b><small>pontos</small></div><div><b>${p.ti || 0}</b><small>títulos</small></div><div><b>${p.rep || 0}</b><small>reputação</small></div><div><b>${p.se || 0}</b><small>temporadas</small></div><div><b>${p.chb || 0}</b><small>melhor desafio</small></div><div><b>${p.lg || 0}</b><small>ligas online</small></div></div>
  ${tt.length ? `<h3>Principais conquistas</h3><div class="on-tt">${tt.map((t) => `<span>🏆 ${esc(t)}</span>`).join('')}</div>` : ''}
  ${mine ? `<div class="row" style="gap:8px;margin-top:12px"><button class="btn pri grow" data-a="onshare">Compartilhar meu card</button><button class="btn grow" data-a="oneditnick">Mudar apelido</button><button class="btn grow" data-a="tloja" data-v="visual">Molduras</button></div>` : ''}</div>`;
}

// ---------- card de compartilhar ----------
H.onshare = async () => {
  const p = myProfile(); const G = S.G; const c = G?.me.job ? G.clubs[G.me.job.cid] : null;
  const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350; const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 1080, 1350); g.addColorStop(0, '#07110e'); g.addColorStop(0.55, '#0f2a20'); g.addColorStop(1, p.c1 || '#1f6f4a'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  x.globalAlpha = 0.08; x.strokeStyle = '#fff'; x.lineWidth = 6; x.strokeRect(80, 560, 920, 620); x.beginPath(); x.arc(540, 870, 120, 0, 7); x.stroke(); x.beginPath(); x.moveTo(80, 870); x.lineTo(1000, 870); x.stroke(); x.globalAlpha = 1;
  x.fillStyle = '#fff'; x.font = '900 italic 84px system-ui, sans-serif'; x.fillText('PRAN', 80, 150); x.fillStyle = '#2ff3a0'; x.fillText('CHETA', 80 + x.measureText('PRAN').width, 150);
  x.fillStyle = '#ffffffaa'; x.font = '700 30px system-ui'; x.fillText('CARD DO TÉCNICO', 82, 200);
  // escudo
  const cimg = c && IMG.get('c:' + c.key);
  await new Promise((ok) => { if (!cimg) { x.fillStyle = p.c1; x.beginPath(); x.arc(860, 140, 90, 0, 7); x.fill(); x.lineWidth = 10; x.strokeStyle = p.c2; x.stroke(); x.fillStyle = p.c2; x.font = '900 54px system-ui'; x.textAlign = 'center'; x.fillText((c?.short || p.cl || 'PR').slice(0, 3).toUpperCase(), 860, 160); x.textAlign = 'left'; ok(); return; } const im = new Image(); im.onload = () => { x.drawImage(im, 770, 50, 180, 180); ok(); }; im.onerror = ok; im.src = cimg; });
  // moldura + inicial
  x.fillStyle = frameColor(p.fr) || '#ffffff33'; x.beginPath(); x.arc(200, 400, 110, 0, 7); x.fill(); x.fillStyle = '#0b1714'; x.beginPath(); x.arc(200, 400, 95, 0, 7); x.fill();
  x.fillStyle = '#fff'; x.font = '900 100px system-ui'; x.textAlign = 'center'; x.fillText((p.n || 'T')[0].toUpperCase(), 200, 436); x.textAlign = 'left';
  x.font = '900 70px system-ui'; x.fillStyle = '#fff'; x.fillText(p.n.slice(0, 18), 350, 390); x.font = '600 36px system-ui'; x.fillStyle = '#ffffffcc'; x.fillText(`${p.vip ? '★ Sócio · ' : ''}${p.cl}`, 350, 445);
  const st = [['PONTOS', p.sc], ['TÍTULOS', p.ti], ['REPUTAÇÃO', p.rep], ['TEMPORADAS', p.se]];
  st.forEach(([l, v], i) => { const bx = 80 + (i % 2) * 470, by = 600 + Math.floor(i / 2) * 230; x.fillStyle = '#00000055'; x.fillRect(bx, by, 450, 200); x.fillStyle = '#2ff3a0'; x.font = '900 96px system-ui'; x.fillText(String(v), bx + 36, by + 120); x.fillStyle = '#ffffffaa'; x.font = '700 30px system-ui'; x.fillText(l, bx + 40, by + 170); });
  const tt = String(p.tt || '').split('|').filter(Boolean).slice(0, 3); x.font = '700 34px system-ui'; x.fillStyle = '#fff'; tt.forEach((t, i) => x.fillText('🏆 ' + t, 80, 1120 + i * 52));
  x.fillStyle = '#ffffff88'; x.font = '600 28px system-ui'; x.fillText('Baixe o Prancheta: lumbragames.github.io/Prancheta', 80, 1300);
  const url = cv.toDataURL('image/png'); const b64 = url.split(',')[1]; const name = `prancheta-card-${Date.now()}.png`;
  openSheet(`<h2>Seu card</h2><img src="${url}" style="width:100%;max-width:340px;border-radius:14px;display:block;margin:0 auto 10px"><div class="row" style="gap:8px"><button class="btn pri grow" data-a="oncardsave">Salvar na galeria</button><button class="btn grow" data-a="oncardwa">Mandar no WhatsApp</button></div><div class="xs mut" style="margin-top:6px">Para postar a imagem: salve na galeria e escolha ela no app.</div>`);
  CARD = { b64, name, url, p };
};
let CARD = null;
H.oncardsave = async () => {
  if (!CARD) return; const N = window.PranchetaNative;
  if (N?.saveFile) { const w = N.saveFile(CARD.name, CARD.b64, 'image/png'); centerNote(w ? 'Card salvo na galeria!' : 'Não consegui salvar', 2200); return; }
  try { const blob = await (await fetch(CARD.url)).blob(); const f = new File([blob], CARD.name, { type: 'image/png' }); if (navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f], title: 'Prancheta' }); return; } } catch {}
  const a = document.createElement('a'); a.href = CARD.url; a.download = CARD.name; document.body.appendChild(a); a.click(); a.remove();
};
H.oncardwa = () => { const p = CARD?.p || myProfile(); const t = `Sou o técnico ${p.n} no Prancheta ⚽\n🏆 ${p.ti} títulos · ${p.sc} pontos no ranking geral\nBaixa e vem me enfrentar: https://lumbragames.github.io/Prancheta/`; try { window.PranchetaNative?.openUrl ? window.PranchetaNative.openUrl('https://wa.me/?text=' + encodeURIComponent(t)) : window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank'); } catch {} };

// ---------- Desafio da Semana ----------
const WEEK0 = Date.UTC(2026, 0, 5, 3); // segunda-feira 00h de Brasília
export const weekNo = (t = Date.now()) => Math.floor((t - WEEK0) / (7 * 864e5));
const weekEnd = (n) => new Date(WEEK0 + (n + 1) * 7 * 864e5);
const THEMES = [
  { id: 'normal', t: 'Sequência dura', d: 'Cinco jogos contra times mais fortes. Monte a melhor estratégia.' },
  { id: 'craque', t: 'Sem o craque', d: 'Seu melhor jogador está lesionado a semana toda.', fx: (sq) => { const b = [...sq].sort((a, c) => c.ovr - a.ovr)[0]; return sq.filter((p) => p !== b); } },
  { id: 'fora', t: 'Maratona fora de casa', d: 'Todos os cinco jogos são na casa do adversário.', away: 1 },
  { id: 'cansado', t: 'Elenco cansado', d: 'Semana de muitos jogos: todo o elenco joga com -3 de geral.', fx: (sq) => sq.map((p) => ({ ...p, ovr: p.ovr - 3 })) },
  { id: 'jovem', t: 'Aposta na juventude', d: 'Só jogadores de até 25 anos podem ser escalados (e gerados da base completam).', fx: (sq) => { const y = sq.filter((p) => p.age <= 25); return y.length >= 14 ? y : sq; } },
];
const WCACHE = {};
export function weekly(n = weekNo()) {
  if (WCACHE[n]) return WCACHE[n];
  return (WCACHE[n] = withSeed(hash('desafio:' + n), () => {
    const real = allClubs().filter((c) => SQUADS[c.key] && String(SQUADS[c.key]).split(';').length >= 14);
    const pool = real.filter((c) => c.rep >= 40 && c.rep <= 70); const club = pick(pool.length ? pool : real);
    const opp = shuffle(real.filter((c) => c.key !== club.key && c.rep >= club.rep + 3 && c.rep <= club.rep + 26)).slice(0, 5).sort((a, b) => a.rep - b.rep);
    const th = THEMES[n % THEMES.length];
    let sq = squadOf(club.key); if (th.fx) sq = th.fx(sq);
    return { n, club, opp, th, sq };
  }));
}
const tries = () => (isVip() ? 5 : 3) + (O.ch[weekNo()]?.extra || 0);
const used = () => O.ch[weekNo()]?.tries || 0;
function chHome() {
  const W = weekly(); const r = O.ch[W.n] || {}; const left = Math.max(0, tries() - used()); const end = weekEnd(W.n);
  return `<div class="ch-hero" style="--c1:${esc(W.club.c1)};--c2:${esc(W.club.c2)}"><div class="ch-crest">${crest(W.club, 64)}</div><div class="grow"><small>DESAFIO DA SEMANA ${W.n + 1} · termina ${end.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</small><h2>${esc(W.club.name)}</h2><div class="xs">${esc(W.th.t)}: ${esc(W.th.d)}</div><div class="xs mut">Elenco: geral médio ${sqOvr(W.sq)} · ${esc(W.club.lname)}</div></div></div>
  <div class="ch-opp">${W.opp.map((o, i) => { const res = r.last?.[i]; return `<div class="ch-o" style="--d:${i * 0.06}s"><small>Jogo ${i + 1}</small>${crest(o, 34)}<b class="ell">${esc(o.short || o.name)}</b><span class="xs mut">${sqOvr(squadOf(o.key))} geral</span>${res ? `<i class="${res[0] > res[1] ? 'good' : res[0] < res[1] ? 'bad' : ''}">${res[0]}-${res[1]}</i>` : ''}</div>`; }).join('')}</div>
  <div class="ch-info"><div><small>Melhor pontuação</small><b>${r.best || 0}</b></div><div><small>Tentativas</small><b>${left}/${tries()}</b></div><div><small>Prêmio</small><b>até ${pfTag(300)}</b></div></div>
  <div class="xs mut">Todo mundo joga a mesma situação. O resultado depende só da sua escalação e da sua tática: mesma escolha, mesmo placar. Vitória vale 300, empate 100, cada gol de saldo 40 e cada gol feito 10.</div>
  <div class="row" style="gap:8px;margin-top:10px">${left ? '<button class="btn pri big grow" data-a="chstart">Começar tentativa</button>' : `${adOk() && adsLeft() ? '<button class="btn grow" data-a="chextra" data-v="ad">▶ Anúncio: +1 tentativa</button>' : ''}<button class="btn grow" data-a="chextra" data-v="pf">+1 tentativa ${pfTag(20)}</button>`}<button class="btn grow" data-a="chrank">Ranking da semana</button></div>`;
}
H.chextra = async (v) => { if (v === 'ad') { if (!(await watchAd())) return; } else if (!pfSpend(20, 'Tentativa extra no desafio')) return; const r = (O.ch[weekNo()] ||= {}); r.extra = (r.extra || 0) + 1; osave(); setBody(chHome()); };
let CH = null;
H.chstart = () => {
  const W = weekly(); if (tries() - used() <= 0) return; const r = (O.ch[W.n] ||= {}); r.tries = (r.tries || 0) + 1; osave();
  const t = { form: '4-3-3', ment: 1, press: 1, contra: 0, linha: 1, passe: 1 }; CH = { W, i: 0, res: [], t, xi: bestXI(W.sq, t.form) };
  openSheet(chMatchHtml()).parentElement.classList.add('wide');
};
function chMatchHtml() {
  const { W, i, t, xi } = CH; const o = W.opp[i]; const F = FORMATIONS[t.form]; const by = new Map(W.sq.map((p) => [p.k, p]));
  const seg = (k, opts) => `<div class="seg sm">${opts.map((x, j) => `<button class="${t[k] === j ? 'on' : ''}" data-a="cht" data-v="${k}:${j}">${x}</button>`).join('')}</div>`;
  const home = !W.th.away && i % 2 === 0;
  return `<div class="ch-play"><div class="ch-vs"><div>${crest(W.club, 44)}<b>${esc(W.club.short || W.club.name)}</b></div><div class="ch-mid"><small>JOGO ${i + 1} DE 5 · ${home ? 'EM CASA' : 'FORA'}</small><b>${CH.res.reduce((s, r) => s + r.pts, 0)} pts</b></div><div>${crest(o, 44)}<b>${esc(o.short || o.name)}</b></div></div>
  <div class="ch-grid"><div class="ch-pitch">${F.map(([pos, x, y], j) => { const p = by.get(xi[j]); return `<button class="ch-dot" style="left:${x * 100}%;top:${(1 - y) * 88 + 4}%" data-a="chslot" data-v="${j}"><b>${p ? p.ovr : '-'}</b><span>${esc(p ? p.n.split(' ').slice(-1)[0] : '?')}</span><i>${pos}</i></button>`; }).join('')}</div>
  <div class="ch-tac"><label>Formação</label><div class="ch-forms">${OFORMS.map((f) => `<button class="${t.form === f ? 'on' : ''}" data-a="chform" data-v="${f}">${f}</button>`).join('')}</div>
  <label>Mentalidade</label>${seg('ment', OMENT)}<label>Pressão</label>${seg('press', OPRESS)}<label>Linha defensiva</label>${seg('linha', ['Baixa', 'Média', 'Alta'])}<label>Contra-ataque</label>${seg('contra', ['Não', 'Sim'])}<label>Passes</label>${seg('passe', ['Curtos', 'Mistos', 'Longos'])}
  <div class="xs mut" style="margin-top:4px">Adversário: geral ${sqOvr(squadOf(o.key))}. Toque num jogador no campinho para trocar.</div></div></div>
  <button class="btn pri big blk" data-a="chplay">Jogar contra o ${esc(o.short || o.name)}</button></div>`;
}
H.cht = (v) => { const [k, j] = v.split(':'); CH.t[k] = +j; replaceSheet(chMatchHtml()); };
H.chform = (f) => { CH.t.form = f; CH.xi = bestXI(CH.W.sq, f); replaceSheet(chMatchHtml()); };
H.chslot = (j) => {
  const F = FORMATIONS[CH.t.form]; const pos = F[+j][0]; const cur = CH.xi[+j];
  const list = [...CH.W.sq].sort((a, b) => (b.ovr * (b.pos === pos ? 1 : 0.85)) - (a.ovr * (a.pos === pos ? 1 : 0.85)));
  openSheet(`<h2>Escolher ${pos}</h2><div class="list">${list.map((p) => `<button class="li ${p.k === cur ? 'on' : ''}" data-a="chpick" data-v="${j}|${esc(p.k)}"><span class="pos">${p.pos}</span><span class="grow">${esc(p.n)} <span class="xs mut">${p.age} anos${CH.xi.includes(p.k) && p.k !== cur ? ' · titular' : ''}</span></span><b>${p.ovr}</b></button>`).join('')}</div>`);
};
H.chpick = (v) => { const [j, k] = v.split('|'); const xi = CH.xi; const o = xi.indexOf(k); if (o >= 0) xi[o] = xi[+j]; xi[+j] = k; closeSheet(); replaceSheet(chMatchHtml()); };
H.chplay = () => {
  const { W, i } = CH; const o = W.opp[i]; const home = !W.th.away && i % 2 === 0;
  const B = { sq: squadOf(o.key) }; B.t = withSeed(hash(`cht:${W.n}:${i}`), () => ({ form: pick(['4-3-3', '4-4-2', '4-2-3-1', '3-5-2']), ment: pick([1, 1, 2, 0]), press: pick([1, 2, 1]), linha: 1, contra: pick([0, 0, 1]), passe: 1 })); B.xi = bestXI(B.sq, B.t.form);
  const r0 = playO(hash(`ch:${W.n}:${i}`), { sq: W.sq, xi: CH.xi, t: CH.t }, B, home);
  const my = home ? r0.gh : r0.ga, op = home ? r0.ga : r0.gh; const ev = r0.ev.map((e) => ({ ...e, mine: home ? e.s === 0 : e.s === 1 }));
  const pts = (my > op ? 300 : my === op ? 100 : 0) + (my - op) * 40 + my * 10;
  CH.res.push({ my, op, pts, ev, mvp: r0.mvp, pos: home ? r0.pos : 100 - r0.pos });
  replaceSheet(chResultHtml());
  setTimeout(() => document.querySelectorAll('.ch-ev').forEach((e, k) => setTimeout(() => e.classList.add('in'), 250 + k * 380)), 30);
};
function chResultHtml() {
  const { W, i } = CH; const o = W.opp[i]; const r = CH.res[i]; const last = i >= 4;
  return `<div class="ch-res"><div class="ch-score ${r.my > r.op ? 'win' : r.my < r.op ? 'loss' : 'draw'}"><div>${crest(W.club, 54)}<b>${esc(W.club.short)}</b></div><div class="ch-sc"><span class="cnt">${r.my}</span><i>×</i><span class="cnt">${r.op}</span><small>${r.my > r.op ? 'VITÓRIA' : r.my < r.op ? 'DERROTA' : 'EMPATE'} · +${Math.max(0, r.pts)} pts</small></div><div>${crest(o, 54)}<b>${esc(o.short)}</b></div></div>
  <div class="ch-evs">${r.ev.map((e) => `<div class="ch-ev ${e.mine ? 'me' : ''}"><i>${e.m}'</i>⚽ <b>${esc(e.n)}</b>${e.a ? ` <span class="xs mut">(${esc(e.a)})</span>` : ''}</div>`).join('') || '<div class="xs mut">Sem gols.</div>'}</div>
  <div class="xs mut">Posse ${r.pos}% · Melhor em campo: ${esc(r.mvp)}</div>
  <button class="btn pri big blk" style="margin-top:10px" data-a="${last ? 'chend' : 'chnext'}">${last ? 'Ver pontuação final' : 'Próximo jogo ›'}</button></div>`;
}
H.chnext = () => { CH.i++; replaceSheet(chMatchHtml()); };
H.chend = async () => {
  const { W } = CH; const sc = Math.max(0, CH.res.reduce((s, r) => s + r.pts, 0)); const rec = (O.ch[W.n] ||= {}); const better = sc > (rec.best || 0);
  if (better) { rec.best = sc; rec.last = CH.res.map((r) => [r.my, r.op]); O.chb = Math.max(O.chb || 0, sc); } osave();
  replaceSheet(`<div class="ch-end"><small>PONTUAÇÃO FINAL</small><div class="ch-big">${sc}</div><div class="ch-line">${CH.res.map((r) => `<span class="${r.my > r.op ? 'good' : r.my < r.op ? 'bad' : ''}">${r.my}-${r.op}</span>`).join('')}</div>${better ? '<div class="hint good">Novo recorde seu nesta semana!</div>' : `<div class="xs mut">Seu recorde da semana continua ${rec.best}.</div>`}<div id="chpos" class="xs mut">Enviando para o ranking…</div><div class="row" style="gap:8px;margin-top:10px"><button class="btn grow" data-a="chrank">Ranking da semana</button><button class="btn pri grow" data-a="chback">Voltar</button></div></div>`);
  try {
    if (better && me()) await api('PUT', `pr/ch/w${W.n}/${me()}`, { n: O.nick, sc, fr: (WAL.frame || '').slice(0, 10), vip: isVip(), r: rec.last.map((x) => x.join('-')).join(' '), t: { '.sv': 'timestamp' } });
    const j = await api('GET', `pr/ch/w${W.n}`, undefined, q({ orderBy: 'sc', startAt: (rec.best || 0) + 1, limitToFirst: 1000 }));
    const el = document.getElementById('chpos'); if (el) el.innerHTML = `Você está em <b>${Object.keys(j || {}).length + 1}º</b> no Desafio desta semana.`;
    syncProfile(true);
  } catch (e) { const el = document.getElementById('chpos'); if (el) el.textContent = 'Sem conexão: sua pontuação será enviada depois.'; rec.pend = 1; osave(); }
};
H.chback = () => { closeSheet(); setBody(chHome()); };
H.chrank = async (wk) => {
  const n = wk != null ? +wk : weekNo(); openSheet(`<h2>Ranking · Desafio ${n + 1}</h2><div id="chrk"><div class="pf-spin"></div></div>`);
  try { const j = await api('GET', `pr/ch/w${n}`, undefined, q({ orderBy: 'sc', limitToLast: 100 })); const L = Object.entries(j || {}).map(([u, r]) => ({ u, ...r })).sort((a, b) => b.sc - a.sc);
    document.getElementById('chrk').innerHTML = `<div class="on-rank">${L.map((r, i) => `<div class="on-row ${r.u === me() ? 'me' : ''} ${i < 3 ? 'top' + (i + 1) : ''}"><span class="on-p">${i + 1}</span>${avatar(r.n, r.fr, r.vip, 30)}<span class="grow ell"><b>${esc(r.n)}</b><small>${esc(r.r || '')}</small></span><span class="on-sc">${r.sc}</span></div>`).join('') || '<div class="hint">Ninguém jogou ainda. Seja o primeiro!</div>'}</div><div class="xs mut" style="margin-top:6px">Prêmios no fim da semana: 1º lugar 300, 2º e 3º 200, até o 10º 120, até o 50º 60, quem jogou 20 Pranfixas.</div>`;
  } catch (e) { document.getElementById('chrk').innerHTML = offline(e); }
};
// prêmio das semanas que já acabaram
async function chRewards() {
  const now = weekNo();
  for (const [wk, r] of Object.entries(O.ch)) {
    const n = +wk; if (n >= now || O.paid.includes(n) || !r.best) continue;
    try {
      if (r.pend && me()) { await api('PUT', `pr/ch/w${n}/${me()}`, { n: O.nick, sc: r.best, fr: (WAL.frame || '').slice(0, 10), vip: isVip(), r: (r.last || []).map((x) => x.join('-')).join(' '), t: { '.sv': 'timestamp' } }).catch(() => {}); r.pend = 0; }
      const j = await api('GET', `pr/ch/w${n}`, undefined, q({ orderBy: 'sc', startAt: r.best + 1, limitToFirst: 60 })); const pos = Object.keys(j || {}).length + 1;
      const v = pos === 1 ? 300 : pos <= 3 ? 200 : pos <= 10 ? 120 : pos <= 50 ? 60 : 20; O.paid.push(n); osave(); pfAdd(v, `Desafio ${n + 1}: ${pos}º lugar`);
    } catch { break; }
  }
  if (O.paid.length > 60) { O.paid = O.paid.slice(-60); osave(); }
  for (const k of Object.keys(O.ch)) if (+k < now - 8) delete O.ch[k];
}
