/* Real browser after committed complete replacement in an isolated MySQL. No route mocks. */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const {BANK_UI_URL:url,BANK_USERNAME:username,BANK_PASSWORD:password,BANK_CYCLE:cycle,BANK_COURSE:course,BANK_EVIDENCE:out}=process.env;
if(![url,username,password,cycle,course,out].every(Boolean))throw Error('Missing integration configuration');
mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(`${url}/login`);await page.getByLabel('用户名或邮箱').fill(username);await page.getByLabel('密码',{exact:true}).fill(password);await page.getByRole('button',{name:'登录',exact:true}).click();await page.waitForURL(u=>u.pathname!=='/login');
 await page.goto(`${url}/admin?view=bank&courseId=${course}&cycleId=${cycle}`);
 await page.getByRole('heading',{name:'题库审查与发布',exact:true}).waitFor();
 await page.getByRole('status').filter({hasText:'旧题及关联作答快照已整体移除'}).waitFor();
 if(await page.getByRole('button',{name:'发布经过完整复核的版本',exact:true}).isEnabled())throw Error('Incomplete original bank can publish');
 if(await page.getByLabel('题库内容版本',{exact:true}).count())throw Error('Version selector visible');
 await page.getByRole('button',{name:'题目草稿与复核',exact:true}).click();
 await page.getByLabel('主考点',{exact:true}).selectOption('13175:linear-chapter-1:5e28f962587a');
 await page.getByText('PROOF · hard · VERIFIED · 全实参数非负判定',{exact:true}).click();
 await page.locator('article,details').filter({hasText:'PROOF · hard · VERIFIED · 全实参数非负判定'}).first().getByText('来源：',{exact:false}).first().waitFor();
 await page.getByLabel('主考点',{exact:true}).selectOption('13175:linear-chapter-2:d8f2e1c67a3a');
 await page.getByText('PROOF · hard · VERIFIED · 列行乘积的幂等判定',{exact:true}).click();
 await page.locator('article,details').filter({hasText:'PROOF · hard · VERIFIED · 列行乘积的幂等判定'}).first().getByText('来源：',{exact:false}).first().waitFor();
 await page.screenshot({path:resolve(out,'original-matrix-multiplication-drafts.png'),fullPage:true});
 await page.screenshot({path:resolve(out,'original-bank-after-complete-reset.png'),fullPage:true});
 await page.goto(`${url}/study/course/13175/practice?cycleId=${cycle}`);
 await page.getByRole('heading',{name:'练习题分批开放中',exact:true}).waitFor();
 await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
 if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Middle unlocked with incomplete chapter coverage');
 await page.screenshot({path:resolve(out,'first-reviewed-batch-practice.png'),fullPage:true});
 if(process.env.BANK_CALCULUS){
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=200){
   await page.goto(`${url}/admin?view=bank&courseId=${process.env.BANK_CALCULUS}&cycleId=${cycle}`);
   await page.getByRole('heading',{name:'题库审查与发布',exact:true}).waitFor();
   await page.getByRole('button',{name:'题目草稿与复核',exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-1:9ac9bdb9b993');
   await page.getByText('PROOF · hard · VERIFIED · 单位化加法等式的充要条件',{exact:true}).click();
   await page.locator('article,details').filter({hasText:'PROOF · hard · VERIFIED · 单位化加法等式的充要条件'}).first().getByText('来源：',{exact:false}).first().waitFor();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-1:c79179dc6888');
   await page.getByText('PROOF · hard · VERIFIED · 叉积方程的可解条件和全解',{exact:true}).click();
   await page.screenshot({path:resolve(out,'calculus-second-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=300){
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-1:cf7644724181');
   await page.getByText('PROOF · hard · VERIFIED · 对称式异面直线的非共面证明',{exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-1:8b161ef23347');
   await page.getByText('PROOF · hard · VERIFIED · 垂足通式及唯一最短证明',{exact:true}).click();
   await page.screenshot({path:resolve(out,'calculus-third-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=400){
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-1:957e3db7a4b9');
   await page.getByText('PROOF · hard · VERIFIED · 两相交平面的完整角平分面',{exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-1:12701d52b6cd');
   await page.getByText('PROOF · hard · VERIFIED · 垂线方向线性组合的退化边界',{exact:true}).click();
   await page.screenshot({path:resolve(out,'calculus-fourth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=500){
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-1:d6403c06d41e');
   await page.getByText('PROOF · hard · VERIFIED · 公共垂线上的中点面唯一性',{exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-1:01d4e1132511');
   await page.getByText('PROOF · hard · VERIFIED · 过指定点严格平行两线的存在唯一性',{exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-1:4113d0630fe2');
   await page.getByText('CALCULATION · middle · VERIFIED · 截面资料反求原曲线系数',{exact:true}).click();
   await page.locator('article,details').filter({hasText:'CALCULATION · middle · VERIFIED · 截面资料反求原曲线系数'}).first().getByText('来源：',{exact:false}).first().waitFor();
   await page.screenshot({path:resolve(out,'calculus-fifth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=600){
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-1:4113d0630fe2');
   await page.getByText('PROOF · hard · VERIFIED · 旋转对并集和交集的不同性质',{exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-2:729217080649');
   await page.getByText('PROOF · hard · VERIFIED · 辨认不能成为梯度的向量场',{exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-2:58fe20855b1f');
   await page.getByText('PROOF · hard · VERIFIED · 不成立的可微性前提不能套切面',{exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-2:82bf4c31bae3');
   await page.getByText('CALCULATION · middle · VERIFIED · 有理参数曲线链式定位',{exact:true}).click();
   await page.locator('article,details').filter({hasText:'CALCULATION · middle · VERIFIED · 有理参数曲线链式定位'}).first().getByText('来源：',{exact:false}).first().waitFor();
   await page.screenshot({path:resolve(out,'calculus-sixth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=700){
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-2:b917fed850af');
   await page.getByText('PROOF · hard · VERIFIED · 限制方向在给定平面内的最大值',{exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-2:81807224f566');
   await page.getByText('PROOF · hard · VERIFIED · 不正则参数下振荡轨迹无唯一切线',{exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-2:3ba8a07eff1b');
   await page.getByText('CALCULATION · hard · VERIFIED · 椭球法线经过O的完整点集',{exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-2:c8b2bd9ec055');
   await page.getByText('SHORT · simple · VERIFIED · 偏导存在不代表已证明可微',{exact:true}).click();
   await page.screenshot({path:resolve(out,'calculus-seventh-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=800){
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-2:c8b2bd9ec055');
   await page.getByText('PROOF · hard · VERIFIED · 有理族偏导连续的参数分类',{exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-2:10e49c72cad1');
   await page.getByText('PROOF · hard · VERIFIED · 二阶偏导界控制线性化余项',{exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-2:037b71207acf');
   await page.getByText('PROOF · hard · VERIFIED · 完整临界曲线与无法微分图形',{exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-2:5ded94d029c4');
   await page.getByText('CALCULATION · middle · VERIFIED · 两个比值内层的链式消项',{exact:true}).click();
   await page.locator('article,details').filter({hasText:'CALCULATION · middle · VERIFIED · 两个比值内层的链式消项'}).first().getByText('来源：',{exact:false}).first().waitFor();
   await page.screenshot({path:resolve(out,'calculus-eighth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=900){
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-2:5ded94d029c4');
   await page.getByText('PROOF · hard · VERIFIED · 未知外层二阶数据的隐式全导',{exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-3:9a230df40aac');
   await page.getByText('PROOF · hard · VERIFIED · 非初等积分的精确表达与界',{exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-3:ed779b700b4e');
   await page.getByText('PROOF · hard · VERIFIED · 偏心圆环的内孔分段边界',{exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-3:d6845ce7aa75');
   await page.getByText('PROOF · hard · VERIFIED · 对称截断零不保证普通积分存在',{exact:true}).click();
   await page.screenshot({path:resolve(out,'calculus-ninth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1000){
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-3:6c83da158a66');
   await page.getByText('PROOF · hard · VERIFIED · 截取正方形的参数三角与五边形',{exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-4:712547d11fad');
   await page.getByText('PROOF · hard · VERIFIED · 竖直切线的图形参数端点',{exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-4:93505cd71a37');
   await page.getByText('PROOF · hard · VERIFIED · 单调图形路径积分的不可取端界',{exact:true}).click();
   await page.getByLabel('主考点',{exact:true}).selectOption('00023:exam-chapter-4:1c7c1d8407df');
   await page.getByText('SHORT · simple · VERIFIED · 域内场不光滑不能直接用公式',{exact:true}).click();
   await page.screenshot({path:resolve(out,'calculus-tenth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1100){
   for(const [point,label] of [
    ['00023:exam-chapter-4:1c7c1d8407df','PROOF · hard · VERIFIED · 内界不光滑时分域合法应用'],
    ['00023:exam-chapter-4:afb6686c6775','PROOF · hard · VERIFIED · 一个坐标导零不等于曲面奇异'],
    ['00023:exam-chapter-5:a912451f6f4c','PROOF · hard · VERIFIED · 两奇异系数点的全轴解限制'],
    ['00023:exam-chapter-5:4d9361442a20','CALCULATION · middle · VERIFIED · 二次强迫的三项特解']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-eleventh-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1200){
   for(const [point,label] of [
    ['00023:exam-chapter-5:4d9361442a20','PROOF · hard · VERIFIED · 稳定系数的初值与强迫界'],
    ['00023:exam-chapter-5:b4e9c0954aea','PROOF · hard · VERIFIED · 消去强迫的高阶式含多余解'],
    ['00023:exam-chapter-5:fca665afd8c9','PROOF · hard · VERIFIED · 最高系数退化破坏零Wronskian推断'],
    ['00023:exam-chapter-5:02e4d2d0c0bb','PROOF · hard · VERIFIED · 退化最高系数使同点初值不唯一']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-twelfth-batch-reviewed.png'),fullPage:true});
  }
  await page.goto(`${url}/study/course/00023/practice?cycleId=${cycle}`);
  await page.getByRole('heading',{name:'练习题分批开放中',exact:true}).waitFor();
  await page.getByText(`已有 ${process.env.BANK_CALCULUS_QUALIFIED || '100'} 道合格练习题发布。`,{exact:false}).waitFor();
  await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
  if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete practice batch allowed grading');
  if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Calculus middle unlocked with unfinished chapter points');
  await page.screenshot({path:resolve(out,'calculus-latest-batch-practice.png'),fullPage:true});
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=600){
   const nextOption=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第二章'});
   await page.getByLabel('练习章节',{exact:true}).selectOption(await nextOption.getAttribute('value'));
   await page.getByRole('button',{name:/求梯度.*题量 10\/10/}).click();
   await page.getByRole('heading',{name:'求梯度 · 基础练习',exact:true}).waitFor();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('New calculus chapter middle unlocked without coverage');
   await page.screenshot({path:resolve(out,'calculus-second-chapter-practice.png'),fullPage:true});
   if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=800){
    await page.getByRole('button',{name:/全微分.*题量 10\/10/}).click();
    await page.getByRole('heading',{name:'全微分 · 基础练习',exact:true}).waitFor();
    await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
    await page.getByRole('button',{name:'2',exact:true}).click();
    await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Differential middle unlocked without chapter coverage');
    await page.screenshot({path:resolve(out,'calculus-eighth-batch-practice.png'),fullPage:true});
   }

  }


  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=900){
   const thirdOption=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第三章'});
   await page.getByLabel('练习章节',{exact:true}).selectOption(await thirdOption.getAttribute('value'));
   await page.getByRole('button',{name:/直角坐标.*题量 10\/10/}).click();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Third chapter middle unlocked without chapter coverage');
   await page.screenshot({path:resolve(out,'calculus-third-chapter-practice.png'),fullPage:true});
  }


  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1000){
   const fourthOption=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第四章'});
   await page.getByLabel('练习章节',{exact:true}).selectOption(await fourthOption.getAttribute('value'));
   await page.getByRole('button',{name:/对弧长的曲线积分.*题量 10\/10/}).click();
   await page.getByRole('heading',{name:'对弧长的曲线积分 · 基础练习',exact:true}).waitFor();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Fourth chapter middle unlocked without all point coverage');
   await page.screenshot({path:resolve(out,'calculus-fourth-chapter-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1100){
   const opt=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第五章'});
   await page.getByLabel('练习章节',{exact:true}).selectOption(await opt.getAttribute('value'));
   await page.getByRole('button',{name:/可分离变量.*题量 10\/10/}).click();
   await page.getByRole('heading',{name:'可分离变量微分方程 · 基础练习',exact:true}).waitFor();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Fifth chapter middle unlocked without all point coverage');
   await page.screenshot({path:resolve(out,'calculus-fifth-chapter-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1200){
   await page.getByRole('button',{name:/二阶常系数方程.*题量 10\/10/}).click();
   await page.getByRole('heading',{name:'二阶常系数方程 · 基础练习',exact:true}).waitFor();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete new point allowed grading');
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Fifth chapter middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-twelfth-batch-practice.png'),fullPage:true});
  }

 }
 if(errors.length)throw Error(errors.join('\n'));
 writeFileSync(resolve(out,'complete-reset-browser.json'),JSON.stringify({verifiedAt:new Date().toISOString(),realHttp:true,mockedRoutes:0,oldBankAndSnapshotsRemoved:true,originalDeterminantDraftsVisible:true,originalMultiplicationDraftsVisible:true,latestBankOnly:true,incompletePublicationBlocked:true,qualifiedPracticeAccessible:true,calculusFirstBatchAccessible:!!process.env.BANK_CALCULUS,calculusQualifiedQuestions:Number(process.env.BANK_CALCULUS_QUALIFIED || 100),incompleteChapterMiddleBlocked:true,calculusSecondChapterAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=600,calculusThirdChapterAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=900,calculusFourthChapterAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1000,calculusFifthChapterAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1100,calculusTwelfthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1200,independentExamsRemainBlocked:true,errors},null,2)+'\n');
} finally {await browser.close();}
