import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';

// Render the visible question-only snapshot, including Chinese text and KaTeX fonts.
// Use a single longer page for dense questions instead of clipping or tiny print.
export async function practiceSheetPdf(
  sheet: HTMLElement,
): Promise<{ blob: Blob; imageUrl: string }> {
  for (let retry = 0; sheet.querySelector('[aria-busy="true"]') && retry < 100; retry++)
    await new Promise((resolve) => setTimeout(resolve, 100));
  if (sheet.querySelector('[aria-busy="true"]')) throw Error('公式正在加载，请稍后重试');
  await document.fonts.ready;
  const width = 1000;
  const height = Math.max(1414, sheet.scrollHeight);
  if (height > 14000) throw Error('本组题目过长，暂时无法生成清晰的单页PDF');
  const canvas = await toCanvas(sheet, {
    backgroundColor: '#ffffff',
    width,
    height,
    pixelRatio: 2,
    cacheBust: false,
    style: { position: 'static', transform: 'none', width: `${width}px`, height: `${height}px` },
  });
  const paperWidth = height > 1414 ? 297 : 210;
  const paperHeight = (height / width) * paperWidth;
  const pdf = new jsPDF({
    unit: 'mm',
    format: [paperWidth, paperHeight],
    orientation: 'portrait',
    compress: true,
  });
  const imageUrl = canvas.toDataURL('image/jpeg', 0.94);
  pdf.addImage(imageUrl, 'JPEG', 0, 0, paperWidth, paperHeight);
  pdf.setProperties({ title: '学习知途 · 十题练习单', subject: '按题号作答，上传照片后整组批改' });
  return { blob: pdf.output('blob'), imageUrl };
}
