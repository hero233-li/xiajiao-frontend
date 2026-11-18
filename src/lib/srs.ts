/**
 * 背题模式（间隔重复）：卡片的调度与本地存储。
 * 只做纯计算与 localStorage 读写，不依赖 React，方便脱离界面验证。
 * 盒子间隔参考常见背单词软件：答对升一盒、答错回到 1 盒，15 题以后算掌握。
 */

export interface SrsCard {
  /** 0 = 还没起步；1..7 = 盒子层级 */
  box: number;
  /** 下次该复习的时间戳（毫秒） */
  due: number;
  /** 累计答对次数 */
  reps: number;
  /** 累计答错次数 */
  lapses: number;
  /** 最后一次作答时间，0 表示从没做过 */
  lastAt: number;
}

export type SrsMap = Record<string, SrsCard>;

/** 交卷后自评：很熟 / 一般 / 不熟。 */
export type SrsGrade = 'easy' | 'hard' | 'unfamiliar';

export interface DayLog {
  new: number;
  review: number;
  right: number;
  wrong: number;
}

export interface SrsConf {
  /** 每天最多给多少道新题 */
  newPerDay: number;
  /** 每天最多安排多少道复习 */
  reviewCap: number;
}

export interface DayQueue {
  date: string;
  due: string[];
  fresh: string[];
}

export const SRS_KEY = 'xj.ai.srs.v1';
export const SRS_DAILY_KEY = 'xj.ai.srs.daily.v1';
export const SRS_CONF_KEY = 'xj.ai.srs.conf.v1';
export const SRS_QUEUE_KEY = 'xj.ai.srs.queue.v1';
/** 老版本刷题模式的错题账本，首次加载时迁移成卡片。 */
export const SRS_LEGACY_KEY = 'xj.ai.drill.misses.v1';

export const DAY_MS = 24 * 3600 * 1000;
/** 盒子 0..7 对应的间隔天数 */
export const BOX_DAYS = [0, 1, 2, 4, 7, 15, 30, 60];
/** 到这一盒算「已掌握」 */
export const MASTER_BOX = 5;
export const DEFAULT_CONF: SrsConf = { newPerDay: 20, reviewCap: 60 };

