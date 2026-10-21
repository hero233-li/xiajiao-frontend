import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bankRequest } from '../../api/bank';
import { listCourses } from '../../api/generated/courses/courses';
import { useCycle } from '../cycle/CycleContext';
import { FileImage, Upload, Clock3, RefreshCw } from 'lucide-react';
type Photo = { fileId: string; pageNo: number; name: string; mimeType: string; sizeBytes: number };
type Answer = {
  number: string;
  recognizedAnswer: string;
  pages: number[];
  reviewItems: string[];
  points: { pointId: string; score: number; reason: string }[];
};
type Attempt = {
  id: string;
  packId: string;
  title: string;
  state: string;
  pages: Photo[];
  workerOnline: boolean;
  workerReason: string;
  error: string | null;
  model: string | null;
  maximums: { number: string; maximum: number }[];
  practice: { minutes: number; closedBook: boolean; answersSeenBefore: boolean; complete: boolean };
  result: { answers: Answer[]; reviewItems: string[] } | null;
};
type Draft = {
  pages: Photo[];
  minutes: number;
  closedBook: boolean;
  answersSeen: boolean;
  pagesComplete: boolean;
  requestId: string;
};
const labels: Record<string, string> = {
  QUEUED: '排队等待批改',
  GRADING: '正在识别与批改',
  REVIEW: '批改完成，有待核对项',
  COMPLETED: '批改完成',
  FAILED: '批改失败',
};
function Thumbnail({ photo }: { photo: Photo }) {
  const q = useQuery({
    queryKey: ['rapid-photo', photo.fileId],
    queryFn: () =>
      bankRequest<{ mimeType: string; contentBase64: string }>(`/rapid/materials/${photo.fileId}`),
    staleTime: Infinity,
  });
  return (
    <>
      {q.data ? (
        <img src={`data:${q.data.mimeType};base64,${q.data.contentBase64}`} alt={photo.name} />
      ) : (
        <p>{q.isError ? '预览加载失败，照片仍保留' : '正在读取照片…'}</p>
      )}
      {q.isError && <button onClick={() => void q.refetch()}>重试预览</button>}
    </>
  );
}
function ResultView({ attempt }: { attempt: Attempt }) {
  const result = attempt.result;
  if (!result) return null;
  const max = (no: string) => attempt.maximums.find((q) => q.number === no)?.maximum || 0;
  const needs = (a: Answer) =>
    a.reviewItems.length > 0 || a.pages.length === 0 || result.reviewItems.length > 0;
  const correct = result.answers.filter(
    (a) => !needs(a) && a.points.reduce((n, p) => n + p.score, 0) === max(a.number),
  );
  const wrong = result.answers.filter((a) => !needs(a) && !correct.includes(a));
  const uncertain = result.answers.filter(needs);
  const independent =
    attempt.practice.closedBook && !attempt.practice.answersSeenBefore && attempt.practice.complete;
  return (
    <section className="rapid-result">
      <h3>本次逐题反馈</h3>
      <p className="rapid-note">
        AI识别与练习评分可能有误，请对照原图。待核对的题不计零分、不判断能力。只用于选下一学习块，不预测整科成绩。
      </p>
      {!attempt.practice.complete && (
        <p className="rapid-note">
          本次注明照片未拍齐，完整性尚未确认；请补齐照片重新提交，未拍到不等于不会。
        </p>
      )}
      {result.reviewItems.map((r, i) => (
        <p key={i}>待核对：{r}</p>
      ))}
      {result.answers.map((a) => (
        <article className="rapid-answer" key={a.number}>
          <h4>
            {a.number} ·{' '}
            {needs(a)
              ? '图片识别或缺页待核对'
              : `${a.points.reduce((n, p) => n + p.score, 0)}/${max(a.number)}（练习用）`}
          </h4>
          <p>识别作答：{a.recognizedAnswer || '未能可靠识别'}</p>
          <p>引用照片：{a.pages.length ? a.pages.join('、') : '尚未可靠关联'}</p>
          {a.reviewItems.map((r, i) => (
            <p key={i}>待核对：{r}</p>
          ))}
          {a.points.map((p) => (
            <p key={p.pointId}>
              {needs(a) ? '待核对' : `${p.score}分`} · {p.reason}
            </p>
          ))}
        </article>
      ))}
      <div className="rapid-card">
        <h3>接下来只做一小步</h3>
        <ol>
          <li>
            这次能完成：
            {correct.length
              ? correct.map((a) => a.number).join('、') +
                '已识别的步骤完整正确；' +
                (independent
                  ? '符合本次闭卷与未看答案声明，仍需对照原图确认独立完成。'
                  : '独立条件不足，不记掌握。')
              : '尚无足够证据确认独立完成，不等同于全部不会。'}
          </li>
          <li>
            立即修补：
            {wrong.length
              ? wrong
                  .slice(0, 3)
                  .map(
                    (a) =>
                      a.number +
                      '：' +
                      (a.points.find((p) => p.score < 1)?.reason || '核对关键步骤'),
                  )
                  .join('；')
              : '先检查图片归属和完整性。'}
            {uncertain.length
              ? '；' + uncertain.map((a) => a.number).join('、') + '待核对照片，不作知识错误。'
              : ''}
          </li>
          <li>
            下一块：
            {uncertain.length
              ? '先用5分钟补齐/拍清上述待核对题，与已有页面一起重新提交。'
              : wrong.length
                ? '用10分钟只订正' +
                  wrong[0].number +
                  '的第一个错误步骤；新题由教练按这次作答编制，不重做整章。'
                : '用5分钟整理方法卡，再进入路线图的下一未测题型，不重复刷本卷。'}
          </li>
          <li>进入条件：独立解释订正步骤、完成回代或反例检查、答全小问；AI分数不自动改进度。</li>
          <li>做不到：缩成5分钟的一个前置步骤；40-50分钟仍依赖提示就暂缓，换科保留基础时间。</li>
          <li>
            复测：确认独立完成后，北京时间隔天同科学习块开头10-15分钟用未见新题；本卷已有反馈，不能当未见复测。
          </li>
        </ol>
      </div>
    </section>
  );
}
function UploadWorkspace({
  userId,
  packId,
  courseId,
  cycleId,
  minutes,
}: {
  userId: string;
  packId: string;
  courseId: string;
  cycleId: string;
  minutes: number;
}) {
  const key = `rapid-photos-v1:${userId}:${cycleId}:${packId}`;
  const fresh = (): Draft => ({
    pages: [],
    minutes,
    closedBook: false,
    answersSeen: false,
    pagesComplete: false,
    requestId: crypto.randomUUID(),
  });
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const d = JSON.parse(localStorage.getItem(key) || 'null');
      return d &&
        Array.isArray(d.pages) &&
        d.pages.every((p: Photo) => typeof p.fileId === 'string') &&
        typeof d.requestId === 'string'
        ? d
        : fresh();
    } catch {
      return fresh();
    }
  });
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(''),
    [error, setError] = useState(''),
    [selected, setSelected] = useState('');
  const lock = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const workers = useQuery({
    queryKey: ['rapid-workers', userId],
    queryFn: () =>
      bankRequest<{ online: boolean; paused: boolean; revoked: boolean }[]>('/grading/workers'),
    refetchInterval: 30000,
  });
  const history = useQuery({
    queryKey: ['rapid-attempts', userId, cycleId, packId],
    queryFn: () =>
      bankRequest<Attempt[]>(
        `/rapid/attempts?packId=${encodeURIComponent(packId)}&courseId=${courseId}&cycleId=${cycleId}`,
      ),
    refetchInterval: (q) =>
      q.state.data?.some((a) => ['QUEUED', 'GRADING'].includes(a.state)) ? 5000 : false,
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(draft));
    } catch {
      setError('本机草稿保存失败，请保持此页打开；已上传照片仍保存在本人账号下。');
    }
  }, [key, draft]);
  const edit = (patch: Partial<Draft>) => {
    if (lock.current) return;
    setDraft((d) => ({ ...d, ...patch, requestId: crypto.randomUUID() }));
  };
  const active = history.data?.find((a) => a.id === selected) || history.data?.[0];
  const sent = history.data?.some((a) => a.id === draft.requestId);
  async function upload(list: FileList | null) {
    if (!list || lock.current) return;
    const chosen = Array.from(list);
    setError('');
    if (draft.pages.length + chosen.length > 20) {
      setError('每次最多20张照片，请先移出不需要的页面。');
      return;
    }
    if (
      chosen.some(
        (f) =>
          !['image/png', 'image/jpeg'].includes(f.type) || f.size > 8 * 1024 * 1024 || f.size === 0,
      )
    ) {
      setError('请选择JPG或PNG，每张不超过8MB；HEIC请先转换。');
      return;
    }
    lock.current = true;
    setBusy(true);
    let added = 0;
    try {
      for (const [i, f] of chosen.entries()) {
        const form = new FormData();
        form.append('packId', packId);
        form.append('courseId', courseId);
        form.append('cycleId', cycleId);
        form.append('file', f);
        setProgress(`上传第${i + 1}/${chosen.length}张：${f.name}`);
        const photo = await bankRequest<Photo>('/rapid/materials', 'POST', form, undefined, {
          timeout: 90000,
          onUploadProgress: (e) =>
            setProgress(
              `上传第${i + 1}/${chosen.length}张：${Math.round((e.loaded / (e.total || f.size)) * 100)}%`,
            ),
        });
        setDraft((d) => ({ ...d, pages: [...d.pages, photo], requestId: crypto.randomUUID() }));
        added++;
      }
      setProgress(`已上传${added}张。请核对页序后提交批改。`);
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : '上传失败') +
          `；本次已成功的${added}张仍保留，请只重选未上传的图片。`,
      );
    } finally {
      lock.current = false;
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }
  async function submit() {
    if (lock.current || !draft.pages.length || sent) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const a = await bankRequest<Attempt>('/rapid/attempts', 'POST', {
        requestId: draft.requestId,
        packId,
        courseId,
        cycleId,
        fileIds: draft.pages.map((p) => p.fileId),
        minutes: draft.minutes,
        closedBook: draft.closedBook,
        answersSeen: draft.answersSeen,
        pagesComplete: draft.pagesComplete,
      });
      setSelected(a.id);
      await history.refetch();
      setProgress('已提交，照片和任务已保存。可以离开页面，稍后查看。');
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : '提交失败') +
          '。已上传照片保留，重试不会重复创建同一次提交。',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="rapid-card rapid-photo-panel">
      <h3>
        <FileImage size={20} /> 上传手写作答图片批改
      </h3>
      <p>
        在纸上写清题号与步骤，按页序上传全部作答；一张照片可含多题。支持JPG/PNG、每张8MB以内、最多20张。
      </p>
      <p className="rapid-note">
        {workers.isPending
          ? '正在检查批改程序状态…'
          : workers.isError
            ? '暂时无法读取批改程序状态，已上传照片和提交记录仍会保存。'
            : workers.data?.some((w) => w.online && !w.paused && !w.revoked)
              ? '批改程序在线，提交后进入队列，状态会自动更新。'
              : '批改程序离线或暂停：仍可上传并提交，任务将在程序上线后处理。'}
      </p>
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png"
        aria-label="选择手写作答图片"
        disabled={busy}
        onChange={(e) => void upload(e.target.files)}
      />
      <div className="rapid-photo-grid">
        {draft.pages.map((p, i) => (
          <article className="rapid-photo" key={p.fileId}>
            <Thumbnail photo={p} />
            <b>
              第{i + 1}页 · {p.name}
            </b>
            <div>
              <button
                disabled={busy || i === 0}
                aria-label={`第${i + 1}页前移`}
                onClick={() => {
                  const pages = [...draft.pages];
                  [pages[i - 1], pages[i]] = [pages[i], pages[i - 1]];
                  edit({ pages });
                }}
              >
                前移
              </button>
              <button
                disabled={busy || i === draft.pages.length - 1}
                aria-label={`第${i + 1}页后移`}
                onClick={() => {
                  const pages = [...draft.pages];
                  [pages[i], pages[i + 1]] = [pages[i + 1], pages[i]];
                  edit({ pages });
                }}
              >
                后移
              </button>
              <button
                disabled={busy}
                aria-label={`移出第${i + 1}页`}
                onClick={() => edit({ pages: draft.pages.filter((x) => x.fileId !== p.fileId) })}
              >
                移出本次
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="rapid-photo-settings">
        <label>
          实际作答用时（分钟）
          <input
            type="number"
            min={1}
            max={1440}
            value={draft.minutes}
            disabled={busy}
            onChange={(e) => edit({ minutes: Number(e.target.value) })}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.closedBook}
            disabled={busy}
            onChange={(e) => edit({ closedBook: e.target.checked })}
          />
          闭卷独立作答
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.answersSeen}
            disabled={busy}
            onChange={(e) => edit({ answersSeen: e.target.checked })}
          />
          作答前看过答案或提示
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.pagesComplete}
            disabled={busy}
            onChange={(e) => edit({ pagesComplete: e.target.checked })}
          />
          本次作答页面已全部拍齐
        </label>
      </div>
      <div className="rapid-photo-actions">
        <button
          disabled={
            busy ||
            !draft.pages.length ||
            sent ||
            draft.minutes < 1 ||
            draft.minutes > 1440 ||
            !Number.isInteger(draft.minutes)
          }
          onClick={() => void submit()}
        >
          <Upload size={16} />
          {busy ? '正在处理…' : sent ? '本次已提交' : '提交图片批改'}
        </button>
        <button
          disabled={busy || (!draft.pages.length && !sent)}
          onClick={() => {
            setDraft(fresh());
            setProgress('已开始新作答，历史提交与照片仍保留。');
            setError('');
          }}
        >
          开始新作答
        </button>
      </div>
      {progress && <p role="status">{progress}</p>}
      {error && (
        <p role="alert" className="rapid-note">
          {error}
        </p>
      )}
      <p className="rapid-note">
        照片与批改记录归本人账号保存；不计入正式成绩或解锁门槛。缺页、模糊或题号无法对应时保留待核对，不按能力零分。
      </p>
      <div className="rapid-heading">
        <h3>批改状态与历史提交</h3>
        <button disabled={history.isFetching} onClick={() => void history.refetch()}>
          <RefreshCw size={15} />
          刷新状态
        </button>
      </div>
      {history.isError ? (
        <p role="alert">批改记录加载失败，请刷新重试；本机照片列表仍保留。</p>
      ) : history.isPending ? (
        <p>正在读取本人批改记录…</p>
      ) : !history.data?.length ? (
        <p>本材料还没有图片批改提交。</p>
      ) : (
        <>
          <label>
            选择提交
            <select
              aria-label="选择历史提交"
              value={active?.id || ''}
              onChange={(e) => setSelected(e.target.value)}
            >
              {history.data.map((a, i) => (
                <option key={a.id} value={a.id}>
                  {i === 0 ? '最近一次' : '历史提交'} · {labels[a.state] || a.state} ·{' '}
                  {a.pages.length}页 · {a.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          {active && (
            <>
              <p className="rapid-state">
                <Clock3 size={17} />
                {labels[active.state] || active.state}
              </p>
              {['QUEUED', 'GRADING'].includes(active.state) && (
                <p>
                  {active.workerOnline ? '批改程序在线，页面会自动更新。' : active.workerReason}
                </p>
              )}
              {active.error && <p role="alert">{active.error}</p>}
              {active.state === 'FAILED' && (
                <button
                  disabled={busy}
                  onClick={() => {
                    setDraft({
                      pages: active.pages,
                      minutes: active.practice.minutes,
                      closedBook: active.practice.closedBook,
                      answersSeen: active.practice.answersSeenBefore,
                      pagesComplete: active.practice.complete,
                      requestId: crypto.randomUUID(),
                    });
                    setProgress('已载入原照片，请点击“提交图片批改”重试。');
                  }}
                >
                  使用原照片重试
                </button>
              )}
              <details>
                <summary>查看这次提交的{active.pages.length}张原图</summary>
                <div className="rapid-photo-grid">
                  {active.pages.map((p, i) => (
                    <article className="rapid-photo" key={p.fileId}>
                      <Thumbnail photo={p} />
                      <span>第{i + 1}页</span>
                    </article>
                  ))}
                </div>
              </details>
              <ResultView attempt={active} />
            </>
          )}
        </>
      )}
    </section>
  );
}
export function RapidPhotoPanel({
  userId,
  packId,
  code,
  minutes,
}: {
  userId: string;
  packId: string;
  code: string;
  minutes: number;
}) {
  const cycle = useCycle();
  const courses = useQuery({
    queryKey: ['my-courses', cycle?.cycleId],
    enabled: !!cycle?.cycleId,
    queryFn: async ({ signal }) =>
      (await listCourses({ cycleId: cycle!.cycleId, size: 100 }, { signal, silent: true })).data,
  });
  if (cycle?.error || courses.isError)
    return <p role="alert">本人课程读取失败，请刷新页面重试。</p>;
  if (cycle?.pending || courses.isPending) return <p>正在核对本人账号与课程…</p>;
  const course = courses.data?.items.find((c) => c.code === code);
  if (!cycle?.cycleId || !course) return <p>当前周期没有本科课程，请先选择正确周期。</p>;
  return (
    <UploadWorkspace
      key={`${userId}:${cycle.cycleId}:${packId}`}
      userId={userId}
      cycleId={cycle.cycleId}
      courseId={course.id}
      packId={packId}
      minutes={minutes}
    />
  );
}
