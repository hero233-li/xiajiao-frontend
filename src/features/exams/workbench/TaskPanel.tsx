import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Cpu, LoaderCircle, TriangleAlert } from 'lucide-react';
import type { GradingResult, GradingTask } from '../../../api/grading';
import { gradingRequest } from '../../../api/grading';
import { Button } from '../../../components/Button';
import { TaskImages } from './TaskImages';

export const taskStateLabels: Record<string, string> = {
  QUEUED: '排队中',
  GRADING: '批改中',
  REVIEW: '待核对',
  COMPLETED: '已完成',
  FAILED: '失败',
};

const terminal = (task: GradingTask) => ['REVIEW', 'COMPLETED', 'FAILED'].includes(task.state);

export function TaskPanel({
  task,
  onRefreshed,
  canWrite,
  analysisLink,
}: {
  task?: GradingTask;
  onRefreshed: () => void;
  canWrite: boolean;
  analysisLink?: string;
}) {
  const [review, setReview] = useState<GradingResult>();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setReview(task?.result ?? undefined);
    setConfirmed(false);
  }, [task?.id, task?.result]);

  const total = task?.result
    ? task.result.answers.reduce(
        (sum, answer) => sum + answer.points.reduce((n, point) => n + point.score, 0),
        0,
      )
    : null;

  if (!task)
    return (
      <section className="wb-card" aria-labelledby="wb-task-title">
        <header className="wb-card-head">
          <div>
            <h2 id="wb-task-title">批改进度</h2>
            <p className="secondary">还没有提交过批改。填写上方条件后提交，进度会实时显示在这里。</p>
          </div>
        </header>
        <p className="wb-empty">提交后这里会出现排队、批改、待核对与最终分数。</p>
      </section>
    );

  return (
    <section className="wb-card" aria-labelledby="wb-task-title" aria-live="polite">
      <header className="wb-card-head">
        <div>
          <h2 id="wb-task-title">批改进度</h2>
          <p className="secondary">
            任务 {task.id.slice(0, 8)}
            {task.model ? ` · 模型 ${task.model}` : ''}
          </p>
        </div>
        <span className={`wb-task-state is-${task.state.toLowerCase()}`}>
          {!terminal(task) && <LoaderCircle size={14} className="spin" aria-hidden="true" />}
          {taskStateLabels[task.state] ?? task.state}
        </span>
      </header>

      {!task.workerOnline && !terminal(task) && (
        <p className="wb-muted">
          <Cpu size={15} aria-hidden="true" />
          {task.workerReason ?? 'Mac 批改程序离线，任务会排队等待。'}
        </p>
      )}
      {task.error && (
        <p className="wb-inline-error" role="alert">
          <TriangleAlert size={15} aria-hidden="true" />
          {task.error}
        </p>
      )}
      {task.kind === 'GRADE' && <TaskImages taskId={task.id} />}

      {total !== null && (
        <p className="wb-task-total">
          本次批改总分
          <strong>{total.toFixed(2)}</strong>
          <small>/ 100</small>
        </p>
      )}

      {task.state === 'COMPLETED' && (
        <p className="wb-muted">
          <CheckCircle2 size={15} aria-hidden="true" />
          成绩已生成，可在下方「成绩」和真题列表看到。
          {analysisLink && <a href={analysisLink}>查看知识点梳理 →</a>}
        </p>
      )}

      {task.state === 'REVIEW' && review && (
        <div className="wb-review">
          <h3>
            <ClipboardCheck size={16} aria-hidden="true" />
            待核对：确认识别结果与每个得分点
          </h3>
          {review.answers.map((answer, index) => (
            <fieldset key={answer.number}>
              <legend>
                第 {answer.number} 题
                <small>图片页码 {answer.pages.join('、') || '未关联'}</small>
              </legend>
              <label>
                识别答案
                <textarea
                  value={answer.recognizedAnswer}
                  onChange={(event) =>
                    setReview({
                      ...review,
                      answers: review.answers.map((item, i) =>
                        i === index ? { ...item, recognizedAnswer: event.target.value } : item,
                      ),
                    })
                  }
                />
              </label>
              {answer.reviewItems.map((item) => (
                <p key={item} className="wb-inline-warn">
                  待核对：{item}
                </p>
              ))}
              <div className="wb-points">
                {answer.points.map((point, pointIndex) => (
                  <div key={point.pointId} className="wb-point">
                    <label>
                      评分点 {point.pointId} 得分
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        max={100}
                        value={point.score}
                        onChange={(event) =>
                          setReview({
                            ...review,
                            answers: review.answers.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    points: item.points.map((value, k) =>
                                      k === pointIndex
                                        ? { ...value, score: Number(event.target.value) }
                                        : value,
                                    ),
                                  }
                                : item,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      扣分原因
                      <input
                        value={point.reason}
                        onChange={(event) =>
                          setReview({
                            ...review,
                            answers: review.answers.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    points: item.points.map((value, k) =>
                                      k === pointIndex
                                        ? { ...value, reason: event.target.value }
                                        : value,
                                    ),
                                  }
                                : item,
                            ),
                          })
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
              <label>
                确认图片页码（逗号分隔）
                <input
                  value={answer.pages.join(',')}
                  onChange={(event) =>
                    setReview({
                      ...review,
                      answers: review.answers.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              pages: event.target.value
                                ? event.target.value.split(',').map(Number).filter(Number.isFinite)
                                : [],
                            }
                          : item,
                      ),
                    })
                  }
                />
              </label>
            </fieldset>
          ))}
          <label className="wb-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            已核对原始照片、逐题识别及所有待核对项
          </label>
          {error && (
            <p role="alert" className="wb-inline-error">
              {error}
            </p>
          )}
          <Button
            disabled={busy || !confirmed || !canWrite}
            loading={busy}
            onClick={() => {
              setBusy(true);
              setError('');
              void gradingRequest('POST', `/tasks/${task.id}/review`, {
                ...review,
                reviewItems: [],
                answers: review.answers.map((answer) => ({ ...answer, reviewItems: [] })),
              })
                .then(onRefreshed)
                .catch((reason: unknown) =>
                  setError(reason instanceof Error ? reason.message : '提交核对失败'),
                )
                .finally(() => setBusy(false));
            }}
          >
            确认并生成成绩
          </Button>
        </div>
      )}
    </section>
  );
}
