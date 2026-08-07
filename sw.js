// Felicity Empire Admin — Service Worker
const CACHE_NAME = 'felicity-admin-v1';
const ASSETS = [
    '/brand/admin/index.html',
    '/brand/admin/products.html',
    '/brand/admin/orders.html',
    '/brand/admin/appointments.html',
    '/brand/admin/customers.html',
    '/brand/admin/categories.html',
    '/brand/admin/gallery.html',
    '/brand/admin/videos.html',
    '/brand/admin/reviews.html',
    '/brand/admin/notifications.html',
    '/brand/admin/analytics.html',
    '/brand/admin/qr-code.html',
    '/brand/admin/settings.html',
    '/brand/admin/profile.html',
    '/assets/css/admin.css',
    '/assets/js/admin.js',
];

// Install
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cached) => {
            return cached || fetch(event.request);
        })
    );
});