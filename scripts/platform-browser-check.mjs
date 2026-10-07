/* Real browser + Spring Boot + isolated MySQL. No intercepted business requests. */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const url = process.env.PLATFORM_URL,
  username = process.env.PLATFORM_USERNAME,
  password = process.env.PLATFORM_PASSWORD;
if (!url || !username || !password) throw Error('Missing isolated test configuration');
const out = process.env.PLATFORM_EVIDENCE || 'docs/growth-platform/evidence/isolated';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
});
const calls = [],
  errors = [],
  checks = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (new URL(r.url()).pathname.startsWith('/api/'))
    calls.push({
      path: new URL(r.url()).pathname,
      method: r.request().method(),
      status: r.status(),
    });
});
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const future = new Date(today + 'T12:00:00Z');
future.setUTCDate(future.getUTCDate() + 21);
const start = future.toISOString().slice(0, 10);
async function shot(name) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: out + '/' + name + '.png', fullPage: true });
}
async function login(name = username) {
  await page.goto(url + '/login');
  await page.getByLabel('用户名或邮箱').fill(name);
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((u) => u.pathname === '/');
  await page.getByRole('heading', { name: '我的空间', exact: true }).waitFor();
}
async function savePage(name) {
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForURL((u) => !u.pathname.includes('/edit/'));
}
async function saveDialog(name) {
  const d = page.getByRole('dialog');
  await d.getByRole('button', { name, exact: true }).click();
  await d.waitFor({ state: 'hidden' });
}
try {
  await login();
  await shot('desktop-home');
  await page.goto(`${url}/zikao/course/00023/catalog?cycleId=${process.env.PLATFORM_CYCLE}`);
  await page.waitForURL((u) => u.pathname === '/study/course/00023/catalog');
  await page.getByRole('button', { name: '完成并继续', exact: true }).click();
  await page.waitForTimeout(400);
  checks.push('阅读进度完成与旧链接');
  await shot('desktop-reading');
  await page.goto(url + '/fitness/goals');
  await page.getByRole('button', { name: /设置新目标/ }).click();
  let d = page.getByRole('dialog');
  await d.getByLabel('目标类型').selectOption('GAIN');
  await d.getByLabel('起始体重（kg）', { exact: true }).fill('70');
  await d.getByLabel('目标体重（kg）', { exact: true }).fill('75');
  await saveDialog('保存设置新目标');
  await page
    .getByText(/70 kg → 75 kg/)
    .first()
    .waitFor();
  checks.push('目标创建');
  await page.goto(url + '/fitness/edit/training-plan?date=' + today);
  await page.getByRole('button', { name: '添加自定义动作' }).click();
  await page.getByLabel('动作名称').fill('个人训练动作（测试）');
  await page.getByLabel('组数', { exact: true }).fill('3');
  await page.getByLabel('次数', { exact: true }).fill('8');
  await page.getByLabel('重量（kg）', { exact: true }).fill('25.5');
  await savePage('保存训练安排');
  await page.goto(url + '/fitness/training');
  await page.getByText('个人训练动作（测试）', { exact: true }).first().waitFor();
  await page.getByText('计划管理', { exact: true }).click();
  await page.getByRole('button', { name: '存为训练模板' }).click();
  d = page.getByRole('dialog');
  await d.getByLabel('模板名称').fill('我的测试训练模板');
  await saveDialog('确认保存');
  checks.push('训练安排与个人模板');
  await page.goto(url + '/fitness/edit/training?copy=1&date=' + today);
  await page.getByLabel('训练状态').selectOption('COMPLETED');
  await page.getByLabel('项目 1 已完成').check();
  await savePage('保存实际训练');
  await page.goto(url + '/fitness/training');
  await page.getByRole('checkbox').first().waitFor();
  await shot('desktop-training');
  checks.push('实际训练完成');
  await page.goto(url + '/fitness/edit/meal-plan?date=' + today);
  await page.getByRole('button', { name: '添加食物' }).click();
  await page.getByLabel('食物名称').fill('测试早餐');
  await page.getByLabel('份量', { exact: true }).fill('1');
  await page.getByLabel('单位', { exact: true }).fill('份');
  await savePage('保存食谱计划');
  await page.goto(url + '/fitness/edit/meals?copy=1&date=' + today);
  await page.getByLabel('食物名称').fill('实际早餐（测试）');
  await savePage('保存实际饮食');
  await page.goto(url + '/fitness/meals');
  await page.getByText('实际早餐（测试）', { exact: false }).first().waitFor();
  await shot('desktop-meals');
  checks.push('食谱与实际饮食');
  await page.goto(url + '/fitness/weight');
  await page.getByLabel('体重1（kg）').fill('70.125');
  await page.getByRole('button', { name: '保存体重1', exact: true }).click();
  await page.getByText('70.125 kg · 已记录', { exact: true }).waitFor();
  await page.getByLabel('体重1（kg）').fill('70.25');
  await page.getByRole('button', { name: '保存体重1', exact: true }).click();
  await page.getByText('70.25 kg · 已记录', { exact: true }).waitFor();
  await shot('desktop-weight');
  checks.push('体重创建与修改');
  await page.goto(url + '/fitness');
  await page.getByLabel('饮水总量（ml）').fill('1500');
  await page.getByRole('button', { name: '保存总量', exact: true }).click();
  await page.getByText('1500 ml · 当天总量', { exact: true }).waitFor();
  await page.getByRole('button', { name: '完成打卡', exact: true }).click();
  await page.getByRole('button', { name: '今天已打卡', exact: true }).waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  checks.push('饮水与每日打卡');
  // Explicit isolated fixture: this existing editor previews saved data, never invents a week.
  await page.evaluate(async () => {
    const session = JSON.parse(sessionStorage.getItem('xuexizhitu.session.real'));
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    };
    const sourceStart = '2026-10-05';
    const history = await fetch('/api/v1/fitness/history?from=' + sourceStart + '&to=2026-10-11', {
      headers,
    }).then((r) => r.json());
    const days = history.data.map((day) => ({
      training: {
        rest: false,
        exercises: [
          {
            id: crypto.randomUUID(),
            name: '隔离测试训练',
            type: 'STRENGTH',
            sets: 3,
            reps: 8,
            kg: 20,
            minutes: null,
            km: null,
            note: null,
            completed: null,
          },
        ],
        note: '测试来源',
      },
      meals: {
        foods: [
          {
            meal: 'BREAKFAST',
            name: '隔离测试早餐',
            quantity: 1,
            unit: '份',
            kcal: null,
            protein: null,
            carbs: null,
            fat: null,
          },
        ],
        note: null,
      },
      expectedTrainingRevision: day.records['training-plan']?.revision ?? -1,
      expectedMealRevision: day.records['meal-plan']?.revision ?? -1,
    }));
    const response = await fetch('/api/v1/fitness/weeks/import', {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ startDate: sourceStart, days }),
    });
    if (!response.ok) throw Error('Isolated saved-week fixture failed');
  });
  await page.goto(url + '/fitness/first-week');
  await page.getByLabel('Day 1 开始日期').fill(start);
  await page.getByRole('button', { name: '修改当天训练', exact: true }).click();
  await page.getByLabel('重量（kg）', { exact: true }).first().fill('22.5');
  await page.getByRole('button', { name: '返回当天说明' }).click();
  await page.getByRole('button', { name: '三餐与加餐', exact: true }).click();
  await page.getByRole('button', { name: '修改当天食谱', exact: true }).click();
  await page.getByLabel('份量', { exact: true }).first().fill('3');
  await page.getByRole('button', { name: '返回当天说明' }).click();
  await page.getByRole('button', { name: '保存7天训练与食谱', exact: true }).click();
  await page.waitForURL((u) => u.pathname === '/fitness/training' && u.search.includes(start));
  checks.push('第一周7天计划事务导入');
  await page.goto(url + '/fitness/edit/training-plan?date=' + start);
  if ((await page.getByLabel('重量（kg）', { exact: true }).first().inputValue()) !== '22.5')
    throw Error('Imported training value missing');
  await page.getByLabel('重量（kg）', { exact: true }).first().fill('23');
  await savePage('保存训练安排');
  await page.goto(url + '/fitness/edit/meal-plan?date=' + start);
  if ((await page.getByLabel('份量', { exact: true }).first().inputValue()) !== '3')
    throw Error('Imported meal value missing');
  await page.getByLabel('份量', { exact: true }).first().fill('2.5');
  await savePage('保存食谱计划');
  await page.reload();
  checks.push('导入计划后续编辑与刷新');
  await page.goto(url + '/settings');
  await page.getByRole('button', { name: '编辑资料' }).click();
  d = page.getByRole('dialog');
  await d.getByLabel('显示名称').fill('知途体验账号');
  await d.getByLabel('个人介绍').fill('隔离测试数据库中的浏览器验收账号');
  await saveDialog('保存个人资料与偏好');
  checks.push('统一账号资料');
  for (const width of [390, 768, 1440])
    for (const path of [
      '/',
      '/spaces',
      '/fitness',
      '/fitness/training',
      '/fitness/meals',
      '/fitness/history',
      '/fitness/weight',
    ]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(url + path);
      await page.locator('#main-content').waitFor();
      await page.waitForTimeout(350);
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
        throw Error(`Overflow ${width} ${path}`);
      await shot(path.replaceAll('/', '-') + '-' + width);
    }
  await page.goto(url + '/settings');
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await page.waitForURL((u) => u.pathname === '/login');
  await login();
  await page.goto(url + '/fitness/weight');
  await page.getByText('70.25 kg · 已记录', { exact: true }).waitFor();
  await page.goto(url + '/fitness');
  await page.getByRole('button', { name: '今天已打卡', exact: true }).waitFor();
  if (!(await page.getByRole('button', { name: '今天已打卡', exact: true }).isDisabled()))
    throw Error('Checkin did not persist');
  checks.push('刷新与重新登录保留真实数据');
  await page.goto(url + '/settings');
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await page.waitForURL((u) => u.pathname === '/login');
  await login(process.env.PLATFORM_OTHER);
  await page.goto(url + '/fitness/weight');
  if (await page.getByText('70.25 kg · 已记录', { exact: true }).count())
    throw Error('User data leaked');
  await page.getByLabel('体重1（kg）').waitFor();
  checks.push('用户数据隔离');
  if (errors.length) throw Error(errors.join('\n'));
  const failed = calls.filter(
    (c) => c.status >= 400 && !(c.status === 404 && c.path.endsWith('/learning-position')),
  );
  if (failed.length) throw Error(JSON.stringify(failed));
  writeFileSync(
    out + '/browser.json',
    JSON.stringify({ realHttp: true, mockRoutes: 0, checks, errors, calls }, null, 2),
  );
  console.log('Isolated real browser workflows passed');
} catch (e) {
  await shot('failure');
  writeFileSync(
    out + '/failure.json',
    JSON.stringify({ message: e.message, checks, errors, calls }, null, 2),
  );
  throw e;
} finally {
  await browser.close();
}
