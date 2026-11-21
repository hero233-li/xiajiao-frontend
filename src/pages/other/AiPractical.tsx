import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Code2, Download, ExternalLink, FileText, FileUp, Loader2, Play, RotateCcw, Send, Trash2 } from 'lucide-react';
import { AiPracticalCodeCheck } from './AiPracticalCodeCheck';
import {
  AI_PRACTICAL_COUNT,
  AI_PRACTICAL_POOL,
  AI_PRACTICAL_SECTIONS,
  pickPracticalExamPaper,
  type PoolItem,
} from '../../data/aiPracticalPool';
import { dbDel, dbGet, dbSet, hydrate } from '../../lib/aiDb';
import { answerOf } from '../../data/aiPracticalAnswers';
import { sheetOf, type PracticalSheet, type SheetCell, type SheetPara } from '../../data/aiPracticalSheets';

/* 与考场一致：平台发题、发素材、收文件；代码在 jupyter 里写，导出 html 后上传 */

const SESSION_KEY = 'xj.ai.practical.exam.v3';
const RESULT_KEY = 'xj.ai.practical.results.v1';
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
  return d.getMonth() + 1 + ' 月 ' + d.getDate() + ' 日 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function sectionLabel(code: string) {
  const group = code.split('.').slice(0, 2).join('.');
  const hit = AI_PRACTICAL_SECTIONS.find((s) => s.groups.includes(group));
  return hit?.label ?? '实操题';
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
type SheetBlock = { kind: 'h' | 'p' | 'item' | 'meta'; text: string };

function parseSheetText(text: string): SheetBlock[] {
  const out: SheetBlock[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (/^(试题名称|考核时间)[:：]/.test(line)) {
      out.push({ kind: 'meta', text: line });
      continue;
    }
    if (/^\d{1,2}[.、]\s*\S{1,26}$/.test(line)) {
      out.push({ kind: 'h', text: line });
      continue;
    }
    const parts = line
      .split(/(?=[（(]\d{1,2}[)）])/u)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 1) {
      for (const part of parts) {
        out.push({ kind: /^[（(]\d{1,2}[)）]/.test(part) ? 'item' : 'p', text: part });
      }
      continue;
    }
    out.push({ kind: 'p', text: line });
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
              className="text-ink text-[15px] font-medium"
              style={{ marginTop: i === 0 ? 0 : 16 }}
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
            <div key={i} className="flex gap-2 text-[13px] leading-[1.9]">
              <span className="text-ink shrink-0 tabular-nums">{head}</span>
              <span className="text-secondary">{rest}</span>
            </div>
          );
        }
        return (
          <p key={i} className="text-secondary text-[13px] leading-[1.9]">
            {b.text}
          </p>
        );
      })}
    </div>
  );
}
/* -------------------------------- 学习模式 -------------------------------- */

