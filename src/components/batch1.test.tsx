import { describe, expect, it } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { MathText } from './MathText';
import { ProgressBar } from './ProgressBar';
import { defaultCycle, cycleKey } from '../features/cycle/CycleContext';
import { cleanCycleTarget } from '../features/cycle/navigation';
import type { ExamCycle } from '../api/generated/models';

const cycle = (id: string, startDate: string, endDate: string): ExamCycle => ({
  id,
  startDate,
  endDate,
  name: id,
  timezone: 'Asia/Shanghai',
  courses: [],
});
describe('批次 1 回归', () => {
  it.each([
    String.raw`$x^2$`,
    String.raw`$$\frac{1}{2}$$`,
    String.raw`\(\lim_{t\to 0}\frac{e^{2t}-1}{t}\)`,
    String.raw`\[\int_0^1 x\,dx\]`,
    String.raw`$\sum_{n=1}^3 n$`,
    String.raw`$$\begin{pmatrix}1&2\\3&4\end{pmatrix}$$`,
  ])('混排公式 %s', async (formula) => {
    const { container } = render(<MathText text={`中文前文${formula}中文后文`} />);
    await waitFor(() => expect(container.querySelector('.katex')).not.toBeNull());
    expect(container).toHaveTextContent('中文前文');
    expect(container).toHaveTextContent('中文后文');
    if (formula.startsWith('$$') || formula.startsWith(String.raw`\[`))
      expect(container.querySelector('.katex-display')).not.toBeNull();
  });
  it('解析失败保留分隔符和原文', async () => {
    const text = String.raw`中文 $$\notACommand{1}$$ 后文`;
    const { container } = render(<MathText text={text} />);
    await waitFor(() => expect(container.querySelector('[aria-busy]')).toBeNull());
    expect(container.textContent).toBe(text);
  });
  it('真实 1%、50%、100% 的可访问值不被视觉最小宽度改变', () => {
    const { container } = render(
      <>
        {[1, 50, 100].map((value) => (
          <ProgressBar key={value} value={value} label={`${value}%`} />
        ))}
      </>,
    );
    const bars = [...container.querySelectorAll('[role=progressbar]')];
    expect(bars.map((b) => b.getAttribute('aria-valuenow'))).toEqual(['1', '50', '100']);
    expect(bars.map((b) => (b.firstElementChild as HTMLElement).style.width)).toEqual([
      '3%',
      '50%',
      '100%',
    ]);
    expect((bars[0].firstElementChild as HTMLElement).style.background).toBe(
      'var(--color-primary)',
    );
    expect((bars[2].firstElementChild as HTMLElement).style.background).toBe(
      'var(--color-success)',
    );
  });
  it('默认周期按上海日期选择最近未结束项，不篡改数据', () => {
    const items = [
      cycle('past', '2026-09-01', '2026-09-30'),
      cycle('later', '2026-11-01', '2026-11-30'),
      cycle('now', '2026-10-01', '2026-10-31'),
    ];
    expect(defaultCycle(items, '2026-10-02')?.id).toBe('now');
    expect(defaultCycle([], '2026-10-02')).toBeUndefined();
    expect(defaultCycle([{ ...items[1], isCurrent: true } as ExamCycle], '2026-10-02')?.id).toBe(
      'later',
    );
  });
  it('周期短链接保留任务参数和 hash，不泄露周期 UUID', () => {
    const selected = cycle('0ebdbbfe-d607-54b5-9c21-4e0adade5e4c', '2026-10-01', '2026-10-31');
    const state = { selected, cycleId: selected.id, defaultId: selected.id } as Parameters<
      typeof cleanCycleTarget
    >[1];
    expect(
      cleanCycleTarget(
        `/zikao/course/00023/catalog?cycleId=${selected.id}&itemId=item#chapter`,
        state,
      ),
    ).toBe('/zikao/course/00023/catalog?itemId=item#chapter');
    const shared = cleanCycleTarget('/zikao', { ...state!, defaultId: 'other' });
    expect(shared).toBe(`/zikao?cycle=${cycleKey(selected)}`);
    expect(shared).not.toContain(selected.id);
  });
  it('用户文案不含开发占位词（生成客户端注释不属于用户文案）', () => {
    const forbidden = ['接口' + '未提供', '暂' + '未提供', '后端' + '返回'];
    const violations: string[] = [];
    const scan = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = resolve(dir, entry.name);
        if (entry.isDirectory()) {
          if (!['generated', 'mocks', 'test'].includes(entry.name)) scan(path);
        } else if (
          /\.(tsx?|css)$/.test(path) &&
          !path.includes('.test.') &&
          forbidden.some((word) => readFileSync(path, 'utf8').includes(word))
        )
          violations.push(path);
      }
    };
    scan(resolve('src'));
    expect(violations).toEqual([]);
  });
});
