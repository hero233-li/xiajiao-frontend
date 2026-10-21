// Synthetic acceptance fixture only; no account, token, production API, or real answer is used.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KnowledgeAnalysis } from '../src/features/knowledge-analysis/KnowledgeAnalysis';
import { knowledgeAnalysisApi as api, type CardDetail } from '../src/api/knowledge-analysis';
import '../src/styles/global.css';
const now = '2026-10-19T00:00:00Z';
const card: CardDetail = {
  id:'11111111-1111-4111-8111-111111111111',courseId:'22222222-2222-4222-8222-222222222222',courseCode:'13015',courseName:'高等数学（工本）',
  pointKey:'series-endpoints',pointTitle:'幂级数的收敛区间',chapterTitle:'第六章 · 无穷级数',title:'求收敛区间时，两个端点要单独检验',
  issueType:'OMISSION',errorCategory:'METHOD',confidence:'SUPPORTED',summary:'批改明确指出：已求出收敛半径，但遗漏左端点检验。复习重点不是重新背公式，而是补齐端点判断这一步。',occurrences:2,lostPoints:6,
  reviewState:'PENDING',analysisState:'COMPLETED',updatedAt:now,revision:0,
  knowledge:'### 半径不决定端点\n比值法通常先确定收敛半径 $R$，区间内部绝对收敛、外部发散。两个端点必须分别代入原级数，再使用适合该级数的判别方法。\n\n例如 $\\sum_{n=1}^{\\infty}x^n/n$ 的收敛半径为 $1$；在 $x=-1$ 处为交错级数，在 $x=1$ 处为发散的调和级数。',
  steps:['先计算收敛半径，得到开区间。','把左右端点分别代入原级数。','逐一判断收敛性，再写完整区间。'],
  pitfalls:['比值极限等于1时，不能据此直接判收敛或发散。','两个端点的结论可能不同。'],checklist:['两个端点是否都检查了？','最终区间的方括号和圆括号是否正确？'],
  selfTest:'求 $\\sum_{n=1}^{\\infty} x^n/n$ 的收敛区间。',selfTestAnswer:'收敛半径为1。左端点-1处交错收敛，右端点1处发散，因此为 $[-1,1)$。',note:'',model:'隔离验收 · 虚构分析',
  evidence:[{id:'33333333-3333-4333-8333-333333333333',sourceType:'GRADING',sourceId:'44444444-4444-4444-8444-444444444444',questionId:'1',questionNumber:'12',stem:'求 $\\sum_{n=1}^{\\infty}x^n/n$ 的收敛区间。',answer:'比值法得到半径1，收敛区间为(-1,1)。',referenceAnswer:'先求半径，再检验两端点，得到[-1,1)。',earned:6,maximum:10,reasons:['收敛半径正确，缺少左端点的单独检验。'],pages:[2],occurredAt:now,sourceUrl:'',pointKey:'series-endpoints',pointTitle:'幂级数的收敛区间'}],
};
api.overview=async()=>({courses:[{id:card.courseId,code:card.courseCode,name:card.courseName}],stats:{total:1,pending:card.reviewState==='PENDING'?1:0,repeated:1,reviewed:card.reviewState==='REVIEWED'?1:0},workerOnline:true,workerReason:''});
api.cards=async filters=>({items:filters.reviewState&&filters.reviewState!==card.reviewState?[]:[{...card}],page:1,size:20,total:1});
api.card=async()=>structuredClone(card);
api.review=async(_id,body)=>{card.note=body.note;card.reviewState=body.reviewState;card.revision++;return structuredClone(card);};
api.tasks=async()=>[{id:'55555555-5555-4555-8555-555555555555',courseId:card.courseId,cardId:card.id,state:'COMPLETED',error:null,createdAt:now,updatedAt:now}];
api.sync=async()=>({queued:0,unchanged:1,skipped:0});
const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
createRoot(document.getElementById('root')!).render(<BrowserRouter><QueryClientProvider client={client}><div style={{maxWidth:1360,margin:'0 auto',padding:'24px'}}><p role="note" style={{padding:12,background:'#fff4d6',borderRadius:8}}>隔离验收 · 以下全部为虚构题目及分析，不连接业务数据库或真实账户。</p><KnowledgeAnalysis global /></div></QueryClientProvider></BrowserRouter>);
