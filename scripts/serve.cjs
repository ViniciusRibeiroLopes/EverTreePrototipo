const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "..");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};
const allowed = new Set([
  "index.html",
  "styles.css",
  "game.css",
  "engine.js",
  "app.js",
  "audio.js",
]);
const port = Number(process.env.PORT) || 8765;
http
  .createServer((req, res) => {
    const name =
      new URL(req.url, "http://localhost").pathname.slice(1) || "index.html";
    if (!allowed.has(name)) {
      res.writeHead(404);
      res.end("Arquivo não encontrado");
      return;
    }
    fs.readFile(path.join(root, name), (error, data) => {
      if (error) {
        res.writeHead(500);
        res.end("Erro ao ler arquivo");
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(name)],
        "Cache-Control": "no-cache",
      });
      res.end(data);
    });
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`EverTree em http://127.0.0.1:${port}`),
  );
