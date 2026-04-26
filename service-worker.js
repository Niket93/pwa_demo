const CACHE_NAME = "snag-capture-shell-v5";
const APP_SHELL = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "db.js",
  "manifest.json",
  "assets/icons/Bombardier_symbol_rgb_k.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png"
];

// Cache the app shell so the UI always boots offline after first load.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate immediately and remove old cache versions.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // For app navigation, always fall back to app shell for offline routing.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("index.html"))
    );
    return;
  }

  // Cache-first keeps static assets available without network.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return response;
        })
        .catch(() => caches.match("index.html"));
    })
  );
});
