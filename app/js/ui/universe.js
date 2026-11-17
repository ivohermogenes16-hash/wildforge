// Telas do universo vivo e dos negócios
import { esc, money, clamp, POS } from '../util.js';
import { crest, face, ovrBadge } from './art.js';
import { S, H, VIEWS, render, toast, openSheet, closeSheet, replaceSheet, save, posTag, wk, shortName, squadTable } from './app.js';
import { COUNTRIES, LEAGUES } from '../data/leagues.js';
import { CONTS, CUPS } from '../engine/season.js';
import { coachOf } from '../engine/life.js';
import { coachTraits, PHIL, rivalLevel, AG_TYPES, agentOf, clubIdent, FAN_GROUPS, initFans, feds, legacyCompare, legacyScore, retireUser, dynasties } from '../engine/universe.js';
import * as B from '../engine/business.js';
import { netWorth } from '../engine/career.js';
import { clubValuation } from '../engine/econ.js';

const seg = (k, items) => `<div class="seg">${items.map(([v, l]) => `<button class="${(S.sub[k] || items[0][0]) === v ? 'on' : ''}" data-a="sub" data-v="${k}:${v}">${l}</button>`).join('')}</div>`;
const bar = (v, col) => `<div class="bar"><i style="width:${clamp(v, 2, 100)}%;${col ? `background:${col}` : ''}"></i></div>`;
const flag = (cc) => COUNTRIES[cc]?.flag || '🏳️';
const pct = (x) => `${Math.round(x)}%`;

