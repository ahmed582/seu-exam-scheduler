const CACHE_NAME = "seu-exam-scheduler-github-v1";
const BASE = self.registration.scope;
const APP_ASSETS = [
  "manifest.webmanifest",
  "brand/app-icon-192.png",
  "brand/app-icon-512.png",
  "brand/seu-logo.png",
  "brand/seu-pattern.png"
].map((path) => new URL(path, BASE).toString());

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => cached || Response.error()),
    ),
  );
});
