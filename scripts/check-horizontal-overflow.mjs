import { chromium } from 'playwright';

const baseUrl = process.env.PUBLIC_TEST_BASE_URL || 'http://127.0.0.1:5173';
const widths = [1440, 1280, 1024, 768, 430, 390, 360];
const paths = ['/', '/contact'];
const failures = [];

const browser = await chromium.launch({ headless: true });

for (const path of paths) {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
    const metrics = await page.evaluate(() => ({
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    await page.close();

    const actualWidth = Math.max(metrics.documentScrollWidth, metrics.bodyScrollWidth);
    if (actualWidth > metrics.clientWidth) {
      failures.push({ path, width, actualWidth, clientWidth: metrics.clientWidth });
    }
  }
}

await browser.close();

if (failures.length) {
  console.error('Horizontal overflow detected:');
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}

console.log(`No horizontal overflow detected on ${paths.join(', ')} at ${widths.join(', ')}px.`);
