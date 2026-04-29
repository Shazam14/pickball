import { test, expect } from '@playwright/test';

// Phase F smoke — tester enrollment + drop a pin + verify it persists.

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('pickball:tour:a:seen', '1');
      localStorage.setItem('pickball:tour:b:seen', '1');
    } catch {}
  });
});

test('tester enrollment + drop comment + persists across reload', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  // Enroll
  await page.goto('http://localhost:3000/tester');
  await page.waitForLoadState('networkidle');
  await page.locator('select').selectOption('Sol Arch');
  await page.locator('input[type="password"]').fill('pickleball-cebu-2026');
  await page.getByRole('button', { name: /Enable Tester Mode/i }).click();
  await page.waitForTimeout(300);
  await expect(page.getByRole('heading', { name: /Hi, Sol Arch/i })).toBeVisible();

  // Go to /booking, expect the floating pill
  await page.goto('http://localhost:3000/booking');
  await page.waitForLoadState('networkidle');
  const pill = page.getByRole('button', { name: /LEAVE A COMMENT/i });
  await expect(pill).toBeVisible();

  // Click pill → drop mode → click somewhere on the page
  await pill.click();
  await page.waitForTimeout(150);
  // Click in the middle of the page
  await page.mouse.click(640, 400);
  await page.waitForTimeout(200);

  // Composer should appear
  const textarea = page.locator('textarea[placeholder*="What"]');
  await expect(textarea).toBeVisible();
  await textarea.fill('Smoke test — pinned by playwright at this spot.');
  await page.getByRole('button', { name: /PIN IT/i }).click();
  await page.waitForTimeout(800);

  await page.screenshot({ path: 'test-results/feedback-after-pin.png', fullPage: true });

  // Reload → pin should still be there
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/feedback-after-reload.png', fullPage: true });

  // The pin button has a single digit number; finding by aria title pattern
  const pin = page.getByTitle(/Sol Arch.*Smoke test/i).first();
  await expect(pin).toBeVisible();
});
