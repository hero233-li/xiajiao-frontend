import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  Flag,
  Loader2,
  Plus,
  Target,
  Trash2,
} from 'lucide-react';
import { EXAM_PLAN, type PlanItem } from '../data/examPlan';
import { CATEGORY_META, WEEKLY_PLANS, findCurrentWeekIndex } from '../data/weeklyPlan';
import { useStudyTracker, type SyncState, type WeeklyCategory } from '../lib/studyTracker';

/** 把 YYYY-MM-DD 解析成当地日期（避免 new Date('YYYY-MM-DD') 的 UTC 偏移）。 */
function parseDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

/** 各场考试对应的站内备考入口 */
const PLAN_ROUTES: Record<string, string> = {
  'ai-l3': '/other/ai-trainer',
  'zikao-2027-04': '/zikao/plan',
  'pets-3': '/english/schedule',
  ielts: '/english/schedule',
  'zikao-2027-10': '/zikao/schedule',
  'kaoyan-2027-12': '/kaoyan/subjects',
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

/** 某月的网格：周一起始，固定 6 行 42 格，前后补足相邻月。 */
function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // 0 = 周一
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(year, month, 1 - offset + i);
    cells.push({ date, inMonth: date.getMonth() === month });
  }
  return cells;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function pickMainExam(today: Date): PlanItem {
  return EXAM_PLAN.find((item) => daysBetween(today, parseDate(item.date)) >= 0) ?? EXAM_PLAN[0];
}

function SyncBadge({ state }: { state: SyncState }) {
  if (state === 'loading' || state === 'saving') {
    return (
      <span className="text-muted inline-flex items-center gap-1 text-[11px]">
        <Loader2 size={12} className="animate-spin" />
        {state === 'loading' ? '读取云端…' : '同步中…'}
      </span>
    );
  }
  if (state === 'offline') {
    return (
      <span className="text-warn inline-flex items-center gap-1 text-[11px]" title="云端读取失败，本次不覆盖远端数据">
        <CloudOff size={12} />
        离线只读
      </span>
    );
  }
  return (
    <span className="text-muted inline-flex items-center gap-1 text-[11px]">
      <Cloud size={12} className="text-brand-ink" />
      {state === 'saved' ? '已同步云端' : '云端同步'}
    </span>
  );
}

