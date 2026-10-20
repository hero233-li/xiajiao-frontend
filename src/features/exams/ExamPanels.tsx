import { useState, type ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Link } from '../cycle/navigation';
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
import { PaperCard } from './PaperCard';

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
  return (
    <section className="exam-access" aria-label="真题权限">
      <div className="exam-access-main">
        {unlock.canDownloadPapers ? (
          <CheckCircle2 size={18} aria-hidden="true" />
        ) : (
          <LockKeyhole size={18} aria-hidden="true" />
        )}
        <div>
          <strong>{unlock.canDownloadPapers ? '真题下载已开放' : '真题下载尚未开放'}</strong>
          <p>
            {unlock.canDownloadPapers
              ? unlock.canWriteScores
                ? '下载试卷后，可记录成绩与答题照片。'
                : '可下载资料；当前暂不能新增或修改成绩。'
              : unlock.missingChapterIds.length
                ? `还有 ${unlock.missingChapterIds.length} 个章节待通过检测，完成后继续参加模拟卷。`
                : '通过有效模拟卷后开放下载；具体资格以当前检测规则为准。'}
          </p>
        </div>
        <Link className="button button-secondary" to={practice}>
          查看刷题进度
        </Link>
      </div>
      {!unlock.canDownloadPapers && (
        <details className="exam-access-rules">
          <summary>查看解锁规则</summary>
          <p>章节练习 → 通过章节检测 → 通过模拟卷 → 解锁真题。各次检测的通过线以试卷规则为准。</p>
        </details>
      )}
    </section>
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
          套，越近权重越高。只有完整作答、闭卷、未超时、做题前未看过本卷答案的记录才可能纳入。每套卷只取首条有效记录；首条有效记录过期后，不用后续记录替换。每条记录会说明是否纳入及排除原因。
        </p>
      </details>
    </section>
  );
}
export function TrendPanel({ records }: { records: ScoreRecord[] }) {
  // 服务端提供最近记录；反转仅用于按时间从左到右绘制，不筛选预测样本。
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
  onRecord,
  scoresByPaper,
  courseId,
  code,
}: {
  code: string;
  courseId: string;
  papers: Paper[];
  unlock?: Unlock;
  scoresByPaper: Map<string, ScoreRecord>;
  onRecord: (paper: Paper) => void;
}) {
  const [withAnswers, setWithAnswers] = useState(false);
  const filtered = papers.filter(
    (paper) => !withAnswers || !!paper.answerFile || paper.questionFile.containsAnswers,
  );
  const years = [...new Set(filtered.map((paper) => paper.paperMonth.slice(0, 4)))].sort().reverse();
  const unlocked = !!unlock?.canDownloadPapers;
  const canWrite = !!unlock?.canWriteScores;
  return (
    <div className="exam-library">
      <div className="exam-library-tools">
        <p>
          <strong>{filtered.length}</strong> 套试卷 · 共 {years.length} 个年份
          {filtered.length !== papers.length && <span> / 全部 {papers.length} 套</span>}
        </p>
        <label className="exam-answer-filter">
          <input
            type="checkbox"
            checked={withAnswers}
            onChange={(event) => setWithAnswers(event.target.checked)}
          />
          仅看有答案
        </label>
      </div>
      {!filtered.length && (
        <p className="exam-empty">
          没有符合筛选条件的试卷。
          <Button variant="ghost" onClick={() => setWithAnswers(false)}>
            清除筛选
          </Button>
        </p>
      )}
      {years.map((year) => {
        const items = filtered
          .filter((paper) => paper.paperMonth.startsWith(year))
          .sort((a, b) => b.paperMonth.localeCompare(a.paperMonth));
        return (
          <section className="exam-year" key={year} aria-labelledby={`exam-year-${year}`}>
            <header className="exam-year-head">
              <h3 id={`exam-year-${year}`}>{year} 年</h3>
              <span>{items.length} 套</span>
            </header>
            <div className="exam-year-grid">
              {items.map((paper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  code={code}
                  courseId={courseId}
                  unlocked={unlocked}
                  canWrite={canWrite}
                  score={scoresByPaper.get(paper.id)}
                  onRecord={onRecord}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
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
