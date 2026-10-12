/* Actual isolated server and browser, with an actual Codex worker. No route mocks. */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const { SHEET_UI_URL:url, SHEET_USERNAME:username, SHEET_PASSWORD:password, SHEET_CYCLE:cycle, SHEET_CODE:code, SHEET_CHAPTER:chapter, SHEET_PHOTO:photo, SHEET_EVIDENCE:out }=process.env;
if (![url,username,password,cycle,code,chapter,photo,out].every(Boolean)) throw Error('Missing sheet test configuration');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:1000}});const errors=[];const requests=[];const batchStates=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',async r=>{if(r.url().includes('/practice-batches')&&r.headers()['content-type']?.includes('application/json')) {try {const d=(await r.json()).data;batchStates.push({path:new URL(r.url()).pathname,state:d?.state,error:d?.error,result:d?.result});} catch{}}});page.on('response',r=>{if(new URL(r.url()).pathname.startsWith('/api/')) requests.push({path:new URL(r.url()).pathname,status:r.status(),method:r.request().method()});});
async function downloadPdf(name){
 const link=page.getByRole('link',{name:'下载PDF',exact:true});await link.waitFor({timeout:60000});
 const download=page.waitForEvent('download');await link.click();await(await download).saveAs(resolve(out,name));
 const count=await page.locator('.practice-pdf-questions section').count();if(count!==10)throw Error(`PDF has ${count} question sections`);
 if(await page.getByRole('textbox',{name:'作答文本'}).count())throw Error('Old one-question input still visible');
}
try {
 await page.goto(`${url}/login`);await page.getByLabel('用户名或邮箱').fill(username);await page.getByLabel('密码',{exact:true}).fill(password);await page.getByRole('button',{name:'登录',exact:true}).click();await page.waitForURL(u=>u.pathname!='/login');
 await page.goto(`${url}/study/course/${code}/practice/${chapter}?cycleId=${cycle}&point=image&level=simple`);
 await downloadPdf('fixture-ten-questions.pdf');
 if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('No-photo grading enabled');
 await page.getByLabel('上传整组作答照片',{exact:true}).setInputFiles(photo);await page.getByText(/^已上传 1\/20 张/).waitFor();
 await page.reload();await page.getByText(/^已上传 1\/20 张/).waitFor();await page.getByRole('button',{name:'查看照片1',exact:true}).click();await page.getByAltText('整组作答照片预览').waitFor();
 await page.screenshot({path:resolve(out,'sheet-desktop-uploaded.png'),fullPage:true});
 await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).click();await page.getByRole('button',{name:'确认继续',exact:true}).click();
 await page.getByText('已申请，等待批改',{exact:true}).first().waitFor();await page.screenshot({path:resolve(out,'sheet-queued.png'),fullPage:true});
 await page.getByText('批改完成',{exact:true}).first().waitFor({timeout:180000});
 const results=page.locator('.sheet-result details');if(await results.count()!==10)throw Error('Result did not cover all ten questions');
 for(let i=1;i<=10;i++)await page.getByText(new RegExp(`^第${i}题 · 得分 10 / 10$`)).waitFor();
 await page.screenshot({path:resolve(out,'sheet-graded-ten.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(out,'sheet-mobile-result.png'),fullPage:true});
 // Check real authored Chinese/math content on the same isolated database.
 await page.setViewportSize({width:1280,height:1000});await page.goto(`${url}/study/course/00023/practice?cycleId=${cycle}`);
 const enter=page.getByRole('link',{name:'继续此考点练习',exact:true});await enter.waitFor();await enter.click();await downloadPdf('calculus-ten-questions.pdf');
 await page.screenshot({path:resolve(out,'sheet-calculus-pdf.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(out,'sheet-mobile-calculus.png'),fullPage:true});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);if(overflow)throw Error('Mobile horizontal overflow');
 if(errors.length)throw Error(errors.join('\n'));
 writeFileSync(resolve(out,'browser.json'),JSON.stringify({actualBrowser:true,mockRoutes:false,actualCodexWorker:true,onePhotoTenQuestions:true,allTenGraded:true,photoResume:true,noPhotoSubmitBlocked:true,desktopMobile:true,pdfQuestionCount:10,errors,requests},null,2));
 console.log('PASS actual browser -> one photo -> Codex -> ten separate grades; Chinese/math PDF and mobile checked');
} catch(e) { await page.screenshot({path:resolve(out,'failure.png'),fullPage:true}); writeFileSync(resolve(out,'failure.json'),JSON.stringify({errors,requests,batchStates,visibleText:await page.locator('body').innerText()},null,2)); throw e; } finally {await browser.close();}
