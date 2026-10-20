import { Download, ExternalLink, FileWarning } from 'lucide-react';
import type { FileDownload } from '../../../api/generated/models';
import { saveExamFile } from '../../../api/exams';
import { usePdfPages } from '../usePdfPages';

export function PdfPageViewer({
  url,
  title,
  file,
}: {
  url: string;
  title: string;
  file?: FileDownload;
}) {
  const { pages, loading, error } = usePdfPages(url, !!url);

  if (error)
    return (
      <div className="wb-paper-fallback" role="alert">
        <FileWarning size={22} aria-hidden="true" />
        <div>
          <strong>无法在页面内显示这份 PDF</strong>
          <p>可以下载后用系统阅读器打开。</p>
          <div className="wb-paper-fallback-actions">
            <a className="button button-primary" href={url} target="_blank" rel="noreferrer">
              <ExternalLink size={16} aria-hidden="true" />
              在新窗口打开
            </a>
            {file && (
              <button
                className="button button-secondary"
                type="button"
                onClick={() => saveExamFile(file)}
              >
                <Download size={16} aria-hidden="true" />
                下载到本地
              </button>
            )}
          </div>
        </div>
      </div>
    );

  return (
    <div className="wb-pdf-pages">
      {loading && (
        <p role="status" className="wb-paper-hint">
          正在生成页面图像…
        </p>
      )}
      {pages.map((page) => (
        <figure key={page.pageNo} className="wb-pdf-page">
          <img
            src={page.url}
            alt={`${title} 第 ${page.pageNo} 页`}
            width={page.width}
            height={page.height}
            loading="lazy"
          />
          <figcaption>第 {page.pageNo} 页</figcaption>
        </figure>
      ))}
    </div>
  );
}
