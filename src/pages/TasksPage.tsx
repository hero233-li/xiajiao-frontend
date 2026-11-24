import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  CATEGORY_META,
  MONTHLY_PLANS,
  WEEKLY_PLANS,
  addDaysIso,
  buildDailySlots,
  countDailyDaysForWeeklyTask,
  findCurrentWeekIndex,
  formatIsoDate,
  getWeeklyTaskById,
  parseIsoDate,
  type MonthlyGoal,
} from '../data/taskPlan';
import {
  getCustomTasks,
  useStudyTracker,
  type SyncState,
  type WeeklyCategory,
} from '../lib/studyTracker';

export type TaskView = 'daily' | 'weekly' | 'monthly';

const VIEW_META: Record<TaskView, { label: string; to: string; desc: string }> = {
  daily: { label: '每日任务', to: '/tasks/daily', desc: '只看今天 5 件事，勾完自动推进周任务' },
  weekly: { label: '周任务', to: '/tasks/weekly', desc: '按周验收输出，勾完自动推进月任务' },
  monthly: { label: '月任务', to: '/tasks/monthly', desc: '阶段大目标，自动汇总名下周任务进度' },
};

const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function SyncBadge({ state }: { state: SyncState }) {
  if (state === 'loading' || state === 'saving') {
    return (
      <span className="text-muted inline-flex items-center gap-1 text-[11px]">
        <Loader2 size={12} className="animate-spin" />
        同步中
      </span>
    );
  }
  if (state === 'offline') {
    return (
      <span className="text-warn inline-flex items-center gap-1 text-[11px]" title="云端读取失败，暂不覆盖远端数据">
        <CloudOff size={12} />
        离线
      </span>
    );
  }
  return (
    <span className="text-muted inline-flex items-center gap-1 text-[11px]">
      <Cloud size={12} className="text-brand-ink" />
      {state === 'saved' ? '已同步' : '云端'}
    </span>
  );
}

function goalProgress(goal: MonthlyGoal, checked: Record<string, boolean>) {
  if (goal.linkedWeeklyIds.length > 0) {
    const done = goal.linkedWeeklyIds.filter((id) => Boolean(checked[id])).length;
    const total = goal.linkedWeeklyIds.length;
    return { done, total, pct: Math.round((done / total) * 100), completed: done === total };
  }
  const done = checked[goal.id] ? 1 : 0;
  return { done, total: 1, pct: done ? 100 : 0, completed: done === 1 };
}

