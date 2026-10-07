import { localToday } from '../../api/fitness';
import { Button } from '../../components/Button';
import { QuickRecords } from './QuickRecords';
import type { FitnessWorkspace } from '../../pages/FitnessPage';
import { Calendar, State, WeightChart } from './display';
const series = [
  { kind: 'weight', label: '体重1' },
  { kind: 'weight2', label: '体重2' },
] as const;
export function WeightSection({ workspace }: { workspace: FitnessWorkspace }) {
  const { date, setDate, history, profile, setEdit, remove, data, action } = workspace;
  if (!data) return null;
  return (
    <>
      <p className="help">体重1与体重2分别保存、分别查看趋势。原有记录保留在体重1。</p>
      <div className="weight-series-grid">
        {series.map(({ kind }) => (
          <QuickRecords key={`${data.date}-${kind}`} day={data} onlyWeight weightKind={kind} />
        ))}
      </div>
      <div className="weight-series-grid">
        {series.map(({ kind, label }) => (
          <section className="platform-section" key={kind}>
            <div className="section-title">
              <h2>{label} · 30天变化</h2>
              {date <= localToday() &&
                action(kind, data.records[kind]?.data ? `修改当天${label}` : `记录 / 补录${label}`)}
            </div>
            <State loading={history.isPending} error={history.error} retry={history.refetch}>
              <WeightChart days={history.data ?? []} kind={kind} />
            </State>
          </section>
        ))}
      </div>
      {history.isSuccess && (
        <>
          <Calendar
            days={history.data ?? []}
            date={date}
            onDate={setDate}
            mondayFirst={profile.data?.[0]?.data?.weekStartsMonday ?? true}
          />
          {series.map(({ kind, label }) => (
            <section className="platform-section" key={kind}>
              <h2>{label}记录</h2>
              {history.data?.some((d) => d.records[kind]?.data) ? (
                <div className="weight-table">
                  {[...(history.data ?? [])].reverse().map((d) => {
                    const entry = d.records[kind];
                    return (
                      entry?.data && (
                        <div key={d.date}>
                          <strong>{d.date}</strong>
                          <span>{entry.data.kg} kg</span>
                          <small>{entry.data.note}</small>
                          <Button
                            variant="ghost"
                            onClick={() => setEdit({ kind, key: d.date, entry })}
                          >
                            修改{label}
                          </Button>
                          <Button variant="ghost" onClick={() => remove(entry, `${label}记录`)}>
                            删除{label}
                          </Button>
                        </div>
                      )
                    );
                  })}
                </div>
              ) : (
                <p className="inline-empty">这段时间还没有{label}记录。</p>
              )}
            </section>
          ))}
        </>
      )}
    </>
  );
}
