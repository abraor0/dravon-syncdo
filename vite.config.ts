import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Expose YOUR_* vars from .env.local to the client (Vite only exposes VITE_* by default).
  envPrefix: ['VITE_', 'YOUR_'],
  // Unit and component tests (`npm test`). E2E tests live in e2e/ and run with Playwright.
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    restoreMocks: true,
    // Never talk to a real backend from unit tests: the client module is mocked in every test
    // that reaches it, and these placeholders only keep createClient() from throwing on import.
    env: {
      YOUR_SUPABASE_URL: 'http://localhost.invalid',
      YOUR_SUPABASE_ANON_KEY: 'unit-test-placeholder',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/vite-env.d.ts', 'src/types/**'],
    },
  },
})
