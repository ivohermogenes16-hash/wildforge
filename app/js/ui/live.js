import { SET, vibrate } from '../settings.js';
import { oppStudy, scoutReport, rivalOfClub } from '../engine/universe.js';
import { coachOf } from '../engine/life.js';
import { esc } from '../util.js';
import { crest, face } from './art.js';
import { S, H, render, toast, openSheet, closeSheet, save, myLineup, posTag, wk, shortName, fixPhase } from './app.js';
import { LiveMatch, FORMATIONS, formOf, MENT, PRESS, available, penalties, effAt } from '../engine/match.js';
import { lineupFor, playSlot, myClub } from '../engine/game.js';
import { MatchViz } from './viz.js';
import { Match3D } from './m3d.js';
import { playLance } from './lance.js';
import { openPress } from './press.js';
import { openLiveBoard } from './livetat.js';
import { ratings } from '../engine/match.js';
import { assistReport, assistBonus, PLAYS } from '../engine/coach.js';
const ratingsOf = (G, club, lu) => { try { return ratings(G, club, lu.xi, 0, club.tact); } catch { return null; } };
import { bigGame } from '../engine/life.js';
import { PAUDIO, say } from './audio.js';
import { socialAfterMatch } from '../engine/social.js';
import { userMatchBonus, isDerby, pressBefore, pressAfter, pressDecision, staffQ, resolveDecision } from '../engine/life.js';

let L = null;

// ---------- auxiliar técnico: analisa o adversário de verdade e sugere ajustes ----------
function getReport(G, f, c, opp, lu, youth) {
  const key = G.t + ':' + f.i; if (f._ar && f._ark === key) return f._ar;
  const q = Math.max(staffQ(G, c, 'aux'), staffQ(G, c, 'ana'));
  const me = youth ? { ...c, tact: G.me.u20tact || c.tact } : c;
  f._ar = assistReport(G, me, opp, lu.xi, youth, q); f._ark = key; return f._ar;
}
function assistCard(G, f, c, opp, lu, youth) {
  let rep; try { rep = getReport(G, f, c, opp, lu, youth); } catch (e) { console.warn(e); return ''; }
  const tact = youth ? G.me.u20tact : c.tact; const b = assistBonus(rep, tact);
  const aux = c.staff?.aux?.n || 'Auxiliar técnico';
  const T = rep.oppT || {};
  const pl = rep.plays || {};
  if (!rep.items.length) return `<div class="card flat ast"><div class="ast-h"><span class="ast-av">🧑‍💼</span><div class="grow"><b>${esc(aux)}</b><div class="xs mut">Auxiliar técnico</div></div></div><div class="xs">Analisei o ${esc(opp.name)} (${esc(T.form || '')}) e não achei um ponto fraco claro. Mantenha o que vem dando certo.</div></div>`;
  return `<div class="card flat ast"><div class="ast-h"><span class="ast-av">🧑‍💼</span><div class="grow"><b>${esc(aux)}</b><div class="xs mut">Auxiliar técnico · analisou o ${esc(opp.name)}</div></div>${b.hit.length ? `<span class="ast-ok">✓ ${b.hit.length}/${rep.items.length}</span>` : ''}</div>
  <div class="xs mut" style="margin:2px 0 8px">Eles jogam no <b>${esc(T.form || '?')}</b>, mentalidade ${['defensiva', 'equilibrada', 'ofensiva'][T.ment ?? 1]}, pressão ${['baixa', 'média', 'alta'][T.press ?? 1]}. Defendem pior: escanteio <b>${esc(PLAYS.ck[pl.ck]?.[1] || '')}</b> e falta <b>${esc(PLAYS.fk[pl.fk]?.[1] || '')}</b>.</div>
  ${rep.items.map((it, i) => { const on = b.hit.includes(it.id); return `<div class="ast-it${on ? ' on' : ''}"><span class="ast-ic">${it.ic}</span><div class="grow"><b class="sm">${esc(it.t)}</b><div class="xs mut">${esc(it.why)}</div></div>${on ? '<span class="ast-done">Aplicado</span>' : `<button class="btn sm" data-a="aapply" data-v="${f.i}:${i}">Aplicar</button>`}</div>`; }).join('')}
  <div class="row" style="gap:6px;margin-top:8px">${b.hit.length < rep.items.length ? `<button class="btn sm pri grow" data-a="aapply" data-v="${f.i}:all">✨ Aplicar tudo</button>` : '<div class="xs ok grow">Plano de jogo montado. O time entra com vantagem tática.</div>'}${rep.plays ? `<button class="btn sm" data-a="aplays" data-v="${f.i}">🚩 Bolas paradas</button>` : ''}</div></div>`;
}
H.aapply = (v) => { const G = S.G; const [fi, w] = v.split(':'); const f = G.fix[+fi]; const rep = f._ar; if (!rep) return; const c = myClub(G); const youth = G.me.job.youth; const tact = youth ? G.me.u20tact : c.tact;
  const its = w === 'all' ? rep.items : [rep.items[+w]]; for (const it of its) { Object.assign(tact, it.apply); if (it.plays) tact.plays = { ...(tact.plays || {}), ...it.plays }; }
  save(); window.PSFX?.('ok'); notify(w === 'all' ? 'Plano do auxiliar aplicado' : 'Ajuste aplicado', 'ok'); closeSheet(true); preMatch(f); };
H.aplays = (v) => { const G = S.G; const f = G.fix[+v]; const rep = f._ar; if (!rep?.plays) return; const c = myClub(G); const youth = G.me.job.youth; const tact = youth ? G.me.u20tact : c.tact; tact.plays = { ...(tact.plays || {}), ...rep.plays }; save(); window.PSFX?.('ok'); notify('Jogadas ensaiadas ajustadas', 'ok'); closeSheet(true); preMatch(f); };
const notify = (t, k) => (window.PBANNER ? window.PBANNER(t, k) : toast(t));

