/* global document, window, structuredClone, URL */
import { chromium } from 'playwright';
import fs from 'node:fs';
const operations = JSON.parse(fs.readFileSync('src/mocks/generated.json', 'utf8'));
const example = (id) => structuredClone(operations.find((x) => x.operationId === id).example);
const dashboard = example('getDashboard').data;
const template = dashboard.courses[0];
const names = [
  '高等数学（工本）',
  '离散数学',
  '计算机系统原理',
  '线性代数（工）',
  '数据库及其应用（实践）',
  'Java语言程序设计（实践）',
];
const codes = ['00023', '02324', '13015', '13175', '13171', '13216'];
dashboard.courses = names.map((name, index) => ({
  ...structuredClone(template),
  id: index ? `browser-course-${index}` : template.id,
  name,
  code: codes[index],
  courseType: index < 4 ? 'THEORY' : 'PRACTICE',
  progress: { completedItems: index ? 0 : 2, totalItems: 91, percent: index ? 0 : 2 },
  capabilities: { ...template.capabilities, exams: index < 4, manual: index >= 4 },
}));
dashboard.overallProgress = { completedItems: 2, totalItems: 546, percent: 0 };
dashboard.cycle.courses = dashboard.courses.map((c, i) => ({
  courseId: c.id,
  examDate: i < 4 ? `2026-10-${24 + (i % 2)}` : null,
  startsAt: '09:00:00',
  endsAt: '11:30:00',
}));
dashboard.countdowns = dashboard.courses.map((c, i) => ({
  courseId: c.id,
  courseCode: c.code,
  examDate: dashboard.cycle.courses[i].examDate,
  daysRemaining: i < 4 ? 22 + (i % 2) : null,
  status: i < 4 ? 'UPCOMING' : 'DATE_UNKNOWN',
}));
dashboard.continueLearning = {
  ...dashboard.continueLearning,
  courseId: template.id,
  title: '继续函数与极限',
  target: {
    pane: 'CATALOG',
    courseCode: codes[0],
    chapterId: null,
    itemId: null,
    questionId: null,
  },
};
dashboard.todaySuggestion = {
  ...dashboard.todaySuggestion,
  title: '学习函数与极限',
  target: dashboard.continueLearning.target,
};
const period = dashboard.cycle;
const plan = example('getPlan').data;
plan.id = dashboard.selectedPlanId;
plan.config.cycleId = period.id;
plan.config.startDate = '2026-10-01';
plan.config.endDate = '2026-11-06';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const base = 'dashboard-evidence';
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
let scenario = 'normal';
let planFails = false;
fs.mkdirSync(base, { recursive: true });
await page.route('**/api/v1/**', async (route) => {
  const req = route.request();
  const path = new URL(req.url()).pathname.replace('/api/v1', '');
  let result;
  if (path === '/dashboard')
    result = {
      code: 0,
      message: 'ok',
      data:
        scenario === 'normal'
          ? dashboard
          : {
              ...dashboard,
              todaySuggestion: null,
              ...(scenario === 'no-plan' ? { selectedPlanId: null, continueLearning: null } : {}),
            },
    };
  else if (path === '/exams/cycles')
    result = { code: 0, message: 'ok', data: { items: [period], total: 1, page: 1, size: 100 } };
  else if (path.startsWith('/schedule/plans/')) {
    if (planFails)
      return route.fulfill({ status: 500, json: { code: 50001, message: '测试失败', data: null } });
    const detail = structuredClone(plan);
    detail.days =
      scenario === 'completed'
        ? [{ day: dashboard.localDate, segments: [{ taskId: detail.tasks[0].id }] }]
        : [];
    if (scenario === 'completed')
      detail.tasks.forEach((task) => {
        task.completed = true;
      });
    result = { code: 0, message: 'ok', data: detail };
  } else {
    const op = operations.find(
      (x) =>
        x.method.toUpperCase() === req.method() &&
        new RegExp('^' + x.path.replace(/\{[^}]+\}/g, '[^/]+') + '$').test(path),
    );
    if (op) result = structuredClone(op.example);
  }
  await route.fulfill({
    status: result ? 200 : 404,
    json: result || { code: 40401, message: '无记录', data: null },
  });
});
await page.goto('http://127.0.0.1:5173/zikao');
await page.getByLabel('用户名或邮箱').fill('browser-fixture');
await page.getByLabel('密码', { exact: true }).fill('browser-fixture');
await page.getByRole('button', { name: '登录', exact: true }).click();
await page.getByRole('link', { name: '按计划学习', exact: true }).waitFor();
const phase = process.argv.includes('--before') ? 'before' : 'after';
for (const width of [390, 1440]) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  await page.screenshot({ path: `${base}/${phase}-${width}.png`, fullPage: true });
}
if (phase === 'after') {
  const assert = (value, message) => {
    if (!value) throw new Error(message);
  };
  const results = [];
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const button = await page.getByRole('link', { name: '按计划学习', exact: true }).boundingBox();
    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    assert(button.y + button.height <= 844, `primary action below fold at ${width}`);
    assert(noOverflow, `horizontal overflow at ${width}`);
    assert((await page.getByRole('article').count()) === 6, 'not all courses displayed');
    await page.screenshot({ path: `${base}/after-${width}.png`, fullPage: true });
    results.push({ width, primaryBottom: button.y + button.height, noOverflow });
  }
  await page.setViewportSize({ width: 720, height: 450 });
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    'zoom equivalent overflow',
  );
  await page.screenshot({ path: `${base}/zoom-equivalent-200.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [value, message] of [
    ['empty', '今天没有计划任务，可按自己的节奏学习。'],
    ['completed', '今日计划任务已全部完成。'],
    ['no-plan', '还没有学习计划，可先继续学习或查看学习安排。'],
  ]) {
    scenario = value;
    await page.reload();
    await page.getByRole('heading', { name: message, exact: true }).waitFor();
    await page.screenshot({ path: `${base}/${value}-390.png`, fullPage: true });
  }
  scenario = 'normal';
  planFails = true;
  await page.reload();
  await page.getByText('计划详情加载失败，学习入口仍可使用。').waitFor();
  assert(
    (await page.getByRole('link', { name: '按计划学习', exact: true }).count()) === 1,
    'local failure hid primary action',
  );
  await page.screenshot({ path: `${base}/local-error-390.png`, fullPage: true });
  planFails = false;
  await page.getByRole('button', { name: '重新加载' }).click();
  await page.getByText('来自学习安排 · 第 2 / 37 天', { exact: false }).waitFor();
  const action = page.getByRole('link', { name: '按计划学习', exact: true });
  await action.focus();
  await page.keyboard.press('Tab');
  assert(await page.evaluate(() => document.activeElement.tagName === 'A'), 'keyboard focus lost');
  const { AxeBuilder } = await import('@axe-core/playwright');
  const accessibility = await new AxeBuilder({ page }).analyze();
  assert(accessibility.violations.length === 0, JSON.stringify(accessibility.violations));
  assert(pageErrors.length === 0, 'browser runtime errors');
  fs.writeFileSync(
    `${base}/results.json`,
    JSON.stringify(
      {
        results,
        emptyState: true,
        completedState: true,
        noPlanState: true,
        localErrorRecovery: true,
        keyboardFocus: true,
        zoomReflowEquivalent: true,
        accessibilityViolations: accessibility.violations,
        pageErrors,
      },
      null,
      2,
    ),
  );
}
await browser.close();
console.log(`Dashboard ${phase} screenshots saved`);
