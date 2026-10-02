/* global document, window, URL, structuredClone */
import fs from 'node:fs';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const operations = JSON.parse(fs.readFileSync('src/mocks/generated.json', 'utf8'));
const example = (id) => structuredClone(operations.find((op) => op.operationId === id).example);
const plan = example('getPlan').data;
const cycle = example('getDashboard').data.cycle;
plan.config.cycleId = cycle.id;
plan.config.startDate = '2026-09-19';
plan.config.endDate = '2026-10-23';
plan.asOf = '2026-10-02T08:00:00+08:00';
const dates = Array.from({ length: 35 }, (_, i) =>
  new Date(Date.UTC(2026, 8, 19 + i)).toISOString().slice(0, 10),
);
const task = plan.tasks[0];
plan.tasks = ['逾期：函数极限', '今日：导数的定义', '已完成：基础复习', '未来：微分练习'].map(
  (title, i) => ({ ...structuredClone(task), id: `task-${i}`, title, completed: i === 2 }),
);
plan.days = dates.map((day, i) => {
  const taskIndex = i === 12 ? 0 : i === 13 ? 1 : i === 11 ? 2 : i === 21 ? 3 : -1;
  const minutes = taskIndex === 1 ? 2 : 30;
  return {
    day,
    capacityMinutes: 120,
    reservedMinutes: taskIndex >= 0 ? minutes : 0,
    remainingMinutes: 120 - (taskIndex >= 0 ? minutes : 0),
    completedMinutes: taskIndex === 2 ? 30 : 0,
    percent: taskIndex === 2 ? 100 : 0,
    segments:
      taskIndex < 0
        ? []
        : [
            {
              id: `segment-${i}`,
              taskId: `task-${taskIndex}`,
              scheduledOn: day,
              minutes,
              state: 'SCHEDULED',
              sortOrder: 0,
            },
          ],
  };
});
plan.config.dayCapacities = dates.map((day) => ({ day, capacityMinutes: 120 }));
plan.weeks = Array.from({ length: 5 }, (_, i) => ({
  index: i + 1,
  startDate: dates[i * 7],
  endDate: dates[i * 7 + 6],
  scheduledMinutes: 60,
  completedMinutes: i === 1 ? 30 : 0,
  percent: i === 1 ? 48 : 0,
}));
plan.progress = { completedMinutes: 30, totalEstimatedMinutes: 92, percent: 33 };
plan.completedDayCount = 1;
plan.dayCount = 35;
plan.overdueUncompletedMinutes = 30;
plan.unscheduled = [];
plan.awaitingDate = [];
let mode = 'normal';
let writes = 0;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.route('**/api/v1/**', async (route) => {
  const req = route.request();
  const path = new URL(req.url()).pathname.replace('/api/v1', '');
  let result;
  const ok = (data) => ({ code: 0, message: 'ok', data });
  if (path === '/exams/cycles') result = ok({ items: [cycle], page: 1, size: 100, total: 1 });
  else if (path === '/schedule/plans') {
    if (mode === 'error')
      return route.fulfill({
        status: 500,
        json: { code: 50001, message: '计划加载失败', data: null },
      });
    result = ok({
      items:
        mode === 'empty'
          ? []
          : [
              {
                id: plan.id,
                cycleId: cycle.id,
                startDate: plan.config.startDate,
                endDate: plan.config.endDate,
                revision: 1,
                completedPercent: 33,
              },
            ],
      page: 1,
      size: 100,
      total: mode === 'empty' ? 0 : 1,
    });
  } else if (path === `/schedule/plans/${plan.id}`) result = ok(plan);
  else {
    const op = operations.find(
      (op) =>
        op.method.toUpperCase() === req.method() &&
        new RegExp('^' + op.path.replace(/\{[^}]+\}/g, '[^/]+') + '$').test(path),
    );
    if (op) result = structuredClone(op.example);
    if (req.method() !== 'GET' && path !== '/auth/login') writes++;
  }
  await route.fulfill({
    status: result ? 200 : 404,
    json: result ?? { code: 40401, message: '无记录', data: null },
  });
});
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const base = 'schedule-evidence';
fs.mkdirSync(base, { recursive: true });
await page.goto('http://127.0.0.1:5174/zikao/schedule');
await page.getByLabel('用户名或邮箱').fill('browser-fixture');
await page.getByLabel('密码', { exact: true }).fill('browser-fixture');
await page.getByRole('button', { name: '登录', exact: true }).click();
await page.getByRole('region', { name: '今天的安排', exact: true }).waitFor();
const results = [];
for (const width of [320, 390, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  await page.reload();
  await page.getByRole('region', { name: '今天的安排', exact: true }).waitFor();
  assert(await page.evaluate(() => window.scrollY === 0), 'initial auto scroll');
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    `horizontal overflow at ${width}`,
  );
  assert(await page.getByText('1 / 35 天（3%）').isVisible(), 'day percentage missing');
  assert(await page.getByText('2 分钟', { exact: true }).isVisible(), 'short duration missing');
  assert(!(await page.locator('.schedule-week').nth(4).getAttribute('open')), 'future week open');
  if (width === 390 || width === 1440)
    await page.screenshot({ path: `${base}/after-${width}.png`, fullPage: true });
  await page.getByRole('button', { name: '跳到今天' }).click();
  const today = page.getByRole('region', { name: '今天的安排', exact: true });
  assert(await today.evaluate((el) => el.getBoundingClientRect().top >= 0), 'today obscured');
  await page.getByRole('button', { name: '查看计划设置', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '查看计划设置' });
  assert((await dialog.locator('input, select, textarea').count()) === 0, 'editable settings');
  if (width === 390 || width === 1440)
    await page.screenshot({ path: `${base}/settings-${width}.png` });
  await page.keyboard.press('Escape');
  assert(
    await page
      .getByRole('button', { name: '查看计划设置', exact: true })
      .evaluate((el) => el === document.activeElement),
    'focus not restored',
  );
  results.push({
    width,
    initialScroll: 0,
    overflow: false,
    todayVisibleAfterJump: true,
    settingsReadOnly: true,
  });
}
const axe = await new AxeBuilder({ page }).include('main').analyze();
assert(
  axe.violations.length === 0,
  JSON.stringify(axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))),
);
mode = 'empty';
await page.reload();
await page.getByText(/当前周期尚未生成学习计划/).waitFor();
await page.screenshot({ path: `${base}/empty.png` });
mode = 'error';
await page.reload();
await page.getByRole('button', { name: '重新加载', exact: true }).waitFor();
assert(
  (await page.getByText(/当前周期尚未生成学习计划/).count()) === 0,
  'empty and error conflated',
);
await page.screenshot({ path: `${base}/error.png` });
assert(writes === 0, 'unexpected write');
assert(errors.length === 0, JSON.stringify(errors));
fs.writeFileSync(
  `${base}/results.json`,
  JSON.stringify(
    { results, axeViolations: 0, writes, pageErrors: errors, emptyDistinctFromError: true },
    null,
    2,
  ),
);
await browser.close();
console.log('schedule browser checks passed');
