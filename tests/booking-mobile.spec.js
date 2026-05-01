import { test } from '@playwright/test';

// Visual mobile QA — full-page screenshots of the new toggle + phased flow.
// Run with: npx playwright test booking-mobile --project="Pixel 7"

// Mock site APIs so screenshots don't depend on real DB state.
async function mockSiteApis(page) {
  await page.route('**/api/availability**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ slots: {} }),
    });
  });
  await page.route('**/api/holidays**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ dates: [] }),
    });
  });
}

// Suppress the first-visit auto-tour so it doesn't cover click targets.
test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('pickball:tour:a:seen', '1');
      localStorage.setItem('pickball:tour:b:seen', '1');
    } catch {}
  });
  await mockSiteApis(page);
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

  test('booking — phase 1: pick a slot', async ({ page }) => {
    await page.goto('http://localhost:3000/booking');
    await page.waitForLoadState('networkidle');

    // Tap (Court 5, 11AM).
    await page.locator('[aria-label="Court 5 at 11AM"]').click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'test-results/m375-booking-02-phase1.png', fullPage: true });
  });

  test('booking — phase 2: details + filled form', async ({ page }) => {
    await page.goto('http://localhost:3000/booking');
    await page.waitForLoadState('networkidle');

    await page.locator('[aria-label="Court 5 at 11AM"]').click();
    await page.getByRole('button', { name: 'Continue →' }).click();
    await page.waitForTimeout(300);

    await page.getByText('03 — Your Details').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/m375-booking-03-phase2.png', fullPage: true });

    await page.getByPlaceholder('Juan dela Cruz').fill('Juan dela Cruz');
    await page.getByPlaceholder('+63 9XX XXX XXXX').fill('+63 9171234567');
    await page.getByPlaceholder('juan@email.com').fill('juan@example.com');

    await page.screenshot({ path: 'test-results/m375-booking-04-filled.png', fullPage: true });
  });

  test('booking — multi-range across two courts', async ({ page }) => {
    await page.goto('http://localhost:3000/booking');
    await page.waitForLoadState('networkidle');

    // Two adjacent on SO5 (merge into one range), one on SO6 (separate range).
    await page.locator('[aria-label="Court 5 at 8AM"]').click();
    await page.locator('[aria-label="Court 5 at 9AM"]').click();
    await page.locator('[aria-label="Court 6 at 2PM"]').click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: 'test-results/m375-booking-05-multirange.png', fullPage: true });
  });

  test('booking — pay-onsite mode (review)', async ({ page }) => {
    await page.goto('http://localhost:3000/booking');
    await page.waitForLoadState('networkidle');

    await page.locator('[aria-label="Court 5 at 11AM"]').click();
    await page.getByRole('button', { name: 'Toggle pay entrance onsite' }).click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: 'test-results/m375-booking-06-onsite-review.png', fullPage: true });
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
