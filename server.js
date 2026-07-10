const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const ROOT = __dirname;
const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".webp": "image/webp", ".avif": "image/avif", ".json": "application/json",
};
const IMAGE_RE = /\.(jpe?g|png|gif|webp|avif)$/i;

// resized variants (sips is built into macOS), cached in photos/.cache
function sendResized(res, name, size, prefix) {
  if (name.includes("/") || name.includes("..")) { res.writeHead(400); return res.end(); }
  const src = path.join(ROOT, "photos", name);
  if (!fs.existsSync(src)) { res.writeHead(404); return res.end("404"); }
  const cacheDir = path.join(ROOT, "photos", ".cache");
  fs.mkdirSync(cacheDir, { recursive: true });
  const out = path.join(cacheDir, `${prefix}-${name}.jpg`);
  const serve = (file, type) => fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("404"); }
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "max-age=3600" });
    res.end(data);
  });
  if (fs.existsSync(out)) return serve(out, "image/jpeg");
  execFile(
    "sips",
    ["-s", "format", "jpeg", "-s", "formatOptions", "82", "-Z", String(size), src, "--out", out],
    (err) => {
      if (err || !fs.existsSync(out)) {
        // fallback: serve the original untouched
        return serve(src, MIME[path.extname(src).toLowerCase()] || "application/octet-stream");
      }
      serve(out, "image/jpeg");
    }
  );
}

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);

  if (p.startsWith("/thumb/")) return sendResized(res, p.slice(7), 480, "t480");
  if (p.startsWith("/web/")) return sendResized(res, p.slice(5), 1800, "w1800");

  // live listing of the photos/ folder for the sphere
  if (p === "/photos.json") {
    fs.readdir(path.join(ROOT, "photos"), (err, files) => {
      const list = err ? [] : files.filter((f) => IMAGE_RE.test(f)).sort();
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(list));
    });
    return;
  }

  if (p === "/") p = "/index.html";
  const file = path.join(ROOT, path.normalize(p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("404"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
}).listen(4600, () => console.log("6ot on http://localhost:4600"));
