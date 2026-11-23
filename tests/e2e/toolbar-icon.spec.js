// The toolbar icon: blue on a LinkedIn tab, grey everywhere else. Chrome has no API to read an icon back, so the
// test records setIcon calls and reads the per-tab title, which Chrome stores and clears together with the icon.
/* global chrome */
const { test, expect } = require('./fixtures');

const ACTIVE = 'Tweaks for LinkedIn: active on this tab';
const DEFAULT = 'Tweaks for LinkedIn (unofficial)';

async function workerWithSpy(context) {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  await worker.evaluate(() => {
    self.lioIcons = [];
    const setIcon = chrome.action.setIcon.bind(chrome.action);
    chrome.action.setIcon = details => { self.lioIcons.push(details); return setIcon(details); };
  });
  return worker;
}

const activeTitle = (worker, page) => page.bringToFront().then(() => worker.evaluate(async () => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return chrome.action.getTitle({ tabId: tab.id });
}));

test('blue on a LinkedIn tab, and back to grey after leaving LinkedIn', async ({ context }) => {
  await context.route('https://example.test/**', route => route.fulfill({ contentType: 'text/html', body: '<p>Other site</p>' }));
  const worker = await workerWithSpy(context);
  const page = await context.newPage();

  await page.goto('https://example.test/');
  await expect.poll(() => activeTitle(worker, page)).toBe(DEFAULT);
  expect(await worker.evaluate(() => self.lioIcons.length)).toBe(0);

  await page.goto('https://www.linkedin.com/feed/');
  await expect.poll(() => activeTitle(worker, page)).toBe(ACTIVE);
  const [icon] = await worker.evaluate(() => self.lioIcons);
  expect(icon.path['16']).toBe('icons/icon16.png');
  expect(icon.tabId).toEqual(expect.any(Number));

  await page.goto('https://example.test/');
  await expect.poll(() => activeTitle(worker, page)).toBe(DEFAULT);
});

test('another tab stays grey while a LinkedIn tab is blue', async ({ context }) => {
  await context.route('https://example.test/**', route => route.fulfill({ contentType: 'text/html', body: '<p>Other site</p>' }));
  const worker = await workerWithSpy(context);
  const linkedin = await context.newPage();
  await linkedin.goto('https://www.linkedin.com/jobs/');
  await expect.poll(() => activeTitle(worker, linkedin)).toBe(ACTIVE);
  const other = await context.newPage();
  await other.goto('https://example.test/');
  await expect.poll(() => activeTitle(worker, other)).toBe(DEFAULT);
  await expect.poll(() => activeTitle(worker, linkedin)).toBe(ACTIVE);
});

test('in-app navigation on LinkedIn keeps the icon blue', async ({ context }) => {
  const worker = await workerWithSpy(context);
  const page = await context.newPage();
  await page.goto('https://www.linkedin.com/feed/');
  await expect.poll(() => activeTitle(worker, page)).toBe(ACTIVE);
  await page.evaluate(() => history.pushState({}, '', '/jobs/'));
  await expect.poll(() => activeTitle(worker, page)).toBe(ACTIVE);
});
