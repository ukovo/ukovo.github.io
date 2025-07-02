const API_DOMAINS = [
  'https://pigeonpig.github.io',
  'https://flow-l95ei0m8.maozi.io',
  'https://wx-api-deno.onmicrosoft.cn',
  'https://art.valetzx.ip-ddns.com',
  'https://wxpig.netlify.app',
];
const CACHE_NAME = 'swMain-cache-v2';
const CACHE_DOMAINS = [
  'https://images.weserv.nl',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  
  // Skip the worker script itself
  if (url.pathname.endsWith('/sw.js')) return;
  
  // Handle both same-origin and specific external requests with caching
  if (url.origin === location.origin || CACHE_DOMAINS.includes(url.origin)) {
    e.respondWith(fetchWithCache(e.request));
  } else {
    // For other external requests, just fetch without caching
    e.respondWith(fetch(e.request));
  }
});

async function fetchWithCache(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  // Return cached response if available
  if (cached) return cached;
  
  try {
    let response;
    const url = new URL(request.url);
    
    // Use fastest fetch for same-origin requests, normal fetch for external
    if (url.origin === location.origin) {
      response = await fetchFastest(request);
    } else {
      response = await fetch(request);
    }
    
    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return cached || new Response('fetch error', { status: 502 });
  }
}

function fetchFastest(request) {
  const url = new URL(request.url);
  let path = url.pathname;
  if (path === '/') {
    path = '/index.html';
  } 
  path += url.search;
  
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
            if (count === API_DOMAINS.length && !finished) {
              reject(new Error('all failed'));
            }
          }
        })
        .catch(err => {
          count++;
          if (count === API_DOMAINS.length && !finished) reject(err);
        });
    });
  });
}