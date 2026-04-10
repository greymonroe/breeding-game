/**
 * Challenge Evaluation via Playwright
 *
 * Navigates to the live game, unlocks each tech challenge, takes screenshots,
 * attempts correct and incorrect answers, and captures feedback text.
 *
 * Run:  npx playwright test scripts/challenge-eval.ts --headed
 */

import { test, expect, type Page } from '@playwright/test';

const URL = 'https://greymonroe.github.io/breeding-game';
const SCREENSHOT_DIR = '/tmp/challenge-eval';

// Tech IDs in unlock order (respecting prerequisites)
const TECH_UNLOCK_ORDER = [
  'controlled_cross',    // Punnett Square
  'diversity_dashboard', // Bottleneck Simulation
  'pedigree',            // Trace the Carrier
  'marker_discovery',    // Find the QTL (Manhattan plot)
  'mas',                 // Marker-Assisted Ranking
  'wild_germplasm',      // Backcross Breeding Plan
  'hybrid_breeding',     // Find the Best Hybrid
  'mutagenesis',         // Mutant Screen
  'gene_editing',        // Design CRISPR Guide RNA
  'genomic_prediction',  // Fit the Prediction Model
];

async function waitAndScreenshot(page: Page, name: string) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: false });
}

async function dismissNotices(page: Page) {
  // Close any notice bars
  const closeButtons = page.locator('button:has-text("×")');
  const count = await closeButtons.count();
  for (let i = 0; i < Math.min(count, 5); i++) {
    try { await closeButtons.nth(0).click({ timeout: 500 }); } catch { break; }
  }
}

