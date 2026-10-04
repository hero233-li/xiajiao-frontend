/* global URL, document, window */
// Runs against Spring Boot + isolated MySQL. No mocks or intercepted requests.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const url = process.env.PLATFORM_URL,
  username = process.env.PLATFORM_USERNAME,
  password = process.env.PLATFORM_PASSWORD;
if (!url || !username || !password) throw new Error('Missing isolated test configuration');
const output = resolve('docs/platform/evidence');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
});
const page = await context.newPage();
const calls = [],
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (new URL(r.url()).pathname.startsWith('/api/'))
    calls.push({
      path: new URL(r.url()).pathname,
      method: r.request().method(),
      status: r.status(),
    });
});
page.on('dialog', (d) => d.accept());
const shot = async (name) => {
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: resolve(output, name + '.png'),
    fullPage: (await page.getByRole('dialog').count()) === 0,
    animations: 'disabled',
  });
};
const dialog = () => page.getByRole('dialog');
const save = async (name) => {
  await dialog().getByRole('button', { name, exact: true }).click();
  await dialog().waitFor({ state: 'hidden' });
};
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const yesterday = new Date(today + 'T12:00:00Z');
yesterday.setUTCDate(yesterday.getUTCDate() - 1);
const previous = yesterday.toISOString().slice(0, 10);
async function login(name = username) {
  await page.goto(url + '/login');
  await page.getByLabel('用户名或邮箱').fill(name);
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((u) => u.pathname === '/');
  await page.getByRole('heading', { name: '今天，先做这些' }).waitFor();
  await page.locator('.today-agenda').waitFor();
}
try {
  await login();
  await page.goto(url + '/settings');
  await page.getByRole('button', { name: '编辑资料' }).click();
  await dialog().getByLabel('显示名称').fill('知途体验账号');
  await save('保存个人资料与偏好');
  await page.goto(url + '/');
  await page.locator('.today-agenda').waitFor();
  await shot('desktop-personal-home');
  await page.getByRole('link', { name: /进入自学空间/ }).click();
  await page.getByRole('heading', { name: '今日学习', exact: true }).waitFor();
  await shot('desktop-study');
  await page.goto(`${url}/zikao/course/00023/catalog?cycleId=${process.env.PLATFORM_CYCLE}`);
  await page.waitForURL((u) => u.pathname === '/study/course/00023/catalog');
  await page.getByRole('button', { name: '完成并继续', exact: true }).click();
  await page.getByText(/1 \/ 87 项已完成/).waitFor();
  await shot('desktop-study-reading');
  await page.getByRole('link', { name: '个人首页', exact: true }).click();
  await page.getByRole('heading', { name: '今天，先做这些' }).waitFor();
  await page.locator('.today-agenda').waitFor();
  await page.getByRole('link', { name: /进入健身空间/ }).click();
  await page.getByRole('heading', { name: '今天', exact: true }).waitFor();
  await page.getByRole('link', { name: '创建目标', exact: true }).click();
  await page.getByRole('button', { name: /设置新目标/ }).click();
  await dialog().getByLabel('目标类型').selectOption('GAIN');
  await dialog().getByLabel('起始体重（kg）', { exact: true }).fill('70');
  await dialog().getByLabel('目标体重（kg）', { exact: true }).fill('75');
  await save('保存设置新目标');
  await page.getByText('70 kg → 75 kg', { exact: false }).first().waitFor();
  await shot('desktop-goals');
  await page.goto(url + '/fitness/training');
  await page.getByRole('button', { name: '编辑安排', exact: true }).click();
  await dialog().getByRole('button', { name: '添加自定义动作' }).click();
  await dialog().getByLabel('动作名称').fill('个人训练动作（测试）');
  await dialog().getByLabel('组数', { exact: true }).fill('3');
  await dialog().getByLabel('次数', { exact: true }).fill('8');
  await dialog().getByLabel('重量（kg）', { exact: true }).fill('25.5');
  await save('保存训练安排');
  await page.getByRole('button', { name: '存为训练模板' }).click();
  await dialog().getByLabel('模板名称').fill('我的测试训练模板');
  await save('确认保存');
  await page.getByText('我的测试训练模板', { exact: true }).waitFor();
  await page.getByRole('button', { name: '记录实际', exact: true }).click();
  await dialog().getByLabel('项目 1 已完成').check();
  await save('保存实际训练');
  await shot('desktop-training');
  const weekDates = await page
    .locator('.week-plan button')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-date')));
  for (const scheduled of weekDates.filter((d) => d && d !== today)) {
    await page.getByLabel('查看日期', { exact: true }).fill(scheduled);
    await page.getByRole('button', { name: '编辑安排', exact: true }).click();
    await dialog().getByLabel('安排为休息日').check();
    await save('保存训练安排');
  }
  await page.getByLabel('查看日期', { exact: true }).fill(today);
  await page.getByRole('button', { name: '当前周存为模板' }).click();
  await dialog().getByLabel('模板名称').fill('我的周训练模板（测试）');
  await save('保存模板');
  await page.getByRole('button', { name: /下一周/ }).click();
  await page.getByRole('button', { name: /起的一周/ }).click();
  await page.getByText('模板已生成独立日期安排。', { exact: true }).waitFor();
  await shot('desktop-week-plan');

  await page.goto(url + '/fitness/meals');
  await page.getByRole('button', { name: '编辑食谱', exact: true }).click();
  await dialog().getByRole('button', { name: '添加食物' }).click();
  await dialog().getByLabel('食物名称').fill('测试早餐');
  await dialog().getByLabel('份量', { exact: true }).fill('1');
  await dialog().getByLabel('单位', { exact: true }).fill('份');
  await save('保存食谱计划');
  await page.getByRole('button', { name: '存为食谱模板' }).click();
  await dialog().getByLabel('模板名称').fill('我的测试食谱');
  await save('确认保存');
  await page.getByRole('button', { name: '从计划复制为实际后修改', exact: true }).click();
  await dialog().getByLabel('食物名称').fill('实际早餐（测试）');
  await save('保存实际饮食');
  await shot('desktop-meals');
  await page.goto(url + '/fitness/weight');
  await page.getByRole('button', { name: '记录 / 补录体重', exact: true }).click();
  await dialog().getByLabel('体重（kg）', { exact: true }).fill('70.125');
  await save('保存体重记录');
  await page.getByRole('button', { name: '修改当天体重', exact: true }).waitFor();
  await page.getByRole('button', { name: '修改当天体重', exact: true }).click();
  await dialog().getByLabel('体重（kg）', { exact: true }).fill('70.25');
  await save('保存体重记录');
  await shot('desktop-weight');
  await page.goto(url + '/fitness');
  await page.getByRole('button', { name: '完成每日打卡', exact: true }).click();
  await dialog().getByLabel('睡眠时长（小时，可选）').fill('7.5');
  await dialog().getByLabel('主观状态').selectOption('4');
  await dialog().getByLabel('备注 / 每日感受').fill('今天感觉良好（测试记录）');
  await save('保存每日打卡');
  await page.getByRole('button', { name: '修改今日打卡', exact: true }).waitFor();
  // Import the actual user-supplied seven-day schedule, then edit both persisted plans.
  await page.getByRole('button', { name: '查看与添加第一周计划', exact: true }).click();
  const firstWeekDate = new Date(today + 'T12:00:00Z');
  firstWeekDate.setUTCDate(firstWeekDate.getUTCDate() + 21);
  const firstWeekStart = firstWeekDate.toISOString().slice(0, 10);
  await dialog().getByLabel('Day 1 开始日期').fill(firstWeekStart);
  await dialog().getByRole('button', { name: '修改当天训练', exact: true }).click();
  await dialog().getByLabel('重量（kg）', { exact: true }).first().fill('22.5');
  await dialog().getByRole('button', { name: '返回当天说明' }).click();
  await shot('desktop-first-week-training');
  await dialog().getByRole('button', { name: '三餐与加餐', exact: true }).click();
  await dialog().getByRole('button', { name: '修改当天食谱', exact: true }).click();
  await dialog().getByLabel('份量', { exact: true }).first().fill('3');
  await dialog().getByRole('button', { name: '返回当天说明' }).click();
  await shot('desktop-first-week-meals');
  await page.setViewportSize({ width: 390, height: 844 });
  await shot('mobile-first-week-meals');
  if (await dialog().evaluate((el) => el.scrollWidth > el.clientWidth))
    throw new Error('First week mobile overflow');
  await dialog()
    .getByRole('button', { name: /^Day 7/ })
    .click();
  await dialog().getByRole('button', { name: '训练步骤', exact: true }).click();
  await dialog()
    .getByText(/默认保存为休息日/)
    .waitFor();
  await save('保存7天训练与食谱');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('link', { name: '查看 / 修改训练', exact: true }).click();
  await page.getByRole('button', { name: '编辑安排', exact: true }).click();
  if ((await dialog().getByLabel('重量（kg）', { exact: true }).first().inputValue()) !== '22.5')
    throw new Error('Imported training edit missing');
  await dialog().getByLabel('重量（kg）', { exact: true }).first().fill('23');
  await save('保存训练安排');
  await page.goto(`${url}/fitness/meals?date=${firstWeekStart}`);
  await page.getByRole('button', { name: '编辑食谱', exact: true }).click();
  if ((await dialog().getByLabel('份量', { exact: true }).first().inputValue()) !== '3')
    throw new Error('Imported meal edit missing');
  await dialog().getByLabel('份量', { exact: true }).first().fill('2.5');
  await save('保存食谱计划');
  await page.reload();
  await page.getByRole('button', { name: '编辑食谱', exact: true }).click();
  if ((await dialog().getByLabel('份量', { exact: true }).first().inputValue()) !== '2.5')
    throw new Error('Edited meal did not persist');
  await dialog().getByRole('button', { name: '取消', exact: true }).click();
  await page.goto(url + '/fitness');
  await page
    .getByRole('button', { name: /饮水记录/ })
    .first()
    .click();
  await dialog().getByLabel('饮水量（ml）').fill('1500');
  await save('保存饮水记录');
  await shot('desktop-fitness-today');
  await page.goto(url + '/fitness/history');
  await page.getByRole('heading', { name: '记录日历' }).waitFor();
  await shot('desktop-history');
  await page.getByLabel('查看日期', { exact: true }).fill(previous);
  await page.getByRole('button', { name: '补打卡', exact: true }).click();
  await dialog().getByLabel('备注 / 每日感受').fill('过去日期补打卡（测试）');
  await save('保存每日打卡');
  await page.getByRole('button', { name: '修改打卡', exact: true }).waitFor();
  await page.goto(url + '/settings');
  await page.getByRole('button', { name: '编辑资料' }).click();
  await dialog().getByLabel('显示名称').fill('知途体验账号');
  await dialog().getByLabel('个人介绍').fill('独立测试数据库中的浏览器验收账号');
  await save('保存个人资料与偏好');
  await shot('desktop-settings');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url + '/');
  await page.getByRole('heading', { name: '知途体验账号，欢迎回来。' }).waitFor();
  await shot('mobile-personal-home');
  await page.getByRole('link', { name: /进入健身空间/ }).click();
  await page.getByRole('button', { name: '修改今日打卡', exact: true }).waitFor();
  await shot('mobile-fitness-today');
  await page.goto(url + '/fitness/training');
  await page.getByRole('heading', { name: '实际训练', exact: true }).waitFor();
  await shot('mobile-training');
  await page.goto(url + '/fitness/meals');
  await page.getByRole('heading', { name: '实际吃了什么' }).waitFor();
  await shot('mobile-meals');
  await page.goto(url + '/fitness/history');
  await page.getByRole('heading', { name: '记录日历' }).waitFor();
  await shot('mobile-history');
  await page.reload();
  await page.getByRole('heading', { name: '记录日历' }).waitFor();
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
    throw new Error('Mobile horizontal overflow');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await page.waitForURL((u) => u.pathname === '/login');
  await login();
  await page.goto(url + '/fitness/weight');
  await page.getByText('70.25 kg', { exact: true }).waitFor();
  await page.goto(url + '/fitness');
  await page.getByRole('button', { name: '修改今日打卡', exact: true }).waitFor();
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await page.waitForURL((u) => u.pathname === '/login');
  await login(process.env.PLATFORM_OTHER);
  await page.goto(url + '/fitness');
  await page.getByRole('button', { name: '完成每日打卡', exact: true }).waitFor();
  await page.getByText('还没有记录', { exact: true }).waitFor();
  if (errors.length) throw new Error(JSON.stringify(errors));
  const failed = calls.filter(
    (c) => c.status >= 400 && !(c.status === 404 && c.path.endsWith('/learning-position')),
  );
  if (failed.length) throw new Error(JSON.stringify(failed));
  writeFileSync(
    resolve(output, 'browser.json'),
    JSON.stringify(
      {
        realHttp: true,
        mockRoutes: 0,
        desktop: true,
        mobile: true,
        learningProgress: true,
        legacyRedirect: true,
        goal: true,
        training: true,
        meals: true,
        weightCreateEdit: true,
        checkin: true,
        backfill: true,
        profile: true,
        refresh: true,
        relogin: true,
        userIsolation: true,
        firstWeekImportEdit: true,
        errors,
        calls,
      },
      null,
      2,
    ),
  );
  console.log('Full real browser/backend/MySQL workflow passed');
} catch (e) {
  await shot('failure');
  writeFileSync(
    resolve(output, 'failure.json'),
    JSON.stringify({ message: e.message, errors, calls }, null, 2),
  );
  throw e;
} finally {
  await browser.close();
}
