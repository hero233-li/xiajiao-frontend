import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const out = 'docs/growth-platform/evidence';
mkdirSync(out, { recursive: true });
if (!process.env.GROWTH_PASSWORD) throw Error('GROWTH_PASSWORD required');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const results = [],
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const base = 'http://127.0.0.1:5173';
async function login() {
  await page.goto(base + '/login');
  await page.getByLabel('用户名或邮箱').fill('integration');
  await page.getByLabel('密码', { exact: true }).fill(process.env.GROWTH_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((u) => u.pathname != '/login');
  await page.getByRole('heading', { name: '我的空间', exact: true }).waitFor();
}
async function api(method, path, body) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const session = JSON.parse(sessionStorage.getItem('xuexizhitu.session.real'));
      const response = await fetch('/api/v1' + path, {
        method,
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: response.status, body: await response.json() };
    },
    { method, path, body },
  );
}
async function dir() {
  return (await api('GET', '/personal/spaces')).body.data;
}
async function check(name, fn) {
  await fn();
  results.push({ name, passed: true });
}
let initial;
try {
  await login();
  initial = await dir();
  await check('收藏、隐藏与刷新持久化', async () => {
    await page.goto(base + '/spaces');
    const p = initial.preferences.find((p) => p.spaceId === 'study');
    const favorite = page.getByRole('button', {
      name: `${p.favorite ? '取消收藏' : '收藏'}自学`,
      exact: true,
    });
    await favorite.click();
    await page.getByRole('status').filter({ hasText: '空间偏好已保存' }).waitFor();
    await page.getByRole('button', { name: `${p.hidden ? '显示' : '隐藏'}自学入口` }).click();
    await page.getByRole('status').filter({ hasText: '空间偏好已保存' }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: `${p.hidden ? '隐藏' : '显示'}自学入口` }).waitFor();
    const d = await dir();
    const updated = d.preferences.find((p) => p.spaceId === 'study');
    if (updated.favorite === p.favorite || updated.hidden === p.hidden)
      throw Error('Preferences did not persist');
  });
  await check('排序刷新持久化', async () => {
    await page.getByRole('button', { name: '上移健身', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '空间顺序已保存' }).waitFor();
    await page.reload();
    const d = await dir();
    const a = d.preferences.find((p) => p.spaceId === 'fitness'),
      b = d.preferences.find((p) => p.spaceId === 'study');
    if (a.position >= b.position) throw Error('Order not persisted');
  });
  await check('重新登录后偏好保留', async () => {
    const before = await dir();
    await page.getByRole('button', { name: /账号菜单/ }).click();
    await page.getByRole('button', { name: '退出登录', exact: true }).click();
    await page.waitForURL((u) => u.pathname === '/login');
    await login();
    const after = await dir();
    for (const p of before.preferences) {
      const next = after.preferences.find((x) => x.spaceId === p.spaceId);
      if (p.favorite !== next.favorite || p.hidden !== next.hidden || p.position !== next.position)
        throw Error('Relogin lost preference');
    }
  });
  // Restore personal entry settings before checking navigation; never touch business data.
  for (const original of initial.preferences.filter(
    (p) => initial.spaces.find((s) => s.id === p.spaceId).status === 'AVAILABLE',
  )) {
    const latest = (await dir()).preferences.find((p) => p.spaceId === original.spaceId);
    const r = await api('PUT', `/personal/spaces/${original.spaceId}/preference`, {
      joined: original.joined,
      favorite: original.favorite,
      hidden: original.hidden,
      position: original.position,
      expectedRevision: latest.revision,
    });
    if (r.status !== 200) throw Error('Preference restore failed');
  }
  await check('未上线空间无可执行入口', async () => {
    await page.goto(base + '/spaces');
    for (const name of ['考研', '雅思']) {
      const card = page
        .getByRole('article')
        .filter({ has: page.getByRole('heading', { name, exact: true }) });
      if (await card.locator('a,button').count()) throw Error('Coming soon has actions');
    }
  });
  await check('最近访问恢复日期，切换面板键盘关闭与焦点恢复', async () => {
    await page.goto(base + '/fitness/weight?date=2026-10-01');
    await page.waitForTimeout(900);
    await page.goto(base + '/');
    await page.getByRole('button', { name: '切换空间', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '切换空间' });
    await dialog.getByRole('searchbox').fill('健身');
    const target = dialog.getByRole('link', { name: /健身/ }).first();
    if (!(await target.getAttribute('href')).includes('date=2026-10-01'))
      throw Error('Resume lost date');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    await page.waitForTimeout(100);
    if (await page.getByRole('dialog').count()) throw Error('Escape failed');
    if (
      !(await page
        .getByRole('button', { name: '切换空间', exact: true })
        .evaluate((el) => el === document.activeElement))
    )
      throw Error('Focus not restored');
  });
  await check('未保存输入阻止切换，取消后保留输入', async () => {
    await page.goto(base + '/fitness/weight');
    await page.getByLabel('体重1（kg）').fill('71.125');
    await page.getByRole('link', { name: '首页', exact: true }).first().click();
    await page.getByRole('dialog', { name: '有未保存的修改' }).waitFor();
    await page.getByRole('button', { name: '取消', exact: true }).click();
    if ((await page.getByLabel('体重1（kg）').inputValue()) !== '71.125') throw Error('Draft lost');
    await page.getByRole('link', { name: '首页', exact: true }).first().click();
    await page
      .getByRole('dialog', { name: '有未保存的修改' })
      .getByRole('button', { name: '确认', exact: true })
      .click();
    await page.waitForURL((u) => u.pathname === '/');
  });
  await check('学习摘要故障隔离（明确的故障注入）', async () => {
    await page.route('**/api/v1/personal/study-summary', (r) =>
      r.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ code: 50001, data: null, message: '测试故障注入' }),
      }),
    );
    await page.reload();
    await page.getByRole('button', { name: '重试自学摘要' }).waitFor({ timeout: 20000 });
    await page.getByRole('link', { name: /今日训练/ }).waitFor();
    await page.screenshot({ path: out + '/partial-failure.png', fullPage: true });
    await page.unroute('**/api/v1/personal/study-summary');
  });
  await check('旧学习链接、阅读、题库与真题批改入口', async () => {
    await page.goto(base + '/zikao/course/00023/catalog#anchor');
    await page.waitForURL((u) => u.pathname === '/study/course/00023/catalog');
    await page.getByRole('button', { name: '选择章节与条目', exact: true }).waitFor();
    if (!page.url().endsWith('#anchor')) throw Error('Anchor lost');
    await page.screenshot({ path: out + '/reading-1440.png', fullPage: true });
    await page.goto(base + '/study/course/00023/practice');
    await page.getByRole('heading').first().waitFor();
    await page.waitForTimeout(900);
    await page.screenshot({ path: out + '/practice-1440.png', fullPage: true });
    await page.goto(base + '/study/course/00023/exams');
    await page.getByRole('heading', { name: '历年试卷', exact: true }).waitFor();
    await page.screenshot({ path: out + '/exams-grading-1440.png', fullPage: true });
  });
  for (const width of [390, 768, 1440])
    for (const path of [
      '/study/course/00023/catalog',
      '/study/course/00023/practice',
      '/study/course/00023/exams',
      '/fitness/edit/training-plan',
      '/admin?view=courses',
      '/admin?view=bank',
    ]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(base + path);
      await page.locator('#main-content').waitFor();
      await page.waitForTimeout(700);
      const extra = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (extra > 1) throw Error(`Overflow ${path} ${width} +${extra}`);
      results.push({ name: '核心页面响应式', path, width, passed: true });
      await page.screenshot({
        path: out + '/' + path.replace(/[^a-z0-9]+/gi, '-') + '-' + width + '.png',
        fullPage: true,
      });
    }
  if (errors.length) throw Error(errors.join('\n'));
  writeFileSync(
    out + '/workflows.json',
    JSON.stringify(
      { realHttp: true, businessDataMutated: false, preferencesRestored: true, results, errors },
      null,
      2,
    ),
  );
} catch (e) {
  await page.screenshot({ path: out + '/workflow-failure.png', fullPage: true });
  writeFileSync(
    out + '/workflow-failure.json',
    JSON.stringify({ message: e.message, results, errors }, null, 2),
  );
  throw e;
} finally {
  if (initial) {
    for (const p of initial.preferences.filter(
      (p) => initial.spaces.find((s) => s.id === p.spaceId).status === 'AVAILABLE',
    )) {
      try {
        const latest = (await dir()).preferences.find((x) => x.spaceId === p.spaceId);
        await api('PUT', `/personal/spaces/${p.spaceId}/preference`, {
          joined: p.joined,
          favorite: p.favorite,
          hidden: p.hidden,
          position: p.position,
          expectedRevision: latest.revision,
        });
      } catch {}
    }
  }
  await browser.close();
}
