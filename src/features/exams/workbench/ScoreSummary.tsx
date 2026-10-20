import { Award, Pencil } from 'lucide-react';
import type { ScoreRecord } from '../../../api/generated/models';
import { Button } from '../../../components/Button';
import { formatShanghaiDate } from '../../../utils/date';

const sourceLabels: Record<string, string> = {
  MANUAL: '手动录入',
  CODEX: '批改程序',
  LEGACY: '历史导入',
};

export function ScoreSummary({
  records,
  canWrite,
  onRecord,
}: {
  records: ScoreRecord[];
  canWrite: boolean;
  onRecord: (record?: ScoreRecord) => void;
}) {
  const latest = records[0];
  return (
    <section className="wb-card" aria-labelledby="wb-score-title">
      <header className="wb-card-head">
        <div>
          <h2 id="wb-score-title">成绩</h2>
          <p className="secondary">本卷的批改或手动录入成绩，满分 100 分。</p>
        </div>
        {canWrite && (
          <Button variant="secondary" onClick={() => onRecord(latest)}>
            <Pencil size={15} aria-hidden="true" />
            {latest ? '修改本次成绩' : '手动录入成绩'}
          </Button>
        )}
      </header>

      {!latest ? (
        <p className="wb-empty">
          还没有成绩。上传答卷并批改，或直接手动录入一次成绩。
        </p>
      ) : (
        <>
          <div className="wb-score">
            <Award size={22} aria-hidden="true" />
            <strong>{latest.score}</strong>
            <span className="wb-score-unit">分</span>
            <span className="wb-score-rate">得分率 {latest.score}%</span>
            <span className="wb-score-meta">
              {sourceLabels[latest.source] ?? latest.source} ·{' '}
              {formatShanghaiDate(latest.practicedOn)} · 用时 {latest.minutes} / 限时{' '}
              {latest.limitMinutes} 分钟
            </span>
          </div>
          {records.length > 1 && (
            <details className="wb-score-history">
              <summary>本卷共 {records.length} 次成绩</summary>
              <ul>
                {records.map((record) => (
                  <li key={record.id}>
                    <span>{formatShanghaiDate(record.practicedOn)}</span>
                    <strong>{record.score} 分</strong>
                    <span>{sourceLabels[record.source] ?? record.source}</span>
                    {canWrite && (
                      <Button variant="ghost" onClick={() => onRecord(record)}>
                        编辑
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}
