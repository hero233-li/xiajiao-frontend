import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Download, ExternalLink, FileWarning } from 'lucide-react';
import { saveExamFile } from '../api/exams';
import { Link } from '../features/cycle/navigation';
import { useCycle } from '../features/cycle/CycleContext';
import { usePaperFile } from '../features/exams/usePaperFile';
import { PdfPageViewer } from '../features/exams/workbench/PdfPageViewer';
import { canInlinePdf } from '../features/exams/inlinePdf';
import '../features/exams/paper-preview.css';

const labels = { QUESTION: '题目', ANSWER: '答案' } as const;

export function Component() {
  const { paperId = '' } = useParams();
  const [search] = useSearchParams();
  const cycle = useCycle();
  const courseId = search.get('courseId') ?? '';
  const code = search.get('code') ?? '';
  const cycleId = cycle?.cycleId ?? '';
  const part = search.get('part') === 'ANSWER' ? 'ANSWER' : 'QUESTION';
  const month = search.get('month') ?? '';
  const { file, url, error, loading } = usePaperFile(courseId, paperId, cycleId, part, !!courseId);

  useEffect(() => {
    document.title = `${month} ${labels[part]}预览 · 知途个人成长平台`;
  }, [month, part]);

  const missing = !courseId || !paperId;
  const isPdf = file?.file.mimeType === 'application/pdf';
  const inline = canInlinePdf();

  return (
    <div className="paper-preview">
      <Link
        className="paper-preview-back"
        to={code ? `/study/course/${code}/exams` : '/study/courses'}
      >
        ← 返回真题列表
      </Link>
      <header className="paper-preview-head">
        <div>
          <p className="eyebrow">
            试卷文件 · {month || '未标注月份'} · {labels[part]}
          </p>
          <h1>
            {month} {labels[part]}预览
          </h1>
          <p className="secondary">
            {file
              ? `${file.file.name} · ${(file.file.sizeBytes / 1024).toFixed(0)} KB`
              : loading
                ? '正在读取试卷文件…'
                : '试卷信息缺失'}
          </p>
        </div>
        <div className="paper-preview-actions">
          {url && (
            <a className="button button-secondary" href={url} target="_blank" rel="noreferrer">
              <ExternalLink size={16} aria-hidden="true" />
              全屏打开 PDF
            </a>
          )}
          {file && (
            <button
              className="button button-secondary"
              onClick={() => saveExamFile(file)}
              type="button"
            >
              <Download size={16} aria-hidden="true" />
              下载原文件
            </button>
          )}
        </div>
      </header>
      {(missing || error) && (
        <div className="paper-preview-error" role="alert">
          <FileWarning size={20} aria-hidden="true" />
          <div>
            <p>{missing ? '缺少试卷信息，请回到真题页重新打开。' : error}</p>
            <p>若提示未解锁，请先在真题列表确认真题权限已开放。</p>
          </div>
        </div>
      )}
      {!missing && !error && (
        <div className="paper-preview-body">
          {loading && <p role="status">正在加载试卷 PDF…</p>}
          {url && isPdf && inline && (
            <iframe className="paper-preview-frame" src={url} title={`${month} ${labels[part]}预览`} />
          )}
          {url && isPdf && !inline && (
            <PdfPageViewer url={url} title={`${month} ${labels[part]}`} file={file} />
          )}
          {url && !isPdf && (
            <img className="paper-preview-image" src={url} alt={`${month} ${labels[part]}预览`} />
          )}
        </div>
      )}
    </div>
  );
}
