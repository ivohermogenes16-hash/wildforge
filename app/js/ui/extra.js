// Telas da grande atualização: centro de comando, premiações animadas, sala de troféus, lendas,
// retrospectiva, título, apresentação de reforço, estádio e sócios, uniformes, busca global, gestos e tema.
import { esc, money, clamp } from '../util.js';
import { S, H, render, toast, openSheet, closeSheet, replaceSheet, save, posTag, shortName, PAGES, PAGES_T, PAGES_BACK } from './app.js';
import { crest, face, textOn } from './art.js';
import { vibrate } from '../settings.js';
import { myClub } from '../engine/game.js';
import { describeInj, leadersOf, setCaptain, socioOf, socioTarget, SOCIO_BASE } from '../engine/extra.js';
import { SET } from '../settings.js';
import { LEAGUES, COUNTRIES } from '../data/leagues.js';

// ---------------- jogador: lesão, capitão e promessas ----------------
export function playerExtraHtml(G, p, mine) {
  let h = '';
  const d = describeInj(p);
  if (d) h += `<div class="card flat inj-card sev-${d.sev}"><h3><span>🩺 ${esc(d.txt)}</span><span class="pill r">${d.sevTxt}</span></h3><div class="row xs"><span class="grow mut">Recuperação</span><b>${d.pct}%</b></div><div class="bar"><i style="width:${d.pct}%;background:var(--ac)"></i></div><div class="xs mut" style="margin-top:6px">Volta em ${p.inj} semana${p.inj > 1 ? 's' : ''}.${(p.injH || []).length > 1 ? ` Histórico: ${p.injH.slice(-3).map((x) => esc(x.txt)).join(', ')}.` : ''}</div></div>`;
  if (mine) {
    const c = myClub(G); const cap = c.capId === p.id; const lead = leadersOf(G, c).includes(p);
    h += `<div class="row" style="gap:6px;flex-wrap:wrap;margin:6px 0">${cap ? '<span class="pill g">🧢 Capitão</span>' : `<button class="btn sm" data-a="setcap" data-v="${p.id}">🧢 Fazer capitão</button>`}${lead ? '<span class="pill">⭐ Líder do vestiário</span>' : ''}<button class="btn sm" data-a="promise" data-v="${p.id}">🤝 Fazer uma promessa</button></div>`;
  }
  return h;
}
H.setcap = (v) => { const G = S.G, c = myClub(G); setCaptain(G, c, +v); toast(`🧢 ${G.players[+v].n} é o novo capitão!`); closeSheet(); render(); save(); };
H.promise = (v) => {
  const G = S.G, p = G.players[+v];
  openSheet(`<h2>Promessa para ${esc(p.n)}</h2><div class="hint" style="margin-bottom:8px">Promessas deixam o jogador mais feliz agora. Se não forem cumpridas, ele fica um pouco chateado (nada grave).</div><div class="list">
  ${[['minutos', '⏱️ Mais minutos nas próximas semanas'], ['renov', '📄 Renovar o contrato até o fim da temporada'], ['venda', '✈️ Liberar para um clube maior se aparecer proposta']].map(([k, t]) => `<div class="li tap" data-a="promise2" data-v="${p.id}:${k}"><span class="grow b">${t}</span></div>`).join('')}</div>`);
};
H.promise2 = (v) => {
  const G = S.G; const [id, k] = v.split(':'); const p = G.players[+id]; (G.me.promises ||= []);
  if (G.me.promises.some((x) => x.pid === +id && !x.done && !x.broken)) { toast('Você já prometeu algo a ele'); return; }
  G.me.promises.push({ k: k === 'minutos' ? 'titular' : k, pid: +id, until: G.t + (k === 'minutos' ? 5 : 12), t: G.t });
  p.sat = clamp((p.sat ?? 50) + 7, 0, 100); p.mor = clamp(p.mor + 4, 0, 100); closeSheet(true); toast(`🤝 ${shortName(p.n)} gostou da promessa`); save();
};

