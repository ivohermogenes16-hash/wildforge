// Telas das seleções: página da sua seleção, pré-jogo e mundo das seleções
import { esc, money, POS } from '../util.js';
import { face, ovrBadge, FLAG } from './art.js';
import { S, H, VIEWS, render, toast, openSheet, closeSheet, save, posTag, wk, shortName } from './app.js';
import { launchLive } from './live.js';
import { LiveMatch, FORMATIONS, MENT, PRESS, penalties } from '../engine/match.js';
import { team, natClub, natLineup, natRecord, natProgress, eligible, autoSquad, nextNatFix, natObjective, qualTable, takeNatJob, natFire, natWage } from '../engine/nations.js';
import { CONFS } from '../data/nations.js';

const flagOf = (G, c) => team(G, c).flag;
const nm = (G, c) => `${team(G, c).flag} ${esc(team(G, c).name)}`;
const compN = (G, f) => (f.comp === 'AMI' ? 'Amistoso' : f.comp.startsWith('Q') ? CONFS[f.comp.slice(1)].n : G.nat.tours[f.comp]?.name || f.comp);

// ---------------- pré-jogo e partida ----------------
export function natPreMatch(f) {
  const G = S.G; const code = G.me.nat.code;
  const T = team(G, code); if (!T.squad.length) T.squad = G.me.natSquad?.length ? G.me.natSquad : autoSquad(G, code);
  const opp = f.h === code ? f.a : f.h; const O = team(G, opp);
  const best = natLineup(G, opp).xi.map((id) => G.players[id]).filter(Boolean).sort((a, b) => b.ovr - a.ovr).slice(0, 4);
  openSheet(`<div class="xs mut" style="text-align:center">${esc(compN(G, f))}${f.st === 'ko' ? ' · mata-mata' : ''} · ${wk(f.w)}</div>
  <div class="match-hero" style="margin:8px 0 10px"><div><div style="font-size:44px">${flagOf(G, f.h)}</div><div class="nm">${esc(team(G, f.h).name)}</div></div><div class="vs">VS</div><div><div style="font-size:44px">${flagOf(G, f.a)}</div><div class="nm">${esc(team(G, f.a).name)}</div></div></div>
  <div class="card flat"><h3>Destaques de ${esc(O.name)} · técnico ${esc(O.coach?.n || '—')}</h3><div class="list">${best.map((p) => `<div class="li">${face(p, 26)}<span class="grow b ell">${esc(p.n)}</span>${posTag(p.pos)}<b>${p.ovr}</b></div>`).join('')}</div></div>
  <div class="col"><button class="btn pri big blk" data-a="natlive" data-v="${f.i}">▶ Jogar ao vivo</button><div class="row"><button class="btn grow" data-a="tab" data-v="nat">Convocação e tática</button><button class="btn grow" data-a="natquick" data-v="${f.i}">⏩ Resultado rápido</button></div></div>`);
}
function natSetup(f) {
  const G = S.G; const code = G.me.nat.code; const side = f.h === code ? 0 : 1;
  const hl = natLineup(G, f.h), al = natLineup(G, f.a);
  const mk = (c, lu, user) => ({ club: natClub(G, c), xi: lu.xi.slice(), bench: lu.bench.slice(), tact: { ...team(G, c).tact }, user });
  const sides = [mk(f.h, hl, side === 0), mk(f.a, al, side === 1)];
  return { m: new LiveMatch(G, f, sides, { neutral: f.st !== 'q' && f.st !== 'a' }), side };
}
function natDone(f, res) {
  const G = S.G;
  if (f.st === 'ko' && res.hg === res.ag) res.pen = penalties();
  natRecord(G, f, res); natProgress(G);
  const code = G.me.nat?.code; const won = code && ((f.h === code && (f.hg > f.ag || (f.pen && f.pen[0] > f.pen[1]))) || (f.a === code && (f.ag > f.hg || (f.pen && f.pen[1] > f.pen[0]))));
  save(); render();
  const gl = (s) => (f.ev || []).filter((e) => e[1] === s).map((e) => `<div class="xs">⚽ ${esc(G.players[e[2]]?.n || '?')} ${e[0]}'</div>`).join('');
  openSheet(`<div class="xs mut" style="text-align:center">${esc(compN(G, f))}</div><div class="match-hero" style="margin:8px 0"><div><div style="font-size:40px">${flagOf(G, f.h)}</div><div class="nm">${esc(team(G, f.h).name)}</div>${gl(0)}</div><div class="score">${f.hg}–${f.ag}</div><div><div style="font-size:40px">${flagOf(G, f.a)}</div><div class="nm">${esc(team(G, f.a).name)}</div>${gl(1)}</div></div>
  ${f.pen ? `<div style="text-align:center" class="b">Pênaltis ${f.pen[0]}–${f.pen[1]}</div>` : ''}<div class="hint" style="margin:8px 0">${won ? '🎉 Vitória! A federação e a imprensa aprovam.' : 'A federação acompanha cada resultado.'} Confiança da federação: ${Math.round(team(G, code)?.conf ?? 0)}%</div>
  <button class="btn pri blk big" data-a="sumclose">Continuar</button>`);
}
H.natquick = (v) => { const f = S.G.nat.fix[+v]; closeSheet(true); const { m } = natSetup(f); natDone(f, m.finish()); };
H.natlive = (v) => { const G = S.G; const f = G.nat.fix[+v]; closeSheet(true); const { m, side } = natSetup(f); launchLive(f, m, side, natClub(G, f.h), natClub(G, f.a), natDone); };

