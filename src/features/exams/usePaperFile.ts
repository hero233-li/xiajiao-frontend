import { useEffect, useState } from 'react';
import { downloadPaper } from '../../api/generated/exams/exams';
import type { FileDownload } from '../../api/generated/models';

export type PaperPart = 'QUESTION' | 'ANSWER';

/**
 * 取一份试卷文件并转成同源 blob URL。
 * 返回的 url 在依赖变化或卸载时自动回收，调用方不要自己 revoke。
 */
export function usePaperFile(
  courseId: string,
  paperId: string,
  cycleId: string,
  part: PaperPart,
  enabled = true,
) {
  const [file, setFile] = useState<FileDownload>();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !courseId || !paperId) return;
    let alive = true;
    let created = '';
    setLoading(true);
    setFile(undefined);
    setUrl('');
    setError('');
    downloadPaper(courseId, paperId, { cycleId, part }, { silent: true })
      .then((response) => {
        if (!alive) return;
        const data = response.data;
        const bytes = Uint8Array.from(atob(data.contentBase64), (char) => char.charCodeAt(0));
        // 用 File 而不是裸 Blob：新标签页标题和下载文件名会沿用真实文件名，
        // 而不是浏览器显示的一串 blob UUID。
        created = URL.createObjectURL(
          new File([bytes], data.file.name, { type: data.file.mimeType }),
        );
        setFile(data);
        setUrl(created);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : '无法读取试卷文件，请稍后重试。');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [courseId, paperId, cycleId, part, enabled]);

  return { file, url, error, loading };
}
