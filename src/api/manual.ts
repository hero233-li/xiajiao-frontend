import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getManual, completeCatalogItem } from './generated/catalog/catalog';
import { catalogKey } from './catalog';
import type { Catalog, CatalogItem, CompletionWrite, Manual } from './generated/models';

export const manualKey = (courseId: string) => ['manual', courseId] as const;
export function useManual(courseId: string) {
  return useQuery({
    queryKey: manualKey(courseId),
    enabled: !!courseId,
    staleTime: 0,
    queryFn: async ({ signal }) => (await getManual(courseId, { signal, silent: true })).data,
  });
}
export function useManualCompletion(courseId: string) {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async ({ itemId, write }: { itemId: CatalogItem['id']; write: CompletionWrite }) =>
      (await completeCatalogItem(courseId, itemId, write, { silent: true })).data,
    onMutate: async ({ itemId, write }) => {
      await Promise.all([
        client.cancelQueries({ queryKey: manualKey(courseId) }),
        client.cancelQueries({ queryKey: catalogKey(courseId) }),
      ]);
      const manual = client.getQueryData<Manual>(manualKey(courseId));
      const catalog = client.getQueryData<Catalog>(catalogKey(courseId));
      client.setQueryData<Manual>(
        manualKey(courseId),
        (old) =>
          old && {
            ...old,
            sections: old.sections.map((section) => ({
              ...section,
              exercises: section.exercises.map((exercise) =>
                exercise.item.id === itemId
                  ? { ...exercise, item: { ...exercise.item, completed: write.completed } }
                  : exercise,
              ),
            })),
          },
      );
      client.setQueryData<Catalog>(
        catalogKey(courseId),
        (old) =>
          old && {
            ...old,
            chapters: old.chapters.map((chapter) => ({
              ...chapter,
              items: chapter.items.map((item) =>
                item.id === itemId ? { ...item, completed: write.completed } : item,
              ),
            })),
          },
      );
      return { manual, catalog };
    },
    onError: (_error, _variables, context) => {
      if (context?.manual) client.setQueryData(manualKey(courseId), context.manual);
      if (context?.catalog) client.setQueryData(catalogKey(courseId), context.catalog);
    },
    onSuccess: (result) => {
      client.setQueryData<Manual>(
        manualKey(courseId),
        (old) =>
          old && {
            ...old,
            sections: old.sections.map((section) => ({
              ...section,
              exercises: section.exercises.map((exercise) =>
                exercise.item.id === result.item.id ? { ...exercise, item: result.item } : exercise,
              ),
            })),
          },
      );
      client.setQueryData<Catalog>(
        catalogKey(courseId),
        (old) =>
          old && {
            ...old,
            courseProgress: result.courseProgress,
            overallProgress: result.overallProgress,
            asOf: result.asOf,
            chapters: old.chapters.map((chapter) => ({
              ...chapter,
              items: chapter.items.map((item) => (item.id === result.item.id ? result.item : item)),
            })),
          },
      );
    },
    onSettled: () =>
      client.invalidateQueries({
        predicate: (query) => {
          const name = String(query.queryKey[0]);
          return (
            [
              'manual',
              'catalog',
              'catalog-course',
              'course',
              'courses',
              'course-progress',
              'dashboard',
              'home',
              'home-aggregate',
              'personal-home',
              'schedule',
              'plan',
              'plans',
            ].includes(name) ||
            /^\/api\/v1\/(catalog|courses|dashboard|home|schedule|plans)(\/|$)/.test(name)
          );
        },
      }),
  });
}
