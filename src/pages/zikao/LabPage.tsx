import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  AlertTriangle,
  AlignLeft,
  BadgeCheck,
  ChevronDown,
  Copy,
  Download,
  Loader2,
  PencilLine,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  javaSets,
  sqlMockSetB,
  sqlMockSetC,
  sqlMockSetD,
  sqlMockSetE,
  sqlSet,
  type LabQuestion,
  type LabSet,
} from '../../data/lab';
import { formatCode } from '../../lib/format';
import {
  cancelGrade as cancelGradeJob,
  getGrades,
  getLastView,
  getPassed,
  resetGrade,
  startGrade,
  subscribeGrade,
  subscribePassed,
  type LabView,
} from '../../lib/labStore';

/** 实践课上机考试：2026-10-31（周六）。 */
const EXAM_DAY = new Date(2026, 9, 31);

function daysUntil(target: Date) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function useDraft(question: LabQuestion) {
  const key = `xj.lab.${question.id}`;
  const [value, setValue] = useState(() => localStorage.getItem(key) ?? '');

  useEffect(() => {
    setValue(localStorage.getItem(key) ?? '');
  }, [key]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    }, 300);
    return () => window.clearTimeout(id);
  }, [key, value]);

  return [value, setValue] as const;
}

/**
 * Java 只在本机跑：本地开发时连 Mac 上的 tools/java-runner.mjs。
 * 线上不提供服务器编译（用户决定不要那套环境），Java 题给出本机跑法即可。
 */
/** AI 批改走同源反代：线上由 nginx 注入令牌转到宿主 lab-grader，本地开发由 vite 代理到线上。 */

interface GradeMark {
  line: number | null;
  why: string;
}

interface GradeResult {
  verdict: 'pass' | 'fail';
  /** 卷面上的问题批注：只在有问题的行上出现 */
  marks: GradeMark[];
  /** 定位不到行号的问题 */
  issues: string[];
  summary: string;
}

/**
 * 本机 Java 运行器是否在线：开发时默认按「可用」处理，线上页面探测一下
 * （只在你自己的 Mac 上开着运行器时才连得上）。
 */

