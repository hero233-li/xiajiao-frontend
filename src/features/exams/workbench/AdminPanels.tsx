import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Cpu, KeyRound } from 'lucide-react';
import type { GradingWorker, Rubric, RubricDocument } from '../../../api/grading';
import { gradingRequest } from '../../../api/grading';
import { Button } from '../../../components/Button';

export function WorkerPanel({ workers }: { workers: GradingWorker[] }) {
  const [pair, setPair] = useState<{ id: string; token: string }>();
  const [error, setError] = useState('');
  const client = useQueryClient();
  const pairWorker = useMutation({
    mutationFn: () => gradingRequest<{ id: string; token: string }>('POST', '/workers', { label: '批改程序' }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['grading-workers'] }),
  });
  const revokeWorker = useMutation({
    mutationFn: (workerId: string) => gradingRequest('DELETE', `/workers/${workerId}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['grading-workers'] }),
  });
  return (
    <details className="wb-advanced">
      <summary>
        <Cpu size={15} aria-hidden="true" />
        批改程序配对与状态
      </summary>
      <div className="stack">
        <p className="wb-muted">
          配对凭证只显示一次，保存到批改程序所在机器的 token 文件后不要再乱贴。撤销后该设备不能继续领取任务。
        </p>
        {error && (
          <p role="alert" className="wb-inline-error">
            {error}
          </p>
        )}
        <Button
          variant="secondary"
          disabled={pairWorker.isPending}
          onClick={() =>
            void pairWorker
              .mutateAsync()
              .then(setPair)
              .catch((reason: unknown) =>
                setError(reason instanceof Error ? reason.message : '创建配对凭证失败'),
              )
          }
        >
          <KeyRound size={15} aria-hidden="true" />
          创建专用配对凭证
        </Button>
        {pair && (
          <div className="wb-pair">
            <p>此凭证仅显示一次，请立刻保存：</p>
            <input aria-label="一次性配对凭证" readOnly value={pair.token} />
            <Button variant="ghost" onClick={() => setPair(undefined)}>
              已保存，隐藏凭证
            </Button>
          </div>
        )}
        {workers.length === 0 ? (
          <p className="wb-muted">还没有配对任何批改程序。</p>
        ) : (
          <ul className="wb-workers">
            {workers.map((worker) => (
              <li key={worker.id}>
                <strong>{worker.label}</strong>
                <span>
                  {worker.revoked
                    ? '已撤销'
                    : worker.online
                      ? worker.paused
                        ? `已暂停：${worker.reason ?? ''}`
                        : '在线'
                      : '离线'}
                </span>
                {!worker.revoked && (
                  <Button
                    variant="ghost"
                    disabled={revokeWorker.isPending}
                    onClick={() =>
                      void revokeWorker
                        .mutateAsync(worker.id)
                        .catch((reason: unknown) =>
                          setError(reason instanceof Error ? reason.message : '撤销失败'),
                        )
                    }
                  >
                    撤销凭证
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

export function RubricPanel({
  courseId,
  cycleId,
  paperId,
  rubrics,
  admin,
  onChanged,
}: {
  courseId: string;
  cycleId: string;
  paperId: string;
  rubrics: Rubric[];
  admin: boolean;
  onChanged: () => void;
}) {
  const [document, setDocument] = useState<RubricDocument>();
  const [rubricId, setRubricId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!admin) return null;

  async function act(task: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '操作失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="wb-advanced">
      <summary>维护评分标准（管理员）</summary>
      <div className="stack">
        <p className="wb-muted">
          评分标准必须先发布，用户才能申请批改。发布前请人工核对每道题与得分点。
        </p>
        {error && (
          <p role="alert" className="wb-inline-error">
            {error}
          </p>
        )}
        <div className="wb-rubric-bar">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await gradingRequest('POST', '/rubric-tasks', undefined, {
                  courseId,
                  cycleId,
                  paperId,
                });
              })
            }
          >
            用试卷 PDF 生成草稿
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setRubricId('');
              setDocument({
                questions: [
                  {
                    number: '1',
                    stem: '',
                    referenceAnswer: '',
                    maximum: 100,
                    points: [{ id: '1', description: '', maximum: 100 }],
                  },
                ],
              });
            }}
          >
            人工新建版本
          </Button>
        </div>
        {rubrics.length > 0 && (
          <ul className="wb-rubrics">
            {rubrics.map((rubric) => (
              <li key={rubric.id}>
                <span>
                  版本 {rubric.version} · {rubric.state === 'PUBLISHED' ? '已发布' : '草稿'}
                </span>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDocument(structuredClone(rubric.document));
                    setRubricId(rubric.state === 'DRAFT' ? rubric.id : '');
                  }}
                >
                  查看
                </Button>
              </li>
            ))}
          </ul>
        )}
        {document && (
          <RubricEditor value={document} onChange={setDocument} disabled={busy} />
        )}
        {document && (
          <div className="wb-rubric-bar">
            <Button
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  const saved = await gradingRequest<Rubric>(
                    rubricId ? 'PUT' : 'POST',
                    rubricId ? `/rubrics/${rubricId}` : '/rubrics',
                    document,
                    rubricId ? undefined : { courseId, paperId },
                  );
                  if (!rubricId) setRubricId(saved.id);
                  onChanged();
                })
              }
            >
              保存草稿
            </Button>
            {rubricId && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await gradingRequest('POST', `/rubrics/${rubricId}/publish`);
                    setDocument(undefined);
                    setRubricId('');
                    onChanged();
                  })
                }
              >
                已人工核对，发布
              </Button>
            )}
          </div>
        )}
      </div>
    </details>
  );
}

function RubricEditor({
  value,
  onChange,
  disabled,
}: {
  value: RubricDocument;
  onChange: (value: RubricDocument) => void;
  disabled: boolean;
}) {
  const change = (index: number, key: string, next: unknown) =>
    onChange({
      questions: value.questions.map((question, i) =>
        i === index ? { ...question, [key]: next } : question,
      ),
    });
  return (
    <div className="stack wb-rubric-editor">
      {value.questions.map((question, index) => (
        <fieldset key={index} disabled={disabled}>
          <legend>题目 {index + 1}</legend>
          <label>
            题号
            <input value={question.number} onChange={(e) => change(index, 'number', e.target.value)} />
          </label>
          <label>
            题干
            <textarea value={question.stem} onChange={(e) => change(index, 'stem', e.target.value)} />
          </label>
          <label>
            参考答案
            <textarea
              value={question.referenceAnswer}
              onChange={(e) => change(index, 'referenceAnswer', e.target.value)}
            />
          </label>
          <label>
            本题满分
            <input
              type="number"
              step="0.01"
              min={0.01}
              max={100}
              value={question.maximum}
              onChange={(e) => change(index, 'maximum', Number(e.target.value))}
            />
          </label>
          {question.points.map((point, pointIndex) => (
            <div key={pointIndex} className="wb-point">
              <label>
                评分点编号
                <input
                  value={point.id}
                  onChange={(e) =>
                    change(
                      index,
                      'points',
                      question.points.map((item, i) =>
                        i === pointIndex ? { ...item, id: e.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
              <label>
                评分要求
                <textarea
                  value={point.description}
                  onChange={(e) =>
                    change(
                      index,
                      'points',
                      question.points.map((item, i) =>
                        i === pointIndex ? { ...item, description: e.target.value } : item,
                      ),
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
                  value={point.maximum}
                  onChange={(e) =>
                    change(
                      index,
                      'points',
                      question.points.map((item, i) =>
                        i === pointIndex ? { ...item, maximum: Number(e.target.value) } : item,
                      ),
                    )
                  }
                />
              </label>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              change(index, 'points', [
                ...question.points,
                { id: String(question.points.length + 1), description: '', maximum: 1 },
              ])
            }
          >
            添加评分点
          </Button>
        </fieldset>
      ))}
      <p className="wb-muted">
        题目满分合计：{value.questions.reduce((sum, question) => sum + question.maximum, 0)} / 100
      </p>
    </div>
  );
}