export function dayOf(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function newCard(now: number): SrsCard {
  return { box: 0, due: now, reps: 0, lapses: 0, lastAt: 0 };
}

/** 本局作答后的调度：答对升一盒，答错回 1 盒明天再来。 */
export function answerCard(card: SrsCard | undefined, ok: boolean, now: number): SrsCard {
  const base = card ?? newCard(now);
  if (ok) {
    const box = Math.min(base.box + 1, BOX_DAYS.length - 1);
    return { box, due: now + BOX_DAYS[box] * DAY_MS, reps: base.reps + 1, lapses: base.lapses, lastAt: now };
  }
  return { box: 1, due: now + DAY_MS, reps: base.reps, lapses: base.lapses + 1, lastAt: now };
}

/** 交卷后的自评微调：很熟再升一盒，一般不动，不熟回 1 盒明天再来。 */
export function gradeCard(card: SrsCard, grade: SrsGrade, now: number): SrsCard {
  if (grade === 'hard') return card;
  if (grade === 'unfamiliar') return { ...card, box: 1, due: now + DAY_MS };
  const box = Math.min(card.box + 1, BOX_DAYS.length - 1);
  return { ...card, box, due: now + BOX_DAYS[box] * DAY_MS };
}

export function isDue(card: SrsCard | undefined, now: number): boolean {
  return !!card && card.box > 0 && card.due <= now;
}

/** 下次复习的说明文案。 */
export function dueText(card: SrsCard | undefined, now: number): string {
  if (!card || card.box <= 0) return '还没学过';
  const days = Math.round((startOfDay(card.due) - startOfDay(now)) / DAY_MS);
  if (days <= 0) return '今天';
  if (days === 1) return '明天';
  return days + ' 天后';
}

export function studiedCount(srs: SrsMap): number {
  let n = 0;
  for (const card of Object.values(srs)) if (card.box > 0) n += 1;
  return n;
}

export function masteryOf(srs: SrsMap): { learning: number; mastered: number } {
  let learning = 0;
  let mastered = 0;
  for (const card of Object.values(srs)) {
    if (card.box <= 0) continue;
    if (card.box >= MASTER_BOX) mastered += 1;
    else learning += 1;
  }
  return { learning, mastered };
}

/** 按今天的配置生成今日队列：先排到期复习（按到期时间），再按每天上限给新题。 */
export function buildQueue(srs: SrsMap, ids: string[], now: number, conf: SrsConf): DayQueue {
  const dueAll = ids.filter((id) => isDue(srs[id], now)).sort((a, b) => srs[a].due - srs[b].due || a.localeCompare(b));
  const freshAll = ids.filter((id) => !srs[id] || srs[id].box <= 0);
  return {
    date: dayOf(now),
    due: dueAll.slice(0, Math.max(0, conf.reviewCap)),
    fresh: freshAll.slice(0, Math.max(0, conf.newPerDay)),
  };
}

export interface QueueProgress {
  dueTotal: number;
  dueDone: number;
  newTotal: number;
  newDone: number;
  /** 今天还剩多少道没做 */
  left: number;
}

export function queueProgress(queue: DayQueue, srs: SrsMap, now: number): QueueProgress {
  const start = startOfDay(now);
  const doneToday = (id: string) => (srs[id]?.lastAt ?? 0) >= start;
  const dueDone = queue.due.filter(doneToday).length;
  const newDone = queue.fresh.filter(doneToday).length;
  return {
    dueTotal: queue.due.length,
    dueDone,
    newTotal: queue.fresh.length,
    newDone,
    left: queue.due.length - dueDone + (queue.fresh.length - newDone),
  };
}

export interface Batch {
  ids: string[];
  /** 这道题这一批是「复习」还是「新题」 */
  labels: Record<string, 'new' | 'review'>;
}

/** 从今日队列里取一批没做过的题：到期复习优先，再补新题。 */
export function batchFrom(queue: DayQueue, srs: SrsMap, now: number, size: number): Batch {
  const start = startOfDay(now);
  const doneToday = (id: string) => (srs[id]?.lastAt ?? 0) >= start;
  const ids: string[] = [];
  const labels: Record<string, 'new' | 'review'> = {};
  for (const id of queue.due) {
    if (ids.length >= size) break;
    if (doneToday(id)) continue;
    ids.push(id);
    labels[id] = 'review';
  }
  for (const id of queue.fresh) {
    if (ids.length >= size) break;
    if (doneToday(id)) continue;
    ids.push(id);
    labels[id] = 'new';
  }
  return { ids, labels };
}

/** 连续打卡天数：今天做了就从今天往前数，今天还没做就从昨天往前数。 */
export function streakOf(daily: Record<string, DayLog>, now: number): number {
  const active = (ts: number) => {
    const log = daily[dayOf(ts)];
    return !!log && log.new + log.review > 0;
  };
  let cursor = startOfDay(now);
  if (!active(cursor)) {
    cursor -= DAY_MS;
    if (!active(cursor)) return 0;
  }
  let n = 0;
  while (active(cursor) && n < 4000) {
    n += 1;
    cursor -= DAY_MS;
  }
  return n;
}

export function bumpDay(
  daily: Record<string, DayLog>,
  date: string,
  patch: Partial<DayLog>,
): Record<string, DayLog> {
  const old = daily[date] ?? { new: 0, review: 0, right: 0, wrong: 0 };
  const next: DayLog = {
    new: old.new + (patch.new ?? 0),
    review: old.review + (patch.review ?? 0),
    right: old.right + (patch.right ?? 0),
    wrong: old.wrong + (patch.wrong ?? 0),
  };
  return { ...daily, [date]: next };
}

/* --------------------------------- 存储 --------------------------------- */

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 配额满就算了 */
  }
}

export function loadSrs(): SrsMap {
  const data = readJson<Record<string, SrsCard>>(SRS_KEY);
  const out: SrsMap = {};
  if (data && typeof data === 'object') {
    for (const [id, card] of Object.entries(data)) {
      if (!card || typeof card.box !== 'number') continue;
      out[id] = {
        box: Math.max(0, Math.min(BOX_DAYS.length - 1, Math.round(card.box))),
        due: Number(card.due) || 0,
        reps: Number(card.reps) || 0,
        lapses: Number(card.lapses) || 0,
        lastAt: Number(card.lastAt) || 0,
      };
    }
    return out;
  }
  // 老账本迁移：做错过几次 = 几次 lapse，直接排进今天的复习
  const legacy = readJson<Record<string, { misses?: number; lastAt?: string }>>(SRS_LEGACY_KEY);
  if (legacy && typeof legacy === 'object') {
    const now = Date.now();
    for (const [id, v] of Object.entries(legacy)) {
      const misses = Number(v?.misses) || 0;
      if (misses <= 0) continue;
      out[id] = { box: 1, due: now, reps: 0, lapses: misses, lastAt: 0 };
    }
    if (Object.keys(out).length) writeJson(SRS_KEY, out);
  }
  return out;
}

