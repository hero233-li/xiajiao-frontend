import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true });
const folder = 'docs/fitness-motion/all-actions';
await mkdir(folder, { recursive: true });
const results = [],
  errors = [],
  writes = [];
const ids = [
  'lat-pulldown',
  'leg-press',
  'chest-press',
  'seated-row',
  'leg-curl',
  'hip-thrust',
  'hip-abduction',
  'dead-bug',
  'plank',
  'treadmill-walk',
  'incline-walk',
  'flat-walk',
  'dynamic-warmup',
  'hip-circles',
  'bodyweight-squat',
  'calf-raise',
  'hip-hinge',
  'recovery-stretch',
  'hamstring-stretch',
  'calf-stretch',
  'glute-stretch',
  'chest-stretch',
  'back-stretch',
];
const base = 'http://127.0.0.1:5180/docs/fitness-motion/preview.html';
for (const [name, width, height] of [
  ['desktop', 1440, 1100],
  ['mobile', 390, 844],
]) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  page.on('pageerror', (e) => {
    errors.push(e.message);
    console.log('Browser error:', e.message);
  });
  await page.route('**/api/v1/**', (route) => {
    writes.push(route.request().method() + ' ' + route.request().url());
    return route.abort();
  });
  await page.clock.install();
  await page.goto(base);
  const triggers = page.getByRole('button', { name: /^查看动作：/ });
  await triggers.last().waitFor();
  assert.equal(await triggers.count(), 23);
  assert.equal(await page.locator('.exercise-motion-viewer').count(), 0);
  const thumbnails = await page.locator('.motion-thumbnail').allInnerTexts();
  const staticMarkup = await page.locator('.motion-thumbnail').first().innerHTML();
  await page.clock.runFor(1000);
  assert.equal(await page.locator('.motion-thumbnail').first().innerHTML(), staticMarkup);
  await page.screenshot({ path: `${folder}/${name}-list.png`, fullPage: true });
  for (let index = 0; index < ids.length; index++) {
    const id = ids[index],
      trigger = triggers.nth(index);
    await trigger.click();
    const dialog = page.getByRole('dialog'),
      viewer = dialog.locator('.exercise-motion-viewer'),
      svg = dialog.locator('.motion-stage svg');
    assert.equal(await viewer.getAttribute('data-motion-id'), id);
    console.log(`Checking ${name} ${id}`);
    const initial = await svg.innerHTML();
    await page.clock.runFor(1800);
    assert.notEqual(await svg.innerHTML(), initial, `${id}: should move articulated parts`);
    await page.getByRole('button', { name: '暂停', exact: true }).click();
    const paused = await svg.innerHTML();
    await page.clock.runFor(800);
    assert.equal(await svg.innerHTML(), paused, `${id}: paused`);
    assert.equal(await svg.evaluate((el) => Number.isFinite(el.getBBox().x)), true);
    const bounds = await svg.evaluate((el) => {
      const box = el.getBBox();
      return { x: box.x, y: box.y, right: box.x + box.width, bottom: box.y + box.height };
    });
    assert.ok(
      bounds.x >= 0 && bounds.y >= 0 && bounds.right <= 440 && bounds.bottom <= 400,
      `${id}: SVG content within viewBox ${JSON.stringify(bounds)}`,
    );
    const box = await dialog.boundingBox();
    assert.ok(
      box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height,
    );
    assert.equal(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth), true);
    for (const button of await dialog.locator('.motion-controls button').all())
      assert.ok((await button.boundingBox()).height >= 44);
    const source = dialog.locator('.motion-reference a');
    for (const link of await source.all())
      assert.match(await link.getAttribute('href'), /^https:\/\//);
    await page.getByRole('button', { name: '慢速播放', exact: true }).click();
    assert.equal(
      await page.getByRole('button', { name: /慢速播放/ }).getAttribute('aria-pressed'),
      'true',
    );
    await page.getByRole('button', { name: '重新播放', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: '暂停', exact: true }).count(), 1);
    await page.clock.runFor(50);
    await page.getByRole('button', { name: '暂停', exact: true }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: '起始 / 回位', exact: true }).waitFor();
    const buttons = dialog.locator('.motion-controls button');
    await buttons.last().click();
    const end = await svg.innerHTML();
    await page.clock.runFor(800);
    assert.equal(await svg.innerHTML(), end, `${id}: reduced motion still`);
    await dialog.evaluate((el) => (el.scrollTop = 0));
    await page.screenshot({ path: `${folder}/${name}-${id}.png`, fullPage: false });
    if (id === 'dynamic-warmup' || id === 'recovery-stretch') {
      const variants = dialog.locator('.motion-variants button');
      for (let i = 0; i < (await variants.count()); i++) {
        await variants.nth(i).click();
        assert.equal(await variants.nth(i).getAttribute('aria-pressed'), 'true');
        assert.equal(
          await dialog.getByRole('heading', { level: 2 }).innerText(),
          await variants.nth(i).innerText(),
        );
      }
    }
    await page.keyboard.press('Escape');
    assert.equal(await dialog.count(), 0);
    assert.equal(await trigger.evaluate((el) => el === document.activeElement), true);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    results.push(
      `${name} ${id}: articulated playback, pause, restart, slow toggle, reduced-motion still, source, width, touch controls, focus restoration passed`,
    );
  }
  assert.equal(await page.locator('.motion-thumbnail').count(), thumbnails.length);
  if (name === 'desktop') {
    for (const pose of ['start', 'end']) {
      await page.goto(base + '?gallery=' + pose);
      await page.locator('svg').last().waitFor();
      assert.equal(await page.locator('svg').count(), 23);
      await page.screenshot({ path: `${folder}/gallery-${pose}.png`, fullPage: true });
    }
  }
  await context.close();
}
assert.deepEqual(errors, []);
assert.deepEqual(writes, []);
results.push(
  '23 illustrations × desktop/mobile passed. Zero runtime errors and zero API requests from independent preview. First-week name coverage and motion geometry are verified separately in Vitest.',
);
await writeFile(`${folder}/browser-results.txt`, results.join('\n') + '\n');
console.log(results.at(-1));
await browser.close();
