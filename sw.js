
const CACHE_NAME = "origon58-cache-v11";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (name) =>
                name.startsWith("origon58-cache-") &&
                name !== CACHE_NAME
            )
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestURL = new URL(event.request.url);

  if (requestURL.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            if (
              response &&
              response.ok &&
              response.type === "basic"
            ) {
              const responseToCache = response.clone();

              caches.open(CACHE_NAME)
                .then((cache) =>
                  cache.put(event.request, responseToCache)
                )
                .catch(() => {});
            }

            return response;
          });
      })
      .catch(() => {
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }

        return Response.error();
      })
  );
});

self.addEventListener("message", (event) => {
  if (
    event.data &&
    event.data.type === "SKIP_WAITING"
  ) {
    self.skipWaiting();
  }
});
