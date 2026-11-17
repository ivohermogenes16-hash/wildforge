import { natWorldView } from './nations.js';
// Telas dos sistemas de carreira: Clube (diretoria, finanças, estrutura, comissão), Carreira e Mundo
import { esc, money, clamp } from '../util.js';
import { crest, face, FLAG } from './art.js';
import { S, H, VIEWS, render, toast, openSheet, closeSheet, replaceSheet, save, stars, wk } from './app.js';
import { myClub, resign } from '../engine/game.js';
import { BOARD_TYPES } from '../engine/world.js';
import { coachWage, playerValue } from '../engine/econ.js';
import { STAFF, INFRA, SPECS, SPEC_D, staffQ, staffCandidates, hireStaff, fireStaff, infraCost, canBuild, startBuild, requestBuild, requestFunds, specPoints, spendSpec, repBreakdown, achievements, hallOfFame, coachOf, staffWages, captainOf } from '../engine/life.js';
import { controls } from '../engine/career.js';
import { wageBudget, weeklyWages } from '../engine/market.js';

const seg = (k, items) => `<div class="seg">${items.map(([v, l]) => `<button class="${(S.sub[k] || items[0][0]) === v ? 'on' : ''}" data-a="sub" data-v="${k}:${v}">${l}</button>`).join('')}</div>`;
const meter = (l, v, col) => `<div class="meter"><div class="row xs"><span class="grow mut">${l}</span><b>${Math.round(v)}</b></div><div class="bar"><i style="width:${clamp(v, 2, 100)}%;background:${col || (v < 30 ? 'var(--red)' : v < 55 ? 'var(--gold)' : 'var(--ac)')}"></i></div></div>`;
const canManage = (G, c) => c && ((G.me.job && !G.me.job.youth && G.me.job.cid === c.id) || controls(G, c));

