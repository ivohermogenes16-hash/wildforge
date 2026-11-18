// =====================================================================
// NEGÓCIOS: empresas e marcas, patrocínios com clubes, concorrência da IA,
// valuation, venda; grupo multiclube (administradores e estratégias),
// academias e rede mundial de olheiros.
// Receita vem de participação de mercado (disputada com a IA), que depende
// da reputação da marca; patrocinar clubes dá EXPOSIÇÃO (não lucro direto).
// =====================================================================
import { clamp, ri, rf, rnd, pick, money, hash, gauss } from '../util.js';
import { genName } from './world.js';
import { playerValue, clubValuation } from './econ.js';
import { sponsorValue, syncSpon, tl } from './life.js';
import { COUNTRIES } from '../data/leagues.js';

function msg(G, from, title, body, extra = {}) { G.inbox.unshift({ id: (G.inbox[0]?.id || 0) + 1, t: G.t, y: G.year, w: G.week, from, title, body, read: false, ...extra }); }
function news(G, txt, cat = 'neg') { G.news.unshift({ t: G.t, y: G.year, w: G.week, txt, cat }); }
const W = 46;

export const SEGS = {
  mat: { n: 'Material esportivo', mkt: 1.2e10, kit: true }, uni: { n: 'Roupas e uniformes', mkt: 3e9, kit: true },
  tec: { n: 'Tecnologia esportiva', mkt: 1.5e9 }, nut: { n: 'Alimentação esportiva', mkt: 2e9 },
  equ: { n: 'Equipamentos de treino', mkt: 1.2e9 }, mid: { n: 'Comunicação e marketing', mkt: 1.5e9 }, beb: { n: 'Bebidas esportivas', mkt: 2.5e9 },
};
export const MKT_W = { BR: 0.14, AR: 0.04, EN: 0.14, ES: 0.09, IT: 0.08, DE: 0.11, FR: 0.08, PT: 0.03, NL: 0.03, MX: 0.05, US: 0.12, JP: 0.05, SA: 0.04, AU: 0.02, UY: 0.01, CO: 0.02, MA: 0.01, ZA: 0.01 };
export const SLOTS = { Master: { n: 'Patrocínio principal da camisa', sh: 0.6, vis: 1 }, Manga: { n: 'Patrocínio secundário (manga)', sh: 0.22, vis: 0.45 }, Fornecedor: { n: 'Fornecedor de material', sh: 0.18, vis: 0.6, kit: true }, Treino: { n: 'Patrocínio de treino', sh: 0.08, vis: 0.25 }, Estadio: { n: 'Naming rights do estádio', sh: 0.25, vis: 0.7 }, Base: { n: 'Patrocínio das categorias de base', sh: 0.04, vis: 0.12 }, Parceria: { n: 'Parceria comercial', sh: 0.05, vis: 0.15 } };
export const DEPTS = { mkt: 'Marketing', prod: 'Produção', dist: 'Distribuição', rd: 'Pesquisa e produtos', adm: 'Administração' };
const NAMES_A = ['Vértix', 'Arena', 'Pulso', 'Dínamo', 'Vento', 'Kappa Sul', 'Ímpeto', 'Faro', 'Linha', 'Trave', 'Gol de Placa', 'Craque', 'Rumo', 'Tático', 'Alvo', 'Fôlego', 'Ritmo', 'Pódio', 'Atlas', 'Zênite', 'Garra', 'Aurora'];
const NAMES_B = { mat: 'Sports', uni: 'Wear', tec: 'Tech', nut: 'Nutri', equ: 'Fit', mid: 'Media', beb: 'Drinks' };
const KITS = ['Kappa Sul', 'Dínamo Sports', 'Vento Wear', 'Arena Athletic', 'Pulso Sportswear'];

// ---------------- empresas ----------------
function newCo(G, o) {
  const B = G.biz; const seg = o.seg;
  const co = { id: B.seq++, n: o.n, seg, user: !!o.user, sh: o.user ? 100 : 0, ai: !o.user, emp: o.emp ?? 10, d: { mkt: o.lv ?? 1, prod: o.lv ?? 1, dist: o.lv ?? 1, rd: o.lv ?? 1, adm: o.lv ?? 1 }, rep: o.rep ?? 15, cash: o.cash ?? 200000, debt: 0, cc: o.cc || ['BR'],
    cap: 0, rev: 0, exp: 0, prof: 0, hist: [], ads: 0, proj: null, prods: o.prods ?? 1, ident: o.ident || '', goal: o.goal || '', founded: G.year, home: o.home || 'BR', dead: false, inv: o.inv || 0, wk: o.user ? 0 : 99, fol: o.fol ?? Math.round(150 * Math.pow(o.rep ?? 15, 2.1)), posts: [] };
  B.cos.push(co); return co;
}
export function initBiz(G) {
  if (G.biz) return;
  G.biz = { cos: [], seq: 0, log: [] };
  for (const n of KITS) newCo(G, { n, seg: 'mat', emp: ri(300, 2500), lv: ri(2, 4), rep: ri(45, 80), cash: ri(20, 120) * 1e6, cc: ['BR', 'AR', 'EN', 'ES', 'IT', 'DE', 'FR', 'US'].slice(0, ri(3, 8)), prods: ri(3, 8) });
  const segs = Object.keys(SEGS);
  for (let i = 0; i < 18; i++) { const seg = segs[i % segs.length]; const big = rnd() < 0.3; newCo(G, { n: `${NAMES_A[(i + 5) % NAMES_A.length]} ${NAMES_B[seg]}`, seg, emp: big ? ri(400, 3000) : ri(15, 250), lv: big ? ri(2, 4) : ri(1, 2), rep: big ? ri(45, 75) : ri(12, 40), cash: (big ? ri(10, 80) : ri(1, 8)) * 1e6, cc: big ? pick([['BR', 'AR', 'US', 'MX'], ['EN', 'DE', 'FR', 'ES', 'IT'], ['JP', 'SA', 'AU', 'US']]) : [pick(['BR', 'EN', 'ES', 'DE', 'US', 'MX', 'JP'])], prods: big ? ri(3, 6) : ri(1, 2) }); }
  // fornecedores de material dos clubes passam a ser empresas modeladas
  for (const c of G.clubs) for (const s of c.spons || []) if (s.slot === 'Fornecedor') { const co = G.biz.cos.find((x) => x.n === s.n); if (co) s.co = co.id; }
}
export const coById = (G, id) => G.biz.cos.find((c) => c.id === id);
export const myCos = (G) => G.biz.cos.filter((c) => !c.dead && c.sh > 0);
export function contractsOf(G, co) { if (G._cc) return G._cc.get(co.id) || []; const out = []; for (const c of G.clubs) for (const s of c.spons || []) if (s.co === co.id) out.push({ c, s }); return out; }