export function preMatch(f) {
  const G = S.G; const c = myClub(G); const youth = G.me.job.youth;
  const hc = G.clubs[f.h], ac = G.clubs[f.a];
  const lu = myLineup();
  const probs = lu.xi.map((id) => G.players[id]).filter((p) => p && !available(p));
  const tired = lu.xi.map((id) => G.players[id]).filter((p) => p && p.fit < 65);
  const opp = G.clubs[f.h === c.id ? f.a : f.h];
  const oppLu = lineupFor(G, opp, youth);
  const best = oppLu.xi.map((id) => G.players[id]).filter(Boolean).sort((a, b) => b.ovr - a.ovr).slice(0, 4);
  const comp = G.comps[f.c];
  const derby = isDerby(G, f.h, f.a);
  if (!f._pp && !youth) { const P = pressBefore(G, f); f._pp = true; if (P) f._pm = pressDecision(G, f, P, 'pre').id; }
  const pm = f._pm != null ? G.inbox.find((x) => x.id === f._pm && !x.done) : null;
  const ana = staffQ(G, c, 'ana');
  const R = ratingsOf(G, opp, oppLu);
  const weak = R ? [['Ataque', R.att], ['Meio', R.ctl], ['Defesa', R.def]].sort((a, b) => a[1] - b[1])[0][0] : '';
  openSheet(`${derby ? '<div class="derby">🔥 CLÁSSICO</div>' : ''}<div class="xs mut" style="text-align:center">${esc(comp.name)} · ${esc(fixPhase(f))} · ${wk(f.w)}</div>
  <div class="match-hero" style="margin:8px 0 12px"><div>${crest(hc, 56)}<div class="nm">${esc(hc.name)}</div></div><div class="vs">VS</div><div>${crest(ac, 56)}<div class="nm">${esc(ac.name)}</div></div></div>
  ${probs.length ? `<div class="hint bad row" style="margin-bottom:8px;gap:8px;align-items:center"><span class="grow">⚠️ Fora deste jogo: ${probs.map((p) => esc(shortName(p.n)) + (p.inj > 0 ? ' 🩹' : ' 🟥')).join(', ')}. Se você não trocar, o melhor reserva entra só nesta partida — sua escalação salva continua igual.</span><button class="btn sm" data-a="prelu">Trocar</button></div>` : ''}
  ${tired.length ? `<div class="hint warn row" style="margin-bottom:8px;gap:8px;align-items:center"><span class="grow">😮‍💨 Cansados: ${tired.map((p) => esc(shortName(p.n)) + ' ' + Math.round(p.fit) + '%').join(', ')}</span><button class="btn sm" data-a="poupar" data-v="${f.i}">🔁 Poupar</button></div>` : ''}
  ${pm ? `<div class="press-cta" data-a="opress" data-v="${pm.id}:pre:${f.i}"><span class="pc-mic">🎤</span><div class="grow"><b>Coletiva pré-jogo</b><div class="xs mut ell">${esc(pm.rep?.n || 'Repórter')} (${esc(pm.rep?.o || 'Imprensa')}) quer uma palavra</div></div><span class="btn sm pri">Ir à coletiva</span></div>` : ''}
  ${assistCard(G, f, c, opp, lu, youth)}
  ${!youth ? (() => { const st = oppStudy(G, opp); const rv = rivalOfClub(G, opp); const lines = R ? scoutReport(G, opp, R) : []; return `<div class="card flat"><h3>📋 Relatório do adversário</h3>${lines.map((l) => `<div class="xs" style="margin-bottom:3px">• ${esc(l)}</div>`).join('')}${st.extra > 0 ? `<div class="hint warn" style="margin-top:6px">🧠 Eles estudaram você: seu ${esc(st.form)} apareceu em ${Math.round(st.share * 100)}% dos últimos jogos. Vão neutralizá-lo (+${st.extra} de força para eles). Varie a formação!</div>` : st.n >= 5 ? '<div class="xs ok" style="margin-top:4px">✅ Você tem variado a tática: o rival não conseguiu te estudar.</div>' : ''}${rv ? `<div class="hint" style="margin-top:6px">⚔️ ${rv === 2 ? 'Grande rival' : 'Rival'}: ${esc(coachOf(G, opp)?.n || '')}. Jogo com mais repercussão na torcida e na imprensa.</div>` : ''}</div>`; })() : ''}
  <div class="card flat"><h3>Destaques do adversário · ${esc(opp.tact.form)}</h3><div class="list">${best.map((p) => `<div class="li">${face(p, 28, opp)}<span class="grow b ell">${esc(p.n)}</span>${posTag(p.pos)}<b>${p.ovr}</b></div>`).join('')}</div></div>
  <div class="col"><button class="btn pri big blk" data-a="golive" data-v="${f.i}">▶ Jogar ao vivo</button>
  <div class="row"><button class="btn grow" data-a="prelu">Escalação</button><button class="btn grow" data-a="goquick" data-v="${f.i}">⏩ Resultado rápido</button></div></div>`);
}
H.prelu = () => { closeSheet(true); S.tab = 'tat'; S.page = null; render(); };

export function setup(f) {
  const G = S.G; const c = myClub(G); const youth = G.me.job.youth;
  const side = f.h === c.id ? 0 : 1;
  myLineup(); const lu = lineupFor(G, youth ? { ...c, tact: G.me.u20tact || c.tact } : c, youth);
  const tact = youth ? G.me.u20tact : c.tact;
  const train = youth ? G.me.u20train : c.train;
  const opp = G.clubs[side ? f.h : f.a];
  const ol = lineupFor(G, opp, youth);
  const ub = userMatchBonus(G, c);
  let ab = { att: 0, def: 0, ctl: 0 }; try { const rep = getReport(G, f, c, opp, lu, youth); ab = assistBonus(rep, tact); } catch (e) { console.warn(e); }
  const mine = { club: c, xi: lu.xi.slice(), bench: lu.bench.slice(), tact: { ...tact }, user: true, extra: (train?.foco === 'tatico' ? 1 : 0) + ub.all + ([1.5, 0, -1, -2][G.me.diff ?? 1] || 0), bon: { att: ub.att + ab.att, def: ub.def + ab.def, ctl: ab.ctl } };
  const st = youth ? { extra: 0 } : oppStudy(G, opp);
  const theirs = { club: opp, xi: ol.xi.slice(), bench: ol.bench.slice(), tact: { ...opp.tact }, extra: st.extra + (rivalOfClub(G, opp) ? 0.4 : 0) };
  if (st.counter != null && st.extra > 0) theirs.tact.ment = st.counter;
  const comp = G.comps[f.c];
  return { m: new LiveMatch(G, f, side ? [theirs, mine] : [mine, theirs], { neutral: comp.kind === 'cont' && f.ko === comp.koWeeks.length - 1 }), side };
}

H.poupar = (v) => {
  const G = S.G; const { xi, bench } = myLineup(); const youth = G.me.job.youth; const c = myClub(G);
  const form = formOf(youth ? (G.me.u20tact || c.tact) : c.tact); const pool = G.players.filter((p) => p && p.club === c.id && !!p.u20 === !!youth && available(p));
  let n = 0;
  xi.forEach((id, k) => {
    const p = G.players[id]; if (!p || p.fit >= 65) return; const slot = form[k][0];
    let best = null, bv = -1; for (const q of pool) { if (xi.includes(q.id) || q.fit < Math.max(70, p.fit + 12)) continue; const v = effAt(q, slot); if (v > bv) { bv = v; best = q; } }
    if (best && bv >= effAt(p, slot) * 0.85) { xi[k] = best.id; const bi = bench.indexOf(best.id); if (bi >= 0) bench[bi] = id; else if (!bench.includes(id)) { bench.pop(); bench.unshift(id); } n++; }
  });
  save(); toast(n ? `${n} titular${n > 1 ? 'es' : ''} poupado${n > 1 ? 's' : ''}` : 'Sem reservas descansados à altura'); closeSheet(true); preMatch(G.fix[+v]);
};
H.goquick = (v) => { const f = S.G.fix[+v]; closeSheet(true); const { m } = setup(f); finishMatch(f, m.finish(true)); };
H.golive = (v) => { const f = S.G.fix[+v]; closeSheet(true); const { m, side } = setup(f); const go = () => launchLive(f, m, side, S.G.clubs[f.h], S.G.clubs[f.a], null);
  const big = S.G.me.job?.youth ? false : bigGame(S.G, f); if (big && SET.matchday !== false) matchDay(f, m, big, go); else go(); };
