import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Clock, Loader2, Play, RotateCcw, Send, Square } from 'lucide-react';
import {
  AI_PRACTICAL_MINUTES,
  AI_PRACTICAL_POOL,
  AI_PRACTICAL_SECTIONS,
  AI_PRACTICAL_TOTAL,
  pickPracticalPaper,
  practicalPaperScore,
  type PoolItem,
} from '../../data/aiPracticalPool';
import { cloudPull, cloudPut } from '../../lib/aiSync';
import { practicalAssets } from '../../data/aiPracticalAssets';

/* ---------------------------------- 存储 ---------------------------------- */

const SESSION_KEY = 'xj.ai.practical.session.v2';
const RESULT_KEY = 'xj.ai.practical.results.v1';
const CLOUD_KEY = 'ai-practical';
const CLOUD_META_KEY = 'xj.ai.practical.meta.v1';
const POST_URL = '/lab-grade/practical';
const LIMIT_SECONDS = AI_PRACTICAL_MINUTES * 60;

type Answers = Record<string, string>;

interface Session {
  codes: string[];
  startedAt: number;
  answers: Answers;
}

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
  codes: string[];
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

function paperFromCodes(codes: string[]): PoolItem[] {
  const found = codes
    .map((code) => AI_PRACTICAL_POOL.find((item) => item.code === code))
    .filter((item): item is PoolItem => Boolean(item));
  return found.length === AI_PRACTICAL_SECTIONS.length ? found : pickPracticalPaper();
}

function sectionLabel(code: string) {
  const group = code.split('.').slice(0, 2).join('.');
  const hit = AI_PRACTICAL_SECTIONS.find((s) => s.groups.includes(group));
  return hit?.label ?? '实操题';
}

/* ---------------------------------- 组件 ---------------------------------- */

type Phase = 'idle' | 'writing' | 'grading' | 'done' | 'error';

