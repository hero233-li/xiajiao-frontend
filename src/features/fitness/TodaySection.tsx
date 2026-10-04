import { Activity, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { FitnessWorkspace } from '../../pages/FitnessPage';
import { ExerciseList, MealList, State, status } from './display';
import { trainingNames } from './Editor';
import { QuickRecords } from './QuickRecords';
export function TodaySection({ workspace: w }: { workspace: FitnessWorkspace }) {
  const { data, date, setDate, summary, action } = w;
  if (!data) return null;
  const plan = data.records['training-plan']?.data;
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
          <h3>计划</h3>
          {plan ? (
            plan.rest ? (
              <p>休息日</p>
            ) : (
              <ExerciseList rows={plan.exercises} />
            )
          ) : (
            <p className="inline-empty">当天没有训练安排。</p>
          )}
          {action('training-plan', plan ? '编辑安排' : '创建训练安排')}
          <div className="actual-record">
            <h3>实际记录</h3>
            {data.records.training?.data ? (
              <>
                <p className="record-status">{trainingNames[data.records.training.data.status]}</p>
                <ExerciseList rows={data.records.training.data.exercises} />
              </>
            ) : (
              <p>尚未记录实际训练</p>
            )}
            {action('training', data.records.training?.data ? '修改实际训练' : '记录实际训练')}
          </div>
        </section>
        <section className="platform-section">
          <div className="section-title">
            <h2>
              <Utensils size={20} />
              饮食
            </h2>
            <Link to={`/fitness/meals?date=${date}`}>计划与实际</Link>
          </div>
          <h3>食谱计划</h3>
          <MealList meal={data.records['meal-plan']?.data} nutrition={data.plannedNutrition} />
          {action('meal-plan', data.records['meal-plan']?.data ? '编辑食谱' : '安排今日食谱')}
          <div className="actual-record">
            <h3>实际饮食</h3>
            {data.records.meals?.data ? (
              <MealList meal={data.records.meals.data} nutrition={data.nutrition} />
            ) : (
              <p>尚未记录实际饮食</p>
            )}
            {action('meals', data.records.meals?.data ? '修改实际饮食' : '记录实际饮食')}
          </div>
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
