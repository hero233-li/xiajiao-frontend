/**
 * 复旦大学 305 计算与智能创新学院 · 085400 电子信息（专业学位）初试科目。
 * 依据 2026-09 发布的复旦 2027 硕士招生专业目录实查更新（原 081200 学硕已停招）。
 */

interface Subject {
  name: string;
  belong: string;
  score: string;
  synergy: string;
}

const subjects: Subject[] = [
  { name: '思想政治理论', belong: '101 思想政治理论', score: '100', synergy: '2027-09 起集中背诵 + 肖四/肖八' },
  { name: '英语（二）', belong: '204 英语（二）', score: '100', synergy: 'PETS-3 高分 → 雅思高分直接降维覆盖' },
  { name: '高等数学', belong: '302 数学（二）· 约 80%', score: '约 120', synergy: '与 2027-10 自考 00023 高数工本复用' },
  { name: '线性代数', belong: '302 数学（二）· 约 20%', score: '约 30', synergy: '与 2027-10 自考 13175 线代复用（不考概率论）' },
  { name: '数据结构', belong: '408 计算机学科专业基础', score: '45', synergy: '2027-04 自考 13003 提前打牢' },
  { name: '计算机组成原理', belong: '408 计算机学科专业基础', score: '45', synergy: '与 2027-10 自考 13015 系统原理复用' },
  { name: '操作系统', belong: '408 计算机学科专业基础', score: '35', synergy: '自考 13180 已 86 分通过，基础扎实' },
  { name: '计算机网络', belong: '408 计算机学科专业基础', score: '25', synergy: '与自考 13017 计网复用' },
];

export function PostgradSubjectsPage() {
  return (
    <div className="flex flex-col gap-4">
      <section className="glass px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-muted text-[13px]">复旦大学 · 计算与智能创新学院（305）</span>
          <h1 className="text-ink text-[18px] font-semibold">085400 电子信息</h1>
          <span className="bg-brand-soft text-brand-ink rounded-full px-2 py-0.5 text-[12px]">专业学位</span>
          <span className="bg-surface-2 text-secondary rounded-full px-2 py-0.5 text-[12px]">2027 目录口径</span>
        </div>
        <p className="text-secondary mt-2 text-[13px]">
          初试 4 门统考科目，总分 500（不考概率论、考英语二）。原 081200 学硕在 2027 目录已停招，305 学院统考统一归入本专业。
        </p>
      </section>

      <div className="grid gap-2.5 sm:grid-cols-3">
        <div className="glass px-4 py-3.5">
          <p className="text-muted text-[12px]">2027 目录拟招规模</p>
          <p className="text-ink mt-1 text-[15px] font-medium tabular-nums">522 人</p>
          <p className="text-secondary mt-0.5 text-[12px]">全日制 432（统考约 265）· 非全 90（无推免）</p>
        </div>
        <div className="glass px-4 py-3.5">
          <p className="text-muted text-[12px]">同等学力 8 门审查时间</p>
          <p className="text-brand-ink mt-1 text-[15px] font-medium">复试阶段核验</p>
          <p className="text-secondary mt-0.5 text-[12px]">2027-04 与 2027-10 两次自考均赶得上 2028-03 复试</p>
        </div>
        <div className="glass px-4 py-3.5">
          <p className="text-muted text-[12px]">复试与加试</p>
          <p className="text-ink mt-1 text-[15px] font-medium">专业知识 + 编程 + 加试 2 门</p>
          <p className="text-secondary mt-0.5 text-[12px]">非全复试仅考专业知识，同等学力另加试两门本科主干课</p>
        </div>
      </div>

      <section className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse text-left">
            <thead>
              <tr className="text-muted text-[12px]">
                <th className="py-3 pl-4 font-normal">知识块</th>
                <th className="font-normal">所属考试科目</th>
                <th className="w-20 text-right font-normal">分值</th>
                <th className="py-3 pr-4 pl-4 font-normal">与现有路线复用</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={subject.name} className="border-line/70 border-t text-[13px]">
                  <td className="text-ink py-2.5 pl-4 font-medium">{subject.name}</td>
                  <td className="text-secondary tabular-nums">{subject.belong}</td>
                  <td className="text-secondary text-right tabular-nums">{subject.score}</td>
                  <td className="text-muted py-2.5 pr-4 pl-4 text-[12px]">{subject.synergy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-muted text-[12px] leading-relaxed">
        依据《复旦大学 2027 年招收攻读硕士学位研究生章程》及专业目录整理；2028 级正式目录将于 2027 年 9 月公布。W1 待办：致电复旦研招办（021-65642673 / 65643991）核实自考单科合格成绩单计入「8 门相关专业本科课程」及 305 学院同等学力具体要求。
      </p>
    </div>
  );
}
