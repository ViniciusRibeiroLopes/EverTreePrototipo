/* Layered 2D habitat. All scenery is deterministic and belongs to the current expedition. */
(() => {
  "use strict";
  const stages = [
    [0, "Vale industrial"], [12, "Primeiros brotos"], [35, "Bosque em recuperação"],
    [65, "Ecossistema equilibrado"], [90, "Paraíso natural"],
  ];
  const TAU = Math.PI * 2;
  const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
  function generator(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  function oval(ctx, x, y, rx, ry, fill, angle = 0) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, angle, 0, TAU);
    ctx.fill();
  }
  function stroke(ctx, x, y, cx, cy, ex, ey, color, weight) {
    ctx.strokeStyle = color;
    ctx.lineWidth = weight;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
  }

  const random = generator(80239);
  const fringing = Array.from({ length: 18 }, (_, i) => {
    // Taller trees frame both banks; the centre stays open for the selected specimen.
    const edge = i % 2 ? random() * .41 : .60 + random() * .4;
    const y = .55 + random() * .42;
    return { x: edge, y, size: 20 + (y - .53) * 130 + random() * 22,
      threshold: 15 + random() * 80, phase: random() * TAU, variant: i % 3,
      kind: i % 7 === 0 ? "ipe" : i % 4 === 0 ? "jacaranda" : "muda" };
  }).sort((a, b) => a.y - b.y);
  const meadow = Array.from({ length: 120 }, () => ({
    x: random(), y: .65 + random() * .35, size: 2 + random() * 10,
    phase: random() * TAU, threshold: 7 + random() * 70,
  }));
  const weatherDots = Array.from({ length: 105 }, () => ({
    x: random(), y: random(), speed: .7 + random() * .6, phase: random() * TAU,
  }));
  const wet = (weather) => weather === "chuva" || weather === "tempestade";

  window.ForestScene = class ForestScene {
    constructor(root) {
      this.root = root;
      this.canvas = root.querySelector("canvas");
      this.ctx = this.canvas.getContext("2d");
      this.art = new Map();
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
        if (time - this.lastFrame >= 1000 / 25) {
          this.clock += Math.min(.15, (time - this.lastFrame) / 1000);
          this.lastFrame = time;
          this.draw();
        }
        this.frame = requestAnimationFrame(this.loop);
      };
    }
    resize() {
      const width = this.root.clientWidth, height = this.root.clientHeight;
      if (!width || !height) return;
      const pixelRatio = Math.min(devicePixelRatio || 1, 1.6, 1500 / width);
      this.width = width;
      this.height = height;
      this.canvas.width = Math.round(width * pixelRatio);
      this.canvas.height = Math.round(height * pixelRatio);
      this.ctx.setTransform(this.canvas.width / width, 0, 0, this.canvas.height / height, 0, 0);
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
        this.root.style.setProperty("--restore-start", (life * 1.4 - 35) + "%");
        this.root.style.setProperty("--restore-end", (life * 1.4 - 5) + "%");
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
        // A grove of up to five representatives per species keeps bulk planting legible.
        for (let i = Math.max(last, id === "muda" ? 1 : 0); i < Math.min(count, 5); i++) {
          const rand = generator(5408 + 32771 * (speciesIndex + 1) + i * 7853);
          const x = (i + speciesIndex) % 2 ? .66 + rand() * .25 : .08 + rand() * .25;
          const y = .69 + rand() * .23;
          this.planted.push({ kind: id, x, y, size: 54 + (y - .6) * 176,
            variant: i % 3, phase: rand() * TAU, birth: initial ? -10 : this.clock });
        }
        if (!initial && count > last) {
          const plant = this.planted.filter(p => p.kind === id).at(-1);
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
    tree(tree, growth, species = tree.kind) {
      if (growth <= 0) return;
      if (!this.art.has(species)) {
        const image = new Image();
        this.art.set(species, image);
        image.onload = () => this.draw();
        image.src = "images/" + (species === "muda" ? "pioneer" : species) + ".webp";
      }
      const image = this.art.get(species);
      if (!image.complete || !image.naturalWidth) return;
      const ctx = this.ctx, size = tree.size * this.unit * growth;
      ctx.save();
      ctx.translate(tree.x * this.width, tree.y * this.height);
      ctx.rotate(Math.sin(this.clock * (wet(this.weather) ? 1.5 : .85) + tree.phase) * .012);
      const width = size * image.naturalWidth / image.naturalHeight;
      ctx.drawImage(image, -width * .5, -size, width, size);
      ctx.restore();
    }
    draw() {
      if (!this.state || !this.width) return;
      const ctx = this.ctx, w = this.width, h = this.height;
      this.unit = Math.min(w / 760, h / 380);
      ctx.clearRect(0, 0, w, h);
      this.atmosphere();
      this.vegetation();
      const fade = this.moving ? clamp((this.clock - this.weatherTime) / 1.6) : 1;
      if (fade < 1) this.weatherPass(this.oldWeather, 1 - fade);
      this.weatherPass(this.weather, fade);
      const alert = this.moving ? clamp((this.clock - this.hazardTime) / .8) : 1;
      if (alert < 1 && this.oldHazard) this.hazardPass(this.oldHazard, 1 - alert);
      if (this.hazard) this.hazardPass(this.hazard, alert);
      ctx.globalAlpha = 1;
    }
    atmosphere() {
      const ctx = this.ctx, w = this.width, h = this.height, t = this.clock;
      const air = clamp(1 - this.recovery / 90);
      // Use the same crop as background-size: cover to anchor mills in the painting.
      const scale = Math.max(w / 1536, h / 1024);
      ctx.save();
      ctx.translate((w - 1536 * scale) / 2, (h - 1024 * scale) / 2);
      ctx.scale(scale, scale);
      ctx.globalAlpha = air * .84;
      this.factory(319, 474, .62);
      this.factory(1138, 468, .43);
      for (const [x, y, speed] of [[119, 369, .09], [335, 437, .078], [1149, 442, .103]]) {
        for (let i = 0; i < 14; i++) {
          const a = (i / 14 + t * speed) % 1;
          ctx.globalAlpha = air * (1 - a) * .21;
          oval(ctx, x + a * 106, y - a * 77 - Math.sin(a * 6) * 3,
            3 + 25 * a, 3 + 13 * a, "#5e6461");
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      // Soft cloud shadows travel through the upper atmosphere.
      for (let i = 0; i < 3; i++) {
        const x = (((i * .37 + t * (.003 + .0007 * i)) % 1.4) - .2) * w;
        const y = (.13 + i * .052) * h;
        const radius = Math.max(30, w * .12);
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, .15);
        const mist = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        mist.addColorStop(0, "#e5e4cc29");
        mist.addColorStop(1, "#f8f4d700");
        ctx.fillStyle = mist;
        ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
        ctx.restore();
      }
    }
    factory(x, y, scale) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.fillStyle = "#726d5c";
      ctx.fillRect(-34, -20, 64, 20);
      ctx.fillStyle = "#595e56";
      ctx.beginPath();
      ctx.moveTo(-39, -19); ctx.lineTo(-21, -31); ctx.lineTo(-15, -25);
      ctx.lineTo(-1, -33); ctx.lineTo(6, -26); ctx.lineTo(19, -32);
      ctx.lineTo(33, -21); ctx.fill();
      ctx.fillStyle = "#766755"; ctx.fillRect(22, -60, 6, 41);
      ctx.fillStyle = "#52574d"; ctx.fillRect(21, -61, 8, 3);
      for (let i = 0; i < 7; i++) ctx.fillRect(-28 + i * 8, -14, 3, 7);
      ctx.fillStyle = "#85816d"; ctx.fillRect(-55, -15, 19, 15);
      ctx.fillStyle = "#686c5e"; ctx.fillRect(-57, -16, 22, 3);
      ctx.restore();
    }
    vegetation() {
      const ctx = this.ctx, w = this.width, h = this.height, t = this.clock;
      const life = this.recovery;
      if (life > 8) {
        const green = ctx.createLinearGradient(0, h * .62, 0, h);
        green.addColorStop(0, "#54745000");
        green.addColorStop(1, `rgba(64,101,48,${life * .0007})`);
        ctx.fillStyle = green;
        ctx.fillRect(0, h * .62, w, h * .38);
      }
      for (const tuft of meadow) {
        const amount = clamp((life - tuft.threshold) / 13);
        if (!amount) continue;
        const x = tuft.x * w, y = tuft.y * h, size = tuft.size * this.unit * amount;
        const wind = Math.sin(t * .9 + tuft.phase) * size * .18;
        for (let blade = -1; blade <= 1; blade++) {
          stroke(ctx, x, y, x + blade * size * .2, y - size * .65,
            x + wind + blade * size * .6, y - size * (blade ? .65 : 1),
            blade > 0 ? "#a5aa6c" : "#566c4b", Math.max(.7, size * .12));
        }
        if (tuft.phase < 2.4 && life > 32) {
          oval(ctx, x + wind, y - size, size * .23, size * .15, tuft.phase < 1 ? "#e9b882" : "#dbd8af");
        }
      }
      for (const tree of fringing) {
        let id = tree.kind;
        if (this.state.biome === "temperada" && tree.variant !== 1) id = "sequoia";
        this.tree(tree, clamp((life - tree.threshold) / 16), id);
      }
      for (const plant of this.planted) {
        const age = this.moving ? clamp((t - plant.birth) / 1.8) : 1;
        this.tree(plant, .12 + .88 * (1 - (1 - age) ** 2));
      }
      if (life > 35) {
        this.flock(3, 22, .3);
        for (let i = 0; i < 4; i++) {
          const x = w * (.12 + i * .23 + Math.sin(t * .6 + i) * .04);
          const y = h * (.71 + Math.sin(t * 1.4 + i * 2) * .025);
          const wing = (1.8 + Math.sin(t * 10 + i) * .9) * this.unit;
          oval(ctx, x, y, wing, 2 * this.unit, "#e6bc79", -.6);
          oval(ctx, x + wing, y - 1, wing, 1.6 * this.unit, "#e7d4a7", .6);
        }
        for (let i = 0; i < 7; i++) {
          const p = weatherDots[i];
          const progress = (p.y + t * .038 * p.speed) % 1;
          const x = (p.x + Math.sin(progress * 5 + p.phase) * .018) * w;
          ctx.globalAlpha = Math.sin(progress * Math.PI) * .75;
          oval(ctx, x, (.24 + progress * .65) * h, 2.4 * this.unit, .9 * this.unit, "#b4b86e", progress * 7);
        }
      }
      if (life >= 90 && this.state.biome !== "temperada") {
        // Capybaras forage along the far bank once the wetland is restored.
        const crossing = (Math.sin(t * .063) + 1) / 2;
        for (let i = 0; i < 2; i++) {
          ctx.save();
          ctx.globalAlpha = .9;
          ctx.translate(w * (.61 + crossing * .12 + i * .036), h * (.72 - i * .007));
          const size = (i === 0 ? 1 : .68) * this.unit;
          ctx.scale((Math.cos(t * .063) >= 0 ? 1 : -1) * size, size);
          const stride = Math.sin(t * 3 + i) * 1.6;
          stroke(ctx, -4, -3, -4, 0, -4 + stride, 2, "#77674d", 1.8);
          stroke(ctx, 4, -3, 4, 0, 4 - stride, 2, "#77674d", 1.8);
          oval(ctx, 0, -4, 7.8, 4.3, "#897758", -.05);
          oval(ctx, 6.5, -6.5, 4.3, 3.1, "#988262", -.08);
          oval(ctx, 4.6, -9.5, .95, 1.3, "#77664e");
          oval(ctx, 8, -7.4, .48, .48, "#524d40");
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      if (this.moving) for (const p of this.bursts) {
        const a = clamp((t - p.time) / 1.5);
        if (a === 1) continue;
        ctx.globalAlpha = 1 - a;
        for (let i = 0; i < 12; i++) {
          const angle = -Math.PI * i / 11, size = this.unit * (1 + (i % 3));
          oval(ctx, p.x * w + Math.cos(angle) * a * 39 * this.unit,
            p.y * h + Math.sin(angle) * a * 50 * this.unit - 5 * this.unit,
            size, size * .5, i % 2 ? "#d9dc98" : "#97c080", angle + a);
        }
      }
      ctx.globalAlpha = 1;
    }
    flock(count, period, altitude) {
      const ctx = this.ctx, w = this.width, h = this.height, t = this.clock;
      const flight = (t / period + .43) % 1;
      for (let i = 0; i < count; i++) {
        const x = (flight * 1.55 - .24 - i * .021) * w;
        const y = (altitude + Math.sin(t * .63 + i) * .011 + (i % 2 ? 1 : -1) * i * .008) * h;
        const size = (4.3 + i % 3) * this.unit;
        const tip = (Math.sin(t * 5 + i * .8) * .42 - .18) * size;
        stroke(ctx, x - size, y + tip, x - size * .4, y - size * .48, x, y, "#394e49", Math.max(.9, size * .22));
        stroke(ctx, x, y, x + size * .43, y - size * .45, x + size, y + tip, "#394e49", Math.max(.9, size * .22));
      }
    }
    weatherPass(kind, strength) {
      if (!kind || strength <= 0) return;
      const ctx = this.ctx, w = this.width, h = this.height, t = this.clock;
      ctx.save();
      ctx.globalAlpha = strength;
      if (wet(kind)) {
        const storm = kind === "tempestade";
        ctx.fillStyle = storm ? "#26374742" : "#4255690c";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = storm ? "#d2e7e894" : "#e4eee654";
        ctx.lineWidth = .8 * this.unit;
        ctx.beginPath();
        for (let i = 0; i < (storm ? 100 : 39); i++) {
          const p = weatherDots[i];
          const y = ((p.y + t * (storm ? .95 : .55) * p.speed) % 1) * h;
          const x = ((p.x + 1 - (y / h) * .1) % 1) * w;
          ctx.moveTo(x, y);
          ctx.lineTo(x - 3 * this.unit, y + (storm ? 15 : 9) * this.unit);
        }
        ctx.stroke();
        if (storm && this.moving) {
          // A single distant sheet of lightning every eleven seconds.
          const flash = Math.max(0, 1 - Math.abs(t % 11 - 4.3) / .35);
          if (flash) {
            ctx.fillStyle = `rgba(244,241,214,${flash * .20})`;
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = `rgba(255,249,219,${flash * .75})`;
            ctx.beginPath();
            ctx.moveTo(w * .74, h * .06);
            ctx.lineTo(w * .72, h * .16);
            ctx.lineTo(w * .728, h * .15);
            ctx.lineTo(w * .705, h * .27);
            ctx.stroke();
          }
        }
      } else if (kind === "migracao") {
        this.flock(11, 8.5, .33);
      } else {
        const sunlight = kind === "sol" || this.recovery >= 90;
        if (sunlight) {
          ctx.fillStyle = "#fff2bb10";
          for (let i = 0; i < 3; i++) {
            const x = w * (.66 + i * .065 + Math.sin(t * .17) * .012);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + w * .02, 0);
            ctx.lineTo(x - w * .19, h * .87);
            ctx.lineTo(x - w * .25, h * .85);
            ctx.fill();
          }
        }
        if (kind === "mutirao") {
          for (let i = 0; i < 9; i++) {
            const p = meadow[i];
            const growth = (t * .13 + i / 9) % 1;
            ctx.globalAlpha = strength * Math.sin(growth * Math.PI);
            this.tree({ ...p, kind: "muda", size: 52, variant: i % 3 }, growth);
          }
        }
        for (let i = 0; i < (kind === "mutirao" ? 28 : 10); i++) {
          const dot = weatherDots[i];
          const a = (t * .07 * dot.speed + dot.y) % 1;
          ctx.globalAlpha = Math.sin(a * Math.PI) * strength * .8;
          oval(ctx, w * (dot.x + Math.sin(a * 4 + dot.phase) * .025), h * (.92 - a * .5),
            1.5 * this.unit, this.unit, kind === "mutirao" ? "#c4f09a" : "#e8d8ae");
        }
      }
      ctx.restore();
    }
    hazardPass(kind, alpha) {
      const ctx = this.ctx, w = this.width, h = this.height, t = this.clock;
      const remaining = this.state.event ? 1 - this.state.event.hits / this.state.event.target : 1;
      const count = Math.ceil(17 * remaining);
      ctx.save();
      ctx.globalAlpha = alpha;
      for (let i = 0; i < count; i++) {
        const p = weatherDots[i];
        const x = w * (.12 + p.x * .19), y = h * (.69 + p.y * .15), scale = this.unit;
        if (kind === "fire") {
          const flame = scale * (9 + 9 * Math.sin(t * 2.4 + p.phase) ** 2);
          oval(ctx, x, y, flame * .39, flame, "#e76e3a");
          oval(ctx, x - scale, y + flame * .36, flame * .24, flame * .64, "#ecc275");
          const ember = (t * .4 + p.y) % 1;
          oval(ctx, x + ember * 13, y - ember * 45, scale, scale * 1.3, "#f7cd8a");
        } else {
          const dx = Math.sin(t * 1.9 + p.phase) * 14 * scale;
          const dy = Math.cos(t * 2.6 + p.phase) * 6 * scale;
          oval(ctx, x + dx, y + dy, 2.9 * scale, 1.4 * scale, "#424d33", p.phase);
          oval(ctx, x + dx - scale, y + dy - 1.8 * scale, 2 * scale, scale, "#d0cb87");
        }
      }
      ctx.restore();
    }
  };
})();
