const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, ".."),
  out = path.join(root, "public");
fs.mkdirSync(path.join(out, "images"), { recursive: true });
for (const file of require("./assets.cjs"))
  fs.copyFileSync(path.join(root, file), path.join(out, file));
console.log(
  "Build estático criado em public/. Abra public/index.html ou hospede a pasta.",
);
