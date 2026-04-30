import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';

const OUT = '/tmp/kiln-recon';
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const shot = async (page, name) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`  ↳ ${OUT}/${name}.png`);
};

const dump = async (page, label) => {
  const url = page.url();
  const title = await page.title();
  console.log(`[${label}] ${title} @ ${url}`);
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36',
});
const page = await context.newPage();

console.log('1. Load kiln.ph homepage');
await page.goto('https://www.kiln.ph', { waitUntil: 'networkidle', timeout: 30000 });
await dump(page, 'home');
await shot(page, '01-home');

console.log('\n2. Hunt for booking link');
const links = await page.$$eval('a', (as) =>
  as
    .map((a) => ({ text: (a.textContent || '').trim(), href: a.href }))
    .filter((l) => /book|reserv|court|slot/i.test(l.text + ' ' + l.href))
);
console.log('Booking-ish links found:');
links.forEach((l) => console.log(`  - "${l.text}" → ${l.href}`));

if (links.length > 0) {
  const target = links[0].href;
  console.log(`\n3. Navigate to ${target}`);
  await page.goto(target, { waitUntil: 'networkidle', timeout: 30000 });
  await dump(page, 'booking-page');
  await shot(page, '02-booking-initial');

  console.log('\n4. Dump body HTML structure (first 5000 chars)');
  const html = await page.content();
  console.log(html.substring(0, 5000));

  console.log('\n5. Look for form/grid elements');
  const inputs = await page.$$eval('input, button, select, [role=button]', (els) =>
    els.slice(0, 40).map((e) => ({
      tag: e.tagName,
      type: e.getAttribute('type'),
      name: e.getAttribute('name'),
      placeholder: e.getAttribute('placeholder'),
      text: (e.textContent || '').trim().substring(0, 60),
      role: e.getAttribute('role'),
    }))
  );
  console.log('Form/interactive elements:');
  inputs.forEach((e, i) => console.log(`  ${i}. <${e.tag}> ${JSON.stringify(e)}`));
}

await browser.close();
console.log('\nDone. Screenshots in', OUT);
