/**
 * Evaluation playthrough — plays like a curious student, explores every
 * tab, tries to complete quests, takes screenshots at learning moments.
 *
 * Run:  npx playwright test playwright-eval.ts --headed
 */
import { test, type Page } from '@playwright/test';

const URL = 'https://greymonroe.github.io/breeding-game/';
const SLOW = 250;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const log = (msg: string) => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);

// ── Helpers ──

async function cards(page: Page) { return page.locator('button:has(svg[viewBox="0 0 80 110"])'); }
async function clickCard(page: Page, i: number) { await (await cards(page)).nth(i).click(); await sleep(100); }
async function clear(page: Page) {
  const b = page.getByRole('button', { name: /Clear selection/i });
  if (await b.count() > 0 && await b.first().isVisible()) await b.first().click();
  await sleep(100);
}
async function measure(page: Page, trait: string, reps?: number) {
  if (reps && reps > 1) {
    const b = page.getByRole('button', { name: new RegExp(`\\+${reps} reps`, 'i') });
    if (await b.count() > 0 && await b.first().isVisible() && await b.first().isEnabled()) {
      await b.first().click(); await sleep(SLOW); return true;
    }
  }
  const b = page.getByRole('button', { name: new RegExp(`Measure ${trait}|${trait} \\(\\$`, 'i') });
  if (await b.count() > 0 && await b.first().isVisible() && await b.first().isEnabled()) {
    await b.first().click(); await sleep(SLOW); return true;
  }
  return false;
}
async function advance(page: Page) {
  const b = page.getByRole('button', { name: /Advance season/i });
  if (await b.isEnabled()) { await b.click(); await sleep(SLOW * 2); return true; }
  return false;
}
async function dismiss(page: Page) {
  let n = await page.locator('button:has-text("×")').count();
  while (n > 0) { try { await page.locator('button:has-text("×")').first().click(); } catch { break; } await sleep(30); n = await page.locator('button:has-text("×")').count(); }
}
async function release(page: Page) {
  const b = page.getByRole('button', { name: /Release.*\$/ });
  if (await b.count() > 0 && await b.first().isVisible()) { await b.first().click(); await sleep(SLOW); return true; }
  return false;
}
async function tab(page: Page, name: string) {
  await page.getByRole('button', { name: new RegExp(name, 'i') }).first().click();
  await sleep(SLOW);
}
async function shot(page: Page, name: string) {
  await page.screenshot({ path: `/tmp/eval-${name}.png`, fullPage: true });
}
async function answer(page: Page): Promise<boolean> {
  for (const [pat] of [
    [/R \(Red is dominant\)/i],
    [/Incomplete dominance/i],
    [/Linkage.*chromosome/i],
    [/Linkage.*near each other/i],
  ]) {
    const b = page.getByRole('button', { name: pat });
    if (await b.count() > 0 && await b.first().isVisible()) {
      await b.first().click(); await sleep(SLOW); await dismiss(page); return true;
    }
  }
  // Test cross — scoped to panel
  const panels = page.locator('div:has(> div:has-text("Test cross"))');
  for (let i = 0; i < await panels.count(); i++) {
    const p = panels.nth(i);
    if (!await p.isVisible()) continue;
    const txt = await p.innerText();
    const rec = txt.match(/(\d+)\n\s*(White|Elongated)/i);
    const cnt = rec ? parseInt(rec[1]) : 0;
    const btn = cnt > 0
      ? p.getByRole('button', { name: /^Heterozygous/i })
      : p.getByRole('button', { name: /^Homozygous/i });
    if (await btn.count() > 0) {
      await btn.first().click(); await sleep(SLOW); await dismiss(page); return true;
    }
  }
  return false;
}

