import { apiRequest } from '../../api/http';
import type { Dashboard } from '../../api/generated/models';
import { learningTargetPath } from '../../features/dashboard/navigation';
import type { SpaceSummary, SummaryViewProps } from '../types';
export async function loadSummary(signal?: AbortSignal): Promise<SpaceSummary> {
  const d = (
    await apiRequest<{ data: Dashboard }>({
      url: '/api/v1/personal/study-summary',
      signal,
      silent: true,
    })
  ).data;
  return {
    message: '自由学习，按自己的节奏阅读与练习。',
    tasks: [],
    next: { label: '查看考试倒计时', to: '/study' },
    resume: d.continueLearning
      ? { label: d.continueLearning.title, to: learningTargetPath(d.continueLearning.target) }
      : undefined,
    metrics: [
      {
        label: '阅读进度',
        value: `${d.overallProgress.completedItems} / ${d.overallProgress.totalItems} 条目`,
      },
    ],
  };
}
export function Summary({ summary }: SummaryViewProps) {
  return <p>{summary.message}</p>;
}
