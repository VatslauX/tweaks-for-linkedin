// The current LinkedIn tab, across real page loads and in-app navigation.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWorld } = require('./harness');

const noErrors = w => assert.deepEqual(w.errors.map(e => e.stack || String(e)), []);

test('each LinkedIn tab is published on load', async () => {
  const pages = [['feed', '/feed/', 'home'], ['network', '/mynetwork/grow/', 'network'], ['jobs', '/jobs/', 'jobs'],
    ['messaging', '/messaging/thread/1/', 'messaging'], ['notifications', '/notifications/', 'notifications']];
  const w = createWorld();
  for (const [fixture, url, expected] of pages) {
    const tab = await w.open({ fixture, url });
    assert.equal(tab.currentTab(), expected, url);
    tab.close();
  }
  noErrors(w);
});

test('in-app navigation updates the tab, and a non-tab page clears it', async () => {
  const w = createWorld();
  const tab = await w.open();
  await tab.go('/jobs/search/');
  assert.equal(tab.currentTab(), 'jobs');
  await tab.go('/in/someone/');
  assert.equal(tab.currentTab(), null);
  await tab.go('/feed/');
  assert.equal(tab.currentTab(), 'home');
  noErrors(w);
});

test('the page tells the extension it is active, with no page data', async () => {
  const w = createWorld();
  const tab = await w.open();
  assert.ok(tab.sent.length >= 1);
  const afterLoad = tab.sent.length; // a normal load also fires pageshow, and repeating the signal is harmless
  tab.window.dispatchEvent(new tab.window.Event('pageshow'));
  assert.equal(tab.sent.length, afterLoad + 1);
  for (const message of tab.sent) assert.deepEqual(message, { type: 'lio-active-tab' });
  tab.disableExtension();
  tab.window.dispatchEvent(new tab.window.Event('pageshow'));
  assert.equal(tab.sent.length, afterLoad + 1);
  noErrors(w);
});

test('navigation keeps the stored settings', async () => {
  const w = createWorld({ storage: { puzzles: false } });
  const tab = await w.open();
  await tab.go('/mynetwork/');
  assert.deepEqual(tab.off(), ['puzzles', 'promoted', 'widen']);
  noErrors(w);
});
