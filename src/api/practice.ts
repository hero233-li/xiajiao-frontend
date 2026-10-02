import { useQuery, queryOptions } from '@tanstack/react-query';
import { getCourseByCode } from './generated/courses/courses';
import {
  getPracticeOverview,
  listQuestions,
  getQuestion,
  submitPracticeAnswer,
  saveQuestionMark,
} from './generated/practice/practice';
import type { AnswerWrite, ListQuestionsFilter, QuestionMarkWrite } from './generated/models';

export function usePracticeCourse(code: string, cycleId: string) {
  return useQuery({
    queryKey: ['practice-course', code, cycleId],
    enabled: !!code && !!cycleId,
    queryFn: async ({ signal }) =>
      (await getCourseByCode(code, { cycleId }, { signal, silent: true })).data,
  });
}
export function usePracticeOverview(courseId: string) {
  return useQuery({
    queryKey: ['practice-overview', courseId],
    enabled: !!courseId,
    queryFn: async ({ signal }) =>
      (await getPracticeOverview(courseId, { signal, silent: true })).data,
  });
}
export const questionOptions = (courseId: string, questionId: string) =>
  queryOptions({
    queryKey: ['practice-question', courseId, questionId],
    enabled: !!courseId && !!questionId,
    queryFn: async ({ signal }) =>
      (await getQuestion(courseId, questionId, { signal, silent: true })).data,
    staleTime: 30_000,
  });
export function usePracticeSequence(
  courseId: string,
  chapterId: string,
  filter: ListQuestionsFilter,
  version: number,
) {
  return useQuery({
    queryKey: ['practice-sequence', courseId, chapterId, filter, version],
    enabled: !!courseId && !!chapterId,
    queryFn: async ({ signal }) => {
      const first = (
        await listQuestions(
          courseId,
          { chapterId, filter, page: 1, size: 100 },
          { signal, silent: true },
        )
      ).data;
      const items = [...first.items];
      for (let page = 2; items.length < first.total; page++) {
        const next = (
          await listQuestions(
            courseId,
            { chapterId, filter, page, size: 100 },
            { signal, silent: true },
          )
        ).data;
        if (!next.items.length) throw new Error('题目列表发生变化，请重新加载');
        items.push(...next.items);
      }
      return { ...first, items };
    },
  });
}
export async function submitAnswer(
  courseId: string,
  questionId: string,
  body: AnswerWrite,
  key: string,
) {
  return (
    await submitPracticeAnswer(courseId, questionId, body, {
      headers: { 'Idempotency-Key': key },
      silent: true,
    })
  ).data;
}
export async function writeMark(courseId: string, questionId: string, body: QuestionMarkWrite) {
  return (await saveQuestionMark(courseId, questionId, body, { silent: true })).data;
}