// visibilidade de um clube (reputação, torcida, competições, fase, estrelas, crise)
export function clubVis(G, c) {
  const tier = G.comps[c.league]?.tier || 3; const cont = G._cont ? G._cont.has(c.id) : Object.values(G.comps).some((k) => k.kind === 'cont' && k.clubs.includes(c.id));
  const t = G.comps[c.league]?.table?.[c.id]; const n = G.comps[c.league]?.clubs.length || 20;
  const form = t && t.p ? 0.85 + 0.3 * (1 - (G._rank?.get(c.id) ?? n / 2) / n) : 1;
  const star = G._star?.get(c.id) ?? 60;
  const title = (c.troph || []).filter((x) => x.y >= G.year - 1).length;
  return Math.pow(c.rep / 100, 2) * (tier === 1 ? 1 : tier === 2 ? 0.5 : 0.25) * (cont ? 1.3 : 1) * form * (0.8 + (c.fans ?? 50) / 250) * (1 + Math.max(0, star - 80) / 40) * (1 + title * 0.25) * (c.crisis === G.year ? 0.7 : 1) * 100;
}
function exposure(G, co) { let e = 0; for (const { c, s } of contractsOf(G, co)) e += clubVis(G, c) * (SLOTS[s.slot]?.vis || 0.3); return e; }
const reach = (co) => co.cc.reduce((s, x) => s + (MKT_W[x] || 0.01), 0);
const attract = (co) => Math.pow(Math.max(1, co.rep), 1.5) * (1 + 0.15 * co.d.prod + 0.08 * co.prods) * (1 + 0.1 * co.d.dist);
export const capacity = (co) => 9000 * Math.pow(Math.max(1, co.emp), 0.9) * (1 + 0.3 * co.d.prod);
export const empWage = (co) => 900 + co.d.adm * 50;
const deptUpkeep = (co) => Object.values(co.d).reduce((s, l) => s + l * l * 1500, 0);
export function coValuation(G, co) {
  const h = co.hist.slice(-26); const annRev = (h.length ? h.reduce((s, x) => s + x.rev, 0) / h.length : co.rev) * W; const annProf = Math.min(annRev * 0.3, (h.length ? h.reduce((s, x) => s + x.prof, 0) / h.length : co.prof) * W);
  const growth = h.length >= 20 ? clamp((h.slice(-4).reduce((s, x) => s + x.rev, 0) - h.slice(0, 4).reduce((s, x) => s + x.rev, 0)) / Math.max(1, h.slice(0, 4).reduce((s, x) => s + x.rev, 0)), -0.5, 0.6) : 0;
  const contracts = contractsOf(G, co).length;
  const mult = clamp(5 + growth * 4 + co.rep / 30 + contracts * 0.1, 3, 11);
  // empresas novas valem o que têm (caixa + estrutura); o valor pelo lucro só pesa depois de provar resultado (até 1 ano)
  const mat = clamp((co.wk ?? 99) / 46, 0, 1);
  const assets = co.cash - co.debt + (co.inv || 0) * 0.15 + co.emp * 2500 + Object.values(co.d).reduce((s, l) => s + (l - 1) * 90000, 0);
  return Math.max(0, Math.round((assets + Math.max(annRev * 0.25, annProf * mult) * mat) / 1000) * 1000);
}
export function bizWeek(G) {
  initBiz(G); const B = G.biz; const me = G.me;
  G._star = new Map(); for (const p of G.players) if (p && p.club >= 0 && p.ovr > (G._star.get(p.club) || 0)) G._star.set(p.club, p.ovr);
  G._cont = new Set(Object.values(G.comps).filter((k) => k.kind === 'cont').flatMap((k) => k.clubs));
  G._rank = new Map(); for (const k of Object.values(G.comps)) if (k.kind === 'league') { const ids = Object.keys(k.table).map(Number).sort((a, b) => k.table[b].pts - k.table[a].pts); ids.forEach((id, i) => G._rank.set(id, i)); }
  G._cc = new Map(); for (const c of G.clubs) for (const s of c.spons || []) if (s.co != null) { let a = G._cc.get(s.co); if (!a) G._cc.set(s.co, (a = [])); a.push({ c, s }); }
  const live = B.cos.filter((c) => !c.dead);
  for (const seg of Object.keys(SEGS)) {
    const cs = live.filter((c) => c.seg === seg); const tot = cs.reduce((s, c) => s + attract(c) * reach(c), 0) || 1;
    for (const co of cs) {
      const e = exposure(G, co);
      const famous = co.user ? (me.pop || 0) / 8 + (me.rep || 0) / 20 : 0; // treinador famoso puxa a marca
      const target = clamp(10 + Math.min(60, e * 0.6) + co.d.mkt * 3 + co.ads + famous + co.prods + socialBoost(co) * 40, 5, 98);
      co.rep += (target - co.rep) * 0.03; co.ads = Math.max(0, co.ads * 0.92);
      co.wk = (co.wk ?? 99) + 1;
      const ramp = co.wk < 40 ? 0.3 + 0.7 * co.wk / 40 : 1; // marca nova leva meses para chegar às lojas
      const demand = SEGS[seg].mkt / W * (attract(co) * reach(co)) / tot * ramp * (1 + socialBoost(co));
      socialWeek(G, co, e);
      co.cap = capacity(co); co.rev = Math.round(Math.min(demand, co.cap));
      let contractCost = 0; for (const { s } of contractsOf(G, co)) contractCost += s.val / W;
      const cogs = co.rev * (0.62 - 0.035 * co.d.prod);
      co.exp = Math.round(cogs + co.emp * empWage(co) + deptUpkeep(co) + contractCost + co.debt * 0.002);
      co.prof = co.rev - co.exp; co.cash += co.prof;
      co.hist.push({ rev: co.rev, prof: co.prof, rep: Math.round(co.rep) }); if (co.hist.length > 60) co.hist.shift();
      if (co.cash < 0 && co.user) { const loan = -co.cash; co.debt += loan; co.cash = 0; }
      // projetos de produto
      if (co.proj && --co.proj.left <= 0) { co.prods++; co.rep += 3; post(G, co, 'prod', `Lançamento: ${co.proj.n}. Já nas lojas! 🔥`); if (co.user) msg(G, co.n, `🧪 Novo produto lançado: ${co.proj.n}`, `A ${co.n} lançou ${co.proj.n}. A linha de produtos ficou mais atrativa.`); co.proj = null; }
      if (co.ai) aiCoWeek(G, co);
    }
  }
  G._star = G._cont = G._rank = G._cc = null;
}
function aiCoWeek(G, co) {
  // acionistas da IA retiram dividendos: o caixa não cresce para sempre
  if (co.cash > Math.max(5e6, co.exp * 12)) co.cash -= (co.cash - co.exp * 12) * 0.08;
  // IA investe quando sobra caixa e corta quando perde dinheiro
  if (co.cash > co.emp * 30000 && rnd() < 0.05) { co.emp = Math.round(co.emp * 1.1) + 2; if (rnd() < 0.3) { const k = pick(Object.keys(co.d)); if (co.d[k] < 5) co.d[k]++; } }
  if (co.prof < 0 && co.cash < co.emp * 5000 && rnd() < 0.1) co.emp = Math.max(5, Math.round(co.emp * 0.85));
  if (co.cash > 5e6 && rnd() < 0.01) { co.ads += 6; co.cash -= co.cash * 0.05; }
  if (co.cash > 30e6 && rnd() < 0.003 && co.cc.length < 10) { const nc = pick(Object.keys(MKT_W).filter((x) => !co.cc.includes(x))); if (nc) { co.cc.push(nc); news(G, `🌍 ${co.n} expande operações para ${COUNTRIES[nc]?.name || nc}.`); } }
}
export function bizSeasonEnd(G) {
  initBiz(G); const B = G.biz;
  for (const co of B.cos) {
    if (co.dead) continue;
    // falência
    const annRev = co.hist.slice(-46).reduce((s, x) => s + x.rev, 0);
    if (co.ai && co.cash < -Math.max(2e6, annRev * 0.4)) { killCo(G, co, 'falência'); continue; }
    if (co.user && co.debt > Math.max(3e6, annRev * 0.8)) { msg(G, co.n, `⚠️ ${co.n} está muito endividada`, `A dívida (${money(co.debt)}) passou do limite seguro. Corte custos ou injete dinheiro, senão os bancos podem pedir a falência na próxima temporada.`); if (co.warn) { killCo(G, co, 'falência pedida pelos credores'); continue; } co.warn = true; } else co.warn = false;
  }
  // aquisições entre empresas da IA
  const ai = B.cos.filter((c) => c.ai && !c.dead);
  const rich = ai.filter((c) => c.cash > 40e6); const weak = ai.filter((c) => c.rep < 25 && c.cash < 3e6);
  if (rich.length && weak.length && rnd() < 0.5) { const b = pick(rich), t = pick(weak); const v = coValuation(G, t); b.cash -= v; b.emp += t.emp; b.cc = [...new Set(b.cc.concat(t.cc))]; for (const { s } of contractsOf(G, t)) s.co = b.id; t.dead = true; t.by = b.id; news(G, `🏢 ${b.n} compra a ${t.n} por ${money(v)}.`); tl(G, `${b.n} adquire ${t.n}`, 'neg'); }
  // novas marcas surgem
  for (let i = 0; i < ri(1, 2); i++) { const seg = pick(Object.keys(SEGS)); newCo(G, { n: `${pick(NAMES_A)} ${NAMES_B[seg]} ${ri(2, 99)}`, seg, emp: ri(8, 40), rep: ri(8, 22), cash: ri(5, 30) * 1e5, cc: [pick(['BR', 'US', 'EN', 'DE', 'JP', 'MX'])] }); }
  // contratos que vencem: IA disputa vagas, usuário é avisado
  for (const c of G.clubs) for (const s of c.spons || []) {
    if (s.until > G.year + 1) continue;
    const owner = s.co != null ? coById(G, s.co) : null;
    if (owner?.user && s.until <= G.year + 1) msg(G, owner.n, `📄 Contrato vence: ${c.name}`, `O contrato de ${SLOTS[s.slot]?.n.toLowerCase() || s.slot} com o ${c.name} vence no fim de ${s.until}. Renove em Negócios › Patrocínios ou a vaga volta ao mercado.`);
    if (!owner?.user && rnd() < 0.25) {
      const cands = B.cos.filter((x) => x.ai && !x.dead && x.cash > s.val * 1.5 && (!SLOTS[s.slot]?.kit || SEGS[x.seg].kit) && x.rep >= c.rep * 0.4);
      const w = cands.sort((a, b) => b.rep - a.rep)[0]; if (w && w.id !== s.co) { s.co = w.id; s.n = w.n; news(G, `🤝 ${w.n} assina como ${SLOTS[s.slot]?.n.toLowerCase() || s.slot} do ${c.name}.`); }
    }
  }
  for (const c of G.clubs) for (const s of c.spons || []) { const o = s.co != null ? coById(G, s.co) : null; if (o?.user && s.until < G.year + 1 && !s.renewed) { s.co = null; s.n = 'Sem patrocínio fixo'; s.val = Math.round(s.val * 0.5); syncSpon(c); msg(G, o.n, `Contrato encerrado com ${c.name}`, `O contrato com o ${c.name} terminou e não foi renovado.`); } s.renewed = false; }
}
function killCo(G, co, why) {
  co.dead = true; for (const { c, s } of contractsOf(G, co)) { s.co = null; s.n = 'Sem patrocínio fixo'; s.val = Math.round(s.val * 0.4); syncSpon(c); }
  news(G, `📉 ${co.n} encerra as atividades (${why}).`); tl(G, `${co.n} fecha as portas (${why})`, 'neg');
  if (co.user) { msg(G, co.n, `📉 ${co.n} faliu`, `Sua empresa ${co.n} encerrou as atividades (${why}). Sua participação virou pó.`); co.sh = 0; }
}

