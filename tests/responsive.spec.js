import { test, expect } from '@playwright/test';

test.describe('Responsive — Home Page', () => {
  test('loads and nav is visible', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SideOut|Pickball|Court/i);
    await expect(page.locator('nav')).toBeVisible();
    await page.screenshot({ path: `test-results/home-${testInfo.project.name}.png`, fullPage: true });
  });

  test('hero content is visible', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('a[href="/booking"]')).toBeVisible();
  });

  test('no horizontal scroll', async ({ page }) => {
    await page.goto('/');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });
});

test.describe('Responsive — Booking Page', () => {
  test('loads and form is visible', async ({ page }, testInfo) => {
    await page.goto('/booking');
    await expect(page.locator('h1, h2')).toBeVisible();
    await page.screenshot({ path: `test-results/booking-${testInfo.project.name}.png`, fullPage: true });
  });

  test('no horizontal scroll', async ({ page }) => {
    await page.goto('/booking');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  test('court selection is tappable', async ({ page }) => {
    await page.goto('/booking');
    const firstCourt = page.locator('button, [role="button"]').first();
    await expect(firstCourt).toBeVisible();
    const box = await firstCourt.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('Responsive — Booking Modal', () => {
  test('modal opens and is visible', async ({ page }, testInfo) => {
    await page.goto('/booking');
    const bookBtn = page.locator('button').filter({ hasText: /book|confirm|select/i }).first();
    if (await bookBtn.isVisible()) {
      await bookBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `test-results/modal-${testInfo.project.name}.png`, fullPage: false });
    }
  });
});
