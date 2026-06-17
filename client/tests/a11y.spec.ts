import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// axe-core on every route renderable without an authenticated session (§3.2).
// Authenticated routes require a live PocketBase + seeded session; extend this
// list with a logged-in fixture when running against a deployed preview.
const PUBLIC_ROUTES = ['/login', '/register', '/reset-password'];

for (const route of PUBLIC_ROUTES) {
  test(`no detectable a11y violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test('skip link is the first focusable element', async ({ page }) => {
  await page.goto('/login');
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
  expect(focused).toBe('Skip to main content');
});
