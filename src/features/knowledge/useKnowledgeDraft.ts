import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useKnowledgeRefresh, useKnowledgeWrite } from '../../api/knowledge';
import type { KnowledgeModule, KnowledgeModuleUserNote } from '../../api/generated/models';
import { errorMessage } from '../../api/errors';

/** 掌握程度和笔记共用一个带修订号的写入队列，响应不会覆盖后续输入。 */
export function useKnowledgeDraft(courseId: string, module: KnowledgeModule) {
  const client = useQueryClient();
  useEffect(() => {
    // 未保存草稿不随普通查询的回收时限消失；登录切换仍清空整个缓存。
    client.setQueryDefaults(['knowledge-draft'], { gcTime: Infinity });
  }, [client]);
  const draftKey = ['knowledge-draft', courseId, module.id] as const;
  const initial = useRef(client.getQueryData<KnowledgeModuleUserNote>(draftKey) || module.userNote);
  const write = useKnowledgeWrite(courseId, module.id);
  const refresh = useKnowledgeRefresh(courseId, module.id);
  const [draft, setDraft] = useState(initial.current);
  const [status, setStatus] = useState<'saved' | 'waiting' | 'saving' | 'error'>(
    initial.current === module.userNote ? 'saved' : 'waiting',
  );
  const [error, setError] = useState('');
  const current = useRef(initial.current);
  const saved = useRef(module.userNote);
  const busy = useRef(false);
  const failed = useRef(false);
  const wanted = useRef(false);
  const mounted = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const writeFn = useRef(write.mutateAsync);
  const refreshFn = useRef(refresh.mutateAsync);
  useEffect(() => {
    writeFn.current = write.mutateAsync;
    refreshFn.current = refresh.mutateAsync;
  });
  const commitRef = useRef<() => Promise<void>>(async () => {});

  async function commit() {
    wanted.current = true;
    if (busy.current) return;
    failed.current = false;
    busy.current = true;
    try {
      while (wanted.current) {
        wanted.current = false;
        const snapshot = current.current;
        if (snapshot.note === saved.current.note && snapshot.mastery === saved.current.mastery) {
          client.removeQueries({ queryKey: draftKey, exact: true });
          if (mounted.current) {
            setDraft(saved.current);
            setStatus('saved');
            setError('');
          }
          continue;
        }
        if (mounted.current) {
          setStatus('saving');
          setError('');
        }
        const result = await writeFn.current({
          mastery: snapshot.mastery,
          note: snapshot.note,
          expectedRevision: saved.current.revision,
        });
        saved.current = result.userNote;
        const cached = client.getQueryData<KnowledgeModuleUserNote>(draftKey);
        if (cached?.note === snapshot.note && cached.mastery === snapshot.mastery)
          client.removeQueries({ queryKey: draftKey, exact: true });
        if (
          current.current.note === snapshot.note &&
          current.current.mastery === snapshot.mastery
        ) {
          current.current = result.userNote;
          if (mounted.current) {
            setDraft(result.userNote);
            setStatus('saved');
          }
        } else if (mounted.current) setStatus('waiting');
      }
    } catch (cause) {
      failed.current = true;
      wanted.current = false;
      // 未确认成功时保留草稿，暂停自动重试；重试先获取服务器修订号。
      if (timer.current) clearTimeout(timer.current);
      if (mounted.current) {
        setStatus('error');
        setError(errorMessage(cause));
      }
    } finally {
      busy.current = false;
    }
  }
  useEffect(() => {
    commitRef.current = commit;
  });
  useEffect(() => {
    mounted.current = true;
    if (
      current.current.note !== saved.current.note ||
      current.current.mastery !== saved.current.mastery
    )
      timer.current = setTimeout(() => void commitRef.current(), 1000);
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      // 切换模块时立即提交未完成的防抖草稿；进行中的请求仍串行完成。
      if (
        !failed.current &&
        (current.current.note !== saved.current.note ||
          current.current.mastery !== saved.current.mastery)
      )
        void commitRef.current();
    };
  }, []);

  function edit(note: string) {
    // 与 OpenAPI maxLength 一致，按 Unicode 码点计数，避免把一个字符拆开。
    if (Array.from(note).length > 10000) return;
    failed.current = false;
    current.current = { ...current.current, note };
    client.setQueryData(draftKey, current.current);
    setDraft(current.current);
    setStatus('waiting');
    setError('');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void commitRef.current(), 1000);
  }
  function selectMastery(mastery: number) {
    failed.current = false;
    current.current = { ...current.current, mastery };
    client.setQueryData(draftKey, current.current);
    setDraft(current.current);
    if (timer.current) clearTimeout(timer.current);
    void commitRef.current();
  }
  async function retry() {
    if (busy.current) return;
    busy.current = true;
    setStatus('saving');
    setError('');
    try {
      const latest = await refreshFn.current();
      saved.current = latest.userNote;
    } catch (cause) {
      setStatus('error');
      setError(errorMessage(cause));
      busy.current = false;
      return;
    }
    busy.current = false;
    await commitRef.current();
  }
  return { draft, status, error, edit, selectMastery, retry };
}
