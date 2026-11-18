/** 刷题模式自己的错题集：刷题判错的题进这里，不写进考试模式的错题本。 */
export interface WrongItem {
  qid: string;
  /** 累计做错次数 */
  misses: number;
  /** 进错题集之后做对的次数 */
  right: number;
  firstAt: number;
  lastAt: number;
}

export type WrongBook = Record<string, WrongItem>;

const KEY = 'xj.ai.drill.wrongs.v1';

export function loadWrongBook(): WrongBook {
  try {
    const raw = localStorage.getItem(KEY);
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
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function saveWrongBook(book: WrongBook) {
  try {
    localStorage.setItem(KEY, JSON.stringify(book));
  } catch {
    /* 配额满就算了 */
  }
}

/** 答错：进错题集或累加次数。已经在里面的不重置首次时间。 */
export function addWrong(book: WrongBook, qid: string, now: number): WrongBook {
  const old = book[qid];
  return {
    ...book,
    [qid]: {
      qid,
      misses: (old?.misses ?? 0) + 1,
      right: old?.right ?? 0,
      firstAt: old?.firstAt ?? now,
      lastAt: now,
    },
  };
}

/** 错题集里的题做对了：只累加「已对」次数，不会自动移出。 */
export function noteRight(book: WrongBook, qid: string, now: number): WrongBook {
  const old = book[qid];
  if (!old) return book;
  return { ...book, [qid]: { ...old, right: old.right + 1, lastAt: now } };
}


/** 错得多的排前面，同样次数按最近错的排前面。 */
export function sortWrongs(book: WrongBook): WrongItem[] {
  return Object.values(book).sort((a, b) => b.misses - a.misses || b.lastAt - a.lastAt);
}


/** 云端合并：错次与对次取大值，进集时间取早，最后一次取晚。 */
export function mergeWrongBook(local: WrongBook, remote: WrongBook): WrongBook {
  const out: WrongBook = { ...local };
  for (const [qid, item] of Object.entries(remote ?? {})) {
    if (!item || typeof item.misses !== 'number') continue;
    const mine = out[qid];
    if (!mine) {
      out[qid] = { ...item, qid };
      continue;
    }
    out[qid] = {
      qid,
      misses: Math.max(mine.misses, item.misses),
      right: Math.max(mine.right ?? 0, Number(item.right) || 0),
      firstAt: Math.min(mine.firstAt || item.firstAt, item.firstAt || mine.firstAt),
      lastAt: Math.max(mine.lastAt ?? 0, item.lastAt ?? 0),
    };
  }
  return out;
}