// ============================== CLUBE ==============================
VIEWS.clube = () => {
  const G = S.G, c = myClub(G);
  if (!c) return '<div class="empty">Você está sem clube. Veja as vagas em Carreira.</div>';
  const sub = S.sub.cl || 'visao';
  let h = seg('cl', [['visao', 'Visão geral'], ['dir', 'Diretoria'], ['fin', 'Finanças'], ['est', 'Estrutura'], ['com', 'Comissão']]);
  if (sub === 'visao') h += clubOverview(G, c);
  else if (sub === 'dir') h += boardView(G, c);
  else if (sub === 'fin') h += financeView(G, c);
  else if (sub === 'est') h += infraView(G, c);
  else h += staffView(G, c);
  return h;
};
function clubOverview(G, c) {
  const k = coachOf(G, c); const cap = captainOf(G, c);
  const senior = G.me.job && !G.me.job.youth;
  return `<div class="dash"><div><div class="card hero-card" style="--c1:${c.c1};--c2:${c.c2}"><div class="row" style="gap:12px">${crest(c, 56)}<div class="grow"><div class="xb" style="font-size:17px">${esc(c.name)}</div><div class="xs mut">${esc(c.city)} · ${esc(c.stad)} (${c.cap} mil)</div><div>${stars(c.rep)} <span class="xs mut">rep. ${c.rep}</span></div></div></div></div>
    <div class="card"><h3>Clima</h3>${meter('Satisfação da torcida', c.fans)}${meter('Entrosamento do elenco', c.chem)}${senior ? meter('Confiança da diretoria', c.board.conf) : ''}<div class="xs mut" style="margin-top:4px">Capitão: <b>${esc(cap?.n || '—')}</b> · Técnico do profissional: <b>${c.coach?.user ? 'você' : esc(c.coach?.n || 'vago')}</b>${k ? ` (${esc(k.style)})` : ''}</div></div></div>
   <div><div class="card"><h3>Títulos no jogo</h3>${c.troph.length ? c.troph.slice().reverse().slice(0, 12).map((t) => `<div class="kv"><span>🏆 ${esc(t.c)}</span><b>${t.y}</b></div>`).join('') : '<div class="mut sm">Nenhum ainda.</div>'}</div></div>
   <div>${c.hist.length ? `<div class="card"><h3>Campanhas</h3>${c.hist.slice().reverse().slice(0, 10).map((x) => `<div class="kv"><span>${x.y} · ${esc(x.lg)}</span><b>${x.pos}º</b></div>`).join('')}</div>` : ''}
   ${canManage(G, c) ? `<div class="card"><h3>Ingresso</h3><div class="field"><label>Preço médio: <b id="tkv">${money(c.price ?? ({ BR: 45, EN: 260, ES: 190, IT: 170, AR: 14 }[c.country] || 20))}</b></label><input type="range" min="5" max="${c.country === 'BR' ? 300 : c.country === 'AR' ? 80 : 900}" value="${Math.round(c.price ?? ({ BR: 45, EN: 260, ES: 190, IT: 170, AR: 14 }[c.country] || 20))}" data-in="ticket"></div><p class="xs mut">Mais caro rende mais por jogo, mas a torcida reclama se o time vai mal.</p></div>` : ''}</div></div>`;
}
function boardView(G, c) {
  const bt = BOARD_TYPES[c.board.type]; const me = G.me; const senior = me.job && !me.job.youth;
  const log = me.decLog.slice(0, 8);
  return `<div class="cols2"><div><div class="card"><h3><span>Diretoria ${esc(bt.n)}</span><span class="pill">Pres. ${esc(c.board.pres)}</span></h3><p class="sm">${esc(bt.d)}</p>
    ${senior ? meter('Confiança no técnico', c.board.conf) : ''}<div class="xs mut" style="margin-top:4px">${senior ? `Demite abaixo de ${bt.fire}% de confiança.` : 'Você é do sub-20: a diretoria acompanha de longe.'}</div></div>
    <div class="card"><h3>Metas</h3><div class="kv"><span class="mut">Principal</span><b>${esc(me.obj?.text || '—')}</b></div>${me.obj2 ? `<div class="kv"><span class="mut">Secundária</span><b class="sm" style="text-align:right">${esc(me.obj2.text)}</b></div>` : ''}${me.job ? `<div class="kv"><span class="mut">Seu contrato</span><b>até ${me.job.until} · ${money(me.job.wage)}/sem.</b></div>` : ''}</div></div>
   <div>${senior ? `<div class="card"><h3>Pedidos à diretoria</h3><div class="col"><button class="btn blk" data-a="askfunds">💰 Pedir verba para reforços</button><button class="btn blk" data-a="sub" data-v="cl:est">🏗️ Pedir investimento em estrutura</button></div><p class="xs mut" style="margin-top:6px">A resposta depende do perfil da diretoria, do caixa e da confiança. Uma tentativa por temporada.</p></div>` : ''}
    <div class="card"><h3>Últimas decisões</h3>${log.length ? log.map((d) => `<div class="li sm"><span class="xs dim" style="width:46px">${wk(d.w)}</span><div class="grow"><div class="b ell">${esc(d.t)}</div><div class="xs mut ell">${esc(d.a)}</div></div></div>`).join('') : '<div class="xs mut">Reuniões, pedidos do elenco e coletivas aparecem aqui.</div>'}</div></div></div>`;
}
H.askfunds = () => { toast(requestFunds(S.G), 3500); render(); save(); };
function financeView(G, c) {
  const f = c.fin; const inc = [['Direitos de TV', f.tv], ['Bilheteria', f.tick], ['Patrocínios', f.spon], ['Premiações', f.prize], ['Venda de jogadores', f.tin]];
  const out = [['Salários do elenco', f.wages], ['Comissão técnica', f.staff || 0], ['Compra de jogadores', f.tout], ['Obras e estrutura', f.infra || 0], ['Juros de dívida', f.juros || 0], ['Outros', Math.max(0, f.other)]];
  const ti = inc.reduce((s, x) => s + x[1], 0), to = out.reduce((s, x) => s + x[1], 0);
  const mx = Math.max(1, ...inc.map((x) => x[1]), ...out.map((x) => x[1]));
  const row = (l, v, cls) => `<div class="finrow"><span>${l}</span><div class="finbar"><i class="${cls}" style="width:${v / mx * 100}%"></i></div><b>${money(v)}</b></div>`;
  const ww = weeklyWages(G, c.id), wb = wageBudget(G, c);
  return `<div class="cols2"><div class="card"><h3><span>Receitas da temporada</span><b class="ok">${money(ti)}</b></h3>${inc.map(([l, v]) => row(l, v, 'in')).join('')}
    <h3 style="margin-top:10px"><span>Despesas</span><b class="bad">${money(to)}</b></h3>${out.map(([l, v]) => row(l, v, 'out')).join('')}
    <div class="kv" style="margin-top:6px"><span class="b">Resultado</span><b class="${ti - to < 0 ? 'bad' : 'ok'}">${money(ti - to)}</b></div></div>
   <div><div class="card"><div class="stat-grid"><div class="stat"><div class="v ${c.money < 0 ? 'bad' : ''}" style="font-size:16px">${money(c.money)}</div><div class="l">caixa${c.money < 0 ? ' (dívida, 1%/mês de juros)' : ''}</div></div><div class="stat"><div class="v" style="font-size:16px">${money(ww)}</div><div class="l">folha/sem.</div></div><div class="stat"><div class="v" style="font-size:16px ${ww > wb ? ';color:var(--red)' : ''}">${money(wb)}</div><div class="l">teto salarial/sem.</div></div></div>
    <p class="xs mut" style="margin-top:6px">O teto vem de TV + patrocínios + caixa. Estourar o teto bloqueia contratações; dívida derruba a confiança de diretorias conservadoras.</p></div>
    <div class="card"><h3>Patrocínios</h3>${(c.spons || []).map((s) => `<div class="li sm"><span class="pill">${esc(s.slot)}</span><span class="grow b ell">${esc(s.n)}</span><b>${money(s.val)}/temp.</b><span class="xs mut">até ${s.until}</span></div>`).join('')}<p class="xs mut">Valores dependem da reputação, divisão, torcida e modernização do estádio. Na renovação o contrato é recalculado.</p></div>
    ${c.lastFin ? `<div class="card"><h3>Temporada passada</h3><div class="kv"><span>Receitas</span><b>${money(['tv', 'tick', 'spon', 'prize', 'tin'].reduce((s, k) => s + (c.lastFin[k] || 0), 0))}</b></div><div class="kv"><span>Despesas</span><b>${money(['wages', 'staff', 'tout', 'infra', 'juros'].reduce((s, k) => s + (c.lastFin[k] || 0), 0) + Math.max(0, c.lastFin.other || 0))}</b></div></div>` : ''}</div></div>`;
}
function infraView(G, c) {
  const can = canManage(G, c); const own = controls(G, c);
  const builds = G.builds.filter((b) => b.cid === c.id);
  return `<div class="hint" style="margin-bottom:8px">${own ? 'Você controla o clube: as obras saem do caixa do clube (ou do seu bolso).' : can ? 'Como técnico, você pede o investimento e a diretoria decide.' : 'Só o técnico do profissional ou o dono pode mexer na estrutura.'}</div>
  ${builds.length ? `<div class="card"><h3>Obras em andamento</h3>${builds.map((b) => `<div class="kv"><span>🏗️ ${INFRA[b.kind].n}${b.kind !== 'est' ? ` → nível ${b.lvl}` : ''}</span><b>pronta em ${b.done - G.t} sem.</b></div>`).join('')}</div>` : ''}
  <div class="infra-grid">${Object.entries(INFRA).map(([k, d]) => {
    const lvl = k === 'est' ? c.cap : c.infra[k] || 0; const max = d.max ?? 5; const block = canBuild(G, c, k); const cost = infraCost(c, k);
    return `<div class="card infra"><div class="row"><b class="grow">${d.n}</b>${k === 'est' ? `<span class="pill">${c.cap} mil</span>` : `<span class="lvl">${'■'.repeat(lvl)}<i>${'■'.repeat(Math.max(0, max - lvl))}</i></span>`}</div><div class="xs mut" style="margin:4px 0 8px">${d.d}</div>
      ${block ? `<div class="xs warn">${block}</div>` : can ? `<div class="row"><span class="xs grow">${money(cost)} · ${d.w * (k === 'est' ? 1 : Math.max(1, lvl))} sem.</span>${own ? `<button class="btn sm pri" data-a="build" data-v="${k}:club">Construir</button><button class="btn sm" data-a="build" data-v="${k}:me">Pagar do bolso</button>` : `<button class="btn sm" data-a="reqbuild" data-v="${k}">Pedir à diretoria</button>`}</div>` : ''}</div>`;
  }).join('')}</div>`;
}
H.build = (v) => { const [k, payer] = v.split(':'); const r = startBuild(S.G, myClub(S.G), k, payer); toast(r.why, 3000); render(); save(); };
H.reqbuild = (v) => { const r = requestBuild(S.G, v); toast(r.why, 3200); render(); save(); };
function staffView(G, c) {
  const can = canManage(G, c);
  return `<div class="hint" style="margin-bottom:8px">A qualidade (1–20) de cada profissional afeta o desempenho. Sem ninguém contratado, o clube usa a estrutura padrão (qualidade ${staffQ(G, { rep: c.rep, staff: {} }, 'aux')}). Salários totais: ${money(staffWages(c))}/sem.</div>
  <div class="infra-grid">${Object.entries(STAFF).map(([k, d]) => { const s = c.staff[k]; return `<div class="card infra"><div class="row"><b class="grow">${d.n}</b><span class="pill ${s ? 'g' : ''}">${staffQ(G, c, k)}/20</span></div><div class="xs mut" style="margin:3px 0 6px">${d.d}</div>
    ${s ? `<div class="sm"><b>${esc(s.n)}</b> ${FLAG[s.nat] || ''} · ${s.age} anos · ${money(s.wage)}/sem.</div>` : '<div class="sm mut">Padrão do clube</div>'}
    ${can ? `<div class="row" style="margin-top:6px;gap:6px"><button class="btn sm grow" data-a="staffc" data-v="${k}">${s ? 'Trocar' : 'Contratar'}</button>${s ? `<button class="btn sm red" data-a="stafffire" data-v="${k}">Dispensar</button>` : ''}</div>` : ''}</div>`; }).join('')}</div>`;
}
H.staffc = (k) => {
  const G = S.G, c = myClub(G); const list = staffCandidates(G, c, k); S.stc = list;
  openSheet(`<h2>${STAFF[k].n}: candidatos</h2><p class="xs mut">A lista muda a cada 4 semanas.</p><div class="list">${list.map((x, i) => `<div class="li"><div class="grow"><div class="b">${esc(x.n)} ${FLAG[x.nat] || ''}</div><div class="xs mut">${x.age} anos · reputação ${x.rep} · ${money(x.wage)}/sem.</div></div><span class="pill ${x.q >= 14 ? 'g' : x.q >= 9 ? 'y' : ''}">${x.q}/20</span><button class="btn sm pri" data-a="staffh" data-v="${i}">Contratar</button></div>`).join('')}</div>`);
};
H.staffh = (i) => { const r = hireStaff(S.G, myClub(S.G), S.stc[+i]); toast(r.why, 3000); if (r.ok) { closeSheet(); render(); save(); } };
H.stafffire = (k) => { toast(fireStaff(S.G, myClub(S.G), k)); render(); save(); };

