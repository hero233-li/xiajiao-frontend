/* global URL */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const { REFACTOR_UI_URL:url,REFACTOR_USERNAME:username,REFACTOR_PASSWORD:password,REFACTOR_CYCLE:cycle,REFACTOR_PAPER:paper,REFACTOR_IMAGE:image,REFACTOR_EVIDENCE:output }=process.env;
mkdirSync(output,{recursive:true});const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:1000}});const errors=[],calls=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))calls.push({path:new URL(r.url()).pathname,status:r.status(),method:r.request().method()});});
try{
 await page.goto(`${url}/login`);await page.getByLabel('用户名或邮箱').fill(username);await page.getByLabel('密码',{exact:true}).fill(password);await page.getByRole('button',{name:'登录',exact:true}).click();await page.waitForURL(u=>u.pathname!='/login');
 await page.goto(`${url}/zikao/course/00023/exams?cycleId=${cycle}`);await page.getByRole('button',{name:'答卷批改',exact:true}).click();await page.getByLabel('批改试卷',{exact:true}).selectOption(paper);
 await page.getByRole('button',{name:'新建独立答卷',exact:true}).click();await page.getByLabel('添加答题照片',{exact:true}).setInputFiles(image);await page.getByRole('button',{name:'移除',exact:true}).waitFor();
 await page.getByRole('button',{name:'申请批改',exact:true}).click();await page.screenshot({path:resolve(output,'queued.png'),fullPage:true});
 await page.getByText('成绩已生成，可在“成绩与照片”查看。',{exact:false}).waitFor({timeout:150000});await page.getByText('总分：100.00 / 100',{exact:true}).waitFor();await page.screenshot({path:resolve(output,'completed.png'),fullPage:true});
 await page.getByRole('button',{name:'成绩与照片',exact:true}).click(); await page.locator('strong').filter({hasText:'100 分'}).first().waitFor(); await page.screenshot({path:resolve(output,'score-record.png'),fullPage:true});
 if(errors.length)throw new Error(errors.join('\n'));const failed=calls.filter(c=>c.status>=400&&!c.path.endsWith('/learning-position'));if(failed.length)throw new Error(JSON.stringify(failed));
 writeFileSync(resolve(output,'browser.json'),JSON.stringify({mockRoutes:false,actualBrowser:true,queuedToCompleted:true,scorePageRefreshed:true,score:100,calls,errors},null,2));console.log('Real browser → server queue → Mac Codex → server CODEX score: passed');
}finally{await browser.close();}
