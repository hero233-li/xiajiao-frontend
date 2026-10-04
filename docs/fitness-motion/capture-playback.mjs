import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
for (const [name, width, height] of [
  ['desktop', 1440, 1100],
  ['mobile', 390, 844],
]) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.clock.install();
  await page.goto('http://127.0.0.1:5180/docs/fitness-motion/preview.html');
  for (const [id, label] of [
    ['leg-press', '腿举'],
    ['chest-press', '坐姿推胸'],
    ['hip-thrust', '臀推机'],
  ]) {
    await page.getByRole('button', { name: `查看动作：${label}`, exact: true }).click();
    await page.clock.runFor(2500);
    await page.getByRole('button', { name: '暂停', exact: true }).click();
    await page.getByRole('dialog').evaluate((el) => (el.scrollTop = 0));
    await page.screenshot({
      path: `docs/fitness-motion/all-actions/${name}-${id}-playback.png`,
      fullPage: false,
    });
    await page.keyboard.press('Escape');
  }
  await context.close();
}
await browser.close();
console.log('Saved six playback-control screenshots.');
