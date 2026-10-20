import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Download, ExternalLink, FileWarning } from 'lucide-react';
import { downloadPaper } from '../api/generated/exams/exams';
import { saveExamFile } from '../api/exams';
import type { FileDownload } from '../api/generated/models';
import { Link } from '../features/cycle/navigation';
import { useCycle } from '../features/cycle/CycleContext';
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
  const [file, setFile] = useState<FileDownload>();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = `${month} ${labels[part]}预览 · 知途个人成长平台`;
  }, [month, part]);

  useEffect(() => {
    if (!courseId || !paperId) {
      setError('缺少试卷信息，请回到真题页重新打开。');
      return;
    }
    let alive = true;
    let created = '';
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
      });
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [courseId, paperId, cycleId, part]);

  const isPdf = file?.file.mimeType === 'application/pdf';
  return (
    <div className="paper-preview">
      <Link className="paper-preview-back" to={code ? `/study/course/${code}/exams` : '/study/courses'}>
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
              : '正在读取试卷文件…'}
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
      {error && (
        <div className="paper-preview-error" role="alert">
          <FileWarning size={20} aria-hidden="true" />
          <div>
            <p>{error}</p>
            <p>若提示未解锁，请先在「找真题」页确认真题下载权限已开放。</p>
          </div>
        </div>
      )}
      {!error && (
        <div className="paper-preview-body">
          {!url && <p role="status">正在加载试卷 PDF…</p>}
          {url && isPdf && (
            <iframe className="paper-preview-frame" src={url} title={`${month} ${labels[part]}预览`} />
          )}
          {url && !isPdf && (
            <img className="paper-preview-image" src={url} alt={`${month} ${labels[part]}预览`} />
          )}
        </div>
      )}
    </div>
  );
}
