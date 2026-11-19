// Pacotes: instalar (arquivo ou link), exportar e assistente de escudos. Tudo fica só no aparelho de quem instala.
import { esc } from '../util.js';
import { S, H, render, toast, openSheet, closeSheet, replaceSheet, save, PAGES, PAGES_T, PAGES_BACK } from './app.js';
import { crest } from './art.js';
import { setImage, fileToDataUrl, IMG } from '../store.js';
import { LEAGUES, COUNTRIES, CLUBS } from '../data/leagues.js';
let PKW = null;
function GG() { if (S.G) return S.G; if (!PKW) { const clubs = []; let id = 0; for (const L of LEAGUES) for (const r of CLUBS[L.id]) clubs.push({ id: id++, key: r[0], name: r[0], short: r[1], city: r[2], c1: r[3], c2: r[4], rep: r[5], league: L.id }); PKW = { clubs, players: [] }; } return PKW; }
const rerender = () => { if (S.G) render(); else replaceSheet(PAGES.pacotes()); };
H.tpack = () => openSheet(PAGES.pacotes());
import { unzip, crestIndex } from './editor.js';

const PKEY = 'prancheta.packs';
const packs = () => { try { return JSON.parse(localStorage.getItem(PKEY) || '[]'); } catch { return []; } };
const setPacks = (a) => { try { localStorage.setItem(PKEY, JSON.stringify(a.slice(-30))); } catch {} };
const blobToDataUrl = (b) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(b); });