// taça genérica (sem marca de competição real)
export const TROPHY_SVG = `<svg viewBox="0 0 120 170" class="cup-svg"><defs><linearGradient id="cg" x1="0" x2="1"><stop offset="0" stop-color="#8a6410"/><stop offset=".35" stop-color="#ffe17a"/><stop offset=".6" stop-color="#e8b923"/><stop offset="1" stop-color="#7a560c"/></linearGradient></defs>
<path d="M30 20h60v12c0 26-12 44-30 48-18-4-30-22-30-48z" fill="url(#cg)"/><path d="M30 28c-14 0-20 8-18 18 2 11 12 16 22 15" fill="none" stroke="url(#cg)" stroke-width="6"/><path d="M90 28c14 0 20 8 18 18-2 11-12 16-22 15" fill="none" stroke="url(#cg)" stroke-width="6"/>
<rect x="54" y="80" width="12" height="26" fill="url(#cg)"/><path d="M40 106h40l6 14H34z" fill="url(#cg)"/><rect x="30" y="120" width="60" height="14" rx="2" fill="#1d1d1d"/><rect x="38" y="125" width="44" height="4" rx="2" fill="#e8b923" opacity=".7"/>
<rect x="22" y="134" width="76" height="36" rx="3" fill="#f2f2ee"/><rect x="22" y="134" width="76" height="5" fill="#c9a227"/></svg>`;
export function isFinal(G, f) { try { return !G.me.job?.youth && bigGame(G, f) === 'final'; } catch { return false; } }
// campeão de uma final: levantar a taça e comemorar (2D, ou depois dos pênaltis)
export function champCelebrate(G, club, comp, done) {
  const el = document.createElement('div'); el.className = 'champ-ov'; el.style.setProperty('--c1', club.c1 || '#2fe08a'); el.style.setProperty('--c2', club.c2 || '#fff');
  el.innerHTML = `<div class="ch-conf">${Array.from({ length: 70 }, (_, i) => `<i style="--x:${(i * 37) % 100};--d:${(i % 9) * 0.25}s;--r:${(i * 53) % 360}deg;--k:${i % 3}"></i>`).join('')}</div>
  <div class="ch-in"><div class="ch-tag">${esc(comp.name)}</div><div class="ch-lift">${TROPHY_SVG}</div>
  <div class="ch-t">CAMPEÃO!</div><div class="ch-club">${crest(club, 44)}<b>${esc(club.name)}</b></div><button class="btn pri big ch-go">Comemorar ›</button></div>`;
  document.body.appendChild(el); try { window.PAUDIO?.roar(true); window.PSFX?.('horn'); window.PSAY?.(`É campeão! ${club.name} levanta a taça!`, 'gol', true); } catch {}
  el.querySelector('.ch-go').onclick = () => { el.classList.add('out'); setTimeout(() => { el.remove(); done?.(); }, 380); };
}
// ---------- dia de jogo (só em jogo grande) ----------
function matchDay(f, m, big, go) {
  const G = S.G; const hc = G.clubs[f.h], ac = G.clubs[f.a]; const comp = G.comps[f.c];
  const T = { classico: 'DIA DE CLÁSSICO', final: 'É DIA DE FINAL', semi: 'JOGO DECISIVO', mata: 'MATA-MATA', topo: 'BRIGA PELO TOPO', fundo: 'JOGO DE SEIS PONTOS', gigante: 'NOITE DE GIGANTE' }[big] || 'JOGO GRANDE';
  const sub = { classico: 'A cidade parou. Só se fala disso.', final: 'Noventa minutos separam o time da glória.', semi: 'Um passo da final.', mata: 'Perdeu, tá fora.', topo: 'Quem vencer dorme mais perto do título.', fundo: 'Perder aqui pode custar a divisão.', gigante: 'Ninguém aposta em vocês. Hora de calar o estádio.' }[big] || '';
  const stad = hc.stad || 'Estádio'; const cap = (hc.cap || 20) * 1000; const pub = Math.round(cap * (0.86 + Math.random() * 0.14));
  const wx = { sol: '☀️ Sol', nublado: '☁️ Nublado', chuva: '🌧️ Chuva', frio: '🧊 Frio', calor: '🔥 Calor' }[m.weather] || '';
  const el = document.createElement('div'); el.className = 'mday'; el.innerHTML = `<div class="md-bg"><i></i><i></i><i></i><i></i></div><div class="md-in">
   <div class="md-tag">${esc(comp.name)} · ${esc(fixPhase(f))}</div><div class="md-t">${T}</div><div class="md-sub">${esc(sub)}</div>
   <div class="md-vs"><div class="md-c">${crest(hc, 74)}<b>${esc(hc.name)}</b></div>${big === 'final' ? `<div class="md-cup">${TROPHY_SVG}</div>` : '<span>×</span>'}<div class="md-c">${crest(ac, 74)}<b>${esc(ac.name)}</b></div></div>
   <div class="md-info"><span>🏟️ ${esc(stad)}</span><span>👥 ${pub.toLocaleString('pt-BR')} torcedores</span>${wx ? `<span>${wx}</span>` : ''}<span>🧑‍⚖️ ${esc(m.ref?.nome || '')}</span></div>
   <button class="btn pri big md-go">▶ Entrar em campo</button></div>`;
  document.body.appendChild(el); try { window.PAUDIO?.crowd?.(0.6, 4); window.PSFX?.('horn'); } catch {}
  el.querySelector('.md-go').onclick = () => { el.classList.add('out'); setTimeout(() => { el.remove(); go(); }, 380); };
}

export function launchLive(f, m, side, hc, ac, done) {
  const G = S.G;
  try { window.LumbraAnalytics?.event('partida_inicio', { modo: m || '', base: G.me.job?.youth ? 1 : 0 }); } catch {}
  try { PAUDIO.crowd(0.35); setTimeout(() => PAUDIO.whistle(1), 900); } catch {}
  const wrap = document.createElement('div'); const _cp = G.comps[f.c] || {}; const _cid = f.c || ''; const sbs = _cid === 'LIB' ? 'lib' : _cid === 'UCL' ? 'ucl' : _cid === 'SUD' ? 'sud' : _cid === 'UEL' ? 'uel' : _cp.kind === 'youth' ? 'yth' : _cp.kind === 'state' ? 'est' : _cp.kind === 'cup' && _cp.country === 'BR' ? 'cdb' : _cp.kind === 'cup' ? 'cup' : /^BR[A-D]$/.test(_cid) ? 'bra' : /^ENG/.test(_cid) ? 'eng' : /^ESP/.test(_cid) ? 'esp' : /^ITA/.test(_cid) ? 'ita' : /^GER/.test(_cid) ? 'ger' : /^FRA/.test(_cid) ? 'fra' : /^POR/.test(_cid) ? 'por' : /^(ARG|URU|COL)/.test(_cid) ? 'arg' : _cp.kind === 'cont' ? 'cont' : (_cp.nat || f.nat) ? 'nat' : 'def';
  wrap.className = 'live-wrap fcx-live sb-' + sbs; wrap.id = 'live'; wrap.dataset.comp = (_cp.short || _cp.name || '').toUpperCase(); const lumx = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return 0; const n = parseInt(m[1], 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; }; const vis = (c, d) => [c.c1, c.c2, d].find((x) => x && lumx(x) > 0.22) || d; let hcc = vis(hc, '#2fe08a'), acc2 = vis(ac, '#4aa8ff'); if (hcc === acc2) acc2 = '#4aa8ff'; wrap.style.setProperty('--hc', hcc); wrap.style.setProperty('--ac', acc2);
  wrap.innerHTML = `<div class="lv">
   <div class="lv-top">
     <div class="lv-team">${crest(hc, 30)}<span class="b ell nm-l">${esc(hc.name)}</span><span class="nm-s">${esc((x => (x.tla || x.name.normalize('NFD').replace(/[^A-Za-z ]/g, '').split(' ').filter((w) => w.length > 2 && !/^(de|do|da|dos|das)$/i.test(w))[0] || x.name).slice(0, 3).toUpperCase())(hc))}</span></div>
     <div class="lv-score"><span id="lsc">0 – 0</span><span class="lv-min" id="lmin">0'</span></div><div class="lv-ctag">${esc((G.comps[f.c]?.short || G.comps[f.c]?.name || '').toUpperCase())}</div>
     <div class="lv-team r"><span class="b ell nm-l">${esc(ac.name)}</span><span class="nm-s">${esc((x => (x.tla || x.name.normalize('NFD').replace(/[^A-Za-z ]/g, '').split(' ').filter((w) => w.length > 2 && !/^(de|do|da|dos|das)$/i.test(w))[0] || x.name).slice(0, 3).toUpperCase())(ac))}</span>${crest(ac, 30)}</div>
     <div class="lv-btns"><button class="btn sm" data-a="lnames" title="Nomes">Aa</button><button class="btn sm" data-a="lrep" id="lrp" title="Replays">🎬</button><button class="btn sm qs-btn" data-a="lqs" id="lqsb" title="Trocas rápidas">🔄<i id="lqsn"></i></button><button class="btn sm" data-a="lpause" id="lpb">⏸</button><button class="btn sm" data-a="lspeed" id="lsp">2x</button><button class="btn sm drw-b" data-a="ldrawer" id="ldrb">Dados</button><button class="btn sm pri" data-a="ltact">Tática</button><button class="btn sm" data-a="lskip">⏭</button></div>
   </div>
   <div class="lv-tl"><i id="ltlp"></i><span style="left:50%" class="ht"></span><div id="ltlm"></div></div>
   <div class="lv-main"><div class="lv-pitch"><canvas id="lcv"></canvas><div class="lv-nar" id="lnar"></div></div>
     <div class="lv-side"><button class="drw-x" data-a="ldrawer">✕</button><div id="lstats"></div><div class="feed" id="lfeed"></div><div id="lend"></div></div></div>
  </div>`;
  document.body.appendChild(wrap);
  const cv = wrap.querySelector('#lcv');
  L = { f, m, side, raf: 0, last: performance.now(), done };
  const hooks = {
    onEvent: (e, quiet) => onEv(e, quiet),
    onPause: (why) => { if (why === 'int') { L.viz.paused = true; updPause(); halfTalk(); } },
    onEnd: () => endLive(),
    onReplay: (on) => { const w = document.querySelector('.lv-pitch'); if (w) w.classList.toggle('rp', on); },
    onFail: () => { if (!L || !(L.viz instanceof Match3D)) return; L.viz.destroy(); cv.style.display = ''; wrap.classList.remove('d3'); L.viz = new MatchViz(cv, G, m, side, hooks); L.viz.speed = SET.speed; L.viz.replays = SET.replays; L.viz.resize(); toast('3D indisponível neste aparelho — mostrando em 2D'); },
  };
  const use3d = SET.view3d !== '2d';
  if (use3d) { cv.style.display = 'none'; wrap.classList.add('d3'); L.viz = new Match3D(wrap.querySelector('.lv-pitch'), G, m, side, hooks, { rain: m.weather === 'chuva', final: isFinal(G, f) }); L.champ3d = isFinal(G, f); }
  else L.viz = new MatchViz(cv, G, m, side, hooks);
  cv.addEventListener('click', () => L?.viz.skipReplay());
  L.lastNar = 0; L.viz.speed = SET.speed; L.viz.replays = SET.replays;
  { const b = document.getElementById('lsp'); if (b) b.textContent = SET.speed + 'x'; const r = document.getElementById('lrp'); if (r) r.style.opacity = SET.replays ? 1 : 0.4; }
  L.onResize = () => L.viz.resize(); window.addEventListener('resize', L.onResize);
  addFeed({ t: 'ini' }); stats();
  L.raf = requestAnimationFrame(loop);
}

