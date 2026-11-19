// Lances decisivos jogáveis: pênalti, falta, mano a mano e pênalti contra (você é o goleiro).
import { esc } from '../util.js';

const KIND = { pen: 'Pênalti a favor', falta: 'Falta perigosa', '1x1': 'Cara a cara com o goleiro', defpen: 'Pênalti contra — você defende' };
const rnd = Math.random, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;

export function playLance(ev, ctx) {
  return new Promise((resolve) => {
    const { G, kitA, kitB, minute, shooter, keeper } = ctx;
    const el = document.createElement('div'); el.className = 'lance';
    el.innerHTML = `<div class="lc-top"><span class="lc-tag">LANCE DECISIVO · ${minute}'</span><b>${KIND[ev.kind]}</b><span class="lc-who">${esc(ev.kind === 'defpen' ? 'Batedor: ' + shooter : shooter)}</span></div>
      <canvas class="lc-cv"></canvas><div class="lc-hint" id="lch"></div><div class="lc-btns" id="lcb"></div><div class="lc-res" id="lcr"></div>`;
    document.body.appendChild(el);
    const cv = el.querySelector('canvas'), cx = cv.getContext('2d'); const hint = el.querySelector('#lch'), btns = el.querySelector('#lcb'), res = el.querySelector('#lcr');
    let W = 0, H = 0, dpr = Math.min(2, devicePixelRatio || 1);
    const fit = () => { const r = cv.getBoundingClientRect(); W = cv.width = Math.round(r.width * dpr); H = cv.height = Math.round(r.height * dpr); };
    fit(); addEventListener('resize', fit);
    // estado
    const S = { ph: 'aim', t: 0, tgt: null, pow: 0, powT: 0, ball: { x: 0, y: 0, s: 1 }, kp: { x: 0, dive: 0, side: 0, up: 0 }, out: null, flash: 0, net: 0, shake: 0, wall: ev.kind === 'falta', guess: null, choice: null };
    const goal = () => { const gw = W * 0.52, gh = gw * 0.33; return { x: (W - gw) / 2, y: H * 0.2, w: gw, h: gh }; };
    const toGoal = (nx, ny) => { const g = goal(); return [g.x + (nx + 1) / 2 * g.w, g.y + g.h - ny * g.h]; };
    const kq = ev.q ?? 0.4; // qualidade da chance segundo o motor
    function setHint(t) { hint.textContent = t; }
    if (ev.kind === '1x1') { S.ph = 'choose'; setHint('Escolha a finalização'); btns.innerHTML = `<button class="btn pri" data-k="canto">Chute no canto</button><button class="btn" data-k="drible">Driblar o goleiro</button><button class="btn" data-k="cavadinha">Cavadinha</button>`; }
    else if (ev.kind === 'defpen') { S.ph = 'guess'; setHint('Toque no lado em que o goleiro vai pular'); btns.innerHTML = `<button class="btn" data-g="-1">‹ Esquerda</button><button class="btn" data-g="0">Meio</button><button class="btn" data-g="1">Direita ›</button>`; }
    else setHint('Toque no gol onde quer chutar');
    btns.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.k) { S.choice = b.dataset.k; btns.innerHTML = ''; shoot1x1(); } if (b.dataset.g != null) { S.guess = +b.dataset.g; btns.innerHTML = ''; defPen(); } };
    cv.addEventListener('pointerdown', (e) => {
      const r = cv.getBoundingClientRect(); const x = (e.clientX - r.left) * dpr, y = (e.clientY - r.top) * dpr; const g = goal();
      if (S.ph === 'aim') { const nx = clamp(((x - g.x) / g.w) * 2 - 1, -1.25, 1.25), ny = clamp((g.y + g.h - y) / g.h, 0, 1.25); S.tgt = [nx, ny]; S.ph = 'power'; S.powT = 0; setHint('Toque de novo para definir a força (verde = ideal)'); }
      else if (S.ph === 'power') { S.pow = S.powCur; kick(); }
      else if (S.ph === 'guess') { const nx = ((x - g.x) / g.w) * 2 - 1; S.guess = nx < -0.33 ? -1 : nx > 0.33 ? 1 : 0; btns.innerHTML = ''; defPen(); }
    });
    // ---------- desfechos ----------
    function kick() {
      S.ph = 'fly'; S.t = 0; setHint(''); const [nx, ny] = S.tgt; const p = S.pow; const corner = Math.abs(nx) > 0.6 && ny > 0.55;
      let out = 'gol';
      if (Math.abs(nx) > 1.02 || ny > 1.02 || (p > 0.9 && ny > 0.7) || (p > 0.95 && rnd() < 0.5)) out = 'fora';
      else {
        const zone = nx < -0.33 ? -1 : nx > 0.33 ? 1 : 0; const kg = rnd() < 0.42 ? -1 : rnd() < 0.72 ? 1 : 0; S.kp.side = kg;
        let save = zone === kg ? (corner ? 0.28 : 0.7) : zone === 0 && kg !== 0 ? 0.05 : 0.08;
        save += p < 0.4 ? 0.3 : p < 0.55 ? 0.1 : 0; save -= (kq - 0.35) * 0.5;
        if (S.wall && ny < 0.5 && rnd() < 0.55) out = 'barreira'; else if (rnd() < clamp(save, 0.03, 0.92)) out = 'def';
      }
      if (out !== 'fora' && S.kp.side === 0 && out !== 'def') S.kp.side = rnd() < 0.5 ? -1 : 1;
      S.out = out; S.dur = lerp(0.95, 0.5, p);
    }
    function shoot1x1() {
      const base = { canto: 0.56, drible: 0.5, cavadinha: 0.44 }[S.choice] + (kq - 0.35) * 0.6; const ok = rnd() < clamp(base, 0.2, 0.85);
      S.tgt = S.choice === 'cavadinha' ? [0.1, 0.85] : S.choice === 'drible' ? [rnd() < 0.5 ? -0.3 : 0.3, 0.1] : [rnd() < 0.5 ? -0.8 : 0.8, 0.25]; S.pow = 0.7;
      S.out = ok ? 'gol' : (S.choice === 'cavadinha' && rnd() < 0.5 ? 'fora' : 'def'); S.kp.side = S.choice === 'drible' ? (S.tgt[0] > 0 ? -1 : 1) : S.out === 'def' ? Math.sign(S.tgt[0]) : -Math.sign(S.tgt[0]) || 1;
      S.ph = 'fly'; S.t = 0; S.dur = 0.8; setHint('');
    }
    function defPen() {
      const shot = rnd() < 0.42 ? -1 : rnd() < 0.75 ? 1 : 0; const hi = rnd(); S.tgt = [shot * (0.55 + rnd() * 0.35), 0.15 + hi * 0.7]; S.pow = 0.7; S.kp.side = S.guess;
      let out = 'gol'; if (rnd() < 0.07) out = 'fora'; else if (S.guess === shot) out = rnd() < (hi > 0.7 ? 0.45 : 0.72) ? 'def' : 'gol'; else if (rnd() < 0.04) out = 'def';
      S.out = out; S.ph = 'fly'; S.t = 0; S.dur = 0.6; setHint('');
    }
    function finish() {
      const ok = ev.kind === 'defpen' ? S.out !== 'gol' : S.out === 'gol';
      const mine = ev.kind !== 'defpen';
      const txt = S.out === 'gol' ? (mine ? 'GOOOOL!' : 'GOL DELES…') : S.out === 'def' ? (mine ? 'O GOLEIRO DEFENDEU' : 'QUE DEFESA!') : S.out === 'barreira' ? 'NA BARREIRA!' : 'PRA FORA!';
      res.innerHTML = `<b class="${ok ? 'ok' : 'no'}">${txt}</b>`; res.classList.add('on');
      setTimeout(() => { removeEventListener('resize', fit); el.classList.add('out'); setTimeout(() => { el.remove(); resolve(ok); }, 350); }, 1700);
    }
    // ---------- desenho ----------
    let raf = 0, last = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; S.t += dt;
      const g = goal(); cx.setTransform(1, 0, 0, 1, 0, 0);
      if (S.shake > 0) { cx.translate((rnd() - 0.5) * S.shake * 12, (rnd() - 0.5) * S.shake * 12); S.shake -= dt * 2; }
      // céu/estádio
      const sky = cx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#04080d'); sky.addColorStop(0.45, '#0a1a14'); sky.addColorStop(1, '#0c3a22'); cx.fillStyle = sky; cx.fillRect(-20, -20, W + 40, H + 40);
      for (let i = 0; i < 260; i++) { const x = (i * 97.3) % W, y = H * 0.02 + ((i * 53.1) % (H * 0.16)); cx.fillStyle = i % 3 ? kitA + '99' : '#ffffff55'; cx.fillRect(x, y + Math.sin(now / 300 + i) * 1.5 * (S.out === 'gol' ? 3 : 1), 3 * dpr, 4 * dpr); }
      // gramado
      cx.fillStyle = '#1b7a3a'; cx.fillRect(-20, g.y + g.h, W + 40, H); for (let i = 0; i < 8; i++) { cx.fillStyle = i % 2 ? '#1f8642' : '#1b7a3a'; cx.fillRect(-20, g.y + g.h + i * (H - g.y - g.h) / 8, W + 40, (H - g.y - g.h) / 8); }
      cx.strokeStyle = '#ffffffaa'; cx.lineWidth = 2 * dpr; cx.beginPath(); cx.moveTo(W * 0.05, g.y + g.h); cx.lineTo(W * 0.95, g.y + g.h); cx.stroke();
      cx.beginPath(); cx.moveTo(W * 0.18, g.y + g.h); cx.lineTo(W * 0.1, H * 0.62); cx.lineTo(W * 0.9, H * 0.62); cx.lineTo(W * 0.82, g.y + g.h); cx.stroke();
      // rede
      cx.save(); cx.globalAlpha = 0.35; cx.strokeStyle = '#fff'; cx.lineWidth = 1 * dpr; const bulge = S.net * Math.sin(S.t * 18) * 6 * dpr;
      for (let i = 0; i <= 24; i++) { cx.beginPath(); cx.moveTo(g.x + i * g.w / 24, g.y); cx.lineTo(g.x + i * g.w / 24 + (i - 12) * 0.6 * dpr, g.y + g.h - bulge); cx.stroke(); }
      for (let j = 0; j <= 8; j++) { cx.beginPath(); cx.moveTo(g.x, g.y + j * g.h / 8); cx.lineTo(g.x + g.w, g.y + j * g.h / 8 - bulge * (j / 8)); cx.stroke(); } cx.restore();
      cx.fillStyle = '#f7f7f4'; const pw = 7 * dpr; cx.fillRect(g.x - pw, g.y - pw, pw, g.h + pw); cx.fillRect(g.x + g.w, g.y - pw, pw, g.h + pw); cx.fillRect(g.x - pw, g.y - pw, g.w + 2 * pw, pw);
      // goleiro
      const kp = S.kp; const flying = S.ph === 'fly' || S.ph === 'done'; const dk = flying ? clamp(S.t / (S.dur * 0.9), 0, 1) : 0; const dive = kp.side * dk;
      const kx = g.x + g.w / 2 + dive * g.w * 0.36 + (S.ph === 'aim' || S.ph === 'power' || S.ph === 'guess' ? Math.sin(now / 260) * g.w * 0.04 : 0), ky = g.y + g.h * (0.98 - Math.abs(dive) * 0.25);
      cx.save(); cx.translate(kx, ky); cx.rotate(dive * 1.2); const ks = g.h / 2.44; const kc = ev.kind === 'defpen' ? kitA : '#f2c500';
      cx.fillStyle = '#111'; cx.fillRect(-0.18 * ks, -0.9 * ks, 0.14 * ks, 0.9 * ks); cx.fillRect(0.04 * ks, -0.9 * ks, 0.14 * ks, 0.9 * ks);
      cx.fillStyle = kc; cx.beginPath(); cx.roundRect(-0.26 * ks, -1.55 * ks, 0.52 * ks, 0.7 * ks, 0.1 * ks); cx.fill();
      cx.fillRect(-0.62 * ks, -1.85 * ks + Math.abs(dive) * 0.2 * ks, 0.14 * ks, 0.7 * ks); cx.fillRect(0.48 * ks, -1.85 * ks + Math.abs(dive) * 0.2 * ks, 0.14 * ks, 0.7 * ks);
      cx.fillStyle = '#eee'; cx.beginPath(); cx.arc(-0.55 * ks, -1.88 * ks, 0.09 * ks, 0, 7); cx.arc(0.55 * ks, -1.88 * ks, 0.09 * ks, 0, 7); cx.fill();
      cx.fillStyle = '#c68a5c'; cx.beginPath(); cx.arc(0, -1.75 * ks, 0.16 * ks, 0, 7); cx.fill(); cx.fillStyle = '#1b1410'; cx.beginPath(); cx.arc(0, -1.8 * ks, 0.16 * ks, Math.PI, 0); cx.fill(); cx.restore();
      // barreira
      if (S.wall) { for (let i = 0; i < 4; i++) { const wx = W * 0.4 + i * W * 0.045, wy = H * 0.6; cx.fillStyle = kitB; cx.beginPath(); cx.roundRect(wx - W * 0.018, wy - H * 0.14, W * 0.036, H * 0.12, 6); cx.fill(); cx.fillStyle = '#111'; cx.fillRect(wx - W * 0.014, wy - H * 0.02, W * 0.028, H * 0.06); cx.fillStyle = '#c68a5c'; cx.beginPath(); cx.arc(wx, wy - H * 0.16, W * 0.012, 0, 7); cx.fill(); } }
      // mira e força
      if (S.ph === 'aim') { cx.strokeStyle = '#2fe08a'; cx.setLineDash([6 * dpr, 6 * dpr]); cx.strokeRect(g.x, g.y, g.w, g.h); cx.setLineDash([]); }
      if (S.tgt && S.ph !== 'done') { const [tx, ty] = toGoal(S.tgt[0], S.tgt[1]); cx.strokeStyle = '#2fe08a'; cx.lineWidth = 3 * dpr; cx.beginPath(); cx.arc(tx, ty, 14 * dpr, 0, 7); cx.moveTo(tx - 22 * dpr, ty); cx.lineTo(tx + 22 * dpr, ty); cx.moveTo(tx, ty - 22 * dpr); cx.lineTo(tx, ty + 22 * dpr); cx.stroke(); }
      if (S.ph === 'power') { S.powT += dt; S.powCur = (Math.sin(S.powT * 3.4 - Math.PI / 2) + 1) / 2; const bx = W * 0.88, by = H * 0.3, bh = H * 0.5, bw = 18 * dpr;
        cx.fillStyle = '#0b1210cc'; cx.fillRect(bx - 4, by - 4, bw + 8, bh + 8); const gr = cx.createLinearGradient(0, by + bh, 0, by); gr.addColorStop(0, '#f4c542'); gr.addColorStop(0.55, '#2fe08a'); gr.addColorStop(0.8, '#2fe08a'); gr.addColorStop(0.9, '#ff5a5f'); cx.fillStyle = gr; cx.fillRect(bx, by, bw, bh);
        cx.fillStyle = '#fff'; cx.fillRect(bx - 6, by + bh * (1 - S.powCur) - 2, bw + 12, 4 * dpr); }
      // bola
      const b0 = [W / 2, H * 0.9]; let bx = b0[0], by = b0[1], bs = 1;
      if (flying) { const k = clamp(S.t / S.dur, 0, 1); let [tx, ty] = toGoal(S.tgt[0], S.tgt[1]);
        if (S.out === 'def') { const kk = Math.min(k, 0.85); tx = lerp(b0[0], tx, kk); ty = lerp(b0[1], ty, kk); if (k > 0.85) { tx += (k - 0.85) * W * 0.8 * (S.tgt[0] > 0 ? 1 : -1); ty -= (k - 0.85) * H; } bx = tx; by = ty; }
        else if (S.out === 'barreira') { const kk = Math.min(k, 0.6) / 0.6; bx = lerp(b0[0], W * 0.47, kk); by = lerp(b0[1], H * 0.5, kk); if (k > 0.6) { by += (k - 0.6) * H * 0.9; bx += (k - 0.6) * W * 0.3; } }
        else { const curve = S.wall ? Math.sin(k * Math.PI) * W * 0.08 * Math.sign(S.tgt[0] || 1) : 0; bx = lerp(b0[0], tx, k) - curve; by = lerp(b0[1], ty, k) - Math.sin(k * Math.PI) * H * (S.wall ? 0.18 : 0.05); }
        bs = lerp(1, 0.38, k);
        if (k >= 1 && S.ph === 'fly') { S.ph = 'done'; if (S.out === 'gol') { S.net = 1; S.shake = 1; S.flash = 1; } finish(); } }
      cx.fillStyle = '#00000055'; cx.beginPath(); cx.ellipse(bx, flying ? Math.max(by, b0[1] * lerp(1, 0.32, clamp(S.t / S.dur, 0, 1)) + 10) : b0[1] + 10 * dpr, 14 * dpr * bs, 5 * dpr * bs, 0, 0, 7); cx.fill();
      const br = 15 * dpr * bs; const bg = cx.createRadialGradient(bx - br * 0.3, by - br * 0.3, br * 0.2, bx, by, br); bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#c9ccc8'); cx.fillStyle = bg; cx.beginPath(); cx.arc(bx, by, br, 0, 7); cx.fill();
      cx.fillStyle = '#16181c'; for (let i = 0; i < 5; i++) { const a = i * 1.256 + S.t * (flying ? 14 : 0); cx.beginPath(); cx.arc(bx + Math.cos(a) * br * 0.55, by + Math.sin(a) * br * 0.55, br * 0.2, 0, 7); cx.fill(); }
      if (S.net > 0) S.net = Math.max(0, S.net - dt * 0.8);
      if (S.flash > 0) { cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = `rgba(255,255,255,${S.flash * 0.5})`; cx.fillRect(0, 0, W, H); S.flash -= dt * 2; }
      if (S.ph === 'aim' && S.t > 7) { S.tgt = [rnd() * 1.6 - 0.8, rnd() * 0.8]; S.pow = 0.65; kick(); }
      if (S.ph === 'power' && S.powT > 6) { S.pow = S.powCur; kick(); }
      if (S.ph === 'guess' && S.t > 7) { S.guess = 0; btns.innerHTML = ''; defPen(); }
      if (S.ph === 'choose' && S.t > 8) { S.choice = 'canto'; btns.innerHTML = ''; shoot1x1(); }
      if (el.isConnected) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  });
}
