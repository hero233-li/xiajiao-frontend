/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { FileDownload } from './fileDownload';
import type { DownloadPaperResponseMessage } from './downloadPaperResponseMessage';

export interface DownloadPaperResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: FileDownload;
  message: DownloadPaperResponseMessage;
}
