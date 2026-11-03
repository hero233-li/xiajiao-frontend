import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Clock, RotateCcw, X } from 'lucide-react';
import { AiPractical } from './AiPractical';
import {
  AI_THEORY_MINUTES,
  AI_THEORY_PLAN,
  AI_THEORY_QUESTIONS,
  type AiQuestion,
  type AiQuestionType,
} from '../../data/aiTrainer';
import { cloudPull, cloudPut } from '../../lib/aiSync';

/* ---------------------------------- 工具 ---------------------------------- */

const STORE_KEY = 'xj.ai.exams.v1';
const PROGRESS_KEY = 'xj.ai.exam.progress.v1';

function shuffle<T>(list: T[]): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function splitTime(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function stamp(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* ---------------------------------- 类型 ---------------------------------- */

interface ExamQuestion extends AiQuestion {
  /** 已打乱的选项（判断题为空）。 */
  shown: { key: string; text: string }[];
  /** 打乱后的正确答案（字母）。 */
  key: string[];
}

interface Paper {
  id: string;
  startedAt: string;
  questions: ExamQuestion[];
  seconds: number;
  /** exam = 正式模拟卷；wrongs = 错题复盘 */
  mode?: 'exam' | 'wrongs';
  /** 恢复进度时带上 */
  left?: number;
  cursor?: number;
  picks?: Record<string, string[]>;
  marks?: Record<string, boolean>;
}

interface ExamRecord {
  id: string;
  at: string;
  score: number;
  correct: number;
  wrong: number;
  blank: number;
  seconds: number;
  passed: boolean;
}

/* -------------------------------- 组卷与判分 -------------------------------- */

function buildPaper(): Paper {
  const picked: ExamQuestion[] = [];
  for (const block of AI_THEORY_PLAN) {
    const pool = AI_THEORY_QUESTIONS.filter((q) => q.type === block.type);
    const chosen = shuffle(pool).slice(0, Math.min(block.count, pool.length));
    for (const q of chosen) {
      if (q.type === 'tf') {
        picked.push({ ...q, shown: [], key: q.answer });
        continue;
      }
      const opts = shuffle(q.options ?? []);
      const letters = ['A', 'B', 'C', 'D', 'E'];
      const remap = new Map<string, string>();
      const shown = opts.map((opt, index) => {
        remap.set(opt.key, letters[index]);
        return { key: letters[index], text: opt.text };
      });
      picked.push({ ...q, shown, key: q.answer.map((a) => remap.get(a) ?? a) });
    }
  }
  return {
    id: `exam-${Date.now()}`,
    startedAt: new Date().toISOString(),
    questions: picked,
    seconds: AI_THEORY_MINUTES * 60,
  };
}

/** 中途刷新/关页后能接着做：存题序、选项顺序、已选、标记、剩余时间。 */
const RESUME_KEY = 'xj.ai.exam.resume.v2';

interface ResumeState {
  id: string;
  startedAt: string;
  seconds: number;
  mode?: 'exam' | 'wrongs';
  left: number;
  cursor: number;
  picks: Record<string, string[]>;
  marks: Record<string, boolean>;
  items: { qid: string; shown: { key: string; text: string }[]; key: string[] }[];
}

function saveResume(state: ResumeState) {
  try {
    localStorage.setItem(RESUME_KEY, JSON.stringify(state));
  } catch {
    /* 配额满就算了 */
  }
}

function loadResume(): Paper | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const st = JSON.parse(raw) as ResumeState;
    if (!st?.items?.length) return null;
    const byId = new Map(AI_THEORY_QUESTIONS.map((q) => [q.id, q]));
    const questions: ExamQuestion[] = [];
    for (const it of st.items) {
      const base = byId.get(it.qid);
      if (!base) return null;
      questions.push({ ...base, shown: it.shown, key: it.key });
    }
    return {
      id: st.id,
      startedAt: st.startedAt,
      questions,
      seconds: st.seconds,
      mode: st.mode === 'wrongs' ? 'wrongs' : 'exam',
      left: st.left,
      cursor: st.cursor,
      picks: st.picks,
      marks: st.marks,
    } as Paper;
  } catch {
    return null;
  }
}

/* --------------------------------- 错题本 --------------------------------- */

/** 交卷时把答错的题记下来：下次考前必须先全部做对，才解锁新卷。 */
const WRONG_KEY = 'xj.ai.wrongs.v1';
/** 云端整份文档（考试记录 + 错题本），换设备也能接上。 */
const CLOUD_KEY = 'ai-trainer';
const CLOUD_META_KEY = 'xj.ai.meta.v1';

