import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/http';
import { useAuth } from '../hooks/useAuth';
import type { Directory, Preference } from './types';
export function useSpaces() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['space-directory', user?.id],
    queryFn: async ({ signal }) =>
      (
        await apiRequest<{ data: Directory }>({
          url: '/api/v1/personal/spaces',
          signal,
          silent: true,
        })
      ).data,
    staleTime: 30000,
  });
}
export function useSpacePreference() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (p: Preference) =>
      (
        await apiRequest<{ data: Preference }>({
          url: `/api/v1/personal/spaces/${p.spaceId}/preference`,
          method: 'PUT',
          data: {
            joined: p.joined,
            favorite: p.favorite,
            hidden: p.hidden,
            position: p.position,
            expectedRevision: p.revision,
          },
          silent: true,
        })
      ).data,
    onSuccess: () => client.invalidateQueries({ queryKey: ['space-directory'] }),
    onError: () => client.invalidateQueries({ queryKey: ['space-directory'] }),
  });
}
export async function recordVisit(id: string, path: string) {
  return apiRequest({
    url: `/api/v1/personal/spaces/${id}/visit`,
    method: 'POST',
    data: { path },
    silent: true,
  });
}

export function useSpaceOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (preferences: Preference[]) =>
      apiRequest({
        url: '/api/v1/personal/spaces/order',
        method: 'PUT',
        data: {
          items: preferences.map((p) => ({ spaceId: p.spaceId, expectedRevision: p.revision })),
        },
        silent: true,
      }),
    onSettled: () => client.invalidateQueries({ queryKey: ['space-directory'] }),
  });
}
