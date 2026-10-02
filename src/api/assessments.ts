import { useMutation, useQuery } from '@tanstack/react-query';
import { getCourseByCode } from './generated/courses/courses';
import {
  getAssessment,
  getAssessmentResult,
  saveAssessmentAnswer,
  submitAssessment,
} from './generated/practice/practice';
import type {
  AssessmentAnswerWrite,
  AssessmentSubmit,
  AssessmentSession,
} from './generated/models';
import { sessionStore } from './session';

export function useAssessmentCourse(code: string, cycleId: string) {
  return useQuery({
    queryKey: ['assessment-course', sessionStore.getSnapshot()?.user.id, code, cycleId],
    enabled: !!code && !!cycleId,
    queryFn: async ({ signal }) =>
      (await getCourseByCode(code, { cycleId }, { signal, silent: true })).data,
  });
}
export function useAssessmentSession(courseId: string, sessionId: string) {
  return useQuery<{ session: AssessmentSession; measuredAt: number }>({
    queryKey: ['assessment-session', sessionStore.getSnapshot()?.user.id, courseId, sessionId],
    enabled: !!courseId && !!sessionId && sessionId !== 'new',
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.session.status === 'IN_PROGRESS' ? 10000 : false,
    refetchIntervalInBackground: true,
    queryFn: async ({ signal }) => ({
      session: (await getAssessment(courseId, sessionId, { signal, silent: true })).data,
      measuredAt: performance.now(),
    }),
  });
}
export function useAssessmentResult(
  courseId: string,
  sessionId: string,
  cycleId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      'assessment-result',
      sessionStore.getSnapshot()?.user.id,
      courseId,
      sessionId,
      cycleId,
    ],
    enabled: enabled && !!cycleId,
    retry: false,
    queryFn: async ({ signal }) =>
      (await getAssessmentResult(courseId, sessionId, { cycleId }, { signal, silent: true })).data,
  });
}
export function useSaveAssessment(courseId: string, sessionId: string) {
  return useMutation({
    mutationFn: async ({
      revisionId,
      answer,
    }: {
      revisionId: string;
      answer: AssessmentAnswerWrite;
    }) =>
      (await saveAssessmentAnswer(courseId, sessionId, revisionId, answer, { silent: true })).data,
  });
}
export function useSubmitAssessment(courseId: string, sessionId: string, cycleId: string) {
  return useMutation({
    mutationFn: async (body: AssessmentSubmit) =>
      (await submitAssessment(courseId, sessionId, body, { cycleId }, { silent: true })).data,
  });
}