// ---------------- centro de comando (cards extras no início) ----------------
export function homeExtra(G) {
  const c = myClub(G); if (!c) return '';
  let h = '';
  const w = G.me.weekly; if (w && G.t - w.t <= 1) h += `<div class="card week-card"><h3><span>🗓️ Resumo da semana</span><span class="xs mut">sem. ${w.w + 1}</span></h3>
    ${w.res.length ? `<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:6px">${w.res.map((r) => `<span class="res-chip ${r.r}">${r.r} ${r.gf}–${r.ga} <small>${esc(r.opp)}</small></span>`).join('')}</div>` : '<div class="xs mut">Sem jogos nesta semana.</div>'}
    ${w.best ? `<div class="xs">⭐ Destaque: <b>${esc(w.best.n)}</b> (${w.best.v.toFixed(1)})</div>` : ''}${w.inj.length ? `<div class="xs">🩺 Departamento médico: ${w.inj.slice(0, 4).map(esc).join(', ')}</div>` : ''}</div>`;
  const ob = G.me.obj; if (ob && !G.me.job.youth) { const comp = G.comps[ob.comp]; const row = comp?.table?.[c.id]; let pos = null; if (comp) { const grp = comp.groups?.find((g) => g.includes(c.id)) || comp.clubs; const order = grp.slice().sort((a, b) => (comp.table[b]?.pts ?? 0) - (comp.table[a]?.pts ?? 0) || ((comp.table[b]?.gf ?? 0) - (comp.table[b]?.ga ?? 0)) - ((comp.table[a]?.gf ?? 0) - (comp.table[a]?.ga ?? 0))); pos = order.indexOf(c.id) + 1; }
    const ok = pos && pos <= ob.pos; const pct = pos ? clamp(Math.round(100 - (pos - ob.pos) * 12), 5, 100) : 50;
    h += `<div class="card adv-only"><h3><span>🎯 Objetivo da diretoria</span><span class="pill ${ok ? 'g' : 'r'}">${ok ? 'No caminho' : 'Abaixo'}</span></h3><div class="sm b">${esc(ob.text)}</div><div class="row xs" style="margin-top:4px"><span class="grow mut">Posição atual</span><b>${pos || '–'}º · meta ${ob.pos}º</b></div><div class="bar"><i style="width:${pct}%;background:${ok ? 'var(--ac)' : 'var(--gold)'}"></i></div>${row ? `<div class="xs mut" style="margin-top:4px">${row.pts ?? 0} pts em ${row.j ?? 0} jogos</div>` : ''}</div>`; }
  const s = !G.me.job.youth ? c.socio : null; if (s) h += `<div class="card adv-only" data-a="estadio"><h3><span>🏟️ Torcida</span><span class="xs mut">ver estádio ›</span></h3><div class="row xs"><span class="grow mut">Sócios-torcedores</span><b class="num" data-count="${s.n}">${s.n.toLocaleString('pt-BR')}</b></div></div>`;
  return h;
}

// ---------------- estádio, público, sócios e mosaicos ----------------
H.estadio = () => { S.page = 'estadio'; render(); };
PAGES_T.estadio = 'Estádio e torcida'; PAGES_BACK.estadio = null;
PAGES.estadio = () => {
  const G = S.G, c = myClub(G); if (!c) return '<div class="empty">Sem clube.</div>';
  const s = socioOf(G, c); const cap = (c.cap || 3) * 1000; const games = G.fix.filter((f) => f.h === c.id && f.pub).slice(-8);
  const avgPub = games.length ? Math.round(games.reduce((a, f) => a + f.pub, 0) / games.length) : 0; const occ = cap ? Math.round(avgPub / cap * 100) : 0;
  const rows = Math.max(3, Math.min(8, Math.round(cap / 8000)));
  const stadium = `<svg viewBox="0 0 300 150" class="stad-svg"><defs><linearGradient id="sg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c.c1}"/><stop offset="1" stop-color="${c.c2}"/></linearGradient></defs>
    <ellipse cx="150" cy="78" rx="146" ry="70" fill="#1d2622"/>${Array.from({ length: rows }, (_, i) => `<ellipse cx="150" cy="78" rx="${142 - i * 9}" ry="${66 - i * 5}" fill="none" stroke="url(#sg)" stroke-width="7" stroke-dasharray="${occ > i * (100 / rows) ? '3 1.5' : '1 6'}" opacity="${0.55 + 0.45 * (occ / 100)}"/>`).join('')}
    <rect x="${150 - (142 - rows * 9) * 0.62}" y="${78 - (66 - rows * 5) * 0.55}" width="${(142 - rows * 9) * 1.24}" height="${(66 - rows * 5) * 1.1}" rx="6" fill="#1f7a3e"/><line x1="150" y1="${78 - (66 - rows * 5) * 0.55}" x2="150" y2="${78 + (66 - rows * 5) * 0.55}" stroke="#ffffff88"/><circle cx="150" cy="78" r="8" fill="none" stroke="#ffffff88"/></svg>`;
  const plan = (k, t, d) => `<button class="${s.plan === k ? 'on' : ''}" data-a="socplan" data-v="${k}">${t}<small>${d}</small></button>`;
  const lastMos = G.fix.filter((f) => f.h === c.id && f.mos).slice(-3).reverse();
  return `<div class="cols2"><div class="card"><h3><span>🏟️ ${esc(c.stad || 'Estádio')}</span><span class="pill">${cap.toLocaleString('pt-BR')} lugares</span></h3>${stadium}
    <div class="stat-grid"><div class="stat"><div class="v num" data-count="${avgPub}">${avgPub.toLocaleString('pt-BR')}</div><div class="l">público médio</div></div><div class="stat"><div class="v">${occ}%</div><div class="l">ocupação</div></div><div class="stat"><div class="v">${money(c.price ?? 40)}</div><div class="l">ingresso médio</div></div></div>
    ${games.length ? `<div class="list" style="margin-top:6px">${games.slice().reverse().map((f) => `<div class="li xs">${crest(G.clubs[f.a], 16)}<span class="grow ell">vs ${esc(G.clubs[f.a].name)}</span><b>${f.pub.toLocaleString('pt-BR')}</b>${f.mos ? '<span class="pill">🎨</span>' : ''}</div>`).join('')}</div>` : '<div class="xs mut">Ainda sem jogos em casa nesta temporada.</div>'}</div>
  <div class="card"><h3><span>🎫 Sócio-torcedor</span><span class="pill g num" data-count="${s.n}">${s.n.toLocaleString('pt-BR')}</span></h3>
    <div class="field"><label>Mensalidade: <b id="socv">${money(s.price)}</b> <span class="xs mut">(referência ${money(SOCIO_BASE[c.country] ?? 25)})</span></label><input type="range" min="5" max="${(SOCIO_BASE[c.country] ?? 25) * 4}" step="1" value="${s.price}" data-in="socprice"></div>
    <div class="field"><label>Plano</label><div class="seg plan-seg" style="margin:0">${plan('popular', 'Popular', 'mais sócios')}${plan('normal', 'Normal', 'equilíbrio')}${plan('premium', 'Premium', 'mais receita')}</div></div>
    <div class="xs mut">Meta de sócios com essa configuração: <b>${socioTarget(G, c).toLocaleString('pt-BR')}</b>. Sócios garantem público fiel e receita todo mês. Preço alto afasta; time ganhando atrai.</div>
    <h3 style="margin-top:12px">🎨 Mosaicos e festa</h3>${lastMos.length ? lastMos.map((f) => `<div class="mos-row"><span class="mos" style="--a:${c.c1};--b:${c.c2}"></span><div class="grow"><b class="sm">${esc(f.mos)}</b><div class="xs mut">vs ${esc(G.clubs[f.a].name)} · ${f.pub?.toLocaleString('pt-BR') || ''} torcedores</div></div></div>`).join('') : '<div class="xs mut">A torcida prepara mosaicos nos jogos grandes em casa: clássicos, mata-mata e contra os gigantes.</div>'}</div></div>`;
};
H.socprice = (v) => { const c = myClub(S.G); socioOf(S.G, c).price = +v; const el = document.getElementById('socv'); if (el) el.textContent = money(+v); save(); };
H.socplan = (v) => { const c = myClub(S.G); socioOf(S.G, c).plan = v; render(); save(); };

// ---------------- premiações animadas ----------------
export function showAwards(G, onDone) {
  const A = G.awardsShow; if (!A) { onDone?.(); return; }
  const el = document.createElement('div'); el.className = 'awards';
  const b = A.ballon; const steps = [];
  steps.push(`<div class="aw-step"><div class="aw-kicker">PRÊMIOS DO FUTEBOL ${A.y}</div><div class="aw-title">A grande noite</div><div class="aw-sub">Os melhores da temporada</div></div>`);
  for (const a of (A.lgAw || []).slice(0, 4)) if (a.best) steps.push(`<div class="aw-step"><div class="aw-kicker">${esc(a.lg)} · MELHOR JOGADOR</div><div class="aw-trophy">🏅</div><div class="aw-name">${esc(a.best.n)}</div><div class="aw-sub">${esc(a.best.club)} · nota ${a.best.v}${a.top ? ` · artilheiro: ${esc(a.top.n)} (${a.top.g} gols)` : ''}</div></div>`);
  if (A.team.length) steps.push(`<div class="aw-step"><div class="aw-kicker">SELEÇÃO DO CAMPEONATO · ${esc(A.lg)}</div><div class="aw-team">${A.team.map((p) => `<span style="--k:${p.c1 || '#2fe08a'}"><b>${esc(shortName(p.n))}</b><small>${esc(p.pos)} · ${esc(p.club)}</small></span>`).join('')}</div></div>`);
  if (b.length) steps.push(`<div class="aw-step"><div class="aw-kicker">BOLA DE OURO · FINALISTAS</div><div class="aw-list">${b.slice(1).reverse().map((p, i) => `<div style="animation-delay:${i * 0.45}s"><span>${5 - i}º</span><b>${esc(p.n)}</b><small>${esc(p.club)}</small></div>`).join('')}</div></div>`,
    `<div class="aw-step gold"><div class="aw-kicker">E A BOLA DE OURO ${A.y} VAI PARA…</div><div class="aw-ball"></div><div class="aw-name big">${esc(b[0].n)}</div><div class="aw-sub">${esc(b[0].club)} · ${b[0].g} gols · ${b[0].a} assistências · nota ${b[0].nota}</div><div class="confetti">${Array.from({ length: 40 }, (_, i) => `<i style="--x:${(i * 37) % 100};--d:${(i % 7) * 0.3}s;--c:${['#f4c542', '#2fe08a', '#ffffff', '#ff5a5f'][i % 4]}"></i>`).join('')}</div></div>`);
  if (A.mine.length) steps.push(`<div class="aw-step"><div class="aw-kicker">DO SEU CLUBE</div><div class="aw-list">${A.mine.map((t) => `<div><b>⭐ ${esc(t)}</b></div>`).join('')}</div></div>`);
  el.innerHTML = `<div class="aw-stage">${steps[0]}</div><div class="aw-nav"><span class="xs mut" id="awn">1/${steps.length}</span><button class="btn pri" id="awb">Próximo ›</button><button class="btn sm ghost" id="awx">Pular</button></div>`;
  document.body.appendChild(el); let i = 0;
  const go = () => { i++; if (i >= steps.length) { el.classList.add('out'); setTimeout(() => { el.remove(); onDone?.(); }, 400); return; } el.querySelector('.aw-stage').innerHTML = steps[i]; el.querySelector('#awn').textContent = `${i + 1}/${steps.length}`; if (i === steps.length - 1) el.querySelector('#awb').textContent = 'Fechar'; };
  el.querySelector('#awb').onclick = go; el.querySelector('#awx').onclick = () => { el.remove(); onDone?.(); };
}

// ---------------- animação de título e retrospectiva ----------------
function showTitle(G, t) {
  const c = myClub(G); const el = document.createElement('div'); el.className = 'title-anim';
  el.innerHTML = `<div class="ta-burst" style="--c1:${c?.c1 || '#2fe08a'};--c2:${c?.c2 || '#fff'}"></div><div class="ta-in"><div class="ta-cup">🏆</div><div class="ta-k">CAMPEÃO</div><div class="ta-n">${esc(t.c || t.n || 'Título')}</div><div class="ta-s">${esc(c?.name || '')} · ${t.y || G.year}</div></div><div class="confetti">${Array.from({ length: 60 }, (_, i) => `<i style="--x:${(i * 29) % 100};--d:${(i % 9) * 0.25}s;--c:${[c?.c1 || '#2fe08a', c?.c2 || '#fff', '#f4c542'][i % 3]}"></i>`).join('')}</div><button class="btn pri ta-b">Comemorar 🎉</button>`;
  document.body.appendChild(el); el.querySelector('.ta-b').onclick = () => { el.classList.add('out'); setTimeout(() => el.remove(), 400); };
  try { navigator.vibrate?.([120, 80, 120, 80, 300]); } catch {}
}
export function showRecap(G) {
  const R = G.recap; if (!R) return;
  openSheet(`<div class="recap" style="--c1:${R.c1 || '#2fe08a'}"><div class="aw-kicker">RETROSPECTIVA ${R.y}</div><h2>${esc(R.club || 'Sua temporada')}</h2>
  <div class="stat-grid"><div class="stat"><div class="v">${R.pos ? R.pos + 'º' : '–'}</div><div class="l">na liga</div></div><div class="stat"><div class="v">${R.stats?.v ?? 0}-${R.stats?.e ?? 0}-${R.stats?.d ?? 0}</div><div class="l">V-E-D na carreira</div></div><div class="stat"><div class="v">${Math.round(R.rep || 0)}</div><div class="l">reputação</div></div></div>
  <div class="list">${R.obj ? `<div class="li"><span class="grow">🎯 Objetivo: ${esc(R.obj)}</span><span class="pill ${R.ok ? 'g' : 'r'}">${R.ok ? 'Cumprido' : 'Não cumprido'}</span></div>` : ''}${R.titles?.length ? R.titles.map((t) => `<div class="li">🏆 <b class="grow">${esc(t)}</b></div>`).join('') : '<div class="li mut">Sem títulos nesta temporada</div>'}
  ${R.top ? `<div class="li">⚽ Artilheiro: <b class="grow">${esc(R.top.n)}</b><span>${R.top.g} gols</span></div>` : ''}${R.best ? `<div class="li">⭐ Melhor nota: <b class="grow">${esc(R.best.n)}</b><span>${R.best.v}</span></div>` : ''}</div></div>`);
}

// ---------------- apresentação de reforço ----------------
function shirtBack(k, name, num, w = 210) {
  const id = 'sb' + Math.random().toString(36).slice(2, 7); let pat = '';
  if (k.pat === 'listras') pat = Array.from({ length: 5 }, (_, i) => `<rect x="${18 + i * 14}" y="0" width="7" height="100" fill="${k.c2}"/>`).join('');
  else if (k.pat === 'faixa') pat = `<polygon points="20,10 40,10 90,100 70,100" fill="${k.c2}"/>`; else if (k.pat === 'meio') pat = `<rect x="50" y="0" width="50" height="100" fill="${k.c2}"/>`;
  const tc = textOn(k.pat === 'liso' || !k.pat ? k.c1 : k.c1); const sh = 'M30 8 L42 6 Q50 9 58 6 L70 8 L94 22 L84 40 L74 34 L74 94 L26 94 L26 34 L16 40 L6 22 Z';
  const fs = name.length > 11 ? 6.2 : name.length > 8 ? 7.4 : 8.6;
  return `<svg viewBox="0 0 100 100" width="${w}" height="${w}"><defs><clipPath id="${id}"><path d="${sh}"/></clipPath><linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".45" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient></defs>
  <g clip-path="url(#${id})"><rect width="100" height="100" fill="${k.c1}"/>${pat}<path d="M42 6 Q50 10 58 6" stroke="${k.c2}" stroke-width="3" fill="none"/>
  <text x="50" y="31" text-anchor="middle" font-family="'Barlow Condensed',system-ui" font-weight="800" font-size="${fs}" letter-spacing=".8" fill="${tc}" stroke="${k.c2}" stroke-width=".35" paint-order="stroke">${esc(name)}</text>
  <text x="50" y="72" text-anchor="middle" font-family="'Barlow Condensed',system-ui" font-weight="800" font-size="40" fill="${tc}" stroke="${k.c2}" stroke-width=".8" paint-order="stroke">${num}</text>
  <rect width="100" height="100" fill="url(#${id}g)"/></g><path d="${sh}" fill="none" stroke="#0007" stroke-width="1.2"/></svg>`;
}
function countTo(el, to, fmt, ms = 1100, delay = 0) { if (!el) return; setTimeout(() => { const t0 = performance.now(); const f = (t) => { const k = Math.min(1, (t - t0) / ms); el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }, delay); }
function showSigning(G, s) {
  const p = G.players[s.pid]; const c = myClub(G); if (!p || !c) return;
  const k = c.kits?.h || { c1: c.c1, c2: c.c2, pat: 'liso' };
  const nm = shortName(p.n).toUpperCase(); const num = s.num || p.num || 10;
  const glow = (lum(c.c1) < 0.18 ? c.c2 : c.c1);
  const letters = [...p.n].map((ch, i) => `<span style="animation-delay:${1.5 + i * 0.035}s">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
  const wage = p.wage ? money(p.wage) + '/sem.' : '';
  const el = document.createElement('div'); el.className = 'sign-anim v4'; el.style.setProperty('--c1', c.c1); el.style.setProperty('--c2', c.c2); el.style.setProperty('--gl', glow);
  el.innerHTML = `<div class="sg-bg"></div><div class="sg-beam l"></div><div class="sg-beam r"></div><div class="sg-crowd"></div><div class="sg-flash"></div>
  <div class="sg-grid">
    <div class="sg-left"><div class="sg-crest">${crest(c, 64)}</div><div class="sg-ring"></div><div class="sg-shirt3d"><div class="sg-face front">${kitSvg(k, 210)}</div><div class="sg-face back">${shirtBack(k, nm, num, 210)}</div></div><div class="sg-floor"></div></div>
    <div class="sg-right">
      <div class="sg-kick"><i></i>REFORÇO CONFIRMADO<i></i></div>
      <div class="sg-club">${esc(c.name)}</div>
      <div class="sg-name" style="font-size:${p.n.length > 20 ? 30 : p.n.length > 15 ? 36 : 46}px">${letters}</div>
      <div class="sg-stats">
        <div class="sg-st" style="--d:2.1s"><span class="pos ${p.pos ? ({ GOL: 'G', LD: 'D', ZAG: 'D', LE: 'D', VOL: 'M', MC: 'M', MEI: 'M', PE: 'A', PD: 'A', ATA: 'A' })[p.pos] : ''}">${p.pos}</span><small>posição</small></div>
        <div class="sg-st" style="--d:2.25s"><b id="sgovr">0</b><small>geral</small></div>
        <div class="sg-st" style="--d:2.4s"><b>${p.age}</b><small>anos</small></div>
        <div class="sg-st" style="--d:2.55s"><b>#${num}</b><small>camisa</small></div>
      </div>
      <div class="sg-deal" style="--d:2.8s">${s.fee ? `<div><small>Transferência</small><b id="sgfee">R$ 0</b></div>` : '<div><small>Chegada</small><b>Sem custo</b></div>'}${wage ? `<div><small>Salário</small><b>${wage}</b></div>` : ''}<div><small>Contrato</small><b>até ${p.con}</b></div></div>
      <button class="btn pri sg-go">Bem-vindo! 👏</button>
    </div>
  </div><div class="confetti sg-conf">${Array.from({ length: 46 }, () => `<i style="--x:${Math.random() * 100};--d:${(1.2 + Math.random() * 2.2).toFixed(2)}s;--c:${[c.c1, c.c2, '#f4c542', '#ffffff'][Math.floor(Math.random() * 4)]}"></i>`).join('')}</div>`;
  document.body.appendChild(el);
  countTo(el.querySelector('#sgovr'), p.ovr, (v) => String(v), 900, 2250);
  if (s.fee) countTo(el.querySelector('#sgfee'), s.fee, (v) => money(v), 1200, 2850);
  const fl = el.querySelector('.sg-flash'); let n = 0; const iv = setInterval(() => { if (!el.isConnected || n++ > 14) { clearInterval(iv); return; } const d = document.createElement('i'); d.style.left = Math.random() * 100 + '%'; d.style.top = 55 + Math.random() * 40 + '%'; fl.appendChild(d); setTimeout(() => d.remove(), 500); }, 260);
  try { vibrate?.(30); } catch {}
  el.querySelector('.sg-go').onclick = () => { el.classList.add('out'); setTimeout(() => el.remove(), 400); };
}
const lum = (hex) => { const h = (hex || '#000').replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16); return ((n >> 16 & 255) * 0.299 + (n >> 8 & 255) * 0.587 + (n & 255) * 0.114) / 255; };

