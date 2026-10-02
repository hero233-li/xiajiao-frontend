import { useState } from 'react';
import { useSearchParams } from '../features/cycle/navigation';
import { QuickNote } from '../features/notes/QuickNote';
export function Component() {
  const [content, setContent] = useState('复盘错题：\n#错题');
  const [params] = useSearchParams();
  return (
    <div className="notes-page stack">
      <h1>快速备注独立测试页</h1>
      <label htmlFor="quick-prefill">
        预填内容
        <textarea
          id="quick-prefill"
          className="notes-preview-input"
          rows={5}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </label>
      <p>点击右下角“快速记一条”，验证预填、课程选择、保存和关闭确认。</p>
      <QuickNote
        initialContent={content}
        defaultCourseId={params.get('courseId') ?? undefined}
        cycleId={params.get('cycleId') ?? undefined}
      />
    </div>
  );
}