function loop(now) {
  if (!L) return;
  const dt = (now - L.last) / 1000; L.last = now;
  L.viz.update(dt); L.viz.draw();
  if (L.m.min !== L.lastMin) { L.lastMin = L.m.min; narrate(); qsRefresh(); stats(); }
  if (L.narT && now > L.narT) { const n = document.getElementById('lnar'); if (n) n.classList.remove('on'); L.narT = 0; }
  const mn = document.getElementById('lmin'); if (mn) mn.textContent = `${L.m.min}'`;
  const tp = document.getElementById('ltlp'); if (tp) tp.style.width = Math.min(100, L.m.min / 90 * 100) + '%';
  L.raf = requestAnimationFrame(loop);
}

const pk = (a) => a[Math.floor(Math.random() * a.length)];
// narradores com personalidade: [gritos de gol, frases de jogo, frases de VAR]
const NARRS = {
  empolgado: [['GOOOOOOOL', 'É GOL, É GOL, É GOOOL', 'GOLAAAAÇO', 'BALANÇA A REDE, MINHA GENTE', 'QUE GOL, QUE GOL'], ['Que jogo, amigo! Que jogo!', 'A torcida não para de cantar!', 'Coração na boca aqui no estádio!'], ['Que drama!', 'Inacreditável!']],
  classico: [['Gol', 'É gol', 'Gol, abre-se o placar do lado de cá', 'Bola na rede'], ['Partida truncada, muita marcação no meio.', 'As equipes trocam passes com paciência.', 'O treinador pede calma à beira do campo.'], ['Decisão correta da arbitragem.', 'O VAR fez o seu papel.']],
  resenha: [['GOL, E QUE GOL, MEU POVO', 'Botou pra dentro sem pedir licença', 'Foi lá e fez, simples assim', 'Chorou na cama que é lugar quente: GOL'], ['Tem jogador aí que esqueceu a chuteira no vestiário…', 'Esse meio-campo tá mais embolado que fone no bolso.', 'Jogo de xadrez, mas ninguém mexe o rei.'], ['O VAR veio estragar a festa!', 'Tira a comemoração do Instagram, foi anulado!']],
};
const NARR = () => NARRS[SET.narrador || 'empolgado'] || NARRS.empolgado;
async function doLance(e) {
  if (!L) return; const G = S.G, m = L.m; L.viz.paused = true; updPause();
  const mine = m.s[e.side].club, opp = m.s[1 - e.side].club;
  const ok = await playLance(e, { G, kitA: (e.kind === 'defpen' ? opp : mine).c1 || '#2fe08a', kitB: (e.kind === 'defpen' ? mine : opp).c1 || '#c8102e', minute: m.min, shooter: G.players[e.p]?.n || 'Batedor', keeper: G.players[e.gk]?.n || 'Goleiro' });
  if (!L) return; const out = m.resolveLance(ok);
  for (const x of out) { if (x.t === 'gol') { if (L.viz.inject) L.viz.inject(x); else L.viz.score[x.side]++; } onEv(x); }
  L.viz.paused = false; updPause();
}
// vestiário no intervalo
function halfTalk() {
  if (!L) return; const m = L.m, s = L.side, sd = m.s[s]; const d = m.score[s] - m.score[1 - s];
  const opts = [['elogiar', '👏 Elogiar', 'Continuem assim, estão jogando muito!'], ['cobrar', '😤 Cobrar', 'Isso não é o que treinamos. Quero mais!'], ['acalmar', '🧘 Acalmar', 'Calma, joguem simples, o gol vai sair.'], ['motivar', '🔥 Motivar', 'É agora! Deixem tudo em campo neste segundo tempo!'], ['tatica', '📋 Falar de tática', 'Vamos ajustar: mais compactos e atenção às costas dos laterais.']];
  openSheet(`<h2>Vestiário · intervalo</h2><div class="half-score">${esc(m.s[0].club.name)} <b>${m.score[0]} – ${m.score[1]}</b> ${esc(m.s[1].club.name)}</div>
  <div class="xs mut" style="margin:6px 0 10px">Finalizações ${m.st.sh[0]}–${m.st.sh[1]} · xG ${m.st.xg[0].toFixed(1)}–${m.st.xg[1].toFixed(1)} · posse ${Math.round(m.st.pos[0] / (m.st.pos[0] + m.st.pos[1] || 1) * 100)}%</div>
  <div class="hint" style="margin-bottom:8px">O que você fala para o time?</div><div class="list">${opts.map(([k, t, q]) => `<div class="li tap" data-a="halftalk" data-v="${k}"><div class="grow"><b>${t}</b><div class="xs mut">“${q}”</div></div></div>`).join('')}</div>
  <button class="btn blk" style="margin-top:8px" data-a="ltact">Mudar tática e substituições</button>`);
  L.halfCtx = d;
}
H.halftalk = (k) => {
  if (!L) return; const sd = L.m.s[L.side]; const d = L.halfCtx || 0;
  const good = { elogiar: d > 0 ? 0.8 : d === 0 ? 0.2 : -0.4, cobrar: d < 0 ? 0.7 : d === 0 ? 0.3 : -0.5, acalmar: d === 0 ? 0.5 : d > 0 ? 0.4 : 0.1, motivar: d <= 0 ? 0.6 : 0.2, tatica: 0.35 }[k] ?? 0;
  sd.extra = (sd.extra || 0) + good; const r = good > 0.5 ? 'O time voltou ligado! 🔥' : good > 0.15 ? 'Os jogadores concordaram com a cabeça.' : good > -0.2 ? 'Reação morna no vestiário.' : 'Alguns jogadores não gostaram do tom… 😬';
  closeSheet(); toast(r, 2600);
};
// gritos da beira do campo: mudam a tática na hora
const SHOUTS = { ataque: ['⚔️ Todos ao ataque', { ment: 2, press: 2, linha: 2, tempo: 2 }], segurar: ['🛡️ Segurar o resultado', { ment: 0, press: 1, linha: 0, cera: 1, tempo: 0 }], pressao: ['🔥 Pressão total', { press: 2, perda: 2, linha: 2 }], contra: ['⚡ Jogar no contra-ataque', { ment: 0, contra: 1, linha: 0 }], calma: ['🧊 Calma, toca a bola', { tempo: 0, passe: 0, ment: 1 }] };
H.lshout = (k) => { if (!L) return; Object.assign(L.m.s[L.side].tact, SHOUTS[k][1]); toast(SHOUTS[k][0].replace(/^\S+ /, '') + '!'); closeSheet(); };
function evText(e) {
  const G = S.G, m = L.m; const nm = (id) => esc(G.players[id]?.n || '');
  const team = (s) => esc(m.s[s]?.club.name || '');
  const sc = () => `${L.viz.score[0]} a ${L.viz.score[1]}`;
  switch (e.t) {
    case 'ini': return pk(['🟢 Bola rolando! Começa o jogo.', '🟢 Apita o árbitro, está valendo!', '🟢 Rola a bola para mais um capítulo dessa história.']);
    case 'gol': return `⚽ ${e.lance ? '🎯 ' : ''}${pk(NARR()[0])} do ${team(e.side)}!${e.pen ? ' De pênalti!' : ''}${e.bp === 'ck' ? ' Jogada ensaiada de escanteio!' : e.bp === 'fk' ? (e.play === 'direto' ? ' Golaço de falta!' : ' Em cobrança de falta!') : ''}${e.var ? ' (VAR confirma)' : ''} ${pk([`${nm(e.p)} não perdoa`, `${nm(e.p)} manda para o fundo da rede`, `${nm(e.p)} bate com categoria`, `${nm(e.p)} aparece livre e marca`])}${e.as >= 0 ? ` <span class="mut">(assist. ${nm(e.as)})</span>` : ''}. ${sc()}!`;
    case 'def': if (e.pen || e.lance) return `🧤 ${nm(e.gk)} defende a cobrança de ${nm(e.p)}!`; return pk([`🧤 Que defesa de ${nm(e.gk)}! ${nm(e.p)} parou no goleiro`, `🧤 ${nm(e.p)} chuta e ${nm(e.gk)} espalma`, `🧤 ${nm(e.gk)} voa e segura o chute de ${nm(e.p)}`]);
    case 'trave': return pk([`😱 NA TRAVE! ${nm(e.p)} acerta o poste`, `😱 Explode no travessão! ${nm(e.p)} quase marca`, `😱 Que azar, ${nm(e.p)}! A bola bate na trave`]);
    case 'fora': return pk([`${nm(e.p)} finaliza para fora`, `${nm(e.p)} arrisca de longe… por cima`, `${nm(e.p)} pega mal na bola e manda à linha de fundo`, `Perigo! ${nm(e.p)} tira tinta da trave`]);
    case 'am': return pk([`🟨 Amarelo para ${nm(e.p)}`, `🟨 Falta dura de ${nm(e.p)}, cartão amarelo`, `🟨 ${nm(e.p)} reclama e leva o amarelo`]);
    case 'ver': return `🟥 ${nm(e.p)} é expulso${e.second ? ' (2º amarelo)' : ''}! ${team(e.side)} com um a menos.`;
    case 'les': return `🩹 ${nm(e.p)} sente uma lesão e pede atendimento`;
    case 'sub': return `🔄 ${team(e.side)}: sai ${nm(e.o)}, entra ${nm(e.p)}`;
    case 'int': return `⏸ Intervalo: ${team(0)} ${sc()} ${team(1)}`;
    case 'fim': return `🏁 Fim de jogo! ${team(0)} ${sc()} ${team(1)}`;
    case 'nar': return `🎙️ ${e.txt}`;
    case 'var': return `📺 VAR! Gol do ${team(e.side)} anulado por ${esc(e.why)}. ${pk(NARR()[2])}`;
    case 'pen': return `⚠️ PÊNALTI para o ${team(e.side)}! ${nm(e.p)} vai para a cobrança.`;
    case 'lance': return `⚡ Lance decisivo: ${{ pen: 'pênalti', falta: 'falta perigosa', '1x1': 'cara a cara', defpen: 'pênalti contra' }[e.kind]}!`;
  }
  return '';
}
function narrate() {
  const m = L.m, mn = m.min; if (mn - L.lastNar < 7 || mn < 4 || mn >= 90) return;
  if (Math.random() > 0.55) return;
  const st = m.st; const tot = st.pos[0] + st.pos[1] || 1; const p0 = st.pos[0] / tot;
  const team = (s) => esc(m.s[s].club.name); const [a, b] = L.viz.score; const dom = p0 > 0.58 ? 0 : p0 < 0.42 ? 1 : -1;
  const lines = [];
  if (dom >= 0) lines.push(`${team(dom)} tem ${Math.round((dom ? 1 - p0 : p0) * 100)}% de posse e roda a bola no campo de ataque.`, `${team(dom)} pressiona, o adversário está acuado.`);
  else lines.push('Jogo equilibrado, muita disputa no meio-campo.', 'As duas equipes se estudam, ninguém quer arriscar.');
  if (st.sh[0] + st.sh[1] >= 6) { const s = st.sh[0] > st.sh[1] ? 0 : 1; lines.push(`${team(s)} finalizou ${st.sh[s]} vezes até aqui.`); }
  if (mn >= 75) lines.push(a === b ? 'Reta final e tudo igual! Quem vai arriscar?' : `Reta final: ${team(a > b ? 1 : 0)} se lança ao ataque em busca do ${Math.abs(a - b) === 1 ? 'empate' : 'gol'}.`);
  if (mn >= 85) lines.push('A torcida está de pé nos minutos finais!');
  if (a - b >= 2 || b - a >= 2) lines.push(`${team(a > b ? 0 : 1)} administra a vantagem com tranquilidade.`);
  if (mn > 40 && mn < 46) lines.push('Fim do primeiro tempo se aproximando.');
  L.lastNar = mn; const e = { t: 'nar', m: mn, txt: pk(lines) }; addFeed(e);
}
function addFeed(e) {
  const el = document.getElementById('lfeed'); if (!el) return;
  const d = document.createElement('div'); d.className = 'ev ' + (e.t === 'lance' ? 'ev-lance' : e.t) + (e.side === L.side ? ' mine' : ''); // 'lance' sozinho pegava o CSS da tela cheia do pênalti (tela preta)
  const tx = evText(e); d.innerHTML = `<b class="dim">${e.m != null ? e.m + "'" : ''}</b> ${tx}`;
  el.prepend(d);
  if (SET.narr && ['gol', 'trave', 'def', 'ver', 'nar', 'int', 'fim'].includes(e.t)) { const n = document.getElementById('lnar'); if (n) { n.innerHTML = tx.replace(/<[^>]+>/g, ''); n.className = 'lv-nar on ' + e.t; L.narT = performance.now() + 3200; } }
}
function onEv(e, quiet) {
  if (e.t === 'lance' && !quiet) { doLance(e); addFeed(e); return; }
  addFeed(e);
  if (e.t === 'var') toast('📺 VAR: gol anulado');
  if (['gol', 'ver'].includes(e.t)) { const tm = document.getElementById('ltlm'); if (tm) tm.insertAdjacentHTML('beforeend', `<span class="mk ${e.t} ${e.side === L.side ? 'me' : ''}" style="left:${Math.min(100, e.m / 90 * 100)}%">${e.t === 'gol' ? '⚽' : '🟥'}</span>`); }
  document.getElementById('lsc').textContent = `${L.viz.score[0]} – ${L.viz.score[1]}`;
  stats();
  if (quiet) return;
  if (e.t === 'gol') vibrate(e.side === L.side ? [80, 60, 80] : 40);
  try { PAUDIO.ev(e, e.side === L.side); if (e.t === 'gol') say(evText(e), 'gol', true); else if (['trave', 'ver', 'pen', 'int', 'fim'].includes(e.t)) say(evText(e), e.t); else if (e.t === 'nar' && Math.random() < 0.5) say(e.txt, 'nar'); } catch {}
  if (e.t === 'les' && e.side === L.side) { L.viz.paused = true; updPause(); toast('Seu jogador se machucou! Faça uma substituição.'); }
  if (e.t === 'ver' && e.side === L.side) toast('Expulsão! Considere ajustar o time.');
}
function stats() {
  const st = L.m.st; const tot = st.pos[0] + st.pos[1] || 1; const p0 = Math.round(st.pos[0] / tot * 100);
  const side = document.querySelector('.lv-side'); const tab = L.stTab || 'st'; if (side) side.dataset.tab = tab;
  const row = (l, a, b, fmt = (x) => x) => { const t = (+a) + (+b) || 1; return `<div class="fx-st"><div class="fx-st-h"><b>${fmt(a)}</b><span>${l}</span><b>${fmt(b)}</b></div><div class="fx-st-b"><i class="h" style="width:${a / t * 100}%"></i><i class="a" style="width:${b / t * 100}%"></i></div></div>`; };
  const G = S.G, m = L.m; const hc = G.clubs[L.f.h], ac = G.clubs[L.f.a];
  const tabs = `<div class="fx-tabs">${[['st', 'Estatísticas'], ['lc', 'Lances'], ['en', 'Jogadores']].map(([k, l]) => `<span class="${tab === k ? 'on' : ''}" data-a="lsttab" data-v="${k}">${l}</span>`).join('')}</div>`;
  const head = `<div class="fx-hd"><span>${crest(hc, 20)}<b>${esc(hc.short || hc.name)}</b></span><em>${L.viz.score[0]} – ${L.viz.score[1]}</em><span><b>${esc(ac.short || ac.name)}</b>${crest(ac, 20)}</span></div>`;
  let body = '';
  if (tab === 'en') {
    const sd = m.s[L.side], form = m.form(L.side);
    body = `<div class="fx-pl">${sd.xi.map((id, k) => { const p = G.players[id]; if (!p || m.sent[L.side].has(id)) return ''; const e = Math.round(m.en[id] ?? p.fit); const ev = m.ev.filter((x) => x.p === id || x.as === id); const g = ev.filter((x) => x.t === 'gol' && x.p === id).length, a = ev.filter((x) => x.t === 'gol' && x.as === id).length; const nt = Math.min(10, 6.2 + g * 1.1 + a * 0.6 - (ev.some((x) => x.t === 'am' && x.p === id) ? 0.3 : 0)); return `<div class="fx-pr" data-a="lpinfo" data-v="${id}"><span class="fx-pos">${form[k][0]}</span><span class="ell">${esc(shortName(p.n))}${g ? ' <i class="fx-g">⚽' + (g > 1 ? g : '') + '</i>' : ''}</span><div class="fx-en"><i style="width:${e}%;background:${enCol(e)}"></i></div><b style="color:${enCol(e)}">${e}</b><em class="${nt >= 7 ? 'hi' : nt < 6 ? 'lo' : ''}">${nt.toFixed(1)}</em></div>`; }).join('')}</div>`;
  } else if (tab === 'lc') {
    body = '';
  } else {
    const xg = st.xg || [0, 0], pas = st.pas || [0, 0], pok = st.pok || [0, 0];
    body = row('Posse de bola', p0, 100 - p0, (x) => x + '%') + row('Finalizações', st.sh[0], st.sh[1]) + row('No gol', st.ont[0], st.ont[1]) + row('Gols esperados (xG)', +(+xg[0]).toFixed(2), +(+xg[1]).toFixed(2), (x) => (+x).toFixed(2)) + row('Escanteios', st.cor[0], st.cor[1]) + row('Faltas', st.fal[0], st.fal[1]) + (pas[0] + pas[1] ? row('Passes certos', pas[0] ? Math.round(pok[0] / pas[0] * 100) : 0, pas[1] ? Math.round(pok[1] / pas[1] * 100) : 0, (x) => x + '%') : '');
  }
  document.getElementById('lstats').innerHTML = head + tabs + body;
}
window.PXSHOT = (d, m) => { if (!L || !m || m !== L.m) return; const st = m.st; st.sh[d.side]++; if (d.ont) st.ont[d.side]++; if (st.xg) st.xg[d.side] = Math.round((st.xg[d.side] + (d.xg || 0.1)) * 100) / 100;
  const sd = m.s[d.side]; const id = sd.xi[d.slot]; const p = S.G.players[id]; if (p) addFeed({ m: m.min, t: 'nar', side: d.side, txt: d.out === 'def' ? `${esc(shortName(p.n))} sai cara a cara e o goleiro faz grande defesa!` : d.out === 'trave' ? `${esc(shortName(p.n))} bate e a bola explode na trave!` : `${esc(shortName(p.n))} fica de frente para o gol e manda para fora!` }); stats(); };
