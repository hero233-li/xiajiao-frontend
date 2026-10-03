/* global document, window, URL, structuredClone */
import fs from 'node:fs';
import { chromium } from 'playwright';
import { expect } from '@playwright/test';
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

const baseQuestion = example('listQuestions').data.items[0];
const stats = {
  courseId: 'course-0',
  chapterId: 'chapter-0',
  availableOriginalCount: 0,
  answeredOriginalCount: 0,
  practiceAttemptCount: 10,
  practiceCorrectCount: 10,
  practiceAccuracy: 100,
  latestWrongCount: 2,
  gateThreshold: 20,
  canApplyChapterAssessment: false,
  blockReasons: ['此章节不参与检测'],
};
const questions = Array.from({ length: 3 }, (_, i) => ({
  ...baseQuestion,
  id: `question-${i}`,
  revisionId: `revision-${i}`,
  courseId: 'course-0',
  chapterId: 'chapter-0',
  mode: 'CHAPTER',
  stem:
    `第${i + 1}题：请结合下列条件判断正确答案。\n` +
    '当自变量趋近指定值时，应先确认函数的定义域及极限条件。\n'.repeat(7) +
    '$$\\sum_{i=1}^{n} a_i = a_1+a_2+a_3+a_4+a_5+a_6+a_7+a_8+a_9+a_{10}+a_{11}+a_{12}$$',
  options: [
    '先检查定义域，再讨论结论。\n需要对每个条件分别核对，不能省略必要假设。',
    '依据定义与公式进行判断，\n计算 $f(x)=x^2$ 的导数为 $2x$。',
    '不核对条件，直接采用结论。'.repeat(5) +
      '$$\\sum_{i=1}^{n} a_i = a_1+a_2+a_3+a_4+a_5+a_6+a_7+a_8+a_9+a_{10}$$',
    '未给出全部条件，需补充信息后再计算。',
  ],
  difficulty: 3,
  sourceLabel: '章节题库',
  mark: { bookmarked: false, uncertain: false, revision: 0 },
  latestOutcome: null,
}));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
const submissions = [];
let failed = false;
page.on('pageerror', (error) => errors.push(error.message));
const ok = (data) => ({ code: 0, message: 'ok', data });
await page.route('**/api/v1/**', async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const path = url.pathname.replace('/api/v1', '');
  let result;
  if (path === '/exams/cycles') result = ok({ items: [cycle], page: 1, size: 100, total: 1 });
  else if (path.startsWith('/courses/by-code/'))
    result = ok(courses.find((c) => path.endsWith(c.code)));
  else if (path.endsWith('/overview'))
    result = ok({
      courseId: 'course-0',
      releaseId: courses[0].releaseId,
      stats,
      variantQuestionCount: 12,
      chapters: [
        {
          chapterId: 'chapter-0',
          title: '第一章：函数与极限',
          stats,
          passed: false,
          passReleaseIds: [],
        },
      ],
    });
  else if (path.endsWith('/questions'))
    result = ok({ items: questions, page: 1, size: 100, total: 3 });
  else if (path.endsWith('/submissions')) {
    const body = req.postDataJSON();
    submissions.push({ key: req.headers()['idempotency-key'], body });
    if (!failed) {
      failed = true;
      return route.fulfill({
        status: 503,
        json: { code: 50001, message: '结果暂时无法确认，请重试', data: null },
      });
    }
    result = ok({
      submissionId: req.headers()['idempotency-key'],
      questionId: path.split('/').at(-2),
      revisionId: body.revisionId,
      selectedOption: body.selectedOption,
      correct: body.selectedOption === 1,
      correctOption: 1,
      correctAnswer: '依据定义与公式判断。',
      explanation: '先检查定义域，再使用 $f\u0027(x)=2x$。\n' + '核对各项必要条件。\n'.repeat(8),
      submittedAt: '2026-10-03T00:00:00Z',
      stats,
    });
  } else if (path.includes('/questions/')) result = ok(questions.find((q) => path.endsWith(q.id)));
  else if (path === '/courses')
    result = ok({ items: courses, page: 1, size: 100, total: courses.length });
  else {
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
const base = 'practice-answer-evidence';
fs.mkdirSync(base, { recursive: true });
const address = `${root}/zikao/course/00023/practice/chapter-0?filter=WRONG`;
await page.goto(address);
await page.getByLabel('用户名或邮箱').fill('browser-fixture');
await page.getByLabel('密码', { exact: true }).fill('browser-fixture');
await page.getByRole('button', { name: '登录', exact: true }).click();
await page.getByRole('radiogroup').waitFor();
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const results = [];
for (const width of [320, 390, 847, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(address);
  await page.locator('.practice-card .katex').first().waitFor();
  assert((await page.getByRole('heading', { level: 1 }).count()) === 1, 'duplicate h1');
  assert((await page.getByText('0 / 100', { exact: true }).count()) === 0, 'misleading progress');
  assert(!(await page.locator('.practice-tools').getAttribute('open')), 'tools expanded');
  assert(
    await page.getByRole('button', { name: '提交答案', exact: true }).isDisabled(),
    'unselected submission enabled',
  );
  assert((await page.getByText('解析', { exact: true }).count()) === 0, 'answer revealed early');
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    `overflow ${width}`,
  );
  const geometry = await page.evaluate(() => {
    const nav = document.querySelector('.practice-navigation').getBoundingClientRect();
    const note = document.querySelector('.notes-floating').getBoundingClientRect();
    return {
      navBottom: nav.bottom,
      navTop: nav.top,
      noteBottom: note.bottom,
      viewport: window.innerHeight,
    };
  });
  assert(
    geometry.navBottom <= geometry.viewport + 1 && geometry.noteBottom < geometry.navTop,
    JSON.stringify(geometry),
  );
  const axe = await new AxeBuilder({ page }).include('.focus-practice').analyze();
  assert(
    axe.violations.length === 0,
    JSON.stringify(axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))),
  );
  await page.screenshot({ path: `${base}/before-${width}.png`, fullPage: true });
  results.push({ width, horizontalOverflow: false, noteClearOfActions: true, axeViolations: 0 });
}
await page.setViewportSize({ width: 390, height: 900 });
await page.getByRole('button', { name: '快速记一条' }).click();
await page.getByLabel('备注正文').waitFor();
await page.getByLabel('备注正文').fill('备注内容');
await page.keyboard.press('a');
await page.keyboard.press('Enter');
assert(submissions.length === 0, 'note shortcut submitted answer');
await page.getByRole('button', { name: '关闭弹窗' }).click();
await page.getByRole('button', { name: '放弃修改并关闭' }).click();
await page.getByRole('radio').nth(0).click();
await page.getByRole('button', { name: '提交答案', exact: true }).click();
await page.getByText('结果暂时无法确认，请重试', { exact: true }).waitFor();
assert(
  (await page.getByRole('radio').nth(0).getAttribute('aria-checked')) === 'true',
  'selection lost',
);
await page.getByRole('button', { name: '重试提交', exact: true }).click();
await page.getByText('回答错误', { exact: true }).waitFor();
await expect(page.getByRole('button', { name: '下一题', exact: true })).toBeEnabled();
assert(JSON.stringify(submissions[0]) === JSON.stringify(submissions[1]), 'retry changed request');
assert(page.url().includes('questionId=question-0'), 'auto advanced');
const feedbackAxe = await new AxeBuilder({ page }).include('.focus-practice').analyze();
assert(feedbackAxe.violations.length === 0, JSON.stringify(feedbackAxe.violations));
await page.screenshot({ path: `${base}/feedback-390.png`, fullPage: true });
await page.getByRole('button', { name: '下一题', exact: true }).click();
await page.waitForURL('**questionId=question-1');
await page.locator('.practice-stem').filter({ hasText: '第2题' }).waitFor();
await expect(page.getByRole('radio').nth(1)).toHaveAttribute('aria-disabled', 'false');
await page.keyboard.press('b');
await expect(page.getByRole('radio').nth(1)).toHaveAttribute('aria-checked', 'true');
await page.keyboard.press('Enter');
await page.getByText('回答正确', { exact: true }).waitFor();
await page.getByRole('button', { name: '上一题', exact: true }).click();
await page.getByText('回答错误', { exact: true }).waitFor();
assert(submissions.length === 3, 'navigation created submission');
assert(errors.length === 0, JSON.stringify(errors));
fs.writeFileSync(
  `${base}/results.json`,
  JSON.stringify(
    {
      source: 'isolated API fixture, no real writes',
      results,
      longMath: true,
      multilineOptions: true,
      noteShortcutSafe: true,
      sameRetryRequest: true,
      sequenceStable: true,
      errors,
    },
    null,
    2,
  ),
);
await browser.close();
process.stdout.write(
  JSON.stringify({
    widths: results.length,
    axeViolations: 0,
    submissions: submissions.length,
    errors,
  }),
);
