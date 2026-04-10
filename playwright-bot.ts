/**
 * Playwright bot that plays Artificial Selection in a visible Chrome window.
 *
 * Strategy: follow the quest chain — discover dominance, test cross, release,
 * discover linkage, break linkage, all while maintaining a profitable breeding
 * program.
 *
 * Run:   npx playwright test playwright-bot.ts --headed
 */
import { test, type Page } from '@playwright/test';

const GAME_URL = 'https://greymonroe.github.io/breeding-game/';
const SLOW_MO = 300;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const log = (msg: string) => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);

// ── Low-level helpers ──

async function getPlantCards(page: Page) {
  return page.locator('button:has(svg[viewBox="0 0 80 110"])');
}

async function selectPlantByIndex(page: Page, index: number) {
  const cards = await getPlantCards(page);
  if (index >= await cards.count()) return;
  await cards.nth(index).click();
  await sleep(150);
}

async function clearSelection(page: Page) {
  const btn = page.getByRole('button', { name: /Clear selection/i });
  if (await btn.count() > 0 && await btn.first().isVisible()) {
    await btn.first().click();
    await sleep(200);
  }
}

async function selectTopN(page: Page, n: number) {
  const cards = await getPlantCards(page);
  const count = await cards.count();
  for (let i = 0; i < Math.min(n, count); i++) {
    await cards.nth(i).click();
    await sleep(100);
  }
}

/** Select a red plant and a white plant to enable dominance discovery. */
async function selectRedAndWhite(page: Page): Promise<boolean> {
  const cards = await getPlantCards(page);
  const count = await cards.count();
  let redIdx = -1, whiteIdx = -1;

  for (let i = 0; i < count && (redIdx === -1 || whiteIdx === -1); i++) {
    const card = cards.nth(i);
    const circles = card.locator('circle');
    if (await circles.count() === 0) continue;
    const fill = await circles.first().getAttribute('fill');
    if (!fill) continue;
    if (fill.includes('c0392b') && redIdx === -1) redIdx = i;
    else if (!fill.includes('c0392b') && whiteIdx === -1) whiteIdx = i;
  }

  if (redIdx >= 0 && whiteIdx >= 0) {
    await clearSelection(page);
    await selectPlantByIndex(page, redIdx);
    await selectPlantByIndex(page, whiteIdx);
    log(`  Selected Red (#${redIdx}) × White (#${whiteIdx})`);
    return true;
  }
  return false;
}

/** Select a mix: top yield plants plus one from a different color if available. */
async function selectDiverseParents(page: Page, n: number) {
  const cards = await getPlantCards(page);
  const count = await cards.count();

  // Find colors of all plants
  const colors: boolean[] = []; // true = red
  for (let i = 0; i < count; i++) {
    const fill = await cards.nth(i).locator('circle').first().getAttribute('fill') ?? '';
    colors.push(fill.includes('c0392b'));
  }

  // Select top (n-1) by position (yield-sorted), then add one of opposite color
  const selected: number[] = [];
  for (let i = 0; i < Math.min(n - 1, count); i++) selected.push(i);

  // Check if we have color diversity already
  const hasRed = selected.some(i => colors[i]);
  const hasWhite = selected.some(i => !colors[i]);

  if (!hasWhite) {
    // Find first white not already selected
    const whiteIdx = colors.findIndex((c, i) => !c && !selected.includes(i));
    if (whiteIdx >= 0) selected.push(whiteIdx);
    else if (count > n - 1) selected.push(n - 1);
  } else if (!hasRed) {
    const redIdx = colors.findIndex((c, i) => c && !selected.includes(i));
    if (redIdx >= 0) selected.push(redIdx);
    else if (count > n - 1) selected.push(n - 1);
  } else {
    if (count > n - 1) selected.push(n - 1);
  }

  await clearSelection(page);
  for (const i of selected) {
    await selectPlantByIndex(page, i);
  }
  log(`  Selected ${selected.length} diverse parents (${selected.filter(i => colors[i]).length} red, ${selected.filter(i => !colors[i]).length} white)`);
}

async function measureTrait(page: Page, traitName: string): Promise<boolean> {
  const btn = page.getByRole('button', { name: new RegExp(`Measure ${traitName}`, 'i') });
  if (await btn.count() > 0 && await btn.first().isEnabled()) {
    await btn.first().click();
    await sleep(SLOW_MO);
    return true;
  }
  return false;
}

