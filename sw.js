const CACHE = 'tibbi-v18';
const ASSETS = ['categories/hospital/','audio/pharmacy/elevenlabs-2026-10-02-07-50-00.mp3','audio/pharmacy/elevenlabs-2026-10-02-07-49-23.mp3','audio/pharmacy/elevenlabs-2026-10-02-07-49-08.mp3','audio/pharmacy/elevenlabs-2026-10-02-07-48-50.mp3','audio/pharmacy/elevenlabs-2026-10-02-07-48-32.mp3','audio/pharmacy/elevenlabs-2026-10-02-07-48-17.mp3','audio/pharmacy/elevenlabs-2026-10-02-07-48-02.mp3','audio/pharmacy/elevenlabs-2026-10-02-07-47-31.mp3','audio/pharmacy/elevenlabs-2026-10-02-07-47-07.mp3','audio/pharmacy/elevenlabs-2026-10-02-07-46-45.mp3','audio/pharmacy/elevenlabs-2026-10-02-07-46-27.mp3','audio/pharmacy/elevenlabs-2026-10-02-07-46-10.mp3','audio/pharmacy/elevenlabs-2026-10-02-07-45-47.mp3','audio/pharmacy/elevenlabs-2026-10-02-07-52-39.mp3','audio/pharmacy/elevenlabs-2026-10-02-07-44-01.mp3','./','index.html','blood.html','categories/blood/','categories/doctor/','categories/pharmacy/','audio/doctor/doktor.mp3','audio/doctor/doktora.mp3','audio/doctor/tabib.mp3','audio/doctor/tabiba.mp3','audio/doctor/mumarrida.mp3','audio/doctor/mumarrid.mp3','audio/doctor/marid.mp3','audio/doctor/fahes.mp3','audio/doctor/sammaet-it-tabib.mp3','audio/doctor/daght-dam.mp3','audio/doctor/jihaaz-daght.mp3','audio/doctor/nabd.mp3','audio/doctor/harara.mp3','audio/doctor/mizan-harara.mp3','audio/doctor/waja.mp3','audio/doctor/nafas.mp3','audio/doctor/kihha.mp3','audio/doctor/baten.mp3','style.css','app.js','manifest.json','icon.svg','icon-192.png','icon-512.png','audio/blood/fahas-dam.mp3','audio/blood/saheb-dam.mp3','audio/blood/dam.mp3','audio/blood/warid.mp3','audio/blood/ibra.mp3','audio/blood/ibrat-farashe.mp3','audio/blood/ribaat-daaghet.mp3','audio/blood/unboob-tahleel.mp3','audio/blood/ayynet-dam.mp3','audio/blood/kfoof.mp3','audio/blood/mashat-kuhool.mp3','audio/blood/shaash.mp3','audio/blood/lazga-tibbiye.mp3','audio/blood/mukhtabar.mp3','audio/blood/hawyet-il-adawaat-il-haadde.mp3'];
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache =>
    Promise.allSettled(ASSETS.map(path => cache.add(path)))
  ));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys
      .filter(key => key.startsWith('tibbi-') && key !== CACHE)
      .map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const isAudio = new URL(request.url).pathname.endsWith('.mp3');
    if (isAudio) {
      const recording = await cache.match(request);
      if (recording) return recording;
    }
    try {
      const response = await fetch(request);
      if (response.ok && response.status === 200 && !request.headers?.has('range')) {
        event.waitUntil(cache.put(request, response.clone()).catch(() => {}));
      }
      return response;
    } catch {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const home = await cache.match('index.html');
        if (home) return home;
      }
      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});
