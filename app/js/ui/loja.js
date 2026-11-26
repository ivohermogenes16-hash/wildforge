// Pranfixas: moeda especial do Prancheta. Fica no aparelho e vale para todas as carreiras.
// Ganha: bônus diário, conquistas na carreira, Desafio da Semana, liga online, anúncio com recompensa e compra no Pix.
import { S, H, render, openSheet, closeSheet, replaceSheet, centerNote, save } from './app.js';
import { esc, money, clamp } from '../util.js';
import { SLOTS } from '../store.js';
import { CAT, item, RARITY, KINDS, EVENTS, avatar as cavatar, preview, bannerCls, bannerStyle, bannerFx, titleTag, cosStr } from './cosmetics.js';

const K = 'prancheta.pf';
function load() { const d = { bal: 0, own: [], claimed: [], pend: [], log: [] }; try { return { ...d, ...JSON.parse(localStorage.getItem(K) || '{}') }; } catch { return d; } }
export const W = load();
W.eq ||= { fr: W.frame || '' }; delete W.frame; W.seen ||= [];
function wsave() { try { localStorage.setItem(K, JSON.stringify(W)); } catch {} }
export const pf = () => Math.max(0, Math.floor(W.bal || 0));
export const isVip = () => (W.vip || 0) > Date.now();
export const owns = (id) => W.own.includes(id);

// espaços extras de carreira (comprados ou do Sócio)
for (const s of ['slot4', 'slot5']) if ((owns(s) || isVip()) && !SLOTS.includes(s)) SLOTS.push(s);

