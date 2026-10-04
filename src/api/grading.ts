import { apiClient } from './http';
import type {
  LocalSubmission,
  LocalPage,
  LocalPoint,
  LocalQuestion,
  LocalRubricDocument,
  LocalRubric,
  LocalAnswer,
  LocalResult,
  LocalTask,
  LocalWorker,
  LocalApply,
} from './generated/models';
export type GradingPage = LocalPage;
export type Submission = LocalSubmission;
export type RubricPoint = LocalPoint;
export type RubricQuestion = LocalQuestion;
export type RubricDocument = LocalRubricDocument;
export type Rubric = LocalRubric;
export type AnswerResult = LocalAnswer;
export type GradingResult = LocalResult;
export type GradingTask = LocalTask;
export type GradingWorker = LocalWorker;
export type PracticeInfo = LocalApply;
export async function gradingRequest<T>(
  method: string,
  path: string,
  data?: unknown,
  params?: Record<string, unknown>,
): Promise<T> {
  const res = await apiClient.request<{ data: T }>({
    method,
    url: '/api/v1/grading' + path,
    data,
    params,
  });
  return res.data.data;
}
