import { useState } from 'react';
import { useTaskInputs, useTaskMaterial } from './api';

export function TaskImages({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const inputs = useTaskInputs(taskId, open);
  return (
    <details className="wb-frozen" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>查看本次冻结的原始答卷图片</summary>
      {open && inputs.isPending && <p role="status">正在读取原始答卷…</p>}
      {open && inputs.isError && <p role="alert">原始答卷读取失败，可以稍后重试。</p>}
      {open &&
        inputs.data?.pages.map((page) => (
          <TaskImage key={page.fileId} taskId={taskId} fileId={page.fileId} pageNo={page.pageNo} />
        ))}
    </details>
  );
}

function TaskImage({
  taskId,
  fileId,
  pageNo,
}: {
  taskId: string;
  fileId: string;
  pageNo: number;
}) {
  const image = useTaskMaterial(taskId, fileId, true);
  return (
    <figure className="wb-frozen-page">
      <figcaption>答卷第 {pageNo} 页</figcaption>
      {image.data && (
        <img
          alt={`答卷第 ${pageNo} 页`}
          src={`data:${image.data.mimeType};base64,${image.data.contentBase64}`}
        />
      )}
      {image.isError && <p role="alert">原始图片无法读取，请检查服务器附件。</p>}
    </figure>
  );
}