// ---------------- ações do usuário ----------------
export const FOUND_MIN = 150000;
export function foundCompany(G, o) {
  initBiz(G); const me = G.me;
  if (!o.n || o.n.length < 3) return { ok: false, why: 'Escolha um nome.' };
  if (G.biz.cos.some((c) => !c.dead && c.n.toLowerCase() === o.n.toLowerCase())) return { ok: false, why: 'Já existe uma empresa com esse nome.' };
  if (o.inv < FOUND_MIN) return { ok: false, why: `Investimento mínimo: ${money(FOUND_MIN)}.` };
  if (me.money < o.inv) return { ok: false, why: 'Dinheiro pessoal insuficiente.' };
  me.money -= o.inv;
  const co = newCo(G, { n: o.n, seg: o.seg, user: true, emp: Math.max(3, Math.round(o.inv / 60000)), rep: 6, fol: Math.round(80 + (me.pop || 0) * 400), inv: o.inv, cash: o.inv * 0.8, cc: [o.home || 'BR'], home: o.home || 'BR', ident: o.ident, goal: o.goal, prods: 1 });
  news(G, `🆕 ${me.name} funda a ${co.n} (${SEGS[co.seg].n}).`); tl(G, `${me.name} funda a ${co.n}`, 'neg');
  post(G, co, 'launch', `Nasce a ${co.n}! ${o.ident ? o.ident + '. ' : ''}O começo de uma história. 🚀`);
  return { ok: true, co };
}
export function coAction(G, co, act, arg) {
  const cost = {
    hire: () => 0, fire: () => 0, dept: () => 120000 * Math.pow(2.2, co.d[arg] - 1), ads: () => arg, country: () => 400000 + co.cc.length * 350000, prod: () => 250000 * co.prods,
  }[act]?.() ?? 0;
  if (act === 'hire') { const n = Math.max(1, Math.floor(+arg || 0)); const fee = n * 2500; if (co.cash < fee) return 'Caixa insuficiente.'; co.cash -= fee; co.emp += n; return `${n} funcionários contratados. Folha: ${money(co.emp * empWage(co))}/sem.`; }
  if (act === 'fire') { const n = Math.min(+arg, co.emp - 2); co.emp -= n; co.cash -= n * 1500; co.rep -= n > co.emp * 0.2 ? 2 : 0; return `${n} demitidos (rescisões de ${money(n * 1500)}).`; }
  if (co.cash < cost) return `Caixa insuficiente: precisa de ${money(cost)}.`;
  if (act === 'dept') { if (co.d[arg] >= 6) return 'Departamento já no máximo.'; co.cash -= cost; co.d[arg]++; return `${DEPTS[arg]} subiu para o nível ${co.d[arg]}.`; }
  if (act === 'ads') { co.cash -= cost; co.ads += Math.sqrt(cost / 10000) * 2; co.fol += Math.round(Math.sqrt(cost) * 6); post(G, co, 'ads', pick(['Nova campanha no ar! 📣', 'Você já viu nosso comercial? 🎬', 'Lançamos a campanha da temporada!'])); return `Campanha de ${money(cost)} no ar. A reputação da marca vai subir nas próximas semanas.`; }
  if (act === 'country') { co.cash -= cost; co.cc.push(arg); post(G, co, 'world', `Chegamos em ${COUNTRIES[arg]?.name || arg}! ${COUNTRIES[arg]?.flag || '🌍'}`); return `${co.n} agora vende em ${COUNTRIES[arg]?.name || arg}.`; }
  if (act === 'prod') { if (co.proj) return 'Já há um produto em desenvolvimento.'; co.cash -= cost; co.proj = { n: arg || `Linha ${co.prods + 1}`, left: 8 }; return `Desenvolvimento iniciado: fica pronto em 8 semanas.`; }
  return '';
}
export function moveCash(G, co, amount) {
  const me = G.me; const own = co.sh / 100;
  if (amount > 0) { if (me.money < amount) return 'Dinheiro pessoal insuficiente.'; me.money -= amount; co.inv = (co.inv || 0) + amount; const pay = Math.min(co.debt, amount * 0.5); co.debt -= pay; co.cash += amount - pay; return `Aporte de ${money(amount)} na ${co.n}${pay ? ` (${money(pay)} quitaram dívida)` : ''}.`; }
  const w = -amount; if (co.cash < w) return 'A empresa não tem esse caixa.'; co.cash -= w; me.money += Math.round(w * own); return `Dividendos: ${money(Math.round(w * own))} para você (${co.sh}% da empresa).`;
}
export function buyStake(G, co, pct) {
  const me = G.me; if (co.dead || co.user && co.sh >= 100) return 'Indisponível.';
  const free = 100 - co.sh; pct = Math.min(pct, free);
  const price = Math.round(coValuation(G, co) * pct / 100 * (pct >= 51 ? 1.15 : 1.05));
  if (me.money < price) return `Precisa de ${money(price)}.`;
  me.money -= price; co.sh += pct; if (co.sh >= 51) { co.ai = false; co.user = true; } co.cash += Math.round(price * 0.2);
  news(G, `💼 ${me.name} compra ${pct}% da ${co.n} por ${money(price)}.`); tl(G, `${me.name} compra ${pct}% da ${co.n}`, 'neg');
  return `Você agora tem ${co.sh}% da ${co.n}.`;
}
export function sellStake(G, co, pct) {
  const me = G.me; pct = Math.min(pct, co.sh); if (!pct) return 'Você não tem participação.';
  const price = Math.round(coValuation(G, co) * pct / 100 * 0.95);
  me.money += price; co.sh -= pct; if (co.sh < 51) { co.user = false; co.ai = true; }
  news(G, `💼 ${me.name} vende ${pct}% da ${co.n} por ${money(price)}.`);
  return `Venda concluída: ${money(price)} entraram na sua conta.`;
}
// pedido de patrocínio a um clube
export function sponsorAsk(G, c, slot) { const base = sponsorValue(G, c, slot === 'Estadio' || slot === 'Treino' || slot === 'Base' || slot === 'Parceria' ? 'Manga' : slot) / (SLOTS[slot === 'Estadio' || slot === 'Treino' || slot === 'Base' || slot === 'Parceria' ? 'Manga' : slot].sh) * SLOTS[slot].sh; return Math.round(base / 1000) * 1000; }
// o que o clube exige da sua marca: quanto menor/desconhecida a marca, mais caro (mas nunca impossível)
export function sponsorNeed(G, co, c, slot, years = 2, bonus = 0) {
  const ask = sponsorAsk(G, c, slot); const cur = (c.spons || []).find((x) => x.slot === slot);
  const fit = clamp(co.rep / Math.max(8, c.rep * 0.55), 0.2, 1.2);
  let k = 0.55 + 0.45 * Math.min(1, fit); // marca pequena paga "pedágio"
  if (!cur || cur.co == null) k += 0.25; // vaga livre ou sem patrocinador fixo: clube aceita mais fácil
  if (c.money < 0) k += 0.12; // clube precisando de dinheiro
  if ((c.tier ?? G.comps[c.league]?.tier ?? 1) >= 3) k += 0.1; // divisões menores aceitam qualquer parceiro
  if (c.own?.user >= 51) k += 0.35; // seu próprio clube
  if (years >= 3) k += 0.04; k += Math.min(0.12, bonus / Math.max(1, ask));
  let need = Math.round(ask / k / 1000) * 1000;
  // gigantes protegem a marca: exigem bem mais de uma empresa desconhecida
  if (c.rep >= 85 && co.rep < 25) need = Math.round(need * 1.6 / 1000) * 1000;
  return { ask, need: Math.max(Math.round(ask * 0.45 / 1000) * 1000, need) };
}
export function sponsorOffer(G, co, c, slot, val, years, bonus) {
  if (!co.user) return { ok: false, why: 'Só suas empresas podem negociar.' };
  if (SLOTS[slot].kit && !SEGS[co.seg].kit) return { ok: false, why: 'Só empresas de material esportivo ou uniformes podem fornecer material.' };
  const { need } = sponsorNeed(G, co, c, slot, years, bonus);
  const s0 = (c.spons ||= []).find((x) => x.slot === slot);
  if (val < need) return { ok: false, why: `O ${c.name} recusou. Para fechar ${SLOTS[slot].n.toLowerCase()} com a ${co.n}, eles querem ao menos ${money(need)}/temporada.` };
  if (co.cash < val * 0.25) return { ok: false, why: `A ${co.n} precisa ter em caixa 25% do valor anual (${money(val * 0.25)}). Faça um aporte na empresa.` };
  let s = s0; if (!s) { s = { slot, n: co.n, val: 0, until: 0 }; c.spons.push(s); }
  if (s.co != null && s.co !== co.id) { const old = coById(G, s.co); if (old?.ai) news(G, `🔁 ${co.n} tira a ${old.n} e assume ${SLOTS[slot].n.toLowerCase()} do ${c.name}.`); }
  s.co = co.id; s.n = co.n; s.val = val; s.until = G.year + years; s.bonus = bonus || 0; s.renewed = true; syncSpon(c);
  co.rep += Math.min(6, clubVis(G, c) * (SLOTS[slot]?.vis || 0.3) / 6); co.fol += Math.round(Math.max(200, (c.fans ?? 50) * c.rep * c.rep * 0.4 * (SLOTS[slot]?.vis || 0.3)));
  post(G, co, 'deal', `Agora somos ${SLOTS[slot].n.toLowerCase()} do ${c.name}! 🤝⚽`);
  news(G, `🤝 ${co.n} fecha ${SLOTS[slot].n.toLowerCase()} com o ${c.name}: ${money(val)}/temporada até ${s.until}.`);
  if (c.own.user >= 51) news(G, `⚖️ Conflito de interesses? ${co.n} e ${c.name} têm o mesmo dono: ${G.me.name}.`, 'bast');
  return { ok: true, why: `Contrato assinado com o ${c.name}!` };
}
// ---------------- redes sociais ----------------
export function socialBoost(co) { return Math.min(0.3, Math.log10(1 + (co.fol || 0)) / 25); }
export function post(G, co, kind, txt) {
  if (!co.user && kind !== 'deal') return;
  const eng = 0.015 + Math.random() * 0.05; const likes = Math.round((co.fol || 0) * eng * (kind === 'viral' ? 8 : 1)) + ri(3, 30);
  (co.posts ||= []).unshift({ t: G.t, y: G.year, w: G.week, kind, txt, likes, com: Math.round(likes * (0.02 + Math.random() * 0.05)) });
  if (co.posts.length > 14) co.posts.length = 14;
}
function socialWeek(G, co, e) {
  const me = G.me; co.fol ??= Math.round(150 * Math.pow(co.rep, 2.1));
  const famous = co.user ? (me.pop || 0) * 900 + (me.rep || 0) * 300 : 0;
  const target = 120 * Math.pow(Math.max(1, co.rep), 2.15) * (1 + Math.min(3, e / 30)) * (1 + co.cc.length * 0.08) + famous + co.ads * 2500;
  const g = (target - co.fol) * (target > co.fol ? 0.045 : 0.01);
  co.fol = Math.max(50, Math.round(co.fol + g + co.fol * 0.002 * (rnd() - 0.3)));
  (co.fh ||= []).push(co.fol); if (co.fh.length > 30) co.fh.shift();
  if (!co.user) return;
  if (rnd() < 0.012 + (me.pop || 0) / 4000) { const gain = Math.round(Math.max(500, co.fol * rf(0.08, 0.35))); co.fol += gain; co.rep += 1; post(G, co, 'viral', pick([`Nosso vídeo viralizou! +${fmtK(gain)} seguidores em 2 dias 🤯`, `Trend da ${co.n} explodiu no TikTok 📈`, `Meme com a nossa camisa tomou conta da internet 😂`])); msg(G, co.n, '📱 Post viralizou!', `Um post da ${co.n} viralizou e trouxe ${fmtK(gain)} novos seguidores. A marca ficou mais conhecida.`); }
  else if (rnd() < 0.18) post(G, co, 'misc', pick([`Bastidores da fábrica 🏭`, `Qual camisa da coleção é a sua favorita? 👇`, `Obrigado pelo carinho, família ${co.n}! 💚`, `Sorteio na área! Comenta aí 🎁`, `Treino de hoje com os nossos produtos 💪`]));
}
export const fmtK = (n) => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.', ',') + ' mi' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace('.', ',') + ' mil' : String(Math.round(n));
export function coachPost(G, co) {
  if ((co.cp || -9) >= G.t) return 'Você já postou esta semana. Volte na próxima.';
  co.cp = G.t; const me = G.me; const gain = Math.round(200 + (me.pop || 0) * rf(150, 450) + co.fol * rf(0.01, 0.04));
  co.fol += gain; co.ads += 0.5 + (me.pop || 0) / 40;
  post(G, co, 'coach', pick([`${me.name} usando ${co.n} no treino de hoje 👀`, `O professor ${me.name.split(' ')[0]} aprova! ✅`, `Dia de foto com o ${me.name.split(' ')[0]} 📸`]));
  return `📱 Post com você publicado: +${fmtK(gain)} seguidores.`;
}
export function influencerCampaign(G, co, cost) {
  cost = Math.floor(cost / 1000) * 1000; if (cost < 10000) return 'Valor mínimo: R$ 10 mil.'; if (co.cash < cost) return 'Caixa insuficiente na empresa.';
  co.cash -= cost; const gain = Math.round(Math.sqrt(cost) * rf(25, 45)); co.fol += gain; co.ads += Math.sqrt(cost / 10000) * 1.2;
  post(G, co, 'infl', pick(['Parceria com influenciadores da bola 🎥', 'Collab com criadores de conteúdo! 🤳', 'Desafio da embaixadinha com a nossa bola ⚽']));
  return `Campanha com influenciadores: +${fmtK(gain)} seguidores e mais reputação nas próximas semanas.`;
}