// ============================== CARREIRA ==============================
VIEWS.carreira = () => {
  const sub = S.sub.car || 'perfil';
  const G = S.G; const sp = specPoints(G);
  let h = seg('car', [['perfil', 'Perfil'], ['esp', `Especialidades${sp.free ? ` (${sp.free})` : ''}`], ['vagas', 'Vagas'], ['hist', 'Histórico'], ['conq', 'Conquistas']]);
  if (sub === 'perfil') h += profileView(G);
  else if (sub === 'esp') h += specView(G);
  else if (sub === 'vagas') h += vacView(G);
  else if (sub === 'hist') h += histView(G);
  else h += achView(G);
  return h;
};
function repLabel(r) { return r < 15 ? 'Desconhecido' : r < 30 ? 'Promessa' : r < 45 ? 'Respeitado nas divisões de acesso' : r < 60 ? 'Nome forte no país' : r < 75 ? 'Elite nacional' : r < 88 ? 'Cobiçado por gigantes' : 'Lenda'; }
function profileView(G) {
  const me = G.me, j = me.job, s = me.stats; const c = myClub(G);
  return `<div class="dash"><div><div class="card hero-card"><div class="row" style="gap:12px"><div style="font-size:38px">🧑‍💼</div><div class="grow"><div class="xb" style="font-size:17px">${esc(me.name)}</div><div class="xs mut">${me.age} anos · ${j ? `${j.youth ? 'Sub-20 do ' : 'Técnico do '}${esc(c.name)}` : 'Sem clube'}</div></div></div>
    ${meter('Reputação · ' + repLabel(me.rep), me.rep, 'linear-gradient(90deg,var(--ac2),var(--gold))')}${meter('Popularidade', me.pop, 'var(--blue)')}${meter('Pressão da imprensa', me.pp, me.pp > 65 ? 'var(--red)' : 'var(--org)')}</div>
    ${j ? `<div class="card"><h3>Contrato</h3><div class="kv"><span class="mut">Salário</span><b>${money(j.wage)}/sem.</b></div><div class="kv"><span class="mut">Válido até</span><b>${j.until}</b></div>${!j.youth ? `<button class="btn sm red blk" style="margin-top:6px" data-a="resign">Pedir demissão</button>` : `<button class="btn sm red blk" style="margin-top:6px" data-a="resign">Deixar o cargo</button>`}</div>` : ''}</div>
   <div><div class="card"><h3>Base da reputação</h3>${repBreakdown(G).map(([l, v]) => meter(l, v)).join('')}<p class="xs mut">Clubes olham para a reputação somada à popularidade. Pressão alta da imprensa desgasta a diretoria.</p></div></div>
   <div><div class="card"><h3>Números da carreira</h3><div class="stat-grid"><div class="stat"><div class="v">${s.j}</div><div class="l">jogos</div></div><div class="stat"><div class="v">${s.v}-${s.e}-${s.d}</div><div class="l">V-E-D</div></div><div class="stat"><div class="v">${s.j ? Math.round((s.v * 3 + s.e) / (s.j * 3) * 100) : 0}%</div><div class="l">aproveit.</div></div><div class="stat"><div class="v">${me.car.gf}</div><div class="l">gols pró</div></div><div class="stat"><div class="v">${me.car.ga}</div><div class="l">gols contra</div></div><div class="stat"><div class="v">${me.titles.length}</div><div class="l">títulos</div></div><div class="stat"><div class="v">${me.car.revealed.length}</div><div class="l">revelados</div></div><div class="stat"><div class="v">${me.car.trans}</div><div class="l">transferências</div></div><div class="stat"><div class="v">${me.car.countries.length}</div><div class="l">países</div></div></div></div></div></div>`;
}
function specView(G) {
  const sp = specPoints(G); const me = G.me;
  const next = (sp.tot + 1) * 140 - (me.xp || 0);
  return `<div class="card"><div class="row"><div class="grow"><div class="xb">Pontos livres: <span class="ok">${sp.free}</span></div><div class="xs mut">Experiência ${Math.round(me.xp || 0)} · próximo ponto em ${Math.max(0, Math.round(next))} XP (jogos, vitórias e títulos dão XP)</div></div></div></div>
  <div class="infra-grid">${Object.entries(SPECS).map(([k, n]) => `<div class="card infra"><div class="row"><b class="grow">${n}</b><span class="lvl">${'■'.repeat(me.spec[k] || 0)}<i>${'■'.repeat(3 - (me.spec[k] || 0))}</i></span></div><div class="xs mut" style="margin:4px 0 8px">${SPEC_D[k]}</div>${(me.spec[k] || 0) < 3 ? `<button class="btn sm ${sp.free ? 'pri' : ''} blk" data-a="spec" data-v="${k}" ${sp.free ? '' : 'disabled'}>Evoluir</button>` : '<div class="xs ok">Nível máximo</div>'}</div>`).join('')}</div>`;
}
H.spec = (k) => { toast(spendSpec(S.G, k)); render(); save(); };
function applyChance(G, c, youth) { return clamp(0.75 - (c.rep - G.me.rep - (G.me.pop || 0) / 12 - (youth ? 20 : 0)) * 0.035, 0.02, 0.95); }
function vacView(G) {
  const j = G.me.job;
  const vac = G.vac.filter((v) => { const c = G.clubs[v.cid]; return c.league && !(j && j.cid === v.cid && !!j.youth === !!v.youth); }).sort((a, b) => G.clubs[b.cid].rep - G.clubs[a.cid].rep);
  return `<div class="card flat"><div class="list">${vac.slice(0, 40).map((v) => { const c = G.clubs[v.cid]; const ch = applyChance(G, c, v.youth); return `<div class="li">${crest(c, 26)}<div class="grow"><div class="b ell">${esc(c.name)}${v.youth ? ' <span class="pill b">Sub-20</span>' : ''}</div><div class="xs mut">${esc(G.comps[c.league]?.short || '')} · rep ${c.rep} · diretoria ${esc(BOARD_TYPES[c.board.type]?.n || '')} · ${money(coachWage(c.rep, c.country, v.youth))}/sem.</div></div><button class="btn sm ${ch > 0.4 ? 'pri' : ''}" data-a="apply" data-v="${v.cid}:${v.youth ? 1 : 0}">${Math.round(ch * 100)}%</button></div>`; }).join('') || '<div class="empty">Nenhuma vaga no momento.</div>'}</div><p class="xs mut">O número é a chance de ser aceito. Vagas surgem quando clubes demitem técnicos.</p></div>`;
}
function histView(G) {
  const me = G.me;
  return `<div class="card flat tbl-card"><table class="tb"><tr><th class="l">Clube</th><th>Ano</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>Aprov.</th><th>Final</th></tr>${me.hist.slice().reverse().map((h) => { const ap = h.j ? Math.round((h.v * 3 + h.e) / (h.j * 3) * 100) + '%' : '—'; return `<tr><td class="l"><span class="row" style="gap:6px">${crest(G.clubs[h.cid], 16)}<b class="ell">${esc(h.name)}</b>${h.youth ? '<span class="pill b">Sub-20</span>' : ''}${h.fired ? '<span class="pill r">demitido</span>' : ''}</span></td><td>${h.y}</td><td>${h.j}</td><td>${h.v}</td><td>${h.e}</td><td>${h.d}</td><td>${h.gf}</td><td>${h.ga}</td><td>${ap}</td><td>${h.pos ? h.pos + 'º' : '—'}</td></tr>`; }).join('')}</table></div>
  <div class="cols2"><div class="card"><h3>Títulos</h3>${me.titles.length ? me.titles.slice().reverse().map((t) => `<div class="kv"><span>🏆 ${esc(t.c)} <span class="mut">(${esc(t.club)})</span></span><b>${t.y}</b></div>`).join('') : '<div class="xs mut">Ainda nenhum.</div>'}</div>
  <div class="card"><h3>Prêmios e revelações</h3>${me.awards.map((a) => `<div class="kv"><span>🎖️ Melhor técnico · ${esc(a.lg)}</span><b>${a.y}</b></div>`).join('')}${me.car.revealed.map((id) => G.players[id]).filter(Boolean).map((p) => `<div class="kv" data-a="player" data-v="${p.id}"><span>🌱 ${esc(p.n)}</span><b>${p.ovr}</b></div>`).join('') || (me.awards.length ? '' : '<div class="xs mut">Promova jovens da base para revelá-los.</div>')}</div></div>`;
}
function achView(G) {
  const a = achievements(G);
  return `<div class="infra-grid">${a.map(([ic, n, ok]) => `<div class="card ach ${ok ? 'done' : ''}"><span class="ic">${ic}</span><div class="grow"><b>${n}</b><div class="xs ${ok ? 'ok' : 'mut'}">${ok ? 'Conquistado' : 'Pendente'}</div></div></div>`).join('')}</div>`;
}

