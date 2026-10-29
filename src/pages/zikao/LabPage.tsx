import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  ChevronDown,
  Copy,
  Download,
  Loader2,
  PencilLine,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  XCircle,
} from 'lucide-react';
import {
  javaSets,
  sqlMockSet,
  sqlMockSetB,
  sqlMockSetC,
  sqlSet,
  type LabQuestion,
  type LabSet,
} from '../../data/lab';
import { runSql, type SqlOutcome } from '../../lib/sqlRunner';
import {
  cancelGrade as cancelGradeJob,
  getGrade,
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
const JAVA_RUNNER = 'http://127.0.0.1:18791';
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
const DEV = import.meta.env.DEV;

interface JavaRunState {
  ok: boolean;
  stage?: 'compile' | 'run' | 'runner';
  message: string;
  className?: string;
  output?: string;
  finished?: boolean;
  image?: string | null;
  windowed?: boolean;
}

interface RunnerPayload {
  ok: boolean;
  stage?: JavaRunState['stage'];
  message?: string;
  className?: string;
  output?: string;
  finished?: boolean;
  image?: string | null;
  windowed?: boolean;
}

async function runJava(code: string, fileName: string): Promise<JavaRunState> {
  try {
    const response = await fetch(`${JAVA_RUNNER}/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, name: fileName.replace(/\.java$/i, '') }),
    });
    const data = (await response.json()) as RunnerPayload;
    return {
      ok: data.ok,
      stage: data.stage,
      message: data.message ?? data.output ?? '',
      className: data.className,
      output: data.output,
      finished: data.finished,
      image: data.image ?? null,
      windowed: data.windowed,
    };
  } catch {
    return {
      ok: false,
      stage: 'runner',
      message:
        '本机运行器没启动。双击 ~/IDEA/自考/tools/启动Java运行器.command，或在终端执行 node ~/IDEA/自考/tools/java-runner.mjs，然后再点运行。',
    };
  }
}

async function stopJava() {
  try {
    await fetch(`${JAVA_RUNNER}/stop`, { method: 'POST' });
  } catch {
    /* 运行器没起也无所谓 */
  }
}

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
  template,
  view,
}: {
  question: LabQuestion;
  template: string;
  view: LabView;
}) {
  const [outcome, setOutcome] = useState<SqlOutcome | null>(null);
  const [running, setRunning] = useState(false);
  const [javaRun, setJavaRun] = useState<JavaRunState | null>(null);
  const [javaWindow, setJavaWindow] = useState(false);
  const [runnerReady, setRunnerReady] = useState(DEV);
  const gradeJob = useSyncExternalStore(subscribeGrade, getGrade);
  const [gradeTick, setGradeTick] = useState(0);
  // 批改任务挂在模块上：切到别的页面回来还在，只有属于本页的题才显示
  const grade =
    gradeJob.status !== 'idle' && gradeJob.questionId !== question.id
      ? ({ status: 'idle', questionId: null } as const)
      : gradeJob;

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    fetch(`${JAVA_RUNNER}/health`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { ok?: boolean }) => {
        if (data?.ok) setRunnerReady(true);
      })
      .catch(() => {
        /* 没开运行器就保持隐藏运行按钮 */
      })
      .finally(() => clearTimeout(timer));
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

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

  useEffect(() => {
    setOutcome(null);
    setJavaRun(null);
    stopJava().catch(() => {});
    setJavaWindow(false);
  }, [question.id]);

  // 点「批改」就冻住编辑区（批改中 + 已完成都锁），只有「重做」才解冻
  const locked = grade.status === 'grading' || grade.status === 'done' ? grade : null;
  const frozen = grade.status === 'done' ? grade : null;
  const sqlMode = question.mode === 'ddl' || question.mode === 'query';
  const runnable = sqlMode || (!question.mode && runnerReady);

  async function handleRun() {
    setRunning(true);
    try {
      if (sqlMode) {
        setOutcome(await runSql(draft, { seed: question.mode === 'query', dataset: question.dataset }));
      } else {
        const result = await runJava(draft, question.fileName);
        setJavaRun(result);
        // 服务器模式是「跑完截图就关」，没有常驻窗口可停
        // 只有还在跑的（多半是界面程序）才需要「停止」；命令行程序这时已经结束了
        if (result.ok && !result.image && !result.finished) setJavaWindow(true);
      }
    } finally {
      setRunning(false);
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
    cancelGradeJob();
  }

  async function handleStop() {
    await stopJava();
    setJavaRun(null);
    setJavaWindow(false);
  }
  const [draft, setDraft] = useDraft(question);
  const [copied, setCopied] = useState(false);
  const [resetHint, setResetHint] = useState(false);

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
      <section className="glass px-4 py-3 sm:px-5 lg:sticky lg:top-3 lg:z-20 lg:bg-[rgba(255,255,255,0.9)]">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-muted text-[13px] tabular-nums">第 {question.no} 题</span>
          <h2 className="text-ink text-[17px] font-semibold">{question.title}</h2>
          <span className="bg-brand-soft text-brand-ink rounded-full px-2 py-0.5 text-[12px]">{question.score}</span>
        </div>
        <p className="text-secondary mt-2 text-[14px] leading-6">{question.requirement}</p>

        <ul className="mt-2 flex flex-col gap-1 lg:grid lg:grid-cols-2 lg:gap-x-6">
          {question.checks.map((check) => (
            <li key={check} className="text-secondary flex gap-2 text-[13px] leading-5">
              <span className="text-brand mt-0.5 shrink-0">
                <Check size={13} strokeWidth={2.4} />
              </span>
              {check}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-4">
      <section className="glass overflow-hidden lg:flex lg:flex-col">
        <div className="border-line/70 flex flex-wrap items-center gap-2 border-b px-4 py-2.5 sm:px-5">
          <span className="text-secondary text-[13px]">{question.fileName}</span>
          <span className="text-muted ml-auto text-[12px]">{question.engine ?? 'Java'}</span>
          {runnable && !locked && (
            <button
              type="button"
              onClick={handleRun}
              disabled={running}
              className="pill pill--solid flex items-center gap-1.5 px-3.5 py-1 text-[12px] disabled:opacity-60"
            >
              {running ? (
                <Loader2 size={13} strokeWidth={2} className="animate-spin" />
              ) : (
                <Play size={13} strokeWidth={2} />
              )}
              运行
            </button>
          )}
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
            {grade.status === 'grading' ? `批改中 ${gradeTick} 秒` : 'AI 批改'}
          </button>
          {javaWindow && (
            <button
              type="button"
              onClick={handleStop}
              className="text-secondary hover:text-ink flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[12px]"
            >
              <Square size={12} strokeWidth={2} />
              停止
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
                onClick={() => resetGrade()}
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
          <button
            type="button"
            onClick={() => {
              setDraft(template);
              setResetHint(true);
              window.setTimeout(() => setResetHint(false), 1500);
            }}
            className={`text-secondary hover:text-ink flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[12px] ${locked ? 'hidden' : ''}`}
          >
            <RotateCcw size={13} strokeWidth={1.8} />
            {resetHint ? '已填好' : '填模板'}
          </button>
          {copied && <span className="text-brand text-[12px]">已复制</span>}
        </div>

        {grade.status === 'grading' && (
          <div className="text-secondary flex flex-wrap items-center gap-3 bg-[var(--iris-2)] px-4 py-2 text-[13px] sm:px-5">
            <Loader2 size={14} strokeWidth={2} className="text-brand animate-spin" />
            <span>AI 正在逐条对照评分点看你的代码，已等 {gradeTick} 秒</span>
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
              {frozen.result.marks.length > 0
                ? `共 ${frozen.result.marks.length} 处问题`
                : frozen.result.verdict === 'pass'
                  ? '没有发现具体错误'
                  : '但没指出具体位置，建议再批一次'}
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
          placeholder={
            question.mode
              ? '写 SQL，点运行，结果直接出现在下面。'
              : '在这里写，写完复制到 Eclipse 跑。'
          }
          className="text-ink placeholder:text-muted block h-72 w-full resize-y bg-transparent px-4 py-3 font-mono text-[13px] leading-6 outline-none sm:h-80 sm:px-5 lg:h-[calc(100dvh-22rem)] lg:min-h-[380px] lg:max-h-[720px] lg:resize-y"
        />
        )}

        {question.mode === 'mysql' && (
          <p className="text-muted border-line/70 border-t px-4 py-2.5 text-[12px] leading-5 sm:px-5">
            MySQL 专属写法（delimiter、trigger、procedure、function），浏览器里的 SQLite 引擎跑不了。复制到本机
            MySQL 里验证。
          </p>
        )}

        {!question.mode && (
          <p
            className={`text-muted border-line/70 border-t px-4 py-2 text-[12px] leading-5 sm:px-5 ${
              runnerReady ? 'lg:hidden' : ''
            }`}
          >
            {runnerReady ? (
              <>
                点「运行」在本机 JDK 执行（命令行回显输出、界面程序弹窗）；不想开运行器就下载用{' '}
                <code className="text-secondary">tools/run-java.sh</code>。
              </>
            ) : (
              <>
                复制或下载代码，用 Eclipse 运行，或终端跑
                <code className="text-secondary">tools/run-java.sh</code>。数据库题可直接在这里执行。
              </>
            )}
          </p>
        )}
      </section>

      {grade.status === 'done' && (grade.result.summary || grade.result.issues.length > 0) && (
        <section className="glass flex flex-col gap-2 px-4 py-3 sm:px-5">
          {grade.result.issues.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {grade.result.issues.map((issue, index) => (
                <li key={index} className="text-danger flex items-start gap-2 text-[13px] leading-6">
                  <AlertTriangle size={13} strokeWidth={2} className="mt-1 shrink-0" />
                  <span className="min-w-0">{issue}</span>
                </li>
              ))}
            </ul>
          )}
          {grade.result.summary && (
            <p className="text-secondary text-[13px] leading-6">{grade.result.summary}</p>
          )}
        </section>
      )}

      {javaRun && (
        <section className="glass px-4 py-3 sm:px-5">
          {javaRun.ok ? (
            <div className="flex flex-col gap-2">
              <p className="text-secondary text-[13px]">
                {javaRun.finished ? '跑完了。' : '启动成功。'}
                <span className="text-muted">
                  {javaRun.image
                    ? ` 类名 ${javaRun.className}，窗口见下图。`
                    : javaRun.finished
                      ? javaRun.output?.trim()
                        ? ` 类名 ${javaRun.className}，输出见下方。`
                        : ` 类名 ${javaRun.className}，程序正常结束但没有打印任何内容——检查是不是还没写 System.out.print。`
                      : ` 类名 ${javaRun.className}，窗口应该已经弹在你桌面上；点「停止」可以关掉它。`}
                </span>
              </p>
              {javaRun.image && (
                <img
                  src={javaRun.image}
                  alt="程序窗口"
                  className="border-line max-h-[420px] w-auto max-w-full self-start rounded-[10px] border"
                />
              )}
              {javaRun.output?.trim() && (
                <pre className="border-line text-secondary max-h-[320px] overflow-auto rounded-[10px] border bg-[var(--slate-2)] px-3 py-2 font-mono text-[12px] leading-5 whitespace-pre-wrap">
                  {javaRun.output}
                </pre>
              )}
            </div>
          ) : (
            <div className="text-danger flex items-start gap-2 text-[13px]">
              <AlertTriangle size={14} strokeWidth={2} className="mt-1 shrink-0" />
              <div className="min-w-0">
                <p>{javaRun.stage === 'compile' ? '编译没通过' : javaRun.stage === 'runner' ? '运行器连不上' : '运行出错'}</p>
                <pre className="text-ink mt-2 overflow-x-auto font-mono text-[12px] leading-5 whitespace-pre-wrap">
                  {javaRun.message}
                </pre>
              </div>
            </div>
          )}
        </section>
      )}

      {outcome && (
        <section className="glass px-4 py-3 sm:px-5">
          {outcome.ok ? (
            <>
              <p className="text-secondary text-[13px]">
                执行成功
                {outcome.results.length === 0 && '，没有结果集'}
                {outcome.tables.length > 0 && (
                  <span className="text-muted"> · 库里的表：{outcome.tables.join('、')}</span>
                )}
              </p>
              {outcome.results.map((set, index) => (
                <div key={index} className="mt-3 overflow-x-auto">
                  <table className="w-full border-collapse text-left text-[12.5px]">
                    <thead>
                      <tr className="text-muted">
                        {set.columns.map((column) => (
                          <th key={column} className="border-line/70 border-b px-2.5 py-2 font-normal whitespace-nowrap">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {set.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="text-secondary">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="border-line/50 border-b px-2.5 py-2 whitespace-nowrap tabular-nums">
                              {cell === null ? 'NULL' : String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-muted mt-2 text-[12px]">{set.rows.length} 行</p>
                </div>
              ))}
            </>
          ) : (
            <p className="text-danger flex items-start gap-2 text-[13px] leading-6">
              <AlertTriangle size={14} strokeWidth={2} className="mt-1 shrink-0" />
              <span>
                {outcome.error}
                <span className="text-muted mt-1 block text-[12px]">
                  若报 unrecognized token 或 near，先检查这两处：建表列清单要用圆括号，语句之间用分号；
                  再考虑 MySQL 与 SQLite 的写法差异（comment、delimiter、signal）。
                </span>
              </span>
            </p>
          )}
        </section>
      )}

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
  const restored = getGrade();
  const restoredView = restored.status === 'idle' ? undefined : restored.view;
  const restoredQuestionId = restored.status === 'idle' ? '' : restored.questionId;

  const [tab, setTab] = useState<'java' | 'sql'>(restoredView?.tab ?? 'sql');
  const [javaSetIndex, setJavaSetIndex] = useState(() => {
    const index = restoredView?.javaSetId
      ? javaSets.findIndex((set) => set.id === restoredView.javaSetId)
      : -1;
    return index >= 0 ? index : Math.max(0, javaSets.findIndex((set) => set.id === 'java-mock'));
  });
  const [sqlPaper, setSqlPaper] = useState<'real' | 'a' | 'b' | 'c'>(restoredView?.sqlPaper ?? 'a');
  const [selectedId, setSelectedId] = useState(restoredQuestionId || javaSets[0].questions[0].id);
  const skipReset = useRef(Boolean(restoredQuestionId));

  const sqlActiveSet =
    sqlPaper === 'a'
      ? sqlMockSet
      : sqlPaper === 'b'
        ? sqlMockSetB
        : sqlPaper === 'c'
          ? sqlMockSetC
          : sqlSet;
  const passed = useSyncExternalStore(subscribePassed, getPassed);
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
          (
            [
              ['a', '模拟卷 A'],
              ['b', '模拟卷 B'],
              ['c', '模拟卷 C'],
              ['real', '真题 2017-04'],
            ] as const
          ).map(([key, label]) => (
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
            .sort((a, b) => Number(b.set.id === 'java-mock') - Number(a.set.id === 'java-mock'))
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
          </p>
          <nav className="flex flex-col gap-0.5">
            {activeSet.questions.map((item) => {
              const active = item.id === question.id;
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
                    {passed.has(item.id) && (
                      <BadgeCheck
                        size={14}
                        strokeWidth={2}
                        className="mt-0.5 shrink-0 text-[var(--green-10)]"
                        aria-label="已合格"
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <QuestionPanel
          question={question}
          template={question.starter ?? ''}
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
