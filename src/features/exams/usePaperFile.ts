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
        created = URL.createObjectURL(new Blob([bytes], { type: data.file.mimeType }));
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
