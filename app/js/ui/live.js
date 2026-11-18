import { SET, vibrate } from '../settings.js';
import { oppStudy, scoutReport, rivalOfClub } from '../engine/universe.js';
import { coachOf } from '../engine/life.js';
import { esc } from '../util.js';
import { crest, face } from './art.js';
import { S, H, render, toast, openSheet, closeSheet, save, myLineup, posTag, wk, shortName } from './app.js';
import { LiveMatch, FORMATIONS, formOf, MENT, PRESS, available, penalties, effAt } from '../engine/match.js';
import { lineupFor, playSlot, myClub } from '../engine/game.js';
import { MatchViz } from './viz.js';
import { ratings } from '../engine/match.js';
const ratingsOf = (G, club, lu) => { try { return ratings(G, club, lu.xi, 0, club.tact); } catch { return null; } };
import { userMatchBonus, isDerby, pressBefore, pressAfter, pressDecision, staffQ, resolveDecision } from '../engine/life.js';

let L = null;

export function preMatch(f) {
  const G = S.G; const c = myClub(G); const youth = G.me.job.youth;
  const hc = G.clubs[f.h], ac = G.clubs[f.a];
  const lu = myLineup();
  const probs = lu.xi.map((id) => G.players[id]).filter((p) => !p || !available(p));
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
  openSheet(`${derby ? '<div class="derby">🔥 CLÁSSICO</div>' : ''}<div class="xs mut" style="text-align:center">${esc(comp.name)}${f.ko >= 0 ? ' · mata-mata' : ''} · ${wk(f.w)}</div>
  <div class="match-hero" style="margin:8px 0 12px"><div>${crest(hc, 56)}<div class="nm">${esc(hc.name)}</div></div><div class="vs">VS</div><div>${crest(ac, 56)}<div class="nm">${esc(ac.name)}</div></div></div>
  ${probs.length ? `<div class="hint bad" style="margin-bottom:8px">⚠️ Há jogador indisponível na escalação.</div>` : ''}
  ${tired.length ? `<div class="hint warn row" style="margin-bottom:8px;gap:8px;align-items:center"><span class="grow">😮‍💨 Cansados: ${tired.map((p) => esc(shortName(p.n)) + ' ' + Math.round(p.fit) + '%').join(', ')}</span><button class="btn sm" data-a="poupar" data-v="${f.i}">🔁 Poupar</button></div>` : ''}
  ${pm ? `<div class="card flat press-card"><h3>🎤 Coletiva pré-jogo</h3><div class="sm" style="margin-bottom:6px">${esc(pm.body)}</div>${pm.opts.map((o, i) => `<button class="btn sm blk" style="justify-content:flex-start;margin-bottom:4px;text-align:left" data-a="prepress" data-v="${pm.id}:${i}:${f.i}">“${esc(o.l)}”</button>`).join('')}</div>` : ''}
  ${!youth && ana >= 9 ? `<div class="hint" style="margin-bottom:8px">🔎 Analista (${ana}/20): o ${esc(opp.name)} joga no ${esc(opp.tact.form)} com mentalidade ${['defensiva', 'equilibrada', 'ofensiva'][opp.tact.ment]}. Ponto fraco: <b>${weak}</b>.</div>` : ''}
  ${!youth ? (() => { const st = oppStudy(G, opp); const rv = rivalOfClub(G, opp); const lines = R ? scoutReport(G, opp, R) : []; return `<div class="card flat"><h3>📋 Relatório do adversário</h3>${lines.map((l) => `<div class="xs" style="margin-bottom:3px">• ${esc(l)}</div>`).join('')}${st.extra > 0 ? `<div class="hint warn" style="margin-top:6px">🧠 Eles estudaram você: seu ${esc(st.form)} apareceu em ${Math.round(st.share * 100)}% dos últimos jogos. Vão neutralizá-lo (+${st.extra} de força para eles). Varie a formação!</div>` : st.n >= 5 ? '<div class="xs ok" style="margin-top:4px">✅ Você tem variado a tática: o rival não conseguiu te estudar.</div>' : ''}${rv ? `<div class="hint" style="margin-top:6px">⚔️ ${rv === 2 ? 'Grande rival' : 'Rival'}: ${esc(coachOf(G, opp)?.n || '')}. Jogo com mais repercussão na torcida e na imprensa.</div>` : ''}</div>`; })() : ''}
  <div class="card flat"><h3>Destaques do adversário · ${esc(opp.tact.form)}</h3><div class="list">${best.map((p) => `<div class="li">${face(p, 28, opp)}<span class="grow b ell">${esc(p.n)}</span>${posTag(p.pos)}<b>${p.ovr}</b></div>`).join('')}</div></div>
  <div class="col"><button class="btn pri big blk" data-a="golive" data-v="${f.i}">▶ Jogar ao vivo</button>
  <div class="row"><button class="btn grow" data-a="prelu">Escalação</button><button class="btn grow" data-a="goquick" data-v="${f.i}">⏩ Resultado rápido</button></div></div>`);
}
H.prelu = () => { closeSheet(true); S.tab = 'tat'; S.page = null; render(); };

