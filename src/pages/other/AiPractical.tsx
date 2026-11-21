import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  Download,
  ExternalLink,
  FileText,
  FileUp,
  ListChecks,
  Loader2,
  PanelLeft,
  Play,
  RotateCcw,
  Send,
  Trash2,
} from 'lucide-react';
import { AiPracticalCodeCheck } from './AiPracticalCodeCheck';
import {
  AI_PRACTICAL_COUNT,
  AI_PRACTICAL_POOL,
  AI_PRACTICAL_SECTIONS,
  pickPracticalExamPaper,
  type PoolItem,
  type PracticalSection,
} from '../../data/aiPracticalPool';
import { dbDel, dbGet, dbSet, hydrate } from '../../lib/aiDb';
import { answerOf } from '../../data/aiPracticalAnswers';
import { sheetOf, type PracticalSheet, type SheetCell, type SheetPara } from '../../data/aiPracticalSheets';

/* 与考场一致：平台发题、发素材、收文件；代码在 jupyter 里写，导出 html 后上传 */

const SESSION_KEY = 'xj.ai.practical.exam.v3';
const RESULT_KEY = 'xj.ai.practical.results.v1';
const REPLAY_KEY = 'xj.ai.practical.replay.v1';
/** 手动重置过的那一场成绩（存 at），重置后不再据此自动上锁 */
const REPLAY_SKIP_KEY = 'xj.ai.practical.replay.skip.v1';
/** 错题再战门槛：一次整卷低于 LOCK_BELOW 分就锁住新卷，同一套题做到 UNLOCK_AT 分才解锁。 */
const LOCK_BELOW = 70;
const UNLOCK_AT = 80;
const API = '/ai-lab';
/* 在线答题卷的草稿（按题号存一份字段值） */
const SHEET_KEY = 'xj.ai.practical.sheets.v1';
type SheetValues = Record<string, string>;
function loadSheetDrafts(): Record<string, SheetValues> {
  return loadJson<Record<string, SheetValues>>(SHEET_KEY, {});
}
/* 有 AI 参考做法 notebook 的题号（素材目录里的 <code>_ref.ipynb） */
const REF_CODES = new Set(['1.1.1', '2.1.1', '2.2.1', '3.1.1', '3.2.1', '4.1.1']);

function paperSeconds(paper: PoolItem[]) {
  return paper.reduce((n, it) => n + Math.round(Number.parseFloat(it.minutes) * 60), 0);
}

interface Block {
  kind: 'p' | 'table';
  html: string;
}
interface Section {
  head: string;
  blocks: Block[];
}
interface PageItem {
  code: string;
  title: string;
  minutes: string;
  sections: Section[];
  notes: string[];
  uploads: { seq: string; requirement: string }[];
  files: string[];
}
interface UploadedFile {
  name: string;
  size: number;
}
interface PointResult {
  id: string;
  got: number;
  why: string;
}
interface ItemResult {
  code: string;
  score: number;
  max: number;
  points: PointResult[];
}
interface PaperResult {
  total: number;
  max: number;
  items: ItemResult[];
  summary: string;
}
interface SavedResult extends PaperResult {
  at: string;
  seconds: number;
  codes: string[];
}
interface Session {
  id: string;
  codes: string[];
  startedAt: number;
}

interface ReplayState {
  /** 要重做的同一套题号（顺序不变） */
  codes: string[];
  /** 上锁时间（ISO） */
  at: string;
  /** 这套题至今最好的百分制得分 */
  best: number;
  /** 已经重做的次数 */
  attempts: number;
}

/** 百分制得分：整卷按 100 分算，专项练习这类小题也按比例算。 */
function pctOf(r: { total: number; max: number }): number {
  return r.max > 0 ? Math.round((r.total / r.max) * 100) : 0;
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = dbGet(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  dbSet(key, value);
}

function fmt(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function stamp(iso: string) {
  const d = new Date(iso);
  return (
    d.getMonth() +
    1 +
    ' 月 ' +
    d.getDate() +
    ' 日 ' +
    String(d.getHours()).padStart(2, '0') +
    ':' +
    String(d.getMinutes()).padStart(2, '0')
  );
}

function sectionLabel(code: string) {
  const group = code.split('.').slice(0, 2).join('.');
  const hit = AI_PRACTICAL_SECTIONS.find((s) => s.groups.includes(group));
  return hit?.label ?? '实操题';
}

/** 某个考核单元下的全部题目：单元 1（1.1 + 1.2）和单元 6（4.1 + 4.2）各 10 题，其余各 5 题。 */
function sectionItems(sec: PracticalSection): PoolItem[] {
  return AI_PRACTICAL_POOL.filter((it) => sec.groups.includes(it.group));
}

function kb(n: number) {
  if (n > 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
  return Math.max(1, Math.round(n / 1024)) + ' KB';
}

let pageCache: PageItem[] | null = null;

async function loadPages(): Promise<PageItem[]> {
  if (pageCache) return pageCache;
  const res = await fetch(API + '/pages.json');
  if (!res.ok) throw new Error('题面加载失败');
  pageCache = (await res.json()) as PageItem[];
  return pageCache;
}

/* 试题单：把整段文字按小节标题、编号小问、正文分层重排，避免糊成一片 */
type SheetBlock = { kind: 'h' | 'p' | 'item' | 'step' | 'meta'; text: string };

/* Word 导出的是 U+2028，先统一成真换行，否则整段会挤成一行 */
function normalizeSheet(text: string): string {
  return text.replace(/[\r\u2028\u2029]/g, '\n');
}

/* 一行里挤了多个「1) 2) 3)」时按编号切开：编号必须在行首或紧跟标点 */
function splitSteps(line: string): string[] {
  const cuts: number[] = [];
  const re = /\d{1,2}\)/g;
  let m: RegExpExecArray | null = re.exec(line);
  while (m) {
    const at = m.index;
    const prev = at ? line.slice(at - 1, at) : '';
    if (!at || /[\s；;。：:，,、]/.test(prev)) cuts.push(at);
    m = re.exec(line);
  }
  if (cuts.length < 2) return [line];
  const out: string[] = [];
  for (let k = 0; k < cuts.length; k += 1) {
    const from = cuts[k];
    const to = k + 1 < cuts.length ? cuts[k + 1] : line.length;
    const piece = line.slice(from, to).trim();
    if (piece) out.push(piece);
  }
  return out;
}

/** 试题单里「（1）」「1)」这类编号行给一点左侧缩进，长段落更好扫 */
function sheetIndent(html: string) {
  const text = html.replace(/<[^>]+>/g, '').trim();
  if (/^\d{1,2}\)/.test(text)) return 'pl-7';
  if (/^[（(]\d{1,2}[)）]/.test(text)) return 'pl-3';
  return '';
}

function kindOfSheet(text: string): SheetBlock['kind'] {
  if (/^[（(]\d{1,2}[)）]/.test(text)) return 'item';
  if (/^\d{1,2}\)/.test(text)) return 'step';
  return 'p';
}

function parseSheetText(text: string): SheetBlock[] {
  const out: SheetBlock[] = [];
  for (const raw of normalizeSheet(text).split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (/^(试题名称|考核时间|准考证号)[:：]/.test(line)) {
      out.push({ kind: 'meta', text: line });
      continue;
    }
    if (/^\d{1,2}[.、]\s*\S{1,26}$/.test(line)) {
      out.push({ kind: 'h', text: line });
      continue;
    }
    const chunks = line
      .split(/(?=[（(]\d{1,2}[)）])/u)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const chunk of chunks.flatMap(splitSteps)) {
      out.push({ kind: kindOfSheet(chunk), text: chunk });
    }
  }
  return out;
}

function SheetBody({ text }: { text: string }) {
  const blocks = parseSheetText(text);
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        if (b.kind === 'meta') {
          return (
            <p key={i} className="text-muted text-[13px] tabular-nums">
              {b.text}
            </p>
          );
        }
        if (b.kind === 'h') {
          return (
            <h4
              key={i}
              className="text-ink text-[15px] font-semibold"
              style={{ marginTop: i === 0 ? 0 : 18 }}
            >
              {b.text}
            </h4>
          );
        }
        if (b.kind === 'item') {
          const mark = b.text.match(/^[（(]\d{1,2}[)）]/);
          const head = mark ? mark[0] : '';
          const rest = mark ? b.text.slice(head.length).trim() : b.text;
          return (
            <div key={i} className="flex gap-2 text-[15px] leading-[1.8]">
              <span className="text-ink w-8 shrink-0 font-medium tabular-nums">{head}</span>
              <span className="text-secondary">{rest}</span>
            </div>
          );
        }
        if (b.kind === 'step') {
          const mark = b.text.match(/^\d{1,2}\)/);
          const head = mark ? mark[0] : '';
          const rest = mark ? b.text.slice(head.length).trim() : b.text;
          return (
            <div key={i} className="flex gap-2 pl-8 text-[15px] leading-[1.8]">
              <span className="text-muted w-6 shrink-0 tabular-nums">{head}</span>
              <span className="text-secondary">{rest}</span>
            </div>
          );
        }
        return (
          <p key={i} className="text-secondary text-[15px] leading-[1.8]">
            {b.text}
          </p>
        );
      })}
    </div>
  );
}

/* -------------------------------- 学习模式 -------------------------------- */

