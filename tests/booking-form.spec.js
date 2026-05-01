import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

// Helpers ---------------------------------------------------------------------

// All availability endpoints return all slots free → tests don't depend on
// real DB state. Holidays return empty so pricing is predictable per weekday.
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

// Lock POST captured into `captured` for assertion.
function mockLockSuccess(page, captured) {
  return page.route('**/api/lock-slot', async route => {
    captured.body = JSON.parse(route.request().postData() || '{}');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reference: 'TEST-REF-12345',
        locked_until: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        court_numbers: captured.body.ranges?.map(r => r.court_number) ?? [],
      }),
    });
  });
}

function mockLockConflict(page) {
  return page.route('**/api/lock-slot', async route => {
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Slot is no longer available.' }),
    });
  });
}

function mockConfirmSuccess(page) {
  return page.route('**/api/confirm-booking', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reference: 'TEST-REF-12345' }),
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

const COURT = 5;
const cellAt = (court, hour) => `[aria-label="Court ${court} at ${hour}"]`;

// Tests -----------------------------------------------------------------------

test.describe('Booking — phase 1 toggle behavior', () => {
  test('single tap adds a 1-hour slot', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await expect(page.locator('[class*="pageTitle"]')).toContainText('Reserve a Court');

    const cell = page.locator(cellAt(COURT, '11AM'));
    await cell.click();
    await expect(cell).toHaveClass(/matrixCellSelected/);

    // Single 1h range row appears in selections.
    await expect(page.getByText('02 — Your Selections')).toBeVisible();
    await expect(page.getByText(/11:00 AM — 12:00 PM · 1h/)).toBeVisible();
  });

  test('tap selected cell removes it (toggle)', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    const cell = page.locator(cellAt(COURT, '11AM'));
    await cell.click();
    await expect(cell).toHaveClass(/matrixCellSelected/);

    await cell.click();
    await expect(cell).not.toHaveClass(/matrixCellSelected/);
    await expect(page.getByText('02 — Your Selections')).toHaveCount(0);
  });

  test('adjacent slots merge into one range; non-adjacent stay separate', async ({ page }) => {
    await page.goto(`${BASE}/booking`);

    // Pick 8AM, 9AM, 11AM on the same court.
    await page.locator(cellAt(COURT, '8AM')).click();
    await page.locator(cellAt(COURT, '9AM')).click();
    await page.locator(cellAt(COURT, '11AM')).click();

    // 8+9 merge → "8:00 AM — 10:00 AM · 2h". 11 stands alone.
    await expect(page.getByText(/8:00 AM — 10:00 AM · 2h/)).toBeVisible();
    await expect(page.getByText(/11:00 AM — 12:00 PM · 1h/)).toBeVisible();

    // Hint banner shows 3 slots · 2 ranges.
    await expect(page.getByText(/3 slots · 2 ranges/)).toBeVisible();
  });

  test('Reset All clears every pick', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await page.locator(cellAt(COURT, '11AM')).click();
    await page.locator(cellAt(COURT, '1PM')).click();

    await expect(page.getByText('02 — Your Selections')).toBeVisible();

    await page.getByRole('button', { name: /Reset all selections/i }).click();
    await expect(page.getByText('02 — Your Selections')).toHaveCount(0);
    await expect(page.locator(cellAt(COURT, '11AM'))).not.toHaveClass(/matrixCellSelected/);
    await expect(page.locator(cellAt(COURT, '1PM'))).not.toHaveClass(/matrixCellSelected/);
  });

  test('per-range Remove drops just that range', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await page.locator(cellAt(COURT, '11AM')).click();
    await page.locator(cellAt(COURT + 1, '2PM')).click();

    // Two ranges visible.
    await expect(page.getByText(/2 ranges/)).toBeVisible();

    // Remove the SO5 11AM range only.
    await page.getByRole('button', { name: `Remove SO${COURT} 11AM` }).click();

    // SO5 11AM gone, SO6 2PM still selected.
    await expect(page.locator(cellAt(COURT, '11AM'))).not.toHaveClass(/matrixCellSelected/);
    await expect(page.locator(cellAt(COURT + 1, '2PM'))).toHaveClass(/matrixCellSelected/);
    await expect(page.getByText(/1 range/)).toBeVisible();
  });
});