// bônus por título pago ao clube
export function sponsorTitleBonus(G, c) { for (const s of c.spons || []) if (s.co != null) { const co = coById(G, s.co); if (!co || co.dead) continue; if (co.user) { co.fol = Math.round((co.fol || 0) * 1.06); post(G, co, 'title', `CAMPEÃO! Parabéns, ${c.name}! 🏆`); } if (s.bonus) { co.cash -= s.bonus; c.money += s.bonus; co.rep += 4; if (co.user) msg(G, co.n, `🏆 Bônus pago ao ${c.name}`, `O ${c.name} foi campeão. Bônus de ${money(s.bonus)} pago e a marca ganhou visibilidade.`); } } }

// ---------------- grupo multiclube ----------------
export const STRATS = { equilibrio: 'Equilíbrio', titulos: 'Títulos (gasta mais)', formacao: 'Formação de jovens', lucro: 'Lucro (vende e gasta pouco)' };
export const groupClubs = (G) => G.clubs.filter((c) => c.own.user > 0);
export function hireAdmin(G, c, q) { const wage = 1500 + q * q * 120; c.adm = { n: genName(c.country), q, wage }; return `${c.adm.n} contratado como administrador do ${c.name} (${money(wage)}/sem.).`; }
export function conflictCheck(G, cid) {
  const c = G.clubs[cid]; const ctrl = groupClubs(G).filter((x) => x.id !== cid && (x.own.user >= 51 || x.ctrl));
  const same = ctrl.find((x) => x.league && x.league === c.league);
  return same ? `Regra de multipropriedade: você já controla o ${same.name}, da mesma liga. Não é permitido controlar dois clubes na mesma competição.` : null;
}
export function groupWeek(G) {
  for (const c of groupClubs(G)) {
    if (c.adm) { c.money -= c.adm.wage; c.fin.other += c.adm.wage; c.board.conf = clamp(c.board.conf + c.adm.q * 0.02, 0, 100); c.money += Math.round((c.spon || 0) / 46 * c.adm.q * 0.004); }
    if (c.strat === 'lucro' && G.week === 20) { const p = G.players.filter((x) => x && x.club === c.id && !x.u20 && x.age >= 28).sort((a, b) => playerValue(b) - playerValue(a))[0]; if (p) p.lst = true; }
  }
}
export function groupTransfer(G, p, toCid, fee) {
  const from = G.clubs[p.club], to = G.clubs[toCid];
  if (!from || !to || !(from.own.user > 0 && to.own.user > 0)) return 'Os dois clubes precisam ser do seu grupo.';
  if (to.money < fee) return `O ${to.name} não tem caixa para ${money(fee)}.`;
  to.money -= fee; from.money += fee; from.fin.tin += fee; to.fin.tout += fee;
  p.club = toCid; p.lst = false; p.loan = null; from.lineup = null; to.lineup = null;
  news(G, `🔀 Transferência interna no grupo de ${G.me.name}: ${p.n} vai do ${from.name} para o ${to.name} (${money(fee)}).`);
  return `${p.n} transferido para o ${to.name}.`;
}

