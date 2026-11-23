// The floating Messaging bar's style inside LinkedIn's open shadow root.
// Stays in Playwright: whether that style actually hides the bar.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWorld } = require('./harness');

const noErrors = w => assert.deepEqual(w.errors.map(e => e.stack || String(e)), []);
const barStyles = host => [...host.shadowRoot.querySelectorAll('style')];

function replaceHost(tab) {
  tab.$('#interop-outlet').remove();
  const host = tab.document.createElement('div');
  host.id = 'interop-outlet';
  host.attachShadow({ mode: 'open' });
  tab.document.body.append(host);
  return host;
}

test('one style is added to the shadow root when its host appears', async () => {
  const w = createWorld();
  const tab = await w.open();
  const styles = barStyles(tab.$('#interop-outlet'));
  assert.equal(styles.length, 1);
  assert.match(styles[0].textContent, /msg-overlay-list-bubble/);
  noErrors(w);
});

test('the switch empties the style and fills it again', async () => {
  const w = createWorld();
  const tab = await w.open();
  const [style] = barStyles(tab.$('#interop-outlet'));
  await w.set({ chatbar: false });
  assert.equal(style.textContent, '');
  await w.set({ chatbar: true });
  assert.match(style.textContent, /msg-overlay-list-bubble/);
  noErrors(w);
});

test('a host LinkedIn replaces gets the style within 2 s', async () => {
  const w = createWorld();
  const tab = await w.open();
  const host = replaceHost(tab);
  await w.advance(2000);
  assert.equal(barStyles(host).length, 1);
  noErrors(w);
});

test('the Messaging tab, which has no shadow host, runs without errors', async () => {
  const w = createWorld();
  const tab = await w.open({ fixture: 'messaging', url: '/messaging/' });
  await w.advance(4000);
  assert.equal(tab.$('#interop-outlet'), null);
  noErrors(w);
});

test('when the extension goes away, the style stops hiding the bar', async () => {
  const w = createWorld();
  const tab = await w.open();
  const [style] = barStyles(tab.$('#interop-outlet'));
  tab.disableExtension();
  await w.advance(2000);
  assert.equal(style.textContent, '');
  noErrors(w);
});
