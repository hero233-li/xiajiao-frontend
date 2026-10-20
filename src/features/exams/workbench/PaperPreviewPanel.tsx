import { useState } from 'react';
import { Download, ExternalLink, FileWarning, LockKeyhole, Smartphone } from 'lucide-react';
import type { Paper } from '../../../api/generated/models';
import { saveExamFile } from '../../../api/exams';
import { Link } from '../../cycle/navigation';
import { usePaperFile, type PaperPart } from '../usePaperFile';
import { canInlinePdf } from '../inlinePdf';

export function PaperPreviewPanel({
  courseId,
  cycleId,
  code,
  paper,
  unlocked,
}: {
  courseId: string;
  cycleId: string;
  code: string;
  paper: Paper;
  unlocked: boolean;
}) {
  const hasAnswer = !!paper.answerFile;
  const [part, setPart] = useState<PaperPart>('QUESTION');
  const active: PaperPart = part === 'ANSWER' && !hasAnswer ? 'QUESTION' : part;
  const { file, url, error, loading } = usePaperFile(courseId, paper.id, cycleId, active, unlocked);
  const isPdf = file?.file.mimeType === 'application/pdf';
  const inline = canInlinePdf();
  const fullscreen = `/study/paper-preview/${paper.id}?courseId=${encodeURIComponent(courseId)}&part=${active}&month=${paper.paperMonth}&code=${encodeURIComponent(code)}`;

  return (
    <section className="wb-card" aria-labelledby="wb-paper-title">
      <header className="wb-card-head">
        <div>
          <h2 id="wb-paper-title">试卷</h2>
          <p className="secondary">
            {paper.paperMonth} ·{' '}
            {paper.questionPages === null ? '页数未提供' : `${paper.questionPages} 页题目`}
            {hasAnswer && paper.answerPages !== null ? ` · ${paper.answerPages} 页答案` : ''}
          </p>
        </div>
        {unlocked && (
          <div className="wb-card-tools">
            {hasAnswer && (
              <div className="wb-switch" role="group" aria-label="查看题目还是答案">
                <button
                  type="button"
                  aria-pressed={active === 'QUESTION'}
                  onClick={() => setPart('QUESTION')}
                >
                  题目
                </button>
                <button
                  type="button"
                  aria-pressed={active === 'ANSWER'}
                  onClick={() => setPart('ANSWER')}
                >
                  答案
                </button>
              </div>
            )}
            {inline && url && (
              <a className="button button-secondary" href={url} target="_blank" rel="noreferrer">
                <ExternalLink size={16} aria-hidden="true" />
                新窗口打开
              </a>
            )}
            {inline && file && (
              <button
                className="button button-secondary"
                type="button"
                onClick={() => saveExamFile(file)}
              >
                <Download size={16} aria-hidden="true" />
                下载原文件
              </button>
            )}
            {inline && (
              <Link className="button button-ghost" to={fullscreen}>
                大图预览页
              </Link>
            )}
          </div>
        )}
      </header>
      {!unlocked && (
        <p className="wb-locked">
          <LockKeyhole size={16} aria-hidden="true" />
          真题权限尚未开放，暂时看不到试卷内容。回到列表页可以查看解锁进度与临考跳过入口。
        </p>
      )}
      {unlocked && error && (
        <div className="wb-error" role="alert">
          <FileWarning size={20} aria-hidden="true" />
          <div>
            <p>{error}</p>
            <p>若提示未解锁，请先在真题列表确认真题权限已开放。</p>
          </div>
        </div>
      )}
      {unlocked && !error && (
        <div className="wb-paper-body">
          {loading && <p role="status">正在加载试卷 PDF…</p>}
          {url && isPdf && inline && (
            <>
              <iframe
                className="wb-paper-frame"
                src={url}
                title={`${paper.paperMonth} ${active === 'QUESTION' ? '题目' : '答案'}预览`}
              />
              <p className="wb-paper-hint">
                上方空白多半是浏览器不支持内嵌 PDF，用「新窗口打开」或「下载原文件」即可查看。
              </p>
            </>
          )}
          {url && isPdf && !inline && (
            <div className="wb-paper-fallback">
              <Smartphone size={22} aria-hidden="true" />
              <div>
                <strong>手机浏览器不支持在页面内显示 PDF</strong>
                <p>
                  {file?.file.name} · {((file?.file.sizeBytes ?? 0) / 1024).toFixed(0)} KB ·{' '}
                  {paper.questionPages === null ? '页数未知' : `${paper.questionPages} 页`}
                </p>
                <div className="wb-paper-fallback-actions">
                  <a className="button button-primary" href={url} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} aria-hidden="true" />
                    打开 PDF
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
          )}
          {url && !isPdf && (
            <img
              className="wb-paper-image"
              src={url}
              alt={`${paper.paperMonth} ${active === 'QUESTION' ? '题目' : '答案'}预览`}
            />
          )}
        </div>
      )}
    </section>
  );
}
