const BASE_PATH = '/shreevidhya-erp';   // GitHub Pages subdirectory
const CACHE_NAME = 'shreevidhya-v2';

// Precached resources (use the base path)
const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/ShreeVidhyalight.png`,
  `${BASE_PATH}/ShreeVidhyaDark.png`,
  // Add other static assets if needed (fonts, etc.)
];

// Install event – precache the above URLs
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event – clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch event – serve cached files, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached response if found, otherwise fetch from network
        return cachedResponse || fetch(event.request);
      })
  );
});