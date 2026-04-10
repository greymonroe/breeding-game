import { test } from '@playwright/test';
test('screenshot lab', async ({ page }) => {
  await page.goto('http://localhost:5173/breeding-game/lab.html');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/lab-module.png', fullPage: true });
  const crossBtn = page.locator('button:has-text("Cross!")');
  if (await crossBtn.isVisible({ timeout: 2000 })) {
    await crossBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/lab-module-crossed.png', fullPage: true });
  }
});