// ---------- aplicar um pacote (.json ou .zip com imagens + pacote.json) ----------
async function applyPack(G, data, imgs, name) {
  const find = crestIndex(G); let crests = 0, clubs = 0, players = 0; const miss = [];
  const byKey = new Map(G.clubs.filter(Boolean).map((c) => [c.key, c]));
  const clubOf = (k) => byKey.get(k) || find(k + '.png');
  for (const [k, url] of Object.entries(data?.crests || {})) { const c = clubOf(k); if (!c) { miss.push(k); continue; } await setImage('c:' + c.key, url); crests++; }
  for (const it of imgs || []) { if (/(^|\/)pacote\.json$/i.test(it.name)) continue; const c = find(it.name); if (!c) { miss.push(it.name.replace(/^.*\//, '')); continue; } try { await setImage('c:' + c.key, await fileToDataUrl(it.blob, 160)); crests++; } catch { miss.push(it.name); } }
  for (const [k, o] of Object.entries(data?.clubs || {})) { const c = clubOf(k); if (!c) continue; if (o.name) c.name = o.name; if (o.short) c.short = o.short; if (o.c1) c.c1 = o.c1; if (o.c2) c.c2 = o.c2; if (o.stad) c.stad = o.stad; clubs++; }
  if (data?.players?.length && G) { const by = {}; for (const r of data.players) (by[r.club] ||= []).push(r);
    for (const [k, rows] of Object.entries(by)) { const c = clubOf(k); if (!c) continue; const sq = G.players.filter((p) => p && p.club === c.id && !p.u20).sort((a, b) => b.ovr - a.ovr);
      rows.forEach((r, i) => { const p = sq[i]; if (!p) return; if (r.n) p.n = r.n; if (r.pos) p.pos = r.pos; if (+r.age) p.age = +r.age; if (+r.ovr) { p.ovr = +r.ovr; p.pot = Math.max(p.pot, p.ovr); p.s0 = p.ovr; } p.real = true; players++; }); c.lineup = null; } }
  const list = packs(); list.push({ name: name || data?.name || 'Pacote', by: data?.author || '', at: Date.now(), crests, clubs, players }); setPacks(list);
  if (S.G) save(true);
  return { crests, clubs, players, miss };
}
H.packfile = async (v, el) => {
  const files = [...(el.files || [])]; if (!files.length) return; el.value = ''; toast('Instalando pacote…');
  let data = {}, imgs = [];
  for (const f of files) {
    if (/\.zip$/i.test(f.name) || f.type.includes('zip')) { const all = await unzipAll(f); imgs = imgs.concat(all.imgs); if (all.json) data = mergeData(data, all.json); }
    else if (/\.json$/i.test(f.name) || f.type.includes('json')) { try { data = mergeData(data, JSON.parse(await f.text())); } catch { toast('Arquivo .json inválido'); } }
    else if (f.type.startsWith('image/')) imgs.push({ name: f.name, blob: f });
  }
  const r = await applyPack(GG(), data, imgs, files[0].name.replace(/\.[a-z0-9]+$/i, ''));
  S.packRep = r; toast(`✅ Pacote instalado: ${r.crests} escudos, ${r.clubs} clubes, ${r.players} jogadores`, 3200); rerender();
};
const mergeData = (a, b) => ({ name: b.name || a.name, author: b.author || a.author, crests: { ...(a.crests || {}), ...(b.crests || {}) }, clubs: { ...(a.clubs || {}), ...(b.clubs || {}) }, players: (a.players || []).concat(b.players || []) });
async function unzipAll(blob) {
  const imgs = await unzip(blob); let json = null;
  try { // procura um pacote.json dentro do zip (arquivo sem compressão ou deflate)
    const buf = new Uint8Array(await blob.arrayBuffer()); const txt = new TextDecoder().decode(buf); const i = txt.indexOf('pacote.json'); if (i >= 0) { const s = txt.indexOf('{', i); const e = txt.lastIndexOf('}'); if (s > 0 && e > s) { try { json = JSON.parse(txt.slice(s, e + 1)); } catch {} } }
  } catch {}
  return { imgs, json };
}
H.packlink = async () => {
  const url = (document.getElementById('pkurl')?.value || '').trim(); if (!/^https?:\/\//i.test(url)) { toast('Cole um link que comece com https://'); return; }
  toast('Baixando pacote…');
  try { const r = await fetch(url); if (!r.ok) throw new Error(r.status); const b = await r.blob(); let data = {}, imgs = [];
    if (/zip/.test(b.type) || /\.zip(\?|$)/i.test(url)) { const all = await unzipAll(b); imgs = all.imgs; data = all.json || {}; } else data = JSON.parse(await b.text());
    const rep = await applyPack(GG(), data, imgs, url.replace(/^.*\//, '').replace(/\?.*$/, '')); S.packRep = rep; toast(`✅ Pacote instalado: ${rep.crests} escudos`, 3000); rerender();
  } catch (e) { toast('Não consegui baixar esse link. Baixe o arquivo e use "Instalar de um arquivo".', 3800); }
};
// ---------- exportar ----------
H.packexport = async () => {
  const G = S.G; const crests = {}; for (const [k, v] of IMG) if (k.startsWith('c:')) crests[k.slice(2)] = v;
  const clubs = {}; const players = [];
  if (G) for (const c of G.clubs) { if (!c || !c.league) continue; clubs[c.key] = { name: c.name, short: c.short, c1: c.c1, c2: c.c2, stad: c.stad };
    const real = G.players.filter((p) => p && p.club === c.id && p.real && !p.u20); for (const p of real) players.push({ club: c.key, n: p.n, pos: p.pos, age: p.age, ovr: p.ovr }); }
  const data = { format: 'prancheta-pacote', v: 1, name: `Pacote de ${G?.me?.name || 'Prancheta'}`, author: G?.me?.name || '', crests, clubs, players };
  const json = JSON.stringify(data); const name = `prancheta-pacote-${new Date().toISOString().slice(0, 10)}.json`;
  if (window.PranchetaNative?.saveFile) { const b64 = btoa(unescape(encodeURIComponent(json))); const where = window.PranchetaNative.saveFile(name, b64, 'application/json'); toast(where ? `💾 Salvo em ${where}` : 'Não consegui salvar o arquivo', 3500); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  toast(`💾 Pacote exportado: ${Object.keys(crests).length} escudos`, 3000);
};
H.packdel = (v) => { const l = packs(); l.splice(+v, 1); setPacks(l); rerender(); };

// ---------- assistente de escudos ----------
H.crestwiz = (v) => { S.cw = { lg: v || S.cw?.lg || 'BRA', i: 0 }; openSheet(cwHtml()); };
function cwList() { const G = GG(); return G.clubs.filter((c) => c && c.league === S.cw.lg).sort((a, b) => b.rep - a.rep); }
function cwHtml() {
  const G = GG(); const L = cwList(); const done = L.filter((c) => IMG.has('c:' + c.key)).length; const todo = L.filter((c) => !IMG.has('c:' + c.key) && !(S.cw.skip || []).includes(c.id)); const c = todo[0];
  return `<h2>🪄 Assistente de escudos</h2><select data-ch="cwlg" style="margin-bottom:8px">${LEAGUES.map((l) => `<option value="${l.id}" ${S.cw.lg === l.id ? 'selected' : ''}>${COUNTRIES[l.country]?.flag || ''} ${esc(l.name)}</option>`).join('')}</select>
  <div class="row xs"><span class="grow mut">Progresso desta liga</span><b>${done}/${L.length}</b></div><div class="bar" style="margin-bottom:10px"><i style="width:${L.length ? done / L.length * 100 : 0}%"></i></div>
  ${c ? `<div class="cw-step"><div class="row" style="gap:12px;align-items:center">${crest(c, 64)}<div class="grow"><div class="xb" style="font-size:18px">${esc(c.name)}</div><div class="xs mut">${esc(c.city || '')}</div></div></div>
    <ol class="cw-ol"><li>Toque em <b>Procurar imagem</b>: abre a busca no navegador já com o nome do clube.</li><li>Salve a imagem do escudo no celular (toque e segure → baixar imagem).</li><li>Volte aqui e toque em <b>Escolher a imagem</b>.</li></ol>
    <div class="row" style="gap:8px"><button class="btn grow" data-a="cwsearch" data-v="${c.id}">🔎 Procurar imagem</button><label class="btn pri grow">📂 Escolher a imagem<input type="file" accept="image/*" hidden data-ch="cwpick" data-id="${c.id}"></label></div>
    <button class="btn sm ghost blk" style="margin-top:6px" data-a="cwskip" data-v="${c.id}">Pular este clube</button></div>` : '<div class="hint">🎉 Todos os clubes desta liga já têm escudo!</div>'}
  <div class="xs mut" style="margin-top:8px">As imagens ficam só no seu aparelho. Para passar para outra pessoa, use Exportar pacote.</div>`;
}
H.cwlg = (v) => { S.cw.lg = v; replaceSheet(cwHtml()); };
H.cwsearch = (v) => { const c = GG().clubs[+v]; const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent('escudo ' + c.name + ' png')}`; if (window.PranchetaNative?.openUrl) window.PranchetaNative.openUrl(url); else window.open(url, '_blank'); };
H.cwpick = async (v, el) => { const f = el.files?.[0]; const c = GG().clubs[+el.dataset.id]; if (!f || !c) return; try { await setImage('c:' + c.key, await fileToDataUrl(f, 160)); toast(`✅ Escudo do ${c.name} salvo`); } catch { toast('Não consegui ler a imagem'); } replaceSheet(cwHtml()); if (S.G) render(); };
H.cwskip = (v) => { (S.cw.skip ||= []).push(+v); replaceSheet(cwHtml()); };

// ---------- página ----------
PAGES_T.pacotes = 'Pacotes e escudos'; PAGES_BACK.pacotes = null;
PAGES.pacotes = () => {
  const list = packs(); const r = S.packRep;
  return `<div class="cols2"><div class="card"><h3>📦 Instalar pacote</h3><p class="xs mut">Pacotes trocam escudos, nomes, cores e jogadores. Funciona com arquivos <b>.zip</b> (imagens com o nome do clube, ex.: <i>Flamengo.png</i>) ou <b>.json</b> exportados por outro Prancheta.</p>
    <label class="btn pri blk">📂 Instalar de um arquivo<input type="file" accept=".zip,.json,application/zip,application/json,image/*" multiple hidden data-ch="packfile"></label>
    <div class="row" style="gap:6px;margin-top:8px"><input id="pkurl" placeholder="ou cole o link de um pacote (https://…)" class="grow"><button class="btn" data-a="packlink">Baixar</button></div>
    ${r ? `<div class="hint" style="margin-top:8px">Último pacote: ${r.crests} escudos, ${r.clubs} clubes, ${r.players} jogadores.${r.miss.length ? ` Não reconhecidos: ${r.miss.slice(0, 8).map(esc).join(', ')}${r.miss.length > 8 ? '…' : ''}` : ''}</div>` : ''}
    <h3 style="margin-top:12px">Instalados neste aparelho</h3><div class="list">${list.length ? list.map((p, i) => `<div class="li sm"><span class="grow ell"><b>${esc(p.name)}</b> <span class="xs mut">${new Date(p.at).toLocaleDateString('pt-BR')} · ${p.crests} escudos${p.players ? ` · ${p.players} jogadores` : ''}</span></span><button class="btn sm ghost" data-a="packdel" data-v="${i}">✕</button></div>`).join('') : '<div class="mut sm">Nenhum pacote ainda.</div>'}</div></div>
  <div class="card"><h3>🪄 Assistente de escudos</h3><p class="xs mut">Vai clube por clube: abre a busca da imagem, você salva no celular e escolhe aqui. Rápido e sem precisar de computador.</p><button class="btn pri blk" data-a="crestwiz" data-v="BRA">Começar pelo Brasileirão</button><button class="btn blk" style="margin-top:6px" data-a="crestwiz">Escolher outra liga</button>
    <h3 style="margin-top:12px">💾 Exportar pacote</h3><p class="xs mut">Gera um arquivo com todos os escudos, nomes, cores e jogadores que você editou, para guardar ou mandar para um amigo instalar.</p><button class="btn blk" data-a="packexport">Exportar meu pacote</button>
    <button class="btn sm ghost blk" style="margin-top:6px" data-a="go" data-v="editor">Abrir o editor completo ›</button></div></div>`;
};

// ---------- atualização obrigatória (APK) ----------
const APK_URL = 'https://github.com/lumbragames/prancheta/releases/latest/download/prancheta.apk';
const REL_API = 'https://api.github.com/repos/ivohermogenes16-hash/wildforge/releases/tags/prancheta-apk';
export async function checkUpdate() {
  const N = window.PranchetaNative; if (!N?.versionCode) return false;
  let local = 0; try { local = N.versionCode(); } catch {} if (!local) return false;
  try {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(REL_API, { signal: ctl.signal, cache: 'no-store' }); clearTimeout(to); if (!r.ok) return false;
    const j = await r.json(); const m = /vers[aã]o\s*(\d+)/i.exec(j.name || '') || /(\d+)/.exec(j.name || ''); const remote = m ? +m[1] : 0;
    if (remote > local) { showUpdate(local, remote); return true; }
  } catch {}
  return false;
}
function showUpdate(local, remote) {
  if (document.getElementById('upd')) return;
  const el = document.createElement('div'); el.id = 'upd'; el.className = 'upd';
  el.innerHTML = `<div class="upd-box"><div class="upd-ic">⬇️</div><div class="logo big">PRAN<span>CHETA</span></div><h2>Nova atualização disponível</h2><p>Para continuar jogando, instale a versão nova. <b>Sua carreira continua salva.</b></p><div class="xs mut">Você tem a versão 1.${local} · nova versão 1.${remote}</div>
  <button class="btn pri big blk" id="updgo">Atualizar o jogo</button><div class="xs mut upd-help">Depois de baixar, toque no arquivo <b>prancheta.apk</b> e escolha <b>Atualizar</b>. Se o celular pedir, permita instalar apps desta fonte.</div><button class="btn ghost sm" id="updre">Já atualizei — verificar de novo</button></div>`;
  document.body.appendChild(el);
  el.querySelector('#updgo').onclick = () => { const N = window.PranchetaNative; if (N?.openUrl) N.openUrl(APK_URL); else window.open(APK_URL, '_blank'); };
  el.querySelector('#updre').onclick = async () => { el.remove(); const again = await checkUpdate(); if (!again) toast('Tudo certo, você está na versão mais nova!'); };
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate(); });
