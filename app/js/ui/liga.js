// Liga online entre amigos: código de convite, mínimo de participantes, rodadas em horário fixo,
// escalação e tática, resultados iguais para todos (simulação previsível) e mercado entre os participantes.
import { S, H, openSheet, closeSheet, replaceSheet, centerNote } from './app.js';
import { esc, hash, withSeed, pick, shuffle, money } from '../util.js';
import { crest } from './art.js';
import { FORMATIONS } from '../engine/match.js';
import { allClubs, clubByKey, squadOf, bestXI, fixXI, playO, sqOvr, pValue, roundRobin, OFORMS, OMENT, OPRESS } from '../engine/osim.js';
import { ONL } from './online.js';
import { pfAdd, isVip, W as WAL, frameColor } from './loja.js';

const { O, api, me, osave } = ONL;
O.lgs ||= []; O.lgPaid ||= {};
const BUD0 = 30e6, PR_W = 1.5e6, PR_D = 0.5e6, PR_L = 0.2e6, MINSQ = 16, MAXSQ = 26;
let L = null; let CODE = null; let LT = 'tab';
const avatar = (n, fr, size = 30) => `<span class="on-av" style="--fc:${frameColor(fr) || '#ffffff22'};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px">${esc((n || '?')[0].toUpperCase())}</span>`;
const body = (h) => { const b = document.getElementById('onbody'); if (b) b.innerHTML = h; };
const fmtT = (t) => new Date(t).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const sqArr = (o) => (Array.isArray(o) ? o : Object.values(o || {})).filter(Boolean);

// ---------- lista de ligas ----------
function home() {
  return `<div id="lghome"><div class="lg-cta"><button class="btn pri big grow" data-a="lgnew">Criar uma liga</button><div class="row grow" style="gap:6px"><input id="lgcode" maxlength="6" placeholder="Código (ex.: K7P2QX)" style="text-transform:uppercase" class="grow"><button class="btn" data-a="lgjoin">Entrar</button></div></div>
  <h3>Minhas ligas</h3><div id="lglist">${O.lgs.length ? '<div class="pf-spin"></div>' : '<div class="hint">Crie uma liga e mande o código para seus amigos. Cada um escolhe um clube real, e as rodadas acontecem sozinhas no horário marcado, mesmo com o jogo fechado.</div>'}</div></div>`;
}
async function load() {
  if (!O.lgs.length) return;
  const rows = await Promise.all(O.lgs.map((c) => api('GET', `pr/lg/${c}/meta`).then((m) => [c, m]).catch(() => [c, null])));
  const el = document.getElementById('lglist'); if (!el) return;
  el.innerHTML = rows.map(([c, m]) => m ? `<button class="lg-card" data-a="lgopen" data-v="${c}"><b>${esc(m.name)}</b><small>${m.st === 'lobby' ? 'Esperando jogadores' : m.st === 'end' ? 'Encerrada' : 'Em andamento'} · código ${c}</small><i>›</i></button>` : `<div class="lg-card off"><b>Liga ${c}</b><small>Não encontrada</small><button class="btn sm ghost" data-a="lgforget" data-v="${c}">Tirar</button></div>`).join('');
}
window.PLIGA = { home, load };
H.lgforget = (c) => { O.lgs = O.lgs.filter((x) => x !== c); osave(); body(home()); load(); };

// ---------- criar ----------
H.lgnew = () => openSheet(`<h2>Nova liga com amigos</h2>
  <div class="field"><label>Nome da liga</label><input id="lgn" maxlength="30" placeholder="Ex.: Liga da Firma"></div>
  <div class="field"><label>Mínimo de participantes para começar</label><div class="seg" id="lgmin">${[2, 4, 6, 8, 10].map((n) => `<button class="${n === 4 ? 'on' : ''}" data-a="lgsel" data-v="lgmin:${n}">${n}</button>`).join('')}</div></div>
  <div class="field"><label>Máximo de participantes</label><div class="seg" id="lgmax">${[6, 8, 12, 16, 20].map((n) => `<button class="${n === 12 ? 'on' : ''}" data-a="lgsel" data-v="lgmax:${n}">${n}</button>`).join('')}</div></div>
  <div class="field"><label>Horário das rodadas (Brasília)</label><div class="seg" id="lghr">${[12, 18, 20, 21, 22].map((n) => `<button class="${n === 20 ? 'on' : ''}" data-a="lgsel" data-v="lghr:${n}">${n}h</button>`).join('')}</div></div>
  <div class="field"><label>Rodadas por dia</label><div class="seg" id="lgper">${[[1, '1 por dia'], [2, '2 por dia (de 12 em 12h)']].map(([n, t]) => `<button class="${n === 1 ? 'on' : ''}" data-a="lgsel" data-v="lgper:${n}">${t}</button>`).join('')}</div></div>
  <div class="xs mut">Todos jogam contra todos, ida e volta. Cada um começa com ${money(BUD0)} para o mercado. Vitória rende ${money(PR_W)}.</div>
  <button class="btn pri big blk" style="margin-top:10px" data-a="lgcreate">Criar liga</button>`);
