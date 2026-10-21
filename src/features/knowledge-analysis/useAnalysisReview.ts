import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  knowledgeAnalysisApi as api,
  type CardDetail,
  type ReviewState,
} from '../../api/knowledge-analysis';
import { ApiError, errorMessage } from '../../api/errors';
import { sessionStore } from '../../api/session';

type Draft = {
  note: string;
  reviewState: ReviewState;
  revision: number;
  dirty: boolean;
  saving: boolean;
  error: string;
  serverNote?: string;
};
// Memory only. One canonical draft and writer per card, including while its detail is unmounted.
const drafts = new Map<string, Draft>();
const listeners = new Set<() => void>();
let owner = '';
const emit = () => listeners.forEach((listener) => listener());
function isolate(userKey: string) {
  if (owner !== userKey) {
    drafts.clear();
    owner = userKey;
  }
}
sessionStore.subscribe(() => {
  const session = sessionStore.getSnapshot();
  isolate(`${session?.user.id ?? 'anonymous'}:${sessionStore.getEpoch()}`);
  emit();
});
if (typeof window !== 'undefined')
  window.addEventListener('beforeunload', (event) => {
    if ([...drafts.values()].some((draft) => draft.dirty || draft.saving)) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export function useAnalysisReview(card: CardDetail, userKey: string) {
  isolate(userKey);
  const key = `${userKey}:${card.id}`;
  if (!drafts.has(key))
    drafts.set(key, {
      note: card.note,
      reviewState: card.reviewState,
      revision: card.revision,
      dirty: false,
      saving: false,
      error: '',
    });
  const fallback = drafts.get(key)!;
  const draft = useSyncExternalStore(subscribe, () => drafts.get(key) ?? fallback);
  const client = useQueryClient();
  const update = useCallback((value: Partial<Draft>) => {
    if (owner !== userKey || !drafts.has(key)) return;
    drafts.set(key, { ...drafts.get(key)!, ...value });
    emit();
  }, [key, userKey]);
  useEffect(() => {
    const current = drafts.get(key);
    if (
      current &&
      !current.dirty &&
      !current.saving &&
      (current.revision !== card.revision ||
        current.note !== card.note ||
        current.reviewState !== card.reviewState)
    ) {
      update({
        note: card.note,
        reviewState: card.reviewState,
        revision: card.revision,
        error: '',
      });
    }
  }, [card.note, card.reviewState, card.revision, key, update]);
  const edit = (value: Partial<Pick<Draft, 'note' | 'reviewState'>>) =>
    update({ ...value, dirty: true });
  async function save() {
    const initial = drafts.get(key);
    if (!initial || initial.saving || !initial.dirty || owner !== userKey) return;
    update({ saving: true });
    try {
      // Drain edits that arrive during a preceding write, using its returned revision.
      while (owner === userKey && drafts.get(key)?.dirty) {
        const sent = { ...drafts.get(key)! };
        const result = await api.review(card.id, {
          expectedRevision: sent.revision,
          note: sent.note,
          reviewState: sent.reviewState,
        });
        if (owner !== userKey) return;
        const current = drafts.get(key)!;
        const changed = current.note !== sent.note || current.reviewState !== sent.reviewState;
        update({ revision: result.revision, dirty: changed, error: '', serverNote: undefined });
        client.setQueryData(['knowledge-analysis', userKey, 'card', card.id], result);
        void client.invalidateQueries({ queryKey: ['knowledge-analysis', userKey, 'cards'] });
        void client.invalidateQueries({ queryKey: ['knowledge-analysis', userKey, 'overview'] });
      }
    } catch (error) {
      if (owner !== userKey) return;
      if (error instanceof ApiError && error.status === 409) {
        try {
          const fresh = await api.card(card.id);
          update({
            revision: fresh.revision,
            dirty: true,
            serverNote: fresh.note,
            error: '记录已在别处更新。本地草稿已保留，请对照最新笔记后再次保存。',
          });
        } catch {
          update({
            dirty: true,
            error: '发生版本冲突，暂时无法读取最新版本。草稿已保留，请重试。',
          });
        }
      } else update({ dirty: true, error: `保存失败，草稿已保留。${errorMessage(error)}` });
    } finally {
      update({ saving: false });
    }
  }
  return { draft, saving: draft.saving, edit, save };
}
