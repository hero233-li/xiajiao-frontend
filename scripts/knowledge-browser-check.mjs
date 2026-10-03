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
const courses = names.map((name, i) => ({
  ...structuredClone(source[i] ?? source[0]),
  id: `course-${i}`,
  code: codes[i],
  name,
  courseType: i < 4 ? 'THEORY' : 'PRACTICE',
  capabilities: { catalog: true, knowledge: true, practice: i < 4, exams: i < 4, manual: i >= 4 },
}));
const modules = courses.map((course, i) =>
  Array.from({ length: 10 }, (_, n) => ({
    id: `module-${i}-${n}`,
    title: `知识模块${n + 1}：理解基础概念、公式条件以及学习和实践中常见的易错点`,
    difficulty: 2,
    content:
      '# 知识说明\n\n函数与变化率 $f\u0027(x)$，结合条件理解。\n\n| 条件 | 适用范围 | 结论 |\n| --- | --- | --- |\n| 极限存在 | 本课程的基础问题 | 根据定义计算 |\n\n```java\nSystem.out.println("' +
      '学习'.repeat(50) +
      '");\n```',
    formulas: [
      {
        label: '公式示例',
        tex: '\\sum_{i=1}^{n} a_i = a_1+a_2+a_3+a_4+a_5+a_6+a_7+a_8+a_9+a_{10}',
        condition: '各项有定义',
      },
    ],
    examples: [{ id: `example-${i}-${n}`, question: '求 $f(x)=x^2$ 的导数。', stars: 2 }],
    resources: [
      { kind: 'LINK', label: '学习资料', url: 'https://example.com/lesson', fileId: null },
    ],
    userNote: { mastery: 0, note: '', revision: 0 },
  })),
);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
let writes = [];
let solutionRequests = 0;
let failSave = false;
page.on('pageerror', (error) => errors.push(error.message));
const ok = (data) => ({ code: 0, message: 'ok', data });
await page.route('**/api/v1/**', async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const path = url.pathname.replace('/api/v1', '');
  let result;
  if (path === '/exams/cycles') result = ok({ items: [cycle], page: 1, size: 100, total: 1 });
  else if (path.startsWith('/courses/by-code/'))
    result = ok(courses.find((course) => path.endsWith(course.code)));
  else if (path.includes('/knowledge')) {
    const i = courses.findIndex((course) => path.includes(`/${course.id}/`));
    if (path.endsWith('/knowledge')) {
      const items = modules[i].filter(
        (module) =>
          (!url.searchParams.get('q') || module.title.includes(url.searchParams.get('q'))) &&
          (!url.searchParams.get('difficulty') ||
            module.difficulty === Number(url.searchParams.get('difficulty'))),
      );
      result = ok({ items, page: 1, size: 20, total: items.length });
    } else {
      const module = modules[i].find((module) => path.includes(`/${module.id}`));
      if (req.method() === 'PUT') {
        const body = req.postDataJSON();
        writes.push(body);
        if (failSave)
          return route.fulfill({
            status: 409,
            json: { code: 40901, message: '笔记版本冲突', data: null },
          });
        module.userNote = {
          note: body.note,
          mastery: body.mastery,
          revision: module.userNote.revision + 1,
        };
        result = ok(module);
      } else result = ok(module);
    }
  } else if (path.endsWith('/solution')) {
    solutionRequests++;
    result = ok({ answer: '2x', solution: '根据定义计算。' });
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
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const root = 'http://127.0.0.1:5175';
const base = 'knowledge-evidence';
fs.mkdirSync(base, { recursive: true });
await page.goto(`${root}/zikao/course/00023/knowledge`);
await page.getByLabel('用户名或邮箱').fill('browser-fixture');
await page.getByLabel('密码', { exact: true }).fill('browser-fixture');
await page.getByRole('button', { name: '登录', exact: true }).click();
await page.locator('.kh-module').first().waitFor();
const results = [];
for (let i = 0; i < courses.length; i++) {
  for (const width of [390, 847, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${root}/zikao/course/${codes[i]}/knowledge`);
    await page.locator('.kh-module').first().waitFor();
    assert((await page.getByRole('heading', { level: 1 }).count()) === 1, 'duplicate h1');
    assert(
      (await page.getByRole('button', { name: '返回模块列表' }).count()) === 0,
      'spurious back button',
    );
    await page.locator('.kh-module').nth(4).scrollIntoViewIfNeeded();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.locator('.kh-module').nth(4).click();
    await page.getByRole('textbox', { name: '知识笔记' }).waitFor();
    const geometry = await page.locator('.kh-detail').evaluate((el) => ({
      top: el.getBoundingClientRect().top,
      headerBottom: document.querySelector('.course-frame-head').getBoundingClientRect().bottom,
      focus: el === document.activeElement,
    }));
    assert(
      geometry.top >= geometry.headerBottom + 14,
      `obscured ${codes[i]} ${width} ${JSON.stringify(geometry)}`,
    );
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `overflow ${codes[i]} ${width}`,
    );
    assert(
      (await page.locator('.kh-list').isVisible()) === width >= 1024,
      'incorrect two-pane breakpoint',
    );
    await page.locator('.katex').first().waitFor();
    assert((await page.locator('.katex').count()) > 0, 'KaTeX missing');
    assert((await page.getByRole('table').count()) === 1, 'markdown table missing');
    if (i === 0) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForFunction(() => window.scrollY === 0);
      await page.screenshot({ path: `${base}/detail-${width}.png`, fullPage: true });
    }
    await page.getByRole('button', { name: '返回模块列表' }).click();
    await page.waitForURL((url) => !url.searchParams.has('moduleId'));
    await page.waitForFunction(() => document.activeElement?.id === 'kh-list-title');
    await page.locator('.kh-module').first().waitFor();
    const scrollAfter = await page.evaluate(() => window.scrollY);
    assert(
      Math.abs(scrollBefore - scrollAfter) < 3,
      `scroll not restored ${codes[i]} ${width} ${scrollBefore} ${scrollAfter} ${JSON.stringify(await page.evaluate(() => ({ height: document.documentElement.scrollHeight, max: document.documentElement.scrollHeight - window.innerHeight, listHeight: document.querySelector('.kh-list').getBoundingClientRect().height, itemTop: document.querySelectorAll('.kh-module')[4].getBoundingClientRect().top })))}`,
    );
    if (i === 0) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForFunction(() => window.scrollY === 0);
      await page.screenshot({ path: `${base}/list-${width}.png`, fullPage: true });
    }
    results.push({ code: codes[i], width, ...geometry, scrollRestored: true, overflow: false });
  }
}
assert(writes.length === 0, 'module navigation changed notes/mastery');
await page.setViewportSize({ width: 320, height: 900 });
await page.goto(`${root}/zikao/course/00023/knowledge?q=无结果&difficulty=5`);
await page.getByText('没有符合条件的知识模块。').waitFor();
await page.getByRole('button', { name: '清除筛选' }).last().click();
await page.locator('.kh-module').first().waitFor();
assert(!new URL(page.url()).searchParams.has('difficulty'), 'difficulty not cleared');
await page.locator('.kh-module').first().click();
await page.getByRole('textbox', { name: '知识笔记' }).waitFor();
assert(
  await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  '320 overflow',
);
assert(solutionRequests === 0, 'solution eagerly loaded');
await page.getByRole('button', { name: '查看答案与解法' }).focus();
await page.keyboard.press('Enter');
await page.getByRole('heading', { name: '答案', exact: true }).waitFor();
assert(solutionRequests === 1, 'solution not requested');
await page.getByRole('button', { name: '收起答案与解法' }).click();
failSave = true;
await page.getByRole('textbox', { name: '知识笔记' }).fill('失败时保留的草稿');
await page.getByText(/草稿已保留/).waitFor();
assert(
  (await page.getByRole('textbox', { name: '知识笔记' }).inputValue()) === '失败时保留的草稿',
  'draft lost',
);
assert(writes.length === 1, 'conflict silently retried');
failSave = false;
await page.getByRole('button', { name: '重试保存' }).click();
await page.getByText('已保存', { exact: true }).waitFor();
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
      navigationWrites: 0,
      solutionsLoadedOnDemand: true,
      conflictPreservedDraft: true,
      conflictNoAutomaticRetry: true,
      explicitRetrySaved: true,
      axeViolations: 0,
      pageErrors: errors,
    },
    null,
    2,
  ),
);
await browser.close();
console.log('knowledge browser checks passed');
