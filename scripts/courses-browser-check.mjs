/* global document, window, URL, structuredClone */
import fs from 'node:fs';
import { chromium } from 'playwright';
const operations = JSON.parse(fs.readFileSync('src/mocks/generated.json', 'utf8'));
const example = (id) => structuredClone(operations.find((op) => op.operationId === id).example);
const source = example('listCourses').data.items;
const names = [
  '高等数学（工本）',
  '离散数学',
  '计算机系统原理',
  '线性代数（工）',
  '数据库及其应用（实践）',
  'Java语言程序设计（实践）',
];
const codes = ['00023', '02324', '13015', '13175', '13171', '13216'];
let cycle = example('getDashboard').data.cycle;
const courses = names.map((name, i) => ({
  ...structuredClone(source[i] ?? source[0]),
  id: `browser-course-${i}`,
  code: codes[i],
  name,
  courseType: i < 4 ? 'THEORY' : 'PRACTICE',
  capabilities: { catalog: true, knowledge: true, practice: i < 4, exams: i < 4, manual: i >= 4 },
  enrollment: null,
}));
cycle.courses = courses.map((course, i) => ({
  courseId: course.id,
  examDate: i < 4 ? '2026-10-24' : null,
  startsAt: i < 4 ? '09:00:00' : null,
  endsAt: i < 4 ? '11:30:00' : null,
}));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const base = 'courses-evidence';
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
let failSave = false;
let writes = 0;
fs.mkdirSync(base, { recursive: true });
await page.route('**/api/v1/**', async (route) => {
  const req = route.request();
  const path = new URL(req.url()).pathname.replace('/api/v1', '');
  let result;
  if (path === '/exams/cycles')
    result = { code: 0, message: 'ok', data: { items: [cycle], page: 1, size: 100, total: 1 } };
  else if (path === '/courses')
    result = {
      code: 0,
      message: 'ok',
      data: { items: courses, page: 1, size: 100, total: courses.length },
    };
  else if (path === `/exams/cycles/${cycle.id}`) result = { code: 0, message: 'ok', data: cycle };
  else if (req.method() === 'PUT' && path === `/admin/exams/cycles/${cycle.id}`) {
    writes++;
    if (failSave)
      return route.fulfill({
        status: 500,
        json: { code: 50001, message: '保存暂不可用', data: null },
      });
    cycle = { ...cycle, ...req.postDataJSON() };
    result = { code: 0, message: 'ok', data: cycle };
  } else {
    const op = operations.find(
      (op) =>
        op.method.toUpperCase() === req.method() &&
        new RegExp('^' + op.path.replace(/\{[^}]+\}/g, '[^/]+') + '$').test(path),
    );
    if (op) result = structuredClone(op.example);
  }
  if (path === '/auth/login' && result?.data?.user) result.data.user.role = 'ADMIN';
  if (path === '/auth/me' && result?.data) result.data.role = 'ADMIN';
  await route.fulfill({
    status: result ? 200 : 404,
    json: result ?? { code: 40401, message: '无记录', data: null },
  });
});
await page.goto('http://127.0.0.1:5173/zikao/courses');
await page.getByLabel('用户名或邮箱').fill('browser-fixture');
await page.getByLabel('密码', { exact: true }).fill('browser-fixture');
await page.getByRole('button', { name: '登录', exact: true }).click();
await page.getByRole('heading', { name: names[0], exact: true }).waitFor();
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
  assert(
    !/缴费|付款/.test(await page.locator('main').innerText()),
    'payment content still visible',
  );
  assert((await page.getByRole('article').count()) === 6, 'missing courses');
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `overflow at ${width}`,
    );
    if (width >= 768) {
      const cards = await page.getByRole('article').all();
      for (let i = 0; i < cards.length; i += 2) {
        const a = await cards[i].boundingBox(),
          b = await cards[i + 1].boundingBox();
        assert(Math.abs(a.height - b.height) < 1, 'card row height mismatch');
        const aa = await cards[i]
          .getByRole('link', { name: '进入课程', exact: true })
          .boundingBox();
        const bb = await cards[i + 1]
          .getByRole('link', { name: '进入课程', exact: true })
          .boundingBox();
        assert(Math.abs(aa.y - bb.y) < 1, 'primary buttons misaligned');
      }
    }
    await page.screenshot({ path: `${base}/after-${width}.png`, fullPage: true });
    await page
      .getByRole('article', { name: names[0], exact: true })
      .getByRole('button', { name: '修改考试时间' })
      .click();
    const dialog = page.getByRole('dialog');
    const box = await dialog.boundingBox();
    assert(box.x >= 0 && box.x + box.width <= width, 'dialog outside viewport');
    await page.screenshot({ path: `${base}/editor-${width}.png`, fullPage: true });
    await page.keyboard.press('Escape');
    assert(
      await page
        .getByRole('article', { name: names[0], exact: true })
        .getByRole('button', { name: '修改考试时间' })
        .evaluate((el) => el === document.activeElement),
      'focus not restored',
    );
    results.push({ width, noOverflow: true, dialogFits: true, focusRestored: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('article', { name: names[0], exact: true })
    .getByRole('button', { name: '修改考试时间' })
    .click();
  await page.getByLabel('考试日期', { exact: true }).fill('2026-10-26');
  await page.getByLabel('开始时间', { exact: true }).fill('14:30');
  await page.getByLabel('结束时间', { exact: true }).fill('17:00');
  failSave = true;
  await page.getByRole('button', { name: '保存考试时间', exact: true }).click();
  await page.getByText('保存暂不可用', { exact: true }).waitFor();
  assert(
    (await page.getByLabel('考试日期', { exact: true }).inputValue()) === '2026-10-26',
    'lost date draft',
  );
  await page.screenshot({ path: `${base}/save-error-390.png`, fullPage: true });
  failSave = false;
  const otherDates = JSON.stringify(cycle.courses.slice(1));
  await page.getByRole('button', { name: '保存考试时间', exact: true }).click();
  await page.getByText(`${names[0]}考试时间已保存。`, { exact: true }).waitFor();
  assert(JSON.stringify(cycle.courses.slice(1)) === otherDates, 'changed other courses');
  await page.reload();
  await page
    .getByRole('article', { name: names[0], exact: true })
    .getByText('10/26 14:30–17:00', { exact: true })
    .waitFor();
  await page.screenshot({ path: `${base}/saved-390.png`, fullPage: true });
  const { AxeBuilder } = await import('@axe-core/playwright');
  const screenScan = await new AxeBuilder({ page }).analyze();
  await page
    .getByRole('article', { name: names[0], exact: true })
    .getByRole('button', { name: '修改考试时间' })
    .click();
  const modalScan = await new AxeBuilder({ page }).analyze();
  assert(
    screenScan.violations.length === 0 && modalScan.violations.length === 0,
    JSON.stringify([...screenScan.violations, ...modalScan.violations]),
  );
  assert(pageErrors.length === 0, 'runtime errors');
  fs.writeFileSync(
    `${base}/results.json`,
    JSON.stringify(
      {
        results,
        paymentContentRemoved: true,
        saveFailureRetainsDraft: true,
        savedPersistsAfterReload: true,
        otherCoursesPreserved: true,
        writes,
        accessibilityViolations: [],
        pageErrors,
      },
      null,
      2,
    ),
  );
}
await browser.close();
console.log(`Courses ${phase} screenshots saved`);
