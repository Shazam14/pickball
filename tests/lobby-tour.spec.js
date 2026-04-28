import { test, expect } from '@playwright/test';

// Phase E smoke — verify lobby plan + driver.js tour load on both concepts.
// Pre-suppress the auto-tour so it doesn't block click-tests below.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('pickball:tour:a:seen', '1');
      localStorage.setItem('pickball:tour:b:seen', '1');
    } catch {}
  });
});

test('concept-b desktop — lobby thumb visible, modal opens', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://localhost:3000/concept-b/booking');
  await page.waitForLoadState('networkidle');

  // The thumbnail label should be on screen
  await expect(page.getByText('VENUE LAYOUT', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: 'test-results/cb-desktop-with-lobby.png', fullPage: true });

  // Click the thumbnail — modal opens with the full plan title
  await page.getByText('TAP TO EXPAND →').first().click();
  await page.waitForTimeout(300);
  await expect(page.getByRole('heading', { name: /BEFORE THE BASELINE/i })).toBeVisible();
  await page.screenshot({ path: 'test-results/cb-lobby-modal.png', fullPage: false });
});

test('concept-b mobile — lobby thumb visible', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('http://localhost:3000/concept-b/booking');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('VENUE LAYOUT').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/cb-mobile-with-lobby.png', fullPage: true });
});

test('booking (concept A) — lobby button + tour button visible', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://localhost:3000/booking');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('button', { name: /VIEW VENUE LAYOUT/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Take a tour/i })).toBeVisible();
  await page.screenshot({ path: 'test-results/a-with-lobby-tour.png', fullPage: true });

  // Lobby button opens modal
  await page.getByRole('button', { name: /VIEW VENUE LAYOUT/i }).click();
  await page.waitForTimeout(300);
  await expect(page.getByRole('heading', { name: /BEFORE THE BASELINE/i })).toBeVisible();
  await page.screenshot({ path: 'test-results/a-lobby-modal.png', fullPage: false });
});

test('booking (concept A) — tour button starts driver popover', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://localhost:3000/booking');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /Take a tour/i }).click();
  await page.waitForTimeout(800);
  await expect(page.locator('.driver-popover.sideout-tour')).toBeVisible();
  await page.screenshot({ path: 'test-results/a-tour-step1.png', fullPage: false });
});
