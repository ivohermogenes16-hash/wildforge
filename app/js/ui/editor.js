import { esc, POS, clamp } from '../util.js';
import { crest, face } from './art.js';
import { S, H, PAGES, render, toast, openSheet, closeSheet, replaceSheet, save, posTag } from './app.js';
import { setImage, fileToDataUrl, IMG } from '../store.js';
import { LEAGUES } from '../data/leagues.js';
import { makePlayer, genName } from '../engine/world.js';
import { playerWage } from '../engine/econ.js';

PAGES.editor = () => {
  const G = S.G;
  const lg = S.edLg || 'BRA';
  const clubs = G.clubs.filter((c) => (lg === 'AMA' ? c.league === 'AMA' : lg === 'OUT' ? !c.league : c.league === lg));
  return `<div class="hint" style="margin-bottom:12px">Troque nomes, cores e escudos. Dá para colar a lista real de jogadores de qualquer clube. As imagens que você enviar ficam salvas só neste aparelho e valem também para novas carreiras.</div>
  <div class="card flat imp-card"><h3>🖼️ Importar vários escudos de uma vez</h3><p class="xs mut">Selecione várias imagens da galeria (ou um arquivo .zip). Cada imagem é ligada ao clube pelo nome do arquivo: <b>Flamengo.png</b>, <b>Real Madrid.jpg</b>, <b>Boca Juniors.webp</b>... Acentos, maiúsculas e "FC/EC/SC" não importam. Também vale a sigla (ex.: <b>CAP.png</b>).</p>
  <label class="btn pri blk">📂 Escolher imagens ou .zip<input type="file" accept="image/*,.zip,application/zip" multiple hidden data-ch="bulkcrest"></label>
  ${S.impRep ? `<div class="imp-rep"><b>${S.impRep.ok.length} escudos aplicados</b>${S.impRep.bad.length ? ` · ${S.impRep.bad.length} sem clube correspondente: <span class="xs mut">${S.impRep.bad.slice(0, 30).map(esc).join(', ')}${S.impRep.bad.length > 30 ? '…' : ''}</span>` : ''}</div>` : ''}</div>
  <select data-ch="edlg" style="margin-bottom:12px">${LEAGUES.map((l) => `<option value="${l.id}" ${lg === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}<option value="AMA" ${lg === 'AMA' ? 'selected' : ''}>Várzea</option><option value="OUT" ${lg === 'OUT' ? 'selected' : ''}>Fora das ligas</option></select>
  <div class="card flat" style="padding:4px 12px"><div class="list">${clubs.map((c) => `<div class="li tap" data-a="edclub" data-v="${c.id}">${crest(c, 34)}<div class="grow"><div class="b ell">${esc(c.name)}</div><div class="xs mut">${IMG.has('c:' + c.key) ? '🖼️ escudo próprio' : 'escudo gerado'}</div></div>›</div>`).join('') || '<div class="empty">Nenhum clube.</div>'}</div></div>`;
};
H.edlg = (v) => { S.edLg = v; render(); };

H.edclub = (v) => { closeSheet(true); openSheet(clubEd(+v)); };
function clubEd(id) {
  const G = S.G, c = G.clubs[id];
  const sq = G.players.filter((p) => p && p.club === c.id).sort((a, b) => (a.u20 - b.u20) || b.ovr - a.ovr);
  return `<h2>Editar clube</h2><div class="row" style="gap:12px;margin-bottom:12px">${crest(c, 72)}<div class="col grow"><label class="btn sm">🖼️ Enviar escudo<input type="file" accept="image/*" hidden data-ch="upcrest" data-id="${c.id}"></label>${IMG.has('c:' + c.key) ? `<button class="btn sm red" data-a="rmcrest" data-v="${c.id}">Remover imagem</button>` : ''}</div></div>
  <div class="field"><label>Nome</label><input value="${esc(c.name)}" data-ch="cf" data-id="${c.id}" data-k="name"></div>
  <div class="row" style="gap:8px"><div class="field grow"><label>Sigla</label><input maxlength="3" value="${esc(c.short)}" data-ch="cf" data-id="${c.id}" data-k="short"></div><div class="field grow"><label>Cidade</label><input value="${esc(c.city)}" data-ch="cf" data-id="${c.id}" data-k="city"></div></div>
  <div class="row" style="gap:8px"><div class="field grow"><label>Cor 1</label><input type="color" value="${c.c1}" data-ch="cf" data-id="${c.id}" data-k="c1"></div><div class="field grow"><label>Cor 2</label><input type="color" value="${c.c2}" data-ch="cf" data-id="${c.id}" data-k="c2"></div></div>
  <div class="row" style="gap:8px"><div class="field grow"><label>Estádio</label><input value="${esc(c.stad)}" data-ch="cf" data-id="${c.id}" data-k="stad"></div><div class="field" style="width:100px"><label>Lugares (mil)</label><input type="number" value="${c.cap}" data-ch="cf" data-id="${c.id}" data-k="cap"></div></div>
  <div class="field"><label>Reputação (1–99)</label><input type="number" min="1" max="99" value="${c.rep}" data-ch="cf" data-id="${c.id}" data-k="rep"></div>
  <div class="card flat"><h3>Colar elenco real</h3><p class="xs mut">Um jogador por linha. Pode ser só o nome, ou "Nome; posição; idade; geral" (ex.: Harry Kane; ATA; 33; 90). Posições: ${POS.join(', ')}. Os nomes substituem os jogadores atuais na ordem da lista abaixo; linhas a mais viram jogadores novos.</p>
  <textarea id="bulk${c.id}" rows="6" style="width:100%" placeholder="Harry Kane; ATA; 33; 90&#10;Jamal Musiala; MEI; 23; 88"></textarea><button class="btn sm pri blk" style="margin-top:6px" data-a="bulkpl" data-v="${c.id}">Aplicar lista</button></div>
  <div class="card flat" style="padding:4px 12px"><h3 style="margin:8px 0 2px"><span>Jogadores (${sq.length})</span><button class="btn sm" data-a="newpl" data-v="${c.id}">+ Novo</button></h3><div class="list">${sq.map((p) => `<div class="li tap" data-a="edplayer" data-v="${p.id}">${face(p, 32, c)}<span class="grow b ell">${esc(p.n)}${p.u20 ? ' <span class="pill b">Sub-20</span>' : ''}</span>${posTag(p.pos)}<b style="width:26px;text-align:right">${p.ovr}</b></div>`).join('')}</div></div>`;
}
H.cf = (v, el) => {
  const c = S.G.clubs[+el.dataset.id]; const k = el.dataset.k;
  c[k] = ['cap', 'rep'].includes(k) ? clamp(Math.round(+v) || 1, 1, k === 'rep' ? 99 : 200) : k === 'short' ? v.toUpperCase().slice(0, 3) : v;
  save(); replaceSheet(clubEd(c.id)); render();
};
H.upcrest = async (v, el) => {
  const f = el.files[0]; if (!f) return; const c = S.G.clubs[+el.dataset.id];
  try { await setImage('c:' + c.key, await fileToDataUrl(f, 160)); toast('Escudo atualizado'); } catch { toast('Não consegui ler a imagem'); }
  replaceSheet(clubEd(c.id)); render();
};
H.rmcrest = async (v) => { const c = S.G.clubs[+v]; await setImage('c:' + c.key, null); replaceSheet(clubEd(c.id)); render(); };
H.newpl = (v) => {
  const G = S.G, c = G.clubs[+v];
  const p = makePlayer(G, { n: genName(c.country), pos: 'MC', age: 24, ovr: 60, club: c.id, nat: c.country });
  save(); closeSheet(); H.edplayer(String(p.id));
};

H.edplayer = (v) => { closeSheet(true); openSheet(plEd(+v)); };
function plEd(id) {
  const G = S.G, p = G.players[id]; const c = p.club >= 0 ? G.clubs[p.club] : null;
  return `<h2>Editar jogador</h2>
  <div class="field"><label>Nome</label><input value="${esc(p.n)}" data-ch="pf" data-id="${p.id}" data-k="n"></div>
  <div class="row" style="gap:8px"><div class="field grow"><label>Posição</label><select data-ch="pf" data-id="${p.id}" data-k="pos">${POS.map((x) => `<option ${p.pos === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div class="field" style="width:90px"><label>Idade</label><input type="number" value="${p.age}" data-ch="pf" data-id="${p.id}" data-k="age"></div></div>
  <div class="row" style="gap:8px"><div class="field grow"><label>Geral</label><input type="number" value="${p.ovr}" data-ch="pf" data-id="${p.id}" data-k="ovr"></div><div class="field grow"><label>Potencial</label><input type="number" value="${p.pot}" data-ch="pf" data-id="${p.id}" data-k="pot"></div></div>
  <div class="field"><label>Clube</label><select data-ch="pclub" data-id="${p.id}"><option value="-1">Sem clube (livre)</option>${LEAGUES.map((l) => `<optgroup label="${esc(l.short)}">${G.clubs.filter((x) => x.league === l.id).map((x) => `<option value="${x.id}" ${p.club === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</optgroup>`).join('')}</select></div>
  <div class="row" style="gap:8px"><button class="btn sm grow" data-a="cs">Fechar</button><button class="btn sm red grow" data-a="delpl" data-v="${p.id}">Excluir jogador</button></div>`;
}
H.pf = (v, el) => {
  const G = S.G, p = G.players[+el.dataset.id]; const k = el.dataset.k;
  if (k === 'n' || k === 'pos') p[k] = v.trim() || p[k];
  else { const n = Math.round(+v); if (!isNaN(n)) p[k] = k === 'age' ? clamp(n, 15, 45) : clamp(n, 20, 99); if (p.pot < p.ovr) p.pot = p.ovr; }
  if (p.club >= 0) { const c = G.clubs[p.club]; if (c.lineup) c.lineup = null; }
  save(); replaceSheet(plEd(p.id)); render();
};
H.pclub = (v, el) => {
  const G = S.G, p = G.players[+el.dataset.id]; const old = p.club >= 0 ? G.clubs[p.club] : null; const to = +v;
  if (old) old.lineup = null;
  p.club = to; p.u20 = false; p.lst = false;
  if (to >= 0) { const c = G.clubs[to]; c.lineup = null; p.wage = playerWage(p, c.country); if (p.con <= G.year) p.con = G.year + 2; }
  toast('Jogador movido'); save(); replaceSheet(plEd(p.id)); render();
};
H.upface = async (v, el) => {
  const f = el.files[0]; if (!f) return; const p = S.G.players[+el.dataset.id];
  try { await setImage('p:' + p.key, await fileToDataUrl(f, 192)); toast('Foto atualizada'); } catch { toast('Não consegui ler a imagem'); }
  replaceSheet(plEd(p.id)); render();
};
H.rmface = async (v) => { const p = S.G.players[+v]; await setImage('p:' + p.key, null); replaceSheet(plEd(p.id)); render(); };
H.delpl = (v) => {
  const G = S.G, p = G.players[+v]; const c = p.club >= 0 ? G.clubs[p.club] : null;
  if (c && G.players.filter((x) => x && x.club === c.id && !x.u20).length <= 16) { toast('O clube precisa de pelo menos 16 jogadores'); return; }
  if (c) c.lineup = null;
  p.club = -2; p.ret = true; G.short = G.short.filter((x) => x !== p.id);
  closeSheet(); toast('Jogador removido'); render(); save();
};

H.bulkpl = (v) => {
  const G = S.G, c = G.clubs[+v]; const txt = document.getElementById('bulk' + c.id)?.value || '';
  const lines = txt.split(/\n+/).map((l) => l.trim()).filter(Boolean); if (!lines.length) { toast('Cole pelo menos um nome.'); return; }
  const sq = G.players.filter((p) => p && p.club === c.id).sort((a, b) => (a.u20 - b.u20) || b.ovr - a.ovr);
  let n = 0;
  lines.forEach((l, i) => {
    const [nm, pos, age, ovr] = l.split(/[;,\t]/).map((x) => x.trim());
    if (!nm) return; const P = (pos || '').toUpperCase();
    let p = sq[i];
    if (!p) p = makePlayer(G, { n: nm, pos: POS.includes(P) ? P : 'MC', age: +age || 24, ovr: +ovr || 60, club: c.id, nat: c.country });
    p.n = nm; if (POS.includes(P)) p.pos = P; if (+age) p.age = clamp(+age, 15, 45); if (+ovr) { p.ovr = clamp(+ovr, 30, 99); p.pot = Math.max(p.pot, p.ovr); p.s0 = p.ovr; p.wage = playerWage(p, c.country); }
    p.real = true; n++;
  });
  c.lineup = null; save(); toast(`${n} jogadores atualizados no ${c.name}`); replaceSheet(clubEd(c.id)); render();
};

// ===== importação em massa de escudos =====
const STOP = new Set(['fc', 'cf', 'sc', 'ec', 'ac', 'cd', 'ca', 'cr', 'se', 'ud', 'sd', 'rc', 'afc', 'club', 'clube', 'de', 'do', 'da', 'futebol', 'football', 'futbol', 'calcio', 'esporte', 'sport', 'sporting', 'the', 'png', 'jpg']);
const norm = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' e ').replace(/[^a-z0-9]+/g, ' ').trim();
const loose = (t) => norm(t).split(' ').filter((w) => w && !STOP.has(w)).join('');
function crestIndex(G) {
  const ex = new Map(), lo = new Map(), sh = new Map();
  for (const c of G.clubs) { if (!c || c.nat) continue; const a = norm(c.name).replace(/ /g, ''); if (!ex.has(a)) ex.set(a, c); const b = loose(c.name); if (b && !lo.has(b)) lo.set(b, c); if (c.short) { const k = c.short.toLowerCase(); sh.set(k, sh.has(k) ? null : c); } }
  return (file) => { const base = file.replace(/^.*[\\/]/, '').replace(/\.[a-z0-9]+$/i, ''); const a = norm(base).replace(/ /g, ''); return ex.get(a) || lo.get(loose(base)) || (base.length <= 4 ? sh.get(base.toLowerCase()) : null) || null; };
}
async function unzip(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer()); const dv = new DataView(buf.buffer); const out = [];
  let e = buf.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--; if (e < 0) return out;
  let p = dv.getUint32(e + 16, true); const n = dv.getUint16(e + 10, true);
  for (let i = 0; i < n; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const meth = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
    if (name.endsWith('/') || /(^|\/)(__MACOSX|\.)/.test(name) || !/\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(name)) continue;
    const lnl = dv.getUint16(off + 26, true), lxl = dv.getUint16(off + 28, true); const data = buf.subarray(off + 30 + lnl + lxl, off + 30 + lnl + lxl + csz);
    const type = /\.svg$/i.test(name) ? 'image/svg+xml' : /\.png$/i.test(name) ? 'image/png' : /\.webp$/i.test(name) ? 'image/webp' : 'image/jpeg';
    try {
      let b; if (meth === 0) b = new Blob([data], { type }); else if (meth === 8) b = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob().then((x) => new Blob([x], { type })); else continue;
      out.push({ name, blob: b });
    } catch {}
  }
  return out;
}
H.bulkcrest = async (v, el) => {
  const files = [...(el.files || [])]; if (!files.length) return;
  const G = S.G; const find = crestIndex(G); const ok = [], bad = [];
  toast('Lendo imagens…');
  let items = [];
  for (const f of files) { if (/\.zip$/i.test(f.name) || f.type.includes('zip')) { try { items = items.concat(await unzip(f)); } catch { bad.push(f.name); } } else items.push({ name: f.name, blob: f }); }
  for (const it of items) {
    const c = find(it.name); if (!c) { bad.push(it.name.replace(/^.*\//, '')); continue; }
    try { await setImage('c:' + c.key, await fileToDataUrl(it.blob, 160)); ok.push(c.name); } catch { bad.push(it.name.replace(/^.*\//, '')); }
  }
  S.impRep = { ok, bad }; el.value = ''; toast(`${ok.length} escudo${ok.length === 1 ? '' : 's'} aplicado${ok.length === 1 ? '' : 's'}`); render();
};
