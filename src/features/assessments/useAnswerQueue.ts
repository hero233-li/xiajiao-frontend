import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssessmentSession, AssessmentAnswerWrite } from '../../api/generated/models';
import { useSaveAssessment } from '../../api/assessments';
import { sessionStore } from '../../api/session';
import { ApiError, errorMessage } from '../../api/errors';

// Only UI drafts are persisted. Answer keys and explanations never enter this store.
type Drafts = Record<string, AssessmentAnswerWrite>;
export function useAnswerQueue(session: AssessmentSession) {
  const key = `assessment-drafts:${sessionStore.getSnapshot()?.user.id}:${session.id}`;
  const [storageError, setStorageError] = useState('');
  const [drafts, setDrafts] = useState<Drafts>(() => {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(key) ?? '{}');
      if (!raw || typeof raw !== 'object') return {};
      const valid: Drafts = {};
      for (const row of session.questions) {
        const item = (raw as Drafts)[row.question.revisionId];
        if (
          item &&
          Number.isInteger(item.selectedOption) &&
          item.selectedOption >= 0 &&
          item.selectedOption < row.question.options.length &&
          (item.expectedSavedAt === null || typeof item.expectedSavedAt === 'string')
        )
          valid[row.question.revisionId] = item;
      }
      return valid;
    } catch {
      return {};
    }
  });
  const pending = useRef(drafts);
  const current = useRef(session);
  const fingerprint = useRef(session.answerFingerprint);
  const savedAt = useRef(
    new Map(session.questions.map((row) => [row.question.revisionId, row.answerSavedAt])),
  );
  const [savedSelections, setSavedSelections] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);
  const { mutateAsync: saveAnswer } = useSaveAssessment(session.courseId, session.id);
  const persist = useCallback(
    (next: Drafts) => {
      pending.current = next;
      if (mounted.current) setDrafts(next);
      try {
        if (Object.keys(next).length) localStorage.setItem(key, JSON.stringify(next));
        else localStorage.removeItem(key);
      } catch {
        if (mounted.current)
          setStorageError('本地存储不可用，请保持页面打开，恢复网络后重试保存。');
      }
    },
    [key],
  );
  useEffect(() => {
    current.current = session;
    if (lock.current) return;
    const stale = session.questions.some((row) => {
      const known = savedAt.current.get(row.question.revisionId);
      return known && (!row.answerSavedAt || row.answerSavedAt < known);
    });
    if (!stale) fingerprint.current = session.answerFingerprint;
    for (const row of session.questions) {
      const known = savedAt.current.get(row.question.revisionId);
      if (!known || (row.answerSavedAt && row.answerSavedAt >= known))
        savedAt.current.set(row.question.revisionId, row.answerSavedAt);
    }
    setSavedSelections((previous) => {
      const next = { ...previous };
      for (const row of session.questions) {
        const known = savedAt.current.get(row.question.revisionId);
        if (row.answerSavedAt && known && row.answerSavedAt >= known)
          delete next[row.question.revisionId];
      }
      return next;
    });
    const next = { ...pending.current };
    for (const row of session.questions) {
      const id = row.question.revisionId;
      // A lost response may have been committed by the server. Reconcile before replay.
      if (next[id] && row.selectedOption === next[id].selectedOption) delete next[id];
    }
    persist(next);
  }, [session, persist]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const flush = useCallback((): Promise<void> => {
    if (lock.current) return lock.current;
    const run = async () => {
      setBusy(true);
      setError('');
      try {
        while (Object.keys(pending.current).length) {
          if (current.current.deadlineReached || current.current.status !== 'IN_PROGRESS')
            throw new Error('试卷已截止，未保存答案不能继续补发。');
          const id = Object.keys(pending.current)[0];
          const answer = pending.current[id];
          const response = await saveAnswer({ revisionId: id, answer });
          fingerprint.current = response.answerFingerprint;
          if (mounted.current)
            setSavedSelections((previous) => ({ ...previous, [id]: response.selectedOption }));
          savedAt.current.set(id, response.savedAt);
          const next = { ...pending.current };
          if (next[id]?.selectedOption === answer.selectedOption) delete next[id];
          else if (next[id]) next[id] = { ...next[id], expectedSavedAt: response.savedAt };
          persist(next);
        }
      } catch (failure) {
        if (mounted.current)
          setError(
            failure instanceof ApiError && failure.code === 40902
              ? '答案保存冲突，请重新同步后确认你的选项，再重试保存。'
              : errorMessage(failure),
          );
        throw failure;
      } finally {
        if (mounted.current) setBusy(false);
      }
    };
    lock.current = run().finally(() => {
      lock.current = null;
    });
    return lock.current;
  }, [persist, saveAnswer]);
  const choose = (revisionId: string, selectedOption: number) =>
    persist({
      ...pending.current,
      [revisionId]: { selectedOption, expectedSavedAt: savedAt.current.get(revisionId) ?? null },
    });
  useEffect(() => {
    if (
      !Object.keys(drafts).length ||
      session.deadlineReached ||
      session.status !== 'IN_PROGRESS' ||
      error
    )
      return;
    const timer = window.setTimeout(() => {
      void flush().catch(() => {});
    }, 400);
    return () => window.clearTimeout(timer);
  }, [drafts, flush, session.deadlineReached, session.status, error]);
  useEffect(() => {
    const online = () => {
      void flush().catch(() => {});
    };
    window.addEventListener('online', online);
    const unload = (event: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', unload);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('beforeunload', unload);
    };
  }, [flush]);
  const retry = (snapshot?: AssessmentSession) => {
    if (snapshot) {
      current.current = snapshot;
      fingerprint.current = snapshot.answerFingerprint;
      for (const row of snapshot.questions)
        savedAt.current.set(row.question.revisionId, row.answerSavedAt);
    }
    persist(
      Object.fromEntries(
        Object.entries(pending.current).map(([id, answer]) => [
          id,
          { ...answer, expectedSavedAt: savedAt.current.get(id) ?? null },
        ]),
      ),
    );
    return flush();
  };
  const clear = useCallback(() => persist({}), [persist]);
  return {
    drafts,
    savedSelections,
    choose,
    flush,
    retry,
    fingerprint,
    error,
    storageError,
    busy,
    clear,
  };
}
