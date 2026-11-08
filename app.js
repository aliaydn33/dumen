// Dümen: Ankara gezi listesi
// Arama, puan ve fotoğraf Google Places'tan, ortak liste Firebase'den geliyor.

const CFG = window.DUMEN_CONFIG || {};
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* dolu ya da kapalı */ } },
};

const state = {
  me: LS.get("dumen.name", ""),
  places: [],
  loaded: false,
  sort: LS.get("dumen.sort", "order"),
  pos: null,
  geoDenied: false,
};
let store = null;

/* ---------------- İkonlar ---------------- */
const svg = (d, extra = "") => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const I = {
  nav: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.6L20 3.6l-7 16.6-1.9-7.6-7.6-2z" fill="currentColor"/></svg>`,
  bus: svg(`<rect x="4.5" y="3" width="15" height="14.5" rx="3"/><path d="M4.5 10.5h15M8 20.5v-3M16 20.5v-3"/><circle cx="8.3" cy="14" r=".6" fill="currentColor"/><circle cx="15.7" cy="14" r=".6" fill="currentColor"/>`),
  walk: svg(`<circle cx="13" cy="4.2" r="1.8"/><path d="M9.5 21l2.2-6 2.6 2.4V21M7.5 12.2l2.8-3.8 3.7 1 1.9 2.8h2.8M11.7 15l1.4-5.4"/>`),
  map: svg(`<path d="M9 4.5L3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2-6-2zM9 4.5v13M15 6.5v13"/>`),
  heart: svg(`<path d="M12 20s-7.5-4.6-7.5-10.1A4.3 4.3 0 0112 7.3a4.3 4.3 0 017.5 2.6C19.5 15.4 12 20 12 20z"/>`),
  check: svg(`<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.7 2.7L16.2 9.4"/>`),
  up: svg(`<path d="M12 19V5M6 11l6-6 6 6"/>`),
  down: svg(`<path d="M12 5v14M6 13l6 6 6-6"/>`),
  note: svg(`<path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>`),
  photo: svg(`<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="12" cy="12" r="3.4"/><path d="M8 5l1.5-2h5L16 5"/>`),
  star: svg(`<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8L3.6 9.6l5.8-.8z"/>`),
  ext: svg(`<path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4"/>`),
  trash: svg(`<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5"/>`),
  plus: svg(`<path d="M12 5v14M5 12h14"/>`, `stroke-width="2.3"`),
  share: svg(`<path d="M12 3v12M7.5 7.5L12 3l4.5 4.5M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>`),
  link: svg(`<path d="M10 14a4.5 4.5 0 006.4 0l3-3a4.5 4.5 0 00-6.4-6.4l-1 1M14 10a4.5 4.5 0 00-6.4 0l-3 3a4.5 4.5 0 006.4 6.4l1-1"/>`),
  info: svg(`<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.2"/>`, `stroke-width="2"`),
  pin: svg(`<path d="M12 21s6.5-5.8 6.5-11.2a6.5 6.5 0 10-13 0C5.5 15.2 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/>`, `stroke-width="2.1"`),
  close: `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
};

/* ---------------- Biçimlendirme ---------------- */
const nf = new Intl.NumberFormat("tr-TR");
const nfCompact = new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 });
const fmtRating = (r) => r.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
function fmtDist(m) {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toLocaleString("tr-TR", { maximumFractionDigits: m < 10000 ? 1 : 0 })} km`;
}
function distance(a, b) {
  if (!a || b?.lat == null || b?.lng == null) return Infinity;
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const walkMinutes = (m) => Math.max(1, Math.round((m * 1.3) / 80)); // ~4,8 km/sa, yol payıyla
function ratingShort(p) {
  if (p.rating == null) return "Puan yok";
  return `<span class="star">★</span> ${fmtRating(p.rating)}${p.ratingCount ? ` (${nfCompact.format(p.ratingCount)})` : ""}`;
}
function ratingLong(p) {
  if (p.rating == null) return "Henüz Google puanı yok";
  return `<span class="star">★</span> ${fmtRating(p.rating)}${p.ratingCount ? ` · ${nf.format(p.ratingCount)} değerlendirme` : ""}`;
}
// Türkçe ünlü uyumu: "Can da", "Ece de"
function daDe(word) {
  const v = (word.toLocaleLowerCase("tr").match(/[aeıioöuü](?=[^aeıioöuü]*$)/) || ["e"])[0];
  return "aıou".includes(v) ? "da" : "de";
}
function whoShort(p) {
  const n = (p.fans || []).length;
  return `${esc(p.addedBy || "Biri")} ekledi${n > 1 ? ` · ${n} kişi istiyor` : ""}`;
}
function whoLong(p) {
  const others = (p.fans || []).filter((n) => n !== p.addedBy);
  let s = `${esc(p.addedBy || "Biri")} ekledi`;
  if (others.length === 0) return s;
  if (others.length <= 3) return `${s} · ${others.map(esc).join(", ")} ${daDe(others[others.length - 1])} istiyor`;
  return `${s} · ${others.slice(0, 2).map(esc).join(", ")} ve ${others.length - 2} kişi daha istiyor`;
}
const initial = (name) => (name || "?").trim().charAt(0).toLocaleUpperCase("tr") || "?";
const PALETTE = ["#5856D6", "#32ADE6", "#FF9500", "#34C759", "#FF2D55", "#A2845E", "#AF52DE", "#00C7BE", "#FF6B3D", "#0A84FF"];
function colorFor(s) { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.codePointAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; }
const fmtDay = (t) => new Date(t).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });

/* ---------------- Yol tarifi bağlantıları ---------------- */
const links = {
  transit: (p) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.name)}&destination_place_id=${encodeURIComponent(p.id)}&travelmode=transit`,
  walk: (p) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.name)}&destination_place_id=${encodeURIComponent(p.id)}&travelmode=walking`,
  apple: (p) => `https://maps.apple.com/?daddr=${p.lat},${p.lng}&dirflg=r`,
  gmapsApp: (p) => `comgooglemaps://?daddr=${p.lat},${p.lng}&directionsmode=transit`,
  place: (p) => p.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}&query_place_id=${encodeURIComponent(p.id)}`,
};

/* ---------------- Fotoğraflar ----------------
   Google fotoğrafı yer eklenirken BİR kez çekilir, 720×540'a küçültülüp listeye
   kaydedilir. Böylece arkadaşlar uygulamayı her açtığında yeniden ücretlendirilmez. */
const photoCache = new Map(); // yer id → { key, url }
function photoSrc(p) {
  const data = p.photo;
  if (typeof data !== "string" || !data.startsWith("data:image/")) return null;
  const key = data.length + ":" + data.slice(-32);
  const hit = photoCache.get(p.id);
  if (hit && hit.key === key) return hit.url;
  try {
    const [head, b64] = data.split(",");
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: head.slice(5, head.indexOf(";")) || "image/jpeg" }));
    if (hit) URL.revokeObjectURL(hit.url);
    photoCache.set(p.id, { key, url });
    return url;
  } catch { return data; }
}
function loadImage(src, cors) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}
function imageToDataURL(img, W = 720, H = 540) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const s = Math.max(W / iw, H / ih);
  const sw = W / s, sh = H / s;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  c.getContext("2d").drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, W, H);
  let q = 0.78, url = c.toDataURL("image/jpeg", q); // CORS yoksa burada SecurityError
  while (url.length > 170000 && q > 0.45) { q -= 0.08; url = c.toDataURL("image/jpeg", q); }
  return url;
}
async function capturePhoto(photo) {
  if (!photo) return null;
  const a = photo.authorAttributions?.[0];
  const info = { photo: null, photoBy: a?.displayName || null, photoByUri: a?.uri || null, previewSrc: null };
  const src = photo.getURI({ maxWidth: 1000, maxHeight: 1000 });
  try {
    info.photo = imageToDataURL(await loadImage(src, true));
    info.previewSrc = info.photo;
  } catch (e) {
    console.warn("Fotoğraf kaydedilemedi, sadece gösterilecek:", e);
    info.previewSrc = src;
  }
  return info;
}
function avatarHTML(p, badge) {
  const src = photoSrc(p);
  return `<span class="ava" style="background:${colorFor(p.name)}">${src ? `<img src="${esc(src)}" alt="" loading="lazy">` : esc(initial(p.name))}${badge ? `<span class="num">${badge}</span>` : ""}</span>`;
}
function attributionHTML(p) {
  if (!p.photoBy) return "Fotoğraf: Google Maps";
  return `Fotoğraf: ${p.photoByUri ? `<a href="${esc(p.photoByUri)}" target="_blank" rel="noopener">${esc(p.photoBy)}</a>` : esc(p.photoBy)}`;
}

/* ---------------- Veri: yerel (deneme modu) ---------------- */
function createLocalStore() {
  const KEY = "dumen.places." + (CFG.groupId || "local");
  let items = LS.get(KEY, []);
  let cb = () => {};
  const emit = () => { LS.set(KEY, items); cb(items.slice()); };
  const patchOne = (id, fn) => { items = items.map((x) => (x.id === id ? fn(x) : x)); emit(); };
  return {
    mode: "local",
    subscribe(fn) { cb = fn; fn(items.slice()); },
    async add(p) { if (!items.some((x) => x.id === p.id)) { items.push(p); emit(); } },
    async update(id, patch) { patchOne(id, (x) => ({ ...x, ...patch })); },
    async remove(id) { items = items.filter((x) => x.id !== id); emit(); },
    async setFan(id, name, on) {
      patchOne(id, (x) => { const f = new Set(x.fans || []); on ? f.add(name) : f.delete(name); return { ...x, fans: [...f] }; });
    },
    async swapOrder(a, b) {
      items = items.map((x) => (x.id === a.id ? { ...x, order: b.order } : x.id === b.id ? { ...x, order: a.order } : x));
      emit();
    },
  };
}

/* ---------------- Veri: Firebase (ortak liste) ---------------- */
async function createFirebaseStore(conf, groupId) {
  const fb = await import("./vendor/firebase.js");
  const app = fb.initializeApp(conf);
  await fb.signInAnonymously(fb.getAuth(app));
  let db;
  try { db = fb.initializeFirestore(app, { localCache: fb.persistentLocalCache() }); }
  catch { db = fb.initializeFirestore(app, {}); }
  const col = fb.collection(db, "groups", groupId, "places");
  const ref = (id) => fb.doc(col, id);
  return {
    mode: "firebase",
    subscribe(fn, onErr) {
      fb.onSnapshot(col, (snap) => fn(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onErr);
    },
    add(p) { const { id, ...data } = p; return fb.setDoc(ref(id), data); },
    update: (id, patch) => fb.updateDoc(ref(id), patch),
    remove: (id) => fb.deleteDoc(ref(id)),
    setFan: (id, name, on) => fb.updateDoc(ref(id), { fans: on ? fb.arrayUnion(name) : fb.arrayRemove(name) }),
    swapOrder(a, b) {
      const batch = fb.writeBatch(db);
      batch.update(ref(a.id), { order: b.order });
      batch.update(ref(b.id), { order: a.order });
      return batch.commit();
    },
  };
}
function save(promise) {
  Promise.resolve(promise).catch((e) => {
    console.error(e);
    toast(e?.code === "permission-denied" ? "Kaydedilemedi: Firebase kuralları izin vermiyor." : "Kaydedilemedi. İnternet bağlantını kontrol et.");
  });
}

/* ---------------- Uyarılar ---------------- */
const notices = new Map();
function setNotice(key, html) {
  html ? notices.set(key, html) : notices.delete(key);
  const el = $("#notice");
  el.innerHTML = `${I.info}<div>${[...notices.values()].map((h) => `<p>${h}</p>`).join("")}</div>`;
  el.hidden = notices.size === 0;
}

/* ---------------- Konum ---------------- */
const geoSupported = "geolocation" in navigator;
function locate(fromUser = false) {
  if (!geoSupported) return;
  navigator.geolocation.getCurrentPosition(
    (p) => { state.pos = { lat: p.coords.latitude, lng: p.coords.longitude }; state.geoDenied = false; render(); },
    (err) => {
      if (err.code === 1) {
        state.geoDenied = true; render();
        if (fromUser) toast("Konum izni kapalı. Ayarlar › Gizlilik › Konum Servisleri'nden açabilirsin.");
      } else if (fromUser) toast("Konum alınamadı, biraz sonra tekrar dene.");
    },
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
  );
}
async function initLocation() {
  if (!geoSupported) return;
  try {
    const st = await navigator.permissions?.query({ name: "geolocation" });
    if (st?.state === "granted") locate();
    else if (st?.state === "denied") state.geoDenied = true;
  } catch { /* eski Safari: butona basınca sorulur */ }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && state.pos) locate(); });
}

/* ---------------- Liste ---------------- */
const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
function sorted(list) {
  const arr = list.slice();
  const d = (p) => distance(state.pos, p);
  if (state.sort === "near") arr.sort((a, b) => d(a) - d(b) || byOrder(a, b));
  else if (state.sort === "rating") arr.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || (b.ratingCount ?? 0) - (a.ratingCount ?? 0));
  else if (state.sort === "fans") arr.sort((a, b) => (b.fans?.length || 0) - (a.fans?.length || 0) || byOrder(a, b));
  else arr.sort(byOrder);
  return arr;
}
const pendingPlaces = () => state.places.filter((p) => !p.visited);

function heroHTML(p, nearestId) {
  const src = photoSrc(p);
  const d = distance(state.pos, p);
  return `<article class="hero" data-id="${esc(p.id)}">
    ${src ? `<img class="hero-img" src="${esc(src)}" alt="">` : `<div class="hero-ph" style="background:linear-gradient(150deg, ${colorFor(p.name)}, #1C1C1E)">${esc(initial(p.name))}</div>`}
    <button class="hero-hit" type="button" data-act="open" aria-label="${esc(p.name)}: ayrıntılar"></button>
    <div class="hero-top">
      ${isFinite(d) ? `<span class="glass">${I.nav.replace("<svg", '<svg width="12" height="12"')}${fmtDist(d)}</span>` : "<span></span>"}
      ${p.id === nearestId && state.sort !== "near" ? `<span class="glass glass--accent">En yakın</span>` : ""}
    </div>
    <div class="hero-bottom">
      <div class="hero-text">
        <h3 class="hero-name">${esc(p.name)}</h3>
        <div class="hero-meta">${ratingShort(p)}</div>
        <div class="hero-who">${whoLong(p)}</div>
        ${src ? `<div class="hero-attr">${esc(p.photoBy ? `Fotoğraf: ${p.photoBy}` : "Fotoğraf: Google Maps")}</div>` : ""}
      </div>
      <a class="hero-go" href="${links.transit(p)}" target="_blank" rel="noopener">${I.nav}Git</a>
    </div>
  </article>`;
}

function rowHTML(p, badge, nearestId, done) {
  const d = distance(state.pos, p);
  const meta = [ratingShort(p)];
  if (isFinite(d)) meta.push(fmtDist(d));
  const near = !done && p.id === nearestId ? `<span class="near">En yakın</span> · ` : "";
  return `<li class="row" data-id="${esc(p.id)}">
    ${avatarHTML(p, badge)}
    <div class="row-body">
      <button class="row-open" type="button" data-act="open">
        <span class="row-text">
          <span class="row-title">${esc(p.name)}</span>
          <span class="row-meta">${meta.join(" · ")}</span>
          <span class="row-sub">${done && p.visitedAt ? `${fmtDay(p.visitedAt)} · gidildi` : near + whoShort(p)}</span>
        </span>
      </button>
      ${done ? "" : `<a class="go" href="${links.transit(p)}" target="_blank" rel="noopener" aria-label="${esc(p.name)}: toplu taşımayla git">Git</a>`}
    </div>
  </li>`;
}

const EMPTY_ART = `<svg viewBox="0 0 120 56" aria-hidden="true"><path d="M12 42C34 42 34 14 60 14s26 28 48 28" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 6" stroke-linecap="round"/><circle cx="12" cy="42" r="7" fill="var(--accent)"/><circle cx="60" cy="14" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="108" cy="42" r="5" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
const HERO_TITLES = { order: "Sıradaki durak", near: "Sana en yakın", rating: "En yüksek puanlı", fans: "En çok istenen" };