// ---------------- página da seleção (aba lateral) ----------------
VIEWS.nat = () => {
  const G = S.G; const n = G.me.nat;
  if (!n) return '<div class="empty">Você não comanda nenhuma seleção. Veja convites em Mundo › Seleções.</div>';
  const T = team(G, n.code); const sub = S.sub.nat || 'conv';
  const nf = nextNatFix(G);
  let h = `<div class="card hero-card" style="--c1:${T.c1};--c2:${T.c2}"><div class="row" style="gap:12px"><div style="font-size:40px">${T.flag}</div><div class="grow"><div class="xb" style="font-size:17px">Seleção ${esc(T.name)}</div><div class="xs mut">🎯 ${esc(natObjective(G, n.code))} · ${n.j || 0}J ${n.v || 0}V ${n.e || 0}E ${n.d || 0}D · ${money(n.wage)}/sem.</div></div><div style="text-align:right"><div class="xs mut">Federação</div><b class="${T.conf < 30 ? 'bad' : 'ok'}">${Math.round(T.conf)}%</b></div></div>${nf ? `<div class="xs" style="margin-top:6px">Próximo jogo: <b>${nm(G, nf.h)} x ${nm(G, nf.a)}</b> · ${esc(compN(G, nf))} · ${wk(nf.w)}</div>` : ''}</div>`;
  h += `<div class="seg">${[['conv', 'Convocação'], ['tat', 'Tática'], ['jogos', 'Jogos'], ['comp', 'Competições']].map(([k, l]) => `<button class="${sub === k ? 'on' : ''}" data-a="sub" data-v="nat:${k}">${l}</button>`).join('')}</div>`;
  if (sub === 'conv') {
    const sq = new Set(G.me.natSquad || []);
    const el = eligible(G, n.code).sort((a, b) => b.ovr - a.ovr).slice(0, 70);
    h += `<div class="row" style="gap:8px;margin-bottom:8px"><span class="pill ${sq.size === 23 ? 'g' : 'y'}">${sq.size}/23 convocados</span><span class="grow"></span><button class="btn sm" data-a="natauto">⚡ Convocação automática</button></div>
    <div class="card flat tbl-card"><table class="tb"><tr><th></th><th>Pos</th><th class="l">Jogador</th><th>Id</th><th>Ger</th><th>⚡</th><th class="l">Clube</th><th>Jogos/Gols</th></tr>${el.map((p) => `<tr data-a="natpick" data-v="${p.id}" class="${sq.has(p.id) ? 'me' : ''}"><td>${sq.has(p.id) ? '✅' : '⬜'}</td><td>${posTag(p.pos)}</td><td class="l"><b>${esc(p.n)}</b>${p.inj > 0 ? ' 🩹' : ''}</td><td>${p.age}</td><td>${ovrBadge(p.ovr)}</td><td>${Math.round(p.fit)}</td><td class="l sm ell" style="max-width:120px">${p.club >= 0 ? esc(G.clubs[p.club].name) : '<span class="mut">clube no exterior</span>'}</td><td class="sm">${p.intl ? `${p.intl.j}/${p.intl.g}` : '0/0'}</td></tr>`).join('')}</table></div>
    <p class="xs mut">Toque para convocar/desconvocar (máx. 23, pelo menos 3 goleiros). A escalação é montada com os melhores convocados na formação escolhida. Alguns jogadores podem pedir dispensa.</p>`;
  } else if (sub === 'tat') {
    h += `<div class="card"><h3>Formação</h3><div class="chips" style="flex-wrap:wrap">${Object.keys(FORMATIONS).map((f) => `<span class="chip ${T.tact.form === f ? 'on' : ''}" data-a="natform" data-v="${f}">${f}</span>`).join('')}</div>
    <h3 style="margin-top:8px">Mentalidade</h3><div class="seg">${MENT.map((x, i) => `<button class="${T.tact.ment === i ? 'on' : ''}" data-a="nattact" data-v="ment:${i}">${x}</button>`).join('')}</div>
    <h3>Pressão</h3><div class="seg">${PRESS.map((x, i) => `<button class="${T.tact.press === i ? 'on' : ''}" data-a="nattact" data-v="press:${i}">${x}</button>`).join('')}</div></div>
    <div class="card"><h3>Provável escalação</h3><div class="list">${natLineup(G, n.code).xi.map((id, i) => { const p = G.players[id]; return p ? `<div class="li sm"><span class="xs mut" style="width:34px">${(FORMATIONS[T.tact.form] || FORMATIONS['4-3-3'])[i][0]}</span><span class="grow b">${esc(p.n)}</span>${ovrBadge(p.ovr)}</div>` : ''; }).join('')}</div></div>`;
  } else if (sub === 'jogos') {
    const fx = G.nat.fix.filter((f) => f.h === n.code || f.a === n.code);
    h += `<div class="card flat"><div class="list">${fx.map((f) => `<div class="li sm"><span class="xs mut" style="width:46px">${wk(f.w)}</span><span class="grow">${nm(G, f.h)} <b>${f.hg != null ? `${f.hg}–${f.ag}${f.pen ? '*' : ''}` : 'x'}</b> ${nm(G, f.a)}</span><span class="xs mut">${esc(compN(G, f))}</span></div>`).join('') || '<div class="empty">Sem jogos marcados nesta temporada.</div>'}</div></div>`;
  } else h += compsView(G, T.cf);
  h += `<button class="btn sm red blk" style="margin-top:6px" data-a="natquit">Deixar a seleção</button>`;
  return h;
};
H.natpick = (v) => { const G = S.G; const id = +v; let sq = G.me.natSquad || []; if (sq.includes(id)) sq = sq.filter((x) => x !== id); else { if (sq.length >= 23) { toast('Máximo de 23 convocados'); return; } sq = sq.concat(id); } G.me.natSquad = sq; team(G, G.me.nat.code).squad = sq.slice(); render(); save(); };
H.natauto = () => { const G = S.G; G.me.natSquad = autoSquad(G, G.me.nat.code); team(G, G.me.nat.code).squad = G.me.natSquad.slice(); toast('Convocação automática feita'); render(); save(); };
H.natform = (v) => { team(S.G, S.G.me.nat.code).tact.form = v; render(); save(); };
H.nattact = (v) => { const [k, n] = v.split(':'); team(S.G, S.G.me.nat.code).tact[k] = +n; render(); save(); };
H.natquit = () => openSheet(`<h2>Deixar a seleção?</h2><p>Você perde um pouco de reputação.</p><div class="row"><button class="btn grow" data-a="cs">Cancelar</button><button class="btn red grow" data-a="natquit2">Sair</button></div>`);
H.natquit2 = () => { natFire(S.G, 'Você pediu demissão do cargo.'); closeSheet(); S.tab = 'home'; render(); save(); };