async function advanceSeason(page: Page): Promise<boolean> {
  const btn = page.getByRole('button', { name: /Advance season/i });
  if (await btn.isEnabled()) {
    await btn.click();
    await sleep(SLOW_MO * 2);
    return true;
  }
  return false;
}

async function releaseTopPlant(page: Page): Promise<boolean> {
  await clearSelection(page);
  await selectPlantByIndex(page, 0);
  const btn = page.getByRole('button', { name: /Release.*\$20/i });
  if (await btn.count() > 0 && await btn.first().isVisible()) {
    await btn.first().click();
    await sleep(SLOW_MO);
    log(`  📦 Released variety`);
    await clearSelection(page);
    return true;
  }
  await clearSelection(page);
  return false;
}

async function dismissNotices(page: Page) {
  const btns = page.locator('button:has-text("×")');
  let count = await btns.count();
  while (count > 0) {
    try { await btns.first().click(); } catch { break; }
    await sleep(50);
    count = await btns.count();
  }
}

/** Try to answer any visible interpretation panel. Returns true if answered. */
async function answerPanels(page: Page): Promise<boolean> {
  // Color dominance
  const redDom = page.getByRole('button', { name: /R \(Red is dominant\)/i });
  if (await redDom.count() > 0 && await redDom.first().isVisible()) {
    log(`  🔬 Discovered: Red (R) is dominant over White (r)`);
    await redDom.first().click();
    await sleep(SLOW_MO);
    await dismissNotices(page);
    return true;
  }

  // Shape: incomplete dominance
  const incDom = page.getByRole('button', { name: /Incomplete dominance/i });
  if (await incDom.count() > 0 && await incDom.first().isVisible()) {
    log(`  🔬 Discovered: Shape shows incomplete dominance`);
    await incDom.first().click();
    await sleep(SLOW_MO);
    await dismissNotices(page);
    return true;
  }

  // Linkage (nursery-level panel)
  const linkage = page.getByRole('button', { name: /Linkage.*chromosome/i });
  if (await linkage.count() > 0 && await linkage.first().isVisible()) {
    log(`  🔬 Discovered: Color and yield are linked on the same chromosome`);
    await linkage.first().click();
    await sleep(SLOW_MO);
    await dismissNotices(page);
    return true;
  }

  // Linkage — also try the near-each-other variant
  const linkage2 = page.getByRole('button', { name: /Linkage.*near each other/i });
  if (await linkage2.count() > 0 && await linkage2.first().isVisible()) {
    log(`  🔬 Discovered: Color and yield genes near each other`);
    await linkage2.first().click();
    await sleep(SLOW_MO);
    await dismissNotices(page);
    return true;
  }

  // Test cross — find individual panels and answer each one scoped to its own context
  const testCrossPanels = page.locator('div:has(> div:has-text("Test cross result"))');
  for (let i = 0; i < await testCrossPanels.count(); i++) {
    const panel = testCrossPanels.nth(i);
    if (!await panel.isVisible()) continue;

    const panelText = await panel.innerText();
    // Extract plant ID from "is {id} homozygous or heterozygous?"
    const idMatch = panelText.match(/is (\S+) homozygous/);
    const plantId = idMatch ? idMatch[1] : '?';

    // Check if we already failed on this plant (avoid infinite retries)
    if (failedTestCrosses.has(plantId)) continue;

    // Count recessive offspring from THIS panel's text
    const recessiveMatch = panelText.match(/(\d+)\n\s*(White|Elongated)/i);
    const recessiveCount = recessiveMatch ? parseInt(recessiveMatch[1]) : 0;

    // Find buttons scoped to this panel
    const panelHomBtn = panel.getByRole('button', { name: /^Homozygous/i });
    const panelHetBtn = panel.getByRole('button', { name: /^Heterozygous/i });
    if (await panelHomBtn.count() === 0) continue;

    const answer = recessiveCount > 0 ? 'heterozygous' : 'homozygous';
    const btn = recessiveCount > 0 ? panelHetBtn : panelHomBtn;

    log(`  🧪 Test cross ${plantId}: ${recessiveCount} recessive → ${answer}`);
    await btn.first().click();
    await sleep(SLOW_MO);

    // Check if the panel is still visible (wrong answer)
    if (await panel.isVisible().catch(() => false)) {
      const stillHasBtn = await panel.getByRole('button', { name: /^Homozygous/i }).count();
      if (stillHasBtn > 0) {
        log(`    ❌ Wrong answer — marking ${plantId} to skip`);
        failedTestCrosses.add(plantId);
      }
    }

    await dismissNotices(page);
    return true;
  }

  return false;
}

