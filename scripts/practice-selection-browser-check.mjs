/* global document, window, URL, structuredClone */
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
const courses = names.slice(0, 4).map((name, i) => ({
  ...structuredClone(source[i] ?? source[0]),
  id: `course-${i}`,
  code: codes[i],
  name,
  courseType: i < 4 ? 'THEORY' : 'PRACTICE',
  capabilities: { catalog: true, knowledge: true, practice: i < 4, exams: i < 4, manual: i >= 4 },
}));

const question = example('listQuestions').data.items[0];
const stats = {
  availableOriginalCount: 0,
  answeredOriginalCount: 0,
  practiceAttemptCount: 10,
  practiceCorrectCount: 10,
  practiceAccuracy: 100,
  latestWrongCount: 1,
  gateThreshold: 20,
  canApplyChapterAssessment: false,
  blockReasons: ['可用且已审核原创题不足20道', '已答原创题数未达到门槛', '此章节不参与检测'],
};
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const ok = (data) => ({ code: 0, message: 'ok', data });
await page.route('**/api/v1/**', async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const path = url.pathname.replace('/api/v1', '');
  const course = courses.find((c) => path.includes(`/${c.id}/`));
  let result;
  if (path === '/exams/cycles') result = ok({ items: [cycle], page: 1, size: 100, total: 1 });
  else if (path.startsWith('/courses/by-code/'))
    result = ok(courses.find((c) => path.endsWith(c.code)));
  else if (path.endsWith('/overview'))
    result = ok({
      courseId: course.id,
      releaseId: course.releaseId,
      stats: { ...stats, courseId: course.id, chapterId: null },
      variantQuestionCount: 12,
      chapters: Array.from({ length: 4 }, (_, n) => ({
        chapterId: `chapter-${n}`,
        title: `第${n + 1}章：基础概念及常见易错点，结合定义与条件进行练习`,
        stats: { ...stats, courseId: course.id, chapterId: `chapter-${n}` },
        passed: false,
        passReleaseIds: [],
      })),
    });
  else if (path.endsWith('/questions')) {
    const metadata = url.searchParams.get('size') === '1';
    const answered = url.searchParams.get('filter') === 'UNANSWERED';
    result = ok({
      items: metadata
        ? []
        : [
            {
              ...question,
              id: 'wrong-question',
              chapterId: 'chapter-0',
              stem: '当前错题示例',
              courseId: course.id,
            },
          ],
      page: 1,
      size: metadata ? 1 : 20,
      total: metadata ? (answered ? 300 : 315) * (url.searchParams.get('chapterId') ? 1 : 4) : 1,
    });
  } else {
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
const root = 'http://127.0.0.1:5176';
const base = 'practice-selection-evidence';
fs.mkdirSync(base, { recursive: true });
await page.goto(`${root}/zikao/course/00023/practice`);
await page.getByLabel('用户名或邮箱').fill('browser-fixture');
await page.getByLabel('密码', { exact: true }).fill('browser-fixture');
await page.getByRole('button', { name: '登录', exact: true }).click();
await page.locator('.selection-chapter').first().waitFor();
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const results = [];
for (const course of courses) {
  for (const width of [390, 847, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${root}/zikao/course/${course.code}/practice`);
    await page.getByRole('progressbar').first().waitFor();
    assert((await page.getByRole('heading', { level: 1 }).count()) === 1, 'duplicate h1');
    assert(
      (await page.getByRole('button', { name: '开始练习', exact: true }).count()) === 4,
      'missing practice actions',
    );
    assert(
      (await page.getByRole('button', { name: '可申请检测', exact: true }).count()) === 0,
      '315 questions enabled detection',
    );
    assert(
      (await page.getByText('不参与检测', { exact: true }).count()) === 4,
      'nonparticipation unclear',
    );
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `overflow ${course.code} ${width}`,
    );
    assert(
      !(await page.locator('.selection-chapter details').first().getAttribute('open')),
      'rules expanded by default',
    );
    if (course.code === '00023') {
      const axe = await new AxeBuilder({ page }).include('.selection-page').analyze();
      assert(
        axe.violations.length === 0,
        JSON.stringify(
          axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        ),
      );
      await page.screenshot({ path: `${base}/${course.code}-${width}.png`, fullPage: true });
    }
    results.push({
      code: course.code,
      width,
      horizontalOverflow: false,
      canApply: false,
      practiceQuestions: 315,
    });
  }
}
await page.setViewportSize({ width: 320, height: 900 });
await page.goto(`${root}/zikao/course/00023/practice`);
await page.getByRole('progressbar').first().waitFor();
assert(
  await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  '320 overflow',
);
await page.getByRole('button', { name: '真题变种', exact: true }).click();
await page.getByText('共 12 题，直接开始练习。').waitFor();
assert(page.url().includes('mode=VARIANT'), 'variant mode lost');
await page.getByRole('button', { name: '错题重做', exact: true }).click();
await page.getByText('当前错题示例').waitFor();
const wrongLink = await page.getByRole('link', { name: '重做此题' }).getAttribute('href');
assert(
  wrongLink.includes('/chapter-0?') &&
    wrongLink.includes('filter=WRONG') &&
    wrongLink.includes('questionId=wrong-question'),
  'wrong route lost',
);
assert(errors.length === 0, JSON.stringify(errors));
fs.writeFileSync(
  `${base}/results.json`,
  JSON.stringify(
    {
      source: 'isolated API fixture, no real account or writes',
      results,
      narrow320: true,
      modes: ['CHAPTER', 'VARIANT', 'WRONG'],
      axeViolations: 0,
      errors,
    },
    null,
    2,
  ),
);
await browser.close();
process.stdout.write(
  JSON.stringify({ checks: results.length, narrow320: true, axeViolations: 0, errors }),
);
