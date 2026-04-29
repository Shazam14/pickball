import { test } from '@playwright/test';

// Visual mobile QA — full-page screenshots of every public page.
// Run with: npx playwright test booking-mobile --project="Pixel 7"

// Suppress the first-visit auto-tour so it doesn't cover click targets.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('pickball:tour:a:seen', '1');
      localStorage.setItem('pickball:tour:b:seen', '1');
    } catch {}
  });
});

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

  test('booking — matrix cell click (PG.1) → continue → fills form', async ({ page }) => {
    await page.goto('http://localhost:3000/booking');
    await page.waitForLoadState('networkidle');

    // Jump to next month + first day for a clean availability slate.
    await page.getByRole('button', { name: 'Next month' }).click();
    await page.waitForTimeout(200);
    await page.locator('button[class*="dayCard"]').first().click();
    await page.waitForTimeout(500);

    // Phase 1: tap (Court 1, 7AM).
    await page.locator('[aria-label="Court 1 at 7AM"]').click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'test-results/m375-booking-02-phase1.png', fullPage: true });

    // Continue → phase 2.
    await page.getByRole('button', { name: /Continue → Choose Courts/ }).click();
    await page.waitForTimeout(300);

    await page.getByText('03 — Your Details').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/m375-booking-03-phase2.png', fullPage: true });

    await page.getByPlaceholder('Juan dela Cruz').fill('Juan dela Cruz');
    await page.getByPlaceholder('+63 9XX XXX XXXX').fill('+63 9171234567');
    await page.getByPlaceholder('juan@email.com').fill('juan@example.com');
    await page.locator('[aria-label="Increase players"]').click();

    await page.screenshot({ path: 'test-results/m375-booking-04-filled.png', fullPage: true });

    const confirmPanel = page.locator('[class*="confirmPanel"]');
    if (await confirmPanel.count() > 0) {
      await confirmPanel.screenshot({ path: 'test-results/m375-booking-05-confirm.png' });
    }
  });

  test('booking — multi-court via phase 2 + multi-hour duration', async ({ page }) => {
    await page.goto('http://localhost:3000/booking');
    await page.waitForLoadState('networkidle');

    // Jump to next month + first day for a clean availability slate.
    await page.getByRole('button', { name: 'Next month' }).click();
    await page.waitForTimeout(200);
    await page.locator('button[class*="dayCard"]').first().click();
    await page.waitForTimeout(500);

    // Phase 1: anchor at (Court 1, 7AM).
    await page.locator('[aria-label="Court 1 at 7AM"]').click();
    // Bump duration to 3h via stepper — anchor column lights up 7AM–10AM.
    await page.locator('[aria-label="Increase duration"]').click();
    await page.locator('[aria-label="Increase duration"]').click();

    // Continue to phase 2.
    await page.getByRole('button', { name: /Continue → Choose Courts/ }).click();
    await page.waitForTimeout(200);

    // Add SO2 via header — both courts now span 7AM–10AM.
    await page.locator('[aria-label="Toggle Court 2"]').click();
    await page.waitForTimeout(300);

    await page.getByText('03 — Your Details').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/m375-booking-06-multicourt.png', fullPage: true });

    const confirmPanel = page.locator('[class*="confirmPanel"]');
    if (await confirmPanel.count() > 0) {
      await confirmPanel.screenshot({ path: 'test-results/m375-booking-07-multicourt-confirm.png' });
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
