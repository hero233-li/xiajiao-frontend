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
import { Download, FileImage, FileText } from 'lucide-react';
import { practiceSheetPdf } from './practiceSheetPdf';
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
  QUEUED: '已申请，等待批改',
  GRADING: '正在批改',
  REVIEW: '批改结果需要管理员核对',
  COMPLETED: '批改完成',
  FAILED: '批改失败',
};
const levels = { simple: '基础练习', middle: '考试水平练习', hard: '提高练习（选做）' };
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfPreview, setPdfPreview] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
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
      setPreview('');
      setNotice('');
    },
    [courseId, chapter.chapter_id, point.point_key, level],
  );
  useEffect(() => {
    let active = true;
    setBatch(null);
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
    setPdfUrl('');
    setPdfPreview('');
    setPreview('');
  }, [batchId]);
  useEffect(() => {
    if (!batchId) return;
    let active = true;
    setPdfBusy(true);
    const timer = setTimeout(() => {
      if (!sheet.current) return;
      void practiceSheetPdf(sheet.current)
        .then(({ blob, imageUrl }) => {
          if (active) {
            setPdfUrl(URL.createObjectURL(blob));
            setPdfPreview(imageUrl);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setPdfBusy(false);
        });
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
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
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  }
  async function generatePdf() {
    if (!sheet.current) return;
    setPdfBusy(true);
    setError('');
    try {
      const pdf = await practiceSheetPdf(sheet.current);
      setPdfUrl(URL.createObjectURL(pdf.blob));
      setPdfPreview(pdf.imageUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF生成失败，请重试');
    } finally {
      setPdfBusy(false);
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
  const hasLegacy = batch.questions.some(
    (q) => q.files.length || q.answer.text || q.answer.selectedOption !== undefined,
  );
  const maximum = batch.questions.reduce((s, q) => s + Number(q.maximum), 0);
  return (
    <Card className="bank-practice practice-sheet-batch">
      <header className="batch-heading">
        <div>
          <p className="batch-kicker">{levels[level]} · 共10题 · 整组批改</p>
          <h2>{point.title}</h2>
        </div>
        <span className="batch-state">
          {locked ? states[batch.state] || batch.state : '待上传作答'}
        </span>
      </header>
      <ol className="sheet-steps">
        <li>查看或下载十题PDF</li>
        <li>按1—10题编号手写作答并拍照</li>
        <li>上传照片，一次申请AI批改</li>
      </ol>
      <section aria-label="十题PDF练习单">
        <div className="sheet-toolbar">
          <Button loading={pdfBusy} disabled={pdfBusy} onClick={() => void generatePdf()}>
            <FileText size={18} />
            {pdfUrl ? '重新生成PDF' : '生成单页PDF'}
          </Button>
          {pdfUrl && (
            <a
              className="button button-secondary"
              href={pdfUrl}
              download={`${point.title}-${level}-十题练习单.pdf`}
            >
              <Download size={18} />
              下载PDF
            </a>
          )}
        </div>
        <p className="sheet-help">
          一页包含全部10题，不含答案。长题组自动使用较大纸张以保持清晰；可在另纸作答，务必标明题号。
        </p>
        {pdfUrl ? (
          <img className="sheet-pdf-preview" src={pdfPreview} alt="十题PDF练习单预览" />
        ) : (
          <div className="sheet-overview">
            <FileText size={32} />
            <p>10题练习单 · 满分{maximum}分</p>
            <p>生成后可在这里查看PDF，也可以展开下方题目预览。</p>
          </div>
        )}
        <details className="sheet-question-preview">
          <summary>展开全部10题预览</summary>
          {batch.questions.map((q, i) => (
            <section key={q.id}>
              <h3>
                第{i + 1}题 · {q.maximum}分
              </h3>
              <QuestionStem text={q.stem} />
              {q.options.map((option, n) => (
                <p key={n}>
                  {String.fromCharCode(65 + n)}. <MathText text={option} />
                </p>
              ))}
            </section>
          ))}
        </details>
      </section>
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
      <section className="sheet-upload" aria-label="整组照片提交">
        <h3 id="sheet-upload-title">
          <FileImage size={20} />
          上传整组作答照片
        </h3>
        <p>
          一次可选多张JPG/PNG，每张不超过8MB，最多20张。无需逐题上传；一张照片可含多题。请拍全1—10题的作答区域，未答题也标明题号并留空。
        </p>
        <label className="sheet-upload-label">
          选择作答照片
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png"
            aria-label="上传整组作答照片"
            disabled={busy || locked || photos.length >= 20}
            onChange={(e) => {
              const selected = Array.from(e.target.files ?? []);
              e.target.value = '';
              if (!selected.length) return;
              if (selected.length + photos.length > 20) {
                setError('每组最多20张照片');
                return;
              }
              if (
                selected.some(
                  (f) => !['image/jpeg', 'image/png'].includes(f.type) || f.size > 8 * 1024 * 1024,
                )
              ) {
                setError('请选择不超过8MB的JPG或PNG图片');
                return;
              }
              void act(async () => {
                let current = batch;
                let uploaded = 0;
                try {
                  for (const f of selected) {
                    const form = new FormData();
                    form.append('file', f);
                    form.append('expectedRevision', String(current.revision));
                    current = await bankRequest<Batch>(
                      `/bank/practice-batches/${current.id}/sheet-pages`,
                      'POST',
                      form,
                    );
                    setBatch(current);
                    uploaded++;
                  }
                  setNotice(`已保存${photos.length + uploaded}张照片，可刷新恢复`);
                } catch (e) {
                  throw Error(
                    `已保存${uploaded}张，本次其余照片未上传。${e instanceof Error ? e.message : '请重试'}`,
                  );
                }
              });
            }}
          />
        </label>
        <p role="status">
          已上传 {photos.length}/20 张{notice && ` · ${notice}`}
        </p>
        {photos.map((f, i) => (
          <div className="sheet-photo-row" key={f.id}>
            <span>
              照片{i + 1} · {f.name}
            </span>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  const image = await bankRequest<{ mimeType: string; contentBase64: string }>(
                    `/bank/practice-batches/${batch.id}/pages/${f.id}`,
                  );
                  setPreview(`data:${image.mimeType};base64,${image.contentBase64}`);
                })
              }
            >
              查看照片{i + 1}
            </Button>
            {!locked && (
              <Button
                variant="secondary"
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
        {preview && <img className="sheet-answer-preview" src={preview} alt="整组作答照片预览" />}
        {!locked && (
          <div className="sheet-apply">
            <Button
              loading={busy}
              disabled={busy || !photos.length}
              onClick={() =>
                void act(async () => {
                  if (
                    !(await confirm(
                      '确认照片已拍全1—10题作答？提交后本组照片不可修改。AI将逐题评分，缺答计零；看不清或题号无法匹配将待核对。',
                    ))
                  )
                    return;
                  setBatch(
                    await bankRequest<Batch>(`/bank/practice-batches/${batch.id}/grading`, 'POST', {
                      expectedRevision: batch.revision,
                    }),
                  );
                })
              }
            >
              申请AI批改全部10题
            </Button>
            <p>
              逐题返回识别结果、得分和扣分原因。
              {batch.questions.every((q) => q.type === 'CHOICE')
                ? '纯选择题按正确率'
                : '混合或主观题按得分率'}
              达90%才满足本考点门槛；缺答计零，评分未完成不解锁。
            </p>
          </div>
        )}
      </section>
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
                      const image = await bankRequest<{ mimeType: string; contentBase64: string }>(
                        `/bank/practice-batches/${batch.id}/pages/${f.id}`,
                      );
                      setPreview(`data:${image.mimeType};base64,${image.contentBase64}`);
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
      {locked && (
        <div className="sheet-result" role="status">
          <strong>{states[batch.state] || batch.state}</strong>
          {['QUEUED', 'GRADING'].includes(batch.state) && !batch.workerOnline && (
            <p>{batch.workerReason}</p>
          )}
          {batch.error && <p>{batch.error}</p>}
          {batch.result && (
            <>
              <p>{batch.result.reviewItems.join('；')}</p>
              {batch.result.answers.map((a) => (
                <details key={a.number} open>
                  <summary>
                    第{a.number}题 · {batch.state === 'REVIEW' ? '待核对分数' : '得分'}{' '}
                    {a.points.reduce((sum, p) => sum + p.score, 0)} /{' '}
                    {batch.questions[Number(a.number) - 1].maximum}
                  </summary>
                  <MathText text={a.recognizedAnswer} />
                  {a.points.map((p) => (
                    <p key={p.pointId}>
                      {p.score}分 · {p.reason || '该评分点通过'}
                    </p>
                  ))}
                  {a.reviewItems.length > 0 && <p role="alert">{a.reviewItems.join('；')}</p>}
                </details>
              ))}
            </>
          )}
          {['COMPLETED', 'FAILED', 'REVIEW'].includes(batch.state) && (
            <Button variant="secondary" disabled={busy} onClick={() => void act(() => open(true))}>
              开始新一组练习
            </Button>
          )}
        </div>
      )}
      {error && (
        <p className="batch-error" role="alert">
          {error}。已上传成功的照片仍保留。
        </p>
      )}
    </Card>
  );
}
