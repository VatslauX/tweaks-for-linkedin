const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '../../extension/flags.js'), 'utf8');
const chrome = { runtime: { id: 'x' }, storage: { sync: { get: async () => ({}) }, onChanged: { addListener() {} } } };
const api = vm.runInNewContext(`${src}\n;({ LIO_TABS, LIO_TWEAKS, LIO_DEFAULTS, lioSanitize, lioBlocked, lioOff, lioTabFor, lioCleanCompanies })`, { chrome, setTimeout });
const plain = v => JSON.parse(JSON.stringify(v));
const ALL = plain(api.LIO_DEFAULTS);
const ALL_ON = Object.fromEntries(Object.keys(ALL).map(k => [k, true]));

test('registry: keys are unique, tabs exist, needs point at real tweaks', () => {
  const keys = api.LIO_TWEAKS.map(t => t.key);
  assert.strictEqual(new Set(keys).size, keys.length);
  const tabs = api.LIO_TABS.map(t => t.id);
  for (const t of api.LIO_TWEAKS) {
    assert.ok(tabs.includes(t.tab), t.key);
    assert.strictEqual(typeof t.on, 'boolean', t.key);
    for (const n of t.needs || []) assert.ok(keys.includes(n), `${t.key} needs ${n}`);
  }
});

test('registry: saved settings keep their keys', () => {
  for (const k of ['puzzles', 'premium', 'chatbar', 'wide', 'promoted', 'follow', 'ad', 'footer', 'widen']) assert.ok(k in ALL, k);
});

test('registry: Block promoted is the only tweak off by default', () => {
  assert.deepStrictEqual(Object.keys(ALL).filter(k => !ALL[k]), ['promoted']);
  assert.strictEqual(api.lioOff(ALL), 'promoted');
});

test('sanitize: malformed input falls back to the defaults', () => {
  for (const bad of [null, undefined, 'x', 7]) assert.deepStrictEqual(plain(api.lioSanitize(bad)), ALL);
  assert.deepStrictEqual(plain(api.lioSanitize({ puzzles: 'no', footer: 0, extra: true })), ALL);
});

test('sanitize: keeps valid booleans', () => {
  assert.deepStrictEqual(plain(api.lioSanitize({ ad: false })), { ...ALL, ad: false });
});

test('blocked: a layout tweak waits for everything it needs', () => {
  const widen = api.LIO_TWEAKS.find(t => t.key === 'widen');
  assert.strictEqual(api.lioBlocked(widen, ALL), false);
  assert.strictEqual(api.lioBlocked(widen, { ...ALL, ad: false }), true);
  assert.strictEqual(api.lioBlocked(api.LIO_TWEAKS.find(t => t.key === 'ad'), ALL), false);
});

test('off: nothing is listed while every tweak is on', () => {
  assert.strictEqual(api.lioOff(ALL_ON), '');
});

test('off: a switched-off block is listed and blocks the layout tweak that needs it', () => {
  assert.strictEqual(api.lioOff({ ...ALL_ON, follow: false, footer: false }), 'footer wide follow widen');
});

test('off: a layout tweak can be off on its own', () => {
  assert.strictEqual(api.lioOff({ ...ALL_ON, widen: false }), 'widen');
});

test('companies: keeps usable names only, with limits', () => {
  for (const bad of [null, undefined, 'Acme', 7, {}]) assert.deepStrictEqual(plain(api.lioCleanCompanies(bad)), []);
  assert.deepStrictEqual(plain(api.lioCleanCompanies(['  Acme   Corp ', 'Acme Corp', 'x', '--', '', 7, 'y'.repeat(61), 'C++'])), ['Acme Corp', 'C++']);
  assert.strictEqual(api.lioCleanCompanies(Array.from({ length: 15 }, (_, i) => `Company ${i}`)).length, 10);
});

test('tabFor: maps LinkedIn paths to tabs by first segment', () => {
  const cases = { '/feed/': 'home', '/mynetwork/grow/': 'network', '/jobs/': 'jobs', '/jobs/search/': 'jobs',
    '/messaging/thread/1/': 'messaging', '/notifications/': 'notifications', '/': '', '/in/someone/': '', '/jobsearch/': '' };
  for (const [p, tab] of Object.entries(cases)) assert.strictEqual(api.lioTabFor(p), tab, p);
});
