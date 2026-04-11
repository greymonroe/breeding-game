import { test } from '@playwright/test';

test.use({ headless: true });

const BASE = 'https://greymonroe.github.io/breeding-game';

const pages = [
  { name: 'modules', url: `${BASE}/modules.html` },
  { name: 'lab', url: `${BASE}/lab.html` },
  { name: 'linkage', url: `${BASE}/linkage.html` },
  { name: 'popgen', url: `${BASE}/popgen.html` },
];

for (const p of pages) {
  test(`screenshot ${p.name}`, async ({ page }) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });
    page.on('requestfailed', (req) =>
      errors.push(`requestfailed: ${req.url()} — ${req.failure()?.errorText}`)
    );

    await page.goto(p.url);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: `/tmp/module-${p.name}.png`, timeout: 15_000 });

    if (errors.length) {
      console.log(`\n=== ERRORS on ${p.name} ===`);
      for (const e of errors) console.log('  ' + e);
    } else {
      console.log(`=== ${p.name}: no errors ===`);
    }
  });
}
