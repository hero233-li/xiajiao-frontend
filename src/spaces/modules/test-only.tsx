/** Only reached from tests, never registered in the production application. */
import type { SpaceSummary, SummaryViewProps } from '../types';
export async function loadSummary(): Promise<SpaceSummary> {
  return {
    message: '测试模块，没有模拟任务或进度',
    tasks: [],
    next: { label: '查看测试说明', to: '/spaces' },
  };
}
export function Summary({ summary }: SummaryViewProps) {
  return <p>{summary.message}</p>;
}
export function Component() {
  return (
    <main id="main-content" tabIndex={-1}>
      <h1>测试空间（仅验收）</h1>
      <p>没有真实业务数据。</p>
    </main>
  );
}
