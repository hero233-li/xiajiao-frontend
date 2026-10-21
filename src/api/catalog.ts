import { invalidateImpact } from './invalidation';
import { createUuid } from '../utils/uuid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
export { useCourseByCode as useCatalogCourse } from './course-detail';
import { completeCatalogBatch, completeCatalogItem, getCatalog } from './generated/catalog/catalog';
import type { BatchCompletionWrite, Catalog, CatalogItem } from './generated/models';

export const catalogKey = (courseId: string) => ['catalog', courseId] as const;
export function useCatalog(courseId: string) {
  return useQuery({
    queryKey: catalogKey(courseId),
    enabled: !!courseId,
    queryFn: async ({ signal }) => (await getCatalog(courseId, { signal, silent: true })).data,
  });
}
// 汇总只采用服务端返回；乐观更新仅改变条目勾选，不累计进度或修订号。
export function useCatalogCompletion(courseId: string) {
  const client = useQueryClient();
  const key = catalogKey(courseId);
  return useMutation({
    retry: false,
    mutationFn: async (write: BatchCompletionWrite) => {
      if (write.updates.length === 1) {
        const update = write.updates[0];
        const result = (
          await completeCatalogItem(
            courseId,
            update.itemId,
            {
              completed: update.completed,
              expectedRevision: update.expectedRevision,
              clientMutationId: write.clientMutationId,
            },
            { silent: true },
          )
        ).data;
        return { ...result, items: [result.item] };
      }
      return (await completeCatalogBatch(courseId, write, { silent: true })).data;
    },
    onMutate: async (write) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<Catalog>(key);
      client.setQueryData<Catalog>(
        key,
        (old) =>
          old && {
            ...old,
            chapters: old.chapters.map((chapter) => ({
              ...chapter,
              items: chapter.items.map((item) => {
                const update = write.updates.find((update) => update.itemId === item.id);
                return update ? { ...item, completed: update.completed } : item;
              }),
            })),
          },
      );
      return { previous };
    },
    onError: (_error, _write, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
    },
    onSuccess: (result) => {
      client.setQueryData<Catalog>(
        key,
        (old) =>
          old && {
            ...old,
            courseProgress: result.courseProgress,
            overallProgress: result.overallProgress,
            asOf: result.asOf,
            chapters: old.chapters.map((chapter) => ({
              ...chapter,
              items: chapter.items.map(
                (item) => result.items.find((saved) => saved.id === item.id) ?? item,
              ),
            })),
          },
      );
    },
    onSettled: () => invalidateImpact(client, 'completion'),
  });
}
export function completionUpdates(items: CatalogItem[], completed: boolean): BatchCompletionWrite {
  return {
    clientMutationId: createUuid(),
    updates: items.map((item) => ({
      itemId: item.id,
      completed,
      expectedRevision: item.revision,
    })),
  };
}
