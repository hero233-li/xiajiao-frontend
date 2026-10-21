import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const {BANK_UI_URL:url,BANK_USERNAME:user,BANK_PASSWORD:password,BANK_CYCLE:cycle,BANK_EVIDENCE:out}=process.env;
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 for(let i=0;i<40;i++){try{await page.goto(url+'/login');break;}catch(e){if(i===39)throw e;await new Promise(r=>setTimeout(r,250));}}
 await page.getByLabel('用户名或邮箱').fill(user);await page.getByLabel('密码',{exact:true}).fill(password);await page.getByRole('button',{name:'登录',exact:true}).click();await page.waitForURL(u=>u.pathname!='/login');
 for(const code of ['00023','02324','13175','13015']){
  await page.goto(`${url}/study/course/${code}/practice?cycleId=${cycle}`);await page.getByRole('heading',{name:'章节检测',exact:true}).waitFor();await page.getByRole('heading',{name:'本章独立检测',exact:true}).waitFor();
  if(await page.getByRole('group',{name:'练习等级'}).count()||await page.getByRole('link',{name:'继续此考点练习',exact:true}).count()||await page.getByRole('heading',{name:'练习题发布情况',exact:true}).count())throw Error(code+': still exposing practice');
  const select=page.getByRole('combobox',{name:'检测章节',exact:true});const opts=await select.locator('option').evaluateAll(es=>es.map(e=>({value:e.value,title:e.textContent})));if(opts.length<3)throw Error(code+': chapter selector is empty');
  await select.selectOption(opts.at(-1).value);await page.getByRole('heading',{name:opts.at(-1).title,exact:true}).waitFor();
  await page.getByRole('checkbox').check();const chapters=page.getByRole('button',{name:/^开始 .*卷 ·/});if(await chapters.count()!==3)throw Error('must show exactly 3 chapter variants');for(let i=0;i<3;i++)if(!(await chapters.nth(i).isEnabled()))throw Error('chapter blocked behind practice');
  for(const v of ['A','B','C'])if(!(await page.getByRole('button',{name:new RegExp(`模拟卷 ${v} ·`)}).isDisabled()))throw Error('mock unlocked before chapter completion');
  await page.screenshot({path:resolve(out,code+'-direct-chapters.png'),fullPage:true});
 }
 // A bookmark to the cancelled FTC point must show chapter assessments as well.
 await page.goto(`${url}/study/course/00023/practice/1da6de03-1c89-524f-824a-35bc7bb191ca?cycleId=${cycle}&point=00023%3Afoundation-24-40%3Ad2a6fabcd814&level=simple`);
 await page.getByRole('heading',{name:'章节检测',exact:true}).waitFor();await page.getByRole('heading',{name:'本章独立检测',exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(out,'legacy-bookmark-mobile.png'),fullPage:true});await page.setViewportSize({width:1280,height:1000});
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:/^开始 .*A卷 ·/}).click();await page.getByRole('navigation',{name:'试卷题号'}).waitFor();await page.screenshot({path:resolve(out,'chapter-session-started.png'),fullPage:true});
 if(errors.length)throw Error(errors.join('\n'));writeFileSync(resolve(out,'result.json'),JSON.stringify({status:'PASSED',realHttp:true,mockedRoutes:0,errors,courses:4,chapterSelectorPopulatedAndChanged:true,legacyPointBookmarkShowsChapters:true,chapterStartWithoutPractice:true,mocksRemainLocked:true},null,2));
}finally{await browser.close();}
