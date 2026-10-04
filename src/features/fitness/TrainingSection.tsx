import { TrainingChecklist, trainingRows } from './TrainingChecklist';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { shiftDate } from '../../api/fitness';
import { Button } from '../../components/Button';
import { trainingNames } from '../../features/fitness/Editor';

import type { FitnessWorkspace } from '../../pages/FitnessPage';
import { State, weekday } from './display';

export function TrainingSection({ workspace }: { workspace: FitnessWorkspace }) {
  const { date, setDate, start, history, setCopy, setDestination, setTemplateName, data, action } =
    workspace;
  if (!data) return null;
  return (
    <>
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
      <div className="week-plan">
        {history.data?.map((d) => (
          <button
            className={d.date === date ? 'selected' : ''}
            key={d.date}
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
      <div className="training-workspace">
        <section className="planning-column">
          <div className="section-title">
            <h2>训练 · {date}</h2>
            {action('training-plan', '编辑训练')}
          </div>
          {data.rest && !trainingRows(data).length ? (
            <p className="inline-empty">今天安排休息，可以照常打卡。</p>
          ) : (
            <TrainingChecklist key={`${date}-plan`} day={data} rows={trainingRows(data)} />
          )}
          <p>{data.records.training?.data?.note ?? data.records['training-plan']?.data?.note}</p>
          {data.records['training-plan']?.data && (
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
          )}
        </section>
      </div>
    </>
  );
}
