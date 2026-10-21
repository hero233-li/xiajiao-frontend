import { apiRequest } from './http';

export type ReviewState = 'PENDING' | 'REVIEWED' | 'VERIFYING';
export type AnalysisState = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'STALE';
export interface AnalysisCourse {
  id: string;
  code: string;
  name: string;
}
export interface AnalysisOverview {
  courses: AnalysisCourse[];
  stats: { total: number; pending: number; repeated: number; reviewed: number };
  workerOnline: boolean;
  workerReason: string;
}
export interface CardSummary {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  pointKey: string;
  pointTitle: string;
  chapterTitle: string;
  title: string;
  issueType: 'ERROR' | 'OMISSION' | 'WEAKNESS' | 'UNCERTAIN';
  errorCategory: 'CONCEPT' | 'METHOD' | 'CALCULATION' | 'READING' | 'EXPRESSION' | 'UNKNOWN';
  confidence: 'SUPPORTED' | 'INFERRED';
  summary: string;
  occurrences: number;
  lostPoints: number;
  reviewState: ReviewState;
  analysisState: AnalysisState;
  updatedAt: string;
  revision: number;
}
export interface Evidence {
  id: string;
  sourceType: 'GRADING' | 'BANK_ATTEMPT' | 'BANK_SESSION';
  sourceId: string;
  questionId: string;
  questionNumber: string;
  stem: string;
  answer: string;
  referenceAnswer: string;
  earned: number;
  maximum: number;
  reasons: string[];
  pages: number[];
  occurredAt: string;
  sourceUrl: string;
  pointKey: string;
  pointTitle: string;
}
export interface CardDetail extends CardSummary {
  knowledge: string;
  steps: string[];
  pitfalls: string[];
  checklist: string[];
  selfTest: string;
  selfTestAnswer: string;
  note: string;
  model: string | null;
  evidence: Evidence[];
}
export interface TaskSummary {
  id: string;
  courseId: string;
  cardId: string | null;
  state: AnalysisState;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CardsPage {
  items: CardSummary[];
  page: number;
  size: number;
  total: number;
}
export interface CardFilters {
  courseId?: string;
  q?: string;
  reviewState?: ReviewState;
  page?: number;
  size?: number;
}
export interface ReviewWrite {
  expectedRevision: number;
  reviewState: ReviewState;
  note: string;
}
export interface SyncResult {
  queued: number;
  unchanged: number;
  skipped: number;
}
const base = '/api/v1/knowledge-analysis';
async function request<T>(
  path: string,
  method = 'GET',
  data?: unknown,
  params?: object,
  signal?: AbortSignal,
): Promise<T> {
  return (
    await apiRequest<{ data: T }>({
      url: `${base}${path}`,
      method,
      data,
      params,
      signal,
      silent: true,
    })
  ).data;
}
export const knowledgeAnalysisApi = {
  overview: (courseId?: string, signal?: AbortSignal) =>
    request<AnalysisOverview>('/overview', 'GET', undefined, { courseId }, signal),
  cards: (filters: CardFilters, signal?: AbortSignal) =>
    request<CardsPage>('/cards', 'GET', undefined, { page: 1, size: 20, ...filters }, signal),
  card: (id: string, signal?: AbortSignal) =>
    request<CardDetail>(`/cards/${encodeURIComponent(id)}`, 'GET', undefined, undefined, signal),
  review: (id: string, body: ReviewWrite) =>
    request<CardDetail>(`/cards/${encodeURIComponent(id)}/review`, 'PUT', body),
  tasks: (courseId?: string, signal?: AbortSignal) =>
    request<TaskSummary[]>('/tasks', 'GET', undefined, { courseId }, signal),
  sync: (courseId: string | null) => request<SyncResult>('/sync', 'POST', { courseId }),
  retry: (id: string) => request<TaskSummary>(`/tasks/${encodeURIComponent(id)}/retry`, 'POST'),
};
