import { readFileSync, writeFileSync } from 'node:fs';
import katex from 'katex';
const base='../content/question-bank-rebuild';
const original=JSON.parse(readFileSync(`${base}/13015/complement-arithmetic.draft.json`,'utf8')).questions;
const sql=JSON.parse(readFileSync(`${base}/13171/single-table-conditions.draft.json`,'utf8')).questions;
const determinants=JSON.parse(readFileSync(`${base}/13175/second-order-determinants.draft.json`,'utf8')).questions;
const multiplication=JSON.parse(readFileSync(`${base}/13175/matrix-multiplication.draft.json`,'utf8')).questions;
const errors=[];let formulas=0;
for(const q of [...original,...sql,...determinants,...multiplication])for(const text of [q.stem,...q.options,q.explanation])for(const m of text.matchAll(/(?<!\\)(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g)){
 const raw=m[0],block=raw.startsWith('$$')||raw.startsWith('\\['),count=raw.startsWith('$')&&!block?1:2;formulas++;
 try{katex.renderToString(raw.slice(count,-count),{displayMode:block,throwOnError:true,trust:false,strict:'error',maxExpand:1000,maxSize:20});}catch(e){errors.push({id:q.id,formula:raw,error:e.message});}
}
const result={draftQuestions:original.length+sql.length+determinants.length+multiplication.length,formulasChecked:formulas,errors,semanticOrSourceApproval:false};writeFileSync('../output/question-bank-rebuild/草稿公式校验.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(errors.length)process.exitCode=1;
