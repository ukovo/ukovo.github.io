const API_DOMAINS = [
  'https://wx-api-deno.onmicrosoft.cn',
  'https://pigeonpig.github.io',
  'https://flow-l95ei0m8.maozi.io',
];
const CACHE_NAME = 'swMain-cache-v1';
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME));
});
self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname === '/api/wx') {
    e.respondWith(fetchWithCache(e.request));
  }
});
async function fetchWithCache(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetchFastest(request);
    if (res.ok) {
      cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    return cached || new Response('fetch error', { status: 502 });
  }
}
function fetchFastest(request) {
  const url = new URL(request.url);
  const path = url.pathname + url.search;
  const controllers = API_DOMAINS.map(() => new AbortController());
  let finished = false;
  return new Promise((resolve, reject) => {
    let count = 0;
    API_DOMAINS.forEach((d, i) => {
      fetch(d + path, { signal: controllers[i].signal })
        .then(res => {
          if (!finished && res.ok) {
            finished = true;
            controllers.forEach((c, j) => { if (j !== i) c.abort(); });
            resolve(res);
          } else {
            count++;
            if (count === API_DOMAINS.length && !finished) reject(new Error('all failed'));
          }
        })
        .catch(err => {
          count++;
          if (count === API_DOMAINS.length && !finished) reject(err);
        });
    });
  });
}
