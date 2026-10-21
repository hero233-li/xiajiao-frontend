import type { PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { expect, it } from 'vitest';
import { createQueryClient } from '../app/queryClient';
import { server } from '../mocks/server';
import { useCourseByCode } from './courses';
import { useCatalogCourse } from './catalog';
import { useKnowledgeCourse } from './knowledge';
import { usePracticeCourse } from './practice';
import { usePracticeCourse as useSelectionCourse } from './practice-selection';
import { useAssessmentCourse } from './assessments';
import { useExamCourse } from './exams';
import { sessionStore } from './session';
import { invalidateImpact } from './invalidation';
import type { Course } from './generated/models';

function wrapperFor(client = createQueryClient()) {
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
function course(name: string): Course {
  return {
    id: 'course', code: '00023', name, courseType: 'THEORY', active: true,
    releaseId: null, enrollment: null,
    progress: { completedItems: 0, totalItems: 1, percent: 0 },
    capabilities: { catalog: true, knowledge: true, practice: true, exams: true, manual: true },
  };
}
function signIn(id: string) {
  sessionStore.start({
    accessToken: id, refreshToken: 'refresh', tokenType: 'Bearer',
    expiresAt: '2026-10-21T12:00:00Z', refreshExpiresAt: '2026-10-22T12:00:00Z',
    user: { id, username: id, role: 'USER', email: `${id}@example.test` },
  });
}
it('shares one request across course frame, knowledge, practice, selection, assessment and exam consumers', async () => {
  const requests: string[] = [];
  server.use(http.get('/api/v1/courses/by-code/:code', ({ request, params }) => {
    requests.push(`${params.code}:${new URL(request.url).searchParams.get('cycleId')}`);
    return HttpResponse.json({ code: 0, message: 'ok', data: course('高等数学') });
  }));
  const { result } = renderHook(() => [
    useCatalogCourse('00023', 'cycle'), useKnowledgeCourse('00023', 'cycle'),
    usePracticeCourse('00023', 'cycle'), useSelectionCourse('00023', 'cycle'),
    useAssessmentCourse('00023', 'cycle'), useExamCourse('00023', 'cycle'),
  ], { wrapper: wrapperFor() });
  await waitFor(() => expect(result.current.every((query) => query.isSuccess)).toBe(true));
  expect(requests).toEqual(['00023:cycle']);
  expect(result.current.map((query) => query.data?.name)).toEqual(Array(6).fill('高等数学'));
});

it('switches query ownership immediately instead of displaying another account’s cached course', async () => {
  signIn('one');
  server.use(http.get('/api/v1/courses/by-code/:code', ({ request }) =>
    HttpResponse.json({ code: 0, message: 'ok', data: course(request.headers.get('Authorization')!) }),
  ));
  const client = createQueryClient();
  const { result } = renderHook(() => useCourseByCode('00023', 'cycle'), { wrapper: wrapperFor(client) });
  await waitFor(() => expect(result.current.data?.name).toBe('Bearer one'));
  act(() => signIn('two'));
  expect(result.current.data).toBeUndefined();
  await waitFor(() => expect(result.current.data?.name).toBe('Bearer two'));
  expect(client.getQueryData<Course>(['course', 'one', '00023', 'cycle'])?.name).toBe('Bearer one');
});

it.each(['completion', 'score', 'assessment'] as const)('%s refreshes both course detail and the shared course list', async (impact) => {
  const client = createQueryClient();
  const detail = ['course', 'one', '00023', 'cycle'];
  const list = ['my-courses', 'cycle'];
  const unrelated = ['fitness', 'summary'];
  for (const key of [detail, list, unrelated]) client.setQueryData(key, {});
  await invalidateImpact(client, impact);
  expect(client.getQueryState(detail)?.isInvalidated).toBe(true);
  expect(client.getQueryState(list)?.isInvalidated).toBe(true);
  expect(client.getQueryState(unrelated)?.isInvalidated).toBe(false);
});