function setup(f) {
  const G = S.G; const c = myClub(G); const youth = G.me.job.youth;
  const side = f.h === c.id ? 0 : 1;
  const lu = myLineup();
  const tact = youth ? G.me.u20tact : c.tact;
  const train = youth ? G.me.u20train : c.train;
  const opp = G.clubs[side ? f.h : f.a];
  const ol = lineupFor(G, opp, youth);
  const ub = userMatchBonus(G, c);
  const mine = { club: c, xi: lu.xi.slice(), bench: lu.bench.slice(), tact: { ...tact }, user: true, extra: (train?.foco === 'tatico' ? 1 : 0) + ub.all, bon: { att: ub.att, def: ub.def } };
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
H.golive = (v) => { const f = S.G.fix[+v]; closeSheet(true); const { m, side } = setup(f); launchLive(f, m, side, S.G.clubs[f.h], S.G.clubs[f.a], null); };
export function launchLive(f, m, side, hc, ac, done) {
  const G = S.G;
  const wrap = document.createElement('div'); wrap.className = 'live-wrap'; wrap.id = 'live';
  wrap.innerHTML = `<div class="lv">
   <div class="lv-top">
     <div class="lv-team">${crest(hc, 30)}<span class="b ell">${esc(hc.name)}</span></div>
     <div class="lv-score"><span id="lsc">0 – 0</span><span class="lv-min" id="lmin">0'</span></div>
     <div class="lv-team r"><span class="b ell">${esc(ac.name)}</span>${crest(ac, 30)}</div>
     <div class="lv-btns"><button class="btn sm" data-a="lnames" title="Nomes">Aa</button><button class="btn sm" data-a="lrep" id="lrp" title="Replays">🎬</button><button class="btn sm qs-btn" data-a="lqs" id="lqsb" title="Trocas rápidas">🔄<i id="lqsn"></i></button><button class="btn sm" data-a="lpause" id="lpb">⏸</button><button class="btn sm" data-a="lspeed" id="lsp">2x</button><button class="btn sm pri" data-a="ltact">Tática</button><button class="btn sm" data-a="lskip">⏭</button></div>
   </div>
   <div class="lv-tl"><i id="ltlp"></i><span style="left:50%" class="ht"></span><div id="ltlm"></div></div>
   <div class="lv-main"><div class="lv-pitch"><canvas id="lcv"></canvas><div class="lv-nar" id="lnar"></div></div>
     <div class="lv-side"><div id="lstats"></div><div class="feed" id="lfeed"></div><div id="lend"></div></div></div>
  </div>`;
  document.body.appendChild(wrap);
  const cv = wrap.querySelector('#lcv');
  L = { f, m, side, raf: 0, last: performance.now(), done };
  L.viz = new MatchViz(cv, G, m, side, {
    onEvent: (e, quiet) => onEv(e, quiet),
    onPause: (why) => { if (why === 'int') { L.viz.paused = true; updPause(); toast('Intervalo — ajuste a tática se quiser'); } },
    onEnd: () => endLive(),
    onReplay: (on) => { const w = document.querySelector('.lv-pitch'); if (w) w.classList.toggle('rp', on); },
  });
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
  if (L.m.min !== L.lastMin) { L.lastMin = L.m.min; narrate(); qsRefresh(); }
  if (L.narT && now > L.narT) { const n = document.getElementById('lnar'); if (n) n.classList.remove('on'); L.narT = 0; }
  const mn = document.getElementById('lmin'); if (mn) mn.textContent = `${L.m.min}'`;
  const tp = document.getElementById('ltlp'); if (tp) tp.style.width = Math.min(100, L.m.min / 90 * 100) + '%';
  L.raf = requestAnimationFrame(loop);
}

const pk = (a) => a[Math.floor(Math.random() * a.length)];
function evText(e) {
  const G = S.G, m = L.m; const nm = (id) => esc(G.players[id]?.n || '');
  const team = (s) => esc(m.s[s]?.club.name || '');
  const sc = () => `${L.viz.score[0]} a ${L.viz.score[1]}`;
  switch (e.t) {
    case 'ini': return pk(['🟢 Bola rolando! Começa o jogo.', '🟢 Apita o árbitro, está valendo!', '🟢 Rola a bola para mais um capítulo dessa história.']);
    case 'gol': return `⚽ ${pk(['GOOOOL', 'É GOL', 'GOLAÇO', 'Balança a rede'])} do ${team(e.side)}! ${pk([`${nm(e.p)} não perdoa`, `${nm(e.p)} manda para o fundo da rede`, `${nm(e.p)} bate com categoria`, `${nm(e.p)} aparece livre e marca`])}${e.as >= 0 ? ` <span class="mut">(assist. ${nm(e.as)})</span>` : ''}. ${sc()}!`;
    case 'def': return pk([`🧤 Que defesa de ${nm(e.gk)}! ${nm(e.p)} parou no goleiro`, `🧤 ${nm(e.p)} chuta e ${nm(e.gk)} espalma`, `🧤 ${nm(e.gk)} voa e segura o chute de ${nm(e.p)}`]);
    case 'trave': return pk([`😱 NA TRAVE! ${nm(e.p)} acerta o poste`, `😱 Explode no travessão! ${nm(e.p)} quase marca`, `😱 Que azar, ${nm(e.p)}! A bola bate na trave`]);
    case 'fora': return pk([`${nm(e.p)} finaliza para fora`, `${nm(e.p)} arrisca de longe… por cima`, `${nm(e.p)} pega mal na bola e manda à linha de fundo`, `Perigo! ${nm(e.p)} tira tinta da trave`]);
    case 'am': return pk([`🟨 Amarelo para ${nm(e.p)}`, `🟨 Falta dura de ${nm(e.p)}, cartão amarelo`, `🟨 ${nm(e.p)} reclama e leva o amarelo`]);
    case 'ver': return `🟥 ${nm(e.p)} é expulso${e.second ? ' (2º amarelo)' : ''}! ${team(e.side)} com um a menos.`;
    case 'les': return `🩹 ${nm(e.p)} sente uma lesão e pede atendimento`;
    case 'sub': return `🔄 ${team(e.side)}: sai ${nm(e.o)}, entra ${nm(e.p)}`;
    case 'int': return `⏸ Intervalo: ${team(0)} ${sc()} ${team(1)}`;
    case 'fim': return `🏁 Fim de jogo! ${team(0)} ${sc()} ${team(1)}`;
    case 'nar': return `🎙️ ${e.txt}`;
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
  const d = document.createElement('div'); d.className = 'ev ' + e.t + (e.side === L.side ? ' mine' : '');
  const tx = evText(e); d.innerHTML = `<b class="dim">${e.m != null ? e.m + "'" : ''}</b> ${tx}`;
  el.prepend(d);
  if (SET.narr && ['gol', 'trave', 'def', 'ver', 'nar', 'int', 'fim'].includes(e.t)) { const n = document.getElementById('lnar'); if (n) { n.innerHTML = tx.replace(/<[^>]+>/g, ''); n.className = 'lv-nar on ' + e.t; L.narT = performance.now() + 3200; } }
}
function onEv(e, quiet) {
  addFeed(e);
  if (['gol', 'ver'].includes(e.t)) { const tm = document.getElementById('ltlm'); if (tm) tm.insertAdjacentHTML('beforeend', `<span class="mk ${e.t} ${e.side === L.side ? 'me' : ''}" style="left:${Math.min(100, e.m / 90 * 100)}%">${e.t === 'gol' ? '⚽' : '🟥'}</span>`); }
  document.getElementById('lsc').textContent = `${L.viz.score[0]} – ${L.viz.score[1]}`;
  stats();
  if (quiet) return;
  if (e.t === 'gol') vibrate(e.side === L.side ? [80, 60, 80] : 40);
  if (e.t === 'les' && e.side === L.side) { L.viz.paused = true; updPause(); toast('Seu jogador se machucou! Faça uma substituição.'); }
  if (e.t === 'ver' && e.side === L.side) toast('Expulsão! Considere ajustar o time.');
}
function stats() {
  const st = L.m.st; const tot = st.pos[0] + st.pos[1] || 1; const p0 = Math.round(st.pos[0] / tot * 100);
  const row = (l, a, b) => { const t = a + b || 1; return `<div class="lv-stat"><b>${a}</b><div class="lv-bar"><i style="width:${a / t * 100}%"></i></div><span>${l}</span><div class="lv-bar r"><i style="width:${b / t * 100}%"></i></div><b>${b}</b></div>`; };
  document.getElementById('lstats').innerHTML = row('Posse %', p0, 100 - p0) + row('Finalizações', st.sh[0], st.sh[1]) + row('No gol', st.ont[0], st.ont[1]) + row('Faltas', st.fal[0], st.fal[1]);
}
function updPause() { const b = document.getElementById('lpb'); if (b) b.textContent = L.viz.paused ? '▶' : '⏸'; }
H.lnames = () => { L.viz.names = !L.viz.names; };
H.lpause = () => { L.viz.paused = !L.viz.paused; updPause(); };
H.lspeed = () => { const v = L.viz; v.speed = v.speed === 1 ? 2 : v.speed === 2 ? 4 : v.speed === 4 ? 8 : 1; document.getElementById('lsp').textContent = v.speed + 'x'; };
H.lskip = () => { for (const sd of L.m.s) sd.user = false; L.viz.skipToEnd(); document.getElementById('lsc').textContent = `${L.m.score[0]} – ${L.m.score[1]}`; };

H.ltact = () => {
  if (!L) return;
  L.viz.paused = true; updPause();
  const G = S.G, m = L.m, s = L.side, sd = m.s[s];
  const form = formOf(sd.tact);
  const used = m.played[s];
  openSheet(`<h2>Tática e substituições</h2>
  <div class="card flat"><h3>Mentalidade</h3><div class="seg" style="margin:0">${MENT.map((x, i) => `<button class="${sd.tact.ment === i ? 'on' : ''}" data-a="lment" data-v="${i}">${x}</button>`).join('')}</div>
  <h3 style="margin-top:12px">Pressão</h3><div class="seg" style="margin:0">${PRESS.map((x, i) => `<button class="${sd.tact.press === i ? 'on' : ''}" data-a="lpress" data-v="${i}">${x}</button>`).join('')}</div></div>
  <div class="card flat"><h3><span>Substituições</span><span>${m.subs[s]}/5</span></h3><button class="btn sm blk" style="margin-bottom:8px" data-a="lqsheet">⚡ Fazer as trocas sugeridas (${m.suggestSubs(s, 3).length})</button><div class="hint" style="margin-bottom:8px">${L.subOut != null ? 'Agora escolha quem entra.' : 'Toque em quem vai sair.'}</div>
  <div class="cols2"><div class="list">${sd.xi.map((id, i) => { const p = G.players[id]; if (!p) return ''; const off = m.sent[s].has(id); const inj = m.ev.some((e) => e.t === 'les' && e.p === id); return `<div class="li tap" ${off ? '' : `data-a="lout" data-v="${id}"`} style="${L.subOut === id ? 'background:#f4c54222' : ''}${off ? ';opacity:.4' : ''}"><span class="xs mut" style="width:30px">${form[i][0]}</span><span class="grow b ell">${esc(p.n)} ${inj ? '🩹' : ''}${off ? ' 🟥' : ''}</span><span class="xs">⚡${Math.round(Math.max(30, p.fit - Math.max(0, m.min - 55) * 0.35))}</span><b style="width:24px;text-align:right">${p.ovr}</b></div>`; }).join('')}</div>
  <div class="list">${sd.bench.map((id) => { const p = G.players[id]; if (!p || used.has(id)) return ''; return `<div class="li tap" data-a="lin" data-v="${id}">${posTag(p.pos)}<span class="grow b ell">${esc(p.n)}</span><b style="width:24px;text-align:right">${p.ovr}</b></div>`; }).join('') || '<div class="empty">Banco vazio</div>'}</div></div></div>
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
  const f = L.f, res = L.m.result(), done = L.done;
  cancelAnimationFrame(L.raf); window.removeEventListener('resize', L.onResize); document.getElementById('live')?.remove();
  L = null;
  (done || finishMatch)(f, res);
};

export function finishMatch(f, res) {
  const G = S.G;
  if (f.ko >= 0 && res.hg === res.ag) res.pen = penalties();
  const w = f.w, sl = f.s, c = myClub(G);
  playSlot(G, res);
  save(); render();
  const hc = G.clubs[f.h], ac = G.clubs[f.a];
  const ev = f.ev || [];
  const gl = (side) => ev.filter((e) => e[1] === 0 && e[2] === side).map((e) => `<div class="xs">⚽ ${esc(G.players[e[3]]?.n || '?')} ${e[0]}'</div>`).join('');
  const others = G.fix.filter((x) => x.c === f.c && x.w === w && x.s === sl && x.i !== f.i && x.hg != null).slice(0, 12);
  const notas = Object.entries(f.notas || {}).map(([id, n]) => [G.players[id], n]).filter(([p]) => p && p.club === c?.id).sort((a, b) => b[1] - a[1]);
  const st = f.stats || {};
  const motm = notas[0];
  const PQ = !G.me.job?.youth ? pressAfter(G, f) : null; const pq = PQ ? pressDecision(G, f, PQ, 'post') : null;
  openSheet(`<div class="xs mut" style="text-align:center">${esc(G.comps[f.c].name)}</div>
   <div class="match-hero" style="margin:6px 0"><div>${crest(hc, 48)}<div class="nm">${esc(hc.name)}</div>${gl(0)}</div><div class="score">${f.hg}–${f.ag}</div><div>${crest(ac, 48)}<div class="nm">${esc(ac.name)}</div>${gl(1)}</div></div>
   ${f.pen ? `<div style="text-align:center" class="b">Pênaltis: ${f.pen[0]} – ${f.pen[1]}</div>` : ''}
   ${st.pos ? `<div class="stat-grid" style="margin:8px 0"><div class="stat"><div class="v">${st.pos[0]}%</div><div class="l">posse (casa)</div></div><div class="stat"><div class="v">${st.sh?.[0] ?? 0}–${st.sh?.[1] ?? 0}</div><div class="l">finalizações</div></div><div class="stat"><div class="v">${st.ont ? `${st.ont[0]}–${st.ont[1]}` : '–'}</div><div class="l">no gol</div></div></div>` : ''}
   ${motm ? `<div class="hint" style="margin-bottom:8px">⭐ Melhor do seu time: <b>${esc(motm[0].n)}</b> (${motm[1].toFixed(1)})</div>` : ''}
   <div class="cols2"><div class="card flat"><h3>Notas</h3><div class="list">${notas.map(([p, n]) => `<div class="li sm"><span class="grow ell b">${esc(p.n)}</span><span class="pill ${n >= 7.5 ? 'g' : n < 6 ? 'r' : ''}">${n.toFixed(1)}</span></div>`).join('')}</div></div>
   <div class="card flat"><h3>Outros resultados</h3><div class="list">${others.map((x) => `<div class="li xs">${crest(G.clubs[x.h], 16)}<span class="grow ell">${esc(G.clubs[x.h].short)}</span><b>${x.hg}–${x.ag}</b><span class="grow ell" style="text-align:right">${esc(G.clubs[x.a].short)}</span>${crest(G.clubs[x.a], 16)}</div>`).join('') || '<div class="mut sm">—</div>'}</div></div></div>
   ${pq ? `<div class="card flat press-card" id="postpress"><h3>🎤 Coletiva pós-jogo</h3><div class="sm" style="margin-bottom:6px">${esc(pq.body)}</div>${pq.opts.map((o, i) => `<button class="btn sm blk" style="justify-content:flex-start;margin-bottom:4px;text-align:left" data-a="postpress" data-v="${pq.id}:${i}">“${esc(o.l)}”</button>`).join('')}</div>` : ''}
   <button class="btn pri blk big" data-a="sumclose">Continuar</button>`);
}
H.sumclose = () => { closeSheet(true); render(); };

H.prepress = (v) => { const G = S.G; const [id, i, fi] = v.split(':').map(Number); const m = G.inbox.find((x) => x.id === id); if (m) toast(resolveDecision(G, m, i), 2500); closeSheet(); preMatch(G.fix[fi]); save(); };
H.postpress = (v) => { const G = S.G; const [id, i] = v.split(':').map(Number); const m = G.inbox.find((x) => x.id === id); if (m) toast(resolveDecision(G, m, i), 2600); const el = document.getElementById('postpress'); if (el) el.innerHTML = `<div class="sm ok">Resposta dada: “${esc(m.opts[i].l)}”</div>`; save(); };
H.lrep = () => { const v = L.viz; v.replays = !v.replays; const b = document.getElementById('lrp'); if (b) b.style.opacity = v.replays ? 1 : 0.4; toast(v.replays ? 'Replays dos gols ligados' : 'Replays desligados'); };
