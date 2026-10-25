interface TrackPageProps {
  title: string;
  note: string;
  topics: string[];
}

export function TrackPage({ title, note, topics }: TrackPageProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-ink text-[22px] font-semibold">{title}</h1>
        <p className="text-secondary mt-1 text-[13px]">{note}</p>
      </div>

      <section className="glass divide-line/70 divide-y">
        {topics.map((topic) => (
          <div key={topic} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
            <span className="border-line size-4 shrink-0 rounded-full border" aria-hidden />
            <p className="text-ink min-w-0 flex-1 text-[14px]">{topic}</p>
            <span className="text-muted shrink-0 text-[12px]">未开始</span>
          </div>
        ))}
      </section>

      <p className="text-muted text-[12px]">进度先占位，接入练习数据后按掌握度显示。</p>
    </div>
  );
}
