import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Clock, Lightbulb, RotateCcw, X } from 'lucide-react';
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
      // 1. 先按比例补错题：错得越多越先上榜
      const wrongCandidates = pool
        .filter((q) => seed.wrongs.has(q.id))
        .sort((a, b) => (seed.wrongs.get(b.id) ?? 0) - (seed.wrongs.get(a.id) ?? 0));
      const wrongQuota = Math.min(Math.floor(target * EXAM_WRONG_RATIO), wrongCandidates.length);
      for (const q of wrongCandidates.slice(0, wrongQuota)) chosen.push(q);
    }
    // 2. 剩下席位优先出没做过的新题，新题不够才用做过的题补
    const restPool = pool.filter((q) => !chosen.some((c) => c.id === q.id));
    const need = target - chosen.length;
    if (need > 0) {
      const freshPool = seed ? restPool.filter((q) => !seed.seen.has(q.id)) : restPool;
      const seenPool = seed ? restPool.filter((q) => seed.seen.has(q.id)) : [];
      chosen.push(...shuffle(freshPool).slice(0, need));
      const left = target - chosen.length;
      if (left > 0) chosen.push(...shuffle(seenPool).slice(0, left));
    }
    // 3. 还不够（比如题池本来就小）就随便补满
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

/** 一批 10 题，不计时；做完统一交一次卷。 */
const DRILL_COUNT = 10;
/** 错题模式：一局 10 题，题源只有错题集。 */
const WRONG_COUNT = 10;

type DrillKind = 'today' | 'free' | 'wrongs';

/** 一局几题：错题模式与其余模式都是 10 题。 */
function sizeOf(kind: DrillKind): number {
  return kind === 'wrongs' ? WRONG_COUNT : DRILL_COUNT;
}
/** 每天新题量的可选档位。 */


