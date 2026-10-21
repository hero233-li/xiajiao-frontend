import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
// Break only between complete question pairs, never through a formula or a question.
export async function practicePrintPdf(sheet: HTMLElement): Promise<Blob> {
  for (let retry = 0; sheet.querySelector('[aria-busy="true"]') && retry < 100; retry++) await new Promise(resolve => setTimeout(resolve, 100));
  if (sheet.querySelector('[aria-busy="true"]')) throw Error('公式正在加载，请稍后重试');
  await document.fonts.ready;
  const width = 1000, pageHeight = width * 297 / 210, margin = 44;
  const base = sheet.getBoundingClientRect();
  const ends = [...sheet.querySelectorAll<HTMLElement>('.print-pdf-pair')].map(row => Math.ceil(row.getBoundingClientRect().bottom - base.top));
  if (!ends.length || sheet.scrollHeight > 16000) throw Error('题目过长，无法生成清晰的打印版');
  const canvas = await toCanvas(sheet, { backgroundColor: '#fff', width, height: sheet.scrollHeight, pixelRatio: 2, style: { position: 'static', transform: 'none', width: `${width}px` } });
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  let start = 0, page = 0;
  while (start < ends[ends.length - 1]) {
    const top = page ? margin : 0;
    const end = ends.filter(y => y > start && y - start <= pageHeight - top - margin).at(-1);
    if (end === undefined) throw Error('单题内容超过一页A4，请使用原PDF或调整排版后再打印');
    const output = document.createElement('canvas');output.width = 2000;output.height = Math.ceil(pageHeight * 2);
    const ctx = output.getContext('2d')!;ctx.fillStyle = '#fff';ctx.fillRect(0, 0, output.width, output.height);
    ctx.drawImage(canvas, 0, start * 2, 2000, (end - start) * 2, 0, top * 2, 2000, (end - start) * 2);
    if (page) pdf.addPage('a4');
    pdf.addImage(output.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, 210, 297);
    start = end;page++;
  }
  pdf.setProperties({ title: sheet.querySelector('h1')?.textContent ?? '考点打印版', subject: 'A4练习题，不含答案' });
  const blob = pdf.output('blob');
  if (blob.size > 10 * 1024 * 1024) throw Error('打印版超过文印网站10MB限制，请减少文件大小后重试');
  return blob;
}