// ---------------- sala de troféus, lendas e prêmios ----------------
PAGES_T.trofeus = 'Sala de troféus'; PAGES_BACK.trofeus = null;
PAGES.trofeus = () => {
  const G = S.G, me = G.me; const t = me.titles || [];
  const shelf = t.length ? t.map((x) => `<div class="trophy" title="${esc(x.c || x.n || '')}"><div class="cup ${x.kind || ''}">${x.kind === 'cont' ? '🏆' : x.kind === 'cup' ? '🥇' : x.kind === 'state' ? '🎖️' : '🏆'}</div><b>${esc(x.c || x.n || 'Título')}</b><small>${x.y || ''}${x.club ? ' · ' + esc(x.club) : ''}</small></div>`).join('') : '<div class="empty">Sua estante ainda está vazia. Os títulos que você ganhar aparecem aqui.</div>';
  const aw = (me.awards || []).map((a) => `<div class="li">🎖️ <span class="grow">${a.k === 'tecnico' ? 'Melhor técnico' : esc(a.k)} · ${esc(a.lg || '')}</span><b>${a.y}</b></div>`).join('');
  return `<div class="card shelf-card"><h3><span>🏆 Estante</span><span class="pill">${t.length} títulos</span></h3><div class="shelf">${shelf}</div></div>
  <div class="cols2"><div class="card"><h3>🎖️ Prêmios individuais</h3><div class="list">${aw || '<div class="mut sm">Nenhum ainda.</div>'}</div></div>
  <div class="card"><h3>📜 Temporadas</h3><div class="list">${(me.hist || []).slice().reverse().map((h) => `<div class="li sm"><b>${h.y || ''}</b><span class="grow ell">${esc(h.club || '')}</span><span class="mut">${h.pos ? h.pos + 'º' : ''}</span></div>`).join('') || '<div class="mut sm">—</div>'}</div>${G.recap ? '<button class="btn sm blk" style="margin-top:8px" data-a="recap">Ver retrospectiva da última temporada</button>' : ''}${G.awardsShow ? '<button class="btn sm blk" style="margin-top:6px" data-a="awards">Rever a cerimônia de prêmios</button>' : ''}</div></div>`;
};
H.recap = () => showRecap(S.G); H.awards = () => showAwards(S.G);
PAGES_T.lendas = 'Mural de lendas'; PAGES_BACK.lendas = null;
PAGES.lendas = () => {
  const G = S.G; const L = (G.legends || []).slice().reverse(); const bo = (G.awardsHist || []).slice().reverse();
  return `<div class="cols2"><div class="card"><h3>🌟 Lendas aposentadas</h3>${L.length ? `<div class="legend-wall">${L.map((x) => `<div class="legend"><b>${esc(x.n)}</b><small>${esc(x.pos)} · ${esc(x.club || '')}</small><span>${x.j} jogos · ${x.g} gols${x.ball ? ` · ${x.ball}× Bola de Ouro` : ''}</span><i>${x.y}</i></div>`).join('')}</div>` : '<div class="mut sm">Quando grandes jogadores se aposentarem, eles entram aqui.</div>'}</div>
  <div class="card"><h3>⚽ Bola de Ouro</h3><div class="list">${bo.map((x) => `<div class="li sm"><b>${x.y}</b><span class="grow ell">${esc(x.ballon || '')}</span><span class="mut ell">${esc(x.club || '')}</span></div>`).join('') || '<div class="mut sm">A primeira entrega é no fim desta temporada.</div>'}</div><button class="btn sm blk" style="margin-top:8px" data-a="tab" data-v="carreira">Hall da Fama dos técnicos ›</button></div></div>`;
};

