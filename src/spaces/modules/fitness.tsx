import { apiRequest } from '../../api/http';
import type { Summary as FitnessSummary, Day } from '../../api/fitness';
import type { SpaceSummary, SummaryViewProps, TodayTask } from '../types';
export async function loadSummary(signal?: AbortSignal): Promise<SpaceSummary> {
  const s = (
    await apiRequest<{ data: FitnessSummary }>({
      url: '/api/v1/fitness/summary',
      signal,
      silent: true,
    })
  ).data;
  const day = (
    await apiRequest<{ data: Day }>({
      url: `/api/v1/fitness/days/${s.today}`,
      signal,
      silent: true,
    })
  ).data;
  const tasks: TodayTask[] = [];
  const plan = day.records['training-plan']?.data;
  if (plan)
    tasks.push({
      id: 'training',
      title: plan.rest ? '休息安排' : `今日训练 · ${plan.exercises.length} 个动作`,
      date: s.today,
      status:
        (
          {
            COMPLETED: '已完成',
            PARTIAL: '部分完成',
            SKIPPED: '已跳过',
            REST: '休息',
            PENDING: '待完成',
            UNPLANNED: '未安排',
          } as Record<string, string>
        )[day.trainingState] ?? day.trainingState,
      to: `/fitness?date=${s.today}`,
    });
  const meals = day.records['meal-plan']?.data;
  if (meals)
    tasks.push({
      id: 'meals',
      title: `今日食谱 · ${meals.foods.length} 项`,
      date: s.today,
      status: day.records.meals?.data ? '已记录' : '待记录',
      to: `/fitness/meals?date=${s.today}`,
    });
  return {
    message: day.checkedIn ? '今天已打卡' : '今天尚未打卡',
    tasks,
    next: {
      label: plan ? '查看今日记录' : '设置训练安排',
      to: plan ? `/fitness?date=${s.today}` : '/fitness/training',
    },
    metrics: [
      { label: '连续打卡', value: `${s.streak} 天` },
      {
        label: '最近体重',
        value: s.latestWeight?.data ? `${s.latestWeight.data.kg} kg` : '尚无记录',
      },
    ],
  };
}
export function Summary({ summary }: SummaryViewProps) {
  return (
    <p>
      {summary.metrics?.map((m) => `${m.label} ${m.value}`).join(' · ')} · {summary.message}
    </p>
  );
}
