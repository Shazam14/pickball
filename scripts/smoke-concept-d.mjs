import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';

const OUT = '/tmp/concept-d-smoke';
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  httpCredentials: { username: 'sideout', password: 'sideoutengr' },
});
const page = await ctx.newPage();
page.on('pageerror', e => console.log('  [pageerror]', e.message));

console.log('1. Load /concept-d/booking');
await page.goto('http://localhost:3000/concept-d/booking', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForSelector('[aria-label^="Court 1 at"]', { timeout: 15000 });
await page.screenshot({ path: `${OUT}/01-initial.png`, fullPage: true });

// Move to a clean future month
const nextBtn = page.locator('button[aria-label="Next month"]').first();
if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
  await nextBtn.click();
  await page.waitForTimeout(300);
}
const firstDay = page.locator('[class*="dayCard"]:not([disabled])').first();
await firstDay.click();
await page.waitForTimeout(800);

console.log('2. Tap S01 9AM — expect anchor on S01');
await page.locator('[aria-label="Court 1 at 9AM"]').first().click();
await page.waitForTimeout(200);
console.log('  S01 9AM glyph:', await page.locator('[aria-label="Court 1 at 9AM"]').first().textContent());

console.log('3. Tap S03 2PM — expect SECOND, INDEPENDENT anchor on S03');
await page.locator('[aria-label="Court 3 at 2PM"]').first().click();
await page.waitForTimeout(200);
console.log('  S01 9AM still anchor?', await page.locator('[aria-label="Court 1 at 9AM"]').first().textContent());
console.log('  S03 2PM anchor?', await page.locator('[aria-label="Court 3 at 2PM"]').first().textContent());
await page.screenshot({ path: `${OUT}/02-two-anchors.png`, fullPage: true });

console.log('4. Tap S01 11AM — should commit S01 range, S03 anchor untouched');
await page.locator('[aria-label="Court 1 at 11AM"]').first().click();
await page.waitForTimeout(200);
console.log('  S01 9AM:', await page.locator('[aria-label="Court 1 at 9AM"]').first().textContent());
console.log('  S01 10AM:', await page.locator('[aria-label="Court 1 at 10AM"]').first().textContent());
console.log('  S01 11AM:', await page.locator('[aria-label="Court 1 at 11AM"]').first().textContent());
console.log('  S03 2PM:', await page.locator('[aria-label="Court 3 at 2PM"]').first().textContent());

console.log('5. Tap S03 3PM — should commit S03 range to 2-3PM');
await page.locator('[aria-label="Court 3 at 3PM"]').first().click();
await page.waitForTimeout(200);
console.log('  S03 2PM:', await page.locator('[aria-label="Court 3 at 2PM"]').first().textContent());
console.log('  S03 3PM:', await page.locator('[aria-label="Court 3 at 3PM"]').first().textContent());
await page.screenshot({ path: `${OUT}/03-two-ranges.png`, fullPage: true });

console.log('6. Tap S05 6PM — third independent anchor');
await page.locator('[aria-label="Court 5 at 6PM"]').first().click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/04-three-selections.png`, fullPage: true });

console.log('7. Remove S03 selection');
await page.getByRole('button', { name: /Remove SO3/ }).click();
await page.waitForTimeout(200);
console.log('  S03 2PM after remove:', await page.locator('[aria-label="Court 3 at 2PM"]').first().textContent());
await page.screenshot({ path: `${OUT}/05-after-remove.png`, fullPage: true });

console.log('8. Reset all');
await page.getByRole('button', { name: /Reset all selections/i }).click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/06-after-reset.png`, fullPage: true });

console.log('\n✓ Concept-D smoke complete — screenshots in', OUT);
await browser.close();
