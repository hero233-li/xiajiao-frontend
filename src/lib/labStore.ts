/**
 * 实践演练的批改状态放在模块里，不放在组件里：
 * 切到别的页面（组件卸载）批改照样跑完，回来还能看到结果。
 */
export interface GradeResult {
  verdict: 'pass' | 'fail';
  marks: { line: number | null; why: string }[];
  issues: string[];
  summary: string;
}

export type GradeJob =
  | { status: 'idle'; questionId: null }
  | { status: 'grading'; questionId: string; code: string; startedAt: number }
  | { status: 'done'; questionId: string; code: string; result: GradeResult; seconds: number }
  | { status: 'error'; questionId: string; message: string };

const GRADE_ENDPOINT = '/lab-grade/grade';
const PASS_KEY = 'xj.lab.pass';

/* ---------------- 已合格记录 ---------------- */

function loadPassed(): Set<string> {
  try {
    const raw = localStorage.getItem(PASS_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

let passedSnapshot = loadPassed();
const passedListeners = new Set<() => void>();

export function subscribePassed(listener: () => void) {
  passedListeners.add(listener);
  return () => passedListeners.delete(listener);
}

export function getPassed() {
  return passedSnapshot;
}

export function markPassed(id: string) {
  if (passedSnapshot.has(id)) return;
  passedSnapshot = new Set(passedSnapshot).add(id);
  try {
    localStorage.setItem(PASS_KEY, JSON.stringify([...passedSnapshot]));
  } catch {
    /* 存不下就算了 */
  }
  passedListeners.forEach((listener) => listener());
}

/* ---------------- 批改任务 ---------------- */

let gradeSnapshot: GradeJob = { status: 'idle', questionId: null };
const gradeListeners = new Set<() => void>();
let controller: AbortController | null = null;

function emitGrade(next: GradeJob) {
  gradeSnapshot = next;
  gradeListeners.forEach((listener) => listener());
}

export function subscribeGrade(listener: () => void) {
  gradeListeners.add(listener);
  return () => gradeListeners.delete(listener);
}

export function getGrade() {
  return gradeSnapshot;
}

export function resetGrade() {
  controller?.abort();
  controller = null;
  emitGrade({ status: 'idle', questionId: null });
}

export function cancelGrade() {
  resetGrade();
}

export interface GradeInput {
  questionId: string;
  title: string;
  requirement: string;
  checks: string[];
  code: string;
  lang: 'java' | 'sql';
}

/** 发起一次批改；函数立刻返回，结果通过订阅推给界面（切换页面不中断）。 */
export function startGrade(input: GradeInput) {
  const code = input.code.trim();
  if (code.length < 20) return;
  controller?.abort();
  const local = new AbortController();
  controller = local;
  const startedAt = Date.now();
  emitGrade({ status: 'grading', questionId: input.questionId, code, startedAt });

  const timer = window.setTimeout(() => local.abort(), 170_000);
  void (async () => {
    try {
      const response = await fetch(GRADE_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: input.title,
          requirement: input.requirement,
          checks: input.checks,
          code,
          lang: input.lang,
        }),
        signal: local.signal,
      });
      const data = (await response.json().catch(() => null)) as
        | (GradeResult & { ok?: boolean; error?: string })
        | null;
      if (!response.ok || !data?.ok) throw new Error(data?.error ?? `批改服务返回 ${response.status}`);
      if (data.verdict === 'pass') markPassed(input.questionId);
      emitGrade({
        status: 'done',
        questionId: input.questionId,
        code,
        result: data,
        seconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      });
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === 'AbortError';
      // 被新任务顶掉时不要覆盖状态
      if (controller !== local) return;
      emitGrade({
        status: 'error',
        questionId: input.questionId,
        message: aborted ? '等太久了，模型可能排队，稍后再试一次' : error instanceof Error ? error.message : String(error),
      });
    } finally {
      window.clearTimeout(timer);
      if (controller === local) controller = null;
    }
  })();
}
