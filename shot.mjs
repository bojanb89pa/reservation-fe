import { chromium } from 'playwright-core';

const BASE = process.env.BASE ?? 'http://localhost:5174';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

// ── Landing, dark (default) ──
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500); // let entrance animations settle
await page.screenshot({ path: '/tmp/landing-dark.png' });

// Scroll down for categories/listings
await page.mouse.wheel(0, 900);
await page.waitForTimeout(1200);
await page.screenshot({ path: '/tmp/landing-dark-scrolled.png' });

// ── Landing, light ──
await page.evaluate(() => {
  localStorage.setItem('theme', 'light');
  document.documentElement.setAttribute('data-theme', 'light');
});
await page.mouse.wheel(0, -900);
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/landing-light.png' });

// ── Business detail page (booking widget) ──
await page.evaluate(() => {
  localStorage.setItem('theme', 'dark');
  document.documentElement.setAttribute('data-theme', 'dark');
});
// Find first business card link if any data exists
const link = await page.$('a[href^="/businesses/"]');
if (link) {
  await link.click();
  await page.waitForTimeout(2200);
  await page.screenshot({ path: '/tmp/detail-dark.png', fullPage: true });
} else {
  console.log('NO_BUSINESS_DATA');
}

console.log('CONSOLE_ERRORS:', JSON.stringify(errors.slice(0, 8), null, 1));
await browser.close();