function download(name: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** 冻结后的「原卷」：逐行显示学生代码，有问题的那一行下面挂批注。 */
function FrozenPaper({ code, result }: { code: string; result: GradeResult | null }) {
  const marks = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const mark of result?.marks ?? []) {
      if (!mark.line) continue;
      const list = map.get(mark.line) ?? [];
      if (!list.includes(mark.why) && list.length < 2) list.push(mark.why);
      map.set(mark.line, list);
    }
    return map;
  }, [result]);

  const lines = code.replace(/\r\n/g, '\n').split('\n');

  return (
    <div className="max-h-[640px] overflow-auto px-1 py-2">
      {lines.map((text, index) => {
        const number = index + 1;
        const lineMarks = marks.get(number) ?? [];
        const tone = lineMarks.length > 0 ? 'bg-[var(--red-2)]' : '';
        return (
          <div key={number} className={`rounded-[6px] ${tone}`}>
            <div className="flex items-start gap-3 px-2">
              <span className="text-muted w-7 shrink-0 pt-0.5 text-right text-[11px] tabular-nums select-none">
                {number}
              </span>
              <code className="text-ink min-w-0 flex-1 py-0.5 font-mono text-[12.5px] leading-5 whitespace-pre-wrap break-words">
                {text || ' '}
              </code>
            </div>
            {lineMarks.length > 0 && (
              <ul className="flex flex-col gap-1 pt-1 pr-2 pb-1.5 pl-10">
                {lineMarks.map((text, markIndex) => (
                  <li
                    key={markIndex}
                    className="flex items-start gap-1.5 rounded-[8px] bg-[var(--red-3)] px-2 py-1 text-[12px] leading-5 text-[var(--red-11)]"
                  >
                    <XCircle size={12} strokeWidth={2.4} className="mt-0.5 shrink-0" />
                    <span className="min-w-0">{text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function QuestionPanel({
  question,
  view,
  preface,
}: {
  question: LabQuestion;
  view: LabView;
  preface?: string[];
}) {
  const grades = useSyncExternalStore(subscribeGrade, getGrades);
  const [gradeTick, setGradeTick] = useState(0);
  // 每道题各自一份批改状态，互不挤占
  const entry = grades[question.id];
  const grade = entry ?? ({ status: 'idle' } as const);

  useEffect(() => {
    if (grade.status !== 'grading') return;
    const startedAt = grade.startedAt;
    setGradeTick(Math.max(0, Math.round((Date.now() - startedAt) / 1000)));
    const timer = window.setInterval(
      () => setGradeTick(Math.max(0, Math.round((Date.now() - startedAt) / 1000))),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [grade.status, grade.status === 'grading' ? grade.startedAt : 0]);

  // 点「批改」就冻住编辑区（批改中 + 已完成都锁），只有「重做」才解冻
  const locked = grade.status === 'grading' || grade.status === 'done' ? grade : null;
  const frozen = grade.status === 'done' ? grade : null;

  async function handleFormat() {
    setFormatError('');
    setFormatting(true);
    try {
      const next = await formatCode(draft, question.mode ? 'sql' : 'java');
      setDraft(next);
    } catch {
      setFormatError('这段代码没格式化成功，可能少了括号或分号');
    } finally {
      setFormatting(false);
    }
  }

  function handleGrade() {
    startGrade({
      view,
      questionId: question.id,
      title: question.title,
      requirement: question.requirement,
      checks: question.checks,
      code: draft,
      lang: question.mode ? 'sql' : 'java',
    });
  }

  function cancelGrade() {
    cancelGradeJob(question.id);
  }

  const [draft, setDraft] = useDraft(question);
  const [copied, setCopied] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [formatError, setFormatError] = useState('');

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {preface && preface.length > 0 && (
        <details open className="glass px-4 py-3 sm:px-5 lg:shrink-0">
          <summary className="text-secondary cursor-pointer text-[13px]">试卷说明（库里的表结构）</summary>
          <ul className="text-secondary mt-2 flex flex-col gap-1 text-[12px] leading-5">
            {preface.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      )}

      <section className="glass px-4 py-3 sm:px-5 lg:sticky lg:top-3 lg:z-20 lg:bg-[rgba(255,255,255,0.9)]">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-muted text-[13px] tabular-nums">第 {question.no} 题</span>
          <h2 className="text-ink text-[17px] font-semibold">{question.title}</h2>
          </div>
        <p className="text-secondary mt-2 text-[14px] leading-6">{question.requirement}</p>

      </section>

      <div className="flex flex-col gap-4">
      <section className="glass overflow-hidden lg:flex lg:flex-col">
        <div className="border-line/70 flex flex-wrap items-center gap-2 border-b px-4 py-2.5 sm:px-5">
          <span className="text-secondary text-[13px]">{question.fileName}</span>
          <span className="text-muted ml-auto text-[12px]">{question.engine ?? 'Java'}</span>
          <button
            type="button"
            onClick={handleGrade}
            disabled={grade.status === 'grading' || draft.trim().length < 20}
            className={`pill text-brand flex items-center gap-1.5 px-3.5 py-1 text-[12px] disabled:opacity-50 ${locked ? 'hidden' : ''}`}
          >
            {grade.status === 'grading' ? (
              <Loader2 size={13} strokeWidth={2} className="animate-spin" />
            ) : (
              <Sparkles size={13} strokeWidth={2} />
            )}
            {grade.status === 'grading'
              ? `${grade.queued ? '排队中' : '批改中'} ${gradeTick} 秒`
              : 'AI 批改'}
          </button>
          {!locked && (
            <button
              type="button"
              onClick={handleFormat}
              disabled={formatting || !draft.trim()}
              className="text-secondary hover:text-ink flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[12px] disabled:opacity-50"
            >
              {formatting ? (
                <Loader2 size={13} strokeWidth={2} className="animate-spin" />
              ) : (
                <AlignLeft size={13} strokeWidth={1.8} />
              )}
              格式化
            </button>
          )}
          <button
            type="button"
            onClick={() => copy(draft)}
            className="text-secondary hover:text-ink flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[12px]"
          >
            <Copy size={13} strokeWidth={1.8} />
            复制
          </button>
          <button
            type="button"
            onClick={() => download(question.fileName, draft)}
            className="text-secondary hover:text-ink flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[12px]"
          >
            <Download size={13} strokeWidth={1.8} />
            下载
          </button>
          {locked && (
            <>
              <button
                type="button"
                onClick={() => resetGrade(question.id)}
                className="pill text-brand flex items-center gap-1.5 px-3.5 py-1 text-[12px]"
              >
                <PencilLine size={13} strokeWidth={2} />
                重做
              </button>
              {frozen && (
                <button
                  type="button"
                  onClick={handleGrade}
                  className="text-secondary hover:text-ink flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[12px]"
                >
                  <RotateCcw size={12} strokeWidth={2} />
                  再次批改
                </button>
              )}
            </>
          )}
          {copied && <span className="text-brand text-[12px]">已复制</span>}
          {formatError && <span className="text-danger text-[12px]">{formatError}</span>}
        </div>

        {grade.status === 'grading' && (
          <div className="text-secondary flex flex-wrap items-center gap-3 bg-[var(--iris-2)] px-4 py-2 text-[13px] sm:px-5">
            <Loader2 size={14} strokeWidth={2} className="text-brand animate-spin" />
            <span>
              {grade.status === 'grading' && grade.queued
                ? `排队中，前面的批改还在跑，已等 ${gradeTick} 秒`
                : `AI 正在逐条对照评分点看你的代码，已等 ${gradeTick} 秒`}
            </span>
            <button
              type="button"
              onClick={cancelGrade}
              className="text-secondary hover:text-ink ml-auto rounded-full border border-line px-3 py-0.5 text-[12px]"
            >
              取消
            </button>
          </div>
        )}

        {grade.status === 'error' && (
          <div className="text-danger flex flex-wrap items-center gap-3 bg-[var(--red-2)] px-4 py-2 text-[13px] sm:px-5">
            <AlertTriangle size={14} strokeWidth={2} />
            <span>批改失败：{grade.message}</span>
            <button
              type="button"
              onClick={handleGrade}
              className="ml-auto flex items-center gap-1.5 rounded-full border border-line px-3 py-0.5 text-[12px]"
            >
              <RotateCcw size={12} strokeWidth={2} />
              再试一次
            </button>
          </div>
        )}

        {frozen && (
          <div
            className={`flex flex-wrap items-center gap-2 px-4 py-2 text-[13px] sm:px-5 ${
              frozen.result.verdict === 'pass'
                ? 'bg-[var(--green-3)] text-[var(--green-11)]'
                : 'bg-[var(--red-3)] text-[var(--red-11)]'
            }`}
          >
            {frozen.result.verdict === 'pass' ? (
              <BadgeCheck size={15} strokeWidth={2.2} />
            ) : (
              <XCircle size={15} strokeWidth={2.2} />
            )}
            <span className="font-medium">{frozen.result.verdict === 'pass' ? '合格' : '不合格'}</span>
            <span className="opacity-80">
              {(() => {
                const lines = new Set(frozen.result.marks.map((mark) => mark.line)).size;
                if (lines > 0)
                  return `共 ${lines} 行有问题${frozen.result.issues.length ? `，另有 ${frozen.result.issues.length} 条整体问题` : ''}`;
                if (frozen.result.issues.length > 0) return `另有 ${frozen.result.issues.length} 条整体问题`;
                return frozen.result.verdict === 'pass'
                  ? '没有发现具体错误'
                  : '但没指出具体位置，建议再批一次';
              })()}
            </span>
            <span className="opacity-80">批改用时 {frozen.seconds} 秒</span>
            <span className="opacity-80">点「重做」可以改，改完再批一次</span>
          </div>
        )}

        {locked ? (
          <FrozenPaper code={locked.code} result={frozen ? frozen.result : null} />
        ) : (
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          spellCheck={false}
          placeholder="在这里写代码，写完点「AI 批改」看能不能过。"
          className="text-ink placeholder:text-muted block h-72 w-full resize-y bg-transparent px-4 py-3 font-mono text-[13px] leading-6 outline-none sm:h-80 sm:px-5 lg:h-[calc(100dvh-22rem)] lg:min-h-[380px] lg:max-h-[720px] lg:resize-y"
        />
        )}

        {frozen && (frozen.result.issues.length > 0 || frozen.result.summary) && (
          <div className="border-line/70 flex flex-col gap-1.5 border-t px-4 py-3 sm:px-5">
            {frozen.result.issues.map((issue, index) => (
              <p key={index} className="text-danger flex items-start gap-2 text-[13px] leading-6">
                <AlertTriangle size={13} strokeWidth={2} className="mt-1 shrink-0" />
                <span className="min-w-0">{issue}</span>
              </p>
            ))}
            {frozen.result.summary && (
              <p className="text-secondary text-[13px] leading-6">{frozen.result.summary}</p>
            )}
          </div>
        )}

      </section>

      <details className="glass group shrink-0 px-4 py-3 sm:px-5">
        <summary className="text-secondary flex cursor-pointer items-center gap-1.5 text-[13px] marker:content-none">
          <ChevronDown size={14} strokeWidth={1.8} className="transition-transform group-open:rotate-180" />
          参考答案
        </summary>
        <pre className="text-ink mt-3 overflow-x-auto font-mono text-[12.5px] leading-6">{question.answer}</pre>
      </details>
      </div>
    </div>
  );
}

export function LabPage() {
  // 刷新后如果还有批改在跑/刚跑完，回到那一卷那一题
  const initialGrades = getGrades();
  const restoredView = getLastView();
  const restoredQuestionId =
    Object.entries(initialGrades).find(([, entry]) => entry.status === 'grading')?.[0] ??
    Object.keys(initialGrades)[0] ??
    '';

  const [tab, setTab] = useState<'java' | 'sql'>(restoredView?.tab ?? 'sql');
  const [javaSetIndex, setJavaSetIndex] = useState(() => {
    const index = restoredView?.javaSetId
      ? javaSets.findIndex((set) => set.id === restoredView.javaSetId)
      : -1;
    return index >= 0 ? index : Math.max(0, javaSets.findIndex((set) => set.id === 'java-mock-a'));
  });
  const [sqlPaper, setSqlPaper] = useState<'real' | 'b' | 'c' | 'd' | 'e'>(
    restoredView?.sqlPaper ?? 'b',
  );
  const [selectedId, setSelectedId] = useState(restoredQuestionId || javaSets[0].questions[0].id);
  const skipReset = useRef(Boolean(restoredQuestionId));

  const sqlPapers = [
    { key: 'b', label: '模拟卷 B', set: sqlMockSetB },
    { key: 'c', label: '模拟卷 C', set: sqlMockSetC },
    { key: 'd', label: '模拟卷 D', set: sqlMockSetD },
    { key: 'e', label: '模拟卷 E', set: sqlMockSetE },
    { key: 'real', label: '真题 2017-04', set: sqlSet },
  ] as const;
  const sqlActiveSet = sqlPapers.find((item) => item.key === sqlPaper)?.set ?? sqlMockSetB;
  const passed = useSyncExternalStore(subscribePassed, getPassed);
  const liveGrades = useSyncExternalStore(subscribeGrade, getGrades);
  const activeSet: LabSet = tab === 'java' ? javaSets[javaSetIndex] : sqlActiveSet;

  useEffect(() => {
    if (skipReset.current) {
      skipReset.current = false;
      return;
    }
    setSelectedId(tab === 'java' ? javaSets[javaSetIndex].questions[0].id : sqlActiveSet.questions[0].id);
  }, [tab, javaSetIndex, sqlActiveSet]);

  const question = useMemo(
    () => activeSet.questions.find((item) => item.id === selectedId) ?? activeSet.questions[0],
    [activeSet, selectedId],
  );

  const gradingCount = Object.values(liveGrades).filter((entry) => entry.status === 'grading').length;
  const days = daysUntil(EXAM_DAY);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-ink text-[22px] font-semibold">实践演练</h1>
        <p className="text-secondary text-[13px]">
          10 月 31 日考试
          {days > 0 ? `，还有 ${days} 天` : '，今天就是考试日'}
        </p>

        <div className="flex w-full flex-wrap gap-2 lg:ml-auto lg:w-auto">
        {(
          [
            ['sql', '数据库上机'],
            ['java', 'Java 上机'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-[13px] transition-colors ${
              tab === key
                ? 'bg-brand-soft text-brand-ink font-medium'
                : 'text-secondary hover:text-ink border border-line'
            }`}
          >
            {label}
          </button>
        ))}

        {tab === 'sql' &&
          sqlPapers.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSqlPaper(key)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
                sqlPaper === key
                  ? 'pill pill--solid'
                  : 'text-secondary hover:text-ink border border-line'
              }`}
            >
              {label}
            </button>
          ))}

        {tab === 'java' &&
          [...javaSets]
            .map((set, index) => ({ set, index }))
            .sort((a, b) => Number(b.set.id === 'java-mock-a') - Number(a.set.id === 'java-mock-a'))
            .map(({ set, index }) => (
            <button
              key={set.id}
              type="button"
              onClick={() => setJavaSetIndex(index)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
                javaSetIndex === index
                  ? 'pill pill--solid'
                  : 'text-secondary hover:text-ink border border-line'
              }`}
            >
              {set.name}
            </button>
            ))}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="glass p-2 lg:sticky lg:top-5 lg:max-h-[calc(100dvh-2.5rem)] lg:overflow-y-auto">
          <p className="text-muted px-2 pt-1 text-[12px] leading-5">{activeSet.note}</p>
          <p className="text-secondary flex items-center gap-1.5 px-2 pt-2 pb-2 text-[12px] tabular-nums">
            <BadgeCheck size={13} strokeWidth={2} className="text-[var(--green-10)]" />
            已合格 {activeSet.questions.filter((item) => passed.has(item.id)).length}/
            {activeSet.questions.length}
            {gradingCount > 0 && (
              <span className="text-brand ml-1 flex items-center gap-1">
                <Loader2 size={11} strokeWidth={2} className="animate-spin" />
                {gradingCount} 个批改中
              </span>
            )}
          </p>
          <nav className="flex flex-col gap-0.5">
            {activeSet.questions.map((item) => {
              const active = item.id === question.id;
              const live = liveGrades[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  aria-current={active ? 'true' : undefined}
                  className={`rounded-[10px] px-2.5 py-2 text-left text-[13px] transition-colors ${
                    active ? 'bg-brand-soft text-brand-ink font-medium' : 'text-secondary hover:text-ink'
                  }`}
                >
                  <span className="flex items-start gap-1.5">
                    <span className="min-w-0">
                      <span className="tabular-nums">{item.no}.</span> {item.title}
                    </span>
                    {live?.status === 'grading' ? (
                      <span
                        className="text-brand mt-0.5 shrink-0"
                        aria-label={live.queued ? '排队中' : '批改中'}
                        title={live.queued ? '排队中' : '批改中'}
                      >
                        <Loader2 size={13} strokeWidth={2} className="animate-spin" />
                      </span>
                    ) : passed.has(item.id) ? (
                      <BadgeCheck
                        size={14}
                        strokeWidth={2}
                        className="mt-0.5 shrink-0 text-[var(--green-10)]"
                        aria-label="已合格"
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <QuestionPanel
          question={question}
          preface={activeSet.preface}
          view={{
            tab,
            javaSetId: tab === 'java' ? javaSets[javaSetIndex].id : undefined,
            sqlPaper: tab === 'sql' ? sqlPaper : undefined,
          }}
          key={question.id}
        />
      </div>
    </div>
  );
}
