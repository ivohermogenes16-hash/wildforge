// Jogador 3D da tela inicial: o modelo do jogo, com o uniforme do seu clube, respirando (animação gravada)
import * as THREE from '../../m3d/lib/three.module.js';
const lum0 = (h) => { const c = new THREE.Color(h); return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; };
const SPN = ['VÉRTIX', 'NORTEZ', 'KAIRO', 'ZÊNITE', 'FAROL', 'ORBE', 'PULSAR', 'TRÍADE', 'MARÉ', 'LÚMEN', 'NOVARA', 'SOLIS', 'KORVO', 'AURA', 'BRAVA', 'ÍCARO', 'VELOX', 'ALTUS', 'QUANTA', 'RIVA', 'ATLAS', 'NEXA', 'ONDA', 'TAURA', 'CÍRIO', 'DELTA', 'ÉLAN', 'FORZA', 'GAIA', 'HÉLIO'];
const SPS = ['BANK', 'SEGUROS', 'TELECOM', 'ENERGIA', '', 'PAY', 'MOTORS', 'FOODS', 'TECH', 'AIR', '', 'SAÚDE'];
const hstr = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function sponsorOf(name, slot) { const h = hstr(name + '#' + slot); return { n: SPN[h % SPN.length], s: SPS[(h >>> 5) % SPS.length], shape: (h >>> 9) % 7, rot: ((h >>> 12) % 360) }; }
function drawLogo(g, x, y, r, shape, col) {
  g.save(); g.translate(x, y); g.fillStyle = col; g.strokeStyle = col; g.lineWidth = r * 0.22; g.beginPath();
  if (shape === 0) { g.arc(0, 0, r, 0, 6.283); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.4, 0, 6.283); g.fill(); }
  else if (shape === 1) { g.moveTo(-r, r * 0.5); g.lineTo(0, -r * 0.6); g.lineTo(r, r * 0.5); g.lineTo(r * 0.55, r * 0.5); g.lineTo(0, -r * 0.05); g.lineTo(-r * 0.55, r * 0.5); g.closePath(); g.fill(); }
  else if (shape === 2) { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); }
  else if (shape === 3) { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.stroke(); }
  else if (shape === 4) { g.moveTo(-r, 0); g.bezierCurveTo(-r * 0.5, -r, r * 0.5, r, r, 0); g.stroke(); g.beginPath(); g.moveTo(-r, r * 0.45); g.bezierCurveTo(-r * 0.5, -r * 0.55, r * 0.5, r * 1.45, r, r * 0.45); g.stroke(); }
  else if (shape === 5) { g.moveTo(r * 0.2, -r); g.lineTo(-r * 0.55, r * 0.15); g.lineTo(0, r * 0.15); g.lineTo(-r * 0.2, r); g.lineTo(r * 0.55, -r * 0.15); g.lineTo(0, -r * 0.15); g.closePath(); g.fill(); }
  else { g.rotate(Math.PI / 4); g.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4); g.fillStyle = 'rgba(0,0,0,0)'; }
  g.restore();
}
function buildAtlas(K, clubName, crestSrc) { const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  const ink = lum0(K.shirt) > 0.55 ? '#141414' : '#ffffff'; const ink2 = lum0(K.shorts) > 0.55 ? '#141414' : '#ffffff';
  const sp = sponsorOf(clubName, 0), sp2 = sponsorOf(clubName, 1), sp3 = sponsorOf(clubName, 2);
  // frente da camisa (0..512): patrocínio master no centro
  g.textAlign = 'center'; g.textBaseline = 'middle';
  drawLogo(g, 256, 250, 34, sp.shape, ink);
  g.fillStyle = ink; g.font = '900 64px system-ui'; g.fillText(sp.n, 256, 318, 400); if (sp.s) { g.font = '700 26px system-ui'; g.fillText(sp.s, 256, 362, 300); }
  // números das costas (5x5 a partir de x=512)
  g.font = '900 78px system-ui';
  for (let n = 1; n <= 25; n++) { const cx = 512 + ((n - 1) % 5) * 102.4 + 51.2, cy = Math.floor((n - 1) / 5) * 102.4 + 56; g.lineWidth = 6; g.strokeStyle = ink === '#ffffff' ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.35)'; g.strokeText(String(n), cx, cy); g.fillStyle = ink; g.fillText(String(n), cx, cy); }
  // manga (0..256, 512..640) e calção (256..512, 512..640)
  drawLogo(g, 60, 576, 26, sp2.shape, ink); g.fillStyle = ink; g.font = '900 34px system-ui'; g.textAlign = 'left'; g.fillText(sp2.n, 96, 578, 150);
  drawLogo(g, 300, 576, 24, sp3.shape, ink2); g.fillStyle = ink2; g.font = '900 30px system-ui'; g.fillText(sp3.n, 332, 578, 170);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  // escudo no peito esquerdo
  if (crestSrc) { const img = new Image(); img.onload = () => { try { g.drawImage(img, 512 * 0.62, 512 * 0.06, 128, 128); tex.needsUpdate = true; } catch {} }; img.src = crestSrc; }
  return tex;
}
function crestToSrc(h) { if (!h) return ''; const m = /<img[^>]*src="([^"]+)"/.exec(h); if (m) return m[1]; if (h.includes('<svg')) { let s = h.slice(h.indexOf('<svg'), h.lastIndexOf('</svg>') + 6); if (!/xmlns=/.test(s)) s = s.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'); return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); } return ''; }
const KITFRAG = `
      float y = vB.y, x = vB.x, az = abs(vB.z); vec3 kc;
      if (y < 0.075) kc = uBoots; else if (y < 0.232) kc = uSocks; else if (y < 0.252) kc = uTrim; else if (y < 0.302) kc = uSkin; else if (y < 0.316) kc = uTrim;
      else if (y < 0.538) kc = az > 0.13 ? uSkin : uShorts;
      else if (az > 0.205) kc = uSkin; else if (az > 0.19) kc = uTrim;
      else if (y > 0.842) { float hy = uHairCut < 0.5 ? 0.948 : uHairCut < 1.5 ? 0.962 : uHairCut < 2.5 ? 0.93 : 9.0; float hb = uHairCut < 0.5 ? 0.875 : uHairCut < 1.5 ? 0.93 : uHairCut < 2.5 ? 0.858 : 9.0; kc = (y > hy || (y > hb && x < -0.03)) ? uHair : uSkin; }
      else if (y > 0.82 && az < 0.06) kc = uTrim; else kc = uShirt;
      if (uDec > 0.5) {
        vec2 uv = vec2(-1.0); vec4 r = vec4(0.0);
        if (y > 0.56 && y < 0.82 && az < 0.12 && vBN.x > 0.15) { uv = vec2((-vB.z + 0.12) / 0.24, (y - 0.56) / 0.26); r = vec4(0.0, 0.0, 0.5, 0.5); }
        else if (y > 0.56 && y < 0.82 && az < 0.12 && vBN.x < -0.15) { uv = vec2((vB.z + 0.12) / 0.24, (y - 0.56) / 0.26); float cx = mod(uCell, 5.0), cy = floor(uCell / 5.0); r = vec4(0.5 + cx * 0.1, cy * 0.1, 0.1, 0.1); }
        else if (vB.z < -0.125 && vB.z > -0.188 && y > 0.735 && vBN.y > 0.2) { uv = vec2((x + 0.05) / 0.10, (-vB.z - 0.125) / 0.063); r = vec4(0.0, 0.5, 0.25, 0.125); }
        else if (y > 0.37 && y < 0.47 && vB.z < -0.015 && vB.z > -0.1 && vBN.x > 0.2) { uv = vec2((-vB.z - 0.015) / 0.085, (y - 0.37) / 0.10); r = vec4(0.25, 0.5, 0.25, 0.125); }
        if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) { vec2 t = vec2(r.x + uv.x * r.z, 1.0 - (r.y + (1.0 - uv.y) * r.w)); vec4 d = texture2D(uAtlas, t); kc = mix(kc, d.rgb, d.a); }
      }
      diffuseColor.rgb = kc;`;

