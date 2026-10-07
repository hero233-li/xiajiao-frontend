import { TrainingChecklist, trainingRows } from './TrainingChecklist';
import { Activity, CheckCircle2, ChevronLeft, ChevronRight, Timer } from 'lucide-react';
import { shiftDate } from '../../api/fitness';
import { Button } from '../../components/Button';
import { trainingNames } from '../../features/fitness/Editor';

import type { FitnessWorkspace } from '../../pages/FitnessPage';
import { State, weekday } from './display';

export function TrainingSection({ workspace }: { workspace: FitnessWorkspace }) {
  const { date, setDate, start, history, setCopy, setDestination, setTemplateName, data, action } =
    workspace;
  if (!data) return null;
  const rows = trainingRows(data);
  const completed = rows.filter((row) =>
    data.records.training?.data?.exercises.some(
      (actual) => actual.id === row.id && actual.completed,
    ),
  ).length;
  const timedMinutes = rows.reduce((sum, row) => sum + (row.minutes ?? 0), 0);
  const strengthCount = rows.filter((row) => row.type === 'STRENGTH').length;
  const note = data.records.training?.data?.note ?? data.records['training-plan']?.data?.note ?? '';
  const [guidance, logs = ''] = note.split('每日记录：');
  const [dailyGuidance, references = ''] = guidance.split('依据：');
  const [recordGuidance, recordReferences = ''] = logs.split('依据：');
  return (
    <div className="training-page">
      <State loading={history.isPending} error={history.error} retry={history.refetch}>
        {null}
      </State>

      <div className="period-toolbar">
        <Button variant="ghost" onClick={() => setDate(shiftDate(date, -7))}>
          <ChevronLeft size={16} />
          上一周
        </Button>
        <strong>
          {start} — {shiftDate(start, 6)}
        </strong>
        <Button variant="ghost" onClick={() => setDate(shiftDate(date, 7))}>
          下一周
          <ChevronRight size={16} />
        </Button>
      </div>
      <div className="week-plan training-week">
        {history.data?.map((d) => (
          <button
            className={d.date === date ? 'selected' : ''}
            key={d.date}
            aria-pressed={d.date === date}
            data-date={d.date}
            onClick={() => setDate(d.date)}
          >
            <span>{weekday(d.date)}</span>
            <strong>{d.date.slice(5)}</strong>
            <small>
              {d.rest
                ? '休息日'
                : d.records['training-plan']?.data
                  ? `${d.records['training-plan'].data.exercises.length} 项训练`
                  : '未安排'}
            </small>
            <em>
              {
                (
                  { PENDING: '待完成', UNPLANNED: '未安排', ...trainingNames } as Record<
                    string,
                    string
                  >
                )[d.trainingState]
              }
            </em>
          </button>
        ))}
      </div>
      <div className="training-overview" aria-label="当天训练概览">
        <div>
          <Activity size={20} />
          <span>
            当天安排
            <strong>
              {data.rest
                ? '恢复日'
                : strengthCount
                  ? '力量 + 有氧'
                  : rows.length
                    ? '有氧 / 恢复'
                    : '尚未安排'}
            </strong>
          </span>
        </div>
        <div>
          <Timer size={20} />
          <span>
            计时项目
            <strong>
              {timedMinutes} <small>分钟</small>
            </strong>
            <small>力量动作、休息与转场另计</small>
          </span>
        </div>
        <div>
          <CheckCircle2 size={20} />
          <span>
            已完成
            <strong>
              {completed} <small>/ {rows.length} 项</small>
            </strong>
          </span>
        </div>
      </div>
      <div className="training-workspace training-dashboard">
        <section className="planning-column">
          <div className="section-title">
            <div>
              <span className="training-eyebrow">
                {weekday(date)} · {date}
              </span>
              <h2>今日训练</h2>
            </div>
            {action('training-plan', '编辑训练')}
          </div>
          {data.rest && !rows.length ? (
            <p className="inline-empty">今天安排休息，可以照常打卡。</p>
          ) : (
            <TrainingChecklist key={`${date}-plan`} day={data} rows={rows} />
          )}

          {data.records['training-plan']?.data && (
            <details className="training-plan-tools">
              <summary>计划管理</summary>
              <div className="row">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCopy({
                      kind: 'training-plan',
                      mode: 'copy',
                      sourceKind: 'training-plan',
                      sourceKey: date,
                      data: data.records['training-plan']!.data!,
                    });
                    setDestination(shiftDate(date, 1));
                  }}
                >
                  复制到指定日期
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCopy({
                      kind: 'training-plan',
                      mode: 'template',
                      data: data.records['training-plan']!.data!,
                    });
                    setTemplateName('');
                  }}
                >
                  存为训练模板
                </Button>
              </div>
            </details>
          )}
        </section>
        <aside className="training-guidance" aria-label="训练说明">
          <h3>当天安排与恢复</h3>
          {dailyGuidance ? (
            dailyGuidance
              .split(/(?<=[。；])/)
              .filter(Boolean)
              .map((line, i) => <p key={i}>{line}</p>)
          ) : (
            <p>按当天状态选择训练量，并记录实际感受。</p>
          )}
          {recordGuidance && (
            <details>
              <summary>每日记录要点</summary>
              <p>{recordGuidance}</p>
            </details>
          )}
          {(references || recordReferences) && (
            <details>
              <summary>参考资料</summary>
              <p>{references || recordReferences}</p>
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}
