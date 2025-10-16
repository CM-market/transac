// Service Worker for PWA functionality
const CACHE_NAME = "cameroon-market-v1";
const STATIC_CACHE = "static-v1";
const DYNAMIC_CACHE = "dynamic-v1";
const OFFLINE_PAGE = "/offline.html";

// Assets to cache immediately
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",
  "/assets/logo.png",
  "/assets/placeholder.png",
  "/assets/icon-192x192.png",
  "/assets/icon-512x512.png",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      self.skipWaiting(), // Activate new service worker immediately
    ]),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
            .map((name) => caches.delete(name)),
        );
      }),
      self.clients.claim(), // Take control of all clients
    ]),
  );
});

// Fetch event - handle offline requests
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Handle API requests with stale-while-revalidate strategy
  if (request.url.includes("/api/")) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(request.url)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Handle HTML requests with network-first strategy
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(handleHtmlRequest(request));
    return;
  }

  // Default to network-first strategy for other requests
  event.respondWith(handleDefaultRequest(request));
});

// Check if the request is for a static asset
function isStaticAsset(url) {
  return (
    STATIC_ASSETS.some((asset) => url.endsWith(asset)) ||
    url.includes("/assets/") ||
    url.endsWith(".css") ||
    url.endsWith(".js")
  );
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    return new Response("Offline - Static asset not available", {
      status: 503,
    });
  }
}

// Handle HTML requests with network-first strategy
async function handleHtmlRequest(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return caches.match(OFFLINE_PAGE);
  }
}

// Handle API requests with stale-while-revalidate strategy
async function handleApiRequest(request) {
  const cachedResponse = await caches.match(request);

  // Return cached response immediately if available
  if (cachedResponse) {
    // Update cache in the background
    fetch(request)
      .then((response) => {
        if (response.ok) {
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, response);
          });
        }
      })
      .catch(() => {
        // Ignore fetch errors in background update
      });

    return cachedResponse;
  }

  // If no cache, try network
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response(
      JSON.stringify({
        message: "You are offline. Please check your internet connection.",
        data: [],
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// Handle default requests with network-first strategy
async function handleDefaultRequest(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response("Offline - Resource not available", { status: 503 });
  }
}

// Listen for messages from clients
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
