import { createUuid } from '../utils/uuid';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Activity,
  Utensils,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import {
  fitnessApi,
  useFitnessDay,
  useFitnessSummary,
  useFitnessHistory,
  useFitnessList,
  useFitnessMutation,
  useFitnessStats,
  shiftDate,
  localToday,
  type Entry,
  type Day,
  type Exercise,
  type Meals,
  type Kind,
  type Models,
  type Nutrition as NutritionData,
} from '../api/fitness';
import { UnsavedGuard } from '../features/fitness/UnsavedGuard';
import { TemplateManager } from '../features/fitness/Templates';
import {
  FitnessEditor,
  goalNames,
  trainingNames,
  mealNames,
  exerciseNames,
  titles,
  type EditSpec,
  type Editable,
} from '../features/fitness/Editor';
const labels: Record<string, string> = {
  today: '今天',
  goals: '目标管理',
  training: '训练计划',
  meals: '食谱与饮食',
  weight: '体重记录',
  history: '打卡与历史',
};
const weekday = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('zh-CN', {
    weekday: 'short',
    timeZone: 'Asia/Shanghai',
  });
const monday = (date: string) =>
  shiftDate(date, -((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7));
const present = (day: Day, kind: Kind) => day.records[kind]?.data != null;
function State({
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
function ExerciseList({ rows }: { rows: Exercise[] }) {
  return rows.length ? (
    <ol className="record-ledger">
      {rows.map((e, i) => (
        <li key={i}>
          <strong>{e.name}</strong>
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
function Nutrition({ data }: { data: NutritionData | undefined }) {
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
function MealList({
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
function status(day: Day) {
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
export function Component() {
  const location = useLocation();
  const section = location.pathname.split('/')[2] || 'today';
  const [params, setParams] = useSearchParams();
  const requested = params.get('date') || localToday();
  const date =
    /^\d{4}-\d{2}-\d{2}$/.test(requested) && !Number.isNaN(Date.parse(requested))
      ? requested
      : localToday();
  const setDate = (value: string) => setParams({ date: value });
  const summary = useFitnessSummary();
  const day = useFitnessDay(date);
  const start = monday(date),
    monthStart = date.slice(0, 7) + '-01',
    monthEnd = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0, 12))
      .toISOString()
      .slice(0, 10);
  const [period, setPeriod] = useState<'month' | 'week'>('month');
  const from =
    section === 'training'
      ? start
      : section === 'weight' || section === 'goals'
        ? shiftDate(section === 'goals' ? localToday() : date, -29)
        : period === 'week'
          ? start
          : monthStart;
  const to =
    section === 'training'
      ? shiftDate(start, 6)
      : section === 'weight' || section === 'goals'
        ? section === 'goals'
          ? localToday()
          : date
        : period === 'week'
          ? shiftDate(start, 6)
          : monthEnd;
  const history = useFitnessHistory(from, to);
  const statistics = useFitnessStats(from, to);
  const goals = useFitnessList('goal');
  const profile = useFitnessList('profile');
  const [edit, setEdit] = useState<EditSpec | null>(null);
  const [copy, setCopy] = useState<{
    kind: 'training-plan' | 'meal-plan';
    mode: 'copy' | 'template';
    sourceKind?: Kind;
    sourceKey?: string;
    data: Models['training-plan'] | Meals;
  } | null>(null);
  const [destination, setDestination] = useState(date);
  const [templateName, setTemplateName] = useState('');
  const [notice, setNotice] = useState('');
  const [copyDirty, setCopyDirty] = useState(false);
  const [copyKey, setCopyKey] = useState(() => createUuid());
  const [copyRevision, setCopyRevision] = useState<number | null>(null);
  useEffect(() => {
    setCopyDirty(false);
    setCopyRevision(null);
    setCopyKey(createUuid());
  }, [copy]);
  const mutation = useFitnessMutation();
  const open = (kind: Editable, initial?: Models[Editable], entry?: Entry) =>
    setEdit({
      kind,
      key: kind === 'goal' ? createUuid() : date,
      entry: entry ?? day.data?.records[kind],
      initial,
      goalRevision: summary.data?.goalRevision,
    });
  const remove = (entry: Entry, label: string) => {
    if (!window.confirm(`确定删除 ${entry.key} 的${label}？此操作会移除该记录。`)) return;
    setNotice('');
    void mutation
      .mutateAsync(() => fitnessApi.delete(entry))
      .then(() => setNotice(`${label}已删除`))
      .catch((e) => setNotice(`删除失败：${e.message}`));
  };
  const data = day.data,
    s = summary.data;
  const goal = s?.currentGoal?.data,
    weight = s?.latestWeight?.data;
  const action = (kind: Editable, label?: string, initial?: Models[Editable]) => (
    <Button variant="secondary" disabled={mutation.isPending} onClick={() => open(kind, initial)}>
      {label ?? `${present(data!, kind) ? '修改' : '记录'}${titles[kind]}`}
    </Button>
  );
  if (!labels[section])
    return (
      <main id="main-content" className="platform-main">
        <h1>页面不存在</h1>
        <Link to="/fitness">返回健身首页</Link>
      </main>
    );
  return (
    <main id="main-content" className="platform-main fitness-main" tabIndex={-1}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">FITNESS / YOUR OWN PACE</p>
          <h1>{labels[section]}</h1>
          <p className="secondary">
            {section === 'today'
              ? '按自己的节奏，把今天照顾好。'
              : section === 'goals'
                ? '定义方向，也允许调整。每一次目标都保留。'
                : section === 'training'
                  ? '安排与实做分别记录，休息也是计划的一部分。'
                  : section === 'meals'
                    ? '计划吃什么，记录实际吃了什么。'
                    : section === 'weight'
                      ? '记录真实变化，不给日常波动贴标签。'
                      : '回看每一天的记录，理解自己的节奏。'}
          </p>
        </div>
        {section === 'goals' ? (
          <Button onClick={() => open('goal')}>＋ 设置新目标</Button>
        ) : (
          <label className="date-control">
            查看日期
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
        )}
      </div>
      {notice && (
        <p role="status" className="platform-notice">
          {notice}
        </p>
      )}
      <State
        loading={summary.isPending || day.isPending || history.isPending}
        error={summary.error || day.error || history.error || statistics.error}
        retry={() => {
          void summary.refetch();
          void day.refetch();
          void history.refetch();
          void statistics.refetch();
        }}
      >
        {data && s && (
          <>
            {section === 'today' && (
              <>
                <section className="fitness-today-hero">
                  <div>
                    <span className="eyebrow">
                      {date} · {weekday(date)}
                    </span>
                    <h2>
                      {goal ? `${goalNames[goal.type]}，稳步记录。` : '从一个自己的目标开始。'}
                    </h2>
                    <p>
                      {goal
                        ? `${goal.startWeight} kg → ${goal.targetWeight} kg${goal.targetDate ? ` · 目标日期 ${goal.targetDate}` : ''}`
                        : '可以减重、增重，也可以维持；由你决定。'}
                    </p>
                    <Link to="/fitness/goals">
                      {goal ? '查看与调整目标' : '创建目标'} <ArrowRight size={16} />
                    </Link>
                  </div>
                  <div className="hero-metric">
                    <span>最近体重</span>
                    <strong>
                      {weight?.kg ?? '—'}
                      <small> kg</small>
                    </strong>
                    <span>{s.latestWeight?.key ?? '还没有记录'}</span>
                  </div>
                </section>
                <div className="fitness-status-strip">
                  <span>
                    <CalendarCheck size={17} />
                    连续打卡 <strong>{s.streak} 天</strong>
                  </span>
                  <span>
                    本周已过 {s.weekElapsedDays} 天 · 打卡 <strong>{s.weekCheckins} 天</strong>
                  </span>
                  <span>
                    本周完成率 <strong>{s.weekRate.toFixed(0)}%</strong>
                  </span>
                  <small>按周一至今天计算，未来日期不计入。</small>
                </div>
                <div className="fitness-two-col">
                  <section className="platform-section">
                    <div className="section-title">
                      <h2>
                        <Activity size={20} />
                        今天的训练
                      </h2>
                      <Link to={`/fitness/training?date=${date}`}>管理计划</Link>
                    </div>
                    {data.records['training-plan']?.data ? (
                      <>
                        <p className="record-status">
                          {data.records['training-plan'].data.rest ? '休息日' : '计划安排'} ·{' '}
                          {data.records.training?.data
                            ? trainingNames[data.records.training.data.status]
                            : '尚未记录实际训练'}
                        </p>
                        <ExerciseList rows={data.records['training-plan'].data.exercises} />
                        {action('training', '记录实际训练', {
                          status: data.records['training-plan'].data.rest ? 'REST' : 'COMPLETED',
                          exercises: structuredClone(data.records['training-plan'].data.exercises),
                          note: null,
                          planSnapshot: null,
                        })}
                      </>
                    ) : (
                      <div className="inline-empty">
                        <p>今天还没有安排训练或休息。</p>
                        {action('training-plan', '创建训练安排')}
                      </div>
                    )}
                  </section>
                  <section className="platform-section">
                    <div className="section-title">
                      <h2>
                        <Utensils size={20} />
                        今天的食谱
                      </h2>
                      <Link to={`/fitness/meals?date=${date}`}>计划与实际</Link>
                    </div>
                    <MealList
                      meal={data.records['meal-plan']?.data}
                      nutrition={data.plannedNutrition}
                    />
                    {data.records['meal-plan']?.data
                      ? action(
                          'meals',
                          '从计划记录实际饮食',
                          structuredClone(data.records['meal-plan'].data),
                        )
                      : action('meal-plan', '安排今日食谱')}
                  </section>
                </div>
                <section className="daily-journal">
                  <div>
                    <h2>给今天留一笔</h2>
                    <p>
                      {status(data)}
                      {data.rest ? ' · 休息日' : ''}。分项记录与每日打卡分别保存。
                    </p>
                  </div>
                  <div className="journal-actions">
                    {action('weight')}
                    {action('water')}
                    {action('meals')}
                    {action('checkin', data.checkedIn ? '修改今日打卡' : '完成每日打卡')}
                  </div>
                </section>
                <section className="platform-section">
                  <h2>当日记录</h2>
                  <div className="today-record-overview">
                    <div>
                      <span>实际训练</span>
                      <strong>
                        {data.trainingState === 'UNPLANNED'
                          ? '未安排'
                          : data.trainingState === 'PENDING'
                            ? '待记录'
                            : trainingNames[data.trainingState as keyof typeof trainingNames]}
                      </strong>
                    </div>
                    <div>
                      <span>体重</span>
                      <strong>
                        {data.records.weight?.data
                          ? `${data.records.weight.data.kg} kg`
                          : '尚未记录'}
                      </strong>
                    </div>
                    <div>
                      <span>饮水</span>
                      <strong>
                        {data.records.water?.data ? `${data.records.water.data.ml} ml` : '尚未记录'}
                      </strong>
                    </div>
                    <div>
                      <span>每日打卡</span>
                      <strong>{data.checkedIn ? '已打卡' : '尚未打卡'}</strong>
                    </div>
                  </div>
                  <p className="help">{data.records.checkin?.data?.note}</p>
                  <Link className="text-action" to={`/fitness/history?date=${date}`}>
                    查看当天全部记录 <ArrowRight size={15} />
                  </Link>
                </section>
              </>
            )}
            {section === 'goals' && (
              <>
                <section className="goal-overview">
                  <div>
                    <span className="eyebrow">当前目标</span>
                    <h2>{goal ? goalNames[goal.type] : '尚未设置'}</h2>
                    <p>
                      {goal
                        ? `${goal.startDate} 开始 · ${goal.startWeight} kg → ${goal.targetWeight} kg`
                        : '目标由你自己维护。设置后即可跟踪真实变化。'}
                    </p>
                    {goal?.note && <p>{goal.note}</p>}
                    {goal && (
                      <Button
                        variant="ghost"
                        disabled={mutation.isPending}
                        onClick={() => {
                          if (window.confirm('确定结束当前目标？历史目标与所有记录会保留。'))
                            void mutation
                              .mutateAsync(() => fitnessApi.endGoal(s.goalRevision))
                              .then(() => setNotice('当前目标已结束'))
                              .catch((e) => setNotice(e.message));
                        }}
                      >
                        结束当前目标
                      </Button>
                    )}
                  </div>
                  <div>
                    <span className="secondary">距离目标体重</span>
                    <strong className="large-number">
                      {goal && weight ? Math.abs(weight.kg - goal.targetWeight).toFixed(1) : '—'}
                      <small> kg</small>
                    </strong>
                    <p className="help">绝对差距，不预测达成日期。</p>
                  </div>
                </section>
                <section className="platform-section">
                  <h2>近期体重趋势</h2>
                  <WeightChart days={history.data ?? []} />
                </section>
                <section className="platform-section">
                  <h2>目标历史</h2>
                  <State loading={goals.isPending} error={goals.error} retry={goals.refetch}>
                    {goals.data?.length ? (
                      <ol className="record-ledger">
                        {goals.data.map(
                          (e) =>
                            e.data && (
                              <li key={e.key}>
                                <strong>
                                  {goalNames[e.data.type]} · {e.data.startWeight} →{' '}
                                  {e.data.targetWeight} kg
                                </strong>
                                <span>
                                  {e.data.startDate} 开始
                                  {e.key === s.currentGoal?.key ? ' · 当前生效' : ''}
                                  {e.data.targetDate ? ` · 目标日期 ${e.data.targetDate}` : ''}
                                </span>
                                <small>{e.data.note}</small>
                              </li>
                            ),
                        )}
                      </ol>
                    ) : (
                      <p className="inline-empty">没有历史目标。</p>
                    )}
                    {goals.hasMore && (
                      <Button variant="ghost" onClick={() => goals.loadMore()}>
                        加载更多目标
                      </Button>
                    )}
                  </State>
                </section>
              </>
            )}
            {section === 'training' && (
              <>
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
                <div className="fitness-two-col">
                  <section className="platform-section">
                    <div className="section-title">
                      <h2>计划 · {date}</h2>
                      {action('training-plan', '编辑安排')}
                    </div>
                    {data.rest ? (
                      <p className="inline-empty">今天安排休息，可以照常打卡。</p>
                    ) : (
                      <ExerciseList rows={data.records['training-plan']?.data?.exercises ?? []} />
                    )}
                    <p>{data.records['training-plan']?.data?.note}</p>
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
                  <section className="platform-section">
                    <div className="section-title">
                      <h2>实际训练</h2>
                      {date <= localToday() &&
                        action(
                          'training',
                          '记录实际',
                          data.records.training?.data ?? {
                            status: data.rest ? 'REST' : 'COMPLETED',
                            exercises: structuredClone(
                              data.records['training-plan']?.data?.exercises ?? [],
                            ),
                            note: null,
                            planSnapshot: null,
                          },
                        )}
                    </div>
                    {data.records.training?.data ? (
                      <>
                        <p className="record-status">
                          {trainingNames[data.records.training.data.status]}
                        </p>
                        <ExerciseList rows={data.records.training.data.exercises} />
                        <p>{data.records.training.data.note}</p>
                        <Button
                          variant="ghost"
                          onClick={() => remove(data.records.training!, '实际训练')}
                        >
                          删除实际训练
                        </Button>
                      </>
                    ) : (
                      <p className="inline-empty">
                        尚未记录。实际数据可在计划基础上修改，不会改变计划。
                      </p>
                    )}
                  </section>
                </div>
                <TemplateManager kind="training-template" date={date} />
                <TemplateManager kind="week-template" date={start} days={history.data} />
              </>
            )}
            {section === 'meals' && (
              <>
                <div className="fitness-two-col">
                  <section className="platform-section">
                    <div className="section-title">
                      <h2>计划吃什么</h2>
                      {action('meal-plan', '编辑食谱')}
                    </div>
                    <MealList
                      meal={data.records['meal-plan']?.data}
                      nutrition={data.plannedNutrition}
                    />
                    {data.records['meal-plan']?.data && (
                      <div className="row">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setCopy({
                              kind: 'meal-plan',
                              mode: 'copy',
                              sourceKind: 'meal-plan',
                              sourceKey: date,
                              data: data.records['meal-plan']!.data!,
                            });
                            setDestination(shiftDate(date, 1));
                          }}
                        >
                          复制食谱到日期
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setCopy({
                              kind: 'meal-plan',
                              mode: 'template',
                              data: data.records['meal-plan']!.data!,
                            });
                            setTemplateName('');
                          }}
                        >
                          存为食谱模板
                        </Button>
                      </div>
                    )}
                  </section>
                  <section className="platform-section">
                    <div className="section-title">
                      <h2>实际吃了什么</h2>
                      {date <= localToday() && action('meals', '记录饮食')}
                    </div>
                    <MealList meal={data.records.meals?.data} nutrition={data.nutrition} />
                    {date <= localToday() &&
                      data.records['meal-plan']?.data &&
                      action(
                        'meals',
                        '从计划复制为实际后修改',
                        structuredClone(data.records['meal-plan'].data),
                      )}
                    {data.records.meals?.data && (
                      <Button
                        variant="ghost"
                        onClick={() => remove(data.records.meals!, '实际饮食')}
                      >
                        删除实际饮食
                      </Button>
                    )}
                  </section>
                </div>
                <section className="platform-section">
                  <div className="section-title">
                    <h2>饮水</h2>
                    {date <= localToday() && action('water')}
                  </div>
                  <strong>
                    {data.records.water?.data ? `${data.records.water.data.ml} ml` : '尚未记录'}
                  </strong>
                </section>
                <TemplateManager kind="meal-template" date={date} />
              </>
            )}
            {section === 'weight' && (
              <>
                <section className="platform-section">
                  <div className="section-title">
                    <h2>30天变化</h2>
                    {date <= localToday() &&
                      action(
                        'weight',
                        data.records.weight?.data ? '修改当天体重' : '记录 / 补录体重',
                      )}
                  </div>
                  <WeightChart days={history.data ?? []} />
                </section>
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
            {section === 'history' && (
              <>
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
                    {date <= localToday() &&
                      action('checkin', data.checkedIn ? '修改打卡' : '补打卡')}
                  </div>
                  <DayDetails day={data} onEdit={open} onDelete={remove} />
                </section>
                <p className="help">
                  训练完成率{' '}
                  {statistics.data?.trainingRate == null
                    ? '无已安排的训练日，暂不计算'
                    : `${statistics.data.trainingRate.toFixed(1)}% · ${statistics.data.completedTrainingDays}/${statistics.data.plannedTrainingDays} 天`}
                  。训练、饮食和体重只解释记录本身，不推断效果或因果。连续打卡及本周完成率见今天页，统一来自后端。
                </p>
              </>
            )}
          </>
        )}
      </State>
      {edit && (
        <FitnessEditor
          key={`${edit.kind}-${edit.key}`}
          spec={edit}
          onSaved={() => setNotice(`${titles[edit.kind]}已保存`)}
          onClose={() => {
            setEdit(null);
            setNotice('');
          }}
        />
      )}
      {copy && (
        <Modal
          open
          title={copy.mode === 'copy' ? '复制计划' : '保存个人模板'}
          onClose={() => {
            if (
              !mutation.isPending &&
              (!copyDirty || window.confirm('复制或模板内容尚未保存，确定关闭？'))
            )
              setCopy(null);
          }}
        >
          <form
            className="platform-form"
            onSubmit={(e) => {
              e.preventDefault();
              setNotice('');
              void mutation
                .mutateAsync(async () => {
                  if (copy.mode === 'template') {
                    if (copy.kind === 'training-plan')
                      return fitnessApi.save(
                        'training-template',
                        copyKey,
                        { name: templateName, plan: copy.data as Models['training-plan'] },
                        -1,
                        undefined,
                        copyKey,
                      );
                    return fitnessApi.save(
                      'meal-template',
                      copyKey,
                      { name: templateName, plan: copy.data as Meals },
                      -1,
                      undefined,
                      copyKey,
                    );
                  }
                  const existing = await fitnessApi.get(copy.kind, destination);
                  if (
                    existing?.data &&
                    !window.confirm(
                      `${destination} 已有计划，确定覆盖该日期的计划？实际记录不受影响。`,
                    )
                  )
                    return false;
                  const expected = copyRevision ?? existing?.revision ?? -1;
                  setCopyRevision(expected);
                  return fitnessApi.copy(
                    copy.sourceKind!,
                    copy.sourceKey!,
                    destination,
                    expected,
                    copyKey,
                  );
                })
                .then((result) => {
                  if (result === false) return;
                  setCopy(null);
                  setNotice('已保存');
                })
                .catch((e) => setNotice(`保存失败：${e.message}`));
            }}
          >
            <UnsavedGuard dirty={copyDirty} />
            {copy.mode === 'copy' ? (
              <label>
                目标日期
                <input
                  type="date"
                  required
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    setCopyDirty(true);
                    setCopyRevision(null);
                    setCopyKey(createUuid());
                  }}
                />
              </label>
            ) : (
              <label>
                模板名称
                <input
                  required
                  maxLength={160}
                  value={templateName}
                  onChange={(e) => {
                    setTemplateName(e.target.value);
                    setCopyDirty(true);
                    setCopyKey(createUuid());
                  }}
                />
              </label>
            )}
            <p className="help">复制保存独立的计划，原计划和实际记录保持各自的数据。</p>
            {notice && <p role="alert">{notice}</p>}
            <Button type="submit" loading={mutation.isPending}>
              确认保存
            </Button>
          </form>
        </Modal>
      )}
    </main>
  );
}
function Calendar({
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
function DayDetails({
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
