import { useConfirmation } from '../../components/ConfirmationProvider';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/Button';
import { sessionStore } from '../../api/session';
import {
  gradingRequest as request,
  type Submission,
  type Rubric,
  type RubricDocument,
  type GradingTask,
  type GradingResult,
  type GradingWorker,
  type PracticeInfo,
} from '../../api/grading';
import type { Paper } from '../../api/generated/models';
const states = {
  QUEUED: '排队中',
  GRADING: '批改中',
  REVIEW: '待核对',
  COMPLETED: '已完成',
  FAILED: '失败',
};
const terminal = (task: GradingTask) => ['REVIEW', 'COMPLETED', 'FAILED'].includes(task.state);
const initialRubric: RubricDocument = {
  questions: [
    {
      number: '1',
      stem: '',
      referenceAnswer: '',
      maximum: 100,
      points: [{ id: '1', description: '', maximum: 100 }],
    },
  ],
};
export function GradingPanel({
  courseId,
  cycleId,
  papers,
  canWrite,
}: {
  courseId: string;
  cycleId: string;
  papers: Paper[];
  canWrite: boolean;
}) {
  const client = useQueryClient();
  const confirm = useConfirmation();
  const [paperId, setPaperId] = useState(papers[0]?.id ?? '');
  const [selected, setSelected] = useState<Submission>();
  const [taskId, setTaskId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pair, setPair] = useState<{ id: string; token: string }>();
  const [rubric, setRubric] = useState<RubricDocument>();
  const [rubricId, setRubricId] = useState('');
  const [review, setReview] = useState<GradingResult>();
  const [confirmed, setConfirmed] = useState(false);
  const [practice, setPractice] = useState<Omit<PracticeInfo, 'expectedRevision'>>({
    practicedOn: new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()),
    minutes: 120,
    limitMinutes: 150,
    complete: false,
    closedBook: false,
    answersSeenBefore: true,
  });
  const admin = sessionStore.getSnapshot()?.user.role === 'ADMIN';
  const submissions = useQuery({
    queryKey: ['grading-submissions', courseId, cycleId],
    queryFn: () => request<Submission[]>('GET', '/submissions', undefined, { courseId, cycleId }),
  });
  const rubrics = useQuery({
    queryKey: ['grading-rubrics', courseId, cycleId, paperId],
    queryFn: () => request<Rubric[]>('GET', '/rubrics', undefined, { courseId, cycleId, paperId }),
    enabled: !!paperId && canWrite,
  });
  const workers = useQuery({
    queryKey: ['grading-workers'],
    queryFn: () => request<GradingWorker[]>('GET', '/workers'),
    refetchInterval: 5000,
  });
  const task = useQuery({
    queryKey: ['grading-task', taskId],
    queryFn: () => request<GradingTask>('GET', `/tasks/${taskId}`),
    enabled: !!taskId,
    refetchInterval: (q) => (q.state.data && terminal(q.state.data) ? false : 5000),
  });
  const tasks = useQuery({
    queryKey: ['grading-tasks', selected?.id],
    queryFn: () => request<GradingTask[]>('GET', `/submissions/${selected!.id}/tasks`),
    enabled: !!selected,
    refetchInterval: (q) => (q.state.data?.some((item) => !terminal(item)) ? 5000 : false),
  });
  useEffect(() => {
    setReview(task.data?.result ?? undefined);
    setConfirmed(false);
  }, [task.data]);
  useEffect(() => {
    if (task.data?.state === 'COMPLETED' && task.data.scoreId) {
      void client.invalidateQueries({
        queryKey: ['exams', sessionStore.getSnapshot()?.user.id, courseId],
      });
      void client.invalidateQueries({ queryKey: ['grading-tasks'] });
    }
  }, [client, courseId, task.data?.state, task.data?.scoreId]);
  useEffect(() => {
    if (!paperId && papers[0]) setPaperId(papers[0].id);
  }, [papers, paperId]);
  async function act(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  }
  async function saved(s: Submission) {
    setSelected(s);
    await submissions.refetch();
    await tasks.refetch();
  }
  const published = rubrics.data?.some((r) => r.state === 'PUBLISHED');
  return (
    <section className="grading-desk" aria-label="答卷批改">
      <header className="grading-command">
        <div>
          <p className="eyebrow">答卷 · 任务 · 结果</p>
          <h2>答卷批改</h2>
        </div>
        <span className="grading-worker-status">
          {workers.data?.some((w) => w.online && !w.paused && !w.revoked)
            ? 'Mac 工作程序在线'
            : workers.isPending
              ? '检查工作程序…'
              : workers.isError
                ? '工作程序状态未知'
                : 'Mac 工作程序离线'}
        </span>
      </header>
      <p>
        服务器保存答卷，Mac
        在线后自动领取。评分标准必须先人工核对并发布；有疑问的结果不会直接计入成绩。
      </p>
      {error && <p role="alert">{error}</p>}
      {[
        ['答卷', submissions],
        ['评分标准', rubrics],
        ['任务', task],
        ['Mac 工作程序', workers],
      ].map(([label, q]) => {
        const query = q as typeof workers;
        return query.isError ? (
          <div className="platform-state" role="alert" key={String(label)}>
            <p>{String(label)}读取失败。其他已加载内容仍可使用。</p>
            <Button onClick={() => void query.refetch()}>重新读取{String(label)}</Button>
          </div>
        ) : null;
      })}
      <section className="grading-materials">
        <h3>1 · 准备答卷</h3>
        <label>
          试卷
          <select
            aria-label="批改试卷"
            value={paperId}
            onChange={(e) => {
              setPaperId(e.target.value);
              setSelected(undefined);
              setTaskId('');
              setRubric(undefined);
            }}
          >
            {papers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.paperMonth} · {p.paperKey}
              </option>
            ))}
          </select>
        </label>
        {!canWrite && <p>当前周期的成绩写入尚未解锁。解锁后可上传答卷并申请批改。</p>}
        <Button
          disabled={busy || !canWrite || !paperId}
          onClick={() =>
            void act(async () => {
              await saved(
                await request<Submission>('POST', '/submissions', { courseId, cycleId, paperId }),
              );
              setTaskId('');
            })
          }
        >
          新建独立答卷
        </Button>
        <label>
          已有答卷
          <select
            aria-label="已有答卷"
            value={selected?.id ?? ''}
            onChange={(e) => {
              const s = submissions.data?.find((s) => s.id === e.target.value);
              setSelected(s);
              setTaskId('');
            }}
          >
            <option value="">请选择</option>
            {submissions.data
              ?.filter((s) => s.paperId === paperId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id.slice(0, 8)} · {s.pages.length}页 · 版本{s.revision}
                </option>
              ))}
          </select>
        </label>
        {selected && (
          <>
            <label>
              添加JPG/PNG答题照片（最多20张，每张8MB）
              <input
                aria-label="添加答题照片"
                type="file"
                accept="image/png,image/jpeg"
                multiple
                disabled={busy || !canWrite}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = '';
                  void act(async () => {
                    let s = selected;
                    for (const file of files) {
                      const form = new FormData();
                      form.append('file', file);
                      s = await request<Submission>('POST', `/submissions/${s.id}/pages`, form, {
                        expectedRevision: s.revision,
                      });
                      setSelected(s);
                    }
                    await saved(s);
                  });
                }}
              />
            </label>
            <ol>
              {selected.pages.map((p, i) => (
                <li key={p.fileId}>
                  {p.pageNo}. {p.name}{' '}
                  <Button
                    variant="secondary"
                    disabled={busy || i === 0 || !canWrite}
                    onClick={() =>
                      void act(async () => {
                        const ids = selected.pages.map((p) => p.fileId);
                        [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                        await saved(
                          await request<Submission>('PUT', `/submissions/${selected.id}/pages`, {
                            expectedRevision: selected.revision,
                            fileIds: ids,
                          }),
                        );
                      })
                    }
                  >
                    上移
                  </Button>{' '}
                  <Button
                    variant="secondary"
                    disabled={busy || !canWrite}
                    onClick={() =>
                      void act(async () => {
                        if (!(await confirm(`移除第 ${p.pageNo} 页答题照片？已有批改快照保留。`)))
                          return;
                        await saved(
                          await request<Submission>(
                            'DELETE',
                            `/submissions/${selected.id}/pages/${p.fileId}`,
                            undefined,
                            { expectedRevision: selected.revision },
                          ),
                        );
                      })
                    }
                  >
                    移除
                  </Button>
                </li>
              ))}
            </ol>
            <label>
              练习日期
              <input
                aria-label="批改练习日期"
                type="date"
                value={practice.practicedOn}
                onChange={(e) => setPractice({ ...practice, practicedOn: e.target.value })}
              />
            </label>
            <label>
              实际用时（分钟）
              <input
                type="number"
                min={1}
                max={1440}
                value={practice.minutes}
                onChange={(e) => setPractice({ ...practice, minutes: Number(e.target.value) })}
              />
            </label>
            <label>
              试卷限时（分钟）
              <input
                type="number"
                min={1}
                max={1440}
                value={practice.limitMinutes}
                onChange={(e) => setPractice({ ...practice, limitMinutes: Number(e.target.value) })}
              />
            </label>
            {(
              [
                ['complete', '完整作答'],
                ['closedBook', '闭卷作答'],
                ['answersSeenBefore', '作答前已看答案'],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={practice[key]}
                  onChange={(e) => setPractice({ ...practice, [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
            {!published && (
              <p role="status">没有已发布评分标准。请管理员核对并发布该试卷的评分标准后再申请。</p>
            )}
            <Button
              disabled={busy || !canWrite || !published || !selected.pages.length}
              onClick={() =>
                void act(async () => {
                  const t = await request<GradingTask>(
                    'POST',
                    `/submissions/${selected.id}/tasks`,
                    {
                      ...practice,
                      expectedRevision: selected.revision,
                    },
                  );
                  setTaskId(t.id);
                  await tasks.refetch();
                })
              }
            >
              申请批改
            </Button>
            <p>申请后固定图片、页序和评分标准版本。修改材料后重新申请。</p>
            {tasks.data?.map((t) => (
              <Button key={t.id} variant="secondary" onClick={() => setTaskId(t.id)}>
                {states[t.state]} · {t.id.slice(0, 8)}
              </Button>
            ))}
          </>
        )}
      </section>
      {task.data && (
        <section className="grading-result stack" aria-live="polite">
          <h3>2 · {states[task.data.state]}</h3>
          {!task.data.workerOnline && !terminal(task.data) && <p>{task.data.workerReason}</p>}
          {task.data.error && <p>{task.data.error}</p>}
          {task.data.kind === 'GRADE' && <TaskImages taskId={task.data.id} />}
          {task.data.scoreId && (
            <p>成绩已生成，可在“成绩与照片”查看。来源：CODEX；模型：{task.data.model}</p>
          )}
          {task.data.result && (
            <>
              <p>
                总分：
                {task.data.result.answers
                  .reduce((s, a) => s + a.points.reduce((n, p) => n + p.score, 0), 0)
                  .toFixed(2)}{' '}
                / 100
              </p>
              {task.data.result.reviewItems.map((r, i) => (
                <p key={i}>待核对：{r}</p>
              ))}
            </>
          )}
          {review?.answers.map((a, i) => (
            <fieldset key={a.number}>
              <legend>
                第{a.number}题 · 图片页码 {a.pages.join('、') || '未关联'}
              </legend>
              <label>
                识别答案
                <textarea
                  value={a.recognizedAnswer}
                  readOnly={task.data!.state !== 'REVIEW'}
                  onChange={(e) =>
                    setReview({
                      ...review,
                      answers: review.answers.map((v, n) =>
                        n === i ? { ...v, recognizedAnswer: e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              {a.reviewItems.map((r, n) => (
                <p key={n}>待核对：{r}</p>
              ))}
              {a.points.map((p, j) => (
                <div key={p.pointId}>
                  <label>
                    评分点 {p.pointId} 得分
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={100}
                      value={p.score}
                      readOnly={task.data!.state !== 'REVIEW'}
                      onChange={(e) =>
                        setReview({
                          ...review,
                          answers: review.answers.map((v, n) =>
                            n === i
                              ? {
                                  ...v,
                                  points: v.points.map((x, k) =>
                                    k === j ? { ...x, score: Number(e.target.value) } : x,
                                  ),
                                }
                              : v,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    扣分原因
                    <input
                      value={p.reason}
                      readOnly={task.data!.state !== 'REVIEW'}
                      onChange={(e) =>
                        setReview({
                          ...review,
                          answers: review.answers.map((v, n) =>
                            n === i
                              ? {
                                  ...v,
                                  points: v.points.map((x, k) =>
                                    k === j ? { ...x, reason: e.target.value } : x,
                                  ),
                                }
                              : v,
                          ),
                        })
                      }
                    />
                  </label>
                </div>
              ))}
              {task.data!.state === 'REVIEW' && (
                <label>
                  确认图片页码（逗号分隔）
                  <input
                    value={a.pages.join(',')}
                    onChange={(e) =>
                      setReview({
                        ...review,
                        answers: review.answers.map((v, n) =>
                          n === i
                            ? {
                                ...v,
                                pages: e.target.value ? e.target.value.split(',').map(Number) : [],
                              }
                            : v,
                        ),
                      })
                    }
                  />
                </label>
              )}
            </fieldset>
          ))}
          {task.data.state === 'REVIEW' && review && (
            <>
              <label>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                已核对原始照片、逐题识别及所有待核对项
              </label>
              <Button
                disabled={busy || !confirmed || !canWrite}
                onClick={() =>
                  void act(async () => {
                    await request('POST', `/tasks/${taskId}/review`, {
                      ...review,
                      reviewItems: [],
                      answers: review.answers.map((a) => ({ ...a, reviewItems: [] })),
                    });
                    await task.refetch();
                  })
                }
              >
                确认并生成成绩
              </Button>
            </>
          )}
          {task.data.rubricDraft && (
            <Button
              disabled={busy}
              onClick={() => {
                setRubric(task.data!.rubricDraft!);
                setRubricId(task.data!.rubricId ?? '');
              }}
            >
              载入生成的评分标准草稿
            </Button>
          )}
        </section>
      )}
      {admin && (
        <details>
          <summary>维护评分标准（管理员）</summary>
          <div className="stack">
            <Button
              disabled={busy || !canWrite || !paperId}
              onClick={() =>
                void act(async () => {
                  const t = await request<GradingTask>('POST', '/rubric-tasks', undefined, {
                    courseId,
                    cycleId,
                    paperId,
                  });
                  setTaskId(t.id);
                })
              }
            >
              使用试卷及答案 PDF 生成草稿
            </Button>
            <Button
              onClick={() => {
                setRubric(structuredClone(initialRubric));
                setRubricId('');
              }}
            >
              人工建立新版本
            </Button>
            {rubrics.data?.map((r) => (
              <div key={r.id}>
                版本{r.version} · {r.state === 'PUBLISHED' ? '已发布' : '草稿'}{' '}
                <Button
                  variant="secondary"
                  onClick={() => {
                    setRubric(structuredClone(r.document));
                    setRubricId(r.state === 'DRAFT' ? r.id : '');
                  }}
                >
                  查看并编辑草稿
                </Button>
              </div>
            ))}
            {rubric && <RubricEditor value={rubric} onChange={setRubric} />}
            {rubric && (
              <Button
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    const r = await request<Rubric>(
                      rubricId ? 'PUT' : 'POST',
                      rubricId ? `/rubrics/${rubricId}` : '/rubrics',
                      rubric,
                      rubricId ? undefined : { courseId, paperId },
                    );
                    setRubricId(r.id);
                    await rubrics.refetch();
                  })
                }
              >
                保存草稿
              </Button>
            )}
            {rubricId && (
              <Button
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await request('POST', `/rubrics/${rubricId}/publish`);
                    setRubricId('');
                    await rubrics.refetch();
                  })
                }
              >
                已人工核对，发布评分标准
              </Button>
            )}
          </div>
        </details>
      )}
      <details>
        <summary>Mac 批改程序配对与状态</summary>
        <div className="stack">
          <Button
            disabled={busy}
            onClick={() =>
              void act(async () =>
                setPair(await request('POST', '/workers', { label: '我的 Mac' })),
              )
            }
          >
            创建专用配对凭证
          </Button>
          {pair && (
            <>
              <p>
                此凭证仅显示一次。保存为 Mac 配置所用的 token 文件并设置仅本人可读。不要粘贴到 Codex
                提示词。
              </p>
              <input aria-label="一次性配对凭证" readOnly value={pair.token} />
              <Button variant="secondary" onClick={() => setPair(undefined)}>
                已保存，隐藏凭证
              </Button>
            </>
          )}
          {workers.data?.map((w) => (
            <p key={w.id}>
              {w.label} ·{' '}
              {w.revoked
                ? '已撤销'
                : w.online
                  ? w.paused
                    ? `已暂停：${w.reason}`
                    : '在线'
                  : '离线'}{' '}
              {!w.revoked && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    void act(async () => {
                      if (
                        !(await confirm(
                          `撤销 ${w.label} 的工作程序凭证？该设备将不能继续领取任务。`,
                        ))
                      )
                        return;
                      await request('DELETE', `/workers/${w.id}`);
                      await workers.refetch();
                    })
                  }
                >
                  撤销凭证
                </Button>
              )}
            </p>
          ))}
        </div>
      </details>
    </section>
  );
}
function RubricEditor({
  value,
  onChange,
}: {
  value: RubricDocument;
  onChange: (v: RubricDocument) => void;
}) {
  const change = (i: number, key: string, v: unknown) =>
    onChange({ questions: value.questions.map((q, n) => (n === i ? { ...q, [key]: v } : q)) });
  return (
    <div className="stack">
      {value.questions.map((q, i) => (
        <fieldset key={i}>
          <legend>题目 {i + 1}</legend>
          <label>
            题号
            <input value={q.number} onChange={(e) => change(i, 'number', e.target.value)} />
          </label>
          <label>
            题干
            <textarea value={q.stem} onChange={(e) => change(i, 'stem', e.target.value)} />
          </label>
          <label>
            参考答案
            <textarea
              value={q.referenceAnswer}
              onChange={(e) => change(i, 'referenceAnswer', e.target.value)}
            />
          </label>
          <label>
            本题满分
            <input
              type="number"
              step="0.01"
              min={0.01}
              max={100}
              value={q.maximum}
              onChange={(e) => change(i, 'maximum', Number(e.target.value))}
            />
          </label>
          {q.points.map((p, j) => (
            <div key={j}>
              <label>
                评分点编号
                <input
                  value={p.id}
                  onChange={(e) =>
                    change(
                      i,
                      'points',
                      q.points.map((x, n) => (n === j ? { ...x, id: e.target.value } : x)),
                    )
                  }
                />
              </label>
              <label>
                评分要求
                <textarea
                  value={p.description}
                  onChange={(e) =>
                    change(
                      i,
                      'points',
                      q.points.map((x, n) => (n === j ? { ...x, description: e.target.value } : x)),
                    )
                  }
                />
              </label>
              <label>
                评分点满分
                <input
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={100}
                  value={p.maximum}
                  onChange={(e) =>
                    change(
                      i,
                      'points',
                      q.points.map((x, n) =>
                        n === j ? { ...x, maximum: Number(e.target.value) } : x,
                      ),
                    )
                  }
                />
              </label>
              <Button
                variant="secondary"
                onClick={() =>
                  change(
                    i,
                    'points',
                    q.points.filter((_, n) => n !== j),
                  )
                }
              >
                删除评分点
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              change(i, 'points', [
                ...q.points,
                { id: String(q.points.length + 1), description: '', maximum: 1 },
              ])
            }
          >
            添加评分点
          </Button>
          <Button
            variant="secondary"
            onClick={() => onChange({ questions: value.questions.filter((_, n) => n !== i) })}
          >
            删除题目
          </Button>
        </fieldset>
      ))}
      <Button
        variant="secondary"
        onClick={() =>
          onChange({
            questions: [
              ...value.questions,
              {
                number: String(value.questions.length + 1),
                stem: '',
                referenceAnswer: '',
                maximum: 1,
                points: [{ id: '1', description: '', maximum: 1 }],
              },
            ],
          })
        }
      >
        添加题目
      </Button>
      <p>题目满分合计：{value.questions.reduce((n, q) => n + q.maximum, 0)} / 100</p>
    </div>
  );
}

function TaskImages({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const inputs = useQuery({
    queryKey: ['grading-inputs', taskId],
    queryFn: () =>
      request<{ pages: { fileId: string; pageNo: number }[] }>('GET', `/tasks/${taskId}/inputs`),
    enabled: open,
  });
  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>查看本次冻结的原始答卷图片</summary>
      {open &&
        inputs.data?.pages.map((p) => (
          <TaskImage key={p.fileId} taskId={taskId} fileId={p.fileId} pageNo={p.pageNo} />
        ))}
    </details>
  );
}
function TaskImage({ taskId, fileId, pageNo }: { taskId: string; fileId: string; pageNo: number }) {
  const image = useQuery({
    queryKey: ['grading-image', taskId, fileId],
    queryFn: () =>
      request<{ mimeType: string; contentBase64: string }>(
        'GET',
        `/tasks/${taskId}/materials/${fileId}`,
      ),
    staleTime: Infinity,
  });
  return (
    <figure>
      <figcaption>答卷第{pageNo}页</figcaption>
      {image.data && (
        <img
          alt={`答卷第${pageNo}页`}
          style={{ maxWidth: '100%', height: 'auto' }}
          src={`data:${image.data.mimeType};base64,${image.data.contentBase64}`}
        />
      )}{' '}
      {image.error && <p role="alert">原始图片无法读取，请检查服务器附件。</p>}
    </figure>
  );
}
