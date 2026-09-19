import { defineConfig, devices } from '@playwright/test';

/**
 * Nothing here is tied to one machine: the dev server is started by Playwright
 * itself on a loopback port, and every path is relative to the repository. A
 * fresh clone needs `npm install` and `npm run e2e:install` once, then
 * `npm run e2e`.
 *
 * Set E2E_BASE_URL to run the same suite against a deployment instead. The
 * local server is then not started at all, because there is nothing to start:
 *
 *   E2E_BASE_URL=https://example.vercel.app npm run e2e
 */
// 3002, so this suite and both sibling suites can run at the same time.
const PORT = Number(process.env.PORT ?? 3002);
const DEPLOYED_URL = process.env.E2E_BASE_URL;
const BASE_URL = DEPLOYED_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    locale: 'en-GB',
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 } },
    },
  ],

  webServer: DEPLOYED_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: 'ignore',
      },
});
