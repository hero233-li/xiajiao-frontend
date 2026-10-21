import {chromium} from 'playwright';import {writeFileSync} from 'node:fs';import {resolve} from 'node:path';
const {BANK_UI_URL:url,BANK_USERNAME:username,BANK_PASSWORD:password,BANK_CYCLE:cycle,BANK_EVIDENCE:out}=process.env;
const browser=await chromium.launch({headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 for(let i=0;i<40;i++){try{await page.goto(url+'/login');break;}catch(e){if(i===39)throw e;await new Promise(r=>setTimeout(r,250));}}
 await page.getByLabel('用户名或邮箱').fill(username);await page.getByLabel('密码',{exact:true}).fill(password);await page.getByRole('button',{name:'登录',exact:true}).click();await page.waitForURL(u=>u.pathname!='/login');
 await page.goto(`${url}/study/course/${process.env.BANK_COURSE_CODE||'00023'}/practice?cycleId=${cycle}`);await page.getByLabel('练习章节').waitFor();const opt=page.getByLabel('练习章节').locator('option').filter({hasText:process.env.BANK_CHAPTER_TITLE||'第一章'});await page.getByLabel('练习章节').selectOption(await opt.getAttribute('value'));
 const mean=page.getByLabel('三套章节检测成绩');await mean.getByText(/已交卷 3\/3，已评分 3\/3/).waitFor();await mean.getByText(/平均得分率：90/).waitFor();await page.getByText('已取得本章通过资格。',{exact:true}).waitFor();await page.screenshot({path:resolve(out,'three-paper-mean.png'),fullPage:true});
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:new RegExp(`开始 ${process.env.BANK_CHAPTER_TITLE||'第一章'}.*A卷`)}).click();await page.getByRole('heading',{name:'独立章节检测 A卷',exact:true}).waitFor();await page.getByRole('navigation',{name:'试卷题号'}).getByRole('button',{name:process.env.BANK_QUESTIONS_PER_PAPER||'22',exact:true}).waitFor();await page.screenshot({path:resolve(out,`chapter${process.env.BANK_QUESTIONS_PER_PAPER||22}-session.png`),fullPage:true});
 if(Number(process.env.BANK_QUESTIONS_PER_PAPER||22)===35){
  for(const [n,label]of [['16','填空'],['26','简答'],['33','证明']]){await page.getByRole('navigation',{name:'试卷题号'}).getByRole('button',{name:n,exact:true}).click();await page.getByLabel('作答文本').waitFor();await page.getByText(new RegExp(label+'题')).first().waitFor();await page.screenshot({path:resolve(out,`question-${n}-${label}.png`),fullPage:true});}
 }
 if(Number(process.env.BANK_QUESTIONS_PER_PAPER)===30){
  for(const [n,label]of [['11','填空题'],['21','名词解释题'],['23','简答题'],['27','计算题'],['29','分析设计题']]){
   await page.getByRole('navigation',{name:'试卷题号'}).getByRole('button',{name:n,exact:true}).click();await page.getByLabel('作答文本').waitFor();await page.getByText(new RegExp(label)).first().waitFor();await page.screenshot({path:resolve(out,`question-${n}.png`),fullPage:true});
  }
 }
 if(errors.length)throw Error(errors.join('\n'));writeFileSync(resolve(out,'result.json'),JSON.stringify({status:'PASSED',realHttp:true,mockedRoutes:0,errors,threePaperMean:90,questionsPerPaper:Number(process.env.BANK_QUESTIONS_PER_PAPER||22),chapterPassVisible:true},null,2));
}finally{await browser.close();}
