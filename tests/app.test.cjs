const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('app.js', 'utf8');
function app(scriptUrl, cards = []) {
  const handlers = {}, registered = [];
  const search = { value: '', addEventListener(name, fn) { handlers['search-' + name] = fn; } };
  const status = { textContent: '' };
  vm.runInNewContext(source, {
    URL, console,
    document: {
      currentScript: { src: scriptUrl },
      getElementById: id => id === 'termSearch' ? search : id === 'searchStatus' ? status : null,
      querySelectorAll: selector => selector === '.term-card' ? cards : [],
      addEventListener() {}
    },
    window: { addEventListener: (name, fn) => handlers[name] = fn },
    navigator: { serviceWorker: { register: (url, options) => { registered.push({ url: String(url), options }); return Promise.resolve(); } } }
  });
  return { handlers, registered, search, status };
}
test('category entry registers the root service worker', () => {
  const a = app('https://example.com/app.js');
  a.handlers.load();
  assert.equal(a.registered[0].url, 'https://example.com/sw.js');
});
test('search finds vocalized Hebrew, Arabic alef variants and transcription', () => {
  const terms = ['בדיקת דם فحص دم פַחֶס דַם', 'מחט إبرة אִבְּרַה'];
  const cards = terms.map(text => ({ hidden: false, querySelector: () => ({ textContent: text }) }));
  const a = app('https://example.com/app.js', cards);
  for (const [query, index] of [['דם', 0], ['פחס', 0], ['ابرة', 1], ['אברה', 1]]) {
    a.search.value = query; a.handlers['search-input']();
    assert.equal(cards[index].hidden, false, query);
    assert.equal(cards[1 - index].hidden, true, query);
  }
  a.search.value = 'לאקיים'; a.handlers['search-input']();
  assert.ok(cards.every(card => card.hidden));
  a.search.value = ''; a.handlers['search-input']();
  assert.ok(cards.every(card => !card.hidden));
});
