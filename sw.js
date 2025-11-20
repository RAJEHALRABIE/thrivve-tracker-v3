
const CACHE_NAME = "thrivve-tracker-v4.4-peak-migration";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./report.html",
  "./manifest.webmanifest",
  "./icon-512.png",
  "./icon-196.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((res) => {
      return (
        res ||
        fetch(event.request).catch(() =>
          caches.match("./index.html")
        )
      );
    })
  );
});
