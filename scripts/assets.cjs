// Shared allowlist for the preview server and distributable game.
module.exports = [
  "index.html",
  "styles.css",
  "game.css",
  "scene.css",
  "legacy.css",
  "upgrades.css",
  "engine.js",
  "audio.js",
  "pixel-trees.js",
  "scene.js",
  "app.js",
  "intro.js",
  "motion.css",
  "motion-observer.js",
  "game-fx.js",
  "story-reel.css",
  "story-reel.js",
  "images/valley.jpg",
  "images/valley-restored.jpg",
  ...["pioneer", "ipe", "jacaranda", "sequoia", "aurora", "lumina"].map(
    (name) => `images/${name}.png`
  ),
];
