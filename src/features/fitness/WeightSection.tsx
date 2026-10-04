import { localToday } from '../../api/fitness';
import { Button } from '../../components/Button';
import { QuickRecords } from './QuickRecords';

import type { FitnessWorkspace } from '../../pages/FitnessPage';
import { Calendar, State, WeightChart } from './display';

export function WeightSection({ workspace }: { workspace: FitnessWorkspace }) {
  const { date, setDate, history, profile, setEdit, remove, data, action } = workspace;
  if (!data) return null;
  return (
    <>
      <QuickRecords key={data.date} day={data} onlyWeight />
      <section className="platform-section">
        <div className="section-title">
          <h2>30天变化</h2>
          {date <= localToday() &&
            action('weight', data.records.weight?.data ? '修改当天体重' : '记录 / 补录体重')}
        </div>
        <State loading={history.isPending} error={history.error} retry={history.refetch}>
          <WeightChart days={history.data ?? []} />
        </State>
      </section>
      {history.isSuccess && (
        <>
          <Calendar
            days={history.data ?? []}
            date={date}
            onDate={setDate}
            mondayFirst={profile.data?.[0]?.data?.weekStartsMonday ?? true}
          />
          <section className="platform-section">
            <h2>体重记录</h2>
            {history.data?.some((d) => d.records.weight?.data) ? (
              <div className="weight-table">
                {[...(history.data ?? [])].reverse().map(
                  (d) =>
                    d.records.weight?.data && (
                      <div key={d.date}>
                        <strong>{d.date}</strong>
                        <span>{d.records.weight.data.kg} kg</span>
                        <small>{d.records.weight.data.note}</small>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setEdit({ kind: 'weight', key: d.date, entry: d.records.weight })
                          }
                        >
                          修改
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => remove(d.records.weight!, '体重记录')}
                        >
                          删除
                        </Button>
                      </div>
                    ),
                )}
              </div>
            ) : (
              <p className="inline-empty">这段时间还没有体重记录。</p>
            )}
          </section>
        </>
      )}
    </>
  );
}