// ============================== MUNDO ==============================
VIEWS.mundo = () => {
  const sub = S.sub.mu || 'news';
  let h = seg('mu', [['news', 'Notícias'], ['temp', 'Temporadas'], ['tec', 'Treinadores'], ['sel', 'Seleções'], ['hall', 'Hall da Fama'], ['rec', 'Linha do tempo']]);
  if (sub === 'sel') return h + natWorldView(S.G);
  const G = S.G;
  if (sub === 'news') {
    const f = S.newsF || '';
    const list = G.news.filter((n) => !f || n.cat === f || (f === 'titulo' && n.txt.includes('🏆')));
    h += `<div class="chips">${[['', 'Todas'], ['mercado', 'Mercado'], ['sel', 'Seleções'], ['tec', 'Técnicos'], ['clube', 'Clubes'], ['titulo', 'Títulos']].map(([k, l]) => `<span class="chip ${f === k ? 'on' : ''}" data-a="newsf" data-v="${k}">${l}</span>`).join('')}</div><div class="card flat"><div class="list">${list.slice(0, 80).map((n) => `<div class="li sm"><span class="xs dim" style="width:52px">${wk(n.w)}<br>${n.y}</span><span class="grow">${esc(n.txt)}</span></div>`).join('') || '<div class="empty">Nada por aqui.</div>'}</div></div>`;
  } else if (sub === 'temp') {
    const ys = Object.keys(G.hist).sort().reverse();
    h += ys.length ? ys.map((y) => { const H = G.hist[y]; return `<div class="card"><h3>Temporada ${y}</h3><div class="cols2"><div>${H.champs.filter((x) => x.kind !== 'youth' && x.kind !== 'amateur').map((x) => `<div class="kv sm"><span>🏆 ${esc(x.c)}</span><b>${esc(x.club)}</b></div>`).join('')}</div><div>${H.awards.map((a) => `<div class="aw"><b>${esc(a.lg)}</b><div class="xs">⭐ ${esc(a.best?.n || '—')} <span class="mut">${esc(a.best?.club || '')}</span> · ⚽ ${esc(a.top?.n || '—')} (${a.top?.g ?? 0}) · 🌱 ${esc(a.young?.n || '—')} · 🧑‍💼 ${esc(a.coach)}</div></div>`).join('')}</div></div></div>`; }).join('') : '<div class="empty">O histórico aparece ao final da primeira temporada.</div>';
  } else if (sub === 'tec') {
    const ks = G.coaches.filter((k) => !k.ret && k.cid >= 0 && G.clubs[k.cid].league).sort((a, b) => b.rep - a.rep).slice(0, 60);
    h += `<div class="card flat tbl-card"><table class="tb"><tr><th class="l">Técnico</th><th>Idade</th><th class="l">Clube</th><th>Estilo</th><th>Rep.</th><th>Títulos</th><th>Aprov.</th></tr>${ks.map((k) => `<tr data-a="coach" data-v="${k.id}"><td class="l"><b>${esc(k.n)}</b> ${FLAG[k.nat] || ''}${k.ex ? ' <span class="pill">ex-jogador</span>' : ''}</td><td>${k.age}</td><td class="l"><span class="row" style="gap:5px">${crest(G.clubs[k.cid], 16)}<span class="ell" style="max-width:120px">${esc(G.clubs[k.cid].name)}</span></span></td><td class="sm">${esc(k.style)}</td><td>${Math.round(k.rep)}</td><td>${k.titles.length}</td><td>${k.j ? Math.round((k.v * 3 + k.e) / (k.j * 3) * 100) + '%' : '—'}</td></tr>`).join('')}</table></div>`;
  } else if (sub === 'hall') {
    const hof = hallOfFame(G);
    h += `<div class="card flat tbl-card"><table class="tb"><tr><th>#</th><th class="l">Treinador</th><th>Títulos</th><th>Jogos</th><th>Vitórias</th><th>Pontos</th></tr>${hof.map((x, i) => `<tr class="${x.user ? 'me' : ''}"><td>${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td><td class="l"><b>${esc(x.n)}</b> ${FLAG[x.nat] || ''}${x.ret ? ' <span class="pill">aposentado</span>' : ''}</td><td>${x.titles}</td><td>${x.j}</td><td>${x.v}</td><td class="b">${Math.round(x.score)}</td></tr>`).join('')}</table><p class="xs mut" style="padding:6px">Pontos: liga nacional 10, continental 15, copa 5, divisão de acesso 4, mais experiência.</p></div>`;
  } else {
    const r = G.rec || {};
    h += `<div class="cols2"><div class="card"><h3>Recordes</h3><div class="kv"><span>⚽ Mais gols numa temporada</span><b>${r.goals ? `${esc(r.goals.n)} · ${r.goals.g} (${r.goals.y})` : '—'}</b></div><div class="kv"><span>💰 Maior transferência</span><b>${r.trans ? `${esc(r.trans.n)} · ${money(r.trans.fee)} (${r.trans.y})` : '—'}</b></div></div>
    <div class="card"><h3>Linha do tempo</h3><div class="list">${(G.timeline || []).slice().reverse().slice(0, 80).map((e) => `<div class="li sm"><span class="xs dim" style="width:40px">${e.y}</span><span class="grow">${esc(e.txt)}</span></div>`).join('') || '<div class="xs mut">Os grandes acontecimentos do futebol ficam registrados aqui.</div>'}</div></div></div>`;
  }
  return h;
};
H.newsf = (v) => { S.newsF = v; render(); };
H.coach = (v) => {
  const G = S.G, k = G.coaches[+v];
  openSheet(`<h2>${esc(k.n)} ${FLAG[k.nat] || ''}</h2><div class="xs mut">${k.age} anos · estilo ${esc(k.style)} · reputação ${Math.round(k.rep)}${k.ex ? ' · ex-jogador' : ''}</div>
  <div class="stat-grid" style="margin:10px 0"><div class="stat"><div class="v">${k.j}</div><div class="l">jogos</div></div><div class="stat"><div class="v">${k.v}-${k.e}-${k.d}</div><div class="l">V-E-D</div></div><div class="stat"><div class="v">${k.titles.length}</div><div class="l">títulos</div></div></div>
  <div class="card flat"><h3>Clubes</h3>${k.hist.slice().reverse().map((h) => `<div class="kv"><span>${esc(h.n)}</span><b>${h.y}${h.to ? '–' + h.to : '–hoje'} · ${h.j}J ${h.v}V</b></div>`).join('') || '<div class="xs mut">—</div>'}</div>
  ${k.titles.length ? `<div class="card flat"><h3>Títulos</h3>${k.titles.slice().reverse().map((t) => `<div class="kv"><span>🏆 ${esc(t.c)} (${esc(t.club)})</span><b>${t.y}</b></div>`).join('')}</div>` : ''}`);
};