H.ldrawer = () => { const w = document.getElementById('live'); if (!w) return; w.classList.toggle('drw'); stats(); };
const enCol = (e) => (e >= 75 ? '#2fe08a' : e >= 60 ? '#f4c542' : e >= 45 ? '#ff9f43' : '#ff5a5f');
const enTag = (e) => `<span class="xs b" style="color:${enCol(e)};width:34px;text-align:right">⚡${Math.round(e)}</span>`;
H.lsttab = (v) => { L.stTab = v; stats(); };
H.lpinfo = (v) => {
  if (!L) return; const G = S.G, m = L.m, id = +v, p = G.players[id]; if (!p) return; const ev = m.ev.filter((e) => e.p === id || e.as === id);
  const g = ev.filter((e) => e.t === 'gol' && e.p === id).length, a = ev.filter((e) => e.t === 'gol' && e.as === id).length, sh = ev.filter((e) => ['gol', 'def', 'trave', 'fora'].includes(e.t) && e.p === id).length;
  const en = Math.round(m.en[id] ?? p.fit); const nota = Math.min(10, 6.2 + g * 1.1 + a * 0.6 + sh * 0.1 - (ev.some((e) => e.t === 'am' && e.p === id) ? 0.3 : 0));
  openSheet(`<h2>${esc(p.n)}</h2><div class="row" style="gap:6px;margin-bottom:8px">${posTag(p.pos)}<span class="pill">geral ${p.ovr}</span><span class="pill" style="color:${enCol(en)}">⚡ ${en}%</span></div>
  <div class="stat-grid"><div class="stat"><div class="v">${nota.toFixed(1)}</div><div class="l">nota no jogo</div></div><div class="stat"><div class="v">${g}</div><div class="l">gols</div></div><div class="stat"><div class="v">${a}</div><div class="l">assistências</div></div><div class="stat"><div class="v">${sh}</div><div class="l">finalizações</div></div></div>
  <div class="xs mut" style="margin:6px 0">Na temporada: ${p.st.j} jogos, ${p.st.g} gols, ${p.st.a} assistências.</div><button class="btn blk" data-a="cs">Voltar</button>`);
};
function updPause() { const b = document.getElementById('lpb'); if (b) b.textContent = L.viz.paused ? '▶' : '⏸'; }
H.lnames = () => { L.viz.names = !L.viz.names; };
H.lpause = () => { L.viz.paused = !L.viz.paused; updPause(); };
H.lspeed = () => { const v = L.viz; v.speed = v.speed === 1 ? 2 : v.speed === 2 ? 4 : v.speed === 4 ? 8 : 1; document.getElementById('lsp').textContent = v.speed + 'x'; };
H.lskip = () => { for (const sd of L.m.s) sd.user = false; L.viz.skipToEnd(); document.getElementById('lsc').textContent = `${L.m.score[0]} – ${L.m.score[1]}`; };

