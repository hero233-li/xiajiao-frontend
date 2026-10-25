import { Construction } from 'lucide-react';

/** 骨架期占位：内容按逐页指令替换；先让路由与壳子能跑通。 */
export function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <section>
      <h1 className="page-title">{title}</h1>
      {note && <p className="page-note">{note}</p>}
      <div className="glass mt-5 flex items-center gap-2.5 px-4 py-6">
        <Construction size={18} strokeWidth={1.8} className="text-muted" />
        <span className="text-secondary text-[13px]">这一页等待重写</span>
      </div>
    </section>
  );
}
