import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Flag, Target } from 'lucide-react';
import { EXAM_PLAN } from '../data/examPlan';

/** 把 YYYY-MM-DD 解析成当地日期（避免 new Date('YYYY-MM-DD') 的 UTC 偏移）。 */
function parseDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 全部考试日期（日历打点用） */
const PLAN_DATES = EXAM_PLAN.map((item) => parseDate(item.date));
/** 倒计时目标：计划里的第一场 */
const MAIN = EXAM_PLAN[0];
const EXAM_DATE = parseDate(MAIN.date);
const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

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

function CalendarCard() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const cells = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  function shift(step: number) {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + step, 1));
  }

  return (
    <section className="glass p-4 sm:p-5">
      <header className="flex items-center justify-between">
        <h2 className="text-ink text-[15px] font-semibold">
          {cursor.getFullYear()} 年 {cursor.getMonth() + 1} 月
        </h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(-1)} aria-label="上个月" className="pill size-8 justify-center p-0">
            <ChevronLeft size={16} strokeWidth={1.8} />
          </button>
          <button type="button" onClick={() => shift(1)} aria-label="下个月" className="pill size-8 justify-center p-0">
            <ChevronRight size={16} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <div className="text-muted mt-4 grid grid-cols-7 gap-1 text-center text-[12px]">
        {WEEK_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map(({ date, inMonth }) => {
          const isToday = sameDay(date, today);
          const isExam = PLAN_DATES.some((d) => sameDay(date, d));
          const isMainExam = sameDay(date, EXAM_DATE);
          return (
            <div
              key={date.toISOString()}
              className={[
                'flex h-9 flex-col items-center justify-center rounded-[10px] text-[13px]',
                isToday ? 'bg-brand text-white font-semibold' : '',
                !isToday && isMainExam ? 'bg-brand text-white font-semibold' : '',
                !isToday && !isMainExam && isExam ? 'bg-brand-soft text-brand-ink font-semibold' : '',
                !isToday && !isExam ? (inMonth ? 'text-ink' : 'text-muted/50') : '',
              ].join(' ')}
            >
              {date.getDate()}
              {isExam && !isToday && !isMainExam && (
                <span className="bg-brand mt-0.5 size-1 rounded-full" aria-hidden />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ExamPlanCard() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const remaining = daysBetween(today, EXAM_DATE);
  const mainDate = `${EXAM_DATE.getFullYear()}-${String(EXAM_DATE.getMonth() + 1).padStart(2, '0')}-${String(
    EXAM_DATE.getDate(),
  ).padStart(2, '0')}`;

  return (
    <section className="glass flex flex-col gap-4 p-4 sm:p-5">
      <div>
        <h2 className="text-ink flex items-center gap-2 text-[15px] font-semibold">
          <Target size={16} strokeWidth={1.8} className="text-brand-ink" />
          考试计划
        </h2>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-brand-ink text-[40px] leading-none font-semibold tracking-tight tabular-nums">
              {remaining > 0 ? remaining : 0}
              <span className="text-secondary ml-1.5 text-[13px] font-normal">天</span>
            </p>
            <p className="text-secondary mt-2 text-[13px]">
              距离「{MAIN.title}」
            </p>
          </div>
          <p className="text-muted text-[12px] tabular-nums">{mainDate}</p>
        </div>
        {MAIN.note && <p className="text-muted mt-1 text-[12px]">{MAIN.note}</p>}
      </div>

      <ol className="border-line flex flex-col border-t pt-1">
        {EXAM_PLAN.map((item, index) => {
          const date = parseDate(item.date);
          const days = daysBetween(today, date);
          const isMain = index === 0;
          const passed = days < 0;
          return (
            <li
              key={item.id}
              className={[
                'flex items-start gap-3 border-b border-line/60 py-2.5 last:border-0',
                passed ? 'opacity-45' : '',
              ].join(' ')}
            >
              <span
                className={[
                  'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums',
                  isMain ? 'bg-brand text-white' : 'bg-brand-soft text-brand-ink',
                ].join(' ')}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-ink truncate text-[13px] font-medium">
                  {item.title}
                  {!item.confirmed && (
                    <span className="text-muted ml-1.5 text-[11px] font-normal">待官方公布</span>
                  )}
                </p>
                <p className="text-muted mt-0.5 text-[12px] tabular-nums">
                  {item.date}
                  <span className="ml-1.5">
                    {passed ? '已考' : days === 0 ? '今天' : `${days} 天后`}
                  </span>
                </p>
              </div>
              {isMain && <Flag size={14} strokeWidth={1.8} className="text-brand-ink mt-1 shrink-0" />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function HomePage() {
  return (
    <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] sm:gap-5">
      <CalendarCard />
      <ExamPlanCard />
    </div>
  );
}
