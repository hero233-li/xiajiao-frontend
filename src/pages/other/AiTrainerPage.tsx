import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Lightbulb,
  ListFilter,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import { AiPractical } from './AiPractical';
import {
  AI_THEORY_MINUTES,
  AI_THEORY_PLAN,
  AI_THEORY_QUESTIONS,
  type AiQuestion,
  type AiQuestionType,
} from '../../data/aiTrainer';
import { explainOf } from '../../data/aiTrainerExplain';
import {
  addWrong,
  loadWrongBook,
  noteRight,
  saveWrongBook,
  isReviewing,
  sortWrongs,
  wrongWeight,
  type WrongBook,
} from '../../lib/wrongbook';
import {
  WRONG_PATTERNS,
  matchWrongPattern,
  passWrongScope,
  patternById,
  type WrongPatternId,
  type WrongScope,
} from '../../lib/wrongPatterns';
import { dbDel, dbGet, dbSet, hydrate } from '../../lib/aiDb';
import {
  answerCard,
  buildQueue,
  bumpDay,
  dayOf,
  loadConf,
  loadDaily,
  loadQueue,
  loadSrs,
  saveConf,
  saveDaily,
  saveQueue,
  saveSrs,
  type DayLog,
  type DayQueue,
  type SrsConf,
  type SrsMap,
} from '../../lib/srs';

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

/** 打乱选项并重排标号，返回一张可直接作答的题。 */
function mixQuestion(q: AiQuestion): ExamQuestion {
  if (q.type === 'tf') return { ...q, shown: [], key: q.answer };
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const remap = new Map<string, string>();
  const shown = shuffle(q.options ?? []).map((opt, index) => {
    remap.set(opt.key, letters[index]);
    return { key: letters[index], text: opt.text };
  });
  return { ...q, shown, key: q.answer.map((a) => remap.get(a) ?? a) };
}

/** 考试卷里错题占的比例上限：每种题型留四分之一席位给错题，其余优先出没做过的新题。 */
const EXAM_WRONG_RATIO = 0.25;

/** 组卷选题用的种子：哪些题做过、哪些在错题集里。 */
interface PaperSeed {
  /** 做过（刷过或考过）的题 */
  seen: Set<string>;
  /** 错题池：qid -> 权重，错得越多权重越大 */
  wrongs: Map<string, number>;
}

function buildPaper(seed?: PaperSeed): Paper {
  const picked: ExamQuestion[] = [];
  for (const block of AI_THEORY_PLAN) {
    const pool = AI_THEORY_QUESTIONS.filter((q) => q.type === block.type);
    const target = Math.min(block.count, pool.length);
    const chosen: AiQuestion[] = [];
    if (seed) {
      const wrongCandidates = pool
        .filter((q) => seed.wrongs.has(q.id))
        .sort((a, b) => (seed.wrongs.get(b.id) ?? 0) - (seed.wrongs.get(a.id) ?? 0));
      const wrongQuota = Math.min(Math.floor(target * EXAM_WRONG_RATIO), wrongCandidates.length);
      for (const q of wrongCandidates.slice(0, wrongQuota)) chosen.push(q);
    }
    const restPool = pool.filter((q) => !chosen.some((c) => c.id === q.id));
    const need = target - chosen.length;
    if (need > 0) {
      const freshPool = seed ? restPool.filter((q) => !seed.seen.has(q.id)) : restPool;
      const seenPool = seed ? restPool.filter((q) => seed.seen.has(q.id)) : [];
      chosen.push(...shuffle(freshPool).slice(0, need));
      const left = target - chosen.length;
      if (left > 0) chosen.push(...shuffle(seenPool).slice(0, left));
    }
    if (chosen.length < target) {
      for (const q of shuffle(pool.filter((q) => !chosen.some((c) => c.id === q.id)))) {
        if (chosen.length >= target) break;
        chosen.push(q);
      }
    }
    picked.push(...shuffle(chosen).map(mixQuestion));
  }
  return {
    id: `exam-${Date.now()}`,
    startedAt: new Date().toISOString(),
    questions: picked,
    seconds: AI_THEORY_MINUTES * 60,
  };
}

/* --------------------------------- 背题模式 -------------------------------- */

/** 错题模式：一局 10 题，题源只有错题集。 */
const WRONG_COUNT = 10;
/** 平时练习（错题模式）不出多选题：多选只在模拟考卷里出现。 */
const PRACTICE_QUESTIONS = AI_THEORY_QUESTIONS.filter((q) => q.type !== 'multi');
/** 多选题号：历史记录里残留的多选题要在这里挡掉。 */
const MULTI_IDS = new Set(AI_THEORY_QUESTIONS.filter((q) => q.type === 'multi').map((q) => q.id));

type DrillKind = 'wrongs';

/** 一局几题：错题模式 10 题。 */
function sizeOf(): number {
  return WRONG_COUNT;
}

interface DrillRun {
  /** wrongs = 错题模式，按错因专项抓题 */
  kind: DrillKind;
  /** 错题模式专项 ID（不固定题数，按模式全量出题） */
  patternId?: WrongPatternId;
  patternTitle?: string;
  patternTip?: string;
  questions: ExamQuestion[];
  cursor: number;
  picks: Record<string, string[]>;
  /** 整批统一交一次卷，交卷后才揭晓对错并出本批总结。 */
  submitted: boolean;
  /** 这一批里每道题算复习还是新题 */
  labels: Record<string, 'new' | 'review' | 'wrong'>;
  /** 交卷复盘时重新选答案，选对并提交才算订正过 */
  fixPicks: Record<string, string[]>;
  /** 已经订正过的题 */
  fixed: Record<string, boolean>;
}

/** 刷题会话存本地并同步到云端：刷新、换设备都回到原来那一页，而不是回首页。 */
const DRILL_SESSION_KEY = 'xj.ai.drill.session.v1';

function normalizeDrillSession(input: unknown): DrillRun | null {
  const data = input as DrillRun | null;
  if (!data || !Array.isArray(data.questions) || !data.questions.length) return null;
  if (!data.questions.every((q) => q && typeof q.id === 'string' && Array.isArray(q.shown))) return null;
  const pat = data.patternId ? patternById(data.patternId) : undefined;
  return {
    kind: 'wrongs',
    patternId: pat ? pat.id : undefined,
    patternTitle: typeof data.patternTitle === 'string' ? data.patternTitle : pat?.title,
    patternTip: typeof data.patternTip === 'string' ? data.patternTip : pat?.tip,
    questions: data.questions,
    cursor: Math.min(Math.max(Number(data.cursor) || 0, 0), data.questions.length - 1),
    picks: data.picks ?? {},
    submitted: !!data.submitted,
    labels: data.labels ?? {},
    fixPicks: data.fixPicks ?? {},
    fixed: data.fixed ?? {},
  };
}

function loadDrillSession(): DrillRun | null {
  try {
    const raw = dbGet(DRILL_SESSION_KEY);
    if (!raw) return null;
    return normalizeDrillSession(JSON.parse(raw));
  } catch {
    return null;
  }
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
  dbSet(RESUME_KEY, state);
}

/* --------------------------------- 错题本 --------------------------------- */

/** 交卷时把答错的题记下来：下次考前必须先全部做对，才解锁新卷。 */
const WRONG_KEY = 'xj.ai.wrongs.v1';
/** 题库落在服务器 MySQL（xuexizhitu.ai_question / ai_question_seen），考试和刷题都算「做过」。 */
const BANK_API = '/ai-lab';

interface WrongEntry {
  qid: string;
  type: AiQuestionType;
  misses: number;
  lastAt: string;
}