test('Evaluate all tech challenges', async ({ page }) => {
  test.setTimeout(600_000); // 10 minutes

  await page.goto(URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Take initial game screenshot
  await waitAndScreenshot(page, '00-game-start');

  // Navigate to Tech tab
  const techTab = page.locator('button:has-text("Tech")');
  await techTab.click();
  await page.waitForTimeout(1000);
  await waitAndScreenshot(page, '01-tech-tree');

  const results: Array<{
    techId: string;
    challengeTitle: string;
    opened: boolean;
    screenshotBefore: string;
    interactionNotes: string;
    feedbackCorrect: string;
    feedbackIncorrect: string;
    screenshotAfter: string;
    timeToComplete: string;
  }> = [];

  for (let i = 0; i < TECH_UNLOCK_ORDER.length; i++) {
    const techId = TECH_UNLOCK_ORDER[i];
    const num = String(i + 2).padStart(2, '0');

    console.log(`\n=== Testing tech: ${techId} ===`);

    // Find the tech card and click its unlock button
    // Tech cards have the tech name; look for the challenge/unlock button
    const techCard = page.locator(`[data-tech-id="${techId}"], :has-text("${techId}")`).first();

    // Try to find a "Start Challenge" or lock icon button for this tech
    // The tech tree renders cards with buttons like "Unlock" or "Start"
    const unlockButton = page.locator(`button`).filter({ hasText: /unlock|start|challenge/i });

    // Actually, let's look at what's on the tech tree page more carefully
    // Each tech is a card. Locked ones have a lock. We need to click "Start Challenge"
    // Let's try clicking all visible start/unlock buttons in order

    // Look for the specific tech by searching for its button
    const startButtons = page.locator('button').filter({ hasText: /Start Challenge|Begin|Unlock/i });
    const startCount = await startButtons.count();

    if (startCount === 0) {
      console.log(`  No start buttons found for ${techId}, skipping`);
      results.push({
        techId,
        challengeTitle: techId,
        opened: false,
        screenshotBefore: '',
        interactionNotes: 'No start button found',
        feedbackCorrect: '',
        feedbackIncorrect: '',
        screenshotAfter: '',
        timeToComplete: '',
      });
      continue;
    }

    // Click the first available start button
    try {
      await startButtons.first().click({ timeout: 3000 });
      await page.waitForTimeout(1000);
    } catch {
      console.log(`  Could not click start for ${techId}`);
      continue;
    }

    // Check if a challenge modal appeared
    const modal = page.locator('.fixed.inset-0');
    const modalVisible = await modal.isVisible().catch(() => false);

    if (!modalVisible) {
      console.log(`  No modal appeared for ${techId}`);
      continue;
    }

    // Get challenge title
    const titleEl = modal.locator('h2').first();
    const title = await titleEl.textContent().catch(() => techId);
    console.log(`  Challenge: ${title}`);

    // Screenshot the challenge before interaction
    const beforePath = `${num}-${techId}-before`;
    await waitAndScreenshot(page, beforePath);

    // Record start time
    const startTime = Date.now();
    let interactionNotes = '';
    let feedbackCorrect = '';
    let feedbackIncorrect = '';

    // ── Try to interact with each challenge type ──
    try {
      switch (techId) {
        case 'controlled_cross': {
          // Punnett Square: type 0.25 and submit
          const input = modal.locator('input[type="number"]');
          await input.fill('0.5'); // Wrong answer first
          await modal.locator('button:has-text("Check Answer")').click();
          await page.waitForTimeout(800);
          feedbackIncorrect = await modal.locator('.rounded-lg.border p').first().textContent() ?? '';
          await waitAndScreenshot(page, `${num}-${techId}-wrong`);

          // Try again
          const tryAgain = modal.locator('button:has-text("Try Again")');
          if (await tryAgain.isVisible()) {
            await tryAgain.click();
            await page.waitForTimeout(500);
            await input.fill('0.25'); // Correct
            await modal.locator('button:has-text("Check Answer")').click();
            await page.waitForTimeout(800);
            feedbackCorrect = await modal.locator('.rounded-lg.border p').first().textContent() ?? '';
          }
          interactionNotes = 'Punnett square with number input. Tried wrong (0.5) then correct (0.25).';
          break;
        }

        case 'diversity_dashboard': {
          // Bottleneck: select an answer
          const buttons = modal.locator('button').filter({ hasNotText: /hint|close|check/i });
          const optCount = await buttons.count();
          if (optCount > 0) {
            await buttons.first().click();
            await modal.locator('button:has-text("Check"), button:has-text("Submit")').first().click();
            await page.waitForTimeout(800);
            feedbackIncorrect = await modal.locator('.rounded-lg.border p').first().textContent().catch(() => '');
          }
          interactionNotes = `Bottleneck sim with ${optCount} clickable options.`;
          break;
        }

        case 'pedigree': {
          // Pedigree trace: click on a plant in the pedigree
          const clickable = modal.locator('.cursor-pointer, circle, rect').first();
          if (await clickable.isVisible().catch(() => false)) {
            await clickable.click();
            await page.waitForTimeout(500);
          }
          const submitBtn = modal.locator('button:has-text("Check"), button:has-text("Submit"), button:has-text("This")').first();
          if (await submitBtn.isVisible().catch(() => false)) {
            await submitBtn.click();
            await page.waitForTimeout(800);
          }
          feedbackIncorrect = await modal.locator('.rounded-lg.border p').first().textContent().catch(() => '');
          interactionNotes = 'Pedigree trace challenge — click to identify carrier.';
          break;
        }

        case 'marker_discovery': {
          // Manhattan plot: click a point and submit
          const svgCircle = modal.locator('svg circle').first();
          if (await svgCircle.isVisible().catch(() => false)) {
            await svgCircle.click();
            await page.waitForTimeout(500);
          }
          const submitBtn = modal.locator('button:has-text("This is the QTL")');
          if (await submitBtn.isVisible().catch(() => false)) {
            await submitBtn.click();
            await page.waitForTimeout(800);
          }
          feedbackIncorrect = await modal.locator('.rounded-lg.border p').first().textContent().catch(() => '');
          interactionNotes = 'Manhattan plot — click peaks to identify QTL.';
          break;
        }

        case 'mas': {
          // MAS ranking: select/rank seedlings
          const items = modal.locator('button, tr.cursor-pointer, [role="button"]');
          const itemCount = await items.count();
          if (itemCount > 0) {
            await items.first().click();
            await page.waitForTimeout(300);
          }
          const submitBtn = modal.locator('button:has-text("Check"), button:has-text("Submit"), button:has-text("Rank")').first();
          if (await submitBtn.isVisible().catch(() => false)) {
            await submitBtn.click();
            await page.waitForTimeout(800);
          }
          feedbackIncorrect = await modal.locator('.rounded-lg.border p').first().textContent().catch(() => '');
          interactionNotes = `MAS ranking — ${itemCount} interactive elements.`;
          break;
        }

        case 'wild_germplasm': {
          // Backcross: select number of generations
          const options = modal.locator('button').filter({ hasText: /BC/ });
          const optCount = await options.count();
          if (optCount > 0) {
            await options.first().click(); // BC1 (wrong)
            await modal.locator('button:has-text("Check Answer")').click();
            await page.waitForTimeout(800);
            feedbackIncorrect = await modal.locator('.rounded-lg.border p').first().textContent().catch(() => '');
            await waitAndScreenshot(page, `${num}-${techId}-wrong`);

            const tryAgain = modal.locator('button:has-text("Try Again")');
            if (await tryAgain.isVisible()) {
              await tryAgain.click();
              await page.waitForTimeout(500);
              // Try BC2 (correct - 87.5%)
              const bc2 = modal.locator('button:has-text("BC2")');
              if (await bc2.isVisible()) {
                await bc2.click();
                await modal.locator('button:has-text("Check Answer")').click();
                await page.waitForTimeout(800);
                feedbackCorrect = await modal.locator('.rounded-lg.border p').first().textContent().catch(() => '');
              }
            }
          }
          interactionNotes = `Backcross scheme — ${optCount} BC generation options.`;
          break;
        }

        case 'hybrid_breeding': {
          // Testcross: click on best F1 cross
          const rows = modal.locator('tr.cursor-pointer');
          const rowCount = await rows.count();
          if (rowCount > 0) {
            await rows.first().click();
            await page.waitForTimeout(300);
            await modal.locator('button:has-text("Check Answer")').click();
            await page.waitForTimeout(800);
            feedbackIncorrect = await modal.locator('.rounded-lg.border p').first().textContent().catch(() => '');
          }
          interactionNotes = `Hybrid testcross — ${rowCount} F1 cross rows to choose from.`;
          break;
        }

        case 'mutagenesis': {
          // Mutant screen: click on a plant
          const plants = modal.locator('button, .cursor-pointer').filter({ hasNotText: /hint|close|check|submit/i });
          const plantCount = await plants.count();
          if (plantCount > 0) {
            await plants.nth(0).click();
            await page.waitForTimeout(300);
          }
          const submitBtn = modal.locator('button:has-text("Check"), button:has-text("Submit"), button:has-text("Select")').first();
          if (await submitBtn.isVisible().catch(() => false)) {
            await submitBtn.click();
            await page.waitForTimeout(800);
          }
          feedbackIncorrect = await modal.locator('.rounded-lg.border p').first().textContent().catch(() => '');
          interactionNotes = `Mutant screen — ${plantCount} plants to screen.`;
          break;
        }

        case 'gene_editing': {
          // CRISPR guide RNA: select a sequence
          const seqButtons = modal.locator('button, .cursor-pointer').filter({ hasNotText: /hint|close|check|submit|show/i });
          const seqCount = await seqButtons.count();
          if (seqCount > 0) {
            await seqButtons.nth(0).click();
            await page.waitForTimeout(300);
          }
          const submitBtn = modal.locator('button:has-text("Check"), button:has-text("Submit"), button:has-text("Design")').first();
          if (await submitBtn.isVisible().catch(() => false)) {
            await submitBtn.click();
            await page.waitForTimeout(800);
          }
          feedbackIncorrect = await modal.locator('.rounded-lg.border p').first().textContent().catch(() => '');
          interactionNotes = `CRISPR guide RNA — ${seqCount} sequence options.`;
          break;
        }

        case 'genomic_prediction': {
          // Fit prediction model: adjust sliders/parameters
          const sliders = modal.locator('input[type="range"]');
          const sliderCount = await sliders.count();
          const inputs = modal.locator('input[type="number"]');
          const inputCount = await inputs.count();
          const submitBtn = modal.locator('button:has-text("Check"), button:has-text("Submit"), button:has-text("Fit")').first();
          if (await submitBtn.isVisible().catch(() => false)) {
            await submitBtn.click();
            await page.waitForTimeout(800);
          }
          feedbackIncorrect = await modal.locator('.rounded-lg.border p').first().textContent().catch(() => '');
          interactionNotes = `Genomic prediction — ${sliderCount} sliders, ${inputCount} number inputs.`;
          break;
        }
      }
    } catch (e) {
      interactionNotes += ` [Error: ${(e as Error).message}]`;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Screenshot after interaction
    const afterPath = `${num}-${techId}-after`;
    await waitAndScreenshot(page, afterPath);

    results.push({
      techId,
      challengeTitle: title ?? techId,
      opened: true,
      screenshotBefore: beforePath,
      interactionNotes,
      feedbackCorrect,
      feedbackIncorrect,
      screenshotAfter: afterPath,
      timeToComplete: `${elapsed}s`,
    });

    // Dismiss the challenge modal
    try {
      const continueBtn = modal.locator('button:has-text("Continue")');
      if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await continueBtn.click();
      } else {
        const closeBtn = modal.locator('button:has-text("Come Back Later"), button[aria-label="Close"]').first();
        if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeBtn.click();
        } else {
          // Click outside modal
          await page.mouse.click(10, 10);
        }
      }
      await page.waitForTimeout(500);
    } catch {
      // Force close by pressing escape
      await page.keyboard.press('Escape');
    }

    await dismissNotices(page);
    await page.waitForTimeout(500);
  }

  // ── Print evaluation report ──
  console.log('\n\n' + '='.repeat(80));
  console.log('CHALLENGE EVALUATION REPORT');
  console.log('='.repeat(80));

  for (const r of results) {
    console.log(`\n── ${r.challengeTitle} (${r.techId}) ──`);
    console.log(`  Opened: ${r.opened}`);
    console.log(`  Time: ${r.timeToComplete}`);
    console.log(`  Interaction: ${r.interactionNotes}`);
    if (r.feedbackIncorrect) console.log(`  Wrong answer feedback: "${r.feedbackIncorrect.slice(0, 150)}..."`);
    if (r.feedbackCorrect) console.log(`  Correct answer feedback: "${r.feedbackCorrect.slice(0, 150)}..."`);
    console.log(`  Screenshots: ${r.screenshotBefore}, ${r.screenshotAfter}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log(`Screenshots saved to ${SCREENSHOT_DIR}/`);
  console.log('='.repeat(80));
});
