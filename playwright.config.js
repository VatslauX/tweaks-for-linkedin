// End-to-end tests: Chromium with the unpacked extension against a mocked www.linkedin.com.
module.exports = {
  testDir: 'tests/e2e',
  timeout: 30000,
  workers: 4,
  reporter: [['list']],
  use: { trace: 'retain-on-failure' }
};