H.ltact = () => { if (!L) return; openLiveBoard(L, { updPause, addFeed, notice: (t) => toast(t) }); };
H.ltactOld = () => {
  if (!L) return;
  L.viz.paused = true; updPause();
  const G = S.G, m = L.m, s = L.side, sd = m.s[s];
  const form = formOf(sd.tact);
  const used = m.played[s];
  openSheet(`<h2>Tática e substituições</h2>
  <div class="card flat"><h3>Gritos da beira do campo</h3><div class="row wrap" style="gap:6px">${Object.entries(SHOUTS).map(([k, [t]]) => `<button class="btn sm" data-a="lshout" data-v="${k}">${t}</button>`).join('')}</div></div>
  <div class="card flat"><h3>Mentalidade</h3><div class="seg" style="margin:0">${MENT.map((x, i) => `<button class="${sd.tact.ment === i ? 'on' : ''}" data-a="lment" data-v="${i}">${x}</button>`).join('')}</div>
  <h3 style="margin-top:12px">Pressão</h3><div class="seg" style="margin:0">${PRESS.map((x, i) => `<button class="${sd.tact.press === i ? 'on' : ''}" data-a="lpress" data-v="${i}">${x}</button>`).join('')}</div></div>
  <div class="card flat"><h3><span>Substituições</span><span>${m.subs[s]}/5</span></h3><button class="btn sm blk" style="margin-bottom:8px" data-a="lqsheet">⚡ Fazer as trocas sugeridas (${m.suggestSubs(s, 3).length})</button><div class="hint" style="margin-bottom:8px">${L.subOut != null ? 'Agora escolha quem entra.' : 'Toque em quem vai sair.'}</div>
  <div class="cols2"><div class="list">${sd.xi.map((id, i) => { const p = G.players[id]; if (!p) return ''; const off = m.sent[s].has(id); const inj = m.ev.some((e) => e.t === 'les' && e.p === id); return `<div class="li tap" ${off ? '' : `data-a="lout" data-v="${id}"`} style="${L.subOut === id ? 'background:#f4c54222' : ''}${off ? ';opacity:.4' : ''}"><span class="xs mut" style="width:30px">${form[i][0]}</span><span class="grow b ell">${esc(p.n)} ${inj ? '🩹' : ''}${off ? ' 🟥' : ''}</span>${enTag(m.en[id] ?? p.fit)}<b style="width:24px;text-align:right">${p.ovr}</b><button class="btn sm ghost" data-a="lpinfo" data-v="${id}" title="Números">ℹ</button></div>`; }).join('')}</div>
  <div class="list">${sd.bench.map((id) => { const p = G.players[id]; if (!p || used.has(id)) return ''; return `<div class="li tap" data-a="lin" data-v="${id}">${posTag(p.pos)}<span class="grow b ell">${esc(p.n)}</span>${enTag(p.fit)}<b style="width:24px;text-align:right">${p.ovr}</b></div>`; }).join('') || '<div class="empty">Banco vazio</div>'}</div></div></div>
  <button class="btn pri blk" data-a="lclose">Voltar ao jogo</button>`);
};
H.lment = (v) => { L.m.s[L.side].tact.ment = +v; closeSheet(); H.ltact(); };
H.lpress = (v) => { L.m.s[L.side].tact.press = +v; closeSheet(); H.ltact(); };
H.lout = (v) => { L.subOut = +v; closeSheet(); H.ltact(); };
H.lin = (v) => {
  if (L.subOut == null) { toast('Escolha primeiro quem sai'); return; }
  const ok = L.m.sub(L.side, L.subOut, +v);
  if (ok) { addFeed(L.m.ev[L.m.ev.length - 1]); toast('Substituição feita'); } else toast('Não foi possível (limite de 5)');
  L.subOut = null; closeSheet(); H.ltact();
};
// ===== trocas rápidas =====
function qsRefresh() {
  if (!L || L.m.done) return; const sg = L.m.suggestSubs(L.side, 3); L.qs = sg;
  const n = document.getElementById('lqsn'); if (n) { n.textContent = sg.length || ''; n.className = sg.length ? 'on' : ''; }
  const urgent = sg.some((x) => x.why === 'lesionado') || (sg.length && [60, 70, 78].includes(L.m.min) && L.qsAt !== L.m.min);
  if (urgent && SET.qsPop !== false) { L.qsAt = L.m.min; qsPop(sg); }
}
function qsPop(sg) {
  let el = document.getElementById('lqspop');
  if (!el) { el = document.createElement('div'); el.id = 'lqspop'; el.className = 'qs-pop'; document.getElementById('live')?.appendChild(el); }
  const G = S.G; const nm = (id) => esc(shortName(G.players[id]?.n || '?'));
  el.innerHTML = `<div class="qs-h"><b>🔄 ${sg.length} troca${sg.length > 1 ? 's' : ''} sugerida${sg.length > 1 ? 's' : ''}</b><span class="xs mut">${L.m.min}' · ${5 - L.m.subs[L.side]} restantes</span></div>
  ${sg.map((x, k) => `<div class="qs-row" data-a="lqs1" data-v="${k}"><span class="qs-out">⬇ ${nm(x.out)}</span><span class="qs-in">⬆ ${nm(x.in)}</span><span class="qs-why ${x.why}">${x.why}</span></div>`).join('')}
  <div class="row" style="gap:6px;margin-top:6px"><button class="btn pri sm grow" data-a="lqsall">Fazer ${sg.length > 1 ? 'todas' : 'troca'}</button><button class="btn sm" data-a="lqsx">Agora não</button></div>`;
  el.classList.add('on');
}
H.lqs = () => { if (!L) return; const sg = L.m.suggestSubs(L.side, 3); if (!sg.length) { toast(L.m.subs[L.side] >= 5 ? 'Você já fez as 5 trocas' : 'Nenhuma troca necessária agora 👍'); return; } qsPop(sg); };
H.lqsheet = () => { const sg = L.m.suggestSubs(L.side, 3); if (!sg.length) { toast('Nenhuma troca necessária agora'); return; } L.qs = sg; doQs(sg); closeSheet(); H.ltact(); };
H.lqsx = () => { document.getElementById('lqspop')?.classList.remove('on'); };
function doQs(list) { let n = 0; for (const x of list) if (L.m.sub(L.side, x.out, x.in)) { addFeed(L.m.ev[L.m.ev.length - 1]); n++; } toast(n ? `${n} troca${n > 1 ? 's' : ''} feita${n > 1 ? 's' : ''}` : 'Não foi possível'); H.lqsx(); qsRefresh(); }
H.lqsall = () => doQs(L.qs || []);
H.lqs1 = (v) => { const x = (L.qs || [])[+v]; if (x) doQs([x]); };
H.lclose = () => { closeSheet(); L.viz.paused = false; updPause(); };

