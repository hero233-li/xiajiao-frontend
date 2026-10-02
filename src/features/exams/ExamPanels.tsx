import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCircle2, LockKeyhole, Info } from 'lucide-react';
import type {
  Paper,
  Prediction,
  ScoreRecord,
  Unlock,
  ScoreRecordPredictionExclusionReasonsItem,
} from '../../api/generated/models';
import { Button } from '../../components/Button';
import { formatShanghaiDate } from '../../utils/date';

export function AsyncRegion<T>({
  query,
  label,
  children,
}: {
  query: UseQueryResult<T, Error>;
  label: string;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending)
    return (
      <p role="status" aria-busy="true">
        正在加载{label}…
      </p>
    );
  if (query.isError)
    return (
      <div className="card" data-state="error" role="alert">
        <p>{label}加载失败，请重试。</p>
        <Button variant="secondary" loading={query.isFetching} onClick={() => void query.refetch()}>
          重新加载{label}
        </Button>
      </div>
    );
  return <>{children(query.data)}</>;
}
export function EmptyLine({ text, retry }: { text: string; retry: () => void }) {
  return (
    <div className="exam-empty">
      <span>{text}</span>
      <Button variant="ghost" onClick={retry}>
        重新加载
      </Button>
    </div>
  );
}
export function UnlockSteps({ unlock, practice }: { unlock: Unlock; practice: string }) {
  const rows = [
    { title: '章节练习', href: practice, detail: '状态与进度暂未提供' },
    { title: '章节检测', href: practice, detail: '状态与通过章数暂未提供' },
    { title: '模拟卷', href: practice, detail: '状态与通过卷数暂未提供' },
    {
      title: '解锁真题',
      href: '#exam-papers',
      detail: `${unlock.canDownloadPapers ? '下载已开放' : '下载未开放'} · 进度暂未提供`,
    },
  ];
  return (
    <>
      <nav aria-label="真题解锁步骤" className="exam-steps">
        {rows.map((row, index) => (
          <a key={row.title} href={row.href} className="card exam-step">
            <span className="exam-step-number">{index + 1}</span>
            <strong>{row.title}</strong>
            <span>{row.detail}</span>
          </a>
        ))}
      </nav>
      <section className="exam-next">
        <Info size={20} aria-hidden="true" />
        <div>
          <p>章节练习 → 章节检测（≥90 分）→ 模拟卷（≥80 分）→ 解锁真题。</p>
          <p className="secondary">
            当前步骤与具体进度暂不可用，请到刷题页查看后端返回的章节检测资格。
          </p>
        </div>
        <Link className="button button-primary" to={practice}>
          查看刷题进度
        </Link>
      </section>
    </>
  );
}
export function PredictionPanel({ prediction }: { prediction: Prediction }) {
  return (
    <section aria-label="成绩预测" className="stack">
      {prediction.status === 'AVAILABLE' ? (
        <div className="card exam-prediction">
          <div>
            <p>预测成绩</p>
            <strong className="exam-score">
              {prediction.predictedScore ?? '—'}
              <small> 分</small>
            </strong>
          </div>
          <div>
            <p>
              {prediction.sampleCount} 套样本 · 分数范围 {prediction.actualMinimum ?? '—'}–
              {prediction.actualMaximum ?? '—'} 分
            </p>
            <p>根据你的练习成绩估算，不代表正式成绩</p>
          </div>
        </div>
      ) : (
        <p className="exam-empty">
          <Info size={20} aria-hidden="true" />
          至少完成 {prediction.minimumSamples} 套合格试卷后可预测，当前已有 {prediction.sampleCount}{' '}
          套合格样本。
        </p>
      )}
      <details>
        <summary>预测怎么算？</summary>
        <p>
          至少 3 套，取近 60 天内最多最近 5
          套，越近权重越高。只有完整作答、闭卷、未超时、做题前未看过本卷答案的记录才可能纳入。每套卷只取首条有效记录；首条有效记录过期后，不用后续记录替换。具体纳入与排除结果由后端计算。
        </p>
      </details>
    </section>
  );
}
export function TrendPanel({ records }: { records: ScoreRecord[] }) {
  // 后端返回最近记录；反转仅用于按时间从左到右绘制，不筛选预测样本。
  const chronological = [...records].reverse();
  const points = chronological
    .map(
      (row, index) =>
        `${60 + index * (560 / Math.max(1, chronological.length - 1))},${220 - row.score * 1.8}`,
    )
    .join(' ');
  return (
    <div className="card">
      <svg
        viewBox="0 0 680 260"
        role="img"
        aria-label="最近十二次刷题成绩折线图，详细数值见下方列表"
        className="exam-chart"
      >
        <title>刷题成绩趋势（最近 12 次）</title>
        {[0, 50, 100].map((score) => (
          <g key={score}>
            <line
              x1="60"
              x2="620"
              y1={220 - score * 1.8}
              y2={220 - score * 1.8}
              className="exam-chart-grid"
            />
            <text x="12" y={225 - score * 1.8}>
              {score}
            </text>
          </g>
        ))}
        <polyline points={points} fill="none" className="exam-chart-line" />
        {chronological.map((row, index) => (
          <circle
            key={row.id}
            cx={60 + index * (560 / Math.max(1, chronological.length - 1))}
            cy={220 - row.score * 1.8}
            r="4"
            className="exam-chart-dot"
          />
        ))}
      </svg>
      <details>
        <summary>查看每次成绩</summary>
        <ol>
          {chronological.map((row) => (
            <li key={row.id}>
              {formatShanghaiDate(row.practicedOn)} · {row.score} 分 · {row.paperKey}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
export function PaperGroups({
  papers,
  unlock,
  onDownload,
  onRecord,
  downloading,
  code,
}: {
  code: string;
  papers: Paper[];
  unlock?: Unlock;
  onDownload: (paper: Paper, part: 'QUESTION' | 'ANSWER') => void;
  onRecord: (paper: Paper) => void;
  downloading?: { id: string; part: 'QUESTION' | 'ANSWER' };
}) {
  const sources = [
    ...new Set(papers.map((p) => (p.sourceCourseCode === code ? null : p.sourceCourseCode))),
  ].sort();
  return (
    <>
      {sources.map((source) => {
        const matching = papers.filter(
          (p) => (p.sourceCourseCode === code ? null : p.sourceCourseCode) === source,
        );
        const years = [...new Set(matching.map((p) => p.paperMonth.slice(0, 4)))].sort().reverse();
        return (
          <section className="stack" key={source ?? 'current'}>
            <h3>{source ? `补充资料 · 来源课程代码 ${source}` : '本课程历年试卷'}</h3>
            {years.map((year) => (
              <section key={year} className="stack">
                <h4>{year} 年</h4>
                <div
                  className={
                    unlock?.canDownloadPapers || unlock?.canWriteScores
                      ? 'exam-paper-grid'
                      : 'exam-locked-list'
                  }
                >
                  {matching
                    .filter((p) => p.paperMonth.startsWith(year))
                    .sort((a, b) => b.paperMonth.localeCompare(a.paperMonth))
                    .map((paper) => (
                      <article className="card exam-paper" key={paper.id}>
                        <div className="row">
                          <strong>{Number(paper.paperMonth.slice(5))} 月试卷</strong>
                          <span>{paper.questionPages ?? '未知'} 页</span>
                          {!unlock?.canDownloadPapers && (
                            <span className="status-warning">
                              <LockKeyhole size={16} aria-hidden="true" />{' '}
                              {unlock ? '未开放下载' : '下载权限暂不可用'}
                            </span>
                          )}
                        </div>
                        {(paper.questionFile.containsAnswers ||
                          paper.answerFile?.containsAnswers) && (
                          <p className="status-warning">含答案</p>
                        )}
                        {!paper.answerFile && !paper.questionFile.containsAnswers && (
                          <p>暂无答案</p>
                        )}
                        {(unlock?.canDownloadPapers || unlock?.canWriteScores) && (
                          <>
                            <p className="secondary">练习次数 / 首次成绩 / 最近成绩：暂未提供</p>
                            <div className="row">
                              {unlock.canDownloadPapers && (
                                <>
                                  <Button
                                    loading={
                                      downloading?.id === paper.id &&
                                      downloading.part === 'QUESTION'
                                    }
                                    onClick={() => onDownload(paper, 'QUESTION')}
                                  >
                                    下载题目
                                  </Button>
                                  {paper.answerFile && (
                                    <Button
                                      variant="secondary"
                                      loading={
                                        downloading?.id === paper.id &&
                                        downloading.part === 'ANSWER'
                                      }
                                      onClick={() => onDownload(paper, 'ANSWER')}
                                    >
                                      下载答案
                                    </Button>
                                  )}
                                </>
                              )}
                              {unlock.canWriteScores && (
                                <Button variant="secondary" onClick={() => onRecord(paper)}>
                                  记录成绩
                                </Button>
                              )}
                            </div>
                          </>
                        )}
                      </article>
                    ))}
                </div>
              </section>
            ))}
          </section>
        );
      })}
    </>
  );
}
const reasons: Record<ScoreRecordPredictionExclusionReasonsItem, string> = {
  INCOMPLETE: '未完整作答',
  OPEN_BOOK: '非闭卷',
  OVERTIME: '超出限时',
  ANSWERS_SEEN: '做题前看过答案',
  ANSWERS_STATE_UNKNOWN: '看答案情况未知',
  NOT_FIRST_VALID: '不是本卷首条有效记录',
  FIRST_VALID_TOO_OLD: '首条有效记录已超过 60 天',
  OUTSIDE_LATEST_FIVE: '不在最近 5 套样本内',
};
export function ScoreRow({
  record,
  canEdit,
  edit,
}: {
  record: ScoreRecord;
  canEdit: boolean;
  edit: () => void;
}) {
  return (
    <article className="card stack">
      <div className="row">
        <strong>
          {record.paperKey} · {record.score} 分
        </strong>
        <span>
          {formatShanghaiDate(record.practicedOn)} · 用时 {record.minutes} / 限时{' '}
          {record.limitMinutes} 分钟
        </span>
      </div>
      <p className={record.includedInPrediction ? 'status-success' : 'status-warning'}>
        {record.includedInPrediction ? (
          <>
            <CheckCircle2 size={16} aria-hidden="true" /> 已参与预测
          </>
        ) : (
          <>
            <Info size={16} aria-hidden="true" /> 不参与预测：
            {record.predictionExclusionReasons.map((reason) => reasons[reason]).join('；') ||
              '后端未提供原因'}
          </>
        )}
      </p>
      <p>
        完整作答：{record.complete ? '是' : '否'} · 闭卷：{record.closedBook ? '是' : '否'} ·
        做题前看过答案：
        {record.answersSeenBefore === null ? '未知' : record.answersSeenBefore ? '是' : '否'}
      </p>
      {record.note && <p className="exam-note">备注：{record.note}</p>}
      {record.images.length > 0 && (
        <p>图片存档：{record.images.map((file) => file.name).join('、')}</p>
      )}
      {canEdit && (
        <Button variant="secondary" onClick={edit}>
          编辑成绩
        </Button>
      )}
    </article>
  );
}