function render() {
  const pending = pendingPlaces();
  const done = state.places.filter((p) => p.visited).sort((a, b) => (b.visitedAt || 0) - (a.visitedAt || 0));
  const list = sorted(pending);

  let nearestId = null;
  if (state.pos && pending.length > 1) {
    let best = Infinity;
    for (const p of pending) { const d = distance(state.pos, p); if (d < best) { best = d; nearestId = p.id; } }
  }

  // Başlık altı
  const people = new Set(state.places.flatMap((p) => [p.addedBy, ...(p.fans || [])]).filter(Boolean));
  $("#lede").textContent = !state.loaded ? " "
    : state.places.length === 0 ? "Arkadaşlarınla ortak gezi rotası"
    : [`${pending.length} durak sırada`, done.length ? `${done.length} gidildi` : "", people.size > 1 ? `${people.size} kişi` : ""].filter(Boolean).join(" · ");

  // Sıralama ve konum
  $("#seg").hidden = pending.length < 2;
  document.querySelectorAll("#seg button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.sort === state.sort)));
  $("#geoBtn").hidden = !geoSupported || !!state.pos || state.geoDenied || pending.length === 0;

  // Kapak + rota
  $("#nextWrap").hidden = list.length === 0;
  if (list.length) {
    $("#nextTitle").textContent = state.sort === "near" && !state.pos ? HERO_TITLES.order : HERO_TITLES[state.sort];
    const heroEl = $("#next");
    const html = heroHTML(list[0], nearestId);
    if (heroEl.dataset.html !== html) {
      const same = heroEl.dataset.id === list[0].id; // aynı yer güncellendiyse foto tekrar belirmesin
      heroEl.innerHTML = html;
      heroEl.dataset.html = html; heroEl.dataset.id = list[0].id;
      heroEl.firstElementChild.classList.toggle("no-anim", same);
    }
  }
  $("#restWrap").hidden = list.length < 2;
  $("#list").innerHTML = list.slice(1).map((p, i) => rowHTML(p, i + 2, nearestId, false)).join("");

  // Boş durum
  const empty = $("#empty");
  empty.hidden = !state.loaded || pending.length > 0;
  if (!empty.hidden) {
    empty.innerHTML = done.length
      ? `${EMPTY_ART}<h2>Hepsini gezdiniz</h2><p>Sıradaki durağı yukarıdan arayıp ekle.</p>`
      : `${EMPTY_ART}<h2>Rotanız henüz boş</h2><p>Gitmek istediğin bir yeri yukarıdan ara,<br>ilk durağı sen ekle.</p>`;
  }

  // Gittiklerimiz
  $("#doneWrap").hidden = done.length === 0;
  $("#doneCount").textContent = String(done.length);
  $("#doneList").innerHTML = done.map((p) => rowHTML(p, "✓", null, true)).join("");

  // Profil
  const me = $("#meBtn");
  me.style.background = state.me ? colorFor(state.me) : "var(--fill-2)";
  $("#meInitial").textContent = initial(state.me);

  sheetCtx?.refresh?.();
}

/* ---------------- Alt sayfa ---------------- */
let sheetCtx = null;
let lastFocus = null;
const closeBtn = `<button class="close" type="button" data-close aria-label="Kapat">${I.close}</button>`;

function openSheet(html, ctx = {}) {
  const sheet = $("#sheet");
  if (sheet.hidden) lastFocus = document.activeElement;
  sheet.innerHTML = html;
  sheet.classList.toggle("sheet-plain", !sheet.querySelector(".sheet-photo"));
  sheet.dataset.dismissable = ctx.dismissable === false ? "0" : "1";
  sheetCtx = ctx;
  if (sheet.hidden) { sheet.hidden = false; $("#scrim").hidden = false; document.body.style.overflow = "hidden"; sheet.scrollTop = 0; }
  const f = sheet.querySelector(ctx.focus || "[data-close], button:not([disabled]), a[href]");
  if (f) setTimeout(() => f.focus({ preventScroll: true }), 40);
}
function closeSheet(force = false) {
  const sheet = $("#sheet");
  if (sheet.hidden) return;
  if (!force && sheet.dataset.dismissable === "0") return;
  sheet.hidden = true; $("#scrim").hidden = true;
  document.body.style.overflow = "";
  sheetCtx = null;
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}

/* ---------------- Bildirim ---------------- */
let toastT;
function toast(msg, action) {
  const el = $("#toast");
  clearTimeout(toastT);
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ""}`;
  el.hidden = false;
  if (action) el.querySelector("button").onclick = () => { el.hidden = true; action.run(); };
  toastT = setTimeout(() => { el.hidden = true; }, action ? 6000 : 3000);
}

/* ---------------- Profil: isim + davet ---------------- */
function openProfile(first = false) {
  const url = location.origin + location.pathname;
  openSheet(`
    <div class="grip"></div>
    <div class="sheet-body">
      ${first ? "" : closeBtn}
      <h2 id="sheetTitle">${first ? "Hoş geldin" : "Profil"}</h2>
      <p class="lead">${first ? "Adını yaz; arkadaşların listede kimin ne eklediğini görsün." : "Listede bu isimle görünüyorsun."}</p>
      <form data-form="name">
        <input class="field" id="nameIn" name="name" maxlength="24" autocomplete="given-name" placeholder="Adın" value="${esc(state.me)}" required>
        <div class="actions"><button class="btn-primary" type="submit">${first ? "Başla" : "Kaydet"}</button></div>
      </form>
      ${first ? "" : `<div class="group">
        <button class="cell" type="button" data-s="invite"><span class="ci">${I.share}</span><span class="t">Arkadaşlarını davet et</span></button>
        <button class="cell" type="button" data-s="copy"><span class="ci">${I.link}</span><span class="t">Bağlantıyı kopyala</span></button>
      </div>
      <p class="hint">Arkadaşın bağlantıyı Safari'de açıp Paylaş › Ana Ekrana Ekle demeli.</p>`}
    </div>`, {
    dismissable: !first,
    focus: first ? "#nameIn" : undefined,
    onSubmit(form) {
      const v = form.name.value.trim().replace(/\s+/g, " ");
      if (!v) return;
      state.me = v; LS.set("dumen.name", v);
      closeSheet(true); render();
      if (!first) toast("Kaydedildi");
    },
    async onAction(act) {
      if (act === "invite") {
        if (navigator.share) { try { await navigator.share({ title: "Dümen", text: "Ankara'yı gezek: ortak listemize katıl", url }); } catch { /* vazgeçti */ } }
        else act = "copy";
      }
      if (act === "copy") {
        try { await navigator.clipboard.writeText(url); toast("Bağlantı kopyalandı"); }
        catch { toast(url); }
      }
    },
  });
}

/* ---------------- Yer ayrıntısı ---------------- */
function detailHTML(p) {
  const src = photoSrc(p);
  const d = distance(state.pos, p);
  const mine = (p.fans || []).includes(state.me);
  const inOrder = state.sort === "order";
  const ordered = pendingPlaces().sort(byOrder);
  const idx = ordered.findIndex((x) => x.id === p.id);
  const canUp = !p.visited && inOrder && idx > 0;
  const canDown = !p.visited && inOrder && idx > -1 && idx < ordered.length - 1;
  const hasLoc = p.lat != null && p.lng != null;
  const fans = p.fans || [];

  return `
    ${src
      ? `<div class="sheet-photo"><div class="grip"></div><img src="${esc(src)}" alt="${esc(p.name)}">${closeBtn}<div class="attr">${attributionHTML(p)}</div></div>`
      : `<div class="grip"></div>`}
    <div class="sheet-body">
      ${src ? "" : closeBtn}
      <h2 id="sheetTitle">${esc(p.name)}</h2>
      <div class="sheet-meta">${ratingLong(p)}${isFinite(d) ? ` · ${fmtDist(d)}` : ""}</div>
      ${p.address ? `<p class="sheet-addr">${esc(p.address)}</p>` : ""}
      ${p.note ? `<div class="quote">${esc(p.note)}<small>${esc(p.addedBy || "")}</small></div>` : ""}
      ${fans.length ? `<div class="people">${fans.map((n) => `<span class="chip-person"><i style="background:${colorFor(n)}">${esc(initial(n))}</i>${esc(n)}${n === p.addedBy ? ` <span class="muted">ekledi</span>` : ""}</span>`).join("")}</div>` : ""}

      ${p.visited
        ? `<div class="actions"><button class="btn-primary" type="button" data-s="unvisit">Listeye geri al</button></div>
           <p class="hint">${p.visitedAt ? `${fmtDay(p.visitedAt)} tarihinde gidildi.` : "Buraya gittiniz."}</p>`
        : `<div class="actions">
            <a class="btn-primary" href="${links.transit(p)}" target="_blank" rel="noopener">${I.bus}Toplu taşımayla git</a>
            <div class="actions-2">
              <a class="btn-secondary" href="${links.walk(p)}" target="_blank" rel="noopener">${I.walk}<span class="stack-t">Yürüyerek<small>${isFinite(d) ? `yaklaşık ${walkMinutes(d)} dk` : "Google Haritalar"}</small></span></a>
              ${hasLoc ? `<a class="btn-secondary" href="${links.apple(p)}" target="_blank" rel="noopener">${I.map}<span class="stack-t">Apple<small>Haritalar</small></span></a>` : ""}
            </div>
          </div>`}

      <div class="group">
        ${p.visited ? "" : `
          <button class="cell" type="button" role="switch" aria-checked="${mine}" data-s="fan"><span class="ci">${I.heart}</span><span class="t">Ben de gitmek istiyorum</span><span class="switch"></span></button>
          <button class="cell" type="button" data-s="visit"><span class="ci">${I.check}</span><span class="t">Gittik olarak işaretle</span></button>`}
        ${canUp ? `<button class="cell" type="button" data-s="up"><span class="ci">${I.up}</span><span class="t">Sırada yukarı al</span></button>` : ""}
        ${canDown ? `<button class="cell" type="button" data-s="down"><span class="ci">${I.down}</span><span class="t">Sırada aşağı al</span></button>` : ""}
        <button class="cell" type="button" data-s="note"><span class="ci">${I.note}</span><span class="t">${p.note ? "Notu düzenle" : "Not ekle"}</span></button>
        ${src ? "" : `<button class="cell" type="button" data-s="photo"><span class="ci">${I.photo}</span><span class="t">Google fotoğrafını ekle</span></button>`}
        <a class="cell" href="${links.place(p)}" target="_blank" rel="noopener"><span class="ci">${I.star}</span><span class="t">Google'da yorumları gör</span></a>
        ${hasLoc && !p.visited ? `<a class="cell" href="${links.gmapsApp(p)}"><span class="ci">${I.ext}</span><span class="t">Google Haritalar uygulamasında aç</span></a>` : ""}
      </div>
      <div class="group">
        <button class="cell cell--danger" type="button" data-s="del"><span class="ci">${I.trash}</span><span class="t">Listeden sil</span></button>
      </div>
      ${!p.visited && state.sort !== "order" ? `<p class="hint">Sırayı elle değiştirmek için üstten "Sıra" görünümüne geç.</p>` : ""}
    </div>`;
}

function openDetail(id) {
  const p = state.places.find((x) => x.id === id);
  if (!p) return;
  const ctx = {
    refresh() {
      const cur = state.places.find((x) => x.id === id);
      if (!cur) { closeSheet(true); return; }
      const sheet = $("#sheet"), top = sheet.scrollTop;
      const active = document.activeElement?.dataset?.s;
      sheet.innerHTML = detailHTML(cur);
      sheet.classList.toggle("sheet-plain", !sheet.querySelector(".sheet-photo"));
      sheet.scrollTop = top;
      if (active) sheet.querySelector(`[data-s="${active}"]`)?.focus({ preventScroll: true });
    },
    onAction(act) {
      const cur = state.places.find((x) => x.id === id);
      if (!cur) return;
      if (act === "fan") save(store.setFan(id, state.me, !(cur.fans || []).includes(state.me)));
      else if (act === "visit") {
        save(store.update(id, { visited: true, visitedAt: Date.now() }));
        closeSheet();
        toast(`${cur.name}: gittik`, { label: "Geri al", run: () => save(store.update(id, { visited: false, visitedAt: null })) });
      } else if (act === "unvisit") {
        save(store.update(id, { visited: false, visitedAt: null }));
        closeSheet(); toast("Listeye geri alındı");
      } else if (act === "up" || act === "down") {
        const ordered = pendingPlaces().sort(byOrder);
        const i = ordered.findIndex((x) => x.id === id);
        const other = ordered[i + (act === "up" ? -1 : 1)];
        if (other) save(store.swapOrder(cur, other));
      } else if (act === "note") openNote(cur);
      else if (act === "photo") refreshPhoto(cur);
      else if (act === "del") {
        const copy = { ...cur };
        save(store.remove(id));
        closeSheet();
        toast("Listeden silindi", { label: "Geri al", run: () => save(store.add(copy)) });
      }
    },
  };
  openSheet(detailHTML(p), ctx);
}

function openNote(p) {
  openSheet(`
    <div class="grip"></div>
    <div class="sheet-body">
      ${closeBtn}
      <h2 id="sheetTitle">${esc(p.name)}</h2>
      <form data-form="note">
        <label class="field-label" for="noteEdit">Not</label>
        <textarea class="field" id="noteEdit" name="note" maxlength="140" placeholder="Ör. hafta sonu gidelim, kahvaltısı meşhur">${esc(p.note || "")}</textarea>
        <div class="actions"><button class="btn-primary" type="submit">Notu kaydet</button></div>
      </form>
    </div>`, {
    focus: "#noteEdit",
    onSubmit(form) {
      save(store.update(p.id, { note: form.note.value.trim() }));
      toast("Not kaydedildi");
      openDetail(p.id);
    },
  });
}

async function refreshPhoto(p) {
  if (!CFG.googleMapsApiKey) { toast("Fotoğraf için Google anahtarı gerekli."); return; }
  toast("Fotoğraf aranıyor…");
  try {
    await mapsReady;
    const { Place } = await google.maps.importLibrary("places");
    const place = new Place({ id: p.id });
    await place.fetchFields({ fields: ["photos"] });
    const info = await capturePhoto(place.photos?.[0]);
    if (info?.photo) { save(store.update(p.id, { photo: info.photo, photoBy: info.photoBy, photoByUri: info.photoByUri })); toast("Fotoğraf eklendi"); }
    else toast(info ? "Fotoğraf kaydedilemedi." : "Bu yerin Google fotoğrafı yok.");
  } catch (e) { console.error(e); toast("Fotoğraf alınamadı."); }
}

/* ---------------- Önizleme ve ekleme ---------------- */
function openPreview(p, info) {
  const d = distance(state.pos, p);
  const shown = info?.previewSrc;
  openSheet(`
    ${shown
      ? `<div class="sheet-photo"><div class="grip"></div><img src="${esc(shown)}" alt="${esc(p.name)}">${closeBtn}<div class="attr">${attributionHTML({ photoBy: info.photoBy, photoByUri: info.photoByUri })}</div></div>`
      : `<div class="grip"></div>`}
    <div class="sheet-body">
      ${shown ? "" : closeBtn}
      <h2 id="sheetTitle">${esc(p.name)}</h2>
      <div class="sheet-meta">${ratingLong(p)}${isFinite(d) ? ` · ${fmtDist(d)}` : ""}</div>
      ${p.address ? `<p class="sheet-addr">${esc(p.address)}</p>` : ""}
      <form data-form="add">
        <label class="field-label" for="noteIn">Not (isteğe bağlı)</label>
        <input class="field" id="noteIn" name="note" maxlength="140" placeholder="Ör. akşamüstü gidelim, manzarası güzel">
        <div class="actions"><button class="btn-primary" type="submit">${I.plus}Listeye ekle</button></div>
      </form>
      <p class="hint">Puan, adres ve fotoğraf Google Maps'ten.</p>
    </div>`, {
    onSubmit(form) {
      const now = Date.now();
      save(store.add({
        id: p.id, name: p.name, address: p.address || "", lat: p.lat ?? null, lng: p.lng ?? null,
        rating: p.rating ?? null, ratingCount: p.ratingCount ?? null, mapsUrl: p.mapsUrl || null,
        photo: info?.photo || null, photoBy: info?.photo ? info.photoBy : null, photoByUri: info?.photo ? info.photoByUri : null,
        note: form.note.value.trim(), addedBy: state.me, fans: [state.me],
        order: now, visited: false, visitedAt: null, createdAt: now,
      }));
      closeSheet(); clearSearch();
      toast("Listeye eklendi");
    },
  });
}

/* ---------------- Google Places arama ---------------- */
let mapsReady = Promise.reject(new Error("no key"));
mapsReady.catch(() => {});
let sessionToken = null;
let reqId = 0;
let preds = [];
let activeIdx = -1;

function loadMaps(key) {
  mapsReady = new Promise((resolve, reject) => {
    window.__dumenMapsReady = () => resolve();
    window.gm_authFailure = () => {
      setNotice("maps", "<b>Google Maps anahtarı reddedildi.</b> Anahtarın web sitesi kısıtlamasını, açık API'leri ve faturalandırmayı kontrol et (README).");
      reject(new Error("auth"));
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&language=tr&region=TR&callback=__dumenMapsReady`;
    s.async = true;
    s.onerror = () => reject(new Error("load"));
    document.head.append(s);
  });
  mapsReady.catch(() => {});
  return mapsReady;
}

