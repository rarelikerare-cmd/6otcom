# dxwe.online

dxwe portfolio — 3D spinning photo sphere.

## Local dev

```
node server.js        # http://localhost:4600
```

Drop images into `photos/` — they appear on the sphere automatically (originals stay local, only resized versions get published).

## Deploy

```
node build.js         # regenerates docs/ (what GitHub Pages serves)
git add -A && git commit -m "update photos" && git push
```