export function TasksPage({ view }: { view: TaskView }) {
  const navigate = useNavigate();
  const todayIso = useMemo(() => formatIsoDate(new Date()), []);
  const currentWeekIdx = useMemo(() => findCurrentWeekIndex(todayIso), [todayIso]);

  const [selectedDay, setSelectedDay] = useState(todayIso);
  const [weekIdx, setWeekIdx] = useState(currentWeekIdx);
  const [monthIdx, setMonthIdx] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCategory, setDraftCategory] = useState<WeeklyCategory>('zikao');
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const { doc, syncState, blocked, toggle, addCustomTask, removeCustomTask } = useStudyTracker();
  const busy = blocked || syncState === 'loading';

  useEffect(() => {
    if (!dropdownOpen) return;
    const onDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [dropdownOpen]);

  // 当视图变化时关闭新增框
  useEffect(() => {
    setAdding(false);
    setDropdownOpen(false);
  }, [view]);

  // 1) 当日数据（同时给顶部联动摘要用）
  const dailyData = useMemo(() => buildDailySlots(selectedDay), [selectedDay]);
  const dailyCustom = useMemo(
    () => getCustomTasks(doc.customTasks, 'daily', selectedDay),
    [doc.customTasks, selectedDay],
  );
  const dailyDone =
    dailyData.slots.filter((s) => Boolean(doc.checked[`day:${selectedDay}:${s.slotId}`])).length +
    dailyCustom.filter((c) => Boolean(doc.checked[c.id])).length;
  const dailyTotal = dailyData.slots.length + dailyCustom.length;
  const dailyPct = dailyTotal ? Math.round((dailyDone / dailyTotal) * 100) : 0;

  // 2) 当周数据
  const activeWeek = WEEKLY_PLANS[weekIdx];
  const weeklyCustom = useMemo(
    () => getCustomTasks(doc.customTasks, 'weekly', activeWeek.id),
    [doc.customTasks, activeWeek.id],
  );
  const weeklyDone =
    activeWeek.tasks.filter((t) => Boolean(doc.checked[t.id])).length +
    weeklyCustom.filter((c) => Boolean(doc.checked[c.id])).length;
  const weeklyTotal = activeWeek.tasks.length + weeklyCustom.length;
  const weeklyPct = weeklyTotal ? Math.round((weeklyDone / weeklyTotal) * 100) : 0;

  // 3) 当月数据（月进度自动由名下周任务汇总）
  const activeMonth = MONTHLY_PLANS[monthIdx];
  const monthlyCustom = useMemo(
    () => getCustomTasks(doc.customTasks, 'monthly', activeMonth.id),
    [doc.customTasks, activeMonth.id],
  );
  const monthSummary = useMemo(() => {
    let unitDone = 0;
    let unitTotal = 0;
    let goalDone = 0;
    for (const g of activeMonth.goals) {
      const p = goalProgress(g, doc.checked);
      unitDone += p.done;
      unitTotal += p.total;
      if (p.completed) goalDone++;
    }
    for (const c of monthlyCustom) {
      unitTotal += 1;
      if (doc.checked[c.id]) {
        unitDone += 1;
        goalDone += 1;
      }
    }
    const pct = unitTotal ? Math.round((unitDone / unitTotal) * 100) : 0;
    return { goalDone, goalTotal: activeMonth.goals.length + monthlyCustom.length, pct };
  }, [activeMonth, monthlyCustom, doc.checked]);

  const monthGoalTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of MONTHLY_PLANS) {
      for (const g of m.goals) map.set(g.id, g.title);
    }
    return map;
  }, []);

  function switchView(next: TaskView) {
    setDropdownOpen(false);
    navigate(VIEW_META[next].to);
  }

  function jumpToWeekly(targetWeekId: string) {
    const idx = WEEKLY_PLANS.findIndex((w) => w.id === targetWeekId);
    if (idx !== -1) setWeekIdx(idx);
    navigate('/tasks/weekly');
  }

  function jumpToMonthlyGoal(goalId: string) {
    const idx = MONTHLY_PLANS.findIndex((m) => m.goals.some((g) => g.id === goalId));
    if (idx !== -1) setMonthIdx(idx);
    setExpandedGoalId(goalId);
    navigate('/tasks/monthly');
  }

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!draftTitle.trim() || busy) return;
    const scopeKey =
      view === 'daily' ? selectedDay : view === 'weekly' ? activeWeek.id : activeMonth.id;
    addCustomTask(view, scopeKey, draftCategory, draftTitle);
    setDraftTitle('');
    setAdding(false);
  }

  const dayWeekdayLabel = WEEKDAY_CN[parseIsoDate(selectedDay).getDay()];

  return (
    <div className="flex flex-col gap-4">
      {/* 顶部栏：可下拉页签 + 云端同步 + 极简添加按钮 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              aria-expanded={dropdownOpen}
              className="pill h-10 gap-2 px-4 text-[15px] font-semibold"
            >
              <span>{VIEW_META[view].label}</span>
              <ChevronDown
                size={15}
                strokeWidth={2}
                className={`text-muted transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {dropdownOpen && (
              <div className="glass-panel absolute top-12 left-0 z-30 w-56 p-1.5">
                {(['daily', 'weekly', 'monthly'] as const).map((key) => {
                  const active = key === view;
                  const stat =
                    key === 'daily'
                      ? `${dailyDone}/${dailyTotal}`
                      : key === 'weekly'
                        ? `${weeklyDone}/${weeklyTotal}`
                        : `${monthSummary.pct}%`;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => switchView(key)}
                      className={[
                        'flex w-full items-center justify-between rounded-[12px] px-3 py-2 text-left text-[13px] transition-colors cursor-pointer',
                        active
                          ? 'bg-brand-soft text-brand-ink font-medium'
                          : 'text-ink hover:bg-surface-2/70',
                      ].join(' ')}
                    >
                      <span className="flex items-center gap-2">
                        {active ? <Check size={14} strokeWidth={2.2} /> : <span className="size-3.5" />}
                        {VIEW_META[key].label}
                      </span>
                      <span className="text-muted text-[12px] tabular-nums">{stat}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-secondary text-[13px]">{VIEW_META[view].desc}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <SyncBadge state={syncState} />
          <button
            type="button"
            disabled={busy}
            onClick={() => setAdding((v) => !v)}
            className="pill h-8 px-3 py-0 text-[12px] font-medium disabled:opacity-45"
          >
            <Plus size={13} strokeWidth={2} />
            补一条
          </button>
        </div>
      </div>

      {/* 三层联动摘要条：点任意一格即可切换并实时看到 日 → 周 → 月 进度 */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => switchView('daily')}
          className={[
            'glass px-3.5 py-3 text-left transition-colors cursor-pointer',
            view === 'daily' ? 'ring-brand/45 ring-1' : 'opacity-85 hover:opacity-100',
          ].join(' ')}
        >
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-muted text-[12px]">今日</span>
            <span className="text-ink text-[13px] font-semibold tabular-nums">
              {dailyDone}/{dailyTotal}
            </span>
          </div>
          <div className="bg-line mt-2 h-1.5 overflow-hidden rounded-full">
            <span className="bg-brand block h-full rounded-full transition-[width] duration-300" style={{ width: `${dailyPct}%` }} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => switchView('weekly')}
          className={[
            'glass px-3.5 py-3 text-left transition-colors cursor-pointer',
            view === 'weekly' ? 'ring-brand/45 ring-1' : 'opacity-85 hover:opacity-100',
          ].join(' ')}
        >
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-muted text-[12px]">本周 · {activeWeek.code}</span>
            <span className="text-ink text-[13px] font-semibold tabular-nums">
              {weeklyDone}/{weeklyTotal}
            </span>
          </div>
          <div className="bg-line mt-2 h-1.5 overflow-hidden rounded-full">
            <span className="bg-brand block h-full rounded-full transition-[width] duration-300" style={{ width: `${weeklyPct}%` }} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => switchView('monthly')}
          className={[
            'glass px-3.5 py-3 text-left transition-colors cursor-pointer',
            view === 'monthly' ? 'ring-brand/45 ring-1' : 'opacity-85 hover:opacity-100',
          ].join(' ')}
        >
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-muted truncate text-[12px]">{activeMonth.label}</span>
            <span className="text-ink text-[13px] font-semibold tabular-nums">{monthSummary.pct}%</span>
          </div>
          <div className="bg-line mt-2 h-1.5 overflow-hidden rounded-full">
            <span className="bg-brand block h-full rounded-full transition-[width] duration-300" style={{ width: `${monthSummary.pct}%` }} />
          </div>
        </button>
      </div>

      {/* 按需展开的极简添加栏（平时隐藏，保持画面干净） */}
      {adding && (
        <form onSubmit={handleAdd} className="glass flex flex-wrap items-center gap-2 px-4 py-3">
          <select
            value={draftCategory}
            onChange={(e) => setDraftCategory(e.target.value as WeeklyCategory)}
            aria-label="分类"
            className="field w-auto py-1.5 pr-7 pl-2.5 text-[12px]"
          >
            <option value="zikao">自考</option>
            <option value="english">英语</option>
            <option value="tech">Agent/工作</option>
            <option value="admin">考研/行政</option>
          </select>
          <input
            type="text"
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder={`补充一条${VIEW_META[view].label}…`}
            className="field min-w-[200px] flex-1 py-1.5 text-[13px]"
          />
          <button
            type="submit"
            disabled={busy || !draftTitle.trim()}
            className="pill pill--solid px-3.5 py-1.5 text-[12px] font-medium disabled:opacity-45"
          >
            添加
          </button>
        </form>
      )}

      {/* ============ 视图 1：每日任务 ============ */}
      {view === 'daily' && (
        <section className="glass p-5 sm:p-6">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-ink text-[15px] font-semibold tabular-nums">
                {selectedDay}（{dayWeekdayLabel}）
              </h2>
              <button
                type="button"
                onClick={() => jumpToWeekly(dailyData.week.id)}
                className="bg-brand-soft text-brand-ink hover:bg-brand hover:text-white rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors cursor-pointer"
              >
                所属 {dailyData.week.code} · {dailyData.week.stage}
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {selectedDay !== todayIso && (
                <button
                  type="button"
                  onClick={() => setSelectedDay(todayIso)}
                  className="pill h-7 px-2.5 py-0 text-[12px]"
                >
                  今天
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedDay((d) => addDaysIso(d, -1))}
                aria-label="前一天"
                className="pill size-7 justify-center p-0"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDay((d) => addDaysIso(d, 1))}
                aria-label="后一天"
                className="pill size-7 justify-center p-0"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </header>

          <ul className="mt-4 flex flex-col gap-2">
            {dailyData.slots.map((slot) => {
              const checkKey = `day:${selectedDay}:${slot.slotId}`;
              const checked = Boolean(doc.checked[checkKey]);
              const meta = CATEGORY_META[slot.category];
              return (
                <li
                  key={slot.slotId}
                  className={['glass-tile flex items-start gap-3 px-3.5 py-3', checked ? 'opacity-60' : ''].join(' ')}
                >
                  <input
                    type="checkbox"
                    className="check mt-0.5"
                    checked={checked}
                    disabled={busy}
                    onChange={() => toggle(checkKey)}
                    aria-label={slot.title}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-muted text-[12px] font-medium tabular-nums">{slot.time}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}>
                        {meta.label}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggle(checkKey)}
                        className={[
                          'text-left text-[14px] font-medium cursor-pointer',
                          checked ? 'text-muted line-through' : 'text-ink',
                        ].join(' ')}
                      >
                        {slot.title}
                      </button>
                    </div>
                    <p className="text-muted mt-1 text-[12px]">{slot.hint}</p>
                  </div>

                  {slot.weeklyTaskId && (
                    <button
                      type="button"
                      onClick={() => jumpToWeekly(dailyData.week.id)}
                      title="查看联动的周任务"
                      className="text-muted hover:text-brand-ink shrink-0 rounded-full px-2 py-0.5 text-[11px] transition-colors cursor-pointer"
                    >
                      联动 {dailyData.week.code} →
                    </button>
                  )}
                </li>
              );
            })}

            {dailyCustom.map((item) => {
              const checked = Boolean(doc.checked[item.id]);
              const meta = CATEGORY_META[item.category];
              return (
                <li
                  key={item.id}
                  className={['glass-tile flex items-center gap-3 px-3.5 py-3', checked ? 'opacity-60' : ''].join(' ')}
                >
                  <input
                    type="checkbox"
                    className="check"
                    checked={checked}
                    disabled={busy}
                    onChange={() => toggle(item.id)}
                  />
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}>
                    {meta.label}
                  </span>
                  <span className={['min-w-0 flex-1 text-[14px]', checked ? 'text-muted line-through' : 'text-ink'].join(' ')}>
                    {item.title}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeCustomTask(item.id)}
                    aria-label="删除"
                    className="text-muted hover:text-danger grid size-6 place-items-center rounded-full cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ============ 视图 2：周任务 ============ */}
      {view === 'weekly' && (
        <section className="glass p-5 sm:p-6">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-ink text-[15px] font-semibold">
                  {activeWeek.code} · {activeWeek.title}
                </h2>
                <span className="text-muted text-[12px] tabular-nums">
                  {activeWeek.start.slice(5)} ~ {activeWeek.end.slice(5)} · {activeWeek.budget}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {WEEKLY_PLANS.map((w, idx) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setWeekIdx(idx)}
                  className={[
                    'rounded-full px-2.5 py-0.5 text-[11px] font-medium tabular-nums transition-colors cursor-pointer',
                    idx === weekIdx
                      ? 'bg-brand text-white'
                      : 'bg-surface-2 text-secondary hover:bg-brand-soft hover:text-brand-ink',
                  ].join(' ')}
                >
                  {w.code}
                </button>
              ))}
            </div>
          </header>

          <ul className="mt-4 flex flex-col gap-2">
            {activeWeek.tasks.map((task) => {
              const checked = Boolean(doc.checked[task.id]);
              const meta = CATEGORY_META[task.category];
              const dailyHit = countDailyDaysForWeeklyTask(activeWeek, task.id, doc.checked);
              const monthTitle = monthGoalTitleById.get(task.monthGoalId);

              return (
                <li
                  key={task.id}
                  className={['glass-tile flex items-start gap-3 px-3.5 py-3', checked ? 'opacity-60' : ''].join(' ')}
                >
                  <input
                    type="checkbox"
                    className="check mt-0.5"
                    checked={checked}
                    disabled={busy}
                    onChange={() => toggle(task.id)}
                    aria-label={task.title}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}>
                        {meta.label}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggle(task.id)}
                        className={[
                          'text-left text-[14px] font-medium cursor-pointer',
                          checked ? 'text-muted line-through' : 'text-ink',
                        ].join(' ')}
                      >
                        {task.title}
                      </button>
                    </div>
                    <p className="text-muted mt-1 text-[12px]">验收：{task.acceptance}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="bg-surface-2 text-secondary rounded-full px-2 py-0.5 tabular-nums">
                        每日打卡 {dailyHit}/{task.targetDays} 天
                      </span>
                      {monthTitle && (
                        <button
                          type="button"
                          onClick={() => jumpToMonthlyGoal(task.monthGoalId)}
                          className="text-brand-ink hover:underline cursor-pointer"
                        >
                          ↑ 归属月目标：{monthTitle}
                        </button>
                      )}
                    </div>
                  </div>

                  {task.route && (
                    <Link
                      to={task.route}
                      title="前往对应页面"
                      className="text-muted hover:text-brand-ink grid size-6 shrink-0 place-items-center rounded-full"
                    >
                      <ArrowUpRight size={14} />
                    </Link>
                  )}
                </li>
              );
            })}

            {weeklyCustom.map((item) => {
              const checked = Boolean(doc.checked[item.id]);
              const meta = CATEGORY_META[item.category];
              return (
                <li
                  key={item.id}
                  className={['glass-tile flex items-center gap-3 px-3.5 py-3', checked ? 'opacity-60' : ''].join(' ')}
                >
                  <input
                    type="checkbox"
                    className="check"
                    checked={checked}
                    disabled={busy}
                    onChange={() => toggle(item.id)}
                  />
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}>
                    {meta.label}
                  </span>
                  <span className={['min-w-0 flex-1 text-[14px]', checked ? 'text-muted line-through' : 'text-ink'].join(' ')}>
                    {item.title}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeCustomTask(item.id)}
                    aria-label="删除"
                    className="text-muted hover:text-danger grid size-6 place-items-center rounded-full cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ============ 视图 3：月任务 ============ */}
      {view === 'monthly' && (
        <section className="glass p-5 sm:p-6">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-ink text-[15px] font-semibold">
                {activeMonth.label} · {activeMonth.stage}
              </h2>
              <p className="text-muted mt-0.5 text-[12px] tabular-nums">{activeMonth.range}</p>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {MONTHLY_PLANS.map((m, idx) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMonthIdx(idx)}
                  className={[
                    'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer',
                    idx === monthIdx
                      ? 'bg-brand text-white'
                      : 'bg-surface-2 text-secondary hover:bg-brand-soft hover:text-brand-ink',
                  ].join(' ')}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </header>

          <ul className="mt-4 flex flex-col gap-2.5">
            {activeMonth.goals.map((goal) => {
              const p = goalProgress(goal, doc.checked);
              const meta = CATEGORY_META[goal.category];
              const hasLinked = goal.linkedWeeklyIds.length > 0;
              const expanded = expandedGoalId === goal.id;

              return (
                <li key={goal.id} className="glass-tile px-4 py-3.5">
                  <div className="flex items-start gap-3">
                    {!hasLinked ? (
                      <input
                        type="checkbox"
                        className="check mt-0.5"
                        checked={p.completed}
                        disabled={busy}
                        onChange={() => toggle(goal.id)}
                        aria-label={goal.title}
                      />
                    ) : null}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}>
                            {meta.label}
                          </span>
                          <span
                            className={[
                              'text-[14px] font-medium',
                              p.completed ? 'text-muted line-through' : 'text-ink',
                            ].join(' ')}
                          >
                            {goal.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-secondary text-[12px] font-medium tabular-nums">
                            {hasLinked ? `周任务 ${p.done}/${p.total}（${p.pct}%）` : p.completed ? '已完成' : '待启动'}
                          </span>
                          {hasLinked && (
                            <button
                              type="button"
                              onClick={() => setExpandedGoalId(expanded ? null : goal.id)}
                              className="text-muted hover:text-brand-ink inline-flex items-center gap-0.5 text-[12px] cursor-pointer"
                            >
                              {expanded ? '收起' : '明细'}
                              <ChevronDown
                                size={13}
                                className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                              />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-muted mt-1 text-[12px]">{goal.target}</p>

                      {hasLinked && (
                        <div className="bg-line mt-2.5 h-1.5 overflow-hidden rounded-full">
                          <span
                            className="bg-brand block h-full rounded-full transition-[width] duration-300"
                            style={{ width: `${p.pct}%` }}
                          />
                        </div>
                      )}

                      {hasLinked && expanded && (
                        <div className="hairline-t mt-3 flex flex-col gap-1.5 pt-2.5">
                          {goal.linkedWeeklyIds.map((wid) => {
                            const wt = getWeeklyTaskById(wid);
                            if (!wt) return null;
                            const done = Boolean(doc.checked[wt.id]);
                            const weekCode = wid.split('-')[0].toUpperCase();
                            return (
                              <label
                                key={wt.id}
                                className="flex cursor-pointer items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-[13px] hover:bg-surface-2/60"
                              >
                                <input
                                  type="checkbox"
                                  className="check"
                                  checked={done}
                                  disabled={busy}
                                  onChange={() => toggle(wt.id)}
                                />
                                <span className="text-muted text-[11px] font-medium tabular-nums">{weekCode}</span>
                                <span className={done ? 'text-muted line-through' : 'text-ink'}>{wt.title}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}

            {monthlyCustom.map((item) => {
              const checked = Boolean(doc.checked[item.id]);
              const meta = CATEGORY_META[item.category];
              return (
                <li
                  key={item.id}
                  className={['glass-tile flex items-center gap-3 px-4 py-3', checked ? 'opacity-60' : ''].join(' ')}
                >
                  <input
                    type="checkbox"
                    className="check"
                    checked={checked}
                    disabled={busy}
                    onChange={() => toggle(item.id)}
                  />
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}>
                    {meta.label}
                  </span>
                  <span className={['min-w-0 flex-1 text-[14px]', checked ? 'text-muted line-through' : 'text-ink'].join(' ')}>
                    {item.title}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeCustomTask(item.id)}
                    aria-label="删除"
                    className="text-muted hover:text-danger grid size-6 place-items-center rounded-full cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