const q = () => $("#q");
function showSuggest(html) { const ul = $("#suggest"); ul.innerHTML = html; ul.hidden = false; q().setAttribute("aria-expanded", "true"); }
function hideSuggest() { $("#suggest").hidden = true; q().setAttribute("aria-expanded", "false"); q().removeAttribute("aria-activedescendant"); activeIdx = -1; }
function clearSearch() { q().value = ""; $("#qClear").hidden = true; hideSuggest(); sessionToken = null; preds = []; }

function renderSuggestions() {
  if (!preds.length) { showSuggest(`<li class="s-info">Ankara'da böyle bir yer bulunamadı. Farklı yaz ya da semt ekle.</li>`); return; }
  showSuggest(preds.map((p, i) => {
    const main = p.mainText?.text ?? p.text?.text ?? "";
    const sub = p.secondaryText?.text ?? "";
    const dist = typeof p.distanceMeters === "number" ? fmtDist(p.distanceMeters) : "";
    const inList = state.places.some((x) => x.id === p.placeId);
    return `<li role="option" id="sg${i}" data-i="${i}" aria-selected="${i === activeIdx}">
      <span class="s-pin">${I.pin}</span>
      <div class="s-text"><div class="s-main">${esc(main)}</div>${sub || inList ? `<div class="s-sub">${inList ? "Listede · " : ""}${esc(sub)}</div>` : ""}</div>
      ${dist ? `<span class="s-dist">${dist}</span>` : ""}</li>`;
  }).join("") + `<li class="s-foot" aria-hidden="true">Google Maps</li>`);
}

