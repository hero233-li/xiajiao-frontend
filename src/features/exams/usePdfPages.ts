import { useEffect, useState } from 'react';

export interface PdfPageImage {
  pageNo: number;
  url: string;
  width: number;
  height: number;
}

/**
 * 用 pdf.js 把 PDF 每一页画到 canvas 再转成图片。
 *
 * 手机上任何浏览器都无法在 iframe 里显示 PDF（Chrome 只给一个灰色占位），
 * 系统阅读器也不一定可用，所以这里直接产出图片，页面里滚动即可看书。
 */
export function usePdfPages(url: string, enabled: boolean) {
  const [pages, setPages] = useState<PdfPageImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled || !url) return;
    let alive = true;
    const created: string[] = [];
    setPages([]);
    setError('');
    setLoading(true);

    void (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const document_ = await pdfjs.getDocument({ url }).promise;
        const rendered: PdfPageImage[] = [];
        for (let index = 1; index <= document_.numPages; index++) {
          const page = await document_.getPage(index);
          const viewport = page.getViewport({ scale: 1.8 });
          const canvas = globalThis.document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const context = canvas.getContext('2d');
          if (!context) throw new Error('CANVAS_UNAVAILABLE');
          await page.render({ canvasContext: context, viewport, canvas }).promise;
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg', 0.85),
          );
          if (!blob) continue;
          const pageUrl = URL.createObjectURL(blob);
          created.push(pageUrl);
          rendered.push({
            pageNo: index,
            url: pageUrl,
            width: canvas.width,
            height: canvas.height,
          });
          if (!alive) return;
          setPages([...rendered]);
        }
        if (alive) setLoading(false);
      } catch (reason) {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : 'PDF 解析失败');
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
      for (const pageUrl of created) URL.revokeObjectURL(pageUrl);
    };
  }, [url, enabled]);

  return { pages, loading, error };
}
