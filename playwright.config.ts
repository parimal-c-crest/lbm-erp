import { defineConfig, devices } from '@playwright/test';

// Cross-app E2E config (ADR-027, `docs-kit/6-development/2-folder-structure.md` §12) — runs
// against the locally running full stack (backend + frontend), started manually per
// `6-development/1-development-environment.md` §... rather than auto-started here, since both
// apps' dev servers already run long-lived during normal development.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
