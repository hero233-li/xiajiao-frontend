import { useEffect, useState } from 'react';
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
import { UnsavedGuard } from '../../components/UnsavedGuard';
import { AnswerInput } from './BankPractice';
import { QuestionStem } from './QuestionStem';
import { useConfirmation } from '../../components/ConfirmationProvider';
import { FileImage, Save } from 'lucide-react';
type Answer = { text?: string; selectedOption?: number };
type Question = BankQuestion & {
  answer: Answer;
  files: { id: string; name: string; mimeType: string }[];
};
interface Batch {
  id: string;
  revision: number;
  questions: Question[];
  state: string;
  taskId: string | null;
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
export const hasBatchAnswer = (q: Question, answer: Answer = q.answer) =>
  q.type === 'CHOICE'
    ? answer.selectedOption !== undefined
    : Boolean(answer.text?.trim() || q.files.length);
const states: Record<string, string> = {
  QUEUED: '已申请，等待批改',
  GRADING: '正在批改',
  REVIEW: '批改结果需要管理员核对',
  COMPLETED: '批改完成',
  FAILED: '批改失败',
};
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
  const [notice, setNotice] = useState('');
  const client = useQueryClient();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState<Answer>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  async function open(newAttempt = false) {
    const b = await bankRequest<Batch>(`/bank/courses/${courseId}/practice-batches`, 'POST', {
      chapterId: chapter.chapter_id,
      pointKey: point.point_key,
      level,
      newAttempt,
    });
    setBatch(b);
    setIndex(0);
    setValue(b.questions[0].answer);
    setDirty(false);
    setPreview('');
  }
  useEffect(() => {
    let active = true;
    bankRequest<Batch>(`/bank/courses/${courseId}/practice-batches`, 'POST', {
      chapterId: chapter.chapter_id,
      pointKey: point.point_key,
      level,
      newAttempt: false,
    })
      .then((b) => {
        if (active) {
          setBatch(b);
          setValue(b.questions[0].answer);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [courseId, chapter.chapter_id, point.point_key, level]);
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
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
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
  async function save(): Promise<Batch> {
    if (!batch) throw Error('练习尚未读取');
    if (!dirty) {
      setNotice('本题已保存');
      return batch;
    }
    const b = await bankRequest<Batch>(
      `/bank/practice-batches/${batch.id}/answers/${batch.questions[index].id}`,
      'PUT',
      { answer: value, expectedRevision: batch.revision },
    );
    setBatch(b);
    setDirty(false);
    setNotice('本题已保存');
    return b;
  }
  if (!batch)
    return (
      <Card>
        <p role={error ? 'alert' : 'status'}>{error || '正在读取整组练习…'}</p>
        {error && <Button onClick={() => void act(() => open())}>重试</Button>}
      </Card>
    );
  const q = batch.questions[index];
  const locked = batch.state !== 'DRAFT';
  const completed = batch.questions.filter((item, i) =>
    hasBatchAnswer(item, i === index ? value : item.answer),
  ).length;
  return (
    <Card className="bank-practice" data-question-type={q.type}>
      <UnsavedGuard dirty={dirty} />
      <header className="batch-heading">
        <div>
          <p className="batch-kicker">
            {level === 'simple' ? '基础练习' : level === 'middle' ? '考试水平练习' : '提高练习'} ·
            共10题
          </p>
          <h2>{point.title}</h2>
        </div>
        <span className="batch-state">
          {locked ? states[batch.state] || batch.state : dirty ? '本题待保存' : '作答中'}
        </span>
      </header>
      <div className="batch-progress">
        <p>
          第 {index + 1} / 10 题 · 已作答 {completed}/10
        </p>
        <progress aria-label="整组作答进度" value={completed} max={10} />
      </div>
      <nav className="batch-question-nav" aria-label="选择题号">
        {batch.questions.map((item, i) => (
          <Button
            key={item.id}
            variant={i === index ? 'primary' : 'secondary'}
            aria-current={i === index ? 'step' : undefined}
            className={
              hasBatchAnswer(item, i === index ? value : item.answer) ? 'question-answered' : ''
            }
            disabled={busy}
            onClick={() =>
              void act(async () => {
                const b = await save();
                setIndex(i);
                setValue(b.questions[i].answer);
                setPreview('');
              })
            }
          >
            {i + 1}
            {hasBatchAnswer(item, i === index ? value : item.answer) ? ' ✓' : ''}
          </Button>
        ))}
      </nav>
      <section className="batch-question" aria-labelledby="batch-question-title">
        <div className="batch-question-meta">
          <h3 id="batch-question-title">第 {index + 1} 题</h3>
          <span>
            {(
              {
                CHOICE: '选择题',
                FILL: '填空题',
                CALCULATION: '计算题',
                CODE: '代码题',
                OPERATION: '操作题',
              } as Record<string, string>
            )[q.type] || '主观题'}{' '}
            · {q.maximum} 分
          </span>
        </div>
        <QuestionStem text={q.stem} />
      </section>
      <section className="batch-response">
        <AnswerInput
          question={q}
          value={value}
          disabled={busy || locked}
          onChange={(v) => {
            setValue(v);
            setDirty(true);
            setNotice('');
          }}
        />
      </section>
      {q.type !== 'CHOICE' && (
        <details className="bank-images" open={q.files.length > 0 || undefined}>
          <summary>
            <FileImage size={18} />
            图片作答{' '}
            <span>{q.files.length ? `已上传 ${q.files.length}/2 张` : '可选 · 支持手写答案'}</span>
          </summary>
          <p>每题最多2张，支持JPG、PNG，每张不超过8MB。</p>
          <label>
            上传本题作答图片
            <input
              aria-label="上传本题作答图片"
              type="file"
              accept="image/jpeg,image/png"
              disabled={busy || locked || q.files.length >= 2}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                if (!['image/jpeg', 'image/png'].includes(f.type) || f.size > 8 * 1024 * 1024) {
                  setError('请选择不超过8MB的JPG或PNG图片');
                  return;
                }
                void act(async () => {
                  const b = await save();
                  const form = new FormData();
                  form.append('file', f);
                  form.append('expectedRevision', String(b.revision));
                  setBatch(
                    await bankRequest<Batch>(
                      `/bank/practice-batches/${b.id}/answers/${q.id}/pages`,
                      'POST',
                      form,
                    ),
                  );
                });
              }}
            />
          </label>
          {q.files.map((f) => (
            <div className="row" key={f.id}>
              <span>{f.name}</span>
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
                查看图片
              </Button>
              {!locked && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    void act(async () => {
                      if (
                        !(await confirm(
                          '移除此题的作答图片后，批改将不再使用该图片。文字答案仍会保留。确认移除？',
                        ))
                      )
                        return;
                      const b = await save();
                      setBatch(
                        await bankRequest<Batch>(
                          `/bank/practice-batches/${b.id}/answers/${q.id}/pages/${f.id}?expectedRevision=${b.revision}`,
                          'DELETE',
                        ),
                      );
                      setPreview('');
                    })
                  }
                >
                  移除
                </Button>
              )}
            </div>
          ))}
          {preview && (
            <img src={preview} alt="本题作答图片" style={{ maxWidth: '100%', maxHeight: 500 }} />
          )}
        </details>
      )}
      {!locked && (
        <footer className="batch-actions">
          <div className="batch-save">
            <Button
              loading={busy}
              onClick={() =>
                void act(async () => {
                  await save();
                })
              }
            >
              <Save size={18} />
              保存本题
            </Button>
            <span role="status">{dirty ? '有未保存的作答' : notice || '切换题号时自动保存'}</span>
          </div>
          <div className="batch-submit">
            <Button
              variant="secondary"
              loading={busy}
              disabled={completed !== 10}
              onClick={() =>
                void act(async () => {
                  const b = await save();
                  setBatch(
                    await bankRequest<Batch>(`/bank/practice-batches/${b.id}/grading`, 'POST', {
                      expectedRevision: b.revision,
                    }),
                  );
                })
              }
            >
              完成10题，申请批改
            </Button>
            <span>完成全部作答后统一批改</span>
          </div>
        </footer>
      )}
      {locked && (
        <div role="status">
          <strong>{states[batch.state] || batch.state}</strong>
          {['QUEUED', 'GRADING'].includes(batch.state) && !batch.workerOnline && (
            <p>{batch.workerReason}</p>
          )}
          {batch.error && <p>{batch.error}</p>}
          {batch.result && (
            <>
              <p>{batch.result.reviewItems.join('；')}</p>
              {batch.result.answers.map((a) => (
                <details key={a.number} open={Number(a.number) === index + 1}>
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
          {error}。你的输入仍保留，请重试保存。
        </p>
      )}
      {dirty && <p role="status">有未保存的作答，切换题号时会自动保存。</p>}
    </Card>
  );
}
