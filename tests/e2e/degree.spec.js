// POC coverage for the connection degree filter.
/* global chrome */
const { test, expect } = require('./fixtures');

const addCards = (page, labels) => page.evaluate(items => {
  items.forEach(({ id, label }, i) => {
    const wrap = document.createElement('div');
    wrap.dataset.lazyMountId = `d${i}`;
    wrap.style.display = 'contents';
    const card = wrap.appendChild(document.createElement('div'));
    card.id = id;
    card.setAttribute('role', 'listitem');
    card.setAttribute('componentkey', `update-card-focus-d${i}`);
    card.appendChild(document.createElement('p')).textContent = 'Author';
    if (label) card.appendChild(document.createElement('p')).textContent = label;
    card.appendChild(document.createElement('p')).textContent = 'Post text';
    document.getElementById('feed-list').append(wrap);
  });
}, labels);
const set = (popup, values) => popup.evaluate(v => chrome.storage.sync.set(v), values);
const hidden = (page, id) => page.locator(`#${id}`).evaluate(el => getComputedStyle(el).display === 'none');

test('1st only: keeps 1st-degree posts and restores the rest when switched back', async ({ feed, popup }) => {
  await addCards(feed, [{ id: 'd1', label: '• 1st' }, { id: 'd2', label: '• 2nd' }, { id: 'd3', label: '• 3rd+' }, { id: 'dx' }]);
  await set(popup, { show2nd: false, show3rd: false, showOther: false });
  await expect.poll(() => hidden(feed, 'd2')).toBe(true);
  expect(await hidden(feed, 'd3')).toBe(true);
  expect(await hidden(feed, 'dx')).toBe(true);
  expect(await hidden(feed, 'd1')).toBe(false);
  await set(popup, { show2nd: true, show3rd: true, showOther: true });
  await expect.poll(() => hidden(feed, 'd2')).toBe(false);
  expect(await feed.locator('[data-lio-degree-hide], [data-lio-degree-keep]').count()).toBe(0);
});

test('a long filtered run keeps one dimmed post after every 10 hidden', async ({ feed, popup }) => {
  await set(popup, { show2nd: false });
  await addCards(feed, Array.from({ length: 25 }, (_, i) => ({ id: `run${i}`, label: '• 2nd' })));
  await expect.poll(() => feed.locator('[data-lio-degree-keep]').count()).toBe(2);
  expect(await hidden(feed, 'run9')).toBe(true);
  expect(await hidden(feed, 'run10')).toBe(false);
  await expect(feed.locator('#run10')).toHaveCSS('opacity', '0.35');
  expect(await hidden(feed, 'run11')).toBe(true);
});
