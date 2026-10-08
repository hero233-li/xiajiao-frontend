import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { QuestionStem } from './QuestionStem';
afterEach(cleanup);
it('将补充要求独立展示，保持原题中文字与公式内容', () => {
  const { container } = render(
    <QuestionStem text="y=x³在x=1处，写割线到x=1+h的斜率，并求切线斜率。请给出主要计算或判断依据。" />,
  );
  expect(container.querySelector('.question-stem-body')).toHaveTextContent(
    'y=x³在x=1处，写割线到x=1+h的斜率，并求切线斜率。',
  );
  expect(container.querySelector('.question-requirement')).toHaveTextContent(
    '请给出主要计算或判断依据。',
  );
  expect(container.querySelectorAll('.question-expression')).toHaveLength(3);
});
it('保留代码缩进和换行，中文标点不拆开代码', () => {
  const code = 'for (let i = 0; i < 3; i++) {\n  console.log("请输出。结果");\n}\n';
  const { container } = render(
    <QuestionStem text={'阅读下列代码。\n```javascript\n' + code + '```\n请说明输出结果。'} />,
  );
  expect(container.querySelector('pre code')?.textContent).toBe(code);
  expect(screen.getByText('请说明输出结果。')).toBeInTheDocument();
});
it('无补充要求时正常展示原文，公式分隔符不按内部标点拆段', () => {
  const { container } = render(<QuestionStem text={'已知 $x^2+1$，求导。\n第二问求零点。'} />);
  expect(container.querySelector('.question-requirement')).toBeNull();
  expect(container.querySelectorAll('.question-stem-paragraph')).toHaveLength(2);
});
