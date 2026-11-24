// Auxiliar técnico (análise real do adversário), jogadas ensaiadas e conversas individuais
import { clamp, hash, pick, rnd } from '../util.js';
import { autoLineup, ratings, formOf } from './match.js';
import { attrs } from './youth.js';
import { msg } from './game.js';

const A = (p, k) => { const a = attrs(p); const i = ['Ritmo', 'Finalização', 'Passe', 'Drible', 'Defesa', 'Físico'].indexOf(k); return a[i]?.[1] ?? p.ovr; };
const sn = (n) => { const s = n.split(' '); return s.length > 1 && n.length > 12 ? s[s.length - 1] : n; };

// ---------- auxiliar técnico ----------
export function assistReport(G, me, opp, myXi, youth = false, q = 12) {
  const lu = autoLineup(G, opp, youth); const form = formOf(opp.tact); const T = opp.tact || {};
  const xi = lu.xi.map((id, i) => ({ p: G.players[id], pos: form[i][0], w: form[i][1] })).filter((x) => x.p);
  const R = ratings(G, opp, lu.xi, 0, opp.tact); const Rm = myXi ? ratings(G, me, myXi, 0, me.tact) : null;
  const items = [];
  // lateral lento → atacar por aquele lado
  const fb = xi.filter((x) => x.pos === 'LD' || x.pos === 'LE').map((x) => ({ ...x, r: A(x.p, 'Ritmo') })).sort((a, b) => a.r - b.r)[0];
  if (fb && fb.r < 72) { const side = fb.pos === 'LD' ? 0 : 2; items.push({ id: 'lado', ic: '🎯', t: `Atacar pelo lado ${side === 0 ? 'esquerdo' : 'direito'}`, why: `O ${fb.pos === 'LD' ? 'lateral-direito' : 'lateral-esquerdo'} deles, ${sn(fb.p.n)}, é lento (ritmo ${fb.r}). Nossos pontas levam vantagem ali.`, apply: { foco: side, larg: 2 }, fx: { att: 1.3 } }); }
  // pressão alta deles → bola longa
  if ((T.press ?? 1) === 2) items.push({ id: 'longa', ic: '🚀', t: 'Passes longos nas costas', why: 'Eles pressionam muito alto e deixam espaço atrás da linha. Lançamentos rápidos furam a pressão.', apply: { passe: 2, tempo: 2 }, fx: { att: 1, ctl: 0.4 } });
  // mentalidade ofensiva deles → contra-ataque
  if ((T.ment ?? 1) === 2) items.push({ id: 'contra', ic: '⚡', t: 'Jogar no contra-ataque', why: 'Eles vêm com tudo pra cima e os laterais sobem juntos. Recuar e sair rápido mata o jogo.', apply: { contra: 1, linha: 0 }, fx: { att: 1.1, def: 0.6 } });
  // bloco baixo deles → paciência
  if ((T.ment ?? 1) === 0) items.push({ id: 'paciencia', ic: '🧩', t: 'Paciência contra o ferrolho', why: 'Eles vão se fechar atrás. Toque curto, pontas abertos e chute de fora.', apply: { passe: 0, larg: 2, tempo: 0 }, fx: { att: 0.9, ctl: 0.6 } });
  // zaga fraca no alto → bola parada
  const cb = xi.filter((x) => x.pos === 'ZAG'); const air = cb.length ? cb.reduce((t, x) => t + A(x.p, 'Físico'), 0) / cb.length : 80;
  if (air < 74) items.push({ id: 'aereo', ic: '🚩', t: 'Explorar a bola aérea', why: `A zaga deles é fraca pelo alto (físico ${Math.round(air)}). Escanteio no segundo pau e cruzamentos.`, apply: { bola: 1 }, plays: { ck: 'segundo' }, fx: { att: 0.8 } });
  // craque deles → marcação individual
  const star = xi.filter((x) => !['GOL', 'ZAG', 'LD', 'LE'].includes(x.pos)).sort((a, b) => b.p.ovr - a.p.ovr)[0];
  if (star && star.p.ovr >= (Rm ? Rm.def - 2 : 70)) items.push({ id: 'marca', ic: '🔒', t: `Marcação individual no ${sn(star.p.n)}`, why: `${star.p.n} (${star.p.ovr}) é quem cria tudo. Encaixe a marcação nele.`, apply: { marc: 1 }, fx: { def: 1 } });
  // ataque forte deles → linha baixa
  if (Rm && R.att > Rm.def + 3) items.push({ id: 'linha', ic: '🧱', t: 'Linha defensiva mais baixa', why: `O ataque deles (${Math.round(R.att)}) é mais forte que nossa defesa (${Math.round(Rm.def)}). Não dê espaço nas costas.`, apply: { linha: 0 }, fx: { def: 1.2 } });
  // defesa fraca deles → pressão
  if (Rm && R.def < Rm.att - 3) items.push({ id: 'pressao', ic: '🔥', t: 'Pressionar a saída de bola', why: `A defesa deles (${Math.round(R.def)}) erra sob pressão. Marque alto e roube perto do gol.`, apply: { press: 2 }, fx: { att: 1, ctl: 0.5 } });
  const fit = xi.filter((x) => x.p.fit < 75).length; if (fit >= 3) items.push({ id: 'ritmo', ic: '🏃', t: 'Acelerar o jogo', why: `${fit} titulares deles chegam cansados. Ritmo alto desde o começo.`, apply: { tempo: 2 }, fx: { att: 0.6, ctl: 0.4 } });
  const best = bestPlays(opp);
  return { items: items.slice(0, q >= 14 ? 4 : q >= 9 ? 3 : 2), form: opp.tact?.form, oppT: { form: T.form, ment: T.ment, press: T.press }, plays: best };
}
export function assistBonus(rep, tact) {
  if (!rep) return { att: 0, def: 0, ctl: 0, hit: [] }; const b = { att: 0, def: 0, ctl: 0, hit: [] };
  for (const it of rep.items) { const ok = Object.entries(it.apply).every(([k, v]) => (tact[k] ?? (k === 'foco' || k === 'larg' || k === 'tempo' || k === 'linha' || k === 'passe' || k === 'press' || k === 'ment' ? 1 : 0)) === v) && (!it.plays || Object.entries(it.plays).every(([k, v]) => tact.plays?.[k] === v));
    if (ok) { for (const k of ['att', 'def', 'ctl']) b[k] += it.fx[k] || 0; b.hit.push(it.id); } }
  b.att = Math.min(b.att, 2.4); b.def = Math.min(b.def, 2.2); b.ctl = Math.min(b.ctl, 1.2); return b;
}

