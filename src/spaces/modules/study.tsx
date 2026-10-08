import { apiRequest } from '../../api/http';
import type { Dashboard } from '../../api/generated/models';
import { getPlan } from '../../api/generated/schedule/schedule';
import { learningTargetPath } from '../../features/dashboard/navigation';
import type { SpaceSummary, SummaryViewProps, TodayTask } from '../types';
export async function loadSummary(signal?: AbortSignal): Promise<SpaceSummary> {
  const d = (
    await apiRequest<{ data: Dashboard }>({
      url: '/api/v1/personal/study-summary',
      signal,
      silent: true,
    })
  ).data;
  let tasks: TodayTask[] = [];
  if (d.selectedPlanId) {
    const plan = (await getPlan(d.selectedPlanId, { signal, silent: true })).data;
    const ids = [
      ...new Set(
        (plan.days.find((day) => day.day === d.localDate)?.segments ?? [])
          .filter((s) => s.state === 'SCHEDULED')
          .map((s) => s.taskId),
      ),
    ];
    tasks = ids.flatMap((id) => {
      const t = plan.tasks.find((t) => t.id === id);
      return t
        ? [
            {
              id: t.id,
              title: t.title,
              date: d.localDate,
              status: t.completed ? '已完成' : '待完成',
              to: learningTargetPath(t.target),
            },
          ]
        : [];
    });
  }
  return {
    message: d.todaySuggestionMessage,
    tasks,
    next: {
      label: tasks.some((t) => t.status === '待完成') ? '查看学习安排' : '安排下一次学习',
      to: '/study/schedule',
    },
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
