/**
 * EverTree — Intro Canvas Animation
 * Inspirado em: hyperframes-motion-reel-skill + cth9191/animate
 *
 * Arquitetura:
 *  - Dois modos: "canvas procedural" (cenas animadas via Canvas 2D)
 *    e "CSS timeline" (transições de slide determinísticas)
 *  - Seek-safe: cada frame é calculado por t (segundos), sem Date.now()
 *  - Clipe com data-start / data-duration embutidos como constantes
 *  - Respeita prefers-reduced-motion
 */

(function () {
  'use strict';

  /* ─────────────────────────── CONFIGURAÇÃO ─────────────────────────── */
  const TOTAL_DURATION = 7.5;   // segundos de animação intro
  const FPS_TARGET     = 60;
  const SKIP_IF_MOTION_REDUCED = true;

  /* ─────────────────── VERIFICAR PREFERÊNCIA DO USUÁRIO ─────────────── */
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (SKIP_IF_MOTION_REDUCED && prefersReduced) return;

  /* ──────────────────────── CRIAR OVERLAY DO INTRO ──────────────────── */
  const overlay = document.createElement('div');
  overlay.id = 'intro-overlay';
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Introdução animada — a importância da natureza');
  overlay.setAttribute('role', 'dialog');
  overlay.innerHTML = `
    <canvas id="intro-canvas" aria-hidden="true"></canvas>
    <div class="intro-text-layer" aria-live="polite">
      <div class="intro-slide" data-clip="0" id="intro-slide-0">
        <span class="intro-eyebrow">NOSSA MISSÃO</span>
        <h1 class="intro-headline">A natureza<br><em>precisa de você.</em></h1>
      </div>
      <div class="intro-slide" data-clip="1" id="intro-slide-1">
        <span class="intro-eyebrow">ECOSSISTEMAS EM RISCO</span>
        <p class="intro-stat"><strong>3,5 bi</strong></p>
        <p class="intro-label">de hectares devastados no planeta</p>
      </div>
      <div class="intro-slide" data-clip="2" id="intro-slide-2">
        <span class="intro-eyebrow">CADA ÁRVORE IMPORTA</span>
        <p class="intro-stat"><strong>200+</strong></p>
        <p class="intro-label">espécies dependem de uma única floresta</p>
      </div>
      <div class="intro-slide" data-clip="3" id="intro-slide-3">
        <span class="intro-eyebrow">COMECE AGORA</span>
        <h2 class="intro-cta">Plante sua<br><em>primeira semente.</em></h2>
      </div>
    </div>
    <button class="intro-skip" id="intro-skip" aria-label="Pular introdução">
      Pular <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </button>
  `;
  document.body.prepend(overlay);

  /* ─────────────────── ESTILOS INLINE (evita FOUC) ─────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    #intro-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: #0a1a12;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      isolation: isolate;
    }
    #intro-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .intro-text-layer {
      position: relative;
      z-index: 2;
      text-align: center;
      color: #f3f1df;
      font-family: "Segoe UI", system-ui, sans-serif;
      pointer-events: none;
      max-width: 680px;
      padding: 0 24px;
    }
    .intro-slide {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      opacity: 0;
      transform: translateY(18px);
      transition: opacity 0.55s cubic-bezier(.22,.68,0,1.2), transform 0.55s cubic-bezier(.22,.68,0,1.2);
      will-change: opacity, transform;
    }
    .intro-slide.active {
      opacity: 1;
      transform: translateY(0);
    }
    .intro-slide.exit {
      opacity: 0;
      transform: translateY(-14px);
      transition: opacity 0.3s ease-in, transform 0.3s ease-in;
    }
    .intro-eyebrow {
      font-size: 10px;
      letter-spacing: 3px;
      font-weight: 700;
      color: #c6e593;
      display: block;
    }
    .intro-headline {
      font-family: Georgia, serif;
      font-size: clamp(38px, 5.5vw, 70px);
      font-weight: 500;
      letter-spacing: -2px;
      line-height: 1.1;
      margin: 8px 0 0;
      color: #f3f1df;
    }
    .intro-headline em,
    .intro-cta em {
      color: #c6e593;
      font-style: normal;
    }
    .intro-stat {
      font-family: Georgia, serif;
      font-size: clamp(64px, 10vw, 120px);
      font-weight: 400;
      letter-spacing: -4px;
      line-height: 1;
      margin: 0;
      color: #f3f1df;
    }
    .intro-label {
      font-size: clamp(14px, 1.6vw, 18px);
      color: #aebcaf;
      margin: 0;
      max-width: 340px;
    }
    .intro-cta {
      font-family: Georgia, serif;
      font-size: clamp(32px, 4.8vw, 60px);
      font-weight: 500;
      letter-spacing: -2px;
      line-height: 1.15;
      margin: 8px 0 0;
      color: #f3f1df;
    }
    .intro-skip {
      position: absolute;
      bottom: 32px;
      right: 32px;
      z-index: 3;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      color: #aebcaf;
      border-radius: 999px;
      padding: 10px 18px;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 7px;
      cursor: pointer;
      backdrop-filter: blur(8px);
      transition: background 0.2s, color 0.2s;
    }
    .intro-skip:hover {
      background: rgba(255,255,255,0.14);
      color: #f3f1df;
    }
    #intro-overlay.fade-out {
      animation: introFadeOut 0.6s ease-in forwards;
    }
    @keyframes introFadeOut {
      to { opacity: 0; pointer-events: none; }
    }
    /* Dot progress indicator */
    .intro-dots {
      position: absolute;
      bottom: 36px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      z-index: 3;
    }
    .intro-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: rgba(255,255,255,0.25);
      transition: background 0.3s, transform 0.3s;
    }
    .intro-dot.active {
      background: #c6e593;
      transform: scale(1.4);
    }
  `;
  document.head.appendChild(style);

  /* ─────────────── DOTS DE PROGRESSO ───────────────── */
  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'intro-dots';
  for (let i = 0; i < 4; i++) {
    const d = document.createElement('div');
    d.className = 'intro-dot' + (i === 0 ? ' active' : '');
    dotsContainer.appendChild(d);
  }
  overlay.appendChild(dotsContainer);

  /* ───────────────────────── CANVAS SETUP ───────────────────────────── */
  const canvas = document.getElementById('intro-canvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth  * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  resize();
  window.addEventListener('resize', resize);

  /* ───────────── CLIP TIMELINE (data-start / data-duration) ─────────── */
  const CLIPS = [
    { start: 0.0,  duration: 2.2 },   // slide 0 — Headline
    { start: 2.2,  duration: 1.8 },   // slide 1 — 3,5 bi ha
    { start: 4.0,  duration: 1.8 },   // slide 2 — 200+ espécies
    { start: 5.8,  duration: 1.7 },   // slide 3 — CTA
  ];

  const slides = Array.from(document.querySelectorAll('.intro-slide'));
  const dots   = Array.from(document.querySelectorAll('.intro-dot'));

  let activeSlide = -1;

  function updateSlides(t) {
    let next = -1;
    for (let i = 0; i < CLIPS.length; i++) {
      if (t >= CLIPS[i].start && t < CLIPS[i].start + CLIPS[i].duration) {
        next = i;
        break;
      }
    }
    if (next === CLIPS.length - 1 && t >= CLIPS[CLIPS.length-1].start + CLIPS[CLIPS.length-1].duration) {
      next = CLIPS.length - 1;
    }
    if (next !== activeSlide) {
      if (activeSlide >= 0) {
        slides[activeSlide].classList.remove('active');
        slides[activeSlide].classList.add('exit');
        setTimeout(() => slides[activeSlide]?.classList.remove('exit'), 400);
      }
      activeSlide = next;
      if (next >= 0) {
        slides[next].classList.add('active');
        dots.forEach((d, i) => d.classList.toggle('active', i === next));
      }
    }
  }

  /* ─────────────────────── RENDER ENGINE ────────────────────────────── */
  // Paleta
  const C = {
    bg:      '#0a1a12',
    sky1:    '#112818',
    sky2:    '#193d24',
    ground:  '#0d2219',
    hill1:   '#12352060',
    hill2:   '#1a4b2b80',
    leaf:    '#3a7a4a',
    leafLt:  '#5bab6e',
    leafDk:  '#1e4a2a',
    trunk:   '#3d2b1a',
    particle:'#c6e593',
    star:    'rgba(198,229,147,',
    rootClr: '#1f3d28',
    glow:    '#5bab6e',
  };

  // Partículas flutuantes
  const PARTICLE_COUNT = 70;
  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    x:  Math.random(),
    y:  Math.random(),
    r:  Math.random() * 2.5 + 0.5,
    vx: (Math.random() - 0.5) * 0.0003,
    vy: -(Math.random() * 0.0006 + 0.0001),
    alpha: Math.random() * 0.6 + 0.2,
    phase: Math.random() * Math.PI * 2,
  }));

  // Árvore procedural — cresce com o tempo
  function drawTree(t, W, H) {
    const growRaw = Math.min(t / 3.5, 1);
    const grow = easeOutElastic(growRaw);
    const cx   = W * 0.5;
    const base = H * 0.78;
    const trunkH = H * 0.22 * grow;
    const trunkW = 11;

    // raiz
    ctx.save();
    ctx.globalAlpha = Math.min(growRaw * 2, 0.4);
    ctx.strokeStyle = C.rootClr;
    ctx.lineWidth = 3;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 8, base);
      ctx.bezierCurveTo(
        cx + i * 20, base + 20,
        cx + i * 32, base + 14,
        cx + i * 48, base + 24
      );
      ctx.stroke();
    }
    ctx.restore();

    // tronco
    ctx.save();
    const trunkGrad = ctx.createLinearGradient(cx - trunkW, base, cx + trunkW, base - trunkH);
    trunkGrad.addColorStop(0, C.trunk);
    trunkGrad.addColorStop(1, '#5a3e22');
    ctx.fillStyle = trunkGrad;
    ctx.beginPath();
    ctx.moveTo(cx - trunkW, base);
    ctx.lineTo(cx - trunkW * 0.5, base - trunkH);
    ctx.lineTo(cx + trunkW * 0.5, base - trunkH);
    ctx.lineTo(cx + trunkW, base);
    ctx.fill();
    ctx.restore();

    // copa — 3 camadas de círculos
    if (grow > 0.15) {
      const cr = H * 0.19 * Math.min((grow - 0.1) / 0.9, 1);
      const topY = base - trunkH - cr * 0.65;
      const sway = Math.sin(t * 0.9) * 4;

      const layers = [
        { ox: sway * 0.5,  oy: 0,         r: cr,       alpha: 0.9, clr: C.leaf },
        { ox: -cr * 0.45 + sway, oy: cr * 0.28, r: cr * 0.72, alpha: 0.85, clr: C.leafLt },
        { ox:  cr * 0.45 + sway, oy: cr * 0.28, r: cr * 0.72, alpha: 0.85, clr: C.leafLt },
        { ox: sway * 0.3,  oy: cr * 0.0,  r: cr * 0.55, alpha: 0.75, clr: '#6ec882' },
      ];

      layers.forEach(l => {
        const grad = ctx.createRadialGradient(
          cx + l.ox - l.r * 0.2, topY + l.oy - l.r * 0.3, l.r * 0.1,
          cx + l.ox, topY + l.oy, l.r
        );
        grad.addColorStop(0, l.clr + 'ee');
        grad.addColorStop(0.6, l.clr + 'bb');
        grad.addColorStop(1, C.leafDk + '44');
        ctx.save();
        ctx.globalAlpha = l.alpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx + l.ox, topY + l.oy, l.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // brilho no topo
      if (grow > 0.5) {
        const glowAlpha = (grow - 0.5) * 2 * 0.35;
        const glowGrad = ctx.createRadialGradient(cx + sway * 0.4, topY - cr * 0.3, 0, cx, topY, cr * 1.5);
        glowGrad.addColorStop(0, 'rgba(198,229,147,' + glowAlpha + ')');
        glowGrad.addColorStop(1, 'rgba(198,229,147,0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(cx, topY, cr * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawBackground(t, W, H) {
    // Céu gradiente que vai clareando
    const prog = Math.min(t / TOTAL_DURATION, 1);
    const skGrad = ctx.createLinearGradient(0, 0, 0, H);
    skGrad.addColorStop(0,   lerpColor('#050d08', '#112a1a', prog));
    skGrad.addColorStop(0.6, lerpColor('#0a1a12', '#1c3f28', prog));
    skGrad.addColorStop(1,   lerpColor('#0d2219', '#244e38', prog));
    ctx.fillStyle = skGrad;
    ctx.fillRect(0, 0, W, H);

    // estrelas
    const starAlpha = Math.max(0, 1 - prog * 2.5);
    if (starAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = starAlpha;
      for (let i = 0; i < 80; i++) {
        // posição determinística via seed
        const sx = pseudoRand(i * 7.3 + 1) * W;
        const sy = pseudoRand(i * 11.9 + 2) * H * 0.55;
        const sr = pseudoRand(i * 3.1 + 3) * 1.5 + 0.3;
        const twinkle = 0.5 + 0.5 * Math.sin(t * 2 + i);
        ctx.globalAlpha = starAlpha * twinkle * (0.3 + 0.7 * pseudoRand(i * 5));
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // colinas — paralaxe leve
    drawHill(0.0, H * 0.70, H * 0.18, '#1a3d2a', 0.3, t, W, H);
    drawHill(0.1, H * 0.74, H * 0.14, '#214d33', 0.5, t, W, H);
    drawHill(0.2, H * 0.78, H * 0.10, '#28603e', 0.8, t, W, H);

    // chão
    const groundGrad = ctx.createLinearGradient(0, H * 0.78, 0, H);
    groundGrad.addColorStop(0, '#1a3d26');
    groundGrad.addColorStop(1, '#0d2219');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, H * 0.78, W, H * 0.22);
  }

  function drawHill(seed, yBase, h, color, parallaxFactor, t, W, H) {
    const shift = Math.sin(t * 0.3 + seed * 10) * 15 * parallaxFactor;
    ctx.beginPath();
    ctx.moveTo(0, yBase);
    for (let x = 0; x <= W; x += 20) {
      const ny = yBase - Math.sin((x / W + seed) * Math.PI * 1.5) * h
                       + Math.sin((x / W * 3 + seed * 7)) * h * 0.3;
      ctx.lineTo(x + shift, ny);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawParticles(t, W, H) {
    particles.forEach(p => {
      // posição atualizada via t (seek-safe: acumular por t sem state mutável)
      const px = ((p.x + p.vx * t * 1000) % 1 + 1) % 1;
      const py = ((p.y + p.vy * t * 1000) % 1 + 1) % 1;
      const pulse = 0.6 + 0.4 * Math.sin(t * 2.5 + p.phase);
      ctx.save();
      ctx.globalAlpha = p.alpha * pulse * 0.7;
      ctx.fillStyle = C.particle;
      ctx.beginPath();
      ctx.arc(px * W, py * H, p.r * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  /* ─────────────────── RENDER LOOP ──────────────────────────────────── */
  let startTime = null;
  let rafId = null;
  let done = false;

  function render(now) {
    if (done) return;
    if (!startTime) startTime = now;
    const t = Math.min((now - startTime) / 1000, TOTAL_DURATION + 0.1);
    const W = window.innerWidth;
    const H = window.innerHeight;

    ctx.clearRect(0, 0, W, H);
    drawBackground(t, W, H);
    drawParticles(t, W, H);
    drawTree(t, W, H);
    updateSlides(t);

    if (t >= TOTAL_DURATION) {
      dismissIntro();
      return;
    }
    rafId = requestAnimationFrame(render);
  }

  rafId = requestAnimationFrame(render);

  /* ─────────────────── FECHAR INTRO ─────────────────────────────────── */
  function dismissIntro() {
    if (done) return;
    done = true;
    cancelAnimationFrame(rafId);
    // deixa o último slide ativo um momento
    overlay.classList.add('fade-out');
    overlay.addEventListener('animationend', () => {
      overlay.remove();
      style.remove();
    }, { once: true });
  }

  document.getElementById('intro-skip').addEventListener('click', dismissIntro);
  // Também pula com qualquer tecla
  document.addEventListener('keydown', function skipKey(e) {
    if (['Enter','Escape',' '].includes(e.key)) {
      dismissIntro();
      document.removeEventListener('keydown', skipKey);
    }
  });

  /* ─────────────────── UTILS ─────────────────────────────────────────── */
  function easeOutElastic(x) {
    if (x === 0 || x === 1) return x;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
  }

  function pseudoRand(seed) {
    // LCG determinístico — sem Math.random() para manter seek-safe
    let s = Math.abs(Math.sin(seed) * 2654435761) >>> 0;
    return (s % 1000) / 1000;
  }

  function lerpColor(a, b, t) {
    const ah = parseInt(a.slice(1), 16);
    const bh = parseInt(b.slice(1), 16);
    const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
    const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl2 = Math.round(ab + (bb - ab) * t);
    return '#' + [r, g, bl2].map(v => v.toString(16).padStart(2, '0')).join('');
  }
})();
