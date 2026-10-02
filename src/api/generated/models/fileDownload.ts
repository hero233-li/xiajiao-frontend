/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { FileMetadata } from './fileMetadata';
import type { FileDownloadEncoding } from './fileDownloadEncoding';

/**
 * 每次重新校验登录、用途、所有者、解锁；Cache-Control:no-store。不使用公开静态文件或302直链。
 */
export interface FileDownload {
  file: FileMetadata;
  /** 完整文件的Base64；使用JSON是为严格保持统一成功封装 */
  contentBase64: string;
  encoding: FileDownloadEncoding;
}
