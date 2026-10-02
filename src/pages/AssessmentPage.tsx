import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { ProgressBar } from '../components/ProgressBar';
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
  const back = `/zikao/course/${code}/practice?cycleId=${encodeURIComponent(cycleId)}`;
  if (!cycleId)
    return (
      <div className="assessment-page">
        <p role="alert">缺少考试周期，请从检测入口重新进入。</p>
        <Link className="button button-secondary" to={back}>
          返回刷题
        </Link>
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
        <h1>{search.get('kind') === 'MOCK' ? '模拟卷' : '章节检测'} · 开始前确认</h1>
        <section className="card stack">
          <h2>作答规则</h2>
          <p>
            单选题、等权计分、满分 100
            分，交卷后由系统自动判分。离开页面不会暂停计时，每次重新检测由系统重新抽题。
          </p>
          <p>题数、限时和通过线暂不可用。</p>
          <Button disabled disabledReason="暂时无法确认本次试卷规则，暂不能开始。">
            开始作答
          </Button>
          <Link className="button button-secondary" to={back}>
            返回刷题
          </Link>
        </section>
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
      key={session.id}
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
        navigate(
          `/zikao/course/${code}/tests/${testId}/result?cycleId=${encodeURIComponent(cycleId)}`,
          { replace: true },
        );
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
  const blocked = finishing || session.deadlineReached || seconds === 0;
  const mark = (id: string) => {
    const next = marks.includes(id) ? marks.filter((item) => item !== id) : [...marks, id];
    setMarks(next);
    try {
      localStorage.setItem(markKey, JSON.stringify(next));
    } catch {
      /* Marking remains available in memory. */
    }
  };
  return (
    <div className="assessment-page stack">
      <header className="assessment-toolbar card">
        <h1>{testName}</h1>
        <div
          className={
            seconds <= 60 ? 'status-error' : seconds <= 300 ? 'status-warning' : 'status-info'
          }
        >
          <Timer size={20} aria-hidden="true" /> 剩余 {Math.floor(seconds / 60)}:
          {String(seconds % 60).padStart(2, '0')}
          {seconds <= 60 ? ' · 即将结束，请尽快交卷' : seconds <= 300 ? ' · 剩余不足 5 分钟' : ''}
        </div>
        <span>
          已答 {answered} / {session.questionCount}
        </span>
        <Button
          loading={finishing}
          onClick={() => (session.deadlineReached ? void finish(true) : setConfirm(true))}
        >
          交卷
        </Button>
      </header>
      <ProgressBar label="作答进度" value={answered} max={session.questionCount} />
      <p className="secondary">
        限时 {session.limitMinutes} 分钟 · 通过线 {session.passScore} 分 · 截止{' '}
        {formatShanghaiDate(session.deadlineAt)}（上海时间）。离开页面不会暂停计时。
      </p>
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
      <div aria-live="polite">
        {queue.busy
          ? '正在保存答案…'
          : Object.keys(queue.drafts).length
            ? '未保存 · 答案已本地暂存，恢复网络后补发。'
            : '答案已保存'}
        {queue.storageError && <p role="alert">{queue.storageError}</p>}
      </div>
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
          className="card stack"
          aria-label={`第 ${row.position} 题`}
          aria-disabled={blocked}
          aria-busy={finishing}
        >
          <div className="row">
            <h2>第 {row.position} 题 · 单选</h2>
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
      <section className="card stack">
        <h2>题号面板</h2>
        <p>✓ 已答 / ○ 未答 / ⚑ 标记待查</p>
        <nav className="assessment-grid" aria-label="选择题号">
          {session.questions.map((item, itemIndex) => {
            const id = item.question.revisionId;
            const done = selected(id, item.selectedOption) !== null;
            const marked = marks.includes(id);
            return (
              <Button
                key={id}
                variant="secondary"
                className={marked ? 'assessment-marked' : done ? 'assessment-answered' : ''}
                aria-current={index === itemIndex ? 'step' : undefined}
                aria-label={`第 ${item.position} 题，${done ? '已答' : '未答'}${marked ? '，标记待查' : ''}`}
                onClick={() => setIndex(itemIndex)}
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
      </section>
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
  cycleId,
}: {
  session: AssessmentSession;
  result: AssessmentResult;
  code: string;
  cycleId: string;
}) {
  const practice = `/zikao/course/${code}/practice${session.chapterId ? `/${session.chapterId}` : ''}?cycleId=${encodeURIComponent(cycleId)}`;
  return (
    <>
      <section className="card stack">
        <h2>{result.score} / 100 分</h2>
        <p className={result.passed ? 'status-success' : 'status-error'}>
          {result.passed ? <Check aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}{' '}
          {result.passed ? '已通过' : '未通过'} · 通过线 {result.passScore} 分
        </p>
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
      <section className="card stack">
        <h2>考点掌握情况</h2>
        <p>本次检测的考点掌握情况暂不可用。</p>
        <Button disabled disabledReason="暂无法获取薄弱考点及对应章节。">
          去练习薄弱考点
        </Button>
        <Link className="button button-secondary" to={practice}>
          返回章节刷题
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
              <article className="card stack" key={answer.revisionId}>
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
          to={`/zikao/course/${code}/tests/new?kind=${session.kind}&chapterId=${session.chapterId ?? ''}&cycleId=${encodeURIComponent(cycleId)}`}
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
          <Link
            className="button button-primary"
            to={`/zikao/course/${code}/exams?cycleId=${encodeURIComponent(cycleId)}`}
          >
            查看历年真题
          </Link>
        </section>
      )}
    </>
  );
}
