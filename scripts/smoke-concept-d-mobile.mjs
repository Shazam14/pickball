import { chromium, devices } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';

const OUT = '/tmp/concept-d-mobile';
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });

for (const [name, viewport] of [
  ['iphone-se-375', { width: 375, height: 667, isMobile: true, hasTouch: true }],
  ['pixel-7-412', { width: 412, height: 915, isMobile: true, hasTouch: true }],
]) {
  const ctx = await browser.newContext({
    viewport,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    httpCredentials: { username: 'sideout', password: 'sideoutengr' },
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/concept-d/booking', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('[aria-label^="Court 1 at"]', { timeout: 15000 });

  // Pick clean future month
  const next = page.locator('button[aria-label="Next month"]').first();
  if (await next.isVisible({ timeout: 1000 }).catch(() => false)) { await next.click(); await page.waitForTimeout(300); }
  await page.locator('[class*="dayCard"]:not([disabled])').first().click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: `${OUT}/${name}-01-empty.png`, fullPage: true });

  // Two anchors on different courts
  await page.locator('[aria-label="Court 1 at 9AM"]').first().click();
  await page.waitForTimeout(150);
  await page.locator('[aria-label="Court 3 at 2PM"]').first().click();
  await page.waitForTimeout(150);
  await page.locator('[aria-label="Court 1 at 11AM"]').first().click();
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${name}-02-multi-select.png`, fullPage: true });
  console.log(`${name}: snapshots saved`);
  await ctx.close();
}

await browser.close();
console.log('done →', OUT);