function compsView(G, cf) {
  let h = '';
  for (const T of Object.values(G.nat.tours)) {
    h += `<div class="card"><h3>${esc(T.name)}${T.champion ? ` · 🏆 ${nm(G, T.champion)}` : ''}</h3><div class="cols2">${T.groups.map((g, gi) => `<div><div class="xs mut">Grupo ${String.fromCharCode(65 + gi)}</div><table class="tb">${g.slice().sort((a, b) => T.table[b].pts - T.table[a].pts || (T.table[b].gf - T.table[b].ga) - (T.table[a].gf - T.table[a].ga)).map((c) => `<tr class="${G.me.nat?.code === c ? 'me' : ''}"><td class="l">${nm(G, c)}</td><td>${T.table[c].p}</td><td>${T.table[c].gf - T.table[c].ga}</td><td class="b">${T.table[c].pts}</td></tr>`).join('')}</table></div>`).join('')}</div>
    ${T.ko.length ? `<div class="list" style="margin-top:6px">${T.ko.flat().map((i) => { const f = G.nat.fix[i]; return `<div class="li sm"><span class="grow">${nm(G, f.h)} <b>${f.hg != null ? `${f.hg}–${f.ag}${f.pen ? ` (${f.pen[0]}–${f.pen[1]} p)` : ''}` : wk(f.w)}</b> ${nm(G, f.a)}</span></div>`; }).join('')}</div>` : ''}</div>`;
  }
  const cs = Object.keys(G.nat.qual).map(Number).sort().pop();
  if (cs && G.year - cs <= 2) {
    for (const [k, d] of Object.entries(CONFS)) { if (cf && cf !== k && !S.allQ) continue; const tab = G.nat.qual[cs][k].tab; h += `<div class="card"><h3>${esc(d.n)} (Copa ${cs + 3}) · ${d.spots} vagas</h3><table class="tb"><tr><th>#</th><th class="l">Seleção</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>P</th></tr>${qualTable(tab).map((c, i) => `<tr class="${G.me.nat?.code === c ? 'me' : ''}"><td class="${i < d.spots ? 'zone-up' : ''}">${i + 1}</td><td class="l">${nm(G, c)}</td><td>${tab[c].p}</td><td>${tab[c].w}</td><td>${tab[c].d}</td><td>${tab[c].l}</td><td>${tab[c].gf - tab[c].ga}</td><td class="b">${tab[c].pts}</td></tr>`).join('')}</table></div>`; }
    if (cf) h += `<button class="btn sm blk" data-a="allq">${S.allQ ? 'Ver só minhas eliminatórias' : 'Ver todas as eliminatórias'}</button>`;
  }
  return h || '<div class="empty">Nenhuma competição de seleções em andamento. Copa do Mundo em 2030, 2034…; Copa América e Eurocopa em 2028, 2032…; eliminatórias nos anos entre elas.</div>';
}
H.allq = () => { S.allQ = !S.allQ; render(); };

