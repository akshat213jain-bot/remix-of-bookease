/// <reference lib="webworker" />

const CACHE_NAME = "bookease-v1";
const OFFLINE_URL = "/offline.html";

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
    "/",
    "/index.html",
    "/offline.html",
    "/manifest.json",
];

// Install event - cache essential assets
self.addEventListener("install", (event: ExtendableEvent) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    // Force activation
    (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event: ExtendableEvent) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    // Take control immediately
    (self as unknown as ServiceWorkerGlobalScope).clients.claim();
});

// Fetch event - network-first with cache fallback
self.addEventListener("fetch", (event: FetchEvent) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== "GET") return;

    // Skip cross-origin requests
    if (url.origin !== location.origin) return;

    // API calls - network only
    if (url.pathname.startsWith("/api") || url.pathname.includes("supabase")) {
        return;
    }

    // Static assets - cache first
    if (
        url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)
    ) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return response;
                });
            })
        );
        return;
    }

    // HTML pages - network first, cache fallback
    event.respondWith(
        fetch(request)
            .then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                return response;
            })
            .catch(() => {
                return caches.match(request).then((cached) => {
                    return cached || caches.match(OFFLINE_URL);
                }) as Promise<Response>;
            })
    );
});

// Push notification handler
self.addEventListener("push", (event: PushEvent) => {
    const data = event.data?.json() || {};

    const options: NotificationOptions = {
        body: data.body || "You have a new notification",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        tag: data.tag || "default",
        data: data.url || "/",
        actions: data.actions || [],
    };

    event.waitUntil(
        (self as unknown as ServiceWorkerGlobalScope).registration.showNotification(
            data.title || "BookEase",
            options
        )
    );
});

// Notification click handler
self.addEventListener("notificationclick", (event: NotificationEvent) => {
    event.notification.close();

    const url = event.notification.data || "/";

    event.waitUntil(
        (self as unknown as ServiceWorkerGlobalScope).clients
            .matchAll({ type: "window" })
            .then((clients) => {
                // Focus existing window or open new
                for (const client of clients) {
                    if (client.url === url && "focus" in client) {
                        return client.focus();
                    }
                }
                return (self as unknown as ServiceWorkerGlobalScope).clients.openWindow(url);
            })
    );
});

export { };