/** Track plants where we already gave a wrong test cross answer to avoid retrying */
const failedTestCrosses = new Set<string>();

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: `/tmp/bg-${name}.png`, fullPage: true });
}

async function logObjectives(page: Page) {
  const section = page.locator('h2:has-text("OBJECTIVES")').locator('..');
  if (await section.count() === 0) return;
  const text = await section.first().innerText();
  const lines = text.split('\n').filter(l => l.trim());
  log('  OBJECTIVES:');
  for (const l of lines) {
    if (l.includes('OBJECTIVES')) continue;
    log(`    ${l}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN GAME LOOP
// ═══════════════════════════════════════════════════════════════

test('Play Artificial Selection — smart bot', async ({ page }) => {
  test.setTimeout(300_000);

  log('🌱 Loading game...');
  await page.goto(GAME_URL);
  await page.waitForLoadState('networkidle');
  await sleep(1500);
  log('Game loaded!');
  await screenshot(page, '00-start');

  // ── Season 0: Survey ──
  log('\n══ SEASON 0: Survey founders ══');
  await measureTrait(page, 'Yield');
  await measureTrait(page, 'Flavor');
  log('  Measured yield + flavor on all founders');

  // ── Season 1: Cross red × white for dominance discovery ──
  log('\n══ SEASON 1: Red × White cross ══');
  const foundPair = await selectRedAndWhite(page);
  if (!foundPair) {
    log('  No red/white pair found, selecting top 4');
    await selectTopN(page, 4);
  }
  await advanceSeason(page);
  await dismissNotices(page);
  await measureTrait(page, 'Yield');
  await measureTrait(page, 'Flavor');

  // Answer any dominance panel
  await answerPanels(page);
  await screenshot(page, '01-season1');

  // ── Seasons 2-3: Keep crossing red × white to get test cross opportunities ──
  for (let s = 2; s <= 3; s++) {
    log(`\n══ SEASON ${s}: Build segregating family ══`);
    await selectDiverseParents(page, 5);
    await advanceSeason(page);
    await dismissNotices(page);
    await measureTrait(page, 'Yield');
    await measureTrait(page, 'Flavor');

    // Try all panels (max 3 per season to avoid loops)
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!await answerPanels(page)) break;
    }
  }
  await screenshot(page, '02-season3');

  // ── Seasons 4-15: Main breeding loop ──
  for (let s = 4; s <= 15; s++) {
    log(`\n══ SEASON ${s} ══`);

    // Use diverse parents to maintain color segregation (needed for linkage discovery)
    await selectDiverseParents(page, 5);

    const ok = await advanceSeason(page);
    if (!ok) {
      log('  💀 Cannot advance — out of cash?');
      await screenshot(page, `stuck-s${s}`);
      break;
    }
    await dismissNotices(page);

    // Measure
    await measureTrait(page, 'Yield');
    await measureTrait(page, 'Flavor');

    // Answer panels (max 3 per season to avoid infinite loops on wrong answers)
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!await answerPanels(page)) break;
    }

    // Release a variety periodically
    if (s >= 3 && s % 3 === 0) {
      await releaseTopPlant(page);
      await dismissNotices(page);
    }

    // Periodic status
    if (s % 4 === 0) {
      await screenshot(page, `s${s}`);
      await logObjectives(page);
    }
  }

  // ── Final report ──
  log('\n══ FINAL REPORT ══');
  await screenshot(page, 'final-field');

  for (const tab of ['Lab', 'Data', 'Tech']) {
    await page.getByRole('button', { name: new RegExp(tab, 'i') }).first().click();
    await sleep(300);
    await screenshot(page, `final-${tab.toLowerCase()}`);
  }

  // Back to Field
  await page.getByRole('button', { name: /Field/i }).first().click();
  await sleep(300);

  await logObjectives(page);
  await screenshot(page, 'final');
  log('\n🏁 Bot complete!');
});
