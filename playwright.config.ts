import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['playwright-bot.ts', 'playwright-eval.ts', 'mobile-test.ts', 'scripts/challenge-eval.ts'],
  timeout: 300_000,
  use: {
    browserName: 'chromium',
    headless: false,
    viewport: { width: 1400, height: 900 },
    launchOptions: {
      slowMo: 100,
    },
  },
});
