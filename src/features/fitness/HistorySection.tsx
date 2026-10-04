import { localToday } from '../../api/fitness';

import type { FitnessWorkspace } from '../../pages/FitnessPage';
import { Calendar, DayDetails, State, WeightChart } from './display';

export function HistorySection({ workspace }: { workspace: FitnessWorkspace }) {
  const {
    date,
    setDate,
    period,
    setPeriod,
    from,
    to,
    history,
    statistics,
    profile,
    open,
    remove,
    data,
    action,
    day,
  } = workspace;
  return (
    <>
      <State loading={statistics.isPending} error={statistics.error} retry={statistics.refetch}>
        {null}
      </State>

      <State loading={history.isPending} error={history.error} retry={history.refetch}>
        {null}
      </State>

      <div className="period-toolbar">
        <div className="segmented">
          <button aria-pressed={period === 'week'} onClick={() => setPeriod('week')}>
            按周
          </button>
          <button aria-pressed={period === 'month'} onClick={() => setPeriod('month')}>
            按月
          </button>
        </div>
        <span>
          {from} — {to}
        </span>
      </div>
      <div className="history-metrics">
        <div>
          <span>每日打卡</span>
          <strong>
            {statistics.data?.checkinDays ?? '—'}
            <small> 天</small>
          </strong>
        </div>
        <div>
          <span>完成 / 部分 / 跳过 / 休息</span>
          <strong className="training-counts">
            {statistics.data
              ? `${statistics.data.completedTrainingDays} / ${statistics.data.partialTrainingDays} / ${statistics.data.skippedTrainingDays} / ${statistics.data.restDays}`
              : '—'}
          </strong>
        </div>
        <div>
          <span>饮食记录</span>
          <strong>
            {statistics.data?.dietDays ?? '—'}
            <small> 天</small>
          </strong>
        </div>
      </div>
      <Calendar
        days={history.data ?? []}
        date={date}
        onDate={setDate}
        mondayFirst={profile.data?.[0]?.data?.weekStartsMonday ?? true}
      />
      <section className="platform-section">
        <h2>体重趋势</h2>
        <WeightChart days={history.data ?? []} />
      </section>
      <section className="platform-section">
        <div className="section-title">
          <h2>{date} · 当天详情</h2>
          {data &&
            date <= localToday() &&
            action('checkin', data.checkedIn ? '修改打卡' : '补打卡')}
        </div>
        <State loading={day.isPending} error={day.error} retry={day.refetch}>
          {data && <DayDetails day={data} onEdit={open} onDelete={remove} />}
        </State>
      </section>
      <p className="help">
        训练完成率{' '}
        {statistics.data?.trainingRate == null
          ? '无已安排的训练日，暂不计算'
          : `${statistics.data.trainingRate.toFixed(1)}% · ${statistics.data.completedTrainingDays}/${statistics.data.plannedTrainingDays} 天`}
        。训练、饮食和体重只解释记录本身，不推断效果或因果。连续打卡及本周完成率见今天页，统一来自后端。
      </p>
    </>
  );
}
