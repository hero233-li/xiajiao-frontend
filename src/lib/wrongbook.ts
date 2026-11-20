import { dbGet, dbSet } from './aiDb';

/** 刷题模式自己的错题集：刷题判错的题进这里，不写进考试模式的错题本。 */
export interface WrongItem {
  qid: string;
  /** 累计做错次数 */
  misses: number;
  /** 进错题集之后做对的次数 */
  right: number;
  firstAt: number;
  lastAt: number;
  /** 最近一次做对是哪一天（YYYY-MM-DD）。 */
  rightDay?: string;
  /** 在理论模拟考试里做错的次数：考试的错题权重更高，刷题时更常出现。 */
  exam: number;
  /** 错题积分：错一次 -1，对一次 +0.2，回到 0 就算「回了」，标成复习题（仍留在错题集里）。 */
  score: number;
}

export type WrongBook = Record<string, WrongItem>;

const KEY = 'xj.ai.drill.wrongs.v1';

export function loadWrongBook(): WrongBook {
  try {
    const raw = dbGet(KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as WrongBook;
    if (!data || typeof data !== 'object') return {};
    const out: WrongBook = {};
    for (const [qid, v] of Object.entries(data)) {
      if (!v || typeof v.misses !== 'number') continue;
      out[qid] = {
        qid,
        misses: Math.max(1, v.misses),
        right: Math.max(0, Number(v.right) || 0),
        firstAt: Number(v.firstAt) || Date.now(),
        lastAt: Number(v.lastAt) || Date.now(),
        rightDay: typeof v.rightDay === 'string' ? v.rightDay : undefined,
        exam: Math.max(0, Number(v.exam) || 0),
        score: Number.isFinite(v.score)
          ? Math.min(0, Number(v.score))
          : Math.min(0, -Math.max(1, v.misses) + 0.2 * (Math.max(0, Number(v.right) || 0))),
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function saveWrongBook(book: WrongBook) {
  dbSet(KEY, book);
}

/** 答错：进错题集或累加次数。已经在里面的不重置首次时间；考试错题额外记一次 exam。 */
export function addWrong(book: WrongBook, qid: string, now: number, origin: 'drill' | 'exam' = 'drill'): WrongBook {
  const old = book[qid];
  return {
    ...book,
    [qid]: {
      qid,
      misses: (old?.misses ?? 0) + 1,
      right: old?.right ?? 0,
      firstAt: old?.firstAt ?? now,
      lastAt: now,
      rightDay: old?.rightDay,
      exam: (old?.exam ?? 0) + (origin === 'exam' ? 1 : 0),
      score: Math.min(0, (old?.score ?? 0) - 1),
    },
  };
}

/** 出题权重：考试里错的题 3 倍起，错得越多越重。 */
export function wrongWeight(item: WrongItem): number {
  return (item.exam > 0 ? 3 : 1) * (1 + Math.min(item.misses, 6) * 0.5);
}

/** 积分回到 0 就算「回了」：此时是复习题，不再是错题（但仍在错题集里）。 */
export function isReviewing(item: WrongItem): boolean {
  return item.score >= 0;
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

/** 错题集里的题做对了：只累加「已对」次数，不会自动移出；记下做对的日子，当天剩下的批次不再重复出。 */
export function noteRight(book: WrongBook, qid: string, now: number): WrongBook {
  const old = book[qid];
  if (!old) return book;
  const score = Math.min(0, (old.score ?? 0) + 0.2);
  return { ...book, [qid]: { ...old, right: old.right + 1, lastAt: now, rightDay: dayKey(now), score } };
}


/** 还在错的排前面（复习题垫后），同样状态先考试错题、再错得多的。 */
export function sortWrongs(book: WrongBook): WrongItem[] {
  return Object.values(book).sort(
    (a, b) =>
      (isReviewing(a) ? 1 : 0) - (isReviewing(b) ? 1 : 0) ||
      (b.exam > 0 ? 1 : 0) - (a.exam > 0 ? 1 : 0) ||
      b.misses - a.misses ||
      b.lastAt - a.lastAt,
  );
}


/** 云端合并：错次与对次取大值，进集时间取早，最后一次取晚。 */
export function mergeWrongBook(local: WrongBook, remote: WrongBook): WrongBook {
  const out: WrongBook = { ...local };
  for (const [qid, item] of Object.entries(remote ?? {})) {
    if (!item || typeof item.misses !== 'number') continue;
    const mine = out[qid];
    if (!mine) {
      out[qid] = {
        ...item,
        qid,
        rightDay: item.rightDay || undefined,
        exam: Math.max(0, Number(item.exam) || 0),
        score: Math.min(0, Number(item.score) || 0),
      };
      continue;
    }
    out[qid] = {
      qid,
      misses: Math.max(mine.misses, item.misses),
      right: Math.max(mine.right ?? 0, Number(item.right) || 0),
      firstAt: Math.min(mine.firstAt || item.firstAt, item.firstAt || mine.firstAt),
      lastAt: Math.max(mine.lastAt ?? 0, item.lastAt ?? 0),
      rightDay: [mine.rightDay, item.rightDay].filter(Boolean).sort().pop(),
      exam: Math.max(mine.exam ?? 0, Number(item.exam) || 0),
      score: Math.min(mine.score ?? 0, Number(item.score) || 0),
    };
  }
  return out;
}
