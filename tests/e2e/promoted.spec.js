const { test, expect } = require('./fixtures');

const sw = (popup, key) => popup.locator(`input[data-key="${key}"]`);
const isHidden = (page, sel) => page.locator(sel).evaluate(el => getComputedStyle(el).display === 'none');
const enable = popup => sw(popup, 'promoted').check();

test('by default promoted posts stay visible and the switch is off', async ({ feed, popup }) => {
  await expect(sw(popup, 'promoted')).not.toBeChecked();
  await expect(feed.locator('#post-promoted')).toBeVisible();
  await expect(feed.locator('[data-lio-promoted]')).toHaveCount(0);
  await expect(popup.locator('.count')).toBeHidden();
});

test('promoted posts hide in any listed language, with or without a sponsor name', async ({ feed, popup }) => {
  await enable(popup);
  for (const sel of ['#post-promoted', '#wrap-promoted', '#post-german', '#post-sponsor']) {
    await expect.poll(() => isHidden(feed, sel), sel).toBe(true);
  }
});

test('normal posts stay, even when their text says promoted', async ({ feed, popup }) => {
  await enable(popup);
  await expect.poll(() => isHidden(feed, '#post-promoted')).toBe(true);
  for (const sel of ['#post-normal', '#post-body', '#post-outside']) await expect(feed.locator(sel), sel).toBeVisible();
});

test('a promoted post added while scrolling is hidden before the next paint', async ({ feed, popup }) => {
  await enable(popup);
  await expect.poll(() => isHidden(feed, '#post-promoted')).toBe(true);
  const display = await feed.evaluate(() => new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.dataset.lazyMountId = '9';
    wrap.style.display = 'contents';
    const card = wrap.appendChild(document.createElement('div'));
    card.setAttribute('role', 'listitem');
    card.setAttribute('componentkey', 'update-card-focus-9');
    card.appendChild(document.createElement('p')).textContent = 'Promoted';
    document.getElementById('feed-list').append(wrap);
    requestAnimationFrame(() => resolve(getComputedStyle(card).display));
  }));
  expect(display).toBe('none');
});

test('the popup shows a live count for the active Home tab', async ({ feed, popup }) => {
  await expect(popup.locator('label', { has: sw(popup, 'promoted') })).toContainText('Block promoted');
  await enable(popup);
  const count = popup.locator('.count');
  await feed.bringToFront();
  await expect(count).toHaveText('3');
  await expect(count).toHaveAttribute('aria-label', '3 blocked on this page');
  await feed.evaluate(() => {
    const card = document.getElementById('post-promoted').cloneNode(true);
    card.id = 'post-added';
    card.removeAttribute('data-lio-promoted');
    card.setAttribute('componentkey', 'update-card-focus-7');
    document.getElementById('feed-list').append(card);
  });
  await expect(count).toHaveText('4');
  await sw(popup, 'promoted').uncheck();
  await expect(count).toBeHidden();
  await sw(popup, 'promoted').check();
  await expect(count).toHaveText('4');
});

test('the popup shows no count on another LinkedIn tab', async ({ context, popup }) => {
  const jobs = await context.newPage();
  await jobs.goto('https://www.linkedin.com/jobs/');
  await jobs.bringToFront();
  await popup.waitForFunction(() => document.querySelector('input[data-key="promoted"]'));
  await enable(popup);
  await expect.poll(() => jobs.evaluate(() => document.documentElement.getAttribute('data-lio-tab'))).toBe('jobs');
  await expect(popup.locator('.count')).toBeHidden();
});

test('the switch shows promoted posts again and stops marking them', async ({ feed, popup }) => {
  await enable(popup);
  await expect.poll(() => isHidden(feed, '#post-promoted')).toBe(true);
  await sw(popup, 'promoted').uncheck();
  await expect.poll(() => isHidden(feed, '#post-promoted')).toBe(false);
  await expect(feed.locator('[data-lio-promoted]')).toHaveCount(0);
  await sw(popup, 'promoted').check();
  await expect.poll(() => isHidden(feed, '#post-promoted')).toBe(true);
});
