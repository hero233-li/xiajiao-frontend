/* global window, document, getComputedStyle, URL, structuredClone */
import fs from 'node:fs';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const ops = JSON.parse(fs.readFileSync('src/mocks/generated.json', 'utf8'));
const example = (id) => structuredClone(ops.find((op) => op.operationId === id).example);
const cycle = example('getDashboard').data.cycle;
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
const courses = names.map((name, i) => ({
  ...structuredClone(source[i] ?? source[0]),
  id: `course-${i}`,
  code: codes[i],
  name,
  courseType: i < 4 ? 'THEORY' : 'PRACTICE',
  capabilities: { catalog: true, knowledge: true, practice: i < 4, exams: i < 4, manual: i >= 4 },
}));
const catalogs = courses.map((course, i) => ({
  courseId: course.id,
  releaseId: `release-${i}`,
  asOf: '2026-10-03T02:00:00Z',
  courseProgress: { totalItems: 4, completedItems: 1, percent: 25 },
  overallProgress: { totalItems: 24, completedItems: 6, percent: 25 },
  chapters: [0, 1].map((n) => ({
    id: `chapter-${i}-${n}`,
    title:
      i >= 4
        ? `阶段${n + 1}：根据手册完成需求分析、设计与实践验证`
        : `第${n + 1}章：基础知识、视频讲解与学习资料`,
    sortOrder: n,
    participatesInAssessment: i < 4,
    items: [0, 1].map((j) => ({
      id: `item-${i}-${n}-${j}`,
      title: j === 0 ? '基础学习与实践验证' : '学习资料',
      estimatedMinutes: j === 0 ? 2 : 90,
      completed: n === 0 && j === 1,
      revision: 1,
      completedAt: n === 0 && j === 1 ? '2026-10-01T02:00:00Z' : null,
      resource:
        i >= 4 && j === 0
          ? null
          : j === 0
            ? { kind: 'LINK', label: '视频讲解', url: 'https://example.com/lesson', fileId: null }
            : { kind: 'FILE', label: 'PDF资料', url: null, fileId: `file-${i}-${n}` },
    })),
  })),
}));
let failSave = false;
let writes = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.route('**/api/v1/**', async (route) => {
  const req = route.request();
  const path = new URL(req.url()).pathname.replace('/api/v1', '');
  const ok = (data) => ({ code: 0, message: 'ok', data });
  let result;
  if (path === '/exams/cycles') result = ok({ items: [cycle], page: 1, size: 100, total: 1 });
  else if (path.startsWith('/courses/by-code/'))
    result = ok(courses.find((course) => path.endsWith(course.code)));
  else if (path.endsWith('/learning-position'))
    return route.fulfill({ status: 404, json: { code: 40401, message: '暂无记录', data: null } });
  else if (path.startsWith('/catalog/courses/')) {
    const catalog = catalogs.find((catalog) => path.split('/')[3] === catalog.courseId);
    if (req.method() === 'GET' && path === `/catalog/courses/${catalog?.courseId}`)
      result = ok(catalog);
    else if (path.includes('/resources/')) result = example('downloadCourseResource');
    else if (req.method() === 'PUT' && path.endsWith('/completion')) {
      const body = req.postDataJSON();
      writes.push(body);
      if (failSave)
        return route.fulfill({
          status: 500,
          json: { code: 50001, message: '保存失败', data: null },
        });
      const item = catalog.chapters
        .flatMap((chapter) => chapter.items)
        .find((item) => path.includes(`/${item.id}/`));
      item.completed = body.completed;
      item.revision++;
      catalog.courseProgress.completedItems = catalog.chapters
        .flatMap((chapter) => chapter.items)
        .filter((item) => item.completed).length;
      catalog.courseProgress.percent = (catalog.courseProgress.completedItems / 4) * 100;
      result = ok({
        item,
        courseProgress: catalog.courseProgress,
        overallProgress: catalog.overallProgress,
        affectedPlanIds: [],
        asOf: catalog.asOf,
        clientMutationId: body.clientMutationId,
      });
    }
  }
  if (!result) {
    const op = ops.find(
      (op) =>
        op.method.toUpperCase() === req.method() &&
        new RegExp('^' + op.path.replace(/\{[^}]+\}/g, '[^/]+') + '$').test(path),
    );
    if (op) result = structuredClone(op.example);
  }
  await route.fulfill({
    status: result ? 200 : 404,
    json: result ?? { code: 40401, message: '无记录', data: null },
  });
});
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const base = 'catalog-evidence';
fs.mkdirSync(base, { recursive: true });
const root = 'http://127.0.0.1:5174';
await page.goto(`${root}/zikao/course/00023/catalog`);
await page.getByLabel('用户名或邮箱').fill('browser-fixture');
await page.getByLabel('密码', { exact: true }).fill('browser-fixture');
await page.getByRole('button', { name: '登录', exact: true }).click();
await page.getByRole('button', { name: '继续学习' }).waitFor();
const results = [];
for (let i = 0; i < courses.length; i++) {
  for (const width of [390, 847, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${root}/zikao/course/${codes[i]}/catalog`);
    await page.getByRole('button', { name: '继续学习' }).waitFor();
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `overflow ${codes[i]} ${width}`,
    );
    if ([2, 4].includes(i) && [390, 1440].includes(width))
      await page.screenshot({ path: `${base}/${codes[i]}-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: '继续学习' }).click();
    const id = `item-${i}-0-0`;
    const geometry = await page.locator(`[id="${id}"]`).evaluate((el) => ({
      targetTop: el.getBoundingClientRect().top,
      headerBottom: document.querySelector('.course-frame-head').getBoundingClientRect().bottom,
      focus: document.activeElement === el,
    }));
    assert(
      geometry.targetTop >= geometry.headerBottom + 14,
      `target obscured ${JSON.stringify(geometry)}`,
    );
    assert(geometry.focus, 'target not focused');
    assert(new URL(page.url()).searchParams.get('itemId') === id, 'specific item not persisted');
    const checkbox = page.locator(`[id="${id}"] input`);
    await checkbox.focus();
    assert(
      await page
        .locator('.catalog-chapter')
        .first()
        .evaluate((el) => getComputedStyle(el).outlineStyle === 'none'),
      'whole chapter focused',
    );
    results.push({ code: codes[i], width, ...geometry, overflow: false });
  }
}
await page.setViewportSize({ width: 320, height: 900 });
await page.goto(`${root}/zikao/course/00023/catalog`);
await page.getByRole('button', { name: '继续学习' }).waitFor();
assert(
  await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  '320 overflow',
);
const countBefore = writes.length;
await page.getByRole('button', { name: '全部标记完成', exact: true }).click();
await page.getByRole('button', { name: '取消', exact: true }).click();
assert(writes.length === countBefore, 'cancel wrote completion');
const beforeDownload = writes.length;
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button', { name: /下载学习资料/ }).click(),
]);
assert(!!download.suggestedFilename(), 'download filename missing');
assert(writes.length === beforeDownload, 'resource download changed completion');
const checkbox = page.locator('[id="item-0-0-0"] input');
await page.getByRole('button', { name: '继续学习' }).click();
await checkbox.click();
await page.getByText('已保存', { exact: true }).waitFor();
await page.reload();
await checkbox.waitFor();
assert(await checkbox.isChecked(), 'completion not persisted');
failSave = true;
await checkbox.click();
await page.getByText(/保存失败，已恢复原状态/).waitFor();
assert(await checkbox.isChecked(), 'failed save not rolled back');
await checkbox.focus();
const axe = await new AxeBuilder({ page }).include('main').analyze();
assert(
  axe.violations.length === 0,
  JSON.stringify(axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))),
);
assert(errors.length === 0, JSON.stringify(errors));
fs.writeFileSync(
  `${base}/results.json`,
  JSON.stringify(
    {
      results,
      width320Overflow: false,
      batchCancelWrites: 0,
      downloadChangesCompletion: false,
      completionPersisted: true,
      failureRolledBack: true,
      axeViolations: 0,
      pageErrors: errors,
    },
    null,
    2,
  ),
);
await browser.close();
console.log('catalog browser checks passed');
