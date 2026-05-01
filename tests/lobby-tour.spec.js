import { test, expect } from '@playwright/test';

// Lobby plan smoke — confirms the venue-layout button + modal work on /booking.
// Pre-suppress the auto-tour so it doesn't block click-tests below.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('pickball:tour:a:seen', '1');
      localStorage.setItem('pickball:tour:b:seen', '1');
    } catch {}
  });
});

test('booking — VIEW VENUE LAYOUT button opens lobby plan modal', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://localhost:3000/booking');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('button', { name: /VIEW VENUE LAYOUT/i })).toBeVisible();
  await page.screenshot({ path: 'test-results/booking-with-lobby.png', fullPage: true });

  await page.getByRole('button', { name: /VIEW VENUE LAYOUT/i }).click();
  await page.waitForTimeout(300);
  await expect(page.getByRole('heading', { name: /BEFORE THE BASELINE/i })).toBeVisible();
  await page.screenshot({ path: 'test-results/booking-lobby-modal.png', fullPage: false });
});
