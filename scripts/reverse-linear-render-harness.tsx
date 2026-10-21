// Isolated draft rendering; no bank API, publication, grading or unlock operations.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { QuestionStem } from '../src/features/bank/QuestionStem';
import { practiceSheetPdf } from '../src/features/bank/practiceSheetPdf';
import '../src/features/bank/bank.css';
import '../src/features/practice/practice.css';

type Draft = { id: string; stem: string; maximum: number };
export async function renderDraftSheet(title: string, level: string, questions: Draft[]) {
  if (questions.length !== 10) throw new Error('Requires exactly ten questions');
  let host = document.getElementById('reverse-linear-harness');
  if (!host) {
    host = document.createElement('div');
    host.id = 'reverse-linear-harness';
    document.body.append(host);
  }
  host.replaceChildren();
  const root = createRoot(host);
  flushSync(() => root.render(<div className="practice-pdf-sheet">
    <header><strong>学习知途 · 十题练习单 · 未发布排版校验</strong>
      <h1>{title}</h1><p>第六章 实二次型 · {level} · 满分100分</p>
      <p>独立倒序批次 reverse-linear-001 · 按题号1—10作答，题目不含参考答案。</p></header>
    <div className="practice-pdf-questions">{[0, 1].map(column => <div key={column}>
      {questions.slice(column * 5, column * 5 + 5).map((q, i) => <section key={q.id}>
        <h2>{column * 5 + i + 1}. <span>{q.maximum}分</span></h2><QuestionStem text={q.stem} />
      </section>)}
    </div>)}</div>
    <footer>请拍清完整作答，图片可包含多题；全部10题一次批改，待评分或待核对不判定通过。</footer>
  </div>));
  const sheet = host.querySelector<HTMLElement>('.practice-pdf-sheet')!;
  const headings = [...sheet.querySelectorAll('section h2')].map(e => e.textContent);
  const stemCount = sheet.querySelectorAll('.question-stem').length;
  const bounds = sheet.getBoundingClientRect();
  const overflow = [...sheet.querySelectorAll('section,.question-stem')].filter(e => {
    const rect = e.getBoundingClientRect();
    return rect.left < bounds.left - 1 || rect.right > bounds.right + 1;
  }).length;
  const { blob, imageUrl } = await practiceSheetPdf(sheet);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const result = { pdfBase64: btoa(binary), imageUrl, stemCount, headings, overflow,
    height: sheet.scrollHeight, width: bounds.width, renderer: 'actual QuestionStem + practiceSheetPdf',
    apiCalls: 0, integrationLimit: 'Draft-only component harness; not a published student flow' };
  root.unmount();
  return result;
}
