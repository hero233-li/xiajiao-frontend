import { CalendarClock } from 'lucide-react';

/** 占位：等接入真实开考日程后替换这一条。 */
const placeholder = {
  date: '2027-04-17',
  weekday: '周六',
  time: '上午 9:00 - 11:30',
  subject: '待定科目',
  state: '报名未开始',
};

export function SchedulePage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-ink text-[22px] font-semibold">考试日程</h1>
        <p className="text-secondary mt-1 text-[13px]">开考时间与报名节点。</p>
      </div>

      <section className="glass px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="bg-brand-soft text-brand-ink grid size-10 place-items-center rounded-full">
            <CalendarClock size={18} strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-ink text-[15px] font-medium">
              {placeholder.date}（{placeholder.weekday}） {placeholder.time}
            </p>
            <p className="text-secondary mt-1 text-[13px]">{placeholder.subject}</p>
          </div>
          <span className="text-muted rounded-full border border-line px-2.5 py-1 text-[12px]">
            {placeholder.state}
          </span>
        </div>
      </section>

      <p className="text-muted text-[12px]">日程接入后会按考期列出全部科目。</p>
    </div>
  );
}
