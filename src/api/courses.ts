import { useQuery } from '@tanstack/react-query';
import { listCourses } from './generated/courses/courses';

export function useMyCourses(cycleId?: string) {
  return useQuery({
    queryKey: ['my-courses', cycleId],
    enabled: !!cycleId,
    queryFn: async ({ signal }) =>
      (await listCourses({ cycleId: cycleId!, size: 100 }, { signal, silent: true })).data,
  });
}