export const PF_SVG = `<svg class="pf-ic" viewBox="0 0 24 24" aria-hidden="true"><defs><radialGradient id="pfg" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff4b8"/><stop offset=".45" stop-color="#f5c542"/><stop offset="1" stop-color="#b9780f"/></radialGradient></defs><circle cx="12" cy="12" r="10.5" fill="url(#pfg)" stroke="#8a5a06" stroke-width="1.2"/><circle cx="12" cy="12" r="7.6" fill="none" stroke="#fff3" stroke-width="1"/><path d="M9.3 17V7.2h3.6a3.1 3.1 0 0 1 0 6.2H9.3" fill="none" stroke="#6b4300" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const pfTag = (n) => `<span class="pf-tag">${PF_SVG}<b>${n}</b></span>`;
export const pfChip = () => `<button class="pf-chip" data-a="tloja" title="Pranfixas">${PF_SVG}<b class="pf-n">${pf()}</b>${isVip() ? '<i class="pf-vip">SÓCIO</i>' : ''}</button>`;
function updChips() { document.querySelectorAll('.pf-n').forEach((e) => (e.textContent = pf())); }

export function pfAdd(n, why, quiet) {
  n = Math.round(n); if (!n) return; W.bal = (W.bal || 0) + n; if (n > 0) W.tot = (W.tot || 0) + n;
  W.log.unshift({ t: Date.now(), n, why: why || '' }); W.log.length = Math.min(W.log.length, 40); wsave(); updChips();
  try { window.LumbraAnalytics?.event('pf_ganho', { n, por: String(why || '').slice(0, 40) }); } catch {}
  if (!quiet && n > 0) coinFx(n, why);
}
export function pfSpend(n, why) {
  if (pf() < n) { noFunds(n); return false; }
  W.bal -= n; W.log.unshift({ t: Date.now(), n: -n, why }); W.log.length = Math.min(W.log.length, 40); wsave(); updChips();
  try { window.LumbraAnalytics?.event('pf_gasto', { n, em: String(why || '').slice(0, 40) }); } catch {}
  return true;
}
// moedas voando + aviso no centro
function coinFx(n, why) {
  const el = document.createElement('div'); el.className = 'pf-fx';
  el.innerHTML = `<div class="pf-fx-box">${Array.from({ length: 9 }, (_, i) => `<span style="--i:${i};--x:${Math.round(Math.cos(i * 0.7) * 120)}px;--y:${Math.round(Math.sin(i * 1.3) * 70 - 40)}px">${PF_SVG}</span>`).join('')}<div class="pf-fx-n">+${n}</div><div class="pf-fx-w">${esc(why || 'Pranfixas')}</div></div>`;
  document.body.appendChild(el); setTimeout(() => el.remove(), 2300);
  try { window.PSFX?.('coin'); } catch {}
}
function noFunds(n) {
  openSheet(`<div class="pf-empty">${PF_SVG}<h2>Faltam ${n - pf()} Pranfixas</h2><p class="sm mut">Você tem ${pf()}. Ganhe mais vendo um anúncio, pegando o bônus diário, jogando o Desafio da Semana ou comprando no Pix.</p>
  <div class="row" style="gap:8px">${adBtn('Ver anúncio')}<button class="btn pri grow" data-a="tloja" data-v="comprar">Comprar Pranfixas</button></div></div>`);
}

// ---------- configuração remota (Lumbra Control) ----------
let RC = {}; try { window.LumbraAnalytics?.onRemote((r) => { RC = r || {}; }); } catch {}
const AD_TEST = 'ca-app-pub-8449786356389316/2705027601'; // bloco "Prancheta Premiado"
const adUnit = () => (RC.ads && RC.ads.unit) || AD_TEST;
const payUrl = () => (RC.pay && RC.pay.on && RC.pay.url ? String(RC.pay.url).replace(/\/$/, '') : '');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

// ---------- bônus diário ----------
const DAILY = [10, 15, 20, 25, 30, 40, 70];
const dMul = () => (isVip() ? 2 : 1) * (Math.max(1, Math.min(3, +(window.PEV?.active?.()?.bonus?.daily) || 1)));
export function dailyReady() { return W.day !== today(); }
export function dailyCheck() { if (dailyReady()) setTimeout(() => { if (!document.querySelector('.modal-bg')) openSheet(dailyHtml()); }, 1400); }
function dailyHtml() {
  const y = new Date(Date.now() - 864e5); const yk = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
  const st = dailyReady() ? (W.day === yk ? (W.streak || 0) % 7 : 0) : ((W.streak || 1) - 1) % 7; const ready = dailyReady();
  return `<div class="pf-daily"><h2>Bônus diário</h2><p class="xs mut">Entre todo dia para ganhar mais. No 7º dia vem o prêmio grande.${isVip() ? ' <b class="gold">Sócio ganha em dobro.</b>' : ''}${(window.PEV?.active?.()?.bonus?.daily || 1) > 1 ? ' <b class="gold">Evento: bônus em dobro!</b>' : ''}</p>
  <div class="pf-days">${DAILY.map((v, i) => `<div class="pf-day ${i < st ? 'got' : i === st ? (ready ? 'now' : 'got') : ''}" style="--d:${i * 0.06}s"><small>Dia ${i + 1}</small>${PF_SVG}<b>${v * dMul()}</b></div>`).join('')}</div>
  ${ready ? `<button class="btn pri big blk" data-a="pfdaily">Pegar ${DAILY[st] * dMul()} Pranfixas</button>` : '<div class="hint">Você já pegou o bônus de hoje. Volte amanhã!</div>'}</div>`;
}
H.pfdaily = () => {
  if (!dailyReady()) return; const y = new Date(Date.now() - 864e5); const yk = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
  W.streak = W.day === yk ? (W.streak || 0) + 1 : 1; W.day = today(); const v = DAILY[(W.streak - 1) % 7] * dMul(); wsave(); try { window.PEV?.track('dias', 1); window.PONT?.sp(5, 'login'); } catch {}
  closeSheet(); pfAdd(v, `Bônus diário · dia ${((W.streak - 1) % 7) + 1}`);
  if (W.streak % 7 === 0) { const L = CAT.filter((x) => x.k === 'em' && x.ra === 'comum' && !has(x.id)); if (L.length) setTimeout(() => grant(L[Math.floor(Math.random() * L.length)].id, '7 dias seguidos: emblema de presente!'), 2400); }
};

// ---------- anúncio com recompensa (AdMob, só no app) ----------
const AD_PF = 25;
const adLimit = () => (isVip() ? 8 : 5);
export function adsLeft() { if (W.adD !== today()) { W.adD = today(); W.adN = 0; } return Math.max(0, adLimit() - (W.adN || 0)); }
export const adOk = () => !!window.PranchetaNative?.showAd && (RC.ads ? RC.ads.on !== false : true);
export function adBtn(label = 'Ver anúncio', why = 'pf') { return adOk() && adsLeft() ? `<button class="btn grow pf-adb" data-a="pfad" data-v="${why}">▶ ${esc(label)} <span class="pf-tag sm">+${AD_PF}${PF_SVG}</span></button>` : ''; }
let adWait = null;
window.onPranchetaAd = (st) => { const f = adWait; adWait = null; if (f) f(st); };
export function watchAd() {
  return new Promise((ok) => {
    if (!adOk()) { centerNote('Os anúncios só funcionam no app do Prancheta.'); ok(false); return; }
    if (!adsLeft()) { centerNote('Você já viu todos os anúncios de hoje. Volte amanhã!'); ok(false); return; }
    adWait = (st) => { if (st === 'ok') { W.adN = (W.adN || 0) + 1; wsave(); ok(true); } else { if (st === 'fail') centerNote('Nenhum anúncio disponível agora. Tente de novo em alguns minutos.', 2600); ok(false); } };
    try { window.PranchetaNative.showAd(adUnit()); } catch { adWait = null; ok(false); }
    setTimeout(() => { if (adWait && document.visibilityState === 'visible') { /* ainda carregando */ } }, 15000);
  });
}
export function adPreload() { try { if (adOk()) window.PranchetaNative.loadAd(adUnit()); } catch {} }
H.pfad = async (v) => {
  const r = await watchAd(); if (!r) return;
  if (v === 'pf' || !v) { pfAdd(AD_PF, 'Anúncio assistido'); if (document.querySelector('.pf-shop')) replaceSheet(shopHtml()); return; }
  try { window.PADREWARD?.(v); } catch {}
};

// ---------- itens da loja ----------
// ---------- itens visuais (catálogo em cosmetics.js) ----------
const SOCIO_ITEMS = ['ex_socio', 'em_escudo'];
export const has = (id) => W.own.includes(id) || (isVip() && SOCIO_ITEMS.includes(id));
export const eq = (k) => { const v = W.eq[k] || ''; return v && (has(v) || !item(v)) ? v : ''; };
export const myLook = () => ({ fr: eq('fr'), em: eq('em'), ban: eq('ban'), tit: eq('tit'), vip: isVip() });
export const frameColor = () => '';
export function grant(id, why) { if (!id || has(id)) return false; W.own.push(id); wsave(); const it = item(id); try { window.LumbraAnalytics?.event('item_ganho', { id }); } catch {} if (it && why) itemFx(it, why); return true; }
function itemFx(it, why) {
  const el = document.createElement('div'); el.className = 'pf-fx it-fx';
  el.innerHTML = `<div class="pf-fx-box"><div class="it-fx-p">${preview(it, myLook(), nickName())}</div><div class="it-fx-n" style="color:${RARITY[it.ra].c}">${RARITY[it.ra].t.toUpperCase()}</div><div class="pf-fx-n" style="font-size:22px">${esc(it.n)}</div><div class="pf-fx-w">${esc(why)}</div></div>`;
  document.body.appendChild(el); setTimeout(() => el.remove(), 3200); try { window.PSFX?.('coin'); } catch {}
}
const nickName = () => { try { return JSON.parse(localStorage.getItem('prancheta.on') || '{}').nick || S.G?.me.name || 'Técnico'; } catch { return 'Técnico'; } };
window.PCOS = { eq, has, look: myLook, grant, W };
const myC = () => { const G = S.G; return G && G.me.job ? G.clubs[G.me.job.cid] : null; };
const verbaVal = () => { const c = myC(); return c ? clamp(Math.round(Math.abs(c.money || 0) * 0.06 / 1e4) * 1e4 + 2e5, 2e5, 2.5e7) : 0; };
const ITEMS = [
  { id: 'verba', career: 1, t: 'Verba extra', d: () => `A diretoria libera +${money(verbaVal())} para contratações. 1 vez por temporada.`, p: 120, ok: () => { const G = S.G; return G && G.me.job && !G.me.job.youth && G._pfVerba !== G.year; }, why: 'Precisa estar no profissional; 1 vez por temporada.', go: () => { const G = S.G; G.me.verba = (G.me.verba || 0) + verbaVal(); G._pfVerba = G.year; return `+${money(verbaVal())} de verba liberada!`; } },
  { id: 'folego', career: 1, t: 'Fôlego total', d: () => 'O elenco inteiro volta com 100% de condição física. 1 vez por semana.', p: 40, ok: () => S.G && S.G.me.job && S.G._pfFol !== S.G.t, why: 'Precisa ter um clube; 1 vez por semana.', go: () => { const G = S.G; for (const p of G.players) if (p && p.club === G.me.job.cid) p.fit = 100; G._pfFol = G.t; return 'Elenco 100% descansado!'; } },
  { id: 'fisio', career: 1, t: 'Fisioterapia de elite', d: () => 'Todos os lesionados do elenco voltam na metade do tempo.', p: 60, ok: () => S.G && S.G.me.job && S.G.players.some((p) => p && p.club === S.G.me.job.cid && p.inj > 1), why: 'Ninguém do seu elenco está lesionado.', go: () => { const G = S.G; for (const p of G.players) if (p && p.club === G.me.job.cid && p.inj > 0) p.inj = Math.ceil(p.inj / 2); return 'Lesões tratadas!'; } },
  { id: 'moral', career: 1, t: 'Churrasco do elenco', d: () => 'Moral de todo o elenco sobe bastante.', p: 40, ok: () => S.G && S.G.me.job && S.G._pfMor !== S.G.t, why: 'Precisa ter um clube; 1 vez por semana.', go: () => { const G = S.G; for (const p of G.players) if (p && p.club === G.me.job.cid) p.mor = clamp((p.mor || 60) + 15, 0, 100); G._pfMor = G.t; return 'Elenco feliz e motivado!'; } },
  { id: 'olheiro', career: 1, t: 'Olheiro VIP', d: () => 'Mostra o potencial exato de todos os jogadores do mundo até o fim da temporada.', p: 90, ok: () => S.G && S.G._pfScout !== S.G.year, why: 'Já está ativo nesta temporada.', go: () => { S.G._pfScout = S.G.year; return 'Potenciais revelados nesta temporada!'; } },
  { id: 'turbo', t: 'Começo turbinado', d: () => 'Na próxima carreira nova você começa com +R$ 500 mil no bolso e mais reputação.', p: 150, ok: () => !W.turbo, why: 'Você já tem um começo turbinado guardado.', go: () => { W.turbo = 1; return 'Guardado para a próxima carreira!'; } },
  { id: 'slot4', t: '4º espaço de carreira', d: () => 'Mais um espaço para salvar outra carreira.', p: 200, ok: () => !owns('slot4') && !isVip(), why: 'Você já tem.', go: () => { W.own.push('slot4'); if (!SLOTS.includes('slot4')) SLOTS.push('slot4'); return 'Novo espaço de carreira liberado!'; } },
  { id: 'slot5', t: '5º espaço de carreira', d: () => 'Mais um espaço para salvar outra carreira.', p: 300, ok: () => !owns('slot5') && !isVip() && (owns('slot4')), why: 'Compre o 4º espaço antes.', go: () => { W.own.push('slot5'); if (!SLOTS.includes('slot5')) SLOTS.push('slot5'); return 'Novo espaço de carreira liberado!'; } },
];
export function turboUse() { if (!W.turbo) return null; W.turbo = 0; wsave(); return { money: 500000, rep: 5 }; }
export const scoutOn = () => !!(S.G && S.G._pfScout === S.G.year);

// ---------- pacotes do Pix ----------
export const PACKS = [
  { id: 'p100', pf: 100, brl: 4.9 }, { id: 'p330', pf: 330, brl: 12.9, tag: '+10%' }, { id: 'p800', pf: 800, brl: 24.9, tag: '+20%' }, { id: 'p1900', pf: 1900, brl: 49.9, tag: 'Melhor valor' },
];
export const KITS = [
  { id: 'kit_ouro', n: 'Kit Ouro', brl: 24.9, pf: 300, items: ['fr_ouro', 'em_aguia'] },
  { id: 'kit_lenda', n: 'Kit Lenda', brl: 99.9, pf: 1000, items: ['fr_lenda', 'em_dragao', 'ban_ouro'] },
];
export const VIP_PACK = { id: 'vip30', vip: 30, brl: 9.9, pf: 900 };
const brl = (v) => 'R$ ' + v.toFixed(2).replace('.', ',');

// ---------- evento ativo (vem do Lumbra Control, ver eventos.js) ----------
const evNow = () => window.PEV?.active?.() || null;
const buyable = (it) => it.p > 0 && (!it.ev || (evNow() && evNow().theme === it.ev && evNow().shop !== false));
const priceOf = (it) => it.p;
const RAS = ['comum', 'raro', 'epico', 'lendario', 'exclusivo', 'evento'];

// ---------- tela da loja ----------
let TAB = 'dest';
const TABS = [['dest', 'Destaques'], ['fr', 'Molduras'], ['em', 'Emblemas'], ['ban', 'Faixas'], ['tit', 'Títulos'], ['mais', 'Gol, temas e cards'], ['col', 'Minha coleção'], ['car', 'Itens de carreira'], ['comprar', 'Pranfixas'], ['socio', 'Sócio'], ['ganhar', 'Ganhar grátis']];
export const SHOP_VER = 61;
export const shopIsNew = () => (W.seenShop || 0) < SHOP_VER || !!(evNow() && W.seenEv !== evNow().id);
H.tloja = (v) => {
  if (v) TAB = v === 'visual' ? 'fr' : v; W.seenShop = SHOP_VER; if (evNow()) W.seenEv = evNow().id; wsave(); document.querySelectorAll('.shop-new').forEach((e) => e.remove());
  if (document.querySelector('.pf-shop')) replaceSheet(shopHtml()); else openSheet(shopHtml()).parentElement.classList.add('wide', 'shop-bg');
};
H.pftab = (v) => { TAB = v; replaceSheet(shopHtml()); document.querySelector('.pf-tabs .on')?.scrollIntoView({ inline: 'center', block: 'nearest' }); };
const lookNow = () => myLook();
function card(it, i = 0) {
  const o = has(it.id), on = W.eq[it.k] === it.id, R = RARITY[it.ra];
  let act;
  if (o) act = on ? '<span class="it-on">Em uso</span>' : '<span class="it-use">Usar</span>';
  else if (buyable(it)) act = pfTag(priceOf(it));
  else act = `<span class="it-lock">${it.ev ? 'Evento ' + esc(EVENTS[it.ev].t) : 'Exclusivo'}</span>`;
  return `<button class="it-card ra-${it.ra} ${o ? 'own' : ''} ${on ? 'on' : ''}" data-a="itopen" data-v="${it.id}" style="--rc:${R.c};--d:${Math.min(i, 16) * 0.035}s"><span class="it-prev">${preview(it, lookNow(), nickName(), 58)}</span><b>${esc(it.n)}</b><small style="color:${R.c}">${R.t}</small><span class="it-act">${act}</span></button>`;
}
const grid = (list) => `<div class="it-grid">${list.map(card).join('')}</div>`;
function shopHtml() {
  let body = '';
  const ev = evNow(); const sort = (a, b) => RAS.indexOf(a.ra) - RAS.indexOf(b.ra) || a.p - b.p;
  if (TAB === 'dest') {
    const evItems = ev ? CAT.filter((x) => x.ev === ev.theme) : [];
    const top = ['fr_lenda', 'em_dragao', 'ban_fogos', 'g_fogo', 'fr_neon', 'em_fenix', 'em_coroa', 'ban_ouro'].map(item);
    body = `${ev ? `<div class="sh-ev" style="--e1:${EVENTS[ev.theme]?.c || '#f4c542'};--e2:${EVENTS[ev.theme]?.c2 || '#0b1210'}"><div class="grow"><small>EVENTO · termina ${new Date(ev.to).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</small><b>${esc(ev.name)}</b><span class="xs">Itens que só aparecem durante o evento</span></div><button class="btn sm" data-a="evopen">Missões</button></div>${grid(evItems)}` : ''}
    <div class="sh-hero"><div class="sh-hero-av">${cavatar({ ...lookNow(), n: nickName() }, 92)}</div><div class="grow"><small>SEU VISUAL</small><b>${esc(nickName())}</b><div>${titleTag(lookNow().tit)}</div><div class="xs mut" style="margin-top:4px">Moldura, emblema, faixa e título aparecem no ranking, no Desafio, na liga e no seu card.</div></div></div>
    <h3>Mais desejados</h3>${grid(top)}
    <h3>Kits</h3><div class="kit-row">${KITS.map((k) => `<div class="kit"><div class="kit-p">${k.items.map((id) => `<span>${preview(item(id), lookNow(), nickName(), 46)}</span>`).join('')}</div><b>${k.n}</b><small>${k.items.map((id) => item(id).n).join(' + ')} + ${k.pf} Pranfixas</small>${payUrl() ? `<button class="btn pri sm" data-a="pfbuy" data-v="${k.id}">${brl(k.brl)} no Pix</button>` : '<span class="xs mut">Em breve</span>'}</div>`).join('')}</div>`;
  }
  if (['fr', 'em', 'ban', 'tit'].includes(TAB)) body = `${TAB === 'fr' ? '<p class="xs mut">Cada nível tem uma animação mais caprichada que o anterior. Toque para ver de perto.</p>' : ''}${grid(CAT.filter((x) => x.k === TAB && (!x.ev || buyable(x) || has(x.id))).sort(sort))}`;
  if (TAB === 'mais') body = `<h3>Comemoração de gol <span class="xs mut">(partida 3D, só nos gols do seu time)</span></h3>${grid(CAT.filter((x) => x.k === 'gfx'))}<h3>Temas da tela inicial</h3>${grid(CAT.filter((x) => x.k === 'th'))}<h3>Card de compartilhar</h3>${grid(CAT.filter((x) => x.k === 'cd'))}`;
  if (TAB === 'col') {
    const total = CAT.length, mine = CAT.filter((x) => has(x.id)).length;
    body = `<div class="col-hd"><b>${mine}</b><span>de ${total} itens</span><div class="col-bar"><i style="width:${Math.round((mine / total) * 100)}%"></i></div></div>${Object.entries(KINDS).map(([k, t]) => { const L = CAT.filter((x) => x.k === k); return `<h3>${t}s <span class="xs mut">${L.filter((x) => has(x.id)).length}/${L.length}</span></h3><div class="col-grid">${L.map((it) => `<button class="col-it ${has(it.id) ? '' : 'miss'}" data-a="itopen" data-v="${it.id}" style="--rc:${RARITY[it.ra].c}"><span>${preview(it, lookNow(), nickName(), 40)}</span>${has(it.id) ? '' : '<i>?</i>'}</button>`).join('')}</div>`; }).join('')}`;
  }
  if (TAB === 'car') body = `<div class="pf-grid">${ITEMS.map((it) => { const can = it.ok(); return `<div class="pf-item ${can ? '' : 'off'}"><b>${esc(it.t)}</b><small>${esc(it.d())}</small>${can ? '' : `<small class="pf-why">${esc(it.career && !S.G ? 'Abra uma carreira para usar.' : it.why)}</small>`}<div class="row" style="gap:6px;margin-top:auto"><span class="grow">${pfTag(isVip() && it.id === 'verba' ? it.p / 2 : it.p)}</span>${can ? `<button class="btn sm pri" data-a="pfitem" data-v="${it.id}">Usar</button>` : ''}</div></div>`; }).join('')}</div>`;
  if (TAB === 'comprar') body = payUrl() ? `<div class="pf-packs">${PACKS.map((p, i) => `<button class="pf-pack" data-a="pfbuy" data-v="${p.id}" style="--d:${i * 0.06}s">${p.tag ? `<i>${p.tag}</i>` : ''}<div class="pf-stack">${PF_SVG.repeat(Math.min(4, i + 1))}</div><b>${p.pf}</b><small>Pranfixas</small><span>${brl(p.brl)}</span></button>`).join('')}</div><div class="xs mut" style="margin-top:8px">Pagamento por Pix com confirmação automática. As Pranfixas ficam neste aparelho e valem para todas as carreiras.</div>`
    : `<div class="hint">A compra pelo Pix ainda não foi liberada. Enquanto isso, ganhe Pranfixas grátis na aba "Ganhar grátis".</div>`;
  if (TAB === 'socio') body = `<div class="pf-vipcard ${isVip() ? 'on' : ''}"><div class="row" style="gap:12px;align-items:center"><div>${cavatar({ fr: 'ex_socio', em: 'em_escudo', n: nickName() }, 70)}</div><div class="pf-vip-h"><b>SÓCIO PRANCHETA</b><small>${isVip() ? `Ativo até ${new Date(W.vip).toLocaleDateString('pt-BR')}` : '30 dias'}</small></div></div>
    <ul><li>Moldura e emblema exclusivos de Sócio</li><li>Bônus diário em dobro</li><li>8 anúncios por dia em vez de 5</li><li>Verba extra pela metade do preço</li><li>4º e 5º espaços de carreira</li><li>Selo dourado no ranking e no perfil</li><li>Tentativas extras no Desafio da Semana</li></ul>
    <div class="row" style="gap:8px">${payUrl() ? `<button class="btn pri grow" data-a="pfbuy" data-v="vip30">Assinar no Pix · ${brl(VIP_PACK.brl)}</button>` : ''}<button class="btn grow" data-a="pfvip">Trocar por ${pfTag(VIP_PACK.pf)}</button></div></div>`;
  if (TAB === 'ganhar') body = `<div class="pf-earn">
    <div class="li"><span class="grow"><b>Bônus diário</b><div class="xs mut">Até ${DAILY[6]} por dia na sequência de 7 dias${ev?.bonus?.daily > 1 ? ' · <b class="gold">em dobro no evento!</b>' : ''}</div></span>${dailyReady() ? '<button class="btn sm pri" data-a="pfdailyo">Pegar</button>' : '<span class="xs mut">Pego hoje ✓</span>'}</div>
    <div class="li"><span class="grow"><b>Anúncio com recompensa</b><div class="xs mut">${adOk() ? `+${AD_PF} cada · faltam ${adsLeft()} hoje` : 'Só no app do Prancheta'}</div></span>${adBtn('Ver')}</div>
    ${ev ? `<div class="li"><span class="grow"><b>Missões do evento ${esc(ev.name)}</b><div class="xs mut">Pranfixas e itens exclusivos</div></span><button class="btn sm pri" data-a="evopen">Ver</button></div>` : ''}
    <div class="li"><span class="grow"><b>Desafio da Semana</b><div class="xs mut">Pranfixas e moldura exclusiva para o 1º lugar</div></span><button class="btn sm" data-a="tonline" data-v="desafio">Jogar</button></div>
    <div class="li"><span class="grow"><b>Conquistas online</b><div class="xs mut">Cada conquista dá Pranfixas e algumas dão itens</div></span><button class="btn sm" data-a="tonline" data-v="perfil">Ver</button></div>
    <div class="li"><span class="grow"><b>Conquistas na carreira</b><div class="xs mut">Títulos e temporadas completas dão Pranfixas</div></span></div>
    <div class="li"><span class="grow"><b>Liga com amigos</b><div class="xs mut">Vitórias e título da liga online</div></span><button class="btn sm" data-a="tonline" data-v="liga">Abrir</button></div></div>
    <h3 style="margin-top:10px">Histórico</h3><div class="list">${W.log.slice(0, 12).map((l) => `<div class="li sm"><span class="grow xs">${esc(l.why)}</span><b class="${l.n > 0 ? 'good' : 'bad'}">${l.n > 0 ? '+' : ''}${l.n}</b></div>`).join('') || '<div class="xs mut">Nada ainda.</div>'}</div>`;
  return `<div class="pf-shop"><div class="pf-hd"><div class="pf-bal">${PF_SVG}<div><b class="pf-n">${pf()}</b><small>Pranfixas</small></div></div>${isVip() ? '<span class="pf-vipb">SÓCIO</span>' : ''}<button class="btn sm pri" data-a="pftab" data-v="comprar">+ Pranfixas</button></div>
  <div class="pf-tabs">${TABS.map(([k, t]) => `<button class="${TAB === k ? 'on' : ''}" data-a="pftab" data-v="${k}">${t}${k === 'dest' && ev ? ' <i class="dot"></i>' : ''}</button>`).join('')}</div><div class="pf-body">${body}</div></div>`;
}
// detalhe do item com prévia grande
H.itopen = (id) => {
  const it = item(id); if (!it) return; const o = has(id), R = RARITY[it.ra]; const L = { ...myLook() }; if (['fr', 'em', 'ban', 'tit'].includes(it.k)) L[it.k] = id;
  const row = `<div class="on-row ${bannerCls(L.ban)}" style="${bannerStyle(L.ban)}">${bannerFx(L.ban)}<span class="on-p">1</span>${cavatar({ ...L, n: nickName() }, 40)}<span class="grow ell"><b>${esc(nickName())}</b><small>${titleTag(L.tit) || 'Seu clube'}</small></span><span class="on-sc">9999</span></div>`;
  openSheet(`<div class="it-detail" style="--rc:${R.c}"><div class="it-big">${it.k === 'fr' || it.k === 'em' ? cavatar({ ...L, n: nickName() }, 140) : preview(it, L, nickName(), 140)}</div>
  <small class="it-ra" style="color:${R.c}">${R.t.toUpperCase()} · ${KINDS[it.k].toUpperCase()}</small><h2>${esc(it.n)}</h2>
  ${['fr', 'em', 'ban', 'tit'].includes(it.k) ? `<div class="xs mut" style="margin:6px 0 4px">Assim fica no ranking:</div>${row}` : ''}
  <div class="row" style="gap:8px;margin-top:12px">${o ? (W.eq[it.k] === id ? `<button class="btn grow" data-a="itequip" data-v="${it.k}:">Tirar</button>` : `<button class="btn pri big grow" data-a="itequip" data-v="${it.k}:${id}">Usar agora</button>`)
    : buyable(it) ? `<button class="btn pri big grow" data-a="itbuy" data-v="${id}">Comprar por ${pfTag(priceOf(it))}</button>` : `<div class="hint grow">${esc(it.how || (it.ev ? `Aparece durante o evento ${EVENTS[it.ev].t}.` : 'Item exclusivo.'))}</div>`}</div></div>`).parentElement.classList.add('it-sheet');
};
H.itbuy = (id) => {
  const it = item(id); if (!it || has(id) || !buyable(it)) return; if (!pfSpend(priceOf(it), it.n)) return;
  W.own.push(id); W.eq[it.k] = id; wsave(); closeSheet(); afterEquip(it.k); itemFx(it, 'Agora é seu!'); if (document.querySelector('.pf-shop')) replaceSheet(shopHtml());
};
H.itequip = (v) => { const [k, id] = v.split(':'); if (id && !has(id)) return; W.eq[k] = id || ''; wsave(); closeSheet(); afterEquip(k); if (document.querySelector('.pf-shop')) replaceSheet(shopHtml()); centerNote(id ? 'Visual atualizado!' : 'Item retirado.', 1300); };
function afterEquip(k) { try { window.PONLINE_SYNC?.(); } catch {} if (k === 'th') { const t = document.querySelector('.rc-title'); if (t) t.className = 'rc-title ' + (eq('th') || ''); } if (S.G) render(); }
H.pfdailyo = () => replaceSheet(dailyHtml());
H.pfitem = (id) => {
  const it = ITEMS.find((x) => x.id === id); if (!it || !it.ok()) return; const price = isVip() && id === 'verba' ? it.p / 2 : it.p;
  if (!pfSpend(price, it.t)) return; const r = it.go(); wsave(); if (S.G) { save(true); render(); } replaceSheet(shopHtml()); centerNote(r, 2200);
};
H.pfvip = () => { if (!pfSpend(VIP_PACK.pf, 'Sócio Prancheta (30 dias)')) return; giveVip(30); replaceSheet(shopHtml()); };
function giveVip(days) { W.vip = Math.max(Date.now(), W.vip || 0) + days * 864e5; wsave(); for (const s of ['slot4', 'slot5']) if (!SLOTS.includes(s)) SLOTS.push(s); centerNote('Agora você é Sócio Prancheta!', 2600); }

// ---------- compra no Pix (servidor da Lumbra no Cloudflare + Mercado Pago) ----------
let POLL = null;
H.pfbuy = async (id) => {
  const url = payUrl(); if (!url) return; const pk = id === 'vip30' ? VIP_PACK : PACKS.find((p) => p.id === id) || KITS.find((p) => p.id === id); if (!pk) return;
  replaceSheet(`<div class="pf-pix"><h2>Gerando o Pix…</h2><div class="pf-spin"></div></div>`);
  try {
    const uid = window.LumbraAnalytics?.uid || W.dev || (W.dev = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
    const r = await fetch(url + '/pix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pack: id, uid }) });
    const j = await r.json(); if (!r.ok || !j.id) throw new Error(j.error || r.status);
    W.pend = (W.pend || []).filter((p) => Date.now() - p.at < 864e5); W.pend.push({ id: String(j.id), pack: id, at: Date.now() }); wsave();
    replaceSheet(pixHtml(j, pk)); startPoll(String(j.id));
  } catch (e) { replaceSheet(`<div class="pf-pix"><h2>Não deu para gerar o Pix</h2><p class="sm mut">Confira sua internet e tente de novo. (${esc(String(e.message || e).slice(0, 60))})</p><button class="btn pri blk" data-a="tloja" data-v="comprar">Voltar</button></div>`); }
};
function pixHtml(j, pk) {
  return `<div class="pf-pix"><h2>Pague com Pix</h2><div class="xs mut">${pk.vip ? 'Sócio Prancheta · 30 dias' : pk.items ? esc(pk.n) : `${pk.pf} Pranfixas`} · <b>${brl(pk.brl)}</b></div>
  <div class="pf-qr">${j.b64 ? `<img src="data:image/png;base64,${j.b64}" alt="QR Code do Pix">` : ''}</div>
  <div class="field"><label>Pix copia e cola</label><textarea id="pixcode" rows="3" readonly style="width:100%;font-size:11px">${esc(j.qr || '')}</textarea></div>
  <button class="btn pri blk" data-a="pixcopy">Copiar código Pix</button>
  <ol class="xs mut pf-steps"><li>Copie o código e abra o app do seu banco.</li><li>Escolha Pix → Pix copia e cola e cole o código.</li><li>Pague e volte aqui: as Pranfixas chegam sozinhas.</li></ol>
  <div class="pf-wait" id="pixst"><span class="pf-dot"></span> Aguardando o pagamento…</div></div>`;
}
H.pixcopy = () => { const t = document.getElementById('pixcode')?.value || ''; let ok = false; try { if (window.PranchetaNative?.copy) { window.PranchetaNative.copy(t); ok = true; } } catch {} if (!ok) { try { navigator.clipboard.writeText(t); ok = true; } catch {} } if (!ok) { const el = document.getElementById('pixcode'); el?.select(); try { document.execCommand('copy'); } catch {} } centerNote('Código Pix copiado!', 1600); };
function startPoll(id) { clearInterval(POLL); let n = 0; POLL = setInterval(async () => { if (++n > 200 || !document.getElementById('pixst')) { clearInterval(POLL); return; } if (await checkPay(id)) clearInterval(POLL); }, 4000); }
async function checkPay(id) {
  const url = payUrl(); if (!url || W.claimed.includes(id)) return true;
  try {
    const r = await fetch(url + '/status?id=' + encodeURIComponent(id)); const j = await r.json();
    if (j.status === 'approved' && !W.claimed.includes(id)) {
      W.claimed.push(id); W.pend = (W.pend || []).filter((p) => p.id !== id); wsave();
      closeSheet(true);
      if (j.vip) giveVip(+j.vip || 30); else if (+j.pf) pfAdd(+j.pf, 'Compra no Pix');
      const kit = KITS.find((k) => k.id === j.pack); for (const it of (Array.isArray(j.items) ? j.items : kit ? kit.items : [])) grant(it, 'Compra no Pix');
      try { window.LumbraAnalytics?.event('pix_pago', { pack: String(j.pack || ''), v: +j.brl || 0 }); } catch {}
      return true;
    }
    if (j.status === 'cancelled' || j.status === 'rejected' || j.status === 'expired') { W.pend = (W.pend || []).filter((p) => p.id !== id); wsave(); const el = document.getElementById('pixst'); if (el) el.textContent = 'Este Pix expirou. Gere outro.'; return true; }
  } catch {}
  return false;
}
// confere pagamentos que ficaram pendentes (pessoa pagou e fechou o jogo)
export async function pixPending() { for (const p of [...(W.pend || [])]) { if (Date.now() - p.at > 864e5) continue; await checkPay(p.id); } }

// ---------- conquistas da carreira viram Pranfixas ----------
export function careerRewards(G) {
  if (!G || !G.me) return;
  const nt = G.me.titles?.length || 0;
  if (G._pfT == null) { G._pfT = nt; G._pfY = G.year; G._pfUp = G._pfUp || 0; return; }
  if (nt > G._pfT) { const fresh = G.me.titles.slice(G._pfT); let v = 0; for (const t of fresh) { v += 30 + clamp((t.w || 3) * 6, 0, 120); try { window.PONTITLE?.(t); } catch {} } G._pfT = nt; pfAdd(v, fresh.length > 1 ? `${fresh.length} títulos conquistados` : `Título: ${fresh[0].c}`); setTimeout(() => titleCta(fresh[fresh.length - 1]), 2600); }
  const st = G.me.stats || {}; if (G._pfV == null) { G._pfV = st.v || 0; G._pfJ = st.j || 0; }
  if ((st.v || 0) > G._pfV) { const d = st.v - G._pfV; G._pfV = st.v; try { for (let i = 0; i < Math.min(d, 5); i++) window.PONTWIN?.(); window.PEV?.track('vit', d); } catch {} }
  if ((st.j || 0) > G._pfJ) { const d = st.j - G._pfJ; G._pfJ = st.j; try { window.PEV?.track('jogos', d); } catch {} }
  if (G.year > G._pfY) { G._pfY = G.year; pfAdd(20, 'Temporada completa'); }
}
window.PPF = { add: pfAdd, spend: pfSpend, bal: pf, vip: isVip, W, frame: () => eq('fr'), watchAd };
window.PPFCHIP = pfChip; window.PCAREER = careerRewards;
// depois de um título: chamar para o ranking e para compartilhar o card
function titleCta(t, tries = 0) {
  if (!t || tries > 60) return;
  if (document.querySelector('.modal-bg, .title-anim, .tanim, .awards, .lc, #live, .sign-anim, .intro, .pcenter, .pf-fx')) { setTimeout(() => titleCta(t, tries + 1), 1500); return; }
  openSheet(`<div class="tcta"><div class="tcta-cup">🏆</div><small>CAMPEÃO</small><h2>${esc(t.c)}</h2><p class="sm mut">Esse título já conta no ranking geral e nos pontos da sua temporada online.</p><div class="row" style="gap:8px"><button class="btn pri grow" data-a="tcta" data-v="rank">Ver minha posição no ranking</button><button class="btn grow" data-a="tcta" data-v="card">Compartilhar card</button></div></div>`);
}
H.tcta = (v) => { closeSheet(); if (v === 'rank') H.tonline('rank'); else { H.tonline('perfil'); setTimeout(() => H.onshare?.(), 400); } };
