/* Explicit 2/6/12 directory layout fixtures. Only this test intercepts the catalog response. */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const base = 'http://127.0.0.1:5173',
  out = 'docs/growth-platform/evidence';
if (!process.env.GROWTH_PASSWORD) throw Error('GROWTH_PASSWORD required');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const checks = [];
try {
  await page.goto(base + '/login');
  await page.getByLabel('用户名或邮箱').fill('integration');
  await page.getByLabel('密码', { exact: true }).fill(process.env.GROWTH_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((u) => u.pathname != '/login');
  const directory = await page.evaluate(async () => {
    const s = JSON.parse(sessionStorage.getItem('xuexizhitu.session.real'));
    return fetch('/api/v1/personal/spaces', {
      headers: { Authorization: `Bearer ${s.accessToken}` },
    })
      .then((r) => r.json())
      .then((r) => r.data);
  });
  for (const count of [2, 6, 12]) {
    const fixture = {
      spaces: directory.spaces
        .filter((s) => s.status === 'AVAILABLE')
        .map((s) => ({ ...s, name: s.name + '（目录测试配置）' })),
      preferences: directory.preferences.filter((p) => ['study', 'fitness'].includes(p.spaceId)),
    };
    while (fixture.spaces.length < count) {
      const i = fixture.spaces.length;
      fixture.spaces.push({
        id: `test-${i}`,
        name: `测试空间 ${i - 1}（仅布局验收）`,
        description: '明确标注的测试配置，没有真实业务、任务或进度。',
        icon: 'book',
        accent: '#4667ab',
        entry: null,
        order: (i + 1) * 10,
        visible: true,
        status: 'COMING_SOON',
        permission: 'USER',
        defaultJoined: false,
      });
      fixture.preferences.push({
        spaceId: `test-${i}`,
        joined: false,
        favorite: false,
        hidden: false,
        position: (i + 1) * 10,
        revision: -1,
        lastPath: null,
        visitedAt: null,
      });
    }
    await page.route('**/api/v1/personal/spaces', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, message: '明确标注的目录布局测试配置', data: fixture }),
      }),
    );
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + '/spaces');
      await page.getByRole('article').last().waitFor();
      if ((await page.getByRole('article').count()) !== count)
        throw Error('Catalog count mismatch');
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
        throw Error(`Scale overflow ${count}/${width}`);
      await page.screenshot({
        path: `${out}/test-directory-${count}-${width}.png`,
        fullPage: true,
      });
      await page.getByRole('searchbox').fill('目录测试');
      if ((await page.getByRole('article').count()) !== 2) throw Error('Search failed');
      await page.getByRole('searchbox').fill('');
      await page.getByLabel('显示范围').selectOption('joined');
      if ((await page.getByRole('article').count()) !== 2) throw Error('Joined filter failed');
      checks.push({ testFixture: true, count, width, search: true, filter: true, overflow: false });
    }
    await page.unroute('**/api/v1/personal/spaces');
  }
  writeFileSync(
    out + '/scale.json',
    JSON.stringify({ testFixturesOnly: true, productionSpacesAdded: 0, checks }, null, 2),
  );
} finally {
  await browser.close();
}
