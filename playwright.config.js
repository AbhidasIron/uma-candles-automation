// @ts-check
const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config({ quiet: true });

const isCI = !!process.env.CI;

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['junit', { outputFile: 'reports/junit/results.xml' }],
    ['allure-playwright', {
      resultsDir: 'reports/allure-results',
      suiteTitle: true,
      environmentInfo: {
        BASE_URL: process.env.BASE_URL || 'https://uma-candles.vercel.app',
        NODE_VERSION: process.version,
        OS: process.platform,
      },
    }],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'https://uma-candles.vercel.app',
    headless: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