interface WrongEntry {
  qid: string;
  type: AiQuestionType;
  misses: number;
  lastAt: string;
}

function loadWrongs(): WrongEntry[] {
  try {
    const raw = localStorage.getItem(WRONG_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as WrongEntry[];
    return Array.isArray(list) ? list.filter((e) => e && typeof e.qid === 'string') : [];
  } catch {
    return [];
  }
}

function saveWrongs(list: WrongEntry[]) {
  try {
    localStorage.setItem(WRONG_KEY, JSON.stringify(list.slice(0, 400)));
  } catch {
    /* 配额满就算了 */
  }
}

function isRight(q: ExamQuestion, mine: string[]) {
  return mine.length > 0 && mine.length === q.key.length && [...mine].sort().join('') === [...q.key].sort().join('');
}

/** 错题复盘卷：只取错题本里的题，选项重新打乱（等于重新出题）。 */
function buildWrongPaper(entries: WrongEntry[]): Paper {
  const byId = new Map(AI_THEORY_QUESTIONS.map((q) => [q.id, q]));
  const picked: ExamQuestion[] = [];
  for (const entry of entries) {
    const q = byId.get(entry.qid);
    if (!q) continue;
    if (q.type === 'tf') {
      picked.push({ ...q, shown: [], key: q.answer });
      continue;
    }
    const opts = shuffle(q.options ?? []);
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const remap = new Map<string, string>();
    const shown = opts.map((opt, index) => {
      remap.set(opt.key, letters[index]);
      return { key: letters[index], text: opt.text };
    });
    picked.push({ ...q, shown, key: q.answer.map((a) => remap.get(a) ?? a) });
  }
  return {
    id: `wrongs-${Date.now()}`,
    startedAt: new Date().toISOString(),
    questions: picked,
    seconds: Math.max(60, picked.length * 30),
    mode: 'wrongs',
  };
}

function scoreOf(paper: Paper, picked: Record<string, string[]>) {
  const perType = new Map<AiQuestionType, number>(AI_THEORY_PLAN.map((b) => [b.type, b.per]));
  let score = 0;
  let correct = 0;
  let wrong = 0;
  let blank = 0;
  for (const q of paper.questions) {
    const mine = picked[q.id] ?? [];
    if (mine.length === 0) {
      blank += 1;
      continue;
    }
    const ok =
      mine.length === q.key.length && [...mine].sort().join('') === [...q.key].sort().join('');
    if (ok) {
      correct += 1;
      score += perType.get(q.type) ?? 0;
    } else {
      wrong += 1;
    }
  }
  return { score: Math.round(score * 10) / 10, correct, wrong, blank };
}

function loadRecords(): ExamRecord[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as ExamRecord[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/* ---------------------------------- 组件 ---------------------------------- */

const TYPE_LABEL: Record<AiQuestionType, string> = {
  tf: '判断题',
  single: '单选题',
  multi: '多选题',
};

function QuestionCard({
  question,
  index,
  total,
  picked,
  onPick,
  revealed,
  marked,
  onToggleMark,
}: {
  question: ExamQuestion;
  index: number;
  total: number;
  picked: string[];
  onPick: (value: string) => void;
  revealed: boolean;
  marked?: boolean;
  onToggleMark?: () => void;
}) {
  const isMulti = question.type === 'multi';
  const correctSet = new Set(question.key);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2">
        <span className="text-muted text-[12px] tabular-nums">
          {index + 1} / {total}
        </span>
        <span className="bg-brand-soft text-brand-ink rounded-full px-2 py-0.5 text-[12px]">
          {TYPE_LABEL[question.type]}
        </span>
        {onToggleMark ? (
          <button
            type="button"
            onClick={onToggleMark}
            className={`pill ml-auto px-2.5 py-1 text-[12px] ${marked ? 'pill--solid' : ''}`}
          >
            {marked ? '已标记' : '标记待定'}
          </button>
        ) : null}
      </div>

      <p className="text-ink text-[15px] leading-relaxed">{question.stem}</p>

      {question.type === 'tf' ? (
        <div className="flex gap-2">
          {[
            { value: 'T', label: '正确' },
            { value: 'F', label: '错误' },
          ].map((opt) => {
            const active = picked.includes(opt.value);
            const good = revealed && correctSet.has(opt.value);
            const bad = revealed && active && !correctSet.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onPick(opt.value)}
                className={`pill min-w-24 px-5 py-2.5 text-[14px] ${
                  bad ? 'text-danger-ink' : good || active ? 'pill--solid' : ''
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {question.shown.map((opt) => {
            const active = picked.includes(opt.key);
            const good = revealed && correctSet.has(opt.key);
            const bad = revealed && active && !correctSet.has(opt.key);
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onPick(opt.key)}
                className={`glass flex items-start gap-3 px-4 py-3 text-left text-[14px] leading-relaxed transition ${
                  bad ? 'text-danger-ink' : good ? 'text-success-ink' : 'text-ink'
                } ${active ? 'ring-brand/60 ring-1' : ''}`}
              >
                <span
                  className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[12px] tabular-nums ${
                    active ? 'bg-brand text-white' : 'bg-line/70 text-secondary'
                  }`}
                >
                  {opt.key}
                </span>
                <span className="min-w-0 flex-1">{opt.text}</span>
                {good ? <Check className="text-success-ink size-4 shrink-0" /> : null}
                {bad ? <X className="text-danger-ink size-4 shrink-0" /> : null}
              </button>
            );
          })}
          {isMulti ? <p className="text-muted text-[12px]">多选题：选全才得分，多选少选都不得分。</p> : null}
        </div>
      )}
    </div>
  );
}

