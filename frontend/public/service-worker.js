// BlockEdu Service Worker — Online-only PWA (no offline cache)
const CACHE_NAME = 'blockedu-v1';

// Install — skip waiting
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — network only (online-only PWA)
self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});