// ---------------- academias e redes de formação ----------------
export const ACAD = {
  nacional: { n: 'Academia nacional', cost: 1.5e6, wk: 20000, d: '+2 de potencial nos garotos da base e evolução melhor.' },
  internacional: { n: 'Centro de desenvolvimento internacional', cost: 4e6, wk: 60000, d: 'Traz 2 jovens do país escolhido para a base por temporada.', region: true },
  parceria: { n: 'Parceria com clube menor', cost: 300000, wk: 6000, d: 'Preferência pelos melhores jovens do parceiro (com desconto) todo ano.', partner: true },
  escola: { n: 'Escolas de futebol', cost: 500000, wk: 10000, d: 'Renda extra pequena e torcida jovem mais engajada.' },
  talentos: { n: 'Projeto de descoberta de talentos', cost: 800000, wk: 25000, d: 'Chance de revelar uma joia rara a cada temporada.' },
};
export function buildAcademy(G, c, t, arg) {
  const A = ACAD[t]; const me = G.me; const owner = c.own.user >= 51;
  if ((c.acad || []).some((a) => a.t === t && (!A.region || a.r === arg))) return 'Essa estrutura já existe.';
  const payer = owner ? 'club' : 'board';
  if (c.money < A.cost) return `O clube não tem ${money(A.cost)} em caixa.`;
  if (payer === 'board' && (c.board.conf < 55 || rnd() < 0.3)) return 'A diretoria não aprovou o investimento agora. Melhore os resultados e tente de novo.';
  c.money -= A.cost; c.fin.infra = (c.fin.infra || 0) + A.cost;
  (c.acad ||= []).push({ t, r: arg ?? null, y: G.year });
  news(G, `🏫 ${c.name} inaugura: ${A.n}${arg != null && A.partner ? ` (parceria com ${G.clubs[arg].name})` : arg ? ` (${COUNTRIES[arg]?.name || arg})` : ''}.`, 'clube');
  return `${A.n} criada!`;
}
export function academyWeek(G) {
  for (const c of G.clubs) if (c.acad?.length) { let w = 0; for (const a of c.acad) { w += ACAD[a.t].wk; if (a.t === 'escola') c.money += 14000; } c.money -= w; c.fin.infra = (c.fin.infra || 0) + w; }
}
export function academySeason(G, makeProspect) {
  for (const c of G.clubs) for (const a of c.acad || []) {
    if (a.t === 'internacional') for (let i = 0; i < 2; i++) makeProspect(c, a.r, 0);
    if (a.t === 'talentos' && rnd() < 0.35) { const p = makeProspect(c, c.country, 10); if (G.me.job?.cid === c.id || c.own.user > 0) msg(G, c.name, '💎 Joia revelada!', `O projeto de talentos do ${c.name} descobriu ${p.n} (${p.age} anos, potencial alto).`); }
    if (a.t === 'parceria' && a.r != null) {
      const pc = G.clubs[a.r]; const y = G.players.filter((p) => p && p.club === pc.id && p.age <= 21).sort((x, z) => z.pot - x.pot)[0];
      if (y && (G.me.job?.cid === c.id || c.own.user > 0)) { const fee = Math.round(playerValue(y) * 0.6 / 1000) * 1000; msg(G, pc.name, `🤝 Preferência: ${y.n}`, `Pela parceria, o ${pc.name} oferece ${y.n} (${y.age} anos, ${y.pos}) ao ${c.name} por ${money(fee)} (40% abaixo do valor). Veja o perfil dele no mercado.`, { kind: 'agent', pid: y.id }); y.prefFee = fee; y.prefTo = c.id; }
    }
  }
}

