// Redes sociais do jogo — bem simples: um feed com o que torcida, imprensa e clube estão falando
import { pick, rnd, ri, clamp } from '../util.js';

const H_T = ['@torcedor_fiel', '@arquibancada', '@doente_por_futebol', '@bancada_nervosa', '@raiz_fc', '@cornetero', '@sofredor10', '@vozdaarquibancada'];
const H_J = ['@setorista', '@bolabastidores', '@mesaredonda', '@jornal_do_esporte', '@reporterdecampo'];
const tag = (n) => '@' + n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 14);
const sn = (n) => { const s = (n || '').split(' '); return s.length > 1 && n.length > 12 ? s[s.length - 1] : n; };

export function post(G, p) { (G.social ||= []).unshift({ t: G.t, y: G.year, w: G.week, l: ri(12, 400) * (p.big ? 40 : 1), ...p }); if (G.social.length > 60) G.social.length = 60; }

export function socialAfterMatch(G, f, c) {
  if (!c) return; const side = f.h === c.id ? 0 : 1; const opp = G.clubs[side ? f.h : f.a];
  const gf = side ? f.ag : f.hg, ga = side ? f.hg : f.ag; if (gf == null) return;
  const ev = f.ev || []; const goals = ev.filter((e) => e[1] === 0 && e[2] === side); const cnt = {}; for (const e of goals) cnt[e[3]] = (cnt[e[3]] || 0) + 1;
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]; const tp = top ? G.players[+top[0]] : null;
  const notas = Object.entries(f.notas || {}).map(([id, n]) => [G.players[id], n]).filter(([p]) => p && p.club === c.id).sort((a, b) => b[1] - a[1]);
  const best = notas[0]?.[0], worst = notas[notas.length - 1];
  const club = c.name; const coach = G.me.name.split(' ')[0]; const res = gf > ga ? 'V' : gf < ga ? 'D' : 'E'; const sc = `${gf}x${ga}`;
  const clubH = tag(c.short || c.name);
  // perfil oficial
  post(G, { who: 'clube', h: clubH, n: club, txt: res === 'V' ? `FIM DE JOGO! ${club} ${sc} ${opp.name}. ${tp ? `${sn(tp.n)} decidiu! ` : ''}Vamos juntos! 💪` : res === 'E' ? `Fim de jogo: ${club} ${sc} ${opp.name}. Seguimos.` : `Fim de jogo: ${club} ${sc} ${opp.name}. Cabeça erguida, é trabalho.`, big: true });
  // torcida
  const happy = res === 'V' ? [`QUE JOGO! ${tp ? sn(tp.n) + ' é diferenciado demais 🔥' : 'Time tá voando!'}`, `${sc} e ainda foi pouco. Professor ${coach} tá de parabéns`, `Ganhar do ${opp.name} é sempre bom demais 😍`, `Esse time tem cara de campeão, anota aí`]
    : res === 'E' ? [`Empate com gosto amargo... dava pra mais`, `${coach} demorou pra mexer de novo 🙄`, `Um ponto é um ponto, bola pra frente`, `Faltou capricho no último passe`]
      : [`Inadmissível perder assim pro ${opp.name} 😡`, `${coach}, cadê a mudança no intervalo??`, `${worst ? sn(worst[0].n) + ' não pode mais ser titular' : 'Tem muita gente sem vontade em campo'}`, `Vergonha. Quero raça!`];
  const n = ri(2, 3); const used = new Set(); for (let i = 0; i < n; i++) { let t = pick(happy); if (used.has(t)) continue; used.add(t); post(G, { who: 'torcida', h: pick(H_T), n: 'Torcedor', txt: t, mood: res }); }
  // imprensa
  if (rnd() < 0.7) post(G, { who: 'imprensa', h: pick(H_J), n: 'Imprensa', txt: res === 'V' ? `${club} vence o ${opp.name} por ${sc}.${best ? ` Destaque: ${best.n} (nota ${notas[0][1].toFixed(1)}).` : ''}` : res === 'E' ? `${club} e ${opp.name} ficam no ${sc}.` : `${club} perde para o ${opp.name} por ${sc} e pressão aumenta sobre ${G.me.name}.` });
  // jogador destaque
  if (best && notas[0][1] >= 7.5 && rnd() < 0.6) post(G, { who: 'jogador', h: tag(best.n), n: best.n, txt: pick(['Vitória importante! Obrigado, torcida 🙏', 'Feliz em ajudar. Seguimos trabalhando!', 'Que noite! Valeu, nação ❤️']) });
  // humor da torcida (0..100)
  G.fanMood = clamp((G.fanMood ?? 60) + (res === 'V' ? 6 : res === 'E' ? -1 : -8), 5, 98);
  G.me.fol = Math.round((G.me.fol || 1200) * (res === 'V' ? 1.015 : 1.003) + (G.me.pop || 0) * 3);
}
export function socialNews(G, txt, big = false) { post(G, { who: 'imprensa', h: pick(H_J), n: 'Imprensa', txt, big }); }
