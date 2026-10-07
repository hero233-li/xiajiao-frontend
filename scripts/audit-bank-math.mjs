/* Same renderer settings as MathRenderer; audit only, no content rewrites. */
import { readFileSync, writeFileSync } from 'node:fs';
import katex from 'katex';
const root='../output/question-bank-rebuild';
const rows=readFileSync(`${root}/逐题审查台账.jsonl`,'utf8').trim().split('\n').map(JSON.parse);const findings=[];
for(const row of rows){const q=row.originalSnapshot;const fields=[['stem',q.stem],['explanation',q.explanation],...JSON.parse(q.options).map((o,i)=>[`options[${i}]`,o])];
 for(const [field,text] of fields){for(const m of (text??'').matchAll(/(?<!\\)(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g)){
  const raw=m[0];const block=raw.startsWith('$$')||raw.startsWith('\\[');const count=raw.startsWith('$')&&!block?1:2;const expression=raw.slice(count,-count);
  const issues=[];if(/[\x00-\x08\x0b-\x1f]/.test(expression))issues.push('公式含非显示控制字符');if(/\t(?:o\b|imes\b|heta\b|ext\b|op\b)/.test(expression))issues.push('公式含疑似反斜线转义损坏的TAB命令');
  if(/\\{2,}(?:frac|sqrt|ln|sin|cos|tan|lim|sum|int|forall|exists|neg|to|times|in|notin|Rightarrow|left|right|begin|end|cdot)(?![A-Za-z])/.test(expression))issues.push('TeX命令前有重复反斜线，可能被当成换行而非数学命令');
  if(/(?<!\\)\b(?:exists|leftrightarrow|Rightarrow)\b/.test(expression))issues.push('疑似数学命令缺反斜线；不得将字母乘积当量词或联结词');
  try{katex.renderToString(expression,{displayMode:block,throwOnError:true,trust:false,strict:'error',maxExpand:1000,maxSize:20});}catch(e){issues.push(`当前页面无法正常渲染：${e.message}`);}
  if(issues.length)findings.push({revisionId:row.revisionId,questionId:row.questionId,code:row.courseCode,field,offset:m.index,expression,issues});
 }}
}
writeFileSync(`${root}/数学显示问题.json`,JSON.stringify({auditedQuestions:rows.length,affectedQuestions:new Set(findings.map(x=>x.revisionId)).size,findings,autoCorrected:false,semanticReviewComplete:false},null,2)+'\n');
console.log(JSON.stringify({auditedQuestions:rows.length,affectedQuestions:new Set(findings.map(x=>x.revisionId)).size,findings:findings.length}));
