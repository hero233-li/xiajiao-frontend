import { createUuid } from '../utils/uuid';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link, useSearchParams } from '../features/cycle/navigation';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Bookmark, CircleHelp, Check, X, StickyNote } from 'lucide-react';
import { Button } from '../components/Button';
import { MathText } from '../features/practice/MathText';
import {
  questionOptions,
  submitAnswer,
  usePracticeCourse,
  usePracticeOverview,
  usePracticeSequence,
  writeMark,
} from '../api/practice';
import type {
  AnswerWrite,
  ListQuestionsFilter,
  PracticeResult,
  QuestionPublic,
  QuestionMarkWrite,
} from '../api/generated/models';
import '../features/practice/practice.css';

export type PracticeNoteRequest = { questionId: string; revisionId: string; summary: string };
function Region({
  loading,
  error,
  retry,
  empty,
  action,
}: {
  loading?: boolean;
  error?: Error | null;
  retry?: () => void;
  empty?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="practice-region" aria-busy={loading || undefined}>
      {loading ? (
        <p role="status">加载中，请稍候…</p>
      ) : error ? (
        <>
          <p role="alert">{error.message}</p>
          <Button onClick={retry}>重新加载</Button>
        </>
      ) : (
        <>
          <p>{empty}</p>
          {action}
        </>
      )}
    </section>
  );
}
export function PracticePage({
  onNoteRequest,
}: {
  onNoteRequest?: (request: PracticeNoteRequest) => void;
}) {
  const { code = '', chapterId = '' } = useParams();
  const [params] = useSearchParams();
  const cycleId = params.get('cycleId') || '';
  const course = usePracticeCourse(code, cycleId);
  const back = `/zikao/course/${encodeURIComponent(code)}/practice?${new URLSearchParams()}`;
  if (!cycleId)
    return (
      <Region
        empty="缺少考试周期，请从章节列表进入练习。"
        action={
          <Link className="button button-primary" to={back}>
            返回章节列表
          </Link>
        }
      />
    );
  if (course.isPending || course.isError)
    return (
      <Region loading={course.isPending} error={course.error} retry={() => void course.refetch()} />
    );
  return (
    <PracticeSession
      key={`${course.data.id}:${chapterId}`}
      courseId={course.data.id}
      courseName={course.data.name}
      chapterId={chapterId}
      back={back}
      onNoteRequest={onNoteRequest}
    />
  );
}
function PracticeSession({
  courseId,
  courseName,
  chapterId,
  back,
  onNoteRequest,
}: {
  courseId: string;
  courseName: string;
  chapterId: string;
  back: string;
  onNoteRequest?: (request: PracticeNoteRequest) => void;
}) {
  const [params, setParams] = useSearchParams();
  const rawFilter = params.get('filter');
  const filter: ListQuestionsFilter =
    rawFilter === 'WRONG' || rawFilter === 'UNANSWERED' ? rawFilter : 'ALL';
  const [version, setVersion] = useState(0);
  const overview = usePracticeOverview(courseId);
  // 本轮序列在作答后保持稳定，避免错题/未做筛选将当前题提前移除。
  const sequence = usePracticeSequence(courseId, chapterId, filter, version);
  const chapter = overview.data?.chapters.find((item) => item.chapterId === chapterId);
  const requested = params.get('questionId');
  const items = useMemo(() => sequence.data?.items || [], [sequence.data]);
  const index = Math.max(
    0,
    items.findIndex((item) => item.id === requested),
  );
  const current = items[index];
  const [results, setResults] = useState<Record<string, PracticeResult>>({});
  const [notice, setNotice] = useState('');
  const [completed, setCompleted] = useState(false);
  const submissions = useRef(new Map<string, boolean>());
  const queryClient = useQueryClient();
  const busy = useIsMutating({ mutationKey: ['practice-submit', courseId] }) > 0;
  const setPosition = (questionId: string) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set('questionId', questionId);
        return next;
      },
      { replace: true },
    );
  useEffect(() => {
    if (current && requested !== current.id)
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set('questionId', current.id);
          return next;
        },
        { replace: true },
      );
  }, [current, requested, setParams]);
  useEffect(() => {
    if (items[index + 1])
      void queryClient.prefetchQuery(questionOptions(courseId, items[index + 1].id));
  }, [courseId, index, items, queryClient]);
  function record(result: PracticeResult) {
    setResults((previous) => ({ ...previous, [result.revisionId]: result }));
    if (!submissions.current.has(result.submissionId)) {
      submissions.current.set(result.submissionId, result.correct);
      if (submissions.current.size % 10 === 0)
        setNotice(
          `本次练习已答 ${submissions.current.size} 题，正确 ${[...submissions.current.values()].filter(Boolean).length} 题`,
        );
    }
    void queryClient.invalidateQueries({ queryKey: ['practice-overview', courseId] });
    void queryClient.invalidateQueries({ queryKey: ['practice-counts', courseId] });
    void queryClient.invalidateQueries({ queryKey: ['practice-wrong', courseId] });
    if (index === items.length - 1) setCompleted(true);
  }
  function changeFilter(nextFilter: ListQuestionsFilter) {
    setCompleted(false);
    setVersion((value) => value + 1);
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set('filter', nextFilter);
        return next;
      },
      { replace: true },
    );
  }
  return (
    <div className="focus-practice">
      <Link className="practice-back" to={back}>
        <ArrowLeft size={20} aria-hidden="true" />
        返回章节列表
      </Link>
      {overview.isPending || (overview.isError && !overview.data) ? (
        <Region
          loading={overview.isPending}
          error={overview.error}
          retry={() => void overview.refetch()}
        />
      ) : !chapter ? (
        <Region
          empty="当前章节不可用。"
          action={
            <Link className="button button-primary" to={back}>
              返回章节列表
            </Link>
          }
        />
      ) : (
        <>
          <header className="practice-heading">
            <div>
              <p className="practice-context">{courseName}</p>
              <h1>{chapter.title}</h1>
            </div>
            <p className="practice-position" aria-live="polite">
              {sequence.isPending
                ? '正在加载本轮题目…'
                : sequence.isError
                  ? '本轮题目未加载'
                  : items.length
                    ? `第 ${index + 1} / ${items.length} 题`
                    : '本轮暂无题目'}
            </p>
          </header>
          {overview.isError && (
            <div className="practice-stats-error" role="status">
              <p>统计暂未更新，作答结果已保留。</p>
              <Button
                variant="ghost"
                loading={overview.isFetching}
                onClick={() => void overview.refetch()}
              >
                重新加载统计
              </Button>
            </div>
          )}
          <details className="practice-tools">
            <summary>
              练习工具 ·{' '}
              {filter === 'WRONG' ? '错题重做' : filter === 'UNANSWERED' ? '未做题' : '全部题目'}
            </summary>
            <div className="practice-filters" role="group" aria-label="题目筛选">
              {(['ALL', 'UNANSWERED', 'WRONG'] as const).map((value, i) => (
                <Button
                  key={value}
                  variant={filter === value ? 'primary' : 'secondary'}
                  aria-pressed={filter === value}
                  disabled={busy}
                  disabledReason="正在提交，请稍候"
                  onClick={() => changeFilter(value)}
                >
                  {['全部', '未做', `错题 ${chapter.stats.latestWrongCount}`][i]}
                </Button>
              ))}
            </div>
            <p className="practice-hint">
              题号仅表示当前筛选的本轮范围，提交后不会自动切题。重新筛选会重新读取题目。
            </p>
            <p className="practice-hint">
              键盘 A–D 选择 · Enter 提交，提交后 Enter 下一题 · ← → 切题；输入备注时不触发。
            </p>
          </details>
          {sequence.isPending || sequence.isError ? (
            <Region
              loading={sequence.isPending}
              error={sequence.error}
              retry={() => void sequence.refetch()}
            />
          ) : !current ? (
            <Region
              empty="当前筛选下没有题目。"
              action={<Button onClick={() => changeFilter('ALL')}>查看全部题目</Button>}
            />
          ) : (
            <Question
              key={current.revisionId}
              courseId={courseId}
              questionId={current.id}
              result={results[current.revisionId]}
              onResult={record}
              onNoteRequest={onNoteRequest}
              previous={index > 0 ? () => setPosition(items[index - 1].id) : undefined}
              next={index < items.length - 1 ? () => setPosition(items[index + 1].id) : undefined}
            />
          )}
          {notice && (
            <aside className="practice-notice" role="status">
              <Check size={20} aria-hidden="true" />
              {notice}
              <Button variant="ghost" aria-label="关闭练习提示" onClick={() => setNotice('')}>
                关闭
              </Button>
            </aside>
          )}
          {completed && (
            <section className="practice-summary" aria-labelledby="practice-summary-title">
              <h2 id="practice-summary-title">本章练习小结</h2>
              <p>
                已提交本轮最后一题。本次页面练习已答 {submissions.current.size} 题，正确{' '}
                {[...submissions.current.values()].filter(Boolean).length} 题。
              </p>
              <p>
                本章累计提交 {chapter.stats.practiceAttemptCount} 次，正确{' '}
                {chapter.stats.practiceCorrectCount} 次，正确率 {chapter.stats.practiceAccuracy}
                %；当前错题 {chapter.stats.latestWrongCount} 题。
              </p>
              <Link className="button button-primary" to={back}>
                返回章节列表
              </Link>
            </section>
          )}
        </>
      )}
    </div>
  );
}
function Question({
  courseId,
  questionId,
  result,
  onResult,
  previous,
  next,
  onNoteRequest,
}: {
  courseId: string;
  questionId: string;
  result?: PracticeResult;
  onResult: (result: PracticeResult) => void;
  previous?: () => void;
  next?: () => void;
  onNoteRequest?: (request: PracticeNoteRequest) => void;
}) {
  const query = useQuery(questionOptions(courseId, questionId));
  if (query.isPending || query.isError)
    return (
      <Region loading={query.isPending} error={query.error} retry={() => void query.refetch()} />
    );
  return (
    <QuestionCard
      key={query.data.revisionId}
      question={query.data}
      result={result}
      onResult={onResult}
      previous={previous}
      next={next}
      onNoteRequest={onNoteRequest}
    />
  );
}
function QuestionCard({
  question,
  result,
  onResult,
  previous,
  next,
  onNoteRequest,
}: {
  question: QuestionPublic;
  result?: PracticeResult;
  onResult: (result: PracticeResult) => void;
  previous?: () => void;
  next?: () => void;
  onNoteRequest?: (request: PracticeNoteRequest) => void;
}) {
  const stemRef = useRef<HTMLHeadingElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const stem = stemRef.current;
    stem?.focus({ preventScroll: true });
    if (window.scrollY > 0) stem?.scrollIntoView?.({ block: 'start' });
    const navigation = navigationRef.current;
    if (!navigation || typeof ResizeObserver === 'undefined') return;
    const update = () =>
      document.documentElement.style.setProperty(
        '--practice-actions-height',
        `${navigation.getBoundingClientRect().height}px`,
      );
    const observer = new ResizeObserver(update);
    observer.observe(navigation);
    update();
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--practice-actions-height');
    };
  }, []);
  const [selected, setSelected] = useState<number | null>(result?.selectedOption ?? null);
  const [mark, setMark] = useState(question.mark);
  const [noteNotice, setNoteNotice] = useState('');
  const [storageError, setStorageError] = useState('');
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const markLock = useRef(false);
  const attempt = useRef<{ key: string; body: AnswerWrite } | null>(null);
  const storageKey = `practice-pending:${question.courseId}:${question.revisionId}`;
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (
        typeof saved.key === 'string' &&
        saved.body?.revisionId === question.revisionId &&
        Number.isInteger(saved.body?.selectedOption) &&
        saved.body.selectedOption >= 0 &&
        saved.body.selectedOption < question.options.length
      ) {
        attempt.current = saved;
        setSelected(saved.body.selectedOption);
      }
    } catch {
      setStorageError('无法读取待重试记录，请保持此页面打开。');
    }
  }, [storageKey, question.revisionId, question.options.length]);
  const answer = useMutation({
    mutationKey: ['practice-submit', question.courseId],
    mutationFn: () => {
      if (!attempt.current) throw new Error('请先选择一个答案');
      return submitAnswer(
        question.courseId,
        question.id,
        attempt.current.body,
        attempt.current.key,
      );
    },
    retry: false,
    networkMode: 'always',
    onSuccess: (data) => {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* 内存中的幂等键仍可防重 */
      }
      onResult(data);
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const marking = useMutation({
    mutationFn: (body: QuestionMarkWrite) => writeMark(question.courseId, question.id, body),
    retry: false,
    networkMode: 'always',
    onSuccess: (data) => {
      setMark(data);
      queryClient.setQueryData<QuestionPublic>(
        questionOptions(question.courseId, question.id).queryKey,
        (old) => (old ? { ...old, mark: data } : old),
      );
    },
    onError: async () => {
      await queryClient.invalidateQueries({
        queryKey: questionOptions(question.courseId, question.id).queryKey,
      });
    },
    onSettled: () => {
      markLock.current = false;
    },
  });
  useEffect(() => {
    setMark(question.mark);
  }, [question.mark]);
  function submit() {
    if (selected === null || result || submitLock.current) return;
    submitLock.current = true;
    if (!attempt.current) {
      attempt.current = {
        key: createUuid(),
        body: { revisionId: question.revisionId, selectedOption: selected },
      };
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(attempt.current));
      } catch {
        setStorageError('浏览器无法保存重试记录；请在当前页面重试。');
      }
    }
    answer.mutate();
  }
  function toggle(field: 'bookmarked' | 'uncertain') {
    if (markLock.current) return;
    markLock.current = true;
    marking.mutate({
      bookmarked: mark.bookmarked,
      uncertain: mark.uncertain,
      [field]: !mark[field],
      expectedRevision: mark.revision,
    });
  }
  const submitted = result || answer.data;
  const frozen = !!submitted || answer.isPending || !!attempt.current;
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        target?.closest(
          'input, textarea, select, [contenteditable], [role="textbox"], [role="dialog"], dialog',
        )
      )
        return;
      const horizontalReader = target?.closest<HTMLElement>(
        '[role="region"][tabindex], .practice-option',
      );
      if (
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
        horizontalReader &&
        horizontalReader.scrollWidth > horizontalReader.clientWidth
      )
        return;
      const option = 'abcd'.indexOf(event.key.toLowerCase());
      if (option >= 0 && option < question.options.length && !frozen) {
        event.preventDefault();
        setSelected(option);
      }
      // 控件自身的 Enter 保持原有按钮行为；页面/选项上按 Enter 执行作答。
      else if (event.key === 'Enter' && !target?.closest('a, button:not([role="radio"])')) {
        event.preventDefault();
        if (submitted) next?.();
        else submit();
      } else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && !answer.isPending) {
        event.preventDefault();
        (event.key === 'ArrowLeft' ? previous : next)?.();
      }
    }
    document.addEventListener('keydown', keyboard);
    return () => document.removeEventListener('keydown', keyboard);
  });
  function note() {
    const detail = {
      questionId: question.id,
      revisionId: question.revisionId,
      summary: question.stem.slice(0, 160),
    };
    onNoteRequest?.(detail);
    window.dispatchEvent(new CustomEvent<PracticeNoteRequest>('practice:note-request', { detail }));
    setNoteNotice('题干摘要已发送到快速备注，可编辑后保存。');
  }
  return (
    <>
      <article
        className="practice-card"
        aria-busy={answer.isPending || undefined}
        data-error={answer.isError}
      >
        <div className="practice-meta">
          <span>{question.sourceLabel}</span>
          <span aria-label={`难度 ${question.difficulty} 星，满分 5 星`}>
            难度 {'★'.repeat(question.difficulty)}
            {'☆'.repeat(5 - question.difficulty)}
          </span>
        </div>
        <h2 ref={stemRef} tabIndex={-1} className="practice-stem" id="practice-stem">
          <MathText text={question.stem} />
        </h2>
        <div className="practice-options" role="radiogroup" aria-labelledby="practice-stem">
          {question.options.map((option, i) => {
            const correct = submitted?.correctOption === i;
            const wrong = !!submitted && submitted.selectedOption === i && !submitted.correct;
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={selected === i}
                aria-disabled={frozen}
                className="practice-option"
                data-selected={selected === i}
                data-correct={correct}
                data-wrong={wrong}
                onClick={() => {
                  if (!frozen) setSelected(i);
                }}
              >
                <span className="practice-option-letter">{String.fromCharCode(65 + i)}</span>
                <span className="practice-option-content">
                  <MathText text={option} />
                </span>
                {correct && (
                  <span className="practice-option-verdict">
                    <Check size={20} aria-hidden="true" />
                    正确答案
                  </span>
                )}
                {wrong && (
                  <span className="practice-option-verdict">
                    <X size={20} aria-hidden="true" />
                    选择错误
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {!submitted && selected === null && (
          <p className="practice-hint" role="status">
            请先选择一个答案
          </p>
        )}
        <div className="practice-actions">
          <Button
            variant="secondary"
            aria-pressed={mark.bookmarked}
            loading={marking.isPending}
            loadingLabel="正在保存标记"
            onClick={() => toggle('bookmarked')}
          >
            <Bookmark size={20} aria-hidden="true" />
            {mark.bookmarked ? '已收藏' : '收藏'}
          </Button>
          <Button
            variant="secondary"
            aria-pressed={mark.uncertain}
            loading={marking.isPending}
            loadingLabel="正在保存标记"
            onClick={() => toggle('uncertain')}
          >
            <CircleHelp size={20} aria-hidden="true" />
            {mark.uncertain ? '已标不确定' : '不确定'}
          </Button>
        </div>
        {marking.isError && (
          <div role="alert">
            <p>{marking.error.message}</p>
            <Button
              variant="secondary"
              onClick={() => {
                if (marking.variables && !markLock.current) {
                  markLock.current = true;
                  marking.mutate({ ...marking.variables, expectedRevision: mark.revision });
                }
              }}
            >
              重试保存标记
            </Button>
          </div>
        )}
        {storageError && <p role="alert">{storageError}</p>}
        {!submitted && answer.isError && (
          <div className="practice-submit-error" role="alert">
            <p>{answer.error.message}</p>
            <p>已保留所选答案，重试会沿用同一提交记录。</p>
          </div>
        )}
        {submitted && (
          <section
            className="practice-explanation"
            aria-live="polite"
            data-correct={submitted.correct}
          >
            <h3 className="practice-verdict">
              {submitted.correct ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
              {submitted.correct ? '回答正确' : '回答错误'}
            </h3>
            <p>
              正确答案：{String.fromCharCode(65 + submitted.correctOption)} ·{' '}
              <MathText text={submitted.correctAnswer} />
            </p>
            <h3>解析</h3>
            <p>
              <MathText text={submitted.explanation} />
            </p>
            <p className="practice-hint">
              提交于{' '}
              {new Intl.DateTimeFormat('zh-CN', {
                timeZone: 'Asia/Shanghai',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }).format(new Date(submitted.submittedAt))}
            </p>
            {!submitted.correct && (
              <Button variant="secondary" onClick={note}>
                <StickyNote size={20} aria-hidden="true" />
                记为备注
              </Button>
            )}
            {noteNotice && <p role="status">{noteNotice}</p>}
          </section>
        )}
      </article>
      <nav ref={navigationRef} className="practice-navigation" aria-label="作答与切换题目">
        <Button
          variant="secondary"
          onClick={previous}
          disabled={!previous || answer.isPending}
          disabledReason={answer.isPending ? '正在提交，请稍候' : '已经是第一题'}
        >
          <ArrowLeft size={20} aria-hidden="true" />
          上一题
        </Button>
        {!submitted ? (
          <Button
            disabled={selected === null}
            disabledReason="选择选项后即可提交"
            loading={answer.isPending}
            loadingLabel="正在确认结果"
            onClick={submit}
          >
            {answer.isPending
              ? '提交中'
              : answer.isError || attempt.current
                ? '重试提交'
                : '提交答案'}
          </Button>
        ) : (
          <Button variant="secondary" disabled disabledReason="可查看本题反馈">
            已提交
          </Button>
        )}
        <Button
          variant={submitted ? 'primary' : 'secondary'}
          onClick={next}
          disabled={!next || answer.isPending}
          disabledReason={answer.isPending ? '正在提交，请稍候' : '已经是最后一题'}
        >
          下一题
          <ArrowRight size={20} aria-hidden="true" />
        </Button>
      </nav>
    </>
  );
}
export const Component = PracticePage;
