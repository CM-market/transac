/**
 * Enhanced Service Worker for Transac Offline Functionality
 * Implements intelligent caching strategies and background sync
 */

// Workbox manifest injection point
const manifest = self.__WB_MANIFEST || [];

const CACHE_VERSION = 'v1.2.0';
const CACHE_NAMES = {
  STATIC: `transac-static-${CACHE_VERSION}`,
  API: `transac-api-${CACHE_VERSION}`,
  IMAGES: `transac-images-${CACHE_VERSION}`,
  PAGES: `transac-pages-${CACHE_VERSION}`
};

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

const API_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const IMAGE_CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
const STATIC_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAMES.STATIC)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        const validCacheNames = Object.values(CACHE_NAMES);
        
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!validCacheNames.includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Determine caching strategy based on request type
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request));
  } else if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(request));
  } else if (isPageRequest(url)) {
    event.respondWith(handlePageRequest(request));
  } else {
    // Default network-first strategy
    event.respondWith(handleNetworkFirst(request));
  }
});

// Check if request is for static assets
function isStaticAsset(url) {
  return url.pathname.includes('/static/') ||
         url.pathname.includes('/assets/') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.woff2') ||
         url.pathname.includes('/icons/');
}

// Check if request is for API
function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

// Check if request is for images
function isImageRequest(url) {
  return url.pathname.includes('/images/') ||
         url.pathname.includes('/uploads/') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.jpeg') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.gif') ||
         url.pathname.endsWith('.webp') ||
         url.pathname.endsWith('.svg');
}

// Check if request is for pages
function isPageRequest(url) {
  return url.pathname === '/' ||
         url.pathname.startsWith('/seller-dashboard') ||
         url.pathname.startsWith('/products') ||
         url.pathname.startsWith('/stores');
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(CACHE_NAMES.STATIC);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isExpired(cachedResponse, STATIC_CACHE_DURATION)) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Static asset fetch failed:', error);
    const cache = await caches.open(CACHE_NAMES.STATIC);
    return cache.match(request) || new Response('Asset not available offline', { status: 404 });
  }
}

// Handle API requests with network-first, cache fallback
async function handleApiRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAMES.API);
      const responseToCache = networkResponse.clone();
      
      // Add timestamp header for cache management
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-at', Date.now().toString());
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      await cache.put(request, modifiedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for API request, trying cache:', request.url);
    
    const cache = await caches.open(CACHE_NAMES.API);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isExpired(cachedResponse, API_CACHE_DURATION)) {
      // Add offline indicator header
      const headers = new Headers(cachedResponse.headers);
      headers.set('x-served-from-cache', 'true');
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers
      });
    }
    
    return new Response(JSON.stringify({ 
      error: 'Data not available offline',
      offline: true 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle images with cache-first strategy
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(CACHE_NAMES.IMAGES);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isExpired(cachedResponse, IMAGE_CACHE_DURATION)) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Image fetch failed, trying cache:', request.url);
    const cache = await caches.open(CACHE_NAMES.IMAGES);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return placeholder image for offline
    return new Response('', { status: 404 });
  }
}

// Handle page requests with network-first, cache fallback
async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAMES.PAGES);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Page fetch failed, trying cache:', request.url);
    
    const cache = await caches.open(CACHE_NAMES.PAGES);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to index.html for SPA routes
    const indexResponse = await cache.match('/');
    if (indexResponse) {
      return indexResponse;
    }
    
    return new Response('Page not available offline', { 
      status: 404,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Default network-first strategy
async function handleNetworkFirst(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.log('[SW] Network request failed:', request.url);
    return new Response('Resource not available offline', { status: 404 });
  }
}

// Check if cached response is expired
function isExpired(response, maxAge) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return false;
  
  const age = Date.now() - parseInt(cachedAt);
  return age > maxAge;
}

// Background sync for queued actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'transac-sync') {
    event.waitUntil(performBackgroundSync());
  }
});

// Perform background sync
async function performBackgroundSync() {
  try {
    console.log('[SW] Performing background sync...');
    
    // Notify main thread to perform sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        action: 'PERFORM_SYNC'
      });
    });
    
    console.log('[SW] Background sync completed');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error;
  }
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, action } = event.data;
  
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (type === 'CACHE_URLS') {
    event.waitUntil(cacheUrls(event.data.urls));
  } else if (type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  }
});

// Cache specific URLs
async function cacheUrls(urls) {
  try {
    const cache = await caches.open(CACHE_NAMES.API);
    await cache.addAll(urls);
    console.log('[SW] URLs cached successfully:', urls);
  } catch (error) {
    console.error('[SW] Failed to cache URLs:', error);
  }
}

// Clear all caches
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('[SW] All caches cleared');
  } catch (error) {
    console.error('[SW] Failed to clear caches:', error);
  }
}

// Periodic cache cleanup
setInterval(async () => {
  try {
    await cleanupExpiredEntries();
  } catch (error) {
    console.error('[SW] Cache cleanup failed:', error);
  }
}, 60 * 60 * 1000); // Run every hour

// Clean up expired cache entries
async function cleanupExpiredEntries() {
  const cacheConfigs = [
    { name: CACHE_NAMES.API, maxAge: API_CACHE_DURATION },
    { name: CACHE_NAMES.IMAGES, maxAge: IMAGE_CACHE_DURATION },
    { name: CACHE_NAMES.STATIC, maxAge: STATIC_CACHE_DURATION }
  ];
  
  for (const config of cacheConfigs) {
    try {
      const cache = await caches.open(config.name);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response && isExpired(response, config.maxAge)) {
          await cache.delete(request);
          console.log('[SW] Cleaned up expired entry:', request.url);
        }
      }
    } catch (error) {
      console.error(`[SW] Failed to cleanup cache ${config.name}:`, error);
    }
  }
}

console.log('[SW] Service worker script loaded');
