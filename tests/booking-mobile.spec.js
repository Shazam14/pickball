import { test } from '@playwright/test';

// Visual mobile QA — full-page screenshots of every public page.
// Run with: npx playwright test booking-mobile --project="Pixel 7"

test.describe('mobile @ 375 (iPhone SE width)', () => {
  test.use({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test('homepage', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/m375-home.png', fullPage: true });
  });

  test('booking — initial', async ({ page }) => {
    await page.goto('http://localhost:3000/booking');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/m375-booking-01-initial.png', fullPage: true });
  });

  test('booking — after court + time + details filled', async ({ page }) => {
    await page.goto('http://localhost:3000/booking');
    await page.waitForLoadState('networkidle');

    await page.locator('div').filter({ hasText: /^1Court(Available|Selected)$/ }).first().click();
    // Click slider track at ~25% (≈9 AM) to set a 1-hour selection
    await page.locator('[class*="sliderTrack"]').click({ position: { x: 70, y: 22 } });
    await page.waitForTimeout(300);

    await page.getByText('03 — Your Details').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/m375-booking-02-step03.png', fullPage: true });

    await page.getByPlaceholder('Juan dela Cruz').fill('Juan dela Cruz');
    await page.getByPlaceholder('+63 9XX XXX XXXX').fill('+63 9171234567');
    await page.getByPlaceholder('juan@email.com').fill('juan@example.com');
    await page.locator('button:has-text("+")').first().click();

    await page.screenshot({ path: 'test-results/m375-booking-03-filled.png', fullPage: true });

    const confirmPanel = page.locator('[class*="confirmPanel"]');
    if (await confirmPanel.count() > 0) {
      await confirmPanel.screenshot({ path: 'test-results/m375-booking-04-confirm.png' });
    }
  });
});

test.describe('mobile @ 412 (Pixel 7 width)', () => {
  test.use({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test('homepage', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/m412-home.png', fullPage: true });
  });

  test('booking — initial', async ({ page }) => {
    await page.goto('http://localhost:3000/booking');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/m412-booking-01-initial.png', fullPage: true });
  });
});
