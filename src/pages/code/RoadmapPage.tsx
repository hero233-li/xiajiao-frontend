interface Stage {
  title: string;
  detail: string;
  state: string;
}

const stages: Stage[] = [
  { title: '语言基础', detail: 'HTML / CSS / JavaScript / TypeScript', state: '未开始' },
  { title: '前端框架', detail: 'React 组件与状态、路由、数据请求', state: '未开始' },
  { title: '后端基础', detail: 'Java、Spring Boot、SQL 与索引', state: '未开始' },
  { title: '工程与部署', detail: 'Git、构建、Docker、发布与回滚', state: '未开始' },
  { title: 'AI 应用', detail: 'Python、向量检索、大模型接口', state: '未开始' },
];

export function RoadmapPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-ink text-[22px] font-semibold">学习路线</h1>
        <p className="text-secondary mt-1 text-[13px]">从语言基础到 AI 应用的五个阶段。</p>
      </div>

      <section className="glass px-4 py-1 sm:px-5">
        <ol>
          {stages.map((stage, index) => (
            <li key={stage.title} className="border-line/70 flex gap-3 border-b py-4 last:border-b-0">
              <span className="text-brand bg-brand-soft mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-medium tabular-nums">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-ink text-[15px] font-medium">{stage.title}</p>
                <p className="text-secondary mt-1 text-[13px]">{stage.detail}</p>
              </div>
              <span className="text-muted shrink-0 text-[12px]">{stage.state}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
