import { defineConfig } from '@playwright/test';

// axe-core a11y tests (§3.2). Locally this builds and previews the app; in CI
// (a11y.yml) the PLAYWRIGHT_TEST_BASE_URL points at the deployed preview URL.
export default defineConfig({
  testDir: 'tests',
  // The Cloudflare adapter's output isn't served by `vite preview`, so we run
  // the SSR dev server for local/CI a11y runs. Point PLAYWRIGHT_TEST_BASE_URL
  // at a deployed preview URL to test the real build instead.
  webServer: process.env.PLAYWRIGHT_TEST_BASE_URL
    ? undefined
    : {
        command: 'npm run dev -- --port 4173',
        port: 4173,
        reuseExistingServer: !process.env.CI
      },
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL ?? 'http://localhost:4173'
  }
});
