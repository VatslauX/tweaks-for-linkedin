// The popup's link to the GitHub feedback form.
/* global chrome */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('./fixtures');

const link = popup => popup.locator('#feedback');

test('the link opens the feedback form in a new tab, with only the version, Chrome, and language', async ({ popup }) => {
  await popup.locator('#companies').fill('Private Company Name');
  await expect(link(popup)).toHaveText('Feedback or report a problem');
  await expect(link(popup)).toHaveAttribute('target', '_blank');
  await expect(link(popup)).toHaveAttribute('rel', 'noopener noreferrer');
  const href = await link(popup).getAttribute('href');
  const url = new URL(href);
  const manifest = await popup.evaluate(() => chrome.runtime.getManifest());
  expect(`${url.origin}${url.pathname}`).toBe(`${manifest.homepage_url}/issues/new`);
  expect([...url.searchParams.keys()]).toEqual(['template', 'version', 'chrome', 'language']);
  expect(url.searchParams.get('template')).toBe('feedback.yml');
  expect(url.searchParams.get('version')).toBe(manifest.version);
  expect(url.searchParams.get('chrome')).toMatch(/^Chrome \d+$/);
  expect(url.searchParams.get('language')).toBe(await popup.evaluate(() => navigator.language));
  expect(href).not.toContain('Private');
});

test('every prefilled value has a matching field in the GitHub form', async ({ popup }) => {
  const form = fs.readFileSync(path.join(__dirname, '../../.github/ISSUE_TEMPLATE/feedback.yml'), 'utf8');
  const url = new URL(await link(popup).getAttribute('href'));
  for (const key of [...url.searchParams.keys()].filter(k => k !== 'template')) expect(form, key).toContain(`id: ${key}\n`);
});
