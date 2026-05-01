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

const COURT = 5; // Far from booked courts (1-10 booked at 7PM in seed; 5 is generally clean).

test.describe('/concept-d/booking — tap-to-cycle + 4h switch heuristic', () => {

  test('near tap (≤4h) commits range', async ({ page }) => {
    await page.goto(`${BASE}/concept-d/booking`);
    await expect(page.getByText('Independent Multi-Range')).toBeVisible();

    const anchor = page.locator(`[aria-label="Court ${COURT} at 11AM"]`);
    const end = page.locator(`[aria-label="Court ${COURT} at 1PM"]`);

    await anchor.click();
    await expect(anchor).toHaveClass(/matrixCellAnchor/);

    // Near tap (gap = 2): commits the range.
    await end.click();
    await expect(anchor).toHaveClass(/matrixCellSelected/);
    await expect(page.locator(`[aria-label="Court ${COURT} at 12PM"]`)).toHaveClass(/matrixCellSelected/);
    await expect(end).toHaveClass(/matrixCellSelected/);

    // Selection card shows committed range.
    await expect(page.getByText(/11:00 AM — 2:00 PM/)).toBeVisible();
  });

  test('far tap (>4h) switches anchor — does NOT highlight everything', async ({ page }) => {
    await page.goto(`${BASE}/concept-d/booking`);
    await expect(page.getByText('Independent Multi-Range')).toBeVisible();

    const firstPick = page.locator(`[aria-label="Court ${COURT} at 11AM"]`); // h=11
    const farPick = page.locator(`[aria-label="Court ${COURT} at 5PM"]`);    // h=17, gap=6

    await firstPick.click();
    await expect(firstPick).toHaveClass(/matrixCellAnchor/);

    // The bug: this used to commit a 7-hour range from 11AM to 5PM. Now it should swap anchor.
    await farPick.click();

    // First pick must NO LONGER be the anchor and must NOT be in a selected range.
    await expect(firstPick).not.toHaveClass(/matrixCellAnchor/);
    await expect(firstPick).not.toHaveClass(/matrixCellSelected/);

    // Cells in between (12PM, 1PM, 2PM, 3PM, 4PM) must NOT be highlighted.
    for (const h of ['12PM', '1PM', '2PM', '3PM', '4PM']) {
      await expect(page.locator(`[aria-label="Court ${COURT} at ${h}"]`)).not.toHaveClass(/matrixCellSelected/);
    }

    // The far tap should now be the new anchor.
    await expect(farPick).toHaveClass(/matrixCellAnchor/);
  });

  test('tap on a court with a committed range starts a fresh anchor', async ({ page }) => {
    await page.goto(`${BASE}/concept-d/booking`);
    await expect(page.getByText('Independent Multi-Range')).toBeVisible();

    const a = page.locator(`[aria-label="Court ${COURT} at 11AM"]`);
    const b = page.locator(`[aria-label="Court ${COURT} at 12PM"]`);
    const newAnchor = page.locator(`[aria-label="Court ${COURT} at 5PM"]`);

    // Commit 11-12.
    await a.click();
    await b.click();
    await expect(a).toHaveClass(/matrixCellSelected/);
    await expect(b).toHaveClass(/matrixCellSelected/);

    // Tap elsewhere → committed range cleared, fresh anchor at new tap.
    await newAnchor.click();
    await expect(a).not.toHaveClass(/matrixCellSelected/);
    await expect(b).not.toHaveClass(/matrixCellSelected/);
    await expect(newAnchor).toHaveClass(/matrixCellAnchor/);
  });

  test('same-cell tap commits a 1h range (1h booking still possible)', async ({ page }) => {
    await page.goto(`${BASE}/concept-d/booking`);
    await expect(page.getByText('Independent Multi-Range')).toBeVisible();

    const cell = page.locator(`[aria-label="Court ${COURT} at 11AM"]`);

    await cell.click();
    await expect(cell).toHaveClass(/matrixCellAnchor/);

    // Tap same cell again → commits 1h.
    await cell.click();
    await expect(cell).toHaveClass(/matrixCellSelected/);
    await expect(page.getByText(/11:00 AM — 12:00 PM/)).toBeVisible();
  });

});