function endLive() {
  const el = document.getElementById('lend');
  if (el && !el.innerHTML) el.innerHTML = `<button class="btn pri blk" style="margin-top:8px" data-a="lfinish">Ver resumo ›</button>`;
}
H.lfinish = () => {
  const f = L.f, res = L.m.result(), done = L.done; if (L.champ3d && L.m.score[0] !== L.m.score[1]) res._champShown = true;
  cancelAnimationFrame(L.raf); window.removeEventListener('resize', L.onResize); L.viz.destroy?.(); document.getElementById('live')?.remove();
  L = null;
  (done || finishMatch)(f, res);
};

const WXI = { sol: '☀️ Sol', nublado: '☁️ Nublado', chuva: '🌧️ Chuva', frio: '🥶 Frio', calor: '🥵 Calor' };
function advLine(f) {
  const st = f.stats || {}, a = f.adv; if (!st.xg && !a) return '';
  const pc = (i) => (st.pas?.[i] ? Math.round(st.pok[i] / st.pas[i] * 100) + '%' : '–');
  return `<div class="adv-strip">${st.xg ? `<span><b>${st.xg[0].toFixed(1)} – ${st.xg[1].toFixed(1)}</b><i>xG</i></span>` : ''}${st.pas ? `<span><b>${st.pas[0]} – ${st.pas[1]}</b><i>passes</i></span><span><b>${pc(0)} – ${pc(1)}</b><i>acerto</i></span>` : ''}${a ? `<span><b>${WXI[a.weather] || a.weather}</b><i>gramado ${a.pitch}</i></span><span><b>${esc(a.ref?.nome || '')}</b><i>árbitro ${a.ref?.perfil || ''}</i></span>` : ''}</div>
  ${a?.var?.length ? `<div class="xs mut" style="text-align:center;margin-bottom:6px">📺 VAR: ${a.var.map((v) => `${v.m}' ${v.res}${v.why ? ' (' + esc(v.why) + ')' : ''}`).join(' · ')}</div>` : ''}
  ${a ? `<button class="btn sm blk" style="margin-bottom:8px" data-a="postana" data-v="${f.i}">📊 Análise completa: mapa de calor e rede de passes</button>` : ''}`;
}
H.postana = (v) => {
  const G = S.G, f = G.fix[+v], a = f.adv; if (!a) return; const hc = G.clubs[f.h], ac = G.clubs[f.a];
  const lumH = (h) => { const n = parseInt((h || '#888888').slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; }; const vis = (c) => { for (const x of [c.c1, c.c2]) if (x && lumH(x) > 0.3 && Math.abs(lumH(x) - 0.35) > 0.06) return x; return '#ffffff'; }; const colH = vis(hc); let colA = vis(ac); if (colA === colH) colA = colH === '#ffffff' ? '#f4c542' : '#ffffff';
  const heat = (arr, col) => { const mx = Math.max(1, ...arr); return `<svg viewBox="0 0 120 80" class="heat"><rect width="120" height="80" fill="#1b5e33" rx="3"/>${arr.map((v, i) => { const y = Math.floor(i / 6), x = i % 6; return `<rect x="${y * 15}" y="${x * 13.3}" width="15" height="13.3" fill="${col}" opacity="${(v / mx) * 0.85}"/>`; }).join('')}<g fill="none" stroke="#ffffff66" stroke-width=".6"><rect x="1" y="1" width="118" height="78"/><line x1="60" y1="1" x2="60" y2="79"/><circle cx="60" cy="40" r="9"/><rect x="1" y="22" width="16" height="36"/><rect x="103" y="22" width="16" height="36"/></g></svg>`; };
  const net = (side, col) => { const xi = f.lu?.[side] || []; const pos = {}; const tact = side === 0 ? hc.tact : ac.tact; const form = formOf(tact); (a.netXi?.[side] || []).forEach((id, i) => { const fr = form[i]; if (fr) pos[id] = [10 + fr[2] * 100, 6 + fr[1] * 68]; });
    const ls = a.net[side] || []; const mx = Math.max(1, ...ls.map((x) => x[1]));
    return `<svg viewBox="0 0 120 80" class="heat"><rect width="120" height="80" fill="#1b5e33" rx="3"/><g fill="none" stroke="#ffffff55" stroke-width=".6"><rect x="1" y="1" width="118" height="78"/><line x1="60" y1="1" x2="60" y2="79"/></g>${ls.map(([k, n]) => { const [p, q] = k.split('-').map(Number); const A = pos[p], B = pos[q]; if (!A || !B) return ''; return `<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="${col}" stroke-width="${0.6 + (n / mx) * 2.6}" opacity=".85"/>`; }).join('')}${Object.entries(pos).map(([id, [x, y]]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${col}" stroke="#fff" stroke-width=".6"/><text x="${x}" y="${y + 7.5}" font-size="3.6" fill="#fff" text-anchor="middle">${esc(shortName(G.players[id]?.n || ''))}</text>`).join('')}</svg>`; };
  openSheet(`<h2>Análise da partida</h2><div class="cols2"><div class="card flat"><h3>Mapa de calor · ${esc(hc.short || hc.name)}</h3>${heat(a.heat[0], colH)}</div><div class="card flat"><h3>Mapa de calor · ${esc(ac.short || ac.name)}</h3>${heat(a.heat[1].slice().reverse(), colA)}</div></div>
  <div class="cols2"><div class="card flat"><h3>Rede de passes · ${esc(hc.short || hc.name)}</h3>${net(0, colH)}</div><div class="card flat"><h3>Rede de passes · ${esc(ac.short || ac.name)}</h3>${net(1, colA)}</div></div>
  <div class="xs mut">Linhas mais grossas = mais passes trocados entre os dois jogadores. O mapa mostra onde cada time mais jogou (ataque para a direita).</div>`);
};
export function finishMatch(f, res) {
  const G = S.G;
  try { window.LumbraAnalytics?.event('partida_fim', { mata_mata: f.ko >= 0 ? 1 : 0 }); } catch {}
  if (f.ko >= 0 && res.hg === res.ag) res.pen = penalties();
  const w = f.w, sl = f.s, c = myClub(G);
  const fin = isFinal(G, f);
  playSlot(G, res);
  try { if (!G.me.job?.youth && SET.social !== false) socialAfterMatch(G, f, c); } catch (e) { console.warn(e); }
  save(); render();
  const hc = G.clubs[f.h], ac = G.clubs[f.a];
  if (fin && c && !res._champShown) { const s0 = f.h === c.id ? 0 : 1; const gf = s0 ? f.ag : f.hg, ga = s0 ? f.hg : f.ag; const won = gf > ga || (gf === ga && f.pen && (s0 ? f.pen[1] > f.pen[0] : f.pen[0] > f.pen[1]));
    if (won) { setTimeout(() => champCelebrate(G, c, G.comps[f.c]), 450); } }
  const ev = f.ev || [];
  const gl = (side) => ev.filter((e) => e[1] === 0 && e[2] === side).map((e) => `<div class="xs">⚽ ${esc(G.players[e[3]]?.n || '?')} ${e[0]}'</div>`).join('');
  const others = G.fix.filter((x) => x.c === f.c && x.w === w && x.s === sl && x.i !== f.i && x.hg != null).slice(0, 12);
  const notas = Object.entries(f.notas || {}).map(([id, n]) => [G.players[id], n]).filter(([p]) => p && p.club === c?.id).sort((a, b) => b[1] - a[1]);
  const st = f.stats || {};
  const motm = notas[0];
  const PQ = !G.me.job?.youth ? pressAfter(G, f) : null; const pq = PQ ? pressDecision(G, f, PQ, 'post') : null;
  openSheet(`<div class="xs mut" style="text-align:center">${esc(G.comps[f.c].name)} · ${esc(fixPhase(f))}</div>
   <div class="match-hero" style="margin:6px 0"><div>${crest(hc, 48)}<div class="nm">${esc(hc.name)}</div>${gl(0)}</div><div class="score">${f.hg}–${f.ag}</div><div>${crest(ac, 48)}<div class="nm">${esc(ac.name)}</div>${gl(1)}</div></div>
   ${f.pen ? `<div style="text-align:center" class="b">Pênaltis: ${f.pen[0]} – ${f.pen[1]}</div>` : ''}
   ${st.pos ? `<div class="stat-grid" style="margin:8px 0"><div class="stat"><div class="v">${st.pos[0]}%</div><div class="l">posse (casa)</div></div><div class="stat"><div class="v">${st.sh?.[0] ?? 0}–${st.sh?.[1] ?? 0}</div><div class="l">finalizações</div></div><div class="stat"><div class="v">${st.ont ? `${st.ont[0]}–${st.ont[1]}` : '–'}</div><div class="l">no gol</div></div></div>` : ''}
   ${advLine(f)}
   ${motm ? `<div class="hint" style="margin-bottom:8px">⭐ Melhor do seu time: <b>${esc(motm[0].n)}</b> (${motm[1].toFixed(1)})</div>` : ''}
   <div class="cols2"><div class="card flat"><h3>Notas</h3><div class="list">${notas.map(([p, n]) => `<div class="li sm"><span class="grow ell b">${esc(p.n)}</span><span class="pill ${n >= 7.5 ? 'g' : n < 6 ? 'r' : ''}">${n.toFixed(1)}</span></div>`).join('')}</div></div>
   <div class="card flat"><h3>Outros resultados</h3><div class="list">${others.map((x) => `<div class="li xs">${crest(G.clubs[x.h], 16)}<span class="grow ell">${esc(G.clubs[x.h].short)}</span><b>${x.hg}–${x.ag}</b><span class="grow ell" style="text-align:right">${esc(G.clubs[x.a].short)}</span>${crest(G.clubs[x.a], 16)}</div>`).join('') || '<div class="mut sm">—</div>'}</div></div></div>
   ${pq ? `<div id="postpress"><div class="press-cta" data-a="opress" data-v="${pq.id}:post:${f.i}"><span class="pc-mic">🎤</span><div class="grow"><b>Coletiva pós-jogo</b><div class="xs mut ell">${esc(pq.rep?.n || 'Repórter')} (${esc(pq.rep?.o || 'Imprensa')}): “${esc(pq.body)}”</div></div><span class="btn sm pri">Responder</span></div></div>` : ''}
   <button class="btn pri blk big" data-a="sumclose">Continuar</button>`);
}
H.sumclose = () => { closeSheet(true); render(); };

