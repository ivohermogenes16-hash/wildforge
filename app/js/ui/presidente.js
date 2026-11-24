// 5.0: Painel do Presidente — administrar o clube que você é dono enquanto treina outro
import { S, H, PAGES, PAGES_T, PAGES_BACK, render, toast, openSheet, closeSheet, replaceSheet, save, starsH, clubStars } from './app.js';
import { esc, money, clamp } from '../util.js';
import { crest } from './art.js';
import { controls, inject, sellStake } from '../engine/career.js';
import { clubValuation, coachWage } from '../engine/econ.js';
import { INFRA, infraCost, canBuild, startBuild, appointAI, coachLeaves, coachOf } from '../engine/life.js';
import { weeklyWages, wageBudget } from '../engine/market.js';
import { strength, news } from '../engine/game.js';

export function ownedClubs(G) { return G.clubs.filter((c) => c.own?.user > 0 && controls(G, c)); }
const TK = { BR: 45, EN: 260, ES: 190, IT: 170, AR: 14 };

PAGES_T.presidente = 'Painel do Presidente';
PAGES.presidente = () => {
  const G = S.G; const cs = ownedClubs(G);
  if (!cs.length) return `<div class="pr-empty"><div class="pr-big">👔</div><h2>Você ainda não é presidente de nenhum clube</h2><p class="sm mut">Compre a SAF de um clube (51% das ações, ou liderando um consórcio com um fundo) ou funde o seu próprio clube. Aí você administra tudo por aqui — mesmo treinando outro time.</p><div class="row" style="gap:8px;justify-content:center"><button class="btn pri" data-a="go" data-v="meuclube">🏦 Comprar SAF / Fundar clube</button></div></div>`;
  if (!cs.some((c) => c.id === S.presCid)) S.presCid = cs[0].id;
  const c = G.clubs[S.presCid]; const f = c.fin || {}; const me = G.me;
  const coachingIt = me.job && me.job.cid === c.id && !me.job.youth; const k = coachOf(G, c);
  const inc = (f.tv || 0) + (f.tick || 0) + (f.spon || 0) + (f.prize || 0) + (f.tin || 0); const out = (f.wages || 0) + (f.staff || 0) + (f.tout || 0) + (f.infra || 0) + Math.max(0, f.other || 0);
  const ww = weeklyWages(G, c.id), wb = wageBudget(G, c); const val = clubValuation(G, c);
  const builds = G.builds.filter((b) => b.cid === c.id);
  const price = Math.round(c.price ?? TK[c.country] ?? 20);
  return `${cs.length > 1 ? `<div class="pr-sw">${cs.map((x) => `<button class="${x.id === c.id ? 'on' : ''}" data-a="prsel" data-v="${x.id}">${crest(x, 22)}<span>${esc(x.short || x.name)}</span></button>`).join('')}</div>` : ''}
  <div class="pr-hero" style="--c1:${c.c1};--c2:${c.c2}">${crest(c, 64)}<div class="grow"><small>PRESIDENTE · ${c.own.user}% DAS AÇÕES</small><h2>${esc(c.name)}</h2><div class="xs">${starsH(clubStars(c.rep))} <span class="mut">· ${esc(G.comps[c.league]?.short || (c.league === 'AMA' ? 'Várzea' : '—'))} · força ${Math.round(strength(G, c.id))}</span></div></div>
    <div class="pr-kpis"><div><small>Caixa</small><b class="${c.money < 0 ? 'bad' : 'ok'}">${money(c.money)}</b></div><div><small>Valor do clube</small><b>${money(val)}</b></div><div><small>Torcida</small><b>${Math.round(c.fans ?? 50)}%</b></div></div></div>
  <div class="pr-grid">
    <div class="card"><h3>🧑‍💼 Técnico</h3>${coachingIt ? '<div class="sm">Você mesmo é o técnico.</div>' : k ? `<div class="pr-coach"><b>${esc(k.n)}</b><span class="xs mut">${esc(k.style || '')} · reputação ${Math.round(k.rep)}</span></div>` : '<div class="sm warn">Cargo vago</div>'}
      <div class="xs mut" style="margin:4px 0 8px">Confiança da diretoria no técnico: <b>${Math.round(c.board.conf)}%</b></div>
      <div class="col" style="gap:6px">${!coachingIt ? `<button class="btn sm blk" data-a="prfire" data-v="${c.id}">${k ? '🔁 Demitir e contratar outro' : '➕ Contratar técnico'}</button>` : ''}${!coachingIt ? `<button class="btn sm blk" data-a="selfcoach" data-v="${c.id}">🙋 Eu mesmo vou treinar</button>` : ''}</div></div>
    <div class="card"><h3>💰 Finanças da temporada</h3><div class="kv"><span class="mut">Receitas</span><b class="ok">${money(inc)}</b></div><div class="kv"><span class="mut">Despesas</span><b class="bad">${money(out)}</b></div><div class="kv"><span class="b">Resultado</span><b class="${inc - out < 0 ? 'bad' : 'ok'}">${money(inc - out)}</b></div>
      <div class="kv"><span class="mut">Folha semanal</span><b>${money(ww)} / ${money(wb)}</b></div>
      <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap">${[1e6, 5e6, 20e6].map((v) => `<button class="btn sm grow" data-a="prinj" data-v="${c.id}:${v}" ${me.money < v ? 'disabled' : ''}>+ ${money(v)}</button>`).join('')}</div><div class="xs mut" style="margin-top:4px">Aporte do seu bolso (você tem ${money(me.money)}). Caixa maior = mais verba para contratar.</div></div>
    <div class="card"><h3>📊 Orçamento do futebol</h3><p class="xs mut" style="margin:0 0 6px">Quanto do caixa o técnico pode gastar em contratações nesta janela.</p>
      <div class="seg" style="margin:0">${[[0.2, 'Contido'], [0.45, 'Normal'], [0.75, 'Agressivo']].map(([v, l]) => `<button class="${(c.budPct ?? 0.45) === v ? 'on' : ''}" data-a="prbud" data-v="${c.id}:${v}">${l}</button>`).join('')}</div>
      <div class="kv" style="margin-top:6px"><span class="mut">Verba liberada</span><b>${money(Math.max(0, c.money * (c.budPct ?? 0.45)))}</b></div>
      <div class="kv"><span class="mut">Bônus de folha</span><b>${money(c.extraWB || 0)}/sem.</b></div><button class="btn sm blk" style="margin-top:6px" data-a="prwb" data-v="${c.id}">💸 Liberar +10% de folha salarial</button></div>
    <div class="card"><h3>🎟️ Ingresso</h3><div class="field"><label>Preço médio: <b id="prtkv">${money(price)}</b></label><input type="range" min="5" max="${c.country === 'BR' ? 300 : c.country === 'AR' ? 80 : 900}" value="${price}" data-in="prtk" data-cid="${c.id}"></div><div class="xs mut">Mais caro rende mais, mas a torcida reclama se o time vai mal. Estádio: ${esc(c.stad)} (${c.cap} mil).</div></div>
    <div class="card pr-wide"><h3>🏗️ Estrutura</h3>${builds.length ? builds.map((b) => `<div class="kv"><span>🏗️ ${INFRA[b.kind].n}</span><b>pronta em ${b.done - G.t} sem.</b></div>`).join('') : ''}
      <div class="pr-inf">${Object.entries(INFRA).map(([key, d]) => { const lvl = key === 'est' ? c.cap : c.infra[key] || 0; const max = d.max ?? 5; const block = canBuild(G, c, key); const cost = infraCost(c, key);
        return `<div class="pr-i"><div class="row"><b class="grow sm">${d.n}</b>${key === 'est' ? `<span class="pill">${c.cap} mil</span>` : `<span class="lvl">${'■'.repeat(lvl)}<i>${'■'.repeat(Math.max(0, max - lvl))}</i></span>`}</div>${block ? `<div class="xs warn">${esc(block)}</div>` : `<div class="row" style="gap:4px;margin-top:4px"><span class="xs grow">${money(cost)}</span><button class="btn sm pri" data-a="prbuild" data-v="${c.id}:${key}:club">Caixa</button><button class="btn sm" data-a="prbuild" data-v="${c.id}:${key}:me">Meu bolso</button></div>`}</div>`; }).join('')}</div></div>
    <div class="card"><h3>🤝 Patrocínios</h3>${(c.spons || []).length ? c.spons.map((s) => `<div class="kv"><span class="ell">${esc(s.slot)} · ${esc(s.n)}</span><b>${money(s.val)}</b></div>`).join('') : '<div class="xs mut">Sem patrocinadores no momento.</div>'}</div>
    <div class="card"><h3>📈 Ações</h3><div class="kv"><span class="mut">Suas ações</span><b>${c.own.user}%</b></div><div class="kv"><span class="mut">Valem</span><b>${money(val * c.own.user / 100)}</b></div><button class="btn sm red blk" style="margin-top:6px" data-a="prsell" data-v="${c.id}">Vender 10%</button></div>
  </div>`;
};
PAGES_BACK.presidente = null;
H.presi = () => { S.page = 'presidente'; render(); };
H.prsel = (v) => { S.presCid = +v; render(); };
H.prinj = (v) => { const [cid, a] = v.split(':').map(Number); toast(inject(S.G, cid, a)); render(); save(); };
H.prbud = (v) => { const [cid, p] = v.split(':'); S.G.clubs[+cid].budPct = +p; render(); save(); };
H.prwb = (v) => { const G = S.G; const c = G.clubs[+v]; const add = Math.round(weeklyWages(G, c.id) * 0.1); c.extraWB = (c.extraWB || 0) + add; c.board.conf = clamp(c.board.conf + 3, 0, 100); toast(`Folha salarial liberada: +${money(add)}/semana`); render(); save(); };
H.prtk = (v, el) => { const c = S.G.clubs[+el.dataset.cid]; c.price = +v; const t = document.getElementById('prtkv'); if (t) t.textContent = money(+v); save(); };
H.prbuild = (v) => { const [cid, k, payer] = v.split(':'); const r = startBuild(S.G, S.G.clubs[+cid], k, payer === 'me' ? 'me' : 'club'); toast(r.why, 3000); render(); save(); };
H.prsell = (v) => { const G = S.G; const c = G.clubs[+v]; if (S.prSellConf !== c.id) { S.prSellConf = c.id; toast('Toque de novo para confirmar a venda de 10%'); return; } S.prSellConf = null; const p = sellStake(G, c.id, 10); toast(`Você vendeu 10% por ${money(p)}`); render(); save(); };
H.prfire = (v) => {
  const G = S.G; const c = G.clubs[+v]; const k = coachOf(G, c);
  openSheet(`<h2>${k ? 'Trocar de técnico' : 'Contratar técnico'}</h2>${k ? `<p class="sm">Demitir <b>${esc(k.n)}</b> custa uma multa de <b>${money(coachWage(c.rep, c.country) * 12)}</b> ao caixa do clube.</p>` : ''}<p class="xs mut">O clube vai contratar o melhor técnico disponível para o perfil do clube.</p><div class="row" style="gap:8px"><button class="btn grow" data-a="cs">Cancelar</button><button class="btn pri grow" data-a="prfire2" data-v="${c.id}">Confirmar</button></div>`);
};
H.prfire2 = (v) => { const G = S.G; const c = G.clubs[+v]; const k = coachOf(G, c); if (k) { const fine = coachWage(c.rep, c.country) * 12; c.money -= fine; c.fin.other = (c.fin.other || 0) + fine; news(G, `❌ ${c.name} demite o técnico ${k.n}.`, 'tec'); coachLeaves(G, c, 'fired'); } const n = appointAI(G, c); closeSheet(); toast(`${n.n} é o novo técnico do ${c.name}!`); render(); save(); };
