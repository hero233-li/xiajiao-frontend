/* global URL */
/* Real HTTP integration only: no route interception or mock worker. */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const { REFACTOR_UI_URL: url, REFACTOR_USERNAME: username, REFACTOR_PASSWORD: password,
  REFACTOR_CYCLE: cycle, REFACTOR_PAPER: paper, REFACTOR_IMAGE: answerImage, REFACTOR_EVIDENCE: output } = process.env;
if (![url, username, password, cycle, paper, answerImage, output].every(Boolean)) throw new Error('Missing isolated integration configuration');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [], calls = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', response => {
  const target = new URL(response.url());
  if (target.pathname.startsWith('/api/')) calls.push({ path: target.pathname, method: response.request().method(), status: response.status() });
});
try {
  await page.goto(`${url}/login`);
  await page.getByLabel('用户名或邮箱').fill(username);
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL(u => u.pathname !== '/login');
  await page.goto(`${url}/zikao/course/00023/catalog?cycleId=${cycle}`);
  await page.getByRole('button', { name: '选择章节与条目', exact: true }).waitFor();
  await page.getByRole('button', { name: '完成并继续', exact: true }).waitFor();
  await page.screenshot({ path: resolve(output, 'catalog.png'), fullPage: true });
  await page.goto(`${url}/zikao/course/00023/exams?cycleId=${cycle}`);
  await page.getByRole('heading', { name: '历年试卷', exact: true }).waitFor();
  await page.getByRole('button', { name: '录入成绩', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('试卷选择').selectOption(paper);
  // Use a date in the current fixture cycle, expressed in Shanghai local time.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  await dialog.getByLabel('练习日期').fill(today);
  await dialog.getByLabel('分数（0–100）').fill('75');
  await dialog.getByLabel('实际用时（分钟）').fill('120');
  await dialog.getByLabel('限时（分钟）').fill('150');
  await dialog.locator('input[name="complete"][value="yes"]').check();
  await dialog.locator('input[name="closedBook"][value="yes"]').check();
  await dialog.locator('input[name="answersSeenBefore"][value="no"]').check();
  await dialog.getByLabel('备注').fill('真实浏览器联调记录');
  await dialog.getByLabel('可选图片存档').setInputFiles(answerImage);
  await dialog.getByRole('button', { name: '保存成绩', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '成绩与照片', exact: true }).click();
  await page.getByText('图片存档：answer.png', { exact: true }).waitFor();
  await page.getByRole('button', { name: '编辑成绩', exact: true }).first().click();
  await dialog.getByLabel('分数（0–100）').fill('82');
  await dialog.getByRole('button', { name: '保存成绩', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '编辑成绩', exact: true }).first().click();
  await dialog.getByText('查看成绩修订历史', { exact: true }).click();
  await dialog.getByText(/版本 1 · 82 分/).waitFor();
  await dialog.getByText(/版本 0 · 75 分/).waitFor();
  await page.screenshot({ path: resolve(output, 'score-revisions.png'), fullPage: true });
  const unexpected = calls.filter(c => c.status >= 400 && !(c.status === 404 && c.method === 'GET' && c.path.endsWith('/learning-position')));
  if (errors.length || unexpected.length) throw new Error(JSON.stringify({ errors, failedCalls: unexpected }));
  const result = { realHttp: true, mockedRoutes: 0, login: true, catalog: true, scoreCreated: true, imageArchived: true, scoreRevised: true, historicalScorePreserved: true, pageErrors: errors, calls };
  writeFileSync(resolve(output, 'browser.json'), JSON.stringify(result, null, 2));
  console.log('Real browser/backend/MySQL integration passed');
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png'), fullPage: true });
  writeFileSync(resolve(output, 'failure.json'), JSON.stringify({ message: error.message, errors, calls }, null, 2));
  throw error;
} finally { await browser.close(); }
