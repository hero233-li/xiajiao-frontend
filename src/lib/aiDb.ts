/**
 * AI 刷题 / 考试 / 实操的记录桶：唯一数据源是服务器 MySQL（经 /lab-grade/store/<key>）。
 * 浏览器不再读写 localStorage 里的学习记录——开页时把云端文档一次性拉进内存，
 * 页面只读内存；任何改动按文档节流 700ms 写回云端，服务端入库。
 */
import { cloudPullStrict, cloudPut } from './aiSync';

interface CloudRoute {
  /** 云端文档名（/lab-grade/store/<cloud>） */
  cloud: string;
  /** 文档里的字段名 */
  field: string;
}

/** 本地键 → 云端文档字段。键名沿用旧版本，只作为内存里的槽位名，不再写浏览器。 */
const ROUTES: Record<string, CloudRoute> = {
  'xj.ai.srs.v1': { cloud: 'ai-drill', field: 'srs' },
  'xj.ai.srs.daily.v1': { cloud: 'ai-drill', field: 'daily' },
  'xj.ai.srs.conf.v1': { cloud: 'ai-drill', field: 'conf' },
  'xj.ai.srs.queue.v1': { cloud: 'ai-drill', field: 'queue' },
  'xj.ai.drill.wrongs.v1': { cloud: 'ai-drill', field: 'wrongs' },
  'xj.ai.exams.v1': { cloud: 'ai-trainer', field: 'records' },
  'xj.ai.wrongs.v1': { cloud: 'ai-trainer', field: 'wrongs' },
  'xj.ai.exam.resume.v2': { cloud: 'ai-trainer', field: 'resume' },
  'xj.ai.exam.progress.v1': { cloud: 'ai-trainer', field: 'progress' },
  'xj.ai.drill.session.v1': { cloud: 'ai-drill-session', field: 'drill' },
  'xj.ai.practical.exam.v3': { cloud: 'ai-practical', field: 'session' },
  'xj.ai.practical.results.v1': { cloud: 'ai-practical', field: 'results' },
  'xj.ai.practical.study.v1': { cloud: 'ai-practical', field: 'study' },
  'xj.ai.practical.sheets.v1': { cloud: 'ai-practical', field: 'sheets' },
};

export const AI_CLOUD_KEYS: string[] = Array.from(new Set(Object.values(ROUTES).map((r) => r.cloud)));

const mem = new Map<string, string>();
const timers = new Map<string, number>();
/** 读不到的云端文档：本次会话内只读不写，避免空数据把库覆盖掉。 */
const blocked = new Set<string>();
let hydrated = false;
let booting: Promise<{ ok: boolean; failed: string[] }> | null = null;

export function dbGet(key: string): string | null {
  return mem.get(key) ?? null;
}

export function dbSet(key: string, value: unknown) {
  if (value === null || value === undefined) {
    dbDel(key);
    return;
  }
  mem.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  const route = ROUTES[key];
  if (route && hydrated) schedule(route.cloud);
}

export function dbDel(key: string) {
  const had = mem.delete(key);
  const route = ROUTES[key];
  if (route && hydrated && had) schedule(route.cloud);
}

function schedule(cloud: string) {
  const prev = timers.get(cloud);
  if (prev) window.clearTimeout(prev);
  timers.set(
    cloud,
    window.setTimeout(() => {
      timers.delete(cloud);
      void flush(cloud);
    }, 700),
  );
}

/** 立刻把这一个文档写回云端（交卷、清空这类关键动作直接调）。 */
export async function dbFlush(cloud: string) {
  const timer = timers.get(cloud);
  if (timer) {
    window.clearTimeout(timer);
    timers.delete(cloud);
  }
  return flush(cloud);
}

async function flush(cloud: string): Promise<boolean> {
  if (blocked.has(cloud)) return false;
  const payload: Record<string, unknown> = {};
  for (const [localKey, route] of Object.entries(ROUTES)) {
    if (route.cloud !== cloud) continue;
    const raw = mem.get(localKey);
    if (raw == null) {
      payload[route.field] = null;
      continue;
    }
    try {
      payload[route.field] = JSON.parse(raw) as unknown;
    } catch {
      payload[route.field] = null;
    }
  }
  const ok = await cloudPut(cloud, payload);
  if (!ok) {
    // 写失败：5 秒后重试一次，仍失败就本次会话停写，别用半截数据覆盖云端
    const retry = window.setTimeout(() => {
      timers.delete(cloud);
      void flush(cloud).then((done) => {
        if (!done) blocked.add(cloud);
      });
    }, 5000);
    timers.set(cloud, retry);
  }
  return ok;
}

/**
 * 开页加载：把每个云端文档拉进内存。
 * 某个文档读不到时记进 failed，并把它标记为本次会话只读，绝不写回。
 */
export function hydrate(): Promise<{ ok: boolean; failed: string[] }> {
  if (booting) return booting;
  booting = (async () => {
    const failed: string[] = [];
    const docs = await Promise.all(
      AI_CLOUD_KEYS.map(async (cloud) => {
        try {
          return await cloudPullStrict<Record<string, unknown>>(cloud);
        } catch {
          failed.push(cloud);
          return null;
        }
      }),
    );
    AI_CLOUD_KEYS.forEach((cloud, i) => {
      if (failed.includes(cloud)) {
        blocked.add(cloud);
        return;
      }
      const doc = docs[i]?.data ?? {};
      for (const [localKey, route] of Object.entries(ROUTES)) {
        if (route.cloud !== cloud) continue;
        const value = doc[route.field];
        if (value === undefined || value === null) continue;
        mem.set(localKey, JSON.stringify(value));
      }
    });
    hydrated = true;
    return { ok: failed.length === 0, failed };
  })();
  return booting;
}

export function isHydrated(): boolean {
  return hydrated;
}
