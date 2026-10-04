import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true });
const results = [];
const user = {
  id: 'preview-user',
  username: '本地预览',
  email: 'preview@example.test',
  role: 'USER',
};
const exercise = {
  id: 'preview-exercise',
  name: '高位下拉 Lat Pulldown',
  type: 'STRENGTH',
  sets: 3,
  reps: 12,
  kg: 25,
  note: '控制节奏，选择适合自己的重量。',
  completed: true,
};
const entry = {
  kind: 'training-plan',
  key: '2026-10-04',
  revision: 0,
  data: {
    rest: false,
    exercises: [exercise, { ...exercise, id: 'unsupported', name: '未收录的自定义动作' }],
    note: '本地临时预览数据',
  },
};
const day = {
  date: '2026-10-04',
  records: { 'training-plan': entry },
  rest: false,
  checkedIn: false,
  partial: false,
  state: 'TODAY_PENDING',
};
const mutations = [],
  errors = [];
for (const [name, width, height] of [
  ['desktop', 1440, 1100],
  ['mobile', 390, 844],
]) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript(
    ({ user }) => {
      sessionStorage.setItem(
        'xuexizhitu.session.real',
        JSON.stringify({ accessToken: 'local-preview', refreshToken: 'local-preview', user }),
      );
    },
    { user },
  );
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/v1/**', (route) => {
    const req = route.request();
    if (req.method() !== 'GET') {
      mutations.push(req.url());
      return route.abort();
    }
    const path = new URL(req.url()).pathname;
    let data;
    if (path.endsWith('/auth/me')) data = user;
    else if (path.endsWith('/fitness/summary'))
      data = { goalRevision: 0, streak: 0, weekCheckins: 0, weekElapsedDays: 7, weekRate: 0 };
    else if (path.includes('/fitness/days/')) data = day;
    else if (path.endsWith('/fitness/history')) data = [day];
    else data = { items: [], total: 0, page: 1, size: 30 };
    return route.fulfill({ json: { code: 0, message: 'ok', data } });
  });
  await page.goto('http://127.0.0.1:5179/fitness/training?date=2026-10-04');
  const trigger = page.getByRole('button', { name: '查看动作：高位下拉' });
  try {
    await trigger.waitFor({ timeout: 10000 });
  } catch (error) {
    console.log(await page.locator('body').innerText(), errors);
    await page.screenshot({ path: 'docs/fitness-motion/debug.png' });
    await browser.close();
    throw error;
  }
  assert.equal(await page.locator('.motion-thumbnail').count(), 1);
  assert.equal(await page.locator('.exercise-motion-viewer').count(), 0);
  const still = await page.locator('.motion-thumbnail').innerHTML();
  await page.waitForTimeout(200);
  assert.equal(await page.locator('.motion-thumbnail').innerHTML(), still);
  await page.screenshot({ path: `docs/fitness-motion/${name}-list.png`, fullPage: true });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  const bar = dialog.locator('[data-part="bar"]');
  const before = await bar.getAttribute('transform');
  await page.waitForTimeout(250);
  assert.equal(await bar.getAttribute('transform'), before);
  await page.getByRole('button', { name: '播放', exact: true }).click();
  await page.waitForTimeout(1300);
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  assert.notEqual(await bar.getAttribute('transform'), before);
  await page.getByRole('button', { name: '慢速播放', exact: true }).click();
  assert.equal(
    await page.getByRole('button', { name: /慢速播放/ }).getAttribute('aria-pressed'),
    'true',
  );
  await page.screenshot({ path: `docs/fitness-motion/${name}-dialog.png`, fullPage: false });
  await page.getByRole('button', { name: '重新播放', exact: true }).click();
  assert.ok((await bar.getAttribute('transform')).includes('40'));
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  const box = await dialog.boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= width);
  assert.ok(box.y >= 0 && box.y + box.height <= height);
  assert.ok(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth));
  for (const button of await dialog.locator('.motion-controls button').all())
    assert.ok((await button.boundingBox()).height >= 44);
  await dialog.evaluate((el) => (el.scrollTop = el.scrollHeight));
  await page.screenshot({
    path: `docs/fitness-motion/${name}-dialog-details.png`,
    fullPage: false,
  });
  await page.keyboard.press('Escape');
  assert.equal(await dialog.count(), 0);
  assert.equal(await trigger.evaluate((el) => el === document.activeElement), true);
  if (name === 'desktop') {
    await trigger.click();
    await page.getByRole('button', { name: '重新播放', exact: true }).click();
    await page.waitForTimeout(1800);
    await page.getByRole('button', { name: '暂停', exact: true }).click();
    const normalY = Number((await bar.getAttribute('transform')).match(/0 ([\d.]+)/)[1]);
    await page.getByRole('button', { name: '慢速播放', exact: true }).click();
    await page.getByRole('button', { name: '重新播放', exact: true }).click();
    await page.waitForTimeout(1800);
    await page.getByRole('button', { name: '暂停', exact: true }).click();
    const slowY = Number((await bar.getAttribute('transform')).match(/0 ([\d.]+)/)[1]);
    assert.ok(normalY > slowY + 40);
    results.push(
      `Half-speed timing verified: normal bar y=${normalY.toFixed(1)}, half-speed y=${slowY.toFixed(1)} after 1.8s.`,
    );
    await page.keyboard.press('Escape');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await trigger.click();
  assert.equal(await page.getByRole('button', { name: '暂停', exact: true }).count(), 0);
  await page.getByRole('button', { name: '下拉结束', exact: true }).click();
  assert.equal(await bar.getAttribute('transform'), 'translate(0 180)');
  await page.screenshot({ path: `docs/fitness-motion/${name}-reduced.png`, fullPage: false });
  // Focus remains trapped inside the existing Modal.
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    assert.equal(await dialog.evaluate((el) => el.contains(document.activeElement)), true);
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: '暂停', exact: true }).waitFor();
  await page.keyboard.press('Escape');
  results.push(
    `${name} ${width}×${height}: static list, playback, pause, restart, slow toggle, reduced-motion changes, keyboard trap / focus restore, width and 44px controls passed`,
  );
  await page.goto('http://127.0.0.1:5179/fitness/templates?date=2026-10-04');
  await page.getByRole('button', { name: '查看与添加第一周计划' }).click();
  await page.getByRole('button', { name: '查看动作：高位下拉' }).click();
  assert.equal(await page.getByRole('dialog').count(), 2);
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 1);
  assert.equal(
    await page
      .getByRole('button', { name: '查看动作：高位下拉' })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0);
  await page.goto('http://127.0.0.1:5179/docs/fitness-motion/preview.html');
  await page.getByRole('button', { name: '查看动作：高位下拉' }).click();
  assert.equal(await page.getByRole('dialog').count(), 1);
  results.push(`${name}: nested first-week modal and independent no-save preview passed`);
  await context.close();
}
assert.deepEqual(mutations, []);
assert.deepEqual(errors, []);
results.push(
  'Zero API writes; zero browser runtime errors. Browser API responses are temporary fixtures, not production records.',
);
await writeFile('docs/fitness-motion/browser-results.txt', results.join('\n') + '\n');
console.log(results.join('\n'));
await browser.close();
