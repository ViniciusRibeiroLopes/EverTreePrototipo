/* Layered 2D indie arcade pixel-art habitat. Deterministic and belongs to the current expedition. */
(() => {
  "use strict";
  const stages = [
    [0, "Vale industrial"], [12, "Primeiros brotos"], [35, "Bosque em recuperação"],
    [65, "Ecossistema equilibrado"], [90, "Paraíso natural"],
  ];
  const TAU = Math.PI * 2;
  const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
  const ri = Math.round;

  function generator(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function lerpHex(a, b, t) {
    const ah = parseInt(a.slice(1), 16), bh = parseInt(b.slice(1), 16);
    const ar = (ah >> 16) & 255, ag = (ah >> 8) & 255, ab = ah & 255;
    const br = (bh >> 16) & 255, bg = (bh >> 8) & 255, bb = bh & 255;
    const r = ri(ar + (br - ar) * t), g = ri(ag + (bg - ag) * t), bl = ri(ab + (bb - ab) * t);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }

  function px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(ri(x), ri(y), ri(w), ri(h));
  }

  const BIOME_PALETTES = {
    atlantica: {
      skyTop: "#2ec4ff", skyMid: "#6fffe9", skyBot: "#d9ffdb",
      far: "#2d6a6b", mid: "#246a47", near: "#2d7a4f", grass: "#439962",
      river: "#00bbf9", riverHi: "#e0fbfc",
    },
    cerrado: {
      skyTop: "#3a86ff", skyMid: "#72efdd", skyBot: "#ffea9f",
      far: "#9c6644", mid: "#5c8024", near: "#4a6b28", grass: "#769c39",
      river: "#00bbf9", riverHi: "#ffffff",
    },
    temperada: {
      skyTop: "#0096c7", skyMid: "#90e0ef", skyBot: "#e0fbfc",
      far: "#235370", mid: "#1b5e43", near: "#236b54", grass: "#3d8f6b",
      river: "#00b4d8", riverHi: "#ffffff",
    },
  };

  const INDUSTRIAL = {
    skyTop: "#577590", skyMid: "#7895b2", skyBot: "#cbd5c0",
    far: "#5c6d7a", mid: "#5c6f5b", near: "#586b4d", grass: "#6d825c",
    river: "#5e8b9e", riverHi: "#a9d6e5",
  };

  const random = generator(80239);
  const fringing = Array.from({ length: 18 }, (_, i) => {
    const edge = i % 2 ? random() * 0.37 : 0.63 + random() * 0.37;
    const y = 0.56 + random() * 0.40;
    return {
      x: edge, y, size: 18 + (y - 0.54) * 26 + random() * 6,
      threshold: 12 + random() * 78, phase: random() * TAU, variant: i % 3,
      kind: i % 7 === 0 ? "ipe" : i % 4 === 0 ? "jacaranda" : "muda",
    };
  }).sort((a, b) => a.y - b.y);

  const meadow = Array.from({ length: 95 }, (_, i) => ({
    x: random(), y: 0.64 + random() * 0.34,
    phase: random() * TAU, threshold: 6 + random() * 68,
    flowerColor: ["#ff70a6", "#ffd166", "#ffffff", "#a0c4ff"][i % 4],
  }));

  const weatherDots = Array.from({ length: 90 }, () => ({
    x: random(), y: random(), speed: 0.7 + random() * 0.6, phase: random() * TAU,
  }));

  const wet = (weather) => weather === "chuva" || weather === "tempestade";

  window.ForestScene = class ForestScene {
    constructor(root) {
      this.root = root;
      this.canvas = root.querySelector("canvas");
      this.ctx = this.canvas.getContext("2d");
      this.planted = [];
      this.frame = 0;
      this.lastFrame = 0;
      this.clock = 0;
      this.visible = true;
      this.motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
      this.motionQuery.addEventListener("change", () => this.play());
      document.addEventListener("visibilitychange", () => this.play());
      this.sizeObserver = new ResizeObserver(() => this.resize());
      this.sizeObserver.observe(root);
      this.intersection = new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        this.play();
      });
      this.intersection.observe(root);
      this.loop = (time) => {
        this.frame = 0;
        if (time - this.lastFrame >= 1000 / 24) {
          this.clock += Math.min(0.15, (time - this.lastFrame) / 1000);
          this.lastFrame = time;
          this.draw();
        }
        this.frame = requestAnimationFrame(this.loop);
      };
    }

    resize() {
      const width = this.root.clientWidth, height = this.root.clientHeight;
      if (!width || !height) return;
      const ph = 144;
      const pw = Math.max(200, Math.round(ph * (width / height)));
      this.width = pw;
      this.height = ph;
      this.canvas.width = pw;
      this.canvas.height = ph;
      this.ctx.imageSmoothingEnabled = false;
      this.draw();
    }

    play() {
      this.moving = this.motion && !this.motionQuery.matches;
      if (!this.frame && this.state && this.visible && !document.hidden && this.moving) {
        this.lastFrame = performance.now();
        this.frame = requestAnimationFrame(this.loop);
      } else if ((!this.visible || document.hidden || !this.moving) && this.frame) {
        cancelAnimationFrame(this.frame);
        this.frame = 0;
      }
    }

    update(state, recovery, climate) {
      const newState = this.state !== state;
      const previousHazard = this.hazard;
      if (newState) {
        this.planted = [];
        this.treeCounts = {};
        this.bursts = [];
      }
      this.state = state;
      this.recovery = recovery;
      this.hazard = state.event?.type || "";
      this.motion = state.settings.motion;
      if (previousHazard !== this.hazard || newState) {
        this.oldHazard = newState ? "" : previousHazard;
        this.hazardTime = this.clock;
      }
      if (climate.weather !== this.weather || newState) {
        this.oldWeather = newState ? climate.weather : this.weather;
        this.weather = climate.weather;
        this.weatherTime = this.clock;
        this.root.dataset.weather = this.weather;
      }
      const life = Math.round(recovery);
      if (life !== this.life) {
        this.life = life;
      }
      this.updatePlants(state.trees, newState);
      this.play();
      if (!this.moving || newState) this.draw();
      const index = stages.findLastIndex(([at]) => recovery >= at);
      return `Estágio ${index + 1} de 5 · ${stages[index][1]}`;
    }

    updatePlants(trees, initial) {
      Object.entries(trees).forEach(([id, count], speciesIndex) => {
        const last = this.treeCounts[id] || 0;
        if (last === count) return;
        for (let i = Math.max(last, id === "muda" ? 1 : 0); i < Math.min(count, 5); i++) {
          const rand = generator(5408 + 32771 * (speciesIndex + 1) + i * 7853);
          const x = (i + speciesIndex) % 2 ? 0.65 + rand() * 0.27 : 0.08 + rand() * 0.27;
          const y = 0.68 + rand() * 0.24;
          this.planted.push({
            kind: id, x, y, size: 22 + (y - 0.6) * 28,
            variant: i % 3, phase: rand() * TAU, birth: initial ? -10 : this.clock,
          });
        }
        if (!initial && count > last) {
          const plant = this.planted.filter((p) => p.kind === id).at(-1);
          if (plant) {
            plant.birth = this.clock;
            this.bursts.push({ x: plant.x, y: plant.y, time: this.clock });
            this.bursts = this.bursts.slice(-6);
          }
        }
        this.treeCounts[id] = count;
        this.planted.sort((a, b) => a.y - b.y);
      });
    }

    palette() {
      const target = BIOME_PALETTES[this.state?.biome] || BIOME_PALETTES.atlantica;
      const t = clamp(this.recovery / 100);
      return {
        skyTop: lerpHex(INDUSTRIAL.skyTop, target.skyTop, t),
        skyMid: lerpHex(INDUSTRIAL.skyMid, target.skyMid, t),
        skyBot: lerpHex(INDUSTRIAL.skyBot, target.skyBot, t),
        far: lerpHex(INDUSTRIAL.far, target.far, t),
        mid: lerpHex(INDUSTRIAL.mid, target.mid, t),
        near: lerpHex(INDUSTRIAL.near, target.near, t),
        grass: lerpHex(INDUSTRIAL.grass, target.grass, t),
        river: lerpHex(INDUSTRIAL.river, target.river, t),
        riverHi: lerpHex(INDUSTRIAL.riverHi, target.riverHi, t),
      };
    }

    draw() {
      if (!this.state || !this.width) return;
      const ctx = this.ctx, w = this.width, h = this.height;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);

      const pal = this.palette();
      this.drawSky(pal, w, h);
      this.drawTerrain(pal, w, h);
      this.drawVegetation(pal, w, h);

      const fade = this.moving ? clamp((this.clock - this.weatherTime) / 1.4) : 1;
      if (fade < 1) this.weatherPass(this.oldWeather, 1 - fade);
      this.weatherPass(this.weather, fade);

      const alert = this.moving ? clamp((this.clock - this.hazardTime) / 0.7) : 1;
      if (alert < 1 && this.oldHazard) this.hazardPass(this.oldHazard, 1 - alert);
      if (this.hazard) this.hazardPass(this.hazard, alert);
      ctx.globalAlpha = 1;
    }

    drawSky(pal, w, h) {
      const ctx = this.ctx, t = this.clock;
      const bands = [
        [0, 0.25, pal.skyTop],
        [0.25, 0.50, pal.skyMid],
        [0.50, 0.75, pal.skyBot],
      ];
      for (const [y0, y1, col] of bands) {
        px(ctx, 0, y0 * h, w, (y1 - y0) * h + 1, col);
      }
      ctx.fillStyle = pal.skyMid;
      for (let x = 0; x < w; x += 2) ctx.fillRect(x, ri(h * 0.24), 1, 1);

      const sunX = ri(w * 0.80), sunY = ri(h * 0.16);
      const sunVis = this.weather === "tempestade" ? 0.25 : 1;
      if (sunVis > 0.2) {
        ctx.save();
        ctx.globalAlpha = sunVis;
        px(ctx, sunX - 6, sunY - 6, 12, 12, "#ffd166");
        px(ctx, sunX - 5, sunY - 7, 10, 14, "#ffd166");
        px(ctx, sunX - 7, sunY - 5, 14, 10, "#ffd166");
        px(ctx, sunX - 4, sunY - 4, 8, 8, "#fff3b0");
        const rOff = Math.floor(t * 2) % 2;
        px(ctx, sunX - 10 - rOff, sunY - 1, 2, 2, "#fff3b0");
        px(ctx, sunX + 8 + rOff, sunY - 1, 2, 2, "#fff3b0");
        px(ctx, sunX - 1, sunY - 10 - rOff, 2, 2, "#fff3b0");
        px(ctx, sunX - 1, sunY + 8 + rOff, 2, 2, "#fff3b0");
        ctx.restore();
      }

      const cloudTone = this.weather === "tempestade" ? "#6c757d" : "#ffffff";
      const cloudShade = this.weather === "tempestade" ? "#495057" : "#dbe7f0";
      const clouds = [
        [0.18, 0.14, 1.0, 0.012],
        [0.52, 0.10, 0.85, 0.008],
        [0.85, 0.22, 0.75, 0.010],
      ];
      for (const [cx0, cy0, sc, spd] of clouds) {
        const cx = ri((((cx0 + t * spd) % 1.25) - 0.12) * w);
        const cy = ri(cy0 * h);
        const cw = ri(26 * sc), ch = ri(7 * sc);
        px(ctx, cx, cy, cw, ch, cloudShade);
        px(ctx, cx + 2, cy - 3, cw - 4, ch, cloudTone);
        px(ctx, cx + 6, cy - 6, cw - 12, 4, cloudTone);
      }
    }

    drawTerrain(pal, w, h) {
      const ctx = this.ctx, t = this.clock;
      ctx.fillStyle = pal.far;
      for (let x = 0; x < w; x += 2) {
        const mh = Math.sin(x * 0.035) * 10 + Math.cos(x * 0.08) * 5 + 16;
        const yTop = ri(h * 0.48 - mh);
        ctx.fillRect(x, yTop, 2, h - yTop);
      }

      ctx.fillStyle = pal.mid;
      for (let x = 0; x < w; x += 2) {
        const mh = Math.sin(x * 0.025 + 1.4) * 7 + 8;
        const yTop = ri(h * 0.56 - mh);
        ctx.fillRect(x, yTop, 2, h - yTop);
        px(ctx, x, yTop, 2, 1, pal.grass);
      }

      const air = clamp(1 - this.recovery / 88);
      if (air > 0.05) {
        ctx.save();
        ctx.globalAlpha = air;
        this.drawPixelFactory(ri(w * 0.18), ri(h * 0.53), t);
        this.drawPixelFactory(ri(w * 0.76), ri(h * 0.52), t + 1.7);
        ctx.restore();
      }

      px(ctx, 0, h * 0.60, w, h * 0.40, pal.near);
      px(ctx, 0, h * 0.60, w, 2, pal.grass);

      const riverAlpha = clamp(this.recovery / 35);
      if (riverAlpha > 0.05) {
        ctx.save();
        ctx.globalAlpha = riverAlpha;
        for (let y = ri(h * 0.61); y < h; y++) {
          const prog = (y - h * 0.61) / (h * 0.39);
          const rx = ri(w * 0.50 + Math.sin(prog * 3.1) * 14);
          const rw = ri(6 + prog * 28);
          px(ctx, rx - rw / 2, y, rw, 1, pal.river);
          px(ctx, rx - rw / 2 - 1, y, 1, 1, "#2d6a4f");
          px(ctx, rx + rw / 2, y, 1, 1, "#2d6a4f");
          if ((y + Math.floor(t * 6)) % 5 === 0) {
            const sx = rx - rw / 4 + ((y * 7 + Math.floor(t * 4)) % Math.max(2, ri(rw / 2)));
            px(ctx, sx, y, 3, 1, pal.riverHi);
          }
        }
        ctx.restore();
      }
    }

    drawPixelFactory(x, y, t) {
      const ctx = this.ctx;
      px(ctx, x - 10, y - 10, 20, 10, "#5c5346");
      px(ctx, x - 11, y - 12, 7, 3, "#463f3a");
      px(ctx, x - 3, y - 12, 7, 3, "#463f3a");
      px(ctx, x + 5, y - 12, 6, 3, "#463f3a");
      px(ctx, x + 5, y - 20, 4, 10, "#463f3a");
      px(ctx, x + 4, y - 21, 6, 2, "#2b2d42");
      px(ctx, x - 7, y - 7, 3, 3, "#f4a261");
      px(ctx, x - 1, y - 7, 3, 3, "#f4a261");
      for (let i = 0; i < 4; i++) {
        const a = (i / 4 + t * 0.28) % 1;
        const sx = ri(x + 6 + a * 12);
        const sy = ri(y - 23 - a * 14);
        const sz = ri(2 + a * 4);
        ctx.fillStyle = `rgba(180, 185, 190, ${(1 - a) * 0.65})`;
        ctx.fillRect(sx, sy, sz, sz);
      }
    }

    tree(tree, growth, species = tree.kind) {
      if (growth <= 0 || !window.PixelTrees) return;
      const sprite = window.PixelTrees.getCanvas(species);
      if (!sprite) return;
      const ctx = this.ctx;
      const size = Math.max(4, ri(tree.size * growth));
      const tx = ri(tree.x * this.width);
      const ty = ri(tree.y * this.height);

      px(ctx, tx - size * 0.28, ty - 1, size * 0.56, 2, "rgba(20, 45, 30, 0.28)");

      const sway = this.moving
        ? Math.round(Math.sin(this.clock * (wet(this.weather) ? 2.4 : 1.4) + tree.phase) * 0.6)
        : 0;

      ctx.drawImage(sprite, ri(tx - size / 2) + sway, ri(ty - size), size, size);
    }

    drawVegetation(pal, w, h) {
      const ctx = this.ctx, t = this.clock, life = this.recovery;

      for (const tuft of meadow) {
        const amount = clamp((life - tuft.threshold) / 14);
        if (!amount) continue;
        const x = ri(tuft.x * w), y = ri(tuft.y * h);
        const sway = this.moving ? Math.round(Math.sin(t * 1.6 + tuft.phase) * 0.6) : 0;
        px(ctx, x, y - 2, 1, 2, "#2d6a4f");
        px(ctx, x + 2 + sway, y - 3, 1, 3, "#40916c");
        if (tuft.phase < 2.6 && life > 28) {
          px(ctx, x + 1 + sway, y - 4, 2, 2, tuft.flowerColor);
        }
      }

      for (const tObj of fringing) {
        let id = tObj.kind;
        if (this.state.biome === "temperada" && tObj.variant !== 1) id = "sequoia";
        this.tree(tObj, clamp((life - tObj.threshold) / 16), id);
      }

      for (const plant of this.planted) {
        const age = this.moving ? clamp((t - plant.birth) / 1.1) : 1;
        const bounce = age < 1 ? Math.sin(age * Math.PI) * 0.15 : 0;
        this.tree(plant, clamp(0.15 + 0.85 * age + bounce, 0, 1.2));
      }

      if (life > 32) {
        this.drawPixelFlock(3, 16, 0.26);
        for (let i = 0; i < 4; i++) {
          const bx = ri(w * (0.14 + i * 0.22 + Math.sin(t * 0.8 + i) * 0.04));
          const by = ri(h * (0.70 + Math.sin(t * 1.8 + i * 2) * 0.03));
          const flap = Math.floor(t * 8 + i) % 2;
          px(ctx, bx, by, 2, 1, "#ffd166");
          px(ctx, bx - 1, by - flap, 1, 1, "#ff70a6");
          px(ctx, bx + 2, by - flap, 1, 1, "#ff70a6");
        }
      }

      if (life >= 90 && this.state.biome !== "temperada") {
        const walk = (Math.sin(t * 0.18) + 1) / 2;
        for (let i = 0; i < 2; i++) {
          const cx = ri(w * (0.58 + walk * 0.14 + i * 0.05));
          const cy = ri(h * (0.75 - i * 0.02));
          const dir = Math.cos(t * 0.18) >= 0 ? 1 : -1;
          const step = Math.floor(t * 4 + i) % 2;
          px(ctx, cx - 4, cy - 4, 8, 4, "#8d6e63");
          px(ctx, cx - 3, cy - 5, 6, 1, "#a1887f");
          px(ctx, cx + (dir > 0 ? 3 : -6), cy - 6, 4, 3, "#a1887f");
          px(ctx, cx + (dir > 0 ? 5 : -5), cy - 5, 1, 1, "#1d1829");
          px(ctx, cx + (dir > 0 ? 3 : -4), cy - 7, 1, 1, "#6d4c41");
          px(ctx, cx - 3 + step, cy, 1, 2, "#5d4037");
          px(ctx, cx + 2 - step, cy, 1, 2, "#5d4037");
        }
      }

      if (this.moving) {
        for (const p of this.bursts) {
          const a = clamp((t - p.time) / 1.1);
          if (a >= 1) continue;
          ctx.save();
          ctx.globalAlpha = 1 - a;
          for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * TAU;
            const pxX = ri(p.x * w + Math.cos(ang) * a * 18);
            const pxY = ri(p.y * h + Math.sin(ang) * a * 18 - 4);
            px(ctx, pxX, pxY, 2, 2, i % 2 ? "#c6e593" : "#ffd166");
          }
          ctx.restore();
        }
      }
    }

    drawPixelFlock(count, period, altitude) {
      const ctx = this.ctx, w = this.width, h = this.height, t = this.clock;
      const flight = (t / period + 0.43) % 1;
      for (let i = 0; i < count; i++) {
        const bx = ri((flight * 1.4 - 0.2 - i * 0.04) * w);
        const by = ri((altitude + Math.sin(t * 1.2 + i) * 0.02 + (i % 2 ? 1 : -1) * 0.015) * h);
        const wingUp = Math.floor(t * 6 + i) % 2 === 0;
        px(ctx, bx, by, 2, 1, "#1d1829");
        px(ctx, bx - 2, by + (wingUp ? -1 : 1), 2, 1, "#1d1829");
        px(ctx, bx + 2, by + (wingUp ? -1 : 1), 2, 1, "#1d1829");
      }
    }

    weatherPass(kind, strength) {
      if (!kind || strength <= 0) return;
      const ctx = this.ctx, w = this.width, h = this.height, t = this.clock;
      ctx.save();
      ctx.globalAlpha = strength;
      if (wet(kind)) {
        const storm = kind === "tempestade";
        ctx.fillStyle = storm ? "rgba(25, 35, 55, 0.28)" : "rgba(60, 90, 120, 0.10)";
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < (storm ? 75 : 36); i++) {
          const p = weatherDots[i];
          const y = ri(((p.y + t * (storm ? 1.1 : 0.65) * p.speed) % 1) * h);
          const x = ri(((p.x + 1 - (y / h) * 0.12) % 1) * w);
          px(ctx, x, y, 1, storm ? 4 : 2, storm ? "#bde0fe" : "#e0fbfc");
        }
        if (storm && this.moving) {
          const flash = Math.max(0, 1 - Math.abs((t % 11) - 4.3) / 0.28);
          if (flash > 0) {
            ctx.fillStyle = `rgba(255, 250, 210, ${flash * 0.22})`;
            ctx.fillRect(0, 0, w, h);
            const lx = ri(w * 0.72);
            px(ctx, lx, 6, 2, 10, "#fff3b0");
            px(ctx, lx - 3, 15, 4, 2, "#fff3b0");
            px(ctx, lx - 3, 17, 2, 12, "#fff3b0");
          }
        }
      } else if (kind === "migracao") {
        this.drawPixelFlock(8, 8.5, 0.30);
      } else {
        for (let i = 0; i < (kind === "mutirao" ? 22 : 8); i++) {
          const dot = weatherDots[i];
          const a = (t * 0.08 * dot.speed + dot.y) % 1;
          ctx.globalAlpha = Math.sin(a * Math.PI) * strength * 0.85;
          const dx = ri(w * (dot.x + Math.sin(a * 4 + dot.phase) * 0.02));
          const dy = ri(h * (0.90 - a * 0.55));
          px(ctx, dx, dy, 2, 2, kind === "mutirao" ? "#c6e593" : "#fff3b0");
        }
      }
      ctx.restore();
    }

    hazardPass(kind, alpha) {
      const ctx = this.ctx, w = this.width, h = this.height, t = this.clock;
      const remaining = this.state.event ? 1 - this.state.event.hits / this.state.event.target : 1;
      const count = Math.ceil(15 * remaining);
      ctx.save();
      ctx.globalAlpha = alpha;
      for (let i = 0; i < count; i++) {
        const p = weatherDots[i];
        const x = ri(w * (0.10 + p.x * 0.25));
        const y = ri(h * (0.68 + p.y * 0.17));
        if (kind === "fire") {
          const flick = Math.floor(t * 9 + i) % 3;
          const fh = ri(5 + flick * 2 + 3 * Math.sin(t * 6 + p.phase) ** 2);
          // Warm pixel ground glow
          px(ctx, x - 4, y - 1, 9, 2, "rgba(247, 127, 0, 0.45)");
          // 3-tone flickering pixel flame
          px(ctx, x - 2, y - fh, 5, fh, "#d62828");
          px(ctx, x - 1, y - fh - 1, 3, 2, "#e63946");
          px(ctx, x - 1, y - fh + 2, 3, Math.max(1, fh - 2), "#f77f00");
          px(ctx, x, y - Math.max(1, fh - 3), 1, 2, "#fcbf49");
          // Rising pixel ember & smoke
          const ember = (t * 0.65 + p.y) % 1;
          px(ctx, x + Math.round(Math.sin(ember * 6 + i) * 2), y - fh - ember * 12, 1, 1, "#fff3b0");
          if (i % 2 === 0) {
            px(ctx, x - 1, y - fh - 4 - ember * 10, 2, 2, "rgba(70, 75, 80, 0.55)");
          }
        } else {
          // Animated 2-frame pixel beetle swarming
          const dx = ri(Math.sin(t * 3.0 + p.phase) * 7);
          const dy = ri(Math.cos(t * 4.2 + p.phase) * 4);
          const wing = Math.floor(t * 12 + i) % 2;
          const bx = x + dx, by = y + dy;
          px(ctx, bx - 1, by - 1 - wing, 2, 1, "#e9ecef");
          px(ctx, bx + 2, by - 1 - wing, 2, 1, "#e9ecef");
          px(ctx, bx, by, 3, 2, "#2b2d42");
          px(ctx, bx + 1, by, 1, 1, "#ffbe0b");
          px(ctx, bx + 2, by + 1, 1, 1, "#ff595e");
        }
      }
      ctx.restore();
    }
  };
})();
