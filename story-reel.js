/**
 * EverTree — In-Game Story Reel & Live Ecological Explainer
 * Combina os princípios das três bibliotecas/skills:
 *  - hyperframes-motion-reel-skill: timeline determinística seek-safe (start/duration),
 *    transições com clip-path, transform/opacity GPU-accelerated.
 *  - cth9191/animate: animações procedurais em <canvas> explicando a importância
 *    da natureza e sua evolução ao longo do tempo.
 *  - claude-motion-design: tipografia escalonada e micro-animações spring.
 */
(function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
  const pseudo = (seed) => {
    const s = Math.abs(Math.sin(seed) * 2654435761) >>> 0;
    return (s % 1000) / 1000;
  };

  /* ══════════════════════════════════════════════════════════
     CAPÍTULOS DA EVOLUÇÃO DO VALE (0% -> 100%)
  ══════════════════════════════════════════════════════════ */
  const CHAPTERS = [
    {
      id: 0,
      at: 0,
      tag: "CAP. 1 · 0%",
      duration: 7.0,
      clips: [
        {
          start: 0.0,
          duration: 3.5,
          eyebrow: "ÁREA DEVASTADA",
          title: "Quando a floresta desaparece",
          text: "Sem cobertura vegetal, chaminés concentram poluição, o solo racha com o calor e a chuva escoa sem infiltrar.",
        },
        {
          start: 3.5,
          duration: 3.5,
          eyebrow: "POR QUE RESTAURAR?",
          title: "Cada semente inicia o ciclo",
          text: "Ao cuidar da muda pioneira, você limpa os primeiros resíduos e devolve sombra e umidade à terra.",
        },
      ],
      render(t, ctx, W, H) {
        // Sky polluted -> hint of dawn light
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "#242028");
        sky.addColorStop(0.65, "#4c4246");
        sky.addColorStop(1, "#786152");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);

        // Barren cracked earth
        ctx.fillStyle = "#3a2f28";
        ctx.fillRect(0, H * 0.72, W, H * 0.28);
        ctx.strokeStyle = "#221a15";
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          const cx = 18 + i * 34;
          ctx.beginPath();
          ctx.moveTo(cx, H * 0.78);
          ctx.lineTo(cx + 8, H * 0.85);
          ctx.lineTo(cx + 3, H * 0.94);
          ctx.stroke();
        }

        // Industrial smokestacks pumping soot
        const stacks = [
          [42, 46, 12],
          [78, 36, 10],
          [114, 50, 11],
        ];
        stacks.forEach(([x, topY, w], idx) => {
          ctx.fillStyle = "#48403d";
          ctx.fillRect(x, topY, w, H * 0.72 - topY);
          ctx.fillStyle = "#2d2827";
          ctx.fillRect(x - 2, topY, w + 4, 4);
          // Smoke puffs rising deterministically with t
          for (let p = 0; p < 5; p++) {
            const age = (t * 0.42 + p / 5 + idx * 0.17) % 1;
            const px = x + w * 0.5 + age * 28 + Math.sin(age * 6 + idx) * 4;
            const py = topY - age * 38;
            const pr = 4 + age * 10;
            ctx.fillStyle = `rgba(110, 102, 106, ${(1 - age) * 0.7})`;
            ctx.beginPath();
            ctx.arc(px, py, pr, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // Heat waves rising on right
        ctx.strokeStyle = "rgba(247, 127, 0, 0.55)";
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          const hx = 152 + i * 20;
          const phase = (t * 0.9 + i * 0.3) % 1;
          const hy = H * 0.70 - phase * 36;
          ctx.globalAlpha = Math.sin(phase * Math.PI);
          ctx.beginPath();
          ctx.moveTo(hx, hy + 10);
          ctx.quadraticCurveTo(hx - 4, hy + 5, hx, hy);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // First hopeful green sprout in beat 2
        if (t > 3.2) {
          const grow = easeOut((t - 3.2) / 1.4);
          const sx = 174, sy = H * 0.72;
          ctx.strokeStyle = "#74c69d";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, sy - 16 * grow);
          ctx.stroke();
          ctx.fillStyle = "#c6e593";
          ctx.beginPath();
          ctx.ellipse(sx - 5 * grow, sy - 14 * grow, 5 * grow, 3 * grow, -0.4, 0, Math.PI * 2);
          ctx.ellipse(sx + 5 * grow, sy - 16 * grow, 5 * grow, 3 * grow, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    },
    {
      id: 1,
      at: 12,
      tag: "CAP. 2 · 12%",
      duration: 7.0,
      clips: [
        {
          start: 0.0,
          duration: 3.5,
          eyebrow: "PRIMEIROS BROTOS",
          title: "A força invisível das raízes",
          text: "Sob a superfície, raízes seguram o solo contra a erosão e criam túneis para a água da chuva penetrar.",
        },
        {
          start: 3.5,
          duration: 3.5,
          eyebrow: "SOLO VIVO",
          title: "Nutrientes voltam a circular",
          text: "Matéria orgânica e umidade transformam a terra estéril em berço para árvores maiores.",
        },
      ],
      render(t, ctx, W, H) {
        // Above-ground sky + underground cross-section
        ctx.fillStyle = "#234a39";
        ctx.fillRect(0, 0, W, H * 0.36);
        const soilGrad = ctx.createLinearGradient(0, H * 0.36, 0, H);
        soilGrad.addColorStop(0, "#3a5a40");
        soilGrad.addColorStop(0.14, "#4a3828");
        soilGrad.addColorStop(1, "#241911");
        ctx.fillStyle = soilGrad;
        ctx.fillRect(0, H * 0.36, W, H * 0.64);

        // Grass rim
        ctx.fillStyle = "#52b788";
        ctx.fillRect(0, H * 0.35, W, 3);

        // Growing sapling above ground
        const cx = W * 0.5, gy = H * 0.36;
        const grow = easeOut(t / 2.2);
        ctx.fillStyle = "#6c462b";
        ctx.fillRect(cx - 3, gy - 20 * grow, 6, 20 * grow);
        ctx.fillStyle = "#74c69d";
        ctx.beginPath();
        ctx.arc(cx, gy - 24 * grow, 13 * grow, 0, Math.PI * 2);
        ctx.fill();

        // Branching roots expanding underground
        const rootProg = easeOut(t / 4.2);
        ctx.strokeStyle = "#d4a373";
        ctx.lineCap = "round";
        for (let b = -3; b <= 3; b++) {
          const depth = (36 + (3 - Math.abs(b)) * 11) * rootProg;
          const spread = b * 24 * rootProg;
          ctx.lineWidth = Math.max(1.2, 3.2 - Math.abs(b) * 0.4);
          ctx.beginPath();
          ctx.moveTo(cx, gy + 2);
          ctx.quadraticCurveTo(cx + spread * 0.45, gy + depth * 0.55, cx + spread, gy + depth);
          ctx.stroke();
        }

        // Rain drops infiltrating along roots & glowing nutrient motes
        for (let i = 0; i < 10; i++) {
          const a = (t * 0.45 + i / 10) % 1;
          const rx = cx + (pseudo(i * 13 + 1) - 0.5) * 140;
          const ry = a * H * 0.88;
          ctx.fillStyle = ry < gy ? "#72efdd" : "rgba(114, 239, 221, 0.7)";
          ctx.beginPath();
          ctx.arc(rx, ry, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        if (t > 2.0) {
          const humAlpha = clamp((t - 2.0) / 2.5);
          for (let i = 0; i < 12; i++) {
            const nx = 26 + pseudo(i * 7 + 3) * (W - 52);
            const ny = gy + 14 + pseudo(i * 11 + 5) * (H - gy - 22);
            const pulse = 0.5 + 0.5 * Math.sin(t * 3 + i);
            ctx.fillStyle = `rgba(198, 229, 147, ${humAlpha * pulse * 0.85})`;
            ctx.fillRect(nx, ny, 2.5, 2.5);
          }
        }
      },
    },
    {
      id: 2,
      at: 35,
      tag: "CAP. 3 · 35%",
      duration: 7.0,
      clips: [
        {
          start: 0.0,
          duration: 3.5,
          eyebrow: "BOSQUE EM RECUPERAÇÃO",
          title: "Águas limpas e matas ciliares",
          text: "Árvores às margens filtram sedimentos e transformam córregos turvos em rios vivos e cristalinos.",
        },
        {
          start: 3.5,
          duration: 3.5,
          eyebrow: "POLINIZADORES",
          title: "Flores que tecem a floresta",
          text: "Abelhas e aves conectam espécies diferentes, acelerando o surgimento natural de novas mudas.",
        },
      ],
      render(t, ctx, W, H) {
        // Sky + valley
        const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
        sky.addColorStop(0, "#1d6fa3");
        sky.addColorStop(1, "#72efdd");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H * 0.55);

        // Rolling green banks
        ctx.fillStyle = "#2d7a4f";
        ctx.fillRect(0, H * 0.52, W, H * 0.48);

        // River clearing from brown-gray to bright cyan over time
        const clean = easeOut(t / 3.0);
        const r = Math.round(92 + (0 - 92) * clean);
        const g = Math.round(78 + (187 - 78) * clean);
        const b = Math.round(62 + (249 - 62) * clean);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.moveTo(0, H * 0.68);
        ctx.bezierCurveTo(W * 0.35, H * 0.56, W * 0.65, H * 0.82, W, H * 0.66);
        ctx.lineTo(W, H * 0.90);
        ctx.bezierCurveTo(W * 0.65, H, W * 0.35, H * 0.74, 0, H * 0.86);
        ctx.closePath();
        ctx.fill();

        // Sparkles on water
        ctx.fillStyle = "#e0fbfc";
        for (let i = 0; i < 6; i++) {
          const sx = ((i * 38 + t * 28) % (W - 20)) + 10;
          const sy = H * 0.74 + Math.sin(sx * 0.04) * 6;
          ctx.fillRect(sx, sy, 6 * clean, 1.5);
        }

        // Two flowering trees (Ipê + Jacarandá)
        const trees = [
          [46, H * 0.55, "#fbbf24"],
          [174, H * 0.55, "#c4b5fd"],
        ];
        trees.forEach(([tx, ty, col]) => {
          ctx.fillStyle = "#6c462b";
          ctx.fillRect(tx - 3, ty - 22, 6, 22);
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(tx, ty - 26, 15, 0, Math.PI * 2);
          ctx.fill();
        });

        // Pollinator arc & glowing bee/bird flying between trees
        const arcP = (t * 0.45) % 1;
        const bx = 46 + (174 - 46) * arcP;
        const by = H * 0.28 - Math.sin(arcP * Math.PI) * 20;
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "rgba(255, 243, 176, 0.5)";
        ctx.beginPath();
        ctx.moveTo(46, H * 0.28);
        ctx.quadraticCurveTo(W * 0.5, H * 0.06, 174, H * 0.28);
        ctx.stroke();
        ctx.setLineDash([]);
        // Bee
        ctx.fillStyle = "#ffd166";
        ctx.beginPath();
        ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(bx - 2, by - 5 + (Math.floor(t * 14) % 2), 3, 2);
      },
    },
    {
      id: 3,
      at: 65,
      tag: "CAP. 4 · 65%",
      duration: 7.0,
      clips: [
        {
          start: 0.0,
          duration: 3.5,
          eyebrow: "ECOSSISTEMA EQUILIBRADO",
          title: "Escudo contra o calor extremo",
          text: "Copas altas filtram a radiação solar, mantêm o vale fresco e absorvem toneladas de carbono.",
        },
        {
          start: 3.5,
          duration: 3.5,
          eyebrow: "BIODIVERSIDADE",
          title: "Espécies que protegem umas às outras",
          text: "Uma floresta diversa resiste melhor a secas e pragas do que qualquer monocultura.",
        },
      ],
      render(t, ctx, W, H) {
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, "#123026");
        bg.addColorStop(1, "#1d4a36");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Canopy shield dome
        const canopies = [
          [55, H * 0.56, 28, "#2d6a4f"],
          [110, H * 0.48, 34, "#40916c"],
          [165, H * 0.56, 26, "#52b788"],
        ];
        canopies.forEach(([x, y, r, c]) => {
          ctx.fillStyle = "#5c3d28";
          ctx.fillRect(x - 4, y, 8, H - y);
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        });

        // Solar heat arrows deflected by canopy
        for (let i = 0; i < 4; i++) {
          const p = (t * 0.65 + i * 0.25) % 1;
          const x = 44 + i * 44;
          const bounceY = p < 0.5 ? p * 2 * 24 : (1 - (p - 0.5) * 2) * 24;
          ctx.strokeStyle = "#ffb703";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, bounceY);
          ctx.lineTo(x, bounceY + 9);
          ctx.stroke();
        }

        // Cool O2 / moisture particles circulating under shade
        for (let i = 0; i < 14; i++) {
          const p = (t * 0.32 + i / 14) % 1;
          const x = 25 + pseudo(i * 19) * (W - 50) + Math.sin(t * 2 + i) * 6;
          const y = H * 0.88 - p * H * 0.42;
          ctx.fillStyle = `rgba(158, 240, 200, ${Math.sin(p * Math.PI) * 0.85})`;
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    },
    {
      id: 4,
      at: 90,
      tag: "CAP. 5 · 90%+",
      duration: 7.0,
      clips: [
        {
          start: 0.0,
          duration: 3.5,
          eyebrow: "PARAÍSO NATURAL",
          title: "Da ruína industrial à floresta viva",
          text: "Onde havia fumaça e terra seca, hoje corre água limpa entre copas floridas e fauna silvestre.",
        },
        {
          start: 3.5,
          duration: 3.5,
          eyebrow: "SEU LEGADO",
          title: "A regeneração continua no mundo",
          text: "Doe sua floresta recuperada aos 100% para levar sementes ancestrais a novos biomas.",
        },
      ],
      render(t, ctx, W, H) {
        // HyperFrames-style split wipe: Before (industrial) -> After (living paradise)
        const wipeX = W * easeOut(clamp(t / 4.2));

        // Right/Full: Restored Paradise
        const g1 = ctx.createLinearGradient(0, 0, 0, H);
        g1.addColorStop(0, "#2ec4ff");
        g1.addColorStop(0.6, "#72efdd");
        g1.addColorStop(1, "#2d7a4f");
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#2d7a4f";
        ctx.fillRect(0, H * 0.62, W, H * 0.38);
        ctx.fillStyle = "#00bbf9";
        ctx.fillRect(0, H * 0.78, W, H * 0.14);
        // Trees
        [45, 95, 145, 190].forEach((x, i) => {
          ctx.fillStyle = "#5c3d28";
          ctx.fillRect(x - 2, H * 0.48, 4, 18);
          ctx.fillStyle = i === 1 ? "#fbbf24" : i === 2 ? "#c4b5fd" : "#40916c";
          ctx.beginPath();
          ctx.arc(x, H * 0.45, 12, 0, Math.PI * 2);
          ctx.fill();
        });
        // Little pixel capybara
        const cx = 140 + Math.sin(t) * 10;
        ctx.fillStyle = "#8d6e63";
        ctx.fillRect(cx, H * 0.70, 12, 6);
        ctx.fillRect(cx + 10, H * 0.67, 5, 4);

        // Left clipped region (shrinking "Before" wasteland)
        const beforeWidth = Math.max(0, W - wipeX);
        if (beforeWidth > 1) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, beforeWidth, H);
          ctx.clip();
          ctx.fillStyle = "#3b353c";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#3e332b";
          ctx.fillRect(0, H * 0.62, W, H * 0.38);
          ctx.fillStyle = "#48403d";
          ctx.fillRect(50, 34, 14, H * 0.62 - 34);
          ctx.fillRect(92, 42, 12, H * 0.62 - 42);
          ctx.restore();

          // Divider glow line
          ctx.fillStyle = "#c6e593";
          ctx.fillRect(beforeWidth - 1, 0, 2, H);
        }
      },
    },
  ];

  /* ══════════════════════════════════════════════════════════
     CURATED ECO-CALLOUTS DURANTE O JOGO
  ══════════════════════════════════════════════════════════ */
  const SPECIES_INSIGHTS = {
    muda: ["🌱", "Muda pioneira plantada", "Pioneiras protegem o solo exposto do sol e abrem caminho para árvores maiores."],
    ipe: ["🐝", "Ipê-amarelo florescendo", "Atrai abelhas nativas e ajuda a recuperar áreas severamente degradadas."],
    jacaranda: ["🦋", "Jacarandá-da-bahia", "Espécie ameaçada da Mata Atlântica: cultivá-la fortalece a biodiversidade."],
    sequoia: ["🌫️", "Sequoia-costeira", "Captura umidade da neblina nas copas e devolve água diretamente ao solo."],
    aurora: ["✨", "Híbrido Aurora", "Representa a sinergia imaginária entre copas floridas e polinizadores."],
    lumina: ["🌟", "Híbrido Lúmina", "Símbolo da regeneração plena entre pioneiras e gigantes da floresta."],
  };

  /* ══════════════════════════════════════════════════════════
     MONTAR UI NA .habitat + CONTROLADOR DE TIMELINE
  ══════════════════════════════════════════════════════════ */
  const habitat = document.querySelector(".habitat");
  const worldHealth = document.querySelector(".world-health");
  const sceneCard = document.getElementById("scene");
  if (!habitat || !worldHealth || !sceneCard) return;

  // Trigger button inside .world-health
  const triggerBtn = document.createElement("button");
  triggerBtn.type = "button";
  triggerBtn.id = "story-reel-trigger";
  triggerBtn.className = "story-reel-trigger";
  triggerBtn.setAttribute("aria-expanded", "false");
  triggerBtn.innerHTML = `<span class="reel-dot" aria-hidden="true"></span><span>Evolução 1/5</span>`;
  const healthMeter = worldHealth.querySelector(".health-meter");
  worldHealth.insertBefore(triggerBtn, healthMeter);

  // Docked Story Reel Theatre between .scene-card and .world-health
  const dock = document.createElement("section");
  dock.id = "story-reel-dock";
  dock.className = "story-reel-dock";
  dock.hidden = true;
  dock.setAttribute("aria-label", "Animação explicativa da evolução do vale");
  dock.innerHTML = `
    <div class="story-reel-inner">
      <div class="story-reel-stage">
        <canvas id="story-reel-canvas" width="220" height="112" aria-hidden="true"></canvas>
        <span class="story-reel-badge" id="story-reel-badge">CAP. 1 · 0%</span>
      </div>
      <div class="story-reel-copy" id="story-reel-copy" aria-live="polite">
        <span class="story-reel-eyebrow" id="story-reel-eyebrow"></span>
        <h3 class="story-reel-title" id="story-reel-title"></h3>
        <p class="story-reel-text" id="story-reel-text"></p>
      </div>
      <div class="story-reel-controls">
        <div class="story-reel-actions">
          <button type="button" class="story-reel-btn" id="story-reel-play" title="Pausar/Reproduzir" aria-label="Pausar ou reproduzir">❚❚</button>
          <button type="button" class="story-reel-btn" id="story-reel-replay" title="Rever capítulo" aria-label="Rever capítulo">↺</button>
          <button type="button" class="story-reel-btn" id="story-reel-close" title="Fechar história" aria-label="Fechar história">✕</button>
        </div>
        <div class="story-reel-chapters" id="story-reel-chapters" role="tablist" aria-label="Capítulos da evolução"></div>
      </div>
    </div>
    <div class="story-reel-progress"><i id="story-reel-bar"></i></div>
  `;
  habitat.insertBefore(dock, worldHealth);

  const canvas = document.getElementById("story-reel-canvas");
  const ctx = canvas.getContext("2d");
  const copyEl = document.getElementById("story-reel-copy");
  const badgeEl = document.getElementById("story-reel-badge");
  const eyebrowEl = document.getElementById("story-reel-eyebrow");
  const titleEl = document.getElementById("story-reel-title");
  const textEl = document.getElementById("story-reel-text");
  const barEl = document.getElementById("story-reel-bar");
  const playBtn = document.getElementById("story-reel-play");
  const replayBtn = document.getElementById("story-reel-replay");
  const closeBtn = document.getElementById("story-reel-close");
  const chaptersEl = document.getElementById("story-reel-chapters");

  CHAPTERS.forEach((ch, idx) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = String(idx + 1);
    b.title = `Capítulo ${idx + 1} (${ch.at}%+)`;
    b.setAttribute("aria-label", `Capítulo ${idx + 1}: desbloqueado aos ${ch.at}%`);
    b.addEventListener("click", () => openChapter(idx, true));
    chaptersEl.appendChild(b);
  });

  let activeChapter = 0;
  let activeClip = -1;
  let elapsed = 0;
  let playing = false;
  let lastTs = 0;
  let rafId = 0;
  let highestUnlocked = 0;
  let autoShownStages = new Set();

  function parseRecovery() {
    const raw = document.getElementById("recovery-percent")?.textContent || "0";
    return parseFloat(raw.replace(",", ".")) || 0;
  }

  function updateTriggerLabel() {
    const unlockedCount = highestUnlocked + 1;
    triggerBtn.querySelector("span:last-child").textContent = `Evolução ${unlockedCount}/5`;
    Array.from(chaptersEl.children).forEach((b, i) => {
      b.classList.toggle("active", i === activeChapter);
      b.classList.toggle("locked", i > highestUnlocked);
    });
  }

  function syncClipText(ch, t) {
    let idx = 0;
    for (let i = 0; i < ch.clips.length; i++) {
      if (t >= ch.clips[i].start) idx = i;
    }
    if (idx !== activeClip) {
      activeClip = idx;
      const clip = ch.clips[idx];
      eyebrowEl.textContent = clip.eyebrow;
      titleEl.textContent = clip.title;
      textEl.textContent = clip.text;
      if (!reduced) {
        copyEl.classList.remove("beat-swap");
        void copyEl.offsetWidth;
        copyEl.classList.add("beat-swap");
      }
    }
  }

  function drawFrame(t) {
    const ch = CHAPTERS[activeChapter];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 220, H = 112;
    if (canvas.width !== W * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ch.render(t, ctx, W, H);
    syncClipText(ch, t);
    barEl.style.transform = `scaleX(${clamp(t / ch.duration)})`;
  }

  function tick(ts) {
    if (!playing) { rafId = 0; return; }
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.1, (ts - lastTs) / 1000);
    lastTs = ts;
    const ch = CHAPTERS[activeChapter];
    elapsed += dt;
    if (elapsed >= ch.duration) {
      elapsed = 0; // loop smoothly while open so user can watch anytime
    }
    drawFrame(elapsed);
    rafId = requestAnimationFrame(tick);
  }

  function openChapter(idx, forcePlay = true) {
    activeChapter = clamp(idx, 0, CHAPTERS.length - 1);
    activeClip = -1;
    elapsed = reduced ? CHAPTERS[activeChapter].duration * 0.65 : 0;
    badgeEl.textContent = CHAPTERS[activeChapter].tag;
    dock.hidden = false;
    dock.classList.remove("reel-entering");
    void dock.offsetWidth;
    dock.classList.add("reel-entering");
    triggerBtn.setAttribute("aria-expanded", "true");
    updateTriggerLabel();
    drawFrame(elapsed);

    if (!reduced && forcePlay) {
      playing = true;
      lastTs = 0;
      playBtn.textContent = "❚❚";
      if (!rafId) rafId = requestAnimationFrame(tick);
    } else {
      playing = false;
      playBtn.textContent = "▶";
    }
  }

  function closeDock() {
    playing = false;
    cancelAnimationFrame(rafId);
    rafId = 0;
    dock.hidden = true;
    triggerBtn.setAttribute("aria-expanded", "false");
  }

  triggerBtn.addEventListener("click", () => {
    if (dock.hidden) openChapter(highestUnlocked, true);
    else closeDock();
  });
  closeBtn.addEventListener("click", closeDock);
  playBtn.addEventListener("click", () => {
    if (reduced) return;
    playing = !playing;
    playBtn.textContent = playing ? "❚❚" : "▶";
    if (playing) {
      lastTs = 0;
      if (!rafId) rafId = requestAnimationFrame(tick);
    }
  });
  replayBtn.addEventListener("click", () => openChapter(activeChapter, true));

  /* ══════════════════════════════════════════════════════════
     MONITORAR RECUPERAÇÃO PARA DESBLOQUEAR CAPÍTULOS AO VIVO
  ══════════════════════════════════════════════════════════ */
  function checkMilestone() {
    const rec = parseRecovery();
    let stage = 0;
    for (let i = CHAPTERS.length - 1; i >= 0; i--) {
      if (rec >= CHAPTERS[i].at) {
        stage = i;
        break;
      }
    }
    const crossedUp = stage > highestUnlocked;
    highestUnlocked = stage;
    updateTriggerLabel();
    if (crossedUp && !autoShownStages.has(stage)) {
      autoShownStages.add(stage);
      openChapter(stage, true);
    }
  }

  const recEl = document.getElementById("recovery-percent");
  if (recEl) {
    new MutationObserver(checkMilestone).observe(recEl, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  // Start Chapter 1 when intro finishes (or immediately if no intro overlay)
  function startInitialReel() {
    checkMilestone();
    if (!autoShownStages.has(highestUnlocked)) {
      autoShownStages.add(highestUnlocked);
      openChapter(highestUnlocked, true);
    }
  }

  if (document.getElementById("intro-overlay")) {
    window.addEventListener("evertree:intro-done", () => setTimeout(startInitialReel, 450), { once: true });
  } else {
    setTimeout(startInitialReel, 650);
  }

  /* ══════════════════════════════════════════════════════════
     ECO-CALLOUTS CONTEXTUAIS DURANTE O JOGO
  ══════════════════════════════════════════════════════════ */
  let calloutTimer = 0;
  let lastSpeciesCallout = 0;

  function showCallout(icon, title, message) {
    if (reduced) return;
    const prev = sceneCard.querySelector(".eco-callout");
    if (prev) prev.remove();
    clearTimeout(calloutTimer);

    const el = document.createElement("div");
    el.className = "eco-callout";
    el.setAttribute("role", "status");
    el.innerHTML = `
      <span class="eco-callout-icon" aria-hidden="true">${icon}</span>
      <div class="eco-callout-body">
        <strong>${title}</strong>
        <span>${message}</span>
      </div>
    `;
    sceneCard.appendChild(el);
    calloutTimer = setTimeout(() => {
      el.classList.add("leaving");
      el.addEventListener("animationend", () => el.remove(), { once: true });
    }, 4400);
  }

  document.addEventListener("click", (e) => {
    const buyTree = e.target.closest('[data-shop-buy="tree"]:not(:disabled), [data-action="plant"]:not(:disabled)');
    if (buyTree) {
      const now = performance.now();
      if (now - lastSpeciesCallout > 2200) {
        lastSpeciesCallout = now;
        const info = SPECIES_INSIGHTS[buyTree.dataset.id];
        if (info) showCallout(info[0], info[1], info[2]);
      }
      return;
    }
    const waterBtn = e.target.closest("#water-button:not(:disabled)");
    if (waterBtn) {
      showCallout("💧", "Ciclo hídrico protegido", "A rega repõe a umidade das raízes e evita perda de folhas na estiagem.");
      return;
    }
    const rescueBtn = e.target.closest(".rescue-target:not([hidden])");
    if (rescueBtn && rescueBtn.parentElement?.querySelectorAll(".rescue-target:not([hidden])").length === 1) {
      const isFire = rescueBtn.dataset.kind === "fire";
      showCallout(
        isFire ? "🛡️" : "🦜",
        isFire ? "Incêndio controlado!" : "Equilíbrio restaurado!",
        isFire
          ? "Conter focos rapidamente preserva o húmus do solo e evita novas queimadas."
          : "Com árvores diversas, predadores naturais ajudam a controlar pragas."
      );
    }
  });
})();
