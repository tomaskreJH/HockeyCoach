// Service worker: síť má přednost, offline se použije uložená kopie. Moduly a styly se ukládají za běhu.
// Firebase SDK (verzované neměnné adresy na gstatic.com) se ukládá také, aby aplikace šla spustit offline.
// Oznámení ⏱ živého tréninku (i na hodinkách): klepnutí otevře aplikaci, akce ⏸ / ⏭ se pošlou otevřené aplikaci (řídí hodiny).

// ===== Konstanty =====
// Název cache se mění s každou verzí (hokej-vNN, číslo jen roste), aby se stará kopie aplikace zahodila; přiřazení k verzím je v CHANGELOG.md
const C = "hokej-v104", CORE = ["./", "index.html", "styles/main.css", "src/main.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
const FB = "https://www.gstatic.com/firebasejs/";

// ===== Instalace a aktivace =====
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())); });

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
  // Vlastní soubory: síť má přednost, offline uložená kopie
  e.respondWith(fetch(new Request(e.request.url, {cache: "no-store"})).then(r => {
    const cp = r.clone();
    caches.open(C).then(c => c.put(e.request, cp));
    return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});

// ===== Oznámení živého tréninku =====
// Akce (pause / next) dostane otevřené okno aplikace zprávou {hk: "tl", act, eid}; bez akce se aplikace zobrazí (nebo otevře)
self.addEventListener("notificationclick", e => {
  const n = e.notification, act = e.action || "", d = n.data || {};
  n.close();
  e.waitUntil(self.clients.matchAll({type: "window", includeUncontrolled: true}).then(list => {
    const c = list[0];
    if (act) { if (c) c.postMessage({hk: "tl", act, eid: d.eid}); return null; }
    return c ? c.focus() : self.clients.openWindow("./");
  }));
});
