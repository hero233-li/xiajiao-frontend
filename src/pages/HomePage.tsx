import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Target } from 'lucide-react';

/** 考试目标：2027 年 4 月自考（上海考区，首日按 4 月 17 日预估）。 */
const EXAM_DATE = new Date(2027, 3, 17);
const EXAM_LABEL = '2027 年 4 月自考';
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
          const isExam = sameDay(date, EXAM_DATE);
          return (
            <div
              key={date.toISOString()}
              className={[
                'flex h-9 flex-col items-center justify-center rounded-[10px] text-[13px]',
                isToday ? 'bg-brand text-white font-semibold' : '',
                !isToday && isExam ? 'bg-brand-soft text-brand-ink font-semibold' : '',
                !isToday && !isExam ? (inMonth ? 'text-ink' : 'text-muted/50') : '',
              ].join(' ')}
            >
              {date.getDate()}
              {isExam && !isToday && <span className="bg-brand mt-0.5 size-1 rounded-full" aria-hidden />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ExamGoalCard() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const remaining = daysBetween(today, EXAM_DATE);

  return (
    <section className="glass flex flex-col p-4 sm:p-5">
      <h2 className="text-ink flex items-center gap-2 text-[15px] font-semibold">
        <Target size={16} strokeWidth={1.8} className="text-brand-ink" />
        考试目标
      </h2>
      <p className="text-secondary mt-1 text-[13px]">{EXAM_LABEL}</p>

      <div className="mt-5">
        <p className="text-brand-ink text-[44px] leading-none font-semibold tracking-tight tabular-nums">
          {remaining > 0 ? remaining : 0}
          <span className="text-secondary ml-1.5 text-[13px] font-normal">天</span>
        </p>
        <p className="text-secondary mt-2 text-[13px]">
          {remaining > 0 ? '距离考试' : '考试已开始'}
        </p>
      </div>

      <p className="text-muted mt-auto pt-6 text-[12px] tabular-nums">
        {EXAM_DATE.getFullYear()}-{String(EXAM_DATE.getMonth() + 1).padStart(2, '0')}-
        {String(EXAM_DATE.getDate()).padStart(2, '0')}
      </p>
    </section>
  );
}

export function HomePage() {
  return (
    <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] sm:gap-5">
      <CalendarCard />
      <ExamGoalCard />
    </div>
  );
}
