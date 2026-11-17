import { esc, money, POS } from '../util.js';
import { crest, face, ovrBadge, FLAG } from './art.js';
import { S, H, VIEWS, render, toast, openSheet, closeSheet, replaceSheet, save, posTag, squadTable, clubOf, potRange } from './app.js';
import { myClub } from '../engine/game.js';
import { REGIONS, startScout, prospects, prospectFee, signProspect, youthMarket, youthPrice, buyYouth, releaseYouth, fundBase, ensureBase, baseBudget } from '../engine/youth.js';

VIEWS.base = () => {
  const G = S.G, c = myClub(G);
  if (!c) return '<div class="empty">Você precisa estar num clube para cuidar da base.</div>';
  ensureBase(G, c.id);
  const j = G.me.job;
  const sub = S.sub.base;
  const head = `<div class="card base-head"><div class="row" style="gap:14px;flex-wrap:wrap"><div class="grow"><div class="xs mut">Orçamento da base (temporada)</div><div class="xb" style="font-size:22px">${money(c.yb)}</div></div>
   ${G.me.scout ? `<span class="pill b">🔭 Olheiro em ${esc(REGIONS.find((r) => r.id === G.me.scout.region).name)} · ${G.me.scout.left} sem.</span>` : '<span class="pill">Nenhum olheiro viajando</span>'}
   ${!j.youth ? `<button class="btn sm" data-a="fundbase">💸 Reforçar orçamento</button>` : ''}</div></div>
  <div class="seg">${[['elenco', 'Jogadores da base'], ['olheiros', `Olheiros${prospects(G).length ? ` (${prospects(G).length})` : ''}`], ['mercado', 'Outras bases']].map(([k, l]) => `<button class="${sub === k ? 'on' : ''}" data-a="sub" data-v="base:${k}">${l}</button>`).join('')}</div>`;
  if (sub === 'elenco') {
    const ps = G.players.filter((p) => p && p.club === c.id && p.u20);
    return head + (ps.length ? squadTable(ps, { mine: true }) : '<div class="empty">Base vazia. Mande olheiros ou contrate de outras bases.</div>') + `<p class="xs mut">${j.youth ? 'Destaques podem ser indicados ao profissional pelo perfil do jogador.' : 'Promova jogadores ao profissional pelo perfil.'} Aos 21 anos o jogador deixa a base.</p>`;
  }
  if (sub === 'olheiros') {
    const ps = prospects(G);
    return head + `<div class="cols2"><div class="card flat"><h3>Enviar olheiro</h3><p class="xs mut">O olheiro viaja por algumas semanas e indica garotos de 15 a 17 anos. Cada semana custa do orçamento da base. Joias raras aparecem!</p>
    <div class="list">${REGIONS.map((r) => `<div class="li tap" data-a="scout" data-v="${r.id}"><div class="grow"><div class="b">${esc(r.name)}</div><div class="xs mut">${money(r.cost)}/semana · talento ${'★'.repeat(Math.round((r.tal - 0.9) * 30))}</div></div><span class="btn sm">Enviar</span></div>`).join('')}</div></div>
    <div class="card flat"><h3>Relatórios (${ps.length})</h3><div class="list">${ps.map((p) => `<div class="li tap" data-a="prosp" data-v="${p.id}">${face(p, 32)}<div class="grow"><div class="b ell">${esc(p.n)} ${FLAG[p.nat] || ''}</div><div class="xs mut">${p.age} anos · potencial estimado <b class="ok">${p.est - 3}–${Math.min(95, p.est + 3)}</b></div></div>${posTag(p.pos)}${ovrBadge(p.ovr)}</div>`).join('') || '<div class="empty">Nenhum relatório ainda.</div>'}</div><p class="xs mut">Relatórios somem depois de ~8 semanas.</p></div></div>`;
  }
  const f = S.yf ||= { pos: '', country: '' };
  const ps = youthMarket(G, f);
  return head + `<div class="row" style="gap:8px;margin-bottom:10px"><select data-ch="yfpos" style="width:auto"><option value="">Todas as posições</option>${POS.map((x) => `<option ${f.pos === x ? 'selected' : ''}>${x}</option>`).join('')}</select><select data-ch="yfc" style="width:auto"><option value="">Todos os países</option>${[['BR', 'Brasil'], ['AR', 'Argentina'], ['EN', 'Inglaterra'], ['ES', 'Espanha'], ['IT', 'Itália']].map(([k, l]) => `<option value="${k}" ${f.country === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <div class="card flat tbl-card"><table class="tb"><tr><th>Pos</th><th class="l">Jogador</th><th>Id</th><th>Ger</th><th>Pot</th><th class="l">Clube</th><th>Preço</th></tr>${ps.map((p) => `<tr data-a="player" data-v="${p.id}"><td>${posTag(p.pos)}</td><td class="l"><span class="row" style="gap:6px">${face(p, 22, clubOf(p))}<b class="ell" style="max-width:150px">${esc(p.n)}</b>${p.u20 ? '<span class="pill b">base</span>' : ''}</span></td><td>${p.age}</td><td>${ovrBadge(p.ovr)}</td><td class="ok b">${potRange(p)}</td><td class="l"><span class="row" style="gap:6px">${crest(clubOf(p), 18)}<span class="ell sm" style="max-width:110px">${esc(clubOf(p).name)}</span></span></td><td class="sm">${money(youthPrice(G, p))}</td></tr>`).join('')}</table></div>`;
};
H.yfpos = (v) => { S.yf.pos = v; render(); };
H.yfc = (v) => { S.yf.country = v; render(); };
H.scout = (v) => {
  const G = S.G; if (G.me.scout) { toast('Já tem um olheiro viajando'); return; }
  openSheet(`<h2>Enviar olheiro</h2><p class="sm">${esc(REGIONS.find((r) => r.id === v).name)}</p><div class="seg">${[3, 6, 10].map((w) => `<button data-a="scout2" data-v="${v}:${w}">${w} semanas</button>`).join('')}</div>`);
};
H.scout2 = (v) => { const [r, w] = v.split(':'); toast(startScout(S.G, r, +w)); closeSheet(); render(); save(); };
H.prosp = (v) => {
  const G = S.G, p = G.players[+v];
  openSheet(`<div class="row" style="gap:12px">${face(p, 72)}<div class="grow"><h2 style="margin:0">${esc(p.n)}</h2><div class="sm mut">${p.age} anos · ${FLAG[p.nat] || ''} · ${posTag(p.pos)}</div></div>${ovrBadge(p.ovr)}</div>
  <div class="card flat" style="margin-top:10px"><div class="kv"><span>Potencial (estimativa do olheiro)</span><b class="ok">${p.est - 3}–${Math.min(95, p.est + 3)}</b></div><div class="kv"><span>Luvas para assinar</span><b>${money(prospectFee(p))}</b></div><div class="kv"><span>Orçamento da base</span><b>${money(myClub(G).yb)}</b></div></div>
  <button class="btn pri blk" data-a="signp" data-v="${p.id}">✍️ Assinar com a base</button>`);
};
H.signp = (v) => { const r = signProspect(S.G, S.G.players[+v]); toast(r.why, 2800); if (r.ok) { closeSheet(); render(); save(); } };
H.ybid = (v) => {
  const G = S.G, p = G.players[+v]; const price = youthPrice(G, p);
  S.ybv = price;
  replaceSheet(`<h2>Trazer ${esc(p.n)} para a base</h2><div class="kv"><span class="mut">Clube</span><b>${esc(clubOf(p).name)}</b></div><div class="kv"><span class="mut">Orçamento da base</span><b>${money(myClub(G).yb)}</b></div>
  <div class="field" style="margin-top:10px"><label>Oferta: <b id="ybv">${money(price)}</b></label><input type="range" min="${Math.round(price * 0.5)}" max="${Math.round(price * 1.6)}" step="1000" value="${price}" data-in="ybv"></div>
  <button class="btn pri blk" data-a="ybid2" data-v="${p.id}">Enviar oferta</button>`);
};
H.ybv = (v) => { S.ybv = +v; document.getElementById('ybv').textContent = money(+v); };
H.ybid2 = (v) => { const r = buyYouth(S.G, S.G.players[+v], S.ybv); toast(r.why, 3000); if (r.ok) { closeSheet(true); render(); save(); } };
H.fundbase = () => { S.fbv = 0; openSheet(`<h2>Reforçar orçamento da base</h2><p class="sm mut">Transfere dinheiro do caixa do clube para a base.</p><div class="field"><label>Valor: <b id="fbv">${money(0)}</b></label><input type="range" min="0" max="${Math.max(0, Math.floor(myClub(S.G).money * 0.3))}" step="10000" value="0" data-in="fbv"></div><button class="btn pri blk" data-a="fundbase2">Transferir</button>`); };
H.fbv = (v) => { S.fbv = +v; document.getElementById('fbv').textContent = money(+v); };
H.fundbase2 = () => { toast(fundBase(S.G, S.fbv)); closeSheet(); render(); save(); };
H.relyouth = (v) => { releaseYouth(S.G, S.G.players[+v]); toast('Jogador dispensado da base'); closeSheet(); render(); save(); };
export { baseBudget };
