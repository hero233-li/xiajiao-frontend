import { courses, major } from '../../data/zikao';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass px-4 py-4">
      <p className="text-ink text-[22px] leading-none font-semibold tabular-nums">{value}</p>
      <p className="text-secondary mt-2 text-[13px]">{label}</p>
    </div>
  );
}

export function CoursesPage() {
  const percent = Math.round((major.earnedCredit / major.requiredCredit) * 100);

  return (
    <div className="flex flex-col gap-4">
      <section className="glass px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-muted text-[13px] tabular-nums">{major.code}</span>
          <h1 className="text-ink text-[18px] font-semibold">{major.name}</h1>
          <span className="bg-brand-soft text-brand-ink rounded-full px-2 py-0.5 text-[12px]">{major.level}</span>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="bg-line h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
            <span className="bg-brand block h-full rounded-full" style={{ width: `${percent}%` }} />
          </div>
          <span className="text-secondary shrink-0 text-[13px] tabular-nums">
            {major.earnedCredit}/{major.requiredCredit} 学分
          </span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="已考课程" value={`${major.usedCourses}/${major.totalCourses}`} />
        <Stat label="免考课程" value={String(major.exemptCourses)} />
        <Stat label="转入课程" value={String(major.transferredCourses)} />
        <Stat label="已得学分" value={`${major.earnedCredit}/${major.requiredCredit}`} />
      </div>

      <section className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left sm:min-w-[680px]">
            <thead>
              <tr className="text-muted text-[12px]">
                <th className="hidden w-12 py-3 pl-4 font-normal sm:table-cell">序号</th>
                <th className="hidden w-24 font-normal sm:table-cell">课程代码</th>
                <th className="py-3 pl-4 font-normal sm:py-0 sm:pl-0">课程名称</th>
                <th className="w-14 pl-4 font-normal sm:pl-0">学分</th>
                <th className="w-16 font-normal">状态</th>
                <th className="hidden w-16 font-normal sm:table-cell">成绩</th>
                <th className="hidden w-28 pr-4 font-normal sm:table-cell">通过时间</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.code} className="border-line/70 border-t text-[13px]">
                  <td className="text-muted hidden py-2.5 pl-4 tabular-nums sm:table-cell">{course.no}</td>
                  <td className="text-muted hidden tabular-nums sm:table-cell">{course.code}</td>
                  <td className="text-ink py-2.5 pl-4 sm:pl-0">{course.name}</td>
                  <td className="text-secondary pl-4 tabular-nums sm:pl-0">{course.credit}</td>
                  <td className={course.passed ? 'text-[var(--green-11)]' : 'text-muted'}>
                    {course.passed ? '已通过' : '-'}
                  </td>
                  <td className="text-secondary hidden tabular-nums sm:table-cell">{course.passed?.score ?? '-'}</td>
                  <td className="text-secondary hidden pr-4 tabular-nums sm:table-cell">{course.passed?.at ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
