import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

// Suppress first-visit auto-tour so it doesn't cover click targets.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('pickball:tour:a:seen', '1');
      localStorage.setItem('pickball:tour:b:seen', '1');
    } catch {}
  });
});

const COURT = 5;

test.describe('/concept-d/booking — tap = 1h slot, toggle, multi-range per court', () => {

  test('single tap adds a 1-hour slot', async ({ page }) => {
    await page.goto(`${BASE}/concept-d/booking`);
    await expect(page.getByText('Independent Multi-Slot')).toBeVisible();

    const cell = page.locator(`[aria-label="Court ${COURT} at 11AM"]`);
    await cell.click();
    await expect(cell).toHaveClass(/matrixCellSelected/);

    await expect(page.getByText(/11:00 AM — 12:00 PM/)).toBeVisible();
  });

  test('two non-adjacent taps = two separate slots, no auto-fill', async ({ page }) => {
    await page.goto(`${BASE}/concept-d/booking`);
    await expect(page.getByText('Independent Multi-Slot')).toBeVisible();

    const seven = page.locator(`[aria-label="Court ${COURT} at 7AM"]`);
    const ten = page.locator(`[aria-label="Court ${COURT} at 10AM"]`);

    await seven.click();
    await ten.click();

    // Both must be selected.
    await expect(seven).toHaveClass(/matrixCellSelected/);
    await expect(ten).toHaveClass(/matrixCellSelected/);

    // Cells in between must NOT be highlighted.
    for (const h of ['8AM', '9AM']) {
      await expect(page.locator(`[aria-label="Court ${COURT} at ${h}"]`)).not.toHaveClass(/matrixCellSelected/);
    }

    // Selection list shows two separate 1h ranges (use specific time windows).
    await expect(page.getByText(/7:00 AM — 8:00 AM/)).toBeVisible();
    await expect(page.getByText(/10:00 AM — 11:00 AM/)).toBeVisible();
  });

  test('two adjacent taps merge into one range', async ({ page }) => {
    await page.goto(`${BASE}/concept-d/booking`);
    await expect(page.getByText('Independent Multi-Slot')).toBeVisible();

    const seven = page.locator(`[aria-label="Court ${COURT} at 7AM"]`);
    const eight = page.locator(`[aria-label="Court ${COURT} at 8AM"]`);

    await seven.click();
    await eight.click();
    await expect(seven).toHaveClass(/matrixCellSelected/);
    await expect(eight).toHaveClass(/matrixCellSelected/);

    // Range row shows 2h merged: "7:00 AM — 9:00 AM · 2h · ₱1,400".
    await expect(page.getByText(/7:00 AM — 9:00 AM · 2h/)).toBeVisible();
  });

  test('tap on a selected cell removes it (toggle)', async ({ page }) => {
    await page.goto(`${BASE}/concept-d/booking`);
    await expect(page.getByText('Independent Multi-Slot')).toBeVisible();

    const cell = page.locator(`[aria-label="Court ${COURT} at 11AM"]`);
    await cell.click();
    await expect(cell).toHaveClass(/matrixCellSelected/);

    await cell.click();
    await expect(cell).not.toHaveClass(/matrixCellSelected/);

    // Selection list cleared (no '— Your Selections' header).
    await expect(page.getByText('02 — Your Selections')).toHaveCount(0);
  });

});
