const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '../../extension/promoted.js'), 'utf8');
const { lioIsPromotedLabel: isLabel } = vm.runInNewContext(`${src}\n;({ lioIsPromotedLabel })`);

test('labels: every EU language LinkedIn offers is covered', () => {
  const labels = ['Promoted', 'Gesponsert', 'Sponsorisé', 'Promocionado', 'Promovida', 'Promosso', 'Gepromoot', 'Promowane',
    'Marknadsfört', 'Promoveret', 'Mainostettu', 'Propagováno', 'Προωθημένη', 'Kiemelt', 'Promovat'];
  for (const label of labels) assert.ok(isLabel(label), label);
});

test('labels: surrounding whitespace is ignored and a sponsor name is allowed', () => {
  assert.ok(isLabel('\n  Promoted  '));
  assert.ok(isLabel('Promoted by Example Brand'));
  assert.ok(isLabel('Gesponsert von Example'));
  assert.ok(isLabel('Promoted by'), 'sponsor name in a separate element');
});

test('labels: ordinary post text does not match', () => {
  for (const text of ['', 'promoted', 'I got promoted today', 'Promoted to senior engineer', 'Promotedby']) {
    assert.strictEqual(isLabel(text), false, text);
  }
  assert.strictEqual(isLabel(`Promoted by ${'x'.repeat(100)}`), false);
});

test('source: the label check never touches extension storage', () => {
  assert.ok(!/chrome\./.test(src));
});
