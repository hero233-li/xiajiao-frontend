/**
 * 实践演练的批改状态：**按题目分开存**，一道题一个任务，互不挤占。
 * 具体的判卷在服务器排队（POST /jobs → 轮询 GET /jobs/<id>），
 * 所以切页面、按 F5、同时批多道题都不会丢。
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
  sqlPaper?: number;
}

export type GradeEntry =
  | { status: 'grading'; code: string; startedAt: number; queued: boolean }
  | { status: 'done'; code: string; result: GradeResult; seconds: number }
  | { status: 'error'; code: string; message: string; retryable: boolean };

export type GradeMap = Record<string, GradeEntry>;

const JOB_ENDPOINT = '/lab-grade/jobs';
const PASS_KEY = 'xj.lab.pass';
const SNAPSHOT_KEY = 'xj.lab.jobs.v2';
const LEGACY_KEY = 'xj.lab.grade.v1';
const POLL_MS = 1500;
/** 单道题最多等这么久，超过就当失败让用户重试，别无限转。 */
const WAIT_CAP_MS = 260_000;
/** 已完成的结果留一天，刷新还能看到批注。 */
const KEEP_DONE_MS = 24 * 60 * 60 * 1000;

/* ---------------- 已合格记录 ---------------- */

function loadPassed(): Set<string> {
  try {
    const raw = localStorage.getItem(PASS_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string') : [],
    );
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

/* ---------------- 持久化 ---------------- */

interface SavedJob {
  questionId: string;
  jobId: string;
  code: string;
  startedAt: number;
  view?: LabView;
}

interface SavedState {
  jobs: SavedJob[];
  done: { questionId: string; code: string; result: GradeResult; seconds: number; savedAt: number }[];
  view?: LabView;
}

function readSaved(): SavedState {
  const empty: SavedState = { jobs: [], done: [] };
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<SavedState>;
    return {
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
      done: Array.isArray(parsed.done) ? parsed.done : [],
      view: parsed.view,
    };
  } catch {
    return empty;
  }
}

let savedJobs: SavedJob[] = [];
let savedDone: SavedState['done'] = [];

function readState() {
  const state = readSaved();
  savedJobs = state.jobs.filter((job) => job && job.jobId);
  savedDone = state.done.filter(
    (item) => item && item.questionId && Date.now() - (item.savedAt ?? 0) <= KEEP_DONE_MS,
  );
  return state;
}

function writeSaved(view: LabView | undefined) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ jobs: savedJobs, done: savedDone, view }));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* 存不下就算了 */
  }
}

/* ---------------- 批改状态 ---------------- */

const initial = readState();
let view: LabView | undefined = initial.view;

const grades: GradeMap = {};
for (const item of savedDone) {
  grades[item.questionId] = {
    status: 'done',
    code: item.code,
    result: item.result,
    seconds: item.seconds,
  };
}
for (const job of savedJobs) {
  grades[job.questionId] = {
    status: 'grading',
    code: job.code,
    startedAt: job.startedAt,
    queued: false,
  };
}

let snapshot: GradeMap = { ...grades };
const gradeListeners = new Set<() => void>();
const timers = new Map<string, number>(); // questionId -> timer
const jobOf = new Map<string, string>(); // questionId -> jobId

function persist() {
  writeSaved(view);
}

function emit() {
  snapshot = { ...grades };
  gradeListeners.forEach((listener) => listener());
}

export function subscribeGrade(listener: () => void) {
  gradeListeners.add(listener);
  return () => gradeListeners.delete(listener);
}

export function getGrades(): GradeMap {
  return snapshot;
}

/** 上一次点过的卷别，用于刷新后回到原处。 */
export function getLastView() {
  return view;
}

function stopTimer(questionId: string) {
  const timer = timers.get(questionId);
  if (timer !== undefined) window.clearTimeout(timer);
  timers.delete(questionId);
  jobOf.delete(questionId);
}

function remember(job: SavedJob) {
  savedJobs = [...savedJobs.filter((item) => item.questionId !== job.questionId), job];
  savedDone = savedDone.filter((item) => item.questionId !== job.questionId);
  persist();
}

function finish(questionId: string, code: string, result: GradeResult, seconds: number) {
  stopTimer(questionId);
  savedJobs = savedJobs.filter((item) => item.questionId !== questionId);
  savedDone = [
    ...savedDone.filter((item) => item.questionId !== questionId),
    { questionId, code, result, seconds, savedAt: Date.now() },
  ];
  if (result.verdict === 'pass') markPassed(questionId);
  grades[questionId] = { status: 'done', code, result, seconds };
  persist();
  emit();
}

