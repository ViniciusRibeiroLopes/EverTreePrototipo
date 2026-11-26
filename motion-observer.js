/**
 * EverTree — Motion Observer & Micro-interactions
 * Inspirado em: hyperframes-motion-reel-skill + cth9191/animate
 *
 * Funcionalidades:
 *  1. Scroll-reveal (IntersectionObserver) com stagger por grupo
 *  2. Bump de contador ao incrementar folhas
 *  3. Ripple de água no botão de regar
 *  4. Stagger de entrada para cards de species/upgrades
 *  5. Shimmer ao desbloquear item do shop
 *  6. Fallback total se prefers-reduced-motion
 */
(function () {
  'use strict';

  /* ── Respeitar preferência do sistema ── */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ══════════════════════════════════
     1. SCROLL-REVEAL
  ══════════════════════════════════ */
  if (!reduced && 'IntersectionObserver' in window) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          revealObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    function attachReveal() {
      document.querySelectorAll('.panel, .resource-card, .stat-card, .badge-card').forEach((el, i) => {
        if (el.classList.contains('reveal')) return;
        el.classList.add('reveal');
        el.style.transitionDelay = (i % 6) * 55 + 'ms';
        revealObs.observe(el);
      });
    }

    // Roda ao abrir painéis
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-nav]');
      if (btn) requestAnimationFrame(() => setTimeout(attachReveal, 80));
    });

    // Inicial
    requestAnimationFrame(attachReveal);
  }

  /* ══════════════════════════════════
     2. STAGGER NOS CARDS AO RENDERIZAR
  ══════════════════════════════════ */
  if (!reduced) {
    // MutationObserver: stagger quando cards são adicionados ao DOM
    const cardObs = new MutationObserver((muts) => {
      muts.forEach(mut => {
        mut.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;
          const isCard = node.matches?.('.species-card, .upgrade-card, .shop-item, .badge-card');
          const cards = isCard ? [node] : node.querySelectorAll('.species-card, .upgrade-card, .shop-item, .badge-card');
          cards.forEach((card, i) => {
            card.style.animationDelay = (i * 55) + 'ms';
            card.classList.add('animate-fadeInUp');
          });
        });
      });
    });

    const grids = ['species-grid', 'upgrades-grid', 'shop-items', 'achievements-grid'];
    grids.forEach(id => {
      const el = document.getElementById(id);
      if (el) cardObs.observe(el, { childList: true });
    });
  }

  /* ══════════════════════════════════
     3. BUMP DO CONTADOR DE FOLHAS
  ══════════════════════════════════ */
  if (!reduced) {
    const leavesEl = document.getElementById('garden-leaves');
    if (leavesEl) {
      let lastVal = '';
      const bumpObs = new MutationObserver(() => {
        const val = leavesEl.textContent;
        if (val !== lastVal) {
          lastVal = val;
          leavesEl.classList.remove('bump');
          // reflow forçado para resetar animação
          void leavesEl.offsetWidth;
          leavesEl.classList.add('bump');
        }
      });
      bumpObs.observe(leavesEl, { childList: true, characterData: true, subtree: true });
      leavesEl.addEventListener('animationend', () => leavesEl.classList.remove('bump'));
    }
  }

  /* ══════════════════════════════════
     4. RIPPLE NO BOTÃO DE REGAR
  ══════════════════════════════════ */
  if (!reduced) {
    const waterBtn = document.getElementById('water-button');
    if (waterBtn) {
      waterBtn.addEventListener('click', () => {
        waterBtn.classList.remove('ripple');
        void waterBtn.offsetWidth;
        waterBtn.classList.add('ripple');
        waterBtn.addEventListener('animationend', () => waterBtn.classList.remove('ripple'), { once: true });
      });
    }
  }

  /* ══════════════════════════════════
     5. SHIMMER AO DESBLOQUEAR SHOP ITEM
  ══════════════════════════════════ */
  if (!reduced) {
    const shopEl = document.getElementById('shop-items');
    if (shopEl) {
      const shimmerObs = new MutationObserver((muts) => {
        muts.forEach(mut => {
          mut.addedNodes.forEach(node => {
            if (!(node instanceof HTMLElement)) return;
            const items = node.matches?.('.shop-item') ? [node] : node.querySelectorAll('.shop-item');
            items.forEach(item => {
              if (!item.disabled && !item.dataset.shimmed) {
                item.dataset.shimmed = '1';
                item.classList.add('unlocked');
                setTimeout(() => item.classList.remove('unlocked'), 1200);
              }
            });
          });
        });
      });
      shimmerObs.observe(shopEl, { childList: true, subtree: true });
    }
  }

  /* ══════════════════════════════════
     6. PARALLAX LEVE NA CENA (hover)
  ══════════════════════════════════ */
  if (!reduced) {
    const sceneCard = document.getElementById('scene');
    if (sceneCard) {
      sceneCard.addEventListener('mousemove', (e) => {
        const rect = sceneCard.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / rect.width  - 0.5; // -0.5 a 0.5
        const my = (e.clientY - rect.top)  / rect.height - 0.5;
        sceneCard.style.setProperty('--parallax-x', (mx * 6).toFixed(2) + 'px');
        sceneCard.style.setProperty('--parallax-y', (my * 4).toFixed(2) + 'px');
      });
      sceneCard.addEventListener('mouseleave', () => {
        sceneCard.style.setProperty('--parallax-x', '0px');
        sceneCard.style.setProperty('--parallax-y', '0px');
      });
    }
  }

  /* ══════════════════════════════════
     7. HOVER TILT NOS CARDS DE ESPÉCIE (3D sutil)
  ══════════════════════════════════ */
  if (!reduced) {
    function addTilt(selector) {
      document.addEventListener('mouseover', (e) => {
        const card = e.target.closest(selector);
        if (!card) return;
        card.addEventListener('mousemove', onMove);
        card.addEventListener('mouseleave', onLeave);
      });
    }

    function onMove(e) {
      const r = this.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      this.style.transform = `perspective(600px) rotateY(${x * 7}deg) rotateX(${-y * 5}deg) translateY(-3px)`;
      this.style.transition = 'transform 0.1s';
    }

    function onLeave() {
      this.style.transform = '';
      this.style.transition = 'transform 0.4s cubic-bezier(.22,.68,0,1.2)';
      this.removeEventListener('mousemove', onMove);
      this.removeEventListener('mouseleave', onLeave);
    }

    addTilt('.species-card');
  }

  /* ══════════════════════════════════
     8. PARALLAX NA CENA — aplicar ao canvas
  ══════════════════════════════════ */
  if (!reduced) {
    const sceneArt = document.getElementById('scene-art');
    if (sceneArt) {
      const scene = document.getElementById('scene');
      if (scene) {
        // Lê variáveis CSS set pelo mousemove acima
        const updateSceneParallax = () => {
          const px = scene.style.getPropertyValue('--parallax-x') || '0px';
          const py = scene.style.getPropertyValue('--parallax-y') || '0px';
          sceneArt.style.transform = `translate(${px}, ${py}) scale(1.03)`;
        };
        scene.addEventListener('mousemove', updateSceneParallax);
        scene.addEventListener('mouseleave', () => {
          sceneArt.style.transform = 'translate(0,0) scale(1)';
          sceneArt.style.transition = 'transform 0.6s cubic-bezier(.16,1,.3,1)';
        });
      }
    }
  }

})();
