const { test, expect } = require('./fixtures');

const SLOTS = { puzzles: '#slot-puzzles', follow: '#slot-follow', ad: '#slot-ad', footer: '#slot-footer' };
const sw = (popup, key) => popup.locator(`input[data-key="${key}"]`);
const feedWidth = page => page.locator('#center').evaluate(el => Math.round(el.getBoundingClientRect().width));
const isHidden = (page, sel) => page.locator(sel).evaluate(el => getComputedStyle(el).display === 'none');

test('by default the right column is gone and the feed fills it', async ({ feed }) => {
  await expect(feed.locator('#rail')).toBeHidden();
  await expect(feed.locator('#left')).toBeVisible();
  await expect.poll(() => feedWidth(feed)).toBe(714);
});

for (const [key, sel] of Object.entries(SLOTS)) {
  test(`showing ${key} brings back only that block, at normal feed width`, async ({ feed, popup }) => {
    await sw(popup, key).uncheck();
    await expect(feed.locator('#rail')).toBeVisible();
    await expect.poll(() => isHidden(feed, sel)).toBe(false);
    for (const [other, otherSel] of Object.entries(SLOTS)) {
      if (other !== key) expect(await isHidden(feed, otherSel), other).toBe(true);
    }
    await expect.poll(() => feedWidth(feed)).toBe(386);
    await expect(sw(popup, 'widen')).toBeDisabled();
  });
}

test('widen can be switched off while all blocks stay hidden', async ({ feed, popup }) => {
  await sw(popup, 'widen').uncheck();
  await expect.poll(() => feedWidth(feed)).toBe(386);
  await expect(feed.locator('#rail')).toBeVisible();
  for (const sel of Object.values(SLOTS)) expect(await isHidden(feed, sel), sel).toBe(true);
});

test('a choice survives a reload', async ({ feed, popup }) => {
  await sw(popup, 'puzzles').uncheck();
  await expect.poll(() => isHidden(feed, SLOTS.puzzles)).toBe(false);
  await feed.reload();
  await expect.poll(() => isHidden(feed, SLOTS.puzzles)).toBe(false);
  expect(await isHidden(feed, SLOTS.ad)).toBe(true);
});

test('the settings come back if the page rewrites the html attributes', async ({ feed, popup }) => {
  await sw(popup, 'puzzles').uncheck();
  await expect.poll(() => isHidden(feed, SLOTS.puzzles)).toBe(false);
  await feed.evaluate(() => document.documentElement.removeAttribute('data-lio-off'));
  await expect.poll(() => isHidden(feed, SLOTS.puzzles)).toBe(false);
});

