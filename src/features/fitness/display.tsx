import { Check } from 'lucide-react';
import { type ReactNode } from 'react';
import {
  localToday,
  shiftDate,
  useFitnessStats,
  type Day,
  type Entry,
  type Exercise,
  type Kind,
  type Meals,
  type Models,
  type Nutrition as NutritionData,
} from '../../api/fitness';
import { Button } from '../../components/Button';
import {
  exerciseNames,
  mealNames,
  titles,
  trainingNames,
  type Editable,
} from '../../features/fitness/Editor';
import { ExerciseMotion } from './motion/ExerciseMotion';
export const weekday = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('zh-CN', {
    weekday: 'short',
    timeZone: 'Asia/Shanghai',
  });
export const monday = (date: string) =>
  shiftDate(date, -((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7));
export const present = (day: Day, kind: Kind) => day.records[kind]?.data != null;
export function State({
  loading,
  error,
  retry,
  children,
}: {
  loading: boolean;
  error: Error | null;
  retry: () => unknown;
  children: ReactNode;
}) {
  if (loading)
    return (
      <p className="platform-state" role="status">
        正在读取你的记录…
      </p>
    );
  if (error)
    return (
      <div className="platform-state" role="alert">
        <h3>暂时无法读取</h3>
        <p>{error.message}</p>
        <Button onClick={() => retry()}>重新加载</Button>
      </div>
    );
  return <>{children}</>;
}
export function WeightChart({ days }: { days: Day[] }) {
  const endDate =
    (days.at(-1)?.date ?? localToday()) > localToday()
      ? localToday()
      : (days.at(-1)?.date ?? localToday());
  const stats = useFitnessStats(shiftDate(endDate, -6), endDate);
  const values = days.flatMap((d, i) =>
    d.records.weight?.data ? [{ i, date: d.date, value: d.records.weight.data.kg }] : [],
  );
  if (!values.length)
    return <p className="inline-empty">还没有体重记录。记录后，这里会显示真实变化。</p>;
  const min = Math.min(...values.map((d) => d.value)) - 0.5,
    max = Math.max(...values.map((d) => d.value)) + 0.5;
  const x = (i: number) => 50 + (i * 650) / Math.max(1, days.length - 1),
    y = (v: number) => 150 - ((v - min) * 115) / (max - min);
  const end = days.at(-1)?.date ?? localToday();
  return (
    <div className="weight-chart">
      <svg
        viewBox="0 0 740 200"
        role="img"
        aria-label="体重曲线，缺失日期不连接。准确数值见记录列表。"
      >
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <line x1="50" y1={35 + i * 57.5} x2="710" y2={35 + i * 57.5} stroke="#e2e7eb" />
            <text x="0" y={39 + i * 57.5}>
              {(max - (i * (max - min)) / 2).toFixed(1)}
            </text>
          </g>
        ))}
        {values.map((v, i) => (
          <g key={v.date}>
            {i > 0 && v.i - values[i - 1].i === 1 && (
              <line
                x1={x(values[i - 1].i)}
                y1={y(values[i - 1].value)}
                x2={x(v.i)}
                y2={y(v.value)}
                stroke="var(--space-accent)"
                strokeWidth="2.5"
              />
            )}
            <circle cx={x(v.i)} cy={y(v.value)} r="4.5" fill="var(--space-accent)">
              <title>
                {v.date}：{v.value} kg
              </title>
            </circle>
          </g>
        ))}
        <text x="50" y="185">
          {days[0]?.date}
        </text>
        <text x="600" y="185">
          {end}
        </text>
      </svg>
      <p className="help">
        每日实测 · kg · 缺失日期保留缺口。
        {stats.isPending
          ? '正在读取7天均值…'
          : stats.error
            ? '7天均值暂不可用'
            : stats.data?.sevenDayWeight.mean != null
              ? `截至 ${stats.data.sevenDayWeight.to} 的7天均值 ${stats.data.sevenDayWeight.mean.toFixed(3)} kg · ${stats.data.sevenDayWeight.samples} 个真实样本。`
              : '近7天没有记录，均值未知。'}
        日常波动不代表目标失败。
      </p>
    </div>
  );
}
export function ExerciseList({
  rows,
  completion,
}: {
  rows: Exercise[];
  completion?: {
    checked: Set<string>;
    disabled: boolean;
    toggle: (exercise: Exercise, completed: boolean) => Promise<void>;
  };
}) {
  return rows.length ? (
    <ol className="record-ledger">
      {rows.map((e, i) => (
        <li key={i}>
          <div className="exercise-motion-heading">
            {completion && (
              <input
                type="checkbox"
                aria-label={`${e.name} 已完成`}
                checked={completion.checked.has(e.id)}
                disabled={completion.disabled}
                onChange={(event) => {
                  void completion.toggle(e, event.target.checked);
                }}
              />
            )}
            <strong>{e.name}</strong>
            <ExerciseMotion exercise={e} />
          </div>
          <span>
            {exerciseNames[e.type]}
            {e.sets != null ? ` · ${e.sets}组` : ''}
            {e.reps != null ? ` × ${e.reps}次` : ''}
            {e.kg != null ? ` · ${e.kg}kg` : ''}
            {e.minutes != null ? ` · ${e.minutes}分钟` : ''}
            {e.km != null ? ` · ${e.km}km` : ''}
          </span>
          {e.note && <small>{e.note}</small>}
        </li>
      ))}
    </ol>
  ) : (
    <p className="inline-empty">没有训练项目。</p>
  );
}
export function Nutrition({ data }: { data: NutritionData | undefined }) {
  return (
    <div className="nutrition-line">
      {(['kcal', 'protein', 'carbs', 'fat'] as const).map((key, i) => {
        const value = data?.[key];
        return (
          <span key={key}>
            {['热量', '蛋白质', '碳水', '脂肪'][i]}{' '}
            <strong>{value?.knownTotal != null ? value.knownTotal.toFixed(1) : '未知'}</strong>
            {value?.knownTotal != null ? (i === 0 ? ' kcal' : ' g') : ''}
            {value && !value.complete && value.knownCount > 0 ? '（部分已知）' : ''}
          </span>
        );
      })}
    </div>
  );
}
export function MealList({
  meal,
  nutrition,
}: {
  meal: Meals | null | undefined;
  nutrition?: NutritionData;
}) {
  return (
    <>
      {Object.entries(mealNames).map(([type, name]) => (
        <div className="meal-line" key={type}>
          <h4>{name}</h4>
          <div>
            {meal?.foods
              .filter((f) => f.meal === type)
              .map((f, i) => (
                <p key={i}>
                  <strong>{f.name}</strong> {f.quantity ?? '份量未填'}
                  {f.unit ?? ''}
                  {f.note && <small> · {f.note}</small>}
                </p>
              ))}
            {!meal?.foods.some((f) => f.meal === type) && (
              <span className="secondary">尚未填写</span>
            )}
          </div>
        </div>
      ))}
      {meal && <Nutrition data={nutrition} />}
    </>
  );
}
export function status(day: Day) {
  return (
    (
      {
        CHECKED_IN: '已打卡',
        FUTURE: '未来安排',
        TODAY_PENDING: '今天待打卡',
        PARTIAL_RECORDS: '部分记录 · 未打卡',
        PAST_MISSING: '过去未打卡',
      } as Record<string, string>
    )[day.state] ?? '尚未记录'
  );
}
export function Calendar({
  days,
  date,
  onDate,
  mondayFirst,
}: {
  days: Day[];
  date: string;
  onDate: (date: string) => void;
  mondayFirst: boolean;
}) {
  const leading = days.length
    ? (new Date(`${days[0].date}T12:00:00Z`).getUTCDay() + (mondayFirst ? 6 : 0)) % 7
    : 0;
  return (
    <section className="platform-section">
      <div className="section-title">
        <h2>记录日历</h2>
        <span className="help">● 已打卡 ◐ 部分记录 休 休息安排</span>
      </div>
      <div className="record-calendar">
        {(mondayFirst
          ? ['一', '二', '三', '四', '五', '六', '日']
          : ['日', '一', '二', '三', '四', '五', '六']
        ).map((v) => (
          <strong key={v} className="calendar-label">
            {v}
          </strong>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {days.map((d) => (
          <button
            key={d.date}
            aria-label={`${d.date} ${status(d)}${d.rest ? ' 休息日' : ''}`}
            className={d.date === date ? 'selected' : ''}
            data-status={d.checkedIn ? 'done' : d.partial ? 'partial' : 'empty'}
            onClick={() => onDate(d.date)}
          >
            <strong>{Number(d.date.slice(-2))}</strong>
            <span>
              {d.checkedIn ? (
                <Check size={13} />
              ) : d.partial ? (
                '◐'
              ) : d.date === localToday() ? (
                '今天'
              ) : (
                '—'
              )}
              {d.rest ? ' 休' : ''}
            </span>
            <small>{d.records.weight?.data ? `${d.records.weight.data.kg}kg` : ''}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
export function DayDetails({
  day,
  onEdit,
  onDelete,
}: {
  day: Day;
  onEdit: (kind: Editable, initial?: Models[Editable], entry?: Entry) => void;
  onDelete: (entry: Entry, label: string) => void;
}) {
  const records = day.records;
  return (
    <>
      <div className="day-detail-summary">
        <span>{status(day)}</span>
        {day.rest && <span>休息日</span>}
        <span>训练 {present(day, 'training') ? '已记录' : '未记录'}</span>
        <span>饮食 {present(day, 'meals') ? '已记录' : '未记录'}</span>
        <span>体重 {present(day, 'weight') ? '已记录' : '未记录'}</span>
      </div>
      {(['weight', 'training', 'meals', 'water', 'checkin'] as const).map((kind) => {
        const e = records[kind];
        return (
          <div className="detail-row" key={kind}>
            <div>
              <h3>{titles[kind]}</h3>
              {e?.data ? (
                <>
                  {kind === 'weight' && (
                    <p>
                      {records.weight!.data!.kg} kg · {records.weight!.data!.note}
                    </p>
                  )}
                  {kind === 'training' && (
                    <>
                      <p>{trainingNames[records.training!.data!.status]}</p>
                      <ExerciseList rows={records.training!.data!.exercises} />
                    </>
                  )}
                  {kind === 'meals' && (
                    <MealList meal={records.meals!.data} nutrition={day.nutrition} />
                  )}{' '}
                  {kind === 'water' && <p>{records.water!.data!.ml} ml</p>}
                  {kind === 'checkin' && (
                    <p>
                      睡眠 {records.checkin!.data!.sleepHours ?? '未填'} 小时 · 状态{' '}
                      {records.checkin!.data!.feeling ?? '未填'} / 5<br />
                      {records.checkin!.data!.note}
                    </p>
                  )}
                </>
              ) : (
                <p className="secondary">尚未记录</p>
              )}
            </div>
            {day.date <= localToday() && (
              <div className="row">
                <Button variant="ghost" onClick={() => onEdit(kind, undefined, e)}>
                  {e?.data ? '修改' : '记录'}
                </Button>
                {e?.data && (
                  <Button variant="ghost" onClick={() => onDelete(e, titles[kind])}>
                    删除
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
