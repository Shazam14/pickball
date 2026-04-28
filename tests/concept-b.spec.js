import { test } from '@playwright/test';

// Concept B visual smoke — confirms desktop + mobile + walk-in render.
// Run: npx playwright test concept-b --project="Pixel 7"

test('concept-b desktop @ 1280', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://localhost:3000/concept-b/booking');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'test-results/cb-desktop-01-step1.png', fullPage: true });

  // Step 2 (slot matrix)
  await page.getByRole('button', { name: /Next — pick your slot/ }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test-results/cb-desktop-02-step2.png', fullPage: true });

  // Step 3 (pay + receipt)
  await page.getByRole('button', { name: /Next — pay/ }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test-results/cb-desktop-03-step3.png', fullPage: true });
});

test('concept-b mobile @ 412', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('http://localhost:3000/concept-b/booking');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'test-results/cb-mobile-01-step1.png', fullPage: true });

  // Step 2
  await page.getByRole('button', { name: /PICK SLOT FOR/ }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test-results/cb-mobile-02-step2.png', fullPage: true });
});

test('concept-b walking-in mode', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://localhost:3000/concept-b/booking');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /WALKING IN/ }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test-results/cb-walkin.png', fullPage: true });
});
