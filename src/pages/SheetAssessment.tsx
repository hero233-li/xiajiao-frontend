import { useEffect, useRef, useState, type Ref } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  bankRequest,
  type BankQuestion,
  type BankSession,
} from '../api/bank';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { MathText } from '../components/MathText';
import { QuestionStem } from '../features/bank/QuestionStem';
import { useConfirmation } from '../components/ConfirmationProvider';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Upload,
} from 'lucide-react';
import { Link } from '../features/cycle/navigation';
import '../features/bank/assessment-sheet.css';

const typeNames: Record<string, string> = {
  CHOICE: '单项选择题',
  FILL: '填空题',
  CALCULATION: '计算题',
  SHORT: '简答题',
  TERM: '名词解释题',
  ANALYSIS: '综合题',
  PROOF: '证明题',
  CODE: '代码题',
  OPERATION: '操作题',
};

const statusNames: Record<string, string> = {
  IN_PROGRESS: '作答中',
  PENDING: '等待批改',
  NEEDS_REVIEW: '人工复核中',
  GRADED: '已评分',
  FAILED: '批改失败',
};

function titleOf(session: BankSession) {
  if (session.paper_title) return session.paper_title;
  return session.kind === 'MOCK' ? `固定模拟卷 ${session.variant}` : `独立章节检测 ${session.variant} 卷`;
}

function seconds(session: BankSession, now: number) {
  if (session.submitted_at) return session.elapsedSeconds ?? 0;
  const started = session.started_at ? Date.parse(session.started_at) : NaN;
  if (Number.isFinite(started)) return Math.max(0, Math.floor((now - started) / 1000));
  return session.elapsedSeconds ?? 0;
}

function duration(value: number) {
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remain = value % 60;
  return hours ? `${hours} 小时 ${minutes} 分` : `${minutes} 分 ${remain} 秒`;
}

