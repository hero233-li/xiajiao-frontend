import planMd from '../../data/studyPlan.md?raw';
import { MarkdownDoc } from '../../components/MarkdownDoc';

const EXAM_DATE = new Date(2027, 3, 10);
const META = { credits: 13, round: '2027 年 4 月（两周六日、四门各一场）' };

function daysUntil(target: Date) {
  const now = new Date();
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const b = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((b - a) / 86_400_000);
}

export function PlanPage() {
  const days = daysUntil(EXAM_DATE);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-ink text-[22px] font-semibold">本期计划</h1>
        <p className="text-secondary text-[13px]">
          四科（C++ / Java / 数据结构 / 软件工程）· 13 学分 · 2027-04-10 考试
          {days > 0 ? ` · 还有 ${days} 天` : ' · 已过考试日'}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="glass px-4 py-3">
          <p className="text-muted text-[12px]">考试日</p>
          <p className="text-ink mt-1 text-[15px] font-medium tabular-nums">2027-04-10</p>
        </div>
        <div className="glass px-4 py-3">
          <p className="text-muted text-[12px]">本轮学分</p>
          <p className="text-ink mt-1 text-[15px] font-medium tabular-nums">
            {META.credits} 学分 + 实践 7 学分
          </p>
        </div>
        <div className="glass px-4 py-3">
          <p className="text-muted text-[12px]">场次</p>
          <p className="text-ink mt-1 text-[13px] leading-5">{META.round}</p>
        </div>
      </div>

      <section className="glass px-5 py-5 sm:px-7 sm:py-6">
        <MarkdownDoc source={planMd} />
      </section>

      <p className="text-muted text-[12px]">
        计划来自 2026-11-04 定的四科安排；日期或强度有变动，改这份文档即可（src/data/studyPlan.md）。
      </p>
    </div>
  );
}
