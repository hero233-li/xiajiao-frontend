import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCourseByCode } from './generated/courses/courses';
import { listCycles } from './generated/exams/exams';
import {
  downloadCourseResource,
  getExampleSolution,
  getKnowledge,
  listKnowledge,
  saveKnowledgeNote,
} from './generated/catalog/catalog';
import type { KnowledgePage, KnowledgeNoteWrite, ListKnowledgeParams } from './generated/models';

export const knowledgeDetailKey = (courseId: string, moduleId: string) =>
  ['knowledge-detail', courseId, moduleId] as const;
export function useKnowledgeCourse(code: string, cycleId: string) {
  return useQuery({
    queryKey: ['knowledge-course', code, cycleId],
    enabled: !!code && !!cycleId,
    queryFn: async ({ signal }) =>
      (await getCourseByCode(code, { cycleId }, { signal, silent: true })).data,
  });
}
export function useKnowledgeCycles(page: number, enabled: boolean) {
  return useQuery({
    queryKey: ['knowledge-cycles', page],
    enabled,
    queryFn: async ({ signal }) =>
      (await listCycles({ page, size: 20 }, { signal, silent: true })).data,
  });
}
export function useKnowledgeList(courseId: string, params: ListKnowledgeParams) {
  return useQuery({
    queryKey: ['knowledge-list', courseId, params],
    enabled: !!courseId,
    queryFn: async ({ signal }) =>
      (await listKnowledge(courseId, params, { signal, silent: true })).data,
  });
}
export function useKnowledgeDetail(courseId: string, moduleId: string) {
  return useQuery({
    queryKey: knowledgeDetailKey(courseId, moduleId),
    enabled: !!courseId && !!moduleId,
    queryFn: async ({ signal }) =>
      (await getKnowledge(courseId, moduleId, { signal, silent: true })).data,
  });
}
// 仅在用户展开后挂载观察者；收起后不保留受保护解答缓存。
export function useKnowledgeSolution(courseId: string, exampleId: string) {
  return useQuery({
    queryKey: ['knowledge-solution', courseId, exampleId],
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) =>
      (await getExampleSolution(courseId, exampleId, { signal, silent: true })).data,
  });
}
export function useKnowledgeWrite(courseId: string, moduleId: string) {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async (body: KnowledgeNoteWrite) =>
      (await saveKnowledgeNote(courseId, moduleId, body, { silent: true })).data,
    onSuccess: (module) => {
      client.setQueryData(knowledgeDetailKey(courseId, moduleId), module);
      client.setQueriesData<KnowledgePage>(
        { queryKey: ['knowledge-list', courseId] },
        (old) =>
          old && {
            ...old,
            items: old.items.map((item) => (item.id === module.id ? module : item)),
          },
      );
    },
  });
}
export function useKnowledgeRefresh(courseId: string, moduleId: string) {
  return useMutation({
    retry: false,
    mutationFn: async () => (await getKnowledge(courseId, moduleId, { silent: true })).data,
  });
}
export function useKnowledgeDownload(courseId: string, fileId: string) {
  return useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async () => (await downloadCourseResource(courseId, fileId, { silent: true })).data,
  });
}