const STUDY_DONE_KEY = 'xj.ai.practical.study.v1';
/* 题库里的 minutes 是「20min」这种字符串，统一成「20 分钟」再显示 */
function fmtMinutes(v: string | number) {
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n + ' 分钟' : String(v);
}
/* 学习模式的提交目录：submissions/study/<题号>/ */
const STUDY_EXAM = 'study';

/* ------------------------------- 变体练习 ------------------------------- */
/* 同一考法换数据与参数：防止只背骨架、填空位置一变就不会 */
interface VariantRubric {
  id: string;
  score: number;
  desc: string;
}
interface VariantItem {
  name: string;
  csv: string;
  title: string;
  kind: string;
  ref: string;
  sheet: string;
  rows: number;
  rubric: VariantRubric[];
}

function VariantLab({ onExit }: { onExit: () => void }) {
  const [items, setItems] = useState<VariantItem[]>([]);
  const [openName, setOpenName] = useState('');
  const [jupyterToken, setJupyterToken] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [busy, setBusy] = useState('');
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<ItemResult | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void fetch(API + '/variants')
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d?.items) ? (d.items as VariantItem[]) : [];
        setItems(list);
        if (list.length) setOpenName((prev) => prev || list[0].name);
      })
      .catch(() => undefined);
    void fetch(API + '/config')
      .then((r) => r.json())
      .then((d) => {
        if (d?.token) setJupyterToken(String(d.token));
      })
      .catch(() => undefined);
  }, []);

  const cur = items.find((it) => it.name === openName) ?? null;
  const total = cur ? cur.rubric.reduce((n, r) => n + r.score, 0) : 0;

  const reload = useCallback(async (code: string) => {
    try {
      const r = await fetch(API + '/files?exam=' + STUDY_EXAM + '&code=' + encodeURIComponent(code));
      const d = await r.json();
      setFiles(Array.isArray(d.files) ? (d.files as UploadedFile[]) : []);
    } catch {
      setFiles([]);
    }
  }, []);

  useEffect(() => {
    setBusy('');
    setResult(null);
    if (openName) void reload(openName);
  }, [openName, reload]);

  const doUpload = useCallback(
    async (file: File) => {
      if (!openName) return;
      setBusy('正在上传 ' + file.name);
      try {
        const b64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const s = String(reader.result ?? '');
            resolve(s.slice(s.indexOf(',') + 1));
          };
          reader.onerror = () => reject(new Error('读取文件失败'));
          reader.readAsDataURL(file);
        });
        const res = await fetch(API + '/upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ exam: STUDY_EXAM, code: openName, name: file.name, data: b64 }),
        });
        const d = await res.json().catch(() => null);
        if (!res.ok || !d?.ok) throw new Error(d?.error ?? '上传失败');
        await reload(openName);
        setBusy('文件上传成功：' + file.name);
        window.setTimeout(() => setBusy(''), 2600);
      } catch (err) {
        setBusy(err instanceof Error ? err.message : '上传失败');
        window.setTimeout(() => setBusy(''), 4000);
      }
    },
    [openName, reload],
  );

  const removeFile = useCallback(
    async (name: string) => {
      if (!openName) return;
      await fetch(API + '/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ exam: STUDY_EXAM, code: openName, name }),
      }).catch(() => undefined);
      await reload(openName);
    },
    [openName, reload],
  );

  const grade = useCallback(async () => {
    if (grading || !cur) return;
    if (!files.length) {
      setBusy('先上传导出的 html 与截图，再判分');
      window.setTimeout(() => setBusy(''), 3000);
      return;
    }
    setGrading(true);
    setBusy('AI 正在按评分细则判这道变体题');
    try {
      const res = await fetch(API + '/grade', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          exam: STUDY_EXAM,
          answers: [
            {
              code: cur.name,
              title: cur.title,
              score: total,
              sheet: cur.sheet,
              rubric: cur.rubric,
              ref: cur.ref,
            },
          ],
        }),
      });
      const created = await res.json().catch(() => null);
      if (!res.ok || !created?.jobId) throw new Error(created?.error ?? '判分失败');
      for (let i = 0; i < 300; i += 1) {
        await new Promise((r) => setTimeout(r, 2000));
        const poll = await fetch(API + '/grade/' + created.jobId).then((r) => r.json());
        if (poll.status === 'done') {
          const graded = poll.result as PaperResult;
          setResult(graded.items?.[0] ?? null);
          setBusy('');
          return;
        }
        if (poll.status === 'error') throw new Error(poll.error ?? '判分失败');
      }
      throw new Error('判分超时，稍后再试');
    } catch (err) {
      setBusy(err instanceof Error ? err.message : '判分失败');
    } finally {
      setGrading(false);
    }
  }, [cur, files.length, grading, total]);

  return (
    <div className="space-y-4">
      <section className="glass p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-ink text-[15px] font-semibold">变体练习</h2>
            <span className="text-muted text-[13px]">同一考法换数据与参数</span>
          </div>
          <button type="button" className="pill px-3.5 py-1.5 text-[12px]" onClick={onExit}>
            退出变体练习
          </button>
        </div>

        {items.length ? (
          <div className="hairline-t mt-3 flex flex-wrap gap-1.5 pt-3">
            {items.map((it) => (
              <button
                key={it.name}
                type="button"
                onClick={() => setOpenName(it.name)}
                className={`rounded-[10px] border px-2.5 py-1 text-[12px] tabular-nums transition-colors ${
                  it.name === openName
                    ? 'border-brand bg-brand font-medium text-white'
                    : 'hairline bg-glass-fill-quiet text-secondary hover:border-brand/50 hover:text-ink'
                }`}
              >
                {it.name}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {!cur ? (
        <section className="glass text-secondary p-5 text-[13px] leading-relaxed sm:p-6">
          正在加载变体题列表…
        </section>
      ) : (
        <>
          <section className="glass p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 text-[12px] font-semibold tabular-nums">
                {cur.name}
              </span>
              <h3 className="text-ink text-[15px] font-semibold">{cur.title}</h3>
            </div>
            <div className="text-secondary mt-3 space-y-2 text-[15px] leading-relaxed">
              <p>{cur.sheet}</p>
              <p className="text-muted text-[13px] tabular-nums">
                数据集 {cur.csv} 共 {cur.rows} 行 满分 {total} 分
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                className="pill px-3.5 py-1.5 text-[12px]"
                href={API + '/variants/' + encodeURIComponent(cur.name) + '.zip'}
                download={cur.name + '.zip'}
              >
                <Download size={13} />
                打包下载素材
              </a>
              <a
                className="pill pill--solid px-3.5 py-1.5 text-[12px] font-medium"
                href={
                  '/jupyter/tree/' +
                  encodeURIComponent('素材') +
                  '/' +
                  encodeURIComponent(cur.name) +
                  (jupyterToken ? '?token=' + encodeURIComponent(jupyterToken) : '')
                }
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={13} />
                在 Jupyter 中作答
              </a>
            </div>
          </section>

          <section className="glass p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-ink text-[15px] font-semibold">评分细则</h3>
              <span className="text-muted text-[12px] tabular-nums">满分 {total} 分</span>
            </div>
            <div className="hairline mt-3 overflow-hidden rounded-[14px]">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th className="w-20">编号</th>
                    <th className="w-16">配分</th>
                    <th>评分标准</th>
                  </tr>
                </thead>
                <tbody>
                  {cur.rubric.map((r) => (
                    <tr key={r.id}>
                      <td className="text-ink font-medium tabular-nums">{r.id}</td>
                      <td className="text-brand-ink font-medium tabular-nums">{r.score}</td>
                      <td>{r.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="glass p-5 sm:p-6">
            <h3 className="text-ink text-[15px] font-semibold">答案上传与判分</h3>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void doUpload(f);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                className="pill pill--solid px-3.5 py-1.5 text-[12px] font-medium"
                onClick={() => fileRef.current?.click()}
              >
                <FileUp size={13} />
                选择文件上传
              </button>
              <button
                type="button"
                className="pill px-3.5 py-1.5 text-[12px] disabled:opacity-40"
                onClick={() => void grade()}
                disabled={grading}
              >
                {grading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                提交本题判分
              </button>
              {busy ? <span className="text-brand-ink text-[12px]">{busy}</span> : null}
            </div>

            {files.length ? (
              <ul className="hairline-t mt-3 divide-y divide-[var(--glass-hairline)] pt-1">
                {files.map((f) => (
                  <li key={f.name} className="text-secondary flex items-center gap-2 py-2 text-[13px]">
                    <span className="bg-success-soft text-success-ink rounded-full px-2 py-0.5 text-[12px]">已上传</span>
                    <span className="text-ink min-w-0 flex-1 truncate">{f.name}</span>
                    <span className="text-muted text-[12px] tabular-nums">{kb(f.size)}</span>
                    <button
                      type="button"
                      className="text-muted hover:text-danger-ink p-1 transition-colors"
                      onClick={() => void removeFile(f.name)}
                      aria-label="删除"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {result ? (
              <div className="hairline-t mt-4 pt-3">
                <p className="text-ink text-[15px] font-semibold tabular-nums">
                  本题得分 {result.score} / {result.max}
                </p>
                <ul className="mt-2 space-y-1.5 text-[13px]">
                  {result.points.map((p) => (
                    <li key={p.id} className="text-secondary">
                      <span className="text-ink font-medium tabular-nums">
                        {p.id} {p.got} 分
                      </span>
                      {p.why ? <span className="text-muted"> {p.why}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="glass p-5 sm:p-6">
            <details>
              <summary className="text-ink cursor-pointer text-[15px] font-semibold">参考答案（做完再看）</summary>
              <pre className="hairline bg-surface/80 text-secondary mt-3 overflow-x-auto rounded-[14px] p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap">
                {cur.ref}
              </pre>
            </details>
          </section>
        </>
      )}
    </div>
  );
}

/* -------------------------------- 学习模式组件 -------------------------------- */

function StudyMode({
  pages,
  onExit,
  onOpenCodeCheck,
}: {
  pages: PageItem[];
  onExit: () => void;
  onOpenCodeCheck: () => void;
}) {
  const [localPages, setLocalPages] = useState<PageItem[]>(pages);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<Record<string, boolean>>(() => loadJson<Record<string, boolean>>(STUDY_DONE_KEY, {}));
  const [resetting, setResetting] = useState(false);
  const [jupyterToken, setJupyterToken] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [busy, setBusy] = useState('');
  const [dirOpen, setDirOpen] = useState(false);
  const [lab, setLab] = useState(false);

  const item = AI_PRACTICAL_POOL[index];
  const page = localPages.find((p) => p.code === item.code);
  const list = page?.files ?? [];
  const hasNotebook = list.includes(item.code + '.ipynb');
  const hasData = list.some((n) => /\.(csv|xlsx|xls)$/i.test(n));
  const showJupyter = hasNotebook || hasData;

  useEffect(() => {
    if (localPages.length) return;
    void loadPages().then(setLocalPages).catch(() => undefined);
  }, [localPages.length]);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch(API + '/config');
        const d = await r.json();
        if (d?.token) setJupyterToken(String(d.token));
      } catch {
        /* 忽略 */
      }
    })();
  }, []);

  useEffect(() => {
    saveJson(STUDY_DONE_KEY, done);
  }, [done]);

  const reload = useCallback(async (code: string) => {
    try {
      const r = await fetch(API + '/files?exam=' + STUDY_EXAM + '&code=' + encodeURIComponent(code));
      const d = await r.json();
      setFiles(Array.isArray(d.files) ? (d.files as UploadedFile[]) : []);
    } catch {
      setFiles([]);
    }
  }, []);

  useEffect(() => {
    setBusy('');
    void reload(item.code);
  }, [item.code, reload]);

  /* 学习进度落服务器 MySQL（ai_practical_study），换设备也看得到 */
  useEffect(() => {
    void fetch(API + '/practical/study', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: item.code, status: done[item.code] ? 'done' : 'doing' }),
    }).catch(() => undefined);
  }, [item.code, done]);

  /* 重做这道题：清掉已上传的答案文件、判分结果与完成标记，并把 notebook 还原成空白版 */
  const resetItem = useCallback(async () => {
    if (resetting) return;
    const lines = [
      '会清空这道题在本站的记录：已上传的答案文件（' + files.length + ' 个）、AI 判分结果、已学完标记；',
      item.code + ' 的 notebook 也会恢复成没做过时的空白版本。',
      '清空后不能撤销，确定重做吗？',
    ];
    if (!window.confirm(lines.join('\n'))) return;
    setResetting(true);
    setBusy('正在清空这道题的内容');
    try {
      const res = await fetch(API + '/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ exam: STUDY_EXAM, code: item.code }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) throw new Error(d?.error ?? '清空失败');
      setDone((s) => ({ ...s, [item.code]: false }));
      await reload(item.code);
      setBusy('已清空，可以重做这道题了');
      window.setTimeout(() => setBusy(''), 3000);
    } catch (err) {
      setBusy(err instanceof Error ? err.message : '清空失败');
      window.setTimeout(() => setBusy(''), 4000);
    } finally {
      setResetting(false);
    }
  }, [files.length, item.code, reload, resetting]);

  if (lab) return <VariantLab onExit={() => setLab(false)} />;

  const doneCount = Object.keys(done).filter((k) => done[k]).length;
  const go = (delta: number) => setIndex((i) => Math.min(AI_PRACTICAL_POOL.length - 1, Math.max(0, i + delta)));

  const directoryRail = (
    <section className="glass p-4">
      <div className="flex items-center justify-between gap-2 pb-3">
        <span className="text-ink text-[13px] font-semibold">题号目录</span>
        <span className="text-muted text-[12px] tabular-nums">
          已完成 {doneCount} / {AI_PRACTICAL_POOL.length}
        </span>
      </div>
      <div className="hairline-t space-y-3.5 pt-3">
        {AI_PRACTICAL_SECTIONS.map((sec) => {
          const secQuestions = AI_PRACTICAL_POOL.map((q, i) => ({ q, i })).filter((x) =>
            sec.groups.includes(x.q.code.split('.').slice(0, 2).join('.')),
          );
          return (
            <div key={sec.key}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-secondary text-[12px] font-medium">{sec.label}</span>
                <span className="text-muted text-[12px] tabular-nums">{sec.score} 分</span>
              </div>
              <div className="mt-1.5 grid grid-cols-5 gap-1">
                {secQuestions.map(({ q, i }) => {
                  const active = i === index;
                  const isDone = Boolean(done[q.code]);
                  return (
                    <button
                      key={q.code}
                      type="button"
                      onClick={() => {
                        setIndex(i);
                        setDirOpen(false);
                      }}
                      className={`relative grid h-7 place-items-center rounded-[8px] text-[12px] tabular-nums transition-colors ${
                        active
                          ? 'bg-brand font-semibold text-white'
                          : isDone
                            ? 'bg-success-soft/80 text-success-ink font-medium'
                            : 'bg-surface-2/75 text-secondary hover:bg-brand-soft/60 hover:text-brand-ink'
                      }`}
                    >
                      {q.code}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="space-y-4">
      {/* 紧凑顶部控制栏 */}
      <section className="glass-panel flex flex-wrap items-center gap-2.5 px-4 py-3 sm:px-5">
        <span className="text-ink text-[15px] font-semibold">学习模式</span>
        <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums">
          第 {index + 1} / {AI_PRACTICAL_POOL.length} 题
        </span>
        <span className="text-muted text-[12px] tabular-nums">已完成 {doneCount} 题</span>

        <button
          type="button"
          className={`pill px-3 py-1.5 text-[12px] xl:hidden ${dirOpen ? 'pill--solid' : ''}`}
          onClick={() => setDirOpen((v) => !v)}
        >
          <PanelLeft size={13} />
          题号目录
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="pill px-3 py-1.5 text-[12px] disabled:opacity-40"
            onClick={() => go(-1)}
            disabled={index === 0}
          >
            <ChevronLeft size={13} />
            上一题
          </button>
          <button
            type="button"
            className="pill px-3 py-1.5 text-[12px] disabled:opacity-40"
            onClick={() => go(1)}
            disabled={index === AI_PRACTICAL_POOL.length - 1}
          >
            下一题
            <ChevronRight size={13} />
          </button>
          <button type="button" className="pill px-3 py-1.5 text-[12px]" onClick={onOpenCodeCheck}>
            代码盲填检测
          </button>
          <button type="button" className="pill px-3 py-1.5 text-[12px]" onClick={() => setLab(true)}>
            变体练习
          </button>
          <button type="button" className="pill px-3 py-1.5 text-[12px]" onClick={onExit}>
            退出学习
          </button>
        </div>
      </section>

      {/* 小屏展开目录 */}
      {dirOpen ? <div className="xl:hidden">{directoryRail}</div> : null}

      {/* 主双栏：左侧 40 题目录 + 右侧阅读与实练区 */}
      <div className="grid items-start gap-4 xl:grid-cols-[264px_minmax(0,1fr)]">
        <div className="hidden xl:sticky xl:top-5 xl:block">{directoryRail}</div>

        <div className="min-w-0 space-y-4">
          <section className="glass p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 text-[12px] font-semibold tabular-nums">
                {item.code}
              </span>
              <span className="bg-surface-2 text-secondary rounded-full px-2.5 py-0.5 text-[12px]">
                {sectionLabel(item.code)}
              </span>
              <span className="text-muted text-[12px] tabular-nums">{fmtMinutes(item.minutes)}</span>
              <span className="text-muted text-[12px] tabular-nums">{item.score} 分</span>
              {done[item.code] ? (
                <span className="bg-success-soft text-success-ink ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium">
                  <Check size={12} /> 已学完
                </span>
              ) : null}
            </div>
            <h3 className="text-ink mt-3 text-[15px] font-semibold">{item.title}</h3>
            <div className="hairline-t mt-4 max-w-[78ch] pt-4">
              <SheetBody text={item.sheet} />
            </div>
          </section>

          <section className="glass p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-ink text-[15px] font-semibold">评分细则</h3>
              <span className="text-muted text-[12px] tabular-nums">满分 {item.score} 分</span>
            </div>
            <div className="hairline mt-3 overflow-hidden rounded-[14px]">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th className="w-20">编号</th>
                    <th className="w-16">配分</th>
                    <th>评分标准</th>
                  </tr>
                </thead>
                <tbody>
                  {item.rubric.map((r) => (
                    <tr key={r.id}>
                      <td className="text-ink font-medium tabular-nums">{r.id}</td>
                      <td className="text-brand-ink font-medium tabular-nums">{r.score}</td>
                      <td>{r.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="glass p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-ink text-[15px] font-semibold">素材下载</h3>
              <div className="flex flex-wrap gap-2">
                <a
                  className="pill px-3 py-1.5 text-[12px]"
                  href={API + '/materials/' + encodeURIComponent(item.code) + '.zip'}
                  download={item.code + '.zip'}
                >
                  <Download size={13} />
                  打包下载
                </a>
                {showJupyter ? (
                  <a
                    className="pill pill--solid px-3 py-1.5 text-[12px] font-medium"
                    href={
                      '/jupyter/tree/' +
                      encodeURIComponent('素材') +
                      '/' +
                      encodeURIComponent(item.code) +
                      (jupyterToken ? '?token=' + encodeURIComponent(jupyterToken) : '')
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={13} />
                    在 Jupyter 中作答
                  </a>
                ) : null}
              </div>
            </div>
            {list.length ? (
              <ul className="hairline-t mt-3 divide-y divide-[var(--glass-hairline)] pt-1">
                {list.map((name) => (
                  <li key={name} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                    <span className="text-ink min-w-0 break-all">{name}</span>
                    <a
                      className="text-brand-ink shrink-0 text-[12px] font-medium hover:underline"
                      href={
                        API +
                        '/materials/' +
                        encodeURIComponent(item.code) +
                        '/' +
                        name.split('/').map(encodeURIComponent).join('/')
                      }
                      download={name}
                    >
                      下载
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted mt-2 text-[13px]">本题无独立素材文件</p>
            )}
          </section>

          <section className="glass flex flex-wrap items-center gap-2.5 px-5 py-3.5">
            <button
              type="button"
              className={done[item.code] ? 'pill px-4 py-2 text-[13px]' : 'pill pill--solid px-4 py-2 text-[13px] font-medium'}
              onClick={() => setDone((d) => ({ ...d, [item.code]: !d[item.code] }))}
            >
              <Check size={14} />
              {done[item.code] ? '取消完成标记' : '标记已学完'}
            </button>
            <button
              type="button"
              className="pill px-4 py-2 text-[13px] disabled:opacity-40"
              onClick={() => void resetItem()}
              disabled={resetting}
            >
              {resetting ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              {resetting ? '正在清空' : '重做这道题'}
            </button>
            {busy ? <span className="text-brand-ink text-[12px]">{busy}</span> : null}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                className="pill px-3 py-1.5 text-[12px] disabled:opacity-40"
                onClick={() => go(-1)}
                disabled={index === 0}
              >
                <ChevronLeft size={13} />
                上一题
              </button>
              <button
                type="button"
                className="pill px-3 py-1.5 text-[12px] disabled:opacity-40"
                onClick={() => go(1)}
                disabled={index === AI_PRACTICAL_POOL.length - 1}
              >
                下一题
                <ChevronRight size={13} />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- 主组件 ---------------------------------- */

type Phase = 'idle' | 'loading' | 'writing' | 'grading' | 'done' | 'error';

export function AiPractical() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [pages, setPages] = useState<PageItem[]>([]);
  const [paper, setPaper] = useState<PoolItem[]>([]);
  const [exam, setExam] = useState<Session | null>(null);
  const [current, setCurrent] = useState(0);
  const [tab, setTab] = useState<'upload' | 'materials'>('upload');
  const [uploads, setUploads] = useState<Record<string, UploadedFile[]>>({});
  const [remaining, setRemaining] = useState(0);
  const tickedRef = useRef(0);
  const [result, setResult] = useState<PaperResult | null>(null);
  const [history, setHistory] = useState<SavedResult[]>(() => loadJson<SavedResult[]>(RESULT_KEY, []));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [waitTick, setWaitTick] = useState(0);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [jupyterToken, setJupyterToken] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [study, setStudy] = useState(false);
  const [codeCheck, setCodeCheck] = useState(false);
  const [codeCheckFixed, setCodeCheckFixed] = useState<string | null>(null);
  const [secPick, setSecPick] = useState(false);
  const [secNow, setSecNow] = useState<PracticalSection | null>(null);
  const [replay, setReplay] = useState<ReplayState | null>(() => loadJson<ReplayState | null>(REPLAY_KEY, null));
  const [replaySkip, setReplaySkip] = useState<string | null>(() => loadJson<string | null>(REPLAY_SKIP_KEY, null));
  const [replayRun, setReplayRun] = useState(false);

  const [cloudReady, setCloudReady] = useState(false);
  const submitting = useRef(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const reloadFiles = useCallback(async (sid: string, codes: string[]) => {
    const next: Record<string, UploadedFile[]> = {};
    await Promise.all(
      codes.map(async (code) => {
        try {
          const r = await fetch(API + '/files?exam=' + encodeURIComponent(sid) + '&code=' + encodeURIComponent(code));
          const d = await r.json();
          next[code] = Array.isArray(d.files) ? (d.files as UploadedFile[]) : [];
        } catch {
          next[code] = [];
        }
      }),
    );
    setUploads(next);
  }, []);

  useEffect(() => {
    let alive = true;
    void hydrate().then(() => {
      if (!alive) return;
      setHistory(loadJson<SavedResult[]>(RESULT_KEY, []));
      setCloudReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  /* 错题再战：最近一次整卷低于 70 分就锁住新卷，同一套 6 题做到 80 分才解锁。
     云端成绩可能由人工判卷写回，所以这里从最近一次成绩反推，而不是只在交卷时算。 */
  useEffect(() => {
    if (!cloudReady) return;
    const latest = history[0];
    if (!latest || !Array.isArray(latest.codes) || latest.codes.length !== AI_PRACTICAL_COUNT) return;
    const pct = pctOf(latest);
    /* 手动重置过的那一场不再自动上锁，等下一场成绩出来再判断 */
    if (!replay && replaySkip === latest.at) return;
    if (pct >= UNLOCK_AT) {
      if (replay) {
        setReplay(null);
        saveJson(REPLAY_KEY, null);
      }
      return;
    }
    if (replay) {
      if (pct > replay.best) {
        const next = { ...replay, best: pct };
        setReplay(next);
        saveJson(REPLAY_KEY, next);
      }
      return;
    }
    if (pct < LOCK_BELOW) {
      const next: ReplayState = { codes: latest.codes, at: latest.at, best: pct, attempts: 1 };
      setReplay(next);
      saveJson(REPLAY_KEY, next);
    }
  }, [cloudReady, history, replay, replaySkip]);

  /* 手动重置错题再战：解除这一套的锁，可以重新抽新卷；已交成绩与错题记录都不动 */
  const resetReplay = useCallback(() => {
    if (!replay) return;
    const ok = window.confirm(
      `重置错题再战？\n\n这套 ${replay.codes.length} 题最好 ${replay.best} 分，重置后可以重新抽一套新题。\n已交卷的成绩和错题记录都保留。`,
    );
    if (!ok) return;
    setReplaySkip(replay.at);
    saveJson(REPLAY_SKIP_KEY, replay.at);
    setReplay(null);
    saveJson(REPLAY_KEY, null);
    setReplayRun(false);
    dbDel(SESSION_KEY);
  }, [replay]);

  useEffect(() => {
    void (async () => {
      try {
        const all = await loadPages();
        setPages(all);
      } catch {
        /* 开始考试时再报错 */
      }
      try {
        const r = await fetch(API + '/config');
        const d = await r.json();
        if (d?.token) setJupyterToken(String(d.token));
      } catch {
        /* 忽略 */
      }
    })();
  }, []);

  useEffect(() => {
    const saved = loadJson<Session | null>(SESSION_KEY, null);
    if (!saved || !Array.isArray(saved.codes) || saved.codes.length !== AI_PRACTICAL_COUNT || !saved.startedAt) return;
    const found = saved.codes
      .map((c) => AI_PRACTICAL_POOL.find((p) => p.code === c))
      .filter((p): p is PoolItem => Boolean(p));
    if (found.length !== AI_PRACTICAL_COUNT) return;
    const left = paperSeconds(found) - Math.floor((Date.now() - saved.startedAt) / 1000);
    if (left <= 0) {
      dbDel(SESSION_KEY);
      return;
    }
    const locked = loadJson<ReplayState | null>(REPLAY_KEY, null);
    setReplayRun(
      Boolean(
        locked &&
          locked.codes.length === saved.codes.length &&
          locked.codes.every((c, i) => c === saved.codes[i]),
      ),
    );
    setPaper(found);
    setExam(saved);
    setRemaining(left);
    setCurrent(0);
    setPhase('writing');
    void reloadFiles(saved.id, saved.codes);
  }, [reloadFiles]);

  useEffect(() => {
    if (phase !== 'writing' || !exam) return;
    const tick = () => {
      tickedRef.current = Date.now();
      setRemaining(paperSeconds(paper) - Math.floor((Date.now() - exam.startedAt) / 1000));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [phase, exam, paper]);

  /** 已实际作答交卷过的题号（跳过 0 分空白交卷）：下一场抽卷优先避开这些题。 */
  const testedCodes = useMemo(() => {
    const s = new Set<string>();
    for (const h of history) {
      if (h.total <= 0) continue;
      for (const c of h.codes ?? []) s.add(c);
    }
    for (const c of exam?.codes ?? []) s.add(c);
    return s;
  }, [history, exam]);

  const begin = useCallback(async () => {
    setError('');
    setAutoSubmitted(false);
    setPhase('loading');
    try {
      const all = pages.length ? pages : await loadPages();
      setPages(all);
      const replayCodes = replay?.codes ?? [];
      const lockedPaper = replayCodes.length
        ? replayCodes
            .map((c) => AI_PRACTICAL_POOL.find((p) => p.code === c))
            .filter((p): p is PoolItem => Boolean(p))
        : [];
      const nextPaper =
        lockedPaper.length === AI_PRACTICAL_COUNT ? lockedPaper : pickPracticalExamPaper(Math.random, testedCodes);
      const sid = 'e' + Date.now().toString(36);
      const now = Date.now();
      const session: Session = {
        id: sid,
        codes: nextPaper.map((p) => p.code),
        startedAt: now,
      };
      tickedRef.current = 0;
      setPaper(nextPaper);
      setExam(session);
      setCurrent(0);
      setTab('upload');
      setRemaining(paperSeconds(nextPaper));
      setUploads({});
      setSecNow(null);
      setReplayRun(lockedPaper.length === AI_PRACTICAL_COUNT);
      setPhase('writing');
      saveJson(SESSION_KEY, session);
      void reloadFiles(sid, session.codes);
    } catch (err) {
      setError(err instanceof Error ? err.message : '题面加载失败');
      setPhase('error');
    }
  }, [pages, reloadFiles, testedCodes, replay]);

  /** 专项练习：只在选中的考核单元里随机抽一道题，优先抽还没考过的题，计时按该单元的时长。 */
  const beginSection = useCallback(
    (sec: PracticalSection) => {
      const pool = sectionItems(sec);
      if (!pool.length) return;
      const fresh = pool.filter((it) => !testedCodes.has(it.code));
      const candidates = fresh.length ? fresh : pool;
      const item = candidates[Math.floor(Math.random() * candidates.length)];
      const sid = 'p' + Date.now().toString(36);
      const session: Session = { id: sid, codes: [item.code], startedAt: Date.now() };
      tickedRef.current = 0;
      setError('');
      setAutoSubmitted(false);
      setSecNow(sec);
      setReplayRun(false);
      setSecPick(false);
      setPaper([item]);
      setExam(session);
      setCurrent(0);
      setTab('upload');
      setRemaining(paperSeconds([item]));
      setUploads({});
      setPhase('writing');
      void reloadFiles(sid, session.codes);
    },
    [reloadFiles, testedCodes],
  );

  const submit = useCallback(
    async (auto = false) => {
      if (submitting.current || !exam) return;
      if (!auto && !window.confirm('交卷后不能再改，开始判分？')) return;
      submitting.current = true;
      setPhase('grading');
      setError('');
      setAutoSubmitted(auto);
      setWaitTick(0);
      dbDel(SESSION_KEY);
      const ticker = window.setInterval(() => setWaitTick((n) => n + 1), 1000);
      const elapsed = Math.min(paperSeconds(paper), Math.round((Date.now() - exam.startedAt) / 1000));
      try {
        const res = await fetch(API + '/grade', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            exam: exam.id,
            answers: paper.map((it) => ({
              code: it.code,
              title: it.title,
              score: it.score,
              sheet: it.sheet,
              rubric: it.rubric,
              ref: answerOf(it.code)?.text ?? '',
            })),
          }),
        });
        const created = await res.json().catch(() => null);
        if (!res.ok || !created?.jobId) throw new Error(created?.error ?? '交卷失败，请再试一次');
        for (let i = 0; i < 300; i += 1) {
          await new Promise((r) => setTimeout(r, 2000));
          const poll = await fetch(API + '/grade/' + created.jobId).then((r) => r.json());
          if (poll.status === 'done') {
            const graded = poll.result as PaperResult;
            setResult(graded);
            const saved: SavedResult = {
              ...graded,
              at: new Date().toISOString(),
              seconds: elapsed,
              codes: paper.map((p) => p.code),
            };
            setHistory((prev) => {
              const next = [saved, ...prev].slice(0, 20);
              saveJson(RESULT_KEY, next);
              return next;
            });
            /* 整卷（6 题）才触发错题再战：低分锁新卷，同一套做到 80 分解锁 */
            if (saved.codes.length === AI_PRACTICAL_COUNT) {
              const pct = pctOf(saved);
              if (pct >= UNLOCK_AT) {
                setReplay(null);
                saveJson(REPLAY_KEY, null);
              } else if (pct < LOCK_BELOW || replay) {
                const next: ReplayState = {
                  codes: saved.codes,
                  at: saved.at,
                  best: Math.max(pct, replay ? replay.best : 0),
                  attempts: saved.codes.join() === (replay?.codes ?? []).join() ? (replay?.attempts ?? 0) + 1 : 1,
                };
                setReplay(next);
                saveJson(REPLAY_KEY, next);
              }
            }
            setPhase('done');
            return;
          }
          if (poll.status === 'error') throw new Error(poll.error ?? '判卷失败');
        }
        throw new Error('判卷超时，请再交一次');
      } catch (err) {
        setError(err instanceof Error ? err.message : '判卷失败');
        setPhase('error');
      } finally {
        submitting.current = false;
        window.clearInterval(ticker);
      }
    },
    [exam, paper],
  );

  useEffect(() => {
    if (phase !== 'writing' || !tickedRef.current || remaining > 0) return;
    void submit(true);
  }, [phase, remaining, submit]);

  const clearAll = useCallback(() => {
    if (!window.confirm('清空这台设备与云端的实操记录？未交卷的试卷也会一起清掉。')) return;
    dbDel(RESULT_KEY);
    dbDel(SESSION_KEY);
    setHistory([]);
    setError('');
    setPhase('idle');
    setExam(null);
    setPaper([]);
    setUploads({});
    setRemaining(0);
  }, []);

  const doUpload = useCallback(
    async (file: File) => {
      if (!exam) return;
      const target = paper[current];
      if (!target) return;
      setBusy('正在上传 ' + file.name);
      try {
        const b64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const s = String(reader.result ?? '');
            resolve(s.slice(s.indexOf(',') + 1));
          };
          reader.onerror = () => reject(new Error('读取文件失败'));
          reader.readAsDataURL(file);
        });
        const res = await fetch(API + '/upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ exam: exam.id, code: target.code, name: file.name, data: b64 }),
        });
        const d = await res.json().catch(() => null);
        if (!res.ok || !d?.ok) throw new Error(d?.error ?? '上传失败');
        await reloadFiles(exam.id, exam.codes);
        setBusy('文件上传成功：' + file.name);
        window.setTimeout(() => setBusy(''), 2600);
      } catch (err) {
        setBusy(err instanceof Error ? err.message : '上传失败');
        window.setTimeout(() => setBusy(''), 4000);
      }
    },
    [current, exam, paper, reloadFiles],
  );

  const removeFile = useCallback(
    async (name: string) => {
      if (!exam) return;
      const target = paper[current];
      if (!target) return;
      await fetch(API + '/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ exam: exam.id, code: target.code, name }),
      }).catch(() => null);
      await reloadFiles(exam.id, exam.codes);
    },
    [current, exam, paper, reloadFiles],
  );

  const currentPage = useMemo(() => pages.find((p) => p.code === paper[current]?.code), [pages, paper, current]);
  const currentFiles = uploads[paper[current]?.code ?? ''] ?? [];
  const curCode = paper[current]?.code ?? '';
  const pageFiles = currentPage?.files ?? [];
  const hasNotebook = pageFiles.includes(curCode + '.ipynb');
  const hasData = pageFiles.some((n) => /\.(csv|xlsx|xls)$/i.test(n));
  const showJupyter = hasNotebook || hasData;
  const hasSheet = pageFiles.some((n) => n.endsWith('.docx'));

  useEffect(() => {
    setSheetOpen(false);
  }, [curCode]);

  const overtime = remaining <= 5 * 60 && phase === 'writing';
  const best = useMemo(() => (history.length ? Math.max(...history.map((h) => h.total)) : null), [history]);
  const uploadedTotal = useMemo(() => Object.values(uploads).reduce((n, fs) => n + fs.length, 0), [uploads]);

  /* --------------------------------- 渲染 --------------------------------- */

  if (codeCheck) {
    return (
      <AiPracticalCodeCheck
        fixedCode={codeCheckFixed ?? undefined}
        onExit={() => {
          setCodeCheck(false);
          setCodeCheckFixed(null);
        }}
      />
    );
  }

  if (study) {
    return (
      <StudyMode
        pages={pages}
        onExit={() => setStudy(false)}
        onOpenCodeCheck={() => {
          setStudy(false);
          setCodeCheck(true);
        }}
      />
    );
  }

  if (phase === 'idle' || phase === 'loading' || phase === 'error') {
    return (
      <div className="space-y-4">
        {/* 主考试英雄卡片 */}
        <section className="glass glass--sheen p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-ink text-[15px] font-semibold">{replay ? '错题再战' : '操作技能模拟考试'}</h2>
                <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums">
                  6 题 120 分钟 100 分
                </span>
                {best !== null ? (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums ${
                      best >= 60 ? 'bg-success-soft text-success-ink' : 'bg-surface-2 text-secondary'
                    }`}
                  >
                    历史最高 {best} 分
                  </span>
                ) : null}
                {replay ? (
                  <span className="bg-danger-soft text-danger-ink rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums">
                    这套最好 {replay.best} 分
                  </span>
                ) : null}
              </div>
              <p className="text-secondary mt-2 text-[13px]">
                {replay
                  ? `上次 ${replay.best} 分没到 ${UNLOCK_AT} 分，先把这套同样的 ${replay.codes.length} 道题做到 ${UNLOCK_AT} 分，才能开新卷（已重做 ${replay.attempts} 次）`
                  : '按真实考核结构从六个单元随机抽题，支持 Jupyter 实跑、在线答题卷与 AI 细则判分'}
              </p>
              {error ? <p className="text-danger-ink mt-2 text-[13px]">{error}</p> : null}
            </div>

            <button
              type="button"
              className="pill pill--solid px-5 py-2.5 text-[13px] font-medium disabled:opacity-50"
              onClick={() => void begin()}
              disabled={phase === 'loading'}
            >
              {phase === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} strokeWidth={2} />}
              {phase === 'loading' ? '正在组卷' : replay ? `错题再战（同一套 ${replay.codes.length} 题）` : '开始模拟考试'}
            </button>
            {replay ? (
              <button
                type="button"
                className="pill px-3 py-2.5 text-[13px]"
                onClick={resetReplay}
                disabled={phase === 'loading'}
              >
                <RotateCcw size={14} />
                重置再战
              </button>
            ) : null}
          </div>
        </section>

        {/* 三大专项练习模式卡片 */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={() => setCodeCheck(true)}
            className="glass glass-interactive flex flex-col items-start gap-3 p-5 text-left"
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="bg-brand-soft text-brand-ink grid size-9 place-items-center rounded-[12px]">
                <Code2 size={18} strokeWidth={1.8} />
              </span>
              <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums">
                20 题
              </span>
            </div>
            <div>
              <h3 className="text-ink text-[15px] font-semibold">代码盲填检测</h3>
              <p className="text-secondary mt-1 text-[13px]">对照原卷空格手写代码，0 秒核对</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSecPick((v) => !v)}
            className={`glass glass-interactive flex flex-col items-start gap-3 p-5 text-left ${
              secPick ? 'ring-brand/50 ring-1' : ''
            }`}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="bg-brand-soft text-brand-ink grid size-9 place-items-center rounded-[12px]">
                <ListChecks size={18} strokeWidth={1.8} />
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums ${
                  secPick ? 'bg-brand text-white' : 'bg-surface-2 text-secondary'
                }`}
              >
                6 个单元
              </span>
            </div>
            <div>
              <h3 className="text-ink text-[15px] font-semibold">专项单元练习</h3>
              <p className="text-secondary mt-1 text-[13px]">选定单个考核单元，随机抽 1 题计时练</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStudy(true)}
            className="glass glass-interactive flex flex-col items-start gap-3 p-5 text-left"
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="bg-brand-soft text-brand-ink grid size-9 place-items-center rounded-[12px]">
                <FileText size={18} strokeWidth={1.8} />
              </span>
              <span className="bg-surface-2 text-secondary rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums">
                40 题
              </span>
            </div>
            <div>
              <h3 className="text-ink text-[15px] font-semibold">按题号学习</h3>
              <p className="text-secondary mt-1 text-[13px]">按 1.1.1 至 4.2.5 顺序看题面与评分细则</p>
            </div>
          </button>
        </div>

        {/* 专项单元选择器 */}
        {secPick ? (
          <section className="glass p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-ink text-[15px] font-semibold">选择考核单元</h3>
              <button
                type="button"
                onClick={() => setSecPick(false)}
                className="text-muted hover:text-ink text-[12px] transition-colors"
              >
                收起
              </button>
            </div>
            <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {AI_PRACTICAL_SECTIONS.map((sec) => {
                const items = sectionItems(sec);
                return (
                  <button
                    key={sec.key}
                    type="button"
                    onClick={() => beginSection(sec)}
                    className="glass-tile flex flex-col gap-2 p-4 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-ink text-[15px] font-medium">{sec.label}</span>
                      <span className="bg-brand-soft text-brand-ink rounded-full px-2 py-0.5 text-[12px] font-medium tabular-nums">
                        {sec.score} 分
                      </span>
                    </div>
                    <div className="text-muted flex items-center gap-3 text-[12px] tabular-nums">
                      <span>{items.length} 道题</span>
                      <span>{fmtMinutes(sec.minutes)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {result ? (
          <ResultCard result={result} paper={paper} auto={autoSubmitted} seconds={history[0]?.seconds ?? 0} />
        ) : null}

        {/* 历史交卷 */}
        {history.length ? (
          <section className="glass p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-ink text-[15px] font-semibold">历史交卷</h3>
              <button
                type="button"
                onClick={clearAll}
                className="text-muted hover:text-danger-ink text-[12px] transition-colors"
              >
                清空记录
              </button>
            </div>
            <ul className="mt-3 divide-y divide-[var(--glass-hairline)]">
              {history.map((h) => {
                const pass = h.total >= 60;
                return (
                  <li key={h.at} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3 text-[13px]">
                    <span
                      className={`w-24 shrink-0 text-[15px] font-semibold tabular-nums ${
                        pass ? 'text-success-ink' : 'text-danger-ink'
                      }`}
                    >
                      {h.total} / {h.max}
                    </span>
                    <span className="text-secondary tabular-nums">{stamp(h.at)}</span>
                    <span className="text-muted text-[12px] tabular-nums">用时 {fmt(h.seconds)}</span>
                    <div className="ml-auto flex flex-wrap gap-1">
                      {(h.codes ?? []).map((c) => (
                        <span
                          key={c}
                          className="bg-surface-2 text-secondary rounded-md px-1.5 py-0.5 text-[12px] tabular-nums"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }

  if (phase === 'grading') {
    return (
      <section className="glass p-10 text-center">
        <Loader2 size={24} className="text-brand mx-auto animate-spin" />
        <p className="text-ink mt-3 text-[15px] font-semibold">AI 正在按官方评分细则逐题判卷</p>
        <p className="text-muted mt-1.5 text-[13px] tabular-nums">已等待 {waitTick} 秒，通常需要 1 到 3 分钟</p>
      </section>
    );
  }

  if (phase === 'done') {
    return (
      <div className="space-y-4">
        {result ? (
          <ResultCard result={result} paper={paper} auto={autoSubmitted} seconds={history[0]?.seconds ?? 0} />
        ) : null}
        {error ? <p className="text-danger-ink glass px-5 py-3.5 text-[13px]">{error}</p> : null}
        <section className="glass flex flex-wrap items-center gap-2.5 px-5 py-4">
          {secNow ? (
            <button
              type="button"
              className="pill pill--solid px-4 py-2 text-[13px] font-medium"
              onClick={() => beginSection(secNow)}
            >
              <ListChecks size={14} />
              再抽一道（{secNow.label}）
            </button>
          ) : (
            <button
              type="button"
              className="pill pill--solid px-4 py-2 text-[13px] font-medium"
              onClick={() => void begin()}
            >
              <Play size={14} />
              {replay ? '继续错题再战' : '再考一场'}
            </button>
          )}
          {secNow ? (
            <button
              type="button"
              className="pill px-4 py-2 text-[13px]"
              onClick={() => {
                setSecNow(null);
                setSecPick(true);
                setPhase('idle');
              }}
            >
              换个单元
            </button>
          ) : (
            <button
              type="button"
              className="pill px-4 py-2 text-[13px]"
              onClick={() => setPhase('idle')}
            >
              返回实操首页
            </button>
          )}
          <button type="button" className="text-muted hover:text-danger-ink ml-auto text-[12px]" onClick={clearAll}>
            清空记录
          </button>
        </section>
      </div>
    );
  }

  if (!cloudReady) {
    return <div className="glass text-secondary p-8 text-center text-[13px]">正在读取云端学习记录…</div>;
  }

  return (
    <div className="space-y-4">
      {/* 顶部考场状态条 */}
      <section className="glass-panel px-4 py-3.5 sm:px-5 lg:sticky lg:top-4 lg:z-20">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 text-[12px] font-medium">
              {secNow ? `专项练习 ${secNow.label}` : replayRun ? '错题再战' : '模拟考试'}
            </span>
            <span className="text-secondary text-[13px]">自学考生</span>
            <span className="text-muted text-[13px] tabular-nums">已上传 {uploadedTotal} 个文件</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Clock size={15} className={overtime ? 'text-danger-ink' : 'text-brand-ink'} />
              <span
                className={`text-[22px] leading-none font-semibold tabular-nums ${
                  overtime ? 'text-danger-ink' : 'text-brand-ink'
                }`}
              >
                {fmt(remaining)}
              </span>
            </span>
            <button
              type="button"
              className="pill pill--solid px-4 py-1.5 text-[13px] font-medium"
              onClick={() => void submit(false)}
            >
              <Send size={13} />
              交卷
            </button>
          </div>
        </div>

        <div className="hairline-t mt-3 flex flex-wrap items-center gap-1.5 pt-3">
          {paper.map((item, i) => {
            const n = (uploads[item.code] ?? []).length;
            const active = i === current;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setCurrent(i);
                  setTab('upload');
                }}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  active
                    ? 'bg-brand text-white'
                    : n
                      ? 'bg-success-soft text-success-ink'
                      : 'bg-surface-2 text-secondary hover:text-ink'
                }`}
                title={`第 ${i + 1} 题 ${item.code}，建议 ${fmtMinutes(item.minutes)}`}
              >
                第 {i + 1} 题{n ? ` (${n})` : ''}
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              className="pill px-3 py-1 text-[12px] disabled:opacity-40"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
            >
              <ChevronLeft size={13} />
              上一题
            </button>
            <button
              type="button"
              className="pill px-3 py-1 text-[12px] disabled:opacity-40"
              onClick={() => setCurrent((c) => Math.min(paper.length - 1, c + 1))}
              disabled={current >= paper.length - 1}
            >
              下一题
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* 左：试题单 */}
        <section className="glass p-5 sm:p-6">
          <div className="hairline-b flex flex-wrap items-center gap-2 pb-3.5 text-[12px]">
            <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 font-semibold tabular-nums">
              第 {current + 1} 题
            </span>
            <span className="bg-surface-2 text-secondary rounded-full px-2.5 py-0.5">
              {sectionLabel(paper[current]?.code ?? '')}
            </span>
            <span className="text-muted tabular-nums">考核时间 {fmtMinutes(paper[current]?.minutes ?? 0)}</span>
            <span className="text-muted tabular-nums">分值 {paper[current]?.score} 分</span>
          </div>

          {currentPage ? (
            <div className="mt-4 max-w-[76ch] space-y-4">
              {currentPage.sections.map((sec) => (
                <div key={sec.head}>
                  <h3 className="text-ink text-[15px] font-semibold">{sec.head}</h3>
                  {sec.blocks.length ? (
                    <div className="text-secondary mt-2 space-y-1.5 text-[15px] leading-[1.8]">
                      {sec.blocks.map((b, i) =>
                        b.kind === 'table' ? (
                          <div
                            key={i}
                            className="hairline my-2 overflow-x-auto rounded-[12px] text-[13px] [&_table]:w-full [&_table]:border-collapse [&_td]:border-b [&_td]:border-[var(--glass-hairline)] [&_td]:px-2.5 [&_td]:py-1.5 [&_th]:border-b [&_th]:border-[var(--glass-hairline)] [&_th]:bg-surface-2/60 [&_th]:px-2.5 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_tr:last-child_td]:border-b-0"
                            dangerouslySetInnerHTML={{ __html: b.html }}
                          />
                        ) : (
                          <p key={i} className={sheetIndent(b.html)} dangerouslySetInnerHTML={{ __html: b.html }} />
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted mt-4 text-[13px]">正在加载本题题面…</p>
          )}
        </section>

        {/* 右：上传与素材工具栏 */}
        <section className="glass p-4 sm:p-5 lg:sticky lg:top-[132px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="segmented">
              <button
                type="button"
                data-active={tab === 'upload'}
                className="segmented-item px-3 py-1 text-[12px]"
                onClick={() => setTab('upload')}
              >
                答案上传
              </button>
              <button
                type="button"
                data-active={tab === 'materials'}
                className="segmented-item px-3 py-1 text-[12px]"
                onClick={() => setTab('materials')}
              >
                素材下载
              </button>
            </div>

            {pageFiles.includes(curCode + '.ipynb') ? (
              <button
                type="button"
                className="pill px-3 py-1.5 text-[12px]"
                onClick={() => {
                  setCodeCheckFixed(curCode);
                  setCodeCheck(true);
                }}
              >
                <Code2 size={13} />
                盲填检测
              </button>
            ) : null}
          </div>

          {tab === 'upload' ? (
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="text-ink text-[13px] font-semibold">提交要求</h3>
                <div className="mt-2 space-y-2">
                  {(currentPage?.uploads ?? []).map((u) => (
                    <div
                      key={u.seq}
                      className="hairline bg-surface/55 flex items-center gap-2.5 rounded-[12px] px-3 py-2.5"
                    >
                      <span className="bg-surface-2 text-muted grid size-5 shrink-0 place-items-center rounded-full text-[12px] tabular-nums">
                        {u.seq}
                      </span>
                      <span className="text-secondary min-w-0 flex-1 text-[12px] leading-relaxed">
                        {u.requirement}
                      </span>
                      <button
                        type="button"
                        className="pill shrink-0 px-2.5 py-1 text-[12px]"
                        onClick={() => fileRef.current?.click()}
                      >
                        <FileUp size={12} />
                        上传
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-ink text-[13px] font-semibold">本题已上传</h3>
                  <span className="text-muted text-[12px] tabular-nums">{currentFiles.length} 个</span>
                </div>
                {currentFiles.length ? (
                  <ul className="mt-2 divide-y divide-[var(--glass-hairline)]">
                    {currentFiles.map((f) => (
                      <li key={f.name} className="flex items-center gap-2 py-2 text-[12px]">
                        <span className="bg-success-soft text-success-ink shrink-0 rounded-full px-2 py-0.5 font-medium">
                          已传
                        </span>
                        <span className="text-ink min-w-0 flex-1 truncate">{f.name}</span>
                        <span className="text-muted shrink-0 tabular-nums">{kb(f.size)}</span>
                        <button
                          type="button"
                          className="text-muted hover:text-danger-ink p-0.5 transition-colors"
                          onClick={() => void removeFile(f.name)}
                          aria-label="删除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted mt-1.5 text-[12px]">尚未上传文件，未提交的评分点按 0 分计。</p>
                )}
                {busy ? <p className="text-brand-ink mt-2 text-[12px]">{busy}</p> : null}
              </div>

              {(currentPage?.notes ?? []).length ? (
                <div className="hairline bg-surface/55 rounded-[12px] p-3">
                  <h4 className="text-ink text-[12px] font-semibold">注意事项</h4>
                  <ul className="text-muted mt-1.5 space-y-1 text-[12px] leading-relaxed">
                    {(currentPage?.notes ?? []).map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void doUpload(f);
                }}
              />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {/* 快捷操作按钮区 */}
              <div className="flex flex-wrap gap-2">
                {showJupyter ? (
                  <a
                    className="pill pill--solid px-3 py-1.5 text-[12px] font-medium"
                    href={
                      '/jupyter/tree/' +
                      encodeURIComponent('素材') +
                      '/' +
                      encodeURIComponent(curCode) +
                      '?token=' +
                      jupyterToken
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={12} />
                    在 Jupyter 中作答
                  </a>
                ) : null}
                {hasSheet ? (
                  <button
                    type="button"
                    className="pill pill--solid px-3 py-1.5 text-[12px] font-medium"
                    onClick={() => setSheetOpen(true)}
                  >
                    <FileText size={12} />
                    在线填写答题卷
                  </button>
                ) : null}
                {hasNotebook ? (
                  <a
                    className="pill px-3 py-1.5 text-[12px]"
                    href={
                      '/jupyter/notebooks/' +
                      encodeURIComponent('素材') +
                      '/' +
                      encodeURIComponent(curCode) +
                      '/' +
                      encodeURIComponent(curCode + '.ipynb') +
                      '?token=' +
                      jupyterToken
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={12} />
                    打开本题 notebook
                  </a>
                ) : null}
                {hasSheet ? (
                  <a
                    className="pill px-3 py-1.5 text-[12px]"
                    href={API + '/sheet/' + encodeURIComponent(curCode)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    预览原卷
                  </a>
                ) : null}
                <a
                  className="pill px-3 py-1.5 text-[12px]"
                  href={API + '/materials/' + encodeURIComponent(paper[current]?.code ?? '') + '.zip'}
                  download={(paper[current]?.code ?? 'materials') + '.zip'}
                >
                  <Download size={12} />
                  打包下载
                </a>
                {REF_CODES.has(curCode) ? (
                  <a
                    className="pill px-3 py-1.5 text-[12px]"
                    href={
                      '/jupyter/notebooks/' +
                      encodeURIComponent('素材') +
                      '/' +
                      encodeURIComponent(curCode) +
                      '/' +
                      encodeURIComponent(curCode + '_ref.ipynb') +
                      '?token=' +
                      jupyterToken
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText size={12} />
                    参考做法（AI 生成）
                  </a>
                ) : null}
              </div>

              {/* 素材文件列表 */}
              <div>
                <h3 className="text-ink text-[13px] font-semibold">素材文件</h3>
                <div className="hairline mt-2 overflow-hidden rounded-[12px]">
                  <table className="glass-table">
                    <thead>
                      <tr>
                        <th className="w-10">#</th>
                        <th>文件名</th>
                        <th className="w-20">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(currentPage?.files ?? []).map((name, i) => (
                        <tr key={name}>
                          <td className="text-muted tabular-nums">{i + 1}</td>
                          <td className="text-ink break-all">{name}</td>
                          <td className="whitespace-nowrap">
                            <a
                              className="text-brand-ink font-medium hover:underline"
                              href={
                                API +
                                '/materials/' +
                                encodeURIComponent(paper[current]?.code ?? '') +
                                '/' +
                                name.split('/').map(encodeURIComponent).join('/')
                              }
                              download={name}
                            >
                              下载
                            </a>
                            {name.endsWith('.docx') ? (
                              <a
                                className="text-brand-ink ml-2 hover:underline"
                                href={API + '/sheet/' + encodeURIComponent(paper[current]?.code ?? '')}
                                target="_blank"
                                rel="noreferrer"
                              >
                                预览
                              </a>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 可折叠的操作说明，减少视觉干扰 */}
              <details className="hairline bg-surface/55 rounded-[12px] p-3">
                <summary className="text-secondary flex cursor-pointer list-none items-center justify-between text-[12px] font-medium">
                  <span>作答与导出说明</span>
                  <ChevronDown size={14} />
                </summary>
                <div className="text-muted mt-2 space-y-2 text-[12px] leading-relaxed">
                  {showJupyter ? (
                    <p>
                      经典 notebook 界面与考场一致：导出请用 File → Download as → HTML(.html)。素材目录即考场工作目录；未发框架时用 New → Python 3 新建。
                    </p>
                  ) : (
                    <p>
                      本题为论述题，无需打开 Jupyter。点「在线填写答题卷」可直接按原卷填写并自动存为 {curCode}.docx，也可下载原卷用 Word 填写。
                    </p>
                  )}
                  <p>参考做法为 AI 对照试题单生成的可运行代码，仅用于对照思路，建议独立完成后查看。</p>
                  {hasSheet ? (
                    <p>
                      答题卷为 Word 二进制文件，在 Jupyter 中双击会提示非 UTF-8；查看原样请点「预览原卷」，填写请点「在线填写答题卷」。
                    </p>
                  ) : null}
                </div>
              </details>
            </div>
          )}
        </section>
      </div>

      {sheetOpen && hasSheet ? (
        <SheetEditor
          key={curCode}
          code={curCode}
          exam={exam?.id ?? ''}
          onClose={() => setSheetOpen(false)}
          onSaved={() => {
            if (exam) void reloadFiles(exam.id, exam.codes);
          }}
        />
      ) : null}

      {error ? <p className="text-danger-ink text-[13px]">{error}</p> : null}
    </div>
  );
}

/* -------------------------------- 判卷结果 -------------------------------- */

function ResultCard({
  result,
  paper,
  auto,
  seconds,
}: {
  result: PaperResult;
  paper: PoolItem[];
  auto: boolean;
  seconds: number;
}) {
  const passed = result.total >= 60;
  return (
    <section className="glass p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`text-[36px] leading-none font-semibold tabular-nums ${passed ? 'text-success-ink' : 'text-danger-ink'}`}>
          {result.total}
          <span className="text-muted ml-1 text-[15px] font-normal">/ {result.max}</span>
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
            passed ? 'bg-success-soft text-success-ink' : 'bg-danger-soft text-danger-ink'
          }`}
        >
          {passed ? '合格' : '不合格（60 分合格）'}
        </span>
        {seconds ? <span className="text-muted text-[13px] tabular-nums">交卷用时 {fmt(seconds)}</span> : null}
        {auto ? (
          <span className="bg-warn-soft text-warn rounded-full px-2.5 py-0.5 text-[12px] font-medium">到点自动交卷</span>
        ) : null}
      </div>

      <p className="bg-warn-soft/55 text-warn mt-3 rounded-[12px] px-3.5 py-2.5 text-[12px] leading-relaxed">
        AI 判分核对材料完整性、文件名与关键代码或字段；截图画面与主观论述深度仅供参考，不等同真实考场成绩。
      </p>

      {result.summary ? <p className="text-secondary mt-3 text-[13px] leading-relaxed">{result.summary}</p> : null}

      <div className="mt-4 space-y-3">
        {result.items.map((it) => {
          const meta = paper.find((p) => p.code === it.code) ?? AI_PRACTICAL_POOL.find((p) => p.code === it.code);
          const ans = answerOf(it.code);
          return (
            <div key={it.code} className="hairline bg-surface/55 rounded-[14px] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 text-[12px] font-semibold tabular-nums">
                    {it.code}
                  </span>
                  <span className="text-ink text-[15px] font-medium">{meta?.title}</span>
                </div>
                <span className="text-ink text-[15px] font-semibold tabular-nums">
                  {it.score} / {it.max} 分
                </span>
              </div>

              {it.points.length ? (
                <ul className="hairline-t mt-3 divide-y divide-[var(--glass-hairline)] pt-1">
                  {it.points.map((p) => {
                    const rubric = meta?.rubric.find((r) => r.id === p.id);
                    const full = rubric?.score ?? 0;
                    const tone =
                      p.got >= full && full > 0
                        ? 'bg-success-soft text-success-ink'
                        : p.got > 0
                          ? 'bg-warn-soft text-warn'
                          : 'bg-danger-soft text-danger-ink';
                    return (
                      <li key={p.id} className="flex items-start gap-2.5 py-2 text-[13px]">
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium tabular-nums ${tone}`}>
                          {p.id} {p.got}/{full}
                        </span>
                        <span className="text-secondary min-w-0 flex-1 leading-relaxed">
                          {rubric?.desc ? rubric.desc + ' ' : ''}
                          {p.why}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {ans ? (
                <details className="mt-3">
                  <summary className="text-brand-ink cursor-pointer text-[12px] font-medium">
                    查看参考答案（第三方整理，非官方）
                  </summary>
                  <pre className="hairline bg-canvas/80 text-secondary mt-2 rounded-[12px] p-3 font-sans text-[13px] leading-relaxed whitespace-pre-wrap">
                    {ans.text}
                  </pre>
                  <p className="text-muted mt-1.5 text-[12px] leading-relaxed">{ans.note}</p>
                </details>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------------------- 在线答题卷 -------------------------------- */

function SheetParaBlock({
  block,
  values,
  set,
}: {
  block: SheetPara;
  values: SheetValues;
  set: (id: string, v: string) => void;
}) {
  const parts = block.parts;
  if (!parts) {
    return <p className="text-secondary text-[13px] leading-relaxed">{block.text}</p>;
  }
  return (
    <p className="text-secondary text-[13px] leading-relaxed">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 ? (
            <input
              className="hairline bg-canvas text-ink focus:border-brand mx-1 min-w-[160px] rounded-[8px] px-2.5 py-1 text-[13px] outline-none"
              value={values[block.id + '#' + i] ?? ''}
              onChange={(e) => set(block.id + '#' + i, e.target.value)}
            />
          ) : null}
        </span>
      ))}
    </p>
  );
}

function SheetEditor({
  code,
  exam,
  onClose,
  onSaved,
}: {
  code: string;
  exam: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const sheet: PracticalSheet | null = sheetOf(code);
  const [values, setValues] = useState<SheetValues>(() => loadSheetDrafts()[code] ?? {});
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const timer = useRef<number | null>(null);
  const latest = useRef<SheetValues>(values);

  const flush = useCallback(
    async (next: SheetValues) => {
      if (!exam) return;
      setState('saving');
      try {
        const r = await fetch(API + '/save-sheet', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ exam, code, values: next }),
        });
        const d = await r.json().catch(() => null);
        if (!r.ok || !d?.ok) throw new Error(d?.error ?? '保存失败');
        setState('saved');
        onSaved();
      } catch (err) {
        setState('error');
        setMsg(err instanceof Error ? err.message : '保存失败');
      }
    },
    [code, exam, onSaved],
  );

  const set = useCallback(
    (id: string, v: string) => {
      const next = { ...latest.current, [id]: v };
      latest.current = next;
      setValues(next);
      const drafts = loadSheetDrafts();
      drafts[code] = next;
      saveJson(SHEET_KEY, drafts);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(next), 900);
    },
    [code, flush],
  );

  const finish = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    void flush(latest.current);
    onClose();
  }, [flush, onClose]);

  if (!sheet) return null;
  const filled = Object.values(values).filter((v) => v.trim()).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 px-3 py-6">
      <div className="glass-panel mx-auto w-full max-w-[900px] p-5 sm:p-6">
        <div className="hairline-b flex flex-wrap items-center justify-between gap-3 pb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-ink text-[15px] font-semibold">在线答题卷 {code}</h3>
              <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums">
                已填 {filled} / {sheet.fieldCount} 处
              </span>
            </div>
            <p className="text-muted mt-1 text-[12px]">
              停手 1 秒自动保存为 {code}.docx，作为判分答卷
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="text-muted text-[12px]">
              {state === 'saving' ? '保存中…' : state === 'saved' ? '已自动保存' : state === 'error' ? msg : ''}
            </span>
            <button type="button" className="pill pill--solid px-4 py-1.5 text-[12px] font-medium" onClick={finish}>
              <Send size={12} />
              保存并关闭
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {sheet.blocks.map((b) =>
            b.kind === 'p' ? (
              <SheetParaBlock key={b.id} block={b} values={values} set={set} />
            ) : (
              <div key={b.id} className="hairline overflow-x-auto rounded-[12px]">
                <table className="glass-table">
                  <tbody>
                    {b.rows.map((row: SheetCell[], ri: number) => (
                      <tr key={ri}>
                        {row.map((cell: SheetCell, ci: number) => (
                          <td key={ci} className="hairline-r last:border-r-0">
                            {cell.field ? (
                              <textarea
                                className="text-ink focus:bg-brand-soft/20 w-full resize-y rounded-[6px] bg-transparent p-1 text-[13px] leading-relaxed outline-none"
                                rows={2}
                                placeholder="在此填写…"
                                value={values[cell.field] ?? ''}
                                onChange={(e) => set(cell.field, e.target.value)}
                              />
                            ) : (
                              <span className="text-secondary whitespace-pre-wrap">{cell.text || '—'}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