async function selectRedAndWhite(page: Page) {
  const c = await cards(page);
  const n = await c.count();
  let red = -1, white = -1;
  for (let i = 0; i < n && (red < 0 || white < 0); i++) {
    const fill = await c.nth(i).locator('circle').first().getAttribute('fill') ?? '';
    if (fill.includes('c0392b') && red < 0) red = i;
    else if (!fill.includes('c0392b') && white < 0) white = i;
  }
  if (red >= 0 && white >= 0) {
    await clear(page); await clickCard(page, red); await clickCard(page, white);
    return true;
  }
  return false;
}

async function selectDiverse(page: Page, n: number) {
  const c = await cards(page);
  const total = await c.count();
  const colors: boolean[] = [];
  for (let i = 0; i < total; i++) {
    const fill = await c.nth(i).locator('circle').first().getAttribute('fill') ?? '';
    colors.push(fill.includes('c0392b'));
  }
  const sel: number[] = [];
  for (let i = 0; i < Math.min(n - 1, total); i++) sel.push(i);
  const hasWhite = sel.some(i => !colors[i]);
  if (!hasWhite) {
    const wi = colors.findIndex((c, i) => !c && !sel.includes(i));
    if (wi >= 0) sel.push(wi); else if (total > n - 1) sel.push(n - 1);
  } else if (total > n - 1) sel.push(n - 1);
  await clear(page);
  for (const i of sel) await clickCard(page, i);
}

async function objectives(page: Page): Promise<string> {
  const s = page.locator('h2:has-text("QUEST BOARD"), h2:has-text("OBJECTIVES")').locator('..');
  if (await s.count() === 0) return '';
  return await s.first().innerText();
}

async function hud(page: Page): Promise<string> {
  const els = page.locator('.grid > div');
  const parts: string[] = [];
  for (let i = 0; i < await els.count(); i++) parts.push(await els.nth(i).innerText());
  return parts.join(' | ');
}

