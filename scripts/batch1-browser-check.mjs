import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Browser-only contract fixtures; no mock is installed in the production application.
const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(frontendRoot, 'package.json'));
const { chromium } = require('playwright');
const operations = JSON.parse(
  fs.readFileSync(path.join(frontendRoot, 'src/mocks/generated.json'), 'utf8'),
);
const base = path.join(frontendRoot, 'batch1-evidence');
fs.mkdirSync(base, { recursive: true });
const example = (id) => structuredClone(operations.find((x) => x.operationId === id).example);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
const resourceErrors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') resourceErrors.push(msg.text());
});
await page.route('**/api/v1/**', async (route) => {
  const req = route.request();
  const path = new URL(req.url()).pathname.replace('/api/v1', '');
  let result;
  if (path === '/exams/cycles') {
    const c = example('getDashboard').data.cycle;
    result = { code: 0, message: 'ok', data: { items: [c], page: 1, size: 100, total: 1 } };
  } else {
    let op = [...operations]
      .sort((a, b) => (a.path.match(/\{/g)?.length ?? 0) - (b.path.match(/\{/g)?.length ?? 0))
      .find(
        (x) =>
          x.method.toUpperCase() === req.method() &&
          new RegExp('^' + x.path.replace(/\{[^}]+\}/g, '[^/]+') + '$').test(path),
      );
    if (op) result = structuredClone(op.example);
  }
  if (!result)
    return route.fulfill({ status: 404, json: { code: 40401, message: '无记录', data: null } });
  if (path === '/auth/login' || path === '/auth/me') {
    if (result.data.user) result.data.user.role = 'USER';
    else result.data.role = 'USER';
  }
  await route.fulfill({ status: 200, json: result });
});
await page.goto('http://127.0.0.1:4178/zikao');
await page.getByLabel('用户名或邮箱').fill('demo');
await page.getByLabel('密码', { exact: true }).fill('Demo12345');
await page.getByRole('button', { name: '登录', exact: true }).click();
await page.getByRole('heading', { name: '一步一步，学有所成。' }).waitFor();
await page.getByRole('heading', { name: '高等数学', exact: true }).waitFor();
const forbidden = ['接口未提供', '暂未提供', '后端返回'];
const assert = (x, msg) => {
  if (!x) throw new Error(msg);
};
assert(
  (await page.getByRole('link', { name: '健康检查', exact: true }).count()) === 0,
  'health nav visible',
);
assert(
  (await page.getByRole('link', { name: '公共组件', exact: true }).count()) === 0,
  'component nav visible',
);
assert(
  (await page.getByRole('link', { name: '管理入口', exact: true }).count()) === 0,
  'admin visible',
);
const documentText = await page.locator('body').innerText();
assert(
  (await page.getByLabel('考试周期', { exact: true }).count()) === 0,
  'single cycle picker visible',
);
assert(!page.url().includes('cycleId'), 'cycle id URL');
assert(!forbidden.some((x) => documentText.includes(x)), 'developer copy visible');
await page.screenshot({ path: base + '/production-dashboard.png', fullPage: true });
await page.goto('http://127.0.0.1:4178/zikao/course/00023/catalog');
await page.getByRole('navigation', { name: '课程页面' }).waitFor();
await page.getByRole('heading', { name: '上次停在这里' }).waitFor();
await page.screenshot({ path: base + '/production-catalog.png', fullPage: true });
await page
  .getByRole('navigation', { name: '课程页面' })
  .getByRole('link', { name: '历年试卷', exact: true })
  .click();
await page.getByRole('heading', { name: '历年试卷与成绩' }).waitFor();
await page.goBack();
await page.getByRole('heading', { name: '上次停在这里' }).waitFor();
await page.goForward();
await page.getByRole('heading', { name: '历年试卷与成绩' }).waitFor();
await page.screenshot({ path: base + '/production-exams.png', fullPage: true });
for (const [title, path] of [
  ['知识合集', 'knowledge'],
  ['刷题', 'practice'],
  ['历年试卷', 'exams'],
  ['备注', 'notes'],
]) {
  await page
    .getByRole('navigation', { name: '课程页面' })
    .getByRole('link', { name: title, exact: true })
    .click();
  await page.waitForURL(`**/${path}`);
  await page.getByRole('navigation', { name: '面包屑' }).waitFor();
  assert(
    (await page
      .getByRole('navigation', { name: '课程页面' })
      .getByRole('link', { name: title, exact: true })
      .getAttribute('aria-current')) === 'page',
    title + ' inactive',
  );
  await page.reload();
  try {
    await page.getByRole('navigation', { name: '课程页面' }).waitFor({ timeout: 8000 });
  } catch (e) {
    console.log('FAIL ON', path, page.url(), await page.locator('body').innerText(), errors);
    await page.screenshot({ path: base + '/reload-failure.png' });
    throw e;
  }
  assert(new URL(page.url()).pathname.endsWith('/' + path), 'refresh changed pane');
  const content = await page.locator('body').innerText();
  assert(!forbidden.some((x) => content.includes(x)), 'developer copy visible');
}
await page.goto('http://127.0.0.1:4178/health');
await page.getByRole('heading', { name: '页面未找到' }).waitFor();
await page.goto('http://127.0.0.1:4178/components');
await page.getByRole('heading', { name: '页面未找到' }).waitFor();
await page.route('**/api/v1/courses/by-code/99999**', (r) =>
  r.fulfill({ status: 404, json: { code: 40401, message: '课程不存在', data: null } }),
);
await page.goto('http://127.0.0.1:4178/zikao/course/99999/catalog');
await page.getByRole('heading', { name: '课程不存在' }).waitFor({ timeout: 5000 });
await page.screenshot({ path: base + '/course-not-found.png' });
fs.writeFileSync(
  base + '/browser-results.json',
  JSON.stringify(
    {
      productionHiddenEntries: true,
      ordinaryUserNoAdmin: true,
      singleCycleAutoSelected: true,
      courseTabsRefresh: true,
      unknownCourse: true,
      pageErrors: errors,
      expected404ResourceMessages: resourceErrors.filter((x) => x.includes('404')).length,
    },
    null,
    2,
  ),
);
assert(errors.length === 0, 'unexpected browser error');
await browser.close();
console.log('Browser checks passed');
