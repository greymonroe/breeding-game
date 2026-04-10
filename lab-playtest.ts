import { test } from '@playwright/test';

const URL = 'https://greymonroe.github.io/breeding-game/lab.html';

test('Play through Mendelian module', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // ── Experiment 1: One Gene ──
  console.log('=== Exp 1: One Gene ===');
  await page.locator('button:has-text("Cross!")').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/lab-exp1-f1.png' });

  // Answer: Red is dominant
  await page.locator('button:has-text("Red is dominant over white")').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/lab-exp1-answer1.png' });

  // F2 cross
  const f2Cross = page.locator('button:has-text("Cross!")').nth(1);
  if (await f2Cross.isVisible({ timeout: 2000 })) {
    await f2Cross.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/lab-exp1-f2.png' });
  }

  // Answer: 3:1
  const ratio31 = page.getByRole('button', { name: '3:1', exact: true });
  if (await ratio31.isVisible({ timeout: 2000 })) {
    await ratio31.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '/tmp/lab-exp1-complete.png' });
  }

  // ── Experiment 2: Predict Offspring ──
  console.log('=== Exp 2: Predict Offspring ===');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/lab-exp2-start.png' });

  const ans11 = page.locator('button:has-text("1:1 red:white")');
  if (await ans11.isVisible({ timeout: 2000 })) {
    await ans11.click();
    await page.waitForTimeout(800);
    // Do the cross
    const crossBtn = page.locator('button:has-text("Cross!")');
    if (await crossBtn.isVisible({ timeout: 2000 })) {
      await crossBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: '/tmp/lab-exp2-result.png' });
    }
  }

  // ── Experiment 3: Incomplete Dominance ──
  console.log('=== Exp 3: Incomplete Dominance ===');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/lab-exp3-start.png' });

  const crossBtn3 = page.locator('button:has-text("Cross!")');
  if (await crossBtn3.isVisible({ timeout: 2000 })) {
    await crossBtn3.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/lab-exp3-pink.png' });
  }

  // Answer: intermediate
  const intermediate = page.locator('button').filter({ hasText: /intermediate/ });
  if (await intermediate.isVisible({ timeout: 2000 })) {
    await intermediate.click();
    await page.waitForTimeout(800);

    // F2 cross
    const f2Btn = page.locator('button:has-text("Cross!")').last();
    if (await f2Btn.isVisible({ timeout: 2000 })) {
      await f2Btn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: '/tmp/lab-exp3-f2.png' });
    }
  }

  // ── Experiment 4: Test Cross ──
  console.log('=== Exp 4: Test Cross ===');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/lab-exp4-start.png' });

  const whiteBtn = page.locator('button').filter({ hasText: /white.*rr/i });
  if (await whiteBtn.isVisible({ timeout: 2000 })) {
    await whiteBtn.click();
    await page.waitForTimeout(800);

    const crossBtn4 = page.locator('button:has-text("Cross!")');
    if (await crossBtn4.isVisible({ timeout: 2000 })) {
      await crossBtn4.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: '/tmp/lab-exp4-result.png' });
    }
  }

  // ── Experiment 5: Two Genes ──
  console.log('=== Exp 5: Two Genes ===');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/lab-exp5-start.png' });

  const crossBtn5 = page.locator('button:has-text("Cross!")').first();
  if (await crossBtn5.isVisible({ timeout: 2000 })) {
    await crossBtn5.click();
    await page.waitForTimeout(1000);

    // F2
    const f2Btn5 = page.locator('button:has-text("Cross!")').last();
    if (await f2Btn5.isVisible({ timeout: 2000 })) {
      await f2Btn5.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/lab-exp5-f2.png' });
    }

    // Answer: 9:3:3:1
    const ratio9331 = page.getByRole('button', { name: '9:3:3:1', exact: true });
    if (await ratio9331.isVisible({ timeout: 2000 })) {
      await ratio9331.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: '/tmp/lab-exp5-complete.png' });
    }
  }

  // ── Experiment 6: Epistasis ──
  console.log('=== Exp 6: Epistasis ===');
  await page.waitForTimeout(1500);

  const crossBtn6 = page.locator('button:has-text("Cross!")');
  if (await crossBtn6.isVisible({ timeout: 2000 })) {
    await crossBtn6.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/lab-exp6-result.png' });
  }

  const ratio934 = page.getByRole('button', { name: '9:3:4', exact: true });
  if (await ratio934.isVisible({ timeout: 2000 })) {
    await ratio934.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '/tmp/lab-exp6-complete.png' });
  }

  // ── Experiment 7: Quantitative ──
  console.log('=== Exp 7: Quantitative ===');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/lab-exp7-start.png' });

  // Try 1 gene
  const makeF2 = page.locator('button:has-text("Make F2")');
  if (await makeF2.isVisible({ timeout: 2000 })) {
    await makeF2.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/lab-exp7-1gene.png' });
  }

  // Switch to 5 genes
  const btn5 = page.getByRole('button', { name: '5', exact: true });
  if (await btn5.isVisible({ timeout: 2000 })) {
    await btn5.click();
    await page.waitForTimeout(500);
    if (await makeF2.isVisible({ timeout: 2000 })) {
      await makeF2.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/lab-exp7-5genes.png' });
    }
  }

  // Switch to 12 genes
  const btn12 = page.locator('button:has-text("12")');
  if (await btn12.isVisible({ timeout: 2000 })) {
    await btn12.click();
    await page.waitForTimeout(500);
    if (await makeF2.isVisible({ timeout: 2000 })) {
      await makeF2.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/lab-exp7-12genes.png' });
    }
  }

  // Final state
  await page.screenshot({ path: '/tmp/lab-final.png', fullPage: true });
  console.log('=== Playtest complete ===');
});