// ═══════════════════════════════════════════════════════════════
test('Evaluate gameplay as a student', async ({ page }) => {
  test.setTimeout(600_000);

  log('═══════════════════════════════════════════════');
  log('  ARTIFICIAL SELECTION — Student Evaluation');
  log('═══════════════════════════════════════════════\n');

  await page.goto(URL);
  await page.waitForLoadState('networkidle');
  await sleep(1500);
  await shot(page, '00-landing');

  // ── Read the opening state ──
  log('PHASE 0: First impressions');
  log(`  HUD: ${await hud(page)}`);
  const hints = await page.locator('[class*="border-sky"]').allInnerTexts();
  log(`  Hints shown: ${hints.length}`);
  for (const h of hints) log(`    "${h.replace(/\n/g, ' ').trim().slice(0, 80)}..."`);
  log(`  Plants visible: ${await (await cards(page)).count()}`);
  log(`  Objectives:\n${await objectives(page)}\n`);

  // ── Season 0: Explore before doing anything ──
  log('PHASE 1: Exploring tabs before first action');
  await tab(page, 'Lab'); await shot(page, '01-lab-empty');
  const labText = await page.locator('main, section, .space-y-6').first().innerText();
  log(`  Lab tab content (first 200 chars): "${labText.slice(0, 200)}..."`);

  await tab(page, 'Data'); await shot(page, '01-data-empty');
  await tab(page, 'Tech'); await shot(page, '01-tech');
  const techText = await page.locator('main, section, .space-y-6').first().innerText();
  log(`  Tech tree items visible: ${(techText.match(/TIER/gi) ?? []).length} tiers`);

  await tab(page, 'Field');

  // ── Season 0: Measure and select ──
  log('\nPHASE 2: Season 0 — measure founders');
  await measure(page, 'Yield');
  await measure(page, 'Flavor');
  log('  Measured yield + flavor');
  await shot(page, '02-measured');

  // ── Season 1: Cross red × white ──
  log('\nPHASE 3: Season 1 — red × white cross');
  await selectRedAndWhite(page);
  await advance(page); await dismiss(page);
  await measure(page, 'Yield');
  await measure(page, 'Flavor');
  // Try answering panels
  for (let i = 0; i < 3; i++) if (!await answer(page)) break;
  await shot(page, '03-season1');
  log(`  Objectives after s1:\n${await objectives(page)}`);

  // ── Seasons 2-5: Build populations, discover things ──
  for (let s = 2; s <= 5; s++) {
    log(`\nSeason ${s}:`);
    await selectDiverse(page, 5);
    if (!await advance(page)) { log('  STUCK'); break; }
    await dismiss(page);
    await measure(page, 'Yield');
    await measure(page, 'Flavor');
    for (let i = 0; i < 3; i++) if (!await answer(page)) break;
    if (s === 3) await shot(page, '04-season3');
  }
  log(`  HUD at s5: ${await hud(page)}`);

  // ── Season 6: Try replicated trial ──
  log('\nPHASE 4: Season 6 — try replicated trials');
  await selectDiverse(page, 5);
  await advance(page); await dismiss(page);
  await measure(page, 'Yield');
  await measure(page, 'Flavor');
  // Now try +5 reps
  const didTrial = await measure(page, 'Yield', 5);
  log(`  Ran 5-rep yield trial: ${didTrial}`);
  await shot(page, '05-trial');
  // Hover a plant to see SE
  const firstCard = (await cards(page)).first();
  await firstCard.hover();
  await sleep(500);
  await shot(page, '05-trial-tooltip');

  // ── Season 6: Release best plant ──
  await clear(page); await clickCard(page, 0);
  const released = await release(page);
  log(`  Released variety: ${released}`);
  await dismiss(page);
  for (let i = 0; i < 3; i++) if (!await answer(page)) break;

  // ── Seasons 7-12: Keep breeding ──
  for (let s = 7; s <= 12; s++) {
    await selectDiverse(page, 5);
    if (!await advance(page)) break;
    await dismiss(page);
    await measure(page, 'Yield');
    await measure(page, 'Flavor');
    for (let i = 0; i < 3; i++) if (!await answer(page)) break;
    if (s % 3 === 0) {
      await clear(page); await clickCard(page, 0);
      await release(page); await dismiss(page); await clear(page);
    }
    if (s === 9) await shot(page, '06-season9');
    if (s === 12) await shot(page, '07-season12');
  }

  // ── Seasons 13-20: Push further ──
  for (let s = 13; s <= 20; s++) {
    await selectDiverse(page, 5);
    if (!await advance(page)) { log(`  Ran out of cash at season ${s}`); break; }
    await dismiss(page);
    await measure(page, 'Yield');
    await measure(page, 'Flavor');
    for (let i = 0; i < 3; i++) if (!await answer(page)) break;
    if (s % 4 === 0) {
      await clear(page); await clickCard(page, 0);
      await release(page); await dismiss(page); await clear(page);
    }
  }

  // ── Final evaluation ──
  log('\n═══════════════════════════════════════════════');
  log('  FINAL EVALUATION');
  log('═══════════════════════════════════════════════');

  log(`\nHUD: ${await hud(page)}`);
  await shot(page, '08-final-field');

  const finalObj = await objectives(page);
  log(`\nQuest status:\n${finalObj}`);

  // Count completed
  const completed = (finalObj.match(/[✅]/g) ?? []).length;
  const total = (finalObj.match(/[⭐✅🔒]/g) ?? []).length;
  log(`\nQuests completed: ${completed}/${total}`);

  // Check each tab
  await tab(page, 'Lab'); await shot(page, '09-final-lab');
  const finalLab = await page.locator('.card-lab, .space-y-4, section').first().innerText();
  log(`\nLab notebook content:\n  ${finalLab.slice(0, 300).replace(/\n/g, '\n  ')}`);

  await tab(page, 'Data'); await shot(page, '10-final-data');

  await tab(page, 'Tech'); await shot(page, '11-final-tech');

  await tab(page, 'Field');

  log('\n═══════════════════════════════════════════════');
  log('  EVALUATION COMPLETE');
  log('═══════════════════════════════════════════════\n');
});
