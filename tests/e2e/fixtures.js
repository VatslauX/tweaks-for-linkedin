// Playwright fixtures: a Chromium profile with the unpacked extension and a mocked www.linkedin.com (no network).
const { test: base, expect, chromium } = require('@playwright/test');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EXT = fs.realpathSync(path.join(__dirname, '../../extension'));
const fixture = name => fs.readFileSync(path.join(__dirname, `../fixtures/${name}.html`), 'utf8');
const PAGES = { feed: fixture('feed'), mynetwork: fixture('network'), jobs: fixture('jobs'), messaging: fixture('messaging'), notifications: fixture('notifications'),
  // after an in-app click, LinkedIn shows Messaging in a same-origin frame at this path
  preload: fixture('messaging') };
// a page with an aside but none of LinkedIn's hooks
const OTHER = '<!doctype html><main><div style="display:grid"><section id="center">Other</section><aside id="rail">Keep me<footer>Card footer</footer></aside></div></main>';

// Chrome derives an unpacked extension's id from its absolute path.
const EXT_ID = crypto.createHash('sha256').update(EXT).digest('hex').slice(0, 32)
  .replace(/[0-9a-f]/g, c => String.fromCharCode(97 + parseInt(c, 16)));

const test = base.extend({
  context: async ({}, use) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lio-e2e-'));
    const context = await chromium.launchPersistentContext(dir, {
      channel: 'chromium',
      headless: false,
      viewport: { width: 1100, height: 800 },
      args: ['--headless=new', `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`]
    });
    await context.route('https://www.linkedin.com/**', route => route.fulfill({
      contentType: 'text/html',
      body: PAGES[new URL(route.request().url()).pathname.split('/')[1]] || OTHER
    }));
    await use(context);
    await context.close();
    fs.rmSync(dir, { recursive: true, force: true });
  },
  feed: async ({ context }, use) => {
    const page = await context.newPage();
    await page.goto('https://www.linkedin.com/feed/');
    await use(page);
  },
  popup: async ({ context }, use) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${EXT_ID}/options.html`);
    await use(page);
  }
});

module.exports = { test, expect };
