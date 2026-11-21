import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Flag, Target } from 'lucide-react';
import { EXAM_PLAN, type PlanItem } from '../data/examPlan';

/** 把 YYYY-MM-DD 解析成当地日期（避免 new Date('YYYY-MM-DD') 的 UTC 偏移）。 */
function parseDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 倒计时目标：计划里的第一场 */
const MAIN = EXAM_PLAN[0];
const MAIN_DATE = parseDate(MAIN.date);
const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

/** 各场考试对应的站内备考入口 */
const PLAN_ROUTES: Record<string, string> = {
  'ai-l3': '/other/ai-trainer',
  'zikao-2027-04': '/zikao/schedule',
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

function CountdownHero({ today }: { today: Date }) {
  const remaining = daysBetween(today, MAIN_DATE);
  const route = PLAN_ROUTES[MAIN.id];

  return (
    <section className="glass glass--sheen p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title truncate">{MAIN.title}</h1>
            <span className="bg-brand-soft text-brand-ink rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums">
              {MAIN.date}
            </span>
          </div>
          {MAIN.note ? <p className="text-secondary mt-1.5 text-[13px]">{MAIN.note}</p> : null}
          {route ? (
            <div className="mt-4">
              <Link to={route} className="pill pill--solid px-4 py-2 text-[13px] font-medium">
                进入备考
                <ArrowRight size={14} strokeWidth={2} />
              </Link>
            </div>
          ) : null}
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
  selectedId,
  onSelectExam,
}: {
  today: Date;
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
          const isMain = index === 0;
          const isSelected = item.id === selectedId;
          const passed = days < 0;
          const route = PLAN_ROUTES[item.id];

          return (
            <li
              key={item.id}
              className={[
                'rounded-[14px] transition-colors duration-[var(--duration)] ease-[var(--ease-out)]',
                isSelected ? 'bg-brand-soft/55' : 'hover:bg-surface-2/55',
                passed ? 'opacity-50' : '',
              ].join(' ')}
            >
              <div className="flex items-start gap-3 px-3 py-3">
                <button
                  type="button"
                  onClick={() => onSelectExam(item)}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
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
                        <span className="bg-surface-2 text-muted rounded-full px-2 py-0.5 text-[12px]">
                          待公布
                        </span>
                      ) : null}
                    </div>

                    <div className="text-muted mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] tabular-nums">
                      <span>{item.date}</span>
                      <span className={isMain ? 'text-brand-ink font-medium' : ''}>
                        {passed ? '已考' : days === 0 ? '今天' : `${days} 天后`}
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
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedId, setSelectedId] = useState<string>(MAIN.id);

  function selectExam(item: PlanItem) {
    setSelectedId(item.id);
    const d = parseDate(item.date);
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-5">
      <div className="flex flex-col gap-4 lg:gap-5">
        <CountdownHero today={today} />
        <CalendarCard
          today={today}
          cursor={cursor}
          onCursorChange={setCursor}
          selectedId={selectedId}
          onSelectExam={selectExam}
        />
      </div>
      <ExamPlanCard today={today} selectedId={selectedId} onSelectExam={selectExam} />
    </div>
  );
}
