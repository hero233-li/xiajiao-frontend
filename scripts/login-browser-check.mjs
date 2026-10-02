/* global document, window, innerWidth, Event */
import { chromium } from 'playwright';
import fs from 'node:fs';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const base = 'login-evidence';
fs.mkdirSync(base, { recursive: true });
const results = [];
const failures = [];
page.on('pageerror', (error) => failures.push(error.message));
const assert = (value, message) => {
  if (!value) throw new Error(message);
};
await page.goto('http://127.0.0.1:5173/login');
await page.getByRole('heading', { name: '登录学习知途' }).waitFor();
assert((await page.title()) === '登录 · 学习知途', 'incorrect title');
assert(
  (await page.getByRole('button', { name: '使用演示账号' }).count()) === 0,
  'mock entry in real environment',
);
for (const width of [320, 390, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  const submit = page.getByRole('button', { name: '登录', exact: true });
  const before = await submit.boundingBox();
  await submit.click();
  const after = await submit.boundingBox();
  assert(Math.abs(before.y - after.y) < 1, `validation shifted button at ${width}`);
  assert(
    (await page.getByLabel('用户名或邮箱').getAttribute('aria-invalid')) === 'true',
    'missing validation',
  );
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    `overflow at ${width}`,
  );
  await page.screenshot({ path: `${base}/after-${width}.png`, fullPage: true });
  results.push({ width, noOverflow: true, validationShift: after.y - before.y });
  await page.reload();
  await page.getByRole('heading', { name: '登录学习知途' }).waitFor();
}
// A 720 CSS-pixel viewport represents the content width at 200% zoom on a 1440 display.
await page.setViewportSize({ width: 720, height: 450 });
await page.screenshot({ path: `${base}/zoom-equivalent-200.png`, fullPage: true });
assert(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  'zoom reflow overflow',
);
// Reduced viewport checks that a virtual keyboard can scroll the submit button into view.
await page.setViewportSize({ width: 390, height: 360 });
await page.getByLabel('密码', { exact: true }).focus();
await page.getByRole('button', { name: '登录', exact: true }).scrollIntoViewIfNeeded();
const keyboardBox = await page.getByRole('button', { name: '登录', exact: true }).boundingBox();
assert(
  keyboardBox.y >= 0 && keyboardBox.y + keyboardBox.height <= 360,
  'button inaccessible in reduced viewport',
);
await page.screenshot({ path: `${base}/keyboard-equivalent.png`, fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.reload();
await page.getByRole('heading', { name: '登录学习知途' }).waitFor();
let release;
const pending = new Promise((resolve) => {
  release = resolve;
});
let requests = 0;
await page.route('**/api/v1/auth/login', async (route) => {
  requests += 1;
  await pending;
  await route.fulfill({
    status: 401,
    json: { code: 40101, message: '用户名、邮箱或密码不正确', data: null },
  });
});
await page.getByLabel('用户名或邮箱').fill('validation-test');
await page.getByLabel('密码', { exact: true }).fill('invalid');
const buttonBefore = await page.getByRole('button', { name: '登录', exact: true }).boundingBox();
await page.getByLabel('密码', { exact: true }).press('Enter');
await page.getByRole('button', { name: '正在登录…', exact: true }).waitFor();
await page.locator('form').evaluate((form) => {
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
});
await page.screenshot({ path: `${base}/pending-390.png`, fullPage: true });
release();
await page.getByRole('alert').filter({ hasText: '用户名、邮箱或密码不正确' }).waitFor();
assert(requests === 1, 'duplicate request');
assert((await page.getByLabel('用户名或邮箱').inputValue()) === 'validation-test', 'lost username');
const buttonAfter = await page.getByRole('button', { name: '登录', exact: true }).boundingBox();
assert(Math.abs(buttonBefore.y - buttonAfter.y) < 1, 'credential error shifted button');
await page.screenshot({ path: `${base}/error-390.png`, fullPage: true });
await page.getByLabel('用户名或邮箱').focus();
await page.keyboard.press('Tab');
assert(
  await page.getByLabel('密码', { exact: true }).evaluate((el) => el === document.activeElement),
  'password tab order',
);
await page.keyboard.press('Tab');
assert(
  await page
    .getByRole('button', { name: '登录', exact: true })
    .evaluate((el) => el === document.activeElement),
  'button tab order',
);
const { AxeBuilder } = await import('@axe-core/playwright');
const accessibility = await new AxeBuilder({ page }).analyze();
assert(accessibility.violations.length === 0, JSON.stringify(accessibility.violations));
assert(failures.length === 0, 'browser errors');
fs.writeFileSync(
  `${base}/results.json`,
  JSON.stringify(
    {
      results,
      title: true,
      mockHidden: true,
      errorShift: buttonAfter.y - buttonBefore.y,
      pendingRequests: requests,
      keyboardOrder: true,
      reducedViewportScroll: true,
      zoomReflowEquivalent: true,
      accessibilityViolations: accessibility.violations,
      pageErrors: failures,
    },
    null,
    2,
  ),
);
await browser.close();
console.log('Login browser checks passed');