let DATA = null;
async function load() {
  if (DATA) return DATA;
  const b64 = (await (await fetch('m3d/jogador.json')).json()).b; const bin = atob(b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const buf = u8.buffer; const dv = new DataView(buf); const jl = dv.getUint32(12, true); const J = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl))); const bo = 20 + jl + 8;
  const CT = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }, NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const acc = (i) => { const a = J.accessors[i], v = J.bufferViews[a.bufferView]; const T = CT[a.componentType]; const o = bo + (v.byteOffset || 0) + (a.byteOffset || 0); return new T(buf.slice(o, o + a.count * NC[a.type] * T.BYTES_PER_ELEMENT)); };
  const L = await (await fetch('m3d/loco.json')).json();
  DATA = { J, acc, L }; return DATA;
}
const lum = (h) => { const c = new THREE.Color(h); return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; };
export async function mountHero(host, kit) {
  const { J, acc, L } = await load();
  const W = host.clientWidth || 300, H = host.clientHeight || 400;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(W, H); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(24, W / H, 0.1, 50); cam.position.set(0, 1.0, 5.3); cam.lookAt(0, 0.92, 0);
  scene.add(new THREE.HemisphereLight(0xdfefff, 0x0b2a1a, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2.5, 4, 4); scene.add(key);
  const rimA = new THREE.DirectionalLight(new THREE.Color(kit.rim || '#2fe08a'), 4.5); rimA.position.set(-3, 2.5, -3); scene.add(rimA);
  const rimB = new THREE.DirectionalLight(0x7fb8ff, 3); rimB.position.set(3.5, 2, -2.5); scene.add(rimB);
  // malha
  const pr = J.meshes[0].primitives[0]; const sk = J.skins[0];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(acc(pr.attributes.POSITION), 3)); g.setAttribute('normal', new THREE.BufferAttribute(acc(pr.attributes.NORMAL), 3));
  const ji = acc(pr.attributes.JOINTS_0); g.setAttribute('skinIndex', new THREE.BufferAttribute(ji instanceof Uint8Array ? new Uint16Array(ji) : ji, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(acc(pr.attributes.WEIGHTS_0), 4)); g.setIndex(new THREE.BufferAttribute(acc(pr.indices), 1));
  const jn = sk.joints.map((j) => (J.nodes[j].name || '').replace('mixamorig:', ''));
  const shirt = kit.c1 || '#1b8f4e', shorts = kit.c2 && kit.c2.toLowerCase() !== (kit.c1 || '').toLowerCase() ? kit.c2 : (lum(shirt) > 0.5 ? '#151515' : '#f2f2f2');
  g.setAttribute('aBind', new THREE.BufferAttribute(new Float32Array(g.attributes.position.array), 3)); g.setAttribute('aBN', new THREE.BufferAttribute(new Float32Array(g.attributes.normal.array), 3));
  const K = { shirt, shorts, socks: shirt, trim: shorts };
  const atlas = buildAtlas(K, kit.name || 'Prancheta', crestToSrc(kit.crest || ''));
  const U = { uSkin: { value: new THREE.Color('#d8a07a') }, uShirt: { value: new THREE.Color(shirt) }, uShorts: { value: new THREE.Color(shorts) }, uSocks: { value: new THREE.Color(shirt) }, uBoots: { value: new THREE.Color('#101010') }, uHair: { value: new THREE.Color('#1d140e') }, uTrim: { value: new THREE.Color(shorts) }, uAtlas: { value: atlas }, uCell: { value: 9 }, uDec: { value: 1 }, uHairCut: { value: 0 } };
  const kmat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.04 });
  kmat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
    sh.vertexShader = 'attribute vec3 aBind; attribute vec3 aBN; varying vec3 vB; varying vec3 vBN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vB = aBind; vBN = aBN;');
    sh.fragmentShader = 'varying vec3 vB; varying vec3 vBN; uniform vec3 uSkin, uShirt, uShorts, uSocks, uBoots, uHair, uTrim; uniform sampler2D uAtlas; uniform float uCell, uDec, uHairCut;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + KITFRAG); };
  const bones = J.nodes.map((n) => { const o = new THREE.Bone(); o.name = (n.name || '').replace('mixamorig:', ''); if (n.matrix) new THREE.Matrix4().fromArray(n.matrix).decompose(o.position, o.quaternion, o.scale); if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale); return o; });
  J.nodes.forEach((n, i) => (n.children || []).forEach((c) => bones[i].add(bones[c])));
  const top = new THREE.Group(); top.add(bones[0]); top.scale.setScalar(15.2 * 1.0); scene.add(top);
  const ibmA = acc(sk.inverseBindMatrices); const bl = sk.joints.map((j) => bones[j]); const ibm = sk.joints.map((_, k) => new THREE.Matrix4().fromArray(ibmA, k * 16));
  const mesh = new THREE.SkinnedMesh(g, kmat); mesh.frustumCulled = false; top.add(mesh);
  top.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(bl, ibm), new THREE.Matrix4());
  const by = {}; const ord = []; const walk = (b) => { if (b.isBone) { ord.push(b); by[b.name] = b; } b.children.forEach(walk); }; walk(bones[0]);
  const QT = {}; for (const b of ord) { const q = new THREE.Quaternion(); b.getWorldQuaternion(q); QT[b.name] = q; }
  const clip = L.clips.idle; const BN = L.bones; const F = clip.f.map((r) => { const o = []; for (let i = 0; i < r.length; i += 4) o.push(new THREE.Quaternion(r[i], r[i + 1], r[i + 2], r[i + 3])); return o; });
  const hipsY0 = by.Hips.position.y;
  // plataforma holográfica
  const ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(kit.rim || '#2fe08a'), transparent: true, opacity: 0.75, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.66, 64), ringM); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005; scene.add(ring);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.8, 64, 1, 0, Math.PI * 1.3), ringM.clone()); ring2.material.opacity = 0.45; ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.006; scene.add(ring2);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.62, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(kit.rim || '#2fe08a'), transparent: true, opacity: 0.12, depthWrite: false })); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.004; scene.add(disc);
  const W2 = new Map(); const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _Y = new THREE.Vector3(0, 1, 0);
  let raf = 0, t0 = performance.now(), alive = true, yaw = -0.35, yawT = -0.35, drag = null;
  host.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: yaw }; });
  addEventListener('pointerup', () => { drag = null; }); addEventListener('pointermove', (e) => { if (drag) yawT = drag.y + (e.clientX - drag.x) * 0.012; });
  const frame = (now) => {
    if (!alive || !host.isConnected) { renderer.dispose(); return; }
    const t = (now - t0) / 1000; if (!drag) yawT = -0.35 + Math.sin(t * 0.25) * 0.35; yaw += (yawT - yaw) * 0.08;
    const x = (((Math.max(0, t) / clip.dur) % 1 + 1) % 1) * F.length; const i = Math.floor(x) % F.length, j = (i + 1) % F.length, u = x - Math.floor(x);
    _q2.setFromAxisAngle(_Y, yaw); W2.clear();
    for (const b of ord) {
      const par = b.parent; let pq = W2.get(par); if (!pq) { pq = new THREE.Quaternion(); par.getWorldQuaternion(pq); }
      const k = BN.indexOf(b.name); let w;
      if (k >= 0) { _q.copy(F[i][k]).slerp(F[j][k], u); w = _q2.clone().multiply(_q).multiply(QT[b.name]); b.quaternion.copy(pq).invert().multiply(w); }
      else w = pq.clone().multiply(b.quaternion);
      W2.set(b, w);
    }
    ring2.rotation.z = t * 0.6; ringM.opacity = 0.55 + 0.25 * Math.sin(t * 2);
    renderer.render(scene, cam); raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  const ro = new ResizeObserver(() => { const w = host.clientWidth, h = host.clientHeight; if (w && h) { renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); } }); ro.observe(host);
  window.__hero = { by, top, cam, mesh };
  return { stop() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); } };
}
