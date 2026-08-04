/*
 * Static export for GitHub Pages.
 * Usage: node build.js  ->  everything goes into docs/ (what Pages serves)
 *
 * Generates the same URLs the dev server serves live:
 *   photos.json          list of photos
 *   thumb/<name>         480px  (sphere cards)
 *   web/<name>           1800px (lightbox)
 *   photos/<name>        2600px (OPEN ORIGINAL — full originals are too big for the web)
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = __dirname;
const DIST = path.join(ROOT, "docs");
const DOMAIN = "dxwe.online";
const IMAGE_RE = /\.(jpe?g|png|gif|webp|avif)$/i;

fs.rmSync(DIST, { recursive: true, force: true });
for (const d of ["", "thumb", "web", "photos"]) fs.mkdirSync(path.join(DIST, d), { recursive: true });

for (const f of ["index.html", "style.css", "main.js"]) {
  fs.copyFileSync(path.join(ROOT, f), path.join(DIST, f));
}

const photos = fs.readdirSync(path.join(ROOT, "photos")).filter((f) => IMAGE_RE.test(f)).sort();
fs.writeFileSync(path.join(DIST, "photos.json"), JSON.stringify(photos));
fs.writeFileSync(path.join(DIST, "CNAME"), DOMAIN + "\n"); // GitHub Pages custom domain
fs.writeFileSync(path.join(DIST, ".nojekyll"), ""); // serve files as-is

function resize(src, out, size, quality) {
  execFileSync("sips", [
    "-s", "format", "jpeg", "-s", "formatOptions", String(quality),
    "-Z", String(size), src, "--out", out,
  ], { stdio: "pipe" });
}

for (const f of photos) {
  const src = path.join(ROOT, "photos", f);
  process.stdout.write(`  ${f} ...`);
  resize(src, path.join(DIST, "thumb", f), 480, 82);
  resize(src, path.join(DIST, "web", f), 1800, 85);
  resize(src, path.join(DIST, "photos", f), 2600, 88);
  console.log(" ok");
}

const mb = (p) => {
  let total = 0;
  for (const dirent of fs.readdirSync(p, { recursive: true, withFileTypes: true })) {
    if (dirent.isFile()) total += fs.statSync(path.join(dirent.parentPath ?? dirent.path, dirent.name)).size;
  }
  return (total / 1024 / 1024).toFixed(1);
};

console.log(`\ndocs/ ready — ${photos.length} photos, ${mb(DIST)} MB total. Commit + push to deploy.`);
