/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { FileDownload } from './fileDownload';
import type { DownloadScoreImageResponseMessage } from './downloadScoreImageResponseMessage';

export interface DownloadScoreImageResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: FileDownload;
  message: DownloadScoreImageResponseMessage;
}