// ---------- jogadas ensaiadas ----------
export const PLAYS = {
  ck: { primeiro: ['🎯', 'Primeiro pau', 'Cruzamento fechado no primeiro poste, desvio de cabeça.'], segundo: ['🌙', 'Segundo pau', 'Bola longa no segundo poste para o zagueiro mais alto.'], curto: ['🔁', 'Escanteio curto', 'Tabela curta e cruzamento de frente para o gol.'], marca: ['💥', 'Na marca do pênalti', 'Bola rasteira para quem chega de trás finalizar.'] },
  fk: { direto: ['🎯', 'Direto ao gol', 'O cobrador bate direto, buscando o ângulo.'], cruz: ['📦', 'Cruzamento na área', 'Bola alta para os grandalhões disputarem.'], rolada: ['🦶', 'Rolada para o chute', 'Toque curto para um meia chegar batendo.'] },
};
// cada adversário defende melhor ou pior cada jogada (fixo por clube) → o auxiliar descobre
export function playFit(opp, kind, play) { const h = hash(`${opp.key || opp.id}:${kind}:${play}`); return 0.7 + (h % 71) / 100; }
export function bestPlays(opp) { const out = {}; for (const k of ['ck', 'fk']) out[k] = Object.keys(PLAYS[k]).sort((a, b) => playFit(opp, k, b) - playFit(opp, k, a))[0]; return out; }
export function setPieceChance(G, side, kind, tact, opp, takerOvr = 70) {
  const play = tact?.plays?.[kind] || (kind === 'ck' ? 'primeiro' : 'cruz');
  const base = kind === 'ck' ? 0.02 : 0.045; const train = (tact?.spTrain || 0) * 0.004;
  return clamp(base * playFit(opp, kind, play) * (0.8 + (takerOvr - 60) / 100) + train, 0.01, 0.09);
}

