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
  return `<div class="hint" style="margin-bottom:12px">Troque nomes, cores, escudos e fotos. As imagens que você enviar ficam salvas só neste aparelho e valem também para novas carreiras.</div>
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
  return `<h2>Editar jogador</h2><div class="row" style="gap:12px;margin-bottom:12px">${face(p, 76, c)}<div class="col grow"><label class="btn sm">📷 Enviar foto<input type="file" accept="image/*" hidden data-ch="upface" data-id="${p.id}"></label>${IMG.has('p:' + p.key) ? `<button class="btn sm red" data-a="rmface" data-v="${p.id}">Remover foto</button>` : ''}</div></div>
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
