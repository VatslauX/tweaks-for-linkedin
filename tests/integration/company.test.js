// POC coverage for the Network company filter: matching, settings, navigation, and the extension going away.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWorld } = require('./harness');

const HIDE = 'data-lio-company-hide', KEEP = 'data-lio-company-keep';
const noErrors = w => assert.deepEqual(w.errors.map(e => e.stack || String(e)), []);
const hidden = tab => tab.$$(`[${HIDE}]`).map(e => e.id).sort();
const openGrow = async names => {
  const w = createWorld({ storage: names ? { lioCompanies: names } : {} });
  return { w, tab: await w.open({ fixture: 'network', url: '/mynetwork/grow/' }) };
};

let nextCard = 100;
function addCard(tab, headline) {
  const doc = tab.document;
  const wrap = doc.createElement('div');
  wrap.setAttribute('data-display-contents', '');
  const card = wrap.appendChild(doc.createElement('div'));
  card.id = `card-${nextCard++}`;
  card.setAttribute('role', 'listitem');
  const link = card.appendChild(doc.createElement('a'));
  link.href = `/in/person-${nextCard}/`;
  link.appendChild(doc.createElement('p')).textContent = 'Person';
  link.appendChild(doc.createElement('p')).textContent = headline;
  tab.$('#grow-list').append(wrap);
  return card;
}

test('only a current headline match is hidden, not a past job, name, mutual line, or longer word', async () => {
  const { w, tab } = await openGrow(['Acme Corp']);
  assert.deepEqual(hidden(tab), ['person-current']);
  noErrors(w);
});

test('with no names, nothing is marked', async () => {
  const { w, tab } = await openGrow();
  assert.deepEqual(hidden(tab), []);
  noErrors(w);
});

test('malformed stored names hide nothing', async () => {
  for (const names of ['Acme Corp', 7, [null, 7, 'x']]) {
    const { w, tab } = await openGrow(names);
    assert.deepEqual(hidden(tab), []);
    noErrors(w);
  }
});

test('names apply live, and removing them shows everyone', async () => {
  const { w, tab } = await openGrow(['Acme Corp']);
  await w.set({ lioCompanies: ['Globex'] }, 'local');
  assert.deepEqual(hidden(tab), ['person-other']);
  await w.set({ lioCompanies: [] }, 'local');
  assert.deepEqual(hidden(tab), []);
  noErrors(w);
});

test('the switch removes and restores the filter', async () => {
  const { w, tab } = await openGrow(['Acme Corp']);
  await w.set({ hideCompany: false });
  assert.deepEqual(hidden(tab), []);
  await w.set({ hideCompany: true });
  assert.deepEqual(hidden(tab), ['person-current']);
  noErrors(w);
});

test('leaving the Network tab clears the markers, and coming back restores them', async () => {
  const { w, tab } = await openGrow(['Acme Corp']);
  await tab.go('/feed/');
  assert.deepEqual(hidden(tab), []);
  await tab.go('/mynetwork/grow/');
  assert.deepEqual(hidden(tab), ['person-current']);
  noErrors(w);
});

test('a suggestion loaded later is checked', async () => {
  const { w, tab } = await openGrow(['Acme Corp']);
  const card = addCard(tab, 'Manager @ ACME corp');
  await w.flush();
  assert.equal(card.hasAttribute(HIDE), true);
  noErrors(w);
});

test('special characters, accents, and case match as whole names', async () => {
  const cases = [['AT&T', 'Engineer at AT&T'], ['C++', 'Member of C++ Group'], ['Booking.com', 'PM at booking.com'],
    ['Skoda', 'Engineer at Škoda'], ['Škoda', 'Engineer at SKODA'], ['Acme', 'Engineer at Acme | ex-Acme Labs'],
    ['Acme', 'Former Marine | Engineer at Acme'], ['Acme', 'Ex-Globex engineer at Acme']];
  for (const [name, headline] of cases) {
    const { w, tab } = await openGrow([name]);
    const card = addCard(tab, headline);
    await w.flush();
    assert.equal(card.hasAttribute(HIDE), true, `${name}: ${headline}`);
    noErrors(w);
  }
});

test('past wording and partial words do not match', async () => {
  const headlines = ['Consultant, ex Acme', 'Formerly at Acme', 'Previously @ Acme', 'former Acme', 'Acme alumni', 'Works at Acmedia', 'BigAcme lead',
    'Former Product Manager at Acme', 'Previously Engineer @ Acme'];
  const { w, tab } = await openGrow(['Acme']);
  const cards = headlines.map(headline => addCard(tab, headline));
  await w.flush();
  for (const card of cards) assert.equal(card.hasAttribute(HIDE), false, card.textContent);
  noErrors(w);
});

test('a dot in a name is literal', async () => {
  const { w, tab } = await openGrow(['Booking.com']);
  const card = addCard(tab, 'PM at Bookingxcom');
  await w.flush();
  assert.equal(card.hasAttribute(HIDE), false);
  noErrors(w);
});

test('a long hidden run keeps one dimmed card after every 10', async () => {
  const { w, tab } = await openGrow(['Capco']);
  const cards = Array.from({ length: 25 }, () => addCard(tab, 'Engineer at Capco'));
  await w.flush();
  assert.equal(tab.$$(`[${HIDE}]`).length, 23);
  assert.equal(tab.$$(`[${KEEP}]`).length, 2);
  assert.equal(cards[10].hasAttribute(KEEP), true);
  noErrors(w);
});

test('when the extension goes away, markers are removed', async () => {
  const { w, tab } = await openGrow(['Acme Corp']);
  tab.disableExtension();
  await w.advance(2000);
  assert.deepEqual(hidden(tab), []);
  const card = addCard(tab, 'Engineer at Acme Corp');
  await w.flush();
  assert.equal(card.hasAttribute(HIDE), false);
  noErrors(w);
});
