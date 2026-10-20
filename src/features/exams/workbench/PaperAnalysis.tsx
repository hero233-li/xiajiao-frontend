import { BarChart3, Info } from 'lucide-react';
import type { GradingResult, Rubric } from '../../../api/grading';
import type { ScoreRecord } from '../../../api/generated/models';
import { formatShanghaiDate } from '../../../utils/date';

export function PaperAnalysis({
  result,
  rubric,
  trend,
  paperId,
}: {
  result?: GradingResult;
  rubric?: Rubric;
  trend?: ScoreRecord[];
  paperId: string;
}) {
  if (!result)
    return (
      <section className="wb-card" aria-labelledby="wb-analysis-title">
        <header className="wb-card-head">
          <div>
            <h2 id="wb-analysis-title">本卷分析</h2>
            <p className="secondary">批改完成后，这里会显示逐题得分率与失分原因。</p>
          </div>
        </header>
        <p className="wb-empty">
          <Info size={16} aria-hidden="true" />
          还没有批改结果。上传答卷并完成批改后，分析会基于每题每个得分点自动生成。
        </p>
      </section>
    );

  const maximumOf = (number: string) =>
    rubric?.document.questions.find((question) => question.number === number)?.maximum ?? null;

  const rows = result.answers.map((answer) => {
    const earned = answer.points.reduce((sum, point) => sum + point.score, 0);
    const maximum = maximumOf(answer.number);
    return { answer, earned, maximum, rate: maximum ? earned / maximum : null };
  });

  const earnedTotal = rows.reduce((sum, row) => sum + row.earned, 0);
  const maximumTotal = rows.reduce((sum, row) => sum + (row.maximum ?? 0), 0);
  const overallRate = maximumTotal ? earnedTotal / maximumTotal : null;

  const reasons = new Map<string, number>();
  for (const row of rows)
    for (const point of row.answer.points) {
      const reason = point.reason.trim();
      if (reason) reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
    }

  const history = trend ?? [];
  const mine = history.filter((record) => record.paperId === paperId);
  const best = history.reduce<number | null>(
    (top, record) => (top === null || record.score > top ? record.score : top),
    null,
  );

  return (
    <section className="wb-card" aria-labelledby="wb-analysis-title">
      <header className="wb-card-head">
        <div>
          <h2 id="wb-analysis-title">本卷分析</h2>
          <p className="secondary">
            基于本次批改的逐题得分点。得分率 = 得分点之和 / 题目满分。
          </p>
        </div>
        <span className="wb-count">
          <BarChart3 size={15} aria-hidden="true" />
          {overallRate === null ? '满分未知' : `总得分率 ${(overallRate * 100).toFixed(1)}%`}
        </span>
      </header>

      <ol className="wb-analysis-rows">
        {rows.map(({ answer, earned, maximum, rate }) => (
          <li key={answer.number}>
            <span className="wb-answer-no">第 {answer.number} 题</span>
            <span className="wb-bar" aria-hidden="true">
              <span style={{ width: `${Math.min(100, Math.round((rate ?? 0) * 100))}%` }} />
            </span>
            <span className="wb-answer-score">
              {earned.toFixed(1)}
              {maximum === null ? ' 分' : ` / ${maximum} 分`}
              {rate === null ? '' : ` · ${(rate * 100).toFixed(0)}%`}
            </span>
          </li>
        ))}
      </ol>

      {reasons.size > 0 && (
        <div className="wb-reasons">
          <h3>失分原因（按出现次数聚合）</h3>
          <ul>
            {[...reasons.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([reason, count]) => (
                <li key={reason}>
                  <span className="wb-reason-count">×{count}</span>
                  {reason}
                </li>
              ))}
          </ul>
        </div>
      )}

      {history.length > 0 && (
        <div className="wb-trend">
          <h3>在近 {history.length} 次刷题成绩中的位置</h3>
          <ul>
            {history.slice(0, 12).map((record) => (
              <li key={record.id} data-mine={record.paperId === paperId}>
                <span>{formatShanghaiDate(record.practicedOn)}</span>
                <span className="wb-bar" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, record.score)}%` }} />
                </span>
                <strong>{record.score}</strong>
              </li>
            ))}
          </ul>
          <p className="wb-muted">
            本卷最好成绩 {mine.length ? `${Math.max(...mine.map((record) => record.score))} 分` : '暂无'}
            {best !== null ? ` · 全部试卷最高 ${best} 分` : ''}
          </p>
        </div>
      )}
    </section>
  );
}
