import { AssessmentGate } from '../features/practice/AssessmentGate';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RecoveryLink, useLocation, useParams } from 'react-router-dom';
import { Link, useNavigate, useSearchParams } from '../features/cycle/navigation';
import { AlertTriangle, Check, Circle, Flag, Timer } from 'lucide-react';
import {
  useAssessmentCourse,
  useAssessmentResult,
  useAssessmentSession,
  useSubmitAssessment,
} from '../api/assessments';
import type { AssessmentResult, AssessmentSession } from '../api/generated/models';
import { ApiError, errorMessage } from '../api/errors';
import { sessionStore } from '../api/session';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { MathText } from '../features/practice/MathText';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { formatShanghaiDate } from '../utils/date';
import { useAnswerQueue } from '../features/assessments/useAnswerQueue';
import '../features/assessments/assessments.css';

const titleOf = (session: AssessmentSession) => (session.kind === 'MOCK' ? '模拟卷' : '章节检测');
export function Component() {
  const { code = '', testId = 'new' } = useParams();
  const [search] = useSearchParams();
  const cycleId = search.get('cycleId') ?? '';
  const course = useAssessmentCourse(code, cycleId);
  const query = useAssessmentSession(course.data?.id ?? '', testId);
  const navigate = useNavigate();
  const location = useLocation();
  const [completed, setCompleted] = useState(false);
  const resultView =
    location.pathname.endsWith('/result') ||
    completed ||
    (!!query.data && query.data.session.status !== 'IN_PROGRESS');
  const result = useAssessmentResult(course.data?.id ?? '', testId, cycleId, resultView);
  useEffect(() => {
    setCompleted(false);
  }, [testId]);
  const context = new URLSearchParams();
  if (search.get('kind')) context.set('kind', search.get('kind')!);
  if (search.get('chapterId')) context.set('chapterId', search.get('chapterId')!);
  const publicCycle = new URLSearchParams(location.search).get('cycle');
  if (publicCycle) context.set('cycle', publicCycle);
  const back = `/study/course/${encodeURIComponent(code)}/practice${context.size ? `?${context}` : ''}${search.get('chapterId') ? `#practice-chapter-${encodeURIComponent(search.get('chapterId')!)}` : ''}`;
  if (!cycleId)
    return (
      <div className="assessment-page">
        <p role="alert">缺少考试周期，请从检测入口重新进入。</p>
        <RecoveryLink className="button button-secondary" to={back}>
          选择考试周期并查看检测资格
        </RecoveryLink>
      </div>
    );
  if (course.isPending || (testId !== 'new' && course.data && query.isPending))
    return (
      <div className="assessment-page">
        <div className="card" aria-busy="true" role="status">
          正在加载试卷与作答进度…
        </div>
      </div>
    );
  const failure = course.error ?? query.error;
  if (failure && !query.data)
    return (
      <div className="assessment-page">
        <ErrorState
          message={
            failure instanceof ApiError && failure.code === 40401
              ? '试卷不存在或不属于当前用户，无法查看。'
              : errorMessage(failure)
          }
          onRetry={() => {
            void course.refetch();
            if (course.data) void query.refetch();
          }}
        />
        <Link className="button button-secondary" to={back}>
          返回刷题
        </Link>
      </div>
    );
  if (!course.data)
    return (
      <div className="assessment-page">
        <EmptyState
          message="暂无课程信息。"
          actionLabel="返回刷题"
          onAction={() => navigate(back)}
        />
      </div>
    );
  if (testId === 'new')
    return (
      <div className="assessment-page stack">
        <header className="page-heading">
          <div>
            <p className="eyebrow">检测准备</p>
            <h1>{course.data.name}</h1>
            <p className="secondary">先核对条件与计时规则，再进入独立作答。</p>
          </div>
        </header>
        {search.get('kind') === 'MOCK' ? (
          <AssessmentGate courseId={course.data.id} code={code} cycleId={cycleId} />
        ) : (
          <section className="assessment-entry">
            <h2>章节检测</h2>
            <p>从章节列表查看当前资格和组卷条件。符合条件后可选择章节开始。</p>
            <Link
              className="button button-primary"
              to={`${back}${back.includes('?') ? '&' : '?'}mode=detect`}
            >
              选择检测章节
            </Link>
          </section>
        )}
      </div>
    );
  if (!query.data)
    return (
      <div className="assessment-page">
        <EmptyState message="暂无试卷。" actionLabel="返回刷题" onAction={() => navigate(back)} />
      </div>
    );
  const session = query.data.session;
  if (resultView)
    return (
      <div className="assessment-page stack">
        <h1>
          {course.data.name} · {titleOf(session)} · 结果
        </h1>
        {session.status !== 'IN_PROGRESS' && (
          <p role="status">
            {session.status === 'TIMED_OUT'
              ? '试卷已到期，系统已交卷。'
              : '试卷已提交，可以查看结果。'}
          </p>
        )}
        {result.isPending ? (
          <div className="card" role="status" aria-busy="true">
            正在加载结果…
          </div>
        ) : result.isError ? (
          <ErrorState
            message={errorMessage(result.error)}
            onRetry={() => {
              void result.refetch();
            }}
          />
        ) : (
          <Result session={session} result={result.data} code={code} cycleId={cycleId} />
        )}
        <Link className="button button-secondary" to={back}>
          返回刷题
        </Link>
      </div>
    );
  return (
    <Attempt
      key={`${sessionStore.getSnapshot()?.user.id}:${session.id}`}
      session={session}
      measuredAt={query.data.measuredAt}
      testName={`${course.data.name} · ${titleOf(session)}`}
      cycleId={cycleId}
      syncError={query.error}
      onSync={async () => {
        return (await query.refetch()).data?.session;
      }}
      onComplete={() => {
        setCompleted(true);
        navigate(`/study/course/${code}/tests/${testId}/result`, { replace: true });
      }}
    />
  );
}
function Attempt({
  session,
  measuredAt,
  cycleId,
  testName,
  syncError,
  onSync,
  onComplete,
}: {
  session: AssessmentSession;
  measuredAt: number;
  testName: string;
  cycleId: string;
  syncError: Error | null;
  onSync: () => Promise<AssessmentSession | undefined>;
  onComplete: () => void;
}) {
  const queue = useAnswerQueue(session);
  const { mutateAsync: submitAnswer } = useSubmitAssessment(session.courseId, session.id, cycleId);
  const { flush, fingerprint, clear } = queue;
  const [index, setIndex] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const toolbar = useRef<HTMLElement>(null);
  const firstQuestion = useRef(true);
  useEffect(() => {
    if (firstQuestion.current) {
      firstQuestion.current = false;
      return;
    }
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView?.({ block: 'start' });
  }, [index]);
  useEffect(() => {
    const element = toolbar.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const update = () =>
      document.documentElement.style.setProperty(
        '--assessment-toolbar-height',
        `${element.getBoundingClientRect().height}px`,
      );
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--assessment-toolbar-height');
    };
  }, []);
  const [finishing, setFinishing] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const markKey = `assessment-marks:${sessionStore.getSnapshot()?.user.id}:${session.id}`;
  const [marks, setMarks] = useState<string[]>(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(markKey) ?? '[]');
      return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  });
  const [seconds, setSeconds] = useState(() =>
    Math.max(
      0,
      Math.ceil((Date.parse(session.deadlineAt) - Date.parse(session.serverTime)) / 1000),
    ),
  );
  const running = useRef(false);
  const autoAttempt = useRef(false);
  useEffect(() => {
    const tick = () =>
      setSeconds(
        Math.max(
          0,
          Math.ceil(
            (Date.parse(session.deadlineAt) -
              Date.parse(session.serverTime) -
              (performance.now() - measuredAt)) /
              1000,
          ),
        ),
      );
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [session.deadlineAt, session.serverTime, measuredAt]);
  const finish = useCallback(
    async (timedOut: boolean) => {
      if (running.current) return;
      running.current = true;
      setFinishing(true);
      setSubmitError('');
      setConfirm(false);
      try {
        if (!timedOut) await flush();
        await submitAnswer({ answerFingerprint: fingerprint.current, confirm: true });
        clear();
        onComplete();
      } catch (error) {
        setSubmitError(errorMessage(error));
        await onSync();
      } finally {
        running.current = false;
        setFinishing(false);
      }
    },
    [flush, fingerprint, clear, submitAnswer, onComplete, onSync],
  );
  useEffect(() => {
    if (session.deadlineReached && !autoAttempt.current) {
      autoAttempt.current = true;
      void finish(true);
    }
  }, [session.deadlineReached, finish]);
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState === 'visible') {
        void onSync();
        if (session.deadlineReached && submitError) void finish(true);
      }
    };
    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('online', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [onSync, session.deadlineReached, submitError, finish]);
  const zeroSync = useRef(false);
  useEffect(() => {
    if (seconds === 0 && !session.deadlineReached && !zeroSync.current) {
      zeroSync.current = true;
      void onSync();
    }
    if (seconds > 0) zeroSync.current = false;
  }, [seconds, session.deadlineReached, onSync]);
  const selected = (id: string, server: number | null) =>
    queue.drafts[id]?.selectedOption ?? queue.savedSelections[id] ?? server;
  const answered = session.questions.filter(
    (row) => selected(row.question.revisionId, row.selectedOption) !== null,
  ).length;
  const row = session.questions[index];
  const blocked =
    finishing || session.status !== 'IN_PROGRESS' || session.deadlineReached || seconds === 0;
  const mark = (id: string) => {
    const next = marks.includes(id) ? marks.filter((item) => item !== id) : [...marks, id];
    setMarks(next);
    try {
      localStorage.setItem(markKey, JSON.stringify(next));
    } catch {
      /* Marking remains available in memory. */
    }
  };
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        target?.closest(
          'textarea, select, input:not([type="radio"]), [contenteditable], [role="dialog"]',
        )
      )
        return;
      const option = 'abcd'.indexOf(event.key.toLowerCase());
      if (row && option >= 0 && option < row.question.options.length && !blocked) {
        event.preventDefault();
        queue.choose(row.question.revisionId, option);
      } else if (
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
        !target?.closest('input, [role="region"]')
      ) {
        event.preventDefault();
        setIndex((value) =>
          Math.max(
            0,
            Math.min(session.questions.length - 1, value + (event.key === 'ArrowLeft' ? -1 : 1)),
          ),
        );
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => document.removeEventListener('keydown', keyboard);
  });
  const pendingCount = Object.keys(queue.drafts).length;
  const grid = (
    <nav className="assessment-grid" aria-label="选择题号">
      {session.questions.map((item, itemIndex) => {
        const id = item.question.revisionId;
        const done = selected(id, item.selectedOption) !== null;
        const marked = marks.includes(id);
        return (
          <Button
            key={id}
            variant="secondary"
            className={`${done ? 'assessment-answered' : ''} ${marked ? 'assessment-marked' : ''}`}
            aria-current={index === itemIndex ? 'step' : undefined}
            aria-label={`第 ${item.position} 题，${done ? '已答' : '未答'}${marked ? '，标记待查' : ''}`}
            onClick={() => {
              setIndex(itemIndex);
              setDrawer(false);
            }}
          >
            {marked ? (
              <Flag size={16} aria-hidden="true" />
            ) : done ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Circle size={16} aria-hidden="true" />
            )}
            {item.position}
          </Button>
        );
      })}
    </nav>
  );
  return (
    <div className="assessment-page assessment-attempt stack">
      <header ref={toolbar} className="assessment-toolbar">
        <h1>{testName}</h1>
        <div className="assessment-topline">
          <div
            className={`assessment-timer ${seconds <= 60 ? 'status-error' : seconds <= 300 ? 'status-warning' : 'status-info'}`}
          >
            <Timer size={20} aria-hidden="true" />
            剩余 {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </div>
          <span>
            已答 {answered} / {session.questionCount}
          </span>
          <span>未答 {Math.max(0, session.questionCount - answered)} 题</span>
        </div>
        <div className="assessment-sync" aria-live="polite">
          {queue.busy
            ? '正在保存答案…'
            : pendingCount
              ? `未同步 ${pendingCount} 题 · 答案已本地暂存`
              : '答案已保存'}
          {queue.error && <span className="status-error"> · 同步失败</span>}
        </div>
      </header>
      <details className="assessment-rules">
        <summary>本次规则与快捷键</summary>
        <p>
          共 {session.questionCount} 题 · 限时 {session.limitMinutes} 分钟 · 通过线{' '}
          {session.passScore} 分 · 截止 {formatShanghaiDate(session.deadlineAt)}
          （上海时间）。离开页面不会暂停计时。
        </p>
        <p>A–D 选择 · ← → 切题。输入备注时不触发；单选框聚焦时方向键按原生选项操作。</p>
      </details>
      {queue.storageError && <p role="alert">{queue.storageError}</p>}
      <Button
        variant="secondary"
        className="assessment-drawer-trigger"
        onClick={() => setDrawer(true)}
      >
        题号面板 · 第 {row?.position ?? 0} 题
      </Button>
      {syncError && (
        <div role="alert">
          <p>服务端同步失败：{errorMessage(syncError)}</p>
          <Button
            variant="secondary"
            onClick={() => {
              void onSync();
            }}
          >
            重新同步
          </Button>
        </div>
      )}
      {session.deadlineReached && (
        <p className="status-error" role="alert">
          试卷已到期，正在按服务器已保存的答案交卷。
        </p>
      )}
      {seconds === 0 && !session.deadlineReached && (
        <p role="status">正在核对服务端截止状态，暂不可改选。</p>
      )}
      {queue.error && (
        <div className="card" data-state="error" role="alert">
          <p>未保存：{queue.error}</p>
          <Button
            variant="secondary"
            loading={queue.busy}
            disabled={blocked}
            disabledReason="试卷已截止或正在交卷，不能保存答案。"
            onClick={() => {
              void onSync()
                .then((snapshot) => queue.retry(snapshot))
                .catch(() => {});
            }}
          >
            重新同步并保存
          </Button>
        </div>
      )}
      {submitError && (
        <div role="alert" className="card" data-state="error">
          <p>交卷失败：{submitError}</p>
          <Button
            onClick={() => {
              void finish(session.deadlineReached);
            }}
            loading={finishing}
          >
            重试交卷
          </Button>
        </div>
      )}
      {!row ? (
        <EmptyState
          message="试卷暂无题目，请重新加载。"
          actionLabel="重新加载"
          onAction={() => {
            void onSync();
          }}
        />
      ) : (
        <section
          className="assessment-question card stack"
          aria-label={`第 ${row.position} 题`}
          aria-disabled={blocked}
          aria-busy={finishing}
        >
          <div className="row">
            <h2 ref={heading} tabIndex={-1} className="assessment-question-title">
              第 {row.position} 题 · 单选
            </h2>
            <Button
              variant="secondary"
              aria-pressed={marks.includes(row.question.revisionId)}
              onClick={() => mark(row.question.revisionId)}
            >
              <Flag size={20} aria-hidden="true" />
              {marks.includes(row.question.revisionId) ? '取消待查' : '标记待查'}
            </Button>
          </div>
          <div className="assessment-stem">
            <MathText text={row.question.stem} />
          </div>
          <fieldset className="assessment-options" disabled={blocked}>
            <legend className="secondary">选择一个答案{blocked ? '（暂不可改选）' : ''}</legend>
            {row.question.options.map((option, optionIndex) => (
              <label className="assessment-option" key={optionIndex}>
                <input
                  type="radio"
                  name={row.question.revisionId}
                  checked={selected(row.question.revisionId, row.selectedOption) === optionIndex}
                  onChange={() => queue.choose(row.question.revisionId, optionIndex)}
                />
                <span>
                  {String.fromCharCode(65 + optionIndex)}. <MathText text={option} />
                </span>
              </label>
            ))}
          </fieldset>
          <div className="assessment-navigation">
            <Button
              variant="secondary"
              disabled={index === 0}
              disabledReason="已经是第一题。"
              onClick={() => setIndex((value) => value - 1)}
            >
              上一题
            </Button>
            <Button
              variant="secondary"
              disabled={index === session.questions.length - 1}
              disabledReason="已经是最后一题。"
              onClick={() => setIndex((value) => value + 1)}
            >
              下一题
            </Button>
          </div>
        </section>
      )}
      <details className="assessment-desktop-panel">
        <summary>题号面板 · 跳题与待查</summary>
        <p className="secondary">边框为当前题 · ✓ 已答 · ○ 未答 · ⚑ 标记待查</p>
        {grid}
      </details>
      <Modal open={drawer} title="题号面板" onClose={() => setDrawer(false)}>
        <p>✓ 已答 · ○ 未答 · ⚑ 标记待查；边框为当前题。</p>
        {grid}
      </Modal>
      <footer className="assessment-submitbar">
        <span>
          未答 {Math.max(0, session.questionCount - answered)} 题
          {pendingCount > 0 ? ` · ${pendingCount} 题未同步` : ' · 答案已保存'}
        </span>
        <Button
          loading={finishing}
          loadingLabel="正在交卷"
          disabled={!session.deadlineReached && seconds === 0}
          disabledReason="正在核对服务端截止状态"
          onClick={() => (session.deadlineReached ? void finish(true) : setConfirm(true))}
        >
          交卷
        </Button>
      </footer>
      <Modal open={confirm} title="确认交卷" onClose={() => setConfirm(false)}>
        <p>
          {session.questionCount - answered > 0
            ? `还有 ${session.questionCount - answered} 题未答，未答题按错误计分。`
            : '全部题目已作答。'}
          交卷后不能修改答案。
        </p>
        <p>交卷前会等待答案保存成功。</p>
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setConfirm(false)}>
            继续作答
          </Button>
          <Button
            onClick={() => {
              void finish(false);
            }}
          >
            确认交卷
          </Button>
        </div>
      </Modal>
    </div>
  );
}
function Result({
  session,
  result,
  code,
  cycleId: _cycleId,
}: {
  session: AssessmentSession;
  result: AssessmentResult;
  code: string;
  cycleId: string;
}) {
  const practice = `/study/course/${code}/practice${session.chapterId ? `/${session.chapterId}` : ''}`;
  return (
    <>
      <section className="result-score stack">
        <h2>{result.score} / 100 分</h2>
        <p className={result.passed ? 'status-success' : 'status-error'}>
          {result.passed ? <Check aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}{' '}
          {result.passed ? result.pass ? '已通过' : '本次成绩达标' : '未通过'} · 通过线 {result.passScore} 分
        </p>
        {result.passed && !result.pass && <p>这是旧版检测记录。题库切换后完成旧答卷会保留成绩，但不会生成新版通过资格。请在考点练习页面查看后端给出的当前资格与阻断原因。</p>}
        <p>
          正确 {result.correctCount} / {result.questionCount} 题 · 用时{' '}
          {Math.max(
            0,
            Math.round((Date.parse(result.submittedAt) - Date.parse(session.startedAt)) / 1000),
          )}{' '}
          秒
        </p>
        <p>交卷时间：{formatShanghaiDate(result.submittedAt)}（上海时间）</p>
      </section>
      <section className="result-next">
        <p className="eyebrow">接下来</p>
        <h2>
          {result.passed
            ? '保持节奏，继续下一阶段。'
            : `先复盘这次的 ${result.questionCount - result.correctCount} 道错题。`}
        </h2>
        <p>
          {result.passed && result.pass
            ? '检测通过状态由系统记录。可以回到课程继续学习，或核对下一项检测资格。'
            : '先在下方查看作答解析，再回到对应章节练习，核对当前检测资格。'}
        </p>
        <p className="secondary">逐题回顾本次作答与解析，成绩和通过状态以这次检测结果为准。</p>
        <Link className="button button-secondary" to={practice}>
          继续章节练习
        </Link>
      </section>
      <section className="stack" aria-label="题目回顾">
        <h2>题目回顾</h2>
        {result.answers.length === 0 ? (
          <EmptyState
            message="暂无题目回顾。"
            actionLabel="返回刷题"
            onAction={() => {
              window.location.assign(practice);
            }}
          />
        ) : (
          result.answers.map((answer) => {
            const row = session.questions.find(
              (item) => item.question.revisionId === answer.revisionId,
            );
            return (
              <article className="result-review stack" key={answer.revisionId}>
                <h3>
                  第 {row?.position ?? '未知'} 题 ·{' '}
                  <span className={answer.correct ? 'status-success' : 'status-error'}>
                    {answer.correct ? '✓ 正确' : '✕ 错误'}
                  </span>
                </h3>
                {row && (
                  <div className="assessment-stem">
                    <MathText text={row.question.stem} />
                  </div>
                )}
                {row && (
                  <ol type="A">
                    {row.question.options.map((option, index) => (
                      <li key={index}>
                        <MathText text={option} />
                      </li>
                    ))}
                  </ol>
                )}
                <p>
                  你的答案：
                  {answer.selectedOption === null
                    ? '未答'
                    : String.fromCharCode(65 + answer.selectedOption)}
                </p>
                <p>
                  正确答案：{String.fromCharCode(65 + answer.correctOption)}.{' '}
                  <MathText text={answer.correctAnswer} />
                </p>
                <div>
                  解析：
                  <MathText text={answer.explanation} />
                </div>
              </article>
            );
          })
        )}
      </section>
      <div className="row">
        <Link
          className="button button-primary"
          to={`/study/course/${code}/tests/new?kind=${session.kind}&chapterId=${session.chapterId ?? ''}`}
        >
          重新检测
        </Link>
        <Link className="button button-secondary" to={practice}>
          返回刷题
        </Link>
      </div>
      {session.kind === 'MOCK' && result.passed && result.unlock.canDownloadPapers && (
        <section className="card stack status-success">
          <p>
            <Check aria-hidden="true" /> 真题已开放
          </p>
          <Link className="button button-primary" to={`/study/course/${code}/exams`}>
            查看历年真题
          </Link>
        </section>
      )}
    </>
  );
}
