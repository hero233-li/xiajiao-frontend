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
 await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
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
 await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
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
  await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
  if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete practice batch allowed grading');
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
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
   if(await middleEnabled())throw Error('New calculus chapter middle unlocked without coverage');
   await page.screenshot({path:resolve(out,'calculus-second-chapter-practice.png'),fullPage:true});
   if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=800){
 await directory();
    await page.getByRole('button',{name:/^全微分\s+题量 10\/10/}).click();
    await page.getByRole('button',{name:/^全微分\s+题量 10\/10/ ,pressed:true}).waitFor();
    await pointHeading('全微分');
    await pointHeading('全微分');
 await focus();
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
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
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
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
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
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
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
   if(await middleEnabled())throw Error('Fifth chapter middle unlocked without all point coverage');
   await page.screenshot({path:resolve(out,'calculus-fifth-chapter-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1200){
 await directory();
   await page.getByRole('button',{name:/二阶常系数方程.*题量 10\/10/}).click();
   await page.getByRole('button',{name:/二阶常系数方程.*题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('二阶常系数方程');
 await focus();
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete new point allowed grading');
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
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
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete Fourier point allowed grading');
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
   if(await middleEnabled())throw Error('Sixth chapter middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-sixth-chapter-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1400){
 await directory();
   await page.getByRole('button',{name:/幂级数的展开.*题量 10\/10/}).click();
   await page.getByRole('button',{name:/幂级数的展开.*题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('幂级数的展开');
 await focus();
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete expansion point allowed grading');
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
   if(await middleEnabled())throw Error('Sixth chapter middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-fourteenth-batch-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1500){
 await directory();
   await page.getByRole('button',{name:/根值审敛法.*题量 10\/10/}).click();
   await page.getByRole('button',{name:/根值审敛法.*题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('根值审敛法');
 await focus();
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete root point allowed grading');
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
   if(await middleEnabled())throw Error('Sixth chapter middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-fifteenth-batch-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=1600){
 await directory();
   await page.getByRole('button',{name:/莱布尼兹审敛法.*题量 10\/10/}).click();
   await page.getByRole('button',{name:/莱布尼兹审敛法.*题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('莱布尼兹审敛法');
 await focus();
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete Leibniz point allowed grading');
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
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
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete reduction point allowed grading');
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
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
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete multivariate limit point allowed grading');
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
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
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete triple integral point allowed grading');
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
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
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete potential point allowed grading');
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
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
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete construct point allowed grading');
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
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
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete chain point allowed grading');
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
   if(await middleEnabled())throw Error('Foundation middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-twenty-second-batch-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2300){
 await directory();
   await page.getByRole('button',{name:/^微积分基本定理\s+题量 10\/10/}).click();
   await page.getByRole('button',{name:/^微积分基本定理\s+题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('微积分基本定理');
 await focus();
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete FTC point allowed grading');
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
   if(await middleEnabled())throw Error('Foundation middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-twenty-third-batch-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2400){
 await directory();
   await page.getByRole('button',{name:/^函数的单调性\s+题量 10\/10/}).click();
   await page.getByRole('button',{name:/^函数的单调性\s+题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('函数的单调性');
 await focus();
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete monotonicity point allowed grading');
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
   if(await middleEnabled())throw Error('Foundation middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-twenty-fourth-batch-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2500){
 await directory();
   await page.getByRole('button',{name:/^不定积分—换元法\s+题量 10\/10/}).click();
   await page.getByRole('button',{name:/^不定积分—换元法\s+题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('不定积分—换元法');
 await focus();
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete substitution point allowed grading');
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
   if(await middleEnabled())throw Error('Foundation middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-twenty-fifth-batch-practice.png'),fullPage:true});
  }

  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2600){
 await directory();
   await page.getByRole('button',{name:/^定积分\s+题量 10\/10/}).click();
   await page.getByRole('button',{name:/^定积分\s+题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('定积分');
 await focus();
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete definite integral point allowed grading');
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
   if(await middleEnabled())throw Error('Foundation middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-twenty-sixth-batch-practice.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2700){
 await directory();
   await page.getByRole('button',{name:/^二、三阶行列式\s+题量 10\/10/}).click();
   await page.getByRole('button',{name:/^二、三阶行列式\s+题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('二、三阶行列式');
 await focus();
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete definite integral point allowed grading');
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
   if(await middleEnabled())throw Error('Foundation middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-twenty-seventh-batch-practice.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2800){
 await directory();
   await page.getByRole('button',{name:/^三类特殊函数求导\s+题量 10\/10/}).click();
   await page.getByRole('button',{name:/^三类特殊函数求导\s+题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('三类特殊函数求导');
 await focus();
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete definite integral point allowed grading');
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
   if(await middleEnabled())throw Error('Foundation middle unlocked with unfinished points');
   await page.screenshot({path:resolve(out,'calculus-twenty-eighth-batch-practice.png'),fullPage:true});
  }
  if(Number(process.env.BANK_CALCULUS_QUALIFIED)>=2900){
 await directory();
   await page.getByRole('button',{name:/^导数\s+题量 10\/10/}).click();
   await page.getByRole('button',{name:/^导数\s+题量 10\/10/ ,pressed:true}).waitFor();
   await pointHeading('导数');
 await focus();
   await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete derivative point allowed grading');
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
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
  await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
  await page.getByText('展开全部10题预览',{exact:true}).click();
  await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
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
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=230){
   for(const [point,label] of [
    ['02324:discrete-chapter-1:8461c713da96','PROOF · hard · VERIFIED · 省略行无法普遍认证等值'],
    ['02324:discrete-chapter-1:2682d9b56225','PROOF · hard · VERIFIED · 有优先级例外的唯一决策'],
    ['02324:discrete-chapter-1:06c5c02dec48','PROOF · hard · VERIFIED · 两个极小项能合并成公共文字项的判准'],
    ['02324:discrete-chapter-1:7d839e8e934a','CALCULATION · middle · VERIFIED · 两个偶然式的条件式能有哪些类别']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
    await page.locator('article,details').filter({hasText:label}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-third-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=330){
   for(const [point,label] of [
    ['02324:discrete-chapter-1:7d839e8e934a','PROOF · hard · VERIFIED · 相同真行数不能确定条件式类别'],
    ['02324:discrete-chapter-1:670d056368ba','PROOF · hard · VERIFIED · 否定正常形不增加原子出现数'],
    ['02324:discrete-chapter-1:2792c7064fbe','PROOF · hard · VERIFIED · 删除任一前提仍有效不代表可同时删除'],
    ['02324:discrete-chapter-1:abd8beec2c6d','PROOF · hard · VERIFIED · 环上恰k个条件失败的全部模型数量']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
    await page.locator('article,details').filter({hasText:label}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-fourth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=430){
   for(const [point,label] of [
    ['02324:discrete-chapter-1:9ed09ee26396','PROOF · hard · VERIFIED · 独立翻值不变性强制两极端'],
    ['02324:discrete-chapter-1:d4921bf6fc91','PROOF · hard · VERIFIED · 异或差分形式重建条件分支'],
    ['02324:discrete-chapter-2:3060a2ecb680','PROOF · hard · VERIFIED · 不能把未撤销的旁支假设隐藏'],
    ['02324:discrete-chapter-2:04b17f086607','SHORT · simple · VERIFIED · 永真式的主合取空边界']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(point);
    await page.getByText(label,{exact:true}).click();
    await page.locator('article,details').filter({hasText:label}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-fifth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=530){
   for(const [key,label] of [
    ['02324:discrete-chapter-2:04b17f086607','PROOF · hard · VERIFIED · 至少两真函数的规范与最短CNF'],
    ['02324:discrete-chapter-2:d96fde6a7d9c','PROOF · hard · VERIFIED · 从不同原子域取共同规范形式'],
    ['02324:discrete-chapter-2:a8bf6cf821ac','PROOF · hard · VERIFIED · 固定项数且每原子均不可忽略的函数计数'],
    ['02324:discrete-chapter-2:845f12cf8b61','CALCULATION · middle · VERIFIED · 极小极大项蕴涵的索引矩阵']
   ]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(label,{exact:false}).first().click();
    await page.locator('article,details').filter({hasText:label}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-sixth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=630){
   for(const [key,label] of [
    ['02324:discrete-chapter-2:845f12cf8b61','PROOF · hard · VERIFIED · 完整极大项归结与邻接的充要'],
    ['02324:discrete-chapter-2:bd0b53668993','PROOF · hard · VERIFIED · 可证析取却不能证任一支的完整计数'],
    ['02324:discrete-chapter-2:652c4a36cf13','PROOF · hard · VERIFIED · 最弱附加条件与完整推理反模型'],
    ['02324:discrete-chapter-3:7c2407bea03c','CALCULATION · middle · VERIFIED · 交叉自由变量的安全标准化']
   ]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(label,{exact:false}).first().click();
    await page.locator('article,details').filter({hasText:label}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-seventh-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=730){
   for(const [key,label] of [
    ['02324:discrete-chapter-3:59fdf2b3c5b0','PROOF · hard · VERIFIED · 赋值一致引理的一般证明'],
    ['02324:discrete-chapter-3:12e17886334b','CALCULATION · middle · VERIFIED · 关系矩阵四种前缀的完整求值'],
    ['02324:discrete-chapter-3:09504e8e1981','CALCULATION · middle · VERIFIED · 存在恰一的否定条件分类'],
    ['02324:discrete-chapter-3:478218f2cb46','SHORT · simple · VERIFIED · 全称双条件分成双向包含']
   ]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(label,{exact:false}).first().click();
    await page.locator('article,details').filter({hasText:label}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-eighth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=830){
   for(const [key,label] of [
    ['02324:discrete-chapter-3:478218f2cb46','PROOF · hard · VERIFIED · 任意交替前缀的固定真分支'],
    ['02324:discrete-chapter-3:683b19344e27','PROOF · hard · VERIFIED · 一致前提仍可无全称结论'],
    ['02324:discrete-chapter-3:c979b675dd4e','CALCULATION · middle · VERIFIED · 每对不同成员共享一个第三对象'],
    ['02324:discrete-chapter-3:1d10f33e9fc5','CALCULATION · middle · VERIFIED · 三层交替前缀的反见证']
   ]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(label,{exact:false}).first().click();
    await page.locator('article,details').filter({hasText:label}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-ninth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=930){
   for(const [key,label] of [
    ['02324:discrete-chapter-3:1d10f33e9fc5','PROOF · hard · VERIFIED · 否定前缀的反见证树最小叶数'],
    ['02324:discrete-chapter-3:f14130f16709','CALCULATION · middle · VERIFIED · 同一展开式中的对称与无自环联合'],
    ['02324:discrete-chapter-3:aad9dd3a77ca','CALCULATION · middle · VERIFIED · 多前件箭头的范围与旁支辨别'],
    ['02324:discrete-chapter-4:d2ff6e2e965c','CALCULATION · middle · VERIFIED · 平方阈值集合的空集边界']
   ]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(label,{exact:false}).first().click();
    await page.locator('article,details').filter({hasText:label}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-tenth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1030){
   for(const [key,label] of [
    ['02324:discrete-chapter-4:df7dffadb976','PROOF · hard · VERIFIED · 无三重共属下两交见证的全局下界'],
    ['02324:discrete-chapter-4:1d98054d5066','CALCULATION · middle · VERIFIED · 并集与对称差的正确范围公式'],
    ['02324:discrete-chapter-4:2a3d37d8eba1','CALCULATION · middle · VERIFIED · 两层幂集成员分类'],
    ['02324:discrete-chapter-4:15d12dd43a91','SHORT · simple · VERIFIED · 非空积给出因子非空']
   ]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(label,{exact:false}).first().click();
    await page.locator('article,details').filter({hasText:label}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-eleventh-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1130){
   for(const [key,label] of [
    ['02324:discrete-chapter-4:15d12dd43a91','PROOF · hard · VERIFIED · 非空关系为矩形的交叉闭合判据'],
    ['02324:discrete-chapter-4:9116bdd5b5ff','CALCULATION · middle · VERIFIED · 未知纤维的整数参数恢复'],
    ['02324:discrete-chapter-4:3ad37413d226','CALCULATION · middle · VERIFIED · 三个并式的多数成员化简'],
    ['02324:discrete-chapter-4:ce0fd569d05e','SHORT · simple · VERIFIED · 描述条件含未定义运算的修正']
   ]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(label,{exact:false}).first().click();
    await page.locator('article,details').filter({hasText:label}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-twelfth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1230){
   for(const [key,label] of [
    ['02324:discrete-chapter-4:ce0fd569d05e','PROOF · hard · VERIFIED · 正负成员资料何时确定唯一集合'],
    ['02324:discrete-chapter-4:7312790cd48d','CALCULATION · middle · VERIFIED · 集合族外层差不能逐元删点'],
    ['02324:discrete-chapter-5:71248f1ccb42','CALCULATION · middle · VERIFIED · 不完整关联资料的全部补全'],
    ['02324:discrete-chapter-5:99b6d93edfbe','CALCULATION · middle · VERIFIED · 逐对文字和矩阵的差错定位']
   ]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(label,{exact:false}).first().click();
    await page.locator('article,details').filter({hasText:label}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-thirteenth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1330){
   for(const [key,title] of [['02324:discrete-chapter-5:16dc8db23fc5','PROOF · hard · VERIFIED · 有约束反向记录的最小纠错'],['02324:discrete-chapter-5:88cf5e75855f','PROOF · hard · VERIFIED · 等于恒等的两复合迫双射'],['02324:discrete-chapter-5:37af60cbe925','PROOF · hard · VERIFIED · 不完整对角资料可否补成两目标'],['02324:discrete-chapter-5:8ed7b0045268','SHORT · simple · VERIFIED · 给定单向边的反对称补全']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(title,{exact:true}).click();
    await page.locator('article,details').filter({hasText:title}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-fourteenth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1430){
   for(const [key,title] of [['02324:discrete-chapter-5:8ed7b0045268','PROOF · hard · VERIFIED · 按包含极大的反对称扩张'],['02324:discrete-chapter-5:95224dd01d15','PROOF · hard · VERIFIED · 所有二点限制仍可能漏传递'],['02324:discrete-chapter-5:5396003d70ff','PROOF · hard · VERIFIED · 两个自反对称传递关系的对称差'],['02324:discrete-chapter-5:2d889ac9d22e','CALCULATION · middle · VERIFIED · 从对称闭包反求所有原关系']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(title,{exact:true}).click();
    await page.locator('article,details').filter({hasText:title}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-fifteenth-batch-reviewed.png'),fullPage:true});
  }


  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1530){
   for(const [key,title] of [['02324:discrete-chapter-5:2d889ac9d22e','PROOF · hard · VERIFIED · 正负边约束下的对称扩张'],['02324:discrete-chapter-5:d29cdfadabd0','PROOF · hard · VERIFIED · 单边更新闭包的精确公式'],['02324:discrete-chapter-5:d29a332f701b','PROOF · hard · VERIFIED · 核关系决定函数能区分的对象'],['02324:discrete-chapter-5:bbb87d19981c','CALCULATION · middle · VERIFIED · 两个同余类相交形成细类']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(title,{exact:true}).click();
    await page.locator('article,details').filter({hasText:title}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-sixteenth-batch-reviewed.png'),fullPage:true});
  }

  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1630){
   for(const [key,title] of [['02324:discrete-chapter-5:c77072e08f92','PROOF · hard · VERIFIED · 交换两标签后不变的关系计数'],['02324:discrete-chapter-5:c857d8666cf8','CALCULATION · middle · VERIFIED · 失效覆盖族的最少删块'],['02324:discrete-chapter-5:ff30fe1d1497','PROOF · hard · VERIFIED · 复合偏序的交换充分条件'],['02324:discrete-chapter-5:1c52e00eff77','SHORT · simple · VERIFIED · 一元公式的陪域检查']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(title,{exact:true}).click();
    await page.locator('article,details').filter({hasText:title}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-seventeenth-batch-reviewed.png'),fullPage:true});
  }

  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1730){
   for(const [key,title] of [['02324:discrete-chapter-5:1c52e00eff77','PROOF · hard · VERIFIED · 补函数图成为函数的陪域条件'],['02324:discrete-chapter-5:0c53d02831da','PROOF · hard · VERIFIED · 左逆刻画单射及空域例外'],['02324:discrete-chapter-5:0b2f6e76c3f0','PROOF · hard · VERIFIED · 双半轴比例的满射参数'],['02324:discrete-chapter-5:14bb6cacfef0','CALCULATION · middle · VERIFIED · 二进制差分编码的唯一恢复']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(title,{exact:true}).click();
    await page.locator('article,details').filter({hasText:title}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-eighteenth-batch-reviewed.png'),fullPage:true});
  }

  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1830){
   for(const [key,title] of [['02324:discrete-chapter-5:14bb6cacfef0','PROOF · hard · VERIFIED · 有限置换图的一入一出与循环'],['02324:discrete-chapter-5:a4f666870d80','CALCULATION · middle · VERIFIED · 取整错位编码的逆及缺口'],['02324:discrete-chapter-5:a61c6524abc8','PROOF · hard · VERIFIED · 不同长链不妨碍偏序'],['02324:discrete-chapter-5:5aa406c97982','PROOF · hard · VERIFIED · 后函数分解存在的纤维判据']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(title,{exact:true}).click();
    await page.locator('article,details').filter({hasText:title}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-nineteenth-batch-reviewed.png'),fullPage:true});
  }

  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1930){
   for(const [key,title] of [['02324:discrete-chapter-5:d68ca832363f','PROOF · hard · VERIFIED · 有限唯一极大与最大'],['02324:discrete-chapter-5:4688241b3afd','PROOF · hard · VERIFIED · 无限唯一极大未必最大'],['02324:discrete-chapter-6:6f6928fcd7b5','PROOF · hard · VERIFIED · 两个参数都有效的运算计数'],['02324:discrete-chapter-6:a3eb559b3801','SHORT · simple · VERIFIED · 实数平均运算非结合']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(title,{exact:true}).click();
    await page.locator('article,details').filter({hasText:title}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-twentieth-batch-reviewed.png'),fullPage:true});
  }

  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2030){
   for(const [key,title] of [['02324:discrete-chapter-6:a3eb559b3801','PROOF · hard · VERIFIED · 只查重复首输入不能证明结合'],['02324:discrete-chapter-6:40244550b97c','PROOF · hard · VERIFIED · 幺元唯一性与有限表数量'],['02324:discrete-chapter-6:416a61363d7e','PROOF · hard · VERIFIED · 单侧零元的数量约束'],['02324:discrete-chapter-6:8e5843c93c41','CALCULATION · middle · VERIFIED · 两可逆元素积的逆序']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(title,{exact:true}).click();
    await page.locator('article,details').filter({hasText:title}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-twenty-first-batch-reviewed.png'),fullPage:true});
  }

  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2130){
   for(const [key,title] of [['02324:discrete-chapter-6:8e5843c93c41','PROOF · hard · VERIFIED · 结合前提下逆元唯一及失败边界'],['02324:discrete-chapter-6:913a14fb1d0a','PROOF · hard · VERIFIED · 幂等自同态诱导新半群'],['02324:discrete-chapter-6:ec1825dc8a38','PROOF · hard · VERIFIED · 保单位同态不反映或提升可逆'],['02324:discrete-chapter-6:0df737cb62bb','PROOF · hard · VERIFIED · 只有左单位和左逆足以成群']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(title,{exact:true}).click();
    await page.locator('article,details').filter({hasText:title}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-twenty-second-batch-reviewed.png'),fullPage:true});
  }

  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2230){
   for(const [key,title] of [['02324:discrete-chapter-6:3d2413fc01b0','PROOF · hard · VERIFIED · 三次幂恒单位不迫交换'],['02324:discrete-chapter-6:6bf40894351f','PROOF · hard · VERIFIED · 任意整数幂阶公式'],['02324:discrete-chapter-6:9a7c5b3efd75','SHORT · simple · VERIFIED · 只查相同输入的判据缺口'],['02324:discrete-chapter-6:3d11df9b5df4','SHORT · simple · VERIFIED · 模乘单位群计数']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(title,{exact:true}).click();
    await page.locator('article,details').filter({hasText:title}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-twenty-third-batch-reviewed.png'),fullPage:true});
  }

  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2330){
   for(const [key,title] of [['02324:discrete-chapter-6:3d11df9b5df4','PROOF · hard · VERIFIED · 奇数阶群的平方映射'],['02324:discrete-chapter-6:2e39ba74fb7e','PROOF · hard · VERIFIED · 域上与环上一次方程根的差异'],['02324:discrete-chapter-7:06f2f8e0a8f4','PROOF · hard · VERIFIED · 两种格定义的等价'],['02324:discrete-chapter-7:2d9f8b8caaee','CALCULATION · middle · VERIFIED · 端点相等刻画单点']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(title,{exact:true}).click();
    await page.locator('article,details').filter({hasText:title}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-twenty-fourth-batch-reviewed.png'),fullPage:true});
  }

  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2430){
   for(const [key,title] of [['02324:discrete-chapter-7:2d9f8b8caaee','PROOF · hard · VERIFIED · 主下集反映全格底元'],['02324:discrete-chapter-7:a9ad9c98a3fa','PROOF · hard · VERIFIED · 同态满像继承分配'],['02324:discrete-chapter-7:17ef926fa409','PROOF · hard · VERIFIED · 保交前提不可自动换成保并'],['02324:discrete-chapter-7:ca639c6105dd','PROOF · hard · VERIFIED · 分配格补元唯一性证明']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(title,{exact:true}).click();
    await page.locator('article,details').filter({hasText:title}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-twenty-fifth-batch-reviewed.png'),fullPage:true});
  }

  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2530){
   for(const [key,title] of [['02324:discrete-chapter-7:51a70ad8dcdf','PROOF · hard · VERIFIED · 香农分解的代数证明'],['02324:discrete-chapter-8:72a09147c24d','PROOF · hard · VERIFIED · 含顶点选择的全部子图计数'],['02324:discrete-chapter-8:abc97ba9e72f','PROOF · hard · VERIFIED · 邻接阵与关联阵的乘积'],['02324:discrete-chapter-8:0e4d267b74fd','SHORT · simple · VERIFIED · 偶和上界仍不充分']]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(title,{exact:true}).click();
    await page.locator('article,details').filter({hasText:title}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-twenty-sixth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2630){
   for(const [key,title] of [["02324:discrete-chapter-8:0e4d267b74fd", "PROOF · hard · VERIFIED · 删同度顶点后的余度非唯一"], ["02324:discrete-chapter-8:f5c437f493f9", "PROOF · hard · VERIFIED · 度数总和的添加删除账本"], ["02324:discrete-chapter-8:51a02a23e117", "PROOF · hard · VERIFIED · 正则图存在的构造判据"], ["02324:discrete-chapter-8:aa7728d23cca", "CALCULATION · middle · VERIFIED · 重叠完全子图的并不必完全"]]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(title,{exact:true}).click();
    await page.locator('article,details').filter({hasText:title}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-twenty-seventh-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2730){
   for(const [key,title] of [["02324:discrete-chapter-8:aa7728d23cca", "PROOF · hard · VERIFIED · 完全图三点计数反推"], ["02324:discrete-chapter-8:64b672e20aeb", "PROOF · hard · VERIFIED · 原补都无三角的六点障碍"], ["02324:discrete-chapter-8:3d0de2b9c5a5", "PROOF · hard · VERIFIED · 添加四顶点保持自补"], ["02324:discrete-chapter-8:4d1991a96c46", "PROOF · hard · VERIFIED · 结构变换保同构但逆推失败"]]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(title,{exact:true}).click();
    await page.locator('article,details').filter({hasText:title}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-twenty-eighth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2830){
   for(const [key,title] of [["02324:discrete-chapter-8:6664be55efa4", "PROOF · hard · VERIFIED · 收缩一桥保持其他桥判定"], ["02324:discrete-chapter-8:90663a545608", "PROOF · hard · VERIFIED · 连通的搜索证书"], ["02324:discrete-chapter-8:f58484df457e", "PROOF · hard · VERIFIED · 奇闭游走蕴含奇简单圈"], ["02324:discrete-chapter-9:635643d28367", "SHORT · simple · VERIFIED · 含树子图不代表整体是树"]]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(title,{exact:true}).click();
    await page.locator('article,details').filter({hasText:title}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-twenty-ninth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2930){
   for(const [key,title] of [["02324:discrete-chapter-9:635643d28367", "PROOF · hard · VERIFIED · 树中等距中点的边界"], ["02324:discrete-chapter-9:c60d5a5e72b1", "PROOF · hard · VERIFIED · 对生成树逐边加权的下界"], ["02324:discrete-chapter-9:67c0d562b5e9", "CALCULATION · middle · VERIFIED · 授权四月图的同权顺序"], ["02324:discrete-chapter-9:e37a40dfa984", "CALCULATION · middle · VERIFIED · 授权十月二叉树结构读取"]]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(title,{exact:true}).click();
    await page.locator('article,details').filter({hasText:title}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-thirtieth-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=3030){
   for(const [key,title] of [["02324:discrete-chapter-9:e37a40dfa984", "PROOF · hard · VERIFIED · 镜像同时完全的充要条件"], ["02324:discrete-chapter-9:427d691bd13c", "CALCULATION · middle · VERIFIED · 授权十月树三遍历改编"], ["02324:discrete-chapter-9:d9f80bad17ab", "PROOF · hard · VERIFIED · Dirac门槛与圆桌存在性"], ["02324:discrete-chapter-9:62cdc55dc575", "CALCULATION · middle · VERIFIED · 删一边的K33可嵌入"]]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(title,{exact:true}).click();
    await page.locator('article,details').filter({hasText:title}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-thirty-first-batch-reviewed.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=3130){
   for(const [key,title] of [["02324:discrete-chapter-9:19095e7c0ffc", "PROOF · hard · VERIFIED · 三边路径的度数计数"], ["02324:discrete-chapter-9:04165843b373", "CALCULATION · middle · VERIFIED · 授权树的亲属与子树改编"], ["02324:discrete-chapter-9:531457a68046", "PROOF · hard · VERIFIED · 授权小边数平面图证明"], ["02324:discrete-chapter-9:d178f2affcaa", "SHORT · simple · VERIFIED · 孤点不参与边覆盖"]]){
    await page.getByLabel('主考点',{exact:true}).selectOption(key);
    await page.getByText(title,{exact:true}).click();
    await page.locator('article,details').filter({hasText:title}).first().getByText('来源：',{exact:false}).first().waitFor();
   }
   await page.screenshot({path:resolve(out,'discrete-thirty-second-batch-reviewed.png'),fullPage:true});
  }


  await page.goto(`${url}/study/course/02324/practice?cycleId=${cycle}`);
  await page.getByText(`已有 ${process.env.BANK_DISCRETE_QUALIFIED || '30'} 道合格练习题发布。`,{exact:false}).waitFor();
 await directory();
  await page.getByRole('button',{name:/^单条件\s+题量 10\/10/}).click();
  await page.getByRole('button',{name:/^单条件\s+题量 10\/10/ ,pressed:true}).waitFor();
  await pointHeading('单条件');
 await focus();
  await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
  await page.getByText('展开全部10题预览',{exact:true}).click();
  await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
  if(await middleEnabled())throw Error('Discrete middle bypassed unfinished per-point progress');
  if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Incomplete conditional practice allowed grading');
  await page.screenshot({path:resolve(out,'discrete-first-batch-practice.png'),fullPage:true});

  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=130){
   for(const title of ['双条件','可满足式','否定和合取','真值表']){
 await directory();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`) ,pressed:true}).waitFor();
    await pointHeading(title);
 await focus();
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('New discrete point allowed incomplete grading');
    if(await middleEnabled())throw Error('New discrete point bypassed chapter qualification');
    await page.screenshot({path:resolve(out,`discrete-second-focus-${title}.png`),fullPage:true});
   }
 await directory();
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<230 && await page.getByRole('button',{name:/^析取\s+题量 0\/10/}).count()!==1)throw Error('Unpublished discrete point received a false quota');
   await page.screenshot({path:resolve(out,'discrete-second-batch-practice.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=230){
   for(const title of ['命题符号化','析取','命题公式分类']){
    await directory();
    const selector=page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)});
    await selector.click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Third batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-third-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Third batch bypassed per-point simple qualification');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Optional hard bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<330 && await page.getByRole('button',{name:/^永真式\s+题量 0\/10/}).count()!==1)throw Error('Unpublished tautology point falsely counted');
   await page.screenshot({path:resolve(out,'discrete-third-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=330){
   for(const title of ['常用的命题定律','永真式','真成指派和成假指派']){
    await directory();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Fourth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-fourth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Fourth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Fourth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<430 && await page.getByRole('button',{name:/^永真式永假式\s+题量 0\/10/}).count()!==1)throw Error('Unpublished combined constant-class point falsely counted');
   await page.screenshot({path:resolve(out,'discrete-fourth-directory.png'),fullPage:true});
  }

  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=430){
   for(const [chapter,title] of [['第一章','永真式永假式'],['第一章','等值演算'],['第二章','CP规则'],['第二章','主合取范式']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    if(await option.count()!==1)throw Error('Missing discrete chapter '+chapter);
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Fifth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-fifth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Fifth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Fifth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<530 && await page.getByRole('button',{name:/^主析取范式\s+题量 0\/10/}).count()!==1)throw Error('Unpublished principal disjunction point falsely counted');
   await page.screenshot({path:resolve(out,'discrete-fifth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=530){
   for(const title of ['主合取范式','主析取范式','大小项的个数','大小项的性质']){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第二章'});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Sixth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-sixth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Sixth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Sixth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<630 && await page.getByRole('button',{name:/^归谬法\s+题量 0\/10/}).count()!==1)throw Error('Unpublished reductio point falsely counted');
   await page.screenshot({path:resolve(out,'discrete-sixth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=630){
   for(const [chapter,title] of [['第二章','大小项的性质'],['第二章','归谬法'],['第二章','推理规则'],['第三章','前束范式']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Seventh batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-seventh-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Seventh batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Seventh batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<730 && await page.getByRole('button',{name:/^自由变元与约束变元\s+题量 0\/10/}).count()!==1)throw Error('Unpublished free-bound variable point falsely counted');
   await page.screenshot({path:resolve(out,'discrete-seventh-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=730){
   for(const title of ['自由变元与约束变元','谓词公式的真值','谓词和量词','谓词恒等式']){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第三章'});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Eighth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-eighth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Eighth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Eighth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<830 && await page.getByRole('button',{name:/^谓词推理\s+题量 0\/10/}).count()!==1)throw Error('Unpublished predicate inference point falsely counted');
   await page.screenshot({path:resolve(out,'discrete-eighth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=830){
   for(const title of ['谓词恒等式','谓词推理','谓词符号化','量词否定']){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第三章'});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Ninth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-ninth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Ninth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Ninth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<930 && await page.getByRole('button',{name:/^量词的消去\s+题量 0\/10/}).count()!==1)throw Error('Unpublished quantifier elimination point falsely counted');
   await page.screenshot({path:resolve(out,'discrete-ninth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=930){
   for(const [title,chapter] of [['量词否定','第三章'],['量词的消去','第三章'],['量词的辖域','第三章'],['子集和真子集','第四章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Tenth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-tenth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Tenth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Tenth batch bypassed simple qualification');
   }
   await page.screenshot({path:resolve(out,'discrete-tenth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1030){
   for(const title of ['容斥原理','对称差','幂集','笛卡尔积']){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第四章'});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Eleventh batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-eleventh-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Eleventh batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Eleventh batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<1130 && await page.getByRole('button',{name:/^集合基数\s+题量 0\/10/}).count()!==1)throw Error('Unpublished cardinality point falsely counted');
   await page.screenshot({path:resolve(out,'discrete-eleventh-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1130){
   for(const title of ['笛卡尔积','集合基数','集合恒等式','集合的基本概念']){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第四章'});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Twelfth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-twelfth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Twelfth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Twelfth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<1230 && await page.getByRole('button',{name:/^集合的运算\s+题量 0\/10/}).count()!==1)throw Error('Unpublished set operations falsely counted');
   await page.screenshot({path:resolve(out,'discrete-twelfth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1230){
   for(const [title,chapter] of [['集合的基本概念','第四章'],['集合的运算','第四章'],['关系的基本概念','第五章'],['关系的表示','第五章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Thirteenth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-thirteenth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Thirteenth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Thirteenth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<1330 && await page.getByRole('button',{name:/^逆关系\s+题量 0\/10/}).count()!==1)throw Error('Unpublished inverse relation falsely counted');
   await page.screenshot({path:resolve(out,'discrete-thirteenth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1330){
   for(const [title,chapter] of [['逆关系','第五章'],['复合关系','第五章'],['自反和反自反','第五章'],['对称和反对称','第五章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
    await download.saveAs(resolve(out,`discrete-fourteenth-${title}.pdf`));
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Fourteenth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-fourteenth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Fourteenth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Fourteenth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<1430 && await page.getByRole('button',{name:/^传递\s+题量 0\/10/}).count()!==1)throw Error('Unpublished transitivity falsely counted');
   await page.screenshot({path:resolve(out,'discrete-fourteenth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1430){
   for(const [title,chapter] of [['对称和反对称','第五章'],['传递','第五章'],['关系运算后的性质','第五章'],['闭包','第五章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
    await download.saveAs(resolve(out,`discrete-fifteenth-${title}.pdf`));
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Fifteenth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-fifteenth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Fifteenth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Fifteenth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<1530 && await page.getByRole('button',{name:/^关系的传递闭包\s+题量 0\/10/}).count()!==1)throw Error('Unpublished transitive closure falsely counted');
   await page.screenshot({path:resolve(out,'discrete-fifteenth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1530){
   for(const [title,chapter] of [['闭包','第五章'],['关系的传递闭包','第五章'],['等价关系','第五章'],['等价类','第五章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
    await download.saveAs(resolve(out,`discrete-sixteenth-${title}.pdf`));
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Sixteenth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-sixteenth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Sixteenth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Sixteenth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<1630 && await page.getByRole('button',{name:/^等价关系的个数\s+题量 0\/10/}).count()!==1)throw Error('Unpublished equivalence counting falsely counted');
   await page.screenshot({path:resolve(out,'discrete-sixteenth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1630){
   for(const [title,chapter] of [['等价关系的个数','第五章'],['划分','第五章'],['偏序关系','第五章'],['函数的定义与基本性质','第五章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
    await download.saveAs(resolve(out,`discrete-seventeenth-${title}.pdf`));
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Seventeenth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-seventeenth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Seventeenth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Seventeenth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<1730 && await page.getByRole('button',{name:/^单射\s+题量 0\/10/}).count()!==1)throw Error('Unpublished injection falsely counted');
   await page.screenshot({path:resolve(out,'discrete-seventeenth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1730){
   for(const [title,chapter] of [['函数的定义与基本性质','第五章'],['单射','第五章'],['满射','第五章'],['双射','第五章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
    await download.saveAs(resolve(out,`discrete-eighteenth-${title}.pdf`));
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Eighteenth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-eighteenth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Eighteenth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Eighteenth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<1830 && await page.getByRole('button',{name:/^反函数\s+题量 0\/10/}).count()!==1)throw Error('Unpublished inverse function falsely counted');
   await page.screenshot({path:resolve(out,'discrete-eighteenth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1830){
   for(const [title,chapter] of [['双射','第五章'],['反函数','第五章'],['哈斯图','第五章'],['复合函数','第五章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
    await download.saveAs(resolve(out,`discrete-nineteenth-${title}.pdf`));
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Nineteenth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-nineteenth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Nineteenth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Nineteenth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<1930 && await page.getByRole('button',{name:/^最大元最小元\s+题量 0\/10/}).count()!==1)throw Error('Unpublished greatest least point falsely counted');
   await page.screenshot({path:resolve(out,'discrete-nineteenth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=1930){
   for(const [title,chapter] of [['最大元最小元','第五章'],['极大元极小元','第五章'],['二元运算的基本概念','第六章'],['二元运算的性质','第六章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
    await download.saveAs(resolve(out,`discrete-twentieth-${title}.pdf`));
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Twentieth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-twentieth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Twentieth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Twentieth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<2230 && await page.getByRole('button',{name:/^交换群\s+题量 0\/10/}).count()!==1)throw Error('Unpublished abelian group falsely counted');
   await page.screenshot({path:resolve(out,'discrete-twentieth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2030){
   for(const [title,chapter] of [['二元运算的性质','第六章'],['幺元','第六章'],['零元','第六章'],['逆元','第六章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
    await download.saveAs(resolve(out,`discrete-twenty-first-${title}.pdf`));
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('TwentyFirst batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-twenty-first-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('TwentyFirst batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('TwentyFirst batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<2130 && await page.getByRole('button',{name:/^半群\s+题量 0\/10/}).count()!==1)throw Error('Unpublished semigroup falsely counted');
   await page.screenshot({path:resolve(out,'discrete-twenty-first-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2130){
   for(const [title,chapter] of [['逆元','第六章'],['半群','第六章'],['独异点','第六章'],['群','第六章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
    await download.saveAs(resolve(out,`discrete-twenty-second-${title}.pdf`));
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('TwentySecond batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-twenty-second-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('TwentySecond batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('TwentySecond batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<2230 && await page.getByRole('button',{name:/^元素的阶\s+题量 0\/10/}).count()!==1)throw Error('Unpublished element order falsely counted');
   await page.screenshot({path:resolve(out,'discrete-twenty-second-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2230){
   for(const [title,chapter] of [['交换群','第六章'],['元素的阶','第六章'],['子群判定','第六章'],['群的阶数','第六章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
    await download.saveAs(resolve(out,`discrete-twenty-third-${title}.pdf`));
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('TwentyThird batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-twenty-third-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('TwentyThird batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('TwentyThird batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<2330 && await page.getByRole('button',{name:/^环、整环、域\s+题量 0\/10/}).count()!==1)throw Error('Unpublished ring falsely counted');
   await page.screenshot({path:resolve(out,'discrete-twenty-third-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2330){
   for(const [title,chapter] of [['群的阶数','第六章'],['环、整环、域','第六章'],['格','第七章'],['有界格','第七章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
    await download.saveAs(resolve(out,`discrete-twenty-fourth-${title}.pdf`));
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('TwentyFourth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-twenty-fourth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('TwentyFourth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('TwentyFourth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<2430 && await page.getByRole('button',{name:/^分配格\s+题量 0\/10/}).count()!==1)throw Error('Unpublished distributive lattice falsely counted');
   await page.screenshot({path:resolve(out,'discrete-twenty-fourth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2430){
   for(const [title,chapter] of [['有界格','第七章'],['分配格','第七章'],['对偶原理','第七章'],['补元','第七章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
    await download.saveAs(resolve(out,`discrete-twenty-fifth-${title}.pdf`));
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('TwentyFifth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-twenty-fifth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('TwentyFifth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('TwentyFifth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<2530 && await page.getByRole('button',{name:/^布尔代数\s+题量 0\/10/}).count()!==1)throw Error('Unpublished Boolean algebra falsely counted');
   await page.screenshot({path:resolve(out,'discrete-twenty-fifth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2530){
   for(const [title,chapter] of [['布尔代数','第七章'],['图的基本概念','第八章'],['图的表示','第八章'],['度数序列','第八章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
    await download.saveAs(resolve(out,`discrete-twenty-sixth-${title}.pdf`));
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('TwentySixth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-twenty-sixth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('TwentySixth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('TwentySixth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<2630 && await page.getByRole('button',{name:/^握手定理\s+题量 0\/10/}).count()!==1)throw Error('Unpublished handshake theorem falsely counted');
   await page.screenshot({path:resolve(out,'discrete-twenty-sixth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2630){
   for(const [title,chapter] of [['度数序列','第八章'],['握手定理','第八章'],['正则图','第八章'],['完全图','第八章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
    await download.saveAs(resolve(out,`discrete-twenty-seventh-${title}.pdf`));
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('TwentySeventh batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-twenty-seventh-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('TwentySeventh batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('TwentySeventh batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<2830 && await page.getByRole('button',{name:/^图的连通性\s+题量 0\/10/}).count()!==1)throw Error('Unpublished connectivity falsely counted');
   await page.screenshot({path:resolve(out,'discrete-twenty-seventh-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2730){
   for(const [title,chapter] of [['完全图','第八章'],['补图','第八章'],['自补图','第八章'],['图的同构','第八章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
    await download.saveAs(resolve(out,`discrete-twenty-eighth-${title}.pdf`));
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('TwentyEighth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-twenty-eighth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('TwentyEighth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('TwentyEighth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<2830 && await page.getByRole('button',{name:/^图的连通性\s+题量 0\/10/}).count()!==1)throw Error('Unpublished connectivity falsely counted');
   await page.screenshot({path:resolve(out,'discrete-twenty-eighth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2830){
   for(const [title,chapter] of [['割边','第八章'],['图的连通性','第八章'],['通路回路','第八章'],['树','第九章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
    await download.saveAs(resolve(out,`discrete-twenty-ninth-${title}.pdf`));
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('TwentyNinth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-twenty-ninth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('TwentyNinth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('TwentyNinth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<2930 && await page.getByRole('button',{name:/^二叉树\s+题量 0\/10/}).count()!==1)throw Error('Unpublished binary tree falsely counted');
   await page.screenshot({path:resolve(out,'discrete-twenty-ninth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=2930){
   for(const [title,chapter] of [['树','第九章'],['生成树','第九章'],['克鲁斯卡尔算法','第九章'],['二叉树','第九章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
    await download.saveAs(resolve(out,`discrete-thirtieth-${title}.pdf`));
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Thirtieth batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-thirtieth-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Thirtieth batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Thirtieth batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<3030 && await page.getByRole('button',{name:/^二叉树的遍历\s+题量 0\/10/}).count()!==1)throw Error('Unpublished binary traversal falsely counted');
   await page.screenshot({path:resolve(out,'discrete-thirtieth-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=3030){
   for(const [title,chapter] of [['二叉树','第九章'],['二叉树的遍历','第九章'],['哈密顿图','第九章'],['平面图','第九章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
    await download.saveAs(resolve(out,`discrete-thirty-first-${title}.pdf`));
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('ThirtyFirst batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-thirty-first-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('ThirtyFirst batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('ThirtyFirst batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<3130 && await page.getByRole('button',{name:/^树的握手定理\s+题量 0\/10/}).count()!==1)throw Error('Unpublished tree handshake falsely counted');
   await page.screenshot({path:resolve(out,'discrete-thirty-first-directory.png'),fullPage:true});
  }
  if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=3130){
   for(const [title,chapter] of [['树的握手定理','第九章'],['树的结点','第九章'],['欧拉公式','第九章'],['欧拉图','第九章']]){
    await directory();
    const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
    await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
    await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`),pressed:true}).waitFor();
    await pointHeading(title);
    await page.getByRole('region',{name:'十题PDF练习单',exact:true}).waitFor();
    await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
    await download.saveAs(resolve(out,`discrete-thirty-second-${title}.pdf`));
    await page.getByText('展开全部10题预览',{exact:true}).click();
    await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
    if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('ThirtySecond batch allowed incomplete grading');
    await page.screenshot({path:resolve(out,`discrete-thirty-second-focus-${title}.png`),fullPage:true});
    await directory();
    if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('ThirtySecond batch bypassed chapter coverage');
    if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('ThirtySecond batch bypassed simple qualification');
   }
   if(Number(process.env.BANK_DISCRETE_QUALIFIED)<3180 && await page.getByRole('button',{name:/^算术表达式的遍历\s+题量 0\/10/}).count()!==1)throw Error('Unpublished expression traversal falsely counted');
   await page.screenshot({path:resolve(out,'discrete-thirty-second-directory.png'),fullPage:true});
  }










 }

 if(Number(process.env.BANK_DISCRETE_QUALIFIED)>=3180){
  await page.goto(`${url}/admin?view=bank&courseId=${process.env.BANK_DISCRETE}&cycleId=${cycle}`);
  await page.getByRole('heading',{name:'题库审查与发布',exact:true}).waitFor();
  await page.getByRole('button',{name:'题目草稿与复核',exact:true}).click();
  for(const [key,label] of [["02324:discrete-chapter-9:d178f2affcaa", "PROOF · hard · VERIFIED · 欧拉闭路线的充分性构造"], ["02324:discrete-chapter-9:7d332d997d63", "CALCULATION · middle · VERIFIED · 授权表达式树改编"]]){
   await page.getByLabel('主考点',{exact:true}).selectOption(key);
   await page.getByText(label,{exact:true}).click();
   await page.locator('article,details').filter({hasText:label}).first().getByText('来源：',{exact:false}).first().waitFor();
  }
  await page.screenshot({path:resolve(out,'batch64-02324-reviewed.png'),fullPage:true});
  await page.goto(`${url}/study/course/02324/practice?cycleId=${cycle}`);
  for(const [title,chapter] of [["欧拉图", "第九章"], ["算术表达式的遍历", "第九章"]]){
   await directory();
   const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
   await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
   await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
   await pointHeading(title);
   await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
   const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
   await download.saveAs(resolve(out,`batch64-${title}.pdf`));
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Batch64 allowed no-image grading');
   await page.screenshot({path:resolve(out,`batch64-focus-${title}.png`),fullPage:true});
   await directory();
   if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Batch64 bypassed per-point gate');
   if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Batch64 bypassed optional hard gate');
  }
  await page.screenshot({path:resolve(out,'batch64-02324-directory.png'),fullPage:true});
  await page.goto(`${url}/admin?view=bank&courseId=${course}&cycleId=${cycle}`);
  await page.getByRole('heading',{name:'题库审查与发布',exact:true}).waitFor();
  await page.getByRole('button',{name:'题目草稿与复核',exact:true}).click();
  for(const [key,label] of [["13175:linear-chapter-1:9401784b3fca", "CALCULATION · middle · VERIFIED · 授权样卷余式和改编"], ["13175:linear-chapter-1:8d85624c40a0", "CALCULATION · middle · VERIFIED · 多个余式零约束的联动"]]){
   await page.getByLabel('主考点',{exact:true}).selectOption(key);
   await page.getByText(label,{exact:true}).click();
   await page.locator('article,details').filter({hasText:label}).first().getByText('来源：',{exact:false}).first().waitFor();
  }
  await page.screenshot({path:resolve(out,'batch64-13175-reviewed.png'),fullPage:true});
  await page.goto(`${url}/study/course/13175/practice?cycleId=${cycle}`);
  for(const [title,chapter] of [["代数余子式", "第一章"], ["余子式", "第一章"]]){
   await directory();
   const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:chapter});
   await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
   await page.getByRole('button',{name:new RegExp(`^${title}\\s+题量 10/10`)}).click();
   await pointHeading(title);
   await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
   const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
   await download.saveAs(resolve(out,`batch64-${title}.pdf`));
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Batch64 allowed no-image grading');
   await page.screenshot({path:resolve(out,`batch64-focus-${title}.png`),fullPage:true});
   await directory();
   if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Batch64 bypassed per-point gate');
   if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Batch64 bypassed optional hard gate');
  }
  await page.screenshot({path:resolve(out,'batch64-13175-directory.png'),fullPage:true});
 }

 if(Number(process.env.BANK_LINEAR_QUALIFIED)>=290){
  await page.goto(`${url}/admin?view=bank&courseId=${course}&cycleId=${cycle}`);
  await page.getByRole('heading',{name:'题库审查与发布',exact:true}).waitFor();
  await page.getByRole('button',{name:'题目草稿与复核',exact:true}).click();
  for(const [key,label] of [["13175:linear-chapter-1:8d85624c40a0","PROOF · hard · VERIFIED · 余式数据的一致性充要条件"],["13175:linear-chapter-1:943b8426ba01","CALCULATION · middle · VERIFIED · 稀疏四阶两层展开"],["13175:linear-chapter-1:8a7de259b627","CALCULATION · middle · VERIFIED · 指定四阶排列的带号项"],["13175:linear-chapter-1:d2b6f06349ad","CALCULATION · middle · VERIFIED · 授权参数行列式与实零集"]]){
   await page.getByLabel('主考点',{exact:true}).selectOption(key);
   await page.getByText(label,{exact:true}).click();
   await page.locator('article,details').filter({hasText:label}).first().getByText('来源：',{exact:false}).first().waitFor();
  }
  await page.screenshot({path:resolve(out,'batch65-admin-reviewed.png'),fullPage:true});
  await page.goto(`${url}/study/course/13175/practice?cycleId=${cycle}`);
  for(const title of ["余子式","按行（列）展开","行列式的定义","行列式的性质"]){
   await directory();
   const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第一章'});
   await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
   await page.getByRole('button',{name:new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s+题量 10/10`)}).click();
   await pointHeading(title);
   await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
   const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
   await download.saveAs(resolve(out,`batch65-${title}.pdf`));
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Batch65 no-image grading enabled');
   await page.screenshot({path:resolve(out,`batch65-focus-${title}.png`),fullPage:true});
   await directory();
   if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Batch65 bypassed middle');
   if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Batch65 bypassed optional hard');
  }
  await page.screenshot({path:resolve(out,'batch65-directory.png'),fullPage:true});
 }
 if(Number(process.env.BANK_LINEAR_QUALIFIED)>=390){
  await page.goto(`${url}/admin?view=bank&courseId=${course}&cycleId=${cycle}`);
  await page.getByRole('heading',{name:'题库审查与发布',exact:true}).waitFor();
  await page.getByRole('button',{name:'题目草稿与复核',exact:true}).click();
  for(const [key,label] of [["13175:linear-chapter-1:3385f23eae84","CALCULATION · middle · VERIFIED · 授权样卷乘积与平方改编"],["13175:linear-chapter-2:cf1687db603b","PROOF · hard · VERIFIED · 幂等矩阵的互补分解"],["13175:linear-chapter-2:21714e18a254","CALCULATION · middle · VERIFIED · 授权样卷分块求逆"],["13175:linear-chapter-2:a6f2416a759f","SHORT · simple · VERIFIED · 错误候选的单项反证"]]){
   await page.getByLabel('主考点',{exact:true}).selectOption(key);
   await page.getByText(label,{exact:true}).click();
   await page.locator('article,details').filter({hasText:label}).first().getByText('来源：',{exact:false}).first().waitFor();
  }
  await page.screenshot({path:resolve(out,'batch66-admin-reviewed.png'),fullPage:true});
  await page.goto(`${url}/study/course/13175/practice?cycleId=${cycle}`);
  for(const title of ["行列式的计算","矩阵的定义与类型","矩阵的分块","二阶矩阵的逆矩阵"]){
   await directory();
   const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:title==='行列式的计算'?'第一章':'第二章'});
   await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
   await page.getByRole('button',{name:new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s+题量 10/10`)}).click();
   await pointHeading(title);
   await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
   const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
   await download.saveAs(resolve(out,`batch66-${title}.pdf`));
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Batch66 no-image grading enabled');
   await page.screenshot({path:resolve(out,`batch66-focus-${title}.png`),fullPage:true});
   await directory();
   if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Batch66 bypassed middle');
   if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Batch66 bypassed optional hard');
  }
  await page.screenshot({path:resolve(out,'batch66-directory.png'),fullPage:true});
 }
 if(Number(process.env.BANK_LINEAR_QUALIFIED)>=490){
  await page.goto(`${url}/admin?view=bank&courseId=${course}&cycleId=${cycle}`);
  await page.getByRole('heading',{name:'题库审查与发布',exact:true}).waitFor();
  await page.getByRole('button',{name:'题目草稿与复核',exact:true}).click();
  for(const [key,label] of [["13175:linear-chapter-2:a6f2416a759f","PROOF · hard · VERIFIED · 逆与原矩阵差为对角的分类"],["13175:linear-chapter-2:4ae83907c407","CALCULATION · middle · VERIFIED · 循环参数族的可逆范围"],["13175:linear-chapter-2:5f155f518621","CALCULATION · middle · VERIFIED · 三阶消元同时记录逆"],["13175:linear-chapter-2:bd4aacd124e7","CALCULATION · middle · VERIFIED · 授权样卷矩阵方程改编"]]){
   await page.getByLabel('主考点',{exact:true}).selectOption(key);
   await page.getByText(label,{exact:true}).click();
   await page.locator('article,details').filter({hasText:label}).first().getByText('来源：',{exact:false}).first().waitFor();
  }
  await page.screenshot({path:resolve(out,'batch67-admin-reviewed.png'),fullPage:true});
  await page.goto(`${url}/study/course/13175/practice?cycleId=${cycle}`);
  for(const title of ["二阶矩阵的逆矩阵","可逆矩阵","初等行变换求逆矩阵","AX=B 的解法"]){
   await directory();
   const option=page.getByLabel('练习章节',{exact:true}).locator('option').filter({hasText:'第二章'});
   await page.getByLabel('练习章节',{exact:true}).selectOption(await option.getAttribute('value'));
   await page.getByRole('button',{name:new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s+题量 10/10`)}).click();
   await pointHeading(title);
   await page.getByRole('img',{name:'十题PDF练习单预览',exact:true}).waitFor();
   const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'下载PDF',exact:true}).click()]);
   await download.saveAs(resolve(out,`batch67-${title}.pdf`));
   await page.getByText('展开全部10题预览',{exact:true}).click();
   await page.locator('.sheet-question-preview section').nth(1).getByRole('heading',{name:/^第2题/}).waitFor();
   if(await page.getByRole('button',{name:'申请AI批改全部10题',exact:true}).isEnabled())throw Error('Batch67 no-image grading enabled');
   await page.screenshot({path:resolve(out,`batch67-focus-${title}.png`),fullPage:true});
   await directory();
   if(await page.getByRole('button',{name:/middle ·/}).isEnabled())throw Error('Batch67 bypassed middle');
   if(await page.getByRole('button',{name:/hard ·/}).isEnabled())throw Error('Batch67 bypassed optional hard');
  }
  await page.screenshot({path:resolve(out,'batch67-directory.png'),fullPage:true});
 }
 if(errors.length)throw Error(errors.join('\n'));
 writeFileSync(resolve(out,'complete-reset-browser.json'),JSON.stringify({verifiedAt:new Date().toISOString(),realHttp:true,mockedRoutes:0,legacyResetInvoked:process.env.BANK_RESET_FIXTURE==='1',oldBankAndSnapshotsRemoved:process.env.BANK_RESET_FIXTURE==='1',originalDeterminantDraftsVisible:true,originalMultiplicationDraftsVisible:true,latestBankOnly:true,incompletePublicationBlocked:true,qualifiedPracticeAccessible:true,calculusFirstBatchAccessible:!!process.env.BANK_CALCULUS,calculusCompletePracticeQuota:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2970,discreteFirstBatchAccessible:!!process.env.BANK_DISCRETE,discreteSecondBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=130,discreteThirdBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=230,thirdBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=230,discreteFourthBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=330,fourthBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=330,discreteFifthBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=430,fifthBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=430,discreteSixthBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=530,sixthBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=530,discreteSeventhBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=630,seventhBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=630,discreteEighthBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=730,eighthBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=730,discreteNinthBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=830,ninthBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=830,discreteTenthBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=930,tenthBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=930,discreteEleventhBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1030,eleventhBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1030,discreteTwelfthBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1130,twelfthBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1130,discreteThirteenthBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1230,thirteenthBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1230,discreteFourteenthBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1330,fourteenthBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1330,batch67LinearAccessible:Number(process.env.BANK_LINEAR_QUALIFIED)>=490,batch66LinearAccessible:Number(process.env.BANK_LINEAR_QUALIFIED)>=390,batch65LinearAccessible:Number(process.env.BANK_LINEAR_QUALIFIED)>=290,linearQualifiedQuestions:Number(process.env.BANK_LINEAR_QUALIFIED||0),batch64DiscreteComplete:Number(process.env.BANK_DISCRETE_QUALIFIED)>=3180,batch64LinearAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=3180,discreteThirtySecondBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=3130,thirtySecondBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=3130,discreteThirtyFirstBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=3030,thirtyFirstBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=3030,discreteThirtiethBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2930,thirtiethBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2930,discreteTwentyNinthBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2830,twentyNinthBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2830,discreteTwentyEighthBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2730,twentyEighthBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2730,discreteTwentySeventhBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2630,twentySeventhBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2630,discreteTwentySixthBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2530,twentySixthBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2530,discreteTwentyFifthBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2430,twentyFifthBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2430,discreteTwentyFourthBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2330,twentyFourthBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2330,discreteTwentyThirdBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2230,twentyThirdBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2230,discreteTwentySecondBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2130,twentySecondBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2130,discreteTwentyFirstBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2030,twentyFirstBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=2030,discreteTwentiethBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1930,twentiethBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1930,discreteNineteenthBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1830,nineteenthBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1830,discreteEighteenthBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1730,eighteenthBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1730,discreteSeventeenthBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1630,seventeenthBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1630,discreteSixteenthBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1530,sixteenthBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1530,discreteFifteenthBatchAccessible:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1430,fifteenthBatchOptionalHardBlocked:Number(process.env.BANK_DISCRETE_QUALIFIED)>=1430,discreteQualifiedQuestions:Number(process.env.BANK_DISCRETE_QUALIFIED || 0),calculusQualifiedQuestions:Number(process.env.BANK_CALCULUS_QUALIFIED || 100),incompleteChapterMiddleBlocked:true,calculusSecondChapterAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=600,calculusThirdChapterAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=900,calculusFourthChapterAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1000,calculusFifthChapterAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1100,calculusTwelfthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1200,calculusSixthChapterAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1300,calculusThirteenthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1300,calculusFourteenthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1400,calculusFifteenthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1500,calculusSixteenthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1600,calculusSeventeenthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1700,calculusEighteenthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1800,calculusNineteenthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1900,calculusTwentyNinthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2900,calculusTwentyEighthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2800,calculusTwentySeventhBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2700,calculusTwentySixthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2600,calculusTwentyFifthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2500,calculusTwentyFourthBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2400,calculusTwentyThirdBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2300,calculusTwentySecondBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2200,calculusTwentyFirstBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2100,calculusTwentiethBatchAccessible:Number(process.env.BANK_CALCULUS_QUALIFIED)>=2000,unpublishedPointZeroCountVerified:Number(process.env.BANK_CALCULUS_QUALIFIED)>=1800,independentExamsRemainBlocked:true,errors},null,2)+'\n');
} catch(e){
 await page.screenshot({path:resolve(out,'publication-browser-failure.png'),fullPage:true});
 writeFileSync(resolve(out,'publication-browser-failure.html'),await page.content());
 throw e;
} finally {await browser.close();}
