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

test.describe('Booking — two-phase matrix', () => {
  test('phase 1: tap a cell → details/confirm panel hidden, Continue button enabled', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await expect(page.getByText('01 — Pick Court & Time')).toBeVisible();

    // Continue is disabled until a cell is tapped.
    const continueBtn = page.getByRole('button', { name: /Continue → Choose Courts/ });
    await expect(continueBtn).toBeVisible();
    await expect(continueBtn).toBeDisabled();

    // Phase 1 instruction is showing.
    await expect(page.getByText(/01a — Tap a green cell/)).toBeVisible();

    // Tap a cell — anchor set.
    await page.locator('[aria-label="Court 1 at 7AM"]').click();
    await expect(page.locator('[aria-label="Court 1 at 7AM"]'))
      .toHaveClass(/matrixCellSelected/);

    // Continue now enabled.
    await expect(continueBtn).toBeEnabled();

    // Details + confirm are NOT yet visible — still phase 1.
    await expect(page.getByText('03 — Your Details')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Confirm & Pay|Fill in your details/ })).toHaveCount(0);
  });

  test('phase 1: tapping a column header is a no-op (no fan-out)', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await expect(page.getByText('01 — Pick Court & Time')).toBeVisible();

    // Pick (Court 1, 7AM).
    await page.locator('[aria-label="Court 1 at 7AM"]').click();

    // Try to tap a column header — in phase 1 it has no aria-button role.
    // The header element exists but isn't a button; locating it as a button must fail.
    await expect(page.getByRole('button', { name: /Toggle Court 5/ })).toHaveCount(0);

    // Sanity: SO5@7AM is still NOT lit (no spread to a non-anchor court).
    await expect(page.locator('[aria-label="Court 5 at 7AM"]'))
      .not.toHaveClass(/matrixCellSelected/);
  });

  test('phase 1: tapping a different cell moves the anchor — no spread', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await page.locator('[aria-label="Court 1 at 7AM"]').click();
    await expect(page.locator('[aria-label="Court 1 at 7AM"]'))
      .toHaveClass(/matrixCellSelected/);

    // Tap (Court 5, 10AM) — moves anchor.
    await page.locator('[aria-label="Court 5 at 10AM"]').click();
    await expect(page.locator('[aria-label="Court 5 at 10AM"]'))
      .toHaveClass(/matrixCellSelected/);
    await expect(page.locator('[aria-label="Court 1 at 7AM"]'))
      .not.toHaveClass(/matrixCellSelected/);

    // Cells in between are dark.
    for (const hour of ['8AM', '9AM']) {
      await expect(page.locator(`[aria-label="Court 5 at ${hour}"]`))
        .not.toHaveClass(/matrixCellSelected/);
    }
  });

  test('duration stepper extends the highlighted range and updates court fee', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await page.locator('[aria-label="Court 1 at 7AM"]').click();

    // Default 1h × 1 court × ₱700 — visible in the duration row summary.
    await expect(page.locator('text=/₱700/').first()).toBeVisible();
    await expect(page.getByText('1h', { exact: true }).first()).toBeVisible();

    const dPlus = page.locator('[aria-label="Increase duration"]');
    await dPlus.click(); // 2h
    await dPlus.click(); // 3h

    // Cells 7AM–9AM are highlighted in Court 1.
    for (const hour of ['7AM', '8AM', '9AM']) {
      await expect(page.locator(`[aria-label="Court 1 at ${hour}"]`))
        .toHaveClass(/matrixCellSelected/);
    }
    // 10AM (range end is exclusive) is NOT highlighted.
    await expect(page.locator('[aria-label="Court 1 at 10AM"]'))
      .not.toHaveClass(/matrixCellSelected/);

    // ₱2,100 visible in the duration row summary (3h × ₱700).
    await expect(page.locator('text=/₱2,100/').first()).toBeVisible();
  });

  test('phase transition: Continue → form/confirm visible, headers become interactive', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await page.locator('[aria-label="Court 1 at 7AM"]').click();

    // Click Continue → enter phase 2.
    await page.getByRole('button', { name: /Continue → Choose Courts/ }).click();

    // Phase 2 indicator + form visible.
    await expect(page.getByText(/01b —/)).toBeVisible();
    await expect(page.getByText('03 — Your Details')).toBeVisible();

    // Headers are now interactive (Toggle Court 5 button now exists).
    await expect(page.getByRole('button', { name: /Toggle Court 5/ })).toHaveCount(1);

    // Confirm panel renders too.
    await expect(page.getByText(/Court ₱700/)).toBeVisible();
  });

  test('phase 2: tap header adds a court; both columns lit at the same time', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await page.locator('[aria-label="Court 1 at 7AM"]').click();
    await page.getByRole('button', { name: /Continue → Choose Courts/ }).click();

    // Add SO5 to the booking via header.
    await page.getByRole('button', { name: /Toggle Court 5/ }).click();

    // Both anchor (SO1) and SO5 cells at 7AM should be highlighted.
    await expect(page.locator('[aria-label="Court 1 at 7AM"]'))
      .toHaveClass(/matrixCellSelected/);
    await expect(page.locator('[aria-label="Court 5 at 7AM"]'))
      .toHaveClass(/matrixCellSelected/);

    // Court fee = 1h × 2 courts × ₱700 = ₱1,400.
    await expect(page.getByText(/Court ₱1,400/)).toBeVisible();
  });

  test('phase 2: cells become non-interactive (read-only)', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await page.locator('[aria-label="Court 1 at 7AM"]').click();
    await page.getByRole('button', { name: /Continue → Choose Courts/ }).click();

    // Tapping a cell in phase 2 must not change the anchor.
    await page.locator('[aria-label="Court 5 at 10AM"]').click({ force: true });

    // SO1@7AM still the anchor; SO5@10AM did NOT become selected.
    await expect(page.locator('[aria-label="Court 1 at 7AM"]'))
      .toHaveClass(/matrixCellSelected/);
    await expect(page.locator('[aria-label="Court 5 at 10AM"]'))
      .not.toHaveClass(/matrixCellSelected/);
  });

  test('phase 2: Back button returns to phase 1 and drops extra courts', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await page.locator('[aria-label="Court 1 at 7AM"]').click();
    await page.getByRole('button', { name: /Continue → Choose Courts/ }).click();
    await page.getByRole('button', { name: /Toggle Court 5/ }).click();

    // Sanity: phase 2, both courts lit.
    await expect(page.locator('[aria-label="Court 5 at 7AM"]'))
      .toHaveClass(/matrixCellSelected/);

    // Back to phase 1.
    await page.getByRole('button', { name: /Back to Time/ }).click();

    // Anchor preserved.
    await expect(page.locator('[aria-label="Court 1 at 7AM"]'))
      .toHaveClass(/matrixCellSelected/);
    // Extra court dropped.
    await expect(page.locator('[aria-label="Court 5 at 7AM"]'))
      .not.toHaveClass(/matrixCellSelected/);

    // Form is gone again.
    await expect(page.getByText('03 — Your Details')).not.toBeVisible();
  });

  test('full booking flow: anchor → continue → details → button gating', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await page.locator('[aria-label="Court 1 at 7AM"]').click();
    await page.getByRole('button', { name: /Continue → Choose Courts/ }).click();

    await expect(page.getByText('03 — Your Details')).toBeVisible();

    const nameInput = page.getByPlaceholder('Juan dela Cruz');
    const phoneInput = page.getByPlaceholder('+63 9XX XXX XXXX');
    const emailInput = page.getByPlaceholder('juan@email.com');

    // Default 1h × 1 court × ₱700 + 4 players × ₱50 = ₱900.
    await expect(page.getByText(/Court ₱700/)).toBeVisible();
    await expect(page.getByText(/\+ Entrance ₱200/)).toBeVisible();
    await expect(page.locator('text=/₱900/').first()).toBeVisible();

    // Pay button disabled until form filled.
    await expect(page.getByRole('button', { name: /Fill in your details/ })).toBeDisabled();

    // Bump players → +50, total ₱950.
    await page.locator('[aria-label="Increase players"]').click();
    await expect(page.getByText(/\+ Entrance ₱250/)).toBeVisible();

    await nameInput.fill('Juan dela Cruz');
    await phoneInput.fill('+63 9171234567');
    await emailInput.fill('juan@example.com');

    await expect(page.getByRole('button', { name: /Confirm & Pay/ })).toBeEnabled();
  });
});
