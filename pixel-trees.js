/**
 * EverTree — Indie Arcade Pixel-Art Tree Sprites
 * Crisp 32x32 pixel-art sprites with dark cartoon outlines,
 * cel-shaded highlights, and distinct silhouettes per species.
 */
(function (root) {
  "use strict";

  const SIZE = 32;
  const cacheCanvas = new Map();
  const cacheUrl = new Map();

  function makeCanvas() {
    const c = document.createElement("canvas");
    c.width = SIZE;
    c.height = SIZE;
    return c;
  }

  function px(ctx, x, y, color, w = 1, h = 1) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // Draws a filled circle of pixels on the integer grid
  function pDisc(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    const r2 = r * r;
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        if (dx * dx + dy * dy <= r2) {
          ctx.fillRect(Math.round(cx + dx), Math.round(cy + dy), 1, 1);
        }
      }
    }
  }

  // Draws a cluster of cel-shaded pixel blobs with dark cartoon outline
  function drawCanopy(ctx, blobs, palette) {
    const { outline, dark, mid, light, hi } = palette;
    // 1. Dark outline pass
    for (const [x, y, r] of blobs) {
      pDisc(ctx, x, y, r + 1.05, outline);
    }
    // 2. Shadow base pass
    for (const [x, y, r] of blobs) {
      pDisc(ctx, x, y, r, dark);
    }
    // 3. Midtone shifted slightly up-left
    for (const [x, y, r] of blobs) {
      pDisc(ctx, x - 0.5, y - 0.8, Math.max(1, r - 0.8), mid);
    }
    // 4. Light accent on top-left
    for (const [x, y, r] of blobs) {
      if (r >= 3) {
        pDisc(ctx, x - r * 0.25, y - r * 0.32, Math.max(1, r * 0.52), light);
      }
    }
    // 5. Crisp pixel sparkle/highlight
    if (hi) {
      for (const [x, y, r] of blobs) {
        if (r >= 4) {
          px(ctx, x - r * 0.35, y - r * 0.45, hi, 2, 1);
          px(ctx, x - r * 0.45, y - r * 0.3, hi, 1, 1);
        }
      }
    }
  }

  // Draws a chunky pixel trunk with outline and bark highlight
  function drawTrunk(ctx, x, yTop, yBot, wTop, wBot, bark) {
    const { outline, dark, mid, light } = bark;
    for (let y = yTop; y <= yBot; y++) {
      const t = (y - yTop) / Math.max(1, yBot - yTop);
      const w = Math.round(wTop + (wBot - wTop) * t);
      const left = Math.round(x - w / 2);
      px(ctx, left - 1, y, outline, w + 2, 1);
      px(ctx, left, y, dark, w, 1);
      if (w >= 2) px(ctx, left, y, mid, Math.max(1, w - 1), 1);
      if (w >= 3 && y % 3 !== 0) px(ctx, left + 1, y, light, 1, 1);
    }
    // Cute flared pixel roots
    px(ctx, x - Math.ceil(wBot / 2) - 2, yBot, outline, 2, 1);
    px(ctx, x + Math.floor(wBot / 2) + 1, yBot, outline, 2, 1);
    px(ctx, x - Math.ceil(wBot / 2) - 1, yBot - 1, dark, 2, 1);
    px(ctx, x + Math.floor(wBot / 2), yBot - 1, dark, 2, 1);
  }

  // Cute mossy ground mound
  function drawMound(ctx, cx, y, r, grassDark, grassLight) {
    const out = "#1d1829";
    px(ctx, cx - r - 1, y, out, (r + 1) * 2, 1);
    px(ctx, cx - r, y - 1, out, r * 2, 1);
    px(ctx, cx - r, y, grassDark, r * 2, 1);
    px(ctx, cx - r + 1, y - 1, grassLight, (r - 1) * 2, 1);
  }

  const BARK_WARM = { outline: "#1d1829", dark: "#5c3424", mid: "#874f34", light: "#ab6b47" };
  const BARK_RED  = { outline: "#1d1829", dark: "#4f211d", mid: "#7d362b", light: "#a84c3a" };
  const BARK_SILV = { outline: "#1d1829", dark: "#585b70", mid: "#898da6", light: "#bcc0d9" };
  const BARK_GOLD = { outline: "#1d1829", dark: "#7a582b", mid: "#b08443", light: "#dbaf65" };

  const sprites = {
    muda(ctx) {
      drawMound(ctx, 16, 29, 7, "#2d6a4f", "#52b788");
      // Cute thick green stem
      for (let y = 17; y <= 28; y++) {
        const sx = 16 + (y < 22 ? -1 : 0);
        px(ctx, sx - 1, y, "#1d1829", 4, 1);
        px(ctx, sx, y, "#40916c", 2, 1);
        px(ctx, sx, y, "#74c69d", 1, 1);
      }
      // Left big cartoon leaf
      drawCanopy(ctx, [
        [10, 17, 3.2],
        [12, 18, 2.5],
      ], { outline: "#1d1829", dark: "#2d6a4f", mid: "#52b788", light: "#95d5b2", hi: "#d8f3dc" });
      // Right big cartoon leaf
      drawCanopy(ctx, [
        [21, 15, 3.6],
        [19, 17, 2.6],
      ], { outline: "#1d1829", dark: "#2d6a4f", mid: "#52b788", light: "#95d5b2", hi: "#d8f3dc" });
      // Tiny top sprout curl
      px(ctx, 15, 11, "#1d1829", 3, 3);
      px(ctx, 16, 12, "#95d5b2", 1, 2);
      px(ctx, 17, 11, "#d8f3dc", 1, 1);
      // Little flower/dew sparkle
      px(ctx, 22, 12, "#fff3b0", 1, 1);
      px(ctx, 9, 27, "#ffd166", 1, 1);
    },

    ipe(ctx) {
      drawMound(ctx, 16, 30, 8, "#2d6a4f", "#52b788");
      drawTrunk(ctx, 16, 16, 29, 4, 6, BARK_WARM);
      // Branches peeking
      px(ctx, 12, 16, "#1d1829", 3, 2);
      px(ctx, 18, 16, "#1d1829", 3, 2);
      // Golden yellow fluffy blossom canopy
      drawCanopy(ctx, [
        [16, 9, 5.4],
        [10, 12, 4.4],
        [22, 12, 4.4],
        [13, 14, 3.6],
        [19, 14, 3.6],
      ], {
        outline: "#1d1829",
        dark: "#d97706",
        mid: "#fbbf24",
        light: "#fde047",
        hi: "#fef9c3",
      });
      // Cute fallen yellow petals on grass
      px(ctx, 10, 29, "#fde047", 1, 1);
      px(ctx, 21, 28, "#fbbf24", 1, 1);
      px(ctx, 13, 29, "#fef9c3", 1, 1);
    },

    jacaranda(ctx) {
      drawMound(ctx, 16, 30, 8, "#2b5b4c", "#4ea885");
      drawTrunk(ctx, 16, 15, 29, 3, 5, BARK_WARM);
      // Violet-lavender dreamy pixel canopy
      drawCanopy(ctx, [
        [16, 8, 5.2],
        [9, 12, 4.3],
        [23, 11, 4.5],
        [13, 14, 3.8],
        [20, 14, 3.5],
      ], {
        outline: "#1d1829",
        dark: "#5b21b6",
        mid: "#8b5cf6",
        light: "#c4b5fd",
        hi: "#f5d0fe",
      });
      // Falling lavender petals
      px(ctx, 8, 22, "#c4b5fd", 1, 1);
      px(ctx, 24, 24, "#f5d0fe", 1, 1);
      px(ctx, 11, 29, "#c4b5fd", 1, 1);
      px(ctx, 22, 29, "#8b5cf6", 1, 1);
    },

    sequoia(ctx) {
      drawMound(ctx, 16, 30, 8, "#1b4332", "#40916c");
      drawTrunk(ctx, 16, 13, 29, 4, 6, BARK_RED);
      // 3-tier cozy arcade evergreen pine
      const pinePal = {
        outline: "#1d1829",
        dark: "#1b4332",
        mid: "#2d6a4f",
        light: "#52b788",
        hi: "#95d5b2",
      };
      // Bottom tier
      drawCanopy(ctx, [
        [10, 21, 3.2],
        [16, 20, 4.2],
        [22, 21, 3.2],
      ], pinePal);
      // Middle tier
      drawCanopy(ctx, [
        [11, 15, 2.9],
        [16, 14, 3.8],
        [21, 15, 2.9],
      ], pinePal);
      // Top crown
      drawCanopy(ctx, [
        [16, 8, 3.4],
        [16, 5, 2.0],
      ], pinePal);
      // Tiny red berries / pinecones
      px(ctx, 12, 21, "#e76f51", 1, 1);
      px(ctx, 20, 16, "#e76f51", 1, 1);
    },

    aurora(ctx) {
      drawMound(ctx, 16, 30, 8, "#3c2a68", "#7b5eb5");
      drawTrunk(ctx, 16, 15, 29, 3, 5, BARK_SILV);
      // Pastel cosmic aurora canopy
      drawCanopy(ctx, [
        [16, 8, 5.2],
        [10, 12, 4.2],
        [22, 12, 4.2],
        [14, 14, 3.5],
        [18, 14, 3.5],
      ], {
        outline: "#1d1829",
        dark: "#7209b7",
        mid: "#f72585",
        light: "#72efdd",
        hi: "#ffffff",
      });
      // Pixel sparkles around crown
      px(ctx, 5, 8, "#72efdd", 1, 1);
      px(ctx, 26, 7, "#ffafcc", 1, 1);
      px(ctx, 27, 17, "#fff3b0", 1, 1);
      px(ctx, 6, 19, "#ffffff", 1, 1);
    },

    lumina(ctx) {
      drawMound(ctx, 16, 30, 8, "#1b4d49", "#2ec4b6");
      drawTrunk(ctx, 16, 15, 29, 4, 5, BARK_GOLD);
      // Radiant golden-aqua spirit tree
      drawCanopy(ctx, [
        [16, 8, 5.5],
        [9, 12, 4.4],
        [23, 12, 4.4],
        [13, 14, 3.6],
        [19, 14, 3.6],
      ], {
        outline: "#1d1829",
        dark: "#0f766e",
        mid: "#2dd4bf",
        light: "#fde047",
        hi: "#ffffff",
      });
      // Halo star pixels
      px(ctx, 16, 1, "#fef08a", 1, 2);
      px(ctx, 15, 2, "#ffffff", 3, 1);
      px(ctx, 5, 10, "#5eead4", 1, 1);
      px(ctx, 26, 10, "#fde047", 1, 1);
      px(ctx, 11, 28, "#5eead4", 1, 1);
      px(ctx, 21, 28, "#fde047", 1, 1);
    },
  };

  function getCanvas(id) {
    const key = id === "pioneer" ? "muda" : id;
    if (cacheCanvas.has(key)) return cacheCanvas.get(key);
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    (sprites[key] || sprites.muda)(ctx);
    cacheCanvas.set(key, c);
    return c;
  }

  function getDataUrl(id) {
    const key = id === "pioneer" ? "muda" : id;
    if (cacheUrl.has(key)) return cacheUrl.get(key);
    const url = getCanvas(key).toDataURL("image/png");
    cacheUrl.set(key, url);
    return url;
  }

  root.PixelTrees = { getCanvas, getDataUrl, SIZE };
})(window);
