/**
 * EverTree — Game Flow FX Engine  v2
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Inspirado em: hyperframes-motion-reel-skill + cth9191/animate
 *
 * Cobre TODOS os momentos-chave do fluxo:
 *  1. Clique na árvore → partículas + number pop + shockwave
 *  2. Compra de árvore → bloom + árvore plantada na cena
 *  3. Compra de melhoria → upgrade flash + anel de expansão
 *  4. Regar → spray de gotas + ripple azul
 *  5. Descoberta de espécie → fanfare + card voa para a coleção
 *  6. Evento (incêndio/pragas) → tela shake + alert pulse
 *  7. Acerto no evento → target extinguish burst
 *  8. Fim do evento → resolve flash + toast animado
 *  9. Mudança de clima → transição weather pill
 * 10. Conquista de badge → crown drop
 * 11. Prestige / doação → warp out
 *
 * Arquitetura seek-safe:
 *  – Canvas overlay na cena, desenhado por requestAnimationFrame
 *  – Cada efeito é um "burst" com { x, y, t0, fn(ctx, t, unit) }
 *  – Sem wall-clock; usa performance.now() apenas para t0
 *  – Respeita prefers-reduced-motion
 */

(function () {
  'use strict';

  /* ── 0. Guards ─────────────────────────────────────── */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. Canvas overlay sobre a cena ─────────────────── */
  const sceneCard = document.getElementById('scene');
  if (!sceneCard) return;

  const fxCanvas = document.createElement('canvas');
  fxCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;';
  fxCanvas.setAttribute('aria-hidden', 'true');
  sceneCard.appendChild(fxCanvas);

  const fxCtx = fxCanvas.getContext('2d');
  const bursts = [];
  let rafId = null;

  function resizeFx() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    fxCanvas.width  = sceneCard.clientWidth  * dpr;
    fxCanvas.height = sceneCard.clientHeight * dpr;
    fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeFx();
  new ResizeObserver(resizeFx).observe(sceneCard);

  function loop(now) {
    const W = sceneCard.clientWidth, H = sceneCard.clientHeight;
    fxCtx.clearRect(0, 0, W, H);
    const alive = bursts.filter(b => {
      const t = (now - b.t0) / 1000;
      if (t > b.life) return false;
      fxCtx.save();
      b.fn(fxCtx, t, b.life, W, H);
      fxCtx.restore();
      return true;
    });
    bursts.length = 0;
    bursts.push(...alive);
    rafId = bursts.length ? requestAnimationFrame(loop) : 0;
  }

  function spawn(burst) {
    if (reduced) return;
    bursts.push({ t0: performance.now(), ...burst });
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  /* ── 2. Helpers ──────────────────────────────────────── */
  const TAU = Math.PI * 2;
  const ease = {
    out:     t => 1 - Math.pow(1 - t, 3),
    outBig:  t => 1 - Math.pow(1 - t, 4),
    spring:  t => 1 - Math.pow(2, -10*t) * Math.cos(t * Math.PI * 3.5),
    elastic: t => t === 0||t===1?t:Math.pow(2,-10*t)*Math.sin((t*10-0.75)*(TAU/3))+1,
    inBack:  t => 2.7*t*t*t - 1.7*t*t,
  };
  function lerp(a, b, t) { return a + (b-a)*t; }
  function alpha(a) { return Math.max(0, Math.min(1, a)); }

  /* Pega posição do click/evento relativa à cena */
  function sceneXY(x01, y01) {
    return { x: sceneCard.clientWidth * x01, y: sceneCard.clientHeight * y01 };
  }
  /* Centro da árvore (aproximado) */
  const TREE_X = 0.50, TREE_Y = 0.68;

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     EFEITOS REUTILIZÁVEIS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /** Partículas radiais coloridas */
  function spawnBurst({ x, y, count=10, life=0.9, colors=['#c6e593','#9bde6a','#f0f9d8'], minR=2, maxR=6, speed=90, gravity=0 }) {
    const particles = Array.from({length:count}, (_, i) => {
      const angle = (i/count)*TAU + (Math.random()-0.5)*0.4;
      const v = speed * (0.6 + Math.random()*0.8);
      return { vx: Math.cos(angle)*v, vy: Math.sin(angle)*v, r: minR+Math.random()*(maxR-minR), color: colors[i%colors.length] };
    });
    spawn({
      life,
      fn(ctx, t, life, W, H) {
        const p = alpha(t/life);
        ctx.globalAlpha = alpha(1 - ease.out(p));
        particles.forEach(p2 => {
          const px = x + p2.vx * t;
          const py = y + p2.vy * t + 0.5 * gravity * t * t;
          ctx.fillStyle = p2.color;
          ctx.beginPath();
          ctx.arc(px, py, p2.r * (1 - p*0.5), 0, TAU);
          ctx.fill();
        });
      }
    });
  }

  /** Onda de choque circular */
  function spawnShockwave({ x, y, life=0.6, color='rgba(198,229,147,', maxR=120, lineWidth=3 }) {
    spawn({
      life,
      fn(ctx, t, life) {
        const p = ease.out(t/life);
        const r = maxR * p;
        ctx.globalAlpha = alpha(1 - p) * 0.6;
        ctx.strokeStyle = color + ctx.globalAlpha + ')';
        ctx.lineWidth = lineWidth * (1 - p*0.5);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.stroke();
      }
    });
  }

  /** Número flutuando para cima */
  function spawnFloatingText({ x, y, text, color='#c6e593', size=22, life=1.0 }) {
    spawn({
      life,
      fn(ctx, t, life) {
        const p = t/life;
        const ey = ease.out(p);
        ctx.globalAlpha = alpha(p < 0.6 ? 1 : 1 - (p-0.6)/0.4);
        ctx.font = `bold ${size}px Georgia, serif`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y - ey * 65);
      }
    });
  }

  /** Flash de tela inteira */
  function spawnScreenFlash({ color='rgba(198,229,147,0.12)', life=0.4 }) {
    spawn({
      life,
      fn(ctx, t, life, W, H) {
        const p = t/life;
        ctx.globalAlpha = alpha((1-p));
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, W, H);
      }
    });
  }

  /** Folha 🍃 voa da árvore para o canto */
  function spawnLeafFly({ fromX, fromY, toX, toY, life=0.7, color='#9bde6a' }) {
    spawn({
      life,
      fn(ctx, t, life) {
        const p = ease.spring(t/life);
        const x = lerp(fromX, toX, p);
        const y = lerp(fromY, toY, p) - Math.sin(p*Math.PI)*35;
        ctx.globalAlpha = alpha(t/life < 0.9 ? 1 : 1-(t/life-0.9)/0.1);
        ctx.fillStyle = color;
        ctx.font = '15px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 4);
        ctx.fillText('🍃', 0, 0);
        ctx.restore();
      }
    });
  }

  /** Anel pulsante (conquista, evento resolvido) */
  function spawnRing({ x, y, life=1.2, color='#c6e593', rings=3 }) {
    for (let i = 0; i < rings; i++) {
      const delay = i * 0.15;
      spawn({
        life: life + delay,
        fn(ctx, t, totalLife) {
          if (t < delay) return;
          const nt = (t - delay) / life;
          if (nt > 1) return;
          const p = ease.out(nt);
          ctx.globalAlpha = alpha((1-p) * 0.7);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 25 + p * 90, 0, TAU);
          ctx.stroke();
        }
      });
    }
  }

  /** Gotas de água */
  function spawnWaterDrops({ x, y, count=14 }) {
    const drops = Array.from({length:count}, (_, i) => {
      const angle = -Math.PI/2 + (i/(count-1) - 0.5) * Math.PI * 0.9;
      const v = 55 + Math.random()*45;
      return { vx: Math.cos(angle)*v, vy: Math.sin(angle)*v };
    });
    spawn({
      life: 0.75,
      fn(ctx, t, life) {
        const p = t/life;
        ctx.globalAlpha = alpha(1 - ease.out(p));
        drops.forEach(d => {
          const px = x + d.vx * t;
          const py = y + d.vy * t + 180*t*t;
          ctx.fillStyle = `rgba(100,170,210,${0.8 - p*0.5})`;
          ctx.beginPath();
          ctx.ellipse(px, py, 2.5, 4, Math.atan2(d.vy + 360*t, d.vx), 0, TAU);
          ctx.fill();
        });
      }
    });
  }

  /** Screen shake via CSS transform */
  function shakeScene(intensity=4, dur=400) {
    if (reduced) return;
    let start = null;
    function step(now) {
      if (!start) start = now;
      const p = (now - start) / dur;
      if (p >= 1) { sceneCard.style.transform = ''; return; }
      const decay = 1 - p;
      const dx = (Math.random()*2-1) * intensity * decay;
      const dy = (Math.random()*2-1) * intensity * decay;
      sceneCard.style.transform = `translate(${dx}px,${dy}px)`;
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /** Pop de texto no DOM (folha ganha no clique) */
  function domPop(text, x, y, color='#c6e593') {
    if (reduced) return;
    const el = document.createElement('div');
    el.className = 'fx-dom-pop';
    el.textContent = text;
    el.style.cssText = `
      position:fixed;
      left:${x}px;top:${y}px;
      transform:translate(-50%,-50%);
      color:${color};
      font:700 18px Georgia,serif;
      pointer-events:none;
      z-index:9998;
      animation:fxPopUp 0.9s ease-out forwards;
    `;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     INTERCEPTAR EVENTOS DO JOGO
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /* ── 3. Clique na árvore ───────────────────────────── */
  const treeBtn = document.getElementById('tree-button');
  if (treeBtn) {
    treeBtn.addEventListener('click', e => {
      if (treeBtn.disabled) return;
      const rect = treeBtn.getBoundingClientRect();
      const scRect = sceneCard.getBoundingClientRect();

      // Partículas na cena
      const cx = rect.left + rect.width/2  - scRect.left;
      const cy = rect.top  + rect.height*0.3 - scRect.top;
      spawnBurst({ x:cx, y:cy, count:12, colors:['#c6e593','#9bde6a','#f0f9d8','#73c47a'], speed:80 });
      spawnShockwave({ x:cx, y:cy, life:0.5, maxR:80 });

      // Número flutuante no DOM
      const mx = e.clientX || rect.left + rect.width/2;
      const my = e.clientY || rect.top  + rect.height/2;
      const clickRate = document.getElementById('click-rate')?.textContent || '+2';
      domPop(clickRate, mx, my);

      // Folha voa para o HUD
      const hudRect = document.querySelector('.leaf-counter')?.getBoundingClientRect();
      if (hudRect) {
        spawnLeafFly({
          fromX: cx, fromY: cy,
          toX: hudRect.left - scRect.left + hudRect.width/2,
          toY: hudRect.top  - scRect.top  + hudRect.height/2,
          life: 0.65,
        });
      }

      // Micro-pulse no leaf-counter
      const lc = document.querySelector('.leaf-counter');
      if (lc && !reduced) {
        lc.classList.remove('fx-pulse');
        void lc.offsetWidth;
        lc.classList.add('fx-pulse');
      }
    });
  }

  /* ── 4. Compra de árvore ───────────────────────────── */
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-shop-buy="tree"]:not(:disabled)');
    if (!btn) return;
    const { x, y } = sceneXY(TREE_X, TREE_Y);
    spawnBurst({ x, y, count:20, colors:['#c6e593','#9bde6a','#73c47a','#f0f9d8','#b8e68a'], speed:110, life:1.1 });
    spawnRing({ x, y, life:1.0, color:'#c6e593' });
    spawnScreenFlash({ color:'rgba(198,229,147,0.07)', life:0.4 });
    // Texto da espécie comprada
    const idAttr = btn.dataset.id || '';
    const name = document.querySelector(`[data-shop-buy="tree"][data-id="${idAttr}"] .shop-copy strong`)?.textContent;
    if (name) spawnFloatingText({ x, y: y-40, text:'🌱 '+name, size:16, life:1.4, color:'#c6e593' });
  });

  /* ── 5. Compra de melhoria ─────────────────────────── */
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action="upgrade"]:not(:disabled), [data-shop-buy="upgrade"]:not(:disabled)');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top  + rect.height/2;
    // Anel de expansão no próprio botão
    domPop('✦', cx, cy, '#e7c075');
    spawnUpgradeRing(btn);
  });

  function spawnUpgradeRing(el) {
    if (reduced) return;
    const ring = document.createElement('div');
    ring.className = 'fx-upgrade-ring';
    el.style.position = 'relative';
    el.appendChild(ring);
    ring.addEventListener('animationend', () => ring.remove());
  }

  /* ── 6. Regar ──────────────────────────────────────── */
  const waterBtn = document.getElementById('water-button');
  if (waterBtn) {
    waterBtn.addEventListener('click', () => {
      if (waterBtn.disabled) return;
      const rect = waterBtn.getBoundingClientRect();
      const scRect = sceneCard.getBoundingClientRect();
      const cx = rect.left + rect.width/2  - scRect.left;
      const cy = rect.top  + rect.height/2 - scRect.top;
      // Spray de gotas (origem acima da cena — simula regador)
      const origin = sceneXY(0.5, 0.15);
      spawnWaterDrops({ x: origin.x, y: origin.y, count: 18 });
      spawnShockwave({ x: sceneCard.clientWidth*0.5, y: sceneCard.clientHeight*0.6, life:0.7, color:'rgba(100,170,210,', maxR:100 });
      // Ripple azul no próprio botão
      if (!reduced) {
        waterBtn.classList.remove('fx-water-ripple');
        void waterBtn.offsetWidth;
        waterBtn.classList.add('fx-water-ripple');
      }
    });
  }

  /* ── 7. Acerto em evento (incêndio / pragas) ──────── */
  document.addEventListener('click', e => {
    const btn = e.target.closest('.rescue-target:not([hidden])');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const scRect = sceneCard.getBoundingClientRect();
    const cx = rect.left + rect.width/2  - scRect.left;
    const cy = rect.top  + rect.height/2 - scRect.top;

    // Detectar tipo de evento pelo dataset ou ícone
    const isfire = btn.dataset.kind === 'fire' || btn.textContent.includes('🔥');
    if (isfire) {
      // Extinguir: bolhas de água
      spawnBurst({ x:cx, y:cy, count:8, colors:['#4aa8d8','#8ed4f0','#c3eaf7'], speed:60, life:0.6 });
    } else {
      // Praga: confetti verde
      spawnBurst({ x:cx, y:cy, count:8, colors:['#9bde6a','#c6e593','#73c47a'], speed:55, life:0.55 });
    }
    // Sumir o botão com scale-out
    if (!reduced) {
      btn.style.animation = 'fxTargetHit 0.3s ease-out forwards';
    }
  });

  /* ── 8. Início de evento (tela shake) ─────────────── */
  const eventBox = document.getElementById('event-box');
  if (eventBox) {
    new MutationObserver(muts => {
      muts.forEach(m => {
        if (m.type === 'attributes' && m.attributeName === 'hidden') {
          if (!eventBox.hidden) {
            // Evento começou
            shakeScene(5, 450);
            const { x, y } = sceneXY(0.5, 0.5);
            spawnScreenFlash({ color:'rgba(220,80,40,0.08)', life:0.6 });
            spawnRing({ x, y, life:1.0, color:'rgba(220,80,40,0.6)', rings:2 });
          }
        }
      });
    }).observe(eventBox, { attributes: true });
  }

  /* ── 9. Mudança de clima — weather pill blink ──────── */
  const weatherBtn = document.getElementById('weather');
  if (weatherBtn) {
    new MutationObserver(() => {
      if (!reduced) {
        weatherBtn.classList.remove('fx-weather-change');
        void weatherBtn.offsetWidth;
        weatherBtn.classList.add('fx-weather-change');
      }
    }).observe(weatherBtn, { childList: true, characterData: true, subtree: true });
  }

  /* ── 10. Descoberta de espécie ─────────────────────── */
  // Interceptamos o toast de descoberta
  const toastStack = document.getElementById('toast-stack');
  if (toastStack) {
    new MutationObserver(muts => {
      muts.forEach(m => {
        m.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;
          if (node.classList.contains('discovery-toast')) {
            // Fanfare de partículas no centro
            const { x, y } = sceneXY(0.5, 0.4);
            spawnBurst({ x, y, count:28, colors:['#c6e593','#f0f9d8','#e7c075','#73c47a','#b8e68a'], speed:130, life:1.3 });
            spawnRing({ x, y, life:1.3, color:'#c6e593', rings:3 });
            spawnScreenFlash({ color:'rgba(198,229,147,0.09)', life:0.7 });
          }
        });
      });
    }).observe(toastStack, { childList: true });
  }

  /* ── 11. Badge conquistado ─────────────────────────── */
  const achievGrid = document.getElementById('achievements-grid');
  if (achievGrid) {
    new MutationObserver(muts => {
      muts.forEach(m => {
        m.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;
          node.querySelectorAll?.('.badge.achieved').forEach(badge => {
            if (badge._fxDone) return;
            badge._fxDone = true;
            if (!reduced) {
              badge.classList.add('fx-badge-pop');
            }
          });
        });
      });
    }).observe(achievGrid, { childList: true, subtree: true });
  }

  /* ── 12. Prestige (doação de floresta) ─────────────── */
  const prestigeBtn = document.getElementById('prestige-button');
  if (prestigeBtn) {
    prestigeBtn.addEventListener('click', () => {
      if (prestigeBtn.disabled) return;
      // Warp-out: múltiplos bursts concêntricos + flash branco
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          const { x, y } = sceneXY(0.5, 0.5);
          spawnBurst({ x, y, count:30, colors:['#ffffff','#c6e593','#f0f9d8'], speed:160+i*30, life:1.2 });
          spawnShockwave({ x, y, life:0.8, maxR:200+i*50, color:'rgba(255,255,255,' });
        }, i*100);
      }
      setTimeout(() => spawnScreenFlash({ color:'rgba(255,255,255,0.3)', life:0.9 }), 400);
    });
  }

  /* ── 13. Tend (coletar recursos) ───────────────────── */
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action="tend"]');
    if (!btn || btn.disabled) return;
    const id = btn.dataset.id;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top  + rect.height/2;
    const colors = id==='water' ? ['#4aa8d8','#8ed4f0'] : id==='soil' ? ['#8b6e4a','#b8956e','#c6b08a'] : ['#f7c94a','#fde68a'];
    const icon = id==='water'?'💧':id==='soil'?'♧':'☀️';
    domPop(icon, cx, cy, id==='water'?'#4aa8d8':id==='soil'?'#b8956e':'#f7c94a');
  });

  /* ── 14. Polinização no lab ────────────────────────── */
  const crossBtn = document.getElementById('cross-button');
  if (crossBtn) {
    crossBtn.addEventListener('click', () => {
      if (crossBtn.disabled) return;
      const rect = crossBtn.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top  + rect.height/2;
      // Partículas mágicas roxas/douradas
      domPop('⚘', cx, cy - 20, '#b18bd2');
      if (!reduced) {
        crossBtn.classList.add('fx-lab-pulse');
        setTimeout(() => crossBtn.classList.remove('fx-lab-pulse'), 700);
      }
    });
  }

  /* ── 15. Loop de folhas caindo quando idle (cena ativa) ─ */
  if (!reduced) {
    let lastLeafTime = 0;
    function idleLeaves(now) {
      if (now - lastLeafTime > 2200 && !document.hidden) {
        lastLeafTime = now;
        const W = sceneCard.clientWidth, H = sceneCard.clientHeight;
        const sx = 0.25 + Math.random() * 0.5;
        spawn({
          life: 2.4,
          fn(ctx, t, life, W, H) {
            const p = t/life;
            const x = sx*W + Math.sin(t*2.5)*25;
            const y = H*0.1 + ease.out(p) * H * 0.65;
            ctx.globalAlpha = alpha(p < 0.85 ? 1 : (1-p)/0.15);
            ctx.font = '14px serif';
            ctx.textAlign = 'center';
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.sin(t*3)*0.5);
            ctx.fillText('🍃', 0, 0);
            ctx.restore();
          }
        });
      }
      requestAnimationFrame(idleLeaves);
    }
    requestAnimationFrame(idleLeaves);
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     KEYFRAME CSS GLOBAL (injetados via JS)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fxPopUp {
      0%   { opacity:0; transform:translate(-50%,-50%) scale(0.6); }
      20%  { opacity:1; transform:translate(-50%,-80%) scale(1.1); }
      80%  { opacity:1; transform:translate(-50%,-130%) scale(1); }
      100% { opacity:0; transform:translate(-50%,-160%) scale(0.9); }
    }
    @keyframes fxTargetHit {
      0%   { transform:scale(1); opacity:1; }
      50%  { transform:scale(1.3); opacity:0.5; }
      100% { transform:scale(0); opacity:0; }
    }
    @keyframes fxBadgePop {
      0%   { transform:scale(0.5) rotate(-8deg); opacity:0; }
      60%  { transform:scale(1.08) rotate(2deg); opacity:1; }
      100% { transform:scale(1) rotate(0); opacity:1; }
    }
    @keyframes fxLeafPulse {
      0%,100% { transform:scale(1); }
      50%     { transform:scale(1.04); }
    }
    @keyframes fxWaterRipple {
      0%   { box-shadow:0 0 0 0 rgba(100,170,210,0.5); }
      70%  { box-shadow:0 0 0 14px rgba(100,170,210,0); }
      100% { box-shadow:0 0 0 0 rgba(100,170,210,0); }
    }
    @keyframes fxWeatherChange {
      0%   { transform:scale(1); background:#243026; }
      30%  { transform:scale(1.1); background:#2c4a38; }
      60%  { transform:scale(0.95); }
      100% { transform:scale(1); background:#243026; }
    }
    @keyframes fxUpgradeRing {
      0%   { transform:scale(0.8); opacity:1; border-width:3px; }
      100% { transform:scale(2.2); opacity:0; border-width:1px; }
    }
    @keyframes fxLabPulse {
      0%,100% { box-shadow:0 0 0 0 rgba(177,139,210,0.4); }
      50%     { box-shadow:0 0 20px 6px rgba(177,139,210,0.3); }
    }

    /* Classes utilitárias adicionadas via JS */
    .fx-pulse {
      animation: fxLeafPulse 0.25s ease-out;
    }
    .fx-water-ripple {
      animation: fxWaterRipple 0.6s ease-out;
    }
    .fx-weather-change {
      animation: fxWeatherChange 0.5s ease-out;
    }
    .fx-upgrade-ring {
      position:absolute;
      inset:-4px;
      border-radius:inherit;
      border:3px solid rgba(198,229,147,0.6);
      pointer-events:none;
      animation: fxUpgradeRing 0.5s ease-out forwards;
    }
    .fx-badge-pop {
      animation: fxBadgePop 0.5s cubic-bezier(.22,.68,0,1.2) both;
    }
    .fx-lab-pulse {
      animation: fxLabPulse 0.6s ease-in-out;
    }

    /* Toast de descoberta aprimorado */
    .discovery-toast {
      border-left:3px solid #c6e593 !important;
      background: linear-gradient(90deg, #1f3d2a, #192820) !important;
      animation: fadeInUp 0.4s cubic-bezier(.22,.68,0,1.2) both !important;
    }

    /* Rescue targets */
    .rescue-target {
      transition: transform 0.15s ease, background 0.15s;
      transform-origin: center;
    }
    .rescue-target:hover:not([hidden]) {
      transform: scale(1.15);
    }
    .rescue-target:active:not([hidden]) {
      transform: scale(0.9);
    }

    /* HUD leaf counter — glow quando folhas crescem */
    .leaf-counter {
      transition: box-shadow 0.3s ease;
    }
    .fx-pulse {
      box-shadow: 0 0 0 3px rgba(198,229,147,0.25) !important;
    }

    /* Skill node — ready pulse */
    .skill-node[data-locked="false"]:not([data-owned="true"]) .skill-ready {
      animation: pulseGlow 1.5s ease-in-out infinite;
    }

    /* Shop row — entrada com fade */
    .shop-row {
      transition: background 0.2s ease, opacity 0.2s ease;
    }
    .shop-row.affordable .shop-buy {
      position: relative;
      overflow: hidden;
    }
    .shop-row.affordable .shop-buy::before {
      content:'';
      position:absolute;
      inset:0;
      background:linear-gradient(90deg,transparent,rgba(198,229,147,0.07),transparent);
      background-size:200% 100%;
      animation:shimmer 2.5s ease-in-out infinite;
      border-radius:inherit;
      pointer-events:none;
    }

    /* Next unlock progress — micro bounce quando muda */
    .next-unlock {
      transition: transform 0.2s cubic-bezier(.22,.68,0,1.2);
    }
    .next-unlock:hover { transform: translateY(-1px); }

    /* Grove row — hover lift */
    .grove-row {
      transition: background 0.2s ease, transform 0.2s cubic-bezier(.22,.68,0,1.2);
    }
    .grove-row:hover { transform: translateX(2px); }
    .grove-row.selected {
      border-left: 2px solid var(--spring, #c6e593) !important;
    }

    /* Resource orb — feedback rápido ao clicar */
    .resource-orb {
      transition: transform 0.15s cubic-bezier(.22,.68,0,1.2), background 0.15s;
    }
    .resource-orb:active:not(:disabled) {
      transform: scale(0.9);
    }
    .resource-orb.low {
      animation: borderPulse 1.4s ease-in-out infinite;
    }

    /* Event alert — urgência */
    .event-alert:not([hidden]) {
      animation: pulseGlow 0.9s ease-in-out infinite, slideInRight 0.3s cubic-bezier(.22,.68,0,1.2) both;
    }

    /* Tab do shop — underline animado */
    .shop-tabs button {
      position:relative;
      transition: color 0.2s ease;
    }
    .shop-tabs button[aria-selected="true"] {
      color: var(--spring, #c6e593) !important;
    }
    .shop-tabs button[aria-selected="true"]::after {
      content:'';
      position:absolute;
      bottom:0;left:0;right:0;
      height:2px;
      background:var(--spring, #c6e593);
      border-radius:2px;
      animation: fadeIn 0.2s ease both;
    }

    /* Health meter — transition suave */
    #recovery-bar {
      transition: width 1.5s cubic-bezier(.16,1,.3,1) !important;
    }
    #prestige-bar {
      transition: width 1.5s cubic-bezier(.16,1,.3,1) !important;
    }
    .resource-bar i {
      transition: width 1s cubic-bezier(.16,1,.3,1) !important;
    }

    /* World caption — fade ao mudar de estágio */
    #world-caption {
      transition: opacity 0.5s ease;
    }

    /* Harvest pane entrada */
    .harvest-pane {
      animation: fadeInUp 0.5s cubic-bezier(.22,.68,0,1.2) both;
    }

    /* Shop pane entrada */
    .shop-pane {
      animation: slideInRight 0.5s cubic-bezier(.22,.68,0,1.2) 0.1s both;
    }

    /* Legacy crown extra pulse */
    .legacy-crown {
      text-shadow: 0 0 20px rgba(198,229,147,0.4);
      transition: text-shadow 0.5s ease;
    }
    .legacy-crown:hover {
      text-shadow: 0 0 40px rgba(198,229,147,0.7);
    }

    /* Skill-node — hover glow */
    .skill-node {
      transition: transform 0.2s cubic-bezier(.22,.68,0,1.2), box-shadow 0.2s ease;
    }
    .skill-node:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(198,229,147,0.15);
    }
    .skill-node[aria-pressed="true"] {
      animation: pulseGlow 2s ease-in-out infinite;
    }

    /* Next unlock progress bar — transition */
    #next-progress {
      transition: width 0.6s cubic-bezier(.16,1,.3,1) !important;
    }

    @media (prefers-reduced-motion:reduce) {
      .fx-pulse, .fx-water-ripple, .fx-weather-change,
      .fx-upgrade-ring, .fx-badge-pop, .fx-lab-pulse,
      .event-alert:not([hidden]),
      .shop-row.affordable .shop-buy::before,
      .resource-orb.low,
      .skill-node[aria-pressed="true"] { animation:none!important; }
    }
  `;
  document.head.appendChild(style);

})();
