// Service worker: síť má přednost, offline se použije uložená kopie. Moduly a styly se ukládají za běhu.
// Firebase SDK (verzované neměnné adresy na gstatic.com) se ukládá také, aby aplikace šla spustit offline.
// Oznámení ⏱ živého tréninku (i na hodinkách): klepnutí otevře aplikaci, akce ⏸ / ⏭ se pošlou otevřené aplikaci (řídí hodiny).
// 🧪 Kanály: stejný soubor běží ve stabilní verzi (kořen webu) i v betě (složka beta/). Kanál se pozná podle vlastní adresy
// (stejné pravidlo jako src/core/channel.js). Každý kanál má vlastní předponu cache a maže jen své staré cache; stabilní worker
// nesahá na adresy bety (beta má vlastního workera s užším rozsahem) a oznámení posílá jen oknům svého kanálu.

// ===== Konstanty =====
// Kanál podle adresy workera: …/beta/sw.js = beta
const BETA = /\/beta\/sw\.js$/.test(self.location.pathname);
// Název cache se mění s každou verzí (hokej-vNN, číslo jen roste), aby se stará kopie aplikace zahodila; přiřazení k verzím je v CHANGELOG.md.
// Beta má stejné číslo s předponou hokej-beta-v (src/core/channel.js cachePrefix).
const VER = "132", PFX = BETA ? "hokej-beta-v" : "hokej-v", C = PFX + VER;
const CORE = ["./", "index.html", "styles/main.css", "src/main.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
const FB = "https://www.gstatic.com/firebasejs/";
// Cesta složky bety vedle stabilní verze (stabilní worker ji nechává betě)
const BETA_PATH = new URL("./beta/", self.location).pathname;

// ===== Pomocné funkce =====
// Patří okno (adresa klienta) tomuto kanálu?
const mine = url => /\/beta\//.test(new URL(url).pathname) === BETA;

// ===== Instalace a aktivace =====
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
// Smazat jen staré cache vlastního kanálu (hokej-vNN stabilní, hokej-beta-vNN beta)
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x.startsWith(PFX) && x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())); });

// ===== Načítání =====
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // Firebase SDK: nejdřív z cache, jinak ze sítě a uložit
  if (e.request.url.startsWith(FB)) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(e.request, cp)); }
      return res;
    })));
    return;
  }
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  // Stabilní worker adresy bety neobsluhuje (prohlížeč je načte sám, nebo je obslouží worker bety)
  if (!BETA && u.pathname.startsWith(BETA_PATH)) return;
  // Vlastní soubory: síť má přednost, offline uložená kopie (jen z cache tohoto kanálu)
  e.respondWith(fetch(new Request(e.request.url, {cache: "no-store"})).then(r => {
    const cp = r.clone();
    caches.open(C).then(c => c.put(e.request, cp));
    return r;
  }).catch(() => caches.open(C).then(c => c.match(e.request).then(r => r || c.match("index.html")))));
});

// ===== Oznámení živého tréninku =====
// Akce (pause / next) dostane otevřené okno aplikace tohoto kanálu zprávou {hk: "tl", act, eid}; bez akce se aplikace zobrazí (nebo otevře)
self.addEventListener("notificationclick", e => {
  const n = e.notification, act = e.action || "", d = n.data || {};
  n.close();
  e.waitUntil(self.clients.matchAll({type: "window", includeUncontrolled: true}).then(all => {
    const c = all.filter(x => mine(x.url))[0];
    if (act) { if (c) c.postMessage({hk: "tl", act, eid: d.eid}); return null; }
    return c ? c.focus() : self.clients.openWindow("./");
  }));
});
