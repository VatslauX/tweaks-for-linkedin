const { test, expect } = require('./fixtures');

const sw = (popup, key) => popup.locator(`input[data-key="${key}"]`);
const isHidden = (page, sel) => page.locator(sel).evaluate(el => getComputedStyle(el).display === 'none');
const tabOf = page => page.evaluate(() => document.documentElement.getAttribute('data-lio-tab'));

async function open(context, path) {
  const page = await context.newPage();
  await page.goto(`https://www.linkedin.com${path}`);
  return page;
}

test('Network: the ad and site footer hide, a card with its own footer stays', async ({ context }) => {
  const page = await open(context, '/mynetwork/grow/');
  await expect.poll(() => isHidden(page, '#slot-ad')).toBe(true);
  await expect.poll(() => isHidden(page, '#slot-footer')).toBe(true);
  expect(await isHidden(page, '#footer-wrap')).toBe(true);
  await expect(page.locator('#card')).toBeVisible();
  await expect(page.locator('#card-footer')).toBeVisible();
  await expect(page.locator('#side')).toBeVisible();
});

test('Jobs: the site footer hides and the side column stays', async ({ context }) => {
  const page = await open(context, '/jobs/');
  await expect.poll(() => isHidden(page, '#slot-footer')).toBe(true);
  expect(await isHidden(page, '#footer-wrap')).toBe(true);
  await expect(page.locator('#card')).toBeVisible();
});

test('Messaging: the banner and footer hide, each with its own switch', async ({ context, popup }) => {
  const page = await open(context, '/messaging/');
  await expect.poll(() => isHidden(page, '#slot-ad')).toBe(true);
  await expect.poll(() => isHidden(page, '#slot-footer')).toBe(true);
  await expect(page.locator('#main')).toBeVisible();
  await sw(popup, 'ad').uncheck();
  await expect.poll(() => isHidden(page, '#slot-ad')).toBe(false);
  expect(await isHidden(page, '#slot-footer')).toBe(true);
  await sw(popup, 'ad').check();
  await sw(popup, 'footer').uncheck();
  await expect.poll(() => isHidden(page, '#slot-footer')).toBe(false);
  expect(await isHidden(page, '#slot-ad')).toBe(true);
});

test('Network: the puzzle card hides with its switch and other cards stay', async ({ context, popup }) => {
  const page = await open(context, '/mynetwork/grow/');
  await expect.poll(() => isHidden(page, '#puzzle-card')).toBe(true);
  await expect(page.locator('#center')).toBeVisible();
  await expect(page.locator('#other-card')).toBeVisible();
  await sw(popup, 'puzzles').uncheck();
  await expect.poll(() => isHidden(page, '#puzzle-card')).toBe(false);
});

const box = (page, sel) => page.locator(sel).evaluate(el => {
  const b = el.getBoundingClientRect();
  return { x: Math.round(b.x), width: Math.round(b.width) };
});

test('the content column has the same position and width on every tab', async ({ context }) => {
  for (const path of ['/feed/', '/mynetwork/grow/', '/jobs/', '/notifications/']) {
    const page = await open(context, path);
    await expect.poll(() => box(page, '#center'), path).toEqual({ x: 246, width: 714 });
    await page.close();
  }
});

test('Messaging fills the same outer width and its side column is gone', async ({ context }) => {
  const page = await open(context, '/messaging/');
  await expect.poll(() => box(page, '#main')).toEqual({ x: 0, width: 960 });
  await expect(page.locator('#side')).toBeHidden();
});

test('Notifications: the empty right column is removed', async ({ context }) => {
  const page = await open(context, '/notifications/');
  await expect.poll(() => isHidden(page, '#rail')).toBe(true);
  await expect(page.locator('#side')).toBeVisible();
});

test('the width switch restores LinkedIn layouts', async ({ context, popup }) => {
  const network = await open(context, '/mynetwork/grow/');
  const messaging = await open(context, '/messaging/');
  await sw(popup, 'wide').uncheck();
  await expect.poll(() => box(network, '#center')).toEqual({ x: 328, width: 632 });
  await expect.poll(() => box(messaging, '#main')).toEqual({ x: 0, width: 636 });
});