export function SheetAssessment({
  session,
  testId,
  code,
}: {
  session: BankSession;
  testId: string;
  code: string;
}) {
  const client = useQueryClient();
  const confirm = useConfirmation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{
    index: number;
    total: number;
    percent: number;
    name: string;
  } | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfPages, setPdfPages] = useState(0);
  const [now, setNow] = useState(Date.now());
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const photos = session.sheetFiles ?? [];
  const inProgress = session.status === 'IN_PROGRESS';
  const maximum = session.questions.reduce((sum, question) => sum + Number(question.maximum), 0);
  const modelScores = session.questions.map((question) => {
    const result = question.saved?.result_snapshot;
    return result ? result.points.reduce((sum, point) => sum + Number(point.score), 0) : 0;
  });
  const modelEarned = modelScores.reduce((sum, score) => sum + score, 0);
  const finalEarned = session.earned == null ? modelEarned : Number(session.earned);
  const reviewCount = session.questions.filter((question) => needsReview(question)).length;
  function update(next: BankSession) {
    client.setQueryData(['bank-session', testId], next);
  }
  async function act(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  }
  async function uploadFiles(selected: File[]) {
    if (!selected.length || busy) return;
    if (selected.length + photos.length > 20) {
      setError('每卷最多20张照片');
      return;
    }
    const invalid = selected.find(
      (file) => !['image/jpeg', 'image/png'].includes(file.type) || file.size > 8 * 1024 * 1024,
    );
    if (invalid) {
      setError(`${invalid.name}：请选择不超过8MB的JPG或PNG图片`);
      return;
    }
    await act(async () => {
      let current = session;
      let uploaded = 0;
      try {
        for (const [index, file] of selected.entries()) {
          setUploadProgress({ index: index + 1, total: selected.length, percent: 0, name: file.name });
          const form = new FormData();
          form.append('file', file);
          form.append('expectedRevision', String(current.revision));
          current = await bankRequest<BankSession>(
            `/bank/sessions/${testId}/sheet-pages`,
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
                  name: file.name,
                });
              },
            },
          );
          update(current);
          uploaded += 1;
        }
        setNotice(`已保存${photos.length + uploaded}张照片，可刷新恢复`);
      } catch (e) {
        try {
          const recovered = await bankRequest<BankSession>(`/bank/sessions/${testId}`);
          update(recovered);
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
  async function removePhoto(file: { id: string; name: string }) {
    await act(async () => {
      if (!(await confirm(`确认移除照片 ${file.name}？其他已保存照片保留。`))) return;
      update(
        await bankRequest<BankSession>(
          `/bank/sessions/${testId}/sheet-pages/${file.id}?expectedRevision=${session.revision}`,
          'DELETE',
        ),
      );
      setPreview('');
    });
  }
  async function showPhoto(file: { id: string }) {
    await act(async () => {
      const image = await bankRequest<{ mimeType: string; contentBase64: string }>(
        `/bank/sessions/${testId}/pages/${file.id}`,
      );
      setPreview(`data:${image.mimeType};base64,${image.contentBase64}`);
    });
  }
  async function apply() {
    await act(async () => {
      if (
        !(await confirm(
          '确认照片已拍全整卷作答并标明题号？提交后照片不可修改，AI 将逐题评分；缺答计零，看不清或题号无法匹配将进入人工复核。',
        ))
      )
        return;
      update(
        await bankRequest<BankSession>(`/bank/sessions/${testId}/grading`, 'POST', {
          expectedRevision: session.revision,
        }),
      );
      setNotice('已提交批改，分数返回后本页会自动更新。');
    });
  }
  async function generatePdf() {
    if (!sheet.current || pdfBusy) return;
    setPdfBusy(true);
    setError('');
    try {
      const { assessmentSheetPdf } = await import('../features/bank/assessmentSheetPdf');
      const pdf = await assessmentSheetPdf(sheet.current);
      setPdfPages(pdf.pageCount);
      const url = URL.createObjectURL(pdf.blob);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF生成失败，请重试');
    } finally {
      setPdfBusy(false);
    }
  }
  const elapsed = seconds(session, now);
  return (
    <section className="sheet-assessment">
      <header className="sheet-hero">
        <div>
          <p className="sheet-eyebrow">独立试卷 · 整卷照片批改</p>
          <h1>{titleOf(session)}</h1>
          <p className="sheet-context">
            不限时 · 开始后请在答题纸上按题号作答，完成后拍摄清晰照片，一次提交整卷。
          </p>
          <div className="sheet-facts">
            <span>{session.questions.length} 道题</span>
            <span>满分 {maximum} 分</span>
            <span>已用时 {duration(elapsed)}</span>
            <span>试卷编号 {session.id.slice(0, 8)}</span>
          </div>
        </div>
        <span className={`sheet-status sheet-status-${session.status.toLowerCase()}`}>
          {statusNames[session.status] ?? session.status}
        </span>
      </header>
      {error && (
        <div className="sheet-alert sheet-alert-error" role="alert">
          <AlertCircle size={18} />
          <div>
            <strong>操作未完成</strong>
            <p>{error}</p>
            <small>已上传成功的照片和已保存的结果仍保留。</small>
          </div>
        </div>
      )}
      {notice && (
        <div className="sheet-alert sheet-alert-ok" role="status">
          <Check size={18} />
          <span>{notice}</span>
        </div>
      )}
      <div className="sheet-workspace">
        <aside className="sheet-aside">
          <Card className="sheet-side-card">
            <div className="sheet-side-heading">
              <p className="sheet-eyebrow">本卷进度</p>
              <strong>{statusNames[session.status] ?? session.status}</strong>
            </div>
            <p className="sheet-side-copy">
              {inProgress
                ? photos.length
                  ? '照片已保存，请核对后提交整卷批改。'
                  : '先查看或下载试卷，在答题纸上作答，再上传整卷照片。'
                : session.status === 'PENDING'
                  ? session.workerOnline
                    ? '批改程序在线，结果返回后页面会自动更新。'
                    : session.workerReason || '批改程序离线，提交后排队等待。'
                  : session.status === 'NEEDS_REVIEW'
                    ? 'AI 已返回结果，部分题目需要管理员核对原图后确认。'
                    : session.status === 'FAILED'
                      ? session.taskError || '批改失败，可以重新开始本卷。'
                      : '本卷已完成评分。'}
            </p>
            <dl className="sheet-facts-list">
              <div>
                <dt>已保存照片</dt>
                <dd>{photos.length} / 20 张</dd>
              </div>
              <div>
                <dt>评分状态</dt>
                <dd>{statusNames[session.status] ?? session.status}</dd>
              </div>
              {session.status === 'GRADED' && (
                <div>
                  <dt>本卷得分</dt>
                  <dd>
                    {Number(finalEarned.toFixed(2))} / {session.maximum}
                  </dd>
                </div>
              )}
              {session.status === 'NEEDS_REVIEW' && (
                <div>
                  <dt>待核对</dt>
                  <dd>{reviewCount} 题</dd>
                </div>
              )}
              {session.taskModel && (
                <div>
                  <dt>批改模型</dt>
                  <dd>{session.taskModel === 'deepseek-dsh' ? 'DeepSeek DSH' : session.taskModel}</dd>
                </div>
              )}
            </dl>
            {inProgress && (
              <>
                <label className={`sheet-upload-zone ${busy ? 'is-busy' : ''}`}>
                  <Upload size={26} />
                  <strong>{photos.length ? '继续添加作答照片' : '上传整卷作答照片'}</strong>
                  <span>一张照片可以包含多题，请拍清题号，未答题留空。</span>
                  <small>JPG / PNG · 每张最多 8MB · 最多 20 张</small>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png"
                    aria-label="上传整卷作答照片"
                    disabled={busy || photos.length >= 20}
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      event.target.value = '';
                      void uploadFiles(files);
                    }}
                  />
                </label>
                {uploadProgress && (
                  <div className="sheet-progress" role="status">
                    <strong>
                      正在保存第 {uploadProgress.index} / {uploadProgress.total} 张照片
                    </strong>
                    <span>{uploadProgress.name}</span>
                    <progress max="100" value={uploadProgress.percent} />
                    <small>传输完成后会等待服务器确认，请保持此页打开。</small>
                  </div>
                )}
                <Button
                  loading={busy}
                  disabled={busy || !photos.length}
                  disabledReason="请先上传至少一张作答照片"
                  onClick={() => void apply()}
                >
                  提交整卷并申请AI批改
                  <ArrowRight size={17} />
                </Button>
              </>
            )}
            {!inProgress && (
              <Button
                variant="secondary"
                onClick={() => void client.invalidateQueries({ queryKey: ['bank-session', testId] })}
              >
                刷新批改进度
              </Button>
            )}
          </Card>
          <Card className="sheet-side-card sheet-guide">
            <p className="sheet-eyebrow">操作顺序</p>
            <ol>
              <li>
                <span>1</span>
                <div>
                  <strong>查看或打印试卷</strong>
                  <p>右侧是 PDF 样式的完整试卷，可下载打印。</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>在答题纸上作答</strong>
                  <p>标明题号，整卷不限时。</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>上传照片并提交</strong>
                  <p>一次提交整卷，等待 AI 批改与人工复核。</p>
                </div>
              </li>
            </ol>
          </Card>
          <p className="sheet-footnote">
            缺答计零；字迹不清、缺页或题号无法对应时会进入待核对，管理员确认后才计入成绩。章节检测按三套卷平均分判定，模拟卷达到90%取得资格。
          </p>
        </aside>
        <main className="sheet-main">
          <div className="sheet-document-bar">
            <FileText size={22} />
            <div>
              <strong>PDF 样式试卷</strong>
              <p>本页与下载的 PDF 内容一致，不含参考答案。</p>
            </div>
            <div className="sheet-document-actions">
              <Button
                variant="secondary"
                loading={pdfBusy}
                disabled={pdfBusy}
                onClick={() => void generatePdf()}
              >
                <FileText size={16} />
                {pdfUrl ? '重新生成PDF' : '生成试卷PDF'}
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
                    download={`${titleOf(session)}.pdf`}
                  >
                    <Download size={16} />
                    下载PDF
                  </a>
                </>
              )}
            </div>
          </div>
          {pdfPages > 0 && <p className="sheet-muted">已生成 {pdfPages} 页 PDF。</p>}
          <div className="sheet-paper-frame">
            <ExamPaper session={session} />
          </div>
          {!!photos.length && (
            <Card className="sheet-photos">
              <div className="sheet-section-heading">
                <div>
                  <h2>已保存的作答照片</h2>
                  <p>{inProgress ? '已保存的照片可以预览或移除。' : '本卷已提交，照片保留供核对。'}</p>
                </div>
                <span>{photos.length} / 20</span>
              </div>
              <div className="sheet-photo-list">
                {photos.map((file, index) => (
                  <div className="sheet-photo-item" key={file.id}>
                    <span className="sheet-photo-index">{index + 1}</span>
                    <div>
                      <strong>{file.name}</strong>
                      <small>
                        <Check size={13} /> 已保存
                      </small>
                    </div>
                    <Button variant="ghost" disabled={busy} onClick={() => void showPhoto(file)}>
                      查看照片{index + 1}
                    </Button>
                    {inProgress && (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void removePhoto(file)}
                      >
                        移除照片{index + 1}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {preview && (
                <div className="sheet-photo-preview">
                  <div>
                    <strong>作答照片预览</strong>
                    <Button variant="ghost" onClick={() => setPreview('')}>
                      关闭预览
                    </Button>
                  </div>
                  <img src={preview} alt="整卷作答照片预览" />
                </div>
              )}
            </Card>
          )}
          {!inProgress && (
            <ResultPanel session={session} finalEarned={finalEarned} modelEarned={modelEarned} />
          )}
        </main>
      </div>
      <div className="exam-pdf-stage" aria-hidden="true">
        <ExamPaper session={session} innerRef={sheet} pdf />
      </div>
      <Link className="button button-secondary" to={`/study/course/${code}/practice`}>
        返回章节检测与模拟卷
      </Link>
    </section>
  );
}

function needsReview(question: BankQuestion) {
  return (
    question.saved?.grading_state === 'NEEDS_REVIEW' ||
    !!question.saved?.result_snapshot?.reviewItems.length
  );
}

function scoreOf(question: BankQuestion) {
  if (question.saved?.earned != null) return Number(question.saved.earned);
  return question.saved?.result_snapshot
    ? question.saved.result_snapshot.points.reduce((sum, point) => sum + Number(point.score), 0)
    : 0;
}

function ExamPaper({
  session,
  innerRef,
  pdf = false,
}: {
  session: BankSession;
  innerRef?: Ref<HTMLDivElement>;
  pdf?: boolean;
}) {
  const maximum = session.questions.reduce((sum, question) => sum + Number(question.maximum), 0);
  return (
    <article className={`exam-paper ${pdf ? 'exam-paper-pdf' : ''}`} ref={innerRef}>
      <header className="exam-paper-header" data-exam-block>
        <p className="exam-paper-brand">学习知途 · 固定检测试卷</p>
        <h1>{titleOf(session)}</h1>
        <p className="exam-paper-subtitle">
          {session.kind === 'MOCK' ? '全课程综合模拟' : '章节独立检测'} · 共 {session.questions.length} 题 · 满分 {maximum} 分
        </p>
        <div className="exam-paper-identity">
          <span>姓名：</span>
          <span>日期：</span>
          <span>得分：</span>
        </div>
        <p className="exam-paper-instructions">
          说明：请另纸作答并在每道题前标明题号；本卷不限时。完成后将整卷清晰拍照，在网页一次提交。
          题目不含参考答案。缺答计零，字迹不清或题号无法对应时进入人工复核。
        </p>
      </header>
      <div className="exam-paper-questions">
        {session.questions.map((question, index) => (
          <section className="exam-paper-question" data-exam-block key={question.id}>
            <h2>
              <span>第 {index + 1} 题</span>
              <span>
                {typeNames[question.type] ?? question.type} · {question.maximum} 分
              </span>
            </h2>
            <QuestionStem text={question.stem} />
            {!!question.options.length && (
              <ol className="exam-paper-options">
                {question.options.map((option, optionIndex) => (
                  <li key={optionIndex}>
                    <span>{String.fromCharCode(65 + optionIndex)}.</span>
                    <MathText text={option} />
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>
      <footer className="exam-paper-footer">
        共 {session.questions.length} 题 · 满分 {maximum} 分 · 请在答题纸上标明题号
      </footer>
    </article>
  );
}

function ResultPanel({
  session,
  finalEarned,
  modelEarned,
}: {
  session: BankSession;
  finalEarned: number;
  modelEarned: number;
}) {
  const maximum = Number(session.maximum);
  const review = session.status === 'NEEDS_REVIEW';
  const score = review ? modelEarned : finalEarned;
  const rate = maximum ? Math.round((score / maximum) * 10000) / 100 : 0;
  return (
    <Card className="sheet-results">
      <div className="sheet-section-heading">
        <div>
          <h2>批改结果</h2>
          <p>逐题查看识别作答、评分点与扣分依据；待核对题目以管理员最终确认为准。</p>
        </div>
        <span>{statusNames[session.status] ?? session.status}</span>
      </div>
      {session.status === 'PENDING' && (
        <div className="sheet-empty">
          <Clock3 size={34} />
          <strong>已提交，等待 AI 批改</strong>
          <p>{session.workerOnline ? '批改程序在线，结果返回后自动更新。' : session.workerReason}</p>
        </div>
      )}
      {session.status === 'FAILED' && (
        <div className="sheet-empty">
          <AlertCircle size={34} />
          <strong>本卷批改失败</strong>
          <p>{session.taskError || '请返回章节检测页重新开始本卷。'}</p>
        </div>
      )}
      {(session.status === 'GRADED' || review) && (
        <>
          <div className={`sheet-result-summary ${review ? 'needs-review' : ''}`}>
            <div>
              <span>{review ? 'AI 参考得分' : '本卷得分'}</span>
              <strong>
                {Number(score.toFixed(2))}
                <small> / {maximum}</small>
              </strong>
            </div>
            <div>
              <span>{session.rateLabel || '得分率'}</span>
              <strong>{rate}%</strong>
            </div>
            <p>
              {review
                ? '存在待核对内容，当前分数尚未确认，不计入章节通过或模拟卷资格。'
                : session.kind === 'CHAPTER'
                  ? session.chapterPassed
                    ? '本章三套检测已完成评分并取得本章通过资格。'
                    : `本卷${Number(score) >= maximum * 0.9 ? '达到' : '未达到'}90%；本章三套卷全部评分后按平均分判定。`
                  : session.passed
                    ? '本卷达到90%，已取得模拟卷通过资格。'
                    : '本卷未达到90%，可查看扣分原因后重新开始。'}
            </p>
          </div>
          {session.chapterProgress && (
            <div className="sheet-chapter-progress">
              <p>
                本章三套：已评分 {session.chapterProgress.graded}/3 ·{' '}
                {session.chapterProgress.rateLabel}{' '}
                {session.chapterProgress.meanRate == null
                  ? '待全部评分'
                  : `${session.chapterProgress.meanRate}%`}
              </p>
              {session.chapterProgress.papers.map((paper) => (
                <span key={paper.variant}>
                  {paper.variant} 卷 · {paper.status === 'GRADED' ? `${paper.rate ?? '—'}%` : '待评分'}
                </span>
              ))}
            </div>
          )}
          <div className="sheet-result-list">
            {session.questions.map((question, index) => {
              const result = question.saved?.result_snapshot;
              const earned = scoreOf(question);
              const flagged = needsReview(question);
              return (
                <details
                  className="sheet-result-item"
                  key={question.id}
                  open={flagged || earned < Number(question.maximum)}
                >
                  <summary>
                    <span className="sheet-question-number">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <strong>第 {index + 1} 题</strong>
                    <span className={`sheet-answer-flag ${flagged ? 'needs-review' : ''}`}>
                      {flagged
                        ? '待核对'
                        : earned === Number(question.maximum)
                          ? '满分'
                          : '查看扣分'}
                    </span>
                    <span className="sheet-answer-score">
                      {Number(earned.toFixed(2))}
                      <small> / {question.maximum}</small>
                    </span>
                  </summary>
                  <div className="sheet-result-detail">
                    <div>
                      <h4>题目</h4>
                      <QuestionStem text={question.stem} />
                    </div>
                    <div>
                      <h4>识别作答</h4>
                      <MathText text={result?.recognizedAnswer || '未识别到作答'} />
                    </div>
                    <div>
                      <h4>评分依据</h4>
                      {result?.points.length ? (
                        result.points.map((point) => (
                          <p className="sheet-score-reason" key={point.pointId}>
                            <strong>{point.score} 分</strong>
                            <span>{point.reason || '该评分点通过'}</span>
                          </p>
                        ))
                      ) : (
                        <p>暂无逐点评分依据。</p>
                      )}
                    </div>
                    {!!result?.reviewItems.length && (
                      <div className="sheet-review-note">
                        <strong>需要核对</strong>
                        {result.reviewItems.map((item, itemIndex) => (
                          <p key={itemIndex}>{item}</p>
                        ))}
                      </div>
                    )}
                    {question.explanation && (
                      <div>
                        <h4>解析</h4>
                        <MathText text={question.explanation} />
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
          <p className="sheet-footnote">
            AI 只提供逐题参考评分；进入人工复核的题目在管理员确认前不授予章节通过或模拟卷资格。
          </p>
        </>
      )}
    </Card>
  );
}
