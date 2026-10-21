import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { bankRequest, type BankChapter, type BankPoint, type BankQuestion, type Level } from '../../api/bank';
import { Button } from '../../components/Button';
import { MathText } from '../../components/MathText';
import { QuestionStem } from './QuestionStem';
import { practiceZip } from './practiceZip';
import { syncPrintPdf } from '../printing/printApi';
import { Link } from '../cycle/navigation';
import { useCourse } from '../course/CourseContext';

export function ChapterPracticeExport({ courseId, chapter, level, enabled }: {
  courseId: string; chapter: BankChapter; level: Level; enabled: boolean;
}) {
  const course=useCourse();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const [page, setPage] = useState<{ point: BankPoint; questions: BankQuestion[] } | null>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const active = useRef(true);
  const pending = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const points = chapter.points.filter(point => point.levels[level].available === 10);
  const filename = `${chapter.title}-${level}-各考点练习题.zip`.replace(/[\\/:*?"<>|]/g, '_');
  async function generate(mode: 'zip' | 'print' = 'zip') {
    if (pending.current) return;
    pending.current = true;
    setBusy(true); setError(''); setUrl('');
    const files: { name: string; blob: Blob }[] = [];
    let synced = 0;
    try {
      for (const [index, point] of points.entries()) {
        if (!active.current) return;
        setProgress(`正在导出 ${index + 1}/${points.length}：${point.title}`);
        const params = new URLSearchParams({ chapterId: chapter.chapter_id, pointKey: point.point_key, level });
        const questions = await bankRequest<BankQuestion[]>(`/bank/courses/${courseId}/questions?${params}`);
        if (!active.current) return;
        if (questions.length !== 10) throw Error(`${point.title}题量已变化，请刷新后重试`);
        flushSync(() => setPage({ point, questions }));
        if (mode === 'print') {
          const { practicePrintPdf } = await import('../printing/practicePrintPdf');
          const blob = await practicePrintPdf(sheet.current!);
          await syncPrintPdf(blob, courseId, chapter.title, point.title, level, point.point_key, questions);
          synced++;
          if (!active.current) return;
          continue;
        }
        const { practiceSheetPdf } = await import('./practiceSheetPdf');
        const pdf = await practiceSheetPdf(sheet.current!);
        if (!active.current) return;
        files.push({ name: `${String(index + 1).padStart(2, '0')}-${point.title}-${level}.pdf`.replace(/[\\/:*?"<>|]/g, '_'), blob: pdf.blob });
      }
      if (mode === 'print') { setProgress(`已同步 ${points.length} 份独立A4打印版。重复同步不会新增相同文件。`); return; }
      const zip = await practiceZip(files);
      if (!active.current) return;
      const nextUrl = URL.createObjectURL(zip);
      setUrl(nextUrl); setProgress(`导出完成，共 ${files.length} 份考点 PDF`);
      const link = document.createElement('a');link.href = nextUrl;link.download = filename;link.click();
    } catch (cause) {
      if (active.current) { setError(cause instanceof Error ? cause.message : '导出失败，请重试'); setProgress(mode === 'print' ? `已同步 ${synced} 份文件，可重试继续；相同文件不会重复保存。` : ''); }
    } finally {
      pending.current = false;
      if (active.current) { setBusy(false); setPage(null); }
    }
  }
  return <section aria-label="章节练习题导出">
    <Button variant="secondary" loading={busy} loadingLabel={progress} disabled={!enabled || !points.length}
      disabledReason={!enabled ? '当前难度尚未解锁' : !points.length ? '当前难度暂无可导出的考点' : undefined}
      onClick={() => void generate()}>导出本章当前难度练习题 ZIP</Button>
    {' '}<Button variant="secondary" loading={busy} loadingLabel={progress} disabled={!enabled || !points.length}
      onClick={() => void generate('print')}>打印同步</Button>
    {' '}<Link to={course?.code?`/study/course/${course.code}/printing`:`/study/printing?courseId=${encodeURIComponent(courseId)}`}>查看打印功能区</Link>
    <p className="secondary">每个考点一份独立 PDF，不含答案。当前可导出 {points.length} 个考点、{points.length * 10} 道题。
      {points.length < chapter.points.length && `另有 ${chapter.points.length - points.length} 个考点题量未齐，暂不导出。`}</p>
    {progress && <p role="status">{progress}</p>}
    {error && <p role="alert">{error}</p>}
    {url && <a className="button button-secondary" href={url} download={filename}>下载考点 PDF 压缩包</a>}
    {page && <div className="sheet-render-container" aria-hidden="true"><div ref={sheet} className="practice-pdf-sheet">
      <header><strong>学习知途 · 十题练习单</strong><h1>{page.point.title}</h1><p>{chapter.title} · {level} · 按题号作答，题目不含参考答案。</p></header>
      <div>{[0, 1, 2, 3, 4].map(index => <div className="print-pdf-pair practice-pdf-questions" key={index}>
        {[index, index + 5].map(n => { const q = page.questions[n]; return <section key={q.id}>
          <h2>{n + 1}. <span>{q.maximum}分</span></h2><QuestionStem text={q.stem} />
          {q.options.map((option, n) => <p key={n}>{String.fromCharCode(65 + n)}. <MathText text={option} /></p>)}
        </section>; })}
      </div>)}</div>
    </div></div>}
  </section>;
}
