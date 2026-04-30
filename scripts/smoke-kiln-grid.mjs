import { chromium } from 'playwright';

const OUT = '/tmp/kiln-grid-smoke';
import { mkdirSync, existsSync } from 'node:fs';
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const SITE_USER = process.env.SITE_USER || 'sideout';
const SITE_PASSWORD = process.env.SITE_PASSWORD || 'sideoutengr';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  httpCredentials: { username: SITE_USER, password: SITE_PASSWORD },
});

// Suppress tour overlay
await ctx.addInitScript(() => {
  try {
    localStorage.setItem('pickball:tour:a:seen', '1');
    localStorage.setItem('pickball:tour:b:seen', '1');
  } catch {}
});

const page = await ctx.newPage();
page.on('console', m => {
  if (m.type() === 'error') console.log('  [console.error]', m.text());
});
page.on('pageerror', e => console.log('  [pageerror]', e.message));

console.log('1. Load /booking');
await page.goto('http://localhost:3000/booking', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForSelector('.matrix-cell, [aria-label^="Court 1 at"]', { timeout: 15000 });
await page.screenshot({ path: `${OUT}/01-initial.png`, fullPage: true });
console.log('   ↳ screenshot saved');

// Pick a future month so today's data isn't polluted
const nextMonthBtn = page.locator('button[aria-label="Next month"]').first();
if (await nextMonthBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
  await nextMonthBtn.click();
  await page.waitForTimeout(300);
}

// First day card
const firstDay = page.locator('button.dayCard, [class*="dayCard"]').first();
if (await firstDay.isVisible({ timeout: 2000 }).catch(() => false)) {
  await firstDay.click();
  await page.waitForTimeout(800);
}

console.log('2. Tap anchor: Court 1 at 9AM');
const anchorCell = page.locator('[aria-label="Court 1 at 9AM"]').first();
await anchorCell.click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/02-anchor.png`, fullPage: true });

const anchorGlyph = await anchorCell.textContent();
console.log(`   anchor cell glyph: "${anchorGlyph}" (expect "●")`);

console.log('3. Verify second-cell-tap on Court 1 at 11AM commits range');
const endCell = page.locator('[aria-label="Court 1 at 11AM"]').first();
await endCell.click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/03-range.png`, fullPage: true });

// 9, 10, 11 should now be selected on Court 1
const tenCell = page.locator('[aria-label="Court 1 at 10AM"]').first();
const tenGlyph = await tenCell.textContent();
console.log(`   10AM in-range glyph: "${tenGlyph}" (expect "✓")`);
const elevenGlyph = await endCell.textContent();
console.log(`   11AM end glyph: "${elevenGlyph}" (expect "✓")`);
const stillAnchor = await anchorCell.textContent();
console.log(`   9AM anchor glyph: "${stillAnchor}" (expect "✓" — anchor visual only in phase 1.5)`);

console.log('4. Tap header SO2 — should add court 2');
const headerSO2 = page.locator('th[aria-label="Toggle Court 2"]').first();
await headerSO2.click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/04-multi-court.png`, fullPage: true });

const c2at10 = page.locator('[aria-label="Court 2 at 10AM"]').first();
const c2g = await c2at10.textContent();
console.log(`   Court 2 at 10AM glyph: "${c2g}" (expect "✓")`);

console.log('5. Tap Reset');
const resetBtn = page.locator('button[aria-label="Reset selection"]').first();
await resetBtn.click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/05-after-reset.png`, fullPage: true });

const cell9after = await anchorCell.textContent();
console.log(`   9AM after reset glyph: "${cell9after}" (expect empty)`);

console.log('\n✓ Smoke complete — screenshots in', OUT);
await browser.close();