const SEL = { lgmin: 4, lgmax: 12, lghr: 20, lgper: 1 };
H.lgsel = (v) => { const [k, n] = v.split(':'); SEL[k] = +n; document.querySelectorAll(`#${k} button`).forEach((b) => b.classList.toggle('on', b.dataset.v === v)); };
H.lgcreate = async () => {
  const name = (document.getElementById('lgn')?.value || '').replace(/[<>]/g, '').trim().slice(0, 30) || `Liga do ${O.nick}`;
  if (SEL.lgmax < SEL.lgmin) SEL.lgmax = SEL.lgmin;
  const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let code = ''; for (let i = 0; i < 6; i++) code += ABC[Math.floor(Math.random() * ABC.length)];
  try {
    await api('PUT', `pr/lg/${code}/meta`, { name, own: me(), min: SEL.lgmin, max: SEL.lgmax, hr: SEL.lghr, per: SEL.lgper, st: 'lobby', v: 1, t: { '.sv': 'timestamp' } });
    O.lgs.unshift(code); osave(); closeSheet(); CODE = code; pickClub(true);
  } catch (e) { centerNote('Não consegui criar a liga. Confira a internet.'); }
};
H.lgjoin = async () => {
  const code = (document.getElementById('lgcode')?.value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (code.length !== 6) { centerNote('O código tem 6 letras/números.'); return; }
  try { const m = await api('GET', `pr/lg/${code}/meta`); if (!m) { centerNote('Liga não encontrada.'); return; }
    const mem = await api('GET', `pr/lg/${code}/mem`) || {};
    if (mem[me()]) { if (!O.lgs.includes(code)) { O.lgs.unshift(code); osave(); } return H.lgopen(code); }
    if (m.st !== 'lobby') { centerNote('Essa liga já começou.'); return; } if (Object.keys(mem).length >= m.max) { centerNote('Essa liga está cheia.'); return; }
    CODE = code; pickClub(false, mem);
  } catch { centerNote('Sem conexão.'); }
};
// escolher o clube (cada clube só pode ter um dono na liga)
let PC = null;
function pickClub(owner, mem = {}) {
  const taken = new Set(Object.values(mem).map((m) => m.club)); PC = { taken, q: '', owner };
  openSheet(pcHtml()).parentElement.classList.add('wide');
}
function pcHtml() {
  const qq = PC.q.toLowerCase(); const list = allClubs().filter((c) => !PC.taken.has(c.key) && (!qq || c.name.toLowerCase().includes(qq) || (c.city || '').toLowerCase().includes(qq))).sort((a, b) => b.rep - a.rep).slice(0, 60);
  return `<h2>Escolha seu clube</h2><input id="pcq" placeholder="Buscar clube…" value="${esc(PC.q)}" data-in="pcq" style="width:100%;margin-bottom:8px">
  <div class="lg-clubs">${list.map((c) => `<button class="lg-club" data-a="pcgo" data-v="${esc(c.key)}">${crest(c, 34)}<span class="grow ell"><b>${esc(c.name)}</b><small>${c.flag} ${esc(c.lname)} · geral ${sqOvr(squadOf(c.key))}</small></span></button>`).join('')}</div>`;
}
H.pcq = (v) => { PC.q = v; const el = document.querySelector('.lg-clubs'); if (el) el.outerHTML = pcHtml().split('</h2>')[1].replace(/^<input[^>]*>/, ''); };
H.pcgo = async (key) => {
  const code = CODE; try {
    const mem = await api('GET', `pr/lg/${code}/mem`) || {}; if (Object.values(mem).some((m) => m.club === key && m !== mem[me()])) { centerNote('Esse clube acabou de ser escolhido. Escolha outro.'); return; }
    const sq = squadOf(key).slice(0, MAXSQ);
    await api('PUT', `pr/lg/${code}/sq/${me()}`, sq);
    await api('PUT', `pr/lg/${code}/mem/${me()}`, { n: O.nick, fr: (WAL.frame || '').slice(0, 10), vip: isVip(), club: key, bud: BUD0, j: { '.sv': 'timestamp' } });
    if (!O.lgs.includes(code)) O.lgs.unshift(code); osave(); closeSheet(true); centerNote(`Você está na liga com o ${clubByKey(key)?.name}!`, 2200); H.tonline('liga'); setTimeout(() => H.lgopen(code), 300);
  } catch (e) { centerNote('Não consegui entrar na liga.'); }
};

// ---------- abrir uma liga ----------
H.lgopen = async (code) => {
  CODE = code; const el = document.getElementById('onbody'); if (!el) { H.tonline('liga'); setTimeout(() => H.lgopen(code), 200); return; }
  body('<div class="pf-spin"></div>');
  try { const d = await api('GET', `pr/lg/${code}`); if (!d?.meta) { body('<div class="hint">Liga não encontrada.</div>'); return; } L = prep(code, d); await processRounds(); render(); }
  catch (e) { body(`<div class="hint">Sem conexão com a liga.</div><button class="btn blk" data-a="lgopen" data-v="${code}">Tentar de novo</button>`); }
};
function prep(code, d) {
  const mem = d.mem || {}; const ids = Object.keys(mem).sort((a, b) => (mem[a].j || 0) - (mem[b].j || 0) || (a < b ? -1 : 1));
  const per = d.meta.per || 1; const gap = 864e5 / per;
  const R = d.meta.st !== 'lobby' && d.meta.start ? roundRobin(ids) : [];
  return { code, ...d, mem, ids, R, gap, sq: d.sq || {}, ln: d.ln || {}, res: d.res || {}, of: d.of || {}, fa: d.fa || {} };
}
const rTime = (r) => L.meta.start + r * L.gap;
function teamOf(u) {
  const sq = sqArr(L.sq[u]); const ln = L.ln[u] || {}; const t = { form: FORMATIONS[ln.form] ? ln.form : '4-3-3', ment: ln.ment ?? 1, press: ln.press ?? 1, linha: ln.linha ?? 1, contra: ln.contra ?? 0, passe: ln.passe ?? 1 };
  return { sq, t, xi: fixXI(sq, String(ln.xi || '').split('|'), t.form) };
}
async function processRounds() {
  if (L.meta.st === 'lobby' || !L.R.length) return;
  let wrote = false;
  for (let r = 0; r < L.R.length; r++) {
    if (Date.now() < rTime(r)) break; if (L.res[r]) continue;
    const m = L.R[r].map(([a, b], i) => { const x = playO(hash(`${L.code}:${r}:${i}`), teamOf(a), teamOf(b), true); return { a, b, gh: x.gh, ga: x.ga, ev: x.ev.map((e) => `${e.m}'${e.s}${e.n}`).join('|').slice(0, 400), mvp: x.mvp }; });
    try { await api('PUT', `pr/lg/${L.code}/res/${r}`, { m, t: { '.sv': 'timestamp' } }); L.res[r] = { m }; wrote = true; } catch { const x = await api('GET', `pr/lg/${L.code}/res/${r}`).catch(() => null); if (x) L.res[r] = x; else break; }
  }
  if (wrote || true) await settleOffers();
  if (L.R.length && Object.keys(L.res).length >= L.R.length && L.meta.st !== 'end' && L.meta.own === me()) { try { await api('PATCH', `pr/lg/${L.code}/meta`, { st: 'end' }); L.meta.st = 'end'; } catch {} }
  payMe();
}
function table() {
  const T = {}; for (const u of L.ids) T[u] = { u, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0, last: [] };
  for (let r = 0; r < L.R.length; r++) { const x = L.res[r]; if (!x) continue; for (const m of sqArr(x.m)) { const A = T[m.a], B = T[m.b]; if (!A || !B) continue; A.j++; B.j++; A.gp += m.gh; A.gc += m.ga; B.gp += m.ga; B.gc += m.gh; if (m.gh > m.ga) { A.v++; A.pts += 3; B.d++; A.last.push('v'); B.last.push('d'); } else if (m.gh < m.ga) { B.v++; B.pts += 3; A.d++; A.last.push('d'); B.last.push('v'); } else { A.e++; B.e++; A.pts++; B.pts++; A.last.push('e'); B.last.push('e'); } } }
  return Object.values(T).sort((a, b) => b.pts - a.pts || (b.gp - b.gc) - (a.gp - a.gc) || b.gp - a.gp || (a.u < b.u ? -1 : 1));
}
const budOf = (u) => { const t = table().find((x) => x.u === u); return (L.mem[u]?.bud ?? BUD0) + (t ? t.v * PR_W + t.e * PR_D + t.d * PR_L : 0); };
function payMe() {
  const t = table().find((x) => x.u === me()); if (!t) return; const paid = O.lgPaid[L.code] || 0;
  if (t.v > paid) { O.lgPaid[L.code] = t.v; osave(); pfAdd((t.v - paid) * 10, `Vitórias na liga ${L.meta.name}`, true); }
  if (L.meta.st === 'end' && table()[0]?.u === me() && !O.lgPaid[L.code + ':c']) { O.lgPaid[L.code + ':c'] = 1; O.lgw = (O.lgw || 0) + 1; osave(); pfAdd(200, `Campeão da liga ${L.meta.name}!`); window.PONLINE_SYNC?.(); }
}

// ---------- tela da liga ----------
function render() {
  const m = L.meta; const tabs = m.st === 'lobby' ? [['lobby', 'Sala de espera']] : [['tab', 'Tabela'], ['rod', 'Rodadas'], ['time', 'Meu time'], ['merc', 'Mercado'], ['mem', 'Participantes']];
  if (!tabs.some((t) => t[0] === LT)) LT = tabs[0][0];
  const next = L.R.findIndex((_, r) => !L.res[r]);
  body(`<div class="lg-hd"><button class="btn sm ghost" data-a="ontab" data-v="liga">‹ Ligas</button><div class="grow"><b>${esc(m.name)}</b><small>Código <b class="lg-code">${L.code}</b> · ${m.st === 'lobby' ? `${L.ids.length}/${m.max} participantes (mín. ${m.min})` : m.st === 'end' ? 'Liga encerrada' : next >= 0 ? `Rodada ${next + 1}/${L.R.length} · ${fmtT(rTime(next))}` : ''}</small></div><button class="btn sm" data-a="lginvite">Convidar</button><button class="btn sm ghost" data-a="lgopen" data-v="${L.code}">↻</button></div>
  <div class="seg sm lg-tabs">${tabs.map(([k, t]) => `<button class="${LT === k ? 'on' : ''}" data-a="lgt" data-v="${k}">${t}</button>`).join('')}</div><div id="lgbody">${tabHtml()}</div>`);
}
H.lgt = (v) => { LT = v; render(); };
const nm = (u) => L.mem[u]?.n || '?'; const ck = (u) => clubByKey(L.mem[u]?.club) || { name: '?', short: '?', c1: '#444', c2: '#fff' };
function tabHtml() {
  if (LT === 'lobby') {
    const ok = L.ids.length >= L.meta.min; const own = L.meta.own === me();
    return `<div class="lg-lobby">${L.ids.map((u) => `<div class="li">${avatar(nm(u), L.mem[u].fr)}${crest(ck(u), 30)}<span class="grow"><b>${esc(nm(u))}</b><div class="xs mut">${esc(ck(u).name)}${u === L.meta.own ? ' · criador' : ''}</div></span></div>`).join('')}</div>
    <div class="hint">${ok ? 'Já tem gente suficiente para começar!' : `Faltam ${L.meta.min - L.ids.length} para o mínimo. Mande o código <b>${L.code}</b> para os amigos.`} As rodadas serão ${L.meta.per === 2 ? 'de 12 em 12 horas' : 'todo dia'} às ${L.meta.hr}h (horário de Brasília).</div>
    ${own ? `<button class="btn pri big blk" ${ok ? '' : 'disabled'} data-a="lgstart">Começar a liga</button>` : '<div class="xs mut">Quem criou a liga é quem aperta para começar.</div>'}`;
  }
  if (LT === 'tab') {
    const T = table(); const champ = L.meta.st === 'end' ? T[0] : null;
    return `${champ ? `<div class="lg-champ">🏆 <b>${esc(nm(champ.u))}</b> é o campeão com o ${esc(ck(champ.u).name)}!</div>` : ''}<table class="tbl lg-tbl"><tr><th>#</th><th style="text-align:left">Técnico</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>Últimos</th></tr>${T.map((r, i) => `<tr class="${r.u === me() ? 'me' : ''}"><td>${i + 1}</td><td style="text-align:left"><span class="row" style="gap:6px">${crest(ck(r.u), 22)}<span class="ell"><b>${esc(nm(r.u))}</b> <span class="xs mut">${esc(ck(r.u).short)}</span></span></span></td><td><b>${r.pts}</b></td><td>${r.j}</td><td>${r.v}</td><td>${r.e}</td><td>${r.gp - r.gc}</td><td><span class="lg-last">${r.last.slice(-5).map((x) => `<i class="${x}"></i>`).join('')}</span></td></tr>`).join('')}</table>`;
  }
  if (LT === 'rod') {
    return L.R.map((ms, r) => { const x = L.res[r]; const open = !x && (r === 0 || L.res[r - 1]);
      return `<div class="lg-round ${x ? '' : 'next'}"><div class="row xs"><b class="grow">Rodada ${r + 1}</b><span class="mut">${x ? 'Encerrada' : fmtT(rTime(r))}${open ? ` · <b class="lg-cd" data-t="${rTime(r)}">${cd(rTime(r))}</b>` : ''}</span></div>${(x ? sqArr(x.m) : ms.map(([a, b]) => ({ a, b }))).map((m, i) => `<button class="lg-m ${m.a === me() || m.b === me() ? 'me' : ''}" ${x ? `data-a="lgmatch" data-v="${r}:${i}"` : ''}><span class="grow ell" style="text-align:right">${esc(nm(m.a))}</span>${crest(ck(m.a), 22)}<b>${x ? `${m.gh} - ${m.ga}` : '×'}</b>${crest(ck(m.b), 22)}<span class="grow ell">${esc(nm(m.b))}</span></button>`).join('')}</div>`; }).filter((h, r) => r < (L.R.findIndex((_, k) => !L.res[k]) + 3 || 999)).join('');
  }
  if (LT === 'time') return teamHtml();
  if (LT === 'merc') return mercHtml();
  if (LT === 'mem') return L.ids.map((u) => { const sq = sqArr(L.sq[u]); return `<button class="li" data-a="lgsq" data-v="${u}">${avatar(nm(u), L.mem[u].fr)}${crest(ck(u), 28)}<span class="grow"><b>${esc(nm(u))}</b><div class="xs mut">${esc(ck(u).name)} · ${sq.length} jogadores · geral ${sqOvr(sq)} · caixa ${money(budOf(u))}</div></span><span>›</span></button>`; }).join('');
  return '';
}
const cd = (t) => { const s = Math.max(0, Math.round((t - Date.now()) / 1000)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return s <= 0 ? 'agora' : h > 0 ? `em ${h}h${String(m).padStart(2, '0')}` : `em ${m} min`; };
setInterval(() => document.querySelectorAll('.lg-cd').forEach((e) => (e.textContent = cd(+e.dataset.t))), 30000);
H.lginvite = () => { const t = `Bora jogar minha liga no Prancheta ⚽\nLiga: ${L.meta.name}\nCódigo: ${L.code}\n\nBaixe o jogo, vá em Online → Liga com amigos e coloque o código: https://lumbragames.github.io/Prancheta/`; const u = 'https://wa.me/?text=' + encodeURIComponent(t); try { window.PranchetaNative?.openUrl ? window.PranchetaNative.openUrl(u) : window.open(u, '_blank'); } catch {} };
H.lgstart = async () => {
  if (L.meta.own !== me() || L.ids.length < L.meta.min) return;
  // primeira rodada: próximo horário marcado com pelo menos 2 horas de folga
  const now = Date.now(); const d = new Date(now - 3 * 3600e3); let t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), L.meta.hr + 3);
  while (t < now + 2 * 3600e3) t += L.gap;
  try { await api('PATCH', `pr/lg/${L.code}/meta`, { st: 'run', start: t }); centerNote(`Liga começou! 1ª rodada: ${fmtT(t)}`, 2600); H.lgopen(L.code); } catch { centerNote('Não consegui começar a liga.'); }
};
H.lgmatch = (v) => {
  const [r, i] = v.split(':').map(Number); const m = sqArr(L.res[r].m)[i]; const ev = String(m.ev || '').split('|').filter(Boolean).map((s) => { const x = s.match(/^(\d+)'(\d)(.*)$/); return x ? { m: +x[1], s: +x[2], n: x[3] } : null; }).filter(Boolean);
  openSheet(`<div class="ch-res"><div class="ch-score"><div>${crest(ck(m.a), 50)}<b>${esc(nm(m.a))}</b></div><div class="ch-sc"><span>${m.gh}</span><i>×</i><span>${m.ga}</span><small>RODADA ${r + 1}</small></div><div>${crest(ck(m.b), 50)}<b>${esc(nm(m.b))}</b></div></div><div class="ch-evs">${ev.map((e) => `<div class="ch-ev in ${e.s ? '' : 'me'}"><i>${e.m}'</i>⚽ <b>${esc(e.n)}</b> <span class="xs mut">${esc(ck(e.s ? m.b : m.a).short)}</span></div>`).join('') || '<div class="xs mut">Sem gols.</div>'}</div><div class="xs mut">Melhor em campo: ${esc(m.mvp || '')}</div></div>`);
};

// ---------- meu time (escalação e tática valem para as próximas rodadas) ----------
let TM = null;
function teamHtml() {
  if (!L.mem[me()]) return '<div class="hint">Você não participa desta liga.</div>';
  if (!TM || TM.code !== L.code) { const T = teamOf(me()); TM = { code: L.code, ...T, dirty: false }; }
  const F = FORMATIONS[TM.t.form]; const by = new Map(TM.sq.map((p) => [p.k, p])); const t = TM.t;
  const seg = (k, o) => `<div class="seg sm">${o.map((x, j) => `<button class="${t[k] === j ? 'on' : ''}" data-a="tmt" data-v="${k}:${j}">${x}</button>`).join('')}</div>`;
  const next = L.R.findIndex((_, r) => !L.res[r]);
  return `<div class="xs mut" style="margin-bottom:6px">${next >= 0 ? `Vale para a rodada ${next + 1} (${fmtT(rTime(next))}) e as seguintes. Se não mexer, o time joga com a última escalação salva.` : ''}</div>
  <div class="ch-grid"><div class="ch-pitch">${F.map(([pos, x, y], j) => { const p = by.get(TM.xi[j]); return `<button class="ch-dot" style="left:${x * 100}%;top:${(1 - y) * 88 + 4}%" data-a="tmslot" data-v="${j}"><b>${p ? p.ovr : '-'}</b><span>${esc(p ? p.n.split(' ').slice(-1)[0] : '?')}</span><i>${pos}</i></button>`; }).join('')}</div>
  <div class="ch-tac"><label>Formação</label><div class="ch-forms">${OFORMS.map((f) => `<button class="${t.form === f ? 'on' : ''}" data-a="tmform" data-v="${f}">${f}</button>`).join('')}</div>
  <label>Mentalidade</label>${seg('ment', OMENT)}<label>Pressão</label>${seg('press', OPRESS)}<label>Linha defensiva</label>${seg('linha', ['Baixa', 'Média', 'Alta'])}<label>Contra-ataque</label>${seg('contra', ['Não', 'Sim'])}<label>Passes</label>${seg('passe', ['Curtos', 'Mistos', 'Longos'])}</div></div>
  <button class="btn ${TM.dirty ? 'pri' : ''} big blk" data-a="tmsave">${TM.dirty ? 'Salvar escalação' : 'Escalação salva ✓'}</button>`;
}
const reTeam = () => { const b = document.getElementById('lgbody'); if (b) b.innerHTML = teamHtml(); };
H.tmt = (v) => { const [k, j] = v.split(':'); TM.t[k] = +j; TM.dirty = true; reTeam(); };
H.tmform = (f) => { TM.t.form = f; TM.xi = bestXI(TM.sq, f); TM.dirty = true; reTeam(); };
H.tmslot = (j) => { const pos = FORMATIONS[TM.t.form][+j][0]; const cur = TM.xi[+j]; const list = [...TM.sq].sort((a, b) => b.ovr * (b.pos === pos ? 1 : 0.85) - a.ovr * (a.pos === pos ? 1 : 0.85));
  openSheet(`<h2>Escolher ${pos}</h2><div class="list">${list.map((p) => `<button class="li ${p.k === cur ? 'on' : ''}" data-a="tmpick" data-v="${j}|${esc(p.k)}"><span class="pos">${p.pos}</span><span class="grow">${esc(p.n)} <span class="xs mut">${p.age} anos${TM.xi.includes(p.k) && p.k !== cur ? ' · titular' : ''}</span></span><b>${p.ovr}</b></button>`).join('')}</div>`); };
H.tmpick = (v) => { const [j, k] = v.split('|'); const o = TM.xi.indexOf(k); if (o >= 0) TM.xi[o] = TM.xi[+j]; TM.xi[+j] = k; TM.dirty = true; closeSheet(); reTeam(); };
H.tmsave = async () => { if (!TM.dirty) return; try { await api('PUT', `pr/lg/${L.code}/ln/${me()}`, { ...TM.t, xi: TM.xi.join('|').slice(0, 900) }); L.ln[me()] = { ...TM.t, xi: TM.xi.join('|') }; TM.dirty = false; reTeam(); centerNote('Escalação salva!'); } catch { centerNote('Não consegui salvar. Confira a internet.'); } };

// ---------- mercado ----------
// jogadores livres da liga (sempre os mesmos para a liga) + propostas entre participantes
function freeAgents() {
  return withSeed(hash('fa:' + L.code), () => { const pool = shuffle(allClubs().filter((c) => !L.ids.some((u) => L.mem[u].club === c.key) && c.rep >= 45)).slice(0, 14); const out = []; for (const c of pool) { const sq = squadOf(c.key).filter((p) => !p.gen).sort((a, b) => b.ovr - a.ovr); const p = sq[2 + out.length % 4] || sq[0]; if (p) out.push({ ...p, from: c.short || c.name }); } return out; });
}
function mercHtml() {
  const mine = sqArr(L.sq[me()]); const offs = Object.entries(L.of).map(([id, o]) => ({ id, ...o }));
  const inc = offs.filter((o) => o.to === me() && o.st === 'open'); const out = offs.filter((o) => o.f === me() && ['open', 'acc', 'rej'].includes(o.st));
  const fa = freeAgents();
  return `<div class="lg-mk-hd"><div><small>Seu caixa</small><b>${money(budOf(me()))}</b></div><div><small>Elenco</small><b>${mine.length}/${MAXSQ}</b></div><div class="xs mut grow">Vitória ${money(PR_W)} · empate ${money(PR_D)} · derrota ${money(PR_L)}</div></div>
  ${inc.length ? `<h3>Propostas recebidas</h3>${inc.map((o) => `<div class="li"><span class="grow"><b>${esc(nm(o.f))}</b> quer <b>${esc(o.pn)}</b> por <b>${money(o.v)}</b></span><button class="btn sm pri" data-a="ofacc" data-v="${o.id}">Aceitar</button><button class="btn sm" data-a="ofrej" data-v="${o.id}">Recusar</button></div>`).join('')}` : ''}
  ${out.length ? `<h3>Suas propostas</h3>${out.map((o) => `<div class="li"><span class="grow">${esc(o.pn)} (${esc(nm(o.to))}) · ${money(o.v)}</span><span class="xs ${o.st === 'rej' ? 'bad' : 'mut'}">${o.st === 'open' ? 'Esperando resposta' : o.st === 'acc' ? 'Aceita, finalizando…' : 'Recusada'}</span>${o.st !== 'acc' ? `<button class="btn sm ghost" data-a="ofcan" data-v="${o.id}">✕</button>` : ''}</div>`).join('')}` : ''}
  <h3>Jogadores livres <span class="xs mut">(quem chegar primeiro leva)</span></h3><div class="list">${fa.map((p, i) => { const own = L.fa[i]; return `<div class="li sm"><span class="pos">${p.pos}</span><span class="grow">${esc(p.n)} <span class="xs mut">${p.age} anos · ex-${esc(p.from)}</span></span><b>${p.ovr}</b>${own ? `<span class="xs mut">${esc(nm(own))}</span>` : `<button class="btn sm" data-a="fabuy" data-v="${i}">${money(pValue(p))}</button>`}</div>`; }).join('')}</div>
  <h3>Elencos dos outros</h3><div class="xs mut">Toque num participante para ver o elenco e fazer proposta.</div>${L.ids.filter((u) => u !== me()).map((u) => `<button class="li sm" data-a="lgsq" data-v="${u}">${crest(ck(u), 24)}<span class="grow">${esc(nm(u))} · ${esc(ck(u).short)}</span><span>›</span></button>`).join('')}
  <h3>Vender para fora</h3><div class="xs mut">Libera o jogador por 60% do valor (elenco mínimo de ${MINSQ}).</div><div class="list">${mine.sort((a, b) => b.ovr - a.ovr).map((p) => `<div class="li sm"><span class="pos">${p.pos}</span><span class="grow">${esc(p.n)} <span class="xs mut">${p.age}</span></span><b>${p.ovr}</b><button class="btn sm ghost" data-a="lgsell" data-v="${esc(p.k)}">${money(pValue(p) * 0.6)}</button></div>`).join('')}</div>`;
}
const reMk = () => { const b = document.getElementById('lgbody'); if (b) b.innerHTML = mercHtml(); };
H.lgsq = (u) => {
  const sq = sqArr(L.sq[u]).sort((a, b) => b.ovr - a.ovr); const other = u !== me();
  openSheet(`<h2>${crest(ck(u), 30)} ${esc(ck(u).name)}</h2><div class="xs mut">Técnico: ${esc(nm(u))} · geral ${sqOvr(sq)}</div><div class="list" style="margin-top:8px">${sq.map((p) => `<div class="li sm"><span class="pos">${p.pos}</span><span class="grow">${esc(p.n)} <span class="xs mut">${p.age} anos</span></span><b>${p.ovr}</b>${other && L.meta.st === 'run' ? `<button class="btn sm" data-a="ofnew" data-v="${u}|${esc(p.k)}">Proposta</button>` : ''}</div>`).join('')}</div>`);
};
H.ofnew = (v) => { const [u, k] = v.split('|'); const p = sqArr(L.sq[u]).find((x) => x.k === k); if (!p) return; const base = pValue(p);
  openSheet(`<h2>Proposta por ${esc(p.n)}</h2><div class="xs mut">${p.pos} · ${p.age} anos · geral ${p.ovr} · valor estimado ${money(base)}</div><div class="field"><label>Valor (seu caixa: ${money(budOf(me()))})</label><input type="range" id="ofv" min="${Math.round(base * 0.5)}" max="${Math.round(base * 2.5)}" step="100000" value="${base}" data-in="ofv"><b id="ofvl">${money(base)}</b></div><button class="btn pri big blk" data-a="ofsend" data-v="${u}|${esc(k)}">Enviar proposta</button>`); };
H.ofv = (v) => { const el = document.getElementById('ofvl'); if (el) el.textContent = money(+v); };
H.ofsend = async (v) => {
  const [u, k] = v.split('|'); const p = sqArr(L.sq[u]).find((x) => x.k === k); const val = +(document.getElementById('ofv')?.value || 0); if (!p || !val) return;
  if (val > budOf(me())) { centerNote('Você não tem caixa para esse valor.'); return; } if (sqArr(L.sq[me()]).length >= MAXSQ) { centerNote(`Seu elenco já tem ${MAXSQ} jogadores. Venda alguém antes.`); return; }
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  try { const o = { f: me(), to: u, pk: k, pn: p.n.slice(0, 40), v: val, st: 'open', t: { '.sv': 'timestamp' } }; await api('PUT', `pr/lg/${L.code}/of/${id}`, o); L.of[id] = o; closeSheet(true); centerNote('Proposta enviada!'); reMk(); } catch { centerNote('Não consegui enviar.'); }
};
const setOf = (id, st) => api('PATCH', `pr/lg/${L.code}/of/${id}`, { st }).then(() => { L.of[id].st = st; });
H.ofrej = async (id) => { try { await setOf(id, 'rej'); reMk(); } catch {} };
H.ofcan = async (id) => { try { await setOf(id, 'can'); reMk(); } catch {} };
H.ofacc = async (id) => {
  const o = L.of[id]; if (!o || o.to !== me()) return; const sq = sqArr(L.sq[me()]); if (sq.length <= MINSQ) { centerNote(`Seu elenco precisa ter pelo menos ${MINSQ} jogadores.`); return; }
  const p = sq.find((x) => x.k === o.pk); if (!p) { await setOf(id, 'rej').catch(() => {}); reMk(); return; }
  try { const nsq = sq.filter((x) => x.k !== o.pk); await api('PUT', `pr/lg/${L.code}/sq/${me()}`, nsq); await api('PATCH', `pr/lg/${L.code}/mem/${me()}`, { bud: (L.mem[me()].bud ?? BUD0) + o.v }); await api('PATCH', `pr/lg/${L.code}/of/${id}`, { st: 'acc', pj: p });
    L.sq[me()] = nsq; L.mem[me()].bud = (L.mem[me()].bud ?? BUD0) + o.v; L.of[id].st = 'acc'; centerNote(`${p.n} vendido por ${money(o.v)}!`); reMk(); } catch { centerNote('Não consegui concluir.'); }
};
// quem comprou finaliza a transferência quando a outra parte aceitou
async function settleOffers() {
  for (const [id, o] of Object.entries(L.of)) {
    if (o.f !== me() || o.st !== 'acc' || !o.pj) continue;
    const sq = sqArr(L.sq[me()]); if (!sq.some((p) => p.k === o.pj.k)) sq.push(o.pj);
    try { await api('PUT', `pr/lg/${L.code}/sq/${me()}`, sq); await api('PATCH', `pr/lg/${L.code}/mem/${me()}`, { bud: (L.mem[me()].bud ?? BUD0) - o.v }); await setOf(id, 'done'); L.sq[me()] = sq; L.mem[me()].bud = (L.mem[me()].bud ?? BUD0) - o.v; centerNote(`${o.pj.n} chegou ao seu time!`, 2200); } catch {}
  }
}
H.fabuy = async (i) => {
  const p = freeAgents()[+i]; if (!p || L.fa[i]) return; const v = pValue(p); const sq = sqArr(L.sq[me()]);
  if (v > budOf(me())) { centerNote('Caixa insuficiente.'); return; } if (sq.length >= MAXSQ) { centerNote(`Elenco cheio (${MAXSQ}).`); return; }
  try { await api('PUT', `pr/lg/${L.code}/fa/${i}`, me()); const nsq = [...sq, { k: p.k, n: p.n, pos: p.pos, age: p.age, ovr: p.ovr }]; await api('PUT', `pr/lg/${L.code}/sq/${me()}`, nsq); await api('PATCH', `pr/lg/${L.code}/mem/${me()}`, { bud: (L.mem[me()].bud ?? BUD0) - v });
    L.fa[i] = me(); L.sq[me()] = nsq; L.mem[me()].bud = (L.mem[me()].bud ?? BUD0) - v; centerNote(`${p.n} contratado!`); reMk(); } catch { centerNote('Alguém foi mais rápido! Ele já foi contratado.'); H.lgopen(L.code); }
};
H.lgsell = async (k) => {
  const sq = sqArr(L.sq[me()]); if (sq.length <= MINSQ) { centerNote(`O elenco precisa ter pelo menos ${MINSQ} jogadores.`); return; } const p = sq.find((x) => x.k === k); if (!p) return;
  if (S.lgSell !== k) { S.lgSell = k; centerNote('Toque de novo para confirmar a venda.'); return; } S.lgSell = null;
  try { const nsq = sq.filter((x) => x.k !== k); const v = Math.round(pValue(p) * 0.6); await api('PUT', `pr/lg/${L.code}/sq/${me()}`, nsq); await api('PATCH', `pr/lg/${L.code}/mem/${me()}`, { bud: (L.mem[me()].bud ?? BUD0) + v }); L.sq[me()] = nsq; L.mem[me()].bud = (L.mem[me()].bud ?? BUD0) + v; TM = null; reMk(); } catch { centerNote('Não consegui vender.'); }
};
