// Promoted-post detection across inputs, re-renders, settings, and the extension going away.
// Stays in Playwright: the stylesheet that hides a marked card, and hiding before paint.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWorld } = require('./harness');

const MARK = 'data-lio-promoted';
const FIXTURE_PROMOTED = ['post-german', 'post-promoted', 'post-sponsor'];
const noErrors = w => assert.deepEqual(w.errors.map(e => e.stack || String(e)), []);
const marked = tab => tab.$$(`[${MARK}]`).map(e => e.id).sort();
const enabledWorld = () => createWorld({ storage: { promoted: true } });

let nextCard = 100;
function addCard(tab, paragraphs, parent = tab.$('#feed-list')) {
  const doc = tab.document;
  const wrap = doc.createElement('div');
  wrap.setAttribute('data-lazy-mount-id', String(nextCard));
  const card = wrap.appendChild(doc.createElement('div'));
  card.id = `card-${nextCard}`;
  card.setAttribute('role', 'listitem');
  card.setAttribute('componentkey', `update-card-focus-${nextCard++}`);
  for (const text of paragraphs) card.appendChild(doc.createElement('p')).textContent = text;
  parent.append(wrap);
  return card;
}

test('by default nothing is marked until the user enables the switch', async () => {
  const w = createWorld();
  const tab = await w.open();
  assert.deepEqual(marked(tab), []);
  assert.equal(tab.message({ type: 'lio-promoted-count' }), null);
  await w.set({ promoted: true });
  assert.deepEqual(marked(tab), FIXTURE_PROMOTED);
  noErrors(w);
});

test('on load, only the promoted cards are marked', async () => {
  const w = enabledWorld();
  const tab = await w.open();
  assert.deepEqual(marked(tab), FIXTURE_PROMOTED);
  noErrors(w);
});

test('every label in the list is detected in a real card', async () => {
  const w = enabledWorld();
  const tab = await w.open();
  const labels = tab.json('[...LIO_PROMOTED_LABELS]');
  assert.ok(labels.length >= 15);
  const cards = labels.map(label => [label, addCard(tab, ['Brand', 'Followers', label])]);
  await w.flush();
  for (const [label, card] of cards) assert.ok(card.hasAttribute(MARK), label);
  noErrors(w);
});

test('a label followed by a sponsor name is detected in each form', async () => {
  const w = enabledWorld();
  const tab = await w.open();
  const prefixes = tab.json('LIO_PROMOTED_PREFIXES');
  const cards = prefixes.flatMap(p => [[p, addCard(tab, ['Person', `${p}Example`])], [p.trim(), addCard(tab, ['Person', p.trim()])]]);
  await w.flush();
  for (const [label, card] of cards) assert.ok(card.hasAttribute(MARK), label);
  noErrors(w);
});

test('a card whose label arrives after the card is still marked', async () => {
  const w = enabledWorld();
  const tab = await w.open();
  const card = addCard(tab, ['Brand']);
  await w.flush();
  assert.equal(card.hasAttribute(MARK), false);
  const p = card.appendChild(tab.document.createElement('p'));
  p.appendChild(tab.document.createElement('span')).textContent = 'Promoted';
  await w.flush();
  assert.equal(card.hasAttribute(MARK), true);
  noErrors(w);
});

test('a card LinkedIn re-renders without the label is released', async () => {
  const w = enabledWorld();
  const tab = await w.open();
  const card = addCard(tab, ['Brand', 'Promoted']);
  await w.flush();
  assert.equal(card.hasAttribute(MARK), true);
  card.querySelectorAll('p')[1].remove();
  await w.flush();
  assert.equal(card.hasAttribute(MARK), false);
  noErrors(w);
});

test('only the first six paragraphs are compared', async () => {
  const w = enabledWorld();
  const tab = await w.open();
  const filler = ['a', 'b', 'c', 'd', 'e'];
  const sixth = addCard(tab, [...filler, 'Promoted']);
  const seventh = addCard(tab, [...filler, 'f', 'Promoted']);
  await w.flush();
  assert.equal(sixth.hasAttribute(MARK), true);
  assert.equal(seventh.hasAttribute(MARK), false);
  noErrors(w);
});

