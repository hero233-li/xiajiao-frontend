import { useMutation, useQuery } from '@tanstack/react-query';
import { getCourseByCode } from './generated/courses/courses';
import { listCycles } from './generated/exams/exams';
import { applyAssessment, getPracticeOverview, listQuestions } from './generated/practice/practice';
import type {
  AssessmentApply,
  ApplyAssessmentParams,
  ListQuestionsParams,
} from './generated/models';

export function usePracticeCourse(code: string, cycleId: string) {
  return useQuery({
    queryKey: ['practice-course', code, cycleId],
    enabled: !!code && !!cycleId,
    queryFn: async ({ signal }) =>
      (await getCourseByCode(code, { cycleId }, { signal, silent: true })).data,
  });
}
export function usePracticeOverview(courseId: string | undefined) {
  return useQuery({
    queryKey: ['practice-overview', courseId],
    enabled: !!courseId,
    queryFn: async ({ signal }) =>
      (await getPracticeOverview(courseId!, { signal, silent: true })).data,
  });
}
export function useWrongQuestions(courseId: string, page: number) {
  const params: ListQuestionsParams = { filter: 'WRONG', page, size: 20 };
  return useQuery({
    queryKey: ['practice-wrong', courseId, params],
    queryFn: async ({ signal }) =>
      (await listQuestions(courseId, params, { signal, silent: true })).data,
  });
}
export function useAssessmentCycles(page: number) {
  return useQuery({
    queryKey: ['practice-cycles', page],
    queryFn: async ({ signal }) =>
      (await listCycles({ page, size: 20 }, { signal, silent: true })).data,
  });
}
export function useApplyChapterAssessment(courseId: string) {
  return useMutation({
    retry: false,
    mutationFn: async (request: {
      body: AssessmentApply;
      params: ApplyAssessmentParams;
      key: string;
    }) =>
      (
        await applyAssessment(courseId, request.body, request.params, {
          silent: true,
          headers: { 'Idempotency-Key': request.key },
        })
      ).data,
  });
}
