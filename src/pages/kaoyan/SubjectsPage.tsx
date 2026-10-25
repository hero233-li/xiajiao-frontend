/** 复旦大学 计算机科学与技术（学术学位）初试科目：拆到知识块，不写「数学一 / 301」这种笼统口径。 */

interface Subject {
  name: string;
  belong: string;
  score: string;
}

const subjects: Subject[] = [
  { name: '思想政治理论', belong: '101 思想政治理论', score: '100' },
  { name: '英语（一）', belong: '201 英语（一）', score: '100' },
  { name: '高等数学', belong: '301 数学（一）', score: '约 82' },
  { name: '线性代数', belong: '301 数学（一）', score: '约 34' },
  { name: '概率论与数理统计', belong: '301 数学（一）', score: '约 34' },
  { name: '数据结构', belong: '408 计算机学科专业基础', score: '45' },
  { name: '计算机组成原理', belong: '408 计算机学科专业基础', score: '45' },
  { name: '操作系统', belong: '408 计算机学科专业基础', score: '35' },
  { name: '计算机网络', belong: '408 计算机学科专业基础', score: '25' },
];

export function PostgradSubjectsPage() {
  return (
    <div className="flex flex-col gap-4">
      <section className="glass px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-muted text-[13px]">复旦大学</span>
          <h1 className="text-ink text-[18px] font-semibold">计算机科学与技术</h1>
          <span className="bg-brand-soft text-brand-ink rounded-full px-2 py-0.5 text-[12px]">学术学位</span>
        </div>
        <p className="text-secondary mt-2 text-[13px]">初试 4 门统考科目，总分 500。下面按知识块拆开看。</p>
      </section>

      <section className="glass overflow-hidden">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="text-muted text-[12px]">
              <th className="py-3 pl-4 font-normal">知识块</th>
              <th className="w-[46%] font-normal sm:w-[42%]">所属考试科目</th>
              <th className="w-20 pr-4 text-right font-normal">分值</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject.name} className="border-line/70 border-t text-[13px]">
                <td className="text-ink py-2.5 pl-4">{subject.name}</td>
                <td className="text-secondary tabular-nums">{subject.belong}</td>
                <td className="text-secondary pr-4 text-right tabular-nums">{subject.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-muted text-[12px]">分值按考试大纲的题量分布估算，未含复试。</p>
    </div>
  );
}
