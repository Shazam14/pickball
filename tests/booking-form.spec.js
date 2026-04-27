import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test.describe('Booking — Step 03 details + entrance fee', () => {
  test('form renders, stepper updates total, button gates on required fields', async ({ page }) => {
    await page.goto(`${BASE}/booking`);

    // Wait for availability fetch + court grid
    await expect(page.getByText('01 — Select Court')).toBeVisible();

    // Pick the first available court (Court 1)
    await page.locator('div').filter({ hasText: /^1Court(Available|Selected)$/ }).first().click();

    // Pick the first non-booked time. We'll grab any green available slot.
    const firstAvailableSlot = page.locator('button[title]').filter({ hasText: /AM|PM/ }).first();
    await firstAvailableSlot.click();

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

    // Tap stepper + → 5 players → entrance ₱250 → total ₱950
    await page.locator('button:has-text("+")').first().click();
    await expect(page.getByText(/\+ Entrance ₱250/)).toBeVisible();
    await expect(page.locator('text=/₱950/').first()).toBeVisible();

    // Fill required fields → button enables
    await nameInput.fill('Juan dela Cruz');
    await phoneInput.fill('+63 9171234567');
    await emailInput.fill('juan@example.com');

    const liveBtn = page.getByRole('button', { name: /Confirm & Pay/ });
    await expect(liveBtn).toBeEnabled();
  });
});
