import { chromium } from 'playwright-core';

const BASE = process.env.BASE ?? 'http://localhost:5174';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE, { waitUntil: 'networkidle' });
const link = await page.$('a[href^="/businesses/"]');
await link.click();
await page.waitForTimeout(1800);

// Select first service chip, then first resource chip
const tabs = await page.$$('[role="tab"]');
console.log('tabs:', tabs.length);
if (tabs.length) {
  await tabs[0].click();
  await page.waitForTimeout(600);
  const tabs2 = await page.$$('[role="tab"]');
  // resource tabs come after service tabs; click the last group's first
  await tabs2[tabs2.length - 1].click();
  await page.waitForTimeout(1500);
}

// Try clicking an enabled future day in the calendar
const day = await page.$('button:not([disabled]):not([aria-label])[class*="day"]:not([class*="dayEmpty"])');
if (day) {
  await day.click();
  await page.waitForTimeout(1200);
}

// Screenshot just the widget
const widget = await page.$('[class*="shell"]');
if (widget) await widget.screenshot({ path: '/tmp/widget-dark.png' });
await page.screenshot({ path: '/tmp/detail-flow-dark.png', fullPage: true });

console.log('CONSOLE_ERRORS:', JSON.stringify(errors.slice(0, 8)));
await browser.close();
