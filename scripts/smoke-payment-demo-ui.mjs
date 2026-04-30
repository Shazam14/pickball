import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';

const OUT = '/tmp/payment-demo-ui';
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  httpCredentials: { username: 'sideout', password: 'sideoutengr' },
});
const page = await ctx.newPage();
page.on('pageerror', e => console.log('  [pageerror]', e.message));

await page.goto('http://localhost:3000/admin/payment-demo', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/01-empty.png`, fullPage: true });
console.log('Screenshot saved:', `${OUT}/01-empty.png`);

await browser.close();