test('ordinary post text is not mistaken for a label', async () => {
  const w = enabledWorld();
  const tab = await w.open();
  const texts = ['promoted', 'I got promoted today', 'Promoted to senior engineer', 'Gesponsert wurde das nicht',
    `Promoted by ${'x'.repeat(100)}`];
  const cards = texts.map(text => addCard(tab, ['Author', text]));
  await w.flush();
  for (const card of cards) assert.equal(card.hasAttribute(MARK), false, card.textContent);
  noErrors(w);
});

test('a card outside the Home feed list is left alone', async () => {
  const w = enabledWorld();
  const tab = await w.open();
  const card = addCard(tab, ['Brand', 'Promoted'], tab.$('#center'));
  await w.flush();
  assert.equal(card.hasAttribute(MARK), false);
  assert.equal(tab.$('#post-outside').hasAttribute(MARK), false);
  noErrors(w);
});

test('switched off at load: nothing is marked, and switching on marks the cards', async () => {
  const w = createWorld({ storage: { promoted: false } });
  const tab = await w.open();
  assert.deepEqual(marked(tab), []);
  await w.set({ promoted: true });
  assert.deepEqual(marked(tab), FIXTURE_PROMOTED);
  noErrors(w);
});

test('switched off: marks are removed and new cards are not checked', async () => {
  const w = enabledWorld();
  const tab = await w.open();
  await w.set({ promoted: false });
  assert.deepEqual(marked(tab), []);
  const card = addCard(tab, ['Brand', 'Promoted']);
  await w.flush();
  assert.equal(card.hasAttribute(MARK), false);
  noErrors(w);
});

test('slow storage: nothing is marked until a stored "on" arrives', async () => {
  const w = enabledWorld();
  w.latency.get = 500;
  const tab = await w.open();
  assert.deepEqual(marked(tab), []);
  await w.advance(500);
  assert.deepEqual(marked(tab), FIXTURE_PROMOTED);
  noErrors(w);
});

test('the only change to a promoted card is the marker attribute', async () => {
  const w = enabledWorld();
  const tab = await w.open();
  const card = tab.$('#post-promoted');
  assert.deepEqual([...card.attributes].map(a => a.name).sort(), ['componentkey', MARK, 'id', 'role'].sort());
  assert.equal(card.querySelectorAll('p').length, 3);
  assert.equal(w.counts.writes, 0);
  noErrors(w);
});

const countMessage = { type: 'lio-promoted-count' };

test('the count follows the cards blocked on the page', async () => {
  const w = enabledWorld();
  const tab = await w.open();
  assert.equal(tab.message(countMessage), 3);
  const card = addCard(tab, ['Brand', 'Promoted']);
  await w.flush();
  assert.equal(tab.message(countMessage), 4);
  card.parentElement.remove();
  assert.equal(tab.message(countMessage), 3);
  noErrors(w);
});

test('the count is null while switched off, and returns when switched on', async () => {
  const w = enabledWorld();
  const tab = await w.open();
  await w.set({ promoted: false });
  assert.equal(tab.message(countMessage), null);
  await w.set({ promoted: true });
  assert.equal(tab.message(countMessage), 3);
  noErrors(w);
});

test('the count is null away from Home', async () => {
  const w = enabledWorld();
  const tab = await w.open();
  await tab.go('/jobs/');
  assert.equal(tab.message(countMessage), null);
  noErrors(w);
});

test('a Home feed with no promoted posts counts 0', async () => {
  const w = enabledWorld();
  const tab = await w.open();
  tab.$$(`[${MARK}]`).forEach(card => card.parentElement.remove());
  await w.flush();
  assert.equal(tab.message(countMessage), 0);
  noErrors(w);
});

test('the count is not given to another sender or for another message', async () => {
  const w = enabledWorld();
  const tab = await w.open();
  assert.equal(tab.message(countMessage, { id: 'another-extension' }), undefined);
  assert.equal(tab.message({ type: 'something-else' }), undefined);
  assert.equal(tab.message(null), undefined);
  noErrors(w);
});

test('when the extension goes away, marks are removed and watching stops', async () => {
  const w = enabledWorld();
  const tab = await w.open();
  tab.disableExtension();
  await w.advance(2000);
  assert.deepEqual(marked(tab), []);
  const card = addCard(tab, ['Brand', 'Promoted']);
  await w.flush();
  assert.equal(card.hasAttribute(MARK), false);
  noErrors(w);
});
