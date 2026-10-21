import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  bankRequest,
  type BankQuestion,
  type BankChapter,
  type BankPoint,
  type Level,
} from '../../api/bank';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { MathText } from '../../components/MathText';
import { QuestionStem } from './QuestionStem';
import { useConfirmation } from '../../components/ConfirmationProvider';
import {
  Download,
  FileImage,
  FileText,
  Upload,
  Check,
  Clock3,
  ArrowRight,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import './practice-workspace.css';
type Photo = { id: string; name: string; mimeType: string };
type Question = BankQuestion & {
  answer: { text?: string; selectedOption?: number };
  files: Photo[];
};
interface Batch {
  id: string;
  revision: number;
  questions: Question[];
  state: string;
  taskId: string | null;
  submissionMode: string;
  sheetFiles: Photo[];
  error?: string;
  workerOnline: boolean;
  workerReason: string;
  result?: {
    reviewItems: string[];
    answers: {
      number: string;
      recognizedAnswer: string;
      pages: number[];
      reviewItems: string[];
      points: { pointId: string; score: number; reason: string }[];
    }[];
  };
}
const states: Record<string, string> = {
  QUEUED: '等待批改',
  GRADING: '正在批改',
  REVIEW: '结果待核对',
  COMPLETED: '批改完成',
  FAILED: '批改失败',
};
const levels = { simple: '基础练习', middle: '考试水平练习', hard: '提高练习（选做）' };
type View = 'questions' | 'uploads' | 'results';
export function PointPracticeBatch({
  courseId,
  chapter,
  point,
  level,
}: {
  courseId: string;
  chapter: BankChapter;
  point: BankPoint;
  level: Level;
}) {
  const confirm = useConfirmation();
  const client = useQueryClient();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    index: number;
    total: number;
    percent: number;
    name: string;
  } | null>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const pdfGeneration = useRef(0);
  const batchId = batch?.id;
  const open = useCallback(
    async (newAttempt = false) => {
      const b = await bankRequest<Batch>(`/bank/courses/${courseId}/practice-batches`, 'POST', {
        chapterId: chapter.chapter_id,
        pointKey: point.point_key,
        level,
        newAttempt,
      });
      setBatch(b);
      setView(null);
      setPreview('');
      setNotice('');
    },
    [courseId, chapter.chapter_id, point.point_key, level],
  );
  useEffect(() => {
    let active = true;
    setBatch(null);
    setView(null);
    setError('');
    bankRequest<Batch>(`/bank/courses/${courseId}/practice-batches`, 'POST', {
      chapterId: chapter.chapter_id,
      pointKey: point.point_key,
      level,
      newAttempt: false,
    })
      .then((b) => {
        if (active) setBatch(b);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [courseId, chapter.chapter_id, point.point_key, level]);
  useEffect(() => {
    const generation = pdfGeneration;
    generation.current++;
    setPdfUrl('');
    setPdfBusy(false);
    setPreview('');
    return () => {
      generation.current++;
    };
  }, [batchId]);
  useEffect(
    () => () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    },
    [pdfUrl],
  );
  useEffect(() => {
    if (!batch?.taskId || !['QUEUED', 'GRADING'].includes(batch.state)) return;
    let active = true;
    const timer = setInterval(() => {
      void bankRequest<Batch>(`/bank/practice-batches/${batch.id}`)
        .then((b) => {
          if (active) {
            setBatch(b);
            if (['COMPLETED', 'REVIEW'].includes(b.state))
              void client.invalidateQueries({ queryKey: ['bank-overview', courseId] });
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [batch?.id, batch?.taskId, batch?.state, client, courseId]);
  async function act(work: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      pending.current = false;
      setBusy(false);
      setUploadProgress(null);
    }
  }
  async function generatePdf() {
    if (!sheet.current || pdfBusy) return;
    const generation = pdfGeneration.current;
    setPdfBusy(true);
    setError('');
    try {
      const { practiceSheetPdf } = await import('./practiceSheetPdf');
      const pdf = await practiceSheetPdf(sheet.current);
      if (pdfGeneration.current === generation) setPdfUrl(URL.createObjectURL(pdf.blob));
    } catch (e) {
      if (pdfGeneration.current === generation)
        setError(e instanceof Error ? e.message : 'PDF生成失败，请重试');
    } finally {
      if (pdfGeneration.current === generation) setPdfBusy(false);
    }
  }
  if (!batch)
    return (
      <Card>
        <p role={error ? 'alert' : 'status'}>{error || '正在读取十题练习单…'}</p>
        {error && <Button onClick={() => void act(() => open())}>重试</Button>}
      </Card>
    );
  const locked = batch.state !== 'DRAFT';
  const photos = batch.sheetFiles ?? [];
  const activeView = view ?? (locked ? 'results' : photos.length ? 'uploads' : 'questions');
  const maximum = batch.questions.reduce((s, q) => s + Number(q.maximum), 0);
  const earned =
    batch.result?.answers.reduce(
      (s, a) => s + a.points.reduce((n, p) => n + Number(p.score), 0),
      0,
    ) ?? 0;
  const hasLegacy = batch.questions.some(
    (q) => q.files.length || q.answer.text || q.answer.selectedOption !== undefined,
  );
  const phase = locked ? 2 : photos.length ? 1 : 0;
  const tabNames: { id: View; label: string; icon: typeof FileText }[] = [
    { id: 'questions', label: '练习题目', icon: FileText },
    {
      id: 'uploads',
      label: `作答照片${photos.length ? ` · ${photos.length}` : ''}`,
      icon: FileImage,
    },
    { id: 'results', label: '批改结果', icon: Check },
  ];
  async function uploadFiles(selected: File[]) {
    if (!selected.length || pending.current) return;
    setView('uploads');
    if (selected.length + photos.length > 20) {
      setError('每组最多20张照片');
      return;
    }
    const invalid = selected.find(
      (f) => !['image/jpeg', 'image/png'].includes(f.type) || f.size > 8 * 1024 * 1024,
    );
    if (invalid) {
      setError(`${invalid.name}：请选择不超过8MB的JPG或PNG图片`);
      return;
    }
    await act(async () => {
      let current = batch!;
      let uploaded = 0;
      try {
        for (const [index, f] of selected.entries()) {
          setUploadProgress({ index: index + 1, total: selected.length, percent: 0, name: f.name });
          const form = new FormData();
          form.append('file', f);
          form.append('expectedRevision', String(current.revision));
          current = await bankRequest<Batch>(
            `/bank/practice-batches/${current.id}/sheet-pages`,
            'POST',
            form,
            undefined,
            {
              timeout: 120000,
              onUploadProgress: (event) => {
                setUploadProgress({
                  index: index + 1,
                  total: selected.length,
                  percent: event.total
                    ? Math.min(99, Math.round((event.loaded / event.total) * 100))
                    : 0,
                  name: f.name,
                });
              },
            },
          );
          setBatch(current);
          uploaded++;
        }
        setNotice(`已保存${photos.length + uploaded}张照片，可刷新恢复`);
      } catch (e) {
        try {
          const recovered = await bankRequest<Batch>(`/bank/practice-batches/${current.id}`);
          setBatch(recovered);
          uploaded = Math.max(uploaded, (recovered.sheetFiles?.length ?? 0) - photos.length);
        } catch {
          /* Keep already confirmed photos visible. */
        }
        throw Error(
          `已保存${uploaded}张，本次其余照片未上传。${e instanceof Error ? e.message : '请重试'}`,
        );
      }
    });
  }
  async function apply() {
    await act(async () => {
      if (
        !(await confirm(
          '确认照片已拍全1—10题作答？提交后本组照片不可修改。AI将逐题评分，缺答计零；看不清或题号无法匹配将待核对。',
        ))
      )
        return;
      setBatch(
        await bankRequest<Batch>(`/bank/practice-batches/${batch!.id}/grading`, 'POST', {
          expectedRevision: batch!.revision,
        }),
      );
      setView('results');
    });
  }
  async function showPhoto(f: Photo) {
    await act(async () => {
      const image = await bankRequest<{ mimeType: string; contentBase64: string }>(
        `/bank/practice-batches/${batch!.id}/pages/${f.id}`,
      );
      setPreview(`data:${image.mimeType};base64,${image.contentBase64}`);
    });
  }
  return (
    <div className="practice-workspace">
      <header className="practice-hero">
        <div>
          <p className="practice-eyebrow">考点练习 · {levels[level]}</p>
          <h1>{point.title}</h1>
          <p className="practice-context">{chapter.title}</p>
          <div className="practice-facts">
            <span>{batch.questions.length} 道题</span>
            <span>满分 {maximum} 分</span>
            <span>练习编号 {batch.id.slice(0, 8)}</span>
          </div>
        </div>
        <span className={`practice-status practice-status-${batch.state.toLowerCase()}`}>
          {locked
            ? states[batch.state] || batch.state
            : photos.length
              ? '已保存作答'
              : '待上传作答'}
        </span>
      </header>
      {error && (
        <div className="practice-alert practice-alert-error" role="alert">
          <AlertCircle size={18} />
          <div>
            {error}
            <small>已上传成功的照片仍保留。</small>
          </div>
        </div>
      )}
      <div className="practice-workspace-grid">
        <main className="practice-main">
          <div className="practice-tabs" role="tablist" aria-label="练习工作区">
            {tabNames.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}-${batch.id}`}
                aria-selected={activeView === id}
                aria-controls={`panel-${id}-${batch.id}`}
                tabIndex={activeView === id ? 0 : -1}
                onClick={() => setView(id)}
                onKeyDown={(e) => {
                  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
                  e.preventDefault();
                  const n = tabNames.findIndex((t) => t.id === id);
                  const target =
                    e.key === 'Home'
                      ? 0
                      : e.key === 'End'
                        ? 2
                        : (n + (e.key === 'ArrowRight' ? 1 : 2)) % 3;
                  setView(tabNames[target].id);
                  const tabs = e.currentTarget.parentElement
                    ?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
                  tabs?.[target]?.focus();
                }}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </div>
          <section
            role="tabpanel"
            id={`panel-questions-${batch.id}`}
            aria-labelledby={`tab-questions-${batch.id}`}
            hidden={activeView !== 'questions'}
            className="practice-panel"
          >
            <div className="practice-panel-heading">
              <div>
                <h2>本组练习题</h2>
                <p>按题号在纸上作答，完成后上传照片。</p>
              </div>
              <span className="practice-muted">{batch.questions.length} 题 · 不含答案</span>
            </div>
            <div className="practice-document-bar">
              <FileText size={22} />
              <div>
                <strong>十题 PDF 练习单</strong>
                <p>需要纸质练习时再生成，题目与本页一致。</p>
              </div>
              <div className="practice-document-actions">
                <Button
                  variant="secondary"
                  loading={pdfBusy}
                  disabled={pdfBusy}
                  onClick={() => void generatePdf()}
                >
                  <FileText size={16} />
                  {pdfUrl ? '重新生成PDF' : '生成练习PDF'}
                </Button>
                {pdfUrl && (
                  <>
                    <a
                      className="button button-secondary"
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={16} />
                      预览PDF
                    </a>
                    <a
                      className="button button-secondary"
                      href={pdfUrl}
                      download={`${point.title}-${level}-十题练习单.pdf`}
                    >
                      <Download size={16} />
                      下载PDF
                    </a>
                  </>
                )}
              </div>
            </div>
            <div className="practice-question-list">
              {batch.questions.map((q, i) => (
                <article className="practice-question-card" key={q.id}>
                  <div className="practice-question-heading">
                    <span className="practice-question-number">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3>第 {i + 1} 题</h3>
                    <span>{q.maximum} 分</span>
                  </div>
                  <QuestionStem text={q.stem} />
                  {q.options.length > 0 && (
                    <ol className="practice-choice-list">
                      {q.options.map((option, n) => (
                        <li key={n}>
                          <span>{String.fromCharCode(65 + n)}.</span>
                          <MathText text={option} />
                        </li>
                      ))}
                    </ol>
                  )}
                </article>
              ))}
            </div>
          </section>
          <section
            role="tabpanel"
            id={`panel-uploads-${batch.id}`}
            aria-labelledby={`tab-uploads-${batch.id}`}
            hidden={activeView !== 'uploads'}
            className="practice-panel"
          >
            <div className="practice-panel-heading">
              <div>
                <h2>{locked ? '已提交的作答照片' : '上传作答照片'}</h2>
                <p>
                  {locked ? '本组已提交，照片保留供查看。' : '一张照片可以包含多题，无需逐题上传。'}
                </p>
              </div>
              <span className="practice-muted">{photos.length} / 20 张</span>
            </div>
            {!locked && (
              <label className={`practice-upload-zone ${busy ? 'is-busy' : ''}`}>
                <Upload size={28} />
                <strong>选择作答照片</strong>
                <span>请拍清 1—10 题并标明题号，未答题留空。</span>
                <small>JPG / PNG · 每张最多 8MB · 最多 20 张</small>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png"
                  aria-label="上传整组作答照片"
                  disabled={busy || photos.length >= 20}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = '';
                    void uploadFiles(files);
                  }}
                />
              </label>
            )}
            {locked && <input type="file" aria-label="上传整组作答照片" disabled hidden />}
            {uploadProgress && (
              <div className="practice-upload-progress" role="status">
                <strong>
                  正在保存第 {uploadProgress.index} / {uploadProgress.total} 张照片
                </strong>
                <span>{uploadProgress.name}</span>
                <progress max="100" value={uploadProgress.percent} />
                <small>传输完成后会等待服务器确认，请保持此页打开。</small>
              </div>
            )}
            <p className="practice-upload-count" role="status">
              已上传 {photos.length}/20 张{notice && ` · ${notice}`}
            </p>
            {!photos.length && (
              <div className="practice-empty">
                <FileImage size={34} />
                <strong>还没有保存的照片</strong>
                <p>上传成功的照片会列在这里，刷新页面后也会保留。</p>
              </div>
            )}
            <div className="practice-photo-list">
              {photos.map((f, i) => (
                <div className="practice-photo-item" key={f.id}>
                  <span className="practice-photo-index">{i + 1}</span>
                  <div>
                    <strong>{f.name}</strong>
                    <small>
                      <Check size={13} />
                      已保存
                    </small>
                  </div>
                  <Button variant="ghost" disabled={busy} onClick={() => void showPhoto(f)}>
                    查看照片{i + 1}
                  </Button>
                  {!locked && (
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void act(async () => {
                          if (!(await confirm('确认移除这张照片？其他已保存照片保留。'))) return;
                          setBatch(
                            await bankRequest<Batch>(
                              `/bank/practice-batches/${batch.id}/sheet-pages/${f.id}?expectedRevision=${batch.revision}`,
                              'DELETE',
                            ),
                          );
                          setPreview('');
                        })
                      }
                    >
                      移除照片{i + 1}
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {preview && (
              <div className="practice-photo-preview">
                <div>
                  <strong>作答照片预览</strong>
                  <Button variant="ghost" onClick={() => setPreview('')}>
                    关闭预览
                  </Button>
                </div>
                <img src={preview} alt="整组作答照片预览" />
              </div>
            )}
            {!locked && (
              <div className="practice-submit-bar">
                <p>确认照片覆盖全部 10 题后提交，提交后本组照片不可修改。</p>
                <Button
                  loading={busy}
                  disabled={busy || !photos.length}
                  onClick={() => void apply()}
                >
                  申请AI批改全部10题
                  <ArrowRight size={17} />
                </Button>
              </div>
            )}
          </section>
          <section
            role="tabpanel"
            id={`panel-results-${batch.id}`}
            aria-labelledby={`tab-results-${batch.id}`}
            hidden={activeView !== 'results'}
            className="practice-panel"
          >
            <div className="practice-panel-heading">
              <div>
                <h2>本组批改结果</h2>
                <p>逐题查看识别作答、评分与扣分依据。</p>
              </div>
              <span className="practice-muted">
                {batch.result ? `${batch.result.answers.length} 题已返回` : '尚无结果'}
              </span>
            </div>
            {!batch.result && (
              <div className="practice-empty">
                {locked ? <Clock3 size={36} /> : <FileText size={36} />}
                <strong>
                  {locked ? states[batch.state] || batch.state : '完成作答后，查看你的批改结果'}
                </strong>
                <p>
                  {locked
                    ? batch.error ||
                      (['QUEUED', 'GRADING'].includes(batch.state)
                        ? batch.workerOnline
                          ? '批改程序已在线，结果返回后会自动更新。'
                          : batch.workerReason
                        : '请检查状态后重试。')
                    : '保存全部作答照片后，一次申请批改 10 道题。'}
                </p>
                {!locked && (
                  <Button variant="secondary" onClick={() => setView('uploads')}>
                    去上传作答
                    <ArrowRight size={16} />
                  </Button>
                )}
              </div>
            )}
            {batch.result && (
              <>
                <div
                  className={`practice-result-summary ${batch.state === 'REVIEW' ? 'needs-review' : ''}`}
                >
                  <div>
                    <span>{batch.state === 'REVIEW' ? '模型参考得分' : '本组得分'}</span>
                    <strong>
                      {Number(earned.toFixed(2))}
                      <small> / {maximum}</small>
                    </strong>
                  </div>
                  <p>
                    {batch.state === 'REVIEW'
                      ? '存在待核对内容，当前分数尚未确认，不计入通过资格。'
                      : batch.state === 'COMPLETED'
                        ? earned / maximum >= 0.9
                          ? '本组已达到 90% 门槛。'
                          : '本组尚未达到 90% 门槛，可查看扣分原因后复练。'
                        : '结果待处理'}
                  </p>
                </div>
                {!!batch.result.reviewItems.length && (
                  <div className="practice-alert practice-alert-review">
                    <AlertCircle size={18} />
                    <div>
                      <strong>需要核对</strong>
                      {batch.result.reviewItems.map((item, i) => (
                        <p key={i}>{item}</p>
                      ))}
                    </div>
                  </div>
                )}
                <div className="practice-result-list">
                  {batch.result.answers.map((a) => {
                    const q = batch.questions[Number(a.number) - 1];
                    const score = a.points.reduce((s, p) => s + Number(p.score), 0);
                    return (
                      <details
                        className="practice-result-item"
                        key={a.number}
                        open={!!a.reviewItems.length || score < Number(q?.maximum ?? 0)}
                      >
                        <summary>
                          <span className="practice-question-number">
                            {String(a.number).padStart(2, '0')}
                          </span>
                          <strong>第 {a.number} 题</strong>
                          <span
                            className={`practice-answer-flag ${a.reviewItems.length ? 'needs-review' : ''}`}
                          >
                            {a.reviewItems.length
                              ? '需核对'
                              : batch.state === 'REVIEW'
                                ? '参考评分'
                                : score === Number(q?.maximum)
                                  ? '满分'
                                  : '查看扣分'}
                          </span>
                          <span className="practice-answer-score">
                            {Number(score.toFixed(2))}
                            <small> / {q?.maximum ?? '—'}</small>
                          </span>
                        </summary>
                        <div className="practice-result-detail">
                          {q && (
                            <div>
                              <h4>题目</h4>
                              <QuestionStem text={q.stem} />
                            </div>
                          )}
                          <div>
                            <h4>识别作答</h4>
                            <MathText text={a.recognizedAnswer || '未识别到作答'} />
                          </div>
                          <div>
                            <h4>评分依据</h4>
                            {a.points.map((p) => (
                              <p className="practice-score-reason" key={p.pointId}>
                                <strong>{p.score} 分</strong>
                                <span>{p.reason || '该评分点通过'}</span>
                              </p>
                            ))}
                          </div>
                          {!!a.reviewItems.length && (
                            <div className="practice-review-note">
                              {a.reviewItems.map((item, i) => (
                                <p key={i}>{item}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>
                    );
                  })}
                </div>
              </>
            )}
          </section>
          <div className="practice-legacy">
            {' '}
            {hasLegacy && (
              <details>
                <summary>查看以前保存的逐题作答</summary>
                <p>旧文字和逐题图片仍保留。整组照片提交后，批改以本次整组照片为准。</p>
                {batch.questions.map((q, i) => (
                  <div key={q.id}>
                    <strong>第{i + 1}题</strong>
                    <MathText
                      text={
                        q.answer.text ||
                        (q.answer.selectedOption !== undefined
                          ? `选项${String.fromCharCode(65 + q.answer.selectedOption)}`
                          : '未保存文字')
                      }
                    />
                    {q.files.map((f) => (
                      <Button
                        key={f.id}
                        variant="secondary"
                        onClick={() =>
                          void act(async () => {
                            const image = await bankRequest<{
                              mimeType: string;
                              contentBase64: string;
                            }>(`/bank/practice-batches/${batch.id}/pages/${f.id}`);
                            setPreview(`data:${image.mimeType};base64,${image.contentBase64}`);
                            setView('uploads');
                          })
                        }
                      >
                        {f.name}
                      </Button>
                    ))}
                  </div>
                ))}
              </details>
            )}
          </div>
        </main>
        <aside className="practice-aside">
          <section className="practice-side-card">
            <p className="practice-eyebrow">本次练习</p>
            <h2>
              {locked
                ? states[batch.state] || batch.state
                : photos.length
                  ? '照片已保存，准备提交'
                  : '先完成题目，再上传作答'}
            </h2>
            <p className="practice-side-description">
              {locked
                ? batch.state === 'REVIEW'
                  ? '批改已返回，请先查看需要核对的题目。'
                  : ['QUEUED', 'GRADING'].includes(batch.state)
                    ? '申请已保存，批改进度会自动更新。'
                    : '可以查看本组结果，或开始新一组练习。'
                : '按题号手写作答，将清晰照片保存在这组练习中。'}
            </p>
            <dl className="practice-side-facts">
              <div>
                <dt>已保存照片</dt>
                <dd>{photos.length} 张</dd>
              </div>
              <div>
                <dt>批改范围</dt>
                <dd>整组 {batch.questions.length} 题</dd>
              </div>
            </dl>
            <Button variant="secondary" onClick={() => setView(locked ? 'results' : 'uploads')}>
              {locked ? '查看批改结果' : photos.length ? '检查作答照片' : '上传作答照片'}
              <ArrowRight size={16} />
            </Button>
            {['COMPLETED', 'REVIEW', 'FAILED'].includes(batch.state) && (
              <Button variant="ghost" disabled={busy} onClick={() => void act(() => open(true))}>
                开始新一组练习
              </Button>
            )}
          </section>
          <section className="practice-side-card practice-guide">
            <h2>练习流程</h2>
            <ol>
              {[
                { title: '完成练习', text: '在线查看题目，或下载 PDF。', id: 'questions' as View },
                { title: '保存作答', text: '按题号拍照，支持多张上传。', id: 'uploads' as View },
                { title: '查看批改', text: '整组提交，逐题返回结果。', id: 'results' as View },
              ].map((step, i) => (
                <li key={step.id} aria-current={phase === i ? 'step' : undefined}>
                  <span
                    className={`practice-step-marker ${phase > i ? 'is-complete' : phase === i ? 'is-current' : ''}`}
                  >
                    {phase > i ? <Check size={13} /> : i + 1}
                  </span>
                  <div>
                    <button type="button" onClick={() => setView(step.id)}>
                      {step.title}
                    </button>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <p className="practice-side-footnote">
            缺答计零；字迹不清或题号无法对应时需核对。评分完成且达到 90% 门槛后，才判定本组通过。
          </p>
        </aside>
      </div>
      <div className="sheet-render-container" aria-hidden="true">
        <div ref={sheet} className="practice-pdf-sheet">
          <header>
            <strong>学习知途 · 十题练习单</strong>
            <h1>{point.title}</h1>
            <p>
              {chapter.title} · {level} · {levels[level]} · 满分{maximum}分
            </p>
            <p>
              练习编号 {batch.id.slice(0, 8)} · 按题号1—10作答，作答纸须标明题号。题目不含参考答案。
            </p>
          </header>
          <div className="practice-pdf-questions">
            {[0, 1].map((column) => (
              <div key={column}>
                {batch.questions.slice(column * 5, column * 5 + 5).map((q, i) => (
                  <section key={q.id}>
                    <h2>
                      {column * 5 + i + 1}. <span>{q.maximum}分</span>
                    </h2>
                    <QuestionStem text={q.stem} />
                    {q.options.map((option, n) => (
                      <p key={n}>
                        {String.fromCharCode(65 + n)}. <MathText text={option} />
                      </p>
                    ))}
                  </section>
                ))}
              </div>
            ))}
          </div>
          <footer>
            请拍清完整作答，图片可包含多题；全部10题一次批改，待评分或待核对不判定通过。
          </footer>
        </div>
      </div>
    </div>
  );
}
