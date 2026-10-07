/* Real browser → real HTTP → isolated MySQL. Synthetic test content only. */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const { BANK_UI_URL: url, BANK_USERNAME: username, BANK_PASSWORD: password, BANK_CYCLE: cycle, BANK_EVIDENCE: output, BANK_ADMIN: admin, BANK_ORIGINAL: original, BANK_FIXTURE: fixture, BANK_SQL: sqlCourse, BANK_REJECTED: rejected } = process.env;
if (![url, username, password, cycle, output].every(Boolean)) throw new Error('Missing integration configuration');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();let lastPage=page;const errors = [], calls = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { const p = new URL(r.url()).pathname;if (p.startsWith('/api/')) calls.push({ path: p, method: r.request().method(), status: r.status() }); });
const practice = `${url}/study/course/99999/practice?cycleId=${cycle}`;
try {
  await page.goto(`${url}/login`);await page.getByLabel('用户名或邮箱').fill(username);await page.getByLabel('密码', { exact: true }).fill(password);await page.getByRole('button', { name: '登录', exact: true }).click();await page.waitForURL(u => u.pathname !== '/login');
  await page.goto(practice);await page.getByRole('heading', { name: '按考点练习与检测' }).waitFor();
  await page.getByRole('radio').first().check();
  for(let i=0;i<2;i++) {const done=page.waitForResponse(r => /\/questions\/[^/]+\/answers$/.test(new URL(r.url()).pathname) && r.request().method()==='POST');await page.getByRole('button',{name:'提交作答',exact:true}).click();await done;await page.getByText('正确',{exact:true}).waitFor();if(i===0){await page.getByRole('radio').nth(1).check();await page.getByRole('radio').first().check();}}
  await page.getByText(/第 1 \/ 10 题 · 已完成 1\/10/).waitFor();
  await page.getByText(/得分率 10%/).first().waitFor();
  await page.getByRole('button',{name:'提交作答',exact:true}).waitFor({state:'visible'});
  await page.screenshot({path:resolve(output,'practice-distinct-coverage.png'),fullPage:true});
  for(let i=0;i<9;i++)await page.getByRole('button',{name:'下一题',exact:true}).click();
  await page.getByLabel('作答文本').fill('isolated proof response');await page.getByRole('button',{name:'提交作答',exact:true}).click();await page.getByText('已提交，等待评分与核对',{exact:true}).waitFor();
  await page.getByText(/第 10 \/ 10 题 · 已完成 1\/10/).waitFor();await page.screenshot({path:resolve(output,'subjective-pending-no-unlock.png'),fullPage:true});
  await page.getByRole('checkbox').check();await page.getByRole('button',{name:/模拟卷 A ·/}).click();await page.waitForURL(u=>u.pathname.includes('/tests/rebuilt/'));
  await page.getByRole('heading',{name:'固定模拟卷 A',exact:true}).waitFor();
  for(let i=0;i<3;i++) {await page.getByRole('radio').first().check();const saved=page.waitForResponse(r=>r.request().method()==='PUT' && new URL(r.url()).pathname.includes('/answers/'));await page.getByRole('button',{name:'保存本题答案',exact:true}).click();await saved;await page.getByText('本题答案已保存。',{exact:true}).waitFor();if(i<2)await page.getByRole('navigation',{name:'试卷题号'}).getByRole('button',{name:String(i+2),exact:true}).click();}
  await page.screenshot({path:resolve(output,'fixed-mock-before-submit.png'),fullPage:true});
  await page.getByRole('button',{name:'确认完整交卷',exact:true}).click();await page.getByText('正确率 100% · 已取得通过资格',{exact:true}).waitFor();
  await page.reload();await page.getByText('正确率 100% · 已取得通过资格',{exact:true}).waitFor();await page.screenshot({path:resolve(output,'fixed-mock-complete.png'),fullPage:true});
  const context=await browser.newContext();const adminPage=await context.newPage();lastPage=adminPage;adminPage.on('pageerror',e=>errors.push(e.message));adminPage.on('response',r=>{const p=new URL(r.url()).pathname;if(p.startsWith('/api/'))calls.push({path:p,method:r.request().method(),status:r.status(),role:'ADMIN'});});
  await adminPage.goto(`${url}/login`);await adminPage.getByLabel('用户名或邮箱').fill(admin);await adminPage.getByLabel('密码',{exact:true}).fill(password);await adminPage.getByRole('button',{name:'登录',exact:true}).click();await adminPage.waitForURL(u=>u.pathname!=='/login');
  await adminPage.goto(`${url}/admin?view=bank&courseId=${original}&cycleId=${cycle}`);await adminPage.getByRole('heading',{name:'题库审查与发布',exact:true}).waitFor();
  if(await adminPage.getByRole('button',{name:'发布经过完整复核的版本',exact:true}).isEnabled())throw new Error('Unverified draft incorrectly publishable');
  const rejectedReview=adminPage.locator('article.bank-review').filter({hasText:'synthetic rejected legacy browser fixture'});
  await rejectedReview.getByLabel('结论',{exact:true}).selectOption('RETIRE');
  await rejectedReview.getByLabel('具体依据（每项一行）',{exact:true}).fill('Explicit rejection of isolated synthetic legacy fixture');
  await rejectedReview.getByRole('button',{name:'判定不通过并删除',exact:true}).click();

  await adminPage.getByRole('heading',{name:'待清理题目 1',exact:true}).waitFor();
  await adminPage.getByLabel('确认删除上述记录和快照，无法恢复',{exact:true}).check();
  await adminPage.getByLabel('删除原因',{exact:true}).fill('Explicit synthetic legacy history cleanup');
  const removed=adminPage.waitForResponse(r=>r.request().method()==='POST' && new URL(r.url()).pathname.endsWith(`/questions/${rejected}/delete-history`));
  await adminPage.getByRole('button',{name:'删除此题及列出的历史',exact:true}).click();
  if((await removed).status()!==200)throw new Error('Scoped legacy cleanup failed');
  await adminPage.getByText('没有待清理的不合格旧题记录。',{exact:true}).waitFor();
  await adminPage.screenshot({path:resolve(output,'admin-rejected-history-removed.png'),fullPage:true});
  await adminPage.getByRole('button',{name:'题目草稿与复核',exact:true}).click();await adminPage.getByLabel('主考点',{exact:true}).selectOption('13015:practice-systems-1:90864433e630');
  await adminPage.getByText('CHOICE · simple · DRAFT · 补码取模规则',{exact:true}).click();await adminPage.getByText('用8位补码相加时，最高位之外的进位应如何处理？',{exact:true}).first().waitFor();
  await adminPage.screenshot({path:resolve(output,'admin-real-curated-drafts.png'),fullPage:true});
  await adminPage.goto(`${url}/admin?view=bank&courseId=${fixture}&cycleId=${cycle}`);await adminPage.getByRole('heading',{name:'题库审查与发布',exact:true}).waitFor();await adminPage.getByRole('button',{name:'固定试卷',exact:true}).click();await adminPage.getByText('synthetic mock fixture · 已审核',{exact:true}).first().click();await adminPage.getByText(/规定 60 分钟 · 3 题 · 满分 100/).first().waitFor();await adminPage.screenshot({path:resolve(output,'admin-fixed-paper-review.png'),fullPage:true});
  if(await adminPage.getByLabel('管理课程',{exact:true}).inputValue()!==fixture)throw new Error('Administrator course selector does not match the bank under review');
  if(await adminPage.getByLabel('题库内容版本',{exact:true}).count())throw new Error('Version switching must not be visible');
  await adminPage.getByRole('button',{name:'更新题库',exact:true}).click();
  await adminPage.getByRole('button',{name:'发布经过完整复核的版本',exact:true}).waitFor();
  if(await adminPage.getByText('synthetic mock fixture · 已审核',{exact:true}).count())throw new Error('Old paper exposed in newest draft');
  await adminPage.screenshot({path:resolve(output,'admin-latest-bank-only.png'),fullPage:true});
  await adminPage.goto(`${url}/admin?view=bank&courseId=${sqlCourse}&cycleId=${cycle}`);await adminPage.getByRole('heading',{name:'题库审查与发布',exact:true}).waitFor();await adminPage.getByRole('button',{name:'题目草稿与复核',exact:true}).click();await adminPage.getByLabel('主考点',{exact:true}).selectOption('13171:manual-practice-1:c154195220cb');await adminPage.getByText('CODE · simple · DRAFT · 比较运算',{exact:true}).click();await adminPage.locator('details[open]').getByText(/使用给定 inventory 表和固定数据/).first().waitFor();await adminPage.screenshot({path:resolve(output,'admin-real-sql-operation-drafts.png'),fullPage:true});
  const unexpected=calls.filter(c=>c.status>=400 && !(c.status===404 && c.path.endsWith('/learning-position')));
  if(errors.length || unexpected.length)throw new Error(JSON.stringify({errors,unexpected}));
  writeFileSync(resolve(output,'browser.json'),JSON.stringify({verifiedAt:new Date().toISOString(),realHttp:true,mockedRoutes:0,content:'isolated synthetic fixtures, not approved bank content',repeatedAnswerCoverage:1,subjectivePendingBlocksProgress:true,realCuratedDraftsInAdmin:true,adminOrderedPaperReview:true,latestBankOnly:true,rejectedLegacyHistoryDeleted:true,rejectionLeadsToScopedCleanup:true,realSqlCodeDraftsInAdmin:true,unverifiedPublicationBlocked:true,fixedMockSubmitted:true,resultAfterReload:true,errors,calls},null,2));
  console.log('Reviewed bank real browser / HTTP / MySQL passed');
} catch(e) {writeFileSync(resolve(output,'failure.txt'),String(e)+'\n'+await lastPage.locator('body').innerText());await lastPage.screenshot({path:resolve(output,'failure.png'),fullPage:true});throw e;} finally {await browser.close();}
