import { test } from '@playwright/test';

// Visual smoke — captures booking flow on small viewport so we can see
// what's actually breaking. Run with: npx playwright test booking-mobile --project="iPhone SE"

test('mobile booking flow — full-page screenshots at each state', async ({ page }) => {
  await page.goto('/booking');
  await page.waitForLoadState('networkidle');

  await page.screenshot({ path: 'test-results/mobile-01-initial.png', fullPage: true });

  // Pick the first court tile
  const firstCourt = page.locator('div').filter({ hasText: /^1Court(Available|Selected)$/ }).first();
  await firstCourt.click();
  await page.screenshot({ path: 'test-results/mobile-02-court-selected.png', fullPage: true });

  // Pick first available time slot
  const firstSlot = page.locator('button[title]').filter({ hasText: /AM|PM/ }).first();
  await firstSlot.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/mobile-03-time-selected.png', fullPage: true });

  // Scroll Step 03 into view
  await page.getByText('03 — Your Details').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/mobile-04-step03.png', fullPage: true });

  // Fill fields to see confirm panel update
  await page.getByPlaceholder('Juan dela Cruz').fill('Juan dela Cruz');
  await page.getByPlaceholder('+63 9XX XXX XXXX').fill('+63 9171234567');
  await page.getByPlaceholder('juan@email.com').fill('juan@example.com');

  // Bump players to 5 to verify stepper visibility
  await page.locator('button:has-text("+")').first().click();

  await page.screenshot({ path: 'test-results/mobile-05-filled.png', fullPage: true });

  // Capture the confirm panel area only (sticky bottom)
  const confirmPanel = page.locator('[class*="confirmPanel"]');
  if (await confirmPanel.count() > 0) {
    await confirmPanel.screenshot({ path: 'test-results/mobile-06-confirm-panel.png' });
  }
});