export function AiTrainerPage() {
  const [tab, setTab] = useState<'theory' | 'skill' | 'info'>('theory');
  const [paper, setPaper] = useState<Paper | null>(null);
  const [wrongs, setWrongs] = useState<WrongEntry[]>(() => loadWrongs());
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [cursor, setCursor] = useState(0);
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState<{ score: number; correct: number; wrong: number; blank: number } | null>(
    null,
  );
  const [records, setRecords] = useState<ExamRecord[]>(() => loadRecords());
  const [review, setReview] = useState(false);
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [jump, setJump] = useState('');
  const submitted = useRef(false);
  const nextTimer = useRef<number | null>(null);

  const answered = useMemo(
    () => (paper ? paper.questions.filter((q) => (picked[q.id] ?? []).length > 0).length : 0),
    [paper, picked],
  );

  const doSubmit = useCallback(() => {
    if (!paper || submitted.current) return;
    submitted.current = true;
    const scored = scoreOf(paper, picked);
    const spent = paper.seconds - left;
    const isWrongRun = paper.mode === 'wrongs';

    // 错题账本：错题复盘时做对的移除、没做对（含未作答）的留下；正式卷把新错的记进来
    let nextWrongs = wrongs;
    if (isWrongRun) {
      const seen = new Set(paper.questions.map((q) => q.id));
      const stillBad = new Set(paper.questions.filter((q) => !isRight(q, picked[q.id] ?? [])).map((q) => q.id));
      nextWrongs = wrongs.filter((e) => !seen.has(e.qid) || stillBad.has(e.qid));
    } else {
      const map = new Map(wrongs.map((e) => [e.qid, e]));
      const now = new Date().toISOString();
      for (const q of paper.questions) {
        const mine = picked[q.id] ?? [];
        if (mine.length === 0 || isRight(q, mine)) continue;
        map.set(q.id, { qid: q.id, type: q.type, misses: (map.get(q.id)?.misses ?? 0) + 1, lastAt: now });
      }
      nextWrongs = [...map.values()];
    }
    saveWrongs(nextWrongs);
    setWrongs(nextWrongs);

    let nextRecords = records;
    if (!isWrongRun) {
      const rec: ExamRecord = {
        id: paper.id,
        at: paper.startedAt,
        ...scored,
        seconds: spent,
        passed: scored.score >= 60,
      };
      nextRecords = [rec, ...loadRecords()].slice(0, 30);
      localStorage.setItem(STORE_KEY, JSON.stringify(nextRecords));
      setRecords(nextRecords);
    }
    localStorage.setItem(CLOUD_META_KEY, String(Date.now()));
    void cloudPut(CLOUD_KEY, { records: nextRecords, wrongs: nextWrongs });
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(RESUME_KEY);
    setResult(scored);
  }, [paper, picked, left, wrongs, records]);

  // 作答过程随时落盘，刷新/关页可续做
  useEffect(() => {
    if (!paper || result) return;
    saveResume({
      id: paper.id,
      mode: paper.mode ?? 'exam',
      startedAt: paper.startedAt,
      seconds: paper.seconds,
      left,
      cursor,
      picks: picked,
      marks: marked,
      items: paper.questions.map((q) => ({ qid: q.id, shown: q.shown, key: q.key })),
    });
  }, [paper, result, left, cursor, picked, marked]);

  const submit = useCallback(() => {
    if (!paper || submitted.current) return;
    const blank = paper.questions.length - answered;
    if (blank > 0 && !window.confirm(`还有 ${blank} 题没作答，确定交卷？`)) return;
    doSubmit();
  }, [paper, answered, doSubmit]);

  /** 选完就走：判断题/单选题自动跳到下一题，多选题留给用户确认。 */
  const advance = useCallback(
    (delay = 200) => {
      if (!paper) return;
      if (nextTimer.current) window.clearTimeout(nextTimer.current);
      nextTimer.current = window.setTimeout(() => {
        setCursor((c) => Math.min(paper.questions.length - 1, c + 1));
      }, delay);
    },
    [paper],
  );

  const pick = useCallback(
    (value: string) => {
      const q = paper?.questions[cursor];
      if (!q) return;
      setPicked((prev) => {
        const current = prev[q.id] ?? [];
        if (q.type === 'multi') {
          const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
          return { ...prev, [q.id]: next };
        }
        return { ...prev, [q.id]: [value] };
      });
      if (q.type !== 'multi') advance();
    },
    [paper, cursor, advance],
  );

  const toggleMark = useCallback(() => {
    const q = paper?.questions[cursor];
    if (!q) return;
    setMarked((prev) => ({ ...prev, [q.id]: !prev[q.id] }));
  }, [paper, cursor]);

  const goto = useCallback(
    (index: number) => {
      if (!paper) return;
      setCursor(Math.max(0, Math.min(paper.questions.length - 1, index)));
    },
    [paper],
  );

  // 切题后回到题目顶部（长题干时不用手动往上滚）
  useEffect(() => {
    if (!paper || result) return;
    document.getElementById('ai-question-card')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [cursor, paper, result]);

  // 键盘：A–E / 1–5 选，T/F 判断题，←/→ 上下题，Enter 下一题，M 标记，Esc 收起答题卡
  useEffect(() => {
    if (!paper || result) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const q = paper.questions[cursor];
      const key = e.key.toUpperCase();
      if (key === 'ARROWRIGHT' || key === 'ENTER') {
        e.preventDefault();
        goto(cursor + 1);
        return;
      }
      if (key === 'ARROWLEFT') {
        e.preventDefault();
        goto(cursor - 1);
        return;
      }
      if (key === 'M') {
        e.preventDefault();
        toggleMark();
        return;
      }
      if (key === 'ESCAPE') {
        setSheetOpen(false);
        return;
      }
      if (q.type === 'tf') {
        if (key === 'T' || key === '1') return pick('T');
        if (key === 'F' || key === '2') return pick('F');
        return;
      }
      const letter =
        /^[A-E]$/.test(key) ? key : /^[1-5]$/.test(key) ? String.fromCharCode(64 + Number(key)) : '';
      if (letter && q.shown.some((o) => o.key === letter)) pick(letter);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paper, result, cursor, pick, goto, toggleMark]);

  // 倒计时
  useEffect(() => {
    if (!paper || result) return;
    const timer = window.setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paper, result]);

  useEffect(() => {
    // 时间到直接交卷，不走确认框
    if (paper && !result && left === 0) doSubmit();
  }, [left, paper, result, doSubmit]);

  const start = () => {
    const fresh: Paper = { ...buildPaper(), mode: 'exam' };
    submitted.current = false;
    setPaper(fresh);
    setPicked({});
    setCursor(0);
    setLeft(fresh.seconds);
    setResult(null);
    setReview(false);
    setMarked({});
    setSheetOpen(false);
    setJump('');
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ id: fresh.id, startedAt: fresh.startedAt, left: fresh.seconds }),
    );
  };

  // 换设备也能接上：进页面先取云端那份，比本机新就覆盖本地
  useEffect(() => {
    let alive = true;
    void (async () => {
      const remote = await cloudPull<{ records?: ExamRecord[]; wrongs?: WrongEntry[] }>(CLOUD_KEY);
      if (!alive || !remote) return;
      const localAt = Number(localStorage.getItem(CLOUD_META_KEY) ?? 0);
      if (remote.updatedAt <= localAt) return;
      const recs = Array.isArray(remote.data.records) ? remote.data.records.slice(0, 30) : [];
      const wrs = Array.isArray(remote.data.wrongs) ? remote.data.wrongs.filter((e) => e && typeof e.qid === 'string') : [];
      localStorage.setItem(STORE_KEY, JSON.stringify(recs));
      saveWrongs(wrs);
      localStorage.setItem(CLOUD_META_KEY, String(remote.updatedAt));
      setRecords(recs);
      setWrongs(wrs);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const startWrongs = (list: WrongEntry[] = wrongs) => {
    const fresh = buildWrongPaper(list);
    if (!fresh.questions.length) return;
    submitted.current = false;
    setPaper(fresh);
    setPicked({});
    setCursor(0);
    setLeft(fresh.seconds);
    setResult(null);
    setReview(false);
    setMarked({});
    setSheetOpen(false);
    setJump('');
  };

  const [pending, setPending] = useState<Paper | null>(() => {
    const st = loadResume();
    return st && st.questions.length ? st : null;
  });
  const resumable = !paper && !result ? pending : null;

  const resume = () => {
    const st = pending ?? loadResume();
    if (!st) return;
    submitted.current = false;
    setPaper(st);
    setPicked(st.picks ?? {});
    setMarked(st.marks ?? {});
    setCursor(st.cursor ?? 0);
    setLeft(st.left ?? st.seconds);
    setResult(null);
    setReview(false);
    // 已恢复过纸面，清掉 pending 避免首页按钮残留
    setPending(null);
  };

  const reset = () => {
    setPaper(null);
    setResult(null);
    setPicked({});
    setCursor(0);
    setMarked({});
    setSheetOpen(false);
    submitted.current = false;
  };

  const best = records.length ? Math.max(...records.map((r) => r.score)) : null;
  const avg = records.length
    ? Math.round((records.reduce((sum, r) => sum + r.score, 0) / records.length) * 10) / 10
    : null;

  /* --------------------------------- 渲染 --------------------------------- */

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'theory', label: '理论刷题' },
    { key: 'skill', label: '实操' },
    { key: 'info', label: '报考信息' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink text-[22px] font-semibold">人工智能训练师（三级）</h1>
          <p className="text-secondary mt-1 text-[13px]">
            理论考试 {AI_THEORY_MINUTES} 分钟 · 190 题 · 100 分；实操 120 分钟 · 6 题 · 100 分，两项各 60 分合格。
          </p>
        </div>
        <div className="flex gap-1.5">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`pill px-3.5 py-1.5 text-[13px] ${tab === item.key ? 'pill--solid' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'info' ? (
        <section className="glass divide-line/70 divide-y">
          {[
            ['职业名称', '人工智能训练师'],
            ['职业编码', '4-04-05-05'],
            ['报考等级', '三级 / 高级工'],
            ['认定方式', '理论知识考试（闭卷机考）+ 操作技能考核（计算机机考）'],
            ['合格标准', '两科各 100 分制，均达 60 分及以上合格；不及格可分别补考'],
            ['本次考试', '2026-11-22；报名 11-06 13:30–16:30，长宁校区主楼 216'],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3.5 sm:px-5">
              <span className="text-muted w-24 shrink-0 text-[13px]">{label}</span>
              <span className="text-ink min-w-0 flex-1 text-[14px]">{value}</span>
            </div>
          ))}
        </section>
      ) : null}

      {tab === 'skill' ? <AiPractical /> : null}

      {tab === 'theory' ? (
        <>
          {!paper && !result ? (
            <>
              <section className="glass flex flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-5">
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                  <div>
                    <p className="text-ink text-[22px] leading-none font-semibold tabular-nums">
                      {AI_THEORY_QUESTIONS.length}
                    </p>
                    <p className="text-secondary mt-2 text-[13px]">题库题量</p>
                  </div>
                  <div>
                    <p className="text-ink text-[22px] leading-none font-semibold tabular-nums">
                      {records.length}
                    </p>
                    <p className="text-secondary mt-2 text-[13px]">已做次数</p>
                  </div>
                  <div>
                    <p className="text-brand-ink text-[22px] leading-none font-semibold tabular-nums">
                      {best === null ? '—' : best}
                    </p>
                    <p className="text-secondary mt-2 text-[13px]">最高分</p>
                  </div>
                  <div>
                    <p className="text-ink text-[22px] leading-none font-semibold tabular-nums">
                      {avg === null ? '—' : avg}
                    </p>
                    <p className="text-secondary mt-2 text-[13px]">平均分</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {resumable ? (
                    <button type="button" onClick={resume} className="pill px-4 py-2.5 text-[14px]">
                      继续上次（剩 {splitTime(resumable.left ?? 0)}）
                    </button>
                  ) : null}
                  {wrongs.length ? (
                    <>
                      <button
                        type="button"
                        onClick={() => startWrongs()}
                        className="pill pill--solid px-5 py-2.5 text-[14px]"
                      >
                        先清错题（剩 {wrongs.length} 题）
                      </button>
                      <span className="text-muted text-[12px]">清完才能开新卷</span>
                    </>
                  ) : (
                    <button type="button" onClick={start} className="pill pill--solid px-5 py-2.5 text-[14px]">
                      开始一次模拟考试
                    </button>
                  )}
                </div>
                <p className="text-muted basis-full text-[12px] leading-relaxed">
                  900 题来自官方《理论知识复习题》，每次按考纲结构随机抽 40 判断 + 140 单选 + 10 多选。答案 892 题有权威出处（官方模拟卷 + 公开题库），剩 8 题为 AI 推定（回顾里标「AI 解析」），发现错答案告诉我即可修正。</p>
              </section>

              {wrongs.length ? (
                <section className="glass px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-ink text-[14px] font-semibold">
                      错题复盘 · 待清 {wrongs.length} 题
                    </h2>
                    <button
                      type="button"
                      onClick={() => startWrongs()}
                      className="pill px-3 py-1.5 text-[13px]"
                    >
                      开始复盘
                    </button>
                  </div>
                  <p className="text-secondary mt-2 text-[12px] leading-relaxed">
                    上一张卷子做错的题会留在这里，需要重新做一遍并全部做对，才解锁新的模拟卷。复盘时选项会重新打乱，做对的题当场从错题本移除，做错的继续留下。
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                    {AI_THEORY_PLAN.map((block) => {
                      const count = wrongs.filter((e) => e.type === block.type).length;
                      if (!count) return null;
                      return (
                        <span key={block.type} className="text-muted">
                          {block.label} <b className="text-brand-ink tabular-nums">{count}</b>
                        </span>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              <section className="glass px-4 py-4 sm:px-5">
                <h2 className="text-ink text-[14px] font-semibold">考试结构</h2>
                <div className="mt-3 flex flex-col gap-2">
                  {AI_THEORY_PLAN.map((block) => (
                    <div key={block.type} className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="text-ink">{block.label}</span>
                      <span className="text-secondary tabular-nums">
                        {block.count} 题 × {block.per} 分 = {block.count * block.per} 分
                      </span>
                    </div>
                  ))}
                  <div className="border-line/70 mt-1 flex items-baseline justify-between gap-3 border-t pt-2 text-[13px]">
                    <span className="text-ink font-semibold">合计</span>
                    <span className="text-secondary tabular-nums">190 题 · 100 分 · 90 分钟</span>
                  </div>
                </div>
              </section>

              {records.length ? (
                <section className="glass px-4 py-4 sm:px-5">
                  <h2 className="text-ink text-[14px] font-semibold">历史成绩</h2>
                  <div className="mt-3 flex flex-col">
                    {records.slice(0, 10).map((rec) => (
                      <div
                        key={rec.id}
                        className="border-line/60 flex items-baseline gap-3 border-b py-2.5 text-[13px] last:border-b-0"
                      >
                        <span
                          className={`w-14 shrink-0 text-[15px] font-semibold tabular-nums ${
                            rec.passed ? 'text-success-ink' : 'text-danger-ink'
                          }`}
                        >
                          {rec.score}
                        </span>
                        <span className="text-secondary tabular-nums">{stamp(rec.at)}</span>
                        <span className="text-muted ml-auto shrink-0 tabular-nums">
                          对 {rec.correct} · 错 {rec.wrong} · 空 {rec.blank} · 用时 {splitTime(rec.seconds)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {paper && !result ? (
            <>
              <section className="glass flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                {paper.mode === 'wrongs' ? (
                  <span className="bg-brand-soft text-brand-ink rounded-full px-2 py-0.5 text-[12px]">
                    错题复盘
                  </span>
                ) : null}
                <span className="text-brand-ink flex items-center gap-1.5 text-[15px] font-semibold tabular-nums">
                  <Clock className="size-4" />
                  {splitTime(left)}
                </span>
                <span className="text-secondary text-[13px] tabular-nums">
                  已答 {answered} / {paper.questions.length}
                </span>
                <div className="bg-line ml-1 hidden h-1.5 w-40 overflow-hidden rounded-full sm:block">
                  <span
                    className="bg-brand block h-full rounded-full transition-all"
                    style={{ width: `${(answered / paper.questions.length) * 100}%` }}
                  />
                </div>
                {Object.values(marked).filter(Boolean).length ? (
                  <span className="text-brand-ink text-[12px]">
                    标记 {Object.values(marked).filter(Boolean).length}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSheetOpen((v) => !v)}
                  className="pill ml-auto px-3 py-1.5 text-[13px]"
                >
                  {sheetOpen ? '收起答题卡' : '答题卡'}
                </button>
                <button type="button" onClick={submit} className="pill pill--solid px-4 py-1.5 text-[13px]">
                  交卷
                </button>
              </section>

              <section id="ai-question-card" className="glass px-4 py-5 sm:px-5">
                <QuestionCard
                  question={paper.questions[cursor]}
                  index={cursor}
                  total={paper.questions.length}
                  picked={picked[paper.questions[cursor].id] ?? []}
                  revealed={false}
                  onPick={pick}
                  marked={Boolean(marked[paper.questions[cursor].id])}
                  onToggleMark={toggleMark}
                />

                <div className="mt-5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCursor((c) => Math.max(0, c - 1))}
                    disabled={cursor === 0}
                    className="pill flex items-center gap-1 px-3 py-1.5 text-[13px] disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" /> 上一题
                  </button>
                  <button
                    type="button"
                    onClick={() => setCursor((c) => Math.min(paper.questions.length - 1, c + 1))}
                    disabled={cursor === paper.questions.length - 1}
                    className="pill flex items-center gap-1 px-3 py-1.5 text-[13px] disabled:opacity-40"
                  >
                    下一题 <ChevronRight className="size-4" />
                  </button>
                  <span className="text-muted hidden text-[12px] sm:inline">
                    A–E / 1–5 选，T/F 判断，←→ 换题，Enter 下一题，M 标记
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('放弃这次考试？已作答不会保存。')) {
                        localStorage.removeItem(RESUME_KEY);
                        setPaper(null);
                      }
                    }}
                    className="text-muted ml-auto text-[12px] hover:underline"
                  >
                    放弃这次
                  </button>
                </div>
              </section>

              {sheetOpen ? (
                <section className="glass px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-ink text-[13px] font-semibold">答题卡</h2>
                    <span className="text-muted text-[12px]">
                      已答 {answered}/{paper.questions.length} · 标记{' '}
                      {Object.values(marked).filter(Boolean).length}
                    </span>
                    <form
                      className="ml-auto flex items-center gap-1.5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const n = Number(jump);
                        if (Number.isFinite(n) && n >= 1) goto(n - 1);
                        setJump('');
                      }}
                    >
                      <input
                        className="field w-16 px-2 py-1 text-[12px] tabular-nums"
                        inputMode="numeric"
                        placeholder="跳题"
                        value={jump}
                        onChange={(e) => setJump(e.target.value.replace(/\D/g, ''))}
                      />
                      <button type="submit" className="pill px-2.5 py-1 text-[12px]">
                        跳转
                      </button>
                    </form>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {paper.questions.map((q, index) => {
                      const done = (picked[q.id] ?? []).length > 0;
                      const isMarked = Boolean(marked[q.id]);
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => goto(index)}
                          className={`relative size-7 rounded-md text-[11px] tabular-nums transition ${
                            index === cursor
                              ? 'bg-brand text-white'
                              : done
                                ? 'bg-brand-soft text-brand-ink'
                                : 'bg-line/60 text-muted'
                          } ${isMarked ? 'ring-brand/70 ring-1' : ''}`}
                        >
                          {index + 1}
                          {isMarked ? (
                            <span className="bg-brand absolute top-0.5 right-0.5 size-1 rounded-full" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {paper && result ? (
            <>
              <section className="glass flex flex-wrap items-end justify-between gap-4 px-4 py-5 sm:px-5">
                {paper.mode === 'wrongs' ? (
                  <div>
                    <p className="text-ink text-[26px] leading-none font-semibold tabular-nums">
                      {wrongs.length ? `还剩 ${wrongs.length} 题` : '错题已清空'}
                    </p>
                    <p className="text-secondary mt-2 text-[13px]">
                      本轮答对 {result.correct} 题 · 未过 {result.wrong + result.blank} 题 · 用时{' '}
                      {splitTime(paper.seconds - left)}
                    </p>
                    <p className="text-muted mt-1 text-[12px]">
                      {wrongs.length
                        ? '做对的题已从错题本移除，剩下的再练一轮，全部做对才解锁新卷。'
                        : '错题已清空，可以开始新的模拟卷了。'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p
                      className={`text-[40px] leading-none font-semibold tabular-nums ${
                        result.score >= 60 ? 'text-success-ink' : 'text-danger-ink'
                      }`}
                    >
                      {result.score}
                      <span className="text-muted ml-1 text-[14px] font-normal">分</span>
                    </p>
                    <p className="text-secondary mt-2 text-[13px]">
                      {result.score >= 60 ? '合格' : '不合格（60 分合格）'} · 用时{' '}
                      {splitTime(paper.seconds - left)}
                    </p>
                    {result.wrong + result.blank > 0 ? (
                      <p className="text-muted mt-1 text-[12px]">
                        {result.wrong} 题做错已进错题本，开下一张卷前要先清完。
                      </p>
                    ) : null}
                  </div>
                )}
                <div className="flex gap-4 text-[13px]">
                  <span className="text-success-ink">对 {result.correct}</span>
                  <span className="text-danger-ink">错 {result.wrong}</span>
                  <span className="text-muted">空 {result.blank}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReview((v) => !v)}
                    className="pill px-4 py-2 text-[13px]"
                  >
                    {review ? '收起回顾' : '逐题回顾'}
                  </button>
                  {paper.mode === 'wrongs' ? (
                    wrongs.length ? (
                      <button
                        type="button"
                        onClick={() => startWrongs()}
                        className="pill pill--solid px-4 py-2 text-[13px]"
                      >
                        <RotateCcw className="mr-1 inline size-3.5" />
                        再练一轮
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          reset();
                          start();
                        }}
                        className="pill pill--solid px-4 py-2 text-[13px]"
                      >
                        开始新卷
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        reset();
                        if (wrongs.length) startWrongs();
                      }}
                      className="pill pill--solid px-4 py-2 text-[13px]"
                    >
                      <RotateCcw className="mr-1 inline size-3.5" />
                      {wrongs.length ? '去清错题' : '再考一次'}
                    </button>
                  )}
                </div>
              </section>

              {review ? (
                <section className="flex flex-col gap-3">
                  {paper.questions.map((q, index) => {
                    const mine = picked[q.id] ?? [];
                    const ok =
                      mine.length === q.key.length &&
                      [...mine].sort().join('') === [...q.key].sort().join('');
                    if (ok) return null;
                    return (
                      <div key={q.id} className="glass px-4 py-4 sm:px-5">
                        <div className="flex items-baseline gap-2 text-[12px]">
                          <span className="text-muted tabular-nums">第 {index + 1} 题</span>
                          <span className="bg-brand-soft text-brand-ink rounded-full px-2 py-0.5">
                            {TYPE_LABEL[q.type]}
                          </span>
                          <span className={mine.length ? 'text-danger-ink' : 'text-muted'}>
                            {mine.length ? '答错' : '未作答'}
                          </span>
                          {q.verified === false ? (
                            <span className="text-muted rounded-full bg-warn-soft px-2 py-0.5">
                              AI 解析
                            </span>
                          ) : null}
                        </div>
                        <p className="text-ink mt-2 text-[14px] leading-relaxed">{q.stem}</p>
                        <div className="text-secondary mt-2 flex flex-col gap-1 text-[13px]">
                          <span>
                            我的答案：
                            <b className={mine.length ? 'text-danger-ink' : 'text-muted'}>
                              {mine.length
                                ? mine.map((v) => (v === 'T' ? '正确' : v === 'F' ? '错误' : v)).join('')
                                : '未作答'}
                            </b>
                          </span>
                          <span>
                            正确答案：
                            <b className="text-success-ink">
                              {q.key.map((v) => (v === 'T' ? '正确' : v === 'F' ? '错误' : v)).join('')}
                            </b>
                          </span>
                          {q.type !== 'tf'
                            ? q.shown
                                .filter((opt) => q.key.includes(opt.key) || mine.includes(opt.key))
                                .map((opt) => (
                                  <span key={opt.key} className="text-muted">
                                    {opt.key}. {opt.text}
                                  </span>
                                ))
                            : null}
                        </div>
                      </div>
                    );
                  })}
                </section>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
