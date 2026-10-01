const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function worker(network) {
  const handlers = {}, saved = new Map();
  const cache = {
    match: async request => saved.get(typeof request === 'string' ? request : request.url),
    put: async (request, response) => saved.set(typeof request === 'string' ? request : request.url, response),
    add: async url => { if (url.includes('doktor.mp3')) throw Error('unavailable'); saved.set(url, new Response('cached')); },
    addAll: async urls => { for (const url of urls) await cache.add(url); }
  };
  vm.runInNewContext(fs.readFileSync('sw.js', 'utf8'), {
    self: { location: { origin: 'https://example.com' }, registration: { scope: 'https://example.com/' }, addEventListener: (name, fn) => handlers[name] = fn, skipWaiting() {}, clients: { claim: async () => {} } },
    caches: { open: async () => cache, match: cache.match, keys: async () => [], delete: async () => true },
    fetch: network, URL, Response, console
  });
  return { handlers, saved, cache };
}

test('online navigation receives fresh content instead of stale cache', async () => {
  const w = worker(async () => new Response('new'));
  const request = { url: 'https://example.com/categories/doctor/', method: 'GET', mode: 'navigate', destination: 'document' };
  w.saved.set(request.url, new Response('old'));
  let response; const jobs = [];
  w.handlers.fetch({ request, respondWith: p => response = p, waitUntil: p => jobs.push(p) });
  assert.equal(await (await response).text(), 'new');
  await Promise.all(jobs);
});

test('offline missing audio does not receive HTML fallback', async () => {
  const w = worker(async () => { throw Error('offline'); });
  w.saved.set('./index.html', new Response('<html>home</html>'));
  const request = { url: 'https://example.com/audio/missing.mp3', method: 'GET', mode: 'cors', destination: 'audio' };
  let response;
  w.handlers.fetch({ request, respondWith: p => response = p, waitUntil() {} });
  const result = await response;
  assert.equal(result.status, 503);
  assert.doesNotMatch(await result.text(), /<html>/);
});

test('one unavailable recording does not block all offline assets', async () => {
  const w = worker(async () => new Response('asset'));
  let installation;
  w.handlers.install({ waitUntil: p => installation = p });
  await installation;
  assert.ok(w.saved.size > 10);
});