// ---------- conversas individuais ----------
export const TALKS = {
  elogio: ['👏', 'Elogiar', 'Reconhecer o bom trabalho'],
  cobrar: ['📢', 'Cobrar mais empenho', 'Pedir mais entrega nos treinos e jogos'],
  vaga: ['📋', 'Prometer vaga de titular', 'Garantir que ele vai jogar mais'],
  futuro: ['🔮', 'Falar sobre o futuro', 'Mostrar o plano do clube para ele'],
  lider: ['🧢', 'Pedir liderança', 'Pedir que ajude os mais novos e puxe o grupo'],
  calma: ['🫂', 'Acalmar', 'Tirar a pressão das costas dele'],
};
export function talkTo(G, p, kind) {
  p.tk ||= {}; if (p.tk.last != null && G.t - p.tk.last < 3) return { ok: false, txt: 'Você conversou com ele há pouco tempo. Dê uns dias antes de chamar de novo.' };
  p.tk.last = G.t;
  const form = p.st?.j ? p.st.ns / p.st.j : 6.3; const per = p.per || 'Normal'; const young = p.age <= 21, vet = p.age >= 30;
  const starter = (p.st?.j || 0) >= Math.max(2, (G.week || 1) * 0.5);
  let d = 0, txt = '', mood = 'ok';
  const R = (a) => pick(a);
  switch (kind) {
    case 'elogio': if (form >= 6.8) { d = 8; txt = R([`"Valeu, professor! Vou continuar assim."`, `"Isso me dá muita confiança, obrigado!"`]); mood = 'bom'; } else if (form >= 6.2) { d = 4; txt = R([`"Obrigado! Sei que posso render mais."`, `"Fico feliz que tenha percebido."`]); } else { d = -2; txt = R([`"Elogio? Eu sei que não estou bem…"`, `"Não precisa passar a mão na minha cabeça."`]); mood = 'meh'; } break;
    case 'cobrar': if (form < 6.3 && per !== 'Temperamental') { d = 3; txt = R([`"Entendi. Vou mostrar no treino."`, `"Pode deixar, vou dar a volta por cima."`]); p.tk.push = G.t + 4; } else if (per === 'Temperamental' || form >= 6.8) { d = -9; txt = R([`"Cobrar? Eu tô carregando o time!"`, `"Não gostei. Acho que o problema não sou eu."`]); mood = 'mau'; } else { d = -2; txt = R([`"Tá… vou me esforçar."`, `"Ok, professor."`]); mood = 'meh'; } break;
    case 'vaga': if (!starter) { d = 12; txt = R([`"Era tudo que eu queria ouvir!"`, `"Pode contar comigo, não vou te decepcionar."`]); mood = 'bom'; p.prom = { k: 'titular', until: G.t + 8, from: G.t, j0: p.st?.j || 0, w0: G.week || 0 }; } else { d = 2; txt = R([`"Eu já sou titular, mas obrigado pela confiança."`]); } break;
    case 'futuro': if (young) { d = 7; txt = R([`"Quero crescer aqui. Esse projeto me anima!"`, `"Obrigado por acreditar em mim."`]); mood = 'bom'; } else if (vet) { d = 3; txt = R([`"Na minha idade, cada temporada conta. Bom saber."`]); } else { d = 4; txt = R([`"Gostei de ouvir os planos. Vamos juntos."`]); } p.sat = clamp((p.sat ?? 60) + 5, 0, 100); break;
    case 'lider': if (vet || p.ovr >= 75) { d = 6; txt = R([`"Pode deixar, vou puxar a rapaziada."`, `"É uma honra, vou ajudar os mais novos."`]); mood = 'bom'; G.clubs[p.club].chem = clamp((G.clubs[p.club].chem ?? 60) + 3, 0, 100); } else { d = -3; txt = R([`"Eu? Acho que ainda não tenho moral pra isso…"`]); mood = 'meh'; } break;
    case 'calma': if (p.mor < 55 || form < 6.2) { d = 9; txt = R([`"Precisava ouvir isso. Valeu, professor."`, `"Tirou um peso das minhas costas."`]); mood = 'bom'; } else { d = 1; txt = R([`"Tô tranquilo, mas obrigado!"`]); } break;
  }
  d = Math.round(d * (0.85 + rnd() * 0.3)); p.mor = clamp(p.mor + d, 5, 100);
  return { ok: true, d, txt, mood };
}

// promessas feitas nas conversas: cumprir ou não mexe com a moral
export function checkPromises(G) {
  const j = G.me.job; if (!j) return;
  for (const p of G.players) { if (!p || !p.prom || p.club !== j.cid) { if (p?.prom && p.club !== j?.cid) delete p.prom; continue; } if (G.t < p.prom.until) continue;
    const played = (p.st?.j || 0) - (p.prom.j0 || 0); const exp = Math.max(2, Math.round(((G.week || 0) - (p.prom.w0 || 0)) * 0.45));
    if ((G.week || 0) < (p.prom.w0 || 0)) { delete p.prom; continue; }
    if (played >= exp) { p.mor = clamp(p.mor + 5, 5, 100); msg(G, p.n, 'Promessa cumprida 🤝', `"Professor, você cumpriu o que prometeu. Obrigado pela confiança!" — ${p.n} (moral +5)`); }
    else { p.mor = clamp(p.mor - 16, 5, 100); msg(G, p.n, 'Promessa quebrada 😠', `"Você me prometeu vaga e eu quase não joguei (${played} jogo${played === 1 ? '' : 's'}). Estou decepcionado." — ${p.n} (moral −16)`); }
    delete p.prom; }
}
