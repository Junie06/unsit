const CACHE_NAME = "unsit-shell-v10";
const APP_SHELL = [
  "/",
  "/styles.css",
  "/app.js",
  "/offline-challenge.js",
  "/challenge-core.js",
  "/gemma-client.js",
  "/gemma-worker.js",
  "/manifest.webmanifest",
  "/favicon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) =>
    cache.addAll(APP_SHELL.map((path) => new Request(path, { cache: "reload" })))
  ));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});
