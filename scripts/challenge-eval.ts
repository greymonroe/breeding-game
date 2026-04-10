/**
 * Challenge Evaluation via Playwright
 *
 * Navigates to the live game, injects cash, opens each tech challenge in order,
 * takes screenshots, attempts interactions, and captures feedback.
 *
 * Run:  npx playwright test scripts/challenge-eval.ts --headed
 */

import { test, type Page } from '@playwright/test';

const URL = 'https://greymonroe.github.io/breeding-game';
const SCREENSHOT_DIR = '/tmp/challenge-eval';

// Tech IDs in dependency order
const TECH_ORDER = [
  { id: 'controlled_cross', name: 'Controlled crosses', cost: 30 },
  { id: 'diversity_dashboard', name: 'Diversity dashboard', cost: 30 },
  { id: 'pedigree', name: 'Pedigree tracking', cost: 35 },
  { id: 'marker_discovery', name: 'Marker discovery', cost: 80 },
  { id: 'mas', name: 'Marker-assisted selection', cost: 80 },
  { id: 'wild_germplasm', name: 'Wild germplasm', cost: 60 },
  { id: 'hybrid_breeding', name: 'Hybrid breeding', cost: 80 },
  { id: 'mutagenesis', name: 'Mutagenesis', cost: 100 },
  { id: 'gene_editing', name: 'Gene editing', cost: 180 },
  { id: 'genomic_prediction', name: 'Genomic prediction', cost: 200 },
];

async function screenshot(page: Page, name: string) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: false });
  console.log(`  📸 ${name}.png`);
}

async function getModalText(page: Page): Promise<string> {
  try {
    const modal = page.locator('.fixed.inset-0');
    return await modal.innerText({ timeout: 2000 });
  } catch { return ''; }
}

