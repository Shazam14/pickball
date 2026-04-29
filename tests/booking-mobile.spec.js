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

  test('booking — walking-in mode (PC.2)', async ({ page }) => {
    await page.goto('http://localhost:3000/booking');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Walking In/ }).click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'test-results/m375-booking-walkin.png', fullPage: true });
  });

  test('booking — matrix cell click (PG.1) auto-selects court + hour', async ({ page }) => {
    await page.goto('http://localhost:3000/booking');
    await page.waitForLoadState('networkidle');

    // Jump to next month + first day for a clean availability slate.
    await page.getByRole('button', { name: 'Next month' }).click();
    await page.waitForTimeout(200);
    await page.locator('button[class*="dayCard"]').first().click();
    await page.waitForTimeout(500);

    // Tap a single cell — auto-selects Court 1 + 7AM.
    await page.locator('[aria-label="Court 1 at 7AM"]').click();
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

  test('booking — multi-court (PB.3) + multi-hour range via matrix (PG.1)', async ({ page }) => {
    await page.goto('http://localhost:3000/booking');
    await page.waitForLoadState('networkidle');

    // Jump to next month + first day for a clean availability slate.
    await page.getByRole('button', { name: 'Next month' }).click();
    await page.waitForTimeout(200);
    await page.locator('button[class*="dayCard"]').first().click();
    await page.waitForTimeout(500);

    // Tap (Court 1, 7AM) — selects court 1 + 7AM.
    await page.locator('[aria-label="Court 1 at 7AM"]').click();
    // Tap C2 column header — adds court 2 to selection (no hour change).
    await page.locator('[aria-label="Toggle Court 2"]').click();
    // Tap (Court 1, 8AM) — extends to 7AM–9AM range across both courts.
    await page.locator('[aria-label="Court 1 at 8AM"]').click();
    await page.waitForTimeout(300);

    await page.getByText('03 — Your Details').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/m375-booking-05-multicourt.png', fullPage: true });

    const confirmPanel = page.locator('[class*="confirmPanel"]');
    if (await confirmPanel.count() > 0) {
      await confirmPanel.screenshot({ path: 'test-results/m375-booking-06-multicourt-confirm.png' });
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
