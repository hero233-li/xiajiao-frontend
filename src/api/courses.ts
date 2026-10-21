import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { getCourseByCode, listCourses } from './generated/courses/courses';
import { sessionStore } from './session';

export function useCourseByCode(code: string, cycleId: string) {
  const session = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot);
  return useQuery({
    queryKey: ['course', session?.user.id, code, cycleId],
    enabled: !!code && !!cycleId,
    queryFn: async ({ signal }) =>
      (await getCourseByCode(code, { cycleId }, { signal, silent: true })).data,
  });
}

export function useMyCourses(cycleId?: string) {
  return useQuery({
    queryKey: ['my-courses', cycleId],
    enabled: !!cycleId,
    queryFn: async ({ signal }) =>
      (await listCourses({ cycleId: cycleId!, size: 100 }, { signal, silent: true })).data,
  });
}
