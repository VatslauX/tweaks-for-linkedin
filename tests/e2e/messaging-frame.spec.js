// After an in-app click, LinkedIn shows Messaging inside a full-page, same-origin frame.
const { test, expect } = require('./fixtures');

const sw = (popup, key) => popup.locator(`input[data-key="${key}"]`);
const isHidden = (frame, sel) => frame.locator(sel).evaluate(el => getComputedStyle(el).display === 'none');
const box = (frame, sel) => frame.locator(sel).evaluate(el => {
  const b = el.getBoundingClientRect();
  return { x: Math.round(b.x), width: Math.round(b.width) };
});

async function openFromJobs(context) {
  const page = await context.newPage();
  await page.goto('https://www.linkedin.com/jobs/');
  await page.evaluate(() => {
    const frame = document.createElement('iframe');
    frame.src = '/preload/?_bprMode=test';
    frame.style.cssText = 'position:absolute;top:0;left:0;width:1000px;height:700px;border:0';
    document.body.append(frame);
  });
  const frame = page.frameLocator('iframe[src*="/preload/"]');
  await expect(frame.locator('#main')).toBeVisible();
  return frame;
}

test('Messaging in the frame: the side column is gone and the conversation fills the width', async ({ context }) => {
  const frame = await openFromJobs(context);
  await expect.poll(() => isHidden(frame, '#slot-ad')).toBe(true);
  expect(await isHidden(frame, '#slot-footer')).toBe(true);
  expect(await isHidden(frame, '#side')).toBe(true);
  await expect.poll(() => box(frame, '#main')).toEqual({ x: 0, width: 960 });
});

test('Messaging in the frame: the floating bar hides and an open conversation stays', async ({ context }) => {
  const frame = await openFromJobs(context);
  await expect.poll(() => isHidden(frame, '#slot-bar')).toBe(true);
  await expect(frame.locator('#slot-chat')).toBeVisible();
});

test('Messaging in the frame follows the switches', async ({ context, popup }) => {
  const frame = await openFromJobs(context);
  await expect.poll(() => isHidden(frame, '#slot-ad')).toBe(true);
  await sw(popup, 'ad').uncheck();
  await expect.poll(() => isHidden(frame, '#slot-ad')).toBe(false);
  await expect.poll(() => isHidden(frame, '#side')).toBe(false);
  expect(await isHidden(frame, '#slot-footer')).toBe(true);
  await expect.poll(() => box(frame, '#main')).toEqual({ x: 0, width: 636 });
  await sw(popup, 'ad').check();
  await expect.poll(() => isHidden(frame, '#slot-ad')).toBe(true);
  await sw(popup, 'chatbar').uncheck();
  await expect.poll(() => isHidden(frame, '#slot-bar')).toBe(false);
});
