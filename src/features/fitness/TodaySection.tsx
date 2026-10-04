import { MealTracker } from './MealTracker';
import { TrainingChecklist, trainingRows } from './TrainingChecklist';
import { Activity, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { FitnessWorkspace } from '../../pages/FitnessPage';
import { State, status } from './display';
import { QuickRecords } from './QuickRecords';
export function TodaySection({ workspace: w }: { workspace: FitnessWorkspace }) {
  const { data, date, setDate, summary, action } = w;
  if (!data) return null;
  const plan = data.records['training-plan']?.data;
  const exercises = trainingRows(data);
  return (
    <>
      <div className="day-command">
        <div>
          <span className="eyebrow">健身今天</span>
          <h1>{status(data)}</h1>
          <label className="date-control">
            日期
            <input
              type="date"
              required
              min="1900-01-01"
              max="2100-12-31"
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
          </label>
        </div>
        <Link to={`/fitness/history?date=${date}`}>查看当天全部记录</Link>
      </div>
      <QuickRecords key={date} day={data} />
      <div className="fitness-two-col">
        <section className="platform-section">
          <div className="section-title">
            <h2>
              <Activity size={20} />
              训练
            </h2>
            <Link to={`/fitness/training?date=${date}`}>周计划与记录</Link>
          </div>

          {plan?.rest && !exercises.length ? (
            <p>休息日</p>
          ) : exercises.length ? (
            <TrainingChecklist day={data} rows={exercises} />
          ) : (
            <p className="inline-empty">当天没有训练安排。</p>
          )}
          {action('training-plan', plan ? '编辑训练' : '创建训练')}
        </section>
        <section className="platform-section">
          <div className="section-title">
            <h2>
              <Utensils size={20} />
              饮食
            </h2>
            <Link to={`/fitness/meals?date=${date}`}>查看食谱</Link>
          </div>
          <MealTracker key={date} day={data} />
        </section>
      </div>
      <section className="platform-section">
        <div className="section-title">
          <h2>记录摘要</h2>
          <Link to="/fitness/goals">目标与趋势</Link>
        </div>
        <State loading={summary.isPending} error={summary.error} retry={summary.refetch}>
          {summary.data && (
            <div className="fitness-status-strip">
              <span>
                连续打卡 <strong>{summary.data.streak} 天</strong>
              </span>
              <span>
                本周打卡{' '}
                <strong>
                  {summary.data.weekCheckins} / {summary.data.weekElapsedDays} 天
                </strong>
              </span>
              <span>
                本周完成率 <strong>{summary.data.weekRate.toFixed(0)}%</strong>
              </span>
            </div>
          )}
        </State>
      </section>
    </>
  );
}