test('Evaluate all tech challenges', async ({ page }) => {
  test.setTimeout(600_000);

  await page.goto(URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Inject cash via exposed store hook
  await page.evaluate(() => {
    const store = (window as any).__GAME__;
    if (store) {
      const s = store.getState();
      store.setState({ budget: { ...s.budget, cash: 50000 } });
      console.log('Injected $50000');
    } else {
      console.log('Store not found on window.__GAME__');
    }
  });
  await page.waitForTimeout(500);

  // Navigate to Tech tab
  await page.locator('button:has-text("Tech")').click();
  await page.waitForTimeout(1000);
  await screenshot(page, '00-tech-tree-overview');

  // We need cash. Let's advance a few seasons and measure yield first
  // to have plants with phenotype data (needed for GWAS challenges)
  await page.locator('button:has-text("Field")').click();
  await page.waitForTimeout(500);

  // Select some parents
  const plants = page.locator('[class*="plant-card"], [class*="cursor-pointer"]').filter({ has: page.locator('svg') });
  const plantCount = await plants.count();
  console.log(`Found ${plantCount} plant-like elements`);

  // Click first 3 plants to select them
  for (let i = 0; i < Math.min(3, plantCount); i++) {
    try { await plants.nth(i).click({ timeout: 1000 }); } catch { break; }
  }
  await page.waitForTimeout(500);

  // Measure yield if button exists
  const measureBtn = page.locator('button:has-text("Measure")').first();
  if (await measureBtn.isVisible().catch(() => false)) {
    await measureBtn.click();
    await page.waitForTimeout(500);
  }

  // Advance a season
  const advanceBtn = page.locator('button:has-text("Advance Season")');
  if (await advanceBtn.isVisible().catch(() => false)) {
    await advanceBtn.click();
    await page.waitForTimeout(1000);
  }

  // Measure again
  if (await measureBtn.isVisible().catch(() => false)) {
    await measureBtn.click();
    await page.waitForTimeout(500);
  }

  await screenshot(page, '01-field-with-plants');

  // Now go to tech tab and try unlocking challenges
  await page.locator('button:has-text("Tech")').click();
  await page.waitForTimeout(1000);

  const results: Array<{
    tech: string;
    challengeOpened: boolean;
    modalContent: string;
    interactionType: string;
    feedbackText: string;
    screenshots: string[];
  }> = [];

  for (let i = 0; i < TECH_ORDER.length; i++) {
    const tech = TECH_ORDER[i];
    const num = String(i + 2).padStart(2, '0');
    console.log(`\n=== ${tech.name} (${tech.id}) ===`);

    // Find the unlock button by its cost label
    // The button text is "$XX" (e.g. "$30")
    const costButtons = page.locator(`button:has-text("$${tech.cost}")`);
    const costCount = await costButtons.count();

    if (costCount === 0) {
      // Maybe already unlocked or can't afford
      console.log(`  No $${tech.cost} button found — may be unlocked or prerequisites not met`);

      // Check if it says "Done"
      const doneLabels = page.locator('span:has-text("Done")');
      const doneCount = await doneLabels.count();
      console.log(`  Found ${doneCount} "Done" labels`);

      results.push({
        tech: tech.name,
        challengeOpened: false,
        modalContent: '',
        interactionType: 'skipped — no button',
        feedbackText: '',
        screenshots: [],
      });
      continue;
    }

    // Click the first matching cost button
    try {
      await costButtons.first().click({ timeout: 3000 });
    } catch (e) {
      console.log(`  Could not click button: ${(e as Error).message}`);
      continue;
    }
    await page.waitForTimeout(1500);

    // Check if modal appeared
    const modal = page.locator('.fixed.inset-0');
    const modalVisible = await modal.isVisible().catch(() => false);

    if (!modalVisible) {
      console.log(`  No challenge modal — tech unlocked directly`);
      results.push({
        tech: tech.name,
        challengeOpened: false,
        modalContent: '',
        interactionType: 'unlocked directly (no challenge)',
        feedbackText: '',
        screenshots: [],
      });
      continue;
    }

    // Challenge modal is open!
    const content = await getModalText(page);
    const title = content.split('\n')[0] ?? tech.name;
    console.log(`  Challenge opened: ${title.slice(0, 60)}`);

    // Screenshot before interaction
    const shots: string[] = [];
    const beforeName = `${num}-${tech.id}-challenge`;
    await screenshot(page, beforeName);
    shots.push(beforeName);

    // Try to interact
    let interactionType = 'unknown';
    let feedbackText = '';

    try {
      // Check what kind of inputs exist in the modal
      const hasNumberInput = await modal.locator('input[type="number"]').count() > 0;
      const hasRangeInput = await modal.locator('input[type="range"]').count() > 0;
      const hasTextInput = await modal.locator('input[type="text"]').count() > 0;
      const hasSvg = await modal.locator('svg').count() > 0;
      const hasTable = await modal.locator('table').count() > 0;
      const clickableCards = modal.locator('button').filter({ hasNotText: /hint|close|check|submit|×|show|auto/i });
      const cardCount = await clickableCards.count();

      console.log(`  UI elements: number=${hasNumberInput}, range=${hasRangeInput}, text=${hasTextInput}, svg=${hasSvg}, table=${hasTable}, cards=${cardCount}`);

      // Submit with whatever default state (to see incorrect feedback)
      if (hasNumberInput) {
        interactionType = 'number input';
        const input = modal.locator('input[type="number"]').first();
        await input.fill('0.5');
      } else if (hasRangeInput) {
        interactionType = 'slider/range';
      } else if (hasTable) {
        interactionType = 'table selection';
        const rows = modal.locator('tr').filter({ has: page.locator('td') });
        if (await rows.count() > 0) {
          await rows.first().click();
          await page.waitForTimeout(300);
        }
      } else if (hasSvg && tech.id === 'marker_discovery') {
        interactionType = 'Manhattan plot click';
        // Click a point in the SVG
        const circles = modal.locator('svg g');
        if (await circles.count() > 0) {
          await circles.nth(Math.min(5, await circles.count() - 1)).click();
          await page.waitForTimeout(300);
        }
      } else if (cardCount > 2) {
        interactionType = `card selection (${cardCount} options)`;
        await clickableCards.first().click();
        await page.waitForTimeout(300);
      } else if (hasSvg) {
        interactionType = 'SVG interaction';
        const svgEl = modal.locator('svg').first();
        const box = await svgEl.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5);
          await page.waitForTimeout(300);
        }
      }

      // Try to submit
      const submitBtn = modal.locator('button').filter({
        hasText: /check answer|submit|this is|select|fit|rank|design/i
      }).first();
      if (await submitBtn.isVisible().catch(() => false)) {
        if (await submitBtn.isEnabled().catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(1000);

          // Capture feedback
          const feedbackEl = modal.locator('.rounded-lg.border p, .rounded-lg.border .text-sm').first();
          feedbackText = await feedbackEl.textContent().catch(() => '');

          await screenshot(page, `${num}-${tech.id}-feedback`);
          shots.push(`${num}-${tech.id}-feedback`);
        } else {
          interactionType += ' (submit disabled — need selection)';
        }
      }
    } catch (e) {
      console.log(`  Interaction error: ${(e as Error).message}`);
    }

    results.push({
      tech: tech.name,
      challengeOpened: true,
      modalContent: content.slice(0, 500),
      interactionType,
      feedbackText: feedbackText.slice(0, 300),
      screenshots: shots,
    });

    // Dismiss modal
    try {
      const closeBtn = modal.locator('button:has-text("Continue"), button:has-text("Come Back"), button[aria-label="Close"]').first();
      if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
    } catch {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(800);
  }

  // ── Final Report ──
  console.log('\n\n' + '='.repeat(80));
  console.log('📋 CHALLENGE EVALUATION REPORT');
  console.log('='.repeat(80));

  for (const r of results) {
    console.log(`\n── ${r.tech} ──`);
    console.log(`  Opened: ${r.challengeOpened}`);
    console.log(`  Type: ${r.interactionType}`);
    if (r.feedbackText) console.log(`  Feedback: "${r.feedbackText.slice(0, 200)}"`);
    if (r.modalContent) {
      // Extract the question text
      const lines = r.modalContent.split('\n').filter(l => l.trim().length > 10);
      console.log(`  Question: "${lines.slice(0, 3).join(' | ').slice(0, 200)}"`);
    }
    console.log(`  Screenshots: ${r.screenshots.join(', ') || 'none'}`);
  }

  console.log('\n\nScreenshots saved to: ' + SCREENSHOT_DIR);
  console.log('View them to evaluate visual design, clarity, and educational value.');
  console.log('='.repeat(80));
});
