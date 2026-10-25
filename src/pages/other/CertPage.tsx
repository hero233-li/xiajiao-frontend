interface InfoRow {
  label: string;
  value: string;
}

const rows: InfoRow[] = [
  { label: '职业名称', value: '人工智能训练师' },
  { label: '等级', value: '五级 / 四级 / 三级 / 二级 / 一级' },
  { label: '考试科目', value: '理论知识、技能操作' },
  { label: '认定方式', value: '职业技能等级认定，理论机考加实操' },
  { label: '当前状态', value: '待确认报考等级' },
];

export function CertPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-ink text-[22px] font-semibold">人工智能训练师</h1>
        <p className="text-secondary mt-1 text-[13px]">职业技能等级认定的科目与要求。</p>
      </div>

      <section className="glass divide-line/70 divide-y">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3.5 sm:px-5">
            <span className="text-muted w-24 shrink-0 text-[13px]">{row.label}</span>
            <span className="text-ink min-w-0 flex-1 text-[14px]">{row.value}</span>
          </div>
        ))}
      </section>

      <p className="text-muted text-[12px]">报考批次与费用按当地认定机构公布为准。</p>
    </div>
  );
}
