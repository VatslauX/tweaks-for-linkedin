// Settings across the real scripts: stored values, live changes, failed reads, and the extension going away.
// Stays in Playwright: the popup UI and what the stylesheets do with the flags.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWorld } = require('./harness');

const noErrors = w => assert.deepEqual(w.errors.map(e => e.stack || String(e)), []);

test('with nothing stored, every tweak applies except Block promoted', async () => {
  const w = createWorld();
  const tab = await w.open();
  assert.deepEqual(tab.off(), ['promoted']);
  noErrors(w);
});

test('a stored choice reaches the page, along with the layout tweak it blocks', async () => {
  const w = createWorld({ storage: { follow: false } });
  const tab = await w.open();
  assert.deepEqual(tab.off(), ['promoted', 'follow', 'widen']);
  noErrors(w);
});

test('malformed stored values fall back to the defaults', async () => {
  const w = createWorld({ storage: { ad: 'no', footer: 0, puzzles: null, unknown: false } });
  const tab = await w.open();
  assert.deepEqual(tab.off(), ['promoted']);
  noErrors(w);
});

test('a change from the popup reaches every open tab', async () => {
  const w = createWorld();
  const feed = await w.open();
  const jobs = await w.open({ fixture: 'jobs', url: '/jobs/' });
  await w.set({ ad: false });
  assert.deepEqual(feed.off(), ['ad', 'wide', 'promoted', 'widen']);
  assert.deepEqual(jobs.off(), ['ad', 'wide', 'promoted', 'widen']);
  noErrors(w);
});

test('slow storage: the defaults apply until the stored choices arrive', async () => {
  const w = createWorld({ storage: { footer: false } });
  w.latency.get = 500;
  const tab = await w.open();
  assert.deepEqual(tab.off(), ['promoted']);
  await w.advance(500);
  assert.deepEqual(tab.off(), ['footer', 'wide', 'promoted', 'widen']);
  noErrors(w);
});

test('a failed first read is retried after 1 s, then 2 s', async () => {
  const w = createWorld({ storage: { ad: false } });
  w.faults.get = true;
  const tab = await w.open();
  assert.equal(w.counts.reads, 1);
  assert.deepEqual(tab.off(), ['promoted']);
  await w.advance(1000);
  assert.equal(w.counts.reads, 2);
  await w.advance(1999);
  assert.equal(w.counts.reads, 2);
  w.faults.get = false;
  await w.advance(1);
  assert.equal(w.counts.reads, 3);
  assert.deepEqual(tab.off(), ['ad', 'wide', 'promoted', 'widen']);
  noErrors(w);
});

test('a failed later read keeps the last good settings', async () => {
  const w = createWorld({ storage: { puzzles: false } });
  const tab = await w.open();
  assert.deepEqual(tab.off(), ['puzzles', 'promoted', 'widen']);
  w.faults.get = true;
  await w.set({ footer: false });
  assert.deepEqual(tab.off(), ['puzzles', 'promoted', 'widen']);
  w.faults.get = false;
  await w.advance(1000);
  assert.deepEqual(tab.off(), ['footer', 'puzzles', 'wide', 'promoted', 'widen']);
  noErrors(w);
});

test('the flags come back when the page rewrites the html attributes', async () => {
  const w = createWorld({ storage: { puzzles: false } });
  const tab = await w.open();
  tab.document.documentElement.removeAttribute('data-lio-off');
  tab.document.documentElement.setAttribute('data-lio-tab', 'jobs');
  await w.flush();
  assert.deepEqual(tab.off(), ['puzzles', 'promoted', 'widen']);
  assert.equal(tab.currentTab(), 'home');
  noErrors(w);
});

test('when the extension goes away, every tweak is released within 2 s', async () => {
  const w = createWorld();
  const tab = await w.open();
  tab.disableExtension();
  await w.advance(2000);
  assert.deepEqual(tab.off(), tab.json('LIO_TWEAKS.map(t => t.key)'));
  noErrors(w);
});

test('the content scripts never write to storage', async () => {
  const w = createWorld({ storage: { ad: false } });
  const tab = await w.open();
  await tab.go('/jobs/');
  await w.advance(6000);
  assert.equal(w.counts.writes, 0);
  noErrors(w);
});