test('showing the banner turns the shared width off', async ({ context, popup }) => {
  const page = await open(context, '/notifications/');
  await sw(popup, 'ad').uncheck();
  await expect.poll(() => isHidden(page, '#slot-ad')).toBe(false);
  await expect(page.locator('#rail')).toBeVisible();
  await expect(sw(popup, 'wide')).toBeDisabled();
});

test('Premium promos hide on Home and Jobs, and other job cards stay', async ({ context, feed, popup }) => {
  const jobs = await open(context, '/jobs/');
  await expect.poll(() => isHidden(feed, '#slot-premium')).toBe(true);
  await expect.poll(() => isHidden(jobs, '#slot-premium')).toBe(true);
  await expect(jobs.locator('#job-card')).toBeVisible();
  await expect(feed.locator('#left')).toBeVisible();
  await sw(popup, 'premium').uncheck();
  await expect.poll(() => isHidden(feed, '#slot-premium')).toBe(false);
  await expect.poll(() => isHidden(jobs, '#slot-premium')).toBe(false);
});

test('the floating Messaging bar hides, and an open conversation stays', async ({ feed, popup }) => {
  await expect.poll(() => isHidden(feed, '#slot-bar')).toBe(true);
  await expect(feed.locator('#slot-chat')).toBeVisible();
  await sw(popup, 'chatbar').uncheck();
  await expect.poll(() => isHidden(feed, '#slot-bar')).toBe(false);
});

test('the floating Messaging bar also hides on the Messaging tab, outside a shadow root', async ({ context, popup }) => {
  const page = await open(context, '/messaging/');
  await expect.poll(() => isHidden(page, '#slot-bar')).toBe(true);
  await expect(page.locator('#slot-chat')).toBeVisible();
  await sw(popup, 'chatbar').uncheck();
  await expect.poll(() => isHidden(page, '#slot-bar')).toBe(false);
});

test('the Everywhere switches apply on each tab independently of each other', async ({ context, popup }) => {
  const page = await open(context, '/mynetwork/');
  await sw(popup, 'ad').uncheck();
  await expect.poll(() => isHidden(page, '#slot-ad')).toBe(false);
  expect(await isHidden(page, '#slot-footer')).toBe(true);
  await sw(popup, 'ad').check();
  await sw(popup, 'footer').uncheck();
  await expect.poll(() => isHidden(page, '#slot-footer')).toBe(false);
  await expect.poll(() => isHidden(page, '#slot-ad')).toBe(true);
});

test('the current tab is published on load', async ({ context }) => {
  for (const [path, tab] of [['/feed/', 'home'], ['/mynetwork/grow/', 'network'], ['/jobs/', 'jobs']]) {
    const page = await open(context, path);
    await expect.poll(() => tabOf(page)).toBe(tab);
    await page.close();
  }
});

test('the current tab follows in-app navigation, back included', async ({ feed }) => {
  await expect.poll(() => tabOf(feed)).toBe('home');
  await feed.evaluate(() => history.pushState({}, '', '/jobs/'));
  await expect.poll(() => tabOf(feed)).toBe('jobs');
  await feed.evaluate(() => history.pushState({}, '', '/settings/'));
  await expect.poll(() => tabOf(feed)).toBe(null);
  await feed.goBack();
  await expect.poll(() => tabOf(feed)).toBe('jobs');
});

test('the popup groups switches by tab and leaves out empty tabs', async ({ popup }) => {
  await expect(popup.locator('h2')).toHaveText(['Everywhere', 'Home', 'Network']);
  await expect(popup.locator('input[data-key]')).toHaveCount(14);
});

test('other LinkedIn pages are left alone', async ({ context }) => {
  const page = await open(context, '/learning/');
  await expect(page.locator('#rail')).toBeVisible();
  await expect(page.locator('#rail footer')).toBeVisible();
});
