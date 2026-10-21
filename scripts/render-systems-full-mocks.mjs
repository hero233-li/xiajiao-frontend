import {chromium} from 'playwright';
import katex from 'katex';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve('..'),pack=JSON.parse(readFileSync(resolve(root,'content/full-course-mocks/systems/reviewed-papers.json'))),out=resolve(root,'output/pdf/systems-full-course-mocks');
mkdirSync(out,{recursive:true});
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function math(s){
 return s.split(/(```(?:c)?\n[\s\S]*?```|\$[^$]+\$)/g).map(t=>{
  if(t.startsWith('```')) return '<pre>'+esc(t.replace(/^```(?:c)?\n/,'').replace(/```$/,''))+'</pre>';
  return t.startsWith('$')&&t.endsWith('$')?katex.renderToString(t.slice(1,-1),{throwOnError:true}):esc(t).replace(/\n/g,'<br>');
 }).join('');
}
const kc=readFileSync('node_modules/katex/dist/katex.min.css','utf8').replace(/url\(fonts\/([^)]*)\)/g,(_,f)=>`url(data:font/woff2;base64,${readFileSync(resolve('node_modules/katex/dist/fonts',f)).toString('base64')})`);
const css=kc+`@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;color:#14213b;font-family:'Songti SC',serif;font-size:11pt;line-height:1.55}.page{width:210mm;height:297mm;padding:14mm 16mm 18mm;position:relative;break-after:page}.page:last-child{break-after:auto}h1{font-size:16pt;text-align:center;margin:0 0 3mm}h2{font-size:12pt;margin:3mm 0}.meta{font-size:9pt;text-align:center}.q{margin:3.5mm 0;break-inside:avoid}.options{display:grid;grid-template-columns:1fr 1fr;gap:1mm 3mm;margin:1mm 0 0 5mm}.footer{position:absolute;bottom:7mm;left:16mm;right:16mm;border-top:1px solid #bbc1cb;padding-top:2mm;font-size:9pt;text-align:center}.katex{font-size:1em}.note,.rubric{font-size:9pt;color:#536077}.figure{display:block;width:80mm;height:auto;max-height:61mm;object-fit:contain;margin:2mm auto}p{margin:2mm 0}pre{white-space:pre-wrap;font:9pt/1.35 Menlo,monospace;background:#f3f5f8;padding:2mm;margin:2mm 0}.draft{color:#994000}`;
const browser=await chromium.launch({headless:true}),page=await browser.newPage(),layout=[];
try{
 for(const paper of pack.papers){
  const qs=paper.questionIds.map(id=>pack.questions.find(q=>q.id===id));
  for(const answers of [false,true]){
   const ranges=[[0,5],[5,10],[10,15],[15,20],[20,22],[22,24],[24,26],[26,27],[27,28],[28,29],[29,30]];
   const chunks=ranges.map(([a,b])=>qs.slice(a,b)),name=`13015_全科模拟_${paper.variant}_${answers?'答案与评分':'学生卷'}`;
   const html=chunks.map((chunk,i)=>`<section class="page"><div class="content"><h1>计算机系统原理 · 全科模拟${paper.variant}卷</h1><div class="meta">${answers?'参考答案与评分标准':'学生卷'} · 满分100分 · 建议150分钟（非官方标注）</div><p class="note draft">审核版 · 原创全科模拟卷 · 以系统发布状态为准</p>${i===0?`<p class="note">本卷30题：10单选×2、10填空×2、2名词解释×5、4简答×5、2计算×9、2分析设计×6。五章范围。${answers?'客观题全对给2分，否则0分。主观题按每题具体给分点评分（名词/简答5分、计算9分、分析设计6分）；其他正确方法同等给分，未作答计零。':'闭卷限时，请在另纸标明卷别和题号，简答、计算与分析须写出主要过程。A/B/C任一完整有效模拟卷通过即可，不取三卷平均。'}</p>`:''}<h2>${({CHOICE:'一、单项选择题',FILL:'二、填空题',TERM:'三、名词解释',SHORT:'四、简答题',CALCULATION:'五、计算题',ANALYSIS:'六、分析设计题'})[chunk[0].type]}（本页${Number(chunk[0].id.split('-').at(-1))}—${Number(chunk.at(-1).id.split('-').at(-1))}）</h2>${chunk.map(q=>`<div class="q"><b>${Number(q.id.split('-').at(-1))}.（${q.maximum}分）</b>${math(q.stem)}${q.options.length?`<div class="options">${q.options.map((o,j)=>`<span>${String.fromCharCode(65+j)}. ${math(o)}</span>`).join('')}</div>`:''}${answers?`<p><b>答案：</b>${q.type==='CHOICE'?String.fromCharCode(65+q.solution.correctOption)+' · ':''}${math(q.solution.referenceAnswer)}<br><b>解析：</b>${math(q.explanation)}</p><p class="rubric">${q.rubric.map(r=>`${r.maximum}分：${math(r.description)}`).join('；')}</p>`:''}</div>`).join('')}</div><div class="footer">学习知途 · ${paper.variant}卷 · ${i+1}/${chunks.length} · 原创题，项目真题仅作结构参照</div></section>`).join('');
   await page.setContent(`<html lang="zh-CN"><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`);
   await page.evaluate(()=>document.fonts.ready);await page.locator('img').evaluateAll(es=>Promise.all(es.map(e=>e.decode())));
   const bounds=await page.locator('.page').evaluateAll(es=>es.map(e=>({bottom:e.querySelector('.content').getBoundingClientRect().bottom,footer:e.querySelector('.footer').getBoundingClientRect().top,overflow:e.scrollHeight-e.clientHeight})));
   if(bounds.some(b=>b.bottom>b.footer-8||b.overflow>1))throw Error('Overflow '+name+JSON.stringify(bounds));
   const file=resolve(out,name+'.pdf');await page.pdf({path:file,printBackground:true,preferCSSPageSize:true});
   layout.push({name,pdf:file,pages:chunks.length,questions:30,answers,bounds,visuallyInspected:false});
  }
 }
 writeFileSync(resolve(out,'layout.json'),JSON.stringify({status:'RENDERED_PENDING_VISUAL_INSPECTION',files:layout},null,2));
 console.log('6 reviewed PDFs,66 pages total; no DOM overflow; awaiting visual and runtime acceptance');
}finally{await browser.close();}
