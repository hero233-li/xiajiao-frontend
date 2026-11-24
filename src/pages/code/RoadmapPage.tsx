import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { CODE_TRACKS } from '../../data/codeTracks';
import { useStudyTracker } from '../../lib/studyTracker';

const ORDER = [CODE_TRACKS.ai, CODE_TRACKS.backend, CODE_TRACKS.frontend];

export function RoadmapPage() {
  const { doc } = useStudyTracker();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-ink text-[22px] font-semibold">学习路线</h1>
        <p className="text-secondary mt-1 text-[13px]">
          2 年软件测试无缝升级：明年 3–4 月上海双投「AI 测开 / Agent 评测」与「Python / Agent 应用开发」。
        </p>
      </div>

      <section className="glass px-4 py-1 sm:px-5">
        <ol>
          {ORDER.map((track, index) => {
            const done = track.topics.filter((t) => Boolean(doc.checked[t.id])).length;
            const total = track.topics.length;
            const stateText =
              done === 0 ? '未开始' : done === total ? '已完成' : `进行中 ${done}/${total}`;
            return (
              <li
                key={track.key}
                className="border-line/70 flex items-center gap-3 border-b py-4 last:border-b-0"
              >
                <span className="text-brand bg-brand-soft grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-medium tabular-nums">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    to={track.route}
                    className="text-ink hover:text-brand-ink inline-flex items-center gap-1 text-[15px] font-medium transition-colors"
                  >
                    {track.stageTitle}
                    <ArrowUpRight size={14} strokeWidth={1.8} />
                  </Link>
                  <p className="text-secondary mt-1 text-[13px]">{track.stageDetail}</p>
                </div>
                <span
                  className={[
                    'shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums',
                    done === total
                      ? 'bg-success-soft text-success-ink'
                      : done > 0
                        ? 'bg-brand-soft text-brand-ink'
                        : 'text-muted',
                  ].join(' ')}
                >
                  {stateText}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
