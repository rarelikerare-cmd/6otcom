/*
 * Static export for GitHub Pages.
 *   node build.js   ->  assembles docs/, which is what Pages serves
 *
 * Sources at the repo root (index.html, work.html, vendor/, background/)
 * already use the published paths, so they are copied verbatim; only the
 * photographs are generated, from the originals in photos/.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT   = __dirname;
const DIST   = path.join(ROOT, "docs");
const DOMAIN = "dxwe.online";
const IMAGE_RE = /\.(jpe?g|png|gif|webp|avif)$/i;

const SIZES = [
  { dir: "thumb", px: 480,  q: 82 },   // carousel + grid
  { dir: "web",   px: 1800, q: 86 },   // lightbox + full view
];

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

/* ---- the pages and their assets ---- */

for (const f of ["index.html", "work.html"]) {
  fs.copyFileSync(path.join(ROOT, f), path.join(DIST, f));
}

const copyDir = (from, to, filter = () => true) => {
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    if (name.startsWith(".") || !filter(name)) continue;
    const src = path.join(from, name);
    if (fs.statSync(src).isFile()) fs.copyFileSync(src, path.join(to, name));
  }
};

copyDir(path.join(ROOT, "vendor"), path.join(DIST, "vendor"));
// only the frame the landing actually uses — the other textures stay out of the build
fs.mkdirSync(path.join(DIST, "background"), { recursive: true });
fs.copyFileSync(path.join(ROOT, "background", "landing.jpg"),
                path.join(DIST, "background", "landing.jpg"));

/* ---- the photographs ---- */

const photos = fs.readdirSync(path.join(ROOT, "photos"))
  .filter(f => IMAGE_RE.test(f))
  .sort();

SIZES.forEach(s => fs.mkdirSync(path.join(DIST, s.dir), { recursive: true }));

for (const f of photos) {
  const src = path.join(ROOT, "photos", f);
  process.stdout.write(`  ${f}`);
  for (const s of SIZES) {
    execFileSync("sips", [
      "-s", "format", "jpeg", "-s", "formatOptions", String(s.q),
      "-Z", String(s.px), src, "--out", path.join(DIST, s.dir, f),
    ], { stdio: "pipe" });
  }
  console.log(" ok");
}

fs.writeFileSync(path.join(DIST, "photos.json"), JSON.stringify(photos));
fs.writeFileSync(path.join(DIST, "CNAME"), DOMAIN + "\n");
fs.writeFileSync(path.join(DIST, ".nojekyll"), "");

/* ---- report ---- */

const mb = dir => {
  let total = 0;
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      e.isDirectory() ? walk(p) : (total += fs.statSync(p).size);
    }
  };
  walk(dir);
  return (total / 1024 / 1024).toFixed(1);
};

console.log(`\ndocs/ ready — ${photos.length} photographs, ${mb(DIST)} MB. Commit and push to deploy.`);