function loadWrongs(): WrongEntry[] {
  try {
    const raw = dbGet(WRONG_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as WrongEntry[];
    return Array.isArray(list) ? list.filter((e) => e && typeof e.qid === 'string') : [];
  } catch {
    return [];
  }
}

function saveWrongs(list: WrongEntry[]) {
  dbSet(WRONG_KEY, list.slice(0, 400));
}

function lettersOf(list: string[]): string {
  return [...list]
    .sort()
    .map((v) => (v === 'T' ? '正确' : v === 'F' ? '错误' : v))
    .join('');
}

function isRight(q: ExamQuestion, mine: string[]) {
  return mine.length > 0 && mine.length === q.key.length && [...mine].sort().join('') === [...q.key].sort().join('');
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
    const ok = mine.length === q.key.length && [...mine].sort().join('') === [...q.key].sort().join('');
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
    const raw = dbGet(STORE_KEY);
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
  hints,
  hideMultiTip,
}: {
  question: ExamQuestion;
  index: number;
  total: number;
  picked: string[];
  onPick: (value: string) => void;
  revealed: boolean;
  marked?: boolean;
  onToggleMark?: () => void;
  /** 题号旁的角标列表，例如 ['错 3 次', '从未做对']。 */
  hints?: string[];
  /** 刷题模式下不显示「多选要选全」这类提示。 */
  hideMultiTip?: boolean;
}) {
  const isMulti = question.type === 'multi';
  const correctSet = new Set(question.key);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted text-[13px] font-medium tabular-nums">
          {index + 1} / {total}
        </span>
        <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 text-[12px] font-medium">
          {TYPE_LABEL[question.type]}
        </span>
        {(hints ?? []).map((tag) => (
          <span
            key={tag}
            className="bg-danger-soft text-danger-ink rounded-full px-2.5 py-0.5 text-[12px] font-medium"
          >
            {tag}
          </span>
        ))}
        {onToggleMark ? (
          <button
            type="button"
            onClick={onToggleMark}
            className={`pill ml-auto px-3 py-1 text-[12px] ${marked ? 'pill--solid' : ''}`}
          >
            <Flag size={12} strokeWidth={1.9} />
            {marked ? '已标记' : '标记待定'}
          </button>
        ) : null}
      </div>

      <p className="text-ink text-[15px] leading-[1.75] font-medium">{question.stem}</p>

      {question.type === 'tf' ? (
        <div className="grid grid-cols-2 gap-3 sm:max-w-[340px]">
          {[
            { value: 'T', label: '正确', hotkey: 'T' },
            { value: 'F', label: '错误', hotkey: 'F' },
          ].map((opt) => {
            const active = picked.includes(opt.value);
            const good = revealed && correctSet.has(opt.value);
            const bad = revealed && active && !correctSet.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onPick(opt.value)}
                className={`glass-tile flex items-center justify-between px-4 py-3 text-[15px] font-medium ${
                  bad
                    ? 'border-danger/60 bg-danger-soft/70 text-danger-ink'
                    : good
                      ? 'border-success/60 bg-success-soft/70 text-success-ink'
                      : active
                        ? 'border-brand bg-brand text-white shadow-[0_6px_16px_color-mix(in_srgb,var(--iris-9)_26%,transparent)]'
                        : 'text-ink'
                }`}
              >
                <span>{opt.label}</span>
                <span
                  className={`grid size-6 place-items-center rounded-full text-[12px] tabular-nums ${
                    active && !bad && !good ? 'bg-white/20 text-white' : 'bg-surface-2 text-muted'
                  }`}
                >
                  {opt.hotkey}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {question.shown.map((opt) => {
            const active = picked.includes(opt.key);
            const good = revealed && correctSet.has(opt.key);
            const bad = revealed && active && !correctSet.has(opt.key);
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onPick(opt.key)}
                className={`glass-tile flex items-start gap-3 px-4 py-3 text-left text-[15px] leading-relaxed ${
                  bad
                    ? 'border-danger/50 bg-danger-soft/60 text-danger-ink'
                    : good
                      ? 'border-success/50 bg-success-soft/60 text-success-ink'
                      : active
                        ? 'border-brand bg-brand-soft/65 text-ink'
                        : 'text-ink'
                }`}
              >
                <span
                  className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold tabular-nums transition-colors ${
                    bad
                      ? 'bg-danger-solid text-white'
                      : good
                        ? 'bg-success text-white'
                        : active
                          ? 'bg-brand text-white'
                          : 'bg-surface-2 text-secondary'
                  }`}
                >
                  {opt.key}
                </span>
                <span className="min-w-0 flex-1">{opt.text}</span>
                {good ? <Check className="text-success-ink mt-1 size-4 shrink-0" /> : null}
                {bad ? <X className="text-danger-ink mt-1 size-4 shrink-0" /> : null}
              </button>
            );
          })}
          {isMulti && !hideMultiTip ? (
            <p className="text-muted text-[12px]">多选题需全选正确项，多选或少选均不得分。</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ExplainBlock({ id }: { id: string }) {
  const ex = explainOf(id);
  if (!ex) return null;
  return (
    <div className="hairline bg-surface/65 mt-4 rounded-[14px] px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className="text-brand-ink inline-flex items-center gap-1 font-medium">
          <Lightbulb className="size-3.5" />
          解析
        </span>
        <span className="text-muted">{ex.ai ? 'AI 归纳，非官方答案' : '来源：官方题库'}</span>
      </div>
      <p className="text-secondary mt-1.5 text-[13px] leading-relaxed">{ex.text}</p>
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
  const [result, setResult] = useState<{ score: number; correct: number; wrong: number; blank: number } | null>(null);
  const [records, setRecords] = useState<ExamRecord[]>(() => loadRecords());
  const [review, setReview] = useState(false);
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [jump, setJump] = useState('');
  const [drill, setDrill] = useState<DrillRun | null>(() => loadDrillSession());
  /** 复盘里提交了但还不对的题 */
  const [fixBad, setFixBad] = useState<Record<string, boolean>>({});
  const [srs, setSrs] = useState<SrsMap>(() => loadSrs());
  const [daily, setDaily] = useState<Record<string, DayLog>>(() => loadDaily());
  const [conf, setConf] = useState<SrsConf>(() => loadConf());
  const [queue, setQueue] = useState<DayQueue | null>(() => loadQueue());
  const [wrongBook, setWrongBook] = useState<WrongBook>(() => loadWrongBook());
  /** 服务器 MySQL 里记过的「做过」题号（考试 + 刷题）。 */
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  const [wrongOpen, setWrongOpen] = useState(false);
  const [wrongPicker, setWrongPicker] = useState(false);
  const [wrongScope, setWrongScope] = useState<WrongScope>('all');
  const [showPatternTip, setShowPatternTip] = useState(true);

  /** 云端记录读齐之前不渲染，也不允许把空数据写回去。 */
  const [cloudReady, setCloudReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void hydrate().then(() => {
      if (!alive) return;
      setSrs(loadSrs());
      setDaily(loadDaily());
      setConf(loadConf());
      setQueue(loadQueue());
      setWrongBook(loadWrongBook());
      setWrongs(loadWrongs());
      setRecords(loadRecords());
      setDrill(loadDrillSession());
      setCloudReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!cloudReady) return;
    if (drill) dbSet(DRILL_SESSION_KEY, drill);
    else dbDel(DRILL_SESSION_KEY);
  }, [drill, cloudReady]);

  useEffect(() => {
    if (!cloudReady) return;
    saveWrongBook(wrongBook);
  }, [wrongBook]);

  useEffect(() => {
    if (!cloudReady) return;
    saveSrs(srs);
  }, [srs]);

  useEffect(() => {
    if (!cloudReady) return;
    saveDaily(daily);
  }, [daily]);

  useEffect(() => {
    if (!cloudReady) return;
    saveConf(conf);
  }, [conf]);

  /** 开页同步「做过」标记：服务器是账本，本机多出来的进度先补推上去。 */
  useEffect(() => {
    let alive = true;
    void (async () => {
      const local = new Set<string>([...Object.keys(srs), ...Object.keys(wrongBook), ...wrongs.map((w) => w.qid)]);
      let server = new Set<string>();
      try {
        const res = await fetch(BANK_API + '/bank/seen');
        const data = await res.json();
        server = new Set(Object.keys((data?.seen ?? {}) as Record<string, unknown>));
      } catch {
        /* 服务器拿不到就先用本机的 */
      }
      if (!alive) return;
      setSeenIds(new Set([...server, ...local]));
      const missing = [...local].filter((id) => !server.has(id));
      if (missing.length) {
        void fetch(BANK_API + '/bank/mark', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ids: missing, source: 'drill' }),
        }).catch(() => undefined);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** 今日队列一天只排一次：做完的题不再从队列里消失，进度才不会往回跳。 */
  useEffect(() => {
    if (!cloudReady) return;
    const now = Date.now();
    const today = dayOf(now);
    const stale = !queue || queue.date !== today || queue.fresh.length < conf.newPerDay;
    if (!stale) return;
    const next = buildQueue(
      srs,
      PRACTICE_QUESTIONS.map((q) => q.id),
      now,
      conf,
    );
    const same =
      !!queue &&
      queue.date === next.date &&
      queue.due.join('|') === next.due.join('|') &&
      queue.fresh.join('|') === next.fresh.join('|');
    if (same) return;
    saveQueue(next);
    setQueue(next);
  }, [queue, conf, srs, cloudReady]);

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

    let nextWrongs = wrongs;
    const examWrongIds: string[] = [];
    if (isWrongRun) {
      const seen = new Set(paper.questions.map((q) => q.id));
      const stillBad = new Set(paper.questions.filter((q) => !isRight(q, picked[q.id] ?? [])).map((q) => q.id));
      nextWrongs = wrongs.filter((e) => !seen.has(e.qid) || stillBad.has(e.qid));
    } else {
      const map = new Map(wrongs.map((e) => [e.qid, e]));
      const now = new Date().toISOString();
      for (const q of paper.questions) {
        if (q.type === 'multi') continue;
        const mine = picked[q.id] ?? [];
        if (mine.length === 0 || isRight(q, mine)) continue;
        map.set(q.id, { qid: q.id, type: q.type, misses: (map.get(q.id)?.misses ?? 0) + 1, lastAt: now });
        examWrongIds.push(q.id);
      }
      nextWrongs = [...map.values()];
    }
    saveWrongs(nextWrongs);
    setWrongs(nextWrongs);

    const examIds = paper.questions.map((q) => q.id);
    setSeenIds((prev) => new Set([...prev, ...examIds]));
    void fetch(BANK_API + '/bank/mark', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: examIds, source: 'exam' }),
    }).catch(() => undefined);
    if (examWrongIds.length) {
      setWrongBook((book) => {
        let next = book;
        for (const qid of examWrongIds) next = addWrong(next, qid, Date.now(), 'exam');
        return next;
      });
    }

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
      dbSet(STORE_KEY, nextRecords);
      setRecords(nextRecords);
    }
    dbDel(PROGRESS_KEY);
    dbDel(RESUME_KEY);
    setResult(scored);
  }, [paper, picked, left, wrongs, records]);

  /** 订正做对（复盘里提交或刷题模式里做对）：从考试错题本摘掉，解锁下一张卷。 */
  const clearExamWrong = useCallback(
    (qids: string[]) => {
      if (!qids.length) return;
      const drop = new Set(qids);
      setWrongs((prev) => {
        const next = prev.filter((e) => !drop.has(e.qid));
        if (next.length === prev.length) return prev;
        saveWrongs(next);
        return next;
      });
    },
    [records],
  );

  useEffect(() => {
    if (!cloudReady) return;
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
  }, [paper, result, left, cursor, picked, marked, cloudReady]);

  const submit = useCallback(() => {
    if (!paper || submitted.current) return;
    const blank = paper.questions.length - answered;
    if (blank > 0 && !window.confirm(`还有 ${blank} 题没作答，确定交卷？`)) return;
    doSubmit();
  }, [paper, answered, doSubmit]);

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
    if (paper && !result && left === 0) doSubmit();
  }, [left, paper, result, doSubmit]);

  const start = () => {
    const seen = new Set<string>([...Object.keys(srs), ...seenIds]);
    const seedWrongs = new Map<string, number>();
    for (const item of Object.values(wrongBook)) seedWrongs.set(item.qid, wrongWeight(item));
    for (const w of wrongs) seedWrongs.set(w.qid, Math.max(seedWrongs.get(w.qid) ?? 0, w.misses));
    const fresh: Paper = { ...buildPaper({ seen, wrongs: seedWrongs }), mode: 'exam' };
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
    dbSet(PROGRESS_KEY, { id: fresh.id, startedAt: fresh.startedAt, left: fresh.seconds });
  };

  const drillPick = (question: ExamQuestion, value: string) => {
    setDrill((prev) => {
      if (!prev || prev.submitted) return prev;
      const mine = prev.picks[question.id] ?? [];
      const next =
        question.type === 'multi'
          ? mine.includes(value)
            ? mine.filter((v) => v !== value)
            : [...mine, value]
          : [value];
      return { ...prev, picks: { ...prev.picks, [question.id]: next } };
    });
    if (question.type !== 'multi') {
      window.setTimeout(() => {
        setDrill((prev) => {
          if (!prev || prev.submitted) return prev;
          const cur = prev.questions[prev.cursor];
          if (!cur || cur.id !== question.id) return prev;
          if (prev.cursor + 1 >= prev.questions.length) return prev;
          return { ...prev, cursor: prev.cursor + 1 };
        });
      }, 200);
    }
  };

  const submitDrill = () => {
    const cur = drill;
    if (!cur || cur.submitted) return;
    const now = Date.now();
    const results = cur.questions.map((q) => ({ q, ok: isRight(q, cur.picks[q.id] ?? []) }));
    const patch = { new: 0, review: 0, right: 0, wrong: 0 };
    for (const r of results) {
      if (cur.labels[r.q.id] === 'new') patch.new += 1;
      else patch.review += 1;
      if (r.ok) patch.right += 1;
      else patch.wrong += 1;
    }
    setSrs((prev) => {
      const next = { ...prev };
      for (const r of results) next[r.q.id] = answerCard(prev[r.q.id], r.ok, now);
      return next;
    });
    setDaily((prev) => bumpDay(prev, dayOf(now), patch));
    setWrongBook((prev) => {
      let next = prev;
      for (const r of results) {
        if (!r.ok) next = addWrong(next, r.q.id, now);
        else if (next[r.q.id]) next = noteRight(next, r.q.id, now);
      }
      return next;
    });
    if (cur.kind === 'wrongs') clearExamWrong(results.filter((r) => r.ok).map((r) => r.q.id));
    const batchIds = results.map((r) => r.q.id);
    setSeenIds((prev) => new Set([...prev, ...batchIds]));
    void fetch(BANK_API + '/bank/mark', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: batchIds, source: 'drill' }),
    }).catch(() => undefined);
    setDrill({ ...cur, submitted: true });
  };

  const drillStats = useMemo(() => {
    if (!drill) return { right: 0, wrong: 0, answered: 0, fresh: 0, review: 0 };
    let right = 0;
    let wrong = 0;
    let fresh = 0;
    let review = 0;
    for (const q of drill.questions) {
      if (drill.labels[q.id] === 'new') fresh += 1;
      else review += 1;
      const mine = drill.picks[q.id] ?? [];
      if (!mine.length) continue;
      if (isRight(q, mine)) right += 1;
      else wrong += 1;
    }
    return { right, wrong, answered: right + wrong, fresh, review };
  }, [drill]);

  const askSubmitDrill = () => {
    if (!drill || drill.submitted) return;
    const blank = drill.questions.length - drillStats.answered;
    if (blank > 0 && !window.confirm('还有 ' + blank + ' 题没答，未作答的按答错计入本批，确定交卷？')) return;
    submitDrill();
  };

  const drillGo = (delta: number) => {
    const cur = drill;
    if (!cur || cur.submitted) return;
    const next = Math.min(cur.questions.length - 1, Math.max(0, cur.cursor + delta));
    if (next !== cur.cursor) setDrill({ ...cur, cursor: next });
  };

  const pendingExamWrongs = useMemo(() => {
    const known = new Set(PRACTICE_QUESTIONS.map((q) => q.id));
    return wrongs.filter((e) => known.has(e.qid)).length;
  }, [wrongs]);

  const unfixedCount = useMemo(() => {
    if (!drill || !drill.submitted) return 0;
    return drill.questions.filter((q) => !isRight(q, drill.picks[q.id] ?? []) && !drill.fixed[q.id]).length;
  }, [drill]);

  const drillFixPick = (q: ExamQuestion, key: string) => {
    setDrill((prev) => {
      if (!prev) return prev;
      const mine = prev.fixPicks[q.id] ?? [];
      const nextMine =
        q.type === 'multi' ? (mine.includes(key) ? mine.filter((v) => v !== key) : [...mine, key]) : [key];
      return { ...prev, fixPicks: { ...prev.fixPicks, [q.id]: nextMine } };
    });
    setFixBad((prev) => (prev[q.id] ? { ...prev, [q.id]: false } : prev));
  };

  const drillFixSubmit = (q: ExamQuestion) => {
    const mine = drill?.fixPicks[q.id] ?? [];
    if (!mine.length) return;
    if (!isRight(q, mine)) {
      setFixBad((prev) => ({ ...prev, [q.id]: true }));
      return;
    }
    setDrill((prev) => (prev ? { ...prev, fixed: { ...prev.fixed, [q.id]: true } } : prev));
    setFixBad((prev) => ({ ...prev, [q.id]: false }));
    if (drill?.kind === 'wrongs') clearExamWrong([q.id]);
  };

  const closeDrill = () => {
    setDrill(null);
    setWrongOpen(false);
    setWrongPicker(false);
  };

  const wrongList = useMemo(() => sortWrongs(wrongBook).filter((w) => !MULTI_IDS.has(w.qid)), [wrongBook]);
  const practiceWrongs = useMemo(() => wrongs.filter((e) => !MULTI_IDS.has(e.qid)), [wrongs]);
  const qById = useMemo(() => new Map(AI_THEORY_QUESTIONS.map((q) => [q.id, q])), []);

  const startWrongPattern = (patternId: WrongPatternId) => {
    const def = patternById(patternId);
    if (!def) return;
    const examPendingIds = new Set(practiceWrongs.map((e) => e.qid));
    const orderedIds: string[] = [];
    const seenPick = new Set<string>();
    const addCandidate = (qid: string) => {
      if (seenPick.has(qid) || MULTI_IDS.has(qid)) return;
      const q = qById.get(qid);
      if (!q) return;
      const item = wrongBook[qid];
      if (!passWrongScope(wrongScope, item, patternId)) return;
      if (!matchWrongPattern(patternId, q, item, examPendingIds)) return;
      seenPick.add(qid);
      orderedIds.push(qid);
    };
    for (const e of shuffle(practiceWrongs)) addCandidate(e.qid);
    for (const w of shuffle(wrongList)) addCandidate(w.qid);

    const questions = orderedIds
      .map((id) => qById.get(id))
      .filter((q): q is AiQuestion => !!q)
      .map(mixQuestion);
    if (!questions.length) {
      window.alert('当前筛选条件下这一类错题是空的，可以切回「全部命中」或换个专题。');
      return;
    }
    const labels: Record<string, 'new' | 'review' | 'wrong'> = {};
    for (const q of questions) labels[q.id] = 'wrong';
    setWrongPicker(false);
    setShowPatternTip(true);
    setDrill({
      kind: 'wrongs',
      patternId: def.id,
      patternTitle: def.title,
      patternTip: def.tip,
      questions,
      cursor: 0,
      picks: {},
      submitted: false,
      labels,
      fixPicks: {},
      fixed: {},
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startDrill = () => {
    const byId = qById;
    const size = sizeOf();
    const ids: string[] = [];
    const labels: Record<string, 'new' | 'review' | 'wrong'> = {};
    const push = (qid: string, label: 'new' | 'review' | 'wrong') => {
      if (ids.length >= size || labels[qid] || !byId.has(qid)) return;
      ids.push(qid);
      labels[qid] = label;
    };
    const examIds = new Set(practiceWrongs.map((e) => e.qid));
    for (const e of shuffle(practiceWrongs)) push(e.qid, 'wrong');
    const activePool = [
      ...wrongList
        .filter((w) => !isReviewing(w) && !examIds.has(w.qid))
        .map((w) => ({ qid: w.qid, weight: wrongWeight(w) })),
    ];
    while (ids.length < size && activePool.length) {
      const weights = activePool.map((w) => w.weight);
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let point = Math.random() * totalWeight;
      let pickIndex = 0;
      while (pickIndex < weights.length - 1 && point > weights[pickIndex]) {
        point -= weights[pickIndex];
        pickIndex += 1;
      }
      push(activePool.splice(pickIndex, 1)[0].qid, 'wrong');
    }
    for (const w of shuffle(wrongList.filter((item) => isReviewing(item)))) push(w.qid, 'wrong');

    const questions = ids
      .map((id) => byId.get(id))
      .filter((q): q is AiQuestion => !!q)
      .map(mixQuestion);
    if (!questions.length) {
      window.alert('错题集里还没有题。');
      return;
    }
    setDrill({ kind: 'wrongs', questions, cursor: 0, picks: {}, submitted: false, labels, fixPicks: {}, fixed: {} });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearAll = () => {
    if (!window.confirm('清空这台设备与云端的全部记录（成绩 + 错题本）？清完就像没做过题一样。')) return;
    dbDel(STORE_KEY);
    dbDel(WRONG_KEY);
    dbDel(PROGRESS_KEY);
    dbDel(RESUME_KEY);
    dbDel(DRILL_SESSION_KEY);
    setDrill(null);
    setRecords([]);
    setWrongs([]);
    setResult(null);
    setReview(false);
    setPaper(null);
    setPicked({});
    setMarked({});
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

  const drillQ = drill && !drill.submitted ? drill.questions[drill.cursor] : null;
  const drillPicked: string[] = drill && drillQ ? (drill.picks[drillQ.id] ?? []) : [];

  const wrongPatternCounts = useMemo(() => {
    const examPendingIds = new Set(practiceWrongs.map((e) => e.qid));
    const allIds = Array.from(new Set([...practiceWrongs.map((e) => e.qid), ...wrongList.map((w) => w.qid)])).filter(
      (id) => !MULTI_IDS.has(id),
    );
    const counts: Record<WrongPatternId, number> = {
      exam_pending: 0,
      stubborn: 0,
      tf_absolute: 0,
      tf_concept: 0,
      tf_all: 0,
      single_negative: 0,
      single_special: 0,
      single_ml: 0,
      single_biz_data: 0,
      all_wrongs: 0,
    };
    for (const pat of WRONG_PATTERNS) {
      let n = 0;
      for (const qid of allIds) {
        const q = qById.get(qid);
        if (!q) continue;
        const item = wrongBook[qid];
        if (!passWrongScope(wrongScope, item, pat.id)) continue;
        if (matchWrongPattern(pat.id, q, item, examPendingIds)) n += 1;
      }
      counts[pat.id] = n;
    }
    return counts;
  }, [wrongList, practiceWrongs, wrongBook, wrongScope, qById]);

  const drillHints = useMemo(() => {
    if (!drillQ) return [];
    const parts: string[] = [];
    if (drill?.labels[drillQ.id] === 'new') parts.push('新题');
    else if (drill?.labels[drillQ.id] === 'review') parts.push('复习');
    const wb = wrongBook[drillQ.id];
    if (drill?.kind === 'wrongs' && wb) {
      parts.push(`错 ${wb.misses} 次`);
      if (wb.right === 0) parts.push('从未做对');
    }
    const miss = wrongs.find((e) => e.qid === drillQ.id)?.misses ?? 0;
    if (miss > 0) parts.push(`考卷错过 ${miss} 次`);
    return parts;
  }, [drillQ, drill, wrongBook, wrongs]);

  const answerText = (q: ExamQuestion) => lettersOf(q.key);
  const markedCount = Object.values(marked).filter(Boolean).length;

  /** 错题集抽屉列表 */
  const wrongBookSection = wrongList.length ? (
    <section className="glass p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-ink text-[15px] font-semibold">错题集</h3>
          <span className="bg-danger-soft text-danger-ink rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums">
            {wrongList.length} 题
          </span>
        </div>
        <span className="text-muted text-[12px]">做对计入已对次数，记录保留供复盘</span>
      </div>
      <div className="hairline-t max-h-[360px] overflow-y-auto">
        {wrongList.map((w, i) => {
          const q = qById.get(w.qid);
          return (
            <div
              key={w.qid}
              className="hairline-b flex flex-wrap items-center gap-2 py-2.5 text-[13px] last:border-b-0"
            >
              <span className="text-muted w-6 shrink-0 text-[12px] tabular-nums">{i + 1}</span>
              <span className="bg-brand-soft text-brand-ink shrink-0 rounded-full px-2 py-0.5 text-[12px]">
                {q ? TYPE_LABEL[q.type] : '题目'}
              </span>
              <span className="text-ink min-w-[200px] flex-1 truncate">{q ? q.stem : w.qid}</span>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-[12px]">
                {isReviewing(w) ? (
                  <span className="bg-success-soft text-success-ink rounded-full px-2 py-0.5 font-medium">复习</span>
                ) : (
                  <span className="bg-danger-soft text-danger-ink rounded-full px-2 py-0.5 font-medium">错题</span>
                )}
                {w.exam > 0 ? (
                  <span className="bg-warn-soft text-warn rounded-full px-2 py-0.5 font-medium">考卷错题</span>
                ) : null}
                <span className="text-danger-ink font-medium tabular-nums">积分 {w.score.toFixed(1)}</span>
                <span className="text-muted tabular-nums">
                  错 {w.misses} 对 {w.right}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  ) : null;

  /* --------------------------------- 渲染 --------------------------------- */

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'theory', label: '理论刷题' },
    { key: 'skill', label: '实操' },
    { key: 'info', label: '报考信息' },
  ];

  if (!cloudReady) {
    return (
      <div className="glass text-secondary p-8 text-center text-[13px]">正在读取云端学习记录…</div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">人工智能训练师（三级）</h1>
        <div role="tablist" aria-label="考试模块切换" className="segmented">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              data-active={tab === item.key}
              onClick={() => setTab(item.key)}
              className="segmented-item"
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {tab === 'info' ? (
        <section className="glass p-5 sm:p-6">
          <dl className="divide-y divide-[var(--glass-hairline)]">
            {[
              ['职业名称', '人工智能训练师'],
              ['职业编码', '4-04-05-05'],
              ['报考等级', '三级 / 高级工'],
              ['认定方式', '理论知识考试（闭卷机考）+ 操作技能考核（计算机机考）'],
              ['合格标准', '两科各 100 分制，均达 60 分及以上合格；不及格可分别补考'],
              ['本次考试', '2026-11-22（报名 11-06 13:30–16:30，长宁校区主楼 216）'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex flex-col gap-1 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <dt className="text-muted w-24 shrink-0 text-[13px]">{label}</dt>
                <dd className="text-ink min-w-0 flex-1 text-[15px]">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {tab === 'skill' ? <AiPractical /> : null}

      {tab === 'theory' ? (
        <>
          {!paper && !result && !drill ? (
            <>
              {/* 核心数据指标条 */}
              <section className="glass grid grid-cols-2 sm:grid-cols-4">
                {[
                  { label: '题库题量', value: String(PRACTICE_QUESTIONS.length), tone: 'text-ink' },
                  { label: '模拟次数', value: String(records.length), tone: 'text-ink' },
                  {
                    label: '最高分',
                    value: best === null ? '—' : String(best),
                    tone: best !== null && best >= 60 ? 'text-success-ink' : 'text-brand-ink',
                  },
                  { label: '平均分', value: avg === null ? '—' : String(avg), tone: 'text-ink' },
                ].map((stat, idx) => (
                  <div
                    key={stat.label}
                    className={[
                      'px-5 py-4',
                      idx % 2 === 1 ? 'hairline-l' : '',
                      idx >= 2 ? 'hairline-t sm:border-t-0' : '',
                      idx > 0 ? 'sm:hairline-l' : '',
                    ].join(' ')}
                  >
                    <p className={`text-[22px] leading-none font-semibold tabular-nums ${stat.tone}`}>{stat.value}</p>
                    <p className="text-secondary mt-2 text-[13px]">{stat.label}</p>
                  </div>
                ))}
              </section>

              {/* 双模式主工作区 */}
              <div className="grid gap-4 md:grid-cols-2">
                <section className="glass glass--sheen flex flex-col justify-between gap-4 p-5 sm:p-6">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-ink text-[15px] font-semibold">理论模拟考试</h2>
                      <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums">
                        190 题 {AI_THEORY_MINUTES} 分钟
                      </span>
                    </div>
                    <p className="text-secondary mt-2 text-[13px]">
                      判断 40 题 + 单选 140 题 + 多选 10 题，60 分合格
                    </p>
                    {pendingExamWrongs > 0 ? (
                      <p className="bg-danger-soft text-danger-ink mt-3 inline-flex items-center rounded-[10px] px-3 py-1.5 text-[12px] font-medium">
                        有 {pendingExamWrongs} 道考卷错题待清扫，做对后解锁新卷
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={start}
                      disabled={pendingExamWrongs > 0}
                      className="pill pill--solid px-5 py-2 text-[13px] font-medium disabled:opacity-40"
                    >
                      <Play size={14} strokeWidth={2} />
                      开始模拟考试
                    </button>
                    {pendingExamWrongs > 0 ? (
                      <button
                        type="button"
                        onClick={() => startWrongPattern('exam_pending')}
                        className="pill px-4 py-2 text-[13px] font-medium"
                      >
                        立刻清扫考卷错题
                      </button>
                    ) : null}
                  </div>
                </section>

                <section className="glass flex flex-col justify-between gap-4 p-5 sm:p-6">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-ink text-[15px] font-semibold">错题专项训练</h2>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums ${
                          wrongList.length
                            ? 'bg-danger-soft text-danger-ink'
                            : 'bg-surface-2 text-muted'
                        }`}
                      >
                        {wrongList.length ? `${wrongList.length} 题` : '暂无错题'}
                      </span>
                    </div>
                    <p className="text-secondary mt-2 text-[13px]">
                      按错因规律归类，附考场避坑口诀集中攻克
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setWrongPicker((v) => !v)}
                      disabled={!wrongList.length && !practiceWrongs.length}
                      className={`pill px-4 py-2 text-[13px] font-medium disabled:opacity-40 ${
                        wrongPicker ? 'pill--solid' : ''
                      }`}
                    >
                      <ListFilter size={14} strokeWidth={2} />
                      {wrongPicker ? '收起错因专项' : '选择错因专项'}
                    </button>
                    {!records.length && practiceWrongs.length ? (
                      <button
                        type="button"
                        onClick={clearAll}
                        className="text-muted hover:text-danger-ink ml-auto px-1 text-[12px] transition-colors"
                      >
                        清空记录
                      </button>
                    ) : null}
                  </div>
                </section>
              </div>

              {/* 错题专项选择器 */}
              {wrongPicker && (wrongList.length > 0 || practiceWrongs.length > 0) ? (
                <section className="glass flex flex-col gap-5 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-ink text-[15px] font-semibold">按错因专项攻克</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="segmented">
                        {(
                          [
                            { id: 'all', label: '全部命中' },
                            { id: 'never_right', label: '从未做对' },
                            { id: 'multi_miss', label: '错 ≥2 次' },
                          ] as { id: WrongScope; label: string }[]
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            data-active={wrongScope === opt.id}
                            onClick={() => setWrongScope(opt.id)}
                            className="segmented-item px-3 py-1 text-[12px]"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setWrongPicker(false)}
                        className="text-muted hover:text-ink px-2 text-[12px] transition-colors"
                      >
                        收起
                      </button>
                    </div>
                  </div>

                  {(
                    [
                      { key: 'urgent', title: '优先清扫' },
                      { key: 'tf', title: '判断题专项（疑罪从 F）' },
                      { key: 'single', title: '单选题专项（高频陷阱）' },
                      { key: 'all', title: '综合清扫' },
                    ] as const
                  ).map((sec) => {
                    const items = WRONG_PATTERNS.filter(
                      (p) => p.group === sec.key && (!p.hideWhenEmpty || wrongPatternCounts[p.id] > 0),
                    );
                    if (!items.length) return null;
                    return (
                      <div key={sec.key} className="flex flex-col gap-2.5">
                        <h3 className="text-muted text-[12px] font-medium">{sec.title}</h3>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {items.map((pat) => {
                            const count = wrongPatternCounts[pat.id];
                            return (
                              <button
                                key={pat.id}
                                type="button"
                                disabled={count === 0}
                                onClick={() => startWrongPattern(pat.id)}
                                className="glass-tile flex flex-col gap-2 p-4 text-left disabled:opacity-40"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-ink text-[15px] font-medium">{pat.title}</span>
                                  <span
                                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold tabular-nums ${
                                      count > 0
                                        ? pat.group === 'urgent'
                                          ? 'bg-danger-soft text-danger-ink'
                                          : 'bg-brand-soft text-brand-ink'
                                        : 'bg-surface-2 text-muted'
                                    }`}
                                  >
                                    {count} 题
                                  </span>
                                </div>
                                <p className="text-secondary text-[13px] leading-relaxed">{pat.subtitle}</p>
                                <p className="bg-brand-soft/45 text-brand-ink mt-auto rounded-[10px] px-3 py-1.5 text-[12px] leading-relaxed">
                                  <Lightbulb className="mr-1 inline size-3.5" />
                                  {pat.tip}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </section>
              ) : null}

              {/* 历史成绩 */}
              {records.length ? (
                <section className="glass p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-ink text-[15px] font-semibold">历史成绩</h2>
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-muted hover:text-danger-ink text-[12px] transition-colors"
                    >
                      清空记录
                    </button>
                  </div>
                  <div className="mt-3 flex flex-col">
                    {records.slice(0, 10).map((rec) => (
                      <div
                        key={rec.id}
                        className="hairline-b flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3 text-[13px] last:border-b-0"
                      >
                        <div className="flex w-28 shrink-0 items-center gap-2">
                          <span
                            className={`text-[15px] font-semibold tabular-nums ${
                              rec.passed ? 'text-success-ink' : 'text-danger-ink'
                            }`}
                          >
                            {rec.score} 分
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${
                              rec.passed
                                ? 'bg-success-soft text-success-ink'
                                : 'bg-danger-soft text-danger-ink'
                            }`}
                          >
                            {rec.passed ? '合格' : '未过'}
                          </span>
                        </div>
                        <span className="text-secondary tabular-nums">{stamp(rec.at)}</span>
                        <div className="text-muted ml-auto flex flex-wrap items-center gap-3 text-[12px] tabular-nums">
                          <span className="text-success-ink">对 {rec.correct}</span>
                          <span className="text-danger-ink">错 {rec.wrong}</span>
                          <span>空 {rec.blank}</span>
                          <span>用时 {splitTime(rec.seconds)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {/* 错题模式工作台 */}
          {!paper && !result && drill ? (
            <>
              <section className="glass-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-ink text-[15px] font-semibold">
                      {drill.patternTitle ? drill.patternTitle : '错题模式'}
                    </h2>
                    <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums">
                      共 {drill.questions.length} 题
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="bg-surface-2 h-1.5 w-full max-w-[240px] overflow-hidden rounded-full">
                      <div
                        className="bg-brand h-full rounded-full transition-all duration-[var(--duration)] ease-[var(--ease-out)]"
                        style={{
                          width: `${Math.min(100, Math.round((drillStats.answered / Math.max(1, drill.questions.length)) * 100))}%`,
                        }}
                      />
                    </div>
                    {drill.submitted ? (
                      <div className="flex items-center gap-2.5 text-[12px] font-medium tabular-nums">
                        <span className="text-success-ink">对 {drillStats.right}</span>
                        <span className="text-danger-ink">错 {drillStats.wrong}</span>
                      </div>
                    ) : (
                      <span className="text-muted text-[12px] tabular-nums">
                        已答 {drillStats.answered} / {drill.questions.length}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 text-[13px]">
                  {drill.submitted ? null : (
                    <button
                      type="button"
                      onClick={askSubmitDrill}
                      className="pill pill--solid px-4 py-1.5 text-[13px] font-medium"
                    >
                      交卷看总结
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setWrongOpen((v) => !v)}
                    className={`pill px-3 py-1.5 text-[12px] ${wrongOpen ? 'pill--solid' : ''}`}
                  >
                    错题集 {wrongList.length}
                  </button>
                  {drill.kind === 'wrongs' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDrill(null);
                        setWrongPicker(true);
                      }}
                      className="pill px-3 py-1.5 text-[12px]"
                    >
                      换专题
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={closeDrill}
                    className="text-muted hover:text-danger-ink px-2 text-[12px] transition-colors"
                  >
                    退出
                  </button>
                </div>
              </section>

              {wrongOpen ? wrongBookSection : null}

              {drill.submitted ? (
                <>
                  <section className="glass glass--sheen flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-brand-ink text-[36px] leading-none font-semibold tabular-nums">
                          {drillStats.right}
                        </span>
                        <span className="text-secondary text-[15px] tabular-nums">
                          / {drill.questions.length} 题答对
                        </span>
                        <span className="bg-brand-soft text-brand-ink ml-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums">
                          正确率 {Math.round((drillStats.right / drill.questions.length) * 100)}%
                        </span>
                      </div>
                      <div className="text-secondary mt-2 flex flex-wrap gap-3 text-[13px] tabular-nums">
                        <span className="text-danger-ink">答错 {drillStats.wrong} 题</span>
                        <span className="text-muted">未作答 {drill.questions.length - drillStats.answered} 题</span>
                      </div>
                      {drill.patternTip ? (
                        <p className="bg-brand-soft/50 text-brand-ink mt-3 rounded-[12px] px-3.5 py-2 text-[13px] leading-relaxed">
                          <Lightbulb className="mr-1.5 inline size-3.5" />
                          {drill.patternTip}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          drill.kind === 'wrongs' && drill.patternId
                            ? startWrongPattern(drill.patternId)
                            : startDrill()
                        }
                        disabled={unfixedCount > 0}
                        className="pill pill--solid px-4 py-2 text-[13px] font-medium disabled:opacity-40"
                      >
                        <RotateCcw className="size-3.5" />
                        {unfixedCount > 0
                          ? `还剩 ${unfixedCount} 题待订正`
                          : drill.kind === 'wrongs' && drill.patternId
                            ? '再刷一遍本专题'
                            : `再来 ${sizeOf()} 题`}
                      </button>
                      {drill.kind === 'wrongs' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDrill(null);
                            setWrongPicker(true);
                          }}
                          className="pill px-4 py-2 text-[13px]"
                        >
                          换个错题专题
                        </button>
                      ) : null}
                      <button type="button" onClick={closeDrill} className="pill px-4 py-2 text-[13px]">
                        返回
                      </button>
                    </div>
                  </section>

                  <section className="flex flex-col gap-3">
                    {drill.questions.map((q, index) => {
                      const mine = drill.picks[q.id] ?? [];
                      const ok = isRight(q, mine);
                      const tag = drill.labels[q.id];
                      return (
                        <div
                          key={q.id}
                          className={`glass p-5 ${!ok && !drill.fixed[q.id] ? 'border-danger/35' : ''}`}
                        >
                          <div className="flex flex-wrap items-center gap-2 text-[12px]">
                            <span className="text-muted font-medium tabular-nums">第 {index + 1} 题</span>
                            <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 font-medium">
                              {TYPE_LABEL[q.type]}
                            </span>
                            <span className="bg-surface-2 text-secondary rounded-full px-2.5 py-0.5">
                              {tag === 'wrong' ? '错题集' : tag === 'new' ? '新题' : '复习'}
                            </span>
                            <span
                              className={`ml-auto rounded-full px-2.5 py-0.5 font-medium ${
                                ok
                                  ? 'bg-success-soft text-success-ink'
                                  : 'bg-danger-soft text-danger-ink'
                              }`}
                            >
                              {ok ? '答对' : mine.length ? '答错' : '未作答'}
                            </span>
                          </div>
                          <p className="text-ink mt-3 text-[15px] leading-relaxed font-medium">{q.stem}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px]">
                            <span className="text-secondary">
                              我的答案{' '}
                              <strong className={ok ? 'text-success-ink' : mine.length ? 'text-danger-ink' : 'text-muted'}>
                                {mine.length ? lettersOf(mine) : '未作答'}
                              </strong>
                            </span>
                            <span className="text-secondary">
                              正确答案 <strong className="text-success-ink">{answerText(q)}</strong>
                            </span>
                          </div>
                          {q.type !== 'tf' ? (
                            <div className="mt-2 flex flex-col gap-1 text-[13px]">
                              {q.shown
                                .filter((opt) => q.key.includes(opt.key) || mine.includes(opt.key))
                                .map((opt) => (
                                  <span
                                    key={opt.key}
                                    className={q.key.includes(opt.key) ? 'text-ink' : 'text-muted'}
                                  >
                                    {opt.key}. {opt.text}
                                  </span>
                                ))}
                            </div>
                          ) : null}
                          <ExplainBlock id={q.id} />
                          {ok ? null : drill.fixed[q.id] ? (
                            <p className="text-success-ink mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium">
                              <Check size={15} /> 已订正
                            </p>
                          ) : (
                            <div className="hairline bg-surface/70 mt-4 rounded-[14px] p-4">
                              <p className="text-ink text-[13px] font-medium">重新选一遍，选对提交后解锁下一批</p>
                              <div className="mt-2.5 flex flex-wrap gap-2">
                                {(q.type === 'tf'
                                  ? [
                                      { key: 'T', text: '正确' },
                                      { key: 'F', text: '错误' },
                                    ]
                                  : q.shown
                                ).map((opt) => {
                                  const active = (drill.fixPicks[q.id] ?? []).includes(opt.key);
                                  return (
                                    <button
                                      key={opt.key}
                                      type="button"
                                      onClick={() => drillFixPick(q, opt.key)}
                                      className={`pill px-3.5 py-1.5 text-[13px] ${active ? 'pill--solid' : ''}`}
                                    >
                                      {q.type === 'tf' ? opt.text : `${opt.key}. ${opt.text}`}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => drillFixSubmit(q)}
                                  className="pill pill--solid px-4 py-1.5 text-[12px] font-medium"
                                >
                                  提交订正
                                </button>
                                {fixBad[q.id] ? (
                                  <span className="text-danger-ink text-[12px]">答案仍不对，再核对一次。</span>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </section>
                </>
              ) : drillQ ? (
                <section className="glass p-5 sm:p-6">
                  {drill.patternTip ? (
                    <div className="bg-brand-soft/50 mb-5 flex flex-wrap items-start justify-between gap-2 rounded-[14px] px-4 py-3 text-[13px]">
                      {showPatternTip ? (
                        <p className="text-brand-ink min-w-0 flex-1 leading-relaxed">
                          <Lightbulb className="mr-1.5 inline size-4" />
                          {drill.patternTip}
                        </p>
                      ) : (
                        <span className="text-muted">已隐藏避坑口诀（盲测中）</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowPatternTip((v) => !v)}
                        className="text-secondary hover:text-ink shrink-0 text-[12px] transition-colors"
                      >
                        {showPatternTip ? '隐藏口诀' : '显示口诀'}
                      </button>
                    </div>
                  ) : null}

                  <QuestionCard
                    question={drillQ}
                    index={drill.cursor}
                    total={drill.questions.length}
                    picked={drillPicked}
                    revealed={false}
                    hints={drillHints}
                    hideMultiTip
                    onPick={(value) => drillPick(drillQ, value)}
                  />

                  <div className="hairline-t mt-6 flex flex-wrap items-center gap-2.5 pt-4">
                    <button
                      type="button"
                      onClick={() => drillGo(-1)}
                      disabled={drill.cursor === 0}
                      className="pill px-3.5 py-1.5 text-[13px] disabled:opacity-40"
                    >
                      <ChevronLeft size={15} />
                      上一题
                    </button>
                    <button
                      type="button"
                      onClick={() => drillGo(1)}
                      disabled={drill.cursor + 1 >= drill.questions.length}
                      className="pill px-3.5 py-1.5 text-[13px] disabled:opacity-40"
                    >
                      下一题
                      <ChevronRight size={15} />
                    </button>
                    {drill.cursor + 1 >= drill.questions.length ? (
                      <button
                        type="button"
                        onClick={askSubmitDrill}
                        className="pill pill--solid ml-auto px-4 py-1.5 text-[13px] font-medium"
                      >
                        交卷看总结
                      </button>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {/* 模拟考试进行中 */}
          {paper && !result ? (
            <>
              <section className="glass-panel flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5 lg:sticky lg:top-4 lg:z-20">
                <span
                  className={`flex items-center gap-1.5 text-[15px] font-semibold tabular-nums ${
                    left <= 5 * 60 ? 'text-danger-ink' : 'text-brand-ink'
                  }`}
                >
                  <Clock className="size-4" />
                  {splitTime(left)}
                </span>
                <span className="text-secondary text-[13px] tabular-nums">
                  已答 {answered} / {paper.questions.length}
                </span>
                <div className="bg-surface-2 hidden h-1.5 w-36 overflow-hidden rounded-full sm:block">
                  <span
                    className="bg-brand block h-full rounded-full transition-all duration-[var(--duration)] ease-[var(--ease-out)]"
                    style={{ width: `${(answered / paper.questions.length) * 100}%` }}
                  />
                </div>
                {markedCount ? (
                  <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums">
                    标记 {markedCount}
                  </span>
                ) : null}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSheetOpen((v) => !v)}
                    className={`pill px-3.5 py-1.5 text-[13px] ${sheetOpen ? 'pill--solid' : ''}`}
                  >
                    {sheetOpen ? '收起答题卡' : '答题卡'}
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    className="pill pill--solid px-4 py-1.5 text-[13px] font-medium"
                  >
                    交卷
                  </button>
                </div>
              </section>

              <div className={sheetOpen ? 'grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]' : ''}>
                <section id="ai-question-card" className="glass p-5 sm:p-6">
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

                  <div className="hairline-t mt-6 flex flex-wrap items-center gap-2.5 pt-4">
                    <button
                      type="button"
                      onClick={() => setCursor((c) => Math.max(0, c - 1))}
                      disabled={cursor === 0}
                      className="pill px-3.5 py-1.5 text-[13px] disabled:opacity-40"
                    >
                      <ChevronLeft size={15} /> 上一题
                    </button>
                    <button
                      type="button"
                      onClick={() => setCursor((c) => Math.min(paper.questions.length - 1, c + 1))}
                      disabled={cursor === paper.questions.length - 1}
                      className="pill px-3.5 py-1.5 text-[13px] disabled:opacity-40"
                    >
                      下一题 <ChevronRight size={15} />
                    </button>

                    <div className="text-muted hidden items-center gap-2 pl-2 text-[12px] xl:flex">
                      <span>
                        <kbd className="kbd">A–E</kbd> 选答
                      </span>
                      <span>
                        <kbd className="kbd">T</kbd>/<kbd className="kbd">F</kbd> 判断
                      </span>
                      <span>
                        <kbd className="kbd">←</kbd> <kbd className="kbd">→</kbd> 切题
                      </span>
                      <span>
                        <kbd className="kbd">M</kbd> 标记
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('放弃这次考试？已作答不会保存。')) {
                          dbDel(RESUME_KEY);
                          setPaper(null);
                        }
                      }}
                      className="text-muted hover:text-danger-ink ml-auto text-[12px] transition-colors"
                    >
                      放弃这次
                    </button>
                  </div>
                </section>

                {sheetOpen ? (
                  <section className="glass p-4 sm:p-5 lg:sticky lg:top-[76px]">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-ink text-[15px] font-semibold">答题卡</h2>
                      <form
                        className="flex items-center gap-1.5"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const n = Number(jump);
                          if (Number.isFinite(n) && n >= 1) goto(n - 1);
                          setJump('');
                        }}
                      >
                        <input
                          className="field w-16 px-2.5 py-1 text-[12px] tabular-nums"
                          inputMode="numeric"
                          placeholder="题号"
                          value={jump}
                          onChange={(e) => setJump(e.target.value.replace(/\D/g, ''))}
                        />
                        <button type="submit" className="pill px-2.5 py-1 text-[12px]">
                          跳转
                        </button>
                      </form>
                    </div>

                    <div className="text-muted mt-2.5 flex items-center gap-3 text-[12px] tabular-nums">
                      <span>
                        已答 {answered}/{paper.questions.length}
                      </span>
                      <span>标记 {markedCount}</span>
                    </div>

                    <div className="mt-3 grid max-h-[420px] grid-cols-7 gap-1.5 overflow-y-auto pr-0.5 sm:grid-cols-10 lg:grid-cols-6">
                      {paper.questions.map((q, index) => {
                        const done = (picked[q.id] ?? []).length > 0;
                        const isMarked = Boolean(marked[q.id]);
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => goto(index)}
                            className={`relative grid h-8 place-items-center rounded-[8px] text-[12px] tabular-nums transition-colors ${
                              index === cursor
                                ? 'bg-brand font-semibold text-white'
                                : done
                                  ? 'bg-brand-soft text-brand-ink font-medium'
                                  : 'bg-surface-2 text-muted hover:text-ink'
                            } ${isMarked ? 'ring-brand/70 ring-1' : ''}`}
                          >
                            {index + 1}
                            {isMarked ? (
                              <span
                                className={`absolute top-1 right-1 size-1 rounded-full ${
                                  index === cursor ? 'bg-white' : 'bg-brand'
                                }`}
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : null}
              </div>
            </>
          ) : null}

          {/* 模拟考试结果 */}
          {paper && result ? (
            <>
              <section className="glass glass--sheen flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-[36px] leading-none font-semibold tabular-nums ${
                        result.score >= 60 ? 'text-success-ink' : 'text-danger-ink'
                      }`}
                    >
                      {result.score}
                    </span>
                    <span className="text-secondary text-[13px]">分</span>
                    <span
                      className={`ml-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
                        result.score >= 60
                          ? 'bg-success-soft text-success-ink'
                          : 'bg-danger-soft text-danger-ink'
                      }`}
                    >
                      {result.score >= 60 ? '合格' : '不合格（60 分合格）'}
                    </span>
                  </div>
                  <div className="text-secondary mt-2.5 flex flex-wrap items-center gap-4 text-[13px] tabular-nums">
                    <span className="text-success-ink">答对 {result.correct}</span>
                    <span className="text-danger-ink">答错 {result.wrong}</span>
                    <span className="text-muted">未答 {result.blank}</span>
                    <span className="text-muted">用时 {splitTime(paper.seconds - left)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setReview((v) => !v)}
                    className="pill px-4 py-2 text-[13px]"
                  >
                    {review ? '收起回顾' : '逐题回顾'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      start();
                    }}
                    className="pill pill--solid px-4 py-2 text-[13px] font-medium"
                  >
                    <RotateCcw className="size-3.5" />
                    再考一次
                  </button>
                </div>
              </section>

              {review ? (
                <section className="flex flex-col gap-3">
                  {paper.questions.map((q, index) => {
                    const mine = picked[q.id] ?? [];
                    const ok =
                      mine.length === q.key.length && [...mine].sort().join('') === [...q.key].sort().join('');
                    if (ok) return null;
                    return (
                      <div key={q.id} className="glass p-5">
                        <div className="flex flex-wrap items-center gap-2 text-[12px]">
                          <span className="text-muted font-medium tabular-nums">第 {index + 1} 题</span>
                          <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 font-medium">
                            {TYPE_LABEL[q.type]}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 font-medium ${
                              mine.length ? 'bg-danger-soft text-danger-ink' : 'bg-surface-2 text-muted'
                            }`}
                          >
                            {mine.length ? '答错' : '未作答'}
                          </span>
                          {q.verified === false ? (
                            <span className="bg-warn-soft text-warn rounded-full px-2.5 py-0.5 font-medium">
                              AI 解析
                            </span>
                          ) : null}
                        </div>
                        <p className="text-ink mt-3 text-[15px] leading-relaxed font-medium">{q.stem}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px]">
                          <span className="text-secondary">
                            我的答案{' '}
                            <strong className={mine.length ? 'text-danger-ink' : 'text-muted'}>
                              {mine.length ? lettersOf(mine) : '未作答'}
                            </strong>
                          </span>
                          <span className="text-secondary">
                            正确答案 <strong className="text-success-ink">{lettersOf(q.key)}</strong>
                          </span>
                        </div>
                        {q.type !== 'tf' ? (
                          <div className="mt-2 flex flex-col gap-1 text-[13px]">
                            {q.shown
                              .filter((opt) => q.key.includes(opt.key) || mine.includes(opt.key))
                              .map((opt) => (
                                <span
                                  key={opt.key}
                                  className={q.key.includes(opt.key) ? 'text-ink' : 'text-muted'}
                                >
                                  {opt.key}. {opt.text}
                                </span>
                              ))}
                          </div>
                        ) : null}
                        <ExplainBlock id={q.id} />
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