// ---------------- Mundo › Seleções ----------------
export function natWorldView(G) {
  const teams = Object.values(G.nat.teams).sort((a, b) => b.pts - a.pts);
  const vac = (G.nat.vac || []).filter((v) => !team(G, v.code).coach);
  return `<div class="cols2"><div><div class="card flat tbl-card"><h3 style="padding:6px">Ranking de seleções</h3><table class="tb"><tr><th>#</th><th class="l">Seleção</th><th class="l">Técnico</th><th>Pts</th><th>Títulos</th></tr>${teams.map((t, i) => `<tr class="${G.me.nat?.code === t.code ? 'me' : ''}"><td>${i + 1}</td><td class="l">${t.flag} ${esc(t.name)}</td><td class="l sm ell" style="max-width:120px">${esc(t.coach?.n || 'vago')}</td><td>${Math.round(t.pts)}</td><td>${t.titles.length}</td></tr>`).join('')}</table></div></div>
  <div>${vac.length ? `<div class="card"><h3>Seleções sem técnico</h3>${vac.map((v) => { const t = team(G, v.code); const ch = Math.max(0.03, Math.min(0.9, 0.6 - (t.rep - G.me.rep - (G.me.pop || 0) / 10) * 0.035)); return `<div class="li"><span class="grow">${t.flag} <b>${esc(t.name)}</b> <span class="xs mut">rep ${t.rep} · ${money(natWage(t))}/sem.</span></span><button class="btn sm ${ch > 0.4 ? 'pri' : ''}" data-a="natapply" data-v="${v.code}">${Math.round(ch * 100)}%</button></div>`; }).join('')}</div>` : ''}
  ${compsView(G, null)}
  <div class="card"><h3>Campeões</h3>${G.nat.hist.slice().reverse().map((x) => `<div class="kv sm"><span>🏆 ${esc(x.c)}</span><b>${nm(G, x.ch)}</b></div>`).join('') || '<div class="xs mut">Ainda nenhum torneio disputado no jogo.</div>'}</div></div></div>`;
}
H.natapply = (code) => {
  const G = S.G; const t = team(G, code);
  if (G.me.nat) { toast('Você já comanda uma seleção.'); return; }
  if (G.me.cd?.['nat_' + code] === G.t) { toast('Já se candidatou esta semana.'); return; }
  (G.me.cd ||= {})['nat_' + code] = G.t;
  const ch = Math.max(0.03, Math.min(0.9, 0.6 - (t.rep - G.me.rep - (G.me.pop || 0) / 10) * 0.035));
  if (Math.random() < ch) { takeNatJob(G, code); toast(`🌍 A federação aceitou! Você é o técnico de ${t.name}.`, 3200); } else toast(`❌ A federação de ${t.name} preferiu outro nome.`, 3000);
  render(); save();
};
