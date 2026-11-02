import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Clock, Loader2, Play, RotateCcw, Send, Square } from 'lucide-react';
import {
  AI_PRACTICAL_ITEMS,
  AI_PRACTICAL_MINUTES,
  AI_PRACTICAL_TOTAL,
  type PracticalItem,
} from '../../data/aiPractical';

/* ---------------------------------- 存储 ---------------------------------- */

const DRAFT_KEY = 'xj.ai.practical.draft.v1';
const RESULT_KEY = 'xj.ai.practical.results.v1';
const POST_URL = '/lab-grade/practical';

type Answers = Record<string, string>;

interface PointResult {
  id: string;
  got: number;
  why: string;
}

interface ItemResult {
  code: string;
  score: number;
  max: number;
  points: PointResult[];
}

interface PaperResult {
  total: number;
  max: number;
  items: ItemResult[];
  summary: string;
}

interface SavedResult extends PaperResult {
  at: string;
  seconds: number;
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 超配额就算了 */
  }
}

function fmt(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function stamp(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

/* ---------------------------------- 组件 ---------------------------------- */

type Phase = 'idle' | 'writing' | 'grading' | 'done' | 'error';

export function AiPractical() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [answers, setAnswers] = useState<Answers>(() => loadJson<Answers>(DRAFT_KEY, {}));
  const [seconds, setSeconds] = useState(0);
  const [waitTick, setWaitTick] = useState(0);
  const [result, setResult] = useState<PaperResult | null>(null);
  const [history, setHistory] = useState<SavedResult[]>(() => loadJson<SavedResult[]>(RESULT_KEY, []));
  const [error, setError] = useState('');
  const [openCode, setOpenCode] = useState<string>(AI_PRACTICAL_ITEMS[0]?.code ?? '');
  const [expandAll, setExpandAll] = useState(false);
  const [showRef, setShowRef] = useState<string>('');

  const startedAt = useRef<number>(0);
  const timer = useRef<number | null>(null);

  const written = useMemo(
    () => AI_PRACTICAL_ITEMS.reduce((sum, it) => sum + (answers[it.code] ?? '').trim().length, 0),
    [answers],
  );
  const doneCount = useMemo(
    () => AI_PRACTICAL_ITEMS.filter((it) => (answers[it.code] ?? '').trim().length > 0).length,
    [answers],
  );

  useEffect(() => {
    saveJson(DRAFT_KEY, answers);
  }, [answers]);

  useEffect(() => {
    if (phase !== 'writing') return;
    timer.current = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [phase]);

  const begin = useCallback(() => {
    startedAt.current = Date.now();
    setSeconds(0);
    setResult(null);
    setError('');
    setExpandAll(true);
    setPhase('writing');
  }, []);

  const stop = useCallback(() => {
    if (timer.current) window.clearInterval(timer.current);
    setPhase((p) => (p === 'writing' ? 'done' : p));
  }, []);

  const submit = useCallback(async () => {
    if (written < 40) {
      setError('先写点东西再交卷（每道题至少要有一段作答）');
      return;
    }
    if (timer.current) window.clearInterval(timer.current);
    setExpandAll(true);
    setPhase('grading');
    setError('');
    setResult(null);
    setWaitTick(0);
    const ticker = window.setInterval(() => setWaitTick((n) => n + 1), 1000);
    const elapsed = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
    try {
      const res = await fetch(POST_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          answers: AI_PRACTICAL_ITEMS.map((it) => ({
            code: it.code,
            title: it.title,
            score: it.score,
            sheet: it.sheet,
            rubric: it.rubric,
            answer: answers[it.code] ?? '',
          })),
        }),
      });
      const created = await res.json().catch(() => null);
      if (!res.ok || !created?.jobId) {
        throw new Error(created?.error ?? '交卷失败，请再试一次');
      }
      for (let i = 0; i < 240; i += 1) {
        await new Promise((r) => setTimeout(r, 2000));
        const poll = await fetch(`${POST_URL}/${created.jobId}`).then((r) => r.json());
        if (poll.status === 'done') {
          const paper = poll.result as PaperResult;
          setResult(paper);
          const saved: SavedResult = { ...paper, at: new Date().toISOString(), seconds: elapsed };
          setHistory((prev) => {
            const next = [saved, ...prev].slice(0, 20);
            saveJson(RESULT_KEY, next);
            return next;
          });
          setPhase('done');
          return;
        }
        if (poll.status === 'error') throw new Error(poll.error ?? '判卷失败');
      }
      throw new Error('判卷超时，请再交一次');
    } catch (err) {
      setError(err instanceof Error ? err.message : '判卷失败');
      setPhase('error');
    } finally {
      window.clearInterval(ticker);
    }
  }, [answers, written]);

  const reset = useCallback(() => {
    if (!window.confirm('清空本次作答？')) return;
    setAnswers({});
    setResult(null);
    setError('');
    setSeconds(0);
    setPhase('idle');
  }, []);

  const best = useMemo(() => (history.length ? Math.max(...history.map((h) => h.total)) : null), [history]);

  return (
    <div className="space-y-4">
      {/* 状态条 */}
      <section className="glass px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-brand text-[28px] font-semibold tabular-nums">
              {phase === 'writing' ? fmt(seconds) : result ? result.total : '—'}
            </span>
            <span className="text-muted text-[13px]">
              {phase === 'writing' ? `／${AI_PRACTICAL_MINUTES}:00` : result ? `／${AI_PRACTICAL_TOTAL} 分` : '未交卷'}
            </span>
          </div>
          <div className="text-muted flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} /> 全卷 {AI_PRACTICAL_MINUTES} 分钟 · {AI_PRACTICAL_ITEMS.length} 题 ·{' '}
              {AI_PRACTICAL_TOTAL} 分
            </span>
            <span>
              已作答 {doneCount}/{AI_PRACTICAL_ITEMS.length} 题
              {best !== null ? ` · 历史最高 ${best} 分` : ''}
            </span>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {phase === 'idle' || phase === 'done' || phase === 'error' ? (
              <button type="button" className="pill pill--solid px-4 py-2 text-[13px]" onClick={begin}>
                <Play size={14} className="mr-1.5" />
                {result || error ? '重做一遍' : '开始作答'}
              </button>
            ) : null}
            {phase === 'writing' ? (
              <>
                <button type="button" className="pill px-3.5 py-2 text-[13px]" onClick={stop}>
                  <Square size={13} className="mr-1.5" />
                  暂停计时
                </button>
                <button type="button" className="pill pill--solid px-4 py-2 text-[13px]" onClick={submit}>
                  <Send size={14} className="mr-1.5" />
                  交卷判分
                </button>
              </>
            ) : null}
            {phase === 'grading' ? (
              <span className="text-brand inline-flex items-center gap-2 text-[13px]">
                <Loader2 size={14} className="animate-spin" /> AI 正在逐题对照评分细则判卷 · 已等 {waitTick}s
              </span>
            ) : null}
            {phase === 'done' || phase === 'error' ? (
              <button type="button" className="pill px-3 py-2 text-[13px]" onClick={reset}>
                <RotateCcw size={13} className="mr-1.5" />
                清空作答
              </button>
            ) : null}
          </div>
        </div>
        <p className="text-muted mt-3 text-[12px] leading-relaxed">
          考场上要在电脑里跑代码、截图存文件；这里改成把 <b className="text-ink">代码 + 文字说明</b>{' '}
          写进对应题目，交卷后整卷一起判，按官方 M 项细则给分。作业自动存在本机，刷新不丢。
        </p>
      </section>

      {/* 判卷结果 */}
      {result ? (
        <section className="glass px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span className="text-ink text-[18px] font-semibold">整卷 {result.total} / {result.max} 分</span>
            <span className={`text-[13px] ${result.total >= 60 ? 'text-success-ink' : 'text-danger-ink'}`}>
              {result.total >= 60 ? '合格' : '不合格（60 分合格）'}
            </span>
            {history[0] ? <span className="text-muted text-[12px]">交卷用时 {fmt(history[0].seconds)}</span> : null}
          </div>
          {result.summary ? <p className="text-muted mt-2 text-[13px] leading-relaxed">{result.summary}</p> : null}
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((it) => {
              const meta = AI_PRACTICAL_ITEMS.find((p) => p.code === it.code);
              return (
                <button
                  key={it.code}
                  type="button"
                  onClick={() => {
                    setOpenCode(it.code);
                    setShowRef(it.code);
                    window.setTimeout(
                      () => document.getElementById(`practical-${it.code}`)?.scrollIntoView({ block: 'center' }),
                      30,
                    );
                  }}
                  className="field text-left"
                >
                  <span className="text-muted block text-[12px]">{it.code} · {meta?.title}</span>
                  <span className="text-ink mt-1 block text-[15px] font-semibold tabular-nums">
                    {it.score} / {it.max}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {error ? <p className="text-danger-ink glass px-4 py-3 text-[13px]">{error}</p> : null}

      {/* 题目 */}
      {AI_PRACTICAL_ITEMS.map((item, index) => (
        <ItemCard
          key={item.code}
          index={index + 1}
          item={item}
          value={answers[item.code] ?? ''}
          onChange={(v) => setAnswers((prev) => ({ ...prev, [item.code]: v }))}
          open={expandAll || openCode === item.code}
          onToggle={() => {
            if (expandAll) {
              setExpandAll(false);
              setOpenCode(item.code);
              return;
            }
            setOpenCode((c) => (c === item.code ? '' : item.code));
          }}
          result={result?.items.find((r) => r.code === item.code)}
          showRef={showRef === item.code}
          onToggleRef={() => setShowRef((c) => (c === item.code ? '' : item.code))}
          locked={phase === 'grading'}
        />
      ))}

      {/* 历史 */}
      {history.length ? (
        <section className="glass px-4 py-4 sm:px-5">
          <h3 className="text-ink text-[14px] font-medium">历史交卷</h3>
          <ul className="mt-2 space-y-1.5">
            {history.map((h) => (
              <li key={h.at} className="text-muted flex flex-wrap items-baseline gap-x-4 text-[13px]">
                <span className="tabular-nums">{stamp(h.at)}</span>
                <span className={`tabular-nums ${h.total >= 60 ? 'text-success-ink' : 'text-ink'}`}>
                  {h.total} / {h.max} 分
                </span>
                <span className="tabular-nums">用时 {fmt(h.seconds)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/* -------------------------------- 单题卡片 -------------------------------- */

interface ItemCardProps {
  index: number;
  item: PracticalItem;
  value: string;
  onChange: (v: string) => void;
  open: boolean;
  onToggle: () => void;
  result?: ItemResult;
  showRef: boolean;
  onToggleRef: () => void;
  locked: boolean;
}

function ItemCard({
  index,
  item,
  value,
  onChange,
  open,
  onToggle,
  result,
  showRef,
  onToggleRef,
  locked,
}: ItemCardProps) {
  const lines = item.sheet.split('\n').filter(Boolean);
  return (
    <section id={`practical-${item.code}`} className="glass px-4 py-4 sm:px-5">
      <button type="button" className="flex w-full items-start gap-3 text-left" onClick={onToggle}>
        <span className="text-muted mt-0.5 text-[13px] tabular-nums">第 {index} 题</span>
        <span className="min-w-0 flex-1">
          <span className="text-ink block text-[15px] font-medium">{item.title}</span>
          <span className="text-muted mt-1 block text-[12px]">
            {item.code} · {item.minutes} · {item.score} 分
            {result ? ` · 得 ${result.score} 分` : ''}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`text-muted mt-1 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <>
          <div className="text-ink mt-3 space-y-1.5 text-[13px] leading-relaxed">
            {lines.map((line, i) => (
              <p key={i} className="text-muted">
                {line}
              </p>
            ))}
          </div>

          <textarea
            className="field mt-3 min-h-[190px] w-full font-mono text-[13px] leading-relaxed"
            placeholder="把代码和文字说明写在这里（代码用 Python，说明用中文）"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            readOnly={locked}
            spellCheck={false}
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-muted text-[12px]">{value.trim().length} 字</span>
            <button type="button" className="pill ml-auto px-3 py-1.5 text-[12px]" onClick={onToggleRef}>
              {showRef ? '收起参考答案' : '看参考答案'}
            </button>
          </div>

          {result?.points.length ? (
            <ul className="mt-3 space-y-1">
              {result.points.map((p) => {
                const rubric = item.rubric.find((r) => r.id === p.id);
                const full = rubric?.score ?? 0;
                return (
                  <li key={p.id} className="flex items-baseline gap-2 text-[12.5px]">
                    <span
                      className={`w-14 shrink-0 tabular-nums ${
                        p.got >= full && full > 0 ? 'text-success-ink' : p.got > 0 ? 'text-ink' : 'text-danger-ink'
                      }`}
                    >
                      {p.id} {p.got}/{full}
                    </span>
                    <span className="text-muted min-w-0 flex-1">
                      {rubric?.desc ? `${rubric.desc}｜` : ''}
                      {p.why}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {showRef ? (
            <pre className="text-muted mt-3 max-h-[420px] overflow-auto rounded-xl bg-black/[0.03] p-3 text-[12px] leading-relaxed whitespace-pre-wrap">
              {item.ref}
            </pre>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
