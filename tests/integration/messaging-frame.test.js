// The one style the top-frame script keeps in LinkedIn's same-origin Messaging frame.
// Stays in Playwright: whether that style hides the blocks and changes the width.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWorld } = require('./harness');

const noErrors = w => assert.deepEqual(w.errors.map(e => e.stack || String(e)), []);
const styles = frame => [...frame.contentDocument.querySelectorAll('style')];
const css = frame => styles(frame).map(s => s.textContent).join('\n');

function addFrame(tab, src = '/preload/?_bprMode=test') {
  const frame = tab.document.createElement('iframe');
  frame.setAttribute('src', src);
  tab.document.body.append(frame);
  // jsdom doesn't load frames, so their document starts empty
  const doc = frame.contentDocument;
  if (!doc.documentElement) doc.append(doc.createElement('html'));
  if (!doc.head) doc.documentElement.append(doc.createElement('head'));
  return frame;
}

test('a Messaging frame added after load gets one style with every rule', async () => {
  const w = createWorld();
  const tab = await w.open({ fixture: 'jobs', url: '/jobs/' });
  const frame = addFrame(tab);
  await w.flush();
  assert.equal(styles(frame).length, 1);
  for (const hook of ['section:has(> iframe)', 'about.linkedin.com', 'msg-overlay-list-bubble', 'grid-template-columns']) {
    assert.ok(css(frame).includes(hook), hook);
  }
  noErrors(w);
});

test('the frame style follows the switches, including a layout tweak they block', async () => {
  const w = createWorld();
  const tab = await w.open({ fixture: 'jobs', url: '/jobs/' });
  const frame = addFrame(tab);
  await w.flush();
  await w.set({ ad: false });
  assert.ok(!css(frame).includes('section:has(> iframe)'));
  assert.ok(!css(frame).includes('grid-template-columns'), 'the width needs the banner hidden');
  assert.ok(css(frame).includes('about.linkedin.com'));
  await w.set({ ad: true, chatbar: false });
  assert.ok(css(frame).includes('section:has(> iframe)'));
  assert.ok(!css(frame).includes('msg-overlay-list-bubble'));
  noErrors(w);
});

test('the style returns when the frame loads a new document', async () => {
  const w = createWorld();
  const tab = await w.open({ fixture: 'jobs', url: '/jobs/' });
  const frame = addFrame(tab);
  await w.flush();
  frame.contentDocument.head.replaceChildren();
  frame.dispatchEvent(new tab.window.Event('load'));
  await w.flush();
  assert.equal(styles(frame).length, 1);
  noErrors(w);
});

test('a frame LinkedIn replaces gets the style', async () => {
  const w = createWorld();
  const tab = await w.open({ fixture: 'jobs', url: '/jobs/' });
  addFrame(tab).remove();
  await w.flush();
  const next = addFrame(tab);
  await w.flush();
  assert.equal(styles(next).length, 1);
  noErrors(w);
});

test('other frames are left alone', async () => {
  const w = createWorld();
  const tab = await w.open({ fixture: 'jobs', url: '/jobs/' });
  const other = addFrame(tab, '/ads/banner/');
  await w.advance(2000);
  assert.equal(styles(other).length, 0);
  noErrors(w);
});

test('when the extension goes away, the frame style stops applying', async () => {
  const w = createWorld();
  const tab = await w.open({ fixture: 'jobs', url: '/jobs/' });
  const frame = addFrame(tab);
  await w.flush();
  tab.disableExtension();
  await w.advance(2000);
  assert.equal(css(frame), '');
  noErrors(w);
});