interface DrillRun {
  /** today = 按今日任务队列出题；free = 自由练，全库随机；wrongs = 错题模式，只出错题集里的题 */
  kind: DrillKind;
  questions: ExamQuestion[];
  cursor: number;
  picks: Record<string, string[]>;
  /** 一批 10 题统一交一次卷，交卷后才揭晓对错并出本批总结。 */
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
  return {
      kind: data.kind === 'free' ? 'free' : data.kind === 'wrongs' ? 'wrongs' : 'today',
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
/** 云端整份文档（考试记录 + 错题本），换设备也能接上。 */
/** 刷题进度（卡片 / 每日账 / 错题集 / 每天新题量）的云同步槽位。 */
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
  hint,
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
  /** 题号旁的角标，例如「错题 ×3」。 */
  hint?: string;
  /** 刷题模式下不显示「多选要选全」这类提示。 */
  hideMultiTip?: boolean;
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
        {hint ? (
          <span className="bg-danger-soft text-danger rounded-full px-2 py-0.5 text-[12px]">{hint}</span>
        ) : null}
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
          {isMulti && !hideMultiTip ? (
            <p className="text-muted text-[12px]">多选题：选全才得分，多选少选都不得分。</p>
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
    <div className="border-line mt-4 rounded-[14px] border px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
        <Lightbulb className="text-brand-ink size-3.5" />
        <span className="text-brand-ink font-medium">解析</span>
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
  const [result, setResult] = useState<{ score: number; correct: number; wrong: number; blank: number } | null>(
    null,
  );
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
  const [drillHome, setDrillHome] = useState(false);
  const [wrongOpen, setWrongOpen] = useState(false);

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

  // 刷题会话也存云端：换设备/换浏览器打开，直接接着上次那一页
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
      AI_THEORY_QUESTIONS.map((q) => q.id),
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
  }, [queue, conf, srs]);
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
    const examWrongIds: string[] = [];
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
        examWrongIds.push(q.id);
      }
      nextWrongs = [...map.values()];
    }
    saveWrongs(nextWrongs);
    setWrongs(nextWrongs);
    /* 这张卷考过的题都算「做过」，写进服务器 MySQL */
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

  // 作答过程随时落盘，刷新/关页可续做
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


  /** 刷题不改选项：选了就存着，交卷时才判断对错。 */
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
    // 判断/单选：选完稍等一下自动翻到下一题；多选要自己点「下一题」。
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

  /** 交卷：整批一次结算，按对错推进卡片，并记当天账。 */
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
    /* 考卷错题只能在错题模式里做对一遍才摘掉，摘完才解锁下一次理论考试 */
    if (cur.kind === 'wrongs') clearExamWrong(results.filter((r) => r.ok).map((r) => r.q.id));
    /* 这一批刷过的题也算「做过」，写进服务器 MySQL */
    const batchIds = results.map((r) => r.q.id);
    setSeenIds((prev) => new Set([...prev, ...batchIds]));
    void fetch(BANK_API + '/bank/mark', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: batchIds, source: 'drill' }),
    }).catch(() => undefined);
    setDrill({ ...cur, submitted: true });
  };

  /** 交卷按钮：还有未作答的题时先确认一次。 */
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

  /** 考卷错题还没在错题模式里做对过的数量：没清完不让开新卷。题库里已经不存在的题不算，免得永远解锁不了。 */
  const pendingExamWrongs = useMemo(() => {
    const known = new Set(AI_THEORY_QUESTIONS.map((q) => q.id));
    return wrongs.filter((e) => known.has(e.qid)).length;
  }, [wrongs]);

  /** 复盘里还没订正的错题数：订正完才允许开下一批。 */
  const unfixedCount = useMemo(() => {
    if (!drill || !drill.submitted) return 0;
    return drill.questions.filter((q) => !isRight(q, drill.picks[q.id] ?? []) && !drill.fixed[q.id]).length;
  }, [drill]);

  const drillFixPick = (q: ExamQuestion, key: string) => {
    setDrill((prev) => {
      if (!prev) return prev;
      const mine = prev.fixPicks[q.id] ?? [];
      const nextMine = q.type === 'multi' ? (mine.includes(key) ? mine.filter((v) => v !== key) : [...mine, key]) : [key];
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
    setDrillHome(false);
    setWrongOpen(false);
  };

  /**
   * 每批 10 题的席位分配：错题集按权重占位，其余是新题。
   * 起始 3:7（3 席错题），错题相对越多越往 5:5 靠（最多 5 席）；新题刷光了就整批全出错题，
   * 错题也没有就到期复习 → 学过的随便补，保证任何阶段都刷得下去。
   */
  const startDrill = (kind: DrillKind = 'today') => {
    const byId = qById;
    const size = sizeOf(kind);
    const ids: string[] = [];
    const labels: Record<string, 'new' | 'review' | 'wrong'> = {};
    const push = (qid: string, label: 'new' | 'review' | 'wrong') => {
      if (ids.length >= size || labels[qid] || !byId.has(qid)) return;
      ids.push(qid);
      labels[qid] = label;
    };
    if (kind === 'today') {
      const freshIds = shuffle(AI_THEORY_QUESTIONS)
        .filter((q) => !srs[q.id] && !wrongBook[q.id] && !seenIds.has(q.id))
        .map((q) => q.id);
      // 错题集分成两堆：还在错的（积分 < 0）和已回的（积分回到 0，标「复习」）。
      const activeWrongs = wrongList.filter((w) => !isReviewing(w));
      const reviewIds = wrongList.filter((w) => isReviewing(w)).map((w) => w.qid);
      const wrongCount = activeWrongs.length;
      // 错题席位：错题在「没掌握的题」里占比越高越往 5 席靠；复习题和新题都没有了才整批错题。
      let wrongSlots = 0;
      if (wrongCount > 0) {
        if (freshIds.length + reviewIds.length === 0) wrongSlots = size;
        else {
          const share = wrongCount / (wrongCount + freshIds.length + reviewIds.length);
          wrongSlots = Math.round(size * (0.3 + 0.2 * share));
          wrongSlots = Math.min(Math.max(wrongSlots, 3), 5, wrongCount);
        }
      }
      const mainSlots = size - wrongSlots;
      // 复习题排在前面：还有没刷过的复习题就先出复习题，复习题出完出新题。
      const reviewPool = [...reviewIds];
      const freshPool = [...freshIds];
      while (ids.length < mainSlots && (reviewPool.length || freshPool.length)) {
        if (reviewPool.length && (!freshPool.length || Math.random() < 0.75)) {
          push(reviewPool.shift() as string, 'review');
        } else if (freshPool.length) {
          push(freshPool.shift() as string, 'new');
        } else if (reviewPool.length) {
          push(reviewPool.shift() as string, 'review');
        }
      }
      // 错题席位按权重抽：考试错题权重 3 倍起，错得越多越容易抽到。
      const rest = [...activeWrongs];
      while (ids.length < size && rest.length) {
        const weights = rest.map((w) => wrongWeight(w));
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let point = Math.random() * totalWeight;
        let pickIndex = 0;
        while (pickIndex < weights.length - 1 && point > weights[pickIndex]) {
          point -= weights[pickIndex];
          pickIndex += 1;
        }
        const picked = rest.splice(pickIndex, 1)[0];
        push(picked.qid, 'wrong');
      }
      // 兜底：以前答对过、也不在错题集里的题
      for (const q of shuffle(AI_THEORY_QUESTIONS)) push(q.id, 'review');
    } else if (kind === 'wrongs') {
      // 错题模式：题源只有错题集。考卷错题排最前（它们还卡着下一次考试，可能不在错题集或已标回），
      // 其余还在错的按权重抽（错得越多越靠前），最后补已回的复习题。
      const examIds = new Set(wrongs.map((e) => e.qid));
      for (const e of shuffle(wrongs)) push(e.qid, 'wrong');
      const activePool = [...wrongList.filter((w) => !isReviewing(w) && !examIds.has(w.qid)).map((w) => ({ qid: w.qid, weight: wrongWeight(w) }))];
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
    } else {
      for (const q of shuffle(AI_THEORY_QUESTIONS).slice(0, size)) {
        push(q.id, srs[q.id] ? 'review' : 'new');
      }
    }

    const questions = ids
      .map((id) => byId.get(id))
      .filter((q): q is AiQuestion => !!q)
      .map(mixQuestion);
    if (!questions.length) return;
    setDrillHome(true);
    setDrill({ kind, questions, cursor: 0, picks: {}, submitted: false, labels, fixPicks: {}, fixed: {} });
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
  const drillDoneCount = seenIds.size;
  const drillPct = Math.min(100, Math.round((drillDoneCount / AI_THEORY_QUESTIONS.length) * 100));
  /** 错题集，错得多的排前面。 */
  const wrongList = useMemo(() => sortWrongs(wrongBook), [wrongBook]);
  const qById = useMemo(() => new Map(AI_THEORY_QUESTIONS.map((q) => [q.id, q])), []);
  const drillHint = (() => {
    if (!drillQ) return '';
    const parts: string[] = [];
    if (drill?.labels[drillQ.id] === 'new') parts.push('新题');
    else if (drill?.labels[drillQ.id] === 'review') parts.push('复习');
    const miss = wrongs.find((e) => e.qid === drillQ.id)?.misses ?? 0;
    if (miss > 0) parts.push('考卷错过 ' + miss + ' 次');
    return parts.join('，');
  })();
  const answerText = (q: ExamQuestion) => lettersOf(q.key);

  /** 错题集列表：刷题入口页和刷题面板共用。 */
  const wrongBookSection = wrongList.length ? (
    <section className="glass flex flex-col gap-2 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-ink text-[14px] font-semibold">错题集 · {wrongList.length} 题</h3>
        <p className="text-muted text-[12px]">
          进了就不出来：做对也不会消失，只多记一次「已对」；这里没有移出，题只会越攒越多。
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        {wrongList.map((w, i) => {
          const q = qById.get(w.qid);
          return (
            <div
              key={w.qid}
              className="border-danger flex flex-wrap items-center gap-2 rounded-[10px] border px-3 py-2 text-[12px]"
            >
              <span className="text-muted tabular-nums">{i + 1}</span>
              <span className="bg-brand-soft text-brand-ink rounded-full px-2 py-0.5">
                {q ? TYPE_LABEL[q.type] : '题目'}
              </span>
              <span className="text-ink min-w-0 flex-1 truncate">{q ? q.stem : w.qid}</span>
              {isReviewing(w) ? (
                <span className="bg-accent-green/15 text-accent-green rounded-full px-2 py-0.5">复习</span>
              ) : (
                <span className="bg-danger-soft text-danger rounded-full px-2 py-0.5">错题</span>
              )}
              {w.exam > 0 ? (
                <span className="bg-danger-soft text-danger rounded-full px-2 py-0.5">考试错题</span>
              ) : null}
              <span className="text-danger font-semibold tabular-nums">积分 {w.score.toFixed(1)}</span>
              <span className="text-muted tabular-nums">错 {w.misses} 次 · 已对 {w.right} 次</span>
              <span className="text-muted text-[11px]">留在错题集</span>
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
    return <div className="text-secondary p-8 text-[13px]">正在读取云端记录…</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink text-[22px] font-semibold">人工智能训练师（三级）</h1>
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
          {!paper && !result && !drill ? (
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
                  <button
                    type="button"
                    onClick={start}
                    disabled={pendingExamWrongs > 0}
                    className="pill pill--solid px-5 py-2.5 text-[14px] disabled:opacity-40"
                  >
                    {pendingExamWrongs > 0
                      ? '先去错题模式做对 ' + pendingExamWrongs + ' 道考卷错题'
                      : '开始一次模拟考试'}
                  </button>
                  <button
                    type="button"
                    onClick={() => startDrill('today')}
                    className="pill px-4 py-2.5 text-[14px]"
                  >
                    刷题模式（{DRILL_COUNT} 题一局）
                  </button>
                  <button
                    type="button"
                    onClick={() => startDrill('wrongs')}
                    disabled={!wrongList.length && !wrongs.length}
                    className="pill px-4 py-2.5 text-[14px] disabled:opacity-40"
                  >
                    {wrongList.length || wrongs.length ? '错题模式（' + WRONG_COUNT + ' 题一局）' : '错题模式（错题集是空的）'}
                  </button>
                  {records.length || wrongs.length ? (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-muted hover:text-danger-ink px-1 text-[12px] transition"
                    >
                      清空记录
                    </button>
                  ) : null}
                </div>
              </section>

              {records.length ? (
                <section className="glass px-4 py-4 sm:px-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-ink text-[14px] font-semibold">历史成绩</h2>
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-muted hover:text-danger-ink text-[12px] transition"
                    >
                      清空记录
                    </button>
                  </div>
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

          {!paper && !result && !drill && drillHome ? (
            <>
              <section className="glass flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                <div className="min-w-0">
                  <h2 className="text-ink text-[14px] font-semibold">刷题模式</h2>
                  <p className="text-secondary mt-1 text-[12px] leading-relaxed">
                    每批 {DRILL_COUNT} 题：先出复习题（错题集里已经回到 0 分的），复习题出完出新题，新题也刷完了出错题；交卷后才看答案。
                    错题模式只出错题集里的题，一局 {WRONG_COUNT} 题。
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-[13px]">
                  <button
                    type="button"
                    onClick={closeDrill}
                    className="text-muted hover:text-danger text-[12px] transition"
                  >
                    退出
                  </button>
                </div>
              </section>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startDrill('today')}
                  className="pill pill--solid px-5 py-2.5 text-[14px]"
                >
                  {wrongList.length ? '先做错题（' + wrongList.length + ' 题）' : '开始今日任务'}
                </button>
                <button type="button" onClick={() => startDrill('free')} className="pill px-4 py-2.5 text-[14px]">
                  自由练 {DRILL_COUNT} 题
                </button>
                <button
                  type="button"
                  onClick={() => startDrill('wrongs')}
                  disabled={!wrongList.length}
                  className="pill px-4 py-2.5 text-[14px] disabled:opacity-40"
                >
                  错题模式 {WRONG_COUNT} 题
                </button>
              </div>

              {wrongBookSection}
            </>
          ) : null}

          {!paper && !result && drill ? (
            <>
              <section className="glass flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-ink text-[14px] font-semibold">
                      {drill.kind === 'today' ? '今日任务' : drill.kind === 'wrongs' ? '错题模式' : '自由练习'}
                    </h2>
                    <span className="text-ink text-[13px] font-semibold tabular-nums">
                      已刷 {drillDoneCount} / {AI_THEORY_QUESTIONS.length} 题
                    </span>
                    <span className="text-muted text-[12px] tabular-nums">{drillPct}%</span>
                  </div>
                  <div className="bg-surface-2 mt-2 h-1.5 w-full max-w-[280px] overflow-hidden rounded-full">
                    <div className="bg-brand h-full rounded-full" style={{ width: drillPct + '%' }} />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-[13px]">
                  {drill.submitted ? null : (
                    <button
                      type="button"
                      onClick={askSubmitDrill}
                      className="pill pill--solid px-4 py-1.5 text-[13px]"
                    >
                      交卷看本批总结
                    </button>
                  )}
                  {drill.submitted ? (
                    <>
                      <span className="text-accent-green tabular-nums">对 {drillStats.right}</span>
                      <span className="text-danger tabular-nums">错 {drillStats.wrong}</span>
                    </>
                  ) : (
                    <span className="text-muted tabular-nums">
                      已答 {drillStats.answered} / {drill.questions.length}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setWrongOpen((v) => !v)}
                    className={'pill px-2.5 py-1 text-[12px]' + (wrongOpen ? ' pill--solid' : '')}
                  >
                    错题集 {wrongList.length}
                  </button>
                  <button
                    type="button"
                    onClick={closeDrill}
                    className="text-muted hover:text-danger text-[12px] transition"
                  >
                    退出
                  </button>
                </div>
              </section>

              {wrongOpen ? wrongBookSection : null}

              {drill.submitted ? (
                <>
                  <section className="glass flex flex-wrap items-end justify-between gap-4 px-4 py-5 sm:px-5">
                    <div>
                      <p className="text-brand-ink text-[34px] leading-none font-semibold tabular-nums">
                        {drillStats.right}
                        <span className="text-muted ml-1 text-[14px] font-normal">
                          / {drill.questions.length} 题答对
                        </span>
                      </p>
                      <p className="text-secondary mt-2 text-[13px]">
                        正确率 {Math.round((drillStats.right / drill.questions.length) * 100)}%，答错{' '}
                        {drillStats.wrong} 题，未作答 {drill.questions.length - drillStats.answered} 题
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startDrill(drill.kind)}
                        disabled={unfixedCount > 0}
                        className="pill pill--solid px-4 py-2 text-[13px] disabled:opacity-40"
                      >
                        <RotateCcw className="mr-1 inline size-3.5" />
                        {unfixedCount > 0 ? '还剩 ' + unfixedCount + ' 题待订正' : '再来 ' + sizeOf(drill.kind) + ' 题'}
                      </button>
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
                          className={
                            ok
                              ? 'glass border-l-accent-green rounded-[14px] border-l-4 px-4 py-4 sm:px-5'
                              : 'glass bg-danger-soft border-l-danger border-danger/40 rounded-[14px] border border-l-4 px-4 py-4 sm:px-5'
                          }
                        >
                          <div className="flex flex-wrap items-center gap-2 text-[12px]">
                            <span className="text-muted tabular-nums">第 {index + 1} 题</span>
                            <span className="bg-brand-soft text-brand-ink rounded-full px-2 py-0.5">
                              {TYPE_LABEL[q.type]}
                            </span>
                            <span
                              className={
                                tag === 'wrong'
                                  ? 'bg-danger rounded-full px-2 py-0.5 font-semibold text-white'
                                  : 'border-line text-muted rounded-full border px-2 py-0.5'
                              }
                            >
                              {tag === 'wrong' ? '错题集' : tag === 'new' ? '新题' : '复习'}
                            </span>
                            <span
                              className={
                                ok
                                  ? 'bg-accent-green rounded-full px-2 py-0.5 font-semibold text-white'
                                  : 'bg-danger rounded-full px-2 py-0.5 font-semibold text-white'
                              }
                            >
                              {ok ? '答对' : mine.length ? '答错' : '未作答'}
                            </span>
                          </div>
                          <p className="text-ink mt-2 text-[14px] leading-relaxed">{q.stem}</p>
                          <div className="text-secondary mt-2 flex flex-col gap-1 text-[13px]">
                            <span>
                              我的答案：
                              <b className={ok ? 'text-accent-green' : mine.length ? 'text-danger' : 'text-muted'}>
                                {mine.length
                                  ? lettersOf(mine)
                                  : '未作答'}
                              </b>
                            </span>
                            <span>
                              正确答案：
                              <b className="text-accent-green">{answerText(q)}</b>
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
                          <ExplainBlock id={q.id} />
                          {ok ? null : drill.fixed[q.id] ? (
                            <p className="text-accent-green mt-3 text-[13px] font-medium">已订正</p>
                          ) : (
                            <div className="border-line mt-3 rounded-[12px] border px-3.5 py-3">
                              <p className="text-ink text-[13px] font-medium">重新选一遍，选对并提交才能做下一批</p>
                              <div className="mt-2 flex flex-wrap gap-2">
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
                                      className={'pill px-3 py-1.5 text-[13px]' + (active ? ' pill--solid' : '')}
                                    >
                                      {q.type === 'tf' ? opt.text : opt.key + '. ' + opt.text}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => drillFixSubmit(q)}
                                  className="pill pill--solid px-3 py-1 text-[12px]"
                                >
                                  提交
                                </button>
                                {fixBad[q.id] ? (
                                  <span className="text-danger text-[12px]">还不对，再选一次。</span>
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
                <section className="glass px-4 py-5 sm:px-5">
                  <QuestionCard
                    question={drillQ}
                    index={drill.cursor}
                    total={drill.questions.length}
                    picked={drillPicked}
                    revealed={false}
                    hint={drillHint}
                    hideMultiTip
                    onPick={(value) => drillPick(drillQ, value)}
                  />
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => drillGo(-1)}
                      disabled={drill.cursor === 0}
                      className="pill px-3 py-1.5 text-[13px] disabled:opacity-40"
                    >
                      上一题
                    </button>
                    <button
                      type="button"
                      onClick={() => drillGo(1)}
                      disabled={drill.cursor + 1 >= drill.questions.length}
                      className="pill px-3 py-1.5 text-[13px] disabled:opacity-40"
                    >
                      下一题
                      <ChevronRight className="ml-1 inline size-4" />
                    </button>
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {paper && !result ? (
            <>
              <section className="glass flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
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
                        dbDel(RESUME_KEY);
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
                  </div>
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
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      start();
                    }}
                    className="pill pill--solid px-4 py-2 text-[13px]"
                  >
                    <RotateCcw className="mr-1 inline size-3.5" />
                    再考一次
                  </button>
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
                                ? lettersOf(mine)
                                : '未作答'}
                            </b>
                          </span>
                          <span>
                            正确答案：
                            <b className="text-success-ink">
                              {lettersOf(q.key)}
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