function CountdownHero({ today, main }: { today: Date; main: PlanItem }) {
  const remaining = daysBetween(today, parseDate(main.date));
  const route = PLAN_ROUTES[main.id];

  return (
    <section className="glass glass--sheen p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title truncate">{main.title}</h1>
            <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums">
              {main.date}
            </span>
            {!main.confirmed ? (
              <span className="bg-surface-2 text-muted rounded-full px-2 py-0.5 text-[11px]">待公布</span>
            ) : null}
          </div>
          {main.note ? <p className="text-secondary mt-1.5 text-[13px]">{main.note}</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {route ? (
              <Link to={route} className="pill pill--solid px-4 py-2 text-[13px] font-medium">
                进入备考
                <ArrowRight size={14} strokeWidth={2} />
              </Link>
            ) : null}
            <Link to="/zikao/plan" className="pill px-3.5 py-2 text-[13px] font-medium">
              全局计划
            </Link>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end">
          <div className="flex items-baseline gap-1">
            <span className="text-brand-ink text-[40px] leading-none font-semibold tracking-tight tabular-nums">
              {remaining > 0 ? remaining : 0}
            </span>
            <span className="text-secondary text-[13px] font-medium">天</span>
          </div>
          <span className="text-muted mt-1.5 text-[12px]">
            {remaining > 0 ? '距离开考' : remaining === 0 ? '今天开考' : '考试已结束'}
          </span>
        </div>
      </div>
    </section>
  );
}

function WeeklyGoalsCard({ today }: { today: Date }) {
  const todayIso = dateKey(today);
  const currentIdx = useMemo(() => findCurrentWeekIndex(todayIso), [todayIso]);
  const [weekIdx, setWeekIdx] = useState(currentIdx);
  const [filter, setFilter] = useState<'all' | WeeklyCategory>('all');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCategory, setDraftCategory] = useState<WeeklyCategory>('zikao');

  const { doc, syncState, blocked, toggle, addCustomTask, removeCustomTask } = useStudyTracker();
  const week = WEEKLY_PLANS[weekIdx];

  const customForWeek = useMemo(
    () => doc.customTasks.filter((t) => t.weekId === week.id),
    [doc.customTasks, week.id],
  );

  const allItems = useMemo(
    () => [
      ...week.tasks.map((t) => ({ ...t, isCustom: false as const })),
      ...customForWeek.map((t) => ({
        id: t.id,
        category: t.category,
        title: t.title,
        acceptance: '自定义补充项',
        route: undefined as string | undefined,
        isCustom: true as const,
      })),
    ],
    [week.tasks, customForWeek],
  );

  const doneCount = allItems.filter((item) => Boolean(doc.checked[item.id])).length;
  const totalCount = allItems.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const visibleItems = filter === 'all' ? allItems : allItems.filter((item) => item.category === filter);

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!draftTitle.trim() || blocked) return;
    addCustomTask(week.id, draftCategory, draftTitle);
    setDraftTitle('');
  }

  return (
    <section className="glass p-5 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-ink flex items-center gap-2 text-[15px] font-semibold">
            <CheckCircle2 size={16} strokeWidth={1.9} className="text-brand-ink" />
            本周目标
          </h2>
          <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums">
            {week.code} · {week.stage}
          </span>
          {weekIdx === currentIdx ? (
            <span className="bg-success-soft text-success-ink rounded-full px-2 py-0.5 text-[11px] font-medium">
              本周
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <SyncBadge state={syncState} />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setWeekIdx((i) => Math.max(0, i - 1))}
              disabled={weekIdx === 0}
              aria-label="上一周"
              className="pill size-7 justify-center p-0 disabled:opacity-40"
            >
              <ChevronLeft size={14} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => setWeekIdx((i) => Math.min(WEEKLY_PLANS.length - 1, i + 1))}
              disabled={weekIdx === WEEKLY_PLANS.length - 1}
              aria-label="下一周"
              className="pill size-7 justify-center p-0 disabled:opacity-40"
            >
              <ChevronRight size={14} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>

      <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-ink text-[14px] font-medium">{week.title}</p>
        <p className="text-muted text-[12px] tabular-nums">
          {week.start.slice(5)} ~ {week.end.slice(5)} · 预算 {week.budget}
        </p>
      </div>
      <p className="text-secondary mt-1 text-[12px]">{week.focus}</p>

      {/* 进度条 */}
      <div className="mt-3.5 flex items-center gap-3">
        <div className="bg-line h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
          <span
            className="bg-brand block h-full rounded-full transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-secondary shrink-0 text-[12px] font-medium tabular-nums">
          {doneCount}/{totalCount}（{pct}%）
        </span>
      </div>

      {/* 周次快速切换 + 分类筛选 */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
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

        <div className="flex flex-wrap items-center gap-1">
          {(['all', 'zikao', 'english', 'tech', 'admin'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={[
                'rounded-full px-2 py-0.5 text-[11px] transition-colors cursor-pointer',
                filter === cat ? 'bg-ink text-canvas font-medium' : 'text-muted hover:text-ink',
              ].join(' ')}
            >
              {cat === 'all' ? '全部' : CATEGORY_META[cat].label}
            </button>
          ))}
        </div>
      </div>

      {/* 任务勾选列表 */}
      <ul className="mt-3.5 flex flex-col gap-2">
        {visibleItems.map((item) => {
          const checked = Boolean(doc.checked[item.id]);
          const meta = CATEGORY_META[item.category];
          return (
            <li
              key={item.id}
              className={[
                'glass-tile flex items-start gap-3 px-3.5 py-3',
                checked ? 'opacity-65' : '',
              ].join(' ')}
            >
              <input
                type="checkbox"
                className="check mt-0.5"
                checked={checked}
                disabled={blocked}
                onChange={() => toggle(item.id)}
                aria-label={item.title}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}>
                    {meta.label}
                  </span>
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => toggle(item.id)}
                    className={[
                      'text-left text-[13px] font-medium leading-snug cursor-pointer',
                      checked ? 'text-muted line-through' : 'text-ink',
                    ].join(' ')}
                  >
                    {item.title}
                  </button>
                </div>
                {item.acceptance ? (
                  <p className="text-muted mt-1 text-[12px] leading-relaxed">验收：{item.acceptance}</p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-1 pt-0.5">
                {item.route ? (
                  <Link
                    to={item.route}
                    title="前往对应页面"
                    aria-label={`前往${item.title}`}
                    className="text-muted hover:text-brand-ink grid size-6 place-items-center rounded-full transition-colors"
                  >
                    <ArrowUpRight size={14} strokeWidth={1.8} />
                  </Link>
                ) : null}
                {item.isCustom ? (
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => removeCustomTask(item.id)}
                    title="删除自定义项"
                    aria-label="删除自定义项"
                    className="text-muted hover:text-danger grid size-6 place-items-center rounded-full transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} strokeWidth={1.8} />
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {/* 随手补一条本周任务 */}
      <form onSubmit={handleAdd} className="hairline-t mt-3.5 flex flex-wrap items-center gap-2 pt-3.5">
        <select
          value={draftCategory}
          onChange={(e) => setDraftCategory(e.target.value as WeeklyCategory)}
          aria-label="分类"
          className="field w-auto py-1.5 pr-7 pl-2.5 text-[12px]"
        >
          <option value="zikao">自考</option>
          <option value="english">英语</option>
          <option value="tech">技术</option>
          <option value="admin">行政</option>
        </select>
        <input
          type="text"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          disabled={blocked}
          placeholder={`给 ${week.code} 补一条任务（如：补做 C++ 第 2 章课后题）`}
          className="field min-w-[180px] flex-1 py-1.5 text-[13px]"
        />
        <button
          type="submit"
          disabled={blocked || !draftTitle.trim()}
          className="pill px-3 py-1.5 text-[12px] font-medium disabled:opacity-45"
        >
          <Plus size={13} strokeWidth={2} />
          添加
        </button>
      </form>
    </section>
  );
}

function CalendarCard({
  today,
  cursor,
  onCursorChange,
  selectedId,
  onSelectExam,
}: {
  today: Date;
  cursor: Date;
  onCursorChange: (next: Date) => void;
  selectedId: string;
  onSelectExam: (item: PlanItem) => void;
}) {
  const cells = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  const examByDay = useMemo(() => {
    const map = new Map<string, PlanItem>();
    for (const item of EXAM_PLAN) map.set(item.date, item);
    return map;
  }, []);

  const monthExams = useMemo(
    () =>
      EXAM_PLAN.filter((item) => {
        const d = parseDate(item.date);
        return d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth();
      }),
    [cursor],
  );

  const isCurrentMonth =
    cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();

  function shift(step: number) {
    onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() + step, 1));
  }

  return (
    <section className="glass p-5 sm:p-6">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-ink flex items-center gap-2 text-[15px] font-semibold tabular-nums">
          <CalendarDays size={16} strokeWidth={1.8} className="text-brand-ink" />
          {cursor.getFullYear()} 年 {cursor.getMonth() + 1} 月
        </h2>
        <div className="flex items-center gap-1.5">
          {!isCurrentMonth ? (
            <button
              type="button"
              onClick={() => onCursorChange(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="pill h-8 px-3 py-0 text-[12px] font-medium"
            >
              今天
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="上个月"
            className="pill size-8 justify-center p-0"
          >
            <ChevronLeft size={15} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="下个月"
            className="pill size-8 justify-center p-0"
          >
            <ChevronRight size={15} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <div className="text-muted mt-4 grid grid-cols-7 gap-1 text-center text-[12px] font-medium">
        {WEEK_LABELS.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1.5">
        {cells.map(({ date, inMonth }) => {
          const key = dateKey(date);
          const isToday = sameDay(date, today);
          const exam = examByDay.get(key);
          const isSelectedExam = Boolean(exam && exam.id === selectedId);

          const baseClass =
            'relative flex h-10 flex-col items-center justify-center rounded-[12px] text-[13px] tabular-nums transition-colors duration-[var(--duration)] ease-[var(--ease-out)]';

          if (exam) {
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectExam(exam)}
                title={`${exam.date} ${exam.title}`}
                className={[
                  baseClass,
                  'cursor-pointer font-semibold',
                  isSelectedExam
                    ? 'bg-brand text-white shadow-[0_4px_12px_color-mix(in_srgb,var(--iris-9)_28%,transparent)]'
                    : 'bg-brand-soft text-brand-ink hover:bg-brand hover:text-white',
                  isToday ? 'ring-2 ring-brand/40 ring-offset-1' : '',
                ].join(' ')}
              >
                <span>{date.getDate()}</span>
                <span
                  className={`mt-0.5 size-1 rounded-full ${isSelectedExam ? 'bg-white/90' : 'bg-brand'}`}
                  aria-hidden
                />
              </button>
            );
          }

          return (
            <div
              key={key}
              className={[
                baseClass,
                isToday
                  ? 'bg-surface-2 text-ink ring-ink/20 font-semibold ring-1'
                  : inMonth
                    ? 'text-ink'
                    : 'text-muted/45',
              ].join(' ')}
            >
              <span>{date.getDate()}</span>
              {isToday ? (
                <span className="bg-ink mt-0.5 size-1 rounded-full opacity-60" aria-hidden />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="hairline-t mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 text-[12px]">
        <div className="flex items-center gap-3 text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="bg-surface-2 ring-ink/25 inline-block size-2.5 rounded-full ring-1" />
            今天
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="bg-brand inline-block size-2.5 rounded-full" />
            考试日
          </span>
        </div>

        {monthExams.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {monthExams.map((item) => {
              const d = parseDate(item.date);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectExam(item)}
                  className="bg-brand-soft/80 text-brand-ink hover:bg-brand-soft rounded-full px-2.5 py-0.5 text-[12px] font-medium transition-colors"
                >
                  {d.getMonth() + 1} 月 {d.getDate()} 日 {item.title}
                </button>
              );
            })}
          </div>
        ) : (
          <span className="text-muted">本月无考试安排</span>
        )}
      </div>
    </section>
  );
}

function ExamPlanCard({
  today,
  mainId,
  selectedId,
  onSelectExam,
}: {
  today: Date;
  mainId: string;
  selectedId: string;
  onSelectExam: (item: PlanItem) => void;
}) {
  return (
    <section className="glass flex flex-col p-5 sm:p-6">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-ink flex items-center gap-2 text-[15px] font-semibold">
          <Target size={16} strokeWidth={1.8} className="text-brand-ink" />
          考试计划
        </h2>
        <span className="text-muted text-[12px] tabular-nums">共 {EXAM_PLAN.length} 场</span>
      </header>

      <ol className="mt-3 flex flex-col gap-1">
        {EXAM_PLAN.map((item, index) => {
          const date = parseDate(item.date);
          const days = daysBetween(today, date);
          const isMain = item.id === mainId;
          const isSelected = item.id === selectedId;
          const passed = days < 0;
          const route = PLAN_ROUTES[item.id];

          return (
            <li
              key={item.id}
              className={[
                'rounded-[14px] transition-colors duration-[var(--duration)] ease-[var(--ease-out)]',
                isSelected ? 'bg-brand-soft/55' : 'hover:bg-surface-2/55',
                passed ? 'opacity-55' : '',
              ].join(' ')}
            >
              <div className="flex items-start gap-3 px-3 py-3">
                <button
                  type="button"
                  onClick={() => onSelectExam(item)}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left cursor-pointer"
                >
                  <span
                    className={[
                      'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold tabular-nums',
                      isMain || isSelected ? 'bg-brand text-white' : 'bg-brand-soft text-brand-ink',
                    ].join(' ')}
                  >
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-ink truncate text-[15px] font-medium">{item.title}</span>
                      {!item.confirmed ? (
                        <span className="bg-surface-2 text-muted rounded-full px-2 py-0.5 text-[11px]">
                          待公布
                        </span>
                      ) : null}
                      {passed ? (
                        <span className="bg-surface-2 text-secondary rounded-full px-2 py-0.5 text-[11px]">
                          已考
                        </span>
                      ) : null}
                    </div>

                    <div className="text-muted mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] tabular-nums">
                      <span>{item.date}</span>
                      <span className={isMain ? 'text-brand-ink font-medium' : ''}>
                        {passed ? '待出成绩' : days === 0 ? '今天' : `${days} 天后`}
                      </span>
                    </div>

                    {isSelected && item.note ? (
                      <p className="text-secondary mt-1.5 text-[12px] leading-relaxed">{item.note}</p>
                    ) : null}
                  </div>
                </button>

                <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                  {isMain ? <Flag size={14} strokeWidth={1.8} className="text-brand-ink" /> : null}
                  {route ? (
                    <Link
                      to={route}
                      aria-label={`进入${item.title}`}
                      title={`前往${item.title}`}
                      className="text-muted hover:bg-glass-fill-strong hover:text-brand-ink grid size-7 place-items-center rounded-full transition-colors"
                    >
                      <ArrowUpRight size={15} strokeWidth={1.8} />
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function HomePage() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const main = useMemo(() => pickMainExam(today), [today]);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedId, setSelectedId] = useState<string>(main.id);

  function selectExam(item: PlanItem) {
    setSelectedId(item.id);
    const d = parseDate(item.date);
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)] lg:gap-5">
      <div className="flex flex-col gap-4 lg:gap-5">
        <CountdownHero today={today} main={main} />
        <WeeklyGoalsCard today={today} />
      </div>
      <div className="flex flex-col gap-4 lg:gap-5">
        <ExamPlanCard today={today} mainId={main.id} selectedId={selectedId} onSelectExam={selectExam} />
        <CalendarCard
          today={today}
          cursor={cursor}
          onCursorChange={setCursor}
          selectedId={selectedId}
          onSelectExam={selectExam}
        />
      </div>
    </div>
  );
}
