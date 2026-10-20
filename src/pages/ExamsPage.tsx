import { BankExamReasons } from '../features/bank/BankExamReasons';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link, useSearchParams } from '../features/cycle/navigation';
import { CheckCircle2 } from 'lucide-react';
import { useExamCourse, useExamCycles, useExamData, useExamActions } from '../api/exams';
import type { ScoreRecord, LegacyRecordSummaryKind } from '../api/generated/models';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import {
  AsyncRegion,
  EmptyLine,
  PaperGroups,
  PredictionPanel,
  ScoreRow,
  TrendPanel,
  UnlockSteps,
} from '../features/exams/ExamPanels';
import { ScoreDialog } from '../features/exams/ScoreDialog';
import { formatShanghaiDate } from '../utils/date';
import '../features/exams/exams.css';

export function Component() {
  const { code = '' } = useParams();
  const [search, setSearch] = useSearchParams();
  const cycleId = search.get('cycleId') ?? '';
  return (
    <div className="exam-page stack">
      {cycleId ? (
        <ExamCourse key={`${code}-${cycleId}`} code={code} cycleId={cycleId} />
      ) : (
        <CyclePicker
          onChoose={(id) => {
            const next = new URLSearchParams(search);
            next.set('cycleId', id);
            setSearch(next);
          }}
        />
      )}
    </div>
  );
}
function CyclePicker({ onChoose }: { onChoose: (id: string) => void }) {
  const cycles = useExamCycles();
  return (
    <AsyncRegion query={cycles} label="考试周期">
      {(items) =>
        items.length ? (
          <label>
            选择考试周期
            <select value="" onChange={(event) => onChoose(event.target.value)}>
              <option value="" disabled>
                请选择考试周期
              </option>
              {items.map((cycle) => (
                <option value={cycle.id} key={cycle.id}>
                  {cycle.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <EmptyLine text="暂无考试周期。" retry={() => void cycles.refetch()} />
        )
      }
    </AsyncRegion>
  );
}
function ExamCourse({ code, cycleId }: { code: string; cycleId: string }) {
  const course = useExamCourse(code, cycleId);
  return (
    <AsyncRegion query={course} label="课程">
      {(data) => (
        <>
          <BankExamReasons courseId={data.id} cycleId={cycleId} />
          <ExamContent courseId={data.id} code={code} cycleId={cycleId} />
        </>
      )}
    </AsyncRegion>
  );
}
export function ExamContent({
  courseId,
  code,
  cycleId,
}: {
  courseId: string;
  code: string;
  cycleId: string;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [trendOpen, setTrendOpen] = useState(false);
  const [scorePage, setScorePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const data = useExamData(courseId, cycleId, historyOpen, scorePage, historyPage);
  const actions = useExamActions(courseId, cycleId);
  const [dialog, setDialog] = useState<{ paperId: string; record?: ScoreRecord }>();
  const [skipConfirm, setSkipConfirm] = useState(false);
  const practice = `/study/course/${code}/practice`;
  const canWrite = data.unlock.isSuccess && !data.unlock.isError && data.unlock.data.canWriteScores;
  const scoresByPaper = useMemo(() => {
    const latest = new Map<string, ScoreRecord>();
    for (const record of data.scores.data?.items ?? [])
      if (!latest.has(record.paperId)) latest.set(record.paperId, record);
    return latest;
  }, [data.scores.data]);
  const kindLabels: Record<LegacyRecordSummaryKind, string> = {
    ability: '检测',
    grading: '批改',
    sprint: '冲刺',
    practice: '练习',
    task: '任务',
    practice_request: '练习申请',
    other: '其他',
  };
  return (
    <>
      <AsyncRegion query={data.unlock} label="解锁信息">
        {(unlock) => (
          <>
            <UnlockSteps unlock={unlock} practice={practice} />
            {(unlock.skipWindow.canConfirm || unlock.activeOverride) && (
              <section className="card exam-skip stack">
                <h2>{unlock.activeOverride ? '已手动跳过' : '临考手动跳过'}</h2>
                <p>
                  {unlock.activeOverride && <CheckCircle2 size={20} aria-hidden="true" />}
                  跳过仅开放真题下载和试卷成绩录入，不授予章节检测或模拟卷资格，可以撤销。
                </p>
                {unlock.skipWindow.canConfirm && (
                  <p>
                    可确认窗口：{unlock.skipWindow.windowStart} 至 {unlock.skipWindow.windowEnd}
                    （上海日期，含首尾）。
                  </p>
                )}
                <Button
                  variant="secondary"
                  onClick={() => {
                    actions.skip.reset();
                    setSkipConfirm(true);
                  }}
                >
                  {unlock.activeOverride ? '撤销跳过' : '手动跳过'}
                </Button>
              </section>
            )}
          </>
        )}
      </AsyncRegion>

      <section id="exam-papers" className="stack">
        <div className="exam-library-heading">
          <div>
            <h2>历年真题</h2>
            <p className="secondary exam-library-note">
              按年份整理。进入某份试卷的工作台，可以在同一页完成预览、上传答卷、批改与看分数。
            </p>
          </div>
          {canWrite && data.papers.data?.length ? (
            <Button onClick={() => setDialog({ paperId: data.papers.data![0].id })}>
              录入成绩
            </Button>
          ) : null}
        </div>
        <AsyncRegion query={data.papers} label="试卷清单">
          {(papers) =>
            papers.length ? (
              <PaperGroups
                papers={papers}
                code={code}
                courseId={courseId}
                scoresByPaper={scoresByPaper}
                unlock={data.unlock.isSuccess ? data.unlock.data : undefined}
                onRecord={(paper) => {
                  if (canWrite) setDialog({ paperId: paper.id });
                }}
              />
            ) : (
              <EmptyLine text="暂无收录试卷。" retry={() => void data.papers.refetch()} />
            )
          }
        </AsyncRegion>
      </section>

      <details onToggle={(event) => setTrendOpen(event.currentTarget.open)}>
        <summary>我的成绩记录</summary>
        <section className="stack">
          <p className="secondary">
            这里汇总所有试卷的成绩与照片。要批改某份试卷，进入它自己的工作台。
          </p>
          <AsyncRegion query={data.scores} label="成绩记录">
            {(scores) => (
              <>
                {scores.items.length ? (
                  scores.items.map((record) => (
                    <ScoreRow
                      key={record.id}
                      record={record}
                      canEdit={!!canWrite && record.cycleId === cycleId}
                      edit={() => setDialog({ paperId: record.paperId, record })}
                    />
                  ))
                ) : (
                  <EmptyLine text="暂无成绩记录。" retry={() => void data.scores.refetch()} />
                )}
                <Pagination
                  page={scores.page}
                  size={scores.size}
                  total={scores.total}
                  change={setScorePage}
                />
              </>
            )}
          </AsyncRegion>
        </section>
      </details>

      <details onToggle={(event) => setTrendOpen(event.currentTarget.open)}>
        <summary>成绩趋势与预测</summary>
        <div className="stack">
          <AsyncRegion query={data.prediction} label="成绩预测">
            {(prediction) => <PredictionPanel prediction={prediction} />}
          </AsyncRegion>
          {trendOpen && (
            <section className="stack">
              <h2>纸卷成绩趋势 · 最近 12 次</h2>
              <AsyncRegion query={data.trend} label="成绩趋势">
                {(trend) =>
                  trend.records.length ? (
                    <TrendPanel records={trend.records} />
                  ) : (
                    <EmptyLine
                      text="暂无刷题成绩，完成试卷后可记录成绩。"
                      retry={() => void data.trend.refetch()}
                    />
                  )
                }
              </AsyncRegion>
            </section>
          )}
        </div>
      </details>

      <details onToggle={(event) => setHistoryOpen(event.currentTarget.open)}>
        <summary>历史检测与批改记录（只读）</summary>
        <p>历史记录，不计入当前解锁。</p>
        {historyOpen && (
          <AsyncRegion query={data.history} label="历史记录">
            {(history) => (
              <>
                {history.items.length ? (
                  <ul className="exam-history">
                    {history.items.map((row) => (
                      <li key={row.summary.id}>
                        <strong>{row.summary.title}</strong>
                        <p>
                          {row.summary.createdAt
                            ? formatShanghaiDate(row.summary.createdAt)
                            : '日期未知'}{' '}
                          · {kindLabels[row.summary.kind]} ·{' '}
                          {row.oldScore === null ? '未提供分数' : `${row.oldScore} 分`}
                        </p>
                        <span>历史记录，不计入当前解锁 · 只读</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyLine text="暂无历史记录。" retry={() => void data.history.refetch()} />
                )}
                <Pagination
                  page={history.page}
                  size={history.size}
                  total={history.total}
                  change={setHistoryPage}
                />
              </>
            )}
          </AsyncRegion>
        )}
      </details>

      <Link className="button button-secondary" to={practice}>
        回到章节检测与模拟卷
      </Link>
      {dialog && canWrite && data.papers.isSuccess && (
        <ScoreDialog
          {...dialog}
          courseId={courseId}
          cycleId={cycleId}
          papers={data.papers.data}
          onClose={() => setDialog(undefined)}
        />
      )}
      <Modal
        open={skipConfirm}
        title={data.unlock.data?.activeOverride ? '确认撤销跳过' : '确认临考跳过'}
        onClose={() => setSkipConfirm(false)}
      >
        <p>
          {data.unlock.data?.activeOverride
            ? '撤销后，下载和成绩录入权限会由后端重新核定。'
            : '确认后仅开放真题下载和成绩录入，章节检测与模拟卷资格保持后端正常判定。'}
        </p>
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setSkipConfirm(false)}>
            取消
          </Button>
          <Button
            loading={actions.skip.isPending}
            error={actions.skip.error?.message}
            onClick={() => {
              const unlock = data.unlock.data;
              if (!unlock) return;
              void actions.skip
                .mutateAsync(unlock.activeOverride?.revision ?? null)
                .then(() => setSkipConfirm(false))
                .catch(() => {});
            }}
          >
            确认{data.unlock.data?.activeOverride ? '撤销' : '跳过'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
function Pagination({
  page,
  size,
  total,
  change,
}: {
  page: number;
  size: number;
  total: number;
  change: (page: number) => void;
}) {
  if (total <= size) return null;
  return (
    <nav className="row" aria-label="列表翻页">
      <span>
        第 {page} 页 · 共 {total} 条
      </span>
      {page > 1 && (
        <Button variant="secondary" onClick={() => change(page - 1)}>
          上一页
        </Button>
      )}
      {page * size < total && (
        <Button variant="secondary" onClick={() => change(page + 1)}>
          下一页
        </Button>
      )}
    </nav>
  );
}
