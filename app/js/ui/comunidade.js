// Comunidade do Prancheta no WhatsApp: ideias, bugs e novidades
import { S, H, openSheet, closeSheet, replaceSheet, centerNote } from './app.js';
import { esc } from '../util.js';
export const WA = 'https://chat.whatsapp.com/C44zXTaeoOcJqcsTmjMAwX';
export const VER = '6.0';
export function openLink(u) { try { if (window.PranchetaNative?.openUrl) { window.PranchetaNative.openUrl(u); return; } } catch {} window.open(u, '_blank'); }
function device() { const ua = navigator.userAgent; const a = ua.match(/Android [\d.]+/)?.[0] || (/(iPhone|iPad)/.test(ua) ? 'iOS' : 'Navegador'); const mdl = ua.match(/; ([^;)]+) Build/)?.[1] || ''; let b = ''; try { b = window.PranchetaNative?.versionCode ? ' build ' + window.PranchetaNative.versionCode() : ''; } catch {} return `${a}${mdl ? ' · ' + mdl : ''} · Prancheta ${VER}${b}`; }
export function comuHtml() {
  return `<div class="cm-hero"><div class="cm-ic">💬</div><div><h2 style="margin:0">Comunidade Prancheta</h2><div class="xs mut">Grupo oficial no WhatsApp</div></div></div>
  <p class="sm" style="margin:8px 0 12px">Entra na comunidade pra mandar <b>ideias</b>, avisar de <b>bugs</b>, ver as <b>novidades</b> antes de todo mundo e trocar ideia com outros técnicos. Tudo que for sugerido lá é lido e muita coisa entra nas próximas atualizações!</p>
  <div class="cm-grid">
    <button class="cm-b main" data-a="cmjoin"><span>🤝</span><b>Entrar na comunidade</b><small>Abre o WhatsApp</small></button>
    <button class="cm-b" data-a="cmsend" data-v="ideia"><span>💡</span><b>Mandar uma ideia</b><small>Escreva abaixo e toque aqui</small></button>
    <button class="cm-b" data-a="cmsend" data-v="bug"><span>🐞</span><b>Avisar de um bug</b><small>Já vai com seu aparelho e versão</small></button>
  </div>
  <div class="field" style="margin-top:12px"><label>Escreva aqui antes de enviar</label><textarea id="cmtxt" rows="3" placeholder="Ex.: queria poder escolher o uniforme na final…" style="width:100%"></textarea></div>
  <div class="xs mut">Na hora de enviar, escolha o grupo da comunidade no WhatsApp.</div>`;
}
H.tcomu = () => openSheet(comuHtml());
H.cmjoin = () => { try { localStorage.setItem('prancheta.comu', '2'); } catch {} openLink(WA); };
H.cmsend = (v) => {
  const t = (document.getElementById('cmtxt')?.value || '').trim();
  if (t.length < 5) { const el = document.getElementById('cmtxt'); el?.classList.add('need'); el?.focus(); centerNote(v === 'bug' ? 'Escreva primeiro o que aconteceu e onde.' : 'Escreva sua ideia primeiro.', 2200); return; }
  const head = v === 'bug' ? '🐞 *BUG no Prancheta*' : '💡 *IDEIA para o Prancheta*';
  const extra = v === 'bug' ? `\n\n📱 ${device()}${S.G ? `\n⚽ ${S.G.clubs[S.G.me.job?.cid]?.name || ''} · ${S.G.year}, semana ${S.G.week + 1}` : ''}` : '';
  const body = `${head}\n\n${t || ''}${extra}`;
  openLink('https://wa.me/?text=' + encodeURIComponent(body));
};
// card na primeira abertura
export function firstCommunity() {
  let seen = '0'; try { seen = localStorage.getItem('prancheta.comu') || '0'; } catch {}
  if (seen !== '0') return; try { localStorage.setItem('prancheta.comu', '1'); } catch {}
  setTimeout(() => { if (document.querySelector('.sheet-wrap, .sheet')) return; openSheet(`<div class="cm-first"><div class="cm-big">🎉</div><h2>Bem-vindo ao Prancheta!</h2><p class="sm">O jogo é feito junto com a comunidade. Tem uma ideia? Achou um bug? Quer ver as novidades primeiro? Entra no nosso grupo do WhatsApp!</p>
    <div class="cm-pts"><span>💡 Sugira ideias</span><span>🐞 Avise de bugs</span><span>🆕 Novidades antes</span></div>
    <button class="btn pri big blk" data-a="cmjoin">🤝 Entrar na comunidade</button><button class="btn ghost blk" style="margin-top:6px" data-a="cs">Agora não</button><div class="xs mut" style="margin-top:6px">Dá pra entrar depois pelo menu "Comunidade".</div></div>`); }, 1400);
}

// ---------- 5.1: vídeo da atualização ----------
// O vídeo pode vir junto do jogo (VIDEO_LOCAL) ou ser ligado pelo Lumbra Control (remote.video: { on, ver, title, yt, mp4 }).
export const VIDEO_LOCAL = { ver: VER, title: '', mp4: null, yt: null };
let RV = null; try { window.LumbraAnalytics?.onRemote((r) => { RV = r && r.video && r.video.on ? r.video : null; document.querySelectorAll('.vid-slot').forEach((el) => (el.innerHTML = videoCard())); }); } catch {}
export function videoInfo() { const v = RV || VIDEO_LOCAL; return v && (v.mp4 || v.yt) ? v : null; }
const ytId = (u) => (String(u || '').match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{6,})/) || [])[1];
window.PVIDCARD = () => videoCard();
export function videoCard() {
  const v = videoInfo(); if (!v) return '';
  return `<button class="vid-card" data-a="vidopen"><span class="vid-play">▶</span><div class="grow"><small>NOVIDADES DA VERSÃO ${esc(v.ver || VER)}</small><b>${esc(v.title || 'Veja o vídeo da atualização')}</b></div></button>`;
}
H.vidopen = () => {
  const v = videoInfo(); if (!v) return; try { localStorage.setItem('prancheta.vid', v.ver || VER); } catch {}
  const id = ytId(v.yt);
  const player = v.mp4 ? `<video class="vid-v" src="${esc(v.mp4)}" controls autoplay playsinline></video>` : id ? `<div class="vid-yt"><iframe src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe></div>` : '';
  openSheet(`<h2>🎬 Novidades da versão ${esc(v.ver || VER)}</h2>${player}<div class="row" style="gap:8px;margin-top:10px">${v.yt ? `<button class="btn pri grow" data-a="vidyt">▶ Ver no YouTube</button>` : ''}<button class="btn grow" data-a="cs">Fechar</button></div><p class="xs mut" style="margin-top:8px">Curtiu? Se inscreve no canal e comenta lá o que você quer na próxima atualização!</p>`);
};
H.vidyt = () => { const v = videoInfo(); if (v?.yt) openLink(v.yt); };
// abre sozinho uma vez quando a pessoa entra numa versão nova que tem vídeo
export function videoFirstTime() { const v = videoInfo(); if (!v) return; let seen = ''; try { seen = localStorage.getItem('prancheta.vid') || ''; } catch {} if (seen === (v.ver || VER)) return; setTimeout(() => { if (!document.querySelector('.sheet-wrap, .sheet')) H.vidopen(); }, 2200); }