test.describe('Booking — phase transitions', () => {
  test('Continue is hidden until a cell is tapped, then enters details mode', async ({ page }) => {
    await page.goto(`${BASE}/booking`);

    // No price panel / Continue / details until a pick exists.
    await expect(page.getByRole('button', { name: 'Continue →' })).toHaveCount(0);
    await expect(page.getByText('03 — Your Details')).toHaveCount(0);

    await page.locator(cellAt(COURT, '11AM')).click();

    const continueBtn = page.getByRole('button', { name: 'Continue →' });
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();

    // Details mode: form visible, matrix hidden, back-link visible.
    await expect(page.getByText('03 — Your Details')).toBeVisible();
    await expect(page.getByText('01 — Pick Court & Time', { exact: false })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '← Back to selection' })).toBeVisible();
  });

  test('Back to selection preserves picks and form values', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await page.locator(cellAt(COURT, '11AM')).click();
    await page.getByRole('button', { name: 'Continue →' }).click();

    await page.getByPlaceholder('Juan dela Cruz').fill('Maria Rivera');
    await page.getByRole('button', { name: '← Back to selection' }).click();

    // Pick still selected.
    await expect(page.locator(cellAt(COURT, '11AM'))).toHaveClass(/matrixCellSelected/);

    // Re-enter details — name preserved.
    await page.getByRole('button', { name: 'Continue →' }).click();
    await expect(page.getByPlaceholder('Juan dela Cruz')).toHaveValue('Maria Rivera');
  });

  test('pay-mode toggle is only visible in review phase', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await page.locator(cellAt(COURT, '11AM')).click();

    // Review: visible.
    await expect(page.getByRole('button', { name: 'Toggle pay entrance onsite' })).toBeVisible();

    await page.getByRole('button', { name: 'Continue →' }).click();

    // Details: hidden.
    await expect(page.getByRole('button', { name: 'Toggle pay entrance onsite' })).toHaveCount(0);
  });
});

test.describe('Booking — pay-online details', () => {
  test('default 4 players → 1 booker card + 3 name-only cards; submit disabled until form valid', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await page.locator(cellAt(COURT, '11AM')).click();
    await page.getByRole('button', { name: 'Continue →' }).click();

    // Header shows 4 players.
    await expect(page.getByText('You picked 4 players')).toBeVisible();

    // Three name-only player cards (Player 2, 3, 4).
    await expect(page.getByText('Player 2', { exact: true })).toBeVisible();
    await expect(page.getByText('Player 3', { exact: true })).toBeVisible();
    await expect(page.getByText('Player 4', { exact: true })).toBeVisible();

    // Submit disabled with empty form.
    const submit = page.getByRole('button', { name: /Fill in your details|Confirm & Pay/ });
    await expect(submit).toBeDisabled();

    // Fill required fields → enabled.
    await page.getByPlaceholder('Juan dela Cruz').fill('Juan dela Cruz');
    await page.getByPlaceholder('+63 9XX XXX XXXX').fill('+63 9171234567');
    await page.getByPlaceholder('juan@email.com').fill('juan@example.com');

    await expect(page.getByRole('button', { name: 'Confirm & Pay — 5 min hold' })).toBeEnabled();
  });

  test('players stepper updates entrance fee and player cards', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await page.locator(cellAt(COURT, '11AM')).click();
    await page.getByRole('button', { name: 'Continue →' }).click();

    // Default 4 × ₱50 = ₱200.
    await expect(page.getByText(/Entrance ₱200/)).toBeVisible();

    // Bump to 5 → ₱250 + Player 5 card appears.
    await page.locator('[aria-label="Increase players"]').click();
    await expect(page.getByText('You picked 5 players')).toBeVisible();
    await expect(page.getByText(/Entrance ₱250/)).toBeVisible();
    await expect(page.getByText('Player 5', { exact: true })).toBeVisible();

    // Drop to 3 → ₱150, Players 4–5 gone.
    await page.locator('[aria-label="Decrease players"]').click();
    await page.locator('[aria-label="Decrease players"]').click();
    await expect(page.getByText('You picked 3 players')).toBeVisible();
    await expect(page.getByText(/Entrance ₱150/)).toBeVisible();
    await expect(page.getByText('Player 4', { exact: true })).toHaveCount(0);
  });
});

