import { createUuid } from '../utils/uuid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  completePlanTask,
  confirmReschedule,
  getPlan,
  listPlans,
  previewReschedule,
} from './generated/schedule/schedule';
import { getCatalog } from './generated/catalog/catalog';
import type { Plan, PlanTask, PreviewConfirm, RescheduleRequest } from './generated/models';
export const planKey = (id: string) => ['plan', id] as const;
export function usePlans(cycleId?: string, enabled = true) {
  return useQuery({
    queryKey: ['plans', cycleId],
    enabled,
    queryFn: async ({ signal }) => {
      const first = (await listPlans({ cycleId, page: 1, size: 100 }, { signal, silent: true }))
        .data;
      const items = [...first.items];
      for (let page = 2; items.length < first.total; page++) {
        const next = (await listPlans({ cycleId, page, size: 100 }, { signal, silent: true })).data;
        if (!next.items.length) throw new Error('计划列表已变化，请重新加载');
        items.push(...next.items);
      }
      return { ...first, items };
    },
  });
}
export function usePlan(id: string) {
  return useQuery({
    queryKey: planKey(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    queryFn: async ({ signal }) => (await getPlan(id, { signal, silent: true })).data,
  });
}
export function useTaskCompletion(planId: string) {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    networkMode: 'always',
    mutationFn: async ({ tasks, completed }: { tasks: PlanTask[]; completed: boolean }) => {
      // 接口没有批量完成命令：逐项提交，每次读取最新资源锁；中途失败后刷新真实状态。
      for (const requested of tasks) {
        const current = (await getPlan(planId, { silent: true })).data;
        const task = current.tasks.find((item) => item.id === requested.id);
        if (!task) throw new Error('任务已变化，请刷新计划');
        let expectedItemRevision: number | null = null;
        if (task.kind === 'ITEM') {
          const catalog = (await getCatalog(task.courseId, { silent: true })).data;
          const item = catalog.chapters
            .flatMap((chapter) => chapter.items)
            .find((item) => item.id === task.itemId);
          if (!item) throw new Error('关联目录条目暂不可用，请刷新后重试');
          expectedItemRevision = item.revision;
        }
        await completePlanTask(
          planId,
          task.id,
          {
            completed,
            expectedCompleted: task.completed,
            expectedItemRevision,
            baseRevision: current.revision,
            clientMutationId: createUuid(),
          },
          { silent: true },
        );
      }
    },
    onMutate: async ({ tasks, completed }) => {
      await client.cancelQueries({ queryKey: planKey(planId) });
      const previous = client.getQueryData<Plan>(planKey(planId));
      const ids = new Set(tasks.map((task) => task.id));
      client.setQueryData<Plan>(
        planKey(planId),
        (old) =>
          old && {
            ...old,
            tasks: old.tasks.map((task) => (ids.has(task.id) ? { ...task, completed } : task)),
          },
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) client.setQueryData(planKey(planId), context.previous);
    },
    onSettled: async () => {
      await client.invalidateQueries({
        predicate: (query) =>
          [
            'plan',
            'plans',
            'schedule',
            'catalog',
            'catalog-course',
            'course',
            'courses',
            'course-progress',
            'dashboard',
            'home',
            'home-aggregate',
          ].includes(String(query.queryKey[0])),
      });
    },
  });
}
export function useReschedulePreview(planId: string) {
  return useMutation({
    retry: false,
    networkMode: 'always',
    mutationFn: async (body: RescheduleRequest) =>
      (await previewReschedule(planId, body, { silent: true })).data,
  });
}
export function useRescheduleConfirm(planId: string) {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    networkMode: 'always',
    mutationFn: async ({ previewId, body }: { previewId: string; body: PreviewConfirm }) =>
      (await confirmReschedule(planId, previewId, body, { silent: true })).data,
    onSuccess: async () => {
      await client.invalidateQueries({
        predicate: (query) =>
          ['plan', 'plans', 'schedule', 'dashboard', 'home', 'home-aggregate'].includes(
            String(query.queryKey[0]),
          ),
      });
    },
  });
}
