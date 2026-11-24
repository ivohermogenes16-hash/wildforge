// Comunidade do Prancheta no WhatsApp: ideias, bugs e novidades
import { S, H, openSheet, closeSheet, replaceSheet } from './app.js';
import { esc } from '../util.js';
export const WA = 'https://chat.whatsapp.com/C44zXTaeoOcJqcsTmjMAwX';
export const VER = '5.0';
export function openLink(u) { try { if (window.PranchetaNative?.openUrl) { window.PranchetaNative.openUrl(u); return; } } catch {} window.open(u, '_blank'); }
function device() { const ua = navigator.userAgent; const a = ua.match(/Android [\d.]+/)?.[0] || (/(iPhone|iPad)/.test(ua) ? 'iOS' : 'Navegador'); const mdl = ua.match(/; ([^;)]+) Build/)?.[1] || ''; let b = ''; try { b = window.PranchetaNative?.versionCode ? ' build ' + window.PranchetaNative.versionCode() : ''; } catch {} return `${a}${mdl ? ' · ' + mdl : ''} · Prancheta ${VER}${b}`; }
export function comuHtml() {
  return `<div class="cm-hero"><div class="cm-ic">💬</div><div><h2 style="margin:0">Comunidade Prancheta</h2><div class="xs mut">Grupo oficial no WhatsApp</div></div></div>
  <p class="sm" style="margin:8px 0 12px">Entra na comunidade pra mandar <b>ideias</b>, avisar de <b>bugs</b>, ver as <b>novidades</b> antes de todo mundo e trocar ideia com outros técnicos. Tudo que for sugerido lá é lido e muita coisa entra nas próximas atualizações!</p>
  <div class="cm-grid">
    <button class="cm-b main" data-a="cmjoin"><span>🤝</span><b>Entrar na comunidade</b><small>Abre o WhatsApp</small></button>
    <button class="cm-b" data-a="cmsend" data-v="ideia"><span>💡</span><b>Mandar uma ideia</b><small>Já vai com o texto pronto</small></button>
    <button class="cm-b" data-a="cmsend" data-v="bug"><span>🐞</span><b>Avisar de um bug</b><small>Já vai com seu aparelho e versão</small></button>
  </div>
  <div class="field" style="margin-top:12px"><label>Escreva aqui (opcional)</label><textarea id="cmtxt" rows="3" placeholder="Ex.: queria poder escolher o uniforme na final…" style="width:100%"></textarea></div>
  <div class="xs mut">Na hora de enviar, escolha o grupo da comunidade no WhatsApp.</div>`;
}
H.tcomu = () => openSheet(comuHtml());
H.cmjoin = () => { try { localStorage.setItem('prancheta.comu', '2'); } catch {} openLink(WA); };
H.cmsend = (v) => {
  const t = (document.getElementById('cmtxt')?.value || '').trim();
  const head = v === 'bug' ? '🐞 *BUG no Prancheta*' : '💡 *IDEIA para o Prancheta*';
  const extra = v === 'bug' ? `\n\n📱 ${device()}${S.G ? `\n⚽ ${S.G.clubs[S.G.me.job?.cid]?.name || ''} · ${S.G.year}, semana ${S.G.week + 1}` : ''}` : '';
  const body = `${head}\n\n${t || (v === 'bug' ? '(descreva o que aconteceu e onde)' : '(escreva sua ideia)')}${extra}`;
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