export function AiPractical() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [paper, setPaper] = useState<PoolItem[]>(() => pickPracticalPaper());
  const [answers, setAnswers] = useState<Answers>({});
  const [startedAt, setStartedAt] = useState(0);
  const [remaining, setRemaining] = useState(LIMIT_SECONDS);
  const [waitTick, setWaitTick] = useState(0);
  const [result, setResult] = useState<PaperResult | null>(null);
  const [history, setHistory] = useState<SavedResult[]>(() => loadJson<SavedResult[]>(RESULT_KEY, []));
  const [error, setError] = useState('');
  const [openCode, setOpenCode] = useState<string>('');
  const [showRef, setShowRef] = useState<string>('');
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const submitting = useRef(false);

  const written = useMemo(
    () => paper.reduce((sum, it) => sum + (answers[it.code] ?? '').trim().length, 0),
    [answers, paper],
  );
  const doneCount = useMemo(
    () => paper.filter((it) => (answers[it.code] ?? '').trim().length > 0).length,
    [answers, paper],
  );
  const paperScore = useMemo(() => practicalPaperScore(paper), [paper]);

  /* 恢复未完成的考试 */
  useEffect(() => {
    const saved = loadJson<Session | null>(SESSION_KEY, null);
    if (!saved || !Array.isArray(saved.codes) || saved.codes.length !== AI_PRACTICAL_SECTIONS.length) return;
    if (!saved.startedAt) return;
    const left = LIMIT_SECONDS - Math.floor((Date.now() - saved.startedAt) / 1000);
    if (left <= 0) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    setPaper(paperFromCodes(saved.codes));
    setAnswers(saved.answers ?? {});
    setStartedAt(saved.startedAt);
    setRemaining(left);
    setPhase('writing');
  }, []);

  /* 作答自动保存 */
  useEffect(() => {
    if (phase !== 'writing' || !startedAt) return;
    saveJson(SESSION_KEY, { codes: paper.map((p) => p.code), startedAt, answers } satisfies Session);
  }, [answers, paper, phase, startedAt]);

  /* 倒计时 */
  useEffect(() => {
    if (phase !== 'writing' || !startedAt) return;
    const tick = () => {
      const left = LIMIT_SECONDS - Math.floor((Date.now() - startedAt) / 1000);
      setRemaining(left);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [phase, startedAt]);

  const clearAll = useCallback(() => {
    if (!window.confirm('清空这台设备与云端的实操记录？未交卷的试卷也会一起清掉。')) return;
    localStorage.removeItem(RESULT_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.setItem(CLOUD_META_KEY, String(Date.now()));
    setHistory([]);
    setResult(null);
    setError('');
    setPhase('idle');
    setAnswers({});
    setStartedAt(0);
    setRemaining(LIMIT_SECONDS);
    void cloudPut(CLOUD_KEY, { history: [] });
    window.setTimeout(() => {
      void cloudPut(CLOUD_KEY, { history: [] });
    }, 900);
  }, []);

  const begin = useCallback(() => {
    const nextPaper = pickPracticalPaper();
    setPaper(nextPaper);
    setAnswers({});
    setResult(null);
    setError('');
    setShowRef('');
    setAutoSubmitted(false);
    setOpenCode(nextPaper[0]?.code ?? '');
    setCollapsed(false);
    setStartedAt(Date.now());
    setRemaining(LIMIT_SECONDS);
    setPhase('writing');
  }, []);

  const toggleCollapse = useCallback(() => setCollapsed((c) => !c), []);

  const submit = useCallback(
    async (auto = false) => {
      if (submitting.current) return;
      if (!auto && written < 40) {
        setError('先写点东西再交卷（每道题至少要有一段作答）');
        return;
      }
      if (!auto && !window.confirm('交卷后不能再改，开始判分？')) return;
      submitting.current = true;
      setPhase('grading');
      setError('');
      setResult(null);
      setWaitTick(0);
      setAutoSubmitted(auto);
      localStorage.removeItem(SESSION_KEY);
      const ticker = window.setInterval(() => setWaitTick((n) => n + 1), 1000);
      const elapsed = startedAt ? Math.min(LIMIT_SECONDS, Math.round((Date.now() - startedAt) / 1000)) : 0;
      try {
        const res = await fetch(POST_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            answers: paper.map((it) => ({
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
            const graded = poll.result as PaperResult;
            setResult(graded);
            const saved: SavedResult = {
              ...graded,
              at: new Date().toISOString(),
              seconds: elapsed,
              codes: paper.map((p) => p.code),
            };
            setHistory((prev) => {
              const next = [saved, ...prev].slice(0, 20);
              saveJson(RESULT_KEY, next);
              localStorage.setItem(CLOUD_META_KEY, String(Date.now()));
              void cloudPut(CLOUD_KEY, { results: next });
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
        submitting.current = false;
        window.clearInterval(ticker);
      }
    },
    [answers, paper, startedAt, written],
  );

  /* 到点自动交卷 */
  useEffect(() => {
    if (phase !== 'writing' || remaining > 0) return;
    void submit(true);
  }, [phase, remaining, submit]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const remote = await cloudPull<{ results?: SavedResult[] }>(CLOUD_KEY);
      if (!alive) return;
      const localList = loadJson<SavedResult[]>(RESULT_KEY, []);
      const localAt = Number(localStorage.getItem(CLOUD_META_KEY) ?? 0);
      if (remote && remote.updatedAt > localAt) {
        const list = Array.isArray(remote.data.results) ? remote.data.results.slice(0, 20) : [];
        saveJson(RESULT_KEY, list);
        localStorage.setItem(CLOUD_META_KEY, String(remote.updatedAt));
        setHistory(list);
        return;
      }
      if (localList.length && (!remote || remote.updatedAt < localAt || localAt === 0)) {
        localStorage.setItem(CLOUD_META_KEY, String(Date.now()));
        void cloudPut(CLOUD_KEY, { results: localList });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const best = useMemo(() => (history.length ? Math.max(...history.map((h) => h.total)) : null), [history]);
  const overtime = remaining <= 5 * 60 && phase === 'writing';

  return (
    <div className="space-y-4">
      {/* 状态条 */}
      <section className="glass px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-[28px] font-semibold tabular-nums ${
                phase === 'writing' ? (overtime ? 'text-danger-ink' : 'text-brand') : 'text-brand'
              }`}
            >
              {phase === 'writing' ? fmt(remaining) : result ? result.total : paperScore}
            </span>
            <span className="text-muted text-[13px]">
              {phase === 'writing' ? '剩余时间' : result ? `／${result.max} 分` : '本卷满分'}
            </span>
          </div>
          <div className="text-muted flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} /> 全卷 {AI_PRACTICAL_MINUTES} 分钟 {paper.length} 题 {paperScore} 分
            </span>
            <span>
              已作答 {doneCount}/{paper.length} 题
              {best !== null ? ` · 历史最高 ${best} 分` : ''}
            </span>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {history.length ? (
              <button
                type="button"
                onClick={clearAll}
                className="text-muted hover:text-danger-ink px-1 text-[12px] transition"
              >
                清空记录
              </button>
            ) : null}
            {phase !== 'writing' && phase !== 'grading' ? (
              <button type="button" className="pill pill--solid px-4 py-2 text-[13px]" onClick={begin}>
                <Play size={14} className="mr-1.5" />
                {result || error ? '再考一场' : '开始考试'}
              </button>
            ) : null}
            {phase === 'writing' ? (
              <>
                <button type="button" className="pill px-3.5 py-2 text-[13px]" onClick={toggleCollapse}>
                  <Square size={13} className="mr-1.5" />
                  {collapsed ? '展开题目' : '收起题目'}
                </button>
                <button
                  type="button"
                  className="pill pill--solid px-4 py-2 text-[13px]"
                  onClick={() => void submit(false)}
                >
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
              <button type="button" className="pill px-3 py-2 text-[13px]" onClick={clearAll}>
                <RotateCcw size={13} className="mr-1.5" />
                清空全部
              </button>
            ) : null}
          </div>
        </div>

        {phase === 'writing' ? (
          <p className="text-muted mt-3 text-[12px] leading-relaxed">
            到点自动交卷。中途离开页面不停止计时，回到这里会接着算。
          </p>
        ) : result ? null : (
          <div className="text-muted mt-3 space-y-1.5 text-[12px] leading-relaxed">
            <p>
              按真实考场组卷：项目 1 在 1.1 与 1.2 中抽一组抽一题，2.1、2.2、3.1、3.2 各抽一题，项目 4 在 4.1 与 4.2
              中抽一组抽一题，共 {AI_PRACTICAL_SECTIONS.length} 题 {AI_PRACTICAL_MINUTES} 分钟 {AI_PRACTICAL_TOTAL} 分，
              {AI_PRACTICAL_POOL.length} 道官方真题随机成卷，60 分合格。
            </p>
            <p>作答期间看不到参考答案，交卷后逐条对照官方 M 项细则给分，一份卷只能交一次。</p>
            <p>
              考场上还要把截图存成 JPG（如 1.1.1-1.JPG）、报告存 docx、notebook 导出 html，放进桌面「准考证号 + 身份证号后六位」文件夹；这里用文字作答代替交文件。
            </p>
            <p>
              每题素材（数据集、notebook 框架、答题卷、模型文件）都挂在题目下方，可下载到本机跑通再回来粘代码。数据是按试题单字段构造的练习数据，3.2 系列的 onnx 是随机权重的小模型，只用于把加载与推理流程跑通，识别结果没有实际含义；题面与评分细则仍是官方原文。
            </p>
          </div>
        )}
      </section>

      {/* 判卷结果 */}
      {result ? (
        <section className="glass px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span className="text-ink text-[18px] font-semibold">
              整卷 {result.total} / {result.max} 分
            </span>
            <span className={`text-[13px] ${result.total >= 60 ? 'text-success-ink' : 'text-danger-ink'}`}>
              {result.total >= 60 ? '合格' : '不合格（60 分合格）'}
            </span>
            {history[0] ? <span className="text-muted text-[12px]">交卷用时 {fmt(history[0].seconds)}</span> : null}
            {autoSubmitted ? <span className="text-warn text-[12px]">到点自动交卷</span> : null}
          </div>
          {result.summary ? <p className="text-muted mt-2 text-[13px] leading-relaxed">{result.summary}</p> : null}
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((it) => {
              const meta = paper.find((p) => p.code === it.code);
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
                  <span className="text-muted block text-[12px]">
                    {it.code} {meta?.title}
                  </span>
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
      {startedAt > 0 && (!collapsed || result) ? paper.map((item, index) => (
        <ItemCard
          key={item.code}
          index={index + 1}
          item={item}
          section={sectionLabel(item.code)}
          value={answers[item.code] ?? ''}
          onChange={(v) => setAnswers((prev) => ({ ...prev, [item.code]: v }))}
          open={openCode === item.code}
          onToggle={() => setOpenCode((c) => (c === item.code ? '' : item.code))}
          result={result?.items.find((r) => r.code === item.code)}
          showRef={showRef === item.code}
          onToggleRef={() => setShowRef((c) => (c === item.code ? '' : item.code))}
          locked={phase === 'grading'}
          exam={phase === 'writing'}
        />
      )) : null}

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
                <span className="tabular-nums">{h.codes?.join(' ') ?? ''}</span>
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
  item: PoolItem;
  section: string;
  value: string;
  onChange: (v: string) => void;
  open: boolean;
  onToggle: () => void;
  result?: ItemResult;
  showRef: boolean;
  onToggleRef: () => void;
  locked: boolean;
  exam: boolean;
}

function ItemCard({
  index,
  item,
  section,
  value,
  onChange,
  open,
  onToggle,
  result,
  showRef,
  onToggleRef,
  locked,
  exam,
}: ItemCardProps) {
  const lines = item.sheet.split('\n').filter(Boolean);
  const assets = practicalAssets(item.code);
  return (
    <section id={`practical-${item.code}`} className="glass px-4 py-4 sm:px-5">
      <button type="button" className="flex w-full items-start gap-3 text-left" onClick={onToggle}>
        <span className="text-muted mt-0.5 shrink-0 text-[13px] tabular-nums">第 {index} 题</span>
        <span className="min-w-0 flex-1">
          <span className="text-ink block text-[15px] font-medium">{item.title}</span>
          <span className="text-muted mt-1 block text-[12px]">
            {item.code} {section} {item.minutes} {item.score} 分
            {result ? ` 得 ${result.score} 分` : ''}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`text-muted mt-1 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <>
          <div className="mt-3 space-y-1.5 text-[13px] leading-relaxed">
            {lines.map((line, i) => (
              <p key={i} className="text-muted">
                {line}
              </p>
            ))}
          </div>

          {assets.length ? (
            <div className="mt-3 border-t border-[var(--border)] pt-2.5">
              <span className="text-muted text-[12px]">本题素材：考场同样提供这些文件，可先下载在本机跑通</span>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {assets.map((a) => (
                  <a
                    key={a.name}
                    className="pill px-3 py-1 text-[12px]"
                    href={`/ai-practical/${item.code}/${encodeURIComponent(a.name)}`}
                    download={a.name}
                  >
                    {a.label} {a.name}
                  </a>
                ))}
                <a
                  className="pill px-3 py-1 text-[12px]"
                  href={`/ai-practical/${item.code}.zip`}
                  download={`${item.code}.zip`}
                >
                  打包下载 {item.code}.zip
                </a>
              </div>
            </div>
          ) : null}

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
            {item.ref && !exam ? (
              <button type="button" className="pill ml-auto px-3 py-1.5 text-[12px]" onClick={onToggleRef}>
                {showRef ? '收起参考答案' : '看参考答案'}
              </button>
            ) : null}
            {item.ref && exam ? (
              <span className="text-muted ml-auto text-[12px]">参考答案交卷后可见</span>
            ) : null}
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
                      {rubric?.desc ? `${rubric.desc} ` : ''}
                      {p.why}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {showRef && item.ref ? (
            <pre className="text-muted mt-3 max-h-[420px] overflow-auto rounded-xl bg-black/[0.03] p-3 text-[12px] leading-relaxed whitespace-pre-wrap">
              {item.ref}
            </pre>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