// ---------------- uniformes ----------------
PAGES_T.uniformes = 'Uniformes'; PAGES_BACK.uniformes = null;
const PATS = { liso: 'Liso', listras: 'Listras', faixa: 'Faixa', meio: 'Metade', golas: 'Detalhes' };
export function kitSvg(k, w = 90) {
  const id = 'k' + Math.random().toString(36).slice(2, 7); let pat = '';
  if (k.pat === 'listras') pat = Array.from({ length: 5 }, (_, i) => `<rect x="${18 + i * 14}" y="0" width="7" height="100" fill="${k.c2}"/>`).join('');
  else if (k.pat === 'faixa') pat = `<polygon points="20,10 40,10 90,100 70,100" fill="${k.c2}"/>`; else if (k.pat === 'meio') pat = `<rect x="50" y="0" width="50" height="100" fill="${k.c2}"/>`;
  return `<svg viewBox="0 0 100 100" width="${w}" height="${w}"><defs><clipPath id="${id}"><path d="M30 8 L42 4 Q50 12 58 4 L70 8 L94 22 L84 40 L74 34 L74 94 L26 94 L26 34 L16 40 L6 22 Z"/></clipPath></defs><g clip-path="url(#${id})"><rect width="100" height="100" fill="${k.c1}"/>${pat}<path d="M42 4 Q50 14 58 4" stroke="${k.c2}" stroke-width="5" fill="none"/></g><path d="M30 8 L42 4 Q50 12 58 4 L70 8 L94 22 L84 40 L74 34 L74 94 L26 94 L26 34 L16 40 L6 22 Z" fill="none" stroke="#0006" stroke-width="1.5"/></svg>`;
}
PAGES.uniformes = () => {
  const G = S.G, c = myClub(G); if (!c) return '<div class="empty">Sem clube.</div>';
  c.kits ||= { h: { c1: c.c1, c2: c.c2, pat: 'liso' }, a: { c1: c.c2 === c.c1 ? '#ffffff' : c.c2, c2: c.c1, pat: 'liso' } };
  const ed = (k, t) => { const K = c.kits[k]; return `<div class="card kit-card"><h3>${t}</h3><div class="row" style="gap:14px;align-items:center">${kitSvg(K, 110)}<div class="grow"><div class="field"><label>Cor principal</label><input type="color" value="${K.c1}" data-ch="kitc" data-k="${k}:c1"></div><div class="field"><label>Cor secundária</label><input type="color" value="${K.c2}" data-ch="kitc" data-k="${k}:c2"></div></div></div><div class="chips">${Object.entries(PATS).map(([p, n]) => `<span class="chip ${K.pat === p ? 'on' : ''}" data-a="kitp" data-v="${k}:${p}">${n}</span>`).join('')}</div></div>`; };
  return `<div class="cols2">${ed('h', '🏠 Uniforme 1 (casa)')}${ed('a', '✈️ Uniforme 2 (fora)')}</div><div class="hint">As cores do uniforme 1 aparecem nas partidas 2D e 3D, no campinho da tática e no tema da interface.</div>`;
};
H.kitc = (v, el) => { const c = myClub(S.G); const [k, f] = (el?.dataset.k || '').split(':'); if (!k) return; c.kits[k][f] = v; if (k === 'h') { if (f === 'c1') c.c1 = v; else c.c2 = v; } save(); render(); };
H.kitp = (v) => { const c = myClub(S.G); const [k, p] = v.split(':'); c.kits[k].pat = p; save(); render(); };

