import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';

const WIDTH = 1000;
const A4_HEIGHT = 1414;
const MAX_CONTENT = 1320;

/**
 * Render a complete fixed-exam paper into A4 pages. The source element is a
 * long 1000px-wide sheet; page breaks are placed immediately before a question
 * that would cross the A4 boundary so printed questions are not cut in half.
 */
export async function assessmentSheetPdf(
  sheet: HTMLElement,
): Promise<{ blob: Blob; pageCount: number }> {
  for (let retry = 0; sheet.querySelector('[aria-busy="true"]') && retry < 100; retry++)
    await new Promise((resolve) => setTimeout(resolve, 100));
  if (sheet.querySelector('[aria-busy="true"]')) throw Error('公式正在加载，请稍后重试');
  await document.fonts.ready;
  const height = Math.max(A4_HEIGHT, sheet.scrollHeight);
  if (height > 22000) throw Error('本卷题目过长，暂时无法生成清晰的PDF');
  const canvas = await toCanvas(sheet, {
    backgroundColor: '#ffffff',
    width: WIDTH,
    height,
    pixelRatio: 2,
    cacheBust: false,
    style: { position: 'static', transform: 'none', width: `${WIDTH}px`, height: `${height}px` },
  });
  const scale = canvas.width / WIDTH;
  const root = sheet.getBoundingClientRect();
  const blocks = Array.from(sheet.querySelectorAll<HTMLElement>('[data-exam-block]'))
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top - root.top, bottom: rect.bottom - root.top };
    })
    .filter((block) => block.bottom > block.top && block.top >= 0);
  const breaks: { start: number; end: number }[] = [];
  let start = 0;
  for (const block of blocks) {
    if (block.bottom - start > MAX_CONTENT && block.top - start > 120) {
      breaks.push({ start, end: Math.min(block.top, height) });
      start = block.top;
    }
  }
  breaks.push({ start, end: height });
  const pages: { start: number; end: number }[] = [];
  for (const part of breaks) {
    let cursor = part.start;
    while (part.end - cursor > MAX_CONTENT) {
      pages.push({ start: cursor, end: cursor + MAX_CONTENT });
      cursor += MAX_CONTENT;
    }
    if (part.end > cursor) pages.push({ start: cursor, end: part.end });
  }
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  pages.forEach((page, index) => {
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = Math.round(WIDTH * 2);
    pageCanvas.height = Math.round(A4_HEIGHT * 2);
    const context = pageCanvas.getContext('2d');
    if (!context) throw Error('无法生成PDF画布');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    const segmentHeight = Math.max(1, page.end - page.start);
    context.drawImage(
      canvas,
      0,
      Math.round(page.start * scale),
      canvas.width,
      Math.round(segmentHeight * scale),
      0,
      0,
      pageCanvas.width,
      Math.round(segmentHeight * 2),
    );
    if (index > 0) pdf.addPage('a4', 'portrait');
    pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297);
  });
  pdf.setProperties({ title: '学习知途 · 固定检测试卷', subject: '按题号作答，上传整卷照片批改' });
  return { blob: pdf.output('blob'), pageCount: pages.length };
}
