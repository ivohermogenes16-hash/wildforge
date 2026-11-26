// Pranfixas: moeda especial do Prancheta. Fica no aparelho e vale para todas as carreiras.
// Ganha: bônus diário, conquistas na carreira, Desafio da Semana, liga online, anúncio com recompensa e compra no Pix.
import { S, H, render, openSheet, closeSheet, replaceSheet, centerNote, save } from './app.js';
import { esc, money, clamp } from '../util.js';
import { SLOTS } from '../store.js';

const K = 'prancheta.pf';
function load() { const d = { bal: 0, own: [], claimed: [], pend: [], log: [] }; try { return { ...d, ...JSON.parse(localStorage.getItem(K) || '{}') }; } catch { return d; } }
export const W = load();
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
export function dailyReady() { return W.day !== today(); }
export function dailyCheck() { if (dailyReady()) setTimeout(() => { if (!document.querySelector('.modal-bg')) openSheet(dailyHtml()); }, 1400); }
function dailyHtml() {
  const y = new Date(Date.now() - 864e5); const yk = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
  const st = dailyReady() ? (W.day === yk ? (W.streak || 0) % 7 : 0) : ((W.streak || 1) - 1) % 7; const ready = dailyReady();
  return `<div class="pf-daily"><h2>Bônus diário</h2><p class="xs mut">Entre todo dia para ganhar mais. No 7º dia vem o prêmio grande.${isVip() ? ' <b class="gold">Sócio ganha em dobro.</b>' : ''}</p>
  <div class="pf-days">${DAILY.map((v, i) => `<div class="pf-day ${i < st ? 'got' : i === st ? (ready ? 'now' : 'got') : ''}" style="--d:${i * 0.06}s"><small>Dia ${i + 1}</small>${PF_SVG}<b>${v * (isVip() ? 2 : 1)}</b></div>`).join('')}</div>
  ${ready ? `<button class="btn pri big blk" data-a="pfdaily">Pegar ${DAILY[st] * (isVip() ? 2 : 1)} Pranfixas</button>` : '<div class="hint">Você já pegou o bônus de hoje. Volte amanhã!</div>'}</div>`;
}
H.pfdaily = () => {
  if (!dailyReady()) return; const y = new Date(Date.now() - 864e5); const yk = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
  W.streak = W.day === yk ? (W.streak || 0) + 1 : 1; W.day = today(); const v = DAILY[(W.streak - 1) % 7] * (isVip() ? 2 : 1); wsave();
  closeSheet(); pfAdd(v, `Bônus diário · dia ${((W.streak - 1) % 7) + 1}`);
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
const FRAMES = [
  ['fr_bronze', 'Moldura Bronze', 60, '#c07a3a'], ['fr_prata', 'Moldura Prata', 140, '#c9d2dc'], ['fr_ouro', 'Moldura Ouro', 280, '#f5c542'],
  ['fr_neon', 'Moldura Neon', 450, '#2ff3c5'], ['fr_lenda', 'Moldura Lenda', 900, '#b36bff'],
];
export const frameColor = (id) => (FRAMES.find((f) => f[0] === id) || [])[3] || '';
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
export const VIP_PACK = { id: 'vip30', vip: 30, brl: 9.9, pf: 900 };
const brl = (v) => 'R$ ' + v.toFixed(2).replace('.', ',');

// ---------- tela da loja ----------
let TAB = 'loja';
H.tloja = (v) => { if (v) TAB = v; if (document.querySelector('.pf-shop')) replaceSheet(shopHtml()); else openSheet(shopHtml()).parentElement.classList.add('wide'); };
H.pftab = (v) => { TAB = v; replaceSheet(shopHtml()); };
function shopHtml() {
  const tabs = [['loja', 'Loja'], ['comprar', 'Comprar'], ['socio', 'Sócio'], ['visual', 'Molduras'], ['ganhar', 'Ganhar grátis']];
  let body = '';
  if (TAB === 'loja') body = `<div class="pf-grid">${ITEMS.map((it) => { const can = it.ok(); return `<div class="pf-item ${can ? '' : 'off'}"><b>${esc(it.t)}</b><small>${esc(it.d())}</small>${can ? '' : `<small class="pf-why">${esc(it.career && !S.G ? 'Abra uma carreira para usar.' : it.why)}</small>`}<div class="row" style="gap:6px;margin-top:auto"><span class="grow">${pfTag(isVip() && it.id === 'verba' ? it.p / 2 : it.p)}</span>${can ? `<button class="btn sm pri" data-a="pfitem" data-v="${it.id}">Usar</button>` : ''}</div></div>`; }).join('')}</div>`;
  if (TAB === 'comprar') body = payUrl() ? `<div class="pf-packs">${PACKS.map((p, i) => `<button class="pf-pack" data-a="pfbuy" data-v="${p.id}" style="--d:${i * 0.06}s">${p.tag ? `<i>${p.tag}</i>` : ''}<div class="pf-stack">${PF_SVG.repeat(Math.min(4, i + 1))}</div><b>${p.pf}</b><small>Pranfixas</small><span>${brl(p.brl)}</span></button>`).join('')}</div><div class="xs mut" style="margin-top:8px">Pagamento por Pix com confirmação automática. As Pranfixas ficam neste aparelho e valem para todas as carreiras.</div>`
    : `<div class="hint">A compra pelo Pix ainda não foi liberada. Enquanto isso, ganhe Pranfixas grátis na aba "Ganhar grátis".</div>`;
  if (TAB === 'socio') body = `<div class="pf-vipcard ${isVip() ? 'on' : ''}"><div class="pf-vip-h"><b>SÓCIO PRANCHETA</b><small>${isVip() ? `Ativo até ${new Date(W.vip).toLocaleDateString('pt-BR')}` : '30 dias'}</small></div>
    <ul><li>Bônus diário em dobro</li><li>8 anúncios por dia em vez de 5</li><li>Verba extra pela metade do preço</li><li>4º e 5º espaços de carreira</li><li>Selo dourado de Sócio no ranking e no perfil</li><li>Tentativas extras no Desafio da Semana</li></ul>
    <div class="row" style="gap:8px">${payUrl() ? `<button class="btn pri grow" data-a="pfbuy" data-v="vip30">Assinar no Pix · ${brl(VIP_PACK.brl)}</button>` : ''}<button class="btn grow" data-a="pfvip">Trocar por ${pfTag(VIP_PACK.pf)}</button></div></div>`;
  if (TAB === 'visual') body = `<p class="xs mut">A moldura aparece no seu perfil, no ranking geral, na liga com amigos e no card de compartilhar.</p><div class="pf-frames">${FRAMES.map(([id, t, p, col]) => { const o = owns(id); const eq = W.frame === id; return `<div class="pf-frame ${eq ? 'eq' : ''}" style="--fc:${col}"><span class="pf-av">${esc((S.G?.me.name || 'T')[0])}</span><b>${t}</b>${o ? `<button class="btn sm ${eq ? '' : 'pri'}" data-a="pfframe" data-v="${eq ? '' : id}">${eq ? 'Tirar' : 'Usar'}</button>` : `<button class="btn sm" data-a="pfframebuy" data-v="${id}">${pfTag(p)}</button>`}</div>`; }).join('')}</div>`;
  if (TAB === 'ganhar') body = `<div class="pf-earn">
    <div class="li"><span class="grow"><b>Bônus diário</b><div class="xs mut">Até ${DAILY[6]} por dia na sequência de 7 dias</div></span>${dailyReady() ? '<button class="btn sm pri" data-a="pfdailyo">Pegar</button>' : '<span class="xs mut">Pego hoje ✓</span>'}</div>
    <div class="li"><span class="grow"><b>Anúncio com recompensa</b><div class="xs mut">${adOk() ? `+${AD_PF} cada · faltam ${adsLeft()} hoje` : 'Só no app do Prancheta'}</div></span>${adBtn('Ver')}</div>
    <div class="li"><span class="grow"><b>Desafio da Semana</b><div class="xs mut">Até 300 para os melhores do ranking da semana</div></span><button class="btn sm" data-a="tonline" data-v="desafio">Jogar</button></div>
    <div class="li"><span class="grow"><b>Conquistas na carreira</b><div class="xs mut">Títulos e temporadas completas dão Pranfixas</div></span></div>
    <div class="li"><span class="grow"><b>Liga com amigos</b><div class="xs mut">Vitórias e título da liga online</div></span><button class="btn sm" data-a="tonline" data-v="liga">Abrir</button></div></div>
    <h3 style="margin-top:10px">Histórico</h3><div class="list">${W.log.slice(0, 12).map((l) => `<div class="li sm"><span class="grow xs">${esc(l.why)}</span><b class="${l.n > 0 ? 'good' : 'bad'}">${l.n > 0 ? '+' : ''}${l.n}</b></div>`).join('') || '<div class="xs mut">Nada ainda.</div>'}</div>`;
  return `<div class="pf-shop"><div class="pf-hd"><div class="pf-bal">${PF_SVG}<div><b class="pf-n">${pf()}</b><small>Pranfixas</small></div></div>${isVip() ? '<span class="pf-vipb">SÓCIO</span>' : ''}<button class="btn sm ghost" data-a="cs">Fechar</button></div>
  <div class="seg pf-tabs">${tabs.map(([k, t]) => `<button class="${TAB === k ? 'on' : ''}" data-a="pftab" data-v="${k}">${t}</button>`).join('')}</div>${body}</div>`;
}
H.pfdailyo = () => replaceSheet(dailyHtml());
H.pfitem = (id) => {
  const it = ITEMS.find((x) => x.id === id); if (!it || !it.ok()) return; const price = isVip() && id === 'verba' ? it.p / 2 : it.p;
  if (!pfSpend(price, it.t)) return; const r = it.go(); wsave(); if (S.G) { save(true); render(); } replaceSheet(shopHtml()); centerNote(r, 2200);
};
H.pfvip = () => { if (!pfSpend(VIP_PACK.pf, 'Sócio Prancheta (30 dias)')) return; giveVip(30); replaceSheet(shopHtml()); };
function giveVip(days) { W.vip = Math.max(Date.now(), W.vip || 0) + days * 864e5; wsave(); for (const s of ['slot4', 'slot5']) if (!SLOTS.includes(s)) SLOTS.push(s); centerNote('Agora você é Sócio Prancheta!', 2600); }
H.pfframe = (v) => { W.frame = v || ''; wsave(); replaceSheet(shopHtml()); try { window.PONLINE_SYNC?.(); } catch {} };
H.pfframebuy = (id) => { const f = FRAMES.find((x) => x[0] === id); if (!f || owns(id)) return; if (!pfSpend(f[2], f[1])) return; W.own.push(id); W.frame = id; wsave(); replaceSheet(shopHtml()); try { window.PONLINE_SYNC?.(); } catch {} };

// ---------- compra no Pix (servidor da Lumbra no Cloudflare + Mercado Pago) ----------
let POLL = null;
H.pfbuy = async (id) => {
  const url = payUrl(); if (!url) return; const pk = id === 'vip30' ? VIP_PACK : PACKS.find((p) => p.id === id); if (!pk) return;
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
  return `<div class="pf-pix"><h2>Pague com Pix</h2><div class="xs mut">${pk.vip ? 'Sócio Prancheta · 30 dias' : `${pk.pf} Pranfixas`} · <b>${brl(pk.brl)}</b></div>
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
  if (nt > G._pfT) { const fresh = G.me.titles.slice(G._pfT); let v = 0; for (const t of fresh) v += 30 + clamp((t.w || 3) * 6, 0, 120); G._pfT = nt; pfAdd(v, fresh.length > 1 ? `${fresh.length} títulos conquistados` : `Título: ${fresh[0].c}`); }
  if (G.year > G._pfY) { G._pfY = G.year; pfAdd(20, 'Temporada completa'); }
}
window.PPF = { add: pfAdd, spend: pfSpend, bal: pf, vip: isVip, W, frame: () => W.frame || '', watchAd };
window.PPFCHIP = pfChip; window.PCAREER = careerRewards;