test.describe('Booking — pay-onsite mode', () => {
  test('toggle on review → "+ ₱X cash on arrival"; total drops to court-only', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await page.locator(cellAt(COURT, '11AM')).click();

    // Default online: total includes entrance.
    await expect(page.getByText(/Entrance ₱200(?!.*onsite)/)).toBeVisible();
    await expect(page.getByText(/cash on arrival/)).toHaveCount(0);

    // Toggle onsite ON.
    await page.getByRole('button', { name: 'Toggle pay entrance onsite' }).click();

    // Cash-on-arrival line appears.
    await expect(page.getByText(/\+ ₱200 cash on arrival/)).toBeVisible();
    await expect(page.getByText(/Entrance ₱200 \(onsite\)/)).toBeVisible();
  });

  test('details — onsite shows single booker card, no per-player cards', async ({ page }) => {
    await page.goto(`${BASE}/booking`);
    await page.locator(cellAt(COURT, '11AM')).click();
    await page.getByRole('button', { name: 'Toggle pay entrance onsite' }).click();
    await page.getByRole('button', { name: 'Continue →' }).click();

    // Booker card present, no Player 2/3/4 cards.
    await expect(page.getByText('Main Booker').first()).toBeVisible();
    await expect(page.getByText('Player 2', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Player 3', { exact: true })).toHaveCount(0);

    // Headcount stepper section shown.
    await expect(page.getByText('How many players?')).toBeVisible();
  });
});

test.describe('Booking — lock + payment modal', () => {
  test('Confirm posts ranges + opens BookingModal with summary', async ({ page }) => {
    const captured = {};
    await mockLockSuccess(page, captured);

    await page.goto(`${BASE}/booking`);
    // Pick two ranges: SO5 8+9AM (merged), SO6 2PM.
    await page.locator(cellAt(COURT, '8AM')).click();
    await page.locator(cellAt(COURT, '9AM')).click();
    await page.locator(cellAt(COURT + 1, '2PM')).click();
    await page.getByRole('button', { name: 'Continue →' }).click();

    await page.getByPlaceholder('Juan dela Cruz').fill('Juan dela Cruz');
    await page.getByPlaceholder('+63 9XX XXX XXXX').fill('+63 9171234567');
    await page.getByPlaceholder('juan@email.com').fill('juan@example.com');

    await page.getByRole('button', { name: 'Confirm & Pay — 5 min hold' }).click();

    // Modal opens — booker visible + Step 1.
    await expect(page.getByText('Step 1 — Choose Payment')).toBeVisible();
    await expect(page.getByText('Juan dela Cruz')).toBeVisible();
    await expect(page.getByText('Court 5').first()).toBeVisible();
    await expect(page.getByText('Court 6').first()).toBeVisible();

    // POST body sanity.
    expect(captured.body.ranges).toHaveLength(2);
    expect(captured.body.pay_mode).toBe('online');
    expect(captured.body.customer_name).toBe('Juan dela Cruz');
    expect(captured.body.players).toBe(4);
  });

  test('onsite mode submits pay_mode: onsite_entrance', async ({ page }) => {
    const captured = {};
    await mockLockSuccess(page, captured);

    await page.goto(`${BASE}/booking`);
    await page.locator(cellAt(COURT, '11AM')).click();
    await page.getByRole('button', { name: 'Toggle pay entrance onsite' }).click();
    await page.getByRole('button', { name: 'Continue →' }).click();

    await page.getByPlaceholder('Juan dela Cruz').fill('Juan dela Cruz');
    await page.getByPlaceholder('+63 9XX XXX XXXX').fill('+63 9171234567');
    await page.getByPlaceholder('juan@email.com').fill('juan@example.com');

    await page.getByRole('button', { name: 'Confirm & Pay — 5 min hold' }).click();

    await expect(page.getByText('Step 1 — Choose Payment')).toBeVisible();
    expect(captured.body.pay_mode).toBe('onsite_entrance');
    expect(captured.body.player_names).toEqual(['Juan dela Cruz']);
  });

  test('409 conflict surfaces lockError message', async ({ page }) => {
    await mockLockConflict(page);

    await page.goto(`${BASE}/booking`);
    await page.locator(cellAt(COURT, '11AM')).click();
    await page.getByRole('button', { name: 'Continue →' }).click();
    await page.getByPlaceholder('Juan dela Cruz').fill('Juan dela Cruz');
    await page.getByPlaceholder('+63 9XX XXX XXXX').fill('+63 9171234567');
    await page.getByPlaceholder('juan@email.com').fill('juan@example.com');

    await page.getByRole('button', { name: 'Confirm & Pay — 5 min hold' }).click();

    await expect(page.getByText('Slot is no longer available.')).toBeVisible();
    // Modal did not open.
    await expect(page.getByText('Step 1 — Choose Payment')).toHaveCount(0);
  });

  test('full path → success card with reference', async ({ page }) => {
    const captured = {};
    await mockLockSuccess(page, captured);
    await mockConfirmSuccess(page);

    await page.goto(`${BASE}/booking`);
    await page.locator(cellAt(COURT, '11AM')).click();
    await page.getByRole('button', { name: 'Continue →' }).click();
    await page.getByPlaceholder('Juan dela Cruz').fill('Juan dela Cruz');
    await page.getByPlaceholder('+63 9XX XXX XXXX').fill('+63 9171234567');
    await page.getByPlaceholder('juan@email.com').fill('juan@example.com');
    await page.getByRole('button', { name: 'Confirm & Pay — 5 min hold' }).click();

    // Step 1 → pick GCash.
    await expect(page.getByText('Step 1 — Choose Payment')).toBeVisible();
    await page.getByRole('button', { name: 'GCash' }).click();
    await page.getByRole('button', { name: /I.*ve Paid — Enter Reference/ }).click();

    // Step 2 → enter reference + confirm.
    await expect(page.getByText('Step 2 — Confirm Payment')).toBeVisible();
    await page.getByPlaceholder('e.g. 12345678901234').fill('99999999999999');
    await page.getByRole('button', { name: 'Confirm Booking →' }).click();

    // Success card.
    await expect(page.getByText('Booking Confirmed!')).toBeVisible();
    await expect(page.getByText('TEST-REF-12345')).toBeVisible();
  });
});
