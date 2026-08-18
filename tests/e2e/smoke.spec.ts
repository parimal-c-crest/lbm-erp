import { test, expect } from '@playwright/test';

// Minimal wiring smoke test — confirms the E2E harness itself works against the running frontend.
// Per-flow specs (auth, sales-orders, etc. — `4-ui/2-user-flows.md`) get added per module as they're
// built, not all upfront (`docs-kit/6-development/2-folder-structure.md` §12).
test('dashboard loads', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Enterprise Dashboard' })).toBeVisible();
});
