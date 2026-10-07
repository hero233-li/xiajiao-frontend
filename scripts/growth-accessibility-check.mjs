import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
if (!process.env.GROWTH_PASSWORD) throw Error('GROWTH_PASSWORD required');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const base = 'http://127.0.0.1:5173';
const checks = [];
try {
  await page.goto(base + '/login');
  await page.getByLabel('用户名或邮箱').fill('integration');
  await page.getByLabel('密码', { exact: true }).fill(process.env.GROWTH_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((u) => u.pathname != '/login');
  for (const width of [390, 1440])
    for (const path of ['/', '/spaces', '/today']) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + path);
      await page.getByRole('heading').first().waitFor();
      await page.waitForTimeout(700);
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      checks.push({
        path,
        width,
        violations: result.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
      });
    }
  await page.goto(base + '/');
  await page.getByRole('button', { name: '切换空间', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  checks.push({
    path: 'space-switcher',
    width: 1440,
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  });
  writeFileSync(
    'docs/growth-platform/evidence/accessibility.json',
    JSON.stringify({ checks }, null, 2),
  );
  if (checks.some((c) => c.violations.length)) throw Error('Accessibility violations recorded');
} finally {
  await browser.close();
}
