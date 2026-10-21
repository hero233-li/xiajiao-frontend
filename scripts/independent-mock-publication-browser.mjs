import {chromium} from 'playwright';import {writeFileSync} from 'node:fs';import {resolve} from 'node:path';
const {BANK_UI_URL:url,BANK_USERNAME:username,BANK_PASSWORD:password,BANK_CYCLE:cycle,BANK_EVIDENCE:out}=process.env;
const browser=await chromium.launch({headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 for(let i=0;i<40;i++){try{await page.goto(url+'/login');break;}catch(e){if(i===39)throw e;await new Promise(r=>setTimeout(r,250));}}
 await page.getByLabel('用户名或邮箱').fill(username);await page.getByLabel('密码',{exact:true}).fill(password);await page.getByRole('button',{name:'登录',exact:true}).click();await page.waitForURL(u=>u.pathname!='/login');
 await page.goto(`${url}/study/course/${process.env.BANK_COURSE_CODE||'13015'}/practice?cycleId=${cycle}`);await page.getByRole('heading',{name:'A / B / C 固定模拟卷',exact:true}).waitFor();await page.getByRole('checkbox').check();
 for(const v of ['A','B','C'])await page.getByRole('button',{name:new RegExp(`模拟卷 ${v} · ${process.env.BANK_LIMIT_MINUTES||120} 分钟`)}).waitFor();
 if(process.env.BANK_COURSE_CODE==='13015' && await page.getByRole('heading',{name:'练习题发布情况',exact:true}).count())throw Error('仅章节检测科目不应显示考点练习发布提示');
 await page.screenshot({path:resolve(out,'independent-mocks-visible.png'),fullPage:true});await page.getByText('检测与模拟卷记录',{exact:true}).click();await page.getByRole('link',{name:new RegExp(process.env.BANK_RESULT_LINK||'流程验证 B · 已通过')}).click();await page.getByRole('heading',{name:'固定模拟卷 B',exact:true}).waitFor();await page.screenshot({path:resolve(out,'graded-answers-revealed.png'),fullPage:true});await page.goto(`${url}/study/course/${process.env.BANK_COURSE_CODE||'13015'}/practice?cycleId=${cycle}`);await page.getByRole('heading',{name:'A / B / C 固定模拟卷',exact:true}).waitFor();await page.getByRole('checkbox').check();await page.getByRole('button',{name:new RegExp(`模拟卷 C · ${process.env.BANK_LIMIT_MINUTES||120} 分钟`)}).click();await page.getByRole('heading',{name:'固定模拟卷 C',exact:true}).waitFor();await page.getByRole('navigation',{name:'试卷题号'}).getByRole('button',{name:process.env.BANK_QUESTION_COUNT||'10',exact:true}).click();await page.getByLabel('作答文本').waitFor();await page.screenshot({path:resolve(out,'subjective-pending.png'),fullPage:true});
 if(process.env.BANK_COURSE_CODE==='02324'){
  for(const n of ['31','32']){
   await page.getByRole('navigation',{name:'试卷题号'}).getByRole('button',{name:n,exact:true}).click();
   const img=page.locator(`img[src="/bank-figures/discrete-mock-C-${n}.svg"]`);await img.waitFor();
   await img.evaluate(e=>e.decode());if(!(await img.evaluate(e=>e.naturalWidth>0)))throw Error('diagram did not load');
   await page.screenshot({path:resolve(out,`diagram-C-${n}.png`),fullPage:true});
  }
 }
 if(process.env.BANK_COURSE_CODE==='13175'){
  await page.getByRole('navigation',{name:'试卷题号'}).getByRole('button',{name:'7',exact:true}).click();
  await page.getByText('矩阵答案按行填写',{exact:false}).waitFor();
  await page.getByLabel('作答文本').fill('2.0,-2;2,2');
  await page.getByRole('button',{name:'保存本题答案',exact:true}).click();
  await page.getByText('本题答案已保存。',{exact:true}).waitFor();
  await page.screenshot({path:resolve(out,'matrix-answer-saved.png'),fullPage:true});
 }
 if(errors.length)throw Error(errors.join('\n'));writeFileSync(resolve(out,'result.json'),JSON.stringify({status:'PASSED',realHttp:true,mockedRoutes:0,errors,syntheticWorkflowOnly:true,independentMocksVisible:true,subjectiveInput:true,matrixInputSaved:process.env.BANK_COURSE_CODE==='13175'?true:undefined},null,2));
}finally{await browser.close();}
