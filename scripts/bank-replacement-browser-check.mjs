/* Real browser after committed complete replacement in an isolated MySQL. No route mocks. */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const {BANK_UI_URL:url,BANK_USERNAME:username,BANK_PASSWORD:password,BANK_CYCLE:cycle,BANK_COURSE:course,BANK_EVIDENCE:out}=process.env;
if(![url,username,password,cycle,course,out].every(Boolean))throw Error('Missing integration configuration');
mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
// The directory and focused answer screen are separate routes.
async function directory(){
 const back=page.getByRole('link',{name:'← 返回考点与进度',exact:true});
 if(await back.count()){
  const target=new URL(await back.getAttribute('href'),url).href;
  await back.click();
  await page.waitForURL(u=>u.pathname===new URL(target).pathname);
  await page.getByLabel('练习章节',{exact:true}).waitFor();
 }
}
async function focus(){
 const enter=page.getByRole('link',{name:'继续此考点练习',exact:true});
 if(await enter.count()){
  const target=new URL(await enter.getAttribute('href'),url).href;
  await enter.click();
  await page.waitForURL(u=>u.pathname===new URL(target).pathname);
 }
 await page.getByRole('heading',{name:/^第 [0-9]+ 题$/}).waitFor();
}
async function pointHeading(title){
 if(!await page.getByRole('link',{name:'← 返回考点与进度',exact:true}).count())
  await page.getByRole('heading',{name:`${title} · simple · 基础练习`,exact:true}).waitFor();
 await focus();
 await page.getByRole('heading',{name:title,exact:true}).waitFor();
}
async function middleEnabled(){
 const focused=await page.getByRole('link',{name:'← 返回考点与进度',exact:true}).count();
 await directory();
 const enabled=await page.getByRole('button',{name:/middle ·/}).isEnabled();
 if(focused)await focus();
 return enabled;
}
try {
 await page.goto(`${url}/login`);await page.getByLabel('用户名或邮箱').fill(username);await page.getByLabel('密码',{exact:true}).fill(password);await page.getByRole('button',{name:'登录',exact:true}).click();await page.waitForURL(u=>u.pathname!=='/login');
 await page.goto(`${url}/admin?view=bank&courseId=${course}&cycleId=${cycle}`);
 await page.getByRole('heading',{name:'题库审查与发布',exact:true}).waitFor();
 await page.getByRole('status').filter({hasText:'新增题发布不改写已有作答快照'}).waitFor();
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
 await focus();
 await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
 if(await middleEnabled())throw Error('Middle unlocked with incomplete chapter coverage');
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
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1300){
   for(const [point,label] of [
    ['00023:exam-chapter-6:e0b12d0959e9','PROOF · hard · VERIFIED · 分段线性拐点的系数公式'],
    ['00023:exam-chapter-6:2e3799dd78ee','PROOF · hard · VERIFIED · 双交错参数的端点抵消分类'],
    ['00023:exam-chapter-6:e73091ca2765','PROOF · hard · VERIFIED · 两参数几何卷积和的合流'],
    ['00023:exam-chapter-6:ab182b5d65e7','SHORT · simple · VERIFIED · 形式系数与实际收敛区别']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-thirteenth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1400){
   for(const [point,label] of [
    ['00023:exam-chapter-6:ab182b5d65e7','PROOF · hard · VERIFIED · 缩放方程的参数退化'],
    ['00023:exam-chapter-6:e1968ed22c3f','PROOF · hard · VERIFIED · 一般二项式展开与终止参数'],
    ['00023:exam-chapter-6:37901d156020','PROOF · hard · VERIFIED · 部分和有界而振荡发散'],
    ['00023:exam-chapter-6:414c0cc74a00','CALCULATION · middle · VERIFIED · 根式差的实际有效指数']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-fourteenth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1500){
   for(const [point,label] of [
    ['00023:exam-chapter-6:414c0cc74a00','PROOF · hard · VERIFIED · 幂与对数联合临界'],
    ['00023:exam-chapter-6:9f3326b150db','PROOF · hard · VERIFIED · 比较时消去近似抵消'],
    ['00023:exam-chapter-6:77b8fba75aa9','PROOF · hard · VERIFIED · 自幂与阶乘的临界参数'],
    ['00023:exam-chapter-6:44f32fb65291','PROOF · hard · VERIFIED · 根值临界的指数级反例族']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-fifteenth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1600){
   for(const [point,label] of [
    ['00023:exam-chapter-6:eb4c8b40f06a','PROOF · hard · VERIFIED · 普遍余项常数不可缩小'],
    ['00023:exam-chapter-6:bacf557ca8e2','PROOF · hard · VERIFIED · 趋一乘子仍可能破坏条件收'],
    ['00023:exam-chapter-6:9c81fb42cce9','PROOF · hard · VERIFIED · 仿射递推的全部收敛情形'],
    ['00023:exam-chapter-6:e6cedc3ac816','CALCULATION · simple · VERIFIED · 从差分部分和恢复末端']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-sixteenth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1700){
   for(const [point,label] of [
    ['00023:exam-chapter-5:98488d64db0a','PROOF · hard · VERIFIED · 任意有限采样都不能替代恒等'],
    ['00023:exam-chapter-5:c8d1625c8429','PROOF · hard · VERIFIED · 第一积分避免漏平衡解'],
    ['00023:exam-chapter-6:e6cedc3ac816','PROOF · hard · VERIFIED · 两步相消需两子列和的极限'],
    ['00023:exam-chapter-6:60f1380e306b','CALCULATION · middle · VERIFIED · 未知点不可由夹界猜测']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-seventeenth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1800){
   for(const [point,label] of [
    ['00023:exam-chapter-6:60f1380e306b','PROOF · hard · VERIFIED · 非线性代入的开域与未知边界'],
    ['00023:exam-chapter-2:1146b1bc5b1e','PROOF · hard · VERIFIED · 指数窄带避开所有固定直线'],
    ['00023:exam-chapter-2:fc9c03f119d5','PROOF · hard · VERIFIED · 参数退化时的局部与全局区别'],
    ['00023:exam-chapter-2:abfeaa5dce6f','PROOF · hard · VERIFIED · 约束平方梯度零导致乘子失效']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-eighteenth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1900){
   for(const [point,label] of [
    ['00023:exam-chapter-3:1695cf79248c','PROOF · hard · VERIFIED · 三坐标置换的有序域积分'],
    ['00023:exam-chapter-3:ab2ac1117b9d','PROOF · hard · VERIFIED · 中心对称下奇偶部分分解'],
    ['00023:exam-chapter-3:23416661b8f0','CALCULATION · middle · VERIFIED · 球壳径向变密度的质量'],
    ['00023:exam-chapter-2:088b2ff81e78','CALCULATION · simple · VERIFIED · 可分离项不改变混合交叉系数']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-nineteenth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2000){
   for(const [point,label] of [
    ['00023:exam-chapter-2:088b2ff81e78','PROOF · hard · VERIFIED · 零混合导的可分离充要关系'],
    ['00023:exam-chapter-2:f44a7206e318','PROOF · hard · VERIFIED · 积分因子使非恰当场恢复势'],
    ['00023:exam-chapter-3:4290ebc7b07a','CALCULATION · middle · VERIFIED · 方形去内接圆的剩余质量'],
    ['00023:exam-chapter-2:d3c6f60ee1a6','CALCULATION · middle · VERIFIED · 可微但某一阶偏导不连续']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-twentieth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2100){
   for(const [point,label] of [
    ['00023:exam-chapter-2:d3c6f60ee1a6','PROOF · hard · VERIFIED · 单点二阶偏导不保证二次余项'],
    ['00023:exam-chapter-2:a5a26518fa7a','PROOF · hard · VERIFIED · 半平面数据的C一阶延拓不唯一'],
    ['00023:exam-chapter-2:533728eb116a','PROOF · hard · VERIFIED · 两种振荡组合的全部系数条件'],
    ['00023:exam-chapter-3:301520494a51','PROOF · hard · VERIFIED · 根式定积分的退化参数']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-twenty-first-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2200){
   for(const [point,label] of [
    ['00023:exam-chapter-2:49edcc121cbe','PROOF · hard · VERIFIED · 去点有界导数的跨点Lipschitz界'],
    ['00023:foundation-24-40:66916925987f','PROOF · hard · VERIFIED · 共同零阶的商延拓差商'],
    ['00023:foundation-24-40:66593fd3c84a','PROOF · hard · VERIFIED · 非可导外层的Lipschitz充分条件'],
    ['00023:foundation-24-40:8aff384b894a','SHORT · simple · VERIFIED · 连续根式导函数仍无有限二阶']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-twenty-second-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2300){
   for(const [point,label] of [
    ['00023:foundation-24-40:8aff384b894a','PROOF · hard · VERIFIED · 对数变元的全阶算子递推'],
    ['00023:foundation-24-40:9ef8e7c61b79','PROOF · hard · VERIFIED · 测量噪声与微分截断的最优步长'],
    ['00023:foundation-24-40:d2a6fabcd814','PROOF · hard · VERIFIED · 含参数核的端点和内部求导'],
    ['00023:foundation-24-40:70431fd7f5eb','CALCULATION · middle · VERIFIED · 嵌套对数的可变幂极限']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-twenty-third-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2400){
   for(const [point,label] of [
    ['00023:foundation-24-40:70431fd7f5eb','PROOF · hard · VERIFIED · 隐式反解的第二渐近修正'],
    ['00023:foundation-24-40:1586924379f4','PROOF · hard · VERIFIED · 三次多项式全域增性的判别'],
    ['00023:foundation-24-40:0e5eaccaedb5','PROOF · hard · VERIFIED · 弦线误差的极值和双曲率界'],
    ['00023:foundation-24-40:93137851973a','PROOF · hard · VERIFIED · 分部积分对跳跃的修正项']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-twenty-fourth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2500){
   for(const [point,label] of [
    ['00023:foundation-24-40:dc0395afaedf','PROOF · hard · VERIFIED · 对数变量配多项式有理核的算法'],
    ['00023:foundation-24-40:9a2ebdbf256d','PROOF · hard · VERIFIED · 倒数对称换元的四次有理值'],
    ['00023:foundation-24-40:3844bb614432','PROOF · hard · VERIFIED · 有符号核不能照搬极限比较'],
    ['00023:foundation-24-40:33eafcd46b5c','CALCULATION · simple · VERIFIED · Riemann和必须带区间长度']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-twenty-fifth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2600){
   for(const [point,label] of [
    ['00023:foundation-24-40:33eafcd46b5c','PROOF · hard · VERIFIED · 积分夹界不能推出逐点夹界'],
    ['00023:foundation-24-40:a7144759ebad','PROOF · hard · VERIFIED · Thomae核的有限分母分层'],
    ['00023:foundation-24-40:621ed9da4617','CALCULATION · middle · VERIFIED · 隐式交点可精确表示面积'],
    ['00023:foundation-24-40:b512ad466ec9','PROOF · hard · VERIFIED · 有限域反复分部的多项式正交']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-twenty-sixth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2700){
   for(const [point,label] of [
    ['00023:foundation-24-40:621ed9da4617','PROOF · hard · VERIFIED · 固定平方量下真实面积的尖锐界'],
    ['00023:foundation-24-40:6ab5911dc656','PROOF · hard · VERIFIED · 三阶秩一改动的行列式'],
    ['00023:exam-chapter-1:e0b00c17ce1a','PROOF · hard · VERIFIED · 非正交面内基的Gram可解性'],
    ['00023:exam-chapter-1:8b204eb11b61','PROOF · hard · VERIFIED · 三个半空间不能围出有界实体']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-twenty-seventh-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2800){
   for(const [point,label] of [
    ['00023:foundation-24-40:78ee537ded26','PROOF · hard · VERIFIED · 参数图在原点的斜率存在性全指数分类'],
    ['00023:foundation-24-40:0368fff65f18','PROOF · hard · VERIFIED · 整点初值与单调核的全局刚性'],
    ['00023:exam-chapter-1:f0855a16c311','PROOF · hard · VERIFIED · 平面到平面投影何时降为直线'],
    ['00023:foundation-24-40:4e74e964e337','PROOF · simple · VERIFIED · 对称片形心在轴的判断']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-twenty-eighth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2900){
   for(const [point,label] of [
    ['00023:foundation-24-40:6890dc554aba','PROOF · hard · VERIFIED · 缩小窗口的仿射拟合误差全判准'],
    ['00023:foundation-24-40:4e74e964e337','PROOF · hard · VERIFIED · 所有截断弧长恢复非负函数'],
    ['00023:exam-chapter-1:499ed8fb7994','PROOF · hard · VERIFIED · 四个测距数值可实现的兼容条件'],
    ['00023:exam-chapter-1:da83a1fcfe41','PROOF · middle · VERIFIED · 非零连续坐标函数的卦限不变']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-twenty-ninth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2970){
   for(const [point,label] of [
    ['00023:exam-chapter-1:da83a1fcfe41','PROOF · hard · VERIFIED · 球与开放卦限相交时的距离下确界'],
    ['00023:exam-chapter-1:6ffe4680fb40','PROOF · hard · VERIFIED · 两平面与球的交点数量按开放域变化'],
    ['00023:exam-chapter-6:b2c758738c23','PROOF · hard · VERIFIED · 条件收敛不足以保证柯西乘积收敛']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'calculus-completion-reviewed.png'),fullPage:true});
  }
  await page.goto(`${url}/study/course/00023/practice?cycleId=${cycle}`);
  await page.getByRole('heading',{name:'练习题分批开放中',exact:true}).waitFor();
  await page.getByText(`已有 ${process.env.BANK_CALCULUS_QUALIFIED || '100'} 道合格练习题发布。`,{exact:false}).waitFor();
 await focus();
  await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
  if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete practice batch allowed grading');
  if(await middleEnabled())throw Error('Calculus middle unlocked with unfinished chapter points');
  await page.screenshot({path:resolve(out,'calculus-latest-batch-practice.png'),fullPage:true});
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=600){
 await directory();
   const nextOption=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第二章'});
 await directory();
   await page.getByLabel('练习章节',{exact:true}).selectOption(await nextOption.getAttribute('value'));
 await directory();
   await page.getByRole('button',{name:/求梯度.*题量 10\/10/}).click();
   await page.getByRole('button',{name:/求梯度.*题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('求梯度');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('New calculus chapter middle unlocked without coverage');
   await page.screenshot({path:resolve(out,'calculus-second-chapter-practice.png'),fullPage:true});
   if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=800){
 await directory();
    await page.getByRole('button',{name:/^全微分\s+题量 10\/10/}).click();
    await page.getByRole('button',{name:/^全微分\s+题量 10\/10/ ,pressed:true}).waitFor();
    await pointHeading('全微分');
    await pointHeading('全微分');
 await focus();
    await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
    await page.getByRole('button',{name:'2',exact:true}).click();
    await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
    if(await middleEnabled())throw Error('Differential middle unlocked without chapter coverage');
    await page.screenshot({path:resolve(out,'calculus-eighth-batch-practice.png'),fullPage:true});
   }

  }


  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=900){
 await directory();
   const thirdOption=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第三章'});
 await directory();
   await page.getByLabel('练习章节',{exact:true}).selectOption(await thirdOption.getAttribute('value'));
 await directory();
   await page.getByRole('button',{name:/直角坐标求二重积分.*题量 10\/10/}).click();
   await page.getByRole('button',{name:/直角坐标求二重积分.*题量 10\/10/ ,pressed:true}).waitFor();
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Third chapter middle unlocked without chapter coverage');
   await page.screenshot({path:resolve(out,'calculus-third-chapter-practice.png'),fullPage:true});
  }


  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1000){
 await directory();
   const fourthOption=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第四章'});
 await directory();
   await page.getByLabel('练习章节',{exact:true}).selectOption(await fourthOption.getAttribute('value'));
 await directory();
   await page.getByRole('button',{name:/对弧长的曲线积分.*题量 10\/10/}).click();
   await page.getByRole('button',{name:/对弧长的曲线积分.*题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('对弧长的曲线积分');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Fourth chapter middle unlocked without all point coverage');
   await page.screenshot({path:resolve(out,'calculus-fourth-chapter-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1100){
 await directory();
   const opt=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第五章'});
 await directory();
   await page.getByLabel('练习章节',{exact:true}).selectOption(await opt.getAttribute('value'));
 await directory();
   await page.getByRole('button',{name:/可分离变量.*题量 10\/10/}).click();
   await page.getByRole('button',{name:/可分离变量.*题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('可分离变量微分方程');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Fifth chapter middle unlocked without all point coverage');
   await page.screenshot({path:resolve(out,'calculus-fifth-chapter-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1200){
 await directory();
   await page.getByRole('button',{name:/二阶常系数方程.*题量 10\/10/}).click();
   await page.getByRole('button',{name:/二阶常系数方程.*题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('二阶常系数方程');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete new point allowed grading');
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Fifth chapter middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-twelfth-batch-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1300){
 await directory();
   const opt=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第六章'});
 await directory();
   await page.getByLabel('练习章节',{exact:true}).selectOption(await opt.getAttribute('value'));
 await directory();
   await page.getByRole('button',{name:/傅里叶系数.*题量 10\/10/}).click();
   await page.getByRole('button',{name:/傅里叶系数.*题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('傅里叶系数');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete Fourier point allowed grading');
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Sixth chapter middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-sixth-chapter-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1400){
 await directory();
   await page.getByRole('button',{name:/幂级数的展开.*题量 10\/10/}).click();
   await page.getByRole('button',{name:/幂级数的展开.*题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('幂级数的展开');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete expansion point allowed grading');
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Sixth chapter middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-fourteenth-batch-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1500){
 await directory();
   await page.getByRole('button',{name:/根值审敛法.*题量 10\/10/}).click();
   await page.getByRole('button',{name:/根值审敛法.*题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('根值审敛法');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete root point allowed grading');
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Sixth chapter middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-fifteenth-batch-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1600){
 await directory();
   await page.getByRole('button',{name:/莱布尼兹审敛法.*题量 10\/10/}).click();
   await page.getByRole('button',{name:/莱布尼兹审敛法.*题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('莱布尼兹审敛法');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete Leibniz point allowed grading');
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Sixth chapter middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-sixteenth-batch-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1700){
 await directory();
   const opt=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第五章'});
 await directory();
   await page.getByLabel('练习章节',{exact:true}).selectOption(await opt.getAttribute('value'));
 await directory();
   await page.getByRole('button',{name:/可降阶的二阶微分方程.*题量 10\/10/}).click();
   await page.getByRole('button',{name:/可降阶的二阶微分方程.*题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('可降阶的二阶微分方程');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete reduction point allowed grading');
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Fifth chapter middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-seventeenth-batch-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1800){
 await directory();
   const opt=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第二章'});
 await directory();
   await page.getByLabel('练习章节',{exact:true}).selectOption(await opt.getAttribute('value'));
 await directory();
   await page.getByRole('button',{name:/二元求极限.*题量 10\/10/}).click();
   await page.getByRole('button',{name:/二元求极限.*题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('二元求极限');
 await directory();
   if(Number(process.env.BANK_CALCULUS_QUALIFIED)<2200 && await page.getByRole('button',{name:/一元导数基础知识.*题量 0\/10/}).count()!==1)throw Error('Unpublished point displayed a full question quota');
 await directory();
   if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2200 && await page.getByRole('button',{name:/一元导数基础知识.*题量 10\/10/}).count()!==1)throw Error('Published derivative point displayed an incorrect quota');
 await directory();
   if(await page.getByRole('button',{name:/二元求极限.*题量 10\/10/}).count()!==1)throw Error('Published point did not display ten available questions');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete multivariate limit point allowed grading');
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Second chapter middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-eighteenth-batch-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1900){
 await directory();
   const opt=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第三章'});
 await directory();
   await page.getByLabel('练习章节',{exact:true}).selectOption(await opt.getAttribute('value'));
 await directory();
   await page.getByRole('button',{name:/直角坐标求三重积分.*题量 10\/10/}).click();
   await page.getByRole('button',{name:/直角坐标求三重积分.*题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('直角坐标求三重积分');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete triple integral point allowed grading');
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Third chapter middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-nineteenth-batch-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2000){
 await directory();
   const opt=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第二章'});
 await directory();
   await page.getByLabel('练习章节',{exact:true}).selectOption(await opt.getAttribute('value'));
 await directory();
   await page.getByRole('button',{name:/求全微分的原函数.*题量 10\/10/}).click();
   await page.getByRole('button',{name:/求全微分的原函数.*题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('求全微分的原函数');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete potential point allowed grading');
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Second chapter middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-twentieth-batch-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2100){
 await directory();
   const opt=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第二章'});
 await directory();
   await page.getByLabel('练习章节',{exact:true}).selectOption(await opt.getAttribute('value'));
 await directory();
   await page.getByRole('button',{name:/^二元函数的构造\s+题量 10\/10/}).click();
   await page.getByRole('button',{name:/^二元函数的构造\s+题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('二元函数的构造');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete construct point allowed grading');
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Second chapter middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-twenty-first-batch-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2200){
 await directory();
   const opt=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'基础补充'});
 await directory();
   await page.getByLabel('练习章节',{exact:true}).selectOption(await opt.getAttribute('value'));
 await directory();
   if(Number(process.env.BANK_CALCULUS_QUALIFIED)<2900 && await page.getByRole('button',{name:/^导数\s+题量 0\/10/}).count()!==1)throw Error('Unpublished foundation point displayed a full quota');
 await directory();
   await page.getByRole('button',{name:/^复合函数求导\s+题量 10\/10/}).click();
   await page.getByRole('button',{name:/^复合函数求导\s+题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('复合函数求导');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete chain point allowed grading');
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Foundation middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-twenty-second-batch-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2300){
 await directory();
   await page.getByRole('button',{name:/^微积分基本定理\s+题量 10\/10/}).click();
   await page.getByRole('button',{name:/^微积分基本定理\s+题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('微积分基本定理');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete FTC point allowed grading');
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Foundation middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-twenty-third-batch-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2400){
 await directory();
   await page.getByRole('button',{name:/^函数的单调性\s+题量 10\/10/}).click();
   await page.getByRole('button',{name:/^函数的单调性\s+题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('函数的单调性');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete monotonicity point allowed grading');
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Foundation middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-twenty-fourth-batch-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2500){
 await directory();
   await page.getByRole('button',{name:/^不定积分—换元法\s+题量 10\/10/}).click();
   await page.getByRole('button',{name:/^不定积分—换元法\s+题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('不定积分—换元法');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete substitution point allowed grading');
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Foundation middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-twenty-fifth-batch-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2600){
 await directory();
   await page.getByRole('button',{name:/^定积分\s+题量 10\/10/}).click();
   await page.getByRole('button',{name:/^定积分\s+题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('定积分');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete definite integral point allowed grading');
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Foundation middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-twenty-sixth-batch-practice.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2700){
 await directory();
   await page.getByRole('button',{name:/^二、三阶行列式\s+题量 10\/10/}).click();
   await page.getByRole('button',{name:/^二、三阶行列式\s+题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('二、三阶行列式');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete definite integral point allowed grading');
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Foundation middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-twenty-seventh-batch-practice.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2800){
 await directory();
   await page.getByRole('button',{name:/^三类特殊函数求导\s+题量 10\/10/}).click();
   await page.getByRole('button',{name:/^三类特殊函数求导\s+题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('三类特殊函数求导');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete definite integral point allowed grading');
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Foundation middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-twenty-eighth-batch-practice.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2900){
 await directory();
   await page.getByRole('button',{name:/^导数\s+题量 10\/10/}).click();
   await page.getByRole('button',{name:/^导数\s+题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('导数');
 await focus();
   await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
   if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete derivative point allowed grading');
   await page.getByRole('button',{name:'2',exact:true}).click();
   await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
   if(await middleEnabled())throw Error('Foundation middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-twenty-ninth-batch-practice.png'),fullPage:true});
 await directory();
   const first=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第一章'});
 await directory();
   await page.getByLabel('练习章节',{exact:true}).selectOption(await first.getAttribute('value'));
 await directory();
   if(Number(process.env.BANK_CALCULUS_QUALIFIED)<2970 && await page.getByRole('button',{name:/^空间点与卦限\s+题量 0\/10/}).count()!==1)throw Error('Unpublished spatial point displayed a full quota');
 await directory();
   await page.getByRole('button',{name:/^点在直角坐标的位置\s+题量 10\/10/}).click();
   await page.getByRole('button',{name:/^点在直角坐标的位置\s+题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('点在直角坐标的位置');
   if(await middleEnabled())throw Error('First chapter middle unlocked without per-point qualification');
  }

 }

 if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2970){
 await directory();
  await page.getByRole('button',{name:/^空间点与卦限\s+题量 10\/10/}).click();
  await page.getByRole('button',{name:/^空间点与卦限\s+题量 10\/10/ ,pressed:true}).waitFor();
  await pointHeading('空间点与卦限');
 await focus();
  await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
  await page.getByRole('button',{name:'2',exact:true}).click();
  await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
  if(await middleEnabled())throw Error('Complete math quota bypassed learner progress');
  await page.screenshot({path:resolve(out,'calculus-completion-practice.png'),fullPage:true});
 }
 if(process.env.BANK_DISCRETE){
  await page.goto(`${url}/admin?view=bank&courseId=${process.env.BANK_DISCRETE}&cycleId=${cycle}`);
  await page.getByRole('heading',{name:'题库审查与发布',exact:true}).waitFor();
  if(await page.getByRole('button',{name:'发布经过完整复核的版本',exact:true}).isEnabled())throw Error('Incomplete discrete bank allowed full publication');
  await page.getByRole('button',{name:'题目草稿与复核',exact:true}).click();
  await page.getByLabel('主考点',{exact:true}).selectOption('02324:discrete-chapter-1:1d4d102b1b86');
  await page.getByText('PROOF · hard · VERIFIED · 条件网络的冗余箭头判别',{exact:true}).click();
  await page.screenshot({path:resolve(out,'discrete-first-batch-reviewed.png'),fullPage:true});
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=130){
   for(const [point,label] of [
    ['02324:discrete-chapter-1:7e98772b4c54','PROOF · hard · VERIFIED · 已知一端的真值列恢复另一端'],
    ['02324:discrete-chapter-1:0454fdfe4deb','PROOF · hard · VERIFIED · 用双份变量区分唯一满足与无满足'],
    ['02324:discrete-chapter-1:10b8ee7ee603','PROOF · hard · VERIFIED · 相邻禁止条件的递推分析'],
    ['02324:discrete-chapter-1:8461c713da96','SHORT · simple · VERIFIED · 多公式比较须共用全部原子']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
   }
   await page.screenshot({path:resolve(out,'discrete-second-batch-reviewed.png'),fullPage:true});
  }
  await page.goto(`${url}/study/course/02324/practice?cycleId=${cycle}`);
  await page.getByText(`已有 ${process.env.BANK_DISCRETE_QUALIFIED || '30'} 道合格练习题发布。`,{exact:false}).waitFor();
 await directory();
  await page.getByRole('button',{name:/^单条件\s+题量 10\/10/}).click();
  await page.getByRole('button',{name:/^单条件\s+题量 10\/10/ ,pressed:true}).waitFor();
  await pointHeading('单条件');
 await focus();
  await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
  await page.getByRole('button',{name:'2',exact:true}).click();
  await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
  if(await middleEnabled())throw Error('Discrete middle bypassed unfinished per-point progress');
  if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('Incomplete conditional practice allowed grading');
  await page.screenshot({path:resolve(out,'discrete-first-batch-practice.png'),fullPage:true});

  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=130){
   for(const title of ['双条件','可满足式','否定和合取','真值表']){
 await directory();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`) ,pressed:true}).waitFor();
    await pointHeading(title);
 await focus();
    await page.getByText('第 1 / 10 题',{exact:false}).waitFor();
    await page.getByRole('button',{name:'2',exact:true}).click();
    await page.getByText('第 2 / 10 题',{exact:false}).waitFor();
    if(await page.getByRole('button',{name:'完成10题，申请批改',exact:true}).isEnabled())throw Error('New discrete point allowed incomplete grading');
    if(await middleEnabled())throw Error('New discrete point bypassed chapter qualification');
    await page.screenshot({path:resolve(out,`discrete-second-focus-${title}.png`),fullPage:true});
   }
 await directory();
   if(await page.getByRole('button',{name:/^析取\s+题量 0\/10/}).count()!==1)throw Error('Unpublished discrete point received a false quota');
   await page.screenshot({path:resolve(out,'discrete-second-batch-practice.png'),fullPage:true});
  }

 }

 if(errors.length)throw Error(errors.join('\n'));
 writeFileSync(resolve(out,'complete-reset-browser.json'),JSON.stringify({verifiedAt:new Date().toISOString(),realHttp:true,mockedRoutes:0,legacyResetInvoked:process.env.BANK_RESET_FIXTURE==='1',oldBankAndSnapshotsRemoved:process.env.BANK_RESET_FIXTURE==='1',originalDeterminantDraftsVisible:true,originalMultiplicationDraftsVisible:true,latestBankOnly:true,incompletePublicationBlocked:true,qualifiedPracticeAccessible:true,calculusFirstBatchAccessible:!!process.env.BANK_CALCULUS,calculusCompletePracticeQuota:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2970,discreteFirstBatchAccessible:!!process.env.BANK_DISCRETE,discreteSecondBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=130,discreteQualifiedQuestions:Number(process.env.BANK_DISCRETE_QUALIFIED || 0),calculusQualifiedQuestions:Number(process.env.BANK_CALCULUS_QUALIFIED || 100),incompleteChapterMiddleBlocked:true,calculusSecondChapterAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=600,calculusThirdChapterAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=900,calculusFourthChapterAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1000,calculusFifthChapterAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1100,calculusTwelfthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1200,calculusSixthChapterAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1300,calculusThirteenthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1300,calculusFourteenthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1400,calculusFifteenthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1500,calculusSixteenthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1600,calculusSeventeenthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1700,calculusEighteenthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1800,calculusNineteenthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1900,calculusTwentyNinthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2900,calculusTwentyEighthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2800,calculusTwentySeventhBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2700,calculusTwentySixthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2600,calculusTwentyFifthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2500,calculusTwentyFourthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2400,calculusTwentyThirdBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2300,calculusTwentySecondBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2200,calculusTwentyFirstBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2100,calculusTwentiethBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2000,unpublishedPointZeroCountVerified:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1800,independentExamsRemainBlocked:true,errors},null,2)+'\n');
} catch(e){
 await page.screenshot({path:resolve(out,'publication-browser-failure.png'),fullPage:true});
 writeFileSync(resolve(out,'publication-browser-failure.html'),await page.content());
 throw e;
} finally {await browser.close();}