// ---------------- busca global ----------------
H.search = () => { openSheet(`<h2>🔎 Buscar</h2><input id="gsq" placeholder="Jogador, clube ou competição" autocomplete="off" style="margin-bottom:8px"><div id="gsr" class="list"></div>`); const i = document.getElementById('gsq'); i.focus(); i.addEventListener('input', () => doSearch(i.value)); };
function doSearch(q) {
  const G = S.G; const el = document.getElementById('gsr'); if (!el) return; const n = q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); if (n.length < 2) { el.innerHTML = ''; return; }
  const nn = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const cl = G.clubs.filter((c) => c.league && (nn(c.name).includes(n) || nn(c.short).includes(n))).slice(0, 6);
  const ps = G.players.filter((p) => p && p.club >= -1 && nn(p.n).includes(n)).sort((a, b) => b.ovr - a.ovr).slice(0, 12);
  const cs = Object.values(G.comps).filter((c) => nn(c.name).includes(n)).slice(0, 5);
  el.innerHTML = cl.map((c) => `<div class="li tap" data-a="club" data-v="${c.id}">${crest(c, 24)}<span class="grow b ell">${esc(c.name)}</span><span class="xs mut">clube</span></div>`).join('')
    + cs.map((c) => `<div class="li tap" data-a="compgo" data-v="${c.id}"><span class="grow b ell">🏆 ${esc(c.name)}</span><span class="xs mut">competição</span></div>`).join('')
    + ps.map((p) => `<div class="li tap" data-a="player" data-v="${p.id}">${posTag(p.pos)}<span class="grow b ell">${esc(p.n)}</span><span class="xs mut ell">${p.club >= 0 ? esc(G.clubs[p.club].short || '') : 'livre'}</span><b>${p.ovr}</b></div>`).join('') || '<div class="mut sm">Nada encontrado.</div>';
}

