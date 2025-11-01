/* eslint-env serviceworker */

const version = __SERVICE_WORKER_VERSION__;
const CACHE = "cache-only-" + version;

async function precache() {
    const filesToCache = self.__WB_MANIFEST.map((e) => e.url);
    const cache = await caches.open(CACHE);
    return await cache.addAll([
        "./",
        ...filesToCache
    ]);
}

const deleteCache = async (key) => {
    await caches.delete(key);
};

const deleteOldCaches = async () => {
    const keyList = await caches.keys();
    const cachesToDelete = keyList.filter((key) => CACHE !== key);
    await Promise.all(cachesToDelete.map(deleteCache));
};

const deleteAndClaim = async () => {
    await deleteOldCaches();
    await self.clients.claim();
};

async function fromCache(request) {
    const cache = await caches.open(CACHE);
    const matching = await cache.match(request, { ignoreSearch: true });
    if (matching) {
        return matching;
    }
    throw new Error("request-not-in-cache");
}

function networkOrCache(request) {
    return fetch(request).then((response) => {
        if (response.ok) {
            return response;
        }
        return fromCache(request);
    })
        .catch(() => fromCache(request));
}

self.addEventListener("install", (evt) => {
    evt.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
    event.waitUntil(deleteAndClaim());
});

self.addEventListener("fetch", (evt) => {
    evt.respondWith(networkOrCache(evt.request));
});