// ============================== NEGÓCIOS ==============================
VIEWS.neg = () => {
  const G = S.G; B.initBiz(G);
  const sub = S.sub.neg || 'pat';
  let h = seg('neg', [['pat', 'Patrimônio'], ['emp', `Minhas empresas (${B.myCos(G).length})`], ['mer', 'Mercado de marcas'], ['spo', 'Patrocínios'], ['grp', 'Grupo de clubes']]);
  if (sub === 'pat') h += patView(G); else if (sub === 'emp') h += empView(G); else if (sub === 'mer') h += mktView(G); else if (sub === 'spo') h += spoView(G); else h += grpView(G);
  return h;
};
function patView(G) {
  const me = G.me, inv = me.inv; const cos = B.myCos(G);
  const coVal = cos.reduce((s, c) => s + B.coValuation(G, c) * c.sh / 100, 0);
  const clubs = B.groupClubs(G); const clVal = clubs.reduce((s, c) => s + clubValuation(G, c) * c.own.user / 100, 0);
  const tot = netWorth(G);
  const parts = [['💵 Conta', me.money], ['🏦 Investimentos', inv.cdi + inv.acoes + inv.imoveis * (inv.imovelVal || 0)], ['🏢 Empresas', coVal], ['🏟️ Clubes', clVal]];
  const inc = (me.job ? me.job.wage : 0) + (me.nat ? me.nat.wage : 0);
  return `<div class="cols2"><div><div class="card hero-card"><div class="xs mut">Patrimônio total</div><div class="xb" style="font-size:26px">${money(tot)}</div>
    ${parts.map(([l, v]) => `<div class="kv"><span>${l}</span><b>${money(v)}</b></div><div>${bar(tot > 0 ? v / tot * 100 : 0)}</div>`).join('')}</div>
    <div class="card flat"><h3>Renda pessoal</h3><div class="kv"><span>Salários (bruto)</span><b>${money(inc)}/sem.</b></div><div class="kv"><span>Custo de vida</span><b class="bad">−${money(350)}/sem.</b></div>
    <div class="kv"><span>Situação</span><b>${me.retired ? `Aposentado desde ${me.retired}` : me.job ? 'Treinador em atividade' : 'Desempregado'}</b></div>
    <button class="btn sm blk" data-a="go" data-v="financas">Investimentos (CDI, ações, imóveis) ›</button></div></div>
    <div><div class="card flat"><h3>Participações</h3>${cos.map((c) => `<div class="li tap" data-a="coopen" data-v="${c.id}"><span class="grow"><b>${esc(c.n)}</b> <span class="xs mut">${B.SEGS[c.seg].n} · ${c.sh}%</span></span><b>${money(B.coValuation(G, c) * c.sh / 100)}</b></div>`).join('')}
    ${clubs.map((c) => `<div class="li">${crest(c, 22)}<span class="grow"><b>${esc(c.name)}</b> <span class="xs mut">${c.own.user}% das ações</span></span><b>${money(clubValuation(G, c) * c.own.user / 100)}</b></div>`).join('')}
    ${!cos.length && !clubs.length ? '<div class="empty">Nenhum negócio ainda. Comece fundando uma marca pequena ou comprando parte de uma empresa.</div>' : ''}</div></div></div>`;
}
function coCard(G, c, mine) {
  const h = c.hist.slice(-23); const mx = Math.max(1, ...h.map((x) => Math.abs(x.rev)));
  const spark = h.length > 1 ? `<svg viewBox="0 0 100 30" preserveAspectRatio="none" style="width:100%;height:34px"><polyline fill="none" stroke="#2fe08a" stroke-width="1.5" points="${h.map((x, i) => `${i / (h.length - 1) * 100},${30 - x.rev / mx * 28}`).join(' ')}"/><polyline fill="none" stroke="#f4c542" stroke-width="1" points="${h.map((x, i) => `${i / (h.length - 1) * 100},${30 - Math.max(0, x.prof) / mx * 28}`).join(' ')}"/></svg>` : '';
  return `<div class="card ${mine ? '' : 'flat'}" data-a="coopen" data-v="${c.id}"><h3><span>${esc(c.n)}</span><span class="pill">${B.SEGS[c.seg].n}</span></h3>
  <div class="train-kpi"><div><b>${money(c.rev * 46)}</b><span>Receita/ano</span></div><div><b class="${c.prof >= 0 ? 'ok' : 'bad'}">${money(c.prof * 46)}</b><span>Lucro/ano</span></div><div><b>${Math.round(c.rep)}</b><span>Reputação</span></div><div><b>${money(B.coValuation(G, c))}</b><span>Valor</span></div></div>${spark}
  <div class="xs mut">${c.emp} funcionários · ${c.cc.map(flag).join('')} · ${B.contractsOf(G, c).length} contratos de patrocínio${c.sh ? ` · você tem ${c.sh}%` : ''}</div></div>`;
}
function empView(G) {
  const cos = B.myCos(G);
  return `${cos.map((c) => coCard(G, c, true)).join('') || '<div class="empty">Você ainda não tem empresas.</div>'}
  <div class="card"><h3>Fundar uma marca</h3><p class="xs mut">A empresa começa pequena (reputação baixa, poucos funcionários) e precisa de investimento para crescer. Investimento mínimo ${money(B.FOUND_MIN)}, saindo do seu dinheiro pessoal.</p><button class="btn pri blk" data-a="cofound">✨ Fundar empresa</button></div>`;
}
H.cofound = () => { S.cf = { n: '', seg: 'mat', inv: 300000, home: 'BR', ident: 'Moderna e jovem', goal: 'Vestir grandes clubes' }; openSheet(foundHtml()); };
function foundHtml() {
  const f = S.cf;
  return `<h2>Nova empresa</h2><div class="field"><label>Nome</label><input id="cfn" value="${esc(f.n)}" maxlength="28" placeholder="Ex.: Ivo Sports"></div>
  <div class="field"><label>Segmento</label><select data-ch="cfseg">${Object.entries(B.SEGS).map(([k, s]) => `<option value="${k}" ${f.seg === k ? 'selected' : ''}>${s.n} (mercado ${money(s.mkt)}/ano)</option>`).join('')}</select></div>
  <div class="field"><label>País-sede</label><select data-ch="cfhome">${Object.keys(B.MKT_W).map((k) => `<option value="${k}" ${f.home === k ? 'selected' : ''}>${flag(k)} ${COUNTRIES[k]?.name || k}</option>`).join('')}</select></div>
  <div class="field"><label>Identidade comercial</label><select data-ch="cfident">${['Moderna e jovem', 'Tradicional e confiável', 'Premium', 'Popular e barata', 'Tecnológica'].map((x) => `<option ${f.ident === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
  <div class="field"><label>Objetivo da marca</label><select data-ch="cfgoal">${['Vestir grandes clubes', 'Dominar o mercado nacional', 'Crescer no exterior', 'Lucro rápido'].map((x) => `<option ${f.goal === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
  <div class="field"><label>Investimento inicial: <b id="cfi">${money(f.inv)}</b></label><input type="range" min="${B.FOUND_MIN}" max="${Math.max(B.FOUND_MIN, Math.floor(S.G.me.money / 10000) * 10000)}" step="10000" value="${f.inv}" data-in="cfi"></div>
  <button class="btn pri blk" data-a="cofound2">Fundar</button>`;
}
H.cfseg = (v) => { S.cf.seg = v; }; H.cfhome = (v) => { S.cf.home = v; }; H.cfident = (v) => { S.cf.ident = v; }; H.cfgoal = (v) => { S.cf.goal = v; };
H.cfi = (v) => { S.cf.inv = +v; document.getElementById('cfi').textContent = money(+v); };
H.cofound2 = () => { S.cf.n = document.getElementById('cfn').value.trim(); const r = B.foundCompany(S.G, S.cf); toast(r.ok ? `🏢 ${r.co.n} fundada!` : r.why, 3000); if (r.ok) { closeSheet(); S.sub.neg = 'emp'; render(); save(); } };
H.coopen = (v) => { S.coId = +v; openSheet(coSheet()); };
function coSheet() {
  const G = S.G; const c = B.coById(G, S.coId); const mine = c.user && c.sh >= 51;
  const ctr = B.contractsOf(G, c);
  let h = `<h2>${esc(c.n)}</h2><div class="xs mut">${B.SEGS[c.seg].n} · fundada em ${c.founded}${c.ident ? ` · ${esc(c.ident)}` : ''}${c.goal ? ` · objetivo: ${esc(c.goal)}` : ''}</div>
  ${coCard(G, c, true)}
  <div class="card flat"><h3>Finanças (por semana)</h3><div class="kv"><span>Receita</span><b class="ok">${money(c.rev)}</b></div><div class="kv"><span>Despesas</span><b class="bad">${money(c.exp)}</b></div><div class="kv"><span>Lucro / prejuízo</span><b class="${c.prof >= 0 ? 'ok' : 'bad'}">${money(c.prof)}</b></div>
  <div class="kv"><span>Caixa</span><b>${money(c.cash)}</b></div><div class="kv"><span>Dívida</span><b class="${c.debt ? 'bad' : ''}">${money(c.debt)}</b></div><div class="kv"><span>Capacidade de produção</span><b>${money(B.capacity(c))}/sem.${c.rev >= B.capacity(c) * 0.98 ? ' ⚠️ no limite' : ''}</b></div>
  <div class="kv"><span>Folha</span><b>${money(c.emp * B.empWage(c))}/sem.</b></div><div class="kv"><span>Produtos</span><b>${c.prods}${c.proj ? ` (+1 em ${c.proj.left} sem.)` : ''}</b></div></div>
  <div class="card flat"><h3>Departamentos</h3>${Object.entries(B.DEPTS).map(([k, l]) => `<div class="li"><span class="grow">${l} <span class="xs mut">nível ${c.d[k]}</span></span>${mine ? `<button class="btn sm" data-a="coact" data-v="dept:${k}">Investir ${money(120000 * Math.pow(2.2, c.d[k] - 1))}</button>` : ''}</div>`).join('')}</div>
  <div class="card flat"><h3>Contratos de patrocínio (${ctr.length})</h3>${ctr.slice(0, 30).map(({ c: cl, s }) => `<div class="li sm">${crest(cl, 20)}<span class="grow">${esc(cl.name)} <span class="xs mut">${B.SLOTS[s.slot]?.n || s.slot}</span></span><b>${money(s.val)}/ano até ${s.until}</b></div>`).join('') || '<div class="xs mut">Nenhum.</div>'}</div>`;
  if (mine) h += `<div class="card"><h3>Administrar</h3><div class="row" style="flex-wrap:wrap;gap:6px">
    <button class="btn sm" data-a="coact" data-v="hire:5">+5 funcionários</button><button class="btn sm" data-a="coact" data-v="hire:25">+25</button><button class="btn sm red" data-a="coact" data-v="fire:5">Demitir 5</button>
    <button class="btn sm" data-a="coact" data-v="ads:100000">Publicidade ${money(100000)}</button><button class="btn sm" data-a="coact" data-v="ads:1000000">Campanha ${money(1000000)}</button>
    <button class="btn sm" data-a="coact" data-v="prod:">Desenvolver produto (${money(250000 * c.prods)})</button></div>
    <div class="field" style="margin-top:8px"><label>Expandir para outro país (${money(400000 + c.cc.length * 350000)})</label><select data-ch="coexp"><option value="">Escolha…</option>${Object.keys(B.MKT_W).filter((k) => !c.cc.includes(k)).map((k) => `<option value="${k}">${flag(k)} ${COUNTRIES[k]?.name || k} (mercado ${Math.round(B.MKT_W[k] * 100)}%)</option>`).join('')}</select></div>
    <div class="row" style="gap:6px"><button class="btn sm grow" data-a="cocash" data-v="200000">Aportar ${money(200000)}</button><button class="btn sm grow" data-a="cocash" data-v="1000000">Aportar ${money(1000000)}</button><button class="btn sm grow pri" data-a="cocash" data-v="-div">Retirar dividendos</button></div>
    <button class="btn sm blk" style="margin-top:6px" data-a="spoNew" data-v="${c.id}">🤝 Negociar patrocínio com um clube</button></div>`;
  h += `<div class="card flat"><h3>Participação</h3><div class="kv"><span>Valor de mercado</span><b>${money(B.coValuation(G, c))}</b></div><div class="kv"><span>Sua parte</span><b>${c.sh}%</b></div><div class="row" style="gap:6px;flex-wrap:wrap">
    ${c.sh < 100 && !c.dead ? `<button class="btn sm grow" data-a="cobuy" data-v="25">Comprar 25%</button><button class="btn sm grow pri" data-a="cobuy" data-v="${Math.max(51 - c.sh, 1)}">Comprar o controle</button><button class="btn sm grow" data-a="cobuy" data-v="${100 - c.sh}">Comprar tudo</button>` : ''}
    ${c.sh > 0 ? `<button class="btn sm grow red" data-a="cosell" data-v="${Math.min(25, c.sh)}">Vender ${Math.min(25, c.sh)}%</button><button class="btn sm grow red" data-a="cosell" data-v="${c.sh}">Vender tudo</button>` : ''}</div>
    <p class="xs mut">O valor considera receita, lucro, crescimento, caixa, dívidas, contratos e reputação.</p></div>`;
  return h;
}
const coAgain = (r) => { toast(r, 3000); replaceSheet(coSheet()); render(); save(); };
H.coact = (v) => { const [a, ...x] = v.split(':'); coAgain(B.coAction(S.G, B.coById(S.G, S.coId), a, x.join(':'))); };
H.coexp = (v) => { if (v) coAgain(B.coAction(S.G, B.coById(S.G, S.coId), 'country', v)); };
H.cocash = (v) => { const c = B.coById(S.G, S.coId); coAgain(B.moveCash(S.G, c, v === '-div' ? -Math.floor(Math.max(0, c.cash * 0.5) / 1000) * 1000 : +v)); };
H.cobuy = (v) => coAgain(B.buyStake(S.G, B.coById(S.G, S.coId), +v));
H.cosell = (v) => coAgain(B.sellStake(S.G, B.coById(S.G, S.coId), +v));
function mktView(G) {
  const f = S.cof || '';
  const cos = G.biz.cos.filter((c) => !c.dead && (!f || c.seg === f)).sort((a, b) => B.coValuation(G, b) - B.coValuation(G, a));
  return `<div class="chips"><span class="chip ${!f ? 'on' : ''}" data-a="cof" data-v="">Todas</span>${Object.entries(B.SEGS).map(([k, s]) => `<span class="chip ${f === k ? 'on' : ''}" data-a="cof" data-v="${k}">${s.n}</span>`).join('')}</div>
  <div class="card flat tbl-card"><table class="tb"><tr><th class="l">Empresa</th><th>Segmento</th><th>Rep.</th><th>Receita/ano</th><th>Lucro/ano</th><th>Func.</th><th>Contratos</th><th>Valor</th></tr>${cos.map((c) => `<tr data-a="coopen" data-v="${c.id}" class="${c.sh ? 'me' : ''}"><td class="l"><b>${esc(c.n)}</b> <span class="xs">${c.cc.slice(0, 4).map(flag).join('')}</span></td><td class="sm">${B.SEGS[c.seg].n}</td><td>${Math.round(c.rep)}</td><td class="sm">${money(c.rev * 46)}</td><td class="sm ${c.prof >= 0 ? 'ok' : 'bad'}">${money(c.prof * 46)}</td><td>${c.emp}</td><td>${B.contractsOf(G, c).length}</td><td class="sm">${money(B.coValuation(G, c))}</td></tr>`).join('')}</table></div>
  <div class="card flat"><h3>Movimentos do mercado</h3>${G.news.filter((n) => n.cat === 'neg').slice(0, 12).map((n) => `<div class="li sm"><span class="xs dim">${n.y}</span><span class="grow">${esc(n.txt)}</span></div>`).join('') || '<div class="xs mut">Nada ainda.</div>'}</div>`;
}
H.cof = (v) => { S.cof = v; render(); };
function spoView(G) {
  const mine = B.myCos(G).filter((c) => c.sh >= 51);
  const rows = []; for (const co of mine) for (const x of B.contractsOf(G, co)) rows.push({ co, ...x });
  return `<div class="card"><h3>Seus contratos</h3>${rows.map(({ co, c, s }) => `<div class="li">${crest(c, 24)}<div class="grow"><b>${esc(c.name)}</b><div class="xs mut">${esc(co.n)} · ${B.SLOTS[s.slot]?.n || s.slot} · visibilidade ${Math.round(B.clubVis(G, c))}</div></div><b>${money(s.val)}/ano<div class="xs mut">até ${s.until}${s.bonus ? ` · bônus título ${money(s.bonus)}` : ''}</div></b><button class="btn sm" data-a="spoRenew" data-v="${co.id}:${c.id}:${s.slot}">Renovar</button></div>`).join('') || '<div class="xs mut">Nenhum contrato. Patrocinar dá visibilidade (e reputação) à marca — não lucro automático. Clubes vitoriosos, em competições continentais e com torcida grande expõem mais.</div>'}
  ${mine.length ? `<button class="btn pri blk" data-a="spoNew" data-v="${mine[0].id}">🤝 Novo patrocínio</button>` : '<p class="xs mut">Você precisa controlar uma empresa (51%+) para negociar.</p>'}</div>`;
}
H.spoNew = (v) => { S.sp = { co: +v, q: '', cid: null, slot: 'Master', val: 0, years: 2, bonus: 0 }; closeSheet(true); openSheet(spoHtml()); };
H.spoRenew = (v) => { const [co, cid, slot] = v.split(':'); const c = S.G.clubs[+cid]; S.sp = { co: +co, q: c.name, cid: +cid, slot, val: B.sponsorAsk(S.G, c, slot), years: 2, bonus: 0 }; openSheet(spoHtml()); };
function spoHtml() {
  const G = S.G, sp = S.sp; const mine = B.myCos(G).filter((c) => c.sh >= 51);
  const q = sp.q.toLowerCase(); const list = q.length >= 2 ? G.clubs.filter((c) => c.league && c.name.toLowerCase().includes(q)).slice(0, 8) : [];
  const c = sp.cid != null ? G.clubs[sp.cid] : null; const ask = c ? B.sponsorAsk(G, c, sp.slot) : 0; if (c && !sp.val) sp.val = ask;
  const cur = c?.spons?.find((x) => x.slot === sp.slot);
  return `<h2>Negociar patrocínio</h2><div class="field"><label>Empresa</label><select data-ch="spco">${mine.map((x) => `<option value="${x.id}" ${sp.co === x.id ? 'selected' : ''}>${esc(x.n)} (rep. ${Math.round(x.rep)}, caixa ${money(x.cash)})</option>`).join('')}</select></div>
  <div class="field"><label>Clube</label><input id="spq" value="${esc(sp.q)}" placeholder="Digite o nome do clube" data-in="spq"></div>
  <div class="list" id="spl">${list.map((x) => `<div class="li tap" data-a="spcl" data-v="${x.id}">${crest(x, 22)}<span class="grow">${esc(x.name)} <span class="xs mut">${G.comps[x.league]?.short || ''} · rep ${x.rep}</span></span></div>`).join('')}</div>
  ${c ? `<div class="card flat"><div class="row" style="gap:8px">${crest(c, 32)}<div class="grow"><b>${esc(c.name)}</b><div class="xs mut">visibilidade ${Math.round(B.clubVis(G, c))} · torcida ${Math.round(c.fans ?? 50)}% · ${c.money < 0 ? 'endividado' : 'finanças ok'}</div></div></div>
    <div class="field"><label>Tipo de contrato</label><select data-ch="spslot">${Object.entries(B.SLOTS).map(([k, s]) => `<option value="${k}" ${sp.slot === k ? 'selected' : ''}>${s.n}</option>`).join('')}</select></div>
    <div class="kv"><span>Atual</span><b>${cur ? `${esc(cur.n)} · ${money(cur.val)}/ano até ${cur.until}` : 'vago'}</b></div><div class="kv"><span>O clube pede</span><b>~${money(ask)}/ano</b></div><div class="kv"><span>Reputação mínima</span><b>${Math.round(c.rep * 0.45)}</b></div>
    <div class="field"><label>Valor anual: <b id="spv">${money(sp.val)}</b></label><input type="range" min="${Math.round(ask * 0.5)}" max="${Math.round(ask * 1.8)}" step="${Math.max(1000, Math.round(ask / 100))}" value="${sp.val}" data-in="spv"></div>
    <div class="field"><label>Duração</label><div class="seg" style="margin:0">${[1, 2, 3, 4, 5].map((y) => `<button class="${sp.years === y ? 'on' : ''}" data-a="spy" data-v="${y}">${y} ano${y > 1 ? 's' : ''}</button>`).join('')}</div></div>
    <div class="field"><label>Bônus por título: <b id="spb">${money(sp.bonus)}</b></label><input type="range" min="0" max="${Math.round(ask * 0.5)}" step="${Math.max(1000, Math.round(ask / 100))}" value="${sp.bonus}" data-in="spb"></div>
    <button class="btn pri blk" data-a="spgo">Enviar proposta</button>` : ''}`;
}
H.spco = (v) => { S.sp.co = +v; }; H.spq = (v) => { S.sp.q = v; const el = document.getElementById('spl'); if (el) { const tmp = document.createElement('div'); tmp.innerHTML = spoHtml(); el.innerHTML = tmp.querySelector('#spl').innerHTML; } };
H.spcl = (v) => { S.sp.cid = +v; S.sp.q = S.G.clubs[+v].name; S.sp.val = 0; replaceSheet(spoHtml()); };
H.spslot = (v) => { S.sp.slot = v; S.sp.val = 0; replaceSheet(spoHtml()); };
H.spv = (v) => { S.sp.val = +v; document.getElementById('spv').textContent = money(+v); };
H.spb = (v) => { S.sp.bonus = +v; document.getElementById('spb').textContent = money(+v); };
H.spy = (v) => { S.sp.years = +v; replaceSheet(spoHtml()); };
H.spgo = () => { const G = S.G, sp = S.sp; const r = B.sponsorOffer(G, B.coById(G, sp.co), G.clubs[sp.cid], sp.slot, sp.val, sp.years, sp.bonus); toast(r.why, 3500); if (r.ok) { closeSheet(true); S.tab = 'neg'; S.sub.neg = 'spo'; render(); save(); } };
function grpView(G) {
  const cl = B.groupClubs(G);
  if (!cl.length) return '<div class="empty">Você não tem participação em clubes. Compre ações de uma SAF ou funde um clube em Carreira › Clube próprio.</div>';
  return `<div class="hint">Cada clube mantém identidade, finanças e diretoria próprias. Regra de multipropriedade: você não pode controlar dois clubes na mesma liga, e só um clube controlado por você disputa cada competição continental.</div>
  ${cl.map((c) => { const ctrl = c.own.user >= 51 || c.ctrl; return `<div class="card"><h3><span>${crest(c, 20)} ${esc(c.name)}</span><span class="pill ${ctrl ? 'g' : ''}">${c.own.user}% ${ctrl ? '· controle' : ''}</span></h3>
    <div class="train-kpi"><div><b>${money(clubValuation(G, c))}</b><span>Valor</span></div><div><b class="${c.money < 0 ? 'bad' : ''}">${money(c.money)}</b><span>Caixa</span></div><div><b>${G.comps[c.league]?.short || '—'}</b><span>Liga</span></div><div><b>${Math.round(c.board.conf)}%</b><span>Diretoria</span></div></div>
    ${ctrl ? `<div class="field" style="margin-top:6px"><label>Estratégia do clube</label><div class="seg" style="margin:0">${Object.entries(B.STRATS).map(([k, l]) => `<button class="${(c.strat || 'equilibrio') === k ? 'on' : ''}" data-a="gstrat" data-v="${c.id}:${k}">${l}</button>`).join('')}</div></div>
    <div class="kv"><span>Administrador</span><b>${c.adm ? `${esc(c.adm.n)} (nível ${c.adm.q}, ${money(c.adm.wage)}/sem.)` : '—'}</b></div>
    <div class="row" style="gap:6px">${[4, 8, 12].map((q) => `<button class="btn sm grow" data-a="gadm" data-v="${c.id}:${q}">Contratar adm. nível ${q}</button>`).join('')}</div>
    <button class="btn sm blk" style="margin-top:6px" data-a="gmove" data-v="${c.id}">🔀 Transferir jogador dentro do grupo</button>` : '<p class="xs mut">Sem controle: você só recebe dividendos e acompanha.</p>'}</div>`; }).join('')}`;
}
H.gstrat = (v) => { const [id, k] = v.split(':'); S.G.clubs[+id].strat = k; toast(`Estratégia: ${B.STRATS[k]}`); render(); save(); };
H.gadm = (v) => { const [id, q] = v.split(':').map(Number); toast(B.hireAdmin(S.G, S.G.clubs[id], q), 3000); render(); save(); };
H.gmove = (v) => {
  const G = S.G; const c = G.clubs[+v]; const others = B.groupClubs(G).filter((x) => x.id !== c.id);
  if (!others.length) { toast('Você precisa de outro clube no grupo.'); return; }
  const ps = G.players.filter((p) => p && p.club === c.id && !p.u20).sort((a, b) => b.ovr - a.ovr);
  openSheet(`<h2>Transferência interna</h2><p class="xs mut">Do ${esc(c.name)} para outro clube do grupo, pelo valor de mercado.</p><div class="list">${ps.map((p) => `<div class="li">${posTag(p.pos)}<span class="grow b">${esc(p.n)}</span>${ovrBadge(p.ovr)}${others.map((o) => `<button class="btn sm" data-a="gmove2" data-v="${p.id}:${o.id}">→ ${esc(o.short)}</button>`).join('')}</div>`).join('')}</div>`);
};
H.gmove2 = (v) => { const [pid, to] = v.split(':').map(Number); const p = S.G.players[pid]; toast(B.groupTransfer(S.G, p, to, Math.round(playerVal(p) / 1000) * 1000), 3000); closeSheet(); render(); save(); };
import { playerValue as playerVal } from '../engine/econ.js';

// ============================== MUNDO: rivalidades, federações, bastidores, história ==============================
export function rivalView(G) {
  const rs = Object.entries(G.uv?.riv || {}).filter(([, r]) => r.pts > 0).sort((a, b) => b[1].pts - a[1].pts);
  const ks = G.coaches.filter((k) => !k.ret && k.cid >= 0 && G.clubs[k.cid].league).sort((a, b) => b.rep - a.rep).slice(0, 40).map(coachTraits);
  return `<div class="cols2"><div class="card"><h3>Suas rivalidades</h3>${rs.map(([id, r]) => { const k = G.coaches[id]; const lv = rivalLevel(G, +id); return `<div class="li tap" data-a="coach" data-v="${id}"><span class="grow"><b>${esc(k.n)}</b> <span class="xs mut">${k.cid >= 0 ? esc(G.clubs[k.cid].name) : 'sem clube'}</span><div class="xs mut">${esc(r.why[0] || '')}</div></span><span class="pill ${lv === 2 ? 'r' : lv ? 'y' : ''}">${lv === 2 ? '🔥 Grande rival' : lv ? '⚔️ Rival' : `${r.pts} pts`}</span></div>`; }).join('') || '<div class="xs mut">Nenhuma ainda. Rivalidades surgem de clássicos, disputas de título, mata-matas, goleadas, provocações e brigas por jogadores.</div>'}</div>
  <div class="card flat tbl-card"><h3 style="padding:6px">Técnicos: perfil</h3><table class="tb"><tr><th class="l">Técnico</th><th class="l">Clube</th><th class="l">Filosofia</th><th class="l">Perfil</th><th>Rep</th></tr>${ks.map((k) => `<tr data-a="coach" data-v="${k.id}"><td class="l"><b>${esc(k.n)}</b></td><td class="l sm ell" style="max-width:110px">${esc(G.clubs[k.cid].name)}</td><td class="l sm">${esc(k.style)}</td><td class="l sm">${esc(k.trait)}</td><td>${Math.round(k.rep)}</td></tr>`).join('')}</table></div></div>`;
}
export function fedView(G) {
  const fs = feds();
  const regs = G.uv?.regs || {};
  return `<div class="cols2"><div><div class="card"><h3>Regulamentos em vigor</h3><div class="kv"><span>Fair play financeiro</span><b>${regs.ffp ? '✅ ativo (caixa negativo não contrata)' : '—'}</b></div><div class="kv"><span>Premiação continental</span><b>${regs.contMul || 1}x</b></div>
  <div class="kv"><span>Vagas extras por coeficiente</span><b>${Object.entries(regs.slots || {}).map(([c, o]) => Object.entries(o).map(([lg, n]) => `${c}: ${lg} +${n}`).join(', ')).filter(Boolean).join('; ') || '—'}</b></div>
  <div class="list" style="margin-top:6px">${(regs.log || []).map((l) => `<div class="li sm">${esc(l)}</div>`).join('') || '<div class="xs mut">Mudanças de regulamento aparecem aqui ao longo das temporadas.</div>'}</div></div>
  <div class="card flat"><h3>Competições continentais</h3>${CONTS.map((c) => `<div class="kv sm"><span><b>${esc(c.name)}</b> · ${c.org}</span><b>${c.slots.map(([lg, n]) => `${LEAGUES.find((l) => l.id === lg)?.short || lg} ${n + (regs.slots?.[c.id]?.[lg] || 0)}`).join(' · ')}</b></div>`).join('')}<p class="xs mut">16 clubes por competição (fase de grupos + mata-mata), adaptado do formato real. Campeões de copa nacional também se classificam.</p></div></div>
  <div><div class="card flat tbl-card"><h3 style="padding:6px">Federações e ligas</h3><table class="tb"><tr><th class="l">País</th><th>Federação</th><th>Conf.</th><th class="l">Divisões no jogo</th></tr>${fs.map((f) => `<tr><td class="l">${f.flag} ${esc(f.name)}</td><td class="sm">${esc(f.fed)}</td><td class="sm">${esc(f.conf)}</td><td class="l sm">${LEAGUES.filter((l) => l.country === f.code).map((l) => `${esc(l.short)} (${l.org || f.fed}; ${l.down ? `↓${l.down}` : 'sem rebaixamento no jogo'}${l.po ? ' + repescagem' : ''})`).join(', ')}</td></tr>`).join('')}</table></div>
  <div class="card flat"><h3>Copas nacionais</h3>${CUPS.map((c) => `<div class="kv sm"><span>${esc(c.name)}</span><b>${c.from.map((x) => LEAGUES.find((l) => l.id === x)?.short || x).join(', ')}</b></div>`).join('')}</div></div></div>`;
}
export function backView(G) {
  const ag = (G.uv?.agents || []).slice().sort((a, b) => b.inf - a.inf);
  return `<div class="cols2"><div class="card flat"><h3>Bastidores</h3>${G.news.filter((n) => n.cat === 'bast' || n.cat === 'torcida' || n.cat === 'clube' || /rumor|sigilo|empresário/i.test(n.txt)).slice(0, 30).map((n) => `<div class="li sm"><span class="xs dim" style="width:46px">${n.y} S${n.w + 1}</span><span class="grow">${esc(n.txt)}</span></div>`).join('') || '<div class="xs mut">Nada por enquanto.</div>'}</div>
  <div class="card flat tbl-card"><h3 style="padding:6px">Empresários</h3><table class="tb"><tr><th class="l">Agente</th><th class="l">Perfil</th><th>Influência</th><th>Conflitos</th></tr>${ag.map((a) => `<tr><td class="l"><b>${esc(a.n)}</b></td><td class="l sm">${esc(a.t)} <span class="xs mut">— ${AG_TYPES[a.t]}</span></td><td>${a.inf}</td><td>${a.conf}</td></tr>`).join('')}</table></div></div>`;
}
export function historyExtra(G) {
  const dy = dynasties(G); const ys = Object.keys(G.hist).filter((y) => G.hist[y].pow).sort().reverse().slice(0, 6);
  const stars = G.players.filter((p) => p && p.star).sort((a, b) => b.ovr - a.ovr).slice(0, 12);
  return `<div class="card flat"><h3>Dinastias</h3>${dy.map((d) => `<div class="kv sm"><span>${esc(d.club)} · ${esc(d.c)}</span><b>${d.n} títulos</b></div>`).join('') || '<div class="xs mut">Ainda sem clubes com 2+ títulos da mesma competição no jogo.</div>'}</div>
  <div class="card flat"><h3>Jogadores que marcaram época</h3>${stars.map((p) => `<div class="li sm tap" data-a="player" data-v="${p.id}"><span class="grow"><b>${esc(p.n)}</b> <span class="xs mut">estrela desde ${p.star}</span></span>${ovrBadge(p.ovr)}</div>`).join('') || '<div class="xs mut">—</div>'}</div>
  <div class="card flat"><h3>Força dos clubes por temporada</h3>${ys.map((y) => `<div class="kv sm"><span>${y}</span><b>${G.hist[y].pow.slice(0, 5).map(([id, r]) => `${esc(G.clubs[id].short || G.clubs[id].name)} ${r}`).join(' · ')}</b></div>`).join('') || '<div class="xs mut">Registrado ao fim de cada temporada.</div>'}</div>`;
}

// ============================== CLUBE: identidade, torcida, academias ==============================
export function identFansView(G, c) {
  const id = clubIdent(G, c); const g = initFans(c);
  return `<div class="cols2"><div class="card"><h3>Identidade do ${esc(c.name)}</h3><div class="kv"><span>Filosofia</span><b>${id.phil}</b></div><div class="kv"><span>Tradição</span><b>${'★'.repeat(id.trad)}${'☆'.repeat(5 - id.trad)}</b></div><div class="kv"><span>Torcida estimada</span><b>${(id.fanK / 1e6).toFixed(1)} mi</b></div>
  <div class="kv"><span>Expectativa</span><b>${id.expect}</b></div><div class="kv"><span>Importância</span><b>${id.reg}</b></div><div class="kv"><span>Situação financeira</span><b>${id.fin}</b></div><div class="kv"><span>Administração</span><b>${esc(id.admin)} · pres. ${esc(id.pres)}</b></div>${c.board.dir ? `<div class="kv"><span>Dirigente ídolo</span><b>${esc(c.board.dir)}</b></div>` : ''}
  <div class="kv"><span>Títulos</span><b>${(c.troph || []).length}</b></div></div>
  <div class="card"><h3>Torcida</h3>${Object.entries(FAN_GROUPS).map(([k, l]) => `<div style="margin-bottom:6px"><div class="row xs"><span class="grow">${l}</span><b>${pct(g[k])}</b></div>${bar(g[k], g[k] < 30 ? '#ff5a5f' : g[k] < 50 ? '#f4c542' : null)}</div>`).join('')}
  <p class="xs mut">Organizadas reagem a resultados e clássicos; sócios, às finanças e títulos; a torcida das redes, a contratações e jovens. Cada grupo protesta ou apoia por conta própria.</p>
  <div class="kv"><span>Seu status com a torcida</span><b>${(G.me.idol?.[c.id] || 0) >= 2 ? '👑 Ídolo' : (G.me.idol?.[c.id] || 0) === 1 ? '🏆 Campeão pelo clube' : c.grudge ? '💔 Mágoa antiga' : '—'}</b></div>
  ${G.players.filter((p) => p && p.idol === c.id).slice(0, 6).map((p) => `<div class="li sm">🎖️ <span class="grow">${esc(p.n)}</span><span class="xs mut">ídolo</span></div>`).join('')}</div></div>`;
}
export function acadView(G, c) {
  const A = c.acad || [];
  return `<div class="card"><h3>Rede de formação</h3>${A.map((a) => `<div class="li"><span class="grow"><b>${B.ACAD[a.t].n}</b>${a.r != null ? ` <span class="xs mut">${B.ACAD[a.t].partner ? esc(G.clubs[a.r].name) : COUNTRIES[a.r]?.name || a.r}</span>` : ''}<div class="xs mut">${B.ACAD[a.t].d}</div></span><span class="xs">${money(B.ACAD[a.t].wk)}/sem.</span></div>`).join('') || '<div class="xs mut">Nenhuma estrutura além da base do clube.</div>'}</div>
  <div class="card flat"><h3>Construir</h3>${Object.entries(B.ACAD).map(([k, a]) => `<div class="li"><div class="grow"><b>${a.n}</b><div class="xs mut">${a.d} Custo ${money(a.cost)} + ${money(a.wk)}/sem.</div></div>${a.region ? `<select data-ch="acreg" style="width:auto">${Object.keys(B.MKT_W).map((cc) => `<option value="${cc}" ${S.acreg === cc ? 'selected' : ''}>${flag(cc)}</option>`).join('')}</select>` : ''}<button class="btn sm" data-a="acbuild" data-v="${k}">Construir</button></div>`).join('')}
  <p class="xs mut">Se você não controla o clube, a diretoria precisa aprovar. Os jovens trazidos pelas academias entram na base na virada da temporada.</p></div>`;
}
H.acreg = (v) => { S.acreg = v; };
H.acbuild = (k) => {
  const G = S.G, c = G.clubs[G.me.job?.cid ?? -1]; if (!c) return;
  if (k === 'parceria') { const ps = G.clubs.filter((x) => x.country === c.country && x.league && x.rep < c.rep - 10).sort((a, b) => b.rep - a.rep).slice(0, 12); openSheet(`<h2>Escolha o clube parceiro</h2><div class="list">${ps.map((x) => `<div class="li tap" data-a="acpart" data-v="${x.id}">${crest(x, 22)}<span class="grow">${esc(x.name)} <span class="xs mut">${G.comps[x.league]?.short}</span></span></div>`).join('')}</div>`); return; }
  toast(B.buildAcademy(G, c, k, k === 'internacional' ? (S.acreg || 'BR') : null), 3000); render(); save();
};
H.acpart = (v) => { const G = S.G, c = G.clubs[G.me.job.cid]; closeSheet(); toast(B.buildAcademy(G, c, 'parceria', +v), 3000); render(); save(); };

// ============================== MERCADO: rede de olheiros ==============================
export function scoutNetView(G) {
  const N = G.me.sn || { sc: [], rep: [] }; const cands = B.scoutCands(G);
  return `<div class="cols2"><div><div class="card"><h3>Seus olheiros (${N.sc.length}/6)</h3>${N.sc.map((s) => `<div class="li"><div class="grow"><b>${esc(s.n)}</b><div class="xs mut">${flag(s.reg)} observando ${COUNTRIES[s.reg]?.name || s.reg} · conhece ${COUNTRIES[s.know]?.name || s.know} · ${s.spec} · exp ${s.exp} · precisão ${Math.round(s.acc * 100)}% · ${s.rep} relatórios</div></div>
    <select data-ch="screg" data-v="${s.id}" style="width:auto" onchange="this.dataset.v='${s.id}'">${Object.keys(B.MKT_W).map((cc) => `<option value="${s.id}:${cc}" ${s.reg === cc ? 'selected' : ''}>${flag(cc)}</option>`).join('')}</select><button class="btn sm red" data-a="scfire" data-v="${s.id}">✕</button></div>`).join('') || '<div class="xs mut">Nenhum olheiro contratado.</div>'}
    <p class="xs mut">Salários saem do clube que você treina (ou do seu bolso, se estiver sem clube). Olheiros erram mais fora da região que conhecem.</p></div>
    <div class="card flat"><h3>Disponíveis</h3>${cands.map((s, i) => `<div class="li"><div class="grow"><b>${esc(s.n)}</b><div class="xs mut">conhece ${flag(s.know)} ${COUNTRIES[s.know]?.name || s.know} · ${s.spec} · exp ${s.exp} · precisão ${Math.round(s.acc * 100)}%</div></div><span class="xs">${money(s.wage)}/sem.</span><button class="btn sm" data-a="schire" data-v="${i}">Contratar</button></div>`).join('')}</div></div>
  <div class="card flat tbl-card"><h3 style="padding:6px">Relatórios (${N.rep.length})</h3><table class="tb"><tr><th>Pos</th><th class="l">Jogador</th><th>Id</th><th>Ger. est.</th><th>Pot. est.</th><th class="l">Clube</th><th>Contrato</th><th>Valor</th></tr>${N.rep.map((r) => { const p = G.players[r.pid]; if (!p) return ''; return `<tr data-a="player" data-v="${p.id}"><td>${posTag(p.pos)}</td><td class="l"><b>${esc(p.n)}</b><div class="xs mut">${esc(r.note)} · por ${esc(r.by)}</div></td><td>${p.age}</td><td>${r.eo}</td><td class="ok b">${r.ep}</td><td class="l sm ell" style="max-width:100px">${p.club >= 0 ? esc(G.clubs[p.club].name) : '—'}</td><td>${r.con}</td><td class="sm">${money(r.val)}</td></tr>`; }).join('')}</table></div></div>`;
}
H.schire = (i) => { toast(B.hireScout(S.G, B.scoutCands(S.G)[+i])); render(); save(); };
H.scfire = (id) => { toast(B.fireScout(S.G, +id)); render(); save(); };
H.screg = (v) => { const [id, cc] = v.split(':'); const s = S.G.me.sn.sc.find((x) => x.id === +id); if (s) { s.reg = cc; toast(`${s.n} agora observa ${COUNTRIES[cc]?.name || cc}`); save(); } };

// ============================== CARREIRA: legado e aposentadoria ==============================
export function legacyView(G) {
  const L = legacyCompare(G); const me = G.me;
  return `<div class="cols2"><div class="card hero-card"><h3>Seu legado</h3><div class="xb" style="font-size:28px">${L.L} pts</div><div class="xs mut">${L.rank}º entre todos os treinadores com títulos no jogo${L.near ? ` · já supera ${esc(L.near)}` : ''}</div>
  <div class="kv"><span>Títulos</span><b>${me.titles.length}</b></div><div class="kv"><span>Jogos</span><b>${me.stats.j}</b></div><div class="kv"><span>Clubes onde é ídolo</span><b>${Object.entries(me.idol || {}).filter(([, n]) => n >= 2).map(([id]) => G.clubs[id].name).join(', ') || '—'}</b></div>
  <div class="kv"><span>Jogadores formados/promovidos</span><b>${G.players.filter((p) => p && p.promBy === 'me').length}</b></div><div class="kv"><span>Ex-auxiliares que viraram técnicos</span><b>${(me.exStaff || []).filter((a) => a.done).length}</b></div></div>
  <div class="card flat"><h3>Comparação com grandes nomes do jogo</h3>${L.top.map((t, i) => `<div class="kv"><span>${i + 1}. ${esc(t.n)}</span><b>${Math.round(t.s)} pts</b></div>`).join('') || '<div class="xs mut">—</div>'}
  ${me.retired ? `<div class="hint">Aposentado desde ${me.retired}. Seus negócios e clubes continuam funcionando — use Negócios e "Continuar" normalmente.</div>` : `<button class="btn red blk" style="margin-top:8px" data-a="retire">🎩 Encerrar a carreira de treinador</button><p class="xs mut">Você deixa o clube e para de receber propostas, mas segue administrando empresas, investimentos e clubes.</p>`}</div></div>`;
}
H.retire = () => openSheet(`<h2>Encerrar a carreira?</h2><p>Você deixa o cargo atual e não receberá mais propostas de emprego. Empresas, investimentos e clubes continuam.</p><div class="row"><button class="btn grow" data-a="cs">Cancelar</button><button class="btn red grow" data-a="retire2">Aposentar</button></div>`);
H.retire2 = () => { toast(retireUser(S.G), 3500); closeSheet(); S.tab = 'neg'; render(); save(); };

// ============================== JOGADOR: história, agente, relatório ==============================
export function playerExtra(G, p) {
  const a = agentOf(G, p); const r = B.scoutReportOf(G, p.id);
  return `${a ? `<div class="kv sm"><span>Empresário</span><b>${esc(a.n)} · ${esc(a.t)}</b></div>` : ''}
  ${r ? `<div class="kv sm"><span>Relatório de ${esc(r.by)}</span><b>geral ~${r.eo} · potencial ~${r.ep}</b></div>` : ''}
  ${p.sto?.length ? `<div class="card flat" style="margin-top:6px"><h3>Trajetória</h3>${p.sto.slice().reverse().map(([y, t]) => `<div class="kv sm"><span>${esc(t)}</span><b>${y}</b></div>`).join('')}</div>` : ''}`;
}
