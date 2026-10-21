import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { getCourseByCode } from './generated/courses/courses';
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
