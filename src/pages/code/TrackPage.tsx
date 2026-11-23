import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import type { TrackTopic } from '../../data/codeTracks';
import { useStudyTracker } from '../../lib/studyTracker';

interface TrackPageProps {
  title: string;
  note: string;
  topics: TrackTopic[];
}

export function TrackPage({ title, note, topics }: TrackPageProps) {
  const { doc, syncState, blocked, toggle } = useStudyTracker();
  const doneCount = topics.filter((t) => Boolean(doc.checked[t.id])).length;
  const pct = topics.length ? Math.round((doneCount / topics.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-ink text-[22px] font-semibold">{title}</h1>
          <p className="text-secondary mt-1 text-[13px]">{note}</p>
        </div>
        <span className="text-muted inline-flex items-center gap-1 text-[12px]">
          {syncState === 'loading' || syncState === 'saving' ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              同步中…
            </>
          ) : syncState === 'offline' ? (
            <>
              <CloudOff size={12} className="text-warn" />
              离线只读
            </>
          ) : (
            <>
              <Cloud size={12} className="text-brand-ink" />
              云端已同步 · {doneCount}/{topics.length}（{pct}%）
            </>
          )}
        </span>
      </div>

      <div className="glass px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="bg-line h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
            <span
              className="bg-brand block h-full rounded-full transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-secondary shrink-0 text-[12px] font-medium tabular-nums">
            {doneCount}/{topics.length}
          </span>
        </div>
      </div>

      <section className="glass divide-line/70 divide-y">
        {topics.map((topic) => {
          const checked = Boolean(doc.checked[topic.id]);
          return (
            <label
              key={topic.id}
              className={[
                'flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/40 sm:px-5',
                checked ? 'opacity-70' : '',
              ].join(' ')}
            >
              <input
                type="checkbox"
                className="check mt-0.5"
                checked={checked}
                disabled={blocked}
                onChange={() => toggle(topic.id)}
              />
              <div className="min-w-0 flex-1">
                <p className={['text-[14px] font-medium', checked ? 'text-muted line-through' : 'text-ink'].join(' ')}>
                  {topic.title}
                </p>
                {topic.detail ? <p className="text-muted mt-0.5 text-[12px]">{topic.detail}</p> : null}
              </div>
              <span
                className={[
                  'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                  checked ? 'bg-success-soft text-success-ink' : 'bg-surface-2 text-muted',
                ].join(' ')}
              >
                {checked ? '已完成' : '待推进'}
              </span>
            </label>
          );
        })}
      </section>

      <p className="text-muted text-[12px]">点击任意条目即可勾选，进度自动同步至云端数据库。</p>
    </div>
  );
}
