/* ============ 6OT.COM — PORTFOLIO SPHERE ============ */

const PLACEHOLDER_COUNT = 14;

/* ---------- clock ---------- */

function pad(n) { return String(n).padStart(2, "0"); }

function tick() {
  const n = new Date();
  document.getElementById("clock").textContent =
    pad(n.getHours()) + ":" + pad(n.getMinutes()) + ":" + pad(n.getSeconds());
}
setInterval(tick, 1000);
tick();

/* ---------- load photo list ---------- */

async function loadPhotos() {
  try {
    const res = await fetch("photos.json", { cache: "no-store" });
    if (!res.ok) return [];
    const list = await res.json();
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

/* ---------- sphere ---------- */

const sphereEl = document.getElementById("sphere");
const stageEl = document.getElementById("stage");

function sphereRadius(n) {
  const base = Math.min(innerWidth, innerHeight);
  // more photos -> slightly bigger sphere, clamped to viewport
  return Math.min(base * 0.42, Math.max(190, base * 0.28 + n * 6));
}

function buildSphere(photos) {
  sphereEl.innerHTML = "";
  const items = photos.length
    ? photos
    : Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => null);
  const N = items.length;
  const R = sphereRadius(N);

  items.forEach((f, i) => {
    // golden-spiral distribution
    const phi = Math.acos(1 - (2 * (i + 0.5)) / N);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const card = document.createElement("div");
    card.style.transform =
      `rotateY(${(theta * 180) / Math.PI}deg) ` +
      `rotateX(${90 - (phi * 180) / Math.PI}deg) ` +
      `translateZ(${R}px)`;

    if (f) {
      card.className = "card";
      const img = document.createElement("img");
      img.src = "thumb/" + encodeURIComponent(f);
      img.loading = "lazy";
      img.draggable = false;
      card.appendChild(img);
      card.addEventListener("click", (e) => {
        if (dragMoved) return; // it was a drag, not a click
        e.stopPropagation();
        openLightbox(f, i, items.length);
      });
    } else {
      card.className = "card ph";
      card.innerHTML = `<span class="no">${pad(i + 1).padStart(3, "0")}</span><span>AWAITING UPLOAD</span>`;
    }
    sphereEl.appendChild(card);
  });

  document.getElementById("count").textContent =
    photos.length ? `IMG ${pad(photos.length)}` : "IMG 00 / EMPTY";
}

/* ---------- rotation: auto-spin + drag + inertia ---------- */

let rotY = 0;
let rotX = -8;
let velY = 0;
const AUTO_SPEED = 0.03; // deg per frame-ish
let dragging = false;
let dragMoved = false;
let pointerId = null;
let lastX = 0, lastY = 0;
let startX = 0, startY = 0;

function frame() {
  if (!dragging) {
    rotY += AUTO_SPEED + velY;
    velY *= 0.95; // inertia decay
  }
  sphereEl.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

stageEl.addEventListener("pointerdown", (e) => {
  dragging = true;
  dragMoved = false;
  pointerId = e.pointerId;
  startX = lastX = e.clientX;
  startY = lastY = e.clientY;
  stageEl.classList.add("dragging");
  // NOTE: no pointer capture here — capturing on pointerdown retargets the
  // click to the stage, so card clicks would never fire. Capture only once
  // an actual drag starts (below).
});

stageEl.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  if (!dragMoved && Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 3) {
    dragMoved = true;
    try { stageEl.setPointerCapture(pointerId); } catch (err) {}
  }
  rotY += dx * 0.35;
  rotX = Math.max(-60, Math.min(60, rotX - dy * 0.2));
  velY = dx * 0.06;
  lastX = e.clientX;
  lastY = e.clientY;
});

["pointerup", "pointercancel"].forEach((ev) =>
  stageEl.addEventListener(ev, () => {
    dragging = false;
    stageEl.classList.remove("dragging");
    // let the click handler read dragMoved first, then reset
    setTimeout(() => { dragMoved = false; }, 0);
  })
);

/* ---------- lightbox ---------- */

const lightbox = document.getElementById("lightbox");
const lightboxImg = lightbox.querySelector("img");
const lightboxCaption = document.getElementById("lightboxCaption");
const lightboxOriginal = document.getElementById("lightboxOriginal");

function openLightbox(file, i, total) {
  lightboxImg.src = "web/" + encodeURIComponent(file);
  lightboxCaption.textContent = `IMG ${pad(i + 1).padStart(3, "0")} / ${pad(total).padStart(3, "0")}`;
  lightboxOriginal.href = "photos/" + encodeURIComponent(file);
  lightbox.hidden = false;
}

lightbox.addEventListener("click", () => { lightbox.hidden = true; });
lightboxOriginal.addEventListener("click", (e) => e.stopPropagation());

/* ---------- keyboard ---------- */

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") lightbox.hidden = true;
});

/* ---------- boot ---------- */

let photoCount = -1;

async function refresh() {
  const photos = await loadPhotos();
  if (photos.length !== photoCount) {
    photoCount = photos.length;
    buildSphere(photos);
  }
}

refresh();
setInterval(refresh, 4000); // pick up newly dropped files without reloading

let rsz;
window.addEventListener("resize", () => {
  clearTimeout(rsz);
  rsz = setTimeout(() => { photoCount = -1; refresh(); }, 250);
});