async function fetchSuggestions(text) {
  const my = ++reqId;
  if (text.trim().length < 2) { hideSuggest(); return; }
  try {
    await mapsReady;
    const { AutocompleteSuggestion, AutocompleteSessionToken } = await google.maps.importLibrary("places");
    if (!sessionToken) sessionToken = new AutocompleteSessionToken();
    const req = {
      input: text, sessionToken, language: "tr", region: "tr", includedRegionCodes: ["tr"],
      locationRestriction: CFG.searchBounds || { south: 38.65, west: 30.8, north: 40.75, east: 33.95 },
    };
    if (state.pos) req.origin = state.pos;
    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(req);
    if (my !== reqId) return;
    preds = suggestions.map((s) => s.placePrediction).filter(Boolean);
    activeIdx = -1;
    renderSuggestions();
  } catch (e) {
    if (my !== reqId) return;
    console.error(e);
    showSuggest(`<li class="s-info">Arama yapılamadı. İnternetini ve Google API anahtarını kontrol et.</li>`);
  }
}

async function pick(i) {
  const pred = preds[i];
  if (!pred) return;
  hideSuggest();
  q().blur();
  const main = pred.mainText?.text ?? pred.text?.text ?? "";
  const already = state.places.find((x) => x.id === pred.placeId);
  if (already) { sessionToken = null; clearSearch(); openDetail(already.id); return; }

  openSheet(`<div class="grip"></div><div class="sheet-body">${closeBtn}<h2 id="sheetTitle">${esc(main)}</h2><p class="loading">Puan ve fotoğraf yükleniyor…</p></div>`);
  try {
    const place = pred.toPlace();
    await place.fetchFields({ fields: ["displayName", "formattedAddress", "location", "rating", "userRatingCount", "googleMapsURI", "photos"] });
    const p = {
      id: place.id,
      name: place.displayName || main,
      address: place.formattedAddress || "",
      lat: place.location ? place.location.lat() : null,
      lng: place.location ? place.location.lng() : null,
      rating: typeof place.rating === "number" ? place.rating : null,
      ratingCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
      mapsUrl: place.googleMapsURI || null,
    };
    const info = await capturePhoto(place.photos?.[0]).catch(() => null);
    if ($("#sheet").hidden) return; // kullanıcı vazgeçti
    openPreview(p, info);
  } catch (e) {
    console.error(e);
    openSheet(`<div class="grip"></div><div class="sheet-body">${closeBtn}<h2 id="sheetTitle">${esc(main)}</h2><p class="loading">Yer bilgisi alınamadı. Tekrar dene.</p></div>`);
  } finally {
    sessionToken = null; // oturum bitti; sonraki arama yeni oturum
  }
}

