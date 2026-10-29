/**
 * 实践演练的批改状态放在模块里，真正的判卷在服务器排队：
 * 切页面、按 F5 都不会丢——浏览器只记住 jobId 和已拿到的结果。
 */
export interface GradeResult {
  verdict: 'pass' | 'fail';
  marks: { line: number | null; why: string }[];
  issues: string[];
  summary: string;
}

/** 刷新后要回到哪张卷、哪道题。 */
export interface LabView {
  tab: 'java' | 'sql';
  javaSetId?: string;
  sqlPaper?: 'real' | 'a' | 'b' | 'c';
}

export type GradeJob =
  | { status: 'idle'; questionId: null }
  | { status: 'grading'; questionId: string; code: string; startedAt: number; view?: LabView }
  | {
      status: 'done';
      questionId: string;
      code: string;
      result: GradeResult;
      seconds: number;
      view?: LabView;
    }
  | { status: 'error'; questionId: string; message: string; view?: LabView };

const JOB_ENDPOINT = '/lab-grade/jobs';
const PASS_KEY = 'xj.lab.pass';
const SNAPSHOT_KEY = 'xj.lab.grade.v1';
const POLL_MS = 1500;
/** 已完成的结果留一天，刷新还能看到批注。 */
const KEEP_DONE_MS = 24 * 60 * 60 * 1000;

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

type SavedSnapshot =
  | {
      status: 'grading';
      jobId: string;
      questionId: string;
      code: string;
      startedAt: number;
      view?: LabView;
    }
  | {
      status: 'done';
      questionId: string;
      code: string;
      result: GradeResult;
      seconds: number;
      savedAt: number;
      view?: LabView;
    };

function readSnapshot(): SavedSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as SavedSnapshot) : null;
  } catch {
    return null;
  }
}

function writeSnapshot(value: SavedSnapshot | null) {
  try {
    if (value) localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(value));
    else localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    /* 存不下就算了 */
  }
}

function restore(): GradeJob {
  const saved = readSnapshot();
  if (!saved) return { status: 'idle', questionId: null };
  if (saved.status === 'done') {
    if (Date.now() - saved.savedAt > KEEP_DONE_MS) {
      writeSnapshot(null);
      return { status: 'idle', questionId: null };
    }
    currentView = saved.view;
    return {
      status: 'done',
      questionId: saved.questionId,
      code: saved.code,
      result: saved.result,
      seconds: saved.seconds,
      view: saved.view,
    };
  }
  currentView = saved.view;
  return {
    status: 'grading',
    questionId: saved.questionId,
    code: saved.code,
    startedAt: saved.startedAt,
    view: saved.view,
  };
}

let currentView: LabView | undefined;

let gradeSnapshot: GradeJob = restore();
const gradeListeners = new Set<() => void>();
let pollTimer: number | null = null;
let activeJobId: string | null = null;

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

function stopPolling() {
  if (pollTimer !== null) window.clearTimeout(pollTimer);
  pollTimer = null;
  activeJobId = null;
}

export function resetGrade() {
  stopPolling();
  writeSnapshot(null);
  emitGrade({ status: 'idle', questionId: null });
}

export const cancelGrade = resetGrade;

function finish(
  questionId: string,
  code: string,
  result: GradeResult,
  seconds: number,
) {
  writeSnapshot({ status: 'done', questionId, code, result, seconds, savedAt: Date.now(), view: currentView });
  if (result.verdict === 'pass') markPassed(questionId);
  emitGrade({ status: 'done', questionId, code, result, seconds, view: currentView });
}

function failJob(questionId: string, message: string) {
  stopPolling();
  writeSnapshot(null);
  emitGrade({ status: 'error', questionId, message, view: currentView });
}

function pollJob(jobId: string, questionId: string, code: string, startedAt: number) {
  stopPolling();
  activeJobId = jobId;
  const tick = async () => {
    if (activeJobId !== jobId) return;
    try {
      const response = await fetch(`${JOB_ENDPOINT}/${jobId}`, { cache: 'no-store' });
      const data = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            status?: 'queued' | 'running' | 'done' | 'error';
            verdictResult?: GradeResult;
            error?: string;
          }
        | null;
      if (!response.ok || !data?.ok) throw new Error(data?.error ?? `批改服务返回 ${response.status}`);
      if (data.status === 'done' && data.verdictResult) {
        finish(questionId, code, data.verdictResult, Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
        stopPolling();
        return;
      }
      if (data.status === 'error') {
        failJob(questionId, data.error ?? '批改失败');
        return;
      }
      pollTimer = window.setTimeout(() => void tick(), POLL_MS);
    } catch (error) {
      failJob(questionId, error instanceof Error ? error.message : String(error));
    }
  };
  void tick();
}

export interface GradeInput {
  questionId: string;
  view?: LabView;
  title: string;
  requirement: string;
  checks: string[];
  code: string;
  lang: 'java' | 'sql';
}

/** 发起一次批改：任务交给服务器排队，浏览器只记 jobId，刷新也能接着等。 */
export function startGrade(input: GradeInput) {
  const code = input.code.trim();
  if (code.length < 20) return;
  stopPolling();
  currentView = input.view;
  const startedAt = Date.now();
  emitGrade({ status: 'grading', questionId: input.questionId, code, startedAt, view: currentView });

  void (async () => {
    try {
      const response = await fetch(JOB_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: input.title,
          requirement: input.requirement,
          checks: input.checks,
          code,
          lang: input.lang,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; jobId?: string; error?: string }
        | null;
      if (!response.ok || !data?.ok || !data.jobId) {
        throw new Error(data?.error ?? `批改服务返回 ${response.status}`);
      }
      writeSnapshot({
        status: 'grading',
        jobId: data.jobId,
        questionId: input.questionId,
        code,
        startedAt,
        view: currentView,
      });
      pollJob(data.jobId, input.questionId, code, startedAt);
    } catch (error) {
      failJob(input.questionId, error instanceof Error ? error.message : String(error));
    }
  })();
}

/* 刷新后继续等上一次没跑完的任务 */
const saved = readSnapshot();
if (gradeSnapshot.status === 'grading' && saved?.status === 'grading') {
  pollJob(saved.jobId, saved.questionId, saved.code, saved.startedAt);
}
