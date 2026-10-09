import { defineConfig } from '@playwright/test'

const port = 4179

/**
 * End-to-end tests run against the production build served by `vite preview`
 * (the dev server serves hundreds of separate modules, which is slow and flaky
 * with several browsers in parallel).
 * Locally they use the installed Microsoft Edge (nothing to download);
 * set PW_CHANNEL=chromium after `pnpm exec playwright install chromium`, e.g. on CI.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: `http://localhost:${port}/`,
    channel: process.env.PW_CHANNEL ?? 'msedge',
    viewport: { width: 1200, height: 900 },
    locale: 'uk-UA',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },

  webServer: {
    command: `pnpm exec vite build && pnpm exec vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}/`,
    env: { BASE_PATH: '/' },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000
  }
})
