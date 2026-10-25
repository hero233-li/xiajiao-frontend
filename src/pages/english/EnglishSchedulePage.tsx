import { CalendarClock } from 'lucide-react';

const exams = [
  { name: '全国英语等级考试三级（PETS-3）', when: '每年 3 月、9 月，笔试与口试分场', state: '待报名' },
  { name: '雅思（IELTS）', when: '全年多场，机考按周开放、纸笔按考点', state: '可报名' },
];

export function EnglishSchedulePage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-ink text-[22px] font-semibold">英语考试日程</h1>
        <p className="text-secondary mt-1 text-[13px]">报考时间与场次安排。</p>
      </div>

      <div className="glass divide-line/70 divide-y">
        {exams.map((exam) => (
          <div key={exam.name} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 sm:px-5">
            <span className="bg-brand-soft text-brand-ink grid size-10 place-items-center rounded-full">
              <CalendarClock size={18} strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-ink text-[15px] font-medium">{exam.name}</p>
              <p className="text-secondary mt-1 text-[13px]">{exam.when}</p>
            </div>
            <span className="text-muted rounded-full border border-line px-2.5 py-1 text-[12px]">{exam.state}</span>
          </div>
        ))}
      </div>

      <p className="text-muted text-[12px]">具体考试日期以官方公布为准，接入后自动更新。</p>
    </div>
  );
}
