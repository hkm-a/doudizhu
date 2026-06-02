const {defineConfig, devices} = require('@playwright/test');
const fs = require('fs');

const chromePath = process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome';
const launchOptions = fs.existsSync(chromePath)
  ? {executablePath: chromePath}
  : {};

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    browserName: 'chromium',
    launchOptions,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: {
        viewport: {width: 1440, height: 960},
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        launchOptions,
      },
    },
  ],
  webServer: {
    command: 'HOST=127.0.0.1 PORT=3000 BROWSER=none npm start',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