H.opress = (v) => { const G = S.G; const [id, when, fi] = v.split(':'); const m = G.inbox.find((x) => x.id === +id); if (!m) return;
  openPress(m, (mm) => { if (when === 'pre') { closeSheet(true); preMatch(G.fix[+fi]); } else { const el = document.getElementById('postpress'); if (el) el.innerHTML = `<div class="press-done"><span>📰</span><div class="grow"><div class="xs mut">Manchete</div><b>${esc(mm.head || 'Coletiva encerrada')}</b></div></div>`; } render(); }); };
H.prepress = (v) => { const G = S.G; const [id, i, fi] = v.split(':').map(Number); const m = G.inbox.find((x) => x.id === id); if (m) toast(resolveDecision(G, m, i), 2500); closeSheet(); preMatch(G.fix[fi]); save(); };
H.postpress = (v) => { const G = S.G; const [id, i] = v.split(':').map(Number); const m = G.inbox.find((x) => x.id === id); if (m) toast(resolveDecision(G, m, i), 2600); const el = document.getElementById('postpress'); if (el) el.innerHTML = `<div class="sm ok">Resposta dada: “${esc(m.opts[i].l)}”</div>`; save(); };
H.lrep = () => { const v = L.viz; v.replays = !v.replays; const b = document.getElementById('lrp'); if (b) b.style.opacity = v.replays ? 1 : 0.4; toast(v.replays ? 'Replays dos gols ligados' : 'Replays desligados'); };