function fail(questionId: string, code: string, message: string, retryable = true) {
  stopTimer(questionId);
  savedJobs = savedJobs.filter((item) => item.questionId !== questionId);
  persist();
  grades[questionId] = { status: 'error', code, message, retryable };
  emit();
}

function poll(questionId: string, jobId: string, code: string, startedAt: number) {
  stopTimer(questionId);
  jobOf.set(questionId, jobId);
  let networkErrors = 0;
  const tick = async () => {
    if (jobOf.get(questionId) !== jobId) return;
    if (Date.now() - startedAt > WAIT_CAP_MS) {
      fail(questionId, code, '等太久了，服务可能卡住了，点「再次批改」重试');
      return;
    }
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
      if (response.status === 404) {
        fail(questionId, code, '任务已过期，重新批一次就好');
        return;
      }
      if (!response.ok || !data?.ok) throw new Error(data?.error ?? `批改服务返回 ${response.status}`);
      if (data.status === 'done' && data.verdictResult) {
        finish(
          questionId,
          code,
          data.verdictResult,
          Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
        );
        return;
      }
      if (data.status === 'error') {
        fail(questionId, code, data.error ?? '批改失败');
        return;
      }
      const entry = grades[questionId];
      networkErrors = 0;
      const queued = data.status === 'queued';
      if (entry && entry.status === 'grading' && entry.queued !== queued) {
        grades[questionId] = { ...entry, queued };
        emit();
      }
      timers.set(
        questionId,
        window.setTimeout(() => void tick(), POLL_MS),
      );
    } catch (error) {
      // 轮询偶尔会因为网络/热更新断一下：连续错几次才认为真的断了
      const offline = error instanceof TypeError;
      networkErrors += 1;
      if (offline && networkErrors <= 5) {
        timers.set(
          questionId,
          window.setTimeout(() => void tick(), POLL_MS),
        );
        return;
      }
      fail(
        questionId,
        code,
        offline ? '网络断了，已停止等待，点「再次批改」重来' : error instanceof Error ? error.message : String(error),
      );
    }
  };
  void tick();
}

export interface GradeInput {
  questionId: string;
  title: string;
  requirement: string;
  checks: string[];
  code: string;
  lang: 'java' | 'sql';
  view?: LabView;
}

/** 发起一次批改：只影响这道题，其它题的任务照旧跑。 */
export function startGrade(input: GradeInput) {
  const code = input.code.trim();
  if (code.length < 20) return;
  const questionId = input.questionId;
  const startedAt = Date.now();
  view = input.view ?? view;
  grades[questionId] = { status: 'grading', code, startedAt, queued: false };
  emit();

  void (async () => {
    const payload = JSON.stringify({
      title: input.title,
      requirement: input.requirement,
      checks: input.checks,
      code,
      lang: input.lang,
    });
    // 网络抖一下（切网、开发服务器热更新）不该直接判死：先自己再试一次
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(JOB_ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: payload,
        });
        const data = (await response.json().catch(() => null)) as
          | { ok?: boolean; jobId?: string; error?: string }
          | null;
        if (!response.ok || !data?.ok || !data.jobId) {
          throw new Error(data?.error ?? `批改服务返回 ${response.status}`);
        }
        remember({ questionId, jobId: data.jobId, code, startedAt, view: input.view });
        poll(questionId, data.jobId, code, startedAt);
        return;
      } catch (error) {
        const offline = error instanceof TypeError;
        if (offline && attempt === 0) {
          await new Promise((resolve) => window.setTimeout(resolve, 1200));
          continue;
        }
        fail(
          questionId,
          code,
          offline ? '网络断了，没连上批改服务，点「再次批改」重来' : error instanceof Error ? error.message : String(error),
        );
        return;
      }
    }
  })();
}

export function resetGrade(questionId: string) {
  stopTimer(questionId);
  savedJobs = savedJobs.filter((item) => item.questionId !== questionId);
  savedDone = savedDone.filter((item) => item.questionId !== questionId);
  delete grades[questionId];
  persist();
  emit();
}

export const cancelGrade = resetGrade;

/** 正在批改中的题号，左目录用来显示「批改中」。 */
export function getGradingIds(): string[] {
  return Object.entries(snapshot)
    .filter(([, entry]) => entry.status === 'grading')
    .map(([id]) => id);
}

/* 刷新后把所有没跑完的任务接回来继续轮询 */
for (const job of savedJobs) {
  poll(job.questionId, job.jobId, job.code, job.startedAt);
}
