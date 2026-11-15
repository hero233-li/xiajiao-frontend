import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Download, ExternalLink, FileText, FileUp, Loader2, Play, RotateCcw, Send, Trash2 } from 'lucide-react';
import {
  AI_PRACTICAL_COUNT,
  AI_PRACTICAL_POOL,
  AI_PRACTICAL_SECTIONS,
  pickPracticalExamPaper,
  type PoolItem,
} from '../../data/aiPracticalPool';
import { cloudPull, cloudPut } from '../../lib/aiSync';

/* 与考场一致：平台发题、发素材、收文件；代码在 jupyter 里写，导出 html 后上传 */

const SESSION_KEY = 'xj.ai.practical.exam.v3';
const RESULT_KEY = 'xj.ai.practical.results.v1';
const CLOUD_KEY = 'ai-practical';
const CLOUD_META_KEY = 'xj.ai.practical.meta.v1';
const API = '/ai-lab';

function paperSeconds(paper: PoolItem[]) {
  return paper.reduce((n, it) => n + Math.round(Number.parseFloat(it.minutes) * 60), 0);
}

function questionSeconds(item: PoolItem | undefined) {
  return item ? Math.round(Number.parseFloat(item.minutes) * 60) : 0;
}

interface Block {
  kind: 'p' | 'table';
  html: string;
}
interface Section {
  head: string;
  blocks: Block[];
}
interface PageItem {
  code: string;
  title: string;
  minutes: string;
  sections: Section[];
  notes: string[];
  uploads: { seq: string; requirement: string }[];
  files: string[];
}
interface UploadedFile {
  name: string;
  size: number;
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
interface Clock {
  active: number;
  spent: number[];
  since: number;
}
interface Session {
  id: string;
  codes: string[];
  startedAt: number;
  clock?: Clock;
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
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function stamp(iso: string) {
  const d = new Date(iso);
  return d.getMonth() + 1 + ' 月 ' + d.getDate() + ' 日 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function sectionLabel(code: string) {
  const group = code.split('.').slice(0, 2).join('.');
  const hit = AI_PRACTICAL_SECTIONS.find((s) => s.groups.includes(group));
  return hit?.label ?? '实操题';
}

function kb(n: number) {
  if (n > 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
  return Math.max(1, Math.round(n / 1024)) + ' KB';
}

let pageCache: PageItem[] | null = null;

async function loadPages(): Promise<PageItem[]> {
  if (pageCache) return pageCache;
  const res = await fetch(API + '/pages.json');
  if (!res.ok) throw new Error('题面加载失败');
  pageCache = (await res.json()) as PageItem[];
  return pageCache;
}

/* ---------------------------------- 组件 ---------------------------------- */

type Phase = 'idle' | 'loading' | 'writing' | 'grading' | 'done' | 'error';

export function AiPractical() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [pages, setPages] = useState<PageItem[]>([]);
  const [paper, setPaper] = useState<PoolItem[]>([]);
  const [exam, setExam] = useState<Session | null>(null);
  const [current, setCurrent] = useState(0);
  const [tab, setTab] = useState<'upload' | 'materials'>('upload');
  const [uploads, setUploads] = useState<Record<string, UploadedFile[]>>({});
  const [remaining, setRemaining] = useState(0);
  const [qRemain, setQRemain] = useState(0);
  const clockRef = useRef<Clock>({ active: 0, spent: [], since: 0 });
  const tickedRef = useRef(0);
  const [result, setResult] = useState<PaperResult | null>(null);
  const [history, setHistory] = useState<SavedResult[]>(() => loadJson<SavedResult[]>(RESULT_KEY, []));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [waitTick, setWaitTick] = useState(0);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [jupyterToken, setJupyterToken] = useState('');

  const submitting = useRef(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const reloadFiles = useCallback(
    async (sid: string, codes: string[]) => {
      const next: Record<string, UploadedFile[]> = {};
      await Promise.all(
        codes.map(async (code) => {
          try {
            const r = await fetch(API + '/files?exam=' + encodeURIComponent(sid) + '&code=' + encodeURIComponent(code));
            const d = await r.json();
            next[code] = Array.isArray(d.files) ? (d.files as UploadedFile[]) : [];
          } catch {
            next[code] = [];
          }
        }),
      );
      setUploads(next);
    },
    [],
  );

  /* 题面 + jupyter token */
  useEffect(() => {
    void (async () => {
      try {
        const all = await loadPages();
        setPages(all);
      } catch {
        /* 开始考试时再报错 */
      }
      try {
        const r = await fetch(API + '/config');
        const d = await r.json();
        if (d?.token) setJupyterToken(String(d.token));
      } catch {
        /* 忽略 */
      }
    })();
  }, []);

  /* 恢复未完成的考试 */
  useEffect(() => {
    const saved = loadJson<Session | null>(SESSION_KEY, null);
    if (!saved || !Array.isArray(saved.codes) || saved.codes.length !== AI_PRACTICAL_COUNT || !saved.startedAt) return;
    const found = saved.codes
      .map((c) => AI_PRACTICAL_POOL.find((p) => p.code === c))
      .filter((p): p is PoolItem => Boolean(p));
    if (found.length !== AI_PRACTICAL_COUNT) return;
    const left = paperSeconds(found) - Math.floor((Date.now() - saved.startedAt) / 1000);
    if (left <= 0) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    const clock = saved.clock ?? { active: 0, spent: [], since: saved.startedAt };
    clockRef.current = clock;
    setPaper(found);
    setExam(saved);
    setRemaining(left);
    setCurrent(clock.active);
    setPhase('writing');
    void reloadFiles(saved.id, saved.codes);
  }, [reloadFiles]);

  /* 总倒计时 + 本题倒计时 */
  useEffect(() => {
    if (phase !== 'writing' || !exam) return;
    const tick = () => {
      const now = Date.now();
      tickedRef.current = now;
      setRemaining(paperSeconds(paper) - Math.floor((now - exam.startedAt) / 1000));
      const clock = clockRef.current;
      const item = paper[clock.active];
      if (!item) {
        setQRemain(0);
        return;
      }
      const used = (clock.spent[clock.active] ?? 0) + Math.floor((now - clock.since) / 1000);
      setQRemain(questionSeconds(item) - used);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [phase, exam, paper]);

  const begin = useCallback(async () => {
    setError('');
    setResult(null);
    setAutoSubmitted(false);
    setPhase('loading');
    try {
      const all = pages.length ? pages : await loadPages();
      setPages(all);
      const nextPaper = pickPracticalExamPaper();
      const sid = 'e' + Date.now().toString(36);
      const now = Date.now();
      const session: Session = {
        id: sid,
        codes: nextPaper.map((p) => p.code),
        startedAt: now,
        clock: { active: 0, spent: [], since: now },
      };
      clockRef.current = session.clock as Clock;
      tickedRef.current = 0;
      setPaper(nextPaper);
      setExam(session);
      setCurrent(0);
      setTab('upload');
      setRemaining(paperSeconds(nextPaper));
      setQRemain(questionSeconds(nextPaper[0]));
      setUploads({});
      setPhase('writing');
      saveJson(SESSION_KEY, session);
      void reloadFiles(sid, session.codes);
    } catch (err) {
      setError(err instanceof Error ? err.message : '题面加载失败');
      setPhase('error');
    }
  }, [pages, reloadFiles]);

  const submit = useCallback(
    async (auto = false) => {
      if (submitting.current || !exam) return;
      if (!auto && !window.confirm('交卷后不能再改，开始判分？')) return;
      submitting.current = true;
      setPhase('grading');
      setError('');
      setResult(null);
      setAutoSubmitted(auto);
      setWaitTick(0);
      localStorage.removeItem(SESSION_KEY);
      const ticker = window.setInterval(() => setWaitTick((n) => n + 1), 1000);
      const elapsed = Math.min(paperSeconds(paper), Math.round((Date.now() - exam.startedAt) / 1000));
      try {
        const res = await fetch(API + '/grade', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            exam: exam.id,
            answers: paper.map((it) => ({
              code: it.code,
              title: it.title,
              score: it.score,
              sheet: it.sheet,
              rubric: it.rubric,
            })),
          }),
        });
        const created = await res.json().catch(() => null);
        if (!res.ok || !created?.jobId) throw new Error(created?.error ?? '交卷失败，请再试一次');
        for (let i = 0; i < 300; i += 1) {
          await new Promise((r) => setTimeout(r, 2000));
          const poll = await fetch(API + '/grade/' + created.jobId).then((r) => r.json());
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
    [exam, paper],
  );

  /* 交完当前题，进入下一题；最后一题交完自动交卷 */
  const lockAndAdvance = useCallback(() => {
    const clock = clockRef.current;
    const now = Date.now();
    const spent = clock.spent.slice();
    spent[clock.active] = (spent[clock.active] ?? 0) + Math.floor((now - clock.since) / 1000);
    const next = clock.active + 1;
    clockRef.current = { active: next, spent, since: now };
    setExam((prev) => {
      if (!prev) return prev;
      const updated: Session = { ...prev, clock: clockRef.current };
      saveJson(SESSION_KEY, updated);
      return updated;
    });
    if (next >= paper.length) {
      void submit(true);
      return;
    }
    setCurrent(next);
    setTab('upload');
    setQRemain(questionSeconds(paper[next]));
  }, [paper, submit]);

  /* 本题到点：锁定本题，进入下一题 */
  useEffect(() => {
    if (phase !== 'writing' || !tickedRef.current) return;
    if (qRemain > 0 || clockRef.current.active >= paper.length) return;
    lockAndAdvance();
  }, [phase, qRemain, paper.length, lockAndAdvance]);

  /* 全卷到点：自动交卷 */
  useEffect(() => {
    if (phase !== 'writing' || !tickedRef.current || remaining > 0) return;
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

  const clearAll = useCallback(() => {
    if (!window.confirm('清空这台设备与云端的实操记录？未交卷的试卷也会一起清掉。')) return;
    localStorage.removeItem(RESULT_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.setItem(CLOUD_META_KEY, String(Date.now()));
    setHistory([]);
    setResult(null);
    setError('');
    setPhase('idle');
    setExam(null);
    setPaper([]);
    setUploads({});
    setRemaining(0);
    setQRemain(0);
    clockRef.current = { active: 0, spent: [], since: 0 };
    void cloudPut(CLOUD_KEY, { results: [] });
    window.setTimeout(() => void cloudPut(CLOUD_KEY, { results: [] }), 900);
  }, []);

  const doUpload = useCallback(
    async (file: File) => {
      if (!exam) return;
      const target = paper[current];
      if (!target) return;
      setBusy('正在上传 ' + file.name);
      try {
        const b64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const s = String(reader.result ?? '');
            resolve(s.slice(s.indexOf(',') + 1));
          };
          reader.onerror = () => reject(new Error('读取文件失败'));
          reader.readAsDataURL(file);
        });
        const res = await fetch(API + '/upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ exam: exam.id, code: target.code, name: file.name, data: b64 }),
        });
        const d = await res.json().catch(() => null);
        if (!res.ok || !d?.ok) throw new Error(d?.error ?? '上传失败');
        await reloadFiles(exam.id, exam.codes);
        setBusy('文件上传成功：' + file.name);
        window.setTimeout(() => setBusy(''), 2600);
      } catch (err) {
        setBusy(err instanceof Error ? err.message : '上传失败');
        window.setTimeout(() => setBusy(''), 4000);
      }
    },
    [current, exam, paper, reloadFiles],
  );

  const removeFile = useCallback(
    async (name: string) => {
      if (!exam) return;
      const target = paper[current];
      if (!target) return;
      await fetch(API + '/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ exam: exam.id, code: target.code, name }),
      }).catch(() => null);
      await reloadFiles(exam.id, exam.codes);
    },
    [current, exam, paper, reloadFiles],
  );

  const currentPage = useMemo(() => pages.find((p) => p.code === paper[current]?.code), [pages, paper, current]);
  const currentFiles = uploads[paper[current]?.code ?? ''] ?? [];
  const overtime = remaining <= 5 * 60 && phase === 'writing';
  const activeIdx = clockRef.current.active;
  const qOvertime = qRemain <= 60 && phase === 'writing';
  const lockedNow = phase === 'writing' && current !== activeIdx;
  const best = useMemo(() => (history.length ? Math.max(...history.map((h) => h.total)) : null), [history]);
  const uploadedTotal = useMemo(() => Object.values(uploads).reduce((n, fs) => n + fs.length, 0), [uploads]);

  /* --------------------------------- 渲染 --------------------------------- */

  if (phase === 'idle' || phase === 'loading' || phase === 'error') {
    return (
      <div className="space-y-4">
        <section className="glass px-4 py-5 sm:px-6">
          <h2 className="text-ink text-[22px] font-semibold">人工智能训练师（三级）操作技能考核</h2>
          <p className="text-muted mt-2 text-[13px] leading-relaxed">
            按官方认定方案组卷：一场考核 {AI_PRACTICAL_COUNT} 题、120 分钟、100 分，题库共 {AI_PRACTICAL_POOL.length} 道官方真题。
            业务流程设计在 1.1/1.2 两组里抽一组（30 分钟 25 分），培训与指导在 4.1/4.2 里抽一组（10 分钟 5 分），
            数据清洗和标注（20 分钟 15 分）、模型开发与测试（20 分钟 20 分）、智能系统监控和优化（20 分钟 15 分）、
            人机交互流程设计（20 分钟 20 分）四题必考。每题按官方考核时间单独计时，做完一题进下一题，不能回头改。
          </p>
          <div className="text-muted mt-3 space-y-1.5 text-[13px] leading-relaxed">
            <p>开始后计时不暂停，本题到点自动锁题进入下一题，全卷到点自动交卷，一份卷只能交一次。</p>
            <p>每题左侧是官方试题单，右侧「素材下载」给本题全部素材（notebook 框架、数据集、答题卷、onnx 模型），解压或直接在网页里的 jupyter 打开即可作答。</p>
            <p>作答完按「答案上传」表格逐项交文件：notebook 用 File → Download as → HTML(.html) 导出，截图存 jpg，报告存 docx，文件名照表格里的要求写。</p>
            <p>答题卷（docx）是 Word 二进制文件，jupyter 里双击它只会报 not UTF-8、看不到内容；点「素材下载」里的「预览答题卷」在浏览器里看原样。</p>
            <p>交卷后按官方评分细则逐条给分，可对照每个评分点看理由。</p>
          </div>
          {error ? <p className="text-danger-ink mt-3 text-[13px]">{error}</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="pill pill--solid px-5 py-2.5 text-[13px]"
              onClick={() => void begin()}
              disabled={phase === 'loading'}
            >
              {phase === 'loading' ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Play size={14} className="mr-1.5" />}
              {phase === 'loading' ? '正在组卷' : '开始考试'}
            </button>
            {best !== null ? <span className="text-muted text-[13px]">历史最高 {best} 分</span> : null}
          </div>
        </section>

        {result ? <ResultCard result={result} paper={paper} auto={autoSubmitted} seconds={history[0]?.seconds ?? 0} /> : null}
        {history.length ? (
          <section className="glass px-4 py-4 sm:px-5">
            <h3 className="text-ink text-[14px] font-medium">历史交卷</h3>
            <ul className="mt-2 space-y-1.5">
              {history.map((h) => (
                <li key={h.at} className="text-muted flex flex-wrap items-baseline gap-x-4 text-[13px]">
                  <span className="tabular-nums">{stamp(h.at)}</span>
                  <span className={'tabular-nums ' + (h.total >= 60 ? 'text-success-ink' : 'text-ink')}>
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

  if (phase === 'grading') {
    return (
      <div className="space-y-4">
        <section className="glass px-4 py-8 text-center sm:px-6">
          <Loader2 size={22} className="text-brand mx-auto animate-spin" />
          <p className="text-ink mt-3 text-[15px] font-medium">AI 正在按官方评分细则逐题判卷</p>
          <p className="text-muted mt-1 text-[13px]">已等 {waitTick} 秒，通常需要 1 到 3 分钟</p>
        </section>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="space-y-4">
        {result ? <ResultCard result={result} paper={paper} auto={autoSubmitted} seconds={history[0]?.seconds ?? 0} /> : null}
        {error ? <p className="text-danger-ink glass px-4 py-3 text-[13px]">{error}</p> : null}
        <section className="glass flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
          <button type="button" className="pill pill--solid px-4 py-2 text-[13px]" onClick={() => void begin()}>
            <Play size={14} className="mr-1.5" />
            再考一场
          </button>
          <button type="button" className="pill px-3 py-2 text-[13px]" onClick={clearAll}>
            <RotateCcw size={13} className="mr-1.5" />
            清空记录
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 顶部考生条 */}
      <section className="glass px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-ink text-[13px]">
            考生：<span className="font-medium">自学考生</span>
            <span className="text-muted ml-3">试卷：人工智能训练师（三级）操作技能</span>
          </span>
          <span className="text-muted text-[13px]">
            已上传 {uploadedTotal} 个文件
          </span>
          <span className="ml-auto flex items-baseline gap-4">
            <span className="text-muted text-[12px]">
              本题
              <span className={'ml-1 text-[22px] font-semibold tabular-nums ' + (qOvertime ? 'text-danger-ink' : 'text-ink')}>
                {fmt(qRemain)}
              </span>
            </span>
            <span className="text-muted text-[12px]">
              全卷
              <span className={'ml-1 text-[22px] font-semibold tabular-nums ' + (overtime ? 'text-danger-ink' : 'text-brand')}>
                {fmt(remaining)}
              </span>
            </span>
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Clock size={13} className="text-muted" />
          {paper.map((item, i) => {
            const n = (uploads[item.code] ?? []).length;
            const done = i < activeIdx;
            return (
              <button
                key={item.code}
                type="button"
                disabled={i > activeIdx}
                onClick={() => {
                  setCurrent(i);
                  setTab('upload');
                }}
                className={
                  'pill px-2.5 py-1 text-[12px] ' +
                  (i === current ? 'pill--solid' : done ? 'text-muted' : n ? 'text-success-ink' : '')
                }
                title={done ? '已锁定，仅供回看' : i > activeIdx ? '还没轮到这一题' : '当前作答'}
              >
                第 {i + 1} 题
                {n ? ' ' + n : ''}
              </button>
            );
          })}
          <button
            type="button"
            className="pill ml-auto px-3 py-1.5 text-[12px]"
            onClick={() => {
              if (!window.confirm('进入下一题后本题不能再上传，确定？')) return;
              lockAndAdvance();
            }}
          >
            <ChevronRight size={12} className="mr-1" />
            下一题
          </button>
          <button type="button" className="pill px-3 py-1.5 text-[12px]" onClick={() => void submit(false)}>
            <Send size={12} className="mr-1.5" />
            交卷
          </button>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* 左：试题单 */}
        <section className="glass px-4 py-4 sm:px-5">
          <div className="text-muted mb-2 text-[12px]">
            第 {current + 1} 题 {sectionLabel(paper[current]?.code ?? '')} 考核时间 {paper[current]?.minutes} 分值{' '}
            {paper[current]?.score} 分
          </div>
          {currentPage ? (
            <div className="space-y-3">
              {currentPage.sections.map((sec) => (
                <div key={sec.head}>
                  <h3 className="text-ink text-[15px] font-medium">{sec.head}</h3>
                  {sec.blocks.length ? (
                    <div className="text-muted mt-1 space-y-1 text-[13px] leading-relaxed">
                      {sec.blocks.map((b, i) =>
                        b.kind === 'table' ? (
                          <div
                            key={i}
                            className="overflow-x-auto text-[12.5px] [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[var(--border)] [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-[var(--border)] [&_th]:bg-black/[0.03] [&_th]:px-2 [&_th]:py-1"
                            dangerouslySetInnerHTML={{ __html: b.html }}
                          />
                        ) : (
                          <p key={i} dangerouslySetInnerHTML={{ __html: b.html }} />
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-[13px]">正在加载本题题面</p>
          )}
        </section>

        {/* 右：上传与素材 */}
        <section className="glass h-fit px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={'pill px-3 py-1.5 text-[12px] ' + (tab === 'upload' ? 'pill--solid' : '')}
              onClick={() => setTab('upload')}
            >
              答案上传
            </button>
            <button
              type="button"
              className={'pill px-3 py-1.5 text-[12px] ' + (tab === 'materials' ? 'pill--solid' : '')}
              onClick={() => setTab('materials')}
            >
              素材下载
            </button>
          </div>

          {tab === 'upload' ? (
            <div className="mt-3">
              <h3 className="text-ink text-[14px] font-medium">注意事项</h3>
              <ul className="text-muted mt-1 space-y-1 text-[12px] leading-relaxed">
                {(currentPage?.notes ?? []).map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
              <h3 className="text-ink mt-3 text-[14px] font-medium">答案上传</h3>
              {lockedNow ? (
                <p className="text-danger-ink mt-1 text-[12px]">
                  本题已经锁定{current < activeIdx ? '（你已经进入下一题，这里只能回看）' : ''}，不能再上传。
                </p>
              ) : null}
              <table className="mt-1 w-full table-fixed text-[12px]">
                <thead>
                  <tr className="text-muted">
                    <th className="w-[10%] border border-[var(--border)] px-1 py-1 text-left font-normal">序号</th>
                    <th className="w-[52%] border border-[var(--border)] px-1 py-1 text-left font-normal">要求</th>
                    <th className="w-[38%] border border-[var(--border)] px-1 py-1 text-left font-normal">上传</th>
                  </tr>
                </thead>
                <tbody>
                  {(currentPage?.uploads ?? []).map((u) => (
                    <tr key={u.seq}>
                      <td className="border border-[var(--border)] px-1 py-1 tabular-nums">{u.seq}</td>
                      <td className="text-muted border border-[var(--border)] px-1 py-1">{u.requirement}</td>
                      <td className="border border-[var(--border)] px-1 py-1">
                        <button
                          type="button"
                          className="pill px-2 py-0.5 text-[11px]"
                          disabled={lockedNow}
                          onClick={() => fileRef.current?.click()}
                        >
                          <FileUp size={11} className="mr-1" />
                          上传
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {currentFiles.length ? (
                <ul className="mt-2 space-y-1">
                  {currentFiles.map((f) => (
                    <li key={f.name} className="text-muted flex items-center gap-2 text-[12px]">
                      <span className="text-success-ink">已上传</span>
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      <span className="tabular-nums">{kb(f.size)}</span>
                      <button
                        type="button"
                        className="text-muted hover:text-danger-ink"
                        disabled={lockedNow}
                        onClick={() => void removeFile(f.name)}
                        aria-label="删除"
                      >
                        <Trash2 size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mt-2 text-[12px]">本题还没上传文件，未上传的评分点按 0 分算。</p>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void doUpload(f);
                }}
              />
              {busy ? <p className="text-brand mt-2 text-[12px]">{busy}</p> : null}
            </div>
          ) : (
            <div className="mt-3">
              <h3 className="text-ink text-[14px] font-medium">文件列表</h3>
              <table className="mt-1 w-full text-[12px]">
                <thead>
                  <tr className="text-muted">
                    <th className="w-[10%] border border-[var(--border)] px-1 py-1 text-left font-normal">序号</th>
                    <th className="border border-[var(--border)] px-1 py-1 text-left font-normal">文件名</th>
                    <th className="w-[18%] border border-[var(--border)] px-1 py-1 text-left font-normal">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(currentPage?.files ?? []).map((name, i) => (
                    <tr key={name}>
                      <td className="border border-[var(--border)] px-1 py-1 tabular-nums">{i + 1}</td>
                      <td className="border border-[var(--border)] px-1 py-1 break-all">{name}</td>
                      <td className="border border-[var(--border)] px-1 py-1 whitespace-nowrap">
                        <a
                          className="text-brand"
                          href={API + '/materials/' + encodeURIComponent(paper[current]?.code ?? '') + '/' + name.split('/').map(encodeURIComponent).join('/')}
                          download={name}
                        >
                          下载
                        </a>
                        {name.endsWith('.docx') ? (
                          <a
                            className="text-brand ml-2"
                            href={API + '/sheet/' + encodeURIComponent(paper[current]?.code ?? '')}
                            target="_blank"
                            rel="noreferrer"
                          >
                            预览
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  className="pill px-2.5 py-1 text-[12px]"
                  href={API + '/materials/' + encodeURIComponent(paper[current]?.code ?? '') + '.zip'}
                  download={(paper[current]?.code ?? 'materials') + '.zip'}
                >
                  <Download size={12} className="mr-1" />
                  打包下载
                </a>
                {(currentPage?.files ?? []).some((n) => n.endsWith('.docx')) ? (
                  <a
                    className="pill px-2.5 py-1 text-[12px]"
                    href={API + '/sheet/' + encodeURIComponent(paper[current]?.code ?? '')}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText size={12} className="mr-1" />
                    预览答题卷
                  </a>
                ) : null}
                <a
                  className="pill pill--solid px-2.5 py-1 text-[12px]"
                  href={'/jupyter/lab/tree/' + encodeURIComponent('素材') + '/' + encodeURIComponent(paper[current]?.code ?? '') + '?token=' + jupyterToken}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={12} className="mr-1" />
                  在 jupyter 中作答
                </a>
                <a
                  className="pill px-2.5 py-1 text-[12px]"
                  href={'/jupyter/lab/tree/' + encodeURIComponent('素材') + '/_tools/' + encodeURIComponent('答题卷.ipynb') + '?token=' + jupyterToken}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={12} className="mr-1" />
                  答题卷工具
                </a>
              </div>
              <p className="text-muted mt-2 text-[12px] leading-relaxed">
                考场里 jupyter 的工作目录是 D:\jupyter_notebook，这里就是本题素材目录。改完记得把 notebook 导出成 html 再回「答案上传」交。
              </p>
              <p className="text-muted mt-1 text-[12px] leading-relaxed">
                答题卷是 Word 二进制文件，jupyter 里双击它只会报「is not UTF-8 encoded」，看不到内容——那是加载不了，不是文件坏了。
                用「预览答题卷」在浏览器里按原样看；要在网页里填就用「答题卷工具」按单元格写值再 save()；最省事是下载用 Word 填好再上传。
              </p>
            </div>
          )}
        </section>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="pill px-3 py-1.5 text-[12px]"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
        >
          <ChevronLeft size={12} className="mr-1" />
          上一题
        </button>
        <button
          type="button"
          className="pill px-3 py-1.5 text-[12px]"
          onClick={() => setCurrent((c) => Math.min(paper.length - 1, c + 1))}
          disabled={current >= paper.length - 1}
        >
          下一题
          <ChevronRight size={12} className="ml-1" />
        </button>
        {error ? <span className="text-danger-ink text-[12px]">{error}</span> : null}
      </div>
    </div>
  );
}

/* -------------------------------- 判卷结果 -------------------------------- */

function ResultCard({
  result,
  paper,
  auto,
  seconds,
}: {
  result: PaperResult;
  paper: PoolItem[];
  auto: boolean;
  seconds: number;
}) {
  return (
    <section className="glass px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <span className="text-ink text-[22px] font-semibold tabular-nums">
          {result.total} / {result.max}
        </span>
        <span className={'text-[13px] ' + (result.total >= 60 ? 'text-success-ink' : 'text-danger-ink')}>
          {result.total >= 60 ? '合格' : '不合格（60 分合格）'}
        </span>
        {seconds ? <span className="text-muted text-[12px]">交卷用时 {fmt(seconds)}</span> : null}
        {auto ? <span className="text-warn text-[12px]">到点自动交卷</span> : null}
      </div>
      {result.summary ? <p className="text-muted mt-2 text-[13px] leading-relaxed">{result.summary}</p> : null}
      <div className="mt-3 space-y-3">
        {result.items.map((it) => {
          const meta = paper.find((p) => p.code === it.code) ?? AI_PRACTICAL_POOL.find((p) => p.code === it.code);
          return (
            <div key={it.code}>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-ink text-[14px] font-medium tabular-nums">
                  {it.code} {it.score} / {it.max}
                </span>
                <span className="text-muted text-[12px]">{meta?.title}</span>
              </div>
              {it.points.length ? (
                <ul className="mt-1 space-y-1">
                  {it.points.map((p) => {
                    const rubric = meta?.rubric.find((r) => r.id === p.id);
                    const full = rubric?.score ?? 0;
                    return (
                      <li key={p.id} className="flex items-baseline gap-2 text-[12.5px]">
                        <span
                          className={
                            'w-16 shrink-0 tabular-nums ' +
                            (p.got >= full && full > 0 ? 'text-success-ink' : p.got > 0 ? 'text-ink' : 'text-danger-ink')
                          }
                        >
                          {p.id} {p.got}/{full}
                        </span>
                        <span className="text-muted min-w-0 flex-1">
                          {rubric?.desc ? rubric.desc + ' ' : ''}
                          {p.why}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
