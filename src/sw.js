const version = __SERVICE_WORKER_VERSION__;
const SCOPE = self.registration.scope;
const CACHE = SCOPE + "-cache-only-" + version;

async function precache() {
    const filesToCache = self.__WB_MANIFEST.map((e) => e.url);
    const cache = await caches.open(CACHE);
    await cache.addAll([
        "./",
        ...filesToCache
    ]);
}

const deleteOldCaches = async () => {
    const keyList = await caches.keys();
    const toSave = (key) => key.startsWith(SCOPE) && CACHE !== key;
    const cachesToDelete = keyList.filter(toSave);
    const deleteCache = (key) => caches.delete(key);
    await Promise.all(cachesToDelete.map(deleteCache));
};

const deleteAndClaim = async () => {
    await deleteOldCaches();
    await self.clients.claim();
};

async function fromCache(request) {
    const cache = await caches.open(CACHE);
    const matching = await cache.match(request.url,
        {
            ignoreSearch: true,
            ignoreVary: true,
        });
    if (matching) {
        return matching;
    }
    // https://github.com/externalmemory/qarttext/blob/main/sw.js
    if (request.mode === "navigate") {
        return caches.match("./index.html");
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
