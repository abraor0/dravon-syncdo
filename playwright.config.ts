import { defineConfig, devices } from '@playwright/test';

const PORT = 5199;

// End-to-end tests: the real app (Vite dev server) in Chromium, against the local Supabase
// stack started with `npx supabase start`. See README > Testing.
export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/support/global-setup.ts',
  // All tests share one local database and the same two seeded members.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    // Its own port, so a `npm run dev` on 5173 is left alone.
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