const STUDY_DONE_KEY = 'xj.ai.practical.study.v1';
/* 学习模式的题号导航按考核项目分组，40 题一眼分段：1 业务分析、2 智能训练、3 智能系统设计、4 培训与指导 */
const PRACTICAL_GROUPS = [
  { key: '1.', label: '业务分析' },
  { key: '2.', label: '智能训练' },
  { key: '3.', label: '智能系统设计' },
  { key: '4.', label: '培训与指导' },
];
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
      .then((d) => setItems(Array.isArray(d?.items) ? (d.items as VariantItem[]) : []))
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
    setResult(null);
    setBusy('');
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
    setResult(null);
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
    <div className="space-y-3">
      <section className="glass px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-ink text-[13px] font-medium">变体练习</span>
          <span className="text-muted text-[13px]">同一考法换数据与参数，练的是看懂题面，不是背骨架</span>
          <button type="button" className="pill ml-auto px-3 py-1.5 text-[12px]" onClick={onExit}>
            退出变体练习
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((it) => (
            <button
              key={it.name}
              type="button"
              onClick={() => setOpenName(it.name === openName ? '' : it.name)}
              className={
                'rounded-md border px-2 py-1 text-[11px] tabular-nums ' +
                (it.name === openName ? 'border-brand text-brand' : 'border-line text-secondary')
              }
            >
              {it.name}
            </button>
          ))}
        </div>
      </section>

      {!cur ? (
        <section className="glass px-4 py-4 text-secondary text-[13px] leading-relaxed sm:px-5">
          <p>上方是变体题号。点一个题号，右边会给出这道变体的题面、数据字段、评分细则和素材下载。</p>
          <p className="mt-2">每道变体都是同样的考法（读数据、按阈值分层、按两个维度分箱求比例与人数），但数据集名、判定字段、阈值、分箱边界、分组字段都换过。考场换题也是这么换的。</p>
          <p className="mt-2">做题顺序：下载素材包解压，用 jupyter 打开 ipynb，只在下划线处补代码，跑出结果后 File → Download as → HTML(.html)，再截图，回到这里上传判分。</p>
        </section>
      ) : (
        <>
          <section className="glass px-4 py-4 sm:px-5">
            <h3 className="text-ink text-[15px] font-medium">
              {cur.name} {cur.title}
            </h3>
            <div className="text-secondary mt-2 space-y-2 text-[13px] leading-relaxed">
              <p>{cur.sheet}</p>
              <p className="text-muted">
                数据集 {cur.csv}，{cur.rows} 行，满分 {total} 分
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a className="pill px-2.5 py-1 text-[12px]" href={API + '/variants/' + encodeURIComponent(cur.name) + '.zip'} download={cur.name + '.zip'}>
                <Download size={12} className="mr-1" />
                打包下载
              </a>
              <a
                className="pill px-2.5 py-1 text-[12px]"
                href={'/jupyter/tree/' + encodeURIComponent('素材') + '/' + encodeURIComponent(cur.name) + (jupyterToken ? '?token=' + encodeURIComponent(jupyterToken) : '')}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={12} className="mr-1" />
                在 jupyter 中作答
              </a>
            </div>
          </section>

          <section className="glass px-4 py-4 sm:px-5">
            <h3 className="text-ink text-[14px] font-medium">评分细则</h3>
            <table className="mt-2 w-full text-[12px]">
              <thead>
                <tr className="text-muted">
                  <th className="w-[12%] border border-[var(--border)] px-1 py-1 text-left font-normal">编号</th>
                  <th className="w-[10%] border border-[var(--border)] px-1 py-1 text-left font-normal">配分</th>
                  <th className="border border-[var(--border)] px-1 py-1 text-left font-normal">评分标准</th>
                </tr>
              </thead>
              <tbody>
                {cur.rubric.map((r) => (
                  <tr key={r.id}>
                    <td className="border border-[var(--border)] px-1 py-1 tabular-nums">{r.id}</td>
                    <td className="border border-[var(--border)] px-1 py-1 tabular-nums">{r.score}</td>
                    <td className="border border-[var(--border)] px-1 py-1">{r.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="glass px-4 py-4 sm:px-5">
            <h3 className="text-ink text-[14px] font-medium">答案上传</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
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
              <button type="button" className="pill pill--solid px-3 py-1.5 text-[12px]" onClick={() => fileRef.current?.click()}>
                <FileUp size={12} className="mr-1" />
                选择文件上传
              </button>
              <button type="button" className="pill px-3 py-1.5 text-[12px]" onClick={() => void grade()} disabled={grading}>
                {grading ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Send size={12} className="mr-1" />}
                提交本题判分
              </button>
              {busy ? <span className="text-muted text-[12px]">{busy}</span> : null}
            </div>
            {files.length ? (
              <ul className="mt-2 space-y-1 text-[12px]">
                {files.map((f) => (
                  <li key={f.name} className="text-secondary flex items-center gap-2">
                    <span>{f.name}</span>
                    <span className="text-muted tabular-nums">{Math.round(f.size / 1024)} KB</span>
                    <button type="button" className="text-muted ml-auto" onClick={() => void removeFile(f.name)}>
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {result ? (
              <div className="mt-3 border-t border-[var(--border)] pt-2">
                <p className="text-ink text-[13px] font-medium tabular-nums">
                  本题得分 {result.score} / {result.max}
                </p>
                <ul className="mt-1 space-y-1 text-[12px]">
                  {result.points.map((p) => (
                    <li key={p.id} className="text-secondary">
                      <span className="tabular-nums">
                        {p.id} {p.got} 分
                      </span>
                      {p.why ? <span className="text-muted">：{p.why}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="glass px-4 py-4 sm:px-5">
            <details>
              <summary className="text-ink cursor-pointer text-[14px] font-medium">参考答案（做完再看）</summary>
              <pre className="text-secondary mt-2 overflow-x-auto whitespace-pre-wrap text-[12px] leading-relaxed">{cur.ref}</pre>
            </details>
          </section>
        </>
      )}
    </div>
  );
}
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
  const [jupyterToken, setJupyterToken] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [busy, setBusy] = useState('');
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<ItemResult | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [lab, setLab] = useState(false);

  const item = AI_PRACTICAL_POOL[index];
  const page = localPages.find((p) => p.code === item.code);
  const list = page?.files ?? [];
  const ans = answerOf(item.code);
  const hasNotebook = list.includes(item.code + '.ipynb');
  const hasData = list.some((n) => /\.(csv|xlsx|xls)$/i.test(n));
  const showJupyter = hasNotebook || hasData;
  const hasSheet = list.some((n) => n.endsWith('.docx'));

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

  /* 换题：清掉上一题的判分结果与文件列表 */
  useEffect(() => {
    setResult(null);
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

  const doUpload = useCallback(
    async (file: File) => {
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
          body: JSON.stringify({ exam: STUDY_EXAM, code: item.code, name: file.name, data: b64 }),
        });
        const d = await res.json().catch(() => null);
        if (!res.ok || !d?.ok) throw new Error(d?.error ?? '上传失败');
        await reload(item.code);
        setBusy('文件上传成功：' + file.name);
        window.setTimeout(() => setBusy(''), 2600);
      } catch (err) {
        setBusy(err instanceof Error ? err.message : '上传失败');
        window.setTimeout(() => setBusy(''), 4000);
      }
    },
    [item.code, reload],
  );

  const removeFile = useCallback(
    async (name: string) => {
      await fetch(API + '/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ exam: STUDY_EXAM, code: item.code, name }),
      }).catch(() => undefined);
      await reload(item.code);
    },
    [item.code, reload],
  );

  const grade = useCallback(async () => {
    if (grading) return;
    if (!files.length) {
      setBusy('先上传这道题的答案文件，再判分');
      window.setTimeout(() => setBusy(''), 3000);
      return;
    }
    setGrading(true);
    setResult(null);
    setBusy('AI 正在按评分细则判这道题');
    try {
      const res = await fetch(API + '/grade', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          exam: STUDY_EXAM,
          answers: [
            {
              code: item.code,
              title: item.title,
              score: item.score,
              sheet: item.sheet,
              rubric: item.rubric,
              ref: ans?.text ?? '',
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
  }, [ans, files.length, grading, item]);

  if (lab) return <VariantLab onExit={() => setLab(false)} />;

  const doneCount = Object.keys(done).filter((k) => done[k]).length;
  const go = (delta: number) => setIndex((i) => Math.min(AI_PRACTICAL_POOL.length - 1, Math.max(0, i + delta)));

  return (
    <div className="space-y-3">
      <section className="glass px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-ink text-[13px] font-medium">学习模式</span>
          <span className="text-muted text-[13px] tabular-nums">
            第 {index + 1} / {AI_PRACTICAL_POOL.length} 题
          </span>
          <span className="text-muted text-[13px] tabular-nums">已标完成 {doneCount} 题</span>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="pill px-3 py-1.5 text-[12px]" onClick={() => go(-1)} disabled={index === 0}>
              上一题
            </button>
            <button type="button" className="pill px-3 py-1.5 text-[12px]" onClick={() => go(1)} disabled={index === AI_PRACTICAL_POOL.length - 1}>
              下一题
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
        </div>
        <div className="border-line mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t pt-3">
          <span className="text-ink text-[13px] font-medium tabular-nums">{item.code}</span>
          <span className="text-secondary text-[13px]">{sectionLabel(item.code)}</span>
          <span className="text-muted text-[13px] tabular-nums">{item.minutes} 分钟</span>
          <span className="text-muted text-[13px] tabular-nums">{item.score} 分</span>
        </div>
        <div className="mt-3 space-y-1.5">
          {PRACTICAL_GROUPS.map((g) => (
            <div key={g.key} className="flex items-start gap-3">
              <span className="text-muted mt-[5px] w-[76px] shrink-0 text-[12px] leading-none">{g.label}</span>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {AI_PRACTICAL_POOL.map((q, i) => ({ q, i }))
                  .filter((x) => x.q.code.startsWith(g.key))
                  .map(({ q, i }) => (
                    <button
                      key={q.code}
                      type="button"
                      onClick={() => setIndex(i)}
                      className={
                        'flex items-center gap-1 rounded-md border px-1.5 py-1 text-[11px] leading-none tabular-nums transition ' +
                        (i === index
                          ? 'border-brand bg-brand/10 text-brand font-medium'
                          : done[q.code]
                            ? 'border-line text-muted'
                            : 'border-line text-secondary hover:border-brand/40')
                      }
                    >
                      {done[q.code] && i !== index ? <span className="h-1 w-1 rounded-full bg-current" /> : null}
                      {q.code}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass px-4 py-4 sm:px-5">
        <h3 className="text-ink text-[15px] font-medium">{item.title}</h3>
        <div className="mt-3 max-w-[78ch]">
          <SheetBody text={item.sheet} />
        </div>
      </section>

      <section className="glass px-4 py-4 sm:px-5">
        <h3 className="text-ink text-[14px] font-medium">评分细则</h3>
        <table className="mt-2 w-full text-[12px]">
          <thead>
            <tr className="text-muted">
              <th className="w-[12%] border border-[var(--border)] px-1 py-1 text-left font-normal">编号</th>
              <th className="w-[10%] border border-[var(--border)] px-1 py-1 text-left font-normal">配分</th>
              <th className="border border-[var(--border)] px-1 py-1 text-left font-normal">评分标准</th>
            </tr>
          </thead>
          <tbody>
            {item.rubric.map((r) => (
              <tr key={r.id}>
                <td className="border border-[var(--border)] px-1 py-1 tabular-nums">{r.id}</td>
                <td className="border border-[var(--border)] px-1 py-1 tabular-nums">{r.score}</td>
                <td className="border border-[var(--border)] px-1 py-1">{r.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="glass px-4 py-4 sm:px-5">
        <h3 className="text-ink text-[14px] font-medium">素材下载</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <a className="pill px-2.5 py-1 text-[12px]" href={API + '/materials/' + encodeURIComponent(item.code) + '.zip'} download={item.code + '.zip'}>
            <Download size={12} className="mr-1" />
            打包下载
          </a>
          {showJupyter ? (
            <a
              className="pill px-2.5 py-1 text-[12px]"
              href={'/jupyter/tree/' + encodeURIComponent('素材') + '/' + encodeURIComponent(item.code) + (jupyterToken ? '?token=' + encodeURIComponent(jupyterToken) : '')}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={12} className="mr-1" />
              在 jupyter 中作答
            </a>
          ) : null}
          {hasSheet ? (
            <a className="pill px-2.5 py-1 text-[12px]" href={API + '/sheet/' + encodeURIComponent(item.code)} target="_blank" rel="noreferrer">
              <FileText size={12} className="mr-1" />
              预览答题卷
            </a>
          ) : null}
        </div>
        <ul className="mt-2 space-y-1 text-[12px]">
          {list.map((name) => (
            <li key={name}>
              <a
                className="text-brand break-all"
                href={API + '/materials/' + encodeURIComponent(item.code) + '/' + name.split('/').map(encodeURIComponent).join('/')}
                download={name}
              >
                {name}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass px-4 py-4 sm:px-5">
        <h3 className="text-ink text-[14px] font-medium">答案上传</h3>
        <table className="mt-2 w-full text-[12px]">
          <thead>
            <tr className="text-muted">
              <th className="w-[10%] border border-[var(--border)] px-1 py-1 text-left font-normal">序号</th>
              <th className="border border-[var(--border)] px-1 py-1 text-left font-normal">要求</th>
            </tr>
          </thead>
          <tbody>
            {(page?.uploads ?? []).map((u, i) => (
              <tr key={u.seq + i}>
                <td className="border border-[var(--border)] px-1 py-1 tabular-nums">{u.seq}</td>
                <td className="border border-[var(--border)] px-1 py-1 break-all">{u.requirement}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" className="pill px-2.5 py-1 text-[12px]" onClick={() => fileRef.current?.click()} disabled={grading}>
            <FileUp size={12} className="mr-1" />
            选择文件上传
          </button>
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
          <button type="button" className="pill pill--solid px-3 py-1 text-[12px]" onClick={() => void grade()} disabled={grading}>
            {grading ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Send size={12} className="mr-1" />}
            {grading ? '判分中' : '提交本题判分'}
          </button>
          {busy ? <span className="text-brand text-[12px]">{busy}</span> : null}
        </div>
        {files.length ? (
          <ul className="mt-2 space-y-1 text-[12px]">
            {files.map((f) => (
              <li key={f.name} className="flex flex-wrap items-baseline gap-2">
                <span className="text-secondary break-all">{f.name}</span>
                <span className="text-muted tabular-nums">{kb(f.size)}</span>
                <button type="button" className="text-danger" onClick={() => void removeFile(f.name)} disabled={grading}>
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted mt-2 text-[12px]">还没上传这道题的答案文件。</p>
        )}
      </section>

      {result ? (
        <section className="glass px-4 py-4 sm:px-5">
          <h3 className="text-ink text-[14px] font-medium">
            本题判分 <span className="tabular-nums">{result.score} / {result.max}</span>
          </h3>
          <ul className="mt-2 space-y-1.5">
            {result.points.map((p) => (
              <li key={p.id} className="text-secondary flex flex-wrap items-baseline gap-2 text-[12.5px]">
                <span className="text-muted tabular-nums">{p.id}</span>
                <span className={'tabular-nums ' + (p.got > 0 ? 'text-accent-green' : 'text-danger')}>{p.got}</span>
                <span className="break-all">{p.why}</span>
              </li>
            ))}
          </ul>
          <p className="text-muted mt-2 text-[12px] leading-relaxed">AI 判分只看你上传的文件，看不出的内容它给不了分。</p>
        </section>
      ) : null}

      {ans ? (
        <section className="glass px-4 py-4 sm:px-5">
          <h3 className="text-ink text-[14px] font-medium">参考答案</h3>
          <pre className="text-secondary mt-2 font-sans text-[12.5px] leading-relaxed whitespace-pre-wrap">{ans.text}</pre>
          <p className="text-muted mt-2 text-[12px] leading-relaxed">{ans.note}</p>
        </section>
      ) : (
        <section className="glass px-4 py-3 sm:px-5">
          <p className="text-muted text-[12.5px]">这道题官方没给参考答案，按上面的评分细则自己写。</p>
        </section>
      )}

      <section className="glass flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
        <button
          type="button"
          className={done[item.code] ? 'pill px-4 py-2 text-[13px]' : 'pill pill--solid px-4 py-2 text-[13px]'}
          onClick={() => setDone((d) => ({ ...d, [item.code]: !d[item.code] }))}
        >
          {done[item.code] ? '取消完成标记' : '标记这道题已学完'}
        </button>
        <span className="text-muted text-[12px]">按官方题号顺序 1.1.1 到 4.2.5 一道一道过，进度存在服务器上。</span>
      </section>
    </div>
  );
}

/* ---------------------------------- 组件 ---------------------------------- */

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
  /* 学习模式：按官方题号顺序 1.1.1 → 4.2.5 一道一道过，不抽题、不计时 */
  const [study, setStudy] = useState(false);
  /* 代码盲填检测模式：20 道 Python 实操题行内填空 0 秒判分 */
  const [codeCheck, setCodeCheck] = useState(false);

  const [cloudReady, setCloudReady] = useState(false);
  const submitting = useRef(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const reloadFiles = useCallback(
    async (sid: string, codes: string[]) => {
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
    },
    [],
  );

  /* 云端记录读齐之前不渲染，也不允许把空数据写回去 */
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

  /* 题面 + jupyter token */
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

  /* 恢复未完成的考试 */
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
    setPaper(found);
    setExam(saved);
    setRemaining(left);
    setCurrent(0);
    setPhase('writing');
    void reloadFiles(saved.id, saved.codes);
  }, [reloadFiles]);

  /* 全卷倒计时：考场只控总时长，分题时间是建议值 */
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

  const begin = useCallback(async () => {
    setError('');
    setResult(null);
    setAutoSubmitted(false);
    setPhase('loading');
    try {
      const all = pages.length ? pages : await loadPages();
      setPages(all);
      const nextPaper = pickPracticalExamPaper();
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
      setPhase('writing');
      saveJson(SESSION_KEY, session);
      void reloadFiles(sid, session.codes);
    } catch (err) {
      setError(err instanceof Error ? err.message : '题面加载失败');
      setPhase('error');
    }
  }, [pages, reloadFiles]);

  const submit = useCallback(
    async (auto = false) => {
      if (submitting.current || !exam) return;
      if (!auto && !window.confirm('交卷后不能再改，开始判分？')) return;
      submitting.current = true;
      setPhase('grading');
      setError('');
      setResult(null);
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
              /* 第三方整理的参考要点，只作为判分时的对照，不要求学生逐字对上 */
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

  /* 全卷到点：自动交卷 */
  useEffect(() => {
    if (phase !== 'writing' || !tickedRef.current || remaining > 0) return;
    void submit(true);
  }, [phase, remaining, submit]);

  const clearAll = useCallback(() => {
    if (!window.confirm('清空这台设备与云端的实操记录？未交卷的试卷也会一起清掉。')) return;
    dbDel(RESULT_KEY);
    dbDel(SESSION_KEY);
    setHistory([]);
    setResult(null);
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
  /* 有没有发 notebook 或数据集：决定这道题该不该出现 jupyter 入口（1.2.x、4.x 这类纯论述题没有） */
  const hasNotebook = pageFiles.includes(curCode + '.ipynb');
  const hasData = pageFiles.some((n) => /\.(csv|xlsx|xls)$/i.test(n));
  const showJupyter = hasNotebook || hasData;
  const hasSheet = pageFiles.some((n) => n.endsWith('.docx'));

  /* 换题时把答题卷面板收起来 */
  useEffect(() => {
    setSheetOpen(false);
  }, [curCode]);
  const overtime = remaining <= 5 * 60 && phase === 'writing';
  const best = useMemo(() => (history.length ? Math.max(...history.map((h) => h.total)) : null), [history]);
  const uploadedTotal = useMemo(() => Object.values(uploads).reduce((n, fs) => n + fs.length, 0), [uploads]);

  /* --------------------------------- 渲染 --------------------------------- */

  if (codeCheck) {
    return <AiPracticalCodeCheck onExit={() => setCodeCheck(false)} />;
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
        <section className="glass px-4 py-5 sm:px-6">
          <h2 className="text-ink text-[22px] font-semibold">人工智能训练师（三级）操作技能考核</h2>
          {error ? <p className="text-danger-ink mt-3 text-[13px]">{error}</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="pill pill--solid px-5 py-2.5 text-[13px]"
              onClick={() => void begin()}
              disabled={phase === 'loading'}
            >
              {phase === 'loading' ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Play size={14} className="mr-1.5" />}
              {phase === 'loading' ? '正在组卷' : '开始考试'}
            </button>
            <button type="button" className="pill px-4 py-2.5 text-[13px]" onClick={() => setCodeCheck(true)}>
              <Code2 size={14} className="mr-1.5" />
              代码盲填检测（20 题秒判）
            </button>
            <button type="button" className="pill px-4 py-2.5 text-[13px]" onClick={() => setStudy(true)}>
              <FileText size={14} className="mr-1.5" />
              学习模式（按题号顺序练 40 题）
            </button>
            {best !== null ? <span className="text-muted text-[13px]">历史最高 {best} 分</span> : null}
          </div>
        </section>

        {result ? <ResultCard result={result} paper={paper} auto={autoSubmitted} seconds={history[0]?.seconds ?? 0} /> : null}
        {history.length ? (
          <section className="glass px-4 py-4 sm:px-5">
            <h3 className="text-ink text-[14px] font-medium">历史交卷</h3>
            <ul className="mt-2 space-y-1.5">
              {history.map((h) => (
                <li key={h.at} className="text-muted flex flex-wrap items-baseline gap-x-4 text-[13px]">
                  <span className="tabular-nums">{stamp(h.at)}</span>
                  <span className={'tabular-nums ' + (h.total >= 60 ? 'text-success-ink' : 'text-ink')}>
                    {h.total} / {h.max} 分
                  </span>
                  <span className="tabular-nums">用时 {fmt(h.seconds)}</span>
                  <span className="tabular-nums">{h.codes?.join(' ') ?? ''}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }

  if (phase === 'grading') {
    return (
      <div className="space-y-4">
        <section className="glass px-4 py-8 text-center sm:px-6">
          <Loader2 size={22} className="text-brand mx-auto animate-spin" />
          <p className="text-ink mt-3 text-[15px] font-medium">AI 正在按官方评分细则逐题判卷</p>
          <p className="text-muted mt-1 text-[13px]">已等 {waitTick} 秒，通常需要 1 到 3 分钟</p>
        </section>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="space-y-4">
        {result ? <ResultCard result={result} paper={paper} auto={autoSubmitted} seconds={history[0]?.seconds ?? 0} /> : null}
        {error ? <p className="text-danger-ink glass px-4 py-3 text-[13px]">{error}</p> : null}
        <section className="glass flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
          <button type="button" className="pill pill--solid px-4 py-2 text-[13px]" onClick={() => void begin()}>
            <Play size={14} className="mr-1.5" />
            再考一场
          </button>
          <button type="button" className="pill px-3 py-2 text-[13px]" onClick={clearAll}>
            <RotateCcw size={13} className="mr-1.5" />
            清空记录
          </button>
        </section>
      </div>
    );
  }

  if (!cloudReady) {
    return <div className="text-secondary p-8 text-[13px]">正在读取云端记录…</div>;
  }

  return (
    <div className="space-y-3">
      {/* 顶部考生条 */}
      <section className="glass px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-ink text-[13px]">
            考生：<span className="font-medium">自学考生</span>
            <span className="text-muted ml-3">试卷：人工智能训练师（三级）操作技能</span>
          </span>
          <span className="text-muted text-[13px]">
            已上传 {uploadedTotal} 个文件
          </span>
          <span className="ml-auto flex items-baseline gap-2">
            <span className="text-muted text-[12px]">全卷剩余</span>
            <span className={'text-[22px] font-semibold tabular-nums ' + (overtime ? 'text-danger-ink' : 'text-brand')}>
              {fmt(remaining)}
            </span>
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Clock size={13} className="text-muted" />
          {paper.map((item, i) => {
            const n = (uploads[item.code] ?? []).length;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setCurrent(i);
                  setTab('upload');
                }}
                className={
                  'pill px-2.5 py-1 text-[12px] ' + (i === current ? 'pill--solid' : n ? 'text-success-ink' : '')
                }
                title={'第 ' + (i + 1) + ' 题 ' + item.code + '，建议 ' + item.minutes + ' 分钟'}
              >
                第 {i + 1} 题
                {n ? ' ' + n : ''}
              </button>
            );
          })}
          <button
            type="button"
            className="pill ml-auto px-3 py-1.5 text-[12px]"
            onClick={() => setCurrent((c) => Math.min(paper.length - 1, c + 1))}
          >
            <ChevronRight size={12} className="mr-1" />
            下一题
          </button>
          <button type="button" className="pill px-3 py-1.5 text-[12px]" onClick={() => void submit(false)}>
            <Send size={12} className="mr-1.5" />
            交卷
          </button>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* 左：试题单 */}
        <section className="glass px-4 py-4 sm:px-5">
          <div className="text-muted mb-2 text-[12px]">
            第 {current + 1} 题 {sectionLabel(paper[current]?.code ?? '')} 考核时间 {paper[current]?.minutes} 分值{' '}
            {paper[current]?.score} 分
          </div>
          {currentPage ? (
            <div className="space-y-3">
              {currentPage.sections.map((sec) => (
                <div key={sec.head}>
                  <h3 className="text-ink text-[15px] font-medium">{sec.head}</h3>
                  {sec.blocks.length ? (
                    <div className="text-muted mt-1 space-y-1 text-[13px] leading-relaxed">
                      {sec.blocks.map((b, i) =>
                        b.kind === 'table' ? (
                          <div
                            key={i}
                            className="overflow-x-auto text-[12.5px] [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[var(--border)] [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-[var(--border)] [&_th]:bg-black/[0.03] [&_th]:px-2 [&_th]:py-1"
                            dangerouslySetInnerHTML={{ __html: b.html }}
                          />
                        ) : (
                          <p key={i} dangerouslySetInnerHTML={{ __html: b.html }} />
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-[13px]">正在加载本题题面</p>
          )}
        </section>

        {/* 右：上传与素材 */}
        <section className="glass h-fit px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={'pill px-3 py-1.5 text-[12px] ' + (tab === 'upload' ? 'pill--solid' : '')}
              onClick={() => setTab('upload')}
            >
              答案上传
            </button>
            <button
              type="button"
              className={'pill px-3 py-1.5 text-[12px] ' + (tab === 'materials' ? 'pill--solid' : '')}
              onClick={() => setTab('materials')}
            >
              素材下载
            </button>
          </div>

          {tab === 'upload' ? (
            <div className="mt-3">
              <h3 className="text-ink text-[14px] font-medium">注意事项</h3>
              <ul className="text-muted mt-1 space-y-1 text-[12px] leading-relaxed">
                {(currentPage?.notes ?? []).map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
              <h3 className="text-ink mt-3 text-[14px] font-medium">答案上传</h3>
              <table className="mt-1 w-full table-fixed text-[12px]">
                <thead>
                  <tr className="text-muted">
                    <th className="w-[10%] border border-[var(--border)] px-1 py-1 text-left font-normal">序号</th>
                    <th className="w-[52%] border border-[var(--border)] px-1 py-1 text-left font-normal">要求</th>
                    <th className="w-[38%] border border-[var(--border)] px-1 py-1 text-left font-normal">上传</th>
                  </tr>
                </thead>
                <tbody>
                  {(currentPage?.uploads ?? []).map((u) => (
                    <tr key={u.seq}>
                      <td className="border border-[var(--border)] px-1 py-1 tabular-nums">{u.seq}</td>
                      <td className="text-muted border border-[var(--border)] px-1 py-1">{u.requirement}</td>
                      <td className="border border-[var(--border)] px-1 py-1">
                        <button
                          type="button"
                          className="pill px-2 py-0.5 text-[11px]"
                          onClick={() => fileRef.current?.click()}
                        >
                          <FileUp size={11} className="mr-1" />
                          上传
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {currentFiles.length ? (
                <ul className="mt-2 space-y-1">
                  {currentFiles.map((f) => (
                    <li key={f.name} className="text-muted flex items-center gap-2 text-[12px]">
                      <span className="text-success-ink">已上传</span>
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      <span className="tabular-nums">{kb(f.size)}</span>
                      <button
                        type="button"
                        className="text-muted hover:text-danger-ink"
                        onClick={() => void removeFile(f.name)}
                        aria-label="删除"
                      >
                        <Trash2 size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mt-2 text-[12px]">本题还没上传文件，未上传的评分点按 0 分算。</p>
              )}
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
              {busy ? <p className="text-brand mt-2 text-[12px]">{busy}</p> : null}
            </div>
          ) : (
            <div className="mt-3">
              <h3 className="text-ink text-[14px] font-medium">文件列表</h3>
              <table className="mt-1 w-full text-[12px]">
                <thead>
                  <tr className="text-muted">
                    <th className="w-[10%] border border-[var(--border)] px-1 py-1 text-left font-normal">序号</th>
                    <th className="border border-[var(--border)] px-1 py-1 text-left font-normal">文件名</th>
                    <th className="w-[18%] border border-[var(--border)] px-1 py-1 text-left font-normal">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(currentPage?.files ?? []).map((name, i) => (
                    <tr key={name}>
                      <td className="border border-[var(--border)] px-1 py-1 tabular-nums">{i + 1}</td>
                      <td className="border border-[var(--border)] px-1 py-1 break-all">{name}</td>
                      <td className="border border-[var(--border)] px-1 py-1 whitespace-nowrap">
                        <a
                          className="text-brand"
                          href={API + '/materials/' + encodeURIComponent(paper[current]?.code ?? '') + '/' + name.split('/').map(encodeURIComponent).join('/')}
                          download={name}
                        >
                          下载
                        </a>
                        {name.endsWith('.docx') ? (
                          <a
                            className="text-brand ml-2"
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
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  className="pill px-2.5 py-1 text-[12px]"
                  href={API + '/materials/' + encodeURIComponent(paper[current]?.code ?? '') + '.zip'}
                  download={(paper[current]?.code ?? 'materials') + '.zip'}
                >
                  <Download size={12} className="mr-1" />
                  打包下载
                </a>
                {hasSheet ? (
                  <button
                    type="button"
                    className="pill pill--solid px-2.5 py-1 text-[12px]"
                    onClick={() => setSheetOpen(true)}
                  >
                    <FileText size={12} className="mr-1" />
                    在线填写答题卷
                  </button>
                ) : null}
                {hasSheet ? (
                  <a
                    className="pill px-2.5 py-1 text-[12px]"
                    href={API + '/sheet/' + encodeURIComponent(curCode)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    预览原卷
                  </a>
                ) : null}
                {showJupyter ? (
                  <a
                    className="pill pill--solid px-2.5 py-1 text-[12px]"
                    href={'/jupyter/tree/' + encodeURIComponent('素材') + '/' + encodeURIComponent(curCode) + '?token=' + jupyterToken}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={12} className="mr-1" />
                    在 jupyter 中作答
                  </a>
                ) : null}
                {hasNotebook ? (
                  <a
                    className="pill px-2.5 py-1 text-[12px]"
                    href={'/jupyter/notebooks/' + encodeURIComponent('素材') + '/' + encodeURIComponent(curCode) + '/' + encodeURIComponent(curCode + '.ipynb') + '?token=' + jupyterToken}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={12} className="mr-1" />
                    打开本题 notebook
                  </a>
                ) : null}
                {REF_CODES.has(curCode) ? (
                  <a
                    className="pill px-2.5 py-1 text-[12px]"
                    href={'/jupyter/notebooks/' + encodeURIComponent('素材') + '/' + encodeURIComponent(curCode) + '/' + encodeURIComponent(curCode + '_ref.ipynb') + '?token=' + jupyterToken}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText size={12} className="mr-1" />
                    参考做法（AI 生成）
                  </a>
                ) : null}
              </div>
              {showJupyter ? (
                <p className="text-muted mt-2 text-[12px] leading-relaxed">
                  现在是经典 notebook 界面（和考场同款）：导出用 File → Download as → HTML(.html)。考场里 jupyter 的工作目录是 D:\jupyter_notebook，本题素材目录就相当于那个位置（平台把素材解压到考生文件夹后在里面起 jupyter，效果一样）。本题没发 notebook 框架的，用 New → Python 3 自己新建即可。
                </p>
              ) : (
                <p className="text-muted mt-2 text-[12px] leading-relaxed">
                  本题是论述题，按试题单把答案写进答题卷就行，不用开 jupyter。点「在线填写答题卷」可以直接在网页里按原卷的表格和空格逐处填写，填完自动存成 {curCode}.docx 交上去，也可以下载原卷用 Word 填。
                </p>
              )}
              <p className="text-muted mt-1 text-[12px] leading-relaxed">
                参考做法是 AI 照着试题单写的一份可运行代码，只用来对照思路。建议先自己写完再看，真考不提供这个。
              </p>
              {hasSheet ? (
                <p className="text-muted mt-1 text-[12px] leading-relaxed">
                  答题卷是 Word 二进制文件，jupyter 里双击它只会报「is not UTF-8 encoded」，看不到内容——那是加载不了，不是文件坏了。
                  想照原样看就点「预览原卷」；要打字就点「在线填写答题卷」，按字段填完自动存成 {curCode}.docx（这份就是判分用的答卷）。
                </p>
              ) : null}
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

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="pill px-3 py-1.5 text-[12px]"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
        >
          <ChevronLeft size={12} className="mr-1" />
          上一题
        </button>
        <button
          type="button"
          className="pill px-3 py-1.5 text-[12px]"
          onClick={() => setCurrent((c) => Math.min(paper.length - 1, c + 1))}
          disabled={current >= paper.length - 1}
        >
          下一题
          <ChevronRight size={12} className="ml-1" />
        </button>
        {error ? <span className="text-danger-ink text-[12px]">{error}</span> : null}
      </div>
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
  return (
    <section className="glass px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <span className="text-ink text-[22px] font-semibold tabular-nums">
          {result.total} / {result.max}
        </span>
        <span className={'text-[13px] ' + (result.total >= 60 ? 'text-success-ink' : 'text-danger-ink')}>
          {result.total >= 60 ? '合格' : '不合格（60 分合格）'}
        </span>
        {seconds ? <span className="text-muted text-[12px]">交卷用时 {fmt(seconds)}</span> : null}
        {auto ? <span className="text-warn text-[12px]">到点自动交卷</span> : null}
      </div>
      <p className="text-warn mt-2 text-[12px] leading-relaxed">
        AI 判分只核对材料是否齐全、文件名和关键代码或字段是否对上；截图里画得对不对、文档写得好不好它看不出来。这个分数用来查漏，不等于真实考场成绩。
      </p>
      {result.summary ? <p className="text-muted mt-2 text-[13px] leading-relaxed">{result.summary}</p> : null}
      <div className="mt-3 space-y-3">
        {result.items.map((it) => {
          const meta = paper.find((p) => p.code === it.code) ?? AI_PRACTICAL_POOL.find((p) => p.code === it.code);
          const ans = answerOf(it.code);
          return (
            <div key={it.code}>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-ink text-[14px] font-medium tabular-nums">
                  {it.code} {it.score} / {it.max}
                </span>
                <span className="text-muted text-[12px]">{meta?.title}</span>
              </div>
              {it.points.length ? (
                <ul className="mt-1 space-y-1">
                  {it.points.map((p) => {
                    const rubric = meta?.rubric.find((r) => r.id === p.id);
                    const full = rubric?.score ?? 0;
                    return (
                      <li key={p.id} className="flex items-baseline gap-2 text-[12.5px]">
                        <span
                          className={
                            'w-16 shrink-0 tabular-nums ' +
                            (p.got >= full && full > 0 ? 'text-success-ink' : p.got > 0 ? 'text-ink' : 'text-danger-ink')
                          }
                        >
                          {p.id} {p.got}/{full}
                        </span>
                        <span className="text-muted min-w-0 flex-1">
                          {rubric?.desc ? rubric.desc + ' ' : ''}
                          {p.why}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {ans ? (
                <details className="mt-2">
                  <summary className="text-brand cursor-pointer text-[12px]">参考答案（第三方整理，非官方）</summary>
                  <pre className="text-secondary mt-1 font-sans text-[12.5px] leading-relaxed whitespace-pre-wrap">
                    {ans.text}
                  </pre>
                  <p className="text-muted mt-1 text-[12px] leading-relaxed">{ans.note}</p>
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
              className="border-line bg-surface-2 text-ink mx-1 min-w-[160px] rounded-md border px-2 py-0.5 text-[13px] outline-none"
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
      <div className="glass mx-auto w-full max-w-[880px] px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-ink text-[15px] font-semibold">答题卷 {code}</h3>
            <p className="text-muted mt-0.5 text-[12px] leading-relaxed">
              按原卷的表格和空格逐处填写，共 {sheet.fieldCount} 处，已填 {filled} 处。停手 1 秒自动保存成 {code}
              .docx，这份就是判分用的答卷。
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-muted text-[12px]">
              {state === 'saving' ? '保存中…' : state === 'saved' ? '已保存' : state === 'error' ? msg : ''}
            </span>
            <button type="button" className="pill pill--solid px-3 py-1.5 text-[12px]" onClick={finish}>
              <Send size={12} className="mr-1" />
              保存并关闭
            </button>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {sheet.blocks.map((b) =>
            b.kind === 'p' ? (
              <SheetParaBlock key={b.id} block={b} values={values} set={set} />
            ) : (
              <div key={b.id} className="overflow-x-auto">
                <table className="w-full border-collapse text-[12.5px]">
                  <tbody>
                    {b.rows.map((row: SheetCell[], ri: number) => (
                      <tr key={ri}>
                        {row.map((cell: SheetCell, ci: number) => (
                          <td key={ci} className="border-line border px-2 py-1 align-top">
                            {cell.field ? (
                              <textarea
                                className="text-ink w-full resize-y bg-transparent text-[12.5px] leading-relaxed outline-none"
                                rows={2}
                                placeholder="（填写处）"
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
