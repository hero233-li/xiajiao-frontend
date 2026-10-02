import type { Query, QueryClient } from '@tanstack/react-query';

// 只刷新服务端资源，不在客户端推算进度、解锁或预测。
const courseKeys = ['course', 'courses', 'course-progress', 'catalog-course', 'practice-course', 'assessment-course', 'exam-course', 'knowledge-course', 'manual-course'];
const aggregateKeys = ['dashboard', 'home', 'home-aggregate'];
const planKeys = ['schedule', 'plan', 'plans'];
const groups = {
  completion: [...courseKeys, ...aggregateKeys, ...planKeys, 'catalog', 'manual'],
  practice: ['practice-overview', 'practice-wrong', 'practice-sequence', 'practice-question', ...aggregateKeys],
  mark: ['practice-sequence', 'practice-wrong', 'practice-question'],
  assessment: ['assessment-session', 'assessment-result', 'practice-overview', 'exams', ...courseKeys, ...aggregateKeys],
  score: ['exams', ...courseKeys, ...aggregateKeys],
  reschedule: [...planKeys, ...aggregateKeys],
} as const;
export type MutationImpact = keyof typeof groups;
export function affectedQuery(impact: MutationImpact, query: Pick<Query, 'queryKey'>) {
  const key = String(query.queryKey[0]);
  if ((groups[impact] as readonly string[]).includes(key)) return true;
  if (['completion', 'score', 'assessment'].includes(impact) && key === 'notes' && query.queryKey[2] === 'courses') return true;
  if (!key.startsWith('/api/v1/')) return false;
  const paths: Record<MutationImpact, RegExp> = {
    completion: /^\/api\/v1\/(courses|dashboard|home|plans)(\/|$)/,
    practice: /^\/api\/v1\/(courses\/[^/]+\/(practice|questions)|dashboard)(\/|$)/,
    mark: /^\/api\/v1\/courses\/[^/]+\/questions(\/|$)/,
    assessment: /^\/api\/v1\/(courses|dashboard)(\/|$)/,
    score: /^\/api\/v1\/(courses|dashboard)(\/|$)/,
    reschedule: /^\/api\/v1\/(plans|dashboard)(\/|$)/,
  };
  return paths[impact].test(key);
}
export function invalidateImpact(client: QueryClient, impact: MutationImpact) {
  return client.invalidateQueries({ predicate: query => affectedQuery(impact, query) });
}