// ---------------- tema, números animados, gestos e gatilhos ----------------
export function applyTheme() {
  const G = S.G, c = G && myClub(G); const b = document.body;
  b.classList.toggle('light', SET.theme === 'claro'); b.classList.toggle('simple', !!SET.simple);
  if (c && SET.clubTheme) { const lum = (h) => { const n = parseInt(h.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; }; let col = c.c1; if (lum(col) < 0.18 || lum(col) > 0.92) col = c.c2; if (lum(col) < 0.18 || lum(col) > 0.92) col = null; if (col) { b.style.setProperty('--club', col); b.classList.add('clubtheme'); } else b.classList.remove('clubtheme'); }
  else b.classList.remove('clubtheme');
}
function countUp() {
  for (const el of document.querySelectorAll('[data-count]:not([data-done])')) { el.dataset.done = 1; const to = +el.dataset.count; if (!isFinite(to) || to <= 0) continue; const t0 = performance.now(), d = 700; const f = (t) => { const k = Math.min(1, (t - t0) / d); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString('pt-BR'); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }
}
export function afterRender() {
  const G = S.G; if (!G) return; applyTheme(); countUp();
  if (S.page === null && S.tab === 'home') { const box = document.getElementById('homex'); if (box) box.innerHTML = homeExtra(G); countUp(); }
  // gatilhos de celebração
  const me = G.me; const nt = (me.titles || []).length;
  if (me._tSeen == null) me._tSeen = nt; else if (nt > me._tSeen) { const t = me.titles[nt - 1]; me._tSeen = nt; setTimeout(() => showTitle(G, t), 300); }
  if (G.awardsShow && G.awardsShow.y !== me._awSeen && G.week < 3) { me._awSeen = G.awardsShow.y; const rc = G.recap && G.recap.y !== me._rcSeen; if (rc) me._rcSeen = G.recap.y; setTimeout(() => showAwards(G, () => { if (rc) showRecap(G); }), 500); }
  if (me.lastSign && !me.lastSign.seen) { me.lastSign.seen = true; setTimeout(() => showSigning(G, me.lastSign), 250); }
}
// gestos: deslizar para trocar de aba
const ORDER = ['home', 'sq', 'tat', 'base', 'jg', 'mk', 'clube', 'carreira', 'mundo'];
let sw = null;
document.addEventListener('touchstart', (e) => { if (!S.G || S.page || e.touches.length !== 1 || e.target.closest('.sheet,.pitch,.lv,input,canvas,.lance,.scroll-x,.chips,.seg,.tbl-wrap')) { sw = null; return; } sw = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }; }, { passive: true });
document.addEventListener('touchend', (e) => { if (!sw) return; const t = e.changedTouches[0]; const dx = t.clientX - sw.x, dy = t.clientY - sw.y; const ok = Math.abs(dx) > 90 && Math.abs(dy) < 50 && Date.now() - sw.t < 500; sw = null; if (!ok) return; const i = ORDER.indexOf(S.tab); if (i < 0) return; const j = clamp(i + (dx < 0 ? 1 : -1), 0, ORDER.length - 1); if (j !== i) { H.tab(ORDER[j]); } }, { passive: true });

// ---------------- nova carreira: escolher país e divisão ----------------
export function careerLeagues(mode) { return mode === 'sub20' ? LEAGUES.filter((l) => l.id === 'BRA' || l.id === 'BRB') : LEAGUES; }
export { COUNTRIES };