function initSearch() {
  const input = q();
  if (!CFG.googleMapsApiKey) {
    input.disabled = true;
    input.placeholder = "Arama kapalı";
    setNotice("maps", "<b>Arama kapalı.</b> config.js içine Google Maps API anahtarını yaz (README'de anlatıyor).");
    return;
  }
  loadMaps(CFG.googleMapsApiKey).catch(() => {
    if (!notices.has("maps")) setNotice("maps", "<b>Google Maps yüklenemedi.</b> İnternet bağlantını kontrol et.");
  });

  let t;
  input.addEventListener("input", () => {
    $("#qClear").hidden = !input.value;
    clearTimeout(t);
    t = setTimeout(() => fetchSuggestions(input.value), 280);
  });
  input.addEventListener("focus", () => { if (input.value.trim().length >= 2 && preds.length) renderSuggestions(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { hideSuggest(); return; }
    if ($("#suggest").hidden || !preds.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      activeIdx = (activeIdx + (e.key === "ArrowDown" ? 1 : -1) + preds.length) % preds.length;
      renderSuggestions();
      input.setAttribute("aria-activedescendant", `sg${activeIdx}`);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(activeIdx >= 0 ? activeIdx : 0);
    }
  });
  $("#suggest").addEventListener("click", (e) => { const li = e.target.closest("li[data-i]"); if (li) pick(Number(li.dataset.i)); });
  $("#qClear").addEventListener("click", () => { clearSearch(); input.focus(); });
  document.addEventListener("click", (e) => { if (!e.target.closest("#search")) hideSuggest(); });
}

/* ---------------- Başlat ---------------- */
async function initStore() {
  const group = (CFG.groupId || "ankara-ekip").trim();
  if (CFG.firebase && CFG.firebase.apiKey) {
    try { store = await createFirebaseStore(CFG.firebase, group); }
    catch (e) {
      console.error(e);
      setNotice("store", "<b>Ortak listeye bağlanılamadı.</b> Firebase ayarlarını ve Anonim girişin açık olduğunu kontrol et. Şimdilik liste sadece bu telefonda.");
      store = createLocalStore();
    }
  } else {
    store = createLocalStore();
    setNotice("store", "<b>Deneme modu.</b> Liste şimdilik sadece bu telefonda. Ortak liste için README'deki Firebase kısmına bak.");
  }
  store.subscribe(
    (items) => { state.places = items; state.loaded = true; render(); },
    (err) => { console.error(err); setNotice("store", `<b>Liste okunamadı</b> (${esc(err.code || err.message)}). Firestore kurallarını kontrol et.`); }
  );
}

function onPlaceClick(e) {
  if (e.target.closest("a")) return; // Git bağlantısı kendi işini yapar
  const host = e.target.closest("[data-id]");
  if (host) openDetail(host.dataset.id);
}

function init() {
  ["#next", "#list", "#doneList"].forEach((s) => $(s).addEventListener("click", onPlaceClick));
  $("#scrim").addEventListener("click", () => closeSheet());
  const sheet = $("#sheet");
  sheet.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) { closeSheet(); return; }
    const a = e.target.closest("[data-s]");
    if (a && sheetCtx?.onAction) sheetCtx.onAction(a.dataset.s, a);
  });
  sheet.addEventListener("submit", (e) => { e.preventDefault(); sheetCtx?.onSubmit?.(e.target); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });
  $("#meBtn").addEventListener("click", () => openProfile(false));
  $("#geoBtn").addEventListener("click", () => locate(true));
  document.querySelectorAll("#seg button").forEach((b) =>
    b.addEventListener("click", () => {
      state.sort = b.dataset.sort;
      LS.set("dumen.sort", state.sort);
      if (state.sort === "near" && !state.pos) locate(true);
      render();
    })
  );

  render();
  initSearch();
  initLocation();
  initStore();
  if (!state.me) openProfile(true);
}

init();
