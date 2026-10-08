import { UnsavedGuard } from '../components/UnsavedGuard';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bankRequest, type BankSession } from '../api/bank';
import { AnswerInput } from '../features/bank/BankPractice';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { MathText } from '../components/MathText';
import { QuestionStem } from '../features/bank/QuestionStem';
import { createUuid } from '../utils/uuid';
import { Link } from '../features/cycle/navigation';
import '../features/bank/bank.css';
export function Component() {
  const { testId = '', code = '' } = useParams();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['bank-session', testId],
    queryFn: () => bankRequest<BankSession>(`/bank/sessions/${testId}`),
    refetchOnWindowFocus: false,
    refetchInterval: (q) =>
      q.state.data && ['PENDING', 'NEEDS_REVIEW', 'FAILED'].includes(q.state.data.status)
        ? 15000
        : false,
  });
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Record<string, { selectedOption?: number; text?: string }>>(
    {},
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const received = useRef({ local: Date.now(), server: Date.now() });
  const key = useRef(createUuid());
  useEffect(() => {
    if (query.data)
      received.current = { local: Date.now(), server: Date.parse(query.data.serverTime) };
  }, [query.data]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const session = query.data;
  const dirty =
    session?.questions.some(
      (q) => values[q.id] && JSON.stringify(values[q.id]) !== JSON.stringify(q.saved?.answer ?? {}),
    ) ?? false;
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  if (query.isPending) return <p role="status">正在读取独立试卷…</p>;
  if (query.isError || !session)
    return (
      <p role="alert">
        {query.error?.message ?? '试卷读取失败'}
        <Button onClick={() => void query.refetch()}>重新读取</Button>
      </p>
    );
  const q = session.questions[index];
  const value = values[q.id] ?? q.saved?.answer ?? {};
  const inProgress = session.status === 'IN_PROGRESS';
  const remaining = Math.max(
    0,
    Math.ceil(
      (Date.parse(session.deadline_at) - (received.current.server + now - received.current.local)) /
        1000,
    ),
  );
  const saved = session.questions.filter((question) => question.saved?.answer).length;
  async function run(fn: () => Promise<BankSession>) {
    setBusy(true);
    setError('');
    try {
      const updated = await fn();
      queryClientSet(updated);
      return updated;
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
      return null;
    } finally {
      setBusy(false);
    }
  }
  // Refetch after mutation so browser refresh always restores the server snapshot.
  function queryClientSet(updated: BankSession) {
    client.setQueryData(['bank-session', testId], updated);
  }
  return (
    <section className="bank-layout">
      <header>
        <h2>{session.kind === 'MOCK' ? `固定模拟卷 ${session.variant}` : '独立章节检测'}</h2>
        {inProgress ? (
          <p role="timer">
            剩余 {Math.floor(remaining / 60)} 分 {remaining % 60} 秒 · 已保存 {saved}/
            {session.questions.length} 题
          </p>
        ) : (
          <p className="bank-status">
            {session.status === 'GRADED'
              ? `${session.rateLabel} ${session.rate}% · ${session.passed ? '已取得通过资格' : '未达到通过条件'}`
              : session.status === 'FAILED'
                ? '评分失败，等待管理员处理'
                : session.status === 'NEEDS_REVIEW'
                  ? '评分待核对，尚未判定通过'
                  : '完整交卷，等待主观题评分；尚未判定通过'}
          </p>
        )}
        {session.answers_previously_revealed && (
          <p>
            系统记录显示，交卷前已在其他答卷查看过本卷题目的答案。本次结果仅供练习，不取得新的模拟卷通过资格；已有有效资格保留。
          </p>
        )}
        {session.timed_out && <p>本次超时交卷，模拟卷不计有效通过资格。</p>}
        <p>未作答计零。纯选择题按正确率，混合题按得分率，达到90%且评分全部完成后判断通过。</p>
      </header>
      <nav className="bank-levels" aria-label="试卷题号">
        {session.questions.map((question, i) => (
          <Button
            key={question.id}
            variant={i === index ? 'primary' : 'secondary'}
            onClick={() => setIndex(i)}
          >
            {i + 1}
            {question.saved?.answer ? ' ✓' : ''}
          </Button>
        ))}
      </nav>
      <Card className="bank-practice">
        <h3>
          第 {index + 1} 题 · {q.maximum} 分
        </h3>
        <QuestionStem text={q.stem} />
        <AnswerInput
          question={q}
          value={value}
          disabled={!inProgress || busy || remaining === 0}
          onChange={(v) => {
            setValues((prior) => ({ ...prior, [q.id]: v }));
            key.current = createUuid();
          }}
        />
        {inProgress && (
          <Button
            loading={busy}
            disabled={
              remaining === 0 ||
              (q.type === 'CHOICE' && value.selectedOption === undefined) ||
              (q.type !== 'CHOICE' && !value.text?.trim())
            }
            onClick={() =>
              void run(async () => {
                const r = await bankRequest<BankSession>(
                  `/bank/sessions/${testId}/answers/${q.id}`,
                  'PUT',
                  { answer: value, expectedRevision: q.saved?.revision ?? 0 },
                );
                setValues((prior) => {
                  const next = { ...prior };
                  delete next[q.id];
                  return next;
                });
                return r;
              })
            }
          >
            保存本题答案
          </Button>
        )}
        {inProgress && (
          <p>
            {values[q.id]
              ? '本题有待保存修改。'
              : q.saved?.answer
                ? '本题答案已保存。'
                : '本题尚未保存答案。'}
          </p>
        )}
        {!inProgress && q.saved && (
          <p>
            评分状态：{q.saved.grading_state} ·{' '}
            {q.saved.earned == null ? '分数待核定' : `${q.saved.earned}/${q.maximum} 分`}
            {q.saved.feedback ? ` · ${q.saved.feedback}` : ''}
          </p>
        )}
        {q.explanation && <MathText text={q.explanation} />}
      </Card>
      {error && <p role="alert">{error}</p>}
      {inProgress && (
        <Card>
          <h3>完整交卷</h3>
          <p>
            当前还有 {session.questions.length - saved}{' '}
            题未保存作答，交卷后按零分计入。未保存的修改必须先保存；交卷后不能修改答案。
          </p>
          <Button
            loading={busy}
            disabled={dirty}
            disabledReason="存在未保存修改，请先保存对应题目"
            onClick={() =>
              void run(() =>
                bankRequest<BankSession>(
                  `/bank/sessions/${testId}/submit`,
                  'POST',
                  { expectedRevision: session.revision },
                  key.current,
                ),
              )
            }
          >
            确认完整交卷
          </Button>
          {remaining === 0 && <p>服务器时限已结束。交卷会记录超时；模拟卷不取得资格。</p>}
        </Card>
      )}
      <UnsavedGuard dirty={dirty} />
      <Link className="button button-secondary" to={`/study/course/${code}/practice`}>
        返回考点练习
      </Link>
    </section>
  );
}
