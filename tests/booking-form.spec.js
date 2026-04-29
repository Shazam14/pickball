import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

// Suppress the first-visit auto-tour so it doesn't cover click targets.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('pickball:tour:a:seen', '1');
      localStorage.setItem('pickball:tour:b:seen', '1');
    } catch {}
  });
});

test.describe('Booking — Step 03 details + entrance fee', () => {
  test('form renders, stepper updates total, button gates on required fields', async ({ page }) => {
    await page.goto(`${BASE}/booking`);

    // Wait for availability fetch + matrix
    await expect(page.getByText('01 — Pick Court & Time')).toBeVisible();

    // Tap a matrix cell — auto-selects Court 1 + 7AM.
    await page.locator('[aria-label="Court 1 at 7AM"]').click();

    // Step 03 should now be visible
    await expect(page.getByText('03 — Your Details')).toBeVisible();
    await expect(page.getByText(/We'll email you a link to add your other players/)).toBeVisible();

    // Fields (labels lack htmlFor — use placeholders)
    const nameInput = page.getByPlaceholder('Juan dela Cruz');
    const phoneInput = page.getByPlaceholder('+63 9XX XXX XXXX');
    const emailInput = page.getByPlaceholder('juan@email.com');
    await expect(nameInput).toBeVisible();
    await expect(phoneInput).toBeVisible();
    await expect(emailInput).toBeVisible();

    // Player stepper defaults to 4
    await expect(page.locator('text=Players (₱50 entrance / head)')).toBeVisible();

    // Confirm panel — default 1h × 4 players = 700 + 200 = 900
    await expect(page.getByText(/Court ₱700/)).toBeVisible();
    await expect(page.getByText(/\+ Entrance ₱200/)).toBeVisible();
    await expect(page.locator('text=/₱900/').first()).toBeVisible();

    // Button is disabled (no name/phone/email yet)
    const confirmBtn = page.getByRole('button', { name: /Fill in your details/ });
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toBeDisabled();

    // Tap players + → 5 players → entrance ₱250 → total ₱950
    await page.locator('[aria-label="Increase players"]').click();
    await expect(page.getByText(/\+ Entrance ₱250/)).toBeVisible();
    await expect(page.locator('text=/₱950/').first()).toBeVisible();

    // Fill required fields → button enables
    await nameInput.fill('Juan dela Cruz');
    await phoneInput.fill('+63 9171234567');
    await emailInput.fill('juan@example.com');

    const liveBtn = page.getByRole('button', { name: /Confirm & Pay/ });
    await expect(liveBtn).toBeEnabled();
  });

  test('clicking a cell in a different court resets to that single cell (no fan-out)', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await expect(page.getByText('01 — Pick Court & Time')).toBeVisible();

    // Pick (Court 1, 7AM).
    await page.locator('[aria-label="Court 1 at 7AM"]').click();
    await expect(page.locator('[aria-label="Court 1 at 7AM"]'))
      .toHaveClass(/matrixCellSelected/);

    // Now "accidentally" tap (Court 5, 10AM). This must NOT extend the range
    // or add Court 5 to a multi-court selection — it should switch to that
    // single cell. To add a court for tournaments, the user uses the header.
    await page.locator('[aria-label="Court 5 at 10AM"]').click();

    // Only the new cell is selected.
    await expect(page.locator('[aria-label="Court 5 at 10AM"]'))
      .toHaveClass(/matrixCellSelected/);

    // The previous cell is no longer selected.
    await expect(page.locator('[aria-label="Court 1 at 7AM"]'))
      .not.toHaveClass(/matrixCellSelected/);

    // No extended range — Court 5 at 8AM/9AM should NOT be selected.
    for (const hour of ['8AM', '9AM']) {
      await expect(page.locator(`[aria-label="Court 5 at ${hour}"]`))
        .not.toHaveClass(/matrixCellSelected/);
    }

    // Confirm panel reflects the single court only (not "Courts 1, 5").
    await expect(page.getByText('Court 5', { exact: true })).toBeVisible();
    await expect(page.locator('text=/Courts\\s*1/')).toHaveCount(0);
  });

  test('two cell taps in same column do NOT extend the range — second tap moves the start', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await expect(page.getByText('01 — Pick Court & Time')).toBeVisible();

    // First tap → (Court 1, 7AM) selected. Default duration 1h.
    await page.locator('[aria-label="Court 1 at 7AM"]').click();
    await expect(page.locator('[aria-label="Court 1 at 7AM"]'))
      .toHaveClass(/matrixCellSelected/);

    // Second tap on same column at a far hour — should MOVE the start, not extend.
    await page.locator('[aria-label="Court 1 at 2PM"]').click();

    // Only the new cell is highlighted.
    await expect(page.locator('[aria-label="Court 1 at 2PM"]'))
      .toHaveClass(/matrixCellSelected/);
    await expect(page.locator('[aria-label="Court 1 at 7AM"]'))
      .not.toHaveClass(/matrixCellSelected/);

    // None of the cells in between are lit.
    for (const hour of ['8AM', '9AM', '10AM', '11AM', '12PM', '1PM']) {
      await expect(page.locator(`[aria-label="Court 1 at ${hour}"]`))
        .not.toHaveClass(/matrixCellSelected/);
    }
  });

  test('duration stepper extends the highlighted range and updates court fee', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await expect(page.getByText('01 — Pick Court & Time')).toBeVisible();

    // Pick (Court 1, 7AM). Default duration 1h, court fee ₱700.
    await page.locator('[aria-label="Court 1 at 7AM"]').click();
    await expect(page.getByText(/Court ₱700/)).toBeVisible();

    // Duration display shows "1h".
    await expect(page.getByText('1h', { exact: true }).first()).toBeVisible();

    // Bump duration to 3h via the stepper.
    const dPlus = page.locator('[aria-label="Increase duration"]');
    await dPlus.click(); // 2h
    await dPlus.click(); // 3h

    // Court fee = 3h × 1 court × ₱700 = ₱2,100.
    await expect(page.getByText(/Court ₱2,100/)).toBeVisible();

    // Cells 7AM, 8AM, 9AM are now all highlighted in Court 1.
    for (const hour of ['7AM', '8AM', '9AM']) {
      await expect(page.locator(`[aria-label="Court 1 at ${hour}"]`))
        .toHaveClass(/matrixCellSelected/);
    }
    // 10AM is NOT highlighted (range is 7–10, exclusive of end).
    await expect(page.locator('[aria-label="Court 1 at 10AM"]'))
      .not.toHaveClass(/matrixCellSelected/);
  });

  test('clicking one cell does not tint the rest of the court column', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await expect(page.getByText('01 — Pick Court & Time')).toBeVisible();

    // Tap a single cell — should select ONLY (C1, 7AM).
    await page.locator('[aria-label="Court 1 at 7AM"]').click();

    // The clicked cell carries the bright "selected" styling.
    await expect(page.locator('[aria-label="Court 1 at 7AM"]'))
      .toHaveClass(/matrixCellSelected/);

    // Other cells in the same column must NOT light up.
    for (const hour of ['8AM', '9AM', '10AM', '11AM', '12PM', '1PM']) {
      const cell = page.locator(`[aria-label="Court 1 at ${hour}"]`);
      await expect(cell).not.toHaveClass(/matrixCellInCourt/);
      await expect(cell).not.toHaveClass(/matrixCellSelected/);
    }
  });
});
