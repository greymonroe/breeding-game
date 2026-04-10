import { test, devices } from '@playwright/test';

const iPhone = devices['iPhone 13'];

test('Mobile viewport screenshots', async ({ browser }) => {
  const context = await browser.newContext({
    ...iPhone,
  });
  const page = await context.newPage();
  await page.goto('https://greymonroe.github.io/breeding-game/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: '/tmp/mobile-landing.png', fullPage: false });
  
  const cards = page.locator('button:has(svg[viewBox="0 0 80 110"])');
  if (await cards.count() > 0) {
    await cards.first().click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: '/tmp/mobile-selected.png', fullPage: false });
  
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/mobile-plants.png', fullPage: false });
  
  // Open quests overlay
  const btns = page.locator('button');
  for (let i = 0; i < await btns.count(); i++) {
    const text = await btns.nth(i).textContent();
    if (text?.includes('\u{1F4CC}')) {
      await btns.nth(i).click();
      await page.waitForTimeout(500);
      break;
    }
  }
  await page.screenshot({ path: '/tmp/mobile-quests.png', fullPage: false });
  
  // Close and open market
  const closeBtn = page.locator('button:has-text("Close")');
  if (await closeBtn.count() > 0) {
    await closeBtn.first().click();
    await page.waitForTimeout(300);
  }
  for (let i = 0; i < await btns.count(); i++) {
    const text = await btns.nth(i).textContent();
    if (text?.includes('\u{1F4F0}')) {
      await btns.nth(i).click();
      await page.waitForTimeout(500);
      break;
    }
  }
  await page.screenshot({ path: '/tmp/mobile-market.png', fullPage: false });
  
  // Full page shot
  const closeBtn2 = page.locator('button:has-text("Close")');
  if (await closeBtn2.count() > 0) await closeBtn2.first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/mobile-fullpage.png', fullPage: true });
});
