import { useQuery } from '@tanstack/react-query';
import { getDashboard } from './generated/dashboard/dashboard';
import { listCycles } from './generated/exams/exams';
import type { GetDashboardParams } from './generated/models';

export function useDashboard(params: GetDashboardParams | undefined) {
  return useQuery({
    queryKey: ['dashboard', params],
    enabled: !!params,
    queryFn: async ({ signal }) => (await getDashboard(params!, { signal, silent: true })).data,
  });
}
export function useExamCycles(page: number) {
  return useQuery({
    queryKey: ['exam-cycles', page],
    queryFn: async ({ signal }) =>
      (await listCycles({ page, size: 20 }, { signal, silent: true })).data,
  });
}
