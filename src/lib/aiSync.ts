/**
 * 站内进度云同步：借用 lab-grader 的存储路由（nginx 注入令牌，浏览器只走
 * /lab-grade/store/<key>），让换设备/换浏览器也能看到考试记录与错题本。
 * 冲突规则：谁的 updatedAt 新用谁的（整份覆盖）。
 */
const BASE = '/lab-grade/store';

export interface CloudDoc<T> {
  data: T;
  updatedAt: number;
}

export async function cloudPull<T>(key: string): Promise<CloudDoc<T> | null> {
  try {
    const res = await fetch(`${BASE}/${key}`, { method: 'GET', cache: 'no-store' });
    if (!res.ok) return null;
    const body = (await res.json()) as { ok?: boolean; data?: { updatedAt?: number } };
    const data = body?.data;
    if (!data || typeof data.updatedAt !== 'number') return null;
    return { data: data as unknown as T, updatedAt: data.updatedAt };
  } catch {
    return null;
  }
}

export async function cloudPut(key: string, payload: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/${key}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...payload, updatedAt: Date.now() }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