export function saveSrs(srs: SrsMap) {
  writeJson(SRS_KEY, srs);
}

export function loadDaily(): Record<string, DayLog> {
  const data = readJson<Record<string, DayLog>>(SRS_DAILY_KEY);
  if (!data || typeof data !== 'object') return {};
  const out: Record<string, DayLog> = {};
  for (const [date, log] of Object.entries(data)) {
    if (!log) continue;
    out[date] = {
      new: Number(log.new) || 0,
      review: Number(log.review) || 0,
      right: Number(log.right) || 0,
      wrong: Number(log.wrong) || 0,
    };
  }
  return out;
}

export function saveDaily(daily: Record<string, DayLog>) {
  writeJson(SRS_DAILY_KEY, daily);
}

export function loadConf(): SrsConf {
  const data = readJson<Partial<SrsConf>>(SRS_CONF_KEY);
  const newPerDay = Number(data?.newPerDay);
  const reviewCap = Number(data?.reviewCap);
  return {
    newPerDay: newPerDay > 0 && newPerDay <= 200 ? Math.round(newPerDay) : DEFAULT_CONF.newPerDay,
    reviewCap: reviewCap > 0 && reviewCap <= 500 ? Math.round(reviewCap) : DEFAULT_CONF.reviewCap,
  };
}

export function saveConf(conf: SrsConf) {
  writeJson(SRS_CONF_KEY, conf);
}

export function loadQueue(): DayQueue | null {
  const data = readJson<DayQueue>(SRS_QUEUE_KEY);
  if (!data || typeof data.date !== 'string' || !Array.isArray(data.due) || !Array.isArray(data.fresh)) return null;
  return { date: data.date, due: data.due.filter((v) => typeof v === 'string'), fresh: data.fresh.filter((v) => typeof v === 'string') };
}

export function saveQueue(queue: DayQueue) {
  writeJson(SRS_QUEUE_KEY, queue);
}


/** 云端合并：同一道题取复习时间更晚的卡片，次数取大值。 */
export function mergeSrs(local: SrsMap, remote: SrsMap): SrsMap {
  const out: SrsMap = { ...local };
  for (const [qid, card] of Object.entries(remote ?? {})) {
    if (!card || typeof card.box !== 'number') continue;
    const mine = out[qid];
    if (!mine) {
      out[qid] = card;
      continue;
    }
    const newer = (card.lastAt ?? 0) > (mine.lastAt ?? 0) || ((card.lastAt ?? 0) === (mine.lastAt ?? 0) && card.box > mine.box);
    const win = newer ? card : mine;
    const lose = newer ? mine : card;
    out[qid] = {
      ...win,
      reps: Math.max(win.reps ?? 0, lose.reps ?? 0),
      lapses: Math.max(win.lapses ?? 0, lose.lapses ?? 0),
    };
  }
  return out;
}

/** 每日账合并：同一天取各项较大值。 */
export function mergeDaily(local: Record<string, DayLog>, remote: Record<string, DayLog>): Record<string, DayLog> {
  const out: Record<string, DayLog> = { ...local };
  for (const [date, log] of Object.entries(remote ?? {})) {
    if (!log) continue;
    const mine = out[date];
    out[date] = mine
      ? {
          new: Math.max(mine.new, Number(log.new) || 0),
          review: Math.max(mine.review, Number(log.review) || 0),
          right: Math.max(mine.right, Number(log.right) || 0),
          wrong: Math.max(mine.wrong, Number(log.wrong) || 0),
        }
      : {
          new: Number(log.new) || 0,
          review: Number(log.review) || 0,
          right: Number(log.right) || 0,
          wrong: Number(log.wrong) || 0,
        };
  }
  return out;
}
