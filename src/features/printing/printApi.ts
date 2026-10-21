import { apiRequest } from '../../api/http';
import { createUuid } from '../../utils/uuid';
import type { BankQuestion, Level } from '../../api/bank';
export interface PrintDocument {
  id: string; course_id: string; filename: string; chapter_title: string; point_title: string;
  difficulty: string; pages: number; byte_size: number; status: string; printed_count: number;
  revision: number; created_at: string; last_printed_at: string | null;
}
export async function syncPrintPdf(blob: Blob, courseId: string, chapterTitle: string, pointTitle: string, level: Level, pointKey: string, questions: BankQuestion[]) {
  if (!crypto.subtle) throw new Error('请使用 https://xiajiao.cloud 打开网站后再进行打印同步');
  const source = JSON.stringify(['A4-print-v1', courseId, chapterTitle, pointTitle, pointKey, level, questions.map(q => [q.id, q.stem, q.options, q.maximum])]);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  const sourceKey = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
  const form = new FormData();
  const name = `${pointTitle.slice(0, 200)}-${level}-${sourceKey.slice(0, 12)}.pdf`.replace(/[\\/:*?"<>|]/g, '_');
  form.append('file', blob, name);
  for (const [key, value] of Object.entries({ courseId, sourceKey, chapterTitle, pointTitle, level })) form.append(key, value);
  return (await apiRequest<{ data: PrintDocument }>({ url: '/api/v1/printing/documents', method: 'POST', data: form, silent: true, timeout: 120000 })).data;
}
export async function printBlob(id: string): Promise<Blob> {
  const { apiClient } = await import('../../api/http');
  return (await apiClient.get(`/api/v1/printing/documents/${id}/file`, { responseType: 'blob', silent: true, timeout: 120000 })).data;
}
export const PRINT_SITE = 'https://selfcopying.cnbksy.com/client/new/cprintPc/cprint.html';
export interface PrintConnection { connected: boolean; loggedIn?: boolean; reason?: string; filesReady?: boolean; files?: { key?: string; name: string; parameters: string }[]; }
export function printBridge(action: 'status' | 'upload' | 'delete', payload?: unknown): Promise<PrintConnection> {
  return new Promise((resolve, reject) => {
    const id = createUuid();
    const finish = () => { window.removeEventListener('message', receive); window.clearTimeout(timeout); };
    const receive = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin || event.data?.source !== 'zhitu-print-helper' || event.data.id !== id) return;
      finish();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.result);
    };
    const timeout = window.setTimeout(() => { finish(); reject(new Error(action === 'status' ? '未连接打印助手，请先安装并打开文印网站' : '文印同步超时，请查看文印列表后再重试')); }, action === 'status' ? 30000 : 120000);
    window.addEventListener('message', receive);
    window.postMessage({ source: 'zhitu-print', id, action, payload }, window.location.origin);
  });
}
export function blobBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(blob); });
}

export type PrintSyncMode = 'BROWSER' | 'SERVER';
export interface PrintSyncJob {id:string;document_id:string;filename?:string;course_id?:string;status:string;attempts:number;reason:string;created_at:string;}
export async function printSyncConfig():Promise<{mode:PrintSyncMode;serverAvailable:boolean}> {
  return (await apiRequest<{data:{mode:PrintSyncMode;serverAvailable:boolean}}>({url:'/api/v1/printing/sync-config',silent:true})).data;
}
export async function serverPrint<T>(path:string,method:'GET'|'POST'|'DELETE'='GET',data?:unknown):Promise<T> {
  return (await apiRequest<{data:T}>({url:`/api/v1/printing/server/${path}`,method,data,silent:true,timeout:45000})).data;
}
