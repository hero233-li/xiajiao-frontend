import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Copy, Download, Loader2, Play, RotateCcw, Square } from 'lucide-react';
import { javaSets, sqlMockSet, sqlSet, type LabQuestion, type LabSet } from '../../data/lab';
import { runSql, type SqlOutcome } from '../../lib/sqlRunner';

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

function QuestionPanel({ question, template }: { question: LabQuestion; template: string }) {
  const [outcome, setOutcome] = useState<SqlOutcome | null>(null);
  const [running, setRunning] = useState(false);
  const [javaRun, setJavaRun] = useState<JavaRunState | null>(null);
  const [javaWindow, setJavaWindow] = useState(false);
  const [runnerReady, setRunnerReady] = useState(DEV);

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
    setOutcome(null);
    setJavaRun(null);
    stopJava().catch(() => {});
    setJavaWindow(false);
  }, [question.id]);

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
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <section className="glass px-4 py-4 sm:px-5 lg:shrink-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-muted text-[13px] tabular-nums">第 {question.no} 题</span>
          <h2 className="text-ink text-[17px] font-semibold">{question.title}</h2>
          <span className="bg-brand-soft text-brand-ink rounded-full px-2 py-0.5 text-[12px]">{question.score}</span>
        </div>
        <p className="text-secondary mt-3 text-[14px] leading-6">{question.requirement}</p>

        <ul className="mt-3 flex flex-col gap-1.5 lg:grid lg:grid-cols-2 lg:gap-x-6">
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

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:overflow-y-auto lg:pr-1">
      <section className="glass shrink-0 overflow-hidden lg:flex lg:min-h-[240px] lg:flex-1 lg:flex-col">
        <div className="border-line/70 flex flex-wrap items-center gap-2 border-b px-4 py-2.5 sm:px-5">
          <span className="text-secondary text-[13px]">{question.fileName}</span>
          <span className="text-muted ml-auto text-[12px]">{question.engine ?? 'Java'}</span>
          {runnable && (
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
          <button
            type="button"
            onClick={() => {
              setDraft(template);
              setResetHint(true);
              window.setTimeout(() => setResetHint(false), 1500);
            }}
            className="text-secondary hover:text-ink flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[12px]"
          >
            <RotateCcw size={13} strokeWidth={1.8} />
            {resetHint ? '已填好' : '填模板'}
          </button>
          {copied && <span className="text-brand text-[12px]">已复制</span>}
        </div>

        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          spellCheck={false}
          placeholder={
            question.mode
              ? '写 SQL，点运行，结果直接出现在下面。'
              : '在这里写，写完复制到 Eclipse 跑。'
          }
          className="text-ink placeholder:text-muted block h-72 w-full resize-y bg-transparent px-4 py-3 font-mono text-[13px] leading-6 outline-none sm:h-80 sm:px-5 lg:h-auto lg:min-h-0 lg:flex-1 lg:resize-none"
        />

        {question.mode === 'mysql' && (
          <p className="text-muted border-line/70 border-t px-4 py-2.5 text-[12px] leading-5 sm:px-5">
            MySQL 专属写法（delimiter、trigger、procedure、function），浏览器里的 SQLite 引擎跑不了。复制到本机
            MySQL 里验证。
          </p>
        )}

        {!question.mode && (
          <p className="text-muted border-line/70 border-t px-4 py-2.5 text-[12px] leading-5 sm:px-5">
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
  const [tab, setTab] = useState<'java' | 'sql'>('java');
  const [javaSetIndex, setJavaSetIndex] = useState(0);
  const [sqlPaper, setSqlPaper] = useState<'real' | 'mock'>('real');
  const [selectedId, setSelectedId] = useState(javaSets[0].questions[0].id);

  const sqlActiveSet = sqlPaper === 'mock' ? sqlMockSet : sqlSet;
  const activeSet: LabSet = tab === 'java' ? javaSets[javaSetIndex] : sqlActiveSet;

  useEffect(() => {
    setSelectedId(tab === 'java' ? javaSets[javaSetIndex].questions[0].id : sqlActiveSet.questions[0].id);
  }, [tab, javaSetIndex, sqlActiveSet]);

  const question = useMemo(
    () => activeSet.questions.find((item) => item.id === selectedId) ?? activeSet.questions[0],
    [activeSet, selectedId],
  );

  const days = daysUntil(EXAM_DAY);

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-13.75rem)] lg:overflow-hidden">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <h1 className="text-ink text-[22px] font-semibold">实践演练</h1>
        <p className="text-secondary text-[13px]">
          10 月 31 日考试
          {days > 0 ? `，还有 ${days} 天` : '，今天就是考试日'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['java', 'Java 上机'],
            ['sql', '数据库上机'],
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
              ['real', '真题 2017-04'],
              ['mock', '模拟卷'],
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
          javaSets.map((set, index) => (
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

      <div className="grid items-start gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[210px_minmax(0,1fr)] lg:items-stretch">
        <aside className="glass p-2 lg:h-full lg:overflow-y-auto">
          <p className="text-muted px-2 pt-1 pb-2 text-[12px]">{activeSet.note}</p>
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
                  <span className="tabular-nums">{item.no}.</span> {item.title}
                </button>
              );
            })}
          </nav>
        </aside>

        <QuestionPanel question={question} template={question.starter ?? ''} key={question.id} />
      </div>
    </div>
  );
}
