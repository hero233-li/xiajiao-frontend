import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const url = 'http://127.0.0.1:5173',
  out = 'docs/growth-platform/evidence';
mkdirSync(out, { recursive: true });
if (!process.env.GROWTH_PASSWORD) throw new Error('GROWTH_PASSWORD required');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [],
  calls = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (new URL(r.url()).pathname.startsWith('/api/'))
    calls.push({
      path: new URL(r.url()).pathname,
      status: r.status(),
      method: r.request().method(),
    });
});
const checks = [];
async function capture(path, name, width) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(url + path);
  await page.locator('#main-content').waitFor();
  await page.waitForTimeout(1200);
  const overflow = await page.evaluate(() => ({
    viewport: innerWidth,
    width: document.documentElement.scrollWidth,
  }));
  if (overflow.width > overflow.viewport + 1)
    throw new Error(`Overflow ${path} ${width}: ${JSON.stringify(overflow)}`);
  await page.screenshot({ path: `${out}/${name}-${width}.png`, fullPage: true });
  checks.push({ path, width, overflow: false, title: await page.title() });
}
try {
  await page.goto(url + '/login');
  await page.getByLabel('用户名或邮箱').fill('integration');
  await page.getByLabel('密码', { exact: true }).fill(process.env.GROWTH_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((u) => u.pathname != '/login');
  for (const width of [1440, 768, 390]) {
    await capture('/', 'home', width);
    await capture('/spaces', 'spaces', width);
    await capture('/today', 'today', width);
    await capture('/study', 'study', width);
    await capture('/fitness', 'fitness', width);
    await capture('/admin', 'admin', width);
  }
  writeFileSync(
    `${out}/initial-browser.json`,
    JSON.stringify({ realHttp: true, checks, errors, calls }, null, 2),
  );
  if (errors.length) throw new Error(errors.join('\n'));
} catch (e) {
  await page.screenshot({ path: `${out}/failure.png`, fullPage: true });
  writeFileSync(
    `${out}/failure.json`,
    JSON.stringify({ message: e.message, checks, errors, calls }, null, 2),
  );
  throw e;
} finally {
  await browser.close();
}