// ---------------- rede mundial de olheiros ----------------
export const SC_SPEC = ['Jovens', 'Prontos para jogar', 'Goleiros', 'Defensores', 'Meio-campistas', 'Atacantes'];
export function scoutCands(G) {
  const seed = G.year * 100 + Math.floor(G.week / 6);
  const r = (i) => (hash(seed + ':' + i) % 1000) / 1000;
  return Array.from({ length: 6 }, (_, i) => { const exp = 1 + Math.floor(r(i) * 20); const acc = Math.round((0.5 + r(i + 7) * 0.45) * 100) / 100; const reg = Object.keys(MKT_W)[Math.floor(r(i + 3) * Object.keys(MKT_W).length)]; return { id: seed * 10 + i, n: genName(reg), exp, acc, know: reg, spec: SC_SPEC[Math.floor(r(i + 5) * SC_SPEC.length)], wage: Math.round((600 + exp * 90 + acc * 1500) / 50) * 50 }; });
}
export function hireScout(G, s) { const N = (G.me.sn ||= { sc: [], rep: [] }); if (N.sc.length >= 6) return 'Máximo de 6 olheiros.'; if (N.sc.some((x) => x.id === s.id)) return 'Já contratado.'; N.sc.push({ ...s, reg: s.know, rep: 0 }); return `${s.n} contratado.`; }
export function fireScout(G, id) { const N = G.me.sn; N.sc = N.sc.filter((x) => x.id !== id); return 'Olheiro dispensado.'; }
export function scoutNetWeek(G) {
  const N = G.me.sn; if (!N || !N.sc.length) return;
  const me = G.me; const c = me.job ? G.clubs[me.job.cid] : null;
  for (const s of N.sc) {
    if (c) { c.money -= s.wage; c.fin.staff = (c.fin.staff || 0) + s.wage; } else me.money -= s.wage;
    if (rnd() > 0.55) continue;
    const pool = G.players.filter((p) => p && p.club >= 0 && G.clubs[p.club].country === s.reg && !p.u20 && (!c || p.club !== c.id) && specOk(s.spec, p));
    const p = pick(pool); if (!p) continue;
    const err = (1 - s.acc) * (s.reg === s.know ? 0.7 : 1.2) * (1 - s.exp / 40);
    const eo = clamp(Math.round(p.ovr + gauss() * err * 8), 30, 99), ep = clamp(Math.round(Math.max(p.ovr, p.pot) + gauss() * err * 14), eo, 99);
    N.rep = N.rep.filter((r) => r.pid !== p.id); N.rep.unshift({ pid: p.id, by: s.n, t: G.t, eo, ep, note: noteOf(p), con: p.con, val: playerValue(p) }); if (N.rep.length > 60) N.rep.length = 60;
    s.rep++;
  }
}
const specOk = (sp, p) => ({ Jovens: p.age <= 21, 'Prontos para jogar': p.age >= 23 && p.age <= 29, Goleiros: p.pos === 'GOL', Defensores: ['ZAG', 'LD', 'LE'].includes(p.pos), 'Meio-campistas': ['VOL', 'MC', 'MEI'].includes(p.pos), Atacantes: ['ATA', 'PE', 'PD'].includes(p.pos) }[sp] ?? true);
const noteOf = (p) => [p.per ? `personalidade ${p.per.toLowerCase()}` : '', p.age <= 21 ? 'margem de evolução' : p.age >= 30 ? 'experiente' : 'no auge', p.mor < 45 ? 'insatisfeito no clube' : ''].filter(Boolean).join(', ');
export const scoutReportOf = (G, pid) => G.me.sn?.rep.find((r) => r.pid === pid);
