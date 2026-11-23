// POC coverage for the Network company filter.
/* global chrome */
const { test, expect } = require('./fixtures');

async function openGrow(context) {
  const page = await context.newPage();
  await page.goto('https://www.linkedin.com/mynetwork/grow/');
  return page;
}

test('a typed company hides matching suggestions, and clearing it shows them again', async ({ context, popup }) => {
  const page = await openGrow(context);
  await expect(page.locator('#person-current')).toBeVisible();
  await popup.locator('#companies').fill('Acme Corp');
  await expect(page.locator('#person-current')).toBeHidden();
  for (const id of ['other', 'past', 'name', 'mutual', 'similar']) await expect(page.locator(`#person-${id}`), id).toBeVisible();
  await popup.locator('#companies').fill('');
  await expect(page.locator('#person-current')).toBeVisible();
});

test('the names stay in local storage and are never written to the page', async ({ context, popup }) => {
  const page = await openGrow(context);
  await popup.locator('#companies').fill('Acme Corp\nUnused Private Name');
  await expect(page.locator('#person-current')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.outerHTML)).not.toContain('Unused Private Name');
  expect(await popup.evaluate(() => chrome.storage.local.get('lioCompanies'))).toEqual({ lioCompanies: ['Acme Corp', 'Unused Private Name'] });
  expect(await popup.evaluate(() => chrome.storage.sync.get('lioCompanies'))).toEqual({});
});

test('the switch shows the hidden suggestions again', async ({ context, popup }) => {
  const page = await openGrow(context);
  await popup.locator('#companies').fill('Acme Corp');
  await expect(page.locator('#person-current')).toBeHidden();
  await popup.locator('input[data-key="hideCompany"]').uncheck();
  await expect(page.locator('#person-current')).toBeVisible();
});

test('the popup shows saved names when reopened', async ({ popup }) => {
  await popup.locator('#companies').fill('Acme Corp');
  await expect.poll(() => popup.evaluate(() => chrome.storage.local.get('lioCompanies'))).toEqual({ lioCompanies: ['Acme Corp'] });
  await popup.reload();
  await expect(popup.locator('#companies')).toHaveValue('Acme Corp');
});
