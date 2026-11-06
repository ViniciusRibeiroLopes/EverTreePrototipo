const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, ".."),
  out = path.join(root, "dist");
fs.mkdirSync(out, { recursive: true });
for (const file of [
  "index.html",
  "styles.css",
  "engine.js",
  "app.js",
  "audio.js",
])
  fs.copyFileSync(path.join(root, file), path.join(out, file));
console.log(
  "Build estático criado em dist/. Abra dist/index.html ou hospede a pasta.",
);
